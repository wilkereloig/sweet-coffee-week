-- Teste de 20261028 (redes_salvar com responsável sem acesso; redes_resumo.proximos_itens). Não deixa rastro: termina em
-- exceção. Esperado: "TESTE_OK". Precisa de ao menos 1 postagem aberta, 1 administrador e 1 conta da função social.
do $$
declare adm uuid; soc uuid; pid uuid; v int; r jsonb; msg text; item jsonb;
begin
  select user_id into adm from public.perfis where funcao = 'administrador' and ativo limit 1;
  select user_id into soc from public.perfis where funcao = 'social' and ativo limit 1;
  select id into pid from public.redes_posts where situacao in ('rascunho', 'aprovacao', 'pronto', 'preparacao') limit 1;
  if adm is null or soc is null or pid is null then raise exception 'preparo: faltam administrador, conta social ou postagem aberta'; end if;

  -- 1) responsável que perdeu o acesso (senha redefinida) NÃO trava o salvamento de quem não o mudou
  update public.redes_posts set responsavel_id = soc where id = pid;
  update public.perfis set deve_trocar_senha = true where user_id = soc;
  select versao into v from public.redes_posts where id = pid;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.redes_salvar('', pid, v, jsonb_build_object('observacoes', 'conferido'));
  if r->>'observacoes' <> 'conferido' then raise exception 'não salvou: %', r; end if;

  -- 2) mas ATRIBUIR a postagem a quem não pode mais trabalhar com redes continua sendo recusado
  reset role;
  update public.redes_posts set responsavel_id = adm where id = pid;
  select versao into v from public.redes_posts where id = pid;
  set local role authenticated;
  begin
    perform public.redes_salvar('', pid, v, jsonb_build_object('responsavel_id', soc)); -- soc ainda com deve_trocar_senha
    raise exception 'deveria recusar responsável sem acesso';
  exception when sqlstate '22023' then get stacked diagnostics msg = message_text; if msg <> 'responsavel_invalido' then raise; end if; end;

  -- 3) "Próximos itens" não traz o que já passou
  reset role;
  update public.perfis set deve_trocar_senha = false where user_id in (adm, soc);
  update public.redes_posts set programado_para = now() - interval '3 days' where id in (select id from public.redes_posts where situacao in ('rascunho', 'aprovacao', 'pronto', 'preparacao') limit 6);
  update public.redes_posts set programado_para = now() + interval '2 days' where id = pid;
  set local role authenticated;
  r := public.redes_resumo('');
  for item in select * from jsonb_array_elements(r->'proximos_itens') loop
    if (item->>'programado_para')::timestamptz < now() then raise exception 'proximos_itens trouxe um atrasado: %', item; end if;
  end loop;
  if jsonb_array_length(r->'proximos_itens') < 1 then raise exception 'proximos_itens vazio, mas há uma postagem daqui a 2 dias'; end if;

  raise exception 'TESTE_OK';
end $$;
