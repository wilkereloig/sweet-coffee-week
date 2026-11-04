-- Camada de edição Cartoon 2026.2 — VOUCHER VIRTUAL (04/11/2026, decisões do Wilker no chat 4bb80e0c).
-- ⚠️ SÓ APLICAR COM OK EXPLÍCITO DO WILKER. Reverter: supabase/reverter/20261201_voucher_virtual.sql.
--
--  * Vale só na casa que cedeu, com COTA PRÓPRIA (padrão 2 por marca) — não sai dos 7 impressos.
--  * Entrega por LINK: /cartoon/voucher/<link_token>. O token (12 letras, 31^12 ≈ 8 × 10^17) é secreto; o CÓDIGO
--    SCW-XXXXX só aparece na página aberta pelo token. Assim a página pública nunca permite varrer códigos.
--  * Validação: a MARCA, com o código digitado ou lido por QR, pela MESMA `marca_usar_voucher` do impresso
--    (não muda). Estados e auditoria são os de sempre.
--  * `canal` separa as contas: a cota de impressos (`gerar_vouchers`, `destinar_vouchers`) ignora os virtuais.
--  * Tabelas continuam fechadas; a página pública usa só `voucher_virtual_ver`, que devolve um voucher por token.

create extension if not exists pgcrypto with schema extensions;

alter table public.vouchers
  add column if not exists canal text not null default 'fisico' check (canal in ('fisico', 'virtual')),
  add column if not exists link_token text;
create unique index if not exists vouchers_link_token_uq on public.vouchers (link_token) where link_token is not null;
-- Virtual sempre tem token; impresso nunca.
alter table public.vouchers drop constraint if exists vouchers_token_so_virtual;
alter table public.vouchers add constraint vouchers_token_so_virtual
  check ((canal = 'virtual') = (link_token is not null));

alter table public.edicoes
  add column if not exists vouchers_virtuais_por_participante int not null default 2
    check (vouchers_virtuais_por_participante between 0 and 100);

-- ---------------------------------------------------------------- utilitário interno (sem grant)
-- 12 letras sem 0/o/1/l/i. ponytail: módulo 31 sobre um byte tem viés minúsculo; irrelevante para adivinhação.
create or replace function public.novo_token_voucher()
 returns text language plpgsql volatile set search_path to 'public'
as $$
declare a constant text := 'abcdefghjkmnpqrstuvwxyz23456789'; b bytea; s text; i int;
begin
  loop
    b := extensions.gen_random_bytes(12); s := '';
    for i in 0..11 loop s := s || substr(a, 1 + (get_byte(b, i) % 31), 1); end loop;
    exit when not exists (select 1 from public.vouchers where link_token = s);
  end loop;
  return s;
end $$;
revoke all on function public.novo_token_voucher() from public, anon, authenticated;

-- ---------------------------------------------------------------- organização: gerar e destinar
-- Impressos: igual a 20261115, mas só conta e só cria canal 'fisico'.
create or replace function public.gerar_vouchers(p_secret text, p_edicao text DEFAULT NULL::text)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v_ed text := coalesce(p_edicao, public.edicao_atual()); v_cota int; r record; n int := 0; i int;
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  select vouchers_por_participante into v_cota from public.edicoes where codigo = v_ed;
  if v_cota is null then raise exception 'edicao_nao_encontrada'; end if;
  for r in
    select pa.id, v_cota - (select count(*) from public.vouchers v where v.participacao_id = pa.id and v.canal = 'fisico' and v.status <> 'cancelado') falta
      from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.edicao_codigo = v_ed and p.arquivado_em is null and pa.status_cadastro is distinct from 'encerrado'
  loop
    for i in 1..greatest(r.falta, 0) loop
      insert into public.vouchers (codigo, edicao_codigo, participacao_id, canal) values (public.novo_codigo_voucher(), v_ed, r.id, 'fisico');
      n := n + 1;
    end loop;
  end loop;
  if n > 0 then
    insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
    values ('vouchers.gerados', 'vouchers', v_ed, jsonb_build_object('edicao', v_ed, 'quantidade', n, 'cota', v_cota));
  end if;
  return n;
end $function$;

