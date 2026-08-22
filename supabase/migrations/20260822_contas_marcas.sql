-- =============================================================================
-- Contas das marcas — Sweet & Coffee Week · Fase 1 do plano
-- (docs/PLANO-painel-contas-participantes.md §3)
--
-- O que esta migration abre: o passo seguinte a `quero_participar.status =
-- 'aprovado'`. A organização cria o acesso, a marca entra com conta própria,
-- define a própria senha e completa o cadastro da edição.
--
-- POR QUE o Supabase Auth entra agora, se `admin_ok` bastava até aqui:
--   A senha compartilhada responde "pode entrar?" e nunca "quem entrou?".
--   Isso serve a um painel de leitura usado por duas pessoas, e quebra no
--   instante em que existem N marcas que só podem ver o PRÓPRIO registro — a
--   RLS não tem como distinguir a marca A da marca B se as duas mandam a mesma
--   string. Daí `auth.uid()`.
--
-- Segurança — mesmo padrão das migrations anteriores:
--   • RLS habilitado em tudo. Aqui, ao contrário das tabelas de formulário,
--     EXISTEM policies: é o ponto do Auth. A marca lê e escreve a própria linha
--     por `auth.uid()`, sem passar por RPC.
--   • A organização continua entrando por `admin_ok(p_secret)` via RPC
--     `security definer`. A unificação é a Fase 2 (`pode_organizacao`).
--   • `set search_path = public` em toda função definer.
--   • Nenhuma função nova concedida a `anon`. Criar conta é privilégio da Edge
--     Function, com a chave de serviço, fora deste arquivo.
--
-- ⛔ REGRA DE VAZAMENTO — ler antes de escrever qualquer leitura pública:
--   `participantes_operacao` guarda PREÇO, ENDEREÇO e HORÁRIO. São exatamente
--   os três dados que o CLAUDE.md §2.2 proíbe no site institucional, porque são
--   os que envelhecem. Eles vivem numa tabela SEPARADA justamente para que a
--   regra seja "nada público faz join com participantes_operacao" — e não
--   "lembre de excluir três colunas de um select". Um `select *` distraído em
--   `participantes` não alcança nenhum deles.
--
-- Aplicar no Supabase: Dashboard → SQL Editor → New query → Run. Idempotente.
-- ⚠️ O projeto está no plano free, SEM backup automático: rodar `db dump` antes.
--    Depende de public.admin_ok(text) (schema.sql).
-- =============================================================================

create extension if not exists pgcrypto;

-- ── perfis: identidade e papel ───────────────────────────────────────────────
-- Uma linha por usuário do Auth. `papel` é o que a RLS lê; não confiar em
-- app_metadata para autorização, que é gravável pela chave de serviço e viaja
-- num JWT que pode estar desatualizado.
create table if not exists public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  papel text not null,
  ativo boolean not null default true,
  -- Em TABELA, não no JWT: em app_metadata a flag só sairia do token no próximo
  -- refresh, e a marca ficaria presa no "troque sua senha" depois de já ter
  -- trocado. Em tabela a leitura é sempre a atual.
  deve_trocar_senha boolean not null default false,
  senha_trocada_em timestamptz,
  created_at timestamptz not null default now(),
  constraint perfis_papel_check check (papel in ('organizacao', 'marca'))
);

create index if not exists perfis_papel_idx on public.perfis (papel) where ativo;

alter table public.perfis enable row level security;

-- Cada um lê o próprio perfil. Ninguém escreve pelo cliente: papel e `ativo`
-- são decisão da organização, e mudam por RPC definer.
drop policy if exists perfis_leitura_propria on public.perfis;
create policy perfis_leitura_propria on public.perfis
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.perfis from anon, authenticated;
grant select on public.perfis to authenticated;

-- ── participantes: a marca no festival ───────────────────────────────────────
-- Publicável. Tudo que pode um dia aparecer no site mora aqui.
create table if not exists public.participantes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- De qual candidatura veio; null se a organização cadastrou à mão.
  -- `unique` é o que torna "Criar acesso" idempotente: dois cliques, duas
  -- requisições simultâneas ou um retry de rede colidem AQUI, no banco. Um `if`
  -- na Edge Function não segura corrida — só produz mensagem melhor.
  -- Vários NULL convivem (Postgres não considera NULL igual a NULL), então
  -- cadastro manual não esbarra na restrição.
  origem_id uuid unique references public.quero_participar (id) on delete set null,
  -- Dono da conta; null enquanto o acesso não foi criado.
  -- ⚠️ SEM `unique`: participação é marca + EDIÇÃO (§9.9). A marca que veio em
  -- 2025 e volta em 2026 é o mesmo usuário do Auth em duas linhas — é por isso
  -- que `email_exists` no Auth é caminho feliz, não erro. Um `unique` aqui
  -- transformaria "marca recorrente" em falha de cadastro.
  user_id uuid references auth.users (id) on delete set null,
  -- Convenção de nome de arquivo do acervo: combos/<slug>/main.jpg e
  -- logos/participants/<slug>.png. O slug deixou de ser congelado (os QR Codes
  -- da Lovers morreram), mas a convenção continua valendo.
  slug text unique,
  nome_marca text not null,
  edicao_codigo text,
  responsavel text,
  telefone text,
  email text,
  instagram text,
  site text,
  -- o que a marca cria para a edição
  combo_nome text,
  combo_descricao text,
  combo_foto_path text,
  status_cadastro text not null default 'aguardando_cadastro',
  constraint participantes_status_check check (status_cadastro in (
    'aguardando_cadastro', 'em_preenchimento', 'cadastro_completo', 'encerrado'
  ))
);

