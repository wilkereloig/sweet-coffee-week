-- Teste de 20261122 (alterações por campo, "visto" por pessoa, revisões à parte). Não deixa rastro: termina em exceção.
-- Esperado: "TESTE_OK". Precisa de 1 administrador ativo e 1 conta de marca ativa com participação na edição atual.
do $$
declare
  adm uuid; marca_user uuid; marca uuid; pa uuid; item uuid; v_tipo text; nome_antes text; desc_antes text;
  r jsonb; c jsonb; n_antes int; n_depois int; msg text;
begin
  select user_id into adm from public.perfis
   where funcao = 'administrador' and papel = 'organizacao' and ativo and bloqueado_em is null and not deve_trocar_senha limit 1;
  select p.user_id, p.id, public.participacao_corrente(p.id) into marca_user, marca, pa
    from public.participantes p join public.perfis f on f.user_id = p.user_id
   where f.ativo and f.bloqueado_em is null and not f.deve_trocar_senha and p.arquivado_em is null
     and public.participacao_corrente(p.id) in (select x.id from public.participacoes x where x.edicao_codigo = public.edicao_atual())
   limit 1;
  if adm is null or pa is null then raise exception 'preparo: faltou administrador ou marca ativa com participação na edição atual'; end if;
  select i.id, i.tipo, i.descricao into item, v_tipo, desc_antes from public.participantes_itens i where i.participacao_id = pa order by i.posicao limit 1;
  select combo_nome into nome_antes from public.participacoes where id = pa;

  -- 1) a MARCA muda o nome do combo e a descrição de um item → duas alterações, com o valor de antes
  perform set_config('request.jwt.claims', jsonb_build_object('sub', marca_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', marca_user::text, true);
  if public.meu_participante() is distinct from marca then raise exception 'preparo: a conta da marca não está ativa (meu_participante)'; end if;
  update public.participacoes set combo_nome = coalesce(combo_nome, '') || ' (teste)' where id = pa;
  update public.participacoes set combo_nome = coalesce(nome_antes, '') || ' (teste 2)' where id = pa; -- mesma janela: UMA linha
  update public.participantes_itens set descricao = coalesce(descricao, '') || ' (teste)' where id = item;
  select count(*) into n_antes from public.alteracoes_campo where participacao_id = pa and campo = 'combo.nome' and em > now() - interval '1 minute';
  if n_antes <> 1 then raise exception 'duas gravações seguidas do mesmo campo deviam virar UMA linha (veio %)', n_antes; end if;

  -- 2) o administrador lê: as duas aparecem, com o "antes" da primeira gravação
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  delete from public.editorial_vistos where user_id = adm and participacao_id = pa;
  set local role authenticated;
  r := public.editorial_combos(null, null);
  reset role;
  select x into c from jsonb_array_elements(r -> 'combos') x where (x ->> 'participacao_id')::uuid = pa;
  if c is null then raise exception 'a participação da marca não veio na leitura'; end if;
  if not (c ? 'unidades' and c ? 'revisoes' and c ? 'alteracoes' and c ? 'visto_em') then raise exception 'faltam chaves novas na leitura'; end if;
  if (c #>> '{alteracoes,combo.nome,antes}') is distinct from nullif(btrim(nome_antes), '') then
    raise exception 'o antes do nome do combo devia ser "%", veio "%"', nome_antes, c #>> '{alteracoes,combo.nome,antes}';
  end if;
  if not ((c -> 'alteracoes') ? (v_tipo || '.descricao')) then raise exception 'a descrição do item mudada pela marca não apareceu'; end if;

  -- 3) "Marquei como visto" some com as marcações SÓ para quem marcou
  set local role authenticated;
  if public.editorial_marcar_visto(null, pa) <> 1 then raise exception 'marcar visto devia gravar 1 linha'; end if;
  r := public.editorial_combos(null, null);
  reset role;
  select x into c from jsonb_array_elements(r -> 'combos') x where (x ->> 'participacao_id')::uuid = pa;
  if c -> 'alteracoes' <> '{}'::jsonb then raise exception 'depois do visto não devia sobrar alteração: %', c -> 'alteracoes'; end if;

  -- 4) a EQUIPE mexendo no mesmo campo não marca nada
  select count(*) into n_antes from public.alteracoes_campo where participacao_id = pa;
  update public.participacoes set combo_nome = coalesce(nome_antes, '') || ' (equipe)' where id = pa;
  select count(*) into n_depois from public.alteracoes_campo where participacao_id = pa;
  if n_depois <> n_antes then raise exception 'gravação da equipe não pode marcar alteração'; end if;

  -- 5) revisão à parte volta na leitura; o cadastro não muda
  insert into public.revisoes_texto (participacao_id, campo, original, revisado) values (pa, 'combo.nome', 'X', 'Y');
  set local role authenticated;
  r := public.editorial_combos(null, null);
  reset role;
  select x into c from jsonb_array_elements(r -> 'combos') x where (x ->> 'participacao_id')::uuid = pa;
  if (c #>> '{revisoes,combo.nome,revisado}') <> 'Y' then raise exception 'a revisão não voltou na leitura'; end if;

  -- 6) sem conta pessoal não há "visto"; marca não lê
  perform set_config('request.jwt.claims', '{}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.editorial_marcar_visto('senha-errada', pa);
    raise exception 'sem conta pessoal o visto devia ser recusado';
  exception when others then
    get stacked diagnostics msg = message_text;
    if msg = 'sem conta pessoal o visto devia ser recusado' then raise; end if;
  end;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', marca_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', marca_user::text, true);
  set local role authenticated;
  begin
    perform public.editorial_combos(null, null);
    raise exception 'a marca não podia ler';
  exception when others then
    get stacked diagnostics msg = message_text;
    if msg <> 'nao_autorizado' then raise exception 'esperava nao_autorizado e veio %', msg; end if;
  end;
  reset role;

  raise exception 'TESTE_OK';
end $$;
