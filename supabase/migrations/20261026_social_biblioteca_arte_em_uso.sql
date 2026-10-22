-- ─────────────────────────────────────────────────────────────────────────────
-- Social media › Biblioteca: arte em uso não pode aparecer como "Apagada" (21/10/2026, achado da auditoria).
-- Depende de 20261019_social_pastas.sql. Só substitui `social_biblioteca` com a MESMA assinatura e o MESMO
-- retorno; a única mudança é a ordem do `distinct on (a.path)`.
--
-- Bug: a mesma arte (mesmo caminho no Storage) tem uma linha em redes_arquivos por postagem que a usa
-- (`redes_arquivo_associar` cria uma nova). A biblioteca mostra UMA por caminho e escolhia a linha MAIS ANTIGA,
-- mesmo removida — então, ao tirar a arte da primeira postagem (ou apagá-la lá), a biblioteca passava a
-- mostrá-la como "Apagada" e a escondia da lista padrão, embora outra postagem ainda a usasse.
-- Agora a linha escolhida é a mais antiga DENTRE AS NÃO REMOVIDAS; só se todas estiverem removidas ela aparece
-- como removida.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.social_biblioteca(p_secret text, p_filtros jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  f jsonb := coalesce(p_filtros, '{}'::jsonb);
  f_tipo text := nullif(f->>'tipo', '');
  f_ed text := nullif(f->>'edicao', '');
  f_part uuid := nullif(f->>'participante', '')::uuid;
  f_sit text := nullif(f->>'situacao', '');
  f_q text := nullif(btrim(coalesce(f->>'q', '')), '');
  f_pasta text := nullif(f->>'pasta', '');
  f_recentes boolean := coalesce((f->>'recentes')::boolean, false);
  f_ordem text := coalesce(nullif(f->>'ordem', ''), 'recente');
  v_limite int := case when f_recentes then 60 else 300 end;
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  return coalesce((
    with itens as (
      (select distinct on (a.path) jsonb_build_object(
               'tipo', 'arte', 'id', a.id, 'bucket', 'redes', 'path', a.path, 'miniatura_path', a.miniatura_path,
               'nome', a.nome, 'mime', a.mime, 'versao', a.versao::text, 'largura', a.largura, 'altura', a.altura, 'tamanho', a.tamanho,
               'edicao_codigo', coalesce(a.edicao_codigo, p.edicao_codigo),
               'participante_id', coalesce(a.participante_id, p.participante_id),
               'situacao', case when a.removido_em is null then 'disponivel' when a.substituido_por is not null then 'substituida' else 'removida' end,
               'vinculo', coalesce(p.titulo, 'Biblioteca'), 'post_id', p.id,
               'criado_em', a.criado_em, 'criado_por_rotulo', a.criado_por_rotulo, 'criado_por_id', a.criado_por_id) x
        from public.redes_arquivos a left join public.redes_posts p on p.id = a.post_id
       where a.bucket = 'redes'
       order by a.path, (a.removido_em is not null), a.criado_em)
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
               'nome', coalesce(nullif(btrim(l.nome_original), ''), 'Logo'), 'mime', l.mime, 'tamanho', l.tamanho,
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
    ),
    com_pasta as (
      select it.x || jsonb_build_object('participante_nome', pt.nome_marca, 'pasta_id', pi.pasta_id) y
        from itens it
        left join public.participantes pt on pt.id::text = it.x->>'participante_id'
        left join public.social_biblioteca_pasta_item pi on pi.tipo = it.x->>'tipo' and pi.item_id::text = it.x->>'id'
       where (f_tipo is null or it.x->>'tipo' = f_tipo)
         and (f_ed is null or coalesce(it.x->>'edicao_codigo', f_ed) = f_ed)
         and (f_part is null or it.x->>'participante_id' = f_part::text)
         and (f_sit is null
              or (f_sit = 'disponivel' and it.x->>'situacao' not in ('substituida', 'removida', 'recusada', 'anterior'))
              or it.x->>'situacao' = f_sit)
         and (f_q is null or (it.x->>'nome') ilike '%' || f_q || '%' or (it.x->>'vinculo') ilike '%' || f_q || '%'
              or pt.nome_marca ilike '%' || f_q || '%')
         and (f_pasta is null or (f_pasta = 'sem' and pi.pasta_id is null) or pi.pasta_id::text = f_pasta)
    )
    -- O corte é sempre pelos MAIS RECENTES (como antes); a ordem por nome vem depois.
    select jsonb_agg(c.y order by case when f_ordem = 'nome' then lower(c.y->>'nome') end, c.y->>'criado_em' desc)
      from (select y from com_pasta order by y->>'criado_em' desc limit v_limite) c
  ), '[]'::jsonb);
end $$;
