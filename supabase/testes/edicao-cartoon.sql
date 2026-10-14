-- =============================================================================
-- Verificação da camada de edição Cartoon (migrations 20261014_cartoon_0{1,2,3}).
--
-- Mesmo padrão de verificacao-2026-09-29.sql: cada bloco cria usuários de
-- teste, simula papéis e TERMINA EM EXCEÇÃO de propósito — a mensagem traz o
-- resultado e a exceção desfaz tudo. Rodar no SQL Editor (ou pelo MCP), um
-- bloco por vez. Usa as duas primeiras participações ativas da 2026.2 sem conta vinculada (por id).
--
-- ⚠️ Como anon, `select ... from participacoes` é negado (RLS): o slug fica em variável.
-- Esperado (entre colchetes):
--   1. Autorização: anon le unidades/publicacoes/declaracoes=negado · anon
--      edicao_publica sem participantes=0 · A ve unidades de B=0 · A altera
--      unidade de B=0 · A grava lat=negado · A troca id_publico=negado ·
--      A publica=nao_autorizado · A cria declaracao em item de B=negado ·
--      combos sem participantes=negado · avaliacao fora de em_andamento=negado
--   2. Ponta a ponta: pendencias antes>0 e depois=0 · publicar ok v1 · lista
--      fechada sem campo privado · sem combos=sem chave combo · com combos=preco
--      · alteracao: marcado e versao publica intacta · reenvio=em_analise ·
--      retirar=retirado · slug desconhecido=inexistente · fechado=nao_divulgado
-- =============================================================================

-- ── 1. Autorização ──────────────────────────────────────────────────────────
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  pa uuid; pb uuid; paa uuid; pab uuid; ub_un uuid; ia uuid; ib uuid; r text := ''; n int; j jsonb;
begin
  insert into auth.users (id, email, aud, role) values
    (ua, 'cartoon-a@scw.test', 'authenticated', 'authenticated'),
    (ub, 'cartoon-b@scw.test', 'authenticated', 'authenticated');
  -- Duas marcas quaisquer da 2026.2 (nomes mudam com a padronização; ordem por id é estável).
  select pa_.participante_id into pa from participacoes pa_ join participantes pt_ on pt_.id = pa_.participante_id where pa_.edicao_codigo = '2026.2' and pa_.status_cadastro <> 'encerrado' and pt_.user_id is null order by pa_.id limit 1;
  select pa_.participante_id into pb from participacoes pa_ join participantes pt_ on pt_.id = pa_.participante_id where pa_.edicao_codigo = '2026.2' and pa_.status_cadastro <> 'encerrado' and pt_.user_id is null order by pa_.id offset 1 limit 1;
  select id into paa from participacoes where participante_id = pa and edicao_codigo = '2026.2';
  select id into pab from participacoes where participante_id = pb and edicao_codigo = '2026.2';
  perform vincular_conta_participante(ua, pa);
  perform vincular_conta_participante(ub, pb);
  update perfis set deve_trocar_senha = false, ativo = true where user_id in (ua, ub);
  insert into participacao_unidades (participacao_id, ordem, endereco) values (pab, 9, 'Rua B') ;
  select unidade_id into ub_un from participacao_unidades where participacao_id = pab and ordem = 9;
  select id into ia from participantes_itens where participacao_id = paa and posicao = 1;
  select id into ib from participantes_itens where participacao_id = pab and posicao = 1;

  -- anônimo
  set local role anon;
  begin select count(*) into n from unidades; r := r || 'anon le unidades=' || n || '; ';
  exception when others then r := r || 'anon le unidades=negado; '; end;
  begin select count(*) into n from publicacoes; r := r || 'anon le publicacoes=' || n || '; ';
  exception when others then r := r || 'anon le publicacoes=negado; '; end;
  begin select count(*) into n from declaracoes_alimentares; r := r || 'anon le declaracoes=' || n || '; ';
  exception when others then r := r || 'anon le declaracoes=negado; '; end;
  j := edicao_publica('2026.2'); r := r || 'anon edicao_publica participantes=' || jsonb_array_length(j -> 'participantes') || '; ';
  reset role;

  -- marca A
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from unidades where id = ub_un; r := r || 'A ve unidade de B=' || n || '; ';
  update unidades set logradouro = 'invadido' where id = ub_un; get diagnostics n = row_count; r := r || 'A altera unidade de B=' || n || '; ';
  begin update unidades set lat = -5.8 where participante_id = pa; r := r || 'A grava lat=PASSOU!; ';
  exception when others then r := r || 'A grava lat=negado; '; end;
  begin update participacao_unidades set id_publico = 'uxxxxx' where participacao_id = paa; r := r || 'A troca id_publico=PASSOU!; ';
  exception when others then r := r || 'A troca id_publico=negado; '; end;
  begin perform publicar_participacao(null, paa, 'marca'); r := r || 'A publica=PASSOU!; ';
  exception when others then r := r || 'A publica=' || sqlerrm || '; '; end;
  begin insert into declaracoes_alimentares (item_id, aspecto, estado) values (ib, 'gluten', 'contem'); r := r || 'A declara em B=PASSOU!; ';
  exception when others then r := r || 'A declara em B=negado; '; end;
  reset role;

  -- coerência dos interruptores (restrições da tabela)
  begin update edicao_publicacao set combos_publicos = true, participantes_publicos = false where edicao_codigo = '2026.2';
    r := r || 'combos sem participantes=PASSOU!; ';
  exception when others then r := r || 'combos sem participantes=negado; '; end;
  begin update edicao_publicacao set avaliacao_aberta = true, avaliacao_abre_em = now(), avaliacao_fecha_em = now() + interval '1 day'
     where edicao_codigo = '2026.2' and fase <> 'em_andamento';
    r := r || 'avaliacao fora de em_andamento=PASSOU!; ';
  exception when others then r := r || 'avaliacao fora de em_andamento=negado; '; end;

  raise exception 'RESULTADO 1: %', r;
