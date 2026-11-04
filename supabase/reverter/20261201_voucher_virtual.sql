-- Reverte 20261201_voucher_virtual. ⚠️ APAGA todos os vouchers virtuais (e os links deles param de funcionar).
-- Os impressos não são tocados. As quatro funções voltam à definição de antes (20261115 e 20261001).

drop function if exists public.voucher_virtual_ver(text), public.destinar_vouchers_virtuais(text, uuid, uuid, int, text),
  public.gerar_vouchers_virtuais(text, text), public.novo_token_voucher();

delete from public.vouchers where canal = 'virtual';
alter table public.vouchers drop constraint if exists vouchers_token_so_virtual;
drop index if exists public.vouchers_link_token_uq;
alter table public.vouchers drop column if exists link_token, drop column if exists canal;
alter table public.edicoes drop column if exists vouchers_virtuais_por_participante;

create or replace function public.gerar_vouchers(p_secret text, p_edicao text DEFAULT NULL::text)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v_ed text := coalesce(p_edicao, public.edicao_atual()); v_cota int; r record; n int := 0; i int;
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  select vouchers_por_participante into v_cota from public.edicoes where codigo = v_ed;
  if v_cota is null then raise exception 'edicao_nao_encontrada'; end if;
  for r in
    select pa.id, v_cota - (select count(*) from public.vouchers v where v.participacao_id = pa.id and v.status <> 'cancelado') falta
      from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.edicao_codigo = v_ed and p.arquivado_em is null and pa.status_cadastro is distinct from 'encerrado'
  loop
    for i in 1..greatest(r.falta, 0) loop
      insert into public.vouchers (codigo, edicao_codigo, participacao_id) values (public.novo_codigo_voucher(), v_ed, r.id);
      n := n + 1;
    end loop;
  end loop;
  if n > 0 then
    insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
    values ('vouchers.gerados', 'vouchers', v_ed, jsonb_build_object('edicao', v_ed, 'quantidade', n, 'cota', v_cota));
  end if;
  return n;
end $function$;

create or replace function public.destinar_vouchers(p_secret text, p_participacao uuid, p_contato uuid,
  p_quantidade int default 1, p_obs text default null)
returns text[] language plpgsql security definer set search_path = public as $$
declare v_codigos text[];
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  if p_quantidade is null or p_quantidade < 1 then raise exception 'quantidade_invalida'; end if;
  if not exists (select 1 from public.contatos_relacionamento where id = p_contato) then raise exception 'contato_nao_encontrado'; end if;
  if (select count(*) from public.vouchers where participacao_id = p_participacao and status = 'disponivel') < p_quantidade then
    raise exception 'vouchers_insuficientes';
  end if;
  with escolhidos as (
    select id from public.vouchers where participacao_id = p_participacao and status = 'disponivel'
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

create or replace function public.get_vouchers(p_secret text, p_edicao text DEFAULT NULL::text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_ed text := coalesce(p_edicao, public.edicao_atual());
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return jsonb_build_object(
    'edicao', v_ed,
    'cota', (select vouchers_por_participante from public.edicoes where codigo = v_ed),
    'vouchers', coalesce((select jsonb_agg(to_jsonb(v) || jsonb_build_object(
        'marca', p.nome_marca, 'participante_id', p.id, 'contato', c.nome, 'contato_instagram', c.instagram)
        order by p.nome_marca, v.created_at)
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
    'total', (select count(*) from public.vouchers where participacao_id = v_pa and status <> 'cancelado'),
    'distribuidos', (select count(*) from public.vouchers where participacao_id = v_pa and status in ('destinado','enviado','utilizado')),
    'utilizados', coalesce((select jsonb_agg(jsonb_build_object('codigo', codigo, 'utilizado_em', utilizado_em) order by utilizado_em desc)
                   from public.vouchers where participacao_id = v_pa and status = 'utilizado'), '[]'::jsonb));
end $function$;
