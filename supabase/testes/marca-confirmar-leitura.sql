-- Teste de 20261105 (marca_confirmar_leitura + "N confirmaram" só da versão atual). Não deixa rastro: termina em
-- exceção. Esperado: "TESTE_OK". Precisa de 1 administrador ativo (conta pessoal) e de 2 marcas com conta.
do $$
declare
  adm uuid; uid uuid; pa uuid; outra uuid; arq uuid; arquivado uuid; alheio uuid;
  r jsonb; v_lido timestamptz; v_user uuid; n bigint; msg text;
begin
  select user_id into adm from public.perfis
   where funcao = 'administrador' and papel = 'organizacao' and ativo and bloqueado_em is null and not deve_trocar_senha limit 1;
  select pa_.id, p.user_id into pa, uid
    from public.participacoes pa_ join public.participantes p on p.id = pa_.participante_id
    join public.perfis pf on pf.user_id = p.user_id and pf.ativo and pf.bloqueado_em is null
   order by pa_.created_at desc limit 1;
  select pa_.id into outra
    from public.participacoes pa_ join public.participantes p on p.id = pa_.participante_id
   where p.user_id is distinct from uid limit 1;
  if adm is null or pa is null or outra is null then raise exception 'preparo: faltou administrador ou marcas'; end if;

  -- Arquivos do próprio teste (tudo se desfaz no fim): geral publicado há 1 dia, um arquivado e um só da OUTRA marca.
  insert into public.arquivos (escopo, nome, path, exige_leitura, publicado_em, versao)
    values ('geral', 'teste leitura', 'geral/teste-leitura.pdf', true, now() - interval '1 day', '1') returning id into arq;
  insert into public.arquivos (escopo, nome, path, exige_leitura, publicado_em, arquivado)
    values ('geral', 'teste arquivado', 'geral/teste-arquivado.pdf', true, now() - interval '1 day', true) returning id into arquivado;
  insert into public.arquivos (escopo, participacao_id, nome, path, exige_leitura, publicado_em)
    values ('marca', outra, 'teste alheio', outra::text || '/teste-alheio.pdf', true, now() - interval '1 day') returning id into alheio;
  update public.perfis set deve_trocar_senha = false where user_id = uid;  -- conta_ativa() exige a troca de senha feita

  if has_function_privilege('anon', 'public.marca_confirmar_leitura(uuid, uuid)', 'execute') then raise exception 'anon executa'; end if;
  if not has_function_privilege('authenticated', 'public.marca_confirmar_leitura(uuid, uuid)', 'execute') then raise exception 'authenticated não executa'; end if;

  -- 1. Primeira confirmação: insere, com a conta de quem confirmou, e devolve a hora gravada.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
  r := public.marca_confirmar_leitura(arq, pa);
  select lido_em, user_id into v_lido, v_user from public.arquivo_leitura where arquivo_id = arq and participacao_id = pa;
  if v_lido is null or v_user is distinct from uid then raise exception '1ª confirmação não gravou (% / %)', v_lido, v_user; end if;
  if (r ->> 'lido_em')::timestamptz is distinct from v_lido then raise exception 'devolveu outra hora: %', r; end if;

  -- 2. De novo, MESMA versão: nada muda (a leitura vira "de 1 h atrás", ainda depois da publicação, para dar para ver).
  reset role;
  update public.arquivo_leitura set lido_em = now() - interval '1 hour', user_id = null where arquivo_id = arq and participacao_id = pa;
  set local role authenticated;
  r := public.marca_confirmar_leitura(arq, pa);
  select lido_em, user_id into v_lido, v_user from public.arquivo_leitura where arquivo_id = arq and participacao_id = pa;
  if v_lido <> now() - interval '1 hour' or v_user is not null then raise exception 'mesma versão: não devia mudar (% / %)', v_lido, v_user; end if;
  if (r ->> 'lido_em')::timestamptz <> v_lido then raise exception 'mesma versão: devolveu outra hora: %', r; end if;

  -- 3. Como `substituir_arquivo`: versão nova publicada há 10 min, DEPOIS da leitura.
  reset role;
  update public.arquivos set publicado_em = now() - interval '10 minutes', versao = '2' where id = arq;
  --    "N confirmaram" não conta mais a leitura da versão anterior…
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  set local role authenticated;
  select g.leituras into n from public.get_arquivos_admin(null) g where g.id = arq;
  if n is distinct from 0::bigint then raise exception 'N confirmaram contou a versão anterior: %', n; end if;
  --    …e confirmar de novo RENOVA a leitura.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  r := public.marca_confirmar_leitura(arq, pa);
  select lido_em, user_id into v_lido, v_user from public.arquivo_leitura where arquivo_id = arq and participacao_id = pa;
  if v_lido <> now() or v_user is distinct from uid then raise exception 'versão nova: devia renovar (% / %)', v_lido, v_user; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  select g.leituras into n from public.get_arquivos_admin(null) g where g.id = arq;
  if n is distinct from 1::bigint then raise exception 'N confirmaram devia ser 1: %', n; end if;

  -- 4. Leitura até 1 min antes da publicação vale como desta versão (a mesma tolerância da tela): não renova.
  reset role;
  update public.arquivo_leitura set lido_em = now() - interval '10 minutes 30 seconds' where arquivo_id = arq and participacao_id = pa;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
  perform public.marca_confirmar_leitura(arq, pa);
  select lido_em into v_lido from public.arquivo_leitura where arquivo_id = arq and participacao_id = pa;
  if v_lido <> now() - interval '10 minutes 30 seconds' then raise exception 'dentro da tolerância: não devia renovar (%)', v_lido; end if;

  -- 5. Participação de OUTRA marca: recusada.
  begin
    perform public.marca_confirmar_leitura(arq, outra);
    raise exception 'deveria recusar a participação de outra marca';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'participacao_invalida' then raise; end if; end;

  -- 6. Arquivo arquivado e arquivo só da outra marca: recusados como "não encontrado".
  begin
    perform public.marca_confirmar_leitura(arquivado, pa);
    raise exception 'deveria recusar arquivo arquivado';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'arquivo_nao_encontrado' then raise; end if; end;
  begin
    perform public.marca_confirmar_leitura(alheio, pa);
    raise exception 'deveria recusar arquivo de outra marca';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'arquivo_nao_encontrado' then raise; end if; end;

  -- 7. Conta que não está ativa (senha temporária ainda não trocada): recusada.
  reset role;
  update public.perfis set deve_trocar_senha = true where user_id = uid;
  set local role authenticated;
  begin
    perform public.marca_confirmar_leitura(arq, pa);
    raise exception 'deveria recusar conta inativa';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'nao_autorizado' then raise; end if; end;

  raise exception 'TESTE_OK';
end $$;
