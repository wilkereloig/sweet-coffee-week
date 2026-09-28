-- =============================================================================
-- Verificação da evolução do painel (docs/EVOLUCAO-PAINEL-2026-09.md, Fase 18)
--
-- Dois blocos. Cada um cria usuários de teste, simula papéis (marca A, marca
-- B, curadoria, administrador, anônimo) e TERMINA EM EXCEÇÃO de propósito: a
-- mensagem traz o resultado e a exceção desfaz tudo — nada fica no banco.
-- Rodar no SQL Editor do Supabase (ou pelo MCP), um bloco por vez.
--
-- Resultado esperado de 29/09/2026 (entre colchetes):
--   Autorização: A ve participantes=1 · A ve B=0 · A altera B=0 · A altera
--   propria liberacao=negado · A decidir_tema=nao_autorizado · A le contatos
--   /revisao/acervo direto=negado · A inativa: tudo 0 e historia nula ·
--   curadoria pagamento/edicao=nao_autorizado · anon: tudo negado.
--   Ponta a ponta: 1 proposta por autosave · aviso de tema e de conflito ·
--   tema duplicado bloqueado (tema_ja_aprovado_para_outra_marca) · combo em
--   análise ao concluir e reaberto ao pedir ajuste · autoria = nome da conta ·
--   vínculo confirmado → recorrente · lembrete de venda só para quem não
--   registrou, sem repetir · contato com recebimentos e seleção atual.
--
-- Depende de marcas importadas da 2026.2 (BOLOMANIA, COOKITOS, Parma Doces).
-- =============================================================================

-- ── 1. Autorização (quem vê e muda o quê) ──────────────────────────────────
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  pa uuid; pb uuid; paa uuid; r text := ''; n int; ok boolean; t text;
begin
  insert into auth.users (id, email, aud, role) values
    (ua, 'teste-a@scw.test', 'authenticated', 'authenticated'),
    (ub, 'teste-b@scw.test', 'authenticated', 'authenticated'),
    (uc, 'teste-c@scw.test', 'authenticated', 'authenticated');
  select id into pa from participantes where nome_marca = 'COOKITOS';
  select id into pb from participantes where nome_marca = 'Parma Doces';
  select id into paa from participacoes where participante_id = pa;
  perform vincular_conta_participante(ua, pa);
  perform vincular_conta_participante(ub, pb);
  insert into perfis (user_id, papel, funcao, nome) values (uc, 'organizacao', 'curadoria', 'Teste Curadoria');

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from participantes; r := r || 'A ve participantes=' || n || '; ';
  select count(*) into n from participantes where id = pb; r := r || 'A ve B=' || n || '; ';
  select count(*) into n from participacoes; r := r || 'A participacoes=' || n || '; ';
  select count(*) into n from sessoes_fotos where participante_id = pb; r := r || 'A ve sessao de B=' || n || '; ';
  update participantes set nome_marca = 'invadido' where id = pb; get diagnostics n = row_count; r := r || 'A altera B=' || n || '; ';
  begin update participacoes set foto_liberacao = 'liberado' where id = paa; r := r || 'A altera propria liberacao=PASSOU!; ';
  exception when others then r := r || 'A altera propria liberacao=negado; '; end;
  begin perform decidir_tema(null, gen_random_uuid(), 'aprovado'); r := r || 'A decidir_tema=PASSOU!; ';
  exception when others then r := r || 'A decidir_tema=' || sqlerrm || '; '; end;
  select get_contatos(null) is null into ok; r := r || 'A get_contatos nulo=' || ok || '; ';
  begin select count(*) into n from contatos_relacionamento; r := r || 'A le contatos direto=' || n || '; ';
  exception when others then r := r || 'A le contatos direto=negado; '; end;
  begin select count(*) into n from revisao_pendencias; r := r || 'A le revisao direto=' || n || '; ';
  exception when others then r := r || 'A le revisao direto=negado; '; end;
  begin select count(*) into n from historico_marcas; r := r || 'A le acervo direto=' || n || '; ';
  exception when others then r := r || 'A le acervo direto=negado; '; end;
  reset role;

  update perfis set ativo = false where user_id = ua;
  set local role authenticated;
  select count(*) into n from participantes; r := r || 'A inativa participantes=' || n || '; ';
  select count(*) into n from participacoes; r := r || 'A inativa participacoes=' || n || '; ';
  r := r || 'A inativa historia=' || coalesce(marca_minha_historia()::text, 'nulo') || '; ';
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform definir_pagamento(null, paa, 'quitado', null); r := r || 'curadoria pagamento=PASSOU!; ';
  exception when others then r := r || 'curadoria pagamento=' || sqlerrm || '; '; end;
  begin perform salvar_edicao(null, '{"codigo":"2026.2","tema":"x"}'); r := r || 'curadoria edicao=PASSOU!; ';
  exception when others then r := r || 'curadoria edicao=' || sqlerrm || '; '; end;
  reset role;

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin select count(*) into n from participantes; r := r || 'anon participantes=' || n || '; ';
  exception when others then r := r || 'anon participantes=negado; '; end;
  r := r || 'anon revisao nulo=' || (get_revisao(null) is null) || '; ';
  begin perform importacao_promover(null, gen_random_uuid(), '{}'); r := r || 'anon importar=PASSOU!; ';
  exception when others then r := r || 'anon importar=' || sqlerrm || '; '; end;
  reset role;
  raise exception 'RESULTADO: %', r;
