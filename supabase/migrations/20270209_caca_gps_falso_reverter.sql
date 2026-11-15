-- Reverte 20270209: mapa_carimbar volta a ser a versão sem a checagem de localização falsa (a que estava no ar em 14/11/2026).

create or replace function public.mapa_carimbar(p_chave text, p_qr text, p_lat numeric, p_lng numeric, p_precisao numeric)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare m public.mapas_lover%rowtype; q record; v_c public.edicao_publicacao%rowtype;
  v_raio constant int := 200; v_folga_max constant int := 300; v_espera constant interval := interval '12 hours';
  v_dist int; v_prec int; v_conf boolean; v_ult timestamptz; v_primeira boolean; v_avaliou boolean; v_min float8;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;

  select cq.codigo, pu.id pu_id, pu.id_publico, pu.participacao_id, pa.edicao_codigo, pa.slug_publico,
         exists (select 1 from public.publicacoes pb2 where pb2.participacao_id = pa.id and pb2.vigente
                    and pb2.nivel = 'marca_e_combo') tem_combo
    into q
    from public.carimbo_qr cq
    join public.participacao_unidades pu on pu.id = cq.participacao_unidade_id and pu.participa
    join public.participacoes pa on pa.id = pu.participacao_id and pa.status_cadastro <> 'encerrado'
   where cq.codigo = lower(btrim(coalesce(p_qr, ''))) and cq.ativo
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  if not found or q.edicao_codigo <> m.edicao_codigo then
    return jsonb_build_object('ok', false, 'motivo', 'qr_invalido');
  end if;
  if not q.tem_combo then
    return jsonb_build_object('ok', false, 'motivo', 'casa_sem_combo', 'slug', q.slug_publico);
  end if;

  select * into v_c from public.edicao_publicacao where edicao_codigo = m.edicao_codigo;
  if not coalesce(v_c.avaliacao_aberta, false) or now() < v_c.avaliacao_abre_em then
    return jsonb_build_object('ok', false, 'motivo', 'nao_aberta', 'abre_em', v_c.avaliacao_abre_em, 'slug', q.slug_publico);
  end if;
  if now() > v_c.avaliacao_fecha_em then
    return jsonb_build_object('ok', false, 'motivo', 'encerrada', 'slug', q.slug_publico);
  end if;

  select min(case when p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then null
                  else public.carimbo_distancia(u.lat::float8, u.lng::float8, p_lat::float8, p_lng::float8) end), count(*) > 0
    into v_min, v_conf
    from public.participacao_unidades pu2 join public.unidades u on u.id = pu2.unidade_id
   where pu2.participacao_id = q.participacao_id and pu2.participa and u.coordenada_verificada_em is not null and u.lat is not null;
  if v_conf then
    if v_min is null then
      return jsonb_build_object('ok', false, 'motivo', 'sem_localizacao', 'slug', q.slug_publico);
    end if;
    v_prec := least(greatest(coalesce(p_precisao, 0), 0), 100000)::int;
    v_dist := round(v_min)::int;
    if v_dist > v_raio + least(v_prec, v_folga_max) then
      return jsonb_build_object('ok', false, 'motivo', 'longe', 'distancia_m', v_dist, 'slug', q.slug_publico);
    end if;
  elsif not public.caca_sem_ponto_conta() then
    return jsonb_build_object('ok', false, 'motivo', 'sem_ponto', 'slug', q.slug_publico);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || m.edicao_codigo || ':' || m.email_norm, 0));
  select max(k.criado_em) into v_ult
    from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
   where k.participacao_id = q.participacao_id and m2.edicao_codigo = m.edicao_codigo and k.anulado_em is null
     and (k.mapa_id = m.id or m2.email_norm = m.email_norm);
  if v_ult is not null and now() < v_ult + v_espera then
    return jsonb_build_object('ok', false, 'motivo', 'cedo', 'liberado_em', v_ult + v_espera, 'slug', q.slug_publico);
  end if;

  v_primeira := not exists (select 1 from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
                             where k.participacao_id = q.participacao_id and m2.edicao_codigo = m.edicao_codigo
                               and m2.email_norm = m.email_norm and k.anulado_em is null);
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, distancia_m, precisao_m, conferido)
  values (m.id, q.participacao_id, q.pu_id, q.codigo, v_dist, v_prec, v_conf);
  v_avaliou := exists (select 1 from public.avaliacoes a where a.edicao_codigo = m.edicao_codigo
                         and a.participacao_id = q.participacao_id and a.email_norm = m.email_norm);
  return jsonb_build_object('ok', true, 'slug', q.slug_publico, 'unidade', q.id_publico, 'primeira', v_primeira, 'avaliou', v_avaliou,
                            'liberado_em', now() + v_espera);
end $function$;
