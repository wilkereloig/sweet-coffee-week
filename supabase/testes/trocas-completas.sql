-- Teste de 20261123 (trocas completas). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
-- Precisa de 1 administrador ativo e 1 participação da edição atual com link de preenchimento e o salgado cadastrado.
do $$
declare
  adm uuid; pa uuid; lk uuid; env uuid; item uuid; nome_item text; e jsonb; it jsonb; pub jsonb; n int; c record;
begin
  select user_id into adm from public.perfis
   where funcao = 'administrador' and papel = 'organizacao' and ativo and bloqueado_em is null and not deve_trocar_senha limit 1;
  select l.participacao_id, l.id, i.id, i.nome into pa, lk, item, nome_item
    from public.preenchimento_links l
    join public.participacoes x on x.id = l.participacao_id and x.edicao_codigo = public.edicao_atual()
    join public.participantes_itens i on i.participacao_id = l.participacao_id and i.posicao = 2
   where l.revogado_em is null and coalesce(btrim(i.nome), '') <> '' limit 1;
  if adm is null or pa is null then raise exception 'preparo: faltou administrador ou participação com link e salgado'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);

  -- 1) envio novo: duas trocas do salgado, a 1ª com alergênicos e outro alergênico
  insert into public.preenchimento_envios (link_id, participacao_id, dados) values (lk, pa, jsonb_build_object('itens', jsonb_build_array(
    jsonb_build_object('posicao', 2, 'tem_troca', true, 'trocas', jsonb_build_array(
      jsonb_build_object('alternativa', 'Cachorro-quente vegetariano', 'descricao', 'Salsicha vegetal, pão e molho da casa.',
                         'disponibilidade', 'sempre', 'alimentar', jsonb_build_object('gluten', 'contem', 'leite', 'nao_contem', 'vegetariano', 'sim'),
                         'outro_alergenico', 'mostarda'),
      jsonb_build_object('alternativa', 'Cachorro-quente sem glúten', 'descricao', 'Pão sem glúten.', 'disponibilidade', 'limitada'))))))
  returning id into env;
  perform public.org_preenchimento_decidir(null, env, true, null);
  select count(*) into n from public.substituicoes where item_id = item;
  if n <> 2 then raise exception 'esperava 2 trocas, veio %', n; end if;
  select * into c from public.substituicoes where item_id = item and ordem = 1;
  if c.alternativa <> 'Cachorro-quente vegetariano' or c.descricao <> 'Salsicha vegetal, pão e molho da casa.' or c.disponibilidade <> 'sempre' then
    raise exception 'troca 1 gravada errado: % / % / %', c.alternativa, c.descricao, c.disponibilidade;
  end if;
  if c.original is distinct from left(btrim(nome_item), 80) then raise exception 'original devia ser o nome do item (%), veio %', nome_item, c.original; end if;
  select count(*) into n from public.declaracoes_alimentares where substituicao_id = c.id;
  if n <> 4 then raise exception 'troca 1 devia ter 4 declarações (3 + outro alergênico), veio %', n; end if;

  -- 2) leitura do formulário: lista com descrição e alergênicos
  e := public.preenchimento_estado(pa);
  select x into it from jsonb_array_elements(e -> 'itens') x where (x ->> 'posicao')::int = 2;
  if jsonb_array_length(it -> 'trocas') <> 2 then raise exception 'preenchimento_estado devia trazer 2 trocas'; end if;
  if (it #>> '{trocas,0,descricao}') <> 'Salsicha vegetal, pão e molho da casa.' or (it #>> '{trocas,0,alimentar,gluten}') <> 'contem'
     or (it #>> '{trocas,0,outro_alergenico}') <> 'mostarda' then
    raise exception 'troca 1 lida errado: %', it -> 'trocas' -> 0;
  end if;
  if (it #>> '{troca,alternativa}') <> 'Cachorro-quente vegetariano' then raise exception 'a chave antiga troca devia continuar (a 1ª)'; end if;

  -- 3) site: descrição na troca
  pub := public.montar_publico(pa, 'marca_e_combo');
  select x into it from jsonb_array_elements(pub #> '{combo,itens}') x where (x ->> 'posicao')::int = 2;
  if (it #>> '{substituicoes,0,descricao}') <> 'Salsicha vegetal, pão e molho da casa.' then
    raise exception 'montar_publico sem a descrição da troca: %', it -> 'substituicoes';
  end if;

  -- 4) envio antigo (troca única) continua aplicando: substitui a lista
  insert into public.preenchimento_envios (link_id, participacao_id, dados) values (lk, pa, jsonb_build_object('itens', jsonb_build_array(
    jsonb_build_object('posicao', 2, 'tem_troca', true, 'troca', jsonb_build_object('original', 'Pão', 'alternativa', 'Pão integral', 'disponibilidade', 'sob_consulta')))))
  returning id into env;
  perform public.org_preenchimento_decidir(null, env, true, null);
  select count(*) into n from public.substituicoes where item_id = item;
  if n <> 1 then raise exception 'envio antigo devia deixar 1 troca, veio %', n; end if;
  if not exists (select 1 from public.substituicoes where item_id = item and original = 'Pão' and alternativa = 'Pão integral') then
    raise exception 'envio antigo gravado errado';
  end if;

  -- 5) "Não" apaga as trocas
  insert into public.preenchimento_envios (link_id, participacao_id, dados) values (lk, pa, jsonb_build_object('itens', jsonb_build_array(
    jsonb_build_object('posicao', 2, 'tem_troca', false))))
  returning id into env;
  perform public.org_preenchimento_decidir(null, env, true, null);
  if exists (select 1 from public.substituicoes where item_id = item) then raise exception '"Não" devia apagar as trocas'; end if;

  -- 6) obrigatórios do combo: nome e descrição contam
  update public.participacoes set combo_nome = null, combo_descricao = null where id = pa;
  select total into n from public.campos_cadastro(pa);
  if n < 15 then raise exception 'campos_cadastro devia ter ao menos 15 campos, veio %', n; end if;

  raise exception 'TESTE_OK';
end $$;