end $$;

-- ── 2. Ponta a ponta: preencher, publicar, alterar, retirar ─────────────────
do $$
declare ua uuid := gen_random_uuid(); uo uuid := gen_random_uuid();
  pa uuid; paa uuid; pu uuid; r text := ''; n int; j jsonb; t text; v_item record; asp text; slug text;
begin
  insert into auth.users (id, email, aud, role) values
    (ua, 'cartoon-a2@scw.test', 'authenticated', 'authenticated'),
    (uo, 'cartoon-o2@scw.test', 'authenticated', 'authenticated');
  select pa_.participante_id into pa from participacoes pa_ join participantes pt_ on pt_.id = pa_.participante_id where pa_.edicao_codigo = '2026.2' and pa_.status_cadastro <> 'encerrado' and pt_.user_id is null order by pa_.id limit 1;
  select id into paa from participacoes where participante_id = pa and edicao_codigo = '2026.2';
  perform vincular_conta_participante(ua, pa);
  update perfis set deve_trocar_senha = false, ativo = true where user_id = ua;
  insert into perfis (user_id, papel, funcao, nome, deve_trocar_senha) values (uo, 'organizacao', 'administrador', 'Teste Admin Cartoon', false);

  r := r || 'pendencias antes=' || coalesce(array_length(pendencias_publicacao(paa), 1), 0) || '; ';

  -- a marca preenche o que a página pública precisa
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update participacoes set combo_nome = 'Combo Teste', combo_descricao = 'Descrição de teste' where id = paa;
  select id into pu from participacao_unidades where participacao_id = paa order by ordem limit 1;
  if pu is null then
    insert into participacao_unidades (participacao_id, ordem, endereco) values (paa, 1, 'Rua Teste') returning id into pu;
  end if;
  update unidades set logradouro = 'Rua Teste', numero = '10', bairro = 'Tirol', cidade = 'Natal', uf = 'RN'
   where id = (select unidade_id from participacao_unidades where id = pu);
  update participacao_unidades set participa = (id = pu), consumo_local = 'sim', retirada = 'nao', delivery_combo = 'nao'
   where participacao_id = paa;
  insert into unidade_disponibilidade (participacao_unidade_id, data, abre, fecha) values (pu, '2026-11-05', '14:00', '20:00');
  for v_item in select id from participantes_itens where participacao_id = paa loop
    foreach asp in array array['gluten','leite','ovo','amendoim','castanhas','soja','peixe','crustaceos'] loop
      insert into declaracoes_alimentares (item_id, aspecto, estado) values (v_item.id, asp, 'nao_informado')
      on conflict (item_id, aspecto) where item_id is not null do nothing;
    end loop;
  end loop;
  reset role;
  r := r || 'pendencias depois=' || coalesce(array_length(pendencias_publicacao(paa), 1), 0) || '; ';

  -- organização aprova e publica
  update participacoes set combo_status = 'aprovado' where id = paa;
  perform set_config('request.jwt.claims', json_build_object('sub', uo, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := publicar_participacao(null, paa, 'marca_e_combo'); slug := j ->> 'slug'; r := r || 'publicar=' || (j ->> 'ok') || ' v' || (j ->> 'versao') || '; ';
  perform definir_publicacao_edicao(null, '2026.2', '{"participantes_publicos": true}');
  reset role;

  set local role anon;
  j := edicao_publica('2026.2');
  t := j::text;
  r := r || 'publicos=' || jsonb_array_length(j -> 'participantes') || '; ';
  r := r || 'campo privado=' || (t ~* '"(telefone|email|cnpj|razao_social|custo_|combo_revisao_nota|responsavel|tema_)') || '; ';
  r := r || 'sem combos tem combo=' || (t like '%"combo":%') || '; ';
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', uo, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform definir_publicacao_edicao(null, '2026.2', '{"combos_publicos": true}');
  reset role;
  set local role anon;
  j := participante_publico('2026.2', slug);
  r := r || 'estado=' || (j ->> 'estado') || ' preco=' || coalesce(j #>> '{participante,combo,preco}', 'nulo')
         || ' nome=' || coalesce(j #>> '{participante,combo,nome}', 'nulo') || '; ';
  reset role;

  -- marca altera depois de aprovado
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update participacoes set combo_nome = 'Combo Alterado' where id = paa;
  reset role;
  r := r || 'alterado=' || (select alterado_apos_aprovacao from participacoes where id = paa);
  set local role anon;
  j := participante_publico('2026.2', slug);
  r := r || ' publico segue=' || (j #>> '{participante,combo,nome}') || '; ';
  reset role;

  -- reenvio leva a em_analise (a marca precisa dos campos legados também)
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := marca_concluir_cadastro(paa);
  reset role;
  r := r || 'reenvio=' || (j::text) || ' combo_status=' || (select combo_status from participacoes where id = paa) || '; ';

  -- retirar
  perform set_config('request.jwt.claims', json_build_object('sub', uo, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform retirar_publicacao(null, paa, 'teste');
  reset role;
  set local role anon;
  r := r || 'retirado=' || (participante_publico('2026.2', slug) ->> 'estado') || '; ';
  r := r || 'desconhecido=' || (participante_publico('2026.2', 'nao-existe') ->> 'estado') || '; ';
  reset role;
  update edicao_publicacao set combos_publicos = false, participantes_publicos = false where edicao_codigo = '2026.2';
  set local role anon;
  r := r || 'fechado=' || (participante_publico('2026.2', 'qualquer') ->> 'estado') || '; ';
  reset role;

  raise exception 'RESULTADO 2: %', coalesce(r, 'mensagem nula — algum pedaço veio nulo');
end $$;
