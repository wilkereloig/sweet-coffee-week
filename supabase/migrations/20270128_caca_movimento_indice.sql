-- Movimento nas casas, parte D (docs/cartoon-2026-2/20-movimento-nas-casas.md): índice somado, em segundo plano, e a parte pública.
-- Pedido do Wilker (11/11): juntar todas as fontes para acertar mais, nunca dizer "lotada", comparar a casa com o normal dela
-- e as casas entre si, e levar gente para onde há menos movimento.
--
-- Presenças de uma unidade nas últimas 2 h = pessoas diferentes que avaliaram o combo ali ou carimbaram por GPS (uma vez por
-- pessoa, pelo e-mail) + metade das leituras do QR da casa no display (anônimas: não dá para saber se é a mesma pessoa; o QR é
-- da casa, então as leituras se dividem entre os endereços dela; vêm por hora cheia).
-- Nível: 'alto' (≥ 4 presenças e > 1,5 × o normal da unidade) · 'baixo' (normal ≥ 3 e < metade dele) · 'normal' · 'sem_dado'
-- (< 3 agora e < 3 de normal) · 'sem_base' (1º dia). Normal = média da mesma janela nos dias anteriores da edição.
-- 'tranquila' = não está alta, costuma ter movimento nessa hora (normal ≥ 1: sem isso não há base para dizer nada) e tem
-- presenças até a mediana das casas com algum movimento (comparação entre as casas).
-- Um job (pg_cron, 15 min) grava a foto em caca_movimento_foto; o site lê a foto e só recebe 'alto' e 'tranquila', nunca
-- números. A parte pública nasce DESLIGADA (caca_config 'movimento_publico'). Aditiva.
-- Reverter: supabase/reverter/20270128_caca_movimento_indice.sql.

create table if not exists public.caca_movimento_foto (
  participacao_unidade_id uuid primary key references public.participacao_unidades(id) on delete cascade,
  indice numeric not null,
  normal numeric,
  nivel text not null,
  tranquila boolean not null default false,
  fontes jsonb not null default '{}'::jsonb,
  calculado_em timestamptz not null
);
alter table public.caca_movimento_foto enable row level security;
revoke all on table public.caca_movimento_foto from public, anon, authenticated;

insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
values ('movimento_publico', '{"ligado":false}'::jsonb,
        'Movimento nas casas no site (selo no cartão e na ficha, filtro "Menos movimento agora"). Desligado: o site não recebe nada.', now(), 'migration')
on conflict (chave) do nothing;

-- O cálculo, sem gravar: serve à foto (job) e ao painel (ao vivo, e com p_agora para conferir um horário passado).
create or replace function public.caca_movimento_calc(p_agora timestamptz default now())
returns table (uid uuid, nome text, bairro text, indice numeric, normal numeric, nivel text, tranquila boolean,
               avaliacoes int, carimbos int, qr int)
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_ed text; v_ini date; v_dia date; v_prev int;
begin
  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  select festival_inicio into v_ini from public.edicoes where codigo = v_ed;
  v_dia := (p_agora at time zone 'America/Fortaleza')::date;
  v_prev := greatest(v_dia - coalesce(v_ini, v_dia), 0);
  return query
  with un as (
    select u.id, u.participacao_id pid, p.nome_marca nome, u.bairro,
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
  qr as (
    select k.k, q.participacao_id pid, sum(l.leituras)::numeric n
      from k join public.qr_leituras_hora l
        on l.hora >= date_trunc('hour', p_agora - make_interval(days => k.k) - interval '2 hours') and l.hora <= p_agora - make_interval(days => k.k)
      join public.qr_pontos q on q.codigo = l.codigo and q.tipo = 'display_face1'
     where not coalesce(l.robo, false)
     group by k.k, q.participacao_id),
  ind as (
    select un.id, k.k, coalesce(pe.pessoas, 0) + 0.5 * coalesce(qr.n, 0) / un.enderecos indice,
           coalesce(pe.av, 0) av, coalesce(pe.ca, 0) ca, round(coalesce(qr.n, 0) / un.enderecos)::int qrn
      from un cross join k
      left join pes pe on pe.uid = un.id and pe.k = k.k
      left join qr on qr.pid = un.pid and qr.k = k.k),
  lin as (
    select un.id, un.nome, un.bairro, round(a.indice, 1) indice, a.av, a.ca, a.qrn,
           case when v_prev > 0 then round((select avg(b.indice) from ind b where b.id = un.id and b.k > 0), 1) end normal
      from un join ind a on a.id = un.id and a.k = 0),
  med as (select percentile_cont(0.5) within group (order by l.indice) m from lin l where l.indice > 0),
  niv as (
    select l.*, case when l.normal is null then 'sem_base'
                     when l.indice >= 4 and l.indice > 1.5 * l.normal then 'alto'
                     when l.indice < 3 and l.normal < 3 then 'sem_dado'
                     when l.normal >= 3 and l.indice < 0.5 * l.normal then 'baixo'
                     else 'normal' end nivel
      from lin l)
  select n.id, n.nome, n.bairro, n.indice, n.normal, n.nivel,
         (n.nivel <> 'alto' and n.normal >= 1 and n.indice <= coalesce((select m from med), 0)) tranquila, n.av, n.ca, n.qrn
    from niv n;
end $function$;

-- Segundo plano: grava a foto que o site lê. Chamado pelo job; ninguém de fora executa.
create or replace function public.caca_movimento_gravar(p_agora timestamptz default now())
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_n int;
begin
  insert into public.caca_movimento_foto (participacao_unidade_id, indice, normal, nivel, tranquila, fontes, calculado_em)
  select c.uid, c.indice, c.normal, c.nivel, c.tranquila,
         jsonb_build_object('avaliacoes', c.avaliacoes, 'carimbos', c.carimbos, 'qr', c.qr), p_agora
    from public.caca_movimento_calc(p_agora) c
  on conflict (participacao_unidade_id) do update set indice = excluded.indice, normal = excluded.normal, nivel = excluded.nivel,
    tranquila = excluded.tranquila, fontes = excluded.fontes, calculado_em = excluded.calculado_em;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'unidades', v_n, 'em', p_agora);
