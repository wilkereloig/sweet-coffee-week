-- Teste de 20261131 (prévia do link). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
do $$
declare v_link uuid; v_file uuid;
begin
  select id into v_link from public.arquivos where url_externa is not null limit 1;
  select id into v_file from public.arquivos where path is not null limit 1;
  if v_link is null then raise exception 'preparo: nenhuma linha de link'; end if;

  update public.arquivos set previa_dados = 'data:image/webp;base64,UklGRg==' where id = v_link; -- aceita

  begin
    update public.arquivos set previa_dados = 'data:image/png;base64,AAAA' where id = v_link;
    raise exception 'PNG foi aceito';
  exception when check_violation then null; end;

  begin
    update public.arquivos set previa_dados = 'data:image/webp;base64,' || repeat('A', 150001) where id = v_link;
    raise exception 'prévia grande demais foi aceita';
  exception when check_violation then null; end;

  begin
    update public.arquivos set previa_dados = 'https://exemplo.com/x.webp' where id = v_link;
    raise exception 'endereço externo foi aceito';
  exception when check_violation then null; end;

  if v_file is not null then
    begin
      update public.arquivos set previa_dados = 'data:image/webp;base64,UklGRg==' where id = v_file;
      raise exception 'linha de arquivo (Storage) aceitou previa_dados';
    exception when check_violation then null; end;
  end if;

  raise exception 'TESTE_OK';
end $$;
