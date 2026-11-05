-- Caça aos Carimbos, presença sem atalho (achados C01, C02, SEC-02 e parte do C04 da revisão de 05/11/2026; Wilker autorizou aplicar).
-- Contrato: docs/cartoon-2026-2/15-caca-contrato-gps.md. Teste: supabase/testes/caca-presenca-sem-atalho.sql. Depende de 20261211, 20261214 e 20261216.
--
-- C01: em casa com unidades mistas (uma com ponto conferido, outra sem) o QR da unidade SEM ponto carimbava "ok", mas o carimbo era
--      descartado do progresso para sempre e a pessoa ficava travada 12 h. Agora o GPS é decidido pela CASA: se QUALQUER unidade
--      participante tem ponto conferido, exige-se a posição e mede-se a distância até a unidade conferida mais próxima (quem está
--      na unidade sem ponto fica 'longe' e segue pelo pedido de revisão de presença).
-- C02: "QR fixo sozinho não prova presença". Casas em que NENHUMA unidade tem ponto conferido deixam de carimbar só pelo QR:
--      o servidor responde 'sem_ponto' e a pessoa pede a revisão de presença (caca_excecao_pedir), que a ORGANIZAÇÃO decide.
--      A chave caca_config 'carimbo_sem_ponto' é a decisão do Wilker: 'revisao' (padrão, esta migration) ou 'conta' (volta a carimbar
--      sem GPS nessas casas). Conferir as coordenadas (docs/cartoon-2026-2/15-caca-coordenadas-pendentes.md) tira a casa do caso.
-- SEC-02: o pedido de presença exige e-mail CONFIRMADO do mapa principal; a fila cheia passa a ser por casa (20 pendentes), para um
--      abuso não travar as outras casas. Mantidos 5 pendentes por pessoa, 1 pedido por casa a cada 12 h e 2 por casa no dia.
-- C04: mapa_carimbar deixa de devolver 'pontos' (placar por pontos é regra extinta).
--
-- Não apaga nem converte dado. Reverter: restaurar mapa_carimbar e caca_carimbo_conta de 20261211 e caca_excecao_pedir de 20261214;
--   drop function public.caca_sem_ponto_conta(); delete from public.caca_config where chave = 'carimbo_sem_ponto';

insert into public.caca_config (chave, valor, nota)
values ('carimbo_sem_ponto', '"revisao"'::jsonb,
        'Casas sem ponto conferido: "revisao" = o QR sozinho não carimba, vira pedido de presença decidido pela organização; "conta" = carimba sem GPS (decisão assumida pelo Wilker).')
on conflict (chave) do nothing;

