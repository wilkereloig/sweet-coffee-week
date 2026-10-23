-- =============================================================================
-- Teste de 20261106_marca_salvar_avisa (a marca só salva; o banco avisa a organização e passa o cadastro completo
-- para a conferência). Um bloco só, que TERMINA EM EXCEÇÃO de propósito: "TESTE_OK" = tudo certo, e a exceção desfaz
-- tudo (usuários, avisos, dados). Rodar no SQL Editor ou pelo MCP, depois de aplicar a migration.
-- Usa uma participação ativa da edição atual: a conta de teste assume a marca dentro da transação (desfeita no fim).
--
-- Confere, nesta ordem:
--   A. rajada de salvamentos na MESMA área = 1 aviso, sem UPDATE a mais (n_agrupadas = 1)
--   B. área nova acumula no MESMO aviso ("Dados da marca · Tema", n_agrupadas = 2)
--   C. depois que alguém da organização lê, a próxima alteração abre um aviso NOVO
--   D. organização (editor e org_salvar_*) e gravação sem sessão (importação, pg_cron) não avisam
--   E. o salvamento que completa o cadastro passa para cadastro_completo + combo em_analise (e "concluiu o cadastro")
--   F. ajuste pedido não volta sozinho para análise
--   G. combo aprovado alterado continua aprovado, com alterado_apos_aprovacao
--   H. troca de logo avisa UMA vez (área "Logo") e não há mais "enviou uma nova logo"
-- =============================================================================
do $$
declare
  ua uuid := gen_random_uuid(); uo uuid := gen_random_uuid();
  part uuid; pa uuid; pu uuid; un uuid; dia date; v_item record; asp text; chave text;
  n int; abertos int; t text; k int; v_st text; v_cb text; v_alt boolean;
  marca_jwt text; org_jwt text;
