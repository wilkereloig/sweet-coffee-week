-- Movimento nas casas, parte E (docs/cartoon-2026-2/20-movimento-nas-casas.md): o nível passa a ser medido contra as MESAS da casa.
-- Pedido do Wilker (11/11): "5 pessoas não é número grande"; basear em algo real — a capacidade da casa.
--
-- 1. Taxa da casa = rastros (o mesmo índice: avaliações + carimbos por GPS + ½ QR) ÷ combos vendidos (vendas_diarias), nos dias
--    anteriores com venda registrada. Com menos de 50 combos registrados vale a taxa geral das casas. Presa entre 8% e 100%
--    (taxa baixa demais faz 1 avaliação virar dezenas de combos).
-- 2. Combos nas últimas 2 h ≈ índice ÷ taxa.
-- 3. Mesas ocupadas agora ≈ combos por hora × 30 min na mesa (o máximo, pelo Wilker) ÷ 1,5 combo por mesa (grupo de 2–3:
--    nem todo mundo pede combo, casal divide). Ocupação = mesas ocupadas ÷ mesas da casa.
-- Nível: 'alto' = ocupação ≥ 70% (e índice ≥ 3, para uma avaliação solta numa casa pequena não acender o selo) ·
-- 'tranquila' = ocupação ≤ 30% e a casa costuma ter movimento nessa hora (normal ≥ 1). Casa sem mesas cadastradas: sem selo.
-- ⚠️ Mede só o público do festival (combo); cliente de fora do festival não aparece — o número real na casa é maior.
-- Site e foto não mudam de formato (ocupação vai dentro de `fontes`). Reverter: supabase/reverter/20270129_caca_movimento_ocupacao.sql.

drop function if exists public.caca_movimento_calc(timestamptz);
create function public.caca_movimento_calc(p_agora timestamptz default now())
returns table (uid uuid, nome text, bairro text, indice numeric, normal numeric, nivel text, tranquila boolean,
               avaliacoes int, carimbos int, qr int, mesas int, taxa numeric, combos numeric, ocupacao numeric)
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_ed text; v_ini date; v_dia date; v_prev int; v_fuso text := 'America/Fortaleza';
  c_permanencia constant numeric := 0.5;   -- horas na mesa (30 min, o máximo)
  c_combos_mesa constant numeric := 1.5;   -- combos por mesa ocupada
  c_alto constant numeric := 0.7; c_tranquila constant numeric := 0.3;
