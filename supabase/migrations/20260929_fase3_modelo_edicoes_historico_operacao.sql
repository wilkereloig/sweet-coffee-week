-- =============================================================================
-- Fase 3 da evolução do painel (docs/EVOLUCAO-PAINEL-2026-09.md) — o modelo
--
-- Uma arquitetura só. Nada aqui duplica tabela existente:
--   ESTABELECIMENTO  = participantes            (já existia; ganha identidade)
--   PARTICIPAÇÃO     = participacoes            (já existia; ganha operação)
--   UNIDADE          = participacao_unidades    (já existia; ganha mesas)
--   COMBO            = participacoes.combo_* + participantes_itens (posição 1–3)
--   VENDA DIÁRIA     = vendas_diarias           (já existia; ganha autoria)
--   HISTÓRICO/AUDIT. = auditoria                (já existia)
--   MENSAGEM/AVISO   = mensagens / notificacoes (já existiam)
-- Novas, porque não havia equivalente:
--   edicoes, edicao_cronograma            → a edição vira CONFIGURAÇÃO, não código
--   historico_marcas/_aliases/_participacoes, premiacoes
--                                         → o acervo (src/data) passa a existir no banco
--   participante_vinculos, participante_aliases
--                                         → ligação estabelecimento ⇄ acervo, só por decisão humana
--   temas_propostos                       → regra "tema não se repete" com ordem de chegada
--   materiais                             → mesas, prisma, placa, display, voucher, entrega
--   contatos_relacionamento, presskit_envios
--                                         → influenciadores/convidados e quem recebeu Press Kit
--   import_lotes, import_linhas, revisao_pendencias
--                                         → importação rastreável + fila de revisão humana
--
-- Tudo aditivo. Rollback: drop das tabelas novas e das colunas novas (nenhuma
-- coluna existente muda de tipo, nenhuma linha existente é apagada). O painel
-- publicado (master) ignora as colunas novas e segue funcionando.
-- =============================================================================

-- ── 0. Normalização (imutável: serve a coluna gerada e índice) ──────────────
-- Mesma regra do norm() de src/data/handoff/awardsData.js: minúsculas, sem
-- acento, "&" vira " e ", o resto que não é letra/número vira espaço.
create or replace function public.normalizar_nome(p text)
returns text language sql immutable parallel safe as $$
  select nullif(btrim(regexp_replace(
           replace(translate(lower(coalesce(p, '')),
             'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ', 'aaaaaaeeeeiiiiooooouuuucnyy'),
             '&', ' e '),
           '[^a-z0-9]+', ' ', 'g')), '')
$$;

-- Telefone: só dígitos; 10–11 dígitos ganham o 55 do Brasil. Fora disso, nulo
-- (o valor original fica guardado ao lado — nunca é reescrito).
create or replace function public.normalizar_telefone(p text)
returns text language sql immutable parallel safe as $$
  select case
    when length(d) in (10, 11) then '55' || d
    when length(d) in (12, 13) and left(d, 2) = '55' then d
    else null end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

create or replace function public.normalizar_cnpj(p text)
returns text language sql immutable parallel safe as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '')
$$;

-- Dígitos verificadores do CNPJ. Não bloqueia gravação: alimenta a revisão.
create or replace function public.cnpj_valido(p text)
returns boolean language plpgsql immutable parallel safe as $$
declare d text := public.normalizar_cnpj(p); s int; r int; i int;
  p1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  p2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
