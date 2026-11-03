-- Teste de 20261121 (editorial_combos). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
-- Precisa de 1 administrador ativo, 1 conta da função "social" (Micka) e 1 conta de marca. Só LÊ.
do $$
declare
  adm uuid; soc uuid; marca uuid; ed text; r jsonb; n_lido int; n_esperado int; msg text; comp uuid;
begin
  select user_id into adm from public.perfis
   where funcao = 'administrador' and papel = 'organizacao' and ativo and bloqueado_em is null and not deve_trocar_senha limit 1;
  select user_id into soc from public.perfis
   where funcao = 'social' and papel = 'organizacao' and ativo and bloqueado_em is null and not deve_trocar_senha limit 1;
  select p.user_id into marca from public.participantes p where p.user_id is not null limit 1;
  ed := public.edicao_atual();
  if adm is null or soc is null or marca is null or ed is null then raise exception 'preparo: faltou administrador, conta social, conta de marca ou edição atual'; end if;

  select count(*) into n_esperado
    from public.participacoes pa join public.participantes pt on pt.id = pa.participante_id
   where pa.edicao_codigo = ed and pa.status_cadastro is distinct from 'encerrado' and pt.arquivado_em is null;
  if n_esperado = 0 then raise exception 'preparo: a edição atual não tem participações'; end if;

  -- 1) o administrador lê a edição inteira, em ordem alfabética, com o combo da projeção pública
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  set local role authenticated;
  r := public.editorial_combos(null, null);
  reset role;
  n_lido := jsonb_array_length(r -> 'combos');
  if n_lido <> n_esperado then raise exception 'trouxe % participações e o esperado era %', n_lido, n_esperado; end if;
  if (r #>> '{edicao,codigo}') <> ed then raise exception 'a edição devolvida não é a atual'; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'combos') c where c -> 'combo' is null) then raise exception 'veio participação sem o objeto combo'; end if;
  if (select array_agg(lower(c ->> 'marca') order by ord) from jsonb_array_elements(r -> 'combos') with ordinality as t(c, ord))
     is distinct from (select array_agg(m order by m) from (select lower(c ->> 'marca') as m from jsonb_array_elements(r -> 'combos') c) x) then
    raise exception 'a lista não veio em ordem alfabética';
  end if;
  -- só os campos editoriais: nenhum telefone, e-mail, CNPJ, custo ou pagamento na resposta
  if exists (select 1 from jsonb_array_elements(r -> 'combos') c, jsonb_object_keys(c) k
              where k not in ('participacao_id', 'participante_id', 'marca', 'instagram', 'tema', 'status_cadastro', 'combo_status',
                              'alterado_apos_aprovacao', 'para_viagem', 'combo')) then
    raise exception 'a resposta trouxe um campo que não é editorial';
  end if;

  -- 2) a conta social (Micka) também lê; a marca é recusada
  perform set_config('request.jwt.claims', jsonb_build_object('sub', soc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', soc::text, true);
  set local role authenticated;
  if jsonb_array_length(public.editorial_combos(null, null) -> 'combos') <> n_esperado then raise exception 'a conta social devia ler tudo'; end if;
  reset role;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', marca, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', marca::text, true);
  set local role authenticated;
  begin
    perform public.editorial_combos(null, null);
    raise exception 'a marca não podia ler os combos';
  exception when others then
    get stacked diagnostics msg = message_text;
    if msg <> 'nao_autorizado' then raise exception 'esperava nao_autorizado e veio %', msg; end if;
  end;
  reset role;

  -- 3) edição que não existe: lista vazia, sem erro
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  set local role authenticated;
  if jsonb_array_length(public.editorial_combos(null, 'edicao-que-nao-existe') -> 'combos') <> 0 then raise exception 'edição inexistente devia vir vazia'; end if;
  reset role;

  raise exception 'TESTE_OK';
end $$;
