-- ═══════════════════════════════════════════════════════════════════════════
-- Cadastro completo da marca — itens do combo, avisos, sessões de fotos
-- Etapa 1 de docs/INSTRUCAO-marca-completa.md · 24/08/2026
--
-- CINCO DIVERGÊNCIAS entre a instrução e o banco real. O código manda
-- (CLAUDE.md §0.1), então a instrução é que foi ajustada:
--
--  1. `participantes.preco` e `participantes.horarios` NÃO existem. Preço é
--     `participantes_operacao.combo_preco`; horário já vive POR UNIDADE dentro
--     de `participantes_operacao.unidades` jsonb, e /marca/ já grava. Nada a
--     fazer nos dois — não criar coluna duplicada (§5.2 do CLAUDE.md).
--  2. A coluna de estado é `status_cadastro`, não `status`, e `revisao` não é
--     valor válido. Por isso a policy de update aqui espelha exatamente a de
--     `participantes` (só dono, sem trava de status): a marca já reabre o
--     cadastro pela tela, e uma trava aqui deixaria ela editando o nome da
--     marca mas não o nome do doce.
--  3. O guard é `pode_organizacao(p_secret)`, NÃO `admin_ok`. A Fase 2
--     (23/08) migrou as 14 RPCs para a ponte; função nova com `admin_ok`
--     nasceria fora dela, e conta nominal de organização não conseguiria
--     chamar.
--  4. `criado_por`/`auth.uid()` é NULL para a organização enquanto ela entrar
--     por senha única. As colunas ficam, para a Fase 2 preencher — nada aqui
--     depende delas.
--  5. `updated_at` (não `atualizado_em`), para reusar o trigger
--     `tocar_updated_at()` que já existe e crava esse nome.
--
-- A trava da foto NÃO é RLS: RLS decide LINHA, `grant` decide COLUNA. Sem o
-- par revoke/grant abaixo, a policy de update deixaria a marca reescrever
-- `foto_path` junto com o nome do doce. Quem fotografa é a organização.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Tema do combo, no nível do participante ────────────────────────────
alter table public.participantes
  add column if not exists tema_combo        text,
  add column if not exists tema_justificativa text;


-- ── 2 · Os três itens do combo ────────────────────────────────────────────
-- Doce, salgado e bebida. É fato do acervo, não desenho: o Sweet Awards julga
-- as três categorias separadas, e "Melhor Combo" é a média delas.
create table if not exists public.participantes_itens (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  tipo            text not null check (tipo in ('doce','salgado','bebida')),
  nome            text,
  descricao       text,
  ingredientes    text,
  foto_path       text,
  vegano          boolean not null default false,
  sem_gluten      boolean not null default false,
  sem_lactose     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint participantes_itens_unico unique (participante_id, tipo)
);

create index if not exists participantes_itens_participante_idx
  on public.participantes_itens (participante_id);

drop trigger if exists participantes_itens_touch on public.participantes_itens;
create trigger participantes_itens_touch
  before update on public.participantes_itens
  for each row execute function public.tocar_updated_at();

alter table public.participantes_itens enable row level security;

drop policy if exists itens_marca_le on public.participantes_itens;
create policy itens_marca_le on public.participantes_itens
  for select to authenticated
  using (exists (select 1 from public.participantes p
                  where p.id = participantes_itens.participante_id
                    and p.user_id = auth.uid()));

drop policy if exists itens_marca_edita on public.participantes_itens;
create policy itens_marca_edita on public.participantes_itens
  for update to authenticated
  using (exists (select 1 from public.participantes p
                  where p.id = participantes_itens.participante_id
                    and p.user_id = auth.uid()))
  with check (exists (select 1 from public.participantes p
                       where p.id = participantes_itens.participante_id
                         and p.user_id = auth.uid()));

-- Sem policy de insert/delete: quem cria as três linhas é o trigger abaixo, e
-- ninguém apaga uma delas isoladamente.
revoke insert, update, delete on public.participantes_itens from anon, authenticated;
grant  update (nome, descricao, ingredientes, vegano, sem_gluten, sem_lactose)
  on public.participantes_itens to authenticated;


-- ── 3 · As três linhas nascem com o participante ──────────────────────────
-- Trigger, não chamada em cada RPC de vínculo: `vincular_conta_marca` e
-- `vincular_marca_manual` são duas portas, e a terceira porta que alguém
-- abrir amanhã esqueceria de criar os itens.
create or replace function public.criar_itens_do_combo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.participantes_itens (participante_id, tipo)
  values (new.id, 'doce'), (new.id, 'salgado'), (new.id, 'bebida')
  on conflict (participante_id, tipo) do nothing;
  return new;
