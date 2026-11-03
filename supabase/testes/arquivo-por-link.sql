-- Teste de 20261129 (arquivo por link). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
do $$
declare pa uuid; v_part uuid; v_id uuid; n0 int; n1 int;
begin
  select x.id, x.participante_id into pa, v_part from public.participacoes x where x.edicao_codigo = public.edicao_atual() limit 1;
  select count(*) into n0 from public.notificacoes where participante_id = v_part;

  -- inserir SEM publicar e depois publicar: nenhum aviso (o gatilho só dispara no INSERT já publicado)
  insert into public.arquivos (escopo, participacao_id, nome, categoria, url_externa)
  values ('marca', pa, 'Teste link', 'combo', 'https://www.dropbox.com/scl/fo/abc123/xyz?rlkey=k&dl=0') returning id into v_id;
  update public.arquivos set publicado_em = now() where id = v_id;
  select count(*) into n1 from public.notificacoes where participante_id = v_part;
  if n1 <> n0 then raise exception 'publicar por UPDATE avisou a marca (% -> %)', n0, n1; end if;

  -- só dropbox, só https
  begin insert into public.arquivos (escopo, participacao_id, nome, categoria, url_externa) values ('marca', pa, 'x', 'combo', 'https://exemplo.com/a'); raise exception 'aceitou link fora do Dropbox';
  exception when check_violation then null; end;
  begin insert into public.arquivos (escopo, participacao_id, nome, categoria, url_externa) values ('marca', pa, 'x', 'combo', 'http://www.dropbox.com/a'); raise exception 'aceitou http';
  exception when check_violation then null; end;
  -- exatamente um: path OU link
  begin insert into public.arquivos (escopo, participacao_id, nome, categoria) values ('marca', pa, 'x', 'combo'); raise exception 'aceitou sem path e sem link';
  exception when check_violation then null; end;
  begin insert into public.arquivos (escopo, participacao_id, nome, categoria, path, url_externa) values ('marca', pa, 'x', 'combo', pa || '/a.png', 'https://www.dropbox.com/a'); raise exception 'aceitou path e link juntos';
  exception when check_violation then null; end;

  raise exception 'TESTE_OK';
end $$;
