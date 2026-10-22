-- Teste de 20261031 (campanhas do Social media). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
-- Precisa de 1 administrador ativo. Roda como a conta do administrador (auth.uid() + role authenticated).
do $$
declare
  adm uuid; outro uuid; c1 jsonb; c2 jsonb; p1 jsonb; p2 jsonb; lista jsonb; item jsonb; r jsonb; msg text; v int; pid uuid;
begin
  select user_id into adm from public.perfis where funcao = 'administrador' and ativo and bloqueado_em is null limit 1;
  if adm is null then raise exception 'preparo: sem administrador ativo'; end if;
  update public.perfis set deve_trocar_senha = false where user_id = adm;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1) validações do formulário
  begin perform public.redes_campanha_salvar('', null, jsonb_build_object('nome', '  ')); raise exception 'deveria recusar nome vazio';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'nome_obrigatorio' then raise; end if; end;
  begin perform public.redes_campanha_salvar('', null, jsonb_build_object('nome', repeat('x', 61))); raise exception 'deveria recusar nome longo';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'nome_longo' then raise; end if; end;
  begin perform public.redes_campanha_salvar('', null, jsonb_build_object('nome', 'A', 'cor', 'rosa')); raise exception 'deveria recusar cor fora da paleta';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'cor_invalida' then raise; end if; end;
  begin perform public.redes_campanha_salvar('', null, jsonb_build_object('nome', 'A', 'inicio', '2026-11-10', 'fim', '2026-11-01')); raise exception 'deveria recusar fim antes do início';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'periodo_invalido' then raise; end if; end;
  begin perform public.redes_campanha_salvar('', null, jsonb_build_object('nome', 'A', 'inicio', 'não é data')); raise exception 'deveria recusar data inválida';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'periodo_invalido' then raise; end if; end;
  begin perform public.redes_campanha_salvar('', null, jsonb_build_object('nome', 'A', 'meta', -1)); raise exception 'deveria recusar meta negativa';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'meta_invalida' then raise; end if; end;
  begin perform public.redes_campanha_salvar('', null, jsonb_build_object('nome', 'A', 'meta', '2.5')); raise exception 'deveria recusar meta decimal';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'meta_invalida' then raise; end if; end;

  -- 2) cria; nome repetido (sem diferenciar maiúscula) é recusado; outra com nome diferente passa
  c1 := public.redes_campanha_salvar('', null, jsonb_build_object('nome', 'Confirmados teste', 'cor', 'roxo', 'meta', 20, 'inicio', '2026-10-20', 'fim', '2026-11-04', 'descricao', 'um por casa'));
  if c1->>'nome' <> 'Confirmados teste' or c1->>'cor' <> 'roxo' or (c1->>'meta')::int <> 20 or c1->>'arquivada' <> 'false' then raise exception 'campanha criada errada: %', c1; end if;
  begin perform public.redes_campanha_salvar('', null, jsonb_build_object('nome', 'CONFIRMADOS TESTE')); raise exception 'deveria recusar nome repetido';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'nome_repetido' then raise; end if; end;
  c2 := public.redes_campanha_salvar('', null, jsonb_build_object('nome', 'Contagem teste'));
  if c2->>'cor' <> 'amarelo' then raise exception 'cor padrão deveria ser amarelo: %', c2; end if;

  -- 3) editar mexe só no que veio
  r := public.redes_campanha_salvar('', (c2->>'id')::uuid, jsonb_build_object('cor', 'verde'));
  if r->>'cor' <> 'verde' or r->>'nome' <> 'Contagem teste' then raise exception 'edição parcial errada: %', r; end if;
  begin perform public.redes_campanha_salvar('', gen_random_uuid(), jsonb_build_object('nome', 'X')); raise exception 'deveria recusar campanha inexistente';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'campanha_nao_encontrada' then raise; end if; end;

  -- 4) postagem nasce e muda de campanha; redes_json devolve nome e cor
  p1 := public.redes_criar('', jsonb_build_object('titulo', 'Post da campanha', 'campanha_id', c1->>'id'));
  if p1->>'campanha_id' <> c1->>'id' or p1->>'campanha_nome' <> 'Confirmados teste' or p1->>'campanha_cor' <> 'roxo' then raise exception 'redes_json sem a campanha: %', p1; end if;
  pid := (p1->>'id')::uuid;
  v := (p1->>'versao')::int;
  r := public.redes_salvar('', pid, v, jsonb_build_object('campanha_id', c2->>'id'));
  if r->>'campanha_nome' <> 'Contagem teste' then raise exception 'troca de campanha não valeu: %', r; end if;
  reset role;  -- as tabelas não têm grant: leitura direta só como dono
  if not exists (select 1 from public.redes_historico h where h.post_id = pid and h.tipo = 'conteudo' and h.detalhe->'campos' ? 'campanha') then
    raise exception 'a troca de campanha não entrou no histórico da postagem';
  end if;
  set local role authenticated;
  v := (r->>'versao')::int;
  r := public.redes_salvar('', pid, v, jsonb_build_object('campanha_id', ''));
  if r->>'campanha_id' is not null then raise exception 'campanha vazia deveria soltar a postagem: %', r; end if;
  begin perform public.redes_salvar('', pid, (r->>'versao')::int, jsonb_build_object('campanha_id', gen_random_uuid())); raise exception 'deveria recusar campanha inexistente';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'campanha_invalida' then raise; end if; end;

  -- 5) contagens da listagem
  r := public.redes_salvar('', pid, (r->>'versao')::int, jsonb_build_object('campanha_id', c1->>'id', 'programado_para', (now() - interval '2 days')::text));
  p2 := public.redes_criar('', jsonb_build_object('titulo', 'Outra da campanha', 'campanha_id', c1->>'id'));
  reset role;
  update public.redes_posts set situacao = 'publicado', publicado_em = now(), publicado_snapshot = '{}'::jsonb where id = (p2->>'id')::uuid;
  set local role authenticated;
  lista := public.redes_campanhas_listar('');
  select x into item from jsonb_array_elements(lista) x where x->>'id' = c1->>'id';
  if (item->>'n_total')::int <> 2 or (item->>'n_publicadas')::int <> 1 or (item->>'n_abertas')::int <> 1 or (item->>'n_atrasadas')::int <> 1 then
    raise exception 'contagens erradas: %', item;
  end if;
  reset role;
  update public.redes_posts set situacao = 'cancelado' where id = (p2->>'id')::uuid;
  set local role authenticated;
  select x into item from jsonb_array_elements(public.redes_campanhas_listar('')) x where x->>'id' = c1->>'id';
  if (item->>'n_total')::int <> 1 then raise exception 'cancelada não deveria contar: %', item; end if;

  -- 6) arquivar: a postagem mantém, a nova não escolhe; restaurar volta
  r := public.redes_campanha_arquivar('', (c1->>'id')::uuid, true);
  if r->>'arquivada' <> 'true' then raise exception 'não arquivou: %', r; end if;
  reset role;
  select to_jsonb(p) into r from public.redes_posts p where p.id = pid;
  set local role authenticated;
  if r->>'campanha_id' <> c1->>'id' then raise exception 'arquivar não pode soltar a postagem'; end if;
  begin perform public.redes_criar('', jsonb_build_object('titulo', 'Nova', 'campanha_id', c1->>'id')); raise exception 'campanha arquivada não deveria ser escolhida';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'campanha_invalida' then raise; end if; end;
  -- a postagem que já tem a campanha arquivada continua salvando sem mexer nela
  reset role;
  select versao into v from public.redes_posts where id = pid;
  set local role authenticated;
  r := public.redes_salvar('', pid, v, jsonb_build_object('observacoes', 'segue valendo'));
  if r->>'campanha_id' <> c1->>'id' then raise exception 'salvar outra coisa perdeu a campanha arquivada'; end if;
  -- nome de arquivada não bloqueia o nome novo; restaurar com nome tomado é recusado
  c1 := public.redes_campanha_salvar('', (c1->>'id')::uuid, jsonb_build_object('nome', 'Confirmados teste'));
  perform public.redes_campanha_salvar('', null, jsonb_build_object('nome', 'confirmados TESTE'));
  begin perform public.redes_campanha_arquivar('', (c1->>'id')::uuid, false); raise exception 'restaurar com nome tomado deveria falhar';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'nome_repetido' then raise; end if; end;

  -- 7) quem não tem redes.editar não cria nem arquiva; quem só lê, lista
  reset role;
  select user_id into outro from public.perfis where ativo and papel = 'organizacao' and user_id <> adm and not public.pode_por_user(user_id, 'redes.editar') limit 1;
  if outro is not null then
    update public.perfis set deve_trocar_senha = false where user_id = outro;
    perform set_config('request.jwt.claims', json_build_object('sub', outro, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin perform public.redes_campanha_salvar('', null, jsonb_build_object('nome', 'Sem permissão')); raise exception 'deveria recusar quem não edita';
    exception when others then get stacked diagnostics msg = message_text; if msg <> 'nao_autorizado' then raise; end if; end;
    begin perform public.redes_campanha_arquivar('', (c2->>'id')::uuid, true); raise exception 'deveria recusar quem não edita';
    exception when others then get stacked diagnostics msg = message_text; if msg <> 'nao_autorizado' then raise; end if; end;
  end if;

  raise exception 'TESTE_OK';
end $$;
