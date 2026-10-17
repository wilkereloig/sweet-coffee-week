-- ─────────────────────────────────────────────────────────────────────────────
-- Social media — planejamento do Instagram, biblioteca e combos — 17/10/2026
-- (consolida o calendário de Redes sociais de 16/10, que nunca foi aplicado)
--
-- ⚠️ Depende de 20261017_equipe_perfis_avisos.sql (avisar_pessoa, membro_org).
--
-- Área própria do painel (#social/planejamento · biblioteca · participantes).
-- Organiza e REGISTRA o trabalho da equipe: arte, legenda, responsável,
-- data/hora prevista e confirmação de publicação. ⛔ Não publica nada no
-- Instagram, não guarda senha de rede e não fala com a Meta. Publicar é
-- sempre manual; o painel só registra.
--
-- Não confundir com "Publicação no site" (edicao_publicacao): aquilo liga as
-- páginas públicas dos participantes. Aqui é a agenda da equipe.
--
-- Modelo:
--   redes_posts        uma publicação (feed, carrossel, Reel ou Story/sequência)
--   redes_arquivos     arquivos da publicação, ordenados — ou da BIBLIOTECA
--                      (post_id nulo: arte final enviada pelo designer antes de
--                      ter post). Também guarda REFERÊNCIAS a material que já
--                      existe (foto do combo, logo, material da campanha):
--                      bucket + caminho copiados do registro de origem, sem
--                      copiar o arquivo. NUNCA apagados: remover/substituir
--                      marca a linha; o objeto no Storage é imutável.
--   redes_historico    o que mudou, quem e quando.
--   redes_comentarios  orientações e pedidos de ajuste (ajuste = true).
--
-- Situação gravada: rascunho · preparacao · pronto · publicado · cancelado.
-- "Atrasada" NÃO é situação: é calculada (previsto < agora e ainda não
-- publicado/cancelado). Nada vira "publicado" sozinho quando a hora chega.
--
-- Edição simultânea: cada gravação de conteúdo manda a `versao` que leu. Se
-- outra pessoa salvou antes, a função recusa com `versao_desatualizada` e não
-- toca em nada — o painel preserva o texto digitado e oferece revisar. O
-- combo usa o mesmo princípio, comparando os valores que a pessoa leu.
--
-- Fuso operacional: America/Fortaleza (UTC−3, sem horário de verão).
--
-- Permissões (verificadas AQUI, não só na tela):
--   redes.ver         consultar planejamento, fichas e biblioteca; baixar artes
--   redes.editar      criar, editar, duplicar, comentar, pedir ajuste, marcar pronto
--   redes.arquivos    enviar arte à postagem, ordenar, texto alternativo,
--                     associar material da biblioteca; substituir/remover SÓ o
--                     que a própria pessoa enviou
--   redes.publicar    confirmar a publicação
--   redes.gerir       cancelar, reabrir, desfazer confirmação, corrigir
--                     execução, enviar arte à biblioteca, substituir/remover
--                     arte de outra pessoa (a arte oficial é do designer)
--   editorial.ler     participantes, unidades e combos SEM dado pessoal
--                     (a projeção pública montar_publico — que inclui preço da
--                     edição, condições e declarações alimentares, só leitura —
--                     + o editável)
--   editorial.editar  nome, descrição e proposta do combo; nome e descrição
--                     dos componentes. Nada além.
-- Função nova "Social media" (código `social`): todas acima menos redes.gerir.
-- Sem dado.ler, sem financeiro, sem equipe/credenciais; NÃO altera preço da
-- edição, tema, declaração alimentar nem publica páginas do site (vê o que o
-- site mostraria, sem editar).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Função e permissões ─────────────────────────────────────────────────────
insert into public.funcoes (codigo, rotulo, ordem)
select 'social', 'Social media', coalesce(max(ordem), 0) + 1 from public.funcoes
 where not exists (select 1 from public.funcoes where codigo = 'social');

insert into public.permissoes (funcao, acao) values
  ('administrador', 'redes.ver'), ('administrador', 'redes.editar'), ('administrador', 'redes.arquivos'),
  ('administrador', 'redes.publicar'), ('administrador', 'redes.gerir'),
  ('administrador', 'editorial.ler'), ('administrador', 'editorial.editar'),
  ('social', 'redes.ver'), ('social', 'redes.editar'), ('social', 'redes.arquivos'), ('social', 'redes.publicar'),
  ('social', 'editorial.ler'), ('social', 'editorial.editar')
on conflict do nothing;

-- ── Bucket privado ──────────────────────────────────────────────────────────
-- Sem nenhuma policy: só a Edge Function arquivo-url (service_role) assina
-- subida e baixa, e só depois de conferir redes.arquivos / redes.ver.
-- 50 MB é o teto de upload do projeto (não é regra do Instagram).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('redes', 'redes', false, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

-- ── Tabelas ─────────────────────────────────────────────────────────────────
create table if not exists public.redes_posts (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  perfil text not null default '@sweetcoffeeweek' check (char_length(btrim(perfil)) between 1 and 60),
  edicao_codigo text references public.edicoes(codigo) on delete set null,
  participante_id uuid references public.participantes(id) on delete set null,
  formato text not null default 'feed' check (formato in ('feed', 'carrossel', 'reels', 'story')),
  legenda text not null default '' check (char_length(legenda) <= 5000),
  mencoes text not null default '' check (char_length(mencoes) <= 500),
  observacoes text not null default '' check (char_length(observacoes) <= 2000),
  referencias text not null default '' check (char_length(referencias) <= 2000),
  programado_para timestamptz,
  responsavel_id uuid references public.perfis(user_id) on delete set null,
  situacao text not null default 'rascunho'
    check (situacao in ('rascunho', 'preparacao', 'pronto', 'publicado', 'cancelado')),
  -- Execução (só a confirmação explícita escreve aqui).
  publicado_em timestamptz,
  publicado_por_id uuid,
  publicado_por_rotulo text,
  confirmado_em timestamptz,
  link_publicado text check (link_publicado is null or (link_publicado ~ '^https://' and char_length(link_publicado) <= 500)),
  obs_execucao text not null default '' check (char_length(obs_execucao) <= 1000),
  -- Retrato do que foi ao ar (legenda, menções e arquivos na ordem). Mudar a
  -- publicação depois não reescreve o que ficou registrado aqui.
  publicado_snapshot jsonb,
  cancelado_em timestamptz,
  motivo_cancelamento text check (char_length(motivo_cancelamento) <= 500),
  duplicado_de uuid references public.redes_posts(id) on delete set null,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  -- Autor = a SESSÃO (auth.uid()), nunca um nome mandado pelo navegador.
  -- Responsável (responsavel_id) é outra coisa: quem cuida da tarefa.
  criado_por_id uuid default auth.uid(),
  criado_por_rotulo text,
  atualizado_em timestamptz not null default now(),
  atualizado_por_id uuid,
  atualizado_por_rotulo text,
  check (situacao <> 'publicado' or (publicado_em is not null and publicado_snapshot is not null))
);
create index if not exists redes_posts_programado on public.redes_posts (programado_para);
create index if not exists redes_posts_responsavel on public.redes_posts (responsavel_id) where situacao not in ('publicado', 'cancelado');
create index if not exists redes_posts_participante on public.redes_posts (participante_id);

create table if not exists public.redes_arquivos (
  id uuid primary key default gen_random_uuid(),
  -- Nulo = arte da biblioteca (ainda sem postagem).
  post_id uuid references public.redes_posts(id) on delete cascade,
  -- De onde vem o objeto: `redes` (enviado aqui) ou referência a material que
  -- já existe — fotos da edição, logos, materiais gerais. Sem cópia.
  bucket text not null default 'redes' check (bucket in ('redes', 'edicao-publico', 'logos', 'arquivos')),
  origem text not null default 'envio' check (origem in ('envio', 'biblioteca', 'foto', 'logo', 'campanha')),
  origem_id uuid,
  path text not null check (char_length(path) <= 300 and
    (bucket <> 'redes' or path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|mp4|mov)$')),
  miniatura_path text check (miniatura_path is null or miniatura_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|webp)$'),
  nome text not null check (char_length(nome) between 1 and 200),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime')),
  -- Nulo só em referência cujo registro de origem não guarda o tamanho.
  tamanho bigint check (tamanho is null or (tamanho > 0 and tamanho <= 52428800)),
  largura integer check (largura is null or largura > 0),
  altura integer check (altura is null or altura > 0),
  duracao numeric check (duracao is null or duracao >= 0),
  alt text not null default '' check (char_length(alt) <= 1000),
  ordem integer not null default 0,
  -- Versão da arte naquela posição: substituir sobe 1 (a anterior fica).
  versao integer not null default 1,
  -- Classificação da arte da biblioteca (a da postagem herda da postagem).
  edicao_codigo text references public.edicoes(codigo) on delete set null,
  participante_id uuid references public.participantes(id) on delete set null,
  criado_em timestamptz not null default now(),
  criado_por_id uuid default auth.uid(),
  criado_por_rotulo text,
  removido_em timestamptz,
  removido_por_rotulo text,
  substituido_por uuid references public.redes_arquivos(id) on delete set null
);
create index if not exists redes_arquivos_post on public.redes_arquivos (post_id, ordem) where removido_em is null;
create index if not exists redes_arquivos_biblioteca on public.redes_arquivos (criado_em desc) where post_id is null;

create table if not exists public.redes_historico (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.redes_posts(id) on delete cascade,
  em timestamptz not null default now(),
  ator_id uuid,
  ator_rotulo text,
  tipo text not null check (tipo in ('criado', 'duplicado', 'conteudo', 'legenda', 'programacao', 'responsavel',
                                     'situacao', 'arquivo', 'publicado', 'execucao', 'publicacao_desfeita', 'cancelado',
                                     'reaberto', 'ajuste')),
  detalhe jsonb not null default '{}'::jsonb
);
create index if not exists redes_historico_post on public.redes_historico (post_id, em desc);

create table if not exists public.redes_comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.redes_posts(id) on delete cascade,
  autor_id uuid,
  autor_rotulo text,
  corpo text not null check (char_length(btrim(corpo)) between 1 and 2000),
  -- Pedido de ajuste (à arte, à legenda…): avisa responsável e autor do post.
  ajuste boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists redes_comentarios_post on public.redes_comentarios (post_id, criado_em);

-- RLS ligada e nenhuma policy: só as funções abaixo (SECURITY DEFINER) leem e
-- escrevem, sempre depois de pode().
alter table public.redes_posts enable row level security;
alter table public.redes_arquivos enable row level security;
alter table public.redes_historico enable row level security;
alter table public.redes_comentarios enable row level security;
revoke all on public.redes_posts, public.redes_arquivos, public.redes_historico, public.redes_comentarios
  from public, anon, authenticated;

-- ── Peças internas ──────────────────────────────────────────────────────────
create or replace function public.redes_exigir(p_secret text, p_acao text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, p_acao) then raise exception 'nao_autorizado' using errcode = '42501'; end if;
end $$;

create or replace function public.redes_registrar(p_post uuid, p_tipo text, p_detalhe jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.redes_historico (post_id, ator_id, ator_rotulo, tipo, detalhe)
  values (p_post, auth.uid(), public.ator_rotulo_atual(), p_tipo, coalesce(p_detalhe, '{}'::jsonb));
$$;

/*
 * Aviso de uma postagem para quem tem relação com ela — responsável e quem
 * criou — e nunca para quem fez a alteração (avisar_pessoa descarta). Mais
 * `p_extra` (ex.: o novo responsável). `p_evento` agrupa: duas gravações da
 * legenda seguidas pela mesma pessoa viram um aviso só.
 */
create or replace function public.redes_avisar(p_post uuid, p_evento text, p_titulo text, p_texto text, p_extra uuid[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare p public.redes_posts; u uuid;
begin
  select * into p from public.redes_posts where id = p_post;
  if not found then return; end if;
  for u in select distinct x from unnest(array[p.responsavel_id, p.criado_por_id] || coalesce(p_extra, '{}')) x where x is not null loop
    perform public.avisar_pessoa(u, 'redes', p_titulo, p_texto, 'social/planejamento/' || p_post,
                                 'redes:' || p_post || ':' || p_evento, p.participante_id);
  end loop;
end $$;

create or replace function public.redes_data_texto(p_ts timestamptz)
returns text language sql immutable as $$
  select case when p_ts is null then 'sem data'
    else to_char(p_ts at time zone 'America/Fortaleza', 'DD/MM "às" HH24"h"MI') end
$$;

/*
 * Pendências objetivas de uma publicação (a mesma lista do painel, lib/redes.js
 * `pendencias`, que só antecipa — esta é a que vale). Passar para "pronto"
 * exige lista vazia, menos 'atrasada' (que não é requisito, é condição).
 *   sem_arte · arte_incompativel · sem_responsavel · sem_legenda · sem_horario · atrasada
 * Story não exige legenda de feed.
 */
create or replace function public.redes_pendencias(p_post uuid)
returns text[] language plpgsql stable security definer set search_path = public as $$
declare
  p public.redes_posts;
  n int; n_img int; n_vid int;
  r text[] := array[]::text[];
begin
  select * into p from public.redes_posts where id = p_post;
  if not found then return r; end if;
  select count(*), count(*) filter (where mime like 'image/%'), count(*) filter (where mime like 'video/%')
    into n, n_img, n_vid
    from public.redes_arquivos where post_id = p_post and removido_em is null;
  if n = 0 then r := r || 'sem_arte'::text;
  elsif (p.formato = 'feed' and not (n = 1 and n_img = 1))
     or (p.formato = 'carrossel' and n < 2)
     or (p.formato = 'reels' and not (n = 1 and n_vid = 1)) then r := r || 'arte_incompativel'::text;
  end if;
  if p.responsavel_id is null then r := r || 'sem_responsavel'::text; end if;
  if p.formato <> 'story' and btrim(p.legenda) = '' then r := r || 'sem_legenda'::text; end if;
  if p.programado_para is null then r := r || 'sem_horario'::text; end if;
  if p.programado_para < now() and p.situacao not in ('publicado', 'cancelado') then r := r || 'atrasada'::text; end if;
  return r;
end $$;

-- Linha da publicação como o painel lê (lista e ficha).
create or replace function public.redes_json(p public.redes_posts)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(p) || jsonb_build_object(
    'responsavel_nome', (select coalesce(nullif(btrim(pf.nome), ''), 'Conta sem nome') from public.perfis pf where pf.user_id = p.responsavel_id),
    'participante_nome', (select pa.nome_marca from public.participantes pa where pa.id = p.participante_id),
    'n_arquivos', (select count(*) from public.redes_arquivos a where a.post_id = p.id and a.removido_em is null),
    'miniatura', (select jsonb_build_object('bucket', a.bucket,
                    'path', coalesce(a.miniatura_path, case when a.mime like 'image/%' then a.path end))
                    from public.redes_arquivos a where a.post_id = p.id and a.removido_em is null
                   order by a.ordem, a.criado_em limit 1),
    'n_comentarios', (select count(*) from public.redes_comentarios c where c.post_id = p.id),
    'ajuste_aberto', exists (select 1 from public.redes_comentarios c where c.post_id = p.id and c.ajuste
                              and c.criado_em > p.atualizado_em),
    'pendencias', to_jsonb(public.redes_pendencias(p.id))
  )
$$;

-- Trava de versão + publicação: devolve a linha travada (FOR UPDATE).
create or replace function public.redes_travar(p_id uuid, p_versao integer)
returns public.redes_posts language plpgsql security definer set search_path = public as $$
declare p public.redes_posts;
begin
  if p_versao is null then raise exception 'versao_obrigatoria' using errcode = '22023'; end if;
  select * into p from public.redes_posts where id = p_id for update;
  if not found then raise exception 'post_inexistente' using errcode = 'P0002'; end if;
  if p.versao <> p_versao then
    raise exception 'versao_desatualizada' using errcode = '40001',
      detail = json_build_object('versao', p.versao, 'por', p.atualizado_por_rotulo, 'em', p.atualizado_em)::text;
  end if;
  return p;
end $$;

-- Carimbo de última alteração (quem e quando), no mesmo update da mudança.
create or replace function public.redes_carimbar(p_id uuid)
returns public.redes_posts language sql security definer set search_path = public as $$
  update public.redes_posts set versao = versao + 1, atualizado_em = now(),
         atualizado_por_id = auth.uid(), atualizado_por_rotulo = public.ator_rotulo_atual()
   where id = p_id returning *;
$$;

revoke all on function public.redes_exigir(text, text), public.redes_registrar(uuid, text, jsonb),
  public.redes_avisar(uuid, text, text, text, uuid[]), public.redes_pendencias(uuid), public.redes_json(public.redes_posts),
  public.redes_travar(uuid, integer), public.redes_data_texto(timestamptz), public.redes_carimbar(uuid)
  from public, anon, authenticated;

-- ── Leitura ─────────────────────────────────────────────────────────────────
/*
 * Publicações de um intervalo (o que o planejamento mostra) + todas as sem
 * data (a fila). Uma leitura só alimenta semana, mês, dia, lista e fila: os
 * filtros são aplicados no painel, sobre a mesma fonte.
 */
create or replace function public.redes_listar(p_secret text, p_de timestamptz, p_ate timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de > interval '120 days' then
    raise exception 'intervalo_invalido' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'agora', now(),
    'eu', auth.uid(),
    'posts', coalesce((
      select jsonb_agg(public.redes_json(p) order by p.programado_para nulls first, p.criado_em)
        from public.redes_posts p
       where (p.programado_para >= p_de and p.programado_para < p_ate)
          or (p.programado_para is null and p.situacao not in ('publicado', 'cancelado'))
    ), '[]'::jsonb));
end $$;

-- Ficha completa: publicação, arquivos (inclusive removidos/substituídos), histórico e comentários.
create or replace function public.redes_post(p_secret text, p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.redes_posts;
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  select * into p from public.redes_posts where id = p_id;
  if not found then raise exception 'post_inexistente' using errcode = 'P0002'; end if;
  return jsonb_build_object(
    'post', public.redes_json(p),
    'arquivos', coalesce((select jsonb_agg(to_jsonb(a) order by a.removido_em nulls first, a.ordem, a.criado_em)
                            from public.redes_arquivos a where a.post_id = p_id), '[]'::jsonb),
    'historico', coalesce((select jsonb_agg(to_jsonb(h) order by h.em desc, h.id desc)
                             from public.redes_historico h where h.post_id = p_id), '[]'::jsonb),
    'comentarios', coalesce((select jsonb_agg(to_jsonb(c) order by c.criado_em)
                               from public.redes_comentarios c where c.post_id = p_id), '[]'::jsonb),
    'conflitos', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'titulo', o.titulo, 'programado_para', o.programado_para))
                             from public.redes_posts o
                            where p.programado_para is not null and o.id <> p.id and o.perfil = p.perfil
                              and o.situacao <> 'cancelado'
                              and abs(extract(epoch from (o.programado_para - p.programado_para))) < 1800), '[]'::jsonb),
    'agora', now(),
    'eu', auth.uid());
end $$;

/*
 * O que os formulários precisam: quem pode ser responsável (contas nominais
 * ATIVAS da organização com redes.editar ou redes.publicar — nunca e-mail),
 * participantes (só nome) e edições. Sem dado.ler: a Social media enxerga
 * nomes, não cadastros.
 */
create or replace function public.redes_opcoes(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  return jsonb_build_object(
    'equipe', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', pf.user_id, 'nome', coalesce(nullif(btrim(pf.nome), ''), 'Conta sem nome'),
                                          'funcao', f.rotulo, 'avatar_path', pf.avatar_path)
                       order by coalesce(nullif(btrim(pf.nome), ''), 'Conta sem nome'))
        from public.perfis pf left join public.funcoes f on f.codigo = pf.funcao
       where pf.papel = 'organizacao' and pf.ativo and pf.bloqueado_em is null
         and (public.pode_por_user(pf.user_id, 'redes.editar') or public.pode_por_user(pf.user_id, 'redes.publicar'))
    ), '[]'::jsonb),
    'participantes', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome_marca) order by p.nome_marca)
        from public.participantes p
       where exists (select 1 from public.participacoes pa where pa.participante_id = p.id)
    ), '[]'::jsonb),
    'edicoes', coalesce((
      select jsonb_agg(jsonb_build_object('codigo', e.codigo, 'nome', coalesce(e.tema, e.nome, e.codigo)) order by e.ordem desc nulls last)
        from public.edicoes e
    ), '[]'::jsonb),
    'edicao_atual', (select edicao_atual from public.admin_config limit 1),
    'perfis', coalesce((select jsonb_agg(distinct perfil) from public.redes_posts), '[]'::jsonb),
    'eu', auth.uid());
