-- Caça aos Carimbos · leitura PÚBLICA dos prêmios (aba "Prêmios" do Mapa da Doçura).
-- NÃO APLICADA: gravar no banco só com o ok do Wilker (ver docs/cartoon-2026-2/15-caca-contrato-premiacao.md).
--
-- Por quê: `caca_config_ler` é só de painel (p_secret). O visitante não tinha como ler os dias dos vouchers, a validade, o
-- número de ganhadores finais nem o estado de cada dia; a tela escreveria 7..11 e 15/11 à mão (segunda fonte da verdade).
-- Esta função devolve SÓ o que é público: a configuração que a organização já edita em `caca_premiacao_config` e um
-- estado por dia calculado do relógio do servidor. Nenhum nome, apelido, e-mail ou posição de ninguém.
--
-- Estado do dia (fuso e corte da própria configuração):
--   proximo      — antes das 00:00 do dia
--   em_disputa   — durante o dia, até o corte
--   em_apuracao  — passou o corte e ainda não há voucher CONFIRMADO ou ENTREGUE para o dia
--   resultado    — existe prêmio do dia em estado confirmado/entregue (a pessoa NÃO é exposta)
-- Só a organização move um prêmio para `confirmado`; "selecionado" (pendente) continua `em_apuracao`.
--
-- Reverter: drop function if exists public.caca_premios_publico(text);

create or replace function public.caca_premios_publico(p_edicao text)
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  with cfg as (
    select (public.caca_pcfg('fuso') #>> '{}') as fuso
  ), dias as (
    select (v #>> '{}')::date as dia
      from jsonb_array_elements(coalesce(public.caca_pcfg('voucher_dias'), '[]'::jsonb)) v
  )
  select jsonb_build_object(
    'agora', now(),
    'fuso', (select fuso from cfg),
    'corte_hora_local', public.caca_pcfg('corte_hora_local'),
    'voucher_validade_ate', public.caca_pcfg('voucher_validade_ate'),
    'ganhadores_final', public.caca_pcfg('ganhadores_final'),
    'dias', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dia', d.dia,
        'corte', public.caca_corte(d.dia),
        'estado', case
          when now() >= public.caca_corte(d.dia) then
            case when exists (select 1 from public.caca_premio p
                               where p.edicao_codigo = p_edicao and p.tipo = 'voucher_dia' and p.dia = d.dia
                                 and p.estado in ('confirmado', 'entregue'))
                 then 'resultado' else 'em_apuracao' end
          when now() >= (d.dia::timestamp at time zone (select fuso from cfg)) then 'em_disputa'
          else 'proximo' end
      ) order by d.dia) from dias d
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.caca_premios_publico(text) from public;
grant execute on function public.caca_premios_publico(text) to anon, authenticated;
