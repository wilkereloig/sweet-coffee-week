-- Site público: delivery aparece quando a unidade faz delivery (faz_delivery), não só quando o combo vai por delivery.
-- Antes: modos.delivery e canais/regioes/taxa só saíam com delivery_combo = 'sim'. Painel liga os dois campos separados,
-- então Sabor de Pão (faz_delivery + WhatsApp, combo "nao") ficava sem delivery no site. Aplicada via MCP em 07/11/2026.
-- Única diferença para a versão anterior de montar_publico_base: as 4 condições de delivery no bloco 'combo'.

create or replace function public.montar_publico_base(p_participacao uuid, p_nivel text default 'marca_e_combo')
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_pa public.participacoes%rowtype; v_p public.participantes%rowtype; v_e public.edicoes%rowtype;
  v_logo text; v_unidades jsonb; v_itens jsonb; v_fotos jsonb; v_combo jsonb := null;
  v_com_combo boolean := p_nivel = 'marca_e_combo';
begin
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then return null; end if;
  select * into v_p from public.participantes where id = v_pa.participante_id;
  select * into v_e from public.edicoes where codigo = v_pa.edicao_codigo;
  select path into v_logo from public.logos_marca where id = coalesce(v_pa.logo_id, v_p.logo_id);

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'id', pu.id_publico,
           'nome', u.nome_unidade,
           'endereco', jsonb_strip_nulls(jsonb_build_object(
              'logradouro', coalesce(u.logradouro, pu.endereco), 'numero', u.numero, 'complemento', u.complemento,
              'bairro', coalesce(u.bairro, pu.bairro), 'cidade', u.cidade, 'uf', u.uf, 'referencia', u.referencia)),
           'coordenada', case when u.coordenada_verificada_em is not null and u.lat is not null
                              then jsonb_build_object('lat', u.lat, 'lng', u.lng) end,
           'whatsapp', case when u.whatsapp_autorizado then u.whatsapp_publico end,
           'fotos', (select jsonb_agg(jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura) order by m.ordem)
                       from public.midias_participacao m
                      where m.participacao_unidade_id = pu.id and m.papel = 'loja' and m.estado = 'aprovada'),
           'combo', case when v_com_combo then jsonb_strip_nulls(jsonb_build_object(
              'modos', jsonb_build_object('local', pu.consumo_local, 'retirada', pu.retirada,
                         'delivery', case when pu.delivery_combo = 'sim' or coalesce(pu.faz_delivery, false) then 'sim' else pu.delivery_combo end),
              'canais', case when pu.delivery_combo = 'sim' or coalesce(pu.faz_delivery, false) then pu.canais_delivery end,
              'delivery_regioes', case when pu.delivery_combo = 'sim' or coalesce(pu.faz_delivery, false) then pu.delivery_regioes end,
              'delivery_taxa', case when pu.delivery_combo = 'sim' or coalesce(pu.faz_delivery, false) then pu.delivery_taxa end,
              'observacao', pu.observacao_combo,
              'disponibilidade', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                                     'data', d.data, 'abre', d.abre, 'fecha', d.fecha, 'observacao', d.observacao)) order by d.data, d.abre)
                                    from jsonb_to_recordset(pu.horario_festival) d(data text, abre text, fecha text, observacao text)))) end
         )) order by pu.ordem), '[]'::jsonb)
    into v_unidades
    from public.participacao_unidades pu left join public.unidades u on u.id = pu.unidade_id
   where pu.participacao_id = p_participacao and pu.participa;

  if v_com_combo then
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'tipo', i.tipo, 'posicao', i.posicao, 'nome', i.nome, 'descricao', i.descricao, 'ingredientes', i.ingredientes,
             'alimentar', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('aspecto', d.aspecto, 'estado', d.estado, 'observacao', d.observacao)) order by d.aspecto)
                             from public.declaracoes_alimentares d where d.item_id = i.id),
             'substituicoes', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                                  'original', s.original, 'alternativa', s.alternativa, 'descricao', s.descricao, 'disponibilidade', s.disponibilidade,
                                  'acrescimo', s.acrescimo, 'como_solicitar', s.como_solicitar,
                                  'modalidades', case when cardinality(s.modalidades) > 0 then to_jsonb(s.modalidades) end,
                                  'unidades', case when cardinality(s.unidades) > 0 then
                                                (select jsonb_agg(pu.id_publico) from public.participacao_unidades pu
                                                  where pu.id = any (s.unidades) and pu.participa) end,
                                  'alimentar', (select jsonb_agg(jsonb_build_object('aspecto', d.aspecto, 'estado', d.estado) order by d.aspecto)
                                                  from public.declaracoes_alimentares d where d.substituicao_id = s.id)
                               )) order by s.ordem, s.criado_em)
                                 from public.substituicoes s where s.item_id = i.id),
             'fotos', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura, 'rotulo', m.rotulo)) order by m.ordem)
                         from public.midias_participacao m
                        where m.item_id = i.id and m.papel = 'item' and m.estado = 'aprovada'),
             'foto', (select jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura)
                        from public.midias_participacao m
                       where m.item_id = i.id and m.papel = 'item' and m.estado = 'aprovada' order by m.ordem limit 1)
           )) order by i.posicao), '[]'::jsonb)
      into v_itens
      from public.participantes_itens i where i.participacao_id = p_participacao;

    select jsonb_strip_nulls(jsonb_build_object(
             'principal', (select jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura,
                                                     'foco', case when m.foco_x is not null then jsonb_build_object('x', m.foco_x, 'y', m.foco_y) end)
                             from public.midias_participacao m
                            where m.participacao_id = p_participacao and m.papel = 'combo_principal' and m.estado = 'aprovada' limit 1),
             'galeria', (select jsonb_agg(jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura) order by m.ordem)
                           from public.midias_participacao m
                          where m.participacao_id = p_participacao and m.papel = 'combo_galeria' and m.estado = 'aprovada')))
      into v_fotos;

    v_combo := jsonb_strip_nulls(jsonb_build_object(
      'nome', v_pa.combo_nome, 'descricao', v_pa.combo_descricao, 'condicoes', v_pa.combo_condicoes,
      'preco', v_e.valor_combo, 'itens', v_itens, 'fotos', v_fotos));
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'slug', v_pa.slug_publico,
    'nivel', p_nivel,
    'casa', jsonb_strip_nulls(jsonb_build_object(
      'nome', v_p.nome_marca, 'apresentacao', v_p.apresentacao_publica,
      'instagram', nullif(btrim(v_p.instagram), ''), 'site', nullif(btrim(v_p.site), ''),
      'logo', case when v_logo is not null then jsonb_build_object('bucket', 'logos', 'path', v_logo) end)),
    'unidades', v_unidades,
    'combo', v_combo));
end $function$;