begin
  if d is null or length(d) <> 14 or d ~ '^(\d)\1{13}$' then return false; end if;
  s := 0; for i in 1..12 loop s := s + substr(d, i, 1)::int * p1[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  if r <> substr(d, 13, 1)::int then return false; end if;
  s := 0; for i in 1..13 loop s := s + substr(d, i, 1)::int * p2[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  return r = substr(d, 14, 1)::int;
end $$;

-- Máscara para exibição e log: nunca o documento/telefone inteiro.
create or replace function public.mascarar(p text)
returns text language sql immutable parallel safe as $$
  select case when p is null or length(p) < 5 then p
              else repeat('•', length(p) - 4) || right(p, 4) end
$$;

-- ── 1. Edições e cronograma ─────────────────────────────────────────────────
create table if not exists public.edicoes (
  codigo               text primary key,
  ordem                int  not null unique,
  nome                 text not null,
  tema                 text,
  periodo_texto        text,
  festival_inicio      date,
  festival_fim         date,
  taxa_inscricao       numeric(10,2),
  foto_exige_pagamento boolean not null default false,
  lembrete_vendas_hora time,
  classificacao        text not null default 'atual_confirmado'
                       check (classificacao in ('atual_confirmado','historico_confirmado','historico_incerto')),
  fonte                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (festival_fim is null or festival_inicio is null or festival_fim >= festival_inicio)
);

create table if not exists public.edicao_cronograma (
  id                   uuid primary key default gen_random_uuid(),
  edicao_codigo        text not null references public.edicoes(codigo) on update cascade on delete cascade,
  chave                text,   -- papel estável lido pela "próxima ação": confirmacao, tema, combo, fotos, lancamento, festival, premiacao
  titulo               text not null,
  descricao            text,
  tipo                 text not null default 'prazo' check (tipo in ('prazo','periodo','marco')),
  inicio               date,
  fim                  date,
  horario              text,
  ordem                int  not null default 0,
  obrigatorio          boolean not null default false,
  visivel_participante boolean not null default true,
  condicao             text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (inicio is not null or fim is not null),
  check (fim is null or inicio is null or fim >= inicio)
);
create index if not exists edicao_cronograma_edicao_idx on public.edicao_cronograma (edicao_codigo, ordem);

-- A edição corrente (já apontada em admin_config.edicao_atual = '2026.2').
-- Datas informadas pela organização em 28/09/2026 — podem mudar, por isso são
-- LINHAS editáveis no painel, nunca constantes no código.
insert into public.edicoes (codigo, ordem, nome, festival_inicio, festival_fim,
                            foto_exige_pagamento, classificacao, fonte)
values ('2026.2', 17, 'Sweet & Coffee Week 2026.2', '2026-11-05', '2026-11-15',
        true, 'atual_confirmado', 'Organização, 28/09/2026')
on conflict (codigo) do nothing;

insert into public.edicao_cronograma
  (edicao_codigo, chave, titulo, tipo, inicio, fim, ordem, obrigatorio, condicao)
select '2026.2', v.chave, v.titulo, v.tipo, v.inicio::date, v.fim::date, v.ordem, v.obrig, v.cond
  from (values
    ('confirmacao', 'Confirmação da participação', 'prazo',   null,         '2026-09-30', 10, true,  null),
    ('tema',        'Definição do tema',           'prazo',   null,         '2026-09-30', 20, true,  null),
    ('combo',       'Definição do combo',          'prazo',   null,         '2026-10-05', 30, true,  null),
    ('fotos',       'Sessões de fotos (1º período)', 'periodo', '2026-10-01', '2026-10-04', 40, true,
                    'Condicionada ao pagamento de 100% da taxa de inscrição'),
    ('fotos',       'Sessões de fotos (2º período)', 'periodo', '2026-10-13', '2026-10-18', 41, true,
                    'Condicionada ao pagamento de 100% da taxa de inscrição'),
    ('lancamento',  'Lançamento dos combos',       'marco',   '2026-11-03', null,         50, false, null),
    ('festival',    'Festival',                    'periodo', '2026-11-05', '2026-11-15', 60, false, null),
    ('premiacao',   'Divulgação da premiação',     'marco',   '2026-11-19', null,         70, false, null)
  ) as v(chave, titulo, tipo, inicio, fim, ordem, obrig, cond)
 where not exists (select 1 from public.edicao_cronograma where edicao_codigo = '2026.2');

-- Integridade: código de edição passa a existir de verdade.
alter table public.admin_config drop constraint if exists admin_config_edicao_fk;
alter table public.admin_config add constraint admin_config_edicao_fk
  foreign key (edicao_atual) references public.edicoes(codigo) on update cascade;
alter table public.participacoes drop constraint if exists participacoes_edicao_fk;
alter table public.participacoes add constraint participacoes_edicao_fk
  foreign key (edicao_codigo) references public.edicoes(codigo) on update cascade;
alter table public.sessoes_fotos drop constraint if exists sessoes_fotos_edicao_fk;
alter table public.sessoes_fotos add constraint sessoes_fotos_edicao_fk
  foreign key (edicao_codigo) references public.edicoes(codigo) on update cascade;
alter table public.solicitacoes drop constraint if exists solicitacoes_edicao_fk;
alter table public.solicitacoes add constraint solicitacoes_edicao_fk
  foreign key (edicao_codigo) references public.edicoes(codigo) on update cascade;

-- ── 2. Importação rastreável e fila de revisão ──────────────────────────────
create table if not exists public.import_lotes (
  id               uuid primary key default gen_random_uuid(),
  fonte            text not null,          -- ex.: 'Google Sheets: SCW 2026.2 - NOVEMBRO- Informações GERAIS'
  arquivo_nome     text,
  arquivo_sha256   text,
  arquivo_externo  text,                   -- id do arquivo na origem (Drive)
  edicao_codigo    text references public.edicoes(codigo) on update cascade,
  status           text not null default 'staging'
                   check (status in ('staging','validado','promovido','revertido','cancelado')),
  totais           jsonb not null default '{}'::jsonb,
  observacao       text,
  importado_por    uuid default auth.uid(),
  importado_rotulo text default public.ator_rotulo_atual(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.import_linhas (
  id                  uuid primary key default gen_random_uuid(),
  lote_id             uuid not null references public.import_lotes(id) on delete cascade,
  aba                 text not null,
  linha               int  not null,
  dados_originais     jsonb not null,     -- células como vieram, texto cru — nunca reescrito
  dados_normalizados  jsonb,
  classificacao       text not null default 'revisar'
                      check (classificacao in ('atual_confirmado','historico_confirmado','historico_incerto','modelo_vazio','revisar')),
  status              text not null default 'pendente'
                      check (status in ('pendente','importado','ignorado','rejeitado')),
  destino_tabela      text,
  destino_id          uuid,
  created_at          timestamptz not null default now(),
  unique (lote_id, aba, linha)
);

create table if not exists public.revisao_pendencias (
  id               uuid primary key default gen_random_uuid(),
  tipo             text not null check (tipo in
                   ('dado_inconsistente','possivel_correspondencia','possivel_duplicidade','conflito_tema','dado_ausente','outro')),
  severidade       text not null default 'aviso' check (severidade in ('aviso','bloqueio')),
  titulo           text not null,
  descricao        text,
  campo            text,
  valor_original   text,
  sugestao         jsonb,
  lote_id          uuid references public.import_lotes(id) on delete set null,
  linha_id         uuid references public.import_linhas(id) on delete set null,
  participante_id  uuid references public.participantes(id) on delete cascade,
  participacao_id  uuid references public.participacoes(id) on delete cascade,
  contato_id       uuid,
  status           text not null default 'aberta' check (status in ('aberta','resolvida','descartada')),
  resolucao        text,
  resolvido_por    uuid,
  resolvido_rotulo text,
  resolvido_em     timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists revisao_pendencias_abertas_idx on public.revisao_pendencias (status, created_at desc);

-- ── 3. Estabelecimento: identidade persistente ──────────────────────────────
alter table public.participantes add column if not exists historico_status text not null default 'nao_avaliado';
alter table public.participantes drop constraint if exists participantes_historico_status_check;
alter table public.participantes add constraint participantes_historico_status_check check (historico_status in
  ('nao_avaliado','recorrente_confirmado','novo_confirmado','possivel_correspondencia','sem_correspondencia_no_acervo','revisar'));
alter table public.participantes add column if not exists cnpj_normalizado text
  generated always as (public.normalizar_cnpj(cnpj)) stored;
alter table public.participantes add column if not exists telefone_normalizado text
  generated always as (public.normalizar_telefone(telefone)) stored;
alter table public.participantes add column if not exists import_lote_id uuid references public.import_lotes(id) on delete set null;
alter table public.participantes add column if not exists dados_originais jsonb;
-- CNPJ é o identificador auxiliar mais confiável — nunca senha, nunca autorização.
create unique index if not exists participantes_cnpj_unico
  on public.participantes (cnpj_normalizado) where cnpj_normalizado is not null;

create table if not exists public.participante_aliases (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  alias           text not null,
  alias_norm      text generated always as (public.normalizar_nome(alias)) stored,
  fonte           text,
  criado_por      uuid default auth.uid(),
  created_at      timestamptz not null default now()
);
create unique index if not exists participante_aliases_unico on public.participante_aliases (participante_id, alias_norm);

-- ── 4. Acervo histórico no banco ────────────────────────────────────────────
-- Fonte: src/data/sweetCoffeeHistory.js + loversAwardsResults.js (degrau 3 do
-- CLAUDE.md). Carga GERADA por scripts/historico-para-sql.mjs — não digitar.
create table if not exists public.historico_marcas (
  chave   text primary key,      -- normalizar_nome(nome canônico)
  nome    text not null,
  fonte   text not null
);
create table if not exists public.historico_aliases (
  id         uuid primary key default gen_random_uuid(),
  alias      text not null,
  alias_norm text generated always as (public.normalizar_nome(alias)) stored,
  chave      text not null references public.historico_marcas(chave) on delete cascade
);
create unique index if not exists historico_aliases_unico on public.historico_aliases (alias_norm);

create table if not exists public.historico_participacoes (
  id              uuid primary key default gen_random_uuid(),
  edicao_codigo   text not null references public.edicoes(codigo) on update cascade,
  chave           text not null references public.historico_marcas(chave) on delete cascade,
  nome_registrado text not null,
  classificacao   text not null default 'historico_confirmado'
                  check (classificacao in ('historico_confirmado','historico_incerto')),
  fonte           text not null,
  unique (edicao_codigo, nome_registrado)
);
create index if not exists historico_participacoes_chave_idx on public.historico_participacoes (chave);

create table if not exists public.premiacoes (
  id                   uuid primary key default gen_random_uuid(),
  edicao_codigo        text not null references public.edicoes(codigo) on update cascade,
  categoria            text not null,
  categoria_registrada text,
  trilha               text check (trilha in ('juri_tecnico','sweet_lovers')),
  colocacao            smallint not null check (colocacao between 1 and 3),
  chave                text references public.historico_marcas(chave) on delete set null,
  nome_registrado      text not null,
  participacao_id      uuid references public.participacoes(id) on delete set null,
  classificacao        text not null default 'historico_confirmado'
                       check (classificacao in ('atual_confirmado','historico_confirmado','historico_incerto')),
  fonte                text not null
);
create unique index if not exists premiacoes_unica on public.premiacoes
  (edicao_codigo, categoria, coalesce(trilha, ''), colocacao, nome_registrado);
create index if not exists premiacoes_chave_idx on public.premiacoes (chave);

-- Estabelecimento ⇄ marca do acervo. ALIAS NÃO É PROVA: sugestão nasce como
-- 'possivel' e só vira 'confirmado' por decisão de uma pessoa da organização.
create table if not exists public.participante_vinculos (
  participante_id uuid not null references public.participantes(id) on delete cascade,
  chave           text not null references public.historico_marcas(chave) on delete cascade,
  status          text not null default 'possivel' check (status in ('possivel','confirmado','rejeitado')),
  origem          text not null default 'sugestao',
  motivo          text,
  decidido_por    uuid,
  decidido_rotulo text,
  decidido_em     timestamptz,
  created_at      timestamptz not null default now(),
  primary key (participante_id, chave)
);
-- Uma marca do acervo pertence a um estabelecimento só.
create unique index if not exists participante_vinculos_confirmado_unico
  on public.participante_vinculos (chave) where status = 'confirmado';

-- ── 5. Participação: operação da edição ─────────────────────────────────────
alter table public.participacoes
  add column if not exists classificacao text not null default 'atual_confirmado',
  add column if not exists import_lote_id uuid references public.import_lotes(id) on delete set null,
  add column if not exists snapshot jsonb,              -- como o estabelecimento era NESTA edição
  add column if not exists foto_liberacao text not null default 'pendente',
  add column if not exists foto_liberacao_motivo text,
  add column if not exists pagamento_status text not null default 'nao_informado',
  add column if not exists pagamento_obs text,
  add column if not exists combo_para_viagem boolean,
  add column if not exists combo_vegano boolean,
  add column if not exists combo_diet boolean,
  add column if not exists combo_delivery text,
  add column if not exists combo_proposta text,
  add column if not exists combo_status text not null default 'rascunho',
  add column if not exists combo_revisao_nota text;
alter table public.participacoes drop constraint if exists participacoes_classificacao_check;
alter table public.participacoes add constraint participacoes_classificacao_check
  check (classificacao in ('atual_confirmado','historico_confirmado','historico_incerto','revisar'));
alter table public.participacoes drop constraint if exists participacoes_foto_liberacao_check;
alter table public.participacoes add constraint participacoes_foto_liberacao_check
  check (foto_liberacao in ('pendente','liberado','nao_liberado'));
alter table public.participacoes drop constraint if exists participacoes_pagamento_check;
alter table public.participacoes add constraint participacoes_pagamento_check
  check (pagamento_status in ('nao_informado','pendente','parcial','quitado','isento'));
alter table public.participacoes drop constraint if exists participacoes_combo_status_check;
alter table public.participacoes add constraint participacoes_combo_status_check
  check (combo_status in ('rascunho','em_analise','correcao_solicitada','aprovado'));

-- A marca escreve os campos novos do combo pelo mesmo caminho dos antigos.
grant update (combo_para_viagem, combo_vegano, combo_diet, combo_delivery, combo_proposta)
  on public.participacoes to authenticated;

-- Itens: posição 1–3. A planilha da organização pede "ITEM 2 — Doce ou
-- Salgado"; a unicidade antiga (participação + tipo) proibia dois doces.
alter table public.participantes_itens add column if not exists posicao smallint;
update public.participantes_itens set posicao = case tipo when 'doce' then 1 when 'salgado' then 2 else 3 end
 where posicao is null;
alter table public.participantes_itens alter column posicao set not null;
alter table public.participantes_itens drop constraint if exists participantes_itens_unico;
drop index if exists public.participantes_itens_unico;
create unique index if not exists participantes_itens_posicao_unica
  on public.participantes_itens (participacao_id, posicao);
alter table public.participantes_itens drop constraint if exists participantes_itens_posicao_tipo;
alter table public.participantes_itens add constraint participantes_itens_posicao_tipo check (
  (posicao = 1 and tipo = 'doce') or (posicao = 2 and tipo in ('doce','salgado')) or (posicao = 3 and tipo = 'bebida'));
grant update (tipo) on public.participantes_itens to authenticated;

create or replace function public.criar_itens_do_combo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.participantes_itens (participacao_id, participante_id, tipo, posicao)
  values (new.id, new.participante_id, 'doce', 1),
         (new.id, new.participante_id, 'salgado', 2),
         (new.id, new.participante_id, 'bebida', 3)
  on conflict do nothing;
  return new;
end $$;
revoke all on function public.criar_itens_do_combo() from public, anon, authenticated;

-- Unidade: mesas por unidade E por edição (a unidade já é da participação).
alter table public.participacao_unidades
  add column if not exists mesas int check (mesas is null or mesas >= 0),
  add column if not exists so_delivery boolean not null default false;

-- Venda diária: quem registrou e quem corrigiu.
alter table public.vendas_diarias
  add column if not exists observacao text,
  add column if not exists registrado_por uuid default auth.uid(),
  add column if not exists atualizado_por uuid;
grant update (observacao) on public.vendas_diarias to authenticated;

-- ── 6. Tema: não se repete na edição, com ordem de chegada ──────────────────
create table if not exists public.temas_propostos (
  id              uuid primary key default gen_random_uuid(),
  edicao_codigo   text not null references public.edicoes(codigo) on update cascade,
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  tema            text not null,
  tema_norm       text generated always as (public.normalizar_nome(tema)) stored,
  justificativa   text,
  solicitado_em   timestamptz not null default now(),
  origem          text not null default 'marca' check (origem in ('marca','organizacao','importacao')),
  status          text not null default 'proposto'
                  check (status in ('proposto','aprovado','recusado','substituido')),
  observacao      text,
  decidido_por    uuid,
  decidido_rotulo text,
  decidido_em     timestamptz,
  created_at      timestamptz not null default now()
);
-- A regra real: ao APROVAR não pode haver outro tema igual aprovado na edição.
-- Propostas iguais podem coexistir — é o conflito que a organização decide.
create unique index if not exists temas_aprovado_unico
  on public.temas_propostos (edicao_codigo, tema_norm) where status = 'aprovado';
create index if not exists temas_participacao_idx on public.temas_propostos (participacao_id, status);

-- A marca continua escrevendo `participacoes.tema_combo` (o painel publicado
-- faz assim); cada mudança vira proposta. Salvamento automático reescreve a
-- mesma proposta por 30 min — senão cada tecla viraria uma "chegada".
create or replace function public.temas_sincronizar()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ativa public.temas_propostos%rowtype; v_origem text;
begin
  if new.tema_combo is not distinct from old.tema_combo then return new; end if;
  v_origem := case when exists (select 1 from public.participantes
                                 where id = new.participante_id and user_id = auth.uid())
                   then 'marca' else 'organizacao' end;
  if current_setting('scw.importando', true) = 'on' then v_origem := 'importacao'; end if;

  select * into v_ativa from public.temas_propostos
   where participacao_id = new.id and status in ('proposto','aprovado')
   order by created_at desc limit 1;

  if public.normalizar_nome(new.tema_combo) is null then
    update public.temas_propostos set status = 'substituido'
     where participacao_id = new.id and status in ('proposto','aprovado');
    return new;
  end if;

  if v_ativa.id is not null and v_ativa.status = 'proposto'
     and v_ativa.created_at > now() - interval '30 minutes' then
    update public.temas_propostos
       set tema = btrim(new.tema_combo), justificativa = new.tema_justificativa
     where id = v_ativa.id;
  else
    update public.temas_propostos set status = 'substituido'
     where participacao_id = new.id and status in ('proposto','aprovado');
    insert into public.temas_propostos (edicao_codigo, participacao_id, tema, justificativa, origem)
    values (new.edicao_codigo, new.id, btrim(new.tema_combo), new.tema_justificativa, v_origem);
  end if;
  return new;
end $$;
revoke all on function public.temas_sincronizar() from public, anon, authenticated;
drop trigger if exists temas_sincronizar on public.participacoes;
create trigger temas_sincronizar after update of tema_combo on public.participacoes
  for each row execute function public.temas_sincronizar();

-- ── 7. Materiais ────────────────────────────────────────────────────────────
create table if not exists public.materiais (
  id              uuid primary key default gen_random_uuid(),
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  unidade_id      uuid references public.participacao_unidades(id) on delete set null,
  item            text not null check (item in
                  ('mesas','adesivo_prisma','prisma_mesa','placa_externa','display_balcao','voucher','outro')),
  descricao       text,
  quantidade      int check (quantidade is null or quantidade >= 0),
  status          text not null default 'previsto' check (status in ('previsto','separado','entregue','cancelado')),
  entregue_em     timestamptz,
  recebido_por    text,
  observacao      text,
  registrado_por  uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists materiais_participacao_idx on public.materiais (participacao_id);

-- ── 8. Relacionamento e Press Kit ───────────────────────────────────────────
-- Não é participante: tabela própria, sem ligação com participantes.
create table if not exists public.contatos_relacionamento (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null,
  instagram            text,
  instagram_norm       text generated always as
                       (nullif(lower(regexp_replace(coalesce(instagram, ''), '[^A-Za-z0-9._]', '', 'g')), '')) stored,
  telefone             text,
  telefone_normalizado text generated always as (public.normalizar_telefone(telefone)) stored,
  endereco             text,
  bairro               text,
  observacoes          text,
  tipo                 text not null default 'influenciador'
                       check (tipo in ('influenciador','convidado','parceiro','imprensa','outro')),
  ativo                boolean not null default true,
  fonte                text,
  import_lote_id       uuid references public.import_lotes(id) on delete set null,
  dados_originais      jsonb,
  criado_por           uuid default auth.uid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists contatos_instagram_unico
  on public.contatos_relacionamento (instagram_norm) where instagram_norm is not null;

create table if not exists public.presskit_envios (
  id                   uuid primary key default gen_random_uuid(),
  contato_id           uuid not null references public.contatos_relacionamento(id) on delete cascade,
  edicao_codigo        text references public.edicoes(codigo) on update cascade,
  edicao_texto         text,          -- rótulo da origem quando é histórico ("PRESS KIT 2024")
  status               text not null check (status in
                       ('constou_na_lista','selecionado','confirmado','enviado','entregue','nao_entregue','cancelado')),
  data                 date,
  voucher              text,
  itens                text,
  endereco_confirmado  text,
  observacao           text,
  fonte                text,
  import_lote_id       uuid references public.import_lotes(id) on delete set null,
  responsavel          uuid default auth.uid(),
  responsavel_rotulo   text default public.ator_rotulo_atual(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists presskit_contato_edicao_unico
  on public.presskit_envios (contato_id, edicao_codigo) where edicao_codigo is not null;

alter table public.revisao_pendencias drop constraint if exists revisao_pendencias_contato_fk;
alter table public.revisao_pendencias add constraint revisao_pendencias_contato_fk
  foreign key (contato_id) references public.contatos_relacionamento(id) on delete cascade;

-- ── 9. updated_at ───────────────────────────────────────────────────────────
do $$ declare t text; begin
  foreach t in array array['edicoes','edicao_cronograma','import_lotes','materiais',
                           'contatos_relacionamento','presskit_envios'] loop
    execute format('drop trigger if exists tocar_updated_at on public.%I', t);
    execute format('create trigger tocar_updated_at before update on public.%I
                    for each row execute function public.tocar_updated_at()', t);
  end loop;
end $$;

-- ── 10. Histórico de mudança (auditoria) da operação da participação ───────
create or replace function public.auditar_operacao()
returns trigger language plpgsql security definer set search_path = public as $$
declare k text; v_de jsonb := '{}'; v_para jsonb := '{}';
begin
  if tg_table_name = 'participacoes' then
    foreach k in array array['foto_liberacao','foto_liberacao_motivo','pagamento_status',
                             'combo_status','combo_revisao_nota','tema_combo','combo_preco'] loop
      if (to_jsonb(old) -> k) is distinct from (to_jsonb(new) -> k) then
        v_de := v_de || jsonb_build_object(k, to_jsonb(old) -> k);
        v_para := v_para || jsonb_build_object(k, to_jsonb(new) -> k);
      end if;
    end loop;
    if v_para <> '{}'::jsonb then
      insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
      values ('participacao.operacao', 'participacoes', new.id::text, new.id,
              jsonb_build_object('de', v_de, 'para', v_para));
    end if;
  elsif tg_table_name = 'vendas_diarias' then
    if new.quantidade is distinct from old.quantidade then
      new.atualizado_por := auth.uid();
      insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
      values ('venda.corrigida', 'vendas_diarias', new.id::text, new.participacao_id,
              jsonb_build_object('dia', new.dia, 'de', old.quantidade, 'para', new.quantidade));
    end if;
  end if;
  return new;
end $$;
revoke all on function public.auditar_operacao() from public, anon, authenticated;
drop trigger if exists auditar_operacao on public.participacoes;
create trigger auditar_operacao after update on public.participacoes
  for each row execute function public.auditar_operacao();
drop trigger if exists auditar_operacao on public.vendas_diarias;
create trigger auditar_operacao before update on public.vendas_diarias
  for each row execute function public.auditar_operacao();

-- Cadastro concluído → combo entra em análise (o painel publicado só conhece
-- status_cadastro; a análise do combo acompanha sem exigir tela nova).
create or replace function public.combo_em_analise()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status_cadastro = 'cadastro_completo' and old.status_cadastro is distinct from 'cadastro_completo'
     and new.combo_status in ('rascunho','correcao_solicitada') then
    new.combo_status := 'em_analise';
  end if;
  return new;
end $$;
revoke all on function public.combo_em_analise() from public, anon, authenticated;
drop trigger if exists combo_em_analise on public.participacoes;
create trigger combo_em_analise before update of status_cadastro on public.participacoes
  for each row execute function public.combo_em_analise();

-- ── 11. Permissões novas (o banco decide; a tela só esconde) ────────────────
insert into public.permissoes (funcao, acao) values
  ('administrador', 'edicao.gerir'),
  ('administrador', 'importacao.gerir'),
  ('administrador', 'curadoria.decidir'),
  ('curadoria',     'curadoria.decidir'),
  ('administrador', 'pagamento.gerir'),
  ('administrador', 'relacionamento.gerir'),
  ('curadoria',     'relacionamento.gerir'),
  ('producao',      'relacionamento.gerir')
on conflict do nothing;

-- ── 12. RLS e grants ────────────────────────────────────────────────────────
-- O Supabase dá ALL a anon/authenticated em tabela nova: tira tudo e devolve
-- só o que a marca precisa ler. A organização entra por RPC com pode().
do $$ declare t text; begin
  foreach t in array array['edicoes','edicao_cronograma','import_lotes','import_linhas',
    'revisao_pendencias','participante_aliases','historico_marcas','historico_aliases',
    'historico_participacoes','premiacoes','participante_vinculos','temas_propostos',
    'materiais','contatos_relacionamento','presskit_envios'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

grant select on public.edicoes, public.edicao_cronograma, public.temas_propostos, public.materiais
  to authenticated;

drop policy if exists edicoes_le on public.edicoes;
create policy edicoes_le on public.edicoes for select to authenticated using (true);

drop policy if exists cronograma_marca_le on public.edicao_cronograma;
create policy cronograma_marca_le on public.edicao_cronograma for select to authenticated
  using (visivel_participante);

drop policy if exists temas_marca_le on public.temas_propostos;
create policy temas_marca_le on public.temas_propostos for select to authenticated
  using (exists (select 1 from public.participacoes pa join public.participantes p on p.id = pa.participante_id
                  where pa.id = temas_propostos.participacao_id and p.user_id = auth.uid()));

drop policy if exists materiais_marca_le on public.materiais;
create policy materiais_marca_le on public.materiais for select to authenticated
  using (exists (select 1 from public.participacoes pa join public.participantes p on p.id = pa.participante_id
                  where pa.id = materiais.participacao_id and p.user_id = auth.uid()));

-- As funções de normalização são puras e não leem nada: podem ser chamadas.
revoke all on function public.cnpj_valido(text) from public, anon;
