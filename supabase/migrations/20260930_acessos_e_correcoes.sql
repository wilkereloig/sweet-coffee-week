-- Acessos das marcas + correção por campo (spec 2026-09-29-acessos-e-guia-da-marca).
--
-- A · Acessos: bloquear (pausa) ≠ desativar (conta encerrada), registro de
--     envio das credenciais, status derivado, encerrar sessões, forçar troca.
-- C · Correção por campo: a organização pede ajuste num campo com motivo; a
--     marca corrige e conclui de novo (o gatilho combo_em_analise já devolve
--     o combo para análise); aprovar resolve as correções.
--     Pedido da organização ganha campo e prioridade.
-- B · get_participantes traz progresso, pendências e acesso por marca.

-- ── A · Acessos ─────────────────────────────────────────────────────────────
alter table public.perfis
  add column if not exists bloqueado_em timestamptz,
  add column if not exists bloqueado_motivo text,
  add column if not exists senha_emitida_em timestamptz;

-- A marca lê se a própria conta está pausada (tela "acesso pausado").
grant select (bloqueado_em) on public.perfis to authenticated;

-- Contas de marca criadas antes disto: a senha temporária nasceu com o perfil.
update public.perfis set senha_emitida_em = created_at
 where papel = 'marca' and senha_emitida_em is null;

-- Bloqueada entra na mesma trava da desativada: a RLS da marca deixa de ver tudo.
create or replace function public.conta_ativa()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select ativo and bloqueado_em is null from public.perfis where user_id = auth.uid()), false)
$$;

create table if not exists public.acesso_envios (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  user_id uuid not null,
  canal text not null check (canal in ('copiado', 'whatsapp_aberto', 'enviado_manual')),
  at timestamptz not null default now(),
  ator_rotulo text default public.ator_rotulo_atual()
);
create index if not exists acesso_envios_user_idx on public.acesso_envios (user_id, at desc);
alter table public.acesso_envios enable row level security;
revoke all on public.acesso_envios from public, anon, authenticated;

