-- 20270209 · Caça: recusa carimbo com localização falsa (GPS simulado) e avisa a pessoa (14/11/2026, pedido do Wilker).
--
-- Por quê: em 14/11 duas pessoas carimbaram com app de GPS falso (Ana Flávia reincidiu 2 min depois da anulação). O GPS
-- falso faz o celular dizer que está na casa; o carimbo por GPS não passa por aprovação, então desligar a aprovação
-- automática não impede. O navegador não informa se a posição é simulada: a conferência é no servidor, por dois sinais
-- calibrados com os 2.106 carimbos da edição:
--   1. Precisão: app de GPS falso manda margem de 0–1 m. Em 14/11, 0–1 m apareceu 62x na fraude da Ana, 5x na do Arthur e
--      no máximo 3x por jogador real (nunca 3 em 12 h). Regra: leitura atual ≤ 1 m E já houve 2+ carimbos GPS do mesmo
--      e-mail com ≤ 1 m nas últimas 12 h (anulados contam).
--   2. Velocidade: do último carimbo GPS válido até a posição de agora, descontando a distância daquele carimbo e a margem
--      de agora, mais de 1,5 km a mais de 80 km/h. (A fraude de 13/11 chegou a 858 km/h; jogadores reais: até 24 km/h.)
-- Ao detectar: não grava carimbo, registra em auditoria ('carimbo.gps_falso'), manda aviso no sino (1 por mapa por dia,
-- categoria 'disputa') e devolve motivo 'gps_falso' (o site mostra a mensagem). Reverter: 20270209_caca_gps_falso_reverter.sql.

create or replace function public.mapa_carimbar(p_chave text, p_qr text, p_lat numeric, p_lng numeric, p_precisao numeric)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare m public.mapas_lover%rowtype; q record; v_c public.edicao_publicacao%rowtype;
  v_raio constant int := 200; v_folga_max constant int := 300; v_espera constant interval := interval '12 hours';
  v_dist int; v_prec int; v_conf boolean; v_ult timestamptz; v_primeira boolean; v_avaliou boolean; v_min float8;
  v_falso text; v_p1 int; v_ant record; v_desl float8; v_kmh float8; v_aviso uuid;
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

  -- Localização falsa (20270209). Só quando a posição foi conferida contra o ponto da casa.
  if v_conf then
    if v_prec <= 1 then
      select count(*) into v_p1
        from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
       where m2.edicao_codigo = m.edicao_codigo and (k.mapa_id = m.id or m2.email_norm = m.email_norm)
         and k.origem = 'gps' and k.precisao_m <= 1 and k.criado_em > now() - interval '12 hours';
      if v_p1 >= 2 then v_falso := 'precisao'; end if;
    end if;
    if v_falso is null then
      select k.criado_em, k.distancia_m, u.lat, u.lng into v_ant
        from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
        join public.participacao_unidades pu3 on pu3.id = k.participacao_unidade_id
        join public.unidades u on u.id = pu3.unidade_id and u.lat is not null
       where m2.edicao_codigo = m.edicao_codigo and (k.mapa_id = m.id or m2.email_norm = m.email_norm)
         and k.origem = 'gps' and k.anulado_em is null
       order by k.criado_em desc limit 1;
      if found then
        v_desl := public.carimbo_distancia(v_ant.lat::float8, v_ant.lng::float8, p_lat::float8, p_lng::float8)
                  - coalesce(v_ant.distancia_m, 0) - least(v_prec, v_folga_max);
        v_kmh := v_desl / greatest(extract(epoch from now() - v_ant.criado_em), 60) * 3.6;
        if v_desl > 1500 and v_kmh > 80 then v_falso := 'velocidade'; end if;
      end if;
    end if;
    if v_falso is not null then
      insert into public.auditoria (ator_rotulo, acao, alvo_tabela, alvo_id, participacao_id, detalhe)
      values ('Sistema', 'carimbo.gps_falso', 'mapas_lover', m.id, q.participacao_id,
              jsonb_build_object('mapa', m.id, 'slug', q.slug_publico, 'regra', v_falso, 'precisao_m', v_prec,
                                 'distancia_m', v_dist, 'kmh', round(coalesce(v_kmh, 0))));
      insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, estado, origem, chave_dedupe,
                                     criado_por, enviado_em, enviado_por, alvos)
      values (m.edicao_codigo, 'disputa', 'Detectamos uma localização falsa',
              'Seu celular tentou carimbar com uma localização que não é real (app de GPS falso ou simulador). O carimbo não foi registrado. Localização falsa anula os carimbos e pode desclassificar o mapa.',
              '/contato', jsonb_build_object('tipo', 'mapas', 'ids', jsonb_build_array(m.id)), 'enviado', 'automatico',
              'gps_falso:' || m.id || ':' || (now() at time zone 'America/Fortaleza')::date, 'gps_falso', now(), 'gps_falso', 1)
      on conflict (chave_dedupe) do nothing returning id into v_aviso;
      if v_aviso is not null then
        insert into public.caca_aviso_entrega (aviso_id, mapa_id) values (v_aviso, m.id) on conflict do nothing;
      end if;
      return jsonb_build_object('ok', false, 'motivo', 'gps_falso', 'slug', q.slug_publico);
    end if;
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
