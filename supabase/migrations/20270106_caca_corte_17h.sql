-- Apuração dos vouchers (e fim da Caça) passa a cortar às 17h, hora de Natal, e não às 23h59.
-- O sorteio/confirmação acontece à noite do mesmo dia. Pedido do Wilker, 06/11/2026.
-- caca_corte(dia) = dia + corte_hora_local + 1 minuto (exclusivo): com "17:00" conta até 17:00:59.
update public.caca_premiacao_config
   set valor = '"17:00"'::jsonb,
       nota = 'Hora local de corte (17h, Natal). O minuto inteiro conta (até 17:00:59). O sorteio é à noite do mesmo dia.',
       atualizado_em = now()
 where chave = 'corte_hora_local';
