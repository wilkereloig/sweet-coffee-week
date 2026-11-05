-- Caça aos Carimbos, correções de carimbo, prêmio e legado (revisão de 05/11/2026; Wilker autorizou aplicar). Aditiva, sem apagar dado.
-- Teste: supabase/testes/caca-carimbo-casa-mista.sql (+ caca-gps-excecao.sql, caca-premiacao.sql, caca-casas-validas.sql). Depende de 20261211, 20261214, 20261216 a 20261219.
--
-- Já resolvido por 20261217_caca_presenca_sem_atalho (só conferido aqui, sem mexer): C01 (GPS decidido pela CASA), C02 (casa sem ponto
--   conferido: QR sozinho vira 'sem_ponto' e pedido de revisão; a chave caca_config 'carimbo_sem_ponto' = 'conta' liberaria o carimbo sem GPS,
--   que continua distinguível por origem 'unidade_sem_coordenada', listado em caca_carimbo_revisao_listar e anulável por carimbo_anular),
--   SEC-02 (pedido exige e-mail confirmado, teto por casa), 'pontos' fora de mapa_carimbar, C06 em 'confirmar' (20261218).
-- Aqui:
--   C09     mapa_carimbar: a janela de 12 h ignora carimbo ANULADO (a organização anula e a pessoa honesta volta a poder carimbar) e
--           'primeira' é calculada por E-MAIL (dois mapas do mesmo e-mail = uma pessoa), como o resto da Caça.
--   SEC-04  carimbo_distancia devolve NULL para coordenada fora do intervalo / NaN / Infinity (antes estourava 22003 e o visitante levava
--           erro de banco); caca_excecao_pedir valida o intervalo ANTES de medir; caca_texto_limpo remove caractere de controle e de
--           formatação Unicode (U+200B-U+200F, U+202A-U+202E, U+2066-U+2069, U+2028/2029, U+FEFF) da nota (pedido e decisão) e do apelido.
--   C06     caca_premio_acao: 'confirmar' E 'entregar' exigem e-mail confirmado (email_nao_confirmado). Exceção explícita e auditada:
--           ações 'confirmar_excecao' / 'entregar_excecao' com nota obrigatória (mín. 10 caracteres); 'entregar' normal passa se a
--           confirmação já foi feita por exceção. Confirmar o e-mail depois NÃO promove o prêmio sozinho (ação manual, de propósito).
--   C04     fecha de novo ranking_mapa(text), mapa_ler(text) e carimbo_placar(text) (placar por pontos, regra extinta) para anon/authenticated
--           (já fechado em 20261216; repetido porque é idempotente). Nenhum front/painel chama (grep em src, painel-app/src, api, scripts).
--   SEC-05  definir_publicacao_edicao: o alias 'k' do EXISTS colidia com a variável 'k' ("column reference k is ambiguous"); renomeado,
--           comportamento idêntico (curadoria só publica participantes_publicos/combos_publicos; o resto é edicao.gerir).
--   C05     servidor já responde 'casa_sem_combo' em mapa_carimbar, mapa_carimbar_casa e caca_excecao_pedir; a frase é do front (outra frente).
--
-- reverter: restaurar mapa_carimbar de 20261217_caca_presenca_sem_atalho; caca_excecao_pedir de 20261217_caca_presenca_sem_atalho;
--   caca_excecao_decidir de 20261214_caca_gps_excecao; caca_premio_acao de 20261218; mapa_criar de 20261130_mapa_docura_carimbo;
--   definir_publicacao_edicao de 20261014_cartoon_02_publicacao; carimbo_distancia de 20261130_mapa_docura_carimbo;
--   drop function public.caca_texto_limpo(text, int);

-- ---------------------------------------------------------------- SEC-04: texto limpo e distância à prova de entrada ruim
create or replace function public.caca_texto_limpo(p text, p_max int default 200)
 returns text language sql immutable set search_path to 'public'
as $$
  select nullif(left(btrim(regexp_replace(
           regexp_replace(coalesce(p, ''), '[​-‏‪-‮⁦-⁩  ﻿]', '', 'g'),
           '[[:cntrl:]]+', ' ', 'g')), greatest(p_max, 1)), '')
$$;
revoke all on function public.caca_texto_limpo(text, int) from public, anon, authenticated;

