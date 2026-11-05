-- Caça aos Carimbos, grupos privados e rota colaborativa (Wilker, 04/11/2026; docs/cartoon-2026-2/15-caca-especificacao.md §7 e §8).
-- Contrato das funções: docs/cartoon-2026-2/15-caca-contrato-grupos.md. Teste: supabase/testes/caca-grupos.sql.
-- ADITIVA: só tabelas e funções novas (prefixo caca_grupo_*). Não altera mapa_*, carimbo_*, caca_placar_v2, vouchers.
--
-- Regras (todas no servidor; o front nunca decide acesso):
--   · PESSOA = e-mail normalizado do mapa (mapas_lover.email_norm). Dois mapas com o mesmo e-mail = UM integrante.
--   · O acesso a tudo é pela chave pessoal do mapa (mapa_hash). Quem não é integrante ativo recebe 'negado', igual a
--     "grupo inexistente" (não revela se o grupo existe).
--   · O convite (link com token) NÃO torna o conteúdo público: convite_ver devolve só nome, quantidade e validade.
--     Entrar exige mapa próprio e o aceite de que apelido e progresso serão vistos (aceite_visibilidade_em NOT NULL).
--   · Entrar no grupo não cria carimbo; a rota é lista de planejamento e nunca marca visita.
--   · Ranking do grupo = caca_placar_v2 filtrado nos integrantes, reordenado entre eles: mais casas, depois mais extras,
--     empate = MESMA posição. Quem ainda não validou casa: posicao null.
--   · Progresso coletivo = casas DIFERENTES validadas por pelo menos um integrante (cada casa conta uma vez).
--   · Convites: qualquer integrante gera link novo; SÓ O DONO revoga. Revogar revoga todos os ativos e trava a geração por
--     integrantes (convites_so_dono) até o dono gerar um novo. Só o hash do token fica no banco: o link não é recuperável.
--   · Dono que sai passa o grupo ao integrante ativo mais antigo; se não sobra ninguém, os convites são revogados.
--   · Dono pode remover integrante; removido não volta pelo mesmo convite (removido_em).
--   · Rota: dense 1..n, ordem consistente sob concorrência (advisory lock por grupo + versão otimista opcional).
-- Reverter: supabase/reverter/20261206_caca_grupos.sql (ou o bloco "-- reverter:" no fim deste arquivo).

-- ---------------------------------------------------------------- configuração (ajustável por UPDATE, sem migration)
create table if not exists public.caca_grupo_config (
  chave text primary key,
  valor int not null check (valor > 0)
);
insert into public.caca_grupo_config (chave, valor) values
  ('max_membros', 30),             -- integrantes ativos por grupo
  ('max_grupos_por_pessoa', 5),    -- grupos ativos por pessoa e edição
  ('convite_validade_dias', 7),    -- validade de um link novo
  ('max_convites_ativos', 5)       -- links ativos por grupo
on conflict (chave) do nothing;

