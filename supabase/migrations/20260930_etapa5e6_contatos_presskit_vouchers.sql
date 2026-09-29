-- =============================================================================
-- Reestruturação do painel · Etapas 5 e 6 — contatos com categorias, Press Kit
-- completo e vouchers (docs/superpowers/specs/2026-09-29-painel-reestruturacao-design.md).
--
-- CONTATOS. Uma pessoa pode ser influenciador E imprensa: `categorias text[]`
-- (várias), sem duplicar o cadastro. `tipo` continua existindo — a importação
-- e consultas antigas leem ele — e passa a ser sempre a PRIMEIRA categoria
-- (gatilho). Press Kit e Voucher não são categoria digitada: saem dos envios e
-- dos vouchers.
--
-- PRESS KIT. Os envios de outras edições continuam intactos (histórico). Entra
-- o status "sugerido" pelo painel (constou_na_lista, que já existia), o
-- responsável pelo envio e a data de recebimento.
--
-- VOUCHERS (decisão do Wilker, 29/09/2026). Cada marca da edição cede N
-- vouchers do próprio combo — N em `edicoes.vouchers_por_participante`,
-- padrão 7, nunca fixo no código. Cada voucher tem CÓDIGO ÚNICO e vale SÓ na
-- marca que o cedeu. A organização destina a um contato e marca o envio; a
-- MARCA registra o uso digitando o código no painel dela.
-- ⚠️ A marca não lê a tabela: vê a contagem e os que ela mesma usou, por RPC.
-- Se ela enxergasse os códigos ainda não usados, poderia "usar" sozinha.
-- =============================================================================

-- ── Contatos ─────────────────────────────────────────────────────────────────
alter table public.contatos_relacionamento
  add column if not exists email text,
  add column if not exists cidade text,
  add column if not exists categorias text[] not null default '{}';
update public.contatos_relacionamento set categorias = array[tipo] where categorias = '{}' and tipo is not null;
alter table public.contatos_relacionamento drop constraint if exists contatos_categorias_check;
alter table public.contatos_relacionamento add constraint contatos_categorias_check
  check (categorias <@ array['influenciador','imprensa','parceiro','convidado','outro']::text[]);

create or replace function public.contatos_sincronizar_tipo()
returns trigger language plpgsql set search_path = public as $$
begin
  if cardinality(new.categorias) = 0 and new.tipo is not null then
    new.categorias := array[new.tipo];
  elsif cardinality(new.categorias) > 0 and new.tipo is distinct from new.categorias[1] then
    new.tipo := new.categorias[1];
  end if;
  return new;
end $$;
drop trigger if exists contatos_sincronizar_tipo on public.contatos_relacionamento;
create trigger contatos_sincronizar_tipo before insert or update on public.contatos_relacionamento
  for each row execute function public.contatos_sincronizar_tipo();

-- ── Press Kit: responsável pelo envio e recebimento ─────────────────────────
alter table public.presskit_envios
  add column if not exists responsavel_envio text,
  add column if not exists recebido_em date;

-- ── Vouchers ─────────────────────────────────────────────────────────────────
alter table public.edicoes
  add column if not exists vouchers_por_participante int not null default 7
    check (vouchers_por_participante between 0 and 100);