end $$;

-- ── 2. Ponta a ponta (marca → banco → organização → marca) ────────────────
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uadm uuid := gen_random_uuid();
  pa uuid; pb uuid; paa uuid; pab uuid; r text := ''; n int; t_a uuid; t_b uuid; h jsonb; ct uuid; x jsonb; ch text;
begin
  insert into auth.users (id, email, aud, role) values
    (ua, 'e2e-a@scw.test', 'authenticated', 'authenticated'), (ub, 'e2e-b@scw.test', 'authenticated', 'authenticated'),
    (uadm, 'e2e-adm@scw.test', 'authenticated', 'authenticated');
  select id into pa from participantes where nome_marca = 'BOLOMANIA';
  select id into pb from participantes where nome_marca = 'COOKITOS';
  select id into paa from participacoes where participante_id = pa;
  select id into pab from participacoes where participante_id = pb;
  perform vincular_conta_participante(ua, pa);
  perform vincular_conta_participante(ub, pb);
  insert into perfis (user_id, papel, funcao, nome) values (uadm, 'organizacao', 'administrador', 'Admin E2E');

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update participacoes set tema_combo = 'Pica-Pau', tema_justificativa = 'desenho clássico' where id = paa;
  update participacoes set tema_combo = 'Pica-Pau!', tema_justificativa = 'desenho clássico' where id = paa;
  reset role;
  select count(*) into n from temas_propostos where participacao_id = paa; r := r || '1.propostas A=' || n || '; ';
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update participacoes set tema_combo = 'pica pau', tema_justificativa = 'x' where id = pab;
  reset role;
  select count(*) into n from notificacoes where para = 'organizacao' and titulo like 'Conflito de tema%'; r := r || '2.aviso conflito=' || n || '; ';
  select id into t_a from temas_propostos where participacao_id = paa and status = 'proposto';
  select id into t_b from temas_propostos where participacao_id = pab and status = 'proposto';
  select chave into ch from participante_vinculos where participante_id = pa limit 1;

  perform set_config('request.jwt.claims', json_build_object('sub', uadm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform decidir_tema(null, t_a, 'aprovado', null);
  begin perform decidir_tema(null, t_b, 'aprovado', null); r := r || '3.duplicado=PASSOU!; ';
  exception when others then r := r || '3.duplicado=' || sqlerrm || '; '; end;
  reset role;
  update participacoes set status_cadastro = 'cadastro_completo' where id = paa;
  r := r || '4.combo apos concluir=' || (select combo_status from participacoes where id = paa) || '; ';
  set local role authenticated;
  perform revisar_combo(null, paa, 'correcao_solicitada', 'Trocar a bebida');
  reset role;
  r := r || 'reaberto=' || (select status_cadastro || '/' || combo_status from participacoes where id = paa) || '; ';
  r := r || 'autoria=' || (select ator_rotulo from auditoria where acao = 'tema.aprovado' order by at desc limit 1) || '; ';
  set local role authenticated;
  h := decidir_vinculo(null, pa, ch, 'confirmado', 'teste');
  reset role;
  r := r || '5.historia=' || (h ->> 'status') || '/' || (h ->> 'participacoes') || '; ';
  update edicoes set festival_inicio = (now() at time zone 'America/Fortaleza')::date - 1,
                     festival_fim = (now() at time zone 'America/Fortaleza')::date + 1, lembrete_vendas_hora = '00:00' where codigo = '2026.2';
  insert into vendas_diarias (participacao_id, dia, quantidade) values (pab, (now() at time zone 'America/Fortaleza')::date, 7);
  n := lembrar_vendas(); r := r || '6.lembretes=' || n || '; ';
  n := lembrar_vendas(); r := r || 'repetido=' || n || '; ';
  raise exception 'E2E: %', r;
end $$;
