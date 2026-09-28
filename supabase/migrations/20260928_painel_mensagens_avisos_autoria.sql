-- =============================================================================
-- Painel: autoria, histórico, observações, mensagens, notificações e push
-- (auditoria de 28/09/2026 — docs/AUDITORIA-PAINEL-2026-09-28.md)
--
-- ✅ APLICADA em 28/09/2026 pelo MCP do Supabase, registrada como
--    `painel_mensagens_avisos_autoria` (seções 1–9; a seção 10 não foi
--    reenviada: o corpo é idêntico ao que já está no banco). Conferido por
--    has_function_privilege (funções internas fechadas para anon e
--    authenticated) e por teste de fumaça em transação desfeita.
-- ⚠️ As Edge Functions enviar-push, regerar-senha-conta e
--    criar-conta-organizacao mudaram junto e PRECISAM ser publicadas a partir
--    de supabase/functions/ — o MCP desta sessão não aceitou o deploy.
--
-- Princípio: QUEM FEZ vem da sessão, no banco — nunca de um nome que o
-- navegador manda. `auth.uid()` lê o JWT da requisição (vale também dentro de
-- função SECURITY DEFINER); sem JWT nominal, a ação é do "Acesso compartilhado"
-- (senha única), e o histórico diz isso em vez de inventar uma pessoa.
--
-- O rótulo do autor é GRAVADO no momento da ação (`ator_rotulo`). Desativar ou
-- renomear uma conta depois não reescreve o passado: a linha antiga continua
-- dizendo quem era a pessoa quando agiu.
--
-- Seções:
--   1. Contas da equipe: nome e último acesso
--   2. Autoria automática na `auditoria` (+ vínculo com a marca)
--   3. Histórico de mudanças de estado (gatilhos)
--   4. Observações internas e leitura do histórico
--   5. Mensagens organização ⇄ marca
--   6. Notificações persistidas (lida/não lida) + geração por gatilho
--   7. Push automático (pg_net → Edge Function enviar-push)
--   8. Pedidos: a marca responde pelo painel
--   9. Vaga de foto sem duplicata
--  10. Captura das RPCs que só existiam no banco (sem mudança de corpo)
-- =============================================================================

-- ── 1. Contas da equipe ─────────────────────────────────────────────────────
alter table public.perfis add column if not exists nome text;

-- Rótulo humano de uma conta: nome (ou e-mail) da equipe, "Marca · X" para
-- conta de marca, "Acesso compartilhado" sem conta. Usado para gravar autoria.
create or replace function public.rotulo_de_user(p_user uuid)
returns text language sql stable security definer set search_path = public, auth as $$
  select case when p_user is null then 'Acesso compartilhado' else coalesce(
    (select coalesce(nullif(trim(pf.nome), ''), u.email::text)
       from public.perfis pf join auth.users u on u.id = pf.user_id
      where pf.user_id = p_user and pf.papel = 'organizacao'),
    (select 'Marca · ' || p.nome_marca from public.participantes p
      where p.user_id = p_user order by p.created_at desc limit 1),
    'Conta removida') end
$$;

create or replace function public.ator_rotulo_atual()
returns text language sql stable security definer set search_path = public as $$
  select public.rotulo_de_user(auth.uid())
$$;

revoke all on function public.rotulo_de_user(uuid) from public, anon, authenticated;
revoke all on function public.ator_rotulo_atual() from public, anon, authenticated;