-- Virtuais: completa cada marca até a cota virtual (idempotente; cancelado não conta).
create or replace function public.gerar_vouchers_virtuais(p_secret text, p_edicao text DEFAULT NULL::text)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v_ed text := coalesce(p_edicao, public.edicao_atual()); v_cota int; r record; n int := 0; i int;
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  select vouchers_virtuais_por_participante into v_cota from public.edicoes where codigo = v_ed;
  if v_cota is null then raise exception 'edicao_nao_encontrada'; end if;
  for r in
    select pa.id, v_cota - (select count(*) from public.vouchers v where v.participacao_id = pa.id and v.canal = 'virtual' and v.status <> 'cancelado') falta
      from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.edicao_codigo = v_ed and p.arquivado_em is null and pa.status_cadastro is distinct from 'encerrado'
  loop
    for i in 1..greatest(r.falta, 0) loop
      insert into public.vouchers (codigo, edicao_codigo, participacao_id, canal, link_token)
      values (public.novo_codigo_voucher(), v_ed, r.id, 'virtual', public.novo_token_voucher());
      n := n + 1;
    end loop;
  end loop;
  if n > 0 then
    insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
    values ('vouchers.gerados_virtuais', 'vouchers', v_ed, jsonb_build_object('edicao', v_ed, 'quantidade', n, 'cota', v_cota));
  end if;
  return n;
end $function$;

-- Destinar impresso: igual a 20260930, mas só escolhe canal 'fisico' (virtual tem função própria).
create or replace function public.destinar_vouchers(p_secret text, p_participacao uuid, p_contato uuid,
  p_quantidade int default 1, p_obs text default null)
returns text[] language plpgsql security definer set search_path = public as $$
declare v_codigos text[];
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  if p_quantidade is null or p_quantidade < 1 then raise exception 'quantidade_invalida'; end if;
  if not exists (select 1 from public.contatos_relacionamento where id = p_contato) then raise exception 'contato_nao_encontrado'; end if;
  if (select count(*) from public.vouchers where participacao_id = p_participacao and canal = 'fisico' and status = 'disponivel') < p_quantidade then
    raise exception 'vouchers_insuficientes';
  end if;
  with escolhidos as (
    select id from public.vouchers where participacao_id = p_participacao and canal = 'fisico' and status = 'disponivel'
     order by created_at limit p_quantidade for update skip locked),
  feitos as (
    update public.vouchers v set contato_id = p_contato, status = 'destinado', destinado_em = now(),
           responsavel_rotulo = public.ator_rotulo_atual(), observacao = coalesce(nullif(btrim(p_obs), ''), v.observacao)
      from escolhidos e where v.id = e.id
    returning v.codigo)
  select array_agg(codigo) into v_codigos from feitos;
  if coalesce(cardinality(v_codigos), 0) < p_quantidade then raise exception 'vouchers_insuficientes'; end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('vouchers.destinados', 'contatos_relacionamento', p_contato::text, p_participacao,
          jsonb_build_object('quantidade', p_quantidade, 'contato', (select nome from public.contatos_relacionamento where id = p_contato)));
  return v_codigos;
end $$;

