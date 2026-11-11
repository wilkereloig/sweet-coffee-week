-- Reverte 20270128_caca_movimento_indice.sql: para o job, o movimento do painel volta à versão da 20270126
-- (só carimbos por GPS + "Tinha fila?") e somem a foto, o interruptor e a leitura pública.
begin;
select cron.unschedule(jobid) from cron.job where jobname = 'scw-caca-movimento';
create or replace function public.caca_movimento_estado(p_secret text, p_agora timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_ed text; v_ini date; v_fuso text := 'America/Fortaleza'; v_dia date; v_prev int; v_res jsonb;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  select festival_inicio into v_ini from public.edicoes where codigo = v_ed;
  v_dia := (p_agora at time zone v_fuso)::date;
  v_prev := greatest(v_dia - coalesce(v_ini, v_dia), 0); -- dias anteriores da edição que entram na média

  with un as (
    select u.id, p.nome_marca nome, u.bairro
      from public.participacao_unidades u
      join public.participacoes pa on pa.id = u.participacao_id and pa.edicao_codigo = v_ed
      join public.participantes p on p.id = pa.participante_id
     where coalesce(u.participa, true)),
  c as (select participacao_unidade_id uid, criado_em from public.carimbos
         where origem = 'gps' and anulado_em is null and criado_em <= p_agora
           and (criado_em at time zone v_fuso)::date >= coalesce(v_ini, v_dia)),
  agora as (select uid, count(*)::int n from c where criado_em > p_agora - interval '2 hours' group by uid),
  antes as (select c.uid, count(*)::int n from c join generate_series(1, v_prev) k on
              c.criado_em > p_agora - make_interval(days => k) - interval '2 hours' and c.criado_em <= p_agora - make_interval(days => k)
            group by c.uid),
  fila as (select c2.participacao_unidade_id uid,
                   count(*) filter (where f.resposta = 'sem_fila')::int sem_fila,
                   count(*) filter (where f.resposta = 'pequena')::int pequena,
                   count(*) filter (where f.resposta = 'grande')::int grande
              from public.caca_fila_resposta f join public.carimbos c2 on c2.id = f.carimbo_id
             where c2.anulado_em is null and c2.criado_em > p_agora - interval '2 hours' and c2.criado_em <= p_agora
             group by 1),
  pico as (select distinct on (uid) uid, extract(hour from criado_em at time zone v_fuso)::int hora, count(*)::int n
             from c group by uid, 2 order by uid, 3 desc, 2),
  tot as (select uid, count(*)::int n, count(*) filter (where (criado_em at time zone v_fuso)::date = v_dia)::int hoje from c group by uid),
  lin as (
    select un.id, un.nome, un.bairro, coalesce(a.n, 0) janela,
           case when v_prev > 0 then round(coalesce(b.n, 0)::numeric / v_prev, 1) end normal,
           pi.hora pico_hora, coalesce(t.hoje, 0) hoje, coalesce(t.n, 0) total,
           jsonb_build_object('sem_fila', coalesce(fi.sem_fila, 0), 'pequena', coalesce(fi.pequena, 0), 'grande', coalesce(fi.grande, 0)) fila
      from un left join agora a on a.uid = un.id left join antes b on b.uid = un.id
      left join pico pi on pi.uid = un.id left join tot t on t.uid = un.id left join fila fi on fi.uid = un.id)
  select jsonb_build_object(
    'agora', p_agora, 'dia', v_dia, 'dias_base', v_prev, 'janela_horas', 2,
    'unidades', coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id, 'nome', l.nome, 'bairro', l.bairro, 'janela', l.janela, 'normal', l.normal,
        'nivel', case when l.janela < 3 then 'sem_dado'
                      when l.normal is null then 'sem_base'
                      when l.normal = 0 or l.janela > 1.5 * l.normal then 'agitado'
                      when l.janela < 0.5 * l.normal then 'calmo'
                      else 'normal' end,
        'pico_hora', l.pico_hora, 'hoje', l.hoje, 'total', l.total, 'fila', l.fila)
      order by l.janela desc, l.hoje desc, l.nome), '[]'::jsonb),
    'horas', (select jsonb_agg(jsonb_build_object('hora', h,
                 'hoje', (select count(*) from c where (c.criado_em at time zone v_fuso)::date = v_dia
                                                    and extract(hour from c.criado_em at time zone v_fuso) = h),
                 'media', case when v_prev > 0 then round((select count(*) from c where (c.criado_em at time zone v_fuso)::date < v_dia
                                                    and extract(hour from c.criado_em at time zone v_fuso) = h)::numeric / v_prev, 1) end)
               order by h) from generate_series(0, 23) h))
    into v_res from lin l;
  return v_res;
end $function$;

drop function if exists public.movimento_publico(text);
drop function if exists public.caca_movimento_publico_definir(text, boolean);
drop function if exists public.caca_movimento_gravar(timestamptz);
drop function if exists public.caca_movimento_calc(timestamptz);
drop table if exists public.caca_movimento_foto;
delete from public.caca_config where chave = 'movimento_publico';
commit;
