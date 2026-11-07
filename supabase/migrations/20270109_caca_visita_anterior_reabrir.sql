-- Reabre os pedidos de carimbo de visita anterior enquanto a avaliação da edição estiver aberta.
-- O formulário e a aprovação continuam usando caca_carimbo_excecao; nenhum pedido é aprovado automaticamente.
-- O fim é lido da configuração ativa da avaliação, em vez de uma data fixa. Horário local: America/Fortaleza.
-- Reverter: supabase/reverter/20270109_caca_visita_anterior_reabrir.sql

create or replace function public.caca_visita_anterior_prazo()
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select coalesce((
    select jsonb_build_object(
      'aberto', coalesce(c.avaliacao_aberta, false)
        and c.avaliacao_abre_em is not null
        and c.avaliacao_fecha_em is not null
        and now() >= c.avaliacao_abre_em
        and now() < c.avaliacao_fecha_em,
      'ate', c.avaliacao_fecha_em,
      'ultimo_instante_local', case when c.avaliacao_fecha_em is not null
        then to_char((c.avaliacao_fecha_em at time zone 'America/Fortaleza') - interval '1 second', 'YYYY-MM-DD HH24:MI:SS') end,
      'fuso', 'America/Fortaleza',
      'agora', now())
    from public.edicao_publicacao c
    where c.edicao_codigo = '2026.2'
  ), jsonb_build_object('aberto', false, 'ate', null, 'ultimo_instante_local', null, 'fuso', 'America/Fortaleza', 'agora', now()))
$$;
