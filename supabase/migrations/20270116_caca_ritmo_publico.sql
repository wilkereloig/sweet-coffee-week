-- Caça aos Carimbos: "quem mais avançou nas últimas 24 horas" (09/11/2026, pedido do Wilker: ver quem está no maior ritmo).
--
-- ADITIVA e só de leitura: uma função nova, nenhuma tabela, nenhuma regra alterada. A classificação oficial continua sendo a de
-- caca_ranking_v2 (casas, depois extras, empate na mesma posição); isto é um indicador complementar e não entra em prêmio nenhum.
--
-- Como calcula: o MESMO placar oficial lido em dois instantes (agora e p_horas atrás, pelo parâmetro p_ate que o placar já tem) e a
-- diferença por pessoa. Assim "avanço" quer dizer exatamente o que o ranking conta: casa validada e carimbo extra, nunca carimbo pendente.
-- Só entra quem autorizou aparecer no ranking (no_ranking) e só saem apelido e contagens, os mesmos dados que o ranking público já mostra.
-- Janela de 24 horas: o festival tem um corte por dia e a mesma casa só carimba de novo depois de 12 horas; em 24 h cabe um dia inteiro de
-- visitas sem misturar com o acumulado. Quem não avançou na janela não aparece (ausência de avanço não é "zero" de ninguém).
create or replace function public.caca_ritmo_publico(p_edicao text, p_horas integer default 24, p_limite integer default 5)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  with janela as (
    select now() as agora, now() - make_interval(hours => least(greatest(coalesce(p_horas, 24), 1), 72)) as desde
  ), avanco as (
    select a.apelido,
           a.casas - coalesce(b.casas, 0) as casas_novas,
           a.extras - coalesce(b.extras, 0) as extras_novos
      from public.caca_ranking_v2(p_edicao) a
      left join public.caca_ranking_v2(p_edicao, (select desde from janela)) b on b.pessoa = a.pessoa
     where a.no_ranking
  ), ordenado as (
    select v.*, row_number() over (order by v.casas_novas desc, v.extras_novos desc, v.apelido) rn
      from avanco v
     where v.casas_novas > 0 or v.extras_novos > 0
  )
  select jsonb_build_object(
    'horas', least(greatest(coalesce(p_horas, 24), 1), 72),
    'desde', (select desde from janela),
    'atualizado_em', (select agora from janela),
    'ritmo', coalesce((select jsonb_agg(jsonb_build_object('apelido', o.apelido, 'casas_novas', o.casas_novas, 'extras_novos', greatest(o.extras_novos, 0)) order by o.rn)
                         from ordenado o where o.rn <= least(greatest(coalesce(p_limite, 5), 1), 20)), '[]'::jsonb))
$$;

revoke all on function public.caca_ritmo_publico(text, integer, integer) from public;
grant execute on function public.caca_ritmo_publico(text, integer, integer) to anon, authenticated, service_role;
