-- ─────────────────────────────────────────────────────────────────────────────
-- Social media: dois defeitos da auditoria de 21/10/2026. Só substitui `redes_salvar` e `redes_resumo`
-- (mesma assinatura e mesmo retorno; uma condição cada).
--
-- 1) redes_salvar conferia o responsável a CADA gravação, mesmo sem ele ter mudado. Se o administrador redefine
--    a senha de quem é responsável por uma postagem (`deve_trocar_senha`), `pode_por_user` passa a dizer que ela
--    não pode editar — e TODO salvamento da legenda dessa postagem falhava com `responsavel_invalido`, por qualquer
--    pessoa, com a mensagem "não trabalha com redes". Agora só se confere quando o responsável MUDA.
-- 2) redes_resumo.proximos_itens (única coisa da Visão geral para a função Social media) não tinha limite
--    inferior: com 5 ou mais postagens atrasadas, só os 5 atrasados mais antigos apareciam e nenhuma futura.
--    "Próximos itens" passa a ser de agora em diante (os atrasados já têm contador e atalho próprios).
-- ─────────────────────────────────────────────────────────────────────────────

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
          from (select * from abertos where programado_para >= now() and programado_para < now() + interval '7 days'
                 order by programado_para limit 5) x
      ), '[]'::jsonb))
  );
end $$;