-- NULL (e não erro) quando alguma coordenada não é um ponto da Terra: NaN, Infinity e fora de -90..90 / -180..180 não passam no between.
create or replace function public.carimbo_distancia(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
 returns double precision language sql immutable set search_path to 'public'
as $$
  select case when lat1 between -90 and 90 and lat2 between -90 and 90 and lng1 between -180 and 180 and lng2 between -180 and 180
              then 2 * 6371000 * asin(least(1, sqrt(power(sin(radians(lat2 - lat1) / 2), 2)
                                                   + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))))
         end
$$;

-- apelido sem caractere invisível/de direção (mesmo comportamento de antes quando o texto é normal)
create or replace function public.mapa_criar(p_edicao text, p_apelido text, p_email text, p_whatsapp text, p_ranking boolean, p_aceite boolean)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_apelido text := coalesce(public.caca_texto_limpo(p_apelido, 200), ''); v_email text := lower(btrim(coalesce(p_email, '')));
  v_zap text := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), ''); v_chave text; v_id uuid;
begin
  if not exists (select 1 from public.edicao_publicacao where edicao_codigo = p_edicao) then raise exception 'edicao_desconhecida'; end if;
  if not coalesce(p_aceite, false) then raise exception 'aceite_obrigatorio'; end if;
  if char_length(v_apelido) not between 2 and 24 then raise exception 'apelido_invalido'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'email_invalido'; end if;
  if v_zap is not null and v_zap !~ '^\d{10,13}$' then raise exception 'whatsapp_invalido'; end if;
  -- 24 bytes aleatórios em base64url (32 caracteres). Só o hash fica no banco.
  v_chave := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
  insert into public.mapas_lover (edicao_codigo, chave_hash, apelido, email_norm, whatsapp, no_ranking)
  values (p_edicao, public.mapa_hash(v_chave), v_apelido, v_email, v_zap, coalesce(p_ranking, false))
  returning id into v_id;
  return jsonb_build_object('chave', v_chave);
end $$;

-- ---------------------------------------------------------------- C09: carimbar (janela de 12 h sem anulados; 'primeira' por e-mail)
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
  -- (carimbo_distancia devolve NULL para coordenada inválida/NaN/Infinity: vira 'sem_localizacao', nunca erro de banco.)
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
  -- C09: carimbo anulado não segura a janela (a organização anulou; a pessoa pode carimbar de novo).
  select max(k.criado_em) into v_ult
    from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
   where k.participacao_id = q.participacao_id and m2.edicao_codigo = m.edicao_codigo and k.anulado_em is null
     and (k.mapa_id = m.id or m2.email_norm = m.email_norm);
  if v_ult is not null and now() < v_ult + v_espera then
    return jsonb_build_object('ok', false, 'motivo', 'cedo', 'liberado_em', v_ult + v_espera, 'slug', q.slug_publico);
  end if;

  -- C09: "primeira" é da PESSOA (e-mail), não do mapa: um segundo mapa do mesmo e-mail não refaz a primeira vez.
  v_primeira := not exists (select 1 from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
                             where k.participacao_id = q.participacao_id and m2.edicao_codigo = m.edicao_codigo
                               and m2.email_norm = m.email_norm and k.anulado_em is null);
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, distancia_m, precisao_m, conferido)
  values (m.id, q.participacao_id, q.pu_id, q.codigo, v_dist, v_prec, v_conf);
  v_avaliou := exists (select 1 from public.avaliacoes a where a.edicao_codigo = m.edicao_codigo
                         and a.participacao_id = q.participacao_id and a.email_norm = m.email_norm);
  return jsonb_build_object('ok', true, 'slug', q.slug_publico, 'unidade', q.id_publico, 'primeira', v_primeira, 'avaliou', v_avaliou,
                            'liberado_em', now() + v_espera);
end $$;