-- ---------------------------------------------------------------- tabelas (RLS ligado, sem política)
create table if not exists public.caca_grupo (
  id uuid primary key default gen_random_uuid(),
  edicao_codigo text not null references public.edicoes(codigo) on update cascade,
  nome text not null check (char_length(nome) between 2 and 40),
  criado_por_mapa uuid references public.mapas_lover(id) on delete set null,
  convites_so_dono boolean not null default false,
  rota_versao integer not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists caca_grupo_edicao on public.caca_grupo (edicao_codigo);

create table if not exists public.caca_grupo_membro (
  id uuid not null default gen_random_uuid() unique,   -- referência pública do integrante (nunca o e-mail)
  grupo_id uuid not null references public.caca_grupo(id) on delete cascade,
  pessoa text not null check (pessoa ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),   -- email_norm
  mapa_id uuid references public.mapas_lover(id) on delete set null,     -- mapa de quem entrou
  apelido_snapshot text not null check (char_length(apelido_snapshot) between 2 and 24),
  papel text not null default 'membro' check (papel in ('dono', 'membro')),
  entrou_em timestamptz not null default now(),
  aceite_visibilidade_em timestamptz not null,
  saiu_em timestamptz,
  removido_em timestamptz,
  primary key (grupo_id, pessoa)
);
create index if not exists caca_grupo_membro_pessoa on public.caca_grupo_membro (pessoa) where saiu_em is null;
create unique index if not exists caca_grupo_um_dono on public.caca_grupo_membro (grupo_id) where papel = 'dono' and saiu_em is null;

create table if not exists public.caca_grupo_convite (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.caca_grupo(id) on delete cascade,
  token_hash text not null unique,
  expira_em timestamptz not null,
  revogado_em timestamptz,
  usos int not null default 0,
  max_usos int check (max_usos is null or max_usos > 0),
  criado_por text not null,            -- pessoa (email_norm)
  criado_em timestamptz not null default now()
);
create index if not exists caca_grupo_convite_grupo on public.caca_grupo_convite (grupo_id);

create table if not exists public.caca_grupo_rota (
  grupo_id uuid not null references public.caca_grupo(id) on delete cascade,
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  posicao int not null check (posicao >= 1),
  adicionado_por_pessoa text not null,
  adicionado_em timestamptz not null default now(),
  primary key (grupo_id, participacao_id),                                    -- uma casa por grupo
  constraint caca_grupo_rota_posicao unique (grupo_id, posicao) deferrable initially deferred
);

alter table public.caca_grupo_config enable row level security;
alter table public.caca_grupo enable row level security;
alter table public.caca_grupo_membro enable row level security;
alter table public.caca_grupo_convite enable row level security;
alter table public.caca_grupo_rota enable row level security;
revoke all on table public.caca_grupo_config, public.caca_grupo, public.caca_grupo_membro,
                    public.caca_grupo_convite, public.caca_grupo_rota from public, anon, authenticated;

-- ---------------------------------------------------------------- internas (sem grant)
create or replace function public.caca_grupo_cfg(p_chave text, p_padrao int)
 returns int language sql stable security definer set search_path to 'public'
as $$ select coalesce((select c.valor from public.caca_grupo_config c where c.chave = p_chave), p_padrao) $$;

-- Mesmo critério de total_casas de mapa_ler_v2: casa não encerrada com publicação vigente.
create or replace function public.caca_grupo_total(p_edicao text)
 returns int language sql stable security definer set search_path to 'public'
as $$
  select count(*)::int from public.participacoes pa
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente)
$$;

-- Apelido atual da pessoa (perfil do mapa mais recente, igual ao do placar); sem mapa, o da entrada.
create or replace function public.caca_grupo_apelido(p_edicao text, p_pessoa text, p_snapshot text)
 returns text language sql stable security definer set search_path to 'public'
as $$
  select coalesce((select m.apelido from public.mapas_lover m
                    where m.edicao_codigo = p_edicao and m.email_norm = p_pessoa
                    order by m.criado_em desc, m.id limit 1), p_snapshot)
$$;

-- Casas distintas validadas por pelo menos um integrante ATIVO (mesma regra de caca_placar_v2: carimbo não anulado
-- + avaliação da casa pelo mesmo e-mail). Cada casa aparece uma vez.
create or replace function public.caca_grupo_casas(p_grupo uuid)
 returns table (participacao_id uuid, slug text)
 language sql stable security definer set search_path to 'public'
as $$
  select distinct k.participacao_id, pa.slug_publico
    from public.caca_grupo g
    join public.caca_grupo_membro gm on gm.grupo_id = g.id and gm.saiu_em is null
    join public.mapas_lover m on m.edicao_codigo = g.edicao_codigo and m.email_norm = gm.pessoa
    join public.carimbos k on k.mapa_id = m.id and k.anulado_em is null
    join public.participacoes pa on pa.id = k.participacao_id
   where g.id = p_grupo
     and exists (select 1 from public.avaliacoes a
                  where a.edicao_codigo = g.edicao_codigo and a.participacao_id = k.participacao_id
                    and a.email_norm = m.email_norm)
$$;

