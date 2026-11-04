-- Teste de 20261130 (aviso das fotos no dia 5). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
do $$
declare pa uuid; v_part uuid; n int; n0 int;
begin
  select x.id, x.participante_id into pa, v_part from public.participacoes x where x.edicao_codigo = public.edicao_atual() limit 1;
  insert into public.arquivos (escopo, participacao_id, nome, categoria, url_externa) values ('marca', pa, 'Teste', 'combo', 'https://www.dropbox.com/scl/fo/abc/x?dl=0');
  update public.arquivos set publicado_em = now() where url_externa like '%/abc/x%';
  select count(*) into n0 from public.notificacoes where participante_id = v_part;
  if public.avisar_fotos_do_combo() <> 0 then raise exception 'avisou antes do dia 5'; end if;
  n := public.avisar_fotos_do_combo(true);
  if n <> 1 then raise exception 'esperava 1 marca avisada, avisou %', n; end if;
  if (select count(*) from public.notificacoes where participante_id = v_part) <> n0 + 1 then raise exception 'notificação não criada'; end if;
  if public.avisar_fotos_do_combo(true) <> 0 then raise exception 'avisou de novo'; end if;
  if not exists (select 1 from cron.job where jobname = 'scw-aviso-fotos-dia5' and schedule = '0 12 5 11 *') then raise exception 'job não agendado'; end if;
  raise exception 'TESTE_OK';
end $$;
