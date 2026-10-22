-- ─────────────────────────────────────────────────────────────────────────────
-- Social media › Campanhas (21/10/2026). Spec: docs/superpowers/specs/2026-10-21-social-campanhas-checklist-lembretes-design.md
--
-- Uma campanha por postagem (ou nenhuma). Só ACRESCENTA: tabela `redes_campanhas`, coluna `redes_posts.campanha_id` e três RPCs;
-- as funções que já existiam (`redes_aplicar`, `redes_gravar`, `redes_json`, `redes_duplicar`, `redes_salvar`) mantêm assinatura e
-- retorno e ganham só o que a campanha precisa. Campanha nunca é apagada: arquiva e restaura.
-- Permissão: `redes.editar` cria, edita e arquiva; `redes.ver` lê. Mudar a campanha NÃO desfaz aprovação (como horário e responsável).
-- ─────────────────────────────────────────────────────────────────────────────

create table public.redes_campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 60),
  -- as mesmas chaves da paleta da pasta (social_pastas_cor_check) — nunca cor livre
  cor text not null default 'amarelo' check (cor in ('amarelo', 'laranja', 'magenta', 'roxo', 'cyan', 'verde', 'marrom')),
  descricao text not null default '' check (char_length(descricao) <= 300),
  inicio date,
  fim date,
  meta integer check (meta is null or meta >= 0),
  arquivada boolean not null default false,
  criado_por_id uuid,
  criado_por_rotulo text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint redes_campanhas_periodo check (inicio is null or fim is null or fim >= inicio)
);
alter table public.redes_campanhas enable row level security;
-- nome único entre as não arquivadas, sem diferenciar maiúscula
create unique index redes_campanhas_nome_ativo on public.redes_campanhas (lower(nome)) where not arquivada;

alter table public.redes_posts add column campanha_id uuid references public.redes_campanhas (id);
create index redes_posts_campanha_idx on public.redes_posts (campanha_id) where campanha_id is not null;

create trigger sync_redes_campanhas after insert or update or delete on public.redes_campanhas
  for each row execute function public.sync_gatilho('redes', 'social', 'id');

-- ── RPCs ────────────────────────────────────────────────────────────────────