create or replace function public.caca_grupo_rota_json(p_grupo uuid)
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'posicao', r.posicao, 'slug', pa.slug_publico,
           'adicionado_por', public.caca_grupo_apelido(g.edicao_codigo, r.adicionado_por_pessoa, gm.apelido_snapshot),
           'adicionado_por_membro', gm.id, 'adicionado_em', r.adicionado_em) order by r.posicao), '[]'::jsonb)
    from public.caca_grupo_rota r
    join public.caca_grupo g on g.id = r.grupo_id
    join public.participacoes pa on pa.id = r.participacao_id
    left join public.caca_grupo_membro gm on gm.grupo_id = r.grupo_id and gm.pessoa = r.adicionado_por_pessoa
   where r.grupo_id = p_grupo
$$;

create or replace function public.caca_grupo_lock(p_grupo uuid)
 returns void language sql volatile security definer set search_path to 'public'
as $$ select pg_advisory_xact_lock(hashtextextended('caca_grupo:' || p_grupo::text, 0)) $$;

-- 24 bytes aleatórios em base64url (32 caracteres), como a chave do mapa.
create or replace function public.caca_grupo_token_novo()
 returns text language sql volatile security definer set search_path to 'public'
as $$ select rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=') $$;

revoke all on function public.caca_grupo_cfg(text, int) from public, anon, authenticated;
revoke all on function public.caca_grupo_total(text) from public, anon, authenticated;
revoke all on function public.caca_grupo_apelido(text, text, text) from public, anon, authenticated;
revoke all on function public.caca_grupo_casas(uuid) from public, anon, authenticated;
revoke all on function public.caca_grupo_rota_json(uuid) from public, anon, authenticated;
revoke all on function public.caca_grupo_lock(uuid) from public, anon, authenticated;
revoke all on function public.caca_grupo_token_novo() from public, anon, authenticated;

-- ---------------------------------------------------------------- criar / convite
create or replace function public.caca_grupo_criar(p_chave text, p_nome text, p_aceite_visibilidade boolean default false)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_nome text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_id uuid; v_tok text; v_exp timestamptz;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if char_length(v_nome) not between 2 and 40 then return jsonb_build_object('ok', false, 'motivo', 'nome_invalido'); end if;
  if not coalesce(p_aceite_visibilidade, false) then return jsonb_build_object('ok', false, 'motivo', 'aceite_obrigatorio'); end if;
  if (select count(*) from public.caca_grupo_membro gm join public.caca_grupo g on g.id = gm.grupo_id
       where gm.pessoa = m.email_norm and gm.saiu_em is null and g.edicao_codigo = m.edicao_codigo)
     >= public.caca_grupo_cfg('max_grupos_por_pessoa', 5)
    then return jsonb_build_object('ok', false, 'motivo', 'limite_grupos'); end if;
  insert into public.caca_grupo (edicao_codigo, nome, criado_por_mapa) values (m.edicao_codigo, v_nome, m.id) returning id into v_id;
  insert into public.caca_grupo_membro (grupo_id, pessoa, mapa_id, apelido_snapshot, papel, aceite_visibilidade_em)
  values (v_id, m.email_norm, m.id, m.apelido, 'dono', now());
  v_tok := public.caca_grupo_token_novo();
  v_exp := now() + make_interval(days => public.caca_grupo_cfg('convite_validade_dias', 7));
  insert into public.caca_grupo_convite (grupo_id, token_hash, expira_em, criado_por) values (v_id, public.mapa_hash(v_tok), v_exp, m.email_norm);
  return jsonb_build_object('ok', true, 'grupo_id', v_id, 'nome', v_nome, 'convite_token', v_tok, 'convite_expira_em', v_exp);
end $$;

