-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 4 · Modelo de dados do painel · 25/08/2026
--
-- Aplicada no banco em três migrations, nesta ordem:
--   participacoes_por_edicao · solicitacoes_arquivos_push · rpcs_solicitacoes_arquivos
-- Este arquivo é o estado final reunido. Existe porque migration que só vive
-- dentro do Supabase é esquema sem cópia (CLAUDE.md §4.1).
--
-- A DECISÃO QUE ORGANIZA TUDO: `participantes` **é** a marca — mesma entidade,
-- dois nomes (a tela diz "marcas", §9.3). Não existe tabela `marcas`. O que
-- faltava era o vínculo com a EDIÇÃO: combo, itens, preço, unidades, horário e
-- fotos são de UMA edição, não da marca. É como o acervo já conta a história —
-- 410 participações, 123 marcas.
--
-- TUDO ADITIVO: `participantes` não perde uma coluna. As colunas de combo que
-- já existem lá seguem servindo `/marca/` como está hoje; a participação é o
-- lugar novo, e a tela migra na fase 5. Nada quebrou.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · A participação ────────────────────────────────────────────────────
create table if not exists public.participacoes (
  id                 uuid primary key default gen_random_uuid(),
  participante_id    uuid not null references public.participantes(id) on delete cascade,
  edicao_codigo      text not null,
  origem_id          uuid references public.quero_participar(id),
  status_cadastro    text not null default 'aguardando_cadastro'
                       check (status_cadastro in ('aguardando_cadastro','em_preenchimento','cadastro_completo','encerrado')),
  tema_combo         text,
  tema_justificativa text,
  combo_preco        numeric,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint participacoes_uma_por_edicao unique (participante_id, edicao_codigo)
);

create index if not exists participacoes_participante_idx on public.participacoes (participante_id);
create index if not exists participacoes_edicao_idx       on public.participacoes (edicao_codigo);

drop trigger if exists participacoes_touch on public.participacoes;
create trigger participacoes_touch before update on public.participacoes
  for each row execute function public.tocar_updated_at();

alter table public.participacoes enable row level security;

drop policy if exists participacoes_marca_le on public.participacoes;
create policy participacoes_marca_le on public.participacoes
  for select to authenticated
  using (exists (select 1 from public.participantes p
                  where p.id = participacoes.participante_id and p.user_id = auth.uid()));

drop policy if exists participacoes_marca_edita on public.participacoes;
create policy participacoes_marca_edita on public.participacoes
  for update to authenticated
  using (exists (select 1 from public.participantes p
                  where p.id = participacoes.participante_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.participantes p
                       where p.id = participacoes.participante_id and p.user_id = auth.uid()));

-- A marca preenche o combo; quem admite numa edição é a organização. RLS
-- decide LINHA, `grant` decide COLUNA — precisa dos dois.
revoke insert, delete, update on public.participacoes from anon, authenticated;
grant  update (tema_combo, tema_justificativa, combo_preco)
  on public.participacoes to authenticated;