create table if not exists public.vouchers (
  id               uuid primary key default gen_random_uuid(),
  codigo           text not null unique,
  edicao_codigo    text not null references public.edicoes(codigo) on update cascade,
  participacao_id  uuid not null references public.participacoes(id) on delete cascade,
  contato_id       uuid references public.contatos_relacionamento(id) on delete set null,
  status           text not null default 'disponivel'
                   check (status in ('disponivel','destinado','enviado','utilizado','cancelado')),
  destinado_em     timestamptz,
  enviado_em       timestamptz,
  utilizado_em     timestamptz,
  utilizado_rotulo text,
  responsavel_rotulo text,
  observacao       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists vouchers_participacao_idx on public.vouchers (participacao_id, status);
create index if not exists vouchers_contato_idx on public.vouchers (contato_id);
alter table public.vouchers enable row level security;
revoke all on public.vouchers from anon, authenticated;
drop trigger if exists vouchers_touch on public.vouchers;
create trigger vouchers_touch before update on public.vouchers for each row execute function public.tocar_updated_at();

-- Código: SCW- + 5 caracteres de um alfabeto sem I/O/0/1 (lido em voz alta,
-- digitado no balcão). Aleatoriedade do gen_random_uuid (v4); colisão é
-- barrada pelo UNIQUE e o laço tenta de novo.
create or replace function public.novo_codigo_voucher()
returns text language plpgsql volatile set search_path = public as $$
declare
  a constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea; s text; i int;
begin
  loop
    b := uuid_send(gen_random_uuid());
    s := 'SCW-';
    for i in 0..4 loop s := s || substr(a, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from public.vouchers where codigo = s);
  end loop;
  return s;
end $$;
revoke all on function public.novo_codigo_voucher() from public, anon, authenticated;

-- Completa cada marca da edição até a cota (idempotente: rodar de novo não
-- duplica; cancelado não conta, então a cota se recompõe).
create or replace function public.gerar_vouchers(p_secret text, p_edicao text default null)
returns int language plpgsql security definer set search_path = public as $$
declare v_ed text := coalesce(p_edicao, public.edicao_atual()); v_cota int; r record; n int := 0; i int;
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  select vouchers_por_participante into v_cota from public.edicoes where codigo = v_ed;
  if v_cota is null then raise exception 'edicao_nao_encontrada'; end if;
  for r in
    select pa.id, v_cota - (select count(*) from public.vouchers v where v.participacao_id = pa.id and v.status <> 'cancelado') falta
      from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.edicao_codigo = v_ed and p.arquivado_em is null
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
end $$;

create or replace function public.get_vouchers(p_secret text, p_edicao text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
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
     where pa.edicao_codigo = v_ed and p.arquivado_em is null), '[]'::jsonb));
end $$;

-- Destina N vouchers DISPONÍVEIS de uma marca a um contato (o banco escolhe
-- quais; a tela não precisa conhecer códigos para distribuir).
create or replace function public.destinar_vouchers(p_secret text, p_participacao uuid, p_contato uuid,
  p_quantidade int default 1, p_obs text default null)
returns text[] language plpgsql security definer set search_path = public as $$
declare v_codigos text[];
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  if p_quantidade is null or p_quantidade < 1 then raise exception 'quantidade_invalida'; end if;
  if not exists (select 1 from public.contatos_relacionamento where id = p_contato) then raise exception 'contato_nao_encontrado'; end if;
  -- Confere ANTES de mexer: ou destina todos os pedidos, ou nenhum.
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

