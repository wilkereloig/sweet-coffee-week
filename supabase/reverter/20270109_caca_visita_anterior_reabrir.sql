-- Reverte para o prazo original: pedidos aceitos até 23h59:59 de 06/11/2026 (horário de Natal).
create or replace function public.caca_visita_anterior_prazo()
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select jsonb_build_object(
    'aberto', now() < (timestamp '2026-11-07 00:00:00' at time zone 'America/Fortaleza'),
    'ate', (timestamp '2026-11-07 00:00:00' at time zone 'America/Fortaleza'),
    'ultimo_instante_local', '2026-11-06 23:59:59',
    'fuso', 'America/Fortaleza',
    'agora', now())
$$;
