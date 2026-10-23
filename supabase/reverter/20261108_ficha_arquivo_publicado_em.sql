-- Reverte 20261108_ficha_arquivo_publicado_em: volta a ficha ao que era (arquivos sem `publicado_em`).
create or replace function public.get_ficha_participacao(p_secret text, p_participacao uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v jsonb; v_part uuid;
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;

  select participante_id into v_part from public.participacoes where id = p_participacao;
  if v_part is null then return null; end if;

  select jsonb_build_object(
    'marca', (select to_jsonb(p) from public.participantes p where p.id = v_part),
    'participacao', (select to_jsonb(pa) from public.participacoes pa where pa.id = p_participacao),
    'itens', coalesce((
      select jsonb_agg(to_jsonb(i) order by array_position(array['doce','salgado','bebida'], i.tipo))
        from public.participantes_itens i where i.participacao_id = p_participacao), '[]'::jsonb),
    'unidades', coalesce((
      select jsonb_agg(to_jsonb(u) order by u.ordem)
        from public.participacao_unidades u where u.participacao_id = p_participacao), '[]'::jsonb),
    'solicitacoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'titulo', s.titulo, 'texto', s.texto, 'bloco', s.bloco,
               'escopo', s.escopo, 'prazo_em', s.prazo_em, 'publicada_em', s.publicada_em,
               'arquivada', s.arquivada,
               'estado', coalesce(e.estado, 'pendente'), 'respondido_em', e.respondido_em)
             order by s.prazo_em nulls last)
        from public.solicitacoes s
        left join public.solicitacao_estado e
               on e.solicitacao_id = s.id and e.participacao_id = p_participacao
       where s.publicada_em is not null and not s.arquivada
         and (s.participacao_id = p_participacao or s.escopo = 'geral')), '[]'::jsonb),
    'arquivos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'nome', a.nome, 'escopo', a.escopo, 'versao', a.versao,
               'path', a.path, 'exige_leitura', a.exige_leitura,
               'lido_em', l.lido_em) order by a.created_at desc)
        from public.arquivos a
        left join public.arquivo_leitura l
               on l.arquivo_id = a.id and l.participacao_id = p_participacao
       where a.publicado_em is not null and not a.arquivado
         and (a.participacao_id = p_participacao or a.escopo = 'geral')), '[]'::jsonb),
    'sessoes', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.data_hora desc)
        from public.sessoes_fotos f
       where f.participacao_id = p_participacao or f.participante_id = v_part), '[]'::jsonb),
    'vendas', coalesce((
      select jsonb_agg(jsonb_build_object('dia', v.dia, 'quantidade', v.quantidade) order by v.dia desc)
        from public.vendas_diarias v where v.participacao_id = p_participacao), '[]'::jsonb),
    'edicoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'edicao_codigo', t.edicao_codigo,
               'status_cadastro', t.status_cadastro, 'tema_combo', t.tema_combo)
             order by t.created_at desc)
        from public.participacoes t where t.participante_id = v_part), '[]'::jsonb)
  ) into v;

  return v;
end;
$function$;