-- Muda um voucher: enviar, cancelar, voltar a destinado, ou liberar
-- (disponivel = sem dono de novo). 'utilizado' é SÓ da marca.
create or replace function public.atualizar_voucher(p_secret text, p_voucher uuid, p_status text, p_obs text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v public.vouchers%rowtype;
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  if p_status not in ('disponivel','destinado','enviado','cancelado') then raise exception 'status_invalido'; end if;
  select * into v from public.vouchers where id = p_voucher for update;
  if not found then raise exception 'voucher_nao_encontrado'; end if;
  if v.status = 'utilizado' then raise exception 'voucher_ja_utilizado'; end if;
  if p_status in ('destinado','enviado') and v.contato_id is null then raise exception 'voucher_sem_contato'; end if;
  update public.vouchers set
    status = p_status,
    contato_id = case when p_status = 'disponivel' then null else contato_id end,
    destinado_em = case when p_status = 'disponivel' then null else destinado_em end,
    enviado_em = case when p_status = 'enviado' then coalesce(enviado_em, now()) when p_status = 'disponivel' then null else enviado_em end,
    responsavel_rotulo = public.ator_rotulo_atual(),
    observacao = coalesce(nullif(btrim(p_obs), ''), observacao)
   where id = p_voucher;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('voucher.' || p_status, 'vouchers', p_voucher::text, v.participacao_id,
          jsonb_build_object('codigo', v.codigo, 'contato', (select nome from public.contatos_relacionamento where id = v.contato_id)));
end $$;

-- A marca registra o uso. Só o código de uma participação DELA; resposta
-- igual para "não existe" e "é de outra marca" (não revela código alheio).
create or replace function public.marca_usar_voucher(p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.vouchers%rowtype; v_part uuid; v_marca text;
begin
  select v2.* into v from public.vouchers v2
    join public.participacoes pa on pa.id = v2.participacao_id
    join public.participantes p on p.id = pa.participante_id
   where v2.codigo = upper(regexp_replace(coalesce(p_codigo, ''), '\s', '', 'g'))
     and p.user_id = auth.uid() and public.conta_ativa()
   for update of v2;
  if not found then raise exception 'voucher_nao_encontrado'; end if;
  if v.status = 'utilizado' then raise exception 'voucher_ja_utilizado'; end if;
  if v.status = 'cancelado' then raise exception 'voucher_cancelado'; end if;
  if v.status = 'disponivel' then raise exception 'voucher_nao_distribuido'; end if;
  update public.vouchers set status = 'utilizado', utilizado_em = now(), utilizado_rotulo = public.ator_rotulo_atual()
   where id = v.id;
  select pa.participante_id, p.nome_marca into v_part, v_marca
    from public.participacoes pa join public.participantes p on p.id = pa.participante_id where pa.id = v.participacao_id;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('voucher.utilizado', 'vouchers', v.id::text, v_part, v.participacao_id, jsonb_build_object('codigo', v.codigo));
  perform public.notificar('organizacao', null, 'voucher', v_marca || ' registrou um voucher', v.codigo, 'contatos/vouchers');
  return jsonb_build_object('codigo', v.codigo, 'utilizado_em', now());
end $$;

create or replace function public.marca_meus_vouchers()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_pa uuid; v_ed text;
begin
  select pa.id, pa.edicao_codigo into v_pa, v_ed from public.participacoes pa
    join public.participantes p on p.id = pa.participante_id
   where p.user_id = auth.uid() and pa.edicao_codigo = public.edicao_atual();
  if v_pa is null then return null; end if;
  return jsonb_build_object(
    'edicao', v_ed,
    'cota', (select vouchers_por_participante from public.edicoes where codigo = v_ed),
    'total', (select count(*) from public.vouchers where participacao_id = v_pa and status <> 'cancelado'),
    'distribuidos', (select count(*) from public.vouchers where participacao_id = v_pa and status in ('destinado','enviado','utilizado')),
    'utilizados', coalesce((select jsonb_agg(jsonb_build_object('codigo', codigo, 'utilizado_em', utilizado_em) order by utilizado_em desc)
                   from public.vouchers where participacao_id = v_pa and status = 'utilizado'), '[]'::jsonb));
end $$;

-- ── Salvar contato: e-mail, cidade, categorias ──────────────────────────────
create or replace function public.salvar_contato(p_secret text, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p_dados ->> 'id', '')::uuid;
  v_cat text[] := case when p_dados ? 'categorias'
                    then array(select jsonb_array_elements_text(p_dados -> 'categorias'))
                    else null end;
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  if coalesce(btrim(p_dados ->> 'nome'), '') = '' then raise exception 'nome_obrigatorio'; end if;
  if v_id is null then
    insert into public.contatos_relacionamento (nome, instagram, telefone, email, cidade, endereco, bairro, observacoes,
                                                tipo, categorias, fonte)
    values (btrim(p_dados ->> 'nome'), nullif(btrim(p_dados ->> 'instagram'), ''), nullif(btrim(p_dados ->> 'telefone'), ''),
            nullif(btrim(p_dados ->> 'email'), ''), nullif(btrim(p_dados ->> 'cidade'), ''),
            nullif(btrim(p_dados ->> 'endereco'), ''), nullif(btrim(p_dados ->> 'bairro'), ''),
            nullif(btrim(p_dados ->> 'observacoes'), ''),
            coalesce(v_cat[1], p_dados ->> 'tipo', 'influenciador'),
            coalesce(v_cat, array[coalesce(p_dados ->> 'tipo', 'influenciador')]),
            'Painel · ' || public.ator_rotulo_atual())
    returning id into v_id;
  else
    update public.contatos_relacionamento set
      nome = btrim(p_dados ->> 'nome'),
      instagram = case when p_dados ? 'instagram' then nullif(btrim(p_dados ->> 'instagram'), '') else instagram end,
      telefone = case when p_dados ? 'telefone' then nullif(btrim(p_dados ->> 'telefone'), '') else telefone end,
      email = case when p_dados ? 'email' then nullif(btrim(p_dados ->> 'email'), '') else email end,
      cidade = case when p_dados ? 'cidade' then nullif(btrim(p_dados ->> 'cidade'), '') else cidade end,
      endereco = case when p_dados ? 'endereco' then nullif(btrim(p_dados ->> 'endereco'), '') else endereco end,
      bairro = case when p_dados ? 'bairro' then nullif(btrim(p_dados ->> 'bairro'), '') else bairro end,
      observacoes = case when p_dados ? 'observacoes' then nullif(btrim(p_dados ->> 'observacoes'), '') else observacoes end,
      categorias = coalesce(v_cat, categorias),
      tipo = coalesce(v_cat[1], p_dados ->> 'tipo', tipo),
      ativo = coalesce((p_dados ->> 'ativo')::boolean, ativo)
     where id = v_id;
    if not found then raise exception 'contato_nao_encontrado'; end if;
  end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('contato.salvo', 'contatos_relacionamento', v_id::text,
          jsonb_build_object('nome', p_dados ->> 'nome', 'campos', (select jsonb_agg(k) from jsonb_object_keys(p_dados) k)));
  return v_id;
end $$;

-- ── Press Kit: sugerido, responsável pelo envio, recebimento ────────────────
create or replace function public.definir_presskit(p_secret text, p_contato uuid, p_status text, p_dados jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_ed text := coalesce(p_dados ->> 'edicao_codigo', public.edicao_atual());
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  if p_status not in ('constou_na_lista','selecionado','confirmado','enviado','entregue','nao_entregue','cancelado') then
    raise exception 'status_invalido';
  end if;
  insert into public.presskit_envios (contato_id, edicao_codigo, status, data, voucher, itens, endereco_confirmado,
                                      observacao, responsavel_envio, recebido_em, fonte, responsavel, responsavel_rotulo)
  values (p_contato, v_ed, p_status, nullif(p_dados ->> 'data', '')::date, nullif(p_dados ->> 'voucher', ''),
          nullif(p_dados ->> 'itens', ''), nullif(p_dados ->> 'endereco_confirmado', ''),
          nullif(p_dados ->> 'observacao', ''), nullif(p_dados ->> 'responsavel_envio', ''),
          coalesce(nullif(p_dados ->> 'recebido_em', '')::date, case when p_status = 'entregue' then current_date end),
          'Painel', auth.uid(), public.ator_rotulo_atual())
  on conflict (contato_id, edicao_codigo) where edicao_codigo is not null do update set
    status = excluded.status,
    data = case when p_dados ? 'data' then excluded.data else presskit_envios.data end,
    voucher = coalesce(excluded.voucher, presskit_envios.voucher),
    itens = case when p_dados ? 'itens' then excluded.itens else presskit_envios.itens end,
    endereco_confirmado = case when p_dados ? 'endereco_confirmado' then excluded.endereco_confirmado else presskit_envios.endereco_confirmado end,
    observacao = case when p_dados ? 'observacao' then excluded.observacao else presskit_envios.observacao end,
    responsavel_envio = case when p_dados ? 'responsavel_envio' then excluded.responsavel_envio else presskit_envios.responsavel_envio end,
    recebido_em = coalesce(case when p_dados ? 'recebido_em' then excluded.recebido_em end,
                           presskit_envios.recebido_em,
                           case when p_status = 'entregue' then current_date end),
    responsavel = auth.uid(), responsavel_rotulo = public.ator_rotulo_atual();
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('presskit.' || p_status, 'contatos_relacionamento', p_contato::text,
          jsonb_build_object('edicao', v_ed) || p_dados);
end $$;

-- ── Leituras ─────────────────────────────────────────────────────────────────
create or replace function public.get_contatos(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ed text := public.edicao_atual();
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'nome', c.nome, 'instagram', c.instagram, 'telefone', c.telefone, 'email', c.email,
      'cidade', c.cidade, 'endereco', c.endereco, 'bairro', c.bairro, 'tipo', c.tipo, 'categorias', c.categorias,
      'ativo', c.ativo, 'observacoes', c.observacoes,
      'recebimentos', (select count(*) from public.presskit_envios e where e.contato_id = c.id
                        and e.status in ('constou_na_lista','enviado','entregue')
                        and e.edicao_codigo is distinct from v_ed),
      'ultima_edicao', (select e.edicao_codigo from public.presskit_envios e join public.edicoes ed on ed.codigo = e.edicao_codigo
                         where e.contato_id = c.id and e.status in ('constou_na_lista','enviado','entregue')
                           and e.edicao_codigo is distinct from v_ed order by ed.ordem desc limit 1),
      'recebeu_ultima', exists (select 1 from public.presskit_envios e where e.contato_id = c.id
                         and e.status in ('constou_na_lista','enviado','entregue')
                         and e.edicao_codigo = (select e2.edicao_codigo from public.presskit_envios e2
                                                  join public.edicoes ed on ed.codigo = e2.edicao_codigo
                                                 where e2.edicao_codigo is distinct from v_ed
                                                 order by ed.ordem desc limit 1)),
      'atual', (select jsonb_build_object('id', e.id, 'status', e.status, 'itens', e.itens, 'data', e.data,
                         'endereco_confirmado', e.endereco_confirmado, 'responsavel_rotulo', e.responsavel_rotulo,
                         'responsavel_envio', e.responsavel_envio, 'recebido_em', e.recebido_em, 'observacao', e.observacao)
                  from public.presskit_envios e where e.contato_id = c.id and e.edicao_codigo = v_ed),
      'vouchers_edicao', (select count(*) from public.vouchers v where v.contato_id = c.id and v.edicao_codigo = v_ed
                           and v.status <> 'cancelado'),
      'vouchers_total', (select count(*) from public.vouchers v where v.contato_id = c.id and v.status <> 'cancelado'),
      'incompleto', (c.endereco is null or (c.instagram is null and c.telefone is null)),
      'pendencias', (select count(*) from public.revisao_pendencias r where r.contato_id = c.id and r.status = 'aberta'))
    order by c.nome), '[]'::jsonb) from public.contatos_relacionamento c);
