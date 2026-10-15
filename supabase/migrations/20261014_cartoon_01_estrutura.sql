-- Camada de edição Cartoon 2026.2 — fase 2, migration 1/3: ESTRUTURA (14/10/2026).
-- Plano: docs/cartoon-2026-2/03-modelo-de-dados.md.
--
-- Tudo aditivo: nenhuma coluna existente é apagada ou muda de tipo. As colunas
-- legadas (vegano/sem_gluten/sem_lactose, tem_substituicao/substituicao,
-- participacao_unidades.endereco/bairro/horarios, participantes.combo_nome/
-- combo_descricao) continuam lá e seguem funcionando para o painel atual.
--
-- O que entra:
--  * unidades — a UNIDADE permanente da marca (endereço estruturado, coordenada
--    conferida pela organização, WhatsApp público autorizado). participacao_unidades
--    passa a apontar para ela e vira a PARTICIPAÇÃO da unidade na edição, com os
--    modos de atendimento em três estados (sim / nao / nao_informado).
--  * unidade_disponibilidade — horário DO COMBO por dia do festival.
--  * declaracoes_alimentares — alergênicos e características por componente ou
--    por substituição, com "não informado" explícito. Ausência de linha ≠ "não contém".
--  * substituicoes — trocas estruturadas.
--  * midias_participacao — fotos com papel, aprovação e caminho público.
--  * participacoes.slug_publico (+ aliases), combo_nome/descricao/condicoes,
--    alterado_apos_aprovacao; participantes.apresentacao_publica.
--
-- Recuperação: cópia das 4 tabelas tocadas em backup_20261014 (feita antes de
-- aplicar) e o bloco "reverter" no fim do arquivo 3.