-- ---------------------------------------------------------------- SEC-04: pedido de revisão (intervalo validado antes de medir; nota limpa)
create or replace function public.caca_excecao_pedir(p_chave text, p_slug text, p_motivo text, p_lat numeric, p_lng numeric,
                                                     p_precisao numeric, p_nota text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_slug text := lower(btrim(coalesce(p_slug, ''))); v_pa uuid; v_c public.edicao_publicacao%rowtype;
  v_motivo text := lower(btrim(coalesce(p_motivo, ''))); v_nota text; v_pu uuid; v_prec int; v_dist int; v_min float8;
  v_ult timestamptz; v_dup timestamptz; v_id uuid; v_pos boolean; v_geo boolean;
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

  -- SEC-04: o intervalo é validado ANTES de medir. NaN/Infinity/fora do intervalo = sem posição (nunca erro de banco).
  v_geo := p_lat is not null and p_lng is not null and p_lat between -90 and 90 and p_lng between -180 and 180;
  if not v_geo then p_lat := null; p_lng := null; end if;

  select min(public.carimbo_distancia(u.lat::float8, u.lng::float8, p_lat::float8, p_lng::float8)), count(*) > 0
    into v_min, v_pos
    from public.participacao_unidades pu join public.unidades u on u.id = pu.unidade_id
   where pu.participacao_id = v_pa and pu.participa and u.coordenada_verificada_em is not null and u.lat is not null;
  -- Casa sem ponto conferido: só "não precisa" se a organização liberou o carimbo sem GPS; senão o pedido é o caminho.
  if not v_pos and public.caca_sem_ponto_conta() then return jsonb_build_object('ok', false, 'motivo', 'nao_precisa', 'slug', v_slug); end if;

  v_prec := least(greatest(coalesce(p_precisao, 0), 0), 100000)::int;
  if v_geo and v_pos then
    v_dist := round(v_min)::int;
    if v_dist <= v_raio + least(v_prec, v_folga_max) then
      return jsonb_build_object('ok', false, 'motivo', 'nao_precisa', 'slug', v_slug);
    end if;
  else
    v_dist := null;
  end if;

  v_pu := public.caca_excecao_unidade(v_pa, p_lat, p_lng);
  if v_pu is null then return jsonb_build_object('ok', false, 'motivo', 'qr_invalido'); end if;
  v_nota := public.caca_texto_limpo(p_nota, 200);

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

-- decisão da organização: só a nota passa pela limpeza nova; o resto é igual a 20261214
create or replace function public.caca_excecao_decidir(p_secret text, p_id uuid, p_decisao text, p_nota text default null)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare e public.caca_carimbo_excecao%rowtype; v_dec text := lower(btrim(coalesce(p_decisao, ''))); v_nota text;
  v_c public.edicao_publicacao%rowtype; v_pu uuid; v_qr text; v_ult timestamptz; v_k uuid;
  v_ator text := coalesce(public.ator_rotulo_atual(), 'Painel'); v_slug text;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_dec not in ('aprovar', 'negar') then raise exception 'parametro_invalido'; end if;
  v_nota := public.caca_texto_limpo(p_nota, 200);
  select * into e from public.caca_carimbo_excecao where id = p_id for update;
  if e.id is null then raise exception 'pedido_nao_encontrado'; end if;
  if e.estado <> 'pendente' then raise exception 'transicao_invalida'; end if;
  select pa.slug_publico into v_slug from public.participacoes pa where pa.id = e.participacao_id;

  if v_dec = 'negar' then
    if v_nota is null then raise exception 'nota_obrigatoria'; end if;
    update public.caca_carimbo_excecao set estado = 'negado', decidido_por = v_ator, decidido_user = auth.uid(),
           decidido_em = now(), decisao_nota = v_nota where id = e.id;
    perform public.caca_evento_gravar(e.edicao_codigo, null, 'excecao_negada',
      jsonb_build_object('estado', 'pendente'), jsonb_build_object('estado', 'negado', 'pedido', e.id, 'casa', v_slug), v_nota);
    return jsonb_build_object('ok', true, 'estado', 'negado');
  end if;

  select * into v_c from public.edicao_publicacao where edicao_codigo = e.edicao_codigo;
  if not coalesce(v_c.avaliacao_aberta, false) or now() < v_c.avaliacao_abre_em then raise exception 'nao_aberta'; end if;
  if now() > v_c.avaliacao_fecha_em then raise exception 'encerrada'; end if;
  if not (e.participacao_id in (select public.caca_casas_conta(e.edicao_codigo))) then raise exception 'casa_sem_combo'; end if;

  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || e.edicao_codigo || ':' || e.pessoa, 0));
  select max(k.criado_em) into v_ult
    from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
   where k.participacao_id = e.participacao_id and m2.edicao_codigo = e.edicao_codigo and k.anulado_em is null
     and (k.mapa_id = e.mapa_id or m2.email_norm = e.pessoa);
  if v_ult is not null and now() < v_ult + interval '12 hours' then raise exception 'cedo'; end if;

  v_pu := coalesce(e.participacao_unidade_id, public.caca_excecao_unidade(e.participacao_id, null, null));
  select cq.codigo into v_qr from public.carimbo_qr cq where cq.participacao_unidade_id = v_pu and cq.ativo;
  if v_qr is null then
    v_pu := public.caca_excecao_unidade(e.participacao_id, null, null);
    select cq.codigo into v_qr from public.carimbo_qr cq where cq.participacao_unidade_id = v_pu and cq.ativo;
  end if;
  if v_qr is null then raise exception 'qr_invalido'; end if;

  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, distancia_m, precisao_m, conferido, origem)
  values (e.mapa_id, e.participacao_id, v_pu, v_qr, e.distancia_m, e.precisao_m, false, 'excecao_painel')
  returning id into v_k;
  update public.caca_carimbo_excecao set estado = 'aprovado', decidido_por = v_ator, decidido_user = auth.uid(),
         decidido_em = now(), decisao_nota = v_nota, carimbo_id = v_k, participacao_unidade_id = v_pu where id = e.id;
  perform public.caca_evento_gravar(e.edicao_codigo, null, 'excecao_aprovada',
    jsonb_build_object('estado', 'pendente'), jsonb_build_object('estado', 'aprovado', 'pedido', e.id, 'casa', v_slug, 'carimbo', v_k), v_nota);
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('carimbo.excecao', 'carimbos', v_k::text, e.participacao_id, jsonb_build_object('pedido', e.id, 'nota', v_nota));
  return jsonb_build_object('ok', true, 'estado', 'aprovado', 'carimbo_id', v_k);
