-- ─────────────────────────────────────────────────────────────────────────────
-- Social media › Checklist por postagem (21/10/2026). Spec: docs/superpowers/specs/2026-10-21-social-campanhas-checklist-lembretes-design.md
-- Depende de 20261031_social_campanhas.sql (redes_json e redes_duplicar já trazem a campanha; aqui só acrescentam o checklist).
--
-- O checklist AVISA, não trava: é anotação da equipe (arte conferida, legenda revisada…), não conteúdo aprovado. Por isso marcar,
-- acrescentar e remover item NÃO sobem a `versao` da postagem nem tocam `atualizado_em`, e não desfazem aprovação.
-- Cada postagem recebe, ao nascer, a CÓPIA dos itens ativos do modelo do seu formato; mudar o modelo depois só vale para postagens
-- novas, e mudar o formato da postagem não mexe nos itens dela.
-- Nada se apaga: remover item e substituir o modelo de um formato são remoção lógica (`removido_em`), como no resto do módulo.
-- Permissão: `redes.editar` marca/acrescenta/remove; `redes.gerir` (administrador) edita os modelos; `redes.ver` lê.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.redes_checklist_modelos (
  id uuid primary key default gen_random_uuid(),
  formato text not null check (formato in ('feed', 'carrossel', 'reels', 'story')),
  ordem integer not null default 0,
  texto text not null check (char_length(texto) between 1 and 80),
  ativo boolean not null default true,
  removido_em timestamptz
);
create index redes_checklist_modelos_formato_idx on public.redes_checklist_modelos (formato, ordem);

create table public.redes_checklist_itens (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.redes_posts (id) on delete cascade,
  ordem integer not null default 0,
  texto text not null check (char_length(texto) between 1 and 80),
  feito boolean not null default false,
  feito_por_id uuid,
  feito_por_rotulo text,
  feito_em timestamptz,
  criado_em timestamptz not null default now(),
  removido_em timestamptz
);
create index redes_checklist_itens_post_idx on public.redes_checklist_itens (post_id, ordem);

alter table public.redes_checklist_modelos enable row level security;
alter table public.redes_checklist_itens enable row level security;

create trigger sync_redes_checklist_itens after insert or update or delete on public.redes_checklist_itens
  for each row execute function public.sync_gatilho('redes', 'social', 'post_id');
create trigger sync_redes_checklist_modelos after insert or update or delete on public.redes_checklist_modelos
  for each row execute function public.sync_gatilho('redes', 'social', '');

-- Modelos iniciais (o administrador ajusta depois, no painel).
insert into public.redes_checklist_modelos (formato, ordem, texto)
select f, o, t from (values
  (1, 'Arte conferida (formato, corte, texto sem erro)'), (2, 'Legenda revisada'),
  (3, 'Marcas e menções conferidas'), (4, 'Data e horário confirmados')) comum(o, t)
cross join unnest(array['feed', 'carrossel', 'reels', 'story']) as formatos(f);
insert into public.redes_checklist_modelos (formato, ordem, texto) values
  ('reels', 5, 'Capa definida'), ('reels', 6, 'Áudio escolhido'), ('story', 5, 'Link ou adesivo configurado');

-- ── Auxiliares internos (ninguém de fora executa) ───────────────────────────

create or replace function public.redes_checklist_itens_json(p_post uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(i) order by i.ordem, i.criado_em, i.id), '[]'::jsonb)
    from public.redes_checklist_itens i where i.post_id = p_post and i.removido_em is null
$$;