-- ---------------------------------------------------------------- dono
create or replace function public.marca_dona_participacao(p uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.conta_ativa() and exists (
    select 1 from public.participacoes pa join public.participantes pt on pt.id = pa.participante_id
     where pa.id = p and pt.user_id = auth.uid())
$$;
create or replace function public.marca_dona_participante(p uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.conta_ativa() and exists (select 1 from public.participantes where id = p and user_id = auth.uid())
$$;
create or replace function public.marca_dona_item(p uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.conta_ativa() and exists (
    select 1 from public.participantes_itens i join public.participantes pt on pt.id = i.participante_id
     where i.id = p and pt.user_id = auth.uid())
$$;
revoke all on function public.marca_dona_participacao(uuid), public.marca_dona_participante(uuid),
  public.marca_dona_item(uuid) from public, anon;
grant execute on function public.marca_dona_participacao(uuid), public.marca_dona_participante(uuid),
  public.marca_dona_item(uuid) to authenticated;

create or replace function public.slug_publico_de(p text)
 returns text language sql immutable set search_path to 'pg_catalog', 'public'
as $$ select replace(public.normalizar_nome(p), ' ', '-') $$;

-- ---------------------------------------------------------------- marca e participação
alter table public.participantes add column if not exists apresentacao_publica text
  check (apresentacao_publica is null or char_length(apresentacao_publica) <= 280);

alter table public.participacoes add column if not exists slug_publico text
  check (slug_publico is null or slug_publico ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
alter table public.participacoes add column if not exists combo_nome text
  check (combo_nome is null or char_length(combo_nome) <= 80);
alter table public.participacoes add column if not exists combo_descricao text
  check (combo_descricao is null or char_length(combo_descricao) <= 400);
alter table public.participacoes add column if not exists combo_condicoes text
  check (combo_condicoes is null or char_length(combo_condicoes) <= 280);
alter table public.participacoes add column if not exists alterado_apos_aprovacao boolean not null default false;
create unique index if not exists participacoes_slug_publico_edicao
  on public.participacoes (edicao_codigo, slug_publico) where slug_publico is not null;

-- O combo é da participação (1:1). Os campos legados por marca vêm para cá uma vez.
update public.participacoes pa set
  combo_nome = coalesce(pa.combo_nome, left(nullif(btrim(pt.combo_nome), ''), 80)),
  combo_descricao = coalesce(pa.combo_descricao, left(nullif(btrim(pt.combo_descricao), ''), 400))
  from public.participantes pt
 where pt.id = pa.participante_id and pa.edicao_codigo = '2026.2';

create table if not exists public.participacao_slug_aliases (
  edicao_codigo text not null references public.edicoes(codigo) on update cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (edicao_codigo, slug)
);

-- ---------------------------------------------------------------- unidade permanente
create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  nome_unidade text check (nome_unidade is null or char_length(nome_unidade) <= 60),
  logradouro text check (logradouro is null or char_length(logradouro) <= 160),
  numero text check (numero is null or char_length(numero) <= 20),
  complemento text check (complemento is null or char_length(complemento) <= 80),
  bairro text check (bairro is null or char_length(bairro) <= 80),
  cidade text check (cidade is null or char_length(cidade) <= 80),
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  cep text check (cep is null or cep ~ '^\d{8}$'),
  referencia text check (referencia is null or char_length(referencia) <= 120),
  lat numeric(9,6) check (lat is null or lat between -6.30 and -5.55),
  lng numeric(9,6) check (lng is null or lng between -35.55 and -34.95),
  coordenada_verificada_em timestamptz,
  coordenada_verificada_por text,
  whatsapp_publico text check (whatsapp_publico is null or whatsapp_publico ~ '^\d{10,11}$'),
  whatsapp_autorizado boolean not null default false,
  horario_loja_texto text check (horario_loja_texto is null or char_length(horario_loja_texto) <= 200),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check ((lat is null) = (lng is null))
);
create index if not exists unidades_participante on public.unidades (participante_id);

-- Endereço mudou → a coordenada conferida deixa de valer (a organização confere de novo).
create or replace function public.unidades_endereco_mudou()
 returns trigger language plpgsql set search_path to 'public'
as $$
begin
  new.atualizado_em := now();
  if (new.logradouro, new.numero, new.bairro, new.cidade) is distinct from
     (old.logradouro, old.numero, old.bairro, old.cidade)
     and new.coordenada_verificada_em is not distinct from old.coordenada_verificada_em then
    new.coordenada_verificada_em := null;
    new.coordenada_verificada_por := null;
  end if;
  return new;
end $$;
drop trigger if exists unidades_endereco_mudou on public.unidades;
create trigger unidades_endereco_mudou before update on public.unidades
  for each row execute function public.unidades_endereco_mudou();

-- ---------------------------------------------------------------- participação da unidade
alter table public.participacao_unidades add column if not exists unidade_id uuid references public.unidades(id);
alter table public.participacao_unidades add column if not exists id_publico text;
alter table public.participacao_unidades add column if not exists participa boolean not null default true;
alter table public.participacao_unidades add column if not exists consumo_local text not null default 'nao_informado'
  check (consumo_local in ('sim', 'nao', 'nao_informado'));
alter table public.participacao_unidades add column if not exists retirada text not null default 'nao_informado'
  check (retirada in ('sim', 'nao', 'nao_informado'));
alter table public.participacao_unidades add column if not exists delivery_combo text not null default 'nao_informado'
  check (delivery_combo in ('sim', 'nao', 'nao_informado'));
alter table public.participacao_unidades add column if not exists delivery_regioes text
  check (delivery_regioes is null or char_length(delivery_regioes) <= 200);
alter table public.participacao_unidades add column if not exists delivery_taxa text
  check (delivery_taxa is null or char_length(delivery_taxa) <= 120);
alter table public.participacao_unidades add column if not exists observacao_combo text
  check (observacao_combo is null or char_length(observacao_combo) <= 200);
create unique index if not exists participacao_unidades_id_publico on public.participacao_unidades (id_publico);

-- Toda participação de unidade tem unidade permanente e id público, inclusive as
-- criadas pelo painel atual (que ainda manda só endereço e bairro).
create or replace function public.participacao_unidade_garantir()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_part uuid;
begin
  -- O id público é do banco: gerado no INSERT, imutável depois (é o que o QR e a
  -- Minha rota guardam). Ninguém escolhe nem troca.
  if tg_op = 'INSERT' then
    new.id_publico := 'u' || substr(md5(gen_random_uuid()::text), 1, 6);
  elsif old.id_publico is null then
    new.id_publico := 'u' || substr(md5(gen_random_uuid()::text), 1, 6);
  else
    new.id_publico := old.id_publico;
  end if;
  if new.unidade_id is null then
    select participante_id into v_part from public.participacoes where id = new.participacao_id;
    insert into public.unidades (participante_id, logradouro, bairro, horario_loja_texto)
    values (v_part, left(nullif(btrim(new.endereco), ''), 160), left(nullif(btrim(new.bairro), ''), 80),
            left(nullif(btrim(new.horarios), ''), 200))
    returning id into new.unidade_id;
  elsif not exists (select 1 from public.unidades u join public.participacoes pa on pa.participante_id = u.participante_id
                     where u.id = new.unidade_id and pa.id = new.participacao_id) then
    raise exception 'unidade_de_outra_marca';
  end if;
  return new;
end $$;
drop trigger if exists participacao_unidade_garantir on public.participacao_unidades;
create trigger participacao_unidade_garantir before insert or update of unidade_id, participacao_id, id_publico
  on public.participacao_unidades for each row execute function public.participacao_unidade_garantir();

-- Backfill: uma unidade permanente por participação de unidade existente.
update public.participacao_unidades set unidade_id = null where unidade_id is null; -- dispara o gatilho
update public.participacao_unidades set
  delivery_combo = case when faz_delivery then 'sim' else delivery_combo end,
  consumo_local = case when so_delivery then 'nao' else consumo_local end
 where delivery_combo = 'nao_informado' and consumo_local = 'nao_informado';

-- ---------------------------------------------------------------- disponibilidade do combo
create table if not exists public.unidade_disponibilidade (
  id uuid primary key default gen_random_uuid(),
  participacao_unidade_id uuid not null references public.participacao_unidades(id) on delete cascade,
  data date not null,
  abre time not null,
  fecha time not null,
  observacao text check (observacao is null or char_length(observacao) <= 120),
  check (fecha > abre),
  unique (participacao_unidade_id, data, abre)
);
create or replace function public.disponibilidade_no_festival()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare e public.edicoes%rowtype;
begin
  select ed.* into e from public.edicoes ed
    join public.participacoes pa on pa.edicao_codigo = ed.codigo
    join public.participacao_unidades pu on pu.participacao_id = pa.id
   where pu.id = new.participacao_unidade_id;
  if e.festival_inicio is not null and (new.data < e.festival_inicio or new.data > e.festival_fim) then
    raise exception 'data_fora_do_festival';
  end if;
  return new;
end $$;
drop trigger if exists disponibilidade_no_festival on public.unidade_disponibilidade;
create trigger disponibilidade_no_festival before insert or update on public.unidade_disponibilidade
  for each row execute function public.disponibilidade_no_festival();

-- ---------------------------------------------------------------- substituições
create table if not exists public.substituicoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.participantes_itens(id) on delete cascade,
  original text not null check (char_length(original) between 1 and 80),
  alternativa text not null check (char_length(alternativa) between 1 and 200),
  disponibilidade text not null default 'sob_consulta' check (disponibilidade in ('sempre', 'sob_consulta', 'limitada')),
  acrescimo numeric(10,2) check (acrescimo is null or acrescimo >= 0),
  como_solicitar text check (como_solicitar is null or char_length(como_solicitar) <= 160),
  modalidades text[] not null default '{}' check (modalidades <@ array['local', 'retirada', 'delivery']),
  unidades uuid[] not null default '{}',
  ordem smallint not null default 1,
  criado_em timestamptz not null default now()
);
create index if not exists substituicoes_item on public.substituicoes (item_id);

-- ---------------------------------------------------------------- declarações alimentares
create table if not exists public.declaracoes_alimentares (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.participantes_itens(id) on delete cascade,
  substituicao_id uuid references public.substituicoes(id) on delete cascade,
  aspecto text not null check (aspecto in (
    'gluten', 'leite', 'ovo', 'amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos', 'outro_alergenico',
    'lactose', 'vegano', 'vegetariano', 'acucar_adicionado')),
  estado text not null default 'nao_informado',
  observacao text check (observacao is null or char_length(observacao) <= 160),
  atualizado_em timestamptz not null default now(),
  check (num_nonnulls(item_id, substituicao_id) = 1),
  check (case when aspecto in ('lactose', 'vegano', 'vegetariano', 'acucar_adicionado')
              then estado in ('sim', 'nao', 'nao_informado')
              else estado in ('contem', 'nao_contem', 'pode_conter', 'nao_informado') end),
  check (aspecto <> 'outro_alergenico' or estado = 'nao_informado' or observacao is not null)
);
create unique index if not exists declaracoes_item_aspecto on public.declaracoes_alimentares (item_id, aspecto) where item_id is not null;
create unique index if not exists declaracoes_subst_aspecto on public.declaracoes_alimentares (substituicao_id, aspecto) where substituicao_id is not null;

-- Migração dos selos: só o "sim" vira declaração. O "false" de hoje é também o
-- valor de quem não respondeu, então NÃO vira "não contém" (§3.4, regra 5).
insert into public.declaracoes_alimentares (item_id, aspecto, estado)
select id, 'gluten', 'nao_contem' from public.participantes_itens where sem_gluten
on conflict do nothing;
insert into public.declaracoes_alimentares (item_id, aspecto, estado)
select id, 'lactose', 'nao' from public.participantes_itens where sem_lactose
on conflict do nothing;
insert into public.declaracoes_alimentares (item_id, aspecto, estado)
select id, 'vegano', 'sim' from public.participantes_itens where vegano
on conflict do nothing;

insert into public.substituicoes (item_id, original, alternativa)
select i.id, left(coalesce(nullif(btrim(i.nome), ''), i.tipo), 80), left(btrim(i.substituicao), 200)
  from public.participantes_itens i
 where i.tem_substituicao and coalesce(btrim(i.substituicao), '') <> ''
   and not exists (select 1 from public.substituicoes s where s.item_id = i.id);

-- ---------------------------------------------------------------- fotos
create table if not exists public.midias_participacao (
  id uuid primary key default gen_random_uuid(),
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  item_id uuid references public.participantes_itens(id) on delete set null,
  participacao_unidade_id uuid references public.participacao_unidades(id) on delete set null,
  papel text not null check (papel in ('combo_principal', 'combo_galeria', 'item', 'loja')),
  origem text not null default 'sessao_oficial' check (origem in ('sessao_oficial', 'marca')),
  path text not null,
  largura int, altura int,
  foco_x numeric(4,3) check (foco_x is null or foco_x between 0 and 1),
  foco_y numeric(4,3) check (foco_y is null or foco_y between 0 and 1),
  alt text check (alt is null or char_length(alt) <= 160),
  credito text check (credito is null or char_length(credito) <= 80),
  estado text not null default 'enviada' check (estado in ('enviada', 'aprovada', 'recusada')),
  ordem smallint not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  check (papel <> 'item' or item_id is not null),
  check (estado <> 'aprovada' or alt is not null)
);
create unique index if not exists midias_um_principal on public.midias_participacao (participacao_id)
  where papel = 'combo_principal' and estado <> 'recusada';

-- Bucket público das fotos da edição. Caminho = <edicao>/<participacao>/<uuid>.webp:
-- impossível de adivinhar, e só a projeção publica o caminho de foto APROVADA.
-- Sem política de SELECT em storage.objects para anon → o bucket não se lista.
insert into storage.buckets (id, name, public) values ('edicao-publico', 'edicao-publico', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- RLS e concessões
alter table public.unidades enable row level security;
alter table public.unidade_disponibilidade enable row level security;
alter table public.substituicoes enable row level security;
alter table public.declaracoes_alimentares enable row level security;
alter table public.midias_participacao enable row level security;
alter table public.participacao_slug_aliases enable row level security;

revoke all on public.unidades, public.unidade_disponibilidade, public.substituicoes,
  public.declaracoes_alimentares, public.midias_participacao, public.participacao_slug_aliases from anon;

drop policy if exists unidades_marca_le on public.unidades;
create policy unidades_marca_le on public.unidades for select to authenticated using (public.marca_dona_participante(participante_id));
drop policy if exists unidades_marca_cria on public.unidades;
create policy unidades_marca_cria on public.unidades for insert to authenticated with check (public.marca_dona_participante(participante_id));
drop policy if exists unidades_marca_edita on public.unidades;
create policy unidades_marca_edita on public.unidades for update to authenticated
  using (public.marca_dona_participante(participante_id)) with check (public.marca_dona_participante(participante_id));
revoke insert, update, delete on public.unidades from authenticated;
grant insert (participante_id, nome_unidade, logradouro, numero, complemento, bairro, cidade, uf, cep, referencia,
              whatsapp_publico, whatsapp_autorizado, horario_loja_texto) on public.unidades to authenticated;
grant update (nome_unidade, logradouro, numero, complemento, bairro, cidade, uf, cep, referencia,
              whatsapp_publico, whatsapp_autorizado, horario_loja_texto) on public.unidades to authenticated;

drop policy if exists disponibilidade_marca on public.unidade_disponibilidade;
create policy disponibilidade_marca on public.unidade_disponibilidade for all to authenticated
  using (exists (select 1 from public.participacao_unidades pu where pu.id = participacao_unidade_id
                   and public.marca_dona_participacao(pu.participacao_id)))
  with check (exists (select 1 from public.participacao_unidades pu where pu.id = participacao_unidade_id
                   and public.marca_dona_participacao(pu.participacao_id)));

drop policy if exists substituicoes_marca on public.substituicoes;
create policy substituicoes_marca on public.substituicoes for all to authenticated
  using (public.marca_dona_item(item_id)) with check (public.marca_dona_item(item_id));

drop policy if exists declaracoes_marca on public.declaracoes_alimentares;
create policy declaracoes_marca on public.declaracoes_alimentares for all to authenticated
  using (case when item_id is not null then public.marca_dona_item(item_id)
              else exists (select 1 from public.substituicoes s where s.id = substituicao_id and public.marca_dona_item(s.item_id)) end)
  with check (case when item_id is not null then public.marca_dona_item(item_id)
              else exists (select 1 from public.substituicoes s where s.id = substituicao_id and public.marca_dona_item(s.item_id)) end);

drop policy if exists midias_marca_le on public.midias_participacao;
create policy midias_marca_le on public.midias_participacao for select to authenticated
  using (public.marca_dona_participacao(participacao_id));
revoke insert, update, delete on public.midias_participacao from authenticated;

-- A concessão de UPDATE era da tabela inteira; vira por coluna (a marca não toca
-- id_publico, participacao_id, mesas nem so_delivery — os dois últimos são da organização).
revoke update on public.participacao_unidades from authenticated;
grant update (ordem, endereco, bairro, horarios, faz_delivery, canais_delivery,
              participa, consumo_local, retirada, delivery_combo, delivery_regioes, delivery_taxa, observacao_combo, unidade_id)
  on public.participacao_unidades to authenticated;
grant update (combo_nome, combo_descricao, combo_condicoes) on public.participacoes to authenticated;
grant update (apresentacao_publica) on public.participantes to authenticated;
