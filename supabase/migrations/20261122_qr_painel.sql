-- QR de contagem · Fase 2: o painel lê as leituras (Operação › QR Codes).
-- Plano: docs/cartoon-2026-2/12-plano-qr-leituras.md §12.5 e §12.7. Depende de 20261121_qr_leituras.sql.
--
--  get_qr_resumo(p_secret, p_de, p_ate, p_testes)  · permissão dado.ler · tudo o que a aba mostra, numa chamada só:
--      totais, leituras por tipo de peça, por casa (o ranking), por peça, por dia, por hora do dia, por cidade, por aparelho.
--  qr_resumo_dados(p_de, p_ate, p_testes)          · o cálculo, sem a checagem de permissão; fechada para anon/authenticated.
--      Existe para o cálculo poder ser testado de verdade (a mesma função que roda em produção) sem credencial.
--
--  Só leitura: nada aqui grava. As tabelas seguem fechadas; o painel só enxerga o que estas funções devolvem.
--  Robôs (pré-visualização, verificador de link, HEAD) ficam fora de todos os números, menos de "robos".
--  O ponto `teste` só entra com p_testes = true. Datas valem no fuso de Natal; p_ate é o último dia INCLUÍDO.
--  Idempotente (create or replace).

create or replace function public.qr_resumo_dados(
  p_de date default null,
  p_ate date default null,
  p_testes boolean default false
) returns jsonb
language plpgsql
stable
set search_path to 'public'
as $$
declare
  v_fuso constant text := 'America/Fortaleza';
  v_testes boolean := coalesce(p_testes, false);
  v_de timestamptz := case when p_de is null then '-infinity'::timestamptz else p_de::timestamp at time zone v_fuso end;
  v_ate timestamptz := case when p_ate is null then 'infinity'::timestamptz else (p_ate + 1)::timestamp at time zone v_fuso end;
  v_hoje timestamptz := date_trunc('day', now(), v_fuso);
begin
  return (
    with base as (
      select l.codigo, l.hora, l.cidade, l.regiao, l.aparelho, l.robo, l.leituras, p.tipo, p.participacao_id
        from public.qr_leituras_hora l
        join public.qr_pontos p on p.codigo = l.codigo
       where l.hora >= v_de and l.hora < v_ate
         and (v_testes or p.tipo <> 'teste')
    ), gente as (
      select * from base where not robo
    )
    select jsonb_build_object(
      'periodo', jsonb_build_object('de', p_de, 'ate', p_ate, 'testes', v_testes),
      'totais', jsonb_build_object(
        'leituras', coalesce((select sum(leituras) from gente), 0)::int,
        'hoje', coalesce((select sum(leituras) from gente where hora >= v_hoje), 0)::int,
        'robos', coalesce((select sum(leituras) from base where robo), 0)::int,
        'ultima', (select max(hora) from gente)),
      'tipos', (
        select coalesce(jsonb_agg(jsonb_build_object('tipo', t.tipo, 'pontos', t.pontos, 'leituras', coalesce(g.n, 0)) order by t.tipo), '[]'::jsonb)
          from (select tipo, count(*)::int as pontos from public.qr_pontos where v_testes or tipo <> 'teste' group by tipo) t
          left join (select tipo, sum(leituras)::int as n from gente group by tipo) g on g.tipo = t.tipo),
      'casas', (
        select coalesce(jsonb_agg(s.c order by (s.c ->> 'total')::int desc, s.c ->> 'nome'), '[]'::jsonb) from (
          select jsonb_build_object(
                   'participacao_id', pa.id,
                   'nome', pt.nome_marca,
                   'face1', coalesce(sum(g.leituras) filter (where g.tipo = 'display_face1'), 0)::int,
                   'face2', coalesce(sum(g.leituras) filter (where g.tipo = 'display_face2'), 0)::int,
                   'outras', coalesce(sum(g.leituras) filter (where g.tipo not in ('display_face1', 'display_face2')), 0)::int,
                   'total', coalesce(sum(g.leituras), 0)::int,
                   'ultima', max(g.hora)) as c
            from (select distinct participacao_id from public.qr_pontos
                   where participacao_id is not null and (v_testes or tipo <> 'teste')) q
            join public.participacoes pa on pa.id = q.participacao_id
            join public.participantes pt on pt.id = pa.participante_id
            left join gente g on g.participacao_id = pa.id
           group by pa.id, pt.nome_marca) s),
      'pontos', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'codigo', p.codigo, 'tipo', p.tipo, 'rotulo', p.rotulo, 'participacao_id', p.participacao_id,
                 'destino', p.destino, 'ativo', p.ativo, 'leituras', coalesce(g.n, 0), 'ultima', g.ultima)
               order by coalesce(g.n, 0) desc, p.codigo), '[]'::jsonb)
          from public.qr_pontos p
          left join (select codigo, sum(leituras)::int as n, max(hora) as ultima from gente group by codigo) g on g.codigo = p.codigo
         where v_testes or p.tipo <> 'teste'),
      'dias', (
        select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'leituras', d.n) order by d.dia), '[]'::jsonb)
          from (select (hora at time zone v_fuso)::date as dia, sum(leituras)::int as n from gente group by 1) d),
      'horas', (
        select coalesce(jsonb_agg(jsonb_build_object('hora', h.h, 'leituras', h.n) order by h.h), '[]'::jsonb)
          from (select extract(hour from hora at time zone v_fuso)::int as h, sum(leituras)::int as n from gente group by 1) h),
      'cidades', (
        select coalesce(jsonb_agg(jsonb_build_object('cidade', x.cidade, 'regiao', x.regiao, 'leituras', x.n) order by x.n desc, x.cidade), '[]'::jsonb)
          from (select cidade, regiao, sum(leituras)::int as n from gente group by cidade, regiao order by 3 desc, 1 limit 15) x),
      'aparelhos', (
        select coalesce(jsonb_agg(jsonb_build_object('aparelho', a.aparelho, 'leituras', a.n) order by a.n desc, a.aparelho), '[]'::jsonb)
          from (select aparelho, sum(leituras)::int as n from gente group by aparelho) a)
    )
  );
end $$;
comment on function public.qr_resumo_dados(date, date, boolean) is
  'Cálculo do resumo de leituras de QR (sem checagem de permissão). Só get_qr_resumo e o service_role chamam.';
revoke all on function public.qr_resumo_dados(date, date, boolean) from public, anon, authenticated;
grant execute on function public.qr_resumo_dados(date, date, boolean) to service_role;

create or replace function public.get_qr_resumo(
  p_secret text,
  p_de date default null,
  p_ate date default null,
  p_testes boolean default false
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return public.qr_resumo_dados(p_de, p_ate, p_testes);
end $$;
comment on function public.get_qr_resumo(text, date, date, boolean) is
  'Resumo das leituras de QR para a aba Operação › QR Codes do painel (dado.ler). Mesmo padrão das outras RPCs do painel.';
revoke all on function public.get_qr_resumo(text, date, date, boolean) from public;
grant execute on function public.get_qr_resumo(text, date, date, boolean) to anon, authenticated, service_role;