end $$;

-- Resumo da Visão geral: hoje, próximos 7 dias, atrasadas, minhas, sem responsável.
create or replace function public.redes_resumo(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Fortaleza')::date;
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  return (
    with abertos as (
      select * from public.redes_posts where situacao not in ('publicado', 'cancelado')
    )
    select jsonb_build_object(
      'agora', now(),
      'hoje', (select count(*) from abertos where (programado_para at time zone 'America/Fortaleza')::date = hoje),
      'proximas', (select count(*) from abertos where programado_para >= now() and programado_para < now() + interval '7 days'),
      'atrasadas', (select count(*) from abertos where programado_para < now()),
      'minhas', case when auth.uid() is null then null else (select count(*) from abertos where responsavel_id = auth.uid()) end,
      'sem_responsavel', (select count(*) from abertos where responsavel_id is null),
      'sem_data', (select count(*) from abertos where programado_para is null),
      'proximos_itens', coalesce((
        select jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo, 'formato', formato, 'programado_para', programado_para, 'situacao', situacao) order by programado_para)
          from (select * from abertos where programado_para is not null and programado_para < now() + interval '7 days'
                 order by programado_para limit 5) x
      ), '[]'::jsonb))
  );
end $$;

-- ── Escrita ─────────────────────────────────────────────────────────────────
-- Campos de conteúdo que redes_salvar aceita (o resto tem função própria).
create or replace function public.redes_aplicar(p public.redes_posts, d jsonb)
returns public.redes_posts language plpgsql stable security definer set search_path = public as $$
begin
  if d ? 'titulo' then p.titulo := btrim(coalesce(d->>'titulo', '')); end if;
  if d ? 'perfil' then p.perfil := btrim(coalesce(d->>'perfil', '')); end if;
  if d ? 'edicao_codigo' then p.edicao_codigo := nullif(d->>'edicao_codigo', ''); end if;
  if d ? 'participante_id' then p.participante_id := nullif(d->>'participante_id', '')::uuid; end if;
  if d ? 'formato' then p.formato := d->>'formato'; end if;
  if d ? 'legenda' then p.legenda := coalesce(d->>'legenda', ''); end if;
  if d ? 'mencoes' then p.mencoes := coalesce(d->>'mencoes', ''); end if;
  if d ? 'observacoes' then p.observacoes := coalesce(d->>'observacoes', ''); end if;
  if d ? 'referencias' then p.referencias := coalesce(d->>'referencias', ''); end if;
  if d ? 'programado_para' then p.programado_para := nullif(d->>'programado_para', '')::timestamptz; end if;
  if d ? 'responsavel_id' then p.responsavel_id := nullif(d->>'responsavel_id', '')::uuid; end if;
  return p;