create or replace function public.redes_campanhas_listar(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  return coalesce((
    select jsonb_agg(to_jsonb(c) || jsonb_build_object(
             'n_total', x.total, 'n_publicadas', x.publicadas, 'n_abertas', x.abertas, 'n_atrasadas', x.atrasadas)
           order by c.arquivada, c.inicio nulls last, lower(c.nome))
      from public.redes_campanhas c
      cross join lateral (
        select count(*) filter (where p.situacao <> 'cancelado') total,
               count(*) filter (where p.situacao = 'publicado') publicadas,
               count(*) filter (where p.situacao not in ('publicado', 'cancelado')) abertas,
               count(*) filter (where p.situacao not in ('publicado', 'cancelado') and p.programado_para < now()) atrasadas
          from public.redes_posts p where p.campanha_id = c.id) x
  ), '[]'::jsonb);
end $$;

create or replace function public.redes_campanha_salvar(p_secret text, p_id uuid, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_nome text; v_cor text; v_desc text; v_ini date; v_fim date; v_meta integer;
  c public.redes_campanhas;
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  if jsonb_typeof(p_dados) <> 'object' then raise exception 'dados_invalidos' using errcode = '22023'; end if;

  if p_id is null then
    v_nome := ''; v_cor := 'amarelo'; v_desc := ''; v_ini := null; v_fim := null; v_meta := null;
  else
    select * into c from public.redes_campanhas where id = p_id for update;
    if not found then raise exception 'campanha_nao_encontrada' using errcode = 'P0002'; end if;
    v_nome := c.nome; v_cor := c.cor; v_desc := c.descricao; v_ini := c.inicio; v_fim := c.fim; v_meta := c.meta;
  end if;

  if p_dados ? 'nome' then v_nome := btrim(coalesce(p_dados->>'nome', '')); end if;
  if p_dados ? 'cor' then v_cor := coalesce(p_dados->>'cor', ''); end if;
  if p_dados ? 'descricao' then v_desc := btrim(coalesce(p_dados->>'descricao', '')); end if;
  begin
    if p_dados ? 'inicio' then v_ini := nullif(p_dados->>'inicio', '')::date; end if;
    if p_dados ? 'fim' then v_fim := nullif(p_dados->>'fim', '')::date; end if;
  exception when others then raise exception 'periodo_invalido' using errcode = '22023'; end;
  begin
    if p_dados ? 'meta' then v_meta := nullif(p_dados->>'meta', '')::integer; end if;
  exception when others then raise exception 'meta_invalida' using errcode = '22023'; end;

  if v_nome = '' then raise exception 'nome_obrigatorio' using errcode = '22023'; end if;
  if char_length(v_nome) > 60 then raise exception 'nome_longo' using errcode = '22023'; end if;
  if v_cor not in ('amarelo', 'laranja', 'magenta', 'roxo', 'cyan', 'verde', 'marrom') then raise exception 'cor_invalida' using errcode = '22023'; end if;
  if char_length(v_desc) > 300 then raise exception 'descricao_longa' using errcode = '22023'; end if;
  if v_ini is not null and v_fim is not null and v_fim < v_ini then raise exception 'periodo_invalido' using errcode = '22023'; end if;
  if v_meta is not null and v_meta < 0 then raise exception 'meta_invalida' using errcode = '22023'; end if;

  begin
    if p_id is null then
      insert into public.redes_campanhas (nome, cor, descricao, inicio, fim, meta, criado_por_id, criado_por_rotulo)
      values (v_nome, v_cor, v_desc, v_ini, v_fim, v_meta, auth.uid(), public.ator_rotulo_atual())
      returning * into c;
    else
      update public.redes_campanhas
         set nome = v_nome, cor = v_cor, descricao = v_desc, inicio = v_ini, fim = v_fim, meta = v_meta, atualizado_em = now()
       where id = p_id returning * into c;
    end if;
  exception when unique_violation then raise exception 'nome_repetido' using errcode = '23505'; end;
  return to_jsonb(c);
end $$;

create or replace function public.redes_campanha_arquivar(p_secret text, p_id uuid, p_arquivar boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.redes_campanhas;
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  begin
    update public.redes_campanhas set arquivada = coalesce(p_arquivar, true), atualizado_em = now()
     where id = p_id returning * into c;
  exception when unique_violation then raise exception 'nome_repetido' using errcode = '23505'; end;
  if not found then raise exception 'campanha_nao_encontrada' using errcode = 'P0002'; end if;
  return to_jsonb(c);
end $$;

-- ── Funções existentes, com a campanha ──────────────────────────────────────

create or replace function public.redes_aplicar(p redes_posts, d jsonb)
returns redes_posts language plpgsql stable security definer set search_path to 'public' as $$
declare v_camp uuid;
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
  if d ? 'campanha_id' then
    v_camp := nullif(d->>'campanha_id', '')::uuid;
    -- escolher outra campanha exige que ela exista e esteja ativa; a que a postagem já tem (mesmo arquivada) segue valendo
    if v_camp is not null and v_camp is distinct from p.campanha_id
       and not exists (select 1 from public.redes_campanhas c where c.id = v_camp and not c.arquivada) then
      raise exception 'campanha_invalida' using errcode = '22023';
    end if;
    p.campanha_id := v_camp;
  end if;
  return p;
end $$;

create or replace function public.redes_gravar(p redes_posts)
returns redes_posts language plpgsql security definer set search_path to 'public' as $$
declare r public.redes_posts;
begin
  update public.redes_posts set
    titulo = p.titulo, perfil = p.perfil, edicao_codigo = p.edicao_codigo, participante_id = p.participante_id,
    formato = p.formato, legenda = p.legenda, mencoes = p.mencoes, observacoes = p.observacoes,
    referencias = p.referencias, programado_para = p.programado_para, responsavel_id = p.responsavel_id,
    campanha_id = p.campanha_id,
    versao = versao + 1, atualizado_em = now(), atualizado_por_id = auth.uid(), atualizado_por_rotulo = public.ator_rotulo_atual()
  where id = p.id returning * into r;
  return r;
end $$;

create or replace function public.redes_json(p redes_posts)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select to_jsonb(p) || jsonb_build_object(
    'responsavel_nome', (select coalesce(nullif(btrim(pf.nome), ''), 'Conta sem nome') from public.perfis pf where pf.user_id = p.responsavel_id),
    'participante_nome', (select pa.nome_marca from public.participantes pa where pa.id = p.participante_id),
    'campanha_nome', (select c.nome from public.redes_campanhas c where c.id = p.campanha_id),
    'campanha_cor', (select c.cor from public.redes_campanhas c where c.id = p.campanha_id),
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

create or replace function public.redes_duplicar(p_secret text, p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  o public.redes_posts;
  novo uuid := gen_random_uuid();
  p public.redes_posts;
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  select * into o from public.redes_posts where id = p_id;
  if not found then raise exception 'post_inexistente' using errcode = 'P0002'; end if;
  insert into public.redes_posts (id, titulo, perfil, edicao_codigo, participante_id, formato, legenda, mencoes,
    observacoes, referencias, responsavel_id, campanha_id, situacao, duplicado_de, criado_por_id, criado_por_rotulo,
    atualizado_por_id, atualizado_por_rotulo)
  values (novo, left('Cópia de ' || o.titulo, 120), o.perfil, o.edicao_codigo, o.participante_id, o.formato, o.legenda,
    o.mencoes, o.observacoes, o.referencias, o.responsavel_id, o.campanha_id, 'rascunho', o.id,
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

-- redes_salvar = a de 20261028 + campanha nas duas comparações e no histórico. NÃO entra na tupla de redes_rever_etapa:
-- trocar a campanha não desfaz aprovação.
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
  if p.responsavel_id is distinct from antes.responsavel_id then perform public.redes_conferir_responsavel(p.responsavel_id); end if;
  p := public.redes_gravar(p);
  perform public.redes_rever_etapa(p.id,
    (p.legenda, p.mencoes, p.formato) is distinct from (antes.legenda, antes.mencoes, antes.formato), 'conteudo');
  select * into p from public.redes_posts where id = p_id;

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
      perform public.avisar_pessoa(p.responsavel_id, 'redes', 'Post atribuído a você: ' || p.titulo,
        public.redes_texto_atribuido(p), 'social/planejamento/' || p.id, 'redes:' || p.id || ':atribuido', p.participante_id);
    end if;
  end if;
  if p.legenda is distinct from antes.legenda then
    perform public.redes_registrar(p.id, 'legenda', jsonb_build_object('caracteres_antes', char_length(antes.legenda), 'caracteres', char_length(p.legenda)));
    perform public.redes_avisar(p.id, 'legenda', 'Legenda atualizada: ' || p.titulo,
      left(coalesce(nullif(btrim(p.legenda), ''), '(legenda apagada)'), 200));
  end if;
  if (p.titulo, p.perfil, p.edicao_codigo, p.participante_id, p.formato, p.mencoes, p.observacoes, p.referencias, p.campanha_id)
     is distinct from (antes.titulo, antes.perfil, antes.edicao_codigo, antes.participante_id, antes.formato, antes.mencoes, antes.observacoes, antes.referencias, antes.campanha_id) then
    perform public.redes_registrar(p.id, 'conteudo', jsonb_build_object('campos', (
      select coalesce(jsonb_agg(k), '[]'::jsonb) from (values
        ('titulo', p.titulo is distinct from antes.titulo), ('perfil', p.perfil is distinct from antes.perfil),
        ('edicao', p.edicao_codigo is distinct from antes.edicao_codigo), ('participante', p.participante_id is distinct from antes.participante_id),
        ('formato', p.formato is distinct from antes.formato), ('mencoes', p.mencoes is distinct from antes.mencoes),
        ('observacoes', p.observacoes is distinct from antes.observacoes), ('referencias', p.referencias is distinct from antes.referencias),
        ('campanha', p.campanha_id is distinct from antes.campanha_id)) v(k, mudou)
      where mudou)));
  end if;
  return public.redes_json(p);
end $$;
