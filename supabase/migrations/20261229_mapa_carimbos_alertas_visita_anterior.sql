-- Alertas da auditoria (Edição › Carimbos › Mapa e adesivos) ignoram o carimbo de visita anterior. (05/11/2026, pedido do Wilker)
-- Carimbo de visita anterior nasce na hora da aprovação (criado_em = now()) e não tem GPS: aprovar vários de uma vez
-- gerava "viagem impossível: 2,3 km em 0 min" e "unidade sem ponto conferido" falsos. A decisão da organização já é a
-- conferência desses carimbos (auditoria acao carimbo.visita_anterior), então eles saem dos dois alertas e do total
-- "sem ponto conferido". Só muda get_mapa_carimbos; o resto da função é idêntico ao de 20261130_mapa_docura_carimbo.sql.
create or replace function public.get_mapa_carimbos(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_rel boolean;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  return jsonb_build_object(
    'totais', (select jsonb_build_object(
                 'mapas', (select count(*) from public.mapas_lover where edicao_codigo = p_edicao),
                 'carimbos', count(*) filter (where k.anulado_em is null),
                 'anulados', count(*) filter (where k.anulado_em is not null),
                 'sem_conferencia', count(*) filter (where k.anulado_em is null and not k.conferido and k.origem is distinct from 'visita_anterior'),
                 'pontos', (select coalesce(sum(p.pontos), 0) from public.carimbo_placar(p_edicao) p),
                 'avaliadas', (select coalesce(sum(p.avaliadas), 0) from public.carimbo_placar(p_edicao) p))
                 from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id where m.edicao_codigo = p_edicao),
    'por_casa_dia', (select coalesce(jsonb_agg(jsonb_build_object('casa', x.nome, 'dia', x.dia, 'n', x.n) order by x.dia desc, x.nome), '[]'::jsonb)
                       from (select pt.nome_marca nome, (k.criado_em at time zone 'America/Fortaleza')::date dia, count(*) n
                               from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                               join public.participacoes pa on pa.id = k.participacao_id
                               join public.participantes pt on pt.id = pa.participante_id
                              where m.edicao_codigo = p_edicao and k.anulado_em is null
                              group by 1, 2) x),
    'ranking', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                  'posicao', r.pos, 'mapa_id', r.mapa_id, 'apelido', r.apelido, 'no_ranking', r.no_ranking,
                  'pontos', r.pontos, 'carimbos', r.carimbos, 'casas', r.casas, 'avaliadas', r.avaliadas, 'ultimo', r.ultimo,
                  'email', case when v_rel then r.email_norm end, 'whatsapp', case when v_rel then r.whatsapp end)) order by r.pos), '[]'::jsonb)
                  from (select row_number() over (order by p.pontos desc, p.casas desc, p.ultimo) pos, p.*
                          from public.carimbo_placar(p_edicao) p) r),
    -- Viagem impossível: carimbos seguidos do mesmo mapa em unidades a mais de 1 km, rápido demais para 60 km/h.
    -- Visita anterior fica fora da janela inteira: o horário dela é o da aprovação, não o da visita.
    'alertas', (select coalesce(jsonb_agg(a order by a ->> 'em' desc), '[]'::jsonb) from (
                  select jsonb_build_object('tipo', 'viagem', 'carimbo_id', s.id, 'mapa_id', s.mapa_id, 'apelido', s.apelido,
                           'em', s.criado_em, 'de', s.casa_antes, 'para', s.casa, 'km', round((s.dist / 1000)::numeric, 1),
                           'minutos', round((extract(epoch from s.criado_em - s.antes) / 60)::numeric)) a
                    from (select k.id, k.mapa_id, m.apelido, k.criado_em, pt.nome_marca casa,
                                 lag(pt.nome_marca) over w casa_antes, lag(k.criado_em) over w antes,
                                 public.carimbo_distancia(u.lat::float8, u.lng::float8,
                                   (lag(u.lat) over w)::float8, (lag(u.lng) over w)::float8) dist
                            from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                            join public.participacao_unidades pu on pu.id = k.participacao_unidade_id
                            left join public.unidades u on u.id = pu.unidade_id
                            join public.participacoes pa on pa.id = k.participacao_id
                            join public.participantes pt on pt.id = pa.participante_id
                           where m.edicao_codigo = p_edicao and k.anulado_em is null and k.origem is distinct from 'visita_anterior'
                          window w as (partition by k.mapa_id order by k.criado_em)) s
                   where s.dist > 1000
                     and s.dist / greatest(extract(epoch from s.criado_em - s.antes), 1) > 60000.0 / 3600
                  union all
                  select jsonb_build_object('tipo', 'sem_conferencia', 'carimbo_id', k.id, 'mapa_id', k.mapa_id,
                           'apelido', m.apelido, 'em', k.criado_em, 'casa', pt.nome_marca)
                    from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                    join public.participacoes pa on pa.id = k.participacao_id
                    join public.participantes pt on pt.id = pa.participante_id
                   where m.edicao_codigo = p_edicao and k.anulado_em is null and not k.conferido
                     and k.origem is distinct from 'visita_anterior') t),
    -- Números da sorte, distribuídos na ordem de chegada dos pontos (carimbo = 1; avaliação = 2, na hora em
    -- que a casa ficou com carimbo E avaliação). Só faz sentido exportar no fechamento, depois da auditoria.
    'numeros', case when v_rel then (select coalesce(jsonb_agg(jsonb_build_object(
                    'apelido', n.apelido, 'email', n.email_norm, 'whatsapp', n.whatsapp, 'de', n.de, 'ate', n.ate) order by n.de), '[]'::jsonb)
                  from (select m.apelido, m.email_norm, m.whatsapp, ev.fim - ev.q + 1 de, ev.fim ate
                          from (select e.mapa_id, e.q, sum(e.q) over (order by e.t, e.mapa_id, e.q rows unbounded preceding) fim
                                  from (select k.mapa_id, k.criado_em t, 1 q
                                          from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                                         where m.edicao_codigo = p_edicao and k.anulado_em is null
                                        union all
                                        select b.mapa_id, greatest(b.primeiro, a.criado_em), 2
                                          from (select k.mapa_id, k.participacao_id, min(k.criado_em) primeiro
                                                  from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                                                 where m.edicao_codigo = p_edicao and k.anulado_em is null
                                                 group by 1, 2) b
                                          join public.mapas_lover m on m.id = b.mapa_id
                                          join public.avaliacoes a on a.edicao_codigo = p_edicao and a.participacao_id = b.participacao_id
                                                                  and a.email_norm = m.email_norm) e) ev
                          join public.mapas_lover m on m.id = ev.mapa_id) n) end);
end $function$;