end $$;

-- ---------------------------------------------------------------- C06: prêmio só com e-mail confirmado (confirmar E entregar), exceção explícita
create or replace function public.caca_premio_acao(p_secret text, p_premio uuid, p_acao text, p_nota text default null) returns jsonb
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare p public.caca_premio%rowtype; v_rel boolean; v_ed text; v_novo uuid; v_pick jsonb; v_estado text;
        v_nota text := public.caca_texto_limpo(p_nota, 500);
        v_exc boolean := coalesce(p_acao, '') in ('confirmar_excecao', 'entregar_excecao');
        v_ac text := case p_acao when 'confirmar_excecao' then 'confirmar' when 'entregar_excecao' then 'entregar' else coalesce(p_acao, '') end;
        v_ev text := coalesce(p_acao, '');
        v_novo_row public.caca_premio%rowtype; v_ator text := coalesce(public.ator_rotulo_atual(), 'Painel');
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  select edicao_codigo into v_ed from public.caca_premio where id = p_premio;
  if v_ed is null then raise exception 'premio_nao_encontrado'; end if;
  perform pg_advisory_xact_lock(hashtext('caca_premio:' || v_ed));
  select * into p from public.caca_premio where id = p_premio for update;

  v_estado := case v_ac
    when 'confirmar' then case when p.estado = 'selecionado' then 'confirmado' end
    when 'entregar' then case when p.estado = 'confirmado' then 'entregue' end
    when 'expirar' then case when p.estado = 'selecionado' then 'expirado' end
    when 'cancelar' then case when p.estado in ('selecionado', 'confirmado') then 'cancelado' end
    when 'substituir' then case when p.tipo = 'voucher_dia' and p.estado in ('selecionado', 'confirmado', 'expirado') then 'substituido' end
    else 'acao_invalida' end;
  if v_estado = 'acao_invalida' then raise exception 'acao_invalida'; end if;
  if v_estado is null then raise exception 'transicao_invalida'; end if;

  -- Regulamento: "o e-mail do mapa precisa estar confirmado". Vale para confirmar e para entregar.
  if v_ac in ('confirmar', 'entregar') then
    if public.caca_premio_email_ok(p.edicao_codigo, p.pessoa) then
      v_ev := v_ac;   -- e-mail em dia: ação normal, mesmo que tenha vindo como exceção
    elsif v_exc then
      -- Exceção explícita: precisa de nota (por que se confia no contato) e fica no histórico com o nome da exceção.
      if v_nota is null or char_length(v_nota) < 10 then raise exception 'nota_obrigatoria'; end if;
    elsif v_ac = 'entregar' and exists (select 1 from public.caca_evento ev
                                         where ev.premio_id = p.id and ev.acao = 'confirmar_excecao') then
      null;   -- a confirmação já foi feita por exceção explícita, com nota
    else
      raise exception 'email_nao_confirmado';
    end if;
  end if;

  update public.caca_premio set estado = v_estado, atualizado_em = now(), atualizado_por = v_ator,
         prazo_ate = case when v_estado in ('confirmado', 'entregue') then null else prazo_ate end,
         motivo = coalesce(v_nota, motivo)
   where id = p.id;
  perform public.caca_evento_gravar(p.edicao_codigo, p.id, v_ev, jsonb_build_object('estado', p.estado, 'prazo_ate', p.prazo_ate),
                                    jsonb_build_object('estado', v_estado), v_nota);

  if v_ac = 'substituir' then
    v_pick := public.caca_escolher_dia(p.edicao_codigo, p.dia, null);
    if v_pick is null then raise exception 'sem_proximo_elegivel'; end if;
    v_novo := public.caca_premio_dia_criar(p.edicao_codigo, p.dia, v_pick, p.id, true, v_nota);
    select * into v_novo_row from public.caca_premio where id = v_novo;
  end if;

  select * into p from public.caca_premio where id = p.id;
  return jsonb_build_object('ok', true, 'premio', public.caca_premio_json(p, v_rel),
                            'novo_premio', case when v_novo_row.id is not null then public.caca_premio_json(v_novo_row, v_rel) end);