-- Anônimo. Só o que o convite pode mostrar: nome, quantos já estão, e se ainda vale. Nada dos integrantes.
create or replace function public.caca_grupo_convite_ver(p_token text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare c public.caca_grupo_convite%rowtype; g public.caca_grupo%rowtype; v_qtd int; v_motivo text;
begin
  select * into c from public.caca_grupo_convite where token_hash = public.mapa_hash(p_token);
  if c.id is null then return jsonb_build_object('valido', false, 'nome_do_grupo', null, 'membros_qtd', null, 'motivo', 'convite_invalido'); end if;
  select * into g from public.caca_grupo where id = c.grupo_id;
  select count(*)::int into v_qtd from public.caca_grupo_membro gm where gm.grupo_id = c.grupo_id and gm.saiu_em is null;
  v_motivo := case when c.revogado_em is not null then 'convite_revogado'
                   when c.expira_em <= now() then 'convite_expirado'
                   when c.max_usos is not null and c.usos >= c.max_usos then 'convite_esgotado'
                   when v_qtd = 0 then 'convite_invalido' end;
  if v_motivo is not null then return jsonb_build_object('valido', false, 'nome_do_grupo', null, 'membros_qtd', null, 'motivo', v_motivo); end if;
  return jsonb_build_object('valido', true, 'nome_do_grupo', g.nome, 'membros_qtd', v_qtd);
end $$;

create or replace function public.caca_grupo_convite_novo(p_chave text, p_grupo uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; g public.caca_grupo%rowtype; me public.caca_grupo_membro%rowtype; v_tok text; v_exp timestamptz;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if p_grupo is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  perform public.caca_grupo_lock(p_grupo);
  select * into g from public.caca_grupo where id = p_grupo and edicao_codigo = m.edicao_codigo;
  select * into me from public.caca_grupo_membro where grupo_id = p_grupo and pessoa = m.email_norm and saiu_em is null;
  if g.id is null or me.id is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if g.convites_so_dono and me.papel <> 'dono' then return jsonb_build_object('ok', false, 'motivo', 'so_dono'); end if;
  if (select count(*) from public.caca_grupo_convite c
       where c.grupo_id = p_grupo and c.revogado_em is null and c.expira_em > now()
         and (c.max_usos is null or c.usos < c.max_usos)) >= public.caca_grupo_cfg('max_convites_ativos', 5)
    then return jsonb_build_object('ok', false, 'motivo', 'limite_convites'); end if;
  v_tok := public.caca_grupo_token_novo();
  v_exp := now() + make_interval(days => public.caca_grupo_cfg('convite_validade_dias', 7));
  insert into public.caca_grupo_convite (grupo_id, token_hash, expira_em, criado_por) values (p_grupo, public.mapa_hash(v_tok), v_exp, m.email_norm);
  if me.papel = 'dono' and g.convites_so_dono then update public.caca_grupo set convites_so_dono = false where id = p_grupo; end if;
  return jsonb_build_object('ok', true, 'convite_token', v_tok, 'convite_expira_em', v_exp);
end $$;

-- Só o dono. Revoga TODOS os links ativos e trava a geração por integrantes até o dono gerar outro.
create or replace function public.caca_grupo_convite_revogar(p_chave text, p_grupo uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; me public.caca_grupo_membro%rowtype; v_n int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if p_grupo is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  perform public.caca_grupo_lock(p_grupo);
  select gm.* into me from public.caca_grupo_membro gm join public.caca_grupo g on g.id = gm.grupo_id
   where gm.grupo_id = p_grupo and gm.pessoa = m.email_norm and gm.saiu_em is null and g.edicao_codigo = m.edicao_codigo;
  if me.id is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if me.papel <> 'dono' then return jsonb_build_object('ok', false, 'motivo', 'so_dono'); end if;
  update public.caca_grupo_convite set revogado_em = now() where grupo_id = p_grupo and revogado_em is null;
  get diagnostics v_n = row_count;
  update public.caca_grupo set convites_so_dono = true where id = p_grupo;
  return jsonb_build_object('ok', true, 'revogados', v_n);
end $$;

-- ---------------------------------------------------------------- entrar / sair / remover
create or replace function public.caca_grupo_entrar(p_chave text, p_token text, p_aceite_visibilidade boolean default false)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; c public.caca_grupo_convite%rowtype; g public.caca_grupo%rowtype; me public.caca_grupo_membro%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  select * into c from public.caca_grupo_convite where token_hash = public.mapa_hash(p_token);
  if c.id is null then return jsonb_build_object('ok', false, 'motivo', 'convite_invalido'); end if;
  perform public.caca_grupo_lock(c.grupo_id);
  select * into c from public.caca_grupo_convite where id = c.id;     -- relê já com o lock (usos / revogação)
  select * into g from public.caca_grupo where id = c.grupo_id;
  if g.edicao_codigo <> m.edicao_codigo then return jsonb_build_object('ok', false, 'motivo', 'edicao_diferente'); end if;
  select * into me from public.caca_grupo_membro where grupo_id = g.id and pessoa = m.email_norm;
  -- Idempotente: quem já é integrante (inclusive por OUTRO mapa do mesmo e-mail) recebe ok, sem novo uso do convite.
  if me.id is not null and me.saiu_em is null then
    return jsonb_build_object('ok', true, 'grupo_id', g.id, 'nome', g.nome, 'ja_membro', true);
  end if;
  if c.revogado_em is not null then return jsonb_build_object('ok', false, 'motivo', 'convite_revogado'); end if;
  if c.expira_em <= now() then return jsonb_build_object('ok', false, 'motivo', 'convite_expirado'); end if;
  if c.max_usos is not null and c.usos >= c.max_usos then return jsonb_build_object('ok', false, 'motivo', 'convite_esgotado'); end if;
  if me.removido_em is not null then return jsonb_build_object('ok', false, 'motivo', 'removido_do_grupo'); end if;
  if not coalesce(p_aceite_visibilidade, false) then return jsonb_build_object('ok', false, 'motivo', 'aceite_obrigatorio'); end if;
  if not exists (select 1 from public.caca_grupo_membro gm where gm.grupo_id = g.id and gm.saiu_em is null)
    then return jsonb_build_object('ok', false, 'motivo', 'convite_invalido'); end if;     -- grupo sem ninguém: convite morto
  if (select count(*) from public.caca_grupo_membro gm where gm.grupo_id = g.id and gm.saiu_em is null)
     >= public.caca_grupo_cfg('max_membros', 30)
    then return jsonb_build_object('ok', false, 'motivo', 'grupo_cheio'); end if;
  if (select count(*) from public.caca_grupo_membro gm join public.caca_grupo g2 on g2.id = gm.grupo_id
       where gm.pessoa = m.email_norm and gm.saiu_em is null and g2.edicao_codigo = m.edicao_codigo)
     >= public.caca_grupo_cfg('max_grupos_por_pessoa', 5)
    then return jsonb_build_object('ok', false, 'motivo', 'limite_grupos'); end if;
  insert into public.caca_grupo_membro (grupo_id, pessoa, mapa_id, apelido_snapshot, papel, aceite_visibilidade_em)
  values (g.id, m.email_norm, m.id, m.apelido, 'membro', now())
  on conflict (grupo_id, pessoa) do update
     set mapa_id = excluded.mapa_id, apelido_snapshot = excluded.apelido_snapshot, papel = 'membro',
         entrou_em = now(), aceite_visibilidade_em = excluded.aceite_visibilidade_em, saiu_em = null;
  update public.caca_grupo_convite set usos = usos + 1 where id = c.id;
  return jsonb_build_object('ok', true, 'grupo_id', g.id, 'nome', g.nome, 'ja_membro', false);
end $$;

create or replace function public.caca_grupo_sair(p_chave text, p_grupo uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; me public.caca_grupo_membro%rowtype; v_prox uuid;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if p_grupo is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  perform public.caca_grupo_lock(p_grupo);
  select gm.* into me from public.caca_grupo_membro gm join public.caca_grupo g on g.id = gm.grupo_id
   where gm.grupo_id = p_grupo and gm.pessoa = m.email_norm and gm.saiu_em is null and g.edicao_codigo = m.edicao_codigo;
  if me.id is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  update public.caca_grupo_membro set saiu_em = now(), papel = 'membro' where id = me.id;
  if me.papel = 'dono' then
    select gm.id into v_prox from public.caca_grupo_membro gm
     where gm.grupo_id = p_grupo and gm.saiu_em is null order by gm.entrou_em, gm.id limit 1;
    if v_prox is not null then update public.caca_grupo_membro set papel = 'dono' where id = v_prox;
    else update public.caca_grupo_convite set revogado_em = now() where grupo_id = p_grupo and revogado_em is null; end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.caca_grupo_remover_membro(p_chave text, p_grupo uuid, p_membro uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; me public.caca_grupo_membro%rowtype; alvo public.caca_grupo_membro%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if p_grupo is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  perform public.caca_grupo_lock(p_grupo);
  select gm.* into me from public.caca_grupo_membro gm join public.caca_grupo g on g.id = gm.grupo_id
   where gm.grupo_id = p_grupo and gm.pessoa = m.email_norm and gm.saiu_em is null and g.edicao_codigo = m.edicao_codigo;
  if me.id is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if me.papel <> 'dono' then return jsonb_build_object('ok', false, 'motivo', 'so_dono'); end if;
  select * into alvo from public.caca_grupo_membro where id = p_membro and grupo_id = p_grupo and saiu_em is null;
  if alvo.id is null then return jsonb_build_object('ok', false, 'motivo', 'membro_desconhecido'); end if;
  if alvo.id = me.id then return jsonb_build_object('ok', false, 'motivo', 'use_sair'); end if;
  update public.caca_grupo_membro set saiu_em = now(), removido_em = now() where id = alvo.id;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- listar / ler
create or replace function public.caca_grupo_listar(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_total int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  v_total := public.caca_grupo_total(m.edicao_codigo);
  return jsonb_build_object('ok', true, 'total_casas', v_total, 'grupos', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'grupo_id', g.id, 'nome', g.nome, 'papel', gm.papel, 'entrou_em', gm.entrou_em,
             'membros_qtd', (select count(*)::int from public.caca_grupo_membro x where x.grupo_id = g.id and x.saiu_em is null),
             'casas_coletivas', (select count(*)::int from public.caca_grupo_casas(g.id)),
             'total_casas', v_total) order by gm.entrou_em desc, g.id), '[]'::jsonb)
      from public.caca_grupo_membro gm join public.caca_grupo g on g.id = gm.grupo_id
     where gm.pessoa = m.email_norm and gm.saiu_em is null and g.edicao_codigo = m.edicao_codigo));
end $$;

create or replace function public.caca_grupo_ler(p_chave text, p_grupo uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; g public.caca_grupo%rowtype; me public.caca_grupo_membro%rowtype;
  v_total int; v_membros jsonb; v_slugs jsonb; v_n int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  select * into g from public.caca_grupo where id = p_grupo and edicao_codigo = m.edicao_codigo;
  select * into me from public.caca_grupo_membro where grupo_id = p_grupo and pessoa = m.email_norm and saiu_em is null;
  if g.id is null or me.id is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  v_total := public.caca_grupo_total(g.edicao_codigo);
  select coalesce(jsonb_agg(jsonb_build_object(
           'membro_id', x.id, 'apelido', x.ap, 'papel', x.papel, 'casas', x.casas, 'extras', x.extras,
           'posicao', x.pos, 'entrou_em', x.entrou_em, 'eu', x.id = me.id) order by x.pos nulls last, x.ap, x.id), '[]'::jsonb)
    into v_membros
    from (select s.*, case when s.casas > 0 then (rank() over (order by s.casas desc, s.extras desc))::int end pos
            from (select gm.id, gm.papel, gm.entrou_em,
                         public.caca_grupo_apelido(g.edicao_codigo, gm.pessoa, gm.apelido_snapshot) ap,
                         coalesce(p.casas, 0) casas, coalesce(p.extras, 0) extras
                    from public.caca_grupo_membro gm
                    left join public.caca_placar_v2(g.edicao_codigo) p on p.pessoa = gm.pessoa
                   where gm.grupo_id = g.id and gm.saiu_em is null) s) x;
  select coalesce(jsonb_agg(c.slug order by c.slug), '[]'::jsonb), count(*)::int into v_slugs, v_n from public.caca_grupo_casas(g.id) c;
  return jsonb_build_object(
    'ok', true,
    'grupo', jsonb_build_object('id', g.id, 'nome', g.nome, 'criado_em', g.criado_em, 'convites_so_dono', g.convites_so_dono),
    'eu', jsonb_build_object('membro_id', me.id, 'papel', me.papel),
    'membros', v_membros,
    'total_casas', v_total, 'casas_coletivas', v_n, 'faltam_coletivo', greatest(v_total - v_n, 0), 'casas_coletivas_slugs', v_slugs,
    'rota_versao', g.rota_versao, 'rota', public.caca_grupo_rota_json(g.id));
end $$;

-- ---------------------------------------------------------------- rota colaborativa
-- Uma função de operação, três portas públicas. Lista de planejamento: NUNCA marca visita nem cria carimbo.
create or replace function public.caca_grupo_rota_op(p_chave text, p_grupo uuid, p_op text, p_slug text, p_pos int, p_versao int)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; g public.caca_grupo%rowtype; v_casa uuid; v_old int; v_n int; v_pos int; v_mudou boolean := false;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if p_grupo is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  perform public.caca_grupo_lock(p_grupo);                              -- serializa as edições da rota do grupo
  select * into g from public.caca_grupo where id = p_grupo and edicao_codigo = m.edicao_codigo;
  if g.id is null or not exists (select 1 from public.caca_grupo_membro gm
                                  where gm.grupo_id = p_grupo and gm.pessoa = m.email_norm and gm.saiu_em is null)
    then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if p_versao is not null and p_versao <> g.rota_versao then
    return jsonb_build_object('ok', false, 'motivo', 'conflito', 'versao', g.rota_versao, 'rota', public.caca_grupo_rota_json(g.id));
  end if;
  select pa.id into v_casa from public.participacoes pa
   where pa.edicao_codigo = g.edicao_codigo and pa.slug_publico = v_slug and pa.status_cadastro <> 'encerrado'
     and (p_op <> 'adicionar' or exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente));
  if v_casa is null then return jsonb_build_object('ok', false, 'motivo', 'casa_desconhecida'); end if;
  select r.posicao into v_old from public.caca_grupo_rota r where r.grupo_id = g.id and r.participacao_id = v_casa;

  if p_op = 'adicionar' then
    if v_old is null then
      insert into public.caca_grupo_rota (grupo_id, participacao_id, posicao, adicionado_por_pessoa)
      select g.id, v_casa, coalesce(max(r.posicao), 0) + 1, m.email_norm from public.caca_grupo_rota r where r.grupo_id = g.id;
      v_mudou := true;
    end if;
  elsif p_op = 'remover' then
    if v_old is not null then
      delete from public.caca_grupo_rota where grupo_id = g.id and participacao_id = v_casa;
      update public.caca_grupo_rota r set posicao = x.rn
        from (select r2.participacao_id, (row_number() over (order by r2.posicao))::int rn
                from public.caca_grupo_rota r2 where r2.grupo_id = g.id) x
       where r.grupo_id = g.id and r.participacao_id = x.participacao_id and r.posicao <> x.rn;
      v_mudou := true;
    end if;
  elsif p_op = 'mover' then
    if v_old is null then return jsonb_build_object('ok', false, 'motivo', 'nao_esta_na_rota'); end if;
    if p_pos is null or p_pos < 1 then return jsonb_build_object('ok', false, 'motivo', 'posicao_invalida'); end if;
    select count(*)::int into v_n from public.caca_grupo_rota where grupo_id = g.id;
    v_pos := least(p_pos, v_n);
    if v_pos <> v_old then
      -- A casa movida entra meio ponto antes/depois do destino; row_number() reescreve 1..n sem buracos.
      update public.caca_grupo_rota r set posicao = x.rn
        from (select r2.participacao_id,
                     (row_number() over (order by case when r2.participacao_id = v_casa
                                                      then v_pos + case when v_pos < v_old then -0.5 else 0.5 end
                                                      else r2.posicao end))::int rn
                from public.caca_grupo_rota r2 where r2.grupo_id = g.id) x
       where r.grupo_id = g.id and r.participacao_id = x.participacao_id;
      v_mudou := true;
    end if;
  else
    return jsonb_build_object('ok', false, 'motivo', 'operacao_invalida');
  end if;

  if v_mudou then update public.caca_grupo set rota_versao = rota_versao + 1 where id = g.id returning rota_versao into g.rota_versao; end if;
  return jsonb_build_object('ok', true, 'mudou', v_mudou, 'versao', g.rota_versao, 'rota', public.caca_grupo_rota_json(g.id));
end $$;
revoke all on function public.caca_grupo_rota_op(text, uuid, text, text, int, int) from public, anon, authenticated;

create or replace function public.caca_grupo_rota_adicionar(p_chave text, p_grupo uuid, p_slug text, p_versao int default null)
 returns jsonb language sql security definer set search_path to 'public'
as $$ select public.caca_grupo_rota_op(p_chave, p_grupo, 'adicionar', p_slug, null, p_versao) $$;

create or replace function public.caca_grupo_rota_remover(p_chave text, p_grupo uuid, p_slug text, p_versao int default null)
 returns jsonb language sql security definer set search_path to 'public'
as $$ select public.caca_grupo_rota_op(p_chave, p_grupo, 'remover', p_slug, null, p_versao) $$;

create or replace function public.caca_grupo_rota_mover(p_chave text, p_grupo uuid, p_slug text, p_posicao int, p_versao int default null)
 returns jsonb language sql security definer set search_path to 'public'
as $$ select public.caca_grupo_rota_op(p_chave, p_grupo, 'mover', p_slug, p_posicao, p_versao) $$;

-- ---------------------------------------------------------------- grants (só as RPCs públicas)
revoke all on function public.caca_grupo_criar(text, text, boolean) from public, anon, authenticated;
revoke all on function public.caca_grupo_convite_ver(text) from public, anon, authenticated;
revoke all on function public.caca_grupo_convite_novo(text, uuid) from public, anon, authenticated;
revoke all on function public.caca_grupo_convite_revogar(text, uuid) from public, anon, authenticated;
revoke all on function public.caca_grupo_entrar(text, text, boolean) from public, anon, authenticated;
revoke all on function public.caca_grupo_sair(text, uuid) from public, anon, authenticated;
revoke all on function public.caca_grupo_remover_membro(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.caca_grupo_listar(text) from public, anon, authenticated;
revoke all on function public.caca_grupo_ler(text, uuid) from public, anon, authenticated;
revoke all on function public.caca_grupo_rota_adicionar(text, uuid, text, int) from public, anon, authenticated;
revoke all on function public.caca_grupo_rota_remover(text, uuid, text, int) from public, anon, authenticated;
revoke all on function public.caca_grupo_rota_mover(text, uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.caca_grupo_criar(text, text, boolean) to anon, authenticated;
grant execute on function public.caca_grupo_convite_ver(text) to anon, authenticated;
grant execute on function public.caca_grupo_convite_novo(text, uuid) to anon, authenticated;
grant execute on function public.caca_grupo_convite_revogar(text, uuid) to anon, authenticated;
grant execute on function public.caca_grupo_entrar(text, text, boolean) to anon, authenticated;
grant execute on function public.caca_grupo_sair(text, uuid) to anon, authenticated;
grant execute on function public.caca_grupo_remover_membro(text, uuid, uuid) to anon, authenticated;
grant execute on function public.caca_grupo_listar(text) to anon, authenticated;
grant execute on function public.caca_grupo_ler(text, uuid) to anon, authenticated;
grant execute on function public.caca_grupo_rota_adicionar(text, uuid, text, int) to anon, authenticated;
grant execute on function public.caca_grupo_rota_remover(text, uuid, text, int) to anon, authenticated;
grant execute on function public.caca_grupo_rota_mover(text, uuid, text, int, int) to anon, authenticated;

-- reverter:
--   drop function if exists public.caca_grupo_rota_mover(text, uuid, text, int, int), public.caca_grupo_rota_remover(text, uuid, text, int),
--     public.caca_grupo_rota_adicionar(text, uuid, text, int), public.caca_grupo_rota_op(text, uuid, text, text, int, int),
--     public.caca_grupo_ler(text, uuid), public.caca_grupo_listar(text), public.caca_grupo_remover_membro(text, uuid, uuid),
--     public.caca_grupo_sair(text, uuid), public.caca_grupo_entrar(text, text, boolean), public.caca_grupo_convite_revogar(text, uuid),
--     public.caca_grupo_convite_novo(text, uuid), public.caca_grupo_convite_ver(text), public.caca_grupo_criar(text, text, boolean),
--     public.caca_grupo_token_novo(), public.caca_grupo_lock(uuid), public.caca_grupo_rota_json(uuid), public.caca_grupo_casas(uuid),
--     public.caca_grupo_apelido(text, text, text), public.caca_grupo_total(text), public.caca_grupo_cfg(text, int);
--   drop table if exists public.caca_grupo_rota, public.caca_grupo_convite, public.caca_grupo_membro, public.caca_grupo, public.caca_grupo_config;