end $$;

create or replace function public.get_contato(p_secret text, p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return (select to_jsonb(c) - 'dados_originais' || jsonb_build_object(
      'envios', coalesce((select jsonb_agg(to_jsonb(e) || jsonb_build_object('edicao_nome', ed.nome)
                  order by ed.ordem desc nulls last, e.created_at desc)
                  from public.presskit_envios e left join public.edicoes ed on ed.codigo = e.edicao_codigo
                 where e.contato_id = c.id), '[]'::jsonb),
      'vouchers', coalesce((select jsonb_agg(to_jsonb(v) || jsonb_build_object('marca', p.nome_marca, 'edicao_nome', ed.nome)
                  order by v.edicao_codigo desc, p.nome_marca, v.codigo)
                  from public.vouchers v
                  join public.participacoes pa on pa.id = v.participacao_id
                  join public.participantes p on p.id = pa.participante_id
                  left join public.edicoes ed on ed.codigo = v.edicao_codigo
                 where v.contato_id = c.id), '[]'::jsonb),
      'pendencias', coalesce((select jsonb_agg(to_jsonb(r)) from public.revisao_pendencias r
                               where r.contato_id = c.id and r.status = 'aberta'), '[]'::jsonb))
    from public.contatos_relacionamento c where c.id = p_id);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'gerar_vouchers(text, text)', 'get_vouchers(text, text)',
    'destinar_vouchers(text, uuid, uuid, int, text)', 'atualizar_voucher(text, uuid, text, text)',
    'salvar_contato(text, jsonb)', 'definir_presskit(text, uuid, text, jsonb)',
    'get_contatos(text)', 'get_contato(text, uuid)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  -- Da marca: só sessão autenticada.
  foreach f in array array['marca_usar_voucher(text)', 'marca_meus_vouchers()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