create or replace function public.caca_sem_ponto_conta()
 returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce((select c.valor #>> '{}' from public.caca_config c where c.chave = 'carimbo_sem_ponto'), 'revisao') = 'conta' $$;
revoke all on function public.caca_sem_ponto_conta() from public, anon, authenticated;

-- Um carimbo vale para o progresso? Sem prova de GPS só vale se a casa não tem unidade com ponto conferido E a organização liberou ('conta').
create or replace function public.caca_carimbo_conta(p_participacao uuid, p_origem text)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select p_origem <> 'unidade_sem_coordenada'
      or (public.caca_sem_ponto_conta()
          and not exists (select 1 from public.participacao_unidades pu join public.unidades u on u.id = pu.unidade_id
                           where pu.participacao_id = p_participacao and pu.participa
                             and u.coordenada_verificada_em is not null and u.lat is not null))
$$;

-- ---------------------------------------------------------------- carimbar
create or replace function public.mapa_carimbar(p_chave text, p_qr text, p_lat numeric, p_lng numeric, p_precisao numeric)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
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

  -- GPS decidido pela CASA: a unidade conferida mais próxima manda, mesmo que o QR lido seja de outra unidade da casa.
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
    -- Casa sem nenhum ponto conferido: o QR sozinho não prova presença; vale o pedido de revisão decidido pela organização.
    return jsonb_build_object('ok', false, 'motivo', 'sem_ponto', 'slug', q.slug_publico);
  end if;

  -- Um e-mail por vez: duas leituras simultâneas (ou dois mapas com o mesmo e-mail) não passam juntas.
  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || m.edicao_codigo || ':' || m.email_norm, 0));
  select max(k.criado_em) into v_ult
    from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
   where k.participacao_id = q.participacao_id and m2.edicao_codigo = m.edicao_codigo
     and (k.mapa_id = m.id or m2.email_norm = m.email_norm);
  if v_ult is not null and now() < v_ult + v_espera then
    return jsonb_build_object('ok', false, 'motivo', 'cedo', 'liberado_em', v_ult + v_espera, 'slug', q.slug_publico);
  end if;

  v_primeira := not exists (select 1 from public.carimbos k where k.mapa_id = m.id and k.participacao_id = q.participacao_id
                               and k.anulado_em is null);
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, distancia_m, precisao_m, conferido)
  values (m.id, q.participacao_id, q.pu_id, q.codigo, v_dist, v_prec, v_conf);
  v_avaliou := exists (select 1 from public.avaliacoes a where a.edicao_codigo = m.edicao_codigo
                         and a.participacao_id = q.participacao_id and a.email_norm = m.email_norm);
  return jsonb_build_object('ok', true, 'slug', q.slug_publico, 'unidade', q.id_publico, 'primeira', v_primeira, 'avaliou', v_avaliou,
                            'liberado_em', now() + v_espera);
end $$;

