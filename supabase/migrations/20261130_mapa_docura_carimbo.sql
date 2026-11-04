-- Camada de edição Cartoon 2026.2 — MAPA DA DOÇURA: carimbo pelo QR fixo da unidade (03/11/2026).
-- Plano: docs/cartoon-2026-2/14-mapa-da-docura.md §14.2–14.6 (desenho revisto e aprovado pelo Wilker em 03/11).
-- ⚠️ SÓ APLICAR COM OK EXPLÍCITO DO WILKER. Reverter: supabase/reverter/20261130_mapa_docura_carimbo.sql.
--
--  * mapas_lover — o mapa do visitante, sem conta. Aqui fica só o HASH da chave; a chave vai uma vez ao aparelho.
--  * carimbo_qr  — um código aleatório de 8 letras por unidade da edição (o adesivo do balcão). Trocar o
--                  código desativa o velho.
--  * carimbos    — uma leitura aceita. Guarda distância e precisão em metros, NUNCA a posição.
--  * Regras (§14.2): janela = a da avaliação; 1 leitura por casa a cada 12 h, pelo mapa E pelo e-mail do mapa;
--    celular a até 200 m da unidade + margem do GPS (no máximo 300 m). Unidade sem ponto conferido: o carimbo
--    entra com conferido = false e aparece nos alertas.
--  * Pontos não são coluna: 1 por carimbo não anulado + 2 por casa com carimbo e avaliação do e-mail do mapa.
--  * Tabelas fechadas (RLS sem política); acesso só pelas funções abaixo.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tabelas
create table if not exists public.mapas_lover (
  id uuid primary key default gen_random_uuid(),
  edicao_codigo text not null references public.edicoes(codigo) on update cascade,
  chave_hash text not null unique,
  apelido text not null check (char_length(apelido) between 2 and 24),
  email_norm text not null check (email_norm ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\d{10,13}$'),
  no_ranking boolean not null default false,
  aceite_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);
create index if not exists mapas_lover_email on public.mapas_lover (edicao_codigo, email_norm);

create table if not exists public.carimbo_qr (
  codigo text primary key check (codigo ~ '^[a-hjkmnp-z2-9]{8}$'),
  participacao_unidade_id uuid not null references public.participacao_unidades(id) on delete cascade,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index if not exists carimbo_qr_um_ativo on public.carimbo_qr (participacao_unidade_id) where ativo;

create table if not exists public.carimbos (
  id uuid primary key default gen_random_uuid(),
  mapa_id uuid not null references public.mapas_lover(id) on delete cascade,
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  participacao_unidade_id uuid not null references public.participacao_unidades(id) on delete cascade,
  qr_codigo text not null,
  distancia_m integer,          -- null = unidade sem ponto conferido
  precisao_m integer,
  conferido boolean not null,
  criado_em timestamptz not null default now(),
  anulado_em timestamptz,
  anulado_motivo text check (anulado_motivo is null or char_length(anulado_motivo) <= 200)
);
create index if not exists carimbos_mapa_casa on public.carimbos (mapa_id, participacao_id, criado_em desc);
create index if not exists carimbos_casa_tempo on public.carimbos (participacao_id, criado_em);

alter table public.mapas_lover enable row level security;
alter table public.carimbo_qr enable row level security;
alter table public.carimbos enable row level security;
revoke all on table public.mapas_lover, public.carimbo_qr, public.carimbos from public, anon, authenticated;

-- ---------------------------------------------------------------- utilitários internos (sem grant)
-- 8 letras sem 0/o/1/l/i: 31^8 ≈ 8,5 × 10^11 combinações.
-- ponytail: módulo 31 sobre um byte tem viés minúsculo (256 % 31 = 8); irrelevante para adivinhação.
create or replace function public.carimbo_codigo_novo()
 returns text language plpgsql volatile set search_path to 'public'
as $$
declare a constant text := 'abcdefghjkmnpqrstuvwxyz23456789'; b bytea := extensions.gen_random_bytes(8); s text := ''; i int;
begin
  for i in 0..7 loop s := s || substr(a, 1 + (get_byte(b, i) % 31), 1); end loop;
  return s;
end $$;

create or replace function public.mapa_hash(p_chave text)
 returns text language sql immutable set search_path to 'public'
as $$ select encode(extensions.digest(coalesce(p_chave, ''), 'sha256'), 'hex') $$;

-- Placar da edição: uma linha por mapa com pelo menos um carimbo não anulado.
-- ponytail: "último" é o último carimbo; a hora da avaliação não entra no desempate.
create or replace function public.carimbo_placar(p_edicao text)
 returns table (mapa_id uuid, apelido text, email_norm text, whatsapp text, no_ranking boolean,
                carimbos int, casas int, avaliadas int, pontos int, ultimo timestamptz)
 language sql stable security definer set search_path to 'public'
as $$
  with c as (
    select k.mapa_id, k.participacao_id, count(*)::int n, max(k.criado_em) ultimo
      from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
     where m.edicao_codigo = p_edicao and k.anulado_em is null
     group by k.mapa_id, k.participacao_id
  ), por_mapa as (
    select c.mapa_id, sum(c.n)::int carimbos, count(*)::int casas,
           count(*) filter (where exists (select 1 from public.avaliacoes a join public.mapas_lover m on m.id = c.mapa_id
                                           where a.edicao_codigo = p_edicao and a.participacao_id = c.participacao_id
                                             and a.email_norm = m.email_norm))::int avaliadas,
           max(c.ultimo) ultimo
      from c group by c.mapa_id
  )
  select m.id, m.apelido, m.email_norm, m.whatsapp, m.no_ranking,
         p.carimbos, p.casas, p.avaliadas, p.carimbos + 2 * p.avaliadas, p.ultimo
    from por_mapa p join public.mapas_lover m on m.id = p.mapa_id
$$;

-- Distância em metros entre dois pontos (haversine).
create or replace function public.carimbo_distancia(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
 returns float8 language sql immutable set search_path to 'public'
as $$
  select 2 * 6371000 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2)
                               + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

-- ---------------------------------------------------------------- visitante (anônimo)
create or replace function public.mapa_criar(p_edicao text, p_apelido text, p_email text, p_whatsapp text,
                                             p_ranking boolean, p_aceite boolean)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_apelido text := btrim(coalesce(p_apelido, '')); v_email text := lower(btrim(coalesce(p_email, '')));
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

create or replace function public.mapa_ler(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_placar record; v_pos int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  select * into v_placar from public.carimbo_placar(m.edicao_codigo) p where p.mapa_id = m.id;
  if v_placar.mapa_id is not null then
    select count(*) + 1 into v_pos from public.carimbo_placar(m.edicao_codigo) p
     where p.pontos > v_placar.pontos or (p.pontos = v_placar.pontos and p.casas > v_placar.casas)
        or (p.pontos = v_placar.pontos and p.casas = v_placar.casas and p.ultimo < v_placar.ultimo);
  end if;
  return jsonb_build_object(
    'edicao', m.edicao_codigo, 'apelido', m.apelido, 'email', m.email_norm, 'whatsapp', m.whatsapp,
    'no_ranking', m.no_ranking,
    'pontos', coalesce(v_placar.pontos, 0), 'carimbos', coalesce(v_placar.carimbos, 0),
    'avaliadas', coalesce(v_placar.avaliadas, 0), 'posicao', v_pos,
    'casas', (select coalesce(jsonb_agg(jsonb_build_object(
                'slug', pa.slug_publico, 'carimbos', x.n, 'ultimo', x.ultimo,
                'liberado_em', x.ultimo + interval '12 hours',
                'avaliou', exists (select 1 from public.avaliacoes a where a.edicao_codigo = m.edicao_codigo
                                     and a.participacao_id = x.participacao_id and a.email_norm = m.email_norm))
                order by x.ultimo desc), '[]'::jsonb)
                from (select k.participacao_id, count(*)::int n, max(k.criado_em) ultimo
                        from public.carimbos k where k.mapa_id = m.id and k.anulado_em is null
                       group by k.participacao_id) x
                join public.participacoes pa on pa.id = x.participacao_id));
end $$;

-- Recusas voltam como {ok:false, motivo}: 'mapa_desconhecido' · 'qr_invalido' · 'nao_aberta' (abre_em) ·
-- 'encerrada' · 'sem_localizacao' · 'longe' (distancia_m) · 'cedo' (liberado_em).
create or replace function public.mapa_carimbar(p_chave text, p_qr text, p_lat numeric, p_lng numeric, p_precisao numeric)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; q record; v_c public.edicao_publicacao%rowtype;
  v_raio constant int := 200; v_folga_max constant int := 300; v_espera constant interval := interval '12 hours';
  v_dist int; v_prec int; v_conf boolean; v_ult timestamptz; v_primeira boolean; v_avaliou boolean;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;

  select cq.codigo, pu.id pu_id, pu.id_publico, pu.participacao_id, pa.edicao_codigo, pa.slug_publico,
         u.lat, u.lng, (u.coordenada_verificada_em is not null and u.lat is not null) conferida
    into q
    from public.carimbo_qr cq
    join public.participacao_unidades pu on pu.id = cq.participacao_unidade_id and pu.participa
    join public.participacoes pa on pa.id = pu.participacao_id and pa.status_cadastro <> 'encerrado'
    left join public.unidades u on u.id = pu.unidade_id
   where cq.codigo = lower(btrim(coalesce(p_qr, ''))) and cq.ativo
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  if not found or q.edicao_codigo <> m.edicao_codigo then
    return jsonb_build_object('ok', false, 'motivo', 'qr_invalido');
  end if;

  select * into v_c from public.edicao_publicacao where edicao_codigo = m.edicao_codigo;
  if not coalesce(v_c.avaliacao_aberta, false) or now() < v_c.avaliacao_abre_em then
    return jsonb_build_object('ok', false, 'motivo', 'nao_aberta', 'abre_em', v_c.avaliacao_abre_em, 'slug', q.slug_publico);
  end if;
  if now() > v_c.avaliacao_fecha_em then
    return jsonb_build_object('ok', false, 'motivo', 'encerrada', 'slug', q.slug_publico);
  end if;

  v_conf := q.conferida;
  if v_conf then
    if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
      return jsonb_build_object('ok', false, 'motivo', 'sem_localizacao', 'slug', q.slug_publico);
    end if;
    v_prec := least(greatest(coalesce(p_precisao, 0), 0), 100000)::int;
    v_dist := round(public.carimbo_distancia(q.lat::float8, q.lng::float8, p_lat::float8, p_lng::float8))::int;
    if v_dist > v_raio + least(v_prec, v_folga_max) then
      return jsonb_build_object('ok', false, 'motivo', 'longe', 'distancia_m', v_dist, 'slug', q.slug_publico);
    end if;
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
                            'liberado_em', now() + v_espera,
                            'pontos', coalesce((select p.pontos from public.carimbo_placar(m.edicao_codigo) p where p.mapa_id = m.id), 0));
end $$;

create or replace function public.mapa_apagar(p_chave text)
 returns boolean language plpgsql security definer set search_path to 'public'
as $$
begin
  delete from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);  -- carimbos vão junto (cascade)
  return found;
end $$;

create or replace function public.ranking_mapa(p_edicao text)
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object('posicao', r.pos, 'apelido', r.apelido, 'pontos', r.pontos, 'casas', r.casas)
                            order by r.pos), '[]'::jsonb)
    from (select row_number() over (order by p.pontos desc, p.casas desc, p.ultimo) pos, p.*
            from public.carimbo_placar(p_edicao) p) r
   where r.no_ranking and r.pos <= 10
