-- Teste de 20261104 ("Ver como participante"). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
-- Precisa de 1 administrador ativo e de 2 marcas com conta na edição atual.
do $$
declare
  adm uuid; m1 uuid; m1_user uuid; m2 uuid; m2_user uuid; r jsonb; n int; ok boolean;
begin
  select user_id into adm from public.perfis where funcao = 'administrador' and ativo and bloqueado_em is null limit 1;
  select p.id, p.user_id into m1, m1_user from public.participantes p join public.participacoes pa on pa.participante_id = p.id
   where p.user_id is not null and p.arquivado_em is null and pa.status_cadastro <> 'encerrado' order by p.nome_marca limit 1;
  select p.id, p.user_id into m2, m2_user from public.participantes p join public.participacoes pa on pa.participante_id = p.id
   where p.user_id is not null and p.arquivado_em is null and pa.status_cadastro <> 'encerrado' and p.id <> m1 order by p.nome_marca limit 1;
  if adm is null or m1 is null or m2 is null then raise exception 'preparo: faltou administrador ou marcas'; end if;
  -- Sem mexer em conta: em 22/10 todas as marcas estão com a senha temporária (deve_trocar_senha), o caso que importa.
  if not (select deve_trocar_senha from public.perfis where user_id = m1_user) then raise exception 'preparo: m1 já trocou a senha'; end if;

  -- Conta que não trocou a senha não enxerga nada sozinha (regra de sempre) — e a chave forjada por não-admin não ajuda.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', m1_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', m1_user::text, true);
  if public.conta_ativa() then raise exception 'conta com senha temporária não deveria estar ativa'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', m1_user, 'role', 'authenticated', 'scw_ver_como', m2_user)::text, true);
  if public.conta_ativa() then raise exception 'scw_ver_como de quem não é administrador abriu a conta'; end if;

  -- Como administrador (o painel chama com a conta pessoal, papel authenticated).
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.org_ver_como_ler(null, m1, '{"tabela":"participantes","select":["*"],"ordem":[{"c":"created_at","desc":true}],"limite":1}');
  if jsonb_array_length(r) <> 1 or (r -> 0 ->> 'id')::uuid <> m1 then raise exception 'deveria ver a própria marca (m1): %', r; end if;

  -- A identidade da transação virou a da marca: volta para o administrador antes de cada chamada, como numa requisição nova.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.org_ver_como_ler(null, m1, '{"tabela":"participacoes","select":["id","participante_id"]}');
  select count(*) into n from jsonb_array_elements(r) x where (x ->> 'participante_id')::uuid <> m1;
  if jsonb_array_length(r) = 0 or n > 0 then raise exception 'participações: só as da m1 (%)', r; end if;
  if (r -> 0) ? 'tema_combo' then raise exception 'select de colunas não foi respeitado'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.org_ver_como_ler(null, m1, '{"tabela":"participantes","filtros":[{"c":"nome_marca","op":"eq","v":"x'' or true --"}]}');
  if jsonb_array_length(r) <> 0 then raise exception 'valor com aspas tem que ser literal (%)', r; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.org_ver_como_ler(null, m1, '{"tabela":"mensagens","select":["id","de","corpo","criada_em","lida_em"],"filtros":[{"c":"lida_em","op":"is","v":"null"}],"ordem":[{"c":"criada_em","desc":true,"nullslast":true}]}');
  if jsonb_typeof(r) <> 'array' then raise exception 'filtro is.null e ordem'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.org_ver_como_ler(null, m1, '{"rpc":"marca_minha_logo"}');
  if r is null then raise exception 'marca_minha_logo deveria responder como a marca'; end if;

  -- Fora da lista e identificador estranho: recusa.
  begin
    perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', adm::text, true);
    perform public.org_ver_como_ler(null, m1, '{"tabela":"perfis"}');
    raise exception 'tabela fora da lista passou';
  exception when others then if sqlerrm <> 'consulta_invalida' then raise; end if; end;
  begin
    perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', adm::text, true);
    perform public.org_ver_como_ler(null, m1, '{"tabela":"participantes","select":["id, nome_marca"]}');
    raise exception 'coluna maliciosa passou';
  exception when others then if sqlerrm <> 'consulta_invalida' then raise; end if; end;
  begin
    perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', adm::text, true);
    perform public.org_ver_como_ler(null, m1, '{"rpc":"marca_usar_voucher"}');
    raise exception 'função que grava passou';
  exception when others then if sqlerrm <> 'consulta_invalida' then raise; end if; end;

  -- Marca não usa o modo para espiar outra (a recusa vem antes de qualquer leitura).
  begin
    perform set_config('request.jwt.claims', jsonb_build_object('sub', m2_user, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', m2_user::text, true);
    perform public.org_ver_como_ler(null, m1, '{"tabela":"participantes"}');
    raise exception 'marca leu outra marca';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;

  -- A leitora não grava: STABLE recusa escrita (o Postgres trava, não a tela).
  select p.provolatile = 's' and not p.prosecdef into ok from pg_proc p where p.oid = 'public.org_ver_como_ler(text, uuid, jsonb)'::regprocedure;
  if not ok then raise exception 'org_ver_como_ler tem que ser STABLE e SECURITY INVOKER'; end if;

  reset role;
  -- Abrir registra na auditoria.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.org_ver_como_iniciar(null, m1);
  select count(*) into n from public.auditoria where acao = 'participante.ver_como' and participante_id = m1 and at > now() - interval '1 minute';
  if n < 1 then raise exception 'abrir o modo não ficou na auditoria'; end if;

  raise exception 'TESTE_OK';
end $$;
