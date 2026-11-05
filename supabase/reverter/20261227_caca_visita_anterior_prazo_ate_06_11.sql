-- Reverte 20261227: o prazo dos NOVOS pedidos de visita anterior volta a acabar em 05/11/2026 23h59:59 (America/Fortaleza).
-- create or replace não mexe nos grants (anon, authenticated) dados por 20261226.
create or replace function public.caca_visita_anterior_prazo()
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select jsonb_build_object(
    'aberto', now() < (timestamp '2026-11-06 00:00:00' at time zone 'America/Fortaleza'),
    'ate', (timestamp '2026-11-06 00:00:00' at time zone 'America/Fortaleza'),
    'ultimo_instante_local', '2026-11-05 23:59:59',
    'fuso', 'America/Fortaleza',
    'agora', now())
$$;
