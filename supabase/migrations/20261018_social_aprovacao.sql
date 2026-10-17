-- ─────────────────────────────────────────────────────────────────────────────
-- Social media: etapa de APROVAÇÃO (18/10/2026, pedido do Wilker: "a Eline
-- aprova antes de ir para o Instagram"). Depende de 20261017_social_media.sql.
--
-- Fluxo novo (o que o painel mostra):
--   Rascunho → Aguardando aprovação → Aprovado → Publicado
--   · "Enviar para aprovação" (redes.editar) exige as pendências do formato.
--   · "Aprovar" (redes.aprovar) leva a "pronto" — o valor gravado continua
--     'pronto'; o rótulo do painel passa a ser "Aprovado".
--   · "Pedir ajuste" (comentário de ajuste) devolve para rascunho.
--   · Mudou legenda, menções, formato ou arte DEPOIS de aprovado, e quem mudou
--     não aprova → volta para "Aguardando aprovação" (a Eline vê de novo).
--   · Confirmar publicação continua exigindo 'pronto' (= aprovado).
--   · 'preparacao' sai do fluxo (nenhuma linha usa; fica no CHECK só para não
--     quebrar leitura antiga).
--
-- Quem aprova: quem tem `redes.aprovar` (Administrador). O AVISO de "aguardando
-- aprovação" vai só para `admin_config.redes_aprovadores` (Eline); vazio →
-- todos com redes.aprovar.
--
-- Cancelar: além de redes.gerir, quem CRIOU a postagem cancela a própria
-- enquanto ela não foi aprovada (antes, a Social media ficava sem saída).
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.permissoes (funcao, acao) values ('administrador', 'redes.aprovar') on conflict do nothing;

alter table public.admin_config add column if not exists redes_aprovadores uuid[] not null default '{}';
update public.admin_config set redes_aprovadores = array['b90e48d5-0177-4b61-87a8-85a801b751b3']::uuid[]
 where redes_aprovadores = '{}' and exists (select 1 from public.perfis where user_id = 'b90e48d5-0177-4b61-87a8-85a801b751b3');

alter table public.redes_posts drop constraint if exists redes_posts_situacao_check;
alter table public.redes_posts add constraint redes_posts_situacao_check
  check (situacao in ('rascunho', 'preparacao', 'aprovacao', 'pronto', 'publicado', 'cancelado'));

-- Quem recebe o aviso de "aguardando aprovação".
create or replace function public.redes_aprovadores()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(
    (select array_agg(u) from unnest((select redes_aprovadores from public.admin_config limit 1)) u
      where public.pode_por_user(u, 'redes.aprovar')),
    (select array_agg(pf.user_id) from public.perfis pf
      where pf.papel = 'organizacao' and pf.ativo and public.pode_por_user(pf.user_id, 'redes.aprovar')),
    '{}'::uuid[])
$$;
revoke all on function public.redes_aprovadores() from public, anon, authenticated;

create or replace function public.redes_avisar_aprovadores(p_post uuid, p_titulo text, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.redes_posts; u uuid;
begin
  select * into p from public.redes_posts where id = p_post;
  if not found then return; end if;
  foreach u in array public.redes_aprovadores() loop
    perform public.avisar_pessoa(u, 'redes', p_titulo, p_texto, 'social/planejamento/' || p_post,
                                 'redes:' || p_post || ':aprovacao', p.participante_id);
  end loop;
end $$;
revoke all on function public.redes_avisar_aprovadores(uuid, text, text) from public, anon, authenticated;

/*
 * Volta de etapa quando algo muda (chamada pelas gravações de conteúdo e de
 * arquivo). Sem requisito → rascunho. Aprovado e alterado por quem não aprova
 * → aguardando aprovação de novo.
 */
create or replace function public.redes_rever_etapa(p_post uuid, p_conteudo_mudou boolean, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.redes_posts;
begin
  select * into p from public.redes_posts where id = p_post;
  if not found or p.situacao not in ('aprovacao', 'pronto', 'preparacao') then return; end if;
  if exists (select 1 from unnest(public.redes_pendencias(p_post)) x where x <> 'atrasada') then
    update public.redes_posts set situacao = 'rascunho', versao = versao + 1 where id = p_post;
    perform public.redes_registrar(p_post, 'situacao', jsonb_build_object('de', p.situacao, 'para', 'rascunho', 'motivo', 'requisitos'));
  elsif p.situacao = 'pronto' and p_conteudo_mudou and not public.pode_por_user(auth.uid(), 'redes.aprovar') then
    update public.redes_posts set situacao = 'aprovacao', versao = versao + 1 where id = p_post;
    perform public.redes_registrar(p_post, 'situacao', jsonb_build_object('de', 'pronto', 'para', 'aprovacao', 'motivo', p_motivo));
    perform public.redes_avisar_aprovadores(p_post, 'Alterada depois de aprovada: ' || p.titulo, 'Confira de novo antes de publicar.');
  end if;
end $$;
revoke all on function public.redes_rever_etapa(uuid, boolean, text) from public, anon, authenticated;

-- As gravações de arquivo chamam esta (registrar, remover, associar e, abaixo,
-- ordenar): trocar ou reordenar a arte de um aprovado pede nova aprovação.
-- Texto alternativo não (não muda o que vai ao ar).
create or replace function public.redes_rever_pronto(p_post uuid)
returns void language sql security definer set search_path = public as $$
  select public.redes_rever_etapa(p_post, true, 'arquivos')
$$;
revoke all on function public.redes_rever_pronto(uuid) from public, anon, authenticated;

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
 * Etapas: rascunho ⇄ aguardando aprovação (redes.editar) → aprovado
 * (redes.aprovar). Cancelar: redes.gerir, ou quem criou enquanto não aprovado.
 * Reabrir cancelada: redes.gerir. "Publicado" só por redes_confirmar.
 */
create or replace function public.redes_situacao(p_secret text, p_id uuid, p_versao integer, p_situacao text, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.redes_posts;
  pend text[];
  motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if p_situacao not in ('rascunho', 'aprovacao', 'pronto', 'cancelado') then raise exception 'situacao_invalida' using errcode = '22023'; end if;
  perform public.redes_exigir(p_secret, case when p_situacao = 'pronto' then 'redes.aprovar' else 'redes.editar' end);
  p := public.redes_travar(p_id, p_versao);
  if p.situacao = p_situacao then return public.redes_json(p); end if;
  if p.situacao = 'publicado' then raise exception 'post_fechado' using errcode = '55000'; end if;
  if p.situacao = 'cancelado' then perform public.redes_exigir(p_secret, 'redes.gerir'); end if;
  if p_situacao = 'cancelado' and not public.pode(p_secret, 'redes.gerir')
     and not (p.criado_por_id is not distinct from auth.uid() and auth.uid() is not null and p.situacao in ('rascunho', 'preparacao', 'aprovacao')) then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;
  if p_situacao in ('aprovacao', 'pronto') then
    select array_agg(x) into pend from unnest(public.redes_pendencias(p_id)) x where x <> 'atrasada';
    if pend is not null then
      raise exception 'requisitos_pendentes' using errcode = '23514', detail = array_to_string(pend, ',');
    end if;
  end if;
  update public.redes_posts set
    situacao = p_situacao,
    cancelado_em = case when p_situacao = 'cancelado' then now() else null end,
    motivo_cancelamento = case when p_situacao = 'cancelado' then motivo else null end,
    versao = versao + 1, atualizado_em = now(), atualizado_por_id = auth.uid(), atualizado_por_rotulo = public.ator_rotulo_atual()
  where id = p_id;
  perform public.redes_registrar(p_id,
    case when p_situacao = 'cancelado' then 'cancelado' when p.situacao = 'cancelado' then 'reaberto' else 'situacao' end,
    jsonb_build_object('de', p.situacao, 'para', p_situacao, 'motivo', motivo));
  if p_situacao = 'aprovacao' then
    perform public.redes_avisar_aprovadores(p_id, 'Aguardando sua aprovação: ' || p.titulo,
      public.redes_data_texto(p.programado_para) || ' · ' || p.perfil);
  elsif p_situacao = 'pronto' then
    perform public.redes_avisar(p_id, 'pronto', 'Aprovado: ' || p.titulo, 'Pode publicar ' || public.redes_data_texto(p.programado_para) || ' · ' || p.perfil);
  elsif p_situacao = 'cancelado' then
    perform public.redes_avisar(p_id, 'cancelado', 'Post cancelado: ' || p.titulo, coalesce(motivo, 'Sem motivo informado'));
  end if;
  select * into p from public.redes_posts where id = p_id;
  return public.redes_json(p);
end $$;

-- Pedido de ajuste devolve para rascunho (quem aprova "reprova com motivo").
-- ⚠️ Não mexe em atualizado_em: o selo "Ajuste pedido" compara o comentário
-- com a última alteração (redes_json.ajuste_aberto).
create or replace function public.redes_comentar(p_secret text, p_post uuid, p_corpo text, p_ajuste boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.redes_comentarios; p public.redes_posts;
begin
  perform public.redes_exigir(p_secret, 'redes.editar');
  if nullif(btrim(coalesce(p_corpo, '')), '') is null then raise exception 'texto_vazio' using errcode = '22023'; end if;
  select * into p from public.redes_posts where id = p_post for update;
  if not found then raise exception 'post_inexistente' using errcode = 'P0002'; end if;
  insert into public.redes_comentarios (post_id, autor_id, autor_rotulo, corpo, ajuste)
  values (p_post, auth.uid(), public.ator_rotulo_atual(), btrim(p_corpo), coalesce(p_ajuste, false)) returning * into c;
  if c.ajuste then
    perform public.redes_registrar(p_post, 'ajuste', jsonb_build_object('texto', left(c.corpo, 200)));
    if p.situacao in ('aprovacao', 'pronto', 'preparacao') then
      update public.redes_posts set situacao = 'rascunho', versao = versao + 1 where id = p_post;
      perform public.redes_registrar(p_post, 'situacao', jsonb_build_object('de', p.situacao, 'para', 'rascunho', 'motivo', 'ajuste'));
    end if;
    perform public.redes_avisar(p_post, 'ajuste', 'Pedido de ajuste: ' || p.titulo, left(c.corpo, 200));
  else
    perform public.redes_avisar(p_post, 'comentario', 'Comentário em: ' || p.titulo, left(c.corpo, 200));
  end if;
  return to_jsonb(c);
end $$;

-- Opções: + quem aprova (nome, para a tela dizer "aguardando a Eline").
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
    'aprovadores', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', pf.user_id, 'nome', coalesce(nullif(btrim(pf.nome), ''), 'Conta sem nome')) order by pf.nome)
        from public.perfis pf where pf.user_id = any (public.redes_aprovadores())
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

-- Resumo: os números dos atalhos contados em TODAS as postagens abertas (não
-- só no mês aberto na tela) — o planejamento e a Visão geral leem daqui.
create or replace function public.redes_resumo(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Fortaleza')::date;
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  return (
    with abertos as (
      select p.*, public.redes_pendencias(p.id) pend,
             exists (select 1 from public.redes_comentarios c where c.post_id = p.id and c.ajuste and c.criado_em > p.atualizado_em) ajuste
        from public.redes_posts p where situacao not in ('publicado', 'cancelado')
    )
    select jsonb_build_object(
      'agora', now(),
      'hoje', (select count(*) from abertos where (programado_para at time zone 'America/Fortaleza')::date = hoje),
      'proximas', (select count(*) from abertos where programado_para >= now() and programado_para < now() + interval '7 days'),
      'atrasadas', (select count(*) from abertos where programado_para < now()),
      'minhas', case when auth.uid() is null then null else (select count(*) from abertos where responsavel_id = auth.uid()) end,
      'sem_responsavel', (select count(*) from abertos where responsavel_id is null),
      'sem_data', (select count(*) from abertos where programado_para is null),
      'sem_arte', (select count(*) from abertos where 'sem_arte' = any (pend)),
      'sem_legenda', (select count(*) from abertos where 'sem_legenda' = any (pend)),
      'aprovacao', (select count(*) from abertos where situacao = 'aprovacao'),
      'aprovadas', (select count(*) from abertos where situacao = 'pronto'),
      'ajuste', (select count(*) from abertos where ajuste),
      'proximos_itens', coalesce((
        select jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo, 'formato', formato, 'programado_para', programado_para, 'situacao', situacao) order by programado_para)
          from (select * from abertos where programado_para is not null and programado_para < now() + interval '7 days'
                 order by programado_para limit 5) x
      ), '[]'::jsonb))
  );
end $$;

-- A lista traz, além da janela pedida, TODA postagem aberta (com ou sem data):
-- o número dos atalhos (redes_resumo, todas as abertas) e a lista que o atalho
-- abre têm de ser a mesma conta — senão uma postagem a 40 dias contava e não
-- aparecia. As telas de calendário continuam filtrando pelo período na tela.
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
          or p.situacao not in ('publicado', 'cancelado')
    ), '[]'::jsonb));
end $$;

-- Reordenar o carrossel é mudar o que vai ao ar: aprovado volta para aprovação.
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
  perform public.redes_rever_pronto(p_post);
end $$;