begin
  insert into auth.users (id, email, aud, role) values
    (ua, 'salvar-avisa-a@scw.test', 'authenticated', 'authenticated'),
    (uo, 'salvar-avisa-o@scw.test', 'authenticated', 'authenticated');
  -- Qualquer participação ativa da edição atual (hoje todas já têm conta): a conta de teste ASSUME a marca só dentro
  -- desta transação, que desfaz no fim.
  select pa_.participante_id into part
    from participacoes pa_
   where pa_.edicao_codigo = edicao_atual() and pa_.status_cadastro <> 'encerrado'
   order by pa_.id limit 1;
  if part is null then raise exception 'preparo: nenhuma participação ativa na edição atual'; end if;
  insert into perfis (user_id, papel) values (ua, 'marca');
  update participantes set user_id = ua where id = part;
  pa := participacao_corrente(part);
  update perfis set deve_trocar_senha = false, ativo = true, bloqueado_em = null where user_id = ua;
  insert into perfis (user_id, papel, funcao, nome, deve_trocar_senha) values (uo, 'organizacao', 'administrador', 'Teste Salvar Avisa', false);
  marca_jwt := json_build_object('sub', ua, 'role', 'authenticated')::text;
  org_jwt := json_build_object('sub', uo, 'role', 'authenticated')::text;
  chave := 'marca:' || part || ':alterou';
  -- Aviso aberto de antes (de verdade, da marca): conta como lido, para o teste começar do zero.
  insert into notificacao_leitura (notificacao_id, leitor) select id, 'teste' from notificacoes where chave_grupo = chave on conflict do nothing;

  -- ── Preparo, sem sessão (não é a marca): tudo completo menos o responsável ──
  perform set_config('request.jwt.claims', '', true);
  update participantes set responsavel = '', telefone = '84999990000' where id = part;
  update participacoes set combo_status = 'rascunho', status_cadastro = 'em_preenchimento', combo_para_viagem = false,
         tema_combo = 'Tema do teste salvar avisa', tema_justificativa = 'Justificativa', combo_nome = 'Combo teste',
         combo_descricao = 'Descrição do combo'
   where id = pa;
  update participantes_itens set nome = 'Item ' || posicao, descricao = 'Descrição ' || posicao where participacao_id = pa;
  select id into pu from participacao_unidades where participacao_id = pa order by ordem limit 1;
  if pu is null then
    insert into participacao_unidades (participacao_id, ordem, endereco) values (pa, 1, 'Rua Teste') returning id into pu;
  end if;
  select unidade_id into un from participacao_unidades where id = pu;
  update unidades set logradouro = 'Rua Teste', numero = '10', bairro = 'Tirol', cidade = 'Natal', uf = 'RN' where id = un;
  update participacao_unidades set participa = (id = pu), consumo_local = 'sim', retirada = 'nao', delivery_combo = 'nao', faz_delivery = false
   where participacao_id = pa;
  select e.festival_inicio into dia from edicoes e join participacoes x on x.edicao_codigo = e.codigo where x.id = pa;
  insert into unidade_disponibilidade (participacao_unidade_id, data, abre, fecha) values (pu, dia, '14:00', '20:00') on conflict do nothing;
  for v_item in select id from participantes_itens where participacao_id = pa loop
    foreach asp in array array['gluten','leite','ovo','amendoim','castanhas','soja','peixe','crustaceos'] loop
      insert into declaracoes_alimentares (item_id, aspecto, estado) values (v_item.id, asp, 'nao_informado')
      on conflict (item_id, aspecto) where item_id is not null do nothing;
    end loop;
  end loop;
  if coalesce(array_length(pendencias_publicacao(pa), 1), 0) <> 0 then
    raise exception 'preparo: a página ainda tem pendências %', pendencias_publicacao(pa);
  end if;
  if (select count(*) from notificacoes where chave_grupo = chave and criada_em = now()) <> 0 then
    raise exception 'preparo sem sessão abriu aviso';
  end if;

  -- ── A. rajada na mesma área ──────────────────────────────────────────────
  perform set_config('request.jwt.claims', marca_jwt, true);
  set local role authenticated;
  update participantes set instagram = '@teste1' where id = part;
  update participantes set instagram = '@teste2' where id = part;
  update participantes set site = 'https://teste.example' where id = part;
  reset role;
  select count(*), max(texto), max(n_agrupadas) into n, t, k from notificacoes where chave_grupo = chave and criada_em = now();
  if n <> 1 or t <> 'Dados da marca' or k <> 1 then raise exception 'A rajada: avisos=% texto=% agrupadas=%', n, t, k; end if;
  if (select titulo from notificacoes where chave_grupo = chave and criada_em = now()) not like '% alterou o cadastro' then
    raise exception 'A título errado';
  end if;
  if (select status_cadastro from participacoes where id = pa) <> 'em_preenchimento' then
    raise exception 'A concluiu com o responsável vazio';
  end if;

  -- ── B. área nova acumula ─────────────────────────────────────────────────
  set local role authenticated;
  update participacoes set tema_justificativa = 'Nova justificativa' where id = pa;
  reset role;
  select count(*), max(texto), max(n_agrupadas) into n, t, k from notificacoes where chave_grupo = chave and criada_em = now();
  if n <> 1 or t <> 'Dados da marca · Tema' or k <> 2 then raise exception 'B acumular: avisos=% texto=% agrupadas=%', n, t, k; end if;

  -- ── C. lido pela organização → a próxima alteração abre outro ─────────────
  insert into notificacao_leitura (notificacao_id, leitor) select id, uo::text from notificacoes where chave_grupo = chave and criada_em = now();
  set local role authenticated;
  update participantes set instagram = '@teste3' where id = part;
  reset role;
  select count(*), count(*) filter (where not exists (select 1 from notificacao_leitura l where l.notificacao_id = n_.id))
    into n, abertos from notificacoes n_ where n_.chave_grupo = chave and n_.criada_em = now();
  if n <> 2 or abertos <> 1 then raise exception 'C depois de lido: avisos=% abertos=%', n, abertos; end if;
  -- fecha este também, para os próximos passos contarem do zero
  insert into notificacao_leitura (notificacao_id, leitor) select id, uo::text from notificacoes where chave_grupo = chave on conflict do nothing;

  -- ── D. organização e gravação sem sessão não avisam ──────────────────────
  perform set_config('request.jwt.claims', org_jwt, true);
  set local role authenticated;
  perform org_salvar_participante(null, part, '{"instagram": "@pela-organizacao"}');
  reset role;
  update participacoes set combo_condicoes = 'Mudado pela organização' where id = pa;   -- como o editor da ficha (sessão da equipe)
  perform set_config('request.jwt.claims', '', true);
  update participantes set site = 'https://importacao.example' where id = part;         -- importação / pg_cron
  if (select count(*) from notificacoes where chave_grupo = chave and criada_em = now()) <> 2 then
    raise exception 'D a organização (ou a gravação sem sessão) abriu aviso de marca';
  end if;

  -- ── E. o salvamento que completa o cadastro o leva para a conferência ─────
  perform set_config('request.jwt.claims', marca_jwt, true);
  set local role authenticated;
  update participantes set responsavel = 'Ana Teste' where id = part;
  reset role;
  select status_cadastro, combo_status into v_st, v_cb from participacoes where id = pa;
  if v_st <> 'cadastro_completo' or v_cb <> 'em_analise' then raise exception 'E completo: status=% combo=%', v_st, v_cb; end if;
  if not exists (select 1 from notificacoes where para = 'organizacao' and titulo like '% concluiu o cadastro' and criada_em = now()) then
    raise exception 'E sem o aviso "concluiu o cadastro"';
  end if;

  -- ── F. ajuste pedido não volta sozinho para análise ──────────────────────
  perform set_config('request.jwt.claims', '', true);
  update participacoes set combo_status = 'correcao_solicitada', status_cadastro = 'em_preenchimento' where id = pa;
  perform set_config('request.jwt.claims', marca_jwt, true);
  set local role authenticated;
  update participacoes set combo_descricao = 'Descrição corrigida' where id = pa;
  reset role;
  select status_cadastro, combo_status into v_st, v_cb from participacoes where id = pa;
  if v_st <> 'em_preenchimento' or v_cb <> 'correcao_solicitada' then raise exception 'F ajuste pedido: status=% combo=%', v_st, v_cb; end if;

  -- ── G. aprovado + alteração: continua aprovado, marcado ──────────────────
  perform set_config('request.jwt.claims', '', true);
  update participacoes set combo_status = 'aprovado', status_cadastro = 'cadastro_completo', alterado_apos_aprovacao = false where id = pa;
  perform set_config('request.jwt.claims', marca_jwt, true);
  set local role authenticated;
  update participacoes set combo_nome = 'Combo alterado depois de aprovado' where id = pa;
  reset role;
  select combo_status, status_cadastro, alterado_apos_aprovacao into v_cb, v_st, v_alt from participacoes where id = pa;
  if v_cb <> 'aprovado' or v_st <> 'cadastro_completo' or not v_alt then
    raise exception 'G aprovado alterado: combo=% status=% alterado=%', v_cb, v_st, v_alt;
  end if;

  -- ── H. troca de logo: um aviso, área "Logo", sem o aviso antigo ──────────
  insert into notificacao_leitura (notificacao_id, leitor) select id, uo::text from notificacoes where chave_grupo = chave on conflict do nothing;
  set local role authenticated;
  perform marca_definir_logo(jsonb_build_object('path', part::text || '/teste-salvar-avisa.png', 'mime', 'image/png', 'nome_original', 'teste.png'));
  reset role;
  select count(*), max(texto) into abertos, t from notificacoes n_
   where n_.chave_grupo = chave and not exists (select 1 from notificacao_leitura l where l.notificacao_id = n_.id);
  if abertos <> 1 or t <> 'Logo' then raise exception 'H logo: abertos=% texto=%', abertos, t; end if;
  if exists (select 1 from notificacoes where titulo like '% enviou uma nova logo' and criada_em = now()) then
    raise exception 'H a logo avisou duas vezes (sobrou o notificar de marca_definir_logo)';
  end if;

  raise exception 'TESTE_OK';
end $$;
