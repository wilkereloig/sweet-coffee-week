-- Movimento nas casas, parte A (docs/cartoon-2026-2/20-movimento-nas-casas.md): leitura para o painel.
-- Só carimbos com origem 'gps' contam: são os únicos feitos no local, na hora. Delivery, visita anterior e exceção
-- aprovada no painel têm o horário da aprovação, não da presença.
-- Nível da unidade nas últimas 2 horas (1 h deixava 39 de 42 casas sem dado no pico de 10/11: ~1 carimbo/h por casa), comparado com a média dela na mesma janela dos dias anteriores da edição:
--   sem_dado (< 3 carimbos nas 2 h) · calmo (< metade do normal) · agitado (> 1,5 × o normal, ou normal 0) · normal · sem_base (1º dia, sem média).
-- Só leitura; nada no site. Reverter: supabase/reverter/20270125_caca_movimento.sql.

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
  pico as (select distinct on (uid) uid, extract(hour from criado_em at time zone v_fuso)::int hora, count(*)::int n
             from c group by uid, 2 order by uid, 3 desc, 2),
  tot as (select uid, count(*)::int n, count(*) filter (where (criado_em at time zone v_fuso)::date = v_dia)::int hoje from c group by uid),
  lin as (
    select un.id, un.nome, un.bairro, coalesce(a.n, 0) janela,
           case when v_prev > 0 then round(coalesce(b.n, 0)::numeric / v_prev, 1) end normal,
           pi.hora pico_hora, coalesce(t.hoje, 0) hoje, coalesce(t.n, 0) total
      from un left join agora a on a.uid = un.id left join antes b on b.uid = un.id
      left join pico pi on pi.uid = un.id left join tot t on t.uid = un.id)
  select jsonb_build_object(
    'agora', p_agora, 'dia', v_dia, 'dias_base', v_prev, 'janela_horas', 2,
    'unidades', coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id, 'nome', l.nome, 'bairro', l.bairro, 'janela', l.janela, 'normal', l.normal,
        'nivel', case when l.janela < 3 then 'sem_dado'
                      when l.normal is null then 'sem_base'
                      when l.normal = 0 or l.janela > 1.5 * l.normal then 'agitado'
                      when l.janela < 0.5 * l.normal then 'calmo'
                      else 'normal' end,
        'pico_hora', l.pico_hora, 'hoje', l.hoje, 'total', l.total)
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

revoke all on function public.caca_movimento_estado(text, timestamptz) from public;
grant execute on function public.caca_movimento_estado(text, timestamptz) to anon, authenticated;