$$;

-- ---------------------------------------------------------------- marca (logada)
create or replace function public.marca_carimbos_hoje()
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select jsonb_build_object(
    'hoje', count(*) filter (where (k.criado_em at time zone 'America/Fortaleza')::date = (now() at time zone 'America/Fortaleza')::date),
    'total', count(*))
    from public.carimbos k
    join public.participacoes pa on pa.id = k.participacao_id and pa.edicao_codigo = public.edicao_atual()
    join public.participantes p on p.id = pa.participante_id
   where p.user_id = auth.uid() and public.conta_ativa() and k.anulado_em is null
$$;

-- ---------------------------------------------------------------- organização (p_secret)
-- Aba Edição › Carimbos. dado.ler vê totais, ranking por apelido e alertas; contatos e números da sorte só com relatorio.ler.
create or replace function public.get_mapa_carimbos(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_rel boolean;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  return jsonb_build_object(
    'totais', (select jsonb_build_object(
                 'mapas', (select count(*) from public.mapas_lover where edicao_codigo = p_edicao),
                 'carimbos', count(*) filter (where k.anulado_em is null),
                 'anulados', count(*) filter (where k.anulado_em is not null),
                 'sem_conferencia', count(*) filter (where k.anulado_em is null and not k.conferido),
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
                           where m.edicao_codigo = p_edicao and k.anulado_em is null
                          window w as (partition by k.mapa_id order by k.criado_em)) s
                   where s.dist > 1000
                     and s.dist / greatest(extract(epoch from s.criado_em - s.antes), 1) > 60000.0 / 3600
                  union all
                  select jsonb_build_object('tipo', 'sem_conferencia', 'carimbo_id', k.id, 'mapa_id', k.mapa_id,
                           'apelido', m.apelido, 'em', k.criado_em, 'casa', pt.nome_marca)
                    from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                    join public.participacoes pa on pa.id = k.participacao_id
                    join public.participantes pt on pt.id = pa.participante_id
                   where m.edicao_codigo = p_edicao and k.anulado_em is null and not k.conferido) t),
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
end $$;

create or replace function public.carimbo_anular(p_secret text, p_carimbo uuid, p_motivo text)
 returns boolean language plpgsql security definer set search_path to 'public'
as $$
declare v_pa uuid;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  update public.carimbos set anulado_em = now(), anulado_motivo = left(nullif(btrim(coalesce(p_motivo, '')), ''), 200)
   where id = p_carimbo and anulado_em is null
  returning participacao_id into v_pa;
  if v_pa is null then return false; end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('carimbo.anulado', 'carimbos', p_carimbo::text, v_pa, jsonb_build_object('motivo', p_motivo));
  return true;
end $$;

-- Lista dos QR das unidades da edição; cria o código que faltar (unidade nova entra sozinha).
create or replace function public.get_carimbo_qr(p_secret text, p_edicao text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  insert into public.carimbo_qr (codigo, participacao_unidade_id)
  select public.carimbo_codigo_novo(), pu.id
    from public.participacao_unidades pu join public.participacoes pa on pa.id = pu.participacao_id
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado' and pu.participa
     and not exists (select 1 from public.carimbo_qr q where q.participacao_unidade_id = pu.id and q.ativo);
  return (select coalesce(jsonb_agg(jsonb_build_object(
            'participacao_unidade_id', pu.id, 'unidade', pu.id_publico, 'casa', pt.nome_marca, 'slug', pa.slug_publico,
            'nome_unidade', u.nome_unidade, 'bairro', coalesce(u.bairro, pu.bairro), 'codigo', q.codigo,
            'conferida', (u.coordenada_verificada_em is not null and u.lat is not null),
            'publicada', exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente))
            order by pt.nome_marca, pu.ordem), '[]'::jsonb)
            from public.participacao_unidades pu
            join public.participacoes pa on pa.id = pu.participacao_id
            join public.participantes pt on pt.id = pa.participante_id
            left join public.unidades u on u.id = pu.unidade_id
            join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
           where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado' and pu.participa);
end $$;

create or replace function public.carimbo_qr_novo(p_secret text, p_participacao_unidade uuid)
 returns text language plpgsql security definer set search_path to 'public'
as $$
declare v_codigo text := public.carimbo_codigo_novo(); v_pa uuid;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  select participacao_id into v_pa from public.participacao_unidades where id = p_participacao_unidade;
  if v_pa is null then raise exception 'unidade_desconhecida'; end if;
  update public.carimbo_qr set ativo = false where participacao_unidade_id = p_participacao_unidade and ativo;
  insert into public.carimbo_qr (codigo, participacao_unidade_id) values (v_codigo, p_participacao_unidade);
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('carimbo.qr_trocado', 'carimbo_qr', p_participacao_unidade::text, v_pa, '{}'::jsonb);
  return v_codigo;
end $$;

create or replace function public.mapa_nova_chave(p_secret text, p_mapa uuid)
 returns text language plpgsql security definer set search_path to 'public'
as $$
declare v_chave text := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  update public.mapas_lover set chave_hash = public.mapa_hash(v_chave) where id = p_mapa;
  if not found then raise exception 'mapa_desconhecido'; end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('mapa.chave_nova', 'mapas_lover', p_mapa::text, '{}'::jsonb);
  return v_chave;
end $$;

-- ---------------------------------------------------------------- semente: um QR por unidade da edição
insert into public.carimbo_qr (codigo, participacao_unidade_id)
select public.carimbo_codigo_novo(), pu.id
  from public.participacao_unidades pu join public.participacoes pa on pa.id = pu.participacao_id
 where pa.edicao_codigo = '2026.2' and pa.status_cadastro <> 'encerrado' and pu.participa
   and not exists (select 1 from public.carimbo_qr q where q.participacao_unidade_id = pu.id and q.ativo);

-- ---------------------------------------------------------------- permissões
revoke all on function public.carimbo_codigo_novo(), public.mapa_hash(text), public.carimbo_placar(text),
  public.carimbo_distancia(float8, float8, float8, float8),
  public.mapa_criar(text, text, text, text, boolean, boolean), public.mapa_ler(text),
  public.mapa_carimbar(text, text, numeric, numeric, numeric), public.mapa_apagar(text), public.ranking_mapa(text),
  public.marca_carimbos_hoje(), public.get_mapa_carimbos(text, text), public.carimbo_anular(text, uuid, text),
  public.get_carimbo_qr(text, text), public.carimbo_qr_novo(text, uuid), public.mapa_nova_chave(text, uuid)
  from public, anon, authenticated;
grant execute on function public.mapa_criar(text, text, text, text, boolean, boolean), public.mapa_ler(text),
  public.mapa_carimbar(text, text, numeric, numeric, numeric), public.mapa_apagar(text), public.ranking_mapa(text)
  to anon, authenticated;
grant execute on function public.marca_carimbos_hoje() to authenticated;
grant execute on function public.get_mapa_carimbos(text, text), public.carimbo_anular(text, uuid, text),
  public.get_carimbo_qr(text, text), public.carimbo_qr_novo(text, uuid), public.mapa_nova_chave(text, uuid)
  to anon, authenticated;