end;
$$;

drop trigger if exists participantes_cria_itens on public.participantes;
create trigger participantes_cria_itens
  after insert on public.participantes
  for each row execute function public.criar_itens_do_combo();

-- Participantes que já existirem antes desta migration.
insert into public.participantes_itens (participante_id, tipo)
select p.id, t.tipo
  from public.participantes p
 cross join (values ('doce'), ('salgado'), ('bebida')) as t(tipo)
on conflict (participante_id, tipo) do nothing;


-- ── 4 · Mural de avisos ───────────────────────────────────────────────────
create table if not exists public.avisos (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  texto        text not null,
  prazo_em     timestamptz,
  publicado_em timestamptz not null default now(),
  criado_por   uuid references auth.users(id),
  arquivado    boolean not null default false
);

alter table public.avisos enable row level security;

drop policy if exists avisos_marca_le on public.avisos;
create policy avisos_marca_le on public.avisos
  for select to authenticated
  using (not arquivado);

revoke insert, update, delete on public.avisos from anon, authenticated;


-- ── 5 · Sessões de fotos ──────────────────────────────────────────────────
-- Quem fotografa é a organização. Ela escolhe data e hora; a marca só vê.
-- Não existe fluxo de a marca escolher horário nem pedir remarcação por aqui.
create table if not exists public.sessoes_fotos (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  data_hora       timestamptz not null,
  local           text,
  status          text not null default 'agendada'
                    check (status in ('agendada','realizada','cancelada','remarcada')),
  observacoes     text,
  criado_por      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists sessoes_fotos_participante_idx
  on public.sessoes_fotos (participante_id);

drop trigger if exists sessoes_fotos_touch on public.sessoes_fotos;
create trigger sessoes_fotos_touch
  before update on public.sessoes_fotos
  for each row execute function public.tocar_updated_at();

alter table public.sessoes_fotos enable row level security;

drop policy if exists fotos_marca_le on public.sessoes_fotos;
create policy fotos_marca_le on public.sessoes_fotos
  for select to authenticated
  using (exists (select 1 from public.participantes p
                  where p.id = sessoes_fotos.participante_id
                    and p.user_id = auth.uid()));

revoke insert, update, delete on public.sessoes_fotos from anon, authenticated;


-- ── 6 · RPCs da organização ───────────────────────────────────────────────
-- Ficam executáveis por `anon` DE PROPÓSITO: é assim que as outras 14 já
-- funcionam — o painel é uma página estática que chama /rest/v1/rpc/ com a
-- chave publicável, e quem barra é o `p_secret` por dentro. O `revoke ... from
-- anon, authenticated` vale para HELPER (admin_ok, pode_organizacao), que
-- ninguém chama de fora. Confundir os dois casos fecha o painel.

create or replace function public.agendar_sessao_fotos(
  p_secret text, p_participante_id uuid, p_data_hora timestamptz,
  p_local text default null, p_observacoes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.pode_organizacao(p_secret) then
    raise exception 'nao_autorizado';
  end if;

  insert into public.sessoes_fotos (participante_id, data_hora, local, observacoes, criado_por)
  values (p_participante_id, p_data_hora, p_local, p_observacoes, auth.uid())
  returning id into v_id;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'agendar_sessao_fotos', 'sessoes_fotos', v_id::text,
          jsonb_build_object('participante_id', p_participante_id, 'data_hora', p_data_hora));

  return v_id;
end;
$$;

create or replace function public.atualizar_sessao_fotos(
  p_secret text, p_sessao_id uuid, p_status text default null,
  p_data_hora timestamptz default null, p_local text default null,
  p_observacoes text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.pode_organizacao(p_secret) then
    raise exception 'nao_autorizado';
  end if;

  update public.sessoes_fotos set
    status      = coalesce(p_status, status),
    data_hora   = coalesce(p_data_hora, data_hora),
    local       = coalesce(p_local, local),
    observacoes = coalesce(p_observacoes, observacoes)
  where id = p_sessao_id;

  if not found then
    raise exception 'sessao_nao_encontrada';
  end if;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'atualizar_sessao_fotos', 'sessoes_fotos', p_sessao_id::text,
          jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.get_sessoes_fotos(p_secret text)
returns table (
  id uuid, participante_id uuid, nome_marca text, data_hora timestamptz,
  local text, status text, observacoes text
)
language sql stable security definer set search_path = public as $$
  select s.id, s.participante_id, p.nome_marca, s.data_hora,
         s.local, s.status, s.observacoes
    from public.sessoes_fotos s
    join public.participantes p on p.id = s.participante_id
   where public.pode_organizacao(p_secret)
   order by s.data_hora desc;
$$;

-- A foto só entra por aqui. É o par da trava de coluna do bloco 2.
create or replace function public.registrar_foto_item(
  p_secret text, p_item_id uuid, p_foto_path text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.pode_organizacao(p_secret) then
    raise exception 'nao_autorizado';
  end if;

  update public.participantes_itens
     set foto_path = p_foto_path
   where id = p_item_id;

  if not found then
    raise exception 'item_nao_encontrado';
  end if;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'registrar_foto_item', 'participantes_itens', p_item_id::text,
          jsonb_build_object('foto_path', p_foto_path));
end;
$$;

create or replace function public.get_itens_participante(p_secret text, p_participante_id uuid)
returns table (
  id uuid, tipo text, nome text, descricao text, ingredientes text,
  foto_path text, vegano boolean, sem_gluten boolean, sem_lactose boolean
)
language sql stable security definer set search_path = public as $$
  select i.id, i.tipo, i.nome, i.descricao, i.ingredientes,
         i.foto_path, i.vegano, i.sem_gluten, i.sem_lactose
    from public.participantes_itens i
   where public.pode_organizacao(p_secret)
     and i.participante_id = p_participante_id
   order by array_position(array['doce','salgado','bebida'], i.tipo);
$$;

create or replace function public.publicar_aviso(
  p_secret text, p_titulo text, p_texto text, p_prazo_em timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.pode_organizacao(p_secret) then
    raise exception 'nao_autorizado';
  end if;
  if coalesce(trim(p_titulo), '') = '' or coalesce(trim(p_texto), '') = '' then
    raise exception 'titulo_e_texto_obrigatorios';
  end if;

  insert into public.avisos (titulo, texto, prazo_em, criado_por)
  values (trim(p_titulo), trim(p_texto), p_prazo_em, auth.uid())
  returning id into v_id;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'publicar_aviso', 'avisos', v_id::text,
          jsonb_build_object('titulo', trim(p_titulo)));

  return v_id;
end;
$$;

create or replace function public.atualizar_aviso(
  p_secret text, p_id uuid, p_titulo text default null, p_texto text default null,
  p_prazo_em timestamptz default null, p_arquivado boolean default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.pode_organizacao(p_secret) then
    raise exception 'nao_autorizado';
  end if;

  update public.avisos set
    titulo    = coalesce(nullif(trim(p_titulo), ''), titulo),
    texto     = coalesce(nullif(trim(p_texto), ''), texto),
    prazo_em  = coalesce(p_prazo_em, prazo_em),
    arquivado = coalesce(p_arquivado, arquivado)
  where id = p_id;

  if not found then
    raise exception 'aviso_nao_encontrado';
  end if;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'atualizar_aviso', 'avisos', p_id::text,
          jsonb_build_object('arquivado', p_arquivado));
end;
$$;

create or replace function public.get_avisos_admin(p_secret text)
returns table (
  id uuid, titulo text, texto text, prazo_em timestamptz,
  publicado_em timestamptz, arquivado boolean
)
language sql stable security definer set search_path = public as $$
  select a.id, a.titulo, a.texto, a.prazo_em, a.publicado_em, a.arquivado
    from public.avisos a
   where public.pode_organizacao(p_secret)
   order by a.publicado_em desc;
$$;


-- ── 7 · Bucket privado das fotos do combo ─────────────────────────────────
-- Privado, nunca público: são fotos ainda não publicadas de produto de
-- terceiro. Quem escreve é a organização, por service_role; quem lê é a
-- própria marca, por URL assinada gerada na hora.
-- Caminho: {participante_id}/{tipo}.<ext>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('combos', 'combos', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists combos_marca_le on storage.objects;
create policy combos_marca_le on storage.objects
  for select to authenticated
  using (
    bucket_id = 'combos'
    and exists (select 1 from public.participantes p
                 where p.user_id = auth.uid()
                   and p.id::text = (storage.foldername(name))[1])
  );

-- Sem policy de insert/update/delete: só `service_role` escreve, pela Edge
-- Function do painel. A organização não tem `auth.uid()` enquanto entrar por
-- senha única, então não há como escrever uma policy de escrita para ela que
-- não fosse frouxa demais.