drop function if exists public.get_contas_organizacao(text);
create function public.get_contas_organizacao(p_secret text)
returns table(user_id uuid, email text, nome text, funcao text, rotulo text, ativo boolean,
              deve_trocar_senha boolean, criado_em timestamptz, ultimo_acesso timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select pf.user_id, u.email::text, pf.nome, pf.funcao, f.rotulo, pf.ativo,
         pf.deve_trocar_senha, pf.created_at, u.last_sign_in_at
    from public.perfis pf
    join auth.users u on u.id = pf.user_id
    left join public.funcoes f on f.codigo = pf.funcao
   where public.pode(p_secret, 'acesso.gerir')
     and pf.papel = 'organizacao'
   order by f.ordem, coalesce(pf.nome, u.email);
$$;
revoke all on function public.get_contas_organizacao(text) from public, anon, authenticated;
grant execute on function public.get_contas_organizacao(text) to anon, authenticated;

create or replace function public.atualizar_conta(p_secret text, p_user uuid, p_nome text)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes text;
begin
  if not public.pode(p_secret, 'acesso.gerir') then raise exception 'nao_autorizado'; end if;
  select nome into v_antes from public.perfis where user_id = p_user and papel = 'organizacao';
  if not found then raise exception 'conta_nao_encontrada'; end if;
  update public.perfis set nome = nullif(trim(p_nome), '') where user_id = p_user and papel = 'organizacao';
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('conta.nome', 'perfis', p_user::text, jsonb_build_object('de', v_antes, 'para', nullif(trim(p_nome), '')));
end $$;
revoke all on function public.atualizar_conta(text, uuid, text) from public, anon, authenticated;
grant execute on function public.atualizar_conta(text, uuid, text) to anon, authenticated;

-- ── 2. Autoria automática ───────────────────────────────────────────────────
alter table public.auditoria
  add column if not exists participante_id uuid references public.participantes(id) on delete set null,
  add column if not exists participacao_id uuid references public.participacoes(id) on delete set null;

-- Toda linha nova ganha o autor da sessão sem que a RPC precise lembrar.
alter table public.auditoria alter column ator_user_id set default auth.uid();
alter table public.auditoria alter column ator_rotulo set default public.ator_rotulo_atual();

create index if not exists auditoria_participante_at on public.auditoria (participante_id, at desc);
create index if not exists auditoria_at on public.auditoria (at desc);
create index if not exists auditoria_ator on public.auditoria (ator_user_id);
create index if not exists auditoria_participacao on public.auditoria (participacao_id);

-- Antes de gravar: (a) corrige o rótulo quando há conta mas o rótulo é o
-- genérico — Edge Functions gravam com a chave de serviço (auth.uid() nulo) e
-- passam o ator_user_id à mão; (b) liga a linha à marca a partir do alvo, para
-- o histórico por participante; (c) guarda o nome da marca no próprio
-- registro, para ele continuar legível se a marca for apagada.
create or replace function public.auditoria_vincular()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_uuid uuid;
begin
  if new.ator_user_id is not null
     and new.ator_rotulo in ('senha-compartilhada', 'Acesso compartilhado') then
    new.ator_rotulo := public.rotulo_de_user(new.ator_user_id);
  end if;

  if new.alvo_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_uuid := new.alvo_id::uuid;
  end if;

  if new.participacao_id is null and new.participante_id is null and v_uuid is not null then
    if new.alvo_tabela = 'solicitacoes' then
      new.participacao_id := (select participacao_id from public.solicitacoes where id = v_uuid);
    elsif new.alvo_tabela = 'arquivos' then
      new.participacao_id := (select participacao_id from public.arquivos where id = v_uuid);
    elsif new.alvo_tabela = 'sessoes_fotos' then
      new.participacao_id := (select participacao_id from public.sessoes_fotos where id = v_uuid);
      new.participante_id := (select participante_id from public.sessoes_fotos where id = v_uuid);
    elsif new.alvo_tabela = 'participacoes' then
      new.participacao_id := v_uuid;
    elsif new.alvo_tabela = 'participantes' then
      new.participante_id := v_uuid;
    elsif new.alvo_tabela = 'quero_participar' then
      new.participante_id := (select id from public.participantes where origem_id = v_uuid order by created_at limit 1);
    end if;
  end if;

  if new.participante_id is null and new.participacao_id is not null then
    new.participante_id := (select participante_id from public.participacoes where id = new.participacao_id);
  end if;

  if new.participante_id is not null and not (new.detalhe ? 'marca') then
    new.detalhe := new.detalhe || jsonb_build_object('marca',
      (select nome_marca from public.participantes where id = new.participante_id));
  end if;
  return new;
end $$;
revoke all on function public.auditoria_vincular() from public, anon, authenticated;

drop trigger if exists auditoria_vincular on public.auditoria;
create trigger auditoria_vincular before insert on public.auditoria
  for each row execute function public.auditoria_vincular();

-- ── 3. Histórico de mudanças de estado ──────────────────────────────────────
-- Um gatilho por tabela, na própria tabela: qualquer caminho que mude o estado
-- (RPC da organização, PATCH da marca, SQL Editor) deixa rastro com antes e
-- depois. As RPCs que já gravavam a própria linha (criar/publicar pedido,
-- agendar/abrir vaga, função de conta…) seguem gravando — aqui entra só o que
-- não era registrado.
create or replace function public.auditar_mudancas()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  if tg_table_name in ('quero_participar', 'contact_requests', 'support_interests') then
    v_nome := coalesce(to_jsonb(new) ->> 'empresa', to_jsonb(new) ->> 'name', to_jsonb(new) ->> 'nome');
    if new.status is distinct from old.status then
      insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
      values ('candidatura.status', tg_table_name, new.id::text,
              jsonb_build_object('de', old.status, 'para', new.status, 'quem', v_nome));
    end if;
    if new.internal_notes is distinct from old.internal_notes then
      insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
      values ('candidatura.nota', tg_table_name, new.id::text,
              jsonb_build_object('quem', v_nome, 'texto', left(coalesce(new.internal_notes, ''), 400)));
    end if;

  elsif tg_table_name = 'solicitacao_estado' then
    if new.estado is distinct from old.estado then
      insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
      values ('pedido.estado', 'solicitacoes', new.solicitacao_id::text, new.participacao_id,
              jsonb_build_object('de', old.estado, 'para', new.estado,
                'titulo', (select titulo from public.solicitacoes where id = new.solicitacao_id),
                'resposta', left(coalesce(new.resposta, ''), 400)));
    end if;

  elsif tg_table_name = 'participacoes' then
    if new.status_cadastro is distinct from old.status_cadastro then
      insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
      values ('cadastro.status', 'participacoes', new.id::text, new.id,
              jsonb_build_object('de', old.status_cadastro, 'para', new.status_cadastro));
    end if;

  elsif tg_table_name = 'solicitacoes' then
    if (new.titulo, new.texto, new.prazo_em, new.arquivada)
       is distinct from (old.titulo, old.texto, old.prazo_em, old.arquivada) then
      insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
      values ('pedido.editado', 'solicitacoes', new.id::text, new.participacao_id,
              jsonb_build_object('titulo', new.titulo, 'arquivada', new.arquivada,
                'prazo_de', old.prazo_em, 'prazo_para', new.prazo_em));
    end if;

  elsif tg_table_name = 'sessoes_fotos' then
    if old.participante_id is null and new.participante_id is not null then
      insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
      values ('vaga.reservada', 'sessoes_fotos', new.id::text, new.participante_id, new.participacao_id,
              jsonb_build_object('data_hora', new.data_hora));
    end if;
  end if;
  return new;
end $$;
revoke all on function public.auditar_mudancas() from public, anon, authenticated;

drop trigger if exists auditar_mudancas on public.quero_participar;
create trigger auditar_mudancas after update on public.quero_participar for each row execute function public.auditar_mudancas();
drop trigger if exists auditar_mudancas on public.contact_requests;
create trigger auditar_mudancas after update on public.contact_requests for each row execute function public.auditar_mudancas();
drop trigger if exists auditar_mudancas on public.support_interests;
create trigger auditar_mudancas after update on public.support_interests for each row execute function public.auditar_mudancas();
drop trigger if exists auditar_mudancas on public.solicitacao_estado;
create trigger auditar_mudancas after update on public.solicitacao_estado for each row execute function public.auditar_mudancas();
drop trigger if exists auditar_mudancas on public.participacoes;
create trigger auditar_mudancas after update on public.participacoes for each row execute function public.auditar_mudancas();
drop trigger if exists auditar_mudancas on public.solicitacoes;
create trigger auditar_mudancas after update on public.solicitacoes for each row execute function public.auditar_mudancas();
drop trigger if exists auditar_mudancas on public.sessoes_fotos;
create trigger auditar_mudancas after update on public.sessoes_fotos for each row execute function public.auditar_mudancas();

-- ── 4. Observações internas e leitura do histórico ─────────────────────────
-- Observação interna é uma linha de auditoria com acao 'observacao': visível
-- só para a organização (a tabela não tem policy nenhuma), com autor e hora
-- gravados como qualquer outra ação. Não existe "editar" nem "apagar"
-- observação — corrigir é escrever outra.
create or replace function public.adicionar_observacao(p_secret text, p_participante uuid, p_texto text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not public.pode(p_secret, 'triagem.editar') then raise exception 'nao_autorizado'; end if;
  if coalesce(trim(p_texto), '') = '' then raise exception 'texto_vazio'; end if;
  if not exists (select 1 from public.participantes where id = p_participante) then
    raise exception 'marca_nao_encontrada';
  end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values ('observacao', 'participantes', p_participante::text, p_participante,
          jsonb_build_object('texto', left(trim(p_texto), 2000)))
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.adicionar_observacao(text, uuid, text) from public, anon, authenticated;
grant execute on function public.adicionar_observacao(text, uuid, text) to anon, authenticated;

create or replace function public.get_atividade(
  p_secret text, p_participante uuid default null, p_ator uuid default null,
  p_acao text default null, p_de timestamptz default null, p_ate timestamptz default null,
  p_limite integer default 200)
returns table(id bigint, at timestamptz, ator_user_id uuid, ator_rotulo text, acao text,
              alvo_tabela text, alvo_id text, detalhe jsonb, participante_id uuid, marca text)
language sql stable security definer set search_path = public as $$
  select a.id, a.at, a.ator_user_id,
         -- Linhas anteriores a 28/09/2026 gravaram 'senha-compartilhada' até
         -- para conta nominal (era o default); com o user_id dá para saber.
         case when a.ator_rotulo = 'senha-compartilhada' and a.ator_user_id is not null
                then public.rotulo_de_user(a.ator_user_id)
              when a.ator_rotulo = 'senha-compartilhada' then 'Acesso compartilhado'
              else a.ator_rotulo end,
         a.acao, a.alvo_tabela, a.alvo_id, a.detalhe, a.participante_id,
         coalesce(p.nome_marca, a.detalhe ->> 'marca')
    from public.auditoria a
    left join public.participantes p on p.id = a.participante_id
   where public.pode(p_secret, 'dado.ler')
     and (p_participante is null or a.participante_id = p_participante)
     and (p_ator is null or a.ator_user_id = p_ator)
     and (p_acao is null or a.acao like p_acao || '%')
     and (p_de is null or a.at >= p_de)
     and (p_ate is null or a.at < p_ate)
   order by a.at desc, a.id desc
   limit least(greatest(coalesce(p_limite, 200), 1), 1000);
$$;
revoke all on function public.get_atividade(text, uuid, uuid, text, timestamptz, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.get_atividade(text, uuid, uuid, text, timestamptz, timestamptz, integer) to anon, authenticated;

-- ── 5. Mensagens organização ⇄ marca ────────────────────────────────────────
create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  de text not null check (de in ('organizacao', 'marca')),
  autor_user_id uuid default auth.uid(),
  autor_rotulo text not null default public.ator_rotulo_atual(),
  corpo text not null check (length(trim(corpo)) between 1 and 4000),
  criada_em timestamptz not null default now(),
  -- Lida por QUEM RECEBE: mensagem da organização → quando a marca abriu;
  -- mensagem da marca → quando alguém da organização abriu a conversa.
  lida_em timestamptz
);
create index if not exists mensagens_participante_criada on public.mensagens (participante_id, criada_em desc);
alter table public.mensagens enable row level security;

drop policy if exists mensagens_marca_le on public.mensagens;
create policy mensagens_marca_le on public.mensagens for select to authenticated
  using (exists (select 1 from public.participantes p
                  where p.id = mensagens.participante_id and p.user_id = (select auth.uid())));

-- A marca lê só estas colunas: quem da equipe escreveu (nome/e-mail interno)
-- não sai para fora. Escrita só por RPC.
revoke all on public.mensagens from anon, authenticated;
grant select (id, participante_id, de, corpo, criada_em, lida_em) on public.mensagens to authenticated;

create or replace function public.enviar_mensagem(p_secret text, p_participante uuid, p_corpo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.pode(p_secret, 'mensagem.enviar') then raise exception 'nao_autorizado'; end if;
  if coalesce(trim(p_corpo), '') = '' then raise exception 'mensagem_vazia'; end if;
  if not exists (select 1 from public.participantes where id = p_participante) then
    raise exception 'marca_nao_encontrada';
  end if;
  insert into public.mensagens (participante_id, de, corpo)
  values (p_participante, 'organizacao', trim(p_corpo)) returning id into v_id;
  return v_id;
end $$;

create or replace function public.get_conversas(p_secret text)
returns table(participante_id uuid, nome_marca text, ultima_em timestamptz, ultima_trecho text,
              ultima_de text, nao_lidas bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome_marca, m.criada_em, left(m.corpo, 140), m.de,
         (select count(*) from public.mensagens x
           where x.participante_id = p.id and x.de = 'marca' and x.lida_em is null)
    from public.participantes p
    join lateral (select criada_em, corpo, de from public.mensagens m
                   where m.participante_id = p.id order by m.criada_em desc limit 1) m on true
   where public.pode(p_secret, 'dado.ler')
   order by m.criada_em desc;
$$;

create or replace function public.get_mensagens(p_secret text, p_participante uuid)
returns table(id uuid, de text, autor_rotulo text, corpo text, criada_em timestamptz, lida_em timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.de, m.autor_rotulo, m.corpo, m.criada_em, m.lida_em
    from public.mensagens m
   where public.pode(p_secret, 'dado.ler') and m.participante_id = p_participante
   order by m.criada_em;
$$;

create or replace function public.ler_mensagens_org(p_secret text, p_participante uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  update public.mensagens set lida_em = now()
   where participante_id = p_participante and de = 'marca' and lida_em is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.marca_enviar_mensagem(p_corpo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_part uuid; v_id uuid;
begin
  select id into v_part from public.participantes
   where user_id = auth.uid() order by created_at desc limit 1;
  if v_part is null then raise exception 'sem_marca'; end if;
  if coalesce(trim(p_corpo), '') = '' then raise exception 'mensagem_vazia'; end if;
  insert into public.mensagens (participante_id, de, corpo)
  values (v_part, 'marca', trim(p_corpo)) returning id into v_id;
  return v_id;
end $$;

create or replace function public.marca_ler_mensagens()
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  update public.mensagens m set lida_em = now()
   where m.de = 'organizacao' and m.lida_em is null
     and exists (select 1 from public.participantes p
                  where p.id = m.participante_id and p.user_id = auth.uid());
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public.enviar_mensagem(text, uuid, text) from public, anon, authenticated;
revoke all on function public.get_conversas(text) from public, anon, authenticated;
revoke all on function public.get_mensagens(text, uuid) from public, anon, authenticated;
revoke all on function public.ler_mensagens_org(text, uuid) from public, anon, authenticated;
revoke all on function public.marca_enviar_mensagem(text) from public, anon, authenticated;
revoke all on function public.marca_ler_mensagens() from public, anon, authenticated;
grant execute on function public.enviar_mensagem(text, uuid, text) to anon, authenticated;
grant execute on function public.get_conversas(text) to anon, authenticated;
grant execute on function public.get_mensagens(text, uuid) to anon, authenticated;
grant execute on function public.ler_mensagens_org(text, uuid) to anon, authenticated;
grant execute on function public.marca_enviar_mensagem(text) to authenticated;
grant execute on function public.marca_ler_mensagens() to authenticated;

-- Quem pode escrever à marca: as três funções operacionais. Consulta só lê.
insert into public.permissoes (funcao, acao)
select f, 'mensagem.enviar' from unnest(array['administrador', 'curadoria', 'producao']) f
 where not exists (select 1 from public.permissoes where funcao = f and acao = 'mensagem.enviar');

-- ── 6. Notificações persistidas ─────────────────────────────────────────────
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  criada_em timestamptz not null default now(),
  para text not null check (para in ('organizacao', 'marca')),
  participante_id uuid references public.participantes(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  texto text,
  -- Destino dentro do painel, "vista/id…" — o painel abre o item, não a
  -- vista genérica. Nunca URL: quem monta a URL é o painel.
  link text,
  ator_rotulo text default public.ator_rotulo_atual(),
  lida_em timestamptz,          -- só para a marca (uma leitora)
  push_enviado_em timestamptz,  -- trava de envio único do push
  check (para = 'organizacao' or participante_id is not null)
);
create index if not exists notificacoes_marca on public.notificacoes (participante_id, criada_em desc) where para = 'marca';
create index if not exists notificacoes_org on public.notificacoes (criada_em desc) where para = 'organizacao';

-- Na organização cada pessoa tem a própria leitura. A senha compartilhada é
-- uma leitora só ('compartilhada').
create table if not exists public.notificacao_leitura (
  notificacao_id uuid not null references public.notificacoes(id) on delete cascade,
  leitor text not null,
  lida_em timestamptz not null default now(),
  primary key (notificacao_id, leitor)
);

alter table public.notificacoes enable row level security;
alter table public.notificacao_leitura enable row level security;
drop policy if exists notificacoes_marca_le on public.notificacoes;
create policy notificacoes_marca_le on public.notificacoes for select to authenticated
  using (para = 'marca' and exists (select 1 from public.participantes p
          where p.id = notificacoes.participante_id and p.user_id = (select auth.uid())));
revoke all on public.notificacoes from anon, authenticated;
revoke all on public.notificacao_leitura from anon, authenticated;
grant select (id, criada_em, para, participante_id, tipo, titulo, texto, link, lida_em)
  on public.notificacoes to authenticated;

create or replace function public.notificar(p_para text, p_participante uuid, p_tipo text,
                                            p_titulo text, p_texto text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notificacoes (para, participante_id, tipo, titulo, texto, link)
  values (p_para, p_participante, p_tipo, left(p_titulo, 120), left(p_texto, 240), p_link);
$$;
revoke all on function public.notificar(text, uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.get_notificacoes_org(p_secret text, p_limite integer default 60)
returns table(id uuid, criada_em timestamptz, tipo text, titulo text, texto text, link text,
              ator_rotulo text, lida boolean)
language sql stable security definer set search_path = public as $$
  select n.id, n.criada_em, n.tipo, n.titulo, n.texto, n.link, n.ator_rotulo,
         exists (select 1 from public.notificacao_leitura l
                  where l.notificacao_id = n.id
                    and l.leitor = coalesce(auth.uid()::text, 'compartilhada'))
    from public.notificacoes n
   where public.pode(p_secret, 'dado.ler') and n.para = 'organizacao'
   order by n.criada_em desc
   limit least(greatest(coalesce(p_limite, 60), 1), 200);
$$;

create or replace function public.ler_notificacoes_org(p_secret text, p_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  insert into public.notificacao_leitura (notificacao_id, leitor)
  select n.id, coalesce(auth.uid()::text, 'compartilhada')
    from public.notificacoes n
   where n.para = 'organizacao' and (p_ids is null or n.id = any(p_ids))
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.marca_ler_notificacoes(p_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  update public.notificacoes n set lida_em = now()
   where n.para = 'marca' and n.lida_em is null
     and (p_ids is null or n.id = any(p_ids))
     and exists (select 1 from public.participantes p
                  where p.id = n.participante_id and p.user_id = auth.uid());
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public.get_notificacoes_org(text, integer) from public, anon, authenticated;
revoke all on function public.ler_notificacoes_org(text, uuid[]) from public, anon, authenticated;
revoke all on function public.marca_ler_notificacoes(uuid[]) from public, anon, authenticated;
grant execute on function public.get_notificacoes_org(text, integer) to anon, authenticated;
grant execute on function public.ler_notificacoes_org(text, uuid[]) to anon, authenticated;
grant execute on function public.marca_ler_notificacoes(uuid[]) to authenticated;

-- Quais eventos viram aviso — escolhidos para não virar ruído: mensagem,
-- pedido novo, pedido respondido, arquivo novo, sessão de fotos marcada/
-- remarcada/cancelada, vaga reservada, cadastro concluído e formulário novo
-- do site. Edição de campo, autosave e troca de status interna NÃO avisam.
create or replace function public.gerar_notificacoes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_marca text; v_part uuid; v_titulo text; v_eh_marca boolean;
begin
  v_eh_marca := exists (select 1 from public.participantes where user_id = auth.uid());

  if tg_table_name = 'mensagens' then
    select nome_marca into v_marca from public.participantes where id = new.participante_id;
    insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
    values ('mensagem.enviada', 'mensagens', new.id::text, new.participante_id,
            jsonb_build_object('de', new.de, 'trecho', left(new.corpo, 200)));
    if new.de = 'organizacao' then
      perform public.notificar('marca', new.participante_id, 'mensagem',
        'Nova mensagem da organização', left(new.corpo, 140), 'mensagens');
    else
      perform public.notificar('organizacao', null, 'mensagem',
        v_marca || ' enviou uma mensagem', left(new.corpo, 140), 'marcas/' || new.participante_id || '/mensagens');
    end if;

  elsif tg_table_name = 'solicitacao_estado' then
    select pa.participante_id, p.nome_marca into v_part, v_marca
      from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.id = new.participacao_id;
    select titulo into v_titulo from public.solicitacoes where id = new.solicitacao_id;
    if tg_op = 'INSERT' then
      perform public.notificar('marca', v_part, 'pedido', 'Novo pedido: ' || v_titulo,
        (select case when prazo_em is null then 'Sem prazo'
                     else 'Prazo: ' || to_char(prazo_em at time zone 'America/Fortaleza', 'DD/MM') end
           from public.solicitacoes where id = new.solicitacao_id),
        'pedidos/' || new.solicitacao_id);
    elsif new.estado = 'respondido' and old.estado is distinct from 'respondido' and v_eh_marca then
      perform public.notificar('organizacao', null, 'pedido', v_marca || ' respondeu: ' || v_titulo,
        left(coalesce(new.resposta, ''), 140), 'producao/pedido/' || new.solicitacao_id);
    end if;

  elsif tg_table_name = 'arquivos' then
    if new.publicado_em is not null and not new.arquivado then
      if new.escopo = 'marca' then
        perform public.notificar('marca', pa.participante_id, 'arquivo', 'Novo arquivo: ' || new.nome,
          new.descricao, 'arquivos/' || new.id)
          from public.participacoes pa where pa.id = new.participacao_id;
      else
        perform public.notificar('marca', p.id, 'arquivo', 'Novo arquivo: ' || new.nome,
          new.descricao, 'arquivos/' || new.id)
          from public.participantes p where p.user_id is not null;
      end if;
    end if;

  elsif tg_table_name = 'sessoes_fotos' then
    if new.participante_id is not null then
      select nome_marca into v_marca from public.participantes where id = new.participante_id;
      if tg_op = 'UPDATE' and old.participante_id is null and v_eh_marca then
        perform public.notificar('organizacao', null, 'fotos', v_marca || ' reservou uma vaga de fotos',
          to_char(new.data_hora at time zone 'America/Fortaleza', 'DD/MM "às" HH24:MI'), 'producao/fotos');
      elsif not v_eh_marca and (tg_op = 'INSERT' or new.status is distinct from old.status
                                or new.data_hora is distinct from old.data_hora) then
        v_titulo := case new.status
          when 'agendada' then 'Sessão de fotos marcada'
          when 'remarcada' then 'Sessão de fotos remarcada'
          when 'cancelada' then 'Sessão de fotos cancelada'
          else null end;
        if v_titulo is not null then
          perform public.notificar('marca', new.participante_id, 'fotos', v_titulo,
            to_char(new.data_hora at time zone 'America/Fortaleza', 'DD/MM "às" HH24:MI')
              || coalesce(' · ' || nullif(new.local, ''), ''), 'cadastro/fotos');
        end if;
      end if;
    end if;

  elsif tg_table_name = 'participacoes' then
    if new.status_cadastro = 'cadastro_completo' and old.status_cadastro is distinct from 'cadastro_completo' then
      select nome_marca into v_marca from public.participantes where id = new.participante_id;
      perform public.notificar('organizacao', null, 'cadastro', v_marca || ' concluiu o cadastro',
        'Edição ' || new.edicao_codigo, 'marcas/' || new.participante_id);
    end if;

  elsif tg_table_name = 'quero_participar' then
    perform public.notificar('organizacao', null, 'formulario', 'Nova candidatura: ' || new.empresa,
      new.nome, 'respostas/quero_participar/' || new.id);
  elsif tg_table_name = 'contact_requests' then
    perform public.notificar('organizacao', null, 'formulario', 'Novo contato: ' || new.name,
      left(coalesce(new.subject, new.message, ''), 140), 'respostas/contato/' || new.id);
  elsif tg_table_name = 'support_interests' then
    perform public.notificar('organizacao', null, 'formulario', 'Interesse em apoiar: ' || coalesce(new.empresa, new.nome),
      new.nome, 'respostas/apoiar/' || new.id);
  end if;
  return new;
end $$;
revoke all on function public.gerar_notificacoes() from public, anon, authenticated;

drop trigger if exists gerar_notificacoes on public.mensagens;
create trigger gerar_notificacoes after insert on public.mensagens for each row execute function public.gerar_notificacoes();
drop trigger if exists gerar_notificacoes on public.solicitacao_estado;
create trigger gerar_notificacoes after insert or update on public.solicitacao_estado for each row execute function public.gerar_notificacoes();
drop trigger if exists gerar_notificacoes on public.arquivos;
create trigger gerar_notificacoes after insert on public.arquivos for each row execute function public.gerar_notificacoes();
drop trigger if exists gerar_notificacoes on public.sessoes_fotos;
create trigger gerar_notificacoes after insert or update on public.sessoes_fotos for each row execute function public.gerar_notificacoes();
drop trigger if exists gerar_notificacoes on public.participacoes;
create trigger gerar_notificacoes after update on public.participacoes for each row execute function public.gerar_notificacoes();
drop trigger if exists gerar_notificacoes on public.quero_participar;
create trigger gerar_notificacoes after insert on public.quero_participar for each row execute function public.gerar_notificacoes();
drop trigger if exists gerar_notificacoes on public.contact_requests;
create trigger gerar_notificacoes after insert on public.contact_requests for each row execute function public.gerar_notificacoes();
drop trigger if exists gerar_notificacoes on public.support_interests;
create trigger gerar_notificacoes after insert on public.support_interests for each row execute function public.gerar_notificacoes();

-- ── 7. Push automático ──────────────────────────────────────────────────────
-- Toda notificação nova chama a Edge Function `enviar-push` com o id dela. A
-- função relê a notificação com a chave de serviço, trava o envio
-- (push_enviado_em) e manda para os aparelhos do destino. Só o id viaja: sem
-- texto, sem destinatário, sem credencial — chamar a função com um id que não
-- existe, ou que já foi enviado, não faz nada.
-- ⚠️ Se as três variáveis VAPID não estiverem na função, o aviso continua
-- aparecendo no painel (sino) e o push simplesmente não sai.
-- Schema `extensions`, não `public` (Security Advisor: extension_in_public).
-- Aplicado primeiro em public e corrigido na mesma data pela migration
-- `pg_net_no_schema_extensions` (drop + create: pg_net não é relocável).
create extension if not exists pg_net with schema extensions;

create or replace function public.notificacao_disparar_push()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  begin
    perform net.http_post(
      url := 'https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/enviar-push',
      body := jsonb_build_object('notificacao_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json'));
  exception when others then
    null; -- o aviso no painel já existe; push é o canal extra, não derruba a ação
  end;
  return new;
end $$;
revoke all on function public.notificacao_disparar_push() from public, anon, authenticated;

drop trigger if exists disparar_push on public.notificacoes;
create trigger disparar_push after insert on public.notificacoes
  for each row execute function public.notificacao_disparar_push();

-- ── 8. Pedidos: a marca responde pelo painel ────────────────────────────────
alter table public.solicitacao_estado add column if not exists resposta text;

create or replace function public.marca_responder_solicitacao(p_solicitacao uuid, p_resposta text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_resposta), '') = '' then raise exception 'resposta_vazia'; end if;
  update public.solicitacao_estado e set
    estado = 'respondido', respondido_em = now(), respondido_por = auth.uid(),
    resposta = left(trim(p_resposta), 4000)
   where e.solicitacao_id = p_solicitacao
     and exists (select 1 from public.participacoes pa join public.participantes p on p.id = pa.participante_id
                  where pa.id = e.participacao_id and p.user_id = auth.uid());
  if not found then raise exception 'pedido_nao_encontrado'; end if;
end $$;
revoke all on function public.marca_responder_solicitacao(uuid, text) from public, anon, authenticated;
grant execute on function public.marca_responder_solicitacao(uuid, text) to authenticated;

drop function if exists public.get_pendentes_solicitacao(text, uuid);
create function public.get_pendentes_solicitacao(p_secret text, p_id uuid)
returns table(participacao_id uuid, marca text, edicao_codigo text, estado text,
              resposta text, respondido_em timestamptz, respondido_por text)
language sql stable security definer set search_path = public as $$
  select e.participacao_id, p.nome_marca, pa.edicao_codigo, e.estado,
         e.resposta, e.respondido_em,
         case when e.respondido_por is null and e.estado = 'respondido' then 'Acesso compartilhado'
              when e.respondido_por is null then null
              else public.rotulo_de_user(e.respondido_por) end
    from public.solicitacao_estado e
    join public.participacoes pa on pa.id = e.participacao_id
    join public.participantes p  on p.id = pa.participante_id
   where public.pode(p_secret, 'dado.ler')
     and e.solicitacao_id = p_id
   order by e.estado, p.nome_marca;
$$;
revoke all on function public.get_pendentes_solicitacao(text, uuid) from public, anon, authenticated;
grant execute on function public.get_pendentes_solicitacao(text, uuid) to anon, authenticated;

-- ── 9. Vaga de foto sem duplicata ───────────────────────────────────────────
create unique index if not exists sessoes_fotos_vaga_unica
  on public.sessoes_fotos (edicao_codigo, data_hora) where status = 'aberto';

-- ── 10. Captura das RPCs que só existiam no banco ───────────────────────────
-- Aplicadas pela migration `rpcs_solicitacoes_arquivos` (25/08/2026), que
-- nunca virou arquivo. Corpo lido do banco com pg_get_functiondef em
-- 28/09/2026 — SEM mudança; `create or replace` aqui só dá a elas um arquivo.
CREATE OR REPLACE FUNCTION public.atualizar_solicitacao(p_secret text, p_id uuid, p_titulo text DEFAULT NULL::text, p_texto text DEFAULT NULL::text, p_prazo timestamp with time zone DEFAULT NULL::timestamp with time zone, p_arquivada boolean DEFAULT NULL::boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;

  update public.solicitacoes set
    titulo    = coalesce(nullif(trim(p_titulo), ''), titulo),
    texto     = coalesce(nullif(trim(p_texto), ''), texto),
    prazo_em  = coalesce(p_prazo, prazo_em),
    arquivada = coalesce(p_arquivada, arquivada)
  where id = p_id;
  if not found then raise exception 'solicitacao_nao_encontrada'; end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.criar_solicitacao(p_secret text, p_titulo text, p_texto text, p_escopo text DEFAULT 'geral'::text, p_participacao uuid DEFAULT NULL::uuid, p_edicao text DEFAULT NULL::text, p_bloco text DEFAULT 'livre'::text, p_prazo timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if coalesce(trim(p_titulo),'') = '' or coalesce(trim(p_texto),'') = '' then
    raise exception 'titulo_e_texto_obrigatorios';
  end if;

  insert into public.solicitacoes
    (escopo, participacao_id, edicao_codigo, bloco, titulo, texto, prazo_em, criado_por)
  values (p_escopo, p_participacao, p_edicao, p_bloco, trim(p_titulo), trim(p_texto),
          p_prazo, auth.uid())
  returning id into v_id;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'criar_solicitacao', 'solicitacoes', v_id::text,
          jsonb_build_object('escopo', p_escopo, 'bloco', p_bloco));

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_arquivos_admin(p_secret text)
 RETURNS TABLE(id uuid, escopo text, nome text, descricao text, versao text, path text, publicado_em timestamp with time zone, arquivado boolean, exige_leitura boolean, marca text, leituras bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select a.id, a.escopo, a.nome, a.descricao, a.versao, a.path,
         a.publicado_em, a.arquivado, a.exige_leitura,
         p.nome_marca,
         (select count(*) from public.arquivo_leitura l where l.arquivo_id = a.id)
    from public.arquivos a
    left join public.participacoes pa on pa.id = a.participacao_id
    left join public.participantes p  on p.id = pa.participante_id
   where public.pode(p_secret, 'dado.ler')
   order by a.publicado_em desc nulls first;
$function$;

CREATE OR REPLACE FUNCTION public.get_solicitacoes_admin(p_secret text)
 RETURNS TABLE(id uuid, escopo text, bloco text, titulo text, texto text, prazo_em timestamp with time zone, publicada_em timestamp with time zone, arquivada boolean, edicao_codigo text, marca text, pendentes bigint, respondidas bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.id, s.escopo, s.bloco, s.titulo, s.texto,
         s.prazo_em, s.publicada_em, s.arquivada, s.edicao_codigo,
         p.nome_marca,
         count(*) filter (where e.estado = 'pendente'),
         count(*) filter (where e.estado = 'respondido')
    from public.solicitacoes s
    left join public.solicitacao_estado e on e.solicitacao_id = s.id
    left join public.participacoes pa on pa.id = s.participacao_id
    left join public.participantes p   on p.id = pa.participante_id
   where public.pode(p_secret, 'dado.ler')
   group by s.id, p.nome_marca
   order by s.publicada_em desc nulls first, s.created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_solicitacao(p_secret text, p_solicitacao uuid, p_participacao uuid, p_respondido boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;

  update public.solicitacao_estado set
    estado        = case when p_respondido then 'respondido' else 'pendente' end,
    respondido_em = case when p_respondido then now() else null end,
    respondido_por= case when p_respondido then auth.uid() else null end
  where solicitacao_id = p_solicitacao and participacao_id = p_participacao;
  if not found then raise exception 'estado_nao_encontrado'; end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.publicar_solicitacao(p_secret text, p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s public.solicitacoes%rowtype; v_n integer;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;

  select * into s from public.solicitacoes where id = p_id;
  if not found then raise exception 'solicitacao_nao_encontrada'; end if;

  if s.publicada_em is null then
    update public.solicitacoes set publicada_em = now() where id = p_id;
  end if;

  -- O leque materializa uma linha por participação alcançada. Republicar não
  -- duplica nem reabre o que já foi respondido.
  insert into public.solicitacao_estado (solicitacao_id, participacao_id)
  select p_id, pa.id
    from public.participacoes pa
   where (s.escopo = 'marca' and pa.id = s.participacao_id)
      or (s.escopo = 'geral'
          and (s.edicao_codigo is null or pa.edicao_codigo = s.edicao_codigo))
  on conflict (solicitacao_id, participacao_id) do nothing;

  get diagnostics v_n = row_count;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'publicar_solicitacao', 'solicitacoes', p_id::text,
          jsonb_build_object('alcancadas', v_n));

  return v_n;
end;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_push_organizacao(p_secret text, p_endpoint text, p_p256dh text, p_auth text, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  insert into public.push_subscriptions (papel, endpoint, p256dh, auth_chave, user_agent)
  values ('organizacao', p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth_chave = excluded.auth_chave, ativo = true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.remover_push_organizacao(p_secret text, p_endpoint text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and papel = 'organizacao';
end;
$function$;

CREATE OR REPLACE FUNCTION public.senha_unica_definir(p_secret text, p_ativa boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.pode(p_secret, 'acesso.gerir') then raise exception 'nao_autorizado'; end if;

  if p_ativa is false and not exists (
    select 1 from public.perfis
     where papel = 'organizacao' and ativo and funcao = 'administrador'
  ) then
    raise exception 'sem_administrador_nominal';
  end if;

  update public.admin_config set senha_unica_ativa = p_ativa where id;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, detalhe)
  values (auth.uid(), 'senha_unica', 'admin_config', jsonb_build_object('ativa', p_ativa));
end;
$function$;