-- A RLS da marca filtra por `user_id` em toda leitura e toda escrita. Sem
-- índice, cada acesso vira varredura da tabela inteira.
create index if not exists participantes_user_idx on public.participantes (user_id);
create index if not exists participantes_status_idx on public.participantes (status_cadastro);
create index if not exists participantes_edicao_idx on public.participantes (edicao_codigo);

alter table public.participantes enable row level security;

-- A marca lê e edita a PRÓPRIA linha. `status_cadastro`, `slug`, `user_id` e
-- `origem_id` ficam fora do grant de update: quem muda status é o servidor.
drop policy if exists participantes_marca_le on public.participantes;
create policy participantes_marca_le on public.participantes
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists participantes_marca_edita on public.participantes;
create policy participantes_marca_edita on public.participantes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.participantes from anon, authenticated;
grant select on public.participantes to authenticated;
grant update (nome_marca, responsavel, telefone, email, instagram, site,
              combo_nome, combo_descricao, combo_foto_path)
  on public.participantes to authenticated;

-- ── participantes_operacao: o dado volátil, apartado ─────────────────────────
-- Ver a REGRA DE VAZAMENTO no cabeçalho. Nada público faz join com esta tabela.
create table if not exists public.participantes_operacao (
  participante_id uuid primary key
    references public.participantes (id) on delete cascade,
  updated_at timestamptz not null default now(),
  combo_preco numeric(10,2),
  -- [{ endereco, bairro, horarios }] — array porque rede tem várias unidades, e
  -- é a contagem de unidades que dá as "33 lojas" da última edição.
  unidades jsonb not null default '[]'::jsonb
);

alter table public.participantes_operacao enable row level security;

drop policy if exists operacao_marca_le on public.participantes_operacao;
create policy operacao_marca_le on public.participantes_operacao
  for select to authenticated
  using (exists (
    select 1 from public.participantes p
     where p.id = participante_id and p.user_id = auth.uid()
  ));

drop policy if exists operacao_marca_edita on public.participantes_operacao;
create policy operacao_marca_edita on public.participantes_operacao
  for update to authenticated
  using (exists (
    select 1 from public.participantes p
     where p.id = participante_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.participantes p
     where p.id = participante_id and p.user_id = auth.uid()
  ));

revoke all on public.participantes_operacao from anon, authenticated;
grant select on public.participantes_operacao to authenticated;
grant update (combo_preco, unidades) on public.participantes_operacao to authenticated;

-- ── auditoria: append-only ───────────────────────────────────────────────────
-- Sem grant de update nem de delete para ninguém além do dono do banco. Um log
-- que a aplicação pode reescrever não é log.
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  -- quem: uuid do usuário quando há conta; null = senha compartilhada, que é
  -- justamente a cegueira que a Fase 2 remove.
  ator_user_id uuid references auth.users (id) on delete set null,
  ator_rotulo text not null default 'senha-compartilhada',
  acao text not null,
  alvo_tabela text,
  alvo_id text,
  detalhe jsonb not null default '{}'::jsonb
);

create index if not exists auditoria_at_idx on public.auditoria (at desc);
create index if not exists auditoria_alvo_idx on public.auditoria (alvo_tabela, alvo_id);

alter table public.auditoria enable row level security;
revoke all on public.auditoria from anon, authenticated;

-- ── quero_participar: o status que fecha o ciclo ─────────────────────────────
-- 'aguardando_cadastro' já existia (o gancho que este plano veio destravar).
-- Falta o estado final, quando a marca terminou de preencher.
alter table public.quero_participar
  drop constraint if exists quero_participar_status_check;
alter table public.quero_participar
  add constraint quero_participar_status_check check (status in (
    'novo', 'em_analise', 'contatado', 'aprovado', 'nao_selecionado',
    'aguardando_cadastro', 'cadastro_completo'
  ));

-- ── updated_at ───────────────────────────────────────────────────────────────
create or replace function public.tocar_updated_at()
returns trigger language plpgsql set search_path = public as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists participantes_tocar on public.participantes;
create trigger participantes_tocar before update on public.participantes
  for each row execute function public.tocar_updated_at();