begin
  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  select festival_inicio into v_ini from public.edicoes where codigo = v_ed;
  v_dia := (p_agora at time zone v_fuso)::date;
  v_prev := greatest(v_dia - coalesce(v_ini, v_dia), 0);
  return query
  with un as (
    select u.id, u.participacao_id pid, p.nome_marca nome, u.bairro, nullif(u.mesas, 0) mesas,
           count(*) over (partition by u.participacao_id) enderecos
      from public.participacao_unidades u
      join public.participacoes pa on pa.id = u.participacao_id and pa.edicao_codigo = v_ed and pa.status_cadastro <> 'encerrado'
      join public.participantes p on p.id = pa.participante_id
     where coalesce(u.participa, true)),
  k as (select generate_series(0, v_prev) k),
  ev as (
    select a.participacao_unidade_id uid, a.email_norm quem, a.criado_em t, 'av' fonte
      from public.avaliacoes a where a.edicao_codigo = v_ed and a.participacao_unidade_id is not null
    union all
    select c.participacao_unidade_id, coalesce(m.email_norm, c.mapa_id::text), c.criado_em, 'ca'
      from public.carimbos c join public.mapas_lover m on m.id = c.mapa_id
     where c.origem = 'gps' and c.anulado_em is null),
  pes as (
    select k.k, ev.uid, count(distinct ev.quem)::numeric pessoas,
           (count(*) filter (where ev.fonte = 'av'))::int av, (count(*) filter (where ev.fonte = 'ca'))::int ca
      from k join ev on ev.t > p_agora - make_interval(days => k.k) - interval '2 hours' and ev.t <= p_agora - make_interval(days => k.k)
     group by k.k, ev.uid),
  qrl as (
    select q.participacao_id pid, l.hora, l.leituras
      from public.qr_leituras_hora l join public.qr_pontos q on q.codigo = l.codigo and q.tipo = 'display_face1'
     where not coalesce(l.robo, false)),
  qr as (
    select k.k, qrl.pid, sum(qrl.leituras)::numeric n
      from k join qrl on qrl.hora >= date_trunc('hour', p_agora - make_interval(days => k.k) - interval '2 hours') and qrl.hora <= p_agora - make_interval(days => k.k)
     group by k.k, qrl.pid),
  -- Taxa: rastros do dia inteiro ÷ combos vendidos no dia, só dias anteriores a hoje com venda registrada.
  vd as (select v.participacao_id pid, v.dia, v.quantidade from public.vendas_diarias v where v.dia < v_dia and v.quantidade > 0),
  ras as (
    select vd.pid, vd.dia, vd.quantidade,
           coalesce((select sum(x.n) from (select count(distinct ev.quem)::numeric n from ev join un u2 on u2.id = ev.uid and u2.pid = vd.pid
                                            where (ev.t at time zone v_fuso)::date = vd.dia group by ev.uid) x), 0)
           + 0.5 * coalesce((select sum(qrl.leituras) from qrl where qrl.pid = vd.pid and (qrl.hora at time zone v_fuso)::date = vd.dia), 0) rastros
      from vd),
  geral as (select sum(rastros) / nullif(sum(quantidade), 0) t from ras),
  tx as (select ras.pid, sum(ras.rastros) / nullif(sum(ras.quantidade), 0) t, sum(ras.quantidade) n from ras group by ras.pid),
  ind as (
    select un.id, k.k, coalesce(pe.pessoas, 0) + 0.5 * coalesce(qr.n, 0) / un.enderecos indice,
           coalesce(pe.av, 0) av, coalesce(pe.ca, 0) ca, round(coalesce(qr.n, 0) / un.enderecos)::int qrn
      from un cross join k
      left join pes pe on pe.uid = un.id and pe.k = k.k
      left join qr on qr.pid = un.pid and qr.k = k.k),
  lin as (
    select un.id, un.nome, un.bairro, un.mesas, round(a.indice, 1) indice, a.av, a.ca, a.qrn,
           case when v_prev > 0 then round((select avg(b.indice) from ind b where b.id = un.id and b.k > 0), 1) end normal,
           least(greatest(coalesce(case when tx.n >= 50 then tx.t end, (select t from geral), 0.2), 0.08), 1) taxa
      from un join ind a on a.id = un.id and a.k = 0 left join tx on tx.pid = un.pid),
  occ as (
    select l.*, l.indice / l.taxa combos,
           case when l.mesas is not null then (l.indice / l.taxa) / 2 * c_permanencia / c_combos_mesa / l.mesas end ocup
      from lin l),
  niv as (
    select o.*, case when o.mesas is null then 'sem_dado'
                     when o.normal is null then 'sem_base'
                     when o.ocup >= c_alto and o.indice >= 3 then 'alto'
                     when o.indice < 3 and o.normal < 3 then 'sem_dado'
                     when o.normal >= 3 and o.indice < 0.5 * o.normal then 'baixo'
                     else 'normal' end nivel
      from occ o)
  select n.id, n.nome, n.bairro, n.indice, n.normal, n.nivel,
         (n.nivel <> 'alto' and n.mesas is not null and n.normal >= 1 and n.ocup <= c_tranquila) tranquila,
         n.av, n.ca, n.qrn, n.mesas, round(n.taxa, 3), round(n.combos), round(n.ocup, 2)
    from niv n;
end $function$;

create or replace function public.caca_movimento_gravar(p_agora timestamptz default now())
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_n int;
begin
  insert into public.caca_movimento_foto (participacao_unidade_id, indice, normal, nivel, tranquila, fontes, calculado_em)
  select c.uid, c.indice, c.normal, c.nivel, c.tranquila,
         jsonb_build_object('avaliacoes', c.avaliacoes, 'carimbos', c.carimbos, 'qr', c.qr,
                            'mesas', c.mesas, 'taxa', c.taxa, 'combos', c.combos, 'ocupacao', c.ocupacao), p_agora
    from public.caca_movimento_calc(p_agora) c
  on conflict (participacao_unidade_id) do update set indice = excluded.indice, normal = excluded.normal, nivel = excluded.nivel,
    tranquila = excluded.tranquila, fontes = excluded.fontes, calculado_em = excluded.calculado_em;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'unidades', v_n, 'em', p_agora);
end $function$;

revoke all on function public.caca_movimento_calc(timestamptz), public.caca_movimento_gravar(timestamptz) from public, anon, authenticated;