-- Destinar virtual: devolve código + token de cada um, para a organização montar e mandar o link.
create or replace function public.destinar_vouchers_virtuais(p_secret text, p_participacao uuid, p_contato uuid,
  p_quantidade int default 1, p_obs text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_itens jsonb;
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  if p_quantidade is null or p_quantidade < 1 then raise exception 'quantidade_invalida'; end if;
  if not exists (select 1 from public.contatos_relacionamento where id = p_contato) then raise exception 'contato_nao_encontrado'; end if;
  if (select count(*) from public.vouchers where participacao_id = p_participacao and canal = 'virtual' and status = 'disponivel') < p_quantidade then
    raise exception 'vouchers_insuficientes';
  end if;
  with escolhidos as (
    select id from public.vouchers where participacao_id = p_participacao and canal = 'virtual' and status = 'disponivel'
     order by created_at limit p_quantidade for update skip locked),
  feitos as (
    update public.vouchers v set contato_id = p_contato, status = 'destinado', destinado_em = now(),
           responsavel_rotulo = public.ator_rotulo_atual(), observacao = coalesce(nullif(btrim(p_obs), ''), v.observacao)
      from escolhidos e where v.id = e.id
    returning v.codigo, v.link_token)
  select jsonb_agg(jsonb_build_object('codigo', codigo, 'link_token', link_token)) into v_itens from feitos;
  if coalesce(jsonb_array_length(v_itens), 0) < p_quantidade then raise exception 'vouchers_insuficientes'; end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('vouchers.destinados_virtuais', 'contatos_relacionamento', p_contato::text, p_participacao,
          jsonb_build_object('quantidade', p_quantidade, 'contato', (select nome from public.contatos_relacionamento where id = p_contato)));
  return v_itens;
end $$;

-- Listagem da organização: igual a 20261115 + a cota virtual. `to_jsonb(v)` já traz canal e link_token.
create or replace function public.get_vouchers(p_secret text, p_edicao text DEFAULT NULL::text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_ed text := coalesce(p_edicao, public.edicao_atual());
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return jsonb_build_object(
    'edicao', v_ed,
    'cota', (select vouchers_por_participante from public.edicoes where codigo = v_ed),
    'cota_virtual', (select vouchers_virtuais_por_participante from public.edicoes where codigo = v_ed),
    'vouchers', coalesce((select jsonb_agg(to_jsonb(v) || jsonb_build_object(
        'marca', p.nome_marca, 'participante_id', p.id, 'contato', c.nome, 'contato_instagram', c.instagram)
        order by p.nome_marca, v.canal, v.created_at)
      from public.vouchers v
      join public.participacoes pa on pa.id = v.participacao_id
      join public.participantes p on p.id = pa.participante_id
      left join public.contatos_relacionamento c on c.id = v.contato_id
     where v.edicao_codigo = v_ed), '[]'::jsonb),
    'marcas', coalesce((select jsonb_agg(jsonb_build_object('participacao_id', pa.id, 'participante_id', p.id, 'marca', p.nome_marca)
        order by p.nome_marca)
      from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.edicao_codigo = v_ed and p.arquivado_em is null
       and (pa.status_cadastro is distinct from 'encerrado'
            or exists (select 1 from public.vouchers v where v.participacao_id = pa.id))), '[]'::jsonb));
end $function$;

-- ---------------------------------------------------------------- marca
-- Igual a 20261001: as chaves de sempre (total, distribuidos) contam só os impressos; os virtuais vêm em `virtuais`.
-- `utilizados` lista os dois canais (a marca dá baixa em qualquer um), cada item com o seu canal.
create or replace function public.marca_meus_vouchers()
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_pa uuid; v_ed text;
begin
  select pa.id, pa.edicao_codigo into v_pa, v_ed from public.participacoes pa
   where pa.participante_id = public.meu_participante() and pa.edicao_codigo = public.edicao_atual();
  if v_pa is null then return null; end if;
  return jsonb_build_object(
    'edicao', v_ed,
    'cota', (select vouchers_por_participante from public.edicoes where codigo = v_ed),
    'total', (select count(*) from public.vouchers where participacao_id = v_pa and canal = 'fisico' and status <> 'cancelado'),
    'distribuidos', (select count(*) from public.vouchers where participacao_id = v_pa and canal = 'fisico' and status in ('destinado','enviado','utilizado')),
    'virtuais', jsonb_build_object(
      'cota', (select vouchers_virtuais_por_participante from public.edicoes where codigo = v_ed),
      'total', (select count(*) from public.vouchers where participacao_id = v_pa and canal = 'virtual' and status <> 'cancelado'),
      'distribuidos', (select count(*) from public.vouchers where participacao_id = v_pa and canal = 'virtual' and status in ('destinado','enviado','utilizado'))),
    'utilizados', coalesce((select jsonb_agg(jsonb_build_object('codigo', codigo, 'canal', canal, 'utilizado_em', utilizado_em) order by utilizado_em desc)
                   from public.vouchers where participacao_id = v_pa and status = 'utilizado'), '[]'::jsonb));
end $function$;

-- ---------------------------------------------------------------- público (anônimo): a página do link
-- Um voucher por token, nunca lista. Token fora do formato ou desconhecido → null (a página explica).
-- 'estado': valido · usado · cancelado. VENCIDO é da página (compara com o fim da edição), não do banco.
create or replace function public.voucher_virtual_ver(p_token text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v public.vouchers%rowtype; q record;
begin
  if p_token is null or p_token !~ '^[a-hjkmnp-z2-9]{12}$' then return null; end if;
  select * into v from public.vouchers where link_token = p_token and canal = 'virtual';
  if not found then return null; end if;
  select p.nome_marca, pa.slug_publico into q
    from public.participacoes pa join public.participantes p on p.id = pa.participante_id where pa.id = v.participacao_id;
  return jsonb_build_object('codigo', v.codigo, 'marca', q.nome_marca, 'slug', q.slug_publico,
    'estado', case v.status when 'utilizado' then 'usado' when 'cancelado' then 'cancelado' else 'valido' end,
    'utilizado_em', v.utilizado_em);
end $$;
grant execute on function public.voucher_virtual_ver(text) to anon, authenticated;