-- Copia os itens ativos do modelo do formato para a postagem, UMA vez (postagem que já tem itens não recebe de novo).
create or replace function public.redes_checklist_copiar(p_post uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_formato text; n integer;
begin
  select formato into v_formato from public.redes_posts where id = p_post;
  if v_formato is null then return 0; end if;
  -- qualquer linha (inclusive removida) conta: quem tirou todos os itens de propósito não os recebe de volta
  if exists (select 1 from public.redes_checklist_itens where post_id = p_post) then return 0; end if;
  insert into public.redes_checklist_itens (post_id, ordem, texto)
    select p_post, m.ordem, m.texto from public.redes_checklist_modelos m
     where m.formato = v_formato and m.ativo and m.removido_em is null order by m.ordem, m.id;
  get diagnostics n = row_count;
  return n;
end $$;

-- ── RPCs ────────────────────────────────────────────────────────────────────

create or replace function public.redes_checklist_garantir(p_secret text, p_post uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  perform public.redes_post_aberto(p_post);
  perform public.redes_checklist_copiar(p_post);
  return public.redes_checklist_itens_json(p_post);
end $$;

create or replace function public.redes_checklist_marcar(p_secret text, p_item uuid, p_feito boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare i public.redes_checklist_itens; v_feito boolean := coalesce(p_feito, false);
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  select * into i from public.redes_checklist_itens where id = p_item and removido_em is null;
  if not found then raise exception 'item_nao_encontrado' using errcode = 'P0002'; end if;
  perform public.redes_post_aberto(i.post_id);
  update public.redes_checklist_itens set
    feito = v_feito,
    feito_por_id = case when v_feito then auth.uid() end,
    feito_por_rotulo = case when v_feito then public.ator_rotulo_atual() end,
    feito_em = case when v_feito then now() end
  where id = p_item returning * into i;
  return to_jsonb(i);
end $$;

create or replace function public.redes_checklist_item_salvar(p_secret text, p_post uuid, p_texto text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare i public.redes_checklist_itens; v_texto text := btrim(coalesce(p_texto, '')); n integer; mx integer;
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  perform public.redes_post_aberto(p_post);
  if v_texto = '' then raise exception 'texto_vazio' using errcode = '22023'; end if;
  if char_length(v_texto) > 80 then raise exception 'texto_longo' using errcode = '22023'; end if;
  select count(*) filter (where removido_em is null), coalesce(max(ordem), 0) into n, mx from public.redes_checklist_itens where post_id = p_post;
  if n >= 30 then raise exception 'checklist_cheio' using errcode = '22023'; end if;
  insert into public.redes_checklist_itens (post_id, ordem, texto) values (p_post, mx + 1, v_texto) returning * into i;
  return to_jsonb(i);
end $$;

create or replace function public.redes_checklist_item_remover(p_secret text, p_item uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare i public.redes_checklist_itens;
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  select * into i from public.redes_checklist_itens where id = p_item and removido_em is null;
  if not found then raise exception 'item_nao_encontrado' using errcode = 'P0002'; end if;
  perform public.redes_post_aberto(i.post_id);
  update public.redes_checklist_itens set removido_em = now() where id = p_item;
  return jsonb_build_object('ok', true, 'id', p_item);
end $$;

create or replace function public.redes_checklist_modelos_listar(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  return coalesce((select jsonb_agg(to_jsonb(m) order by m.formato, m.ordem, m.id) from public.redes_checklist_modelos m where m.removido_em is null), '[]'::jsonb);
end $$;

-- Substitui a lista do formato (só vale para postagens NOVAS). p_itens = [{ texto, ativo? }, …] na ordem desejada.
create or replace function public.redes_checklist_modelo_salvar(p_secret text, p_formato text, p_itens jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare x jsonb; k integer := 0; v_texto text;
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  if p_formato is null or p_formato not in ('feed', 'carrossel', 'reels', 'story') then raise exception 'formato_invalido' using errcode = '22023'; end if;
  if jsonb_typeof(p_itens) <> 'array' then raise exception 'dados_invalidos' using errcode = '22023'; end if;
  if jsonb_array_length(p_itens) > 20 then raise exception 'checklist_cheio' using errcode = '22023'; end if;
  for x in select * from jsonb_array_elements(p_itens) loop
    v_texto := btrim(coalesce(x->>'texto', ''));
    if v_texto = '' then raise exception 'texto_vazio' using errcode = '22023'; end if;
    if char_length(v_texto) > 80 then raise exception 'texto_longo' using errcode = '22023'; end if;
  end loop;
  update public.redes_checklist_modelos set removido_em = now() where formato = p_formato and removido_em is null;
  for x in select * from jsonb_array_elements(p_itens) loop
    k := k + 1;
    insert into public.redes_checklist_modelos (formato, ordem, texto, ativo)
    values (p_formato, k, btrim(x->>'texto'), coalesce((x->>'ativo')::boolean, true));
  end loop;
  return coalesce((select jsonb_agg(to_jsonb(m) order by m.ordem, m.id) from public.redes_checklist_modelos m where m.formato = p_formato and m.removido_em is null), '[]'::jsonb);
end $$;

-- ── Funções existentes, com o checklist ─────────────────────────────────────

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
    'checklist_total', (select count(*) from public.redes_checklist_itens k where k.post_id = p.id and k.removido_em is null),
    'checklist_feitos', (select count(*) from public.redes_checklist_itens k where k.post_id = p.id and k.removido_em is null and k.feito),
    'pendencias', to_jsonb(public.redes_pendencias(p.id))
  )
$$;

create or replace function public.redes_post(p_secret text, p_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
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
    'checklist', public.redes_checklist_itens_json(p_id),
    'conflitos', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'titulo', o.titulo, 'programado_para', o.programado_para))
                             from public.redes_posts o
                            where p.programado_para is not null and o.id <> p.id and o.perfil = p.perfil
                              and o.situacao <> 'cancelado'
                              and abs(extract(epoch from (o.programado_para - p.programado_para))) < 1800), '[]'::jsonb),
    'agora', now(),
    'eu', auth.uid());
end $$;

create or replace function public.redes_criar(p_secret text, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
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
  perform public.redes_checklist_copiar(p.id);
  perform public.redes_registrar(p.id, 'criado', jsonb_build_object('titulo', p.titulo, 'formato', p.formato));
  if p.responsavel_id is not null then
    perform public.redes_avisar(p.id, 'atribuido', 'Post atribuído a você: ' || p.titulo, public.redes_texto_atribuido(p));
  end if;
  return public.redes_json(p);
end $$;

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
  perform public.redes_checklist_copiar(novo);
  perform public.redes_registrar(novo, 'duplicado', jsonb_build_object('de', o.id, 'titulo', o.titulo));
  return public.redes_json(p);
end $$;

-- Permissões: as de uso do painel como as outras `redes_*`; os auxiliares, ninguém de fora.
revoke execute on function public.redes_checklist_garantir(text, uuid), public.redes_checklist_marcar(text, uuid, boolean),
  public.redes_checklist_item_salvar(text, uuid, text), public.redes_checklist_item_remover(text, uuid),
  public.redes_checklist_modelos_listar(text), public.redes_checklist_modelo_salvar(text, text, jsonb) from public;
grant execute on function public.redes_checklist_garantir(text, uuid), public.redes_checklist_marcar(text, uuid, boolean),
  public.redes_checklist_item_salvar(text, uuid, text), public.redes_checklist_item_remover(text, uuid),
  public.redes_checklist_modelos_listar(text), public.redes_checklist_modelo_salvar(text, text, jsonb) to anon, authenticated;
revoke execute on function public.redes_checklist_itens_json(uuid), public.redes_checklist_copiar(uuid) from public, anon, authenticated;