end $function$;

-- Site: só com o interruptor ligado, só foto recente (40 min: o job falhou, o site se cala) e só casa com combo publicado.
-- Sai o id público da unidade, se o movimento está alto e se é uma das mais tranquilas. Nenhum número.
create or replace function public.movimento_publico(p_edicao text)
returns table (unidade text, alto boolean, tranquila boolean) language sql stable security definer set search_path to 'public' as $function$
  select u.id_publico, f.nivel = 'alto', f.tranquila
    from public.caca_movimento_foto f
    join public.participacao_unidades u on u.id = f.participacao_unidade_id
    join public.participacoes pa on pa.id = u.participacao_id
    join public.edicao_publicacao ep on ep.edicao_codigo = pa.edicao_codigo and ep.participantes_publicos and ep.combos_publicos
    join public.publicacoes pb on pb.participacao_id = pa.id and pb.vigente and pb.nivel = 'marca_e_combo'
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado' and u.id_publico is not null
     and f.calculado_em > now() - interval '40 minutes'
     and f.nivel not in ('sem_base')
     and coalesce((select (valor ->> 'ligado')::boolean from public.caca_config where chave = 'movimento_publico'), false);
$function$;

create or replace function public.caca_movimento_publico_definir(p_secret text, p_ligado boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if p_ligado is null then raise exception 'estado_invalido'; end if;
  insert into public.caca_config (chave, valor, atualizado_em, atualizado_por)
  values ('movimento_publico', jsonb_build_object('ligado', p_ligado), now(), 'painel')
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = 'painel';
  return jsonb_build_object('ok', true, 'ligado', p_ligado);
end $function$;

-- Painel: o índice ao vivo, cada fonte separada, as respostas "Tinha fila?", o gráfico por hora e os displays com problema.
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

revoke all on function public.caca_movimento_calc(timestamptz), public.caca_movimento_gravar(timestamptz) from public, anon, authenticated;
revoke all on function public.movimento_publico(text), public.caca_movimento_publico_definir(text, boolean),
  public.caca_movimento_estado(text, timestamptz) from public;
grant execute on function public.movimento_publico(text), public.caca_movimento_publico_definir(text, boolean),
  public.caca_movimento_estado(text, timestamptz) to anon, authenticated;

-- O job do segundo plano (a cada 15 min). Idempotente: recria se já existir.
select cron.unschedule(jobid) from cron.job where jobname = 'scw-caca-movimento';
select cron.schedule('scw-caca-movimento', '*/15 * * * *', $$select public.caca_movimento_gravar()$$);