-- ---------------------------------------------------------------- pedido de revisão de presença
create or replace function public.caca_excecao_pedir(p_chave text, p_slug text, p_motivo text, p_lat numeric, p_lng numeric,
                                                     p_precisao numeric, p_nota text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_slug text := lower(btrim(coalesce(p_slug, ''))); v_pa uuid; v_c public.edicao_publicacao%rowtype;
  v_motivo text := lower(btrim(coalesce(p_motivo, ''))); v_nota text; v_pu uuid; v_prec int; v_dist int; v_min float8;
  v_ult timestamptz; v_dup timestamptz; v_id uuid; v_pos boolean;
  v_raio constant int := 200; v_folga_max constant int := 300; v_espera constant interval := interval '12 hours';
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if v_motivo not in ('sem_localizacao', 'imprecisa', 'longe') then return jsonb_build_object('ok', false, 'motivo', 'motivo_invalido'); end if;
  -- A decisão da organização vira carimbo: só quem provou o e-mail (e é o mapa principal da pessoa) pede.
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm)
     or not public.caca_email_confirmado(m.edicao_codigo, m.email_norm) then
    return jsonb_build_object('ok', false, 'motivo', 'email_nao_confirmado');
  end if;

  select pa.id into v_pa from public.participacoes pa
   where pa.edicao_codigo = m.edicao_codigo and pa.slug_publico = v_slug and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  if v_pa is null then return jsonb_build_object('ok', false, 'motivo', 'qr_invalido'); end if;
  if not (v_pa in (select public.caca_casas_conta(m.edicao_codigo))) then
    return jsonb_build_object('ok', false, 'motivo', 'casa_sem_combo', 'slug', v_slug);
  end if;

  select * into v_c from public.edicao_publicacao where edicao_codigo = m.edicao_codigo;
  if not coalesce(v_c.avaliacao_aberta, false) or now() < v_c.avaliacao_abre_em then
    return jsonb_build_object('ok', false, 'motivo', 'nao_aberta', 'abre_em', v_c.avaliacao_abre_em, 'slug', v_slug);
  end if;
  if now() > v_c.avaliacao_fecha_em then return jsonb_build_object('ok', false, 'motivo', 'encerrada', 'slug', v_slug); end if;

  select min(public.carimbo_distancia(u.lat::float8, u.lng::float8, p_lat::float8, p_lng::float8)), count(*) > 0
    into v_min, v_pos
    from public.participacao_unidades pu join public.unidades u on u.id = pu.unidade_id
   where pu.participacao_id = v_pa and pu.participa and u.coordenada_verificada_em is not null and u.lat is not null;
  -- Casa sem ponto conferido: só "não precisa" se a organização liberou o carimbo sem GPS; senão o pedido é o caminho.
  if not v_pos and public.caca_sem_ponto_conta() then return jsonb_build_object('ok', false, 'motivo', 'nao_precisa', 'slug', v_slug); end if;

  v_prec := least(greatest(coalesce(p_precisao, 0), 0), 100000)::int;
  if p_lat is not null and p_lng is not null and p_lat between -90 and 90 and p_lng between -180 and 180 then
    v_dist := case when v_pos then round(v_min)::int end;
    if v_pos and v_dist <= v_raio + least(v_prec, v_folga_max) then
      return jsonb_build_object('ok', false, 'motivo', 'nao_precisa', 'slug', v_slug);
    end if;
  else
    v_dist := null; p_lat := null; p_lng := null;
  end if;

  v_pu := public.caca_excecao_unidade(v_pa, p_lat, p_lng);
  if v_pu is null then return jsonb_build_object('ok', false, 'motivo', 'qr_invalido'); end if;
  v_nota := nullif(left(btrim(regexp_replace(coalesce(p_nota, ''), '[[:cntrl:]]+', ' ', 'g')), 200), '');

  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || m.edicao_codigo || ':' || m.email_norm, 0));

  select max(k.criado_em) into v_ult
    from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
   where k.participacao_id = v_pa and m2.edicao_codigo = m.edicao_codigo and k.anulado_em is null
     and (k.mapa_id = m.id or m2.email_norm = m.email_norm);
  if v_ult is not null and now() < v_ult + v_espera then
    return jsonb_build_object('ok', false, 'motivo', 'cedo', 'liberado_em', v_ult + v_espera, 'slug', v_slug);
  end if;

  select max(e.criado_em) into v_dup from public.caca_carimbo_excecao e
   where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm and e.participacao_id = v_pa;
  if v_dup is not null and now() < v_dup + v_espera then
    return jsonb_build_object('ok', false, 'motivo', 'ja_pedido', 'liberado_em', v_dup + v_espera, 'slug', v_slug);
  end if;
  if (select count(*) from public.caca_carimbo_excecao e
       where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm and e.participacao_id = v_pa
         and (e.criado_em at time zone 'America/Fortaleza')::date = (now() at time zone 'America/Fortaleza')::date) >= 2 then
    return jsonb_build_object('ok', false, 'motivo', 'limite_dia', 'slug', v_slug);
  end if;
  if (select count(*) from public.caca_carimbo_excecao e
       where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm and e.estado = 'pendente') >= 5 then
    return jsonb_build_object('ok', false, 'motivo', 'muitos_pendentes');
  end if;
  -- Fila cheia POR CASA: um abuso numa casa não trava as outras 26.
  if (select count(*) from public.caca_carimbo_excecao e
       where e.edicao_codigo = m.edicao_codigo and e.participacao_id = v_pa and e.estado = 'pendente') >= 20 then
    return jsonb_build_object('ok', false, 'motivo', 'fila_cheia');
  end if;

  insert into public.caca_carimbo_excecao (edicao_codigo, mapa_id, pessoa, participacao_id, participacao_unidade_id, motivo,
                                           distancia_m, precisao_m, nota)
  values (m.edicao_codigo, m.id, m.email_norm, v_pa, v_pu, v_motivo, v_dist, case when p_precisao is null then null else v_prec end, v_nota)
  returning id into v_id;
  insert into public.caca_evento (edicao_codigo, acao, ator, depois)
  values (m.edicao_codigo, 'excecao_pedida', 'visitante', jsonb_build_object('pedido', v_id, 'casa', v_slug, 'motivo', v_motivo));
  return jsonb_build_object('ok', true, 'id', v_id, 'estado', 'pendente', 'slug', v_slug);
end $$;
