-- Teste de 20261124 (e 20261126: descrição da troca opcional) (pendências da marca no Início). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
do $$
declare pa uuid; item uuid; s1 uuid; s2 uuid; f text[];
begin
  select i.participacao_id, i.id into pa, item from public.participantes_itens i
    join public.participacoes x on x.id = i.participacao_id and x.edicao_codigo = public.edicao_atual()
   where i.posicao = 2 limit 1;
  if pa is null then raise exception 'preparo: nenhuma participação com salgado'; end if;
  delete from public.substituicoes where item_id = item;
  update public.participacoes set combo_descricao = '' where id = pa;
  insert into public.substituicoes (item_id, original, alternativa, descricao, ordem) values (item, 'X', 'Troca com tudo', 'Descrição.', 1) returning id into s1;
  insert into public.declaracoes_alimentares (substituicao_id, aspecto, estado)
  select s1, a, 'nao_contem' from unnest(array['gluten', 'leite', 'ovo', 'amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos']) a;
  insert into public.substituicoes (item_id, original, alternativa, ordem) values (item, 'X', 'Troca sem nada', 2) returning id into s2;
  f := public.pendencias_marca(pa);
  if not ('combo_descricao' = any (f)) then raise exception 'faltou combo_descricao: %', f; end if;
  if 'troca:2:1:descricao' = any (f) or 'troca:2:1:alimentar' = any (f) then raise exception 'troca completa não pode pendurar: %', f; end if;
  if not ('troca:2:2:alimentar' = any (f)) then raise exception 'faltou a troca 2: %', f; end if;
  if 'troca:2:2:descricao' = any (f) then raise exception 'descrição da troca é opcional: %', f; end if;
  -- a publicação continua com a regra antiga
  if 'combo_descricao' = any (public.pendencias_publicacao(pa)) or exists (select 1 from unnest(public.pendencias_publicacao(pa)) x where x like 'troca:%') then
    raise exception 'pendencias_publicacao não pode ganhar as pendências novas';
  end if;
  raise exception 'TESTE_OK';
end $$;