-- ── 2 · Unidades: da PARTICIPAÇÃO, não da marca ──────────────────────────
-- Horário durante o festival muda a cada edição, e o acervo trata loja como
-- fato de edição: "21 marcas em 33 lojas" é um número DA Lovers.
-- Delivery fica por UNIDADE — loja de shopping e loja de rua costumam ter
-- páginas de aplicativo diferentes, e uma pode entregar e a outra não. Não é
-- detalhe operacional: Delivery/Takeaway é categoria premiada no Sweet Awards.
create table if not exists public.participacao_unidades (
  id              uuid primary key default gen_random_uuid(),
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  ordem           int  not null default 0,
  endereco        text,
  bairro          text,
  horarios        text,
  faz_delivery    boolean not null default false,
  canais_delivery jsonb   not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists participacao_unidades_part_idx on public.participacao_unidades (participacao_id);

drop trigger if exists participacao_unidades_touch on public.participacao_unidades;
create trigger participacao_unidades_touch before update on public.participacao_unidades
  for each row execute function public.tocar_updated_at();

alter table public.participacao_unidades enable row level security;

drop policy if exists unidades_marca_tudo on public.participacao_unidades;
create policy unidades_marca_tudo on public.participacao_unidades
  for all to authenticated
  using (exists (select 1 from public.participacoes pa
                   join public.participantes p on p.id = pa.participante_id
                  where pa.id = participacao_unidades.participacao_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.participacoes pa
                        join public.participantes p on p.id = pa.participante_id
                       where pa.id = participacao_unidades.participacao_id and p.user_id = auth.uid()));

-- ── 3 · Itens e sessões passam a pendurar na participação ────────────────
alter table public.participantes_itens
  add column if not exists participacao_id uuid references public.participacoes(id) on delete cascade;
alter table public.sessoes_fotos
  add column if not exists participacao_id uuid references public.participacoes(id) on delete cascade;

drop trigger if exists participantes_cria_itens on public.participantes;

create or replace function public.criar_itens_do_combo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.participantes_itens (participacao_id, participante_id, tipo)
  values (new.id, new.participante_id, 'doce'),
         (new.id, new.participante_id, 'salgado'),
         (new.id, new.participante_id, 'bebida')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists participacoes_cria_itens on public.participacoes;
create trigger participacoes_cria_itens
  after insert on public.participacoes
  for each row execute function public.criar_itens_do_combo();

-- A unicidade antiga (participante+tipo) impediria a mesma marca de ter doce
-- na 17ª e doce na 18ª.
alter table public.participantes_itens drop constraint if exists participantes_itens_unico;
create unique index if not exists participantes_itens_unico
  on public.participantes_itens (participacao_id, tipo);

-- ── 4 · Abrir participação — o único caminho ─────────────────────────────
-- Copia as unidades da participação anterior da mesma marca, para a pessoa
-- conferir em vez de redigitar endereço todo ano. Idempotente: dois cliques
-- não abrem duas.
create or replace function public.abrir_participacao(
  p_secret text, p_participante uuid, p_edicao text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_anterior uuid;
begin
  if not public.pode(p_secret, 'marca.liberar') then raise exception 'nao_autorizado'; end if;

  insert into public.participacoes (participante_id, edicao_codigo)
  values (p_participante, p_edicao)
  on conflict (participante_id, edicao_codigo) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.participacoes
     where participante_id = p_participante and edicao_codigo = p_edicao;
    return v_id;
  end if;

  select id into v_anterior from public.participacoes
   where participante_id = p_participante and id <> v_id
   order by created_at desc limit 1;

  if v_anterior is not null then
    insert into public.participacao_unidades
      (participacao_id, ordem, endereco, bairro, horarios, faz_delivery, canais_delivery)
    select v_id, ordem, endereco, bairro, horarios, faz_delivery, canais_delivery
      from public.participacao_unidades where participacao_id = v_anterior;
  end if;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'abrir_participacao', 'participacoes', v_id::text,
          jsonb_build_object('edicao', p_edicao, 'participante', p_participante));

  return v_id;
end;
$$;

-- ── 5 · Dado fiscal, opcional (item 3.4 do comando) ──────────────────────
alter table public.participantes
  add column if not exists cnpj         text,
  add column if not exists razao_social text;

-- ═══ Solicitações — `avisos` SOME e vira caso particular ═════════════════
-- Aviso geral é solicitação de escopo 'geral', bloco 'livre', sem resposta
-- esperada. Manter as duas seria duas telas, dois gatilhos de push e duas
-- respostas para "o que me pediram". `avisos` tinha zero linhas.
drop function if exists public.publicar_aviso(text, text, text, timestamptz);
drop function if exists public.atualizar_aviso(text, uuid, text, text, timestamptz, boolean);
drop function if exists public.get_avisos_admin(text);
drop table if exists public.avisos;

create table if not exists public.solicitacoes (
  id              uuid primary key default gen_random_uuid(),
  escopo          text not null default 'geral' check (escopo in ('geral','marca')),
  participacao_id uuid references public.participacoes(id) on delete cascade,
  edicao_codigo   text,
  bloco           text not null default 'livre'
                    check (bloco in ('livre','estabelecimento','combo','item_doce',
                                     'item_salgado','item_bebida','arquivo','fotos')),
  titulo          text not null,
  texto           text not null,
  prazo_em        timestamptz,
  publicada_em    timestamptz,
  arquivada       boolean not null default false,
  criado_por      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint solicitacao_escopo_coerente check (
    (escopo = 'marca' and participacao_id is not null)
    or (escopo = 'geral' and participacao_id is null)
  )
);

create index if not exists solicitacoes_participacao_idx on public.solicitacoes (participacao_id);
create index if not exists solicitacoes_prazo_idx        on public.solicitacoes (prazo_em);

drop trigger if exists solicitacoes_touch on public.solicitacoes;
create trigger solicitacoes_touch before update on public.solicitacoes
  for each row execute function public.tocar_updated_at();

-- O estado é MATERIALIZADO por participação ao publicar, não calculado na
-- leitura: "respondido em 22/08" é dado, não derivação — a organização pode
-- dar por respondido algo que chegou por telefone. E é o que transforma "quem
-- não respondeu" de conta feita na mão em uma linha de SQL.
create table if not exists public.solicitacao_estado (
  solicitacao_id  uuid not null references public.solicitacoes(id) on delete cascade,
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  estado          text not null default 'pendente' check (estado in ('pendente','respondido')),
  respondido_em   timestamptz,
  respondido_por  uuid references auth.users(id),
  primary key (solicitacao_id, participacao_id)
);

alter table public.solicitacoes       enable row level security;
alter table public.solicitacao_estado enable row level security;

-- A marca só vê o PUBLICADO. Rascunho é da organização.
drop policy if exists solicitacoes_marca_le on public.solicitacoes;
create policy solicitacoes_marca_le on public.solicitacoes
  for select to authenticated
  using (
    publicada_em is not null and not arquivada
    and (escopo = 'geral'
         or exists (select 1 from public.participacoes pa
                      join public.participantes p on p.id = pa.participante_id
                     where pa.id = solicitacoes.participacao_id and p.user_id = auth.uid()))
  );

drop policy if exists solicitacao_estado_marca_le on public.solicitacao_estado;
create policy solicitacao_estado_marca_le on public.solicitacao_estado
  for select to authenticated
  using (exists (select 1 from public.participacoes pa
                   join public.participantes p on p.id = pa.participante_id
                  where pa.id = solicitacao_estado.participacao_id and p.user_id = auth.uid()));

revoke insert, update, delete on public.solicitacoes, public.solicitacao_estado from anon, authenticated;

-- ═══ Arquivos ════════════════════════════════════════════════════════════
create table if not exists public.arquivos (
  id              uuid primary key default gen_random_uuid(),
  escopo          text not null default 'geral' check (escopo in ('geral','marca')),
  participacao_id uuid references public.participacoes(id) on delete cascade,
  nome            text not null,
  descricao       text,
  versao          text,
  path            text not null,
  mime            text,
  tamanho         bigint,
  -- Item 3.3 do comando: a capacidade existe, o padrão vem DESLIGADO. Ligar
  -- para contrato e regulamento é configuração, não código novo.
  exige_leitura   boolean not null default false,
  publicado_em    timestamptz,
  arquivado       boolean not null default false,
  criado_por      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  constraint arquivo_escopo_coerente check (
    (escopo = 'marca' and participacao_id is not null)
    or (escopo = 'geral' and participacao_id is null)
  )
);

create table if not exists public.arquivo_leitura (
  arquivo_id      uuid not null references public.arquivos(id) on delete cascade,
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  lido_em         timestamptz not null default now(),
  user_id         uuid references auth.users(id),
  primary key (arquivo_id, participacao_id)
);

alter table public.arquivos        enable row level security;
alter table public.arquivo_leitura enable row level security;

drop policy if exists arquivos_marca_le on public.arquivos;
create policy arquivos_marca_le on public.arquivos
  for select to authenticated
  using (
    publicado_em is not null and not arquivado
    and (escopo = 'geral'
         or exists (select 1 from public.participacoes pa
                      join public.participantes p on p.id = pa.participante_id
                     where pa.id = arquivos.participacao_id and p.user_id = auth.uid()))
  );

-- Registrar a própria leitura é a única escrita da marca aqui.
drop policy if exists leitura_marca_registra on public.arquivo_leitura;
create policy leitura_marca_registra on public.arquivo_leitura
  for insert to authenticated
  with check (exists (select 1 from public.participacoes pa
                        join public.participantes p on p.id = pa.participante_id
                       where pa.id = arquivo_leitura.participacao_id and p.user_id = auth.uid()));

drop policy if exists leitura_marca_le on public.arquivo_leitura;
create policy leitura_marca_le on public.arquivo_leitura
  for select to authenticated
  using (exists (select 1 from public.participacoes pa
                   join public.participantes p on p.id = pa.participante_id
                  where pa.id = arquivo_leitura.participacao_id and p.user_id = auth.uid()));

revoke insert, update, delete on public.arquivos from anon, authenticated;
revoke update, delete on public.arquivo_leitura from anon, authenticated;

-- ═══ Push ════════════════════════════════════════════════════════════════
create table if not exists public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  papel           text not null check (papel in ('organizacao','marca')),
  participante_id uuid references public.participantes(id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth_chave      text not null,   -- nome evita confusão com o schema `auth`
  user_agent      text,
  criado_em       timestamptz not null default now(),
  ativo           boolean not null default true,
  constraint push_marca_tem_participante
    check (papel <> 'marca' or participante_id is not null)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_marca_insere on public.push_subscriptions;
create policy push_marca_insere on public.push_subscriptions
  for insert to authenticated
  with check (papel = 'marca' and exists (
    select 1 from public.participantes p
     where p.id = push_subscriptions.participante_id and p.user_id = auth.uid()));

drop policy if exists push_marca_apaga on public.push_subscriptions;
create policy push_marca_apaga on public.push_subscriptions
  for delete to authenticated
  using (papel = 'marca' and exists (
    select 1 from public.participantes p
     where p.id = push_subscriptions.participante_id and p.user_id = auth.uid()));

-- Sem policy de SELECT para ninguém: quem lê é a Edge Function de envio, com
-- service_role, que ignora RLS. Endpoint de push é credencial.
revoke update on public.push_subscriptions from anon, authenticated;

-- ═══ Bucket dos arquivos ═════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit)
values ('arquivos', 'arquivos', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- Caminho: geral/<arquivo>  ou  <participacao_id>/<arquivo>
drop policy if exists arquivos_marca_le on storage.objects;
create policy arquivos_marca_le on storage.objects
  for select to authenticated
  using (
    bucket_id = 'arquivos'
    and ((storage.foldername(name))[1] = 'geral'
         or exists (select 1 from public.participacoes pa
                      join public.participantes p on p.id = pa.participante_id
                     where pa.id::text = (storage.foldername(name))[1]
                       and p.user_id = auth.uid()))
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- As RPCs (criar/atualizar/publicar/marcar solicitação, get_solicitacoes_admin,
-- get_pendentes_solicitacao, publicar_arquivo, get_arquivos_admin,
-- registrar/remover_push_organizacao) foram aplicadas na migration
-- `rpcs_solicitacoes_arquivos` e são recuperáveis por
-- `scripts/recuperar-migrations.mjs`. Todas guardadas por
-- `pode(p_secret, 'producao.gerir')`, exceto as de leitura ('dado.ler').
--
-- ⚠️ Elas ficam executáveis por `anon` DE PROPÓSITO — é a superfície de API, e
-- quem barra é o `p_secret` por dentro, como nas outras 22. O `revoke` vale só
-- para HELPER (`pode`, `acesso_travado`, `admin_ok`, `pode_organizacao`), e
-- precisa dos três alvos: `from public, anon, authenticated`.
-- ═══════════════════════════════════════════════════════════════════════════