drop trigger if exists operacao_tocar on public.participantes_operacao;
create trigger operacao_tocar before update on public.participantes_operacao
  for each row execute function public.tocar_updated_at();

-- ── RPC: vincular_conta_marca ────────────────────────────────────────────────
-- O passo 4 da Edge Function `criar-acesso-marca` (plano §4): perfil +
-- participante + operação + status + auditoria, NUMA TRANSAÇÃO SÓ.
--
-- POR QUE uma função e não cinco chamadas do lado do Deno:
--   Se o convite falhar depois, o pior cenário é "conta existe, e-mail não
--   chegou" — resolve reenviando. O inaceitável é "usuário criado no Auth,
--   perfil não" ou "participante sem linha de operação": meio-registro que
--   nenhuma tela sabe mostrar e ninguém sabe consertar. Cinco chamadas HTTP não
--   têm como voltar atrás; um bloco plpgsql tem.
--
-- Idempotente de propósito: chamar de novo com o mesmo `p_origem` devolve o
-- mesmo participante em vez de estourar. É o que torna retry seguro.
create or replace function public.vincular_conta_marca(p_user uuid, p_origem uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_id uuid;
  v_q  public.quero_participar%rowtype;
begin
  if p_user is null or p_origem is null then
    raise exception 'argumentos_obrigatorios';
  end if;

  select * into v_q from public.quero_participar where id = p_origem;
  if not found then
    raise exception 'candidatura_nao_encontrada';
  end if;

  -- 1. Perfil. `papel` fixo em 'marca' — esta função NUNCA cria organização.
  --    Conta de organização nasce na Fase 2, por outro caminho, para que
  --    nenhum erro de argumento aqui possa promover alguém.
  insert into public.perfis (user_id, papel)
       values (p_user, 'marca')
  on conflict (user_id) do update set ativo = true;

  -- 2. Participante. Os dados saem da candidatura, não de argumento: o que a
  --    marca escreveu no formulário é a fonte, e redigitar é como divergência
  --    entra no sistema. Na `quero_participar`, `empresa` é a marca e `nome` é
  --    a pessoa.
  insert into public.participantes
         (origem_id, user_id, nome_marca, responsavel, telefone, email,
          instagram, site, status_cadastro)
       values
         (p_origem, p_user, v_q.empresa, v_q.nome, v_q.telefone, v_q.email,
          v_q.instagram, v_q.site, 'aguardando_cadastro')
  on conflict (origem_id) do update
          -- Não rouba conta já vinculada: se a linha existe com dono, ele fica.
          set user_id = coalesce(participantes.user_id, excluded.user_id)
    returning id into v_id;

  -- 3. Linha de operação vazia. A policy de UPDATE exige linha existente — sem
  --    ela a marca abriria o formulário e não teria onde gravar preço e
  --    unidades. Criar aqui evita conceder INSERT ao cliente.
  insert into public.participantes_operacao (participante_id)
       values (v_id)
  on conflict (participante_id) do nothing;

  -- 4. A candidatura muda de estado — é o gancho que o painel lê. Nunca puxa
  --    de volta quem já terminou o cadastro.
  update public.quero_participar
     set status = 'aguardando_cadastro'
   where id = p_origem
     and status <> 'cadastro_completo';

  -- 5. Auditoria. `ator_rotulo` fica no padrão 'senha-compartilhada': hoje o
  --    banco não tem como saber QUEM da organização clicou. Registrar a
  --    cegueira é melhor que gravar um nome inventado — e ela some na Fase 2.
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
       values ('criar_acesso_marca', 'participantes', v_id::text,
               jsonb_build_object('origem_id', p_origem, 'user_id', p_user));

  return v_id;
end;
$fn$;

-- Só a chave de serviço (Edge Function) chama. Nunca o navegador: criar conta
-- não é operação que possa sair de um bundle público.
revoke all on function public.vincular_conta_marca(uuid, uuid)
  from public, anon, authenticated;

-- ── RPC: user_id_por_email ───────────────────────────────────────────────────
-- Resolve o `user_id` de um e-mail que JÁ existe no Auth. Necessária porque
-- `createUser` devolve 422 `email_exists` sem dizer qual é o usuário, e esse é
-- o caminho feliz da marca recorrente (participou em 2025, volta em 2026).
--
-- A alternativa da API seria `listUsers` paginado — varrer a base inteira para
-- achar um e-mail, a cada aprovação.
--
-- `security definer` porque o schema `auth` não é acessível de fora. Devolve
-- SÓ o uuid: nada de hash de senha, metadata ou data de último login.
create or replace function public.user_id_por_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
stable
as $fn$
  select id from auth.users
   where lower(email) = lower(trim(p_email))
   limit 1;
$fn$;

revoke all on function public.user_id_por_email(text)
  from public, anon, authenticated;