-- Painel (igual à 20270128 + mesas, taxa, combos e ocupação): o índice ao vivo, cada fonte separada, as respostas "Tinha fila?", o gráfico por hora e os displays com problema.
create or replace function public.caca_movimento_estado(p_secret text, p_agora timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_ed text; v_ini date; v_fuso text := 'America/Fortaleza'; v_dia date; v_prev int; v_res jsonb;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  select festival_inicio into v_ini from public.edicoes where codigo = v_ed;
  v_dia := (p_agora at time zone v_fuso)::date;
  v_prev := greatest(v_dia - coalesce(v_ini, v_dia), 0);

  with ev as (
    select a.participacao_unidade_id uid, a.criado_em t from public.avaliacoes a
     where a.edicao_codigo = v_ed and a.criado_em <= p_agora and (a.criado_em at time zone v_fuso)::date >= coalesce(v_ini, v_dia)
    union all
    select c.participacao_unidade_id, c.criado_em from public.carimbos c
     where c.origem = 'gps' and c.anulado_em is null and c.criado_em <= p_agora and (c.criado_em at time zone v_fuso)::date >= coalesce(v_ini, v_dia)),
  fila as (select c2.participacao_unidade_id uid,
                  count(*) filter (where f.resposta = 'sem_fila')::int sem_fila,
                  count(*) filter (where f.resposta = 'pequena')::int pequena,
                  count(*) filter (where f.resposta = 'grande')::int grande
             from public.caca_fila_resposta f join public.carimbos c2 on c2.id = f.carimbo_id
            where c2.anulado_em is null and c2.criado_em > p_agora - interval '2 hours' and c2.criado_em <= p_agora
            group by 1),
  pico as (select distinct on (uid) uid, extract(hour from t at time zone v_fuso)::int hora, count(*)::int n
             from ev group by uid, 2 order by uid, 3 desc, 2),
  tot as (select uid, count(*)::int n, count(*) filter (where (t at time zone v_fuso)::date = v_dia)::int hoje from ev group by uid),
  disp as (
    select q.participacao_id pid, p.nome_marca nome,
           coalesce(sum(l.leituras) filter (where not coalesce(l.robo, false) and (l.hora at time zone v_fuso)::date >= coalesce(v_ini, v_dia)), 0)::int leituras,
           max(l.hora) filter (where not coalesce(l.robo, false)) ultima,
           (select count(*)::int from public.carimbos c where c.participacao_id = q.participacao_id and c.origem = 'gps' and c.anulado_em is null) carimbos
      from public.qr_pontos q
      join public.participacoes pa on pa.id = q.participacao_id and pa.edicao_codigo = v_ed and pa.status_cadastro <> 'encerrado'
      join public.participantes p on p.id = pa.participante_id
      left join public.qr_leituras_hora l on l.codigo = q.codigo and l.hora <= p_agora
     where q.tipo = 'display_face1' and q.ativo
     group by q.participacao_id, p.nome_marca)
  select jsonb_build_object(
    'agora', p_agora, 'dia', v_dia, 'dias_base', v_prev, 'janela_horas', 2,
    'publico', coalesce((select (valor ->> 'ligado')::boolean from public.caca_config where chave = 'movimento_publico'), false),
    'foto_em', (select max(calculado_em) from public.caca_movimento_foto),
    'unidades', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.uid, 'nome', c.nome, 'bairro', c.bairro, 'indice', c.indice, 'normal', c.normal, 'nivel', c.nivel, 'tranquila', c.tranquila,
        'fontes', jsonb_build_object('avaliacoes', c.avaliacoes, 'carimbos', c.carimbos, 'qr', c.qr),
        'mesas', c.mesas, 'taxa', c.taxa, 'combos', c.combos, 'ocupacao', c.ocupacao,
        'fila', jsonb_build_object('sem_fila', coalesce(fi.sem_fila, 0), 'pequena', coalesce(fi.pequena, 0), 'grande', coalesce(fi.grande, 0)),
        'pico_hora', pi.hora, 'hoje', coalesce(t.hoje, 0), 'total', coalesce(t.n, 0))
      order by c.indice desc, coalesce(t.hoje, 0) desc, c.nome)
      from public.caca_movimento_calc(p_agora) c
      left join fila fi on fi.uid = c.uid left join pico pi on pi.uid = c.uid left join tot t on t.uid = c.uid), '[]'::jsonb),
    'horas', (select jsonb_agg(jsonb_build_object('hora', h,
                 'hoje', (select count(*) from ev where (ev.t at time zone v_fuso)::date = v_dia and extract(hour from ev.t at time zone v_fuso) = h),
                 'media', case when v_prev > 0 then round((select count(*) from ev where (ev.t at time zone v_fuso)::date < v_dia
                                                    and extract(hour from ev.t at time zone v_fuso) = h)::numeric / v_prev, 1) end)
               order by h) from generate_series(0, 23) h),
    -- Display com problema: nunca lido, parado há mais de 2 dias, ou muita leitura para pouco carimbo (lê e não consegue carimbar).
    'displays', coalesce((select jsonb_agg(jsonb_build_object('nome', d.nome, 'leituras', d.leituras, 'carimbos', d.carimbos, 'ultima', d.ultima,
        'problema', case when d.leituras = 0 then 'nunca_lido'
                         when d.ultima < p_agora - interval '48 hours' then 'parado'
                         else 'le_e_nao_carimba' end) order by d.nome)
      from disp d
     where d.leituras = 0 or d.ultima < p_agora - interval '48 hours' or (d.leituras >= 30 and d.carimbos < 0.4 * d.leituras)), '[]'::jsonb))
    into v_res;
  return v_res;
end $function$;
