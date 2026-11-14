-- Reverte 20270203: caca_excecao_listar volta a ter 3 parâmetros (sem filtro por pessoa).
drop function if exists public.caca_excecao_listar(text, text, text, uuid);
create or replace function public.caca_excecao_listar(p_secret text, p_edicao text, p_estado text default null)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_rel boolean; v_ger boolean; v_est text := nullif(btrim(coalesce(p_estado, '')), '');
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  if v_est is not null and v_est not in ('pendente', 'aprovado', 'negado') then raise exception 'parametro_invalido'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  v_ger := public.pode(p_secret, 'producao.gerir');
  return jsonb_build_object(
    -- `pendentes` = o que a ORGANIZAÇÃO pode decidir agora. Delivery aguardando a casa não é dela: vai em `aguardando_casa`.
    'pendentes', (select count(*) from public.caca_carimbo_excecao e
                   where e.edicao_codigo = p_edicao and e.estado = 'pendente' and not (e.motivo = 'delivery' and e.via = 'casa' and coalesce(e.delivery_via_pretendida, 'casa') = 'casa')),
    'aguardando_casa', (select count(*) from public.caca_carimbo_excecao e
                         where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'delivery' and e.via = 'casa' and coalesce(e.delivery_via_pretendida, 'casa') = 'casa'),
    'aguardando_imagem', (select count(*) from public.caca_carimbo_excecao e where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'delivery' and e.via = 'casa' and e.delivery_via_pretendida = 'imagem'),
    'pendentes_visita_anterior', (select count(*) from public.caca_carimbo_excecao e
                                   where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'visita_anterior'),
    'pendentes_delivery', (select count(*) from public.caca_carimbo_excecao e
                            where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'delivery' and (e.via = 'imagem' or e.delivery_via_pretendida = 'imagem')),
    'itens', (select coalesce(jsonb_agg(x.o order by x.ordem, x.fila), '[]'::jsonb) from (
        select case when e.estado = 'pendente' then 0 else 1 end ordem,
               case when e.estado = 'pendente' then extract(epoch from e.criado_em) else -extract(epoch from e.criado_em) end fila,
               jsonb_strip_nulls(jsonb_build_object(
                 'id', e.id, 'estado', e.estado, 'criado_em', e.criado_em, 'motivo', e.motivo, 'visita_data', e.visita_data,
                 'via', e.via, 'via_pretendida', e.delivery_via_pretendida, 'pedido_data', e.pedido_data, 'pedido_ref', e.pedido_ref,
                 'aguardando_casa', case when e.motivo = 'delivery' and e.estado = 'pendente' then e.via = 'casa' and coalesce(e.delivery_via_pretendida, 'casa') = 'casa' end,
                 'codigo_expirado', case when e.motivo = 'delivery' and e.via = 'casa' and e.estado = 'pendente' then e.codigo_expira_em <= now() end,
                 'imagem', case when v_ger and e.imagem_path is not null and e.imagem_removida_em is null then e.imagem_path end,
                 'imagem_removida', case when e.imagem_removida_em is not null then true end,
                 'imagem_enviada_em', e.imagem_enviada_em,
                 'apelido', m.apelido, 'casa', pt.nome_marca, 'slug', pa.slug_publico,
                 'unidade', pu.id_publico, 'nome_unidade', u.nome_unidade, 'unidades_na_casa', (select count(*) from public.participacao_unidades p2
                                                                                                  where p2.participacao_id = e.participacao_id and p2.participa),
                 'distancia_m', e.distancia_m, 'precisao_m', e.precisao_m, 'nota', e.nota,
                 'avaliou', exists (select 1 from public.avaliacoes a where a.edicao_codigo = e.edicao_codigo
                                      and a.participacao_id = e.participacao_id and a.email_norm = e.pessoa),
                 'carimbos_na_casa', (select count(*) from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
                                       where k.participacao_id = e.participacao_id and m2.email_norm = e.pessoa
                                         and m2.edicao_codigo = e.edicao_codigo and k.anulado_em is null),
                 'pedidos_da_pessoa', (select count(*) from public.caca_carimbo_excecao e2
                                        where e2.edicao_codigo = e.edicao_codigo and e2.pessoa = e.pessoa),
                 'decidido_por', e.decidido_por, 'decidido_em', e.decidido_em, 'decisao_nota', e.decisao_nota, 'carimbo_id', e.carimbo_id,
                 'email', case when v_rel then e.pessoa end, 'whatsapp', case when v_rel then m.whatsapp end)) o
          from public.caca_carimbo_excecao e
          join public.mapas_lover m on m.id = e.mapa_id
          join public.participacoes pa on pa.id = e.participacao_id
          join public.participantes pt on pt.id = pa.participante_id
          left join public.participacao_unidades pu on pu.id = e.participacao_unidade_id
          left join public.unidades u on u.id = pu.unidade_id
         where e.edicao_codigo = p_edicao and (v_est is null or e.estado = v_est)
         order by case when e.estado = 'pendente' then 0 else 1 end, case when e.estado = 'pendente' then e.criado_em end,
                  e.criado_em desc
         limit 300) x));
end $function$;
revoke all on function public.caca_excecao_listar(text, text, text) from public;
grant execute on function public.caca_excecao_listar(text, text, text) to anon, authenticated, service_role;
