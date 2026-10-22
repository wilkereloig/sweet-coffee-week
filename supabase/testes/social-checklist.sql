-- Teste de 20261101 (checklist por postagem). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
-- Precisa de 1 administrador ativo e (opcional) de 1 conta com redes.editar sem redes.gerir (a função social).
do $$
declare
  adm uuid; soc uuid; p1 jsonb; p2 jsonb; p3 jsonb; r jsonb; itens jsonb; item jsonb; msg text; n int; pid uuid; pid2 uuid; v int; antes_em timestamptz; depois_em timestamptz; antes_v int;
begin
  select user_id into adm from public.perfis where funcao = 'administrador' and ativo and bloqueado_em is null limit 1;
  if adm is null then raise exception 'preparo: sem administrador ativo'; end if;
  update public.perfis set deve_trocar_senha = false where user_id = adm;

  -- 1) modelos iniciais por formato
  select count(*) into n from public.redes_checklist_modelos where formato = 'feed' and ativo;       if n <> 4 then raise exception 'feed deveria ter 4 itens, tem %', n; end if;
  select count(*) into n from public.redes_checklist_modelos where formato = 'carrossel' and ativo;  if n <> 4 then raise exception 'carrossel deveria ter 4 itens, tem %', n; end if;
  select count(*) into n from public.redes_checklist_modelos where formato = 'reels' and ativo;      if n <> 6 then raise exception 'reels deveria ter 6 itens, tem %', n; end if;
  select count(*) into n from public.redes_checklist_modelos where formato = 'story' and ativo;      if n <> 5 then raise exception 'story deveria ter 5 itens, tem %', n; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 2) a postagem nasce com a cópia do modelo do formato
  p1 := public.redes_criar('', jsonb_build_object('titulo', 'Reel com checklist', 'formato', 'reels'));
  pid := (p1->>'id')::uuid;
  if (p1->>'checklist_total')::int <> 6 or (p1->>'checklist_feitos')::int <> 0 then raise exception 'redes_json sem a contagem do checklist: %', p1; end if;
  r := public.redes_post('', pid);
  itens := r->'checklist';
  if jsonb_array_length(itens) <> 6 then raise exception 'redes_post deveria trazer 6 itens: %', itens; end if;
  if exists (select 1 from jsonb_array_elements(itens) x where (x->>'feito')::boolean) then raise exception 'item nasceu marcado'; end if;
  if itens->0->>'texto' is null or (itens->0->>'ordem')::int > (itens->1->>'ordem')::int then raise exception 'itens fora de ordem: %', itens; end if;

  -- 3) marcar grava quem e quando, e NÃO mexe na versão nem no "atualizado em" da postagem
  reset role;
  select versao, atualizado_em into antes_v, antes_em from public.redes_posts where id = pid;
  set local role authenticated;
  item := public.redes_checklist_marcar('', (itens->0->>'id')::uuid, true);
  if not (item->>'feito')::boolean or item->>'feito_por_rotulo' is null or item->>'feito_em' is null then raise exception 'marcar não gravou quem e quando: %', item; end if;
  reset role;
  select versao, atualizado_em into v, depois_em from public.redes_posts where id = pid;
  set local role authenticated;
  if v <> antes_v or depois_em <> antes_em then raise exception 'marcar item mexeu na postagem (versão % → %)', antes_v, v; end if;
  if (public.redes_post('', pid)->'post'->>'checklist_feitos')::int <> 1 then
    raise exception 'contagem de feitos errada';
  end if;
  item := public.redes_checklist_marcar('', (itens->0->>'id')::uuid, false);
  if (item->>'feito')::boolean or item->>'feito_por_id' is not null or item->>'feito_em' is not null then raise exception 'desmarcar deveria limpar quem e quando: %', item; end if;

  -- 4) acrescentar e remover
  item := public.redes_checklist_item_salvar('', pid, '  Item extra  ');
  if item->>'texto' <> 'Item extra' then raise exception 'texto deveria vir aparado: %', item; end if;
  begin perform public.redes_checklist_item_salvar('', pid, '   '); raise exception 'deveria recusar texto vazio';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'texto_vazio' then raise; end if; end;
  begin perform public.redes_checklist_item_salvar('', pid, repeat('x', 81)); raise exception 'deveria recusar texto longo';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'texto_longo' then raise; end if; end;
  if jsonb_array_length(public.redes_post('', pid)->'checklist') <> 7 then raise exception 'deveria ter 7 itens'; end if;
  perform public.redes_checklist_item_remover('', (item->>'id')::uuid);
  if jsonb_array_length(public.redes_post('', pid)->'checklist') <> 6 then raise exception 'remover não tirou o item'; end if;
  reset role;
  select count(*) into n from public.redes_checklist_itens where id = (item->>'id')::uuid and removido_em is not null;
  if n <> 1 then raise exception 'remover deve ser lógico: a linha continua, com removido_em'; end if;
  set local role authenticated;
  begin perform public.redes_checklist_item_remover('', gen_random_uuid()); raise exception 'deveria recusar item inexistente';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'item_nao_encontrado' then raise; end if; end;

  -- 5) mudar o formato não mexe nos itens
  r := public.redes_salvar('', pid, (public.redes_post('', pid)->'post'->>'versao')::int, jsonb_build_object('formato', 'feed'));
  if jsonb_array_length(public.redes_post('', pid)->'checklist') <> 6 then raise exception 'mudar o formato mexeu no checklist'; end if;

  -- 6) postagem antiga (sem itens) ganha a cópia uma vez só
  reset role;
  insert into public.redes_posts (titulo, formato, criado_por_rotulo, atualizado_por_rotulo) values ('Antiga sem checklist', 'feed', 'teste', 'teste') returning id into pid2;
  set local role authenticated;
  itens := public.redes_checklist_garantir('', pid2);
  if jsonb_array_length(itens) <> 4 then raise exception 'garantir deveria copiar os 4 itens do feed: %', itens; end if;
  itens := public.redes_checklist_garantir('', pid2);
  if jsonb_array_length(itens) <> 4 then raise exception 'garantir de novo não pode duplicar: %', itens; end if;
  -- quem removeu TODOS os itens de propósito não os recebe de volta
  for item in select * from jsonb_array_elements(itens) loop perform public.redes_checklist_item_remover('', (item->>'id')::uuid); end loop;
  if jsonb_array_length(public.redes_checklist_garantir('', pid2)) <> 0 then raise exception 'garantir não pode devolver itens removidos de propósito'; end if;

  -- 7) postagem fechada recusa mudança
  reset role;
  update public.redes_posts set situacao = 'cancelado' where id in (pid, pid2);
  set local role authenticated;
  begin perform public.redes_checklist_marcar('', (public.redes_post('', pid)->'checklist'->0->>'id')::uuid, true); raise exception 'deveria recusar marcar em postagem fechada';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'post_fechado' then raise; end if; end;
  begin perform public.redes_checklist_item_salvar('', pid2, 'Tarde'); raise exception 'deveria recusar em postagem fechada';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'post_fechado' then raise; end if; end;
  begin perform public.redes_checklist_garantir('', pid2); raise exception 'deveria recusar garantir em postagem fechada';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'post_fechado' then raise; end if; end;

  -- 8) duplicar: itens novos do modelo, nenhum marcado
  p2 := public.redes_criar('', jsonb_build_object('titulo', 'Original', 'formato', 'story'));
  perform public.redes_checklist_marcar('', (public.redes_post('', (p2->>'id')::uuid)->'checklist'->0->>'id')::uuid, true);
  p3 := public.redes_duplicar('', (p2->>'id')::uuid);
  if (p3->>'checklist_total')::int <> 5 or (p3->>'checklist_feitos')::int <> 0 then raise exception 'cópia deveria ter 5 itens desmarcados: %', p3; end if;

  -- 9) modelos: só redes.gerir muda; vale para postagens NOVAS
  item := public.redes_checklist_modelo_salvar('', 'feed', jsonb_build_array(jsonb_build_object('texto', 'Só este'), jsonb_build_object('texto', 'E este', 'ativo', true)));
  if jsonb_array_length(item) <> 2 then raise exception 'modelo do feed deveria ter 2 itens: %', item; end if;
  p1 := public.redes_criar('', jsonb_build_object('titulo', 'Feed com modelo novo', 'formato', 'feed'));
  if (p1->>'checklist_total')::int <> 2 then raise exception 'postagem nova deveria seguir o modelo novo: %', p1; end if;
  if (public.redes_post('', (p2->>'id')::uuid)->'post'->>'checklist_total')::int <> 5 then
    raise exception 'postagem existente não pode mudar com o modelo';
  end if;
  begin perform public.redes_checklist_modelo_salvar('', 'x', '[]'::jsonb); raise exception 'deveria recusar formato inválido';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'formato_invalido' then raise; end if; end;
  begin perform public.redes_checklist_modelo_salvar('', 'feed', jsonb_build_array(jsonb_build_object('texto', ''))); raise exception 'deveria recusar item vazio';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'texto_vazio' then raise; end if; end;
  if jsonb_array_length(public.redes_checklist_modelos_listar('')) < 4 then raise exception 'listar modelos'; end if;

  reset role;
  select user_id into soc from public.perfis where ativo and papel = 'organizacao' and user_id <> adm
     and public.pode_por_user(user_id, 'redes.editar') and not public.pode_por_user(user_id, 'redes.gerir') limit 1;
  if soc is not null then
    update public.perfis set deve_trocar_senha = false where user_id = soc;
    perform set_config('request.jwt.claims', json_build_object('sub', soc, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin perform public.redes_checklist_modelo_salvar('', 'feed', '[]'::jsonb); raise exception 'quem não gere não muda o modelo';
    exception when others then get stacked diagnostics msg = message_text; if msg <> 'nao_autorizado' then raise; end if; end;
  end if;

  raise exception 'TESTE_OK';
end $$;