-- Status do acesso, uma regra só.
--   nao_criado · desativado · bloqueado · ativo (a marca já pôs a senha dela)
--   aguardando_envio (senha temporária emitida e nenhum envio registrado depois)
--   aguardando_primeiro_acesso (envio registrado, senha temporária ainda vale)
create or replace function public.status_acesso_marca(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when pf.user_id is null then 'nao_criado'
    when not pf.ativo then 'desativado'
    when pf.bloqueado_em is not null then 'bloqueado'
    when not pf.deve_trocar_senha then 'ativo'
    -- Troca forçada numa conta que já tinha senha própria: segue ativa.
    when pf.senha_trocada_em is not null and pf.senha_trocada_em > coalesce(pf.senha_emitida_em, '-infinity') then 'ativo'
    when exists (select 1 from public.acesso_envios e
                  where e.user_id = pf.user_id and e.at >= coalesce(pf.senha_emitida_em, '-infinity')) then 'aguardando_primeiro_acesso'
    else 'aguardando_envio' end
    from (select p_user as u) x left join public.perfis pf on pf.user_id = x.u
$$;
revoke execute on function public.status_acesso_marca(uuid) from public, anon, authenticated;

-- Encerra as sessões de um usuário: o refresh token deixa de valer na hora;
-- o token de acesso já emitido vale até vencer (~1 h).
create or replace function public.encerrar_sessoes_usuario(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.refresh_tokens where user_id = p_user::text;
  delete from auth.sessions where user_id = p_user;
end $$;
revoke execute on function public.encerrar_sessoes_usuario(uuid) from public, anon, authenticated;
grant execute on function public.encerrar_sessoes_usuario(uuid) to service_role;

create or replace function public.get_acessos_marcas(p_secret text)
returns table (participante_id uuid, user_id uuid, nome_marca text, responsavel text, telefone text,
               status text, envio text, envio_em timestamptz, criado_em timestamptz, criado_por text,
               ultimo_acesso timestamptz, senha_emitida_em timestamptz, senha_trocada_em timestamptz,
               troca_obrigatoria boolean, bloqueado_motivo text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then return; end if;
  return query
    select p.id, p.user_id, p.nome_marca, p.responsavel, p.telefone,
           public.status_acesso_marca(p.user_id),
           coalesce(ev.canal, 'nao_enviado'), ev.at,
           pf.created_at,
           (select a.ator_rotulo from public.auditoria a
             where a.acao = 'criar_acesso_marca' and (a.participante_id = p.id or a.alvo_id = p.id::text)
             order by a.at desc limit 1),
           u.last_sign_in_at, pf.senha_emitida_em, pf.senha_trocada_em,
           coalesce(pf.deve_trocar_senha, false), pf.bloqueado_motivo
      from public.participantes p
      left join public.perfis pf on pf.user_id = p.user_id
      left join auth.users u on u.id = p.user_id
      left join lateral (
        select e.canal, e.at from public.acesso_envios e
         where e.user_id = p.user_id and e.at >= coalesce(pf.senha_emitida_em, '-infinity')
         order by e.at desc limit 1) ev on true
     where p.arquivado_em is null;
end $$;
revoke execute on function public.get_acessos_marcas(text) from public, anon, authenticated;
grant execute on function public.get_acessos_marcas(text) to anon, authenticated;

create or replace function public.registrar_envio_acesso(p_secret text, p_participantes uuid[], p_canal text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if not public.pode(p_secret, 'marca.liberar') then raise exception 'nao_autorizado'; end if;
  if p_canal not in ('copiado', 'whatsapp_aberto', 'enviado_manual') then raise exception 'canal_invalido'; end if;
  with ins as (
    insert into public.acesso_envios (participante_id, user_id, canal)
    select p.id, p.user_id, p_canal from public.participantes p
     where p.id = any(p_participantes) and p.user_id is not null
    returning participante_id)
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  select 'acesso.' || p_canal, 'participantes', participante_id::text, participante_id, '{}'::jsonb from ins;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function public.registrar_envio_acesso(text, uuid[], text) from public, anon, authenticated;
grant execute on function public.registrar_envio_acesso(text, uuid[], text) to anon, authenticated;

-- Ações sobre a conta, para uma marca (ficha) ou várias (lote).
create or replace function public.gerir_acesso_marca(p_secret text, p_participantes uuid[], p_acao text, p_motivo text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare r record; v_n integer := 0;
begin
  if not public.pode(p_secret, 'marca.liberar') then raise exception 'nao_autorizado'; end if;
  if p_acao not in ('bloquear', 'desbloquear', 'desativar', 'reativar', 'encerrar_sessoes', 'forcar_troca') then
    raise exception 'acao_invalida';
  end if;
  for r in select p.id, p.user_id from public.participantes p
            join public.perfis pf on pf.user_id = p.user_id and pf.papel = 'marca'
           where p.id = any(p_participantes) loop
    if p_acao = 'bloquear' then
      update public.perfis set bloqueado_em = now(), bloqueado_motivo = nullif(btrim(p_motivo), '') where user_id = r.user_id;
    elsif p_acao = 'desbloquear' then
      update public.perfis set bloqueado_em = null, bloqueado_motivo = null where user_id = r.user_id;
    elsif p_acao = 'desativar' then
      update public.perfis set ativo = false where user_id = r.user_id;
    elsif p_acao = 'reativar' then
      update public.perfis set ativo = true where user_id = r.user_id;
    elsif p_acao = 'forcar_troca' then
      update public.perfis set deve_trocar_senha = true where user_id = r.user_id;
    end if;
    if p_acao in ('bloquear', 'desativar', 'forcar_troca', 'encerrar_sessoes') then
      perform public.encerrar_sessoes_usuario(r.user_id);
    end if;
    insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
    values ('acesso.' || p_acao, 'perfis', r.user_id::text, r.id,
            case when nullif(btrim(p_motivo), '') is null then '{}'::jsonb else jsonb_build_object('motivo', btrim(p_motivo)) end);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke execute on function public.gerir_acesso_marca(text, uuid[], text, text) from public, anon, authenticated;
grant execute on function public.gerir_acesso_marca(text, uuid[], text, text) to anon, authenticated;

-- A troca de senha da marca passa a entrar no histórico DELA.
create or replace function public.marcar_senha_trocada()
returns boolean language plpgsql security definer set search_path = public as $$
declare v_n int; v_papel text; v_part uuid;
begin
  if auth.uid() is null then return false; end if;
  update public.perfis set deve_trocar_senha = false, senha_trocada_em = now()
   where user_id = auth.uid() returning papel into v_papel;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    select id into v_part from public.participantes where user_id = auth.uid() limit 1;
    insert into public.auditoria (ator_user_id, ator_rotulo, acao, alvo_tabela, alvo_id, participante_id)
    values (auth.uid(), coalesce(v_papel, 'marca'), 'senha.trocada', 'perfis', auth.uid()::text, v_part);
  end if;
  return v_n > 0;
end $$;

-- ── C · Correção por campo ──────────────────────────────────────────────────
create table if not exists public.correcoes_campo (
  id uuid primary key default gen_random_uuid(),
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  campo text not null,
  bloco integer not null check (bloco between 0 and 4),
  comentario text not null,
  estado text not null default 'aberta' check (estado in ('aberta', 'corrigida', 'resolvida')),
  criada_em timestamptz not null default now(),
  criada_por_rotulo text default public.ator_rotulo_atual(),
  corrigida_em timestamptz,
  resolvida_em timestamptz
);
create index if not exists correcoes_campo_part_idx on public.correcoes_campo (participacao_id, estado);
alter table public.correcoes_campo enable row level security;
revoke all on public.correcoes_campo from public, anon, authenticated;
-- A marca lê as suas, sem o nome interno de quem pediu (grant de coluna).
grant select (id, participacao_id, campo, bloco, comentario, estado, criada_em, corrigida_em, resolvida_em)
  on public.correcoes_campo to authenticated;
drop policy if exists correcoes_marca_le on public.correcoes_campo;
create policy correcoes_marca_le on public.correcoes_campo for select to authenticated using (
  public.conta_ativa() and exists (
    select 1 from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.id = correcoes_campo.participacao_id and p.user_id = auth.uid()));

-- Link do painel da marca para um campo: Meu cadastro (blocos 0 e 4) ou Meu combo (1–3).
create or replace function public.link_campo_marca(p_bloco integer, p_campo text)
returns text language sql immutable as $$
  select case when p_bloco in (0, 4) then 'cadastro' else 'combo' end || '/' || p_bloco
         || coalesce('/' || nullif(p_campo, ''), '')
$$;

create or replace function public.pedir_correcao_campo(p_secret text, p_participacao uuid, p_bloco integer, p_campo text, p_comentario text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_part uuid;
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if coalesce(btrim(p_comentario), '') = '' then raise exception 'motivo_obrigatorio'; end if;
  if coalesce(btrim(p_campo), '') = '' then raise exception 'campo_obrigatorio'; end if;
  update public.participacoes
     set combo_status = 'correcao_solicitada',
         status_cadastro = case when status_cadastro = 'cadastro_completo' then 'em_preenchimento' else status_cadastro end
   where id = p_participacao returning participante_id into v_part;
  if v_part is null then raise exception 'participacao_nao_encontrada'; end if;
  insert into public.correcoes_campo (participacao_id, campo, bloco, comentario)
  values (p_participacao, btrim(p_campo), p_bloco, btrim(p_comentario)) returning id into v_id;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('correcao.pedida', 'correcoes_campo', v_id::text, v_part, p_participacao,
          jsonb_build_object('campo', btrim(p_campo), 'motivo', btrim(p_comentario)));
  perform public.notificar('marca', v_part, 'correcao', 'Alteração solicitada', btrim(p_comentario),
                           public.link_campo_marca(p_bloco, btrim(p_campo)));
  return v_id;
end $$;
revoke execute on function public.pedir_correcao_campo(text, uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.pedir_correcao_campo(text, uuid, integer, text, text) to anon, authenticated;

-- Desfazer um pedido feito por engano (ou dar por resolvido à mão).
create or replace function public.resolver_correcao(p_secret text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_pa uuid;
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  update public.correcoes_campo set estado = 'resolvida', resolvida_em = now()
   where id = p_id and estado <> 'resolvida' returning participacao_id into v_pa;
  if v_pa is not null then
    insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id)
    values ('correcao.resolvida', 'correcoes_campo', p_id::text, v_pa);
  end if;
end $$;
revoke execute on function public.resolver_correcao(text, uuid) from public, anon, authenticated;
grant execute on function public.resolver_correcao(text, uuid) to anon, authenticated;

create or replace function public.get_correcoes(p_secret text, p_participacao uuid)
returns setof public.correcoes_campo language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then return; end if;
  return query select * from public.correcoes_campo where participacao_id = p_participacao order by criada_em desc;
end $$;
revoke execute on function public.get_correcoes(text, uuid) from public, anon, authenticated;
grant execute on function public.get_correcoes(text, uuid) to anon, authenticated;

-- Concluir de novo marca as correções abertas como corrigidas; aprovar resolve.
create or replace function public.correcoes_acompanhar_combo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.combo_status = 'aprovado' and old.combo_status is distinct from 'aprovado' then
    update public.correcoes_campo set estado = 'resolvida', resolvida_em = now()
     where participacao_id = new.id and estado <> 'resolvida';
  elsif new.status_cadastro = 'cadastro_completo' and old.status_cadastro is distinct from 'cadastro_completo' then
    update public.correcoes_campo set estado = 'corrigida', corrigida_em = now()
     where participacao_id = new.id and estado = 'aberta';
  end if;
  return new;
end $$;
drop trigger if exists correcoes_acompanhar_combo on public.participacoes;
create trigger correcoes_acompanhar_combo after update of combo_status, status_cadastro on public.participacoes
  for each row execute function public.correcoes_acompanhar_combo();

-- O aviso de aprovação/ajuste passa a abrir o Meu combo (antes: 'cadastro').
create or replace function public.revisar_combo(p_secret text, p_participacao uuid, p_status text, p_nota text)
returns void language plpgsql security definer set search_path = public as $$
declare v_part uuid;
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if p_status not in ('aprovado','correcao_solicitada','em_analise') then raise exception 'status_invalido'; end if;
  if p_status = 'correcao_solicitada' and coalesce(btrim(p_nota), '') = '' then raise exception 'nota_obrigatoria'; end if;
  update public.participacoes set combo_status = p_status, combo_revisao_nota = nullif(btrim(p_nota), '')
   where id = p_participacao returning participante_id into v_part;
  if v_part is null then raise exception 'participacao_nao_encontrada'; end if;
  if p_status = 'correcao_solicitada' then
    update public.participacoes set status_cadastro = 'em_preenchimento'
     where id = p_participacao and status_cadastro = 'cadastro_completo';
    perform public.notificar('marca', v_part, 'correcao', 'Alteração solicitada no seu combo', left(p_nota, 200), 'combo');
  elsif p_status = 'aprovado' then
    perform public.notificar('marca', v_part, 'aprovado', 'Cadastro aprovado',
      coalesce(nullif(btrim(p_nota), ''), 'A organização aprovou o seu cadastro e o combo.'), 'inicio');
  end if;
end $$;

-- ── Pedido da organização: campo e prioridade ──────────────────────────────
alter table public.solicitacoes
  add column if not exists campo text,
  add column if not exists prioridade text not null default 'normal';
alter table public.solicitacoes drop constraint if exists solicitacoes_prioridade_check;
alter table public.solicitacoes add constraint solicitacoes_prioridade_check check (prioridade in ('normal', 'importante'));

drop function if exists public.criar_solicitacao(text, text, text, text, uuid, text, text, timestamptz);
create or replace function public.criar_solicitacao(p_secret text, p_titulo text, p_texto text,
  p_escopo text default 'geral', p_participacao uuid default null, p_edicao text default null,
  p_bloco text default 'livre', p_prazo timestamptz default null,
  p_campo text default null, p_prioridade text default 'normal')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if coalesce(trim(p_titulo),'') = '' or coalesce(trim(p_texto),'') = '' then
    raise exception 'titulo_e_texto_obrigatorios';
  end if;
  insert into public.solicitacoes
    (escopo, participacao_id, edicao_codigo, bloco, titulo, texto, prazo_em, criado_por, campo, prioridade)
  values (p_escopo, p_participacao, p_edicao, p_bloco, trim(p_titulo), trim(p_texto),
          p_prazo, auth.uid(), nullif(btrim(p_campo), ''), coalesce(p_prioridade, 'normal'))
  returning id into v_id;
  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'criar_solicitacao', 'solicitacoes', v_id::text,
          jsonb_build_object('escopo', p_escopo, 'bloco', p_bloco, 'campo', p_campo, 'prioridade', p_prioridade));
  return v_id;
end $$;
revoke execute on function public.criar_solicitacao(text, text, text, text, uuid, text, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.criar_solicitacao(text, text, text, text, uuid, text, text, timestamptz, text, text) to anon, authenticated;

-- ── B · Progresso por marca (mesma lista de obrigatórios do painel da marca:
--    pendenciasCadastro em painel-app/src/lib/cadastro.js — 16 campos) ──────
create or replace function public.campos_cadastro(p_participacao uuid)
returns table (total integer, faltando integer)
language sql stable security definer set search_path = public as $$
  with pa as (select * from public.participacoes where id = p_participacao),
       p as (select pt.* from public.participantes pt join pa on pa.participante_id = pt.id),
       it as (select i.* from public.participantes_itens i where i.participacao_id = p_participacao),
       vazios as (
         select (case when coalesce(btrim(p.nome_marca), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(p.responsavel), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(p.telefone), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(pa.tema_combo), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(pa.tema_justificativa), '') = '' then 1 else 0 end)
              + (case when pa.combo_preco is null or pa.combo_preco <= 0 then 1 else 0 end)
              + (case when exists (select 1 from public.participacao_unidades u where u.participacao_id = p_participacao
                                      and coalesce(btrim(u.endereco), '') <> '') then 0 else 1 end) as n
           from pa, p)
  select 16,
         (select n from vazios)
         + (select coalesce(sum((case when coalesce(btrim(nome), '') = '' then 1 else 0 end)
                              + (case when coalesce(btrim(descricao), '') = '' then 1 else 0 end)
                              + (case when coalesce(btrim(ingredientes), '') = '' then 1 else 0 end)), 0)::int from it)
         + 3 * greatest(0, 3 - (select count(*)::int from it))
$$;
revoke execute on function public.campos_cadastro(uuid) from public, anon, authenticated;

drop function if exists public.get_participantes(text, boolean);
create or replace function public.get_participantes(p_secret text, p_arquivados boolean default false)
returns table (id uuid, created_at timestamptz, updated_at timestamptz, origem_id uuid, user_id uuid, slug text,
  nome_marca text, responsavel text, telefone text, email text, instagram text, site text, cnpj text, razao_social text,
  participacao_id uuid, edicao_codigo text, status_cadastro text, tema_combo text, combo_preco numeric,
  unidades bigint, itens_prontos bigint, edicoes bigint, historico_status text, foto_liberacao text,
  pagamento_status text, combo_status text, pendencias bigint, sessao_fotos timestamptz,
  participacoes_acervo bigint, arquivado_em timestamptz,
  campos_total integer, campos_faltando integer, correcoes_abertas bigint, pedidos_abertos bigint,
  ultima_atividade timestamptz, status_acesso text)
language plpgsql stable security definer set search_path = public as $$
declare v_ed text;
begin
  if not public.pode(p_secret, 'dado.ler') then return; end if;
  select c.edicao_atual into v_ed from public.admin_config c where c.id;
  return query
    select p.id, p.created_at, p.updated_at, p.origem_id, p.user_id, p.slug,
           p.nome_marca, p.responsavel, p.telefone, p.email, p.instagram, p.site, p.cnpj, p.razao_social,
           pa.id, pa.edicao_codigo, coalesce(pa.status_cadastro, 'sem_participacao'), pa.tema_combo, pa.combo_preco,
           (select count(*) from public.participacao_unidades u
             where u.participacao_id = pa.id and coalesce(trim(u.endereco), '') <> ''),
           (select count(*) from public.participantes_itens i
             where i.participacao_id = pa.id and coalesce(trim(i.nome), '') <> ''
               and coalesce(trim(i.descricao), '') <> '' and coalesce(trim(i.ingredientes), '') <> ''),
           (select count(*) from public.participacoes t where t.participante_id = p.id),
           p.historico_status, pa.foto_liberacao, pa.pagamento_status, pa.combo_status,
           (select count(*) from public.revisao_pendencias r where r.participante_id = p.id and r.status = 'aberta'),
           (select min(s.data_hora) from public.sessoes_fotos s where s.participacao_id = pa.id
             and s.status in ('agendada','remarcada')),
           (select count(distinct h.edicao_codigo) from public.historico_participacoes h
             join public.participante_vinculos v on v.chave = h.chave
            where v.participante_id = p.id and v.status = 'confirmado'),
           p.arquivado_em,
           cc.total, cc.faltando,
           (select count(*) from public.correcoes_campo c where c.participacao_id = pa.id and c.estado = 'aberta'),
           (select count(*) from public.solicitacao_estado se where se.participacao_id = pa.id and se.estado = 'pendente'),
           greatest(p.updated_at, pa.updated_at,
                    (select max(a.at) from public.auditoria a where a.participante_id = p.id)),
           public.status_acesso_marca(p.user_id)
      from public.participantes p
      left join lateral (
        select pp.* from public.participacoes pp where pp.participante_id = p.id
         order by (pp.edicao_codigo is not distinct from v_ed) desc, pp.edicao_codigo desc, pp.created_at desc
         limit 1) pa on true
      left join lateral (select * from public.campos_cadastro(pa.id)) cc on pa.id is not null
     where (p.arquivado_em is null) <> coalesce(p_arquivados, false)
     order by p.created_at desc;
end $$;
revoke execute on function public.get_participantes(text, boolean) from public, anon, authenticated;
grant execute on function public.get_participantes(text, boolean) to anon, authenticated;
