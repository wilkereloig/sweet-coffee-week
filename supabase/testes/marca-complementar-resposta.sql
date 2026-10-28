-- Teste de 20261030 (complementar a resposta de um pedido acrescenta, não apaga). Não deixa rastro: termina em exceção.
-- Esperado: "TESTE_OK". Precisa de ao menos 1 participação de marca com conta.
do $$
declare uid uuid; pa uuid; sol uuid; depois text; msg text;
begin
  select pa_.id, p.user_id into pa, uid
    from public.participacoes pa_ join public.participantes p on p.id = pa_.participante_id
    join public.perfis pf on pf.user_id = p.user_id and pf.ativo and pf.bloqueado_em is null
   limit 1;
  if pa is null then raise exception 'preparo: nenhuma participação de marca com conta'; end if;

  -- cria o próprio pedido (a base pode não ter nenhum); tudo se desfaz no fim
  insert into public.solicitacoes (escopo, participacao_id, titulo, texto, publicada_em)
    values ('marca', pa, 'teste', 'teste', now()) returning id into sol;
  insert into public.solicitacao_estado (solicitacao_id, participacao_id) values (sol, pa) on conflict do nothing;
  update public.solicitacao_estado set estado = 'pendente', resposta = null where solicitacao_id = sol;
  update public.perfis set deve_trocar_senha = false where user_id = uid;  -- conta_ativa() exige a troca de senha feita
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform public.marca_responder_solicitacao(sol, 'primeira resposta');
  select resposta into depois from public.solicitacao_estado where solicitacao_id = sol;
  if depois <> 'primeira resposta' then raise exception '1ª resposta mudou: %', depois; end if;

  perform public.marca_responder_solicitacao(sol, 'e um complemento');
  select resposta into depois from public.solicitacao_estado where solicitacao_id = sol;
  if position('primeira resposta' in depois) <> 1 or position('e um complemento' in depois) = 0 then
    raise exception 'o complemento apagou ou não entrou: %', depois;
  end if;

  begin
    perform public.marca_responder_solicitacao(sol, repeat('x', 4000));
    raise exception 'deveria recusar passar de 4000';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'resposta_longa' then raise; end if; end;

  raise exception 'TESTE_OK';
end $$;