end $$;
revoke all on function public.redes_aplicar(public.redes_posts, jsonb) from public, anon, authenticated;

-- Responsável tem que ser conta ativa da organização que trabalha com redes.
create or replace function public.redes_conferir_responsavel(p_user uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if p_user is not null and not (public.pode_por_user(p_user, 'redes.editar') or public.pode_por_user(p_user, 'redes.publicar')) then
    raise exception 'responsavel_invalido' using errcode = '22023';
  end if;
end $$;
revoke all on function public.redes_conferir_responsavel(uuid) from public, anon, authenticated;

-- Grava os campos editáveis de `p` (os mesmos que redes_aplicar lê) e sobe a versão.
create or replace function public.redes_gravar(p public.redes_posts)
returns public.redes_posts language plpgsql security definer set search_path = public as $$
declare r public.redes_posts;
begin
  update public.redes_posts set
    titulo = p.titulo, perfil = p.perfil, edicao_codigo = p.edicao_codigo, participante_id = p.participante_id,
    formato = p.formato, legenda = p.legenda, mencoes = p.mencoes, observacoes = p.observacoes,
    referencias = p.referencias, programado_para = p.programado_para, responsavel_id = p.responsavel_id,
    versao = versao + 1, atualizado_em = now(), atualizado_por_id = auth.uid(), atualizado_por_rotulo = public.ator_rotulo_atual()
  where id = p.id returning * into r;
  return r;
end $$;
revoke all on function public.redes_gravar(public.redes_posts) from public, anon, authenticated;

create or replace function public.redes_texto_atribuido(p public.redes_posts)
returns text language sql stable security definer set search_path = public as $$
  select 'Responsável: ' || coalesce((select nome from public.perfis where user_id = p.responsavel_id), '—')
         || ' · ' || public.redes_data_texto(p.programado_para)
$$;
revoke all on function public.redes_texto_atribuido(public.redes_posts) from public, anon, authenticated;

create or replace function public.redes_criar(p_secret text, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.redes_posts;
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  if jsonb_typeof(p_dados) <> 'object' then raise exception 'dados_invalidos' using errcode = '22023'; end if;
  insert into public.redes_posts (titulo, criado_por_id, criado_por_rotulo, atualizado_por_id, atualizado_por_rotulo)
  values ('Nova postagem', auth.uid(), public.ator_rotulo_atual(), auth.uid(), public.ator_rotulo_atual()) returning * into p;
  p := public.redes_aplicar(p, p_dados);
  perform public.redes_conferir_responsavel(p.responsavel_id);
  p := public.redes_gravar(p);
  update public.redes_posts set versao = 1 where id = p.id returning * into p;
  perform public.redes_registrar(p.id, 'criado', jsonb_build_object('titulo', p.titulo, 'formato', p.formato));
  if p.responsavel_id is not null then
    perform public.redes_avisar(p.id, 'atribuido', 'Post atribuído a você: ' || p.titulo, public.redes_texto_atribuido(p));
  end if;
  return public.redes_json(p);
end $$;

/*
 * Grava conteúdo, programação e responsável. Só as chaves enviadas mudam.
 * ⛔ Publicada ou cancelada não se edita aqui (o que foi ao ar fica como foi);
 *    corrigir é desfazer a confirmação (redes.gerir) ou reabrir.
 */
create or replace function public.redes_salvar(p_secret text, p_id uuid, p_versao integer, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  antes public.redes_posts;
  p public.redes_posts;
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  if p_versao is null then raise exception 'versao_obrigatoria' using errcode = '22023'; end if;
  if jsonb_typeof(p_dados) <> 'object' then raise exception 'dados_invalidos' using errcode = '22023'; end if;
  antes := public.redes_travar(p_id, p_versao);
  if antes.situacao in ('publicado', 'cancelado') then raise exception 'post_fechado' using errcode = '55000'; end if;
  p := public.redes_aplicar(antes, p_dados);
  perform public.redes_conferir_responsavel(p.responsavel_id);
  -- "Pronto" só segue pronto se continuar cumprindo os requisitos: quem apaga
  -- a legenda de um post pronto o devolve para preparação, com registro.
  p := public.redes_gravar(p);
  if p.situacao = 'pronto' and exists (select 1 from unnest(public.redes_pendencias(p.id)) x where x <> 'atrasada') then
    update public.redes_posts set situacao = 'preparacao' where id = p_id returning * into p;
    perform public.redes_registrar(p.id, 'situacao', jsonb_build_object('de', 'pronto', 'para', 'preparacao', 'motivo', 'requisitos'));
  end if;

  if p.programado_para is distinct from antes.programado_para then
    perform public.redes_registrar(p.id, 'programacao', jsonb_build_object('de', antes.programado_para, 'para', p.programado_para));
    perform public.redes_avisar(p.id, 'horario', 'Horário alterado: ' || p.titulo,
      public.redes_data_texto(antes.programado_para) || ' → ' || public.redes_data_texto(p.programado_para));
  end if;
  if p.responsavel_id is distinct from antes.responsavel_id then
    perform public.redes_registrar(p.id, 'responsavel', jsonb_build_object(
      'de', (select nome from public.perfis where user_id = antes.responsavel_id),
      'para', (select nome from public.perfis where user_id = p.responsavel_id),
      'de_id', antes.responsavel_id, 'para_id', p.responsavel_id));
    if p.responsavel_id is not null then
      -- Só o novo responsável recebe "atribuído" (o resto da relação não precisa).
      perform public.avisar_pessoa(p.responsavel_id, 'redes', 'Post atribuído a você: ' || p.titulo,
        public.redes_texto_atribuido(p), 'social/planejamento/' || p.id, 'redes:' || p.id || ':atribuido', p.participante_id);
    end if;
  end if;
  if p.legenda is distinct from antes.legenda then
    perform public.redes_registrar(p.id, 'legenda', jsonb_build_object('caracteres_antes', char_length(antes.legenda), 'caracteres', char_length(p.legenda)));
    perform public.redes_avisar(p.id, 'legenda', 'Legenda atualizada: ' || p.titulo,
      left(coalesce(nullif(btrim(p.legenda), ''), '(legenda apagada)'), 200));
  end if;
  if (p.titulo, p.perfil, p.edicao_codigo, p.participante_id, p.formato, p.mencoes, p.observacoes, p.referencias)
     is distinct from (antes.titulo, antes.perfil, antes.edicao_codigo, antes.participante_id, antes.formato, antes.mencoes, antes.observacoes, antes.referencias) then
    perform public.redes_registrar(p.id, 'conteudo', jsonb_build_object('campos', (
      select coalesce(jsonb_agg(k), '[]'::jsonb) from (values
        ('titulo', p.titulo is distinct from antes.titulo), ('perfil', p.perfil is distinct from antes.perfil),
        ('edicao', p.edicao_codigo is distinct from antes.edicao_codigo), ('participante', p.participante_id is distinct from antes.participante_id),
        ('formato', p.formato is distinct from antes.formato), ('mencoes', p.mencoes is distinct from antes.mencoes),
        ('observacoes', p.observacoes is distinct from antes.observacoes), ('referencias', p.referencias is distinct from antes.referencias)) v(k, mudou)
      where mudou)));
  end if;
  return public.redes_json(p);
end $$;

/*
 * Situação de trabalho: rascunho ⇄ preparação ⇄ pronto (redes.editar);
 * cancelar e reabrir (redes.gerir). "Publicado" NÃO entra aqui — só pela
 * confirmação explícita (redes_confirmar).
 */
create or replace function public.redes_situacao(p_secret text, p_id uuid, p_versao integer, p_situacao text, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.redes_posts;
  pend text[];
begin
  if p_situacao in ('cancelado') then perform public.redes_exigir(p_secret, 'redes.gerir');
  elsif p_situacao in ('rascunho', 'preparacao', 'pronto') then perform public.redes_exigir(p_secret, 'redes.editar');
  else raise exception 'situacao_invalida' using errcode = '22023';
  end if;
  p := public.redes_travar(p_id, p_versao);
  if p.situacao = p_situacao then return public.redes_json(p); end if;
  if p.situacao = 'publicado' then raise exception 'post_fechado' using errcode = '55000'; end if;
  -- Reabrir uma cancelada é decisão de quem administra.
  if p.situacao = 'cancelado' then perform public.redes_exigir(p_secret, 'redes.gerir'); end if;
  if p_situacao = 'pronto' then
    select array_agg(x) into pend from unnest(public.redes_pendencias(p_id)) x where x <> 'atrasada';
    if pend is not null then
      raise exception 'requisitos_pendentes' using errcode = '23514', detail = array_to_string(pend, ',');
    end if;
  end if;
  update public.redes_posts set
    situacao = p_situacao,
    cancelado_em = case when p_situacao = 'cancelado' then now() else null end,
    motivo_cancelamento = case when p_situacao = 'cancelado' then nullif(btrim(coalesce(p_motivo, '')), '') else null end,
    versao = versao + 1, atualizado_em = now(), atualizado_por_id = auth.uid(), atualizado_por_rotulo = public.ator_rotulo_atual()
  where id = p_id;
  perform public.redes_registrar(p_id,
    case when p_situacao = 'cancelado' then 'cancelado' when p.situacao = 'cancelado' then 'reaberto' else 'situacao' end,
    jsonb_build_object('de', p.situacao, 'para', p_situacao, 'motivo', nullif(btrim(coalesce(p_motivo, '')), '')));
  if p_situacao = 'pronto' then
    perform public.redes_avisar(p_id, 'pronto', 'Pronto para publicar: ' || p.titulo, public.redes_data_texto(p.programado_para) || ' · ' || p.perfil);
  elsif p_situacao = 'cancelado' then
    perform public.redes_avisar(p_id, 'cancelado', 'Post cancelado: ' || p.titulo, coalesce(nullif(btrim(coalesce(p_motivo, '')), ''), 'Sem motivo informado'));
  end if;
  select * into p from public.redes_posts where id = p_id;
  return public.redes_json(p);
end $$;

/*
 * Confirmação EXPLÍCITA de publicação (redes.publicar). Data/hora reais
 * informadas pela pessoa ("Publicado agora" manda now()); link opcional — Story
 * nem sempre tem endereço durável. Guarda o retrato do que foi ao ar.
 * Já publicado: só redes.gerir corrige a execução (data, link, observação).
 */
create or replace function public.redes_confirmar(p_secret text, p_id uuid, p_versao integer,
  p_publicado_em timestamptz, p_link text default null, p_obs text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.redes_posts;
  link text := nullif(btrim(coalesce(p_link, '')), '');
  correcao boolean;
begin
  perform public.redes_exigir(p_secret, 'redes.publicar');
  p := public.redes_travar(p_id, p_versao);
  correcao := p.situacao = 'publicado';
  if correcao then perform public.redes_exigir(p_secret, 'redes.gerir');
  elsif p.situacao <> 'pronto' then raise exception 'post_nao_pronto' using errcode = '55000';
  end if;
  if p_publicado_em is null then raise exception 'data_obrigatoria' using errcode = '22023'; end if;
  if p_publicado_em > now() + interval '5 minutes' then raise exception 'data_no_futuro' using errcode = '22023'; end if;
  if p_publicado_em < now() - interval '400 days' then raise exception 'data_invalida' using errcode = '22023'; end if;
  if link is not null and (link !~ '^https://' or char_length(link) > 500) then raise exception 'link_invalido' using errcode = '22023'; end if;

  update public.redes_posts set
    situacao = 'publicado', publicado_em = p_publicado_em, link_publicado = link,
    obs_execucao = left(btrim(coalesce(p_obs, '')), 1000),
    confirmado_em = now(), publicado_por_id = auth.uid(), publicado_por_rotulo = public.ator_rotulo_atual(),
    publicado_snapshot = case when correcao then publicado_snapshot else jsonb_build_object(
      'titulo', p.titulo, 'perfil', p.perfil, 'formato', p.formato, 'legenda', p.legenda, 'mencoes', p.mencoes,
      'programado_para', p.programado_para,
      'arquivos', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'bucket', a.bucket, 'path', a.path, 'nome', a.nome,
                                                               'mime', a.mime, 'alt', a.alt, 'ordem', a.ordem, 'versao', a.versao)
                                             order by a.ordem, a.criado_em)
                              from public.redes_arquivos a where a.post_id = p.id and a.removido_em is null), '[]'::jsonb)) end,
    versao = versao + 1, atualizado_em = now(), atualizado_por_id = auth.uid(), atualizado_por_rotulo = public.ator_rotulo_atual()
  where id = p_id returning * into p;
  perform public.redes_registrar(p_id, case when correcao then 'execucao' else 'publicado' end, jsonb_build_object(
    'publicado_em', p.publicado_em, 'link', p.link_publicado, 'obs', nullif(p.obs_execucao, ''),
    -- Story agrupado: UMA confirmação vale para a sequência inteira.
    'vale_para', case when p.formato = 'story' then 'sequencia_inteira' end,
    'n_arquivos', jsonb_array_length(coalesce(p.publicado_snapshot->'arquivos', '[]'::jsonb))));
  if not correcao then
    perform public.redes_avisar(p_id, 'publicado', 'Publicado: ' || p.titulo,
      'Confirmado por ' || coalesce(p.publicado_por_rotulo, '—') || ' · ' || public.redes_data_texto(p.publicado_em));
  end if;
  return public.redes_json(p);
end $$;

-- Desfazer uma confirmação errada (redes.gerir): volta para "pronto". O
-- retrato anterior fica no histórico.
create or replace function public.redes_desfazer_publicacao(p_secret text, p_id uuid, p_versao integer, p_motivo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.redes_posts;
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  p := public.redes_travar(p_id, p_versao);
  if p.situacao <> 'publicado' then raise exception 'post_nao_publicado' using errcode = '55000'; end if;
  if nullif(btrim(coalesce(p_motivo, '')), '') is null then raise exception 'motivo_obrigatorio' using errcode = '22023'; end if;
  perform public.redes_registrar(p_id, 'publicacao_desfeita', jsonb_build_object(
    'motivo', btrim(p_motivo), 'publicado_em', p.publicado_em, 'link', p.link_publicado,
    'por', p.publicado_por_rotulo, 'retrato', p.publicado_snapshot));
  update public.redes_posts set situacao = 'pronto', publicado_em = null, link_publicado = null, obs_execucao = '',
    confirmado_em = null, publicado_por_id = null, publicado_por_rotulo = null, publicado_snapshot = null,
    versao = versao + 1, atualizado_em = now(), atualizado_por_id = auth.uid(), atualizado_por_rotulo = public.ator_rotulo_atual()
  where id = p_id returning * into p;
  return public.redes_json(p);
end $$;

/*
 * Duplicar: cópia como RASCUNHO, sem data (vai para a fila), sem confirmação,
 * horário efetivo, link nem retrato. Os arquivos vêm junto apontando para os
 * mesmos objetos — imutáveis, então a cópia não altera a original.
 */
create or replace function public.redes_duplicar(p_secret text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.redes_posts;
  novo uuid := gen_random_uuid();
  p public.redes_posts;
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  select * into o from public.redes_posts where id = p_id;
  if not found then raise exception 'post_inexistente' using errcode = 'P0002'; end if;
  insert into public.redes_posts (id, titulo, perfil, edicao_codigo, participante_id, formato, legenda, mencoes,
    observacoes, referencias, responsavel_id, situacao, duplicado_de, criado_por_id, criado_por_rotulo,
    atualizado_por_id, atualizado_por_rotulo)
  values (novo, left('Cópia de ' || o.titulo, 120), o.perfil, o.edicao_codigo, o.participante_id, o.formato, o.legenda,
    o.mencoes, o.observacoes, o.referencias, o.responsavel_id, 'rascunho', o.id,
    auth.uid(), public.ator_rotulo_atual(), auth.uid(), public.ator_rotulo_atual())
  returning * into p;
  insert into public.redes_arquivos (post_id, bucket, origem, origem_id, path, miniatura_path, nome, mime, tamanho,
    largura, altura, duracao, alt, ordem, versao, criado_por_rotulo)
  select novo, a.bucket, a.origem, a.origem_id, a.path, a.miniatura_path, a.nome, a.mime, a.tamanho,
    a.largura, a.altura, a.duracao, a.alt, a.ordem, a.versao, public.ator_rotulo_atual()
    from public.redes_arquivos a where a.post_id = o.id and a.removido_em is null;
  perform public.redes_registrar(novo, 'duplicado', jsonb_build_object('de', o.id, 'titulo', o.titulo));
  return public.redes_json(p);
end $$;

-- Comentário interno; `p_ajuste` = pedido de ajuste (fica marcado na ficha e
-- no planejamento até a próxima alteração da postagem).
create or replace function public.redes_comentar(p_secret text, p_post uuid, p_corpo text, p_ajuste boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.redes_comentarios; t text;
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  if nullif(btrim(coalesce(p_corpo, '')), '') is null then raise exception 'texto_vazio' using errcode = '22023'; end if;
  select titulo into t from public.redes_posts where id = p_post;
  if not found then raise exception 'post_inexistente' using errcode = 'P0002'; end if;
  insert into public.redes_comentarios (post_id, autor_id, autor_rotulo, corpo, ajuste)
  values (p_post, auth.uid(), public.ator_rotulo_atual(), btrim(p_corpo), coalesce(p_ajuste, false)) returning * into c;
  if c.ajuste then
    perform public.redes_registrar(p_post, 'ajuste', jsonb_build_object('texto', left(c.corpo, 200)));
    perform public.redes_avisar(p_post, 'ajuste', 'Pedido de ajuste: ' || t, left(c.corpo, 200));
  else
    perform public.redes_avisar(p_post, 'comentario', 'Comentário em: ' || t, left(c.corpo, 200));
  end if;
  return to_jsonb(c);
end $$;

-- ── Arquivos ────────────────────────────────────────────────────────────────
-- Post aberto para mexer em arquivo (publicado/cancelado: o registro fica como está).
create or replace function public.redes_post_aberto(p_post uuid)
returns public.redes_posts language plpgsql security definer set search_path = public as $$
declare p public.redes_posts;
begin
  select * into p from public.redes_posts where id = p_post for update;
  if not found then raise exception 'post_inexistente' using errcode = 'P0002'; end if;
  if p.situacao in ('publicado', 'cancelado') then raise exception 'post_fechado' using errcode = '55000'; end if;
  return p;
end $$;
revoke all on function public.redes_post_aberto(uuid) from public, anon, authenticated;

-- Volta "pronto" para "preparação" quando os arquivos deixam de cumprir o formato.
create or replace function public.redes_rever_pronto(p_post uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.redes_posts where id = p_post and situacao = 'pronto')
     and exists (select 1 from unnest(public.redes_pendencias(p_post)) x where x <> 'atrasada') then
    update public.redes_posts set situacao = 'preparacao', versao = versao + 1, atualizado_em = now() where id = p_post;
    perform public.redes_registrar(p_post, 'situacao', jsonb_build_object('de', 'pronto', 'para', 'preparacao', 'motivo', 'arquivos'));
  end if;
end $$;
revoke all on function public.redes_rever_pronto(uuid) from public, anon, authenticated;

-- Mexer (substituir/remover) num arquivo que OUTRA pessoa pôs: só redes.gerir.
-- A Social media associa e envia; a arte oficial do designer não some calada.
create or replace function public.redes_exigir_dono(p_secret text, a public.redes_arquivos)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if a.criado_por_id is null or a.criado_por_id is distinct from auth.uid() then
    perform public.redes_exigir(p_secret, 'redes.gerir');
  end if;
end $$;
revoke all on function public.redes_exigir_dono(text, public.redes_arquivos) from public, anon, authenticated;

-- Objeto já enviado ao bucket `redes`: confere existência e tamanho exato.
create or replace function public.redes_conferir_objeto(p_caminho text, p_tamanho bigint)
returns void language plpgsql stable security definer set search_path = public, storage as $$
declare tam_obj bigint;
begin
  select (o.metadata->>'size')::bigint into tam_obj from storage.objects o where o.bucket_id = 'redes' and o.name = p_caminho;
  if not found then raise exception 'arquivo_nao_recebido' using errcode = 'P0002'; end if;
  if tam_obj is distinct from p_tamanho then raise exception 'arquivo_incompleto' using errcode = '22023'; end if;
end $$;
revoke all on function public.redes_conferir_objeto(text, bigint) from public, anon, authenticated;

/*
 * Registra um arquivo JÁ enviado ao Storage (a subida é pela URL assinada da
 * arquivo-url). Confere que o objeto existe no bucket `redes`, no caminho da
 * própria publicação, e que o tamanho bate — arquivo que não chegou inteiro
 * não vira registro. `p_substitui`: a versão anterior fica como substituída
 * (autor e data), nunca apagada, e a nova assume a mesma posição com a
 * versão seguinte.
 */
create or replace function public.redes_arquivo_registrar(p_secret text, p_post uuid, p_dados jsonb, p_substitui uuid default null)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare
  a public.redes_arquivos;
  velho public.redes_arquivos;
  p public.redes_posts;
  caminho text := p_dados->>'path';
  mini text := nullif(p_dados->>'miniatura_path', '');
begin
  perform public.redes_exigir(p_secret, 'redes.arquivos');
  p := public.redes_post_aberto(p_post);
  if caminho is null or split_part(caminho, '/', 1) <> p_post::text then raise exception 'caminho_invalido' using errcode = '22023'; end if;
  if mini is not null and split_part(mini, '/', 1) <> p_post::text then raise exception 'caminho_invalido' using errcode = '22023'; end if;
  perform public.redes_conferir_objeto(caminho, (p_dados->>'tamanho')::bigint);
  if exists (select 1 from public.redes_arquivos where bucket = 'redes' and path = caminho) then raise exception 'arquivo_repetido' using errcode = '23505'; end if;

  if p_substitui is not null then
    select * into velho from public.redes_arquivos where id = p_substitui and post_id = p_post and removido_em is null for update;
    if not found then raise exception 'arquivo_inexistente' using errcode = 'P0002'; end if;
    perform public.redes_exigir_dono(p_secret, velho);
  end if;
  insert into public.redes_arquivos (post_id, path, miniatura_path, nome, mime, tamanho, largura, altura, duracao, alt, ordem, versao,
                                     criado_por_id, criado_por_rotulo)
  values (p_post, caminho, mini, left(coalesce(nullif(btrim(p_dados->>'nome'), ''), 'arquivo'), 200), p_dados->>'mime',
          (p_dados->>'tamanho')::bigint, nullif(p_dados->>'largura', '')::int, nullif(p_dados->>'altura', '')::int,
          nullif(p_dados->>'duracao', '')::numeric,
          case when velho.id is not null then velho.alt else left(coalesce(p_dados->>'alt', ''), 1000) end,
          case when velho.id is not null then velho.ordem
               else coalesce((select max(ordem) + 1 from public.redes_arquivos where post_id = p_post and removido_em is null), 0) end,
          case when velho.id is not null then velho.versao + 1 else 1 end,
          auth.uid(), public.ator_rotulo_atual())
  returning * into a;
  if velho.id is not null then
    update public.redes_arquivos set removido_em = now(), removido_por_rotulo = public.ator_rotulo_atual(), substituido_por = a.id
     where id = velho.id;
  end if;
  perform public.redes_registrar(p_post, 'arquivo', jsonb_build_object(
    'acao', case when velho.id is not null then 'substituido' else 'enviado' end,
    'nome', a.nome, 'anterior', velho.nome, 'versao', a.versao));
  perform public.redes_avisar(p_post, 'arte',
    case when velho.id is not null then 'Arte substituída: ' else 'Arte adicionada: ' end || p.titulo,
    a.nome || case when velho.id is not null then ' (versão ' || a.versao || ', no lugar de ' || velho.nome || ')' else '' end);
  perform public.redes_rever_pronto(p_post);
  return to_jsonb(a);
end $$;

create or replace function public.redes_arquivo_alt(p_secret text, p_arquivo uuid, p_alt text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.redes_arquivos;
begin
  perform public.redes_exigir(p_secret, 'redes.arquivos');
  select * into a from public.redes_arquivos where id = p_arquivo and removido_em is null and post_id is not null;
  if not found then raise exception 'arquivo_inexistente' using errcode = 'P0002'; end if;
  perform public.redes_post_aberto(a.post_id);
  update public.redes_arquivos set alt = left(btrim(coalesce(p_alt, '')), 1000) where id = p_arquivo returning * into a;
  return to_jsonb(a);
end $$;

-- Nova ordem: a lista tem que ser exatamente os arquivos ativos da publicação.
create or replace function public.redes_arquivos_ordenar(p_secret text, p_post uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.redes_exigir(p_secret, 'redes.arquivos');
  perform public.redes_post_aberto(p_post);
  if (select array_agg(id order by id) from public.redes_arquivos where post_id = p_post and removido_em is null)
     is distinct from (select array_agg(x order by x) from unnest(p_ids) x) then
    raise exception 'ordem_invalida' using errcode = '22023';
  end if;
  update public.redes_arquivos a set ordem = o.n - 1
    from unnest(p_ids) with ordinality o(id, n) where a.id = o.id;
  perform public.redes_registrar(p_post, 'arquivo', jsonb_build_object('acao', 'reordenado',
    'ordem', (select jsonb_agg(a.nome order by a.ordem) from public.redes_arquivos a where a.post_id = p_post and a.removido_em is null)));
end $$;

-- Remover é marcar: o objeto e a linha ficam (rastreabilidade).
create or replace function public.redes_arquivo_remover(p_secret text, p_arquivo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.redes_arquivos;
begin
  perform public.redes_exigir(p_secret, 'redes.arquivos');
  select * into a from public.redes_arquivos where id = p_arquivo and removido_em is null;
  if not found then raise exception 'arquivo_inexistente' using errcode = 'P0002'; end if;
  perform public.redes_exigir_dono(p_secret, a);
  if a.post_id is not null then perform public.redes_post_aberto(a.post_id); end if;
  update public.redes_arquivos set removido_em = now(), removido_por_rotulo = public.ator_rotulo_atual() where id = p_arquivo;
  if a.post_id is not null then
    perform public.redes_registrar(a.post_id, 'arquivo', jsonb_build_object('acao', 'removido', 'nome', a.nome));
    perform public.redes_rever_pronto(a.post_id);
  end if;
end $$;

-- ── Biblioteca ──────────────────────────────────────────────────────────────
/*
 * Uma lista só, por REFERÊNCIA aos registros que já existem — nada é copiado:
 *   arte        redes_arquivos enviados aqui (postagem ou biblioteca)
 *   foto_combo  midias_participacao (combo, galeria, componente)
 *   foto_loja   midias_participacao (loja)
 *   logo        logos_marca (todas as versões; "oficial" = a em uso)
 *   campanha    arquivos gerais (escopo geral, não arquivados)
 * Filtros: tipo, edicao, participante, situacao ('disponivel' = utilizável;
 * qualquer outro valor compara exato), q (nome, vínculo, participante).
 * Cópias de duplicação (mesmo objeto) aparecem uma vez.
 */
create or replace function public.social_biblioteca(p_secret text, p_filtros jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  f jsonb := coalesce(p_filtros, '{}'::jsonb);
  f_tipo text := nullif(f->>'tipo', '');
  f_ed text := nullif(f->>'edicao', '');
  f_part uuid := nullif(f->>'participante', '')::uuid;
  f_sit text := nullif(f->>'situacao', '');
  f_q text := nullif(btrim(coalesce(f->>'q', '')), '');
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  return coalesce((
    with itens as (
      (select distinct on (a.path) jsonb_build_object(
               'tipo', 'arte', 'id', a.id, 'bucket', 'redes', 'path', a.path, 'miniatura_path', a.miniatura_path,
               'nome', a.nome, 'mime', a.mime, 'versao', a.versao::text, 'largura', a.largura, 'altura', a.altura,
               'edicao_codigo', coalesce(a.edicao_codigo, p.edicao_codigo),
               'participante_id', coalesce(a.participante_id, p.participante_id),
               'situacao', case when a.removido_em is null then 'disponivel' when a.substituido_por is not null then 'substituida' else 'removida' end,
               'vinculo', coalesce(p.titulo, 'Biblioteca'), 'post_id', p.id,
               'criado_em', a.criado_em, 'criado_por_rotulo', a.criado_por_rotulo, 'criado_por_id', a.criado_por_id) x
        from public.redes_arquivos a left join public.redes_posts p on p.id = a.post_id
       where a.bucket = 'redes'
       order by a.path, a.criado_em)
      union all
      select jsonb_build_object(
               'tipo', case when m.papel = 'loja' then 'foto_loja' else 'foto_combo' end, 'id', m.id,
               'bucket', 'edicao-publico', 'path', m.path, 'nome',
               coalesce(nullif(btrim(m.alt), ''), case m.papel when 'combo_principal' then 'Foto principal do combo'
                 when 'combo_galeria' then 'Foto do combo' when 'item' then 'Foto de componente' else 'Foto da loja' end),
               'mime', 'image/webp', 'largura', m.largura, 'altura', m.altura,
               'edicao_codigo', pa.edicao_codigo, 'participante_id', pa.participante_id,
               'situacao', m.estado,
               'vinculo', case m.papel when 'combo_principal' then 'Principal do combo' when 'combo_galeria' then 'Galeria do combo'
                 when 'item' then 'Componente' else 'Loja' end,
               'credito', m.credito, 'criado_em', m.criado_em, 'criado_por_rotulo', m.criado_por)
        from public.midias_participacao m join public.participacoes pa on pa.id = m.participacao_id
       where m.estado <> 'recusada'
      union all
      select jsonb_build_object(
               'tipo', 'logo', 'id', l.id, 'bucket', 'logos', 'path', l.path,
               'nome', coalesce(nullif(btrim(l.nome_original), ''), 'Logo'), 'mime', l.mime,
               'largura', l.largura, 'altura', l.altura, 'edicao_codigo', l.edicao_codigo, 'participante_id', l.participante_id,
               'situacao', case when l.id = pt.logo_id or exists (select 1 from public.participacoes x where x.logo_id = l.id)
                                then 'oficial' else 'anterior' end,
               'vinculo', 'Logo do participante', 'criado_em', l.criado_em, 'criado_por_rotulo', l.criado_por_rotulo)
        from public.logos_marca l join public.participantes pt on pt.id = l.participante_id
      union all
      select jsonb_build_object(
               'tipo', 'campanha', 'id', ar.id, 'bucket', 'arquivos', 'path', ar.path, 'nome', ar.nome, 'mime', ar.mime,
               'versao', ar.versao, 'tamanho', ar.tamanho,
               'situacao', case when ar.publicado_em is not null then 'publicado' else 'nao_publicado' end,
               'vinculo', 'Material geral · ' || ar.categoria,
               'criado_em', coalesce(ar.publicado_em, ar.created_at))
        from public.arquivos ar
       where ar.escopo = 'geral' and not ar.arquivado and ar.publicado_em is not null
         and ar.categoria in ('identidade', 'combo', 'guia')
    )
    select jsonb_agg(i.y order by i.y->>'criado_em' desc)
      from (select it.x || jsonb_build_object('participante_nome', pt.nome_marca) y
              from itens it left join public.participantes pt on pt.id::text = it.x->>'participante_id'
             where (f_tipo is null or it.x->>'tipo' = f_tipo)
               and (f_ed is null or coalesce(it.x->>'edicao_codigo', f_ed) = f_ed)
               and (f_part is null or it.x->>'participante_id' = f_part::text)
               and (f_sit is null
                    or (f_sit = 'disponivel' and it.x->>'situacao' not in ('substituida', 'removida', 'recusada', 'anterior'))
                    or it.x->>'situacao' = f_sit)
               and (f_q is null or (it.x->>'nome') ilike '%' || f_q || '%' or (it.x->>'vinculo') ilike '%' || f_q || '%'
                    or pt.nome_marca ilike '%' || f_q || '%')
             order by it.x->>'criado_em' desc
             limit 300) i
  ), '[]'::jsonb);
end $$;

-- Arte final direto na biblioteca (designer/administrador: redes.gerir). O
-- caminho é <uuid do lote>/<uuid>.<ext>, mesmo formato do bucket.
create or replace function public.social_biblioteca_registrar(p_secret text, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare a public.redes_arquivos; caminho text := p_dados->>'path'; mini text := nullif(p_dados->>'miniatura_path', '');
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  if caminho is null or (mini is not null and split_part(mini, '/', 1) <> split_part(caminho, '/', 1)) then
    raise exception 'caminho_invalido' using errcode = '22023';
  end if;
  perform public.redes_conferir_objeto(caminho, (p_dados->>'tamanho')::bigint);
  if exists (select 1 from public.redes_arquivos where bucket = 'redes' and path = caminho) then raise exception 'arquivo_repetido' using errcode = '23505'; end if;
  insert into public.redes_arquivos (post_id, path, miniatura_path, nome, mime, tamanho, largura, altura, duracao, alt,
                                     edicao_codigo, participante_id, criado_por_id, criado_por_rotulo)
  values (null, caminho, mini, left(coalesce(nullif(btrim(p_dados->>'nome'), ''), 'arquivo'), 200), p_dados->>'mime',
          (p_dados->>'tamanho')::bigint, nullif(p_dados->>'largura', '')::int, nullif(p_dados->>'altura', '')::int,
          nullif(p_dados->>'duracao', '')::numeric, left(coalesce(p_dados->>'alt', ''), 1000),
          nullif(p_dados->>'edicao_codigo', ''), nullif(p_dados->>'participante_id', '')::uuid,
          auth.uid(), public.ator_rotulo_atual())
  returning * into a;
  return to_jsonb(a);
end $$;

/*
 * Associar material existente a uma postagem: o servidor resolve bucket e
 * caminho pelo registro de origem (nunca pelo que o navegador manda) e grava
 * uma referência — o arquivo não é copiado nem tocado. A versão associada
 * fica registrada: trocar a foto ou a logo depois não muda esta postagem.
 */
create or replace function public.redes_arquivo_associar(p_secret text, p_post uuid, p_tipo text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.redes_posts;
  a public.redes_arquivos;
  v_bucket text; v_origem text; v_path text; v_mini text; v_nome text; v_mime text; v_tam bigint;
  v_larg int; v_alt int; v_dur numeric; v_texto_alt text := ''; v_versao int := 1;
begin
  perform public.redes_exigir(p_secret, 'redes.arquivos');
  p := public.redes_post_aberto(p_post);
  if p_tipo = 'arte' then
    select 'redes', 'biblioteca', x.path, x.miniatura_path, x.nome, x.mime, x.tamanho, x.largura, x.altura, x.duracao, x.alt, x.versao
      into v_bucket, v_origem, v_path, v_mini, v_nome, v_mime, v_tam, v_larg, v_alt, v_dur, v_texto_alt, v_versao
      from public.redes_arquivos x where x.id = p_id and x.bucket = 'redes'
       and (x.removido_em is null or x.substituido_por is not null);
  elsif p_tipo in ('foto_combo', 'foto_loja') then
    select 'edicao-publico', 'foto', m.path, null, coalesce(nullif(btrim(m.alt), ''), 'Foto'), 'image/webp', null, m.largura, m.altura, null, coalesce(m.alt, '')
      into v_bucket, v_origem, v_path, v_mini, v_nome, v_mime, v_tam, v_larg, v_alt, v_dur, v_texto_alt
      from public.midias_participacao m where m.id = p_id and m.estado <> 'recusada';
  elsif p_tipo = 'logo' then
    select 'logos', 'logo', l.path, null, coalesce(nullif(btrim(l.nome_original), ''), 'Logo'), l.mime, l.tamanho, l.largura, l.altura, null, ''
      into v_bucket, v_origem, v_path, v_mini, v_nome, v_mime, v_tam, v_larg, v_alt, v_dur, v_texto_alt
      from public.logos_marca l where l.id = p_id;
  elsif p_tipo = 'campanha' then
    select 'arquivos', 'campanha', ar.path, null, ar.nome, ar.mime, ar.tamanho, null, null, null, ''
      into v_bucket, v_origem, v_path, v_mini, v_nome, v_mime, v_tam, v_larg, v_alt, v_dur, v_texto_alt
      from public.arquivos ar where ar.id = p_id and ar.escopo = 'geral' and not ar.arquivado
       and ar.publicado_em is not null and ar.categoria in ('identidade', 'combo', 'guia');
  else
    raise exception 'tipo_invalido' using errcode = '22023';
  end if;
  if v_path is null then raise exception 'arquivo_inexistente' using errcode = 'P0002'; end if;
  -- PDF, SVG, ZIP…: ficam na biblioteca para baixar, não entram como arte da postagem.
  if v_mime is null or v_mime not in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime') then
    raise exception 'formato_nao_suportado' using errcode = '22023';
  end if;
  if exists (select 1 from public.redes_arquivos where post_id = p_post and bucket = v_bucket and path = v_path and removido_em is null) then
    raise exception 'arquivo_repetido' using errcode = '23505';
  end if;
  insert into public.redes_arquivos (post_id, bucket, origem, origem_id, path, miniatura_path, nome, mime, tamanho,
                                     largura, altura, duracao, alt, ordem, versao, criado_por_id, criado_por_rotulo)
  values (p_post, v_bucket, v_origem, p_id, v_path, v_mini, left(v_nome, 200), v_mime, v_tam, v_larg, v_alt, v_dur,
          left(coalesce(v_texto_alt, ''), 1000),
          coalesce((select max(ordem) + 1 from public.redes_arquivos where post_id = p_post and removido_em is null), 0),
          coalesce(v_versao, 1), auth.uid(), public.ator_rotulo_atual())
  returning * into a;
  perform public.redes_registrar(p_post, 'arquivo', jsonb_build_object('acao', 'associado', 'nome', a.nome, 'origem', v_origem));
  perform public.redes_avisar(p_post, 'arte', 'Arte adicionada: ' || p.titulo, a.nome || ' (da biblioteca)');
  perform public.redes_rever_pronto(p_post);
  return to_jsonb(a);
end $$;

-- ── Participantes e combos (editorial) ──────────────────────────────────────
/*
 * Lista para a Social media: marca, logo, tema, combo e situação — SEM
 * telefone, e-mail, CNPJ, custos ou pagamento (editorial.ler não é dado.ler).
 */
create or replace function public.editorial_participantes(p_secret text, p_edicao text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ed text;
begin
  perform public.redes_exigir(p_secret, 'editorial.ler');
  v_ed := coalesce(nullif(p_edicao, ''), (select edicao_atual from public.admin_config limit 1));
  return jsonb_build_object('edicao', v_ed, 'participantes', coalesce((
    select jsonb_agg(jsonb_build_object(
             'participacao_id', pa.id, 'participante_id', pt.id, 'marca', pt.nome_marca,
             'logo', (select path from public.logos_marca l where l.id = coalesce(pa.logo_id, pt.logo_id)),
             'tema', pa.tema_combo, 'combo_nome', pa.combo_nome, 'combo_status', pa.combo_status,
             'alterado_apos_aprovacao', pa.alterado_apos_aprovacao,
             'no_site', exists (select 1 from public.publicacoes pu where pu.participacao_id = pa.id and pu.vigente),
             'foto', (select m.path from public.midias_participacao m where m.participacao_id = pa.id
                        and m.papel = 'combo_principal' and m.estado <> 'recusada' order by (m.estado = 'aprovada') desc limit 1),
             'n_posts', (select count(*) from public.redes_posts r where r.participante_id = pt.id and r.situacao <> 'cancelado'))
           order by pt.nome_marca)
      from public.participacoes pa join public.participantes pt on pt.id = pa.participante_id
     where pa.edicao_codigo = v_ed), '[]'::jsonb));
end $$;

-- Campos que a Social media edita — e só estes (matriz em painel-app/CLAUDE.md).
create or replace function public.editorial_editavel(p_participacao uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'combo_nome', pa.combo_nome, 'combo_descricao', pa.combo_descricao, 'combo_proposta', pa.combo_proposta,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'tipo', i.tipo, 'posicao', i.posicao,
                                                           'nome', i.nome, 'descricao', i.descricao) order by i.posicao)
                         from public.participantes_itens i where i.participacao_id = pa.id), '[]'::jsonb))
    from public.participacoes pa where pa.id = p_participacao
$$;
revoke all on function public.editorial_editavel(uuid) from public, anon, authenticated;

/*
 * Ficha editorial: o conteúdo ATUAL (montar_publico — a mesma lista fechada de
 * campos públicos que o site usa, sem dado pessoal), a versão PUBLICADA
 * (publicacoes vigente, congelada), o que é editável, as fotos e logo, o
 * histórico editorial e as postagens ligadas.
 */
create or replace function public.editorial_ficha(p_secret text, p_participacao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare pa public.participacoes; pt public.participantes;
begin
  perform public.redes_exigir(p_secret, 'editorial.ler');
  select * into pa from public.participacoes where id = p_participacao;
  if not found then raise exception 'participacao_nao_encontrada' using errcode = 'P0002'; end if;
  select * into pt from public.participantes where id = pa.participante_id;
  return jsonb_build_object(
    'participacao_id', pa.id, 'participante_id', pt.id, 'marca', pt.nome_marca, 'edicao_codigo', pa.edicao_codigo,
    'tema', pa.tema_combo, 'tema_edicao', (select e.tema from public.edicoes e where e.codigo = pa.edicao_codigo),
    'combo_status', pa.combo_status, 'alterado_apos_aprovacao', pa.alterado_apos_aprovacao,
    'atual', public.montar_publico(pa.id, 'marca_e_combo'),
    'editavel', public.editorial_editavel(pa.id),
    'publicado', (select jsonb_build_object('versao', pu.versao, 'publicado_em', pu.publicado_em, 'conteudo', pu.conteudo)
                    from public.publicacoes pu where pu.participacao_id = pa.id and pu.vigente
                   order by pu.versao desc limit 1),
    'fotos', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'papel', m.papel, 'path', m.path, 'alt', m.alt,
                                                           'estado', m.estado, 'largura', m.largura, 'altura', m.altura,
                                                           'credito', m.credito) order by m.papel, m.ordem)
                         from public.midias_participacao m where m.participacao_id = pa.id and m.estado <> 'recusada'), '[]'::jsonb),
    'historico', coalesce((select jsonb_agg(jsonb_build_object('id', au.id, 'at', au.at, 'acao', au.acao, 'ator_user_id', au.ator_user_id,
                                                               'ator_rotulo', au.ator_rotulo, 'detalhe', au.detalhe) order by au.at desc)
                             from (select * from public.auditoria x
                                    where x.participacao_id = pa.id and (x.acao like 'combo.%' or x.acao = 'publicacao.dados')
                                    order by x.at desc limit 40) au), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'titulo', r.titulo, 'situacao', r.situacao,
                                                           'programado_para', r.programado_para, 'formato', r.formato)
                                        order by r.programado_para nulls first)
                         from public.redes_posts r where r.participante_id = pt.id), '[]'::jsonb));
end $$;

/*
 * Edição editorial do combo (editorial.editar). Aceita SÓ:
 *   combo_nome (≤80) · combo_descricao (≤400) · combo_proposta (≤2000)
 *   itens: [{ id, nome (≤80), descricao (≤400) }] — componentes da MESMA participação
 * `p_esperado` = os valores que a pessoa leu (editorial.editavel). Se qualquer
 * campo enviado mudou no banco desde então (a marca ou outra pessoa salvou),
 * recusa com `versao_desatualizada` e o valor atual — nada é sobrescrito.
 * ⚠️ A versão publicada NÃO muda: o site lê `publicacoes`, congelada. Combo já
 * aprovado ganha `alterado_apos_aprovacao` (gatilhos da Cartoon) e a curadoria
 * é avisada — publicar de novo é decisão dela (curadoria.decidir).
 */
create or replace function public.editorial_salvar(p_secret text, p_participacao uuid, p_esperado jsonb, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  pa public.participacoes;
  atual jsonb;
  k text;
  it jsonb; it_atual jsonb; it_esp jsonb;
  v_nome text; v_desc text;
  mudou text[] := '{}';
  v_marca text;
begin
  perform public.redes_exigir(p_secret, 'editorial.editar');
  if jsonb_typeof(p_dados) <> 'object' then raise exception 'dados_invalidos' using errcode = '22023'; end if;
  select * into pa from public.participacoes where id = p_participacao for update;
  if not found then raise exception 'participacao_nao_encontrada' using errcode = 'P0002'; end if;
  for k in select jsonb_object_keys(p_dados) loop
    if k not in ('combo_nome', 'combo_descricao', 'combo_proposta', 'itens') then raise exception 'campo_invalido' using errcode = '22023'; end if;
  end loop;
  perform 1 from public.participantes_itens where participacao_id = p_participacao for update;
  atual := public.editorial_editavel(p_participacao);

  -- 1. Conferir que ninguém mudou o que a pessoa leu.
  for k in select x from unnest(array['combo_nome', 'combo_descricao', 'combo_proposta']) x loop
    if p_dados ? k and (atual->k) is distinct from coalesce(p_esperado->k, 'null'::jsonb) then
      raise exception 'versao_desatualizada' using errcode = '40001', detail = atual::text;
    end if;
  end loop;
  if p_dados ? 'itens' then
    if jsonb_typeof(p_dados->'itens') <> 'array' then raise exception 'dados_invalidos' using errcode = '22023'; end if;
    for it in select * from jsonb_array_elements(p_dados->'itens') loop
      select x into it_atual from jsonb_array_elements(atual->'itens') x where x->>'id' = it->>'id';
      if it_atual is null then raise exception 'item_invalido' using errcode = '22023'; end if;
      select x into it_esp from jsonb_array_elements(coalesce(p_esperado->'itens', '[]'::jsonb)) x where x->>'id' = it->>'id';
      if (it ? 'nome' and (it_atual->'nome') is distinct from coalesce(it_esp->'nome', 'null'::jsonb))
         or (it ? 'descricao' and (it_atual->'descricao') is distinct from coalesce(it_esp->'descricao', 'null'::jsonb)) then
        raise exception 'versao_desatualizada' using errcode = '40001', detail = atual::text;
      end if;
    end loop;
  end if;

  -- 2. Validar e gravar, com de/para na auditoria (autor = sessão).
  if p_dados ? 'combo_nome' and char_length(btrim(coalesce(p_dados->>'combo_nome', ''))) > 80 then raise exception 'texto_longo' using errcode = '22023', detail = 'combo_nome'; end if;
  if p_dados ? 'combo_descricao' and char_length(btrim(coalesce(p_dados->>'combo_descricao', ''))) > 400 then raise exception 'texto_longo' using errcode = '22023', detail = 'combo_descricao'; end if;
  if p_dados ? 'combo_proposta' and char_length(btrim(coalesce(p_dados->>'combo_proposta', ''))) > 2000 then raise exception 'texto_longo' using errcode = '22023', detail = 'combo_proposta'; end if;
  for k in select x from unnest(array['combo_nome', 'combo_descricao', 'combo_proposta']) x loop
    if p_dados ? k and nullif(btrim(coalesce(p_dados->>k, '')), '') is distinct from (atual->>k) then
      mudou := mudou || k;
      insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
      values ('combo.editorial', 'participacoes', p_participacao::text, p_participacao,
              jsonb_build_object('campo', k, 'de', atual->>k, 'para', nullif(btrim(coalesce(p_dados->>k, '')), '')));
    end if;
  end loop;
  update public.participacoes set
    combo_nome = case when 'combo_nome' = any(mudou) then nullif(btrim(p_dados->>'combo_nome'), '') else combo_nome end,
    combo_descricao = case when 'combo_descricao' = any(mudou) then nullif(btrim(p_dados->>'combo_descricao'), '') else combo_descricao end,
    combo_proposta = case when 'combo_proposta' = any(mudou) then nullif(btrim(p_dados->>'combo_proposta'), '') else combo_proposta end
   where id = p_participacao and cardinality(mudou) > 0;

  if p_dados ? 'itens' then
    for it in select * from jsonb_array_elements(p_dados->'itens') loop
      select x into it_atual from jsonb_array_elements(atual->'itens') x where x->>'id' = it->>'id';
      v_nome := case when it ? 'nome' then nullif(btrim(coalesce(it->>'nome', '')), '') else it_atual->>'nome' end;
      v_desc := case when it ? 'descricao' then nullif(btrim(coalesce(it->>'descricao', '')), '') else it_atual->>'descricao' end;
      if char_length(coalesce(v_nome, '')) > 80 or char_length(coalesce(v_desc, '')) > 400 then
        raise exception 'texto_longo' using errcode = '22023', detail = 'item';
      end if;
      if (v_nome, v_desc) is distinct from (it_atual->>'nome', it_atual->>'descricao') then
        update public.participantes_itens set nome = v_nome, descricao = v_desc, updated_at = now() where id = (it->>'id')::uuid;
        mudou := mudou || ('item:' || (it_atual->>'tipo'));
        insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
        values ('combo.editorial', 'participantes_itens', it->>'id', p_participacao,
                jsonb_build_object('campo', 'item', 'tipo', it_atual->>'tipo',
                                   'de', jsonb_build_object('nome', it_atual->>'nome', 'descricao', it_atual->>'descricao'),
                                   'para', jsonb_build_object('nome', v_nome, 'descricao', v_desc)));
      end if;
    end loop;
  end if;

  -- 3. Avisar quem aprova (curadoria), agrupando gravações seguidas.
  if cardinality(mudou) > 0 then
    select nome_marca into v_marca from public.participantes where id = pa.participante_id;
    perform public.avisar_quem_pode('curadoria.decidir', 'combo', 'Combo editado: ' || coalesce(v_marca, 'participante'),
      case when pa.combo_status = 'aprovado' then 'Já aprovado — a versão do site não mudou. ' else '' end
        || 'Mudou: ' || (select string_agg(case m when 'combo_nome' then 'nome do combo' when 'combo_descricao' then 'descrição'
                                                when 'combo_proposta' then 'proposta' else replace(m, 'item:', 'componente ') end, ', ')
                           from unnest(mudou) m),
      'marcas/' || pa.participante_id || '/combo', 'combo:' || p_participacao, pa.participante_id);
  end if;
  return public.editorial_ficha(p_secret, p_participacao);
end $$;

-- ── Grants ──────────────────────────────────────────────────────────────────
revoke all on function
  public.redes_listar(text, timestamptz, timestamptz), public.redes_post(text, uuid), public.redes_opcoes(text),
  public.redes_resumo(text), public.redes_criar(text, jsonb), public.redes_salvar(text, uuid, integer, jsonb),
  public.redes_situacao(text, uuid, integer, text, text), public.redes_confirmar(text, uuid, integer, timestamptz, text, text),
  public.redes_desfazer_publicacao(text, uuid, integer, text), public.redes_duplicar(text, uuid),
  public.redes_comentar(text, uuid, text, boolean), public.redes_arquivo_registrar(text, uuid, jsonb, uuid),
  public.redes_arquivo_alt(text, uuid, text), public.redes_arquivos_ordenar(text, uuid, uuid[]),
  public.redes_arquivo_remover(text, uuid), public.social_biblioteca(text, jsonb),
  public.social_biblioteca_registrar(text, jsonb), public.redes_arquivo_associar(text, uuid, text, uuid),
  public.editorial_participantes(text, text), public.editorial_ficha(text, uuid),
  public.editorial_salvar(text, uuid, jsonb, jsonb)
  from public;
grant execute on function
  public.redes_listar(text, timestamptz, timestamptz), public.redes_post(text, uuid), public.redes_opcoes(text),
  public.redes_resumo(text), public.redes_criar(text, jsonb), public.redes_salvar(text, uuid, integer, jsonb),
  public.redes_situacao(text, uuid, integer, text, text), public.redes_confirmar(text, uuid, integer, timestamptz, text, text),
  public.redes_desfazer_publicacao(text, uuid, integer, text), public.redes_duplicar(text, uuid),
  public.redes_comentar(text, uuid, text, boolean), public.redes_arquivo_registrar(text, uuid, jsonb, uuid),
  public.redes_arquivo_alt(text, uuid, text), public.redes_arquivos_ordenar(text, uuid, uuid[]),
  public.redes_arquivo_remover(text, uuid), public.social_biblioteca(text, jsonb),
  public.social_biblioteca_registrar(text, jsonb), public.redes_arquivo_associar(text, uuid, text, uuid),
  public.editorial_participantes(text, text), public.editorial_ficha(text, uuid),
  public.editorial_salvar(text, uuid, jsonb, jsonb)
  to anon, authenticated;