end $$;

-- ---------------------------------------------------------------- C04: placar por pontos (regra extinta) fechado ao público
revoke all on function public.ranking_mapa(text), public.mapa_ler(text), public.carimbo_placar(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- SEC-05: definir_publicacao_edicao sem alias ambíguo (comportamento idêntico)
create or replace function public.definir_publicacao_edicao(p_secret text, p_edicao text, p_dados jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_de public.edicao_publicacao%rowtype; v_para public.edicao_publicacao%rowtype; k text;
begin
  -- D-18: participantes e combos públicos = curadoria (quem publica cada casa);
  -- fase, avaliação e resultados = edicao.gerir (administrador).
  if not public.pode(p_secret, 'edicao.gerir') then
    if not public.pode(p_secret, 'curadoria.decidir')
       or exists (select 1 from jsonb_object_keys(coalesce(p_dados, '{}'::jsonb)) as ch(chave_dado)
                   where ch.chave_dado not in ('participantes_publicos', 'combos_publicos')) then
      raise exception 'nao_autorizado';
    end if;
  end if;
  insert into public.edicao_publicacao (edicao_codigo) values (p_edicao) on conflict do nothing;
  select * into v_de from public.edicao_publicacao where edicao_codigo = p_edicao for update;
  for k in select jsonb_object_keys(coalesce(p_dados, '{}'::jsonb)) loop
    if k not in ('fase', 'participantes_publicos', 'combos_publicos', 'avaliacao_aberta',
                 'avaliacao_abre_em', 'avaliacao_fecha_em', 'resultados_publicos') then
      raise exception 'campo_invalido';
    end if;
  end loop;
  update public.edicao_publicacao set
    fase = coalesce(p_dados ->> 'fase', fase),
    participantes_publicos = coalesce((p_dados ->> 'participantes_publicos')::boolean, participantes_publicos),
    combos_publicos = coalesce((p_dados ->> 'combos_publicos')::boolean, combos_publicos),
    avaliacao_aberta = coalesce((p_dados ->> 'avaliacao_aberta')::boolean, avaliacao_aberta),
    avaliacao_abre_em = case when p_dados ? 'avaliacao_abre_em' then (p_dados ->> 'avaliacao_abre_em')::timestamptz else avaliacao_abre_em end,
    avaliacao_fecha_em = case when p_dados ? 'avaliacao_fecha_em' then (p_dados ->> 'avaliacao_fecha_em')::timestamptz else avaliacao_fecha_em end,
    resultados_publicos = coalesce((p_dados ->> 'resultados_publicos')::boolean, resultados_publicos),
    atualizado_em = now(), atualizado_por = public.rotulo_ator()
   where edicao_codigo = p_edicao
  returning * into v_para;   -- as restrições da tabela barram combinação incoerente
  insert into public.auditoria (acao, alvo_tabela, alvo_id, ator_rotulo, detalhe)
  values ('publicacao.edicao', 'edicao_publicacao', p_edicao, public.rotulo_ator(),
          jsonb_build_object('de', to_jsonb(v_de) - 'atualizado_em' - 'atualizado_por',
                             'para', to_jsonb(v_para) - 'atualizado_em' - 'atualizado_por'));
  return to_jsonb(v_para);
end $$;
