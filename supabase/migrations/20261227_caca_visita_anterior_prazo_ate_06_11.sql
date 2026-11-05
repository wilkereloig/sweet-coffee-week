-- Carimbo de visita anterior: o prazo para NOVOS pedidos passa de 05/11 para até 23h59:59 de 06/11/2026 (America/Fortaleza). (05/11/2026, pedido do Wilker)
-- Só o prazo desta ação muda; datas da edição e dos vouchers não. Aplicada no banco como `caca_visita_anterior_prazo_ate_06_11`.
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
