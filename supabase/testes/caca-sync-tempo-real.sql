-- Teste de 20261209 (sinal em tempo real da Caça). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
do $$
declare t text; n int;
begin
  foreach t in array array['caca_premio','caca_apuracao_dia','caca_config','caca_evento'] loop
    select count(*) into n from pg_trigger g
     where g.tgname = 'sync_' || t and g.tgrelid = to_regclass('public.' || t) and not g.tgisinternal
       and g.tgfoid = 'public.sync_gatilho()'::regprocedure;
    if n <> 1 then raise exception 'gatilho sync_% ausente', t; end if;
  end loop;
  -- Nenhuma tabela da Caça entrou na publicação do Realtime (só Broadcast mínimo).
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename like 'caca\_%') then
    raise exception 'tabela da Caça na publicação supabase_realtime';
  end if;
  -- Gravar não pode quebrar por causa do gatilho (erro de sinal é engolido): update neutro na regra.
  update public.caca_config set chave = chave where false;
  raise exception 'TESTE_OK';
end $$;
