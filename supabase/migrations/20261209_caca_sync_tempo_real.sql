-- Caça aos Carimbos: o painel passa a ser avisado quando prêmio, apuração, regra ou auditoria mudam (domínio 'carimbos',
-- canal scw:org). Antes só havia sinal LOCAL (da própria aba): duas pessoas em "Vouchers do dia" viam estados diferentes.
-- Sinal mínimo (domínio + id opaco), mesmo mecanismo de 20261022_sincronizacao_tempo_real.sql. Aditivo: só cria gatilhos que não existem.
-- NÃO inclui `carimbos`/`mapas_lover` de propósito: um sinal por carimbo viraria tempestade de releitura no dia do evento.
-- Reversão: supabase/reverter/20261209_caca_sync_tempo_real.sql.
do $$
declare t record;
begin
  for t in select * from (values
    ('caca_premio',        'insert or update or delete', 'id'),
    ('caca_apuracao_dia',  'insert or update or delete', ''),
    ('caca_config',        'insert or update or delete', ''),
    ('caca_evento',        'insert',                     'id')
  ) as v(tabela, evento, refcol)
  loop
    if not exists (select 1 from pg_trigger g where g.tgname = 'sync_' || t.tabela
                    and g.tgrelid = to_regclass('public.' || quote_ident(t.tabela)) and not g.tgisinternal) then
      execute format('create trigger %I after %s on public.%I for each row execute function public.sync_gatilho(%L, %L, %L)',
                     'sync_' || t.tabela, t.evento, t.tabela, 'carimbos', 'org', t.refcol);
    end if;
  end loop;
end $$;
