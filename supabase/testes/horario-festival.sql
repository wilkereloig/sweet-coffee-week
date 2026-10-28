-- Teste de 20261107 (horário no festival: participacao_unidades.horario_festival). Não deixa rastro: termina em exceção.
-- Esperado: "TESTE_OK". Precisa de 1 administrador ativo (conta pessoal) e de 2 participações da edição atual, com unidade que
-- participa, de marcas com conta. As funções temporárias somem junto (pg_temp) quando a transação desfaz.
create or replace function pg_temp.espera_erro(p_sql text, p_esperado text) returns void language plpgsql as $f$
declare msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics msg = message_text;
    if msg <> p_esperado then raise exception 'esperava "%" e veio "%" em: %', p_esperado, msg, left(p_sql, 160); end if;
    return;
  end;
  raise exception 'esperava o erro "%" e nada falhou em: %', p_esperado, left(p_sql, 160);
end $f$;
create or replace function pg_temp.grava(p_pu uuid, p_json text) returns void language plpgsql as $f$
begin
  execute format('update public.participacao_unidades set horario_festival = %L::jsonb where id = %L', p_json, p_pu);
end $f$;
create or replace function pg_temp.espera_grava(p_pu uuid, p_json text, p_esperado text) returns void language plpgsql as $f$
begin
  perform pg_temp.espera_erro(format('update public.participacao_unidades set horario_festival = %L::jsonb where id = %L', p_json, p_pu), p_esperado);
end $f$;

do $$
declare
  adm uuid; marca uuid; marca_outra uuid; pa uuid; pu uuid; part uuid; outra_pa uuid; pu_outra uuid; ini date; fim date;
  j jsonb; n int; msg text; v_aud int; v_aud2 int; r jsonb; v_link uuid; v_env uuid; v_id_pub text; v_un uuid; chave text;
  linhas constant text := '[{"data":"2026-11-05","abre":"10:00","fecha":"18:00"},{"data":"2026-11-06","abre":"10:00","fecha":"18:00"},{"data":"2026-11-07","abre":"12:00","fecha":"16:00"}]';
begin
  select user_id into adm from public.perfis
   where funcao = 'administrador' and papel = 'organizacao' and ativo and bloqueado_em is null and not deve_trocar_senha limit 1;
  select pu_.id, pu_.participacao_id, pa_.participante_id, p.user_id, e.festival_inicio, e.festival_fim
    into pu, pa, part, marca, ini, fim
    from public.participacao_unidades pu_
    join public.participacoes pa_ on pa_.id = pu_.participacao_id
    join public.participantes p on p.id = pa_.participante_id
    join public.edicoes e on e.codigo = pa_.edicao_codigo
   where pu_.participa and p.user_id is not null and e.festival_inicio is not null and pa_.status_cadastro <> 'encerrado'
   order by pu_.id limit 1;
  select pu_.id, pu_.participacao_id, p.user_id into pu_outra, outra_pa, marca_outra
    from public.participacao_unidades pu_
    join public.participacoes pa_ on pa_.id = pu_.participacao_id
    join public.participantes p on p.id = pa_.participante_id
   where pu_.participa and p.user_id is not null and pa_.participante_id <> part order by pu_.id limit 1;
  if adm is null or pu is null or pu_outra is null then raise exception 'preparo: faltou administrador ou unidades'; end if;
  if ini <> date '2026-11-05' or fim <> date '2026-11-15' then raise exception 'preparo: o teste espera o festival 5 a 15/11/2026 (veio % a %)', ini, fim; end if;
  chave := 'marca:' || part || ':alterou';
  insert into public.notificacao_leitura (notificacao_id, leitor) select id, 'teste' from public.notificacoes where chave_grupo = chave on conflict do nothing;
  perform pg_temp.grava(pu, '[]');   -- começa limpo (a transação do teste desfaz)

  -- ── A. O texto do /preencher vira períodos (só o que lê por inteiro) ──────────────────────────────
  j := public.horario_festival_de_texto('Todos os dias, 11h às 19h', ini, fim);
  if jsonb_array_length(j) <> 11 or j -> 0 ->> 'abre' <> '11:00' or j -> 10 ->> 'fecha' <> '19:00' or j -> 10 ->> 'data' <> '2026-11-15' then
    raise exception 'A1 todos os dias: %', j;
  end if;
  j := public.horario_festival_de_texto('Seg e Ter, fechado; Qua a Dom, 15h às 20h', ini, fim);
  if jsonb_array_length(j) <> 9 or exists (select 1 from jsonb_array_elements(j) e where e ->> 'data' in ('2026-11-09', '2026-11-10')) then
    raise exception 'A2 seg e ter fechados: %', j;
  end if;
  j := public.horario_festival_de_texto('Todos os dias, 10h às 14h e 18h às 22h', ini, fim);
  if jsonb_array_length(j) <> 22 then raise exception 'A3 dois períodos: %', jsonb_array_length(j); end if;
  j := public.horario_festival_de_texto('Qui, 15h às 23h; Sex e Sáb, 14h às 23h; Dom, 12h30 às 22h', ini, fim);
  if jsonb_array_length(j) <> 8
     or (select e ->> 'abre' from jsonb_array_elements(j) e where e ->> 'data' = '2026-11-12') <> '15:00'
     or (select e ->> 'abre' from jsonb_array_elements(j) e where e ->> 'data' = '2026-11-14') <> '14:00'
     or (select (e ->> 'abre') || '-' || (e ->> 'fecha') from jsonb_array_elements(j) e where e ->> 'data' = '2026-11-15') <> '12:30-22:00' then
    raise exception 'A4 três faixas: %', j;
  end if;
  j := public.horario_festival_de_texto('Seg a Sex, 9h às 18h', ini, fim);
  if jsonb_array_length(j) <> 7 or exists (select 1 from jsonb_array_elements(j) e where e ->> 'data' in ('2026-11-07', '2026-11-08', '2026-11-14', '2026-11-15')) then
    raise exception 'A5 fim de semana não mencionado = não abre: %', j;
  end if;
  foreach msg in array array['De terça a domingo das 11 às 19h', '12:00h às 19:30', 'Todos os dias, 0h às 2h', 'Todos os dias, 20h às 10h',
                              'Seg, 10h às 12h; Seg a Sex, 10h às 12h', 'Todos os dias, 10h15 às 12h', 'Todos os dias, 4h às 12h',
                              'Todos os dias, 10h às 14h e 13h às 18h', 'Sex a Seg, 10h às 12h', 'Seg a Dom, fechado', '', '   ',
                              'Lagoa Nova - segunda a sábado das 12 às 20h'] loop
    if public.horario_festival_de_texto(msg, ini, fim) is not null then raise exception 'A6 devia devolver null para "%"', msg; end if;
  end loop;
  if public.horario_festival_de_texto(null, ini, fim) is not null or public.horario_festival_de_texto('Todos os dias, 10h às 12h', null, fim) is not null then
    raise exception 'A7 null';
  end if;

  -- ── B. A coluna: o gatilho valida e deixa tudo na forma canônica ─────────────────────────────────
  perform pg_temp.grava(pu, '[{"data":"2026-11-07","abre":"12:00:00","fecha":"16:00"},{"data":"2026-11-05","abre":"10:00","fecha":"18:00","observacao":"  até acabar  "}]');
  if (select horario_festival from public.participacao_unidades where id = pu)
     is distinct from '[{"data":"2026-11-05","abre":"10:00","fecha":"18:00","observacao":"até acabar"},{"data":"2026-11-07","abre":"12:00","fecha":"16:00"}]'::jsonb then
    raise exception 'B1 forma canônica: %', (select horario_festival from public.participacao_unidades where id = pu);
  end if;
  perform pg_temp.espera_grava(pu, '{}', 'horario_invalido');
  perform pg_temp.espera_grava(pu, '[1]', 'horario_invalido');
  perform pg_temp.espera_grava(pu, '[{"data":"2026-11-05","abre":"10:00","fecha":"09:00"}]', 'horario_invalido');
  perform pg_temp.espera_grava(pu, '[{"data":"2026-11-05","abre":"10:00","fecha":"10:00"}]', 'horario_invalido');
  perform pg_temp.espera_grava(pu, '[{"data":"2026-11-04","abre":"10:00","fecha":"12:00"}]', 'data_fora_do_festival');
  perform pg_temp.espera_grava(pu, '[{"data":"2026-11-16","abre":"10:00","fecha":"12:00"}]', 'data_fora_do_festival');
  perform pg_temp.espera_grava(pu, '[{"data":"2026-11-05","abre":"08:00","fecha":"10:00"},{"data":"2026-11-05","abre":"11:00","fecha":"13:00"},{"data":"2026-11-05","abre":"14:00","fecha":"16:00"}]', 'horario_invalido');
  perform pg_temp.espera_grava(pu, '[{"data":"2026-11-05","abre":"10:00","fecha":"14:00"},{"data":"2026-11-05","abre":"13:00","fecha":"18:00"}]', 'horario_invalido');
  perform pg_temp.espera_grava(pu, '[{"data":"2026-11-05","abre":"10:00","fecha":"14:00"},{"data":"2026-11-05","abre":"10:00","fecha":"18:00"}]', 'horario_invalido');
  perform pg_temp.espera_grava(pu, '[{"data":"2026-11-05","abre":"25:99","fecha":"26:00"}]', 'horario_invalido');
  perform pg_temp.espera_grava(pu, '[{"data":"amanhã","abre":"10:00","fecha":"12:00"}]', 'horario_invalido');
  perform pg_temp.espera_grava(pu, '[{"data":"2026-11-05","abre":"10:00"}]', 'horario_invalido');
  perform pg_temp.espera_grava(pu, '[{"data":"2026-11-05","abre":"10:00","fecha":"12:00","observacao":"' || repeat('x', 121) || '"}]', 'horario_invalido');
  if jsonb_array_length((select horario_festival from public.participacao_unidades where id = pu)) <> 2 then raise exception 'B2 uma recusa mexeu no horário'; end if;
  perform pg_temp.grava(pu, '[{"data":"2026-11-05","abre":"11:00","fecha":"14:00"},{"data":"2026-11-05","abre":"18:00","fecha":"24:00"}]');
  if (select horario_festival -> 1 ->> 'fecha' from public.participacao_unidades where id = pu) <> '24:00' then raise exception 'B3 meia-noite e dois períodos'; end if;
  perform pg_temp.grava(pu, '[]');
  if (select horario_festival from public.participacao_unidades where id = pu) <> '[]'::jsonb then raise exception 'B4 esvaziar'; end if;

  -- ── C. A equipe edita pela RPC ───────────────────────────────────────────────────────────────────
  if has_function_privilege('anon', 'public.horario_festival_normalizar(jsonb, date, date)', 'execute')
     or has_function_privilege('authenticated', 'public.horario_festival_normalizar(jsonb, date, date)', 'execute')
     or has_function_privilege('authenticated', 'public.horario_festival_de_texto(text, date, date)', 'execute')
     or has_function_privilege('anon', 'public.horario_festival_validar()', 'execute')
     or not has_function_privilege('authenticated', 'public.org_salvar_horario_unidade(text, uuid, uuid, jsonb)', 'execute') then
    raise exception 'C0 permissões de execução';
  end if;
  set local role anon;
  begin
    perform public.org_salvar_horario_unidade(null, pa, pu, linhas::jsonb);
    raise exception 'C1 anônimo devia ser recusado';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'nao_autorizado' then raise; end if; end;
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', marca, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', marca::text, true);
  set local role authenticated;
  begin
    perform public.org_salvar_horario_unidade(null, pa, pu, linhas::jsonb);
    raise exception 'C2 a marca não edita por esta RPC';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'nao_autorizado' then raise; end if; end;
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  select count(*) into v_aud from public.auditoria where participacao_id = pa and detalhe ->> 'bloco' = 'horario_festival';
  set local role authenticated;
  n := public.org_salvar_horario_unidade(null, pa, pu, linhas::jsonb);
  reset role;
  if n <> 3 then raise exception 'C3 administrador grava (%)', n; end if;
  select count(*) into v_aud2 from public.auditoria where participacao_id = pa and detalhe ->> 'bloco' = 'horario_festival';
  if v_aud2 <> v_aud + 1 then raise exception 'C3 devia auditar uma vez (% → %)', v_aud, v_aud2; end if;
  set local role authenticated;
  perform public.org_salvar_horario_unidade(null, pa, pu, linhas::jsonb);   -- igual: não audita
  reset role;
  if (select count(*) from public.auditoria where participacao_id = pa and detalhe ->> 'bloco' = 'horario_festival') <> v_aud2 then
    raise exception 'C4 gravar igual não devia auditar';
  end if;
  if jsonb_array_length((select detalhe -> 'depois' from public.auditoria where participacao_id = pa and detalhe ->> 'bloco' = 'horario_festival'
                          order by id desc limit 1)) <> 3 then
    raise exception 'C5 a auditoria guarda o depois';
  end if;
  set local role authenticated;
  begin
    perform public.org_salvar_horario_unidade(null, pa, pu_outra, linhas::jsonb);
    raise exception 'C6 unidade de outra participação';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'unidade_nao_encontrada' then raise; end if; end;
  begin
    perform public.org_salvar_horario_unidade(null, '00000000-0000-0000-0000-000000000000', pu, linhas::jsonb);
    raise exception 'C7 participação inexistente';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'participacao_nao_encontrada' then raise; end if; end;
  begin
    perform public.org_salvar_horario_unidade(null, pa, pu, '[{"data":"2026-11-05","abre":"10:00","fecha":"09:00"}]'::jsonb);
    raise exception 'C8 horário inválido';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'horario_invalido' then raise; end if; end;
  reset role;

  -- ── D. Combo aprovado: mudar o horário marca "alterado após aprovação"; gravar igual não ─────────
  update public.participacoes set combo_status = 'aprovado', alterado_apos_aprovacao = false where id = pa;
  set local role authenticated;
  perform public.org_salvar_horario_unidade(null, pa, pu, linhas::jsonb);
  reset role;
  if (select alterado_apos_aprovacao from public.participacoes where id = pa) then raise exception 'D1 gravar igual marcou alterado'; end if;
  set local role authenticated;
  perform public.org_salvar_horario_unidade(null, pa, pu, '[{"data":"2026-11-05","abre":"11:00","fecha":"14:30"}]'::jsonb);
  reset role;
  if not (select alterado_apos_aprovacao from public.participacoes where id = pa) then raise exception 'D2 mudar devia marcar alterado'; end if;
  update public.participacoes set combo_status = 'rascunho', alterado_apos_aprovacao = false where id = pa;
  perform pg_temp.grava(pu, linhas);

  -- ── E. Pendência de publicação, página pública e formulário ──────────────────────────────────────
  select id_publico into v_id_pub from public.participacao_unidades where id = pu;
  if ('unidade:' || v_id_pub || ':horario') = any (public.pendencias_publicacao(pa)) then raise exception 'E1 com horário não devia pendenciar'; end if;
  perform pg_temp.grava(pu, '[]');
  if not (('unidade:' || v_id_pub || ':horario') = any (public.pendencias_publicacao(pa))) then raise exception 'E1 sem horário devia pendenciar'; end if;
  perform pg_temp.grava(pu, linhas);
  r := public.montar_publico(pa, 'marca_e_combo');
  if jsonb_path_exists(r, '$.unidades[*].horario_loja') then raise exception 'E2 a página pública não leva mais o horário da loja'; end if;
  if jsonb_array_length((select u -> 'combo' -> 'disponibilidade' from jsonb_array_elements(r -> 'unidades') u where u ->> 'id' = v_id_pub)) <> 3
     or ((select u -> 'combo' -> 'disponibilidade' -> 0 ->> 'abre' from jsonb_array_elements(r -> 'unidades') u where u ->> 'id' = v_id_pub)) <> '10:00' then
    raise exception 'E2 combo.disponibilidade: %', r;
  end if;
  r := public.preenchimento_estado(pa);
  if jsonb_path_exists(r, '$.unidades[*].horario_loja') then raise exception 'E3 o formulário não recebe mais o horário da loja'; end if;
  if jsonb_array_length((select u -> 'horario_festival' from jsonb_array_elements(r -> 'unidades') u where u ->> 'id' = pu::text)) <> 3 then
    raise exception 'E3 horario_festival no estado';
  end if;

  -- ── F. A marca grava o horário da própria unidade (o que o painel faz por PATCH) ──────────────────
  perform pg_temp.grava(pu, '[]');
  insert into public.notificacao_leitura (notificacao_id, leitor) select id, 'teste' from public.notificacoes where chave_grupo = chave on conflict do nothing;
  update public.perfis set deve_trocar_senha = false, ativo = true, bloqueado_em = null where user_id = marca;   -- conta_ativa() (a RLS de participantes exige)
  perform set_config('request.jwt.claims', jsonb_build_object('sub', marca, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', marca::text, true);
  set local role authenticated;
  update public.participacao_unidades set horario_festival = linhas::jsonb where id = pu;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'F1 a marca devia gravar o horário da própria unidade (%)', n; end if;
  update public.participacao_unidades set horario_festival = linhas::jsonb where id = pu_outra;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'F2 a marca gravou a unidade de outra marca (%)', n; end if;
  begin
    update public.participacao_unidades set horario_festival = '[{"data":"2026-11-05","abre":"10:00","fecha":"09:00"}]'::jsonb where id = pu;
    raise exception 'F3 horário inválido devia ser recusado';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'horario_invalido' then raise; end if; end;
  reset role;
  if (select jsonb_array_length(horario_festival) from public.participacao_unidades where id = pu) <> 3 then raise exception 'F4 o horário gravado pela marca'; end if;
  if not exists (select 1 from public.notificacoes n_ where n_.chave_grupo = chave and n_.texto like '%Horário no festival%'
                  and not exists (select 1 from public.notificacao_leitura l where l.notificacao_id = n_.id)) then
    raise exception 'F5 a organização devia ser avisada do horário (área "Horário no festival")';
  end if;

  -- ── G. Aplicar um envio do formulário ────────────────────────────────────────────────────────────
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  select id into v_link from public.preenchimento_links where participacao_id = pa and revogado_em is null limit 1;   -- um ativo por participação
  if v_link is null then
    insert into public.preenchimento_links (participacao_id, codigo, expira_em) values (pa, replace(gen_random_uuid()::text, '-', ''), now() + interval '1 day') returning id into v_link;
  end if;
  select unidade_id into v_un from public.participacao_unidades where id = pu;
  -- G1: períodos novos + WhatsApp preenchido, sem o campo de autorização (formulário novo)
  insert into public.preenchimento_envios (link_id, participacao_id, dados)
  values (v_link, pa, jsonb_build_object('unidades', jsonb_build_array(jsonb_build_object(
           'id', pu, 'whatsapp', '(84) 99999-0000',
           'horario_festival', '[{"data":"2026-11-06","abre":"09:00","fecha":"12:00"},{"data":"2026-11-06","abre":"14:00","fecha":"18:00"}]'::jsonb))))
  returning id into v_env;
  set local role authenticated;
  perform public.org_preenchimento_decidir(null, v_env, true);
  reset role;
  if (select horario_festival from public.participacao_unidades where id = pu)
     is distinct from '[{"data":"2026-11-06","abre":"09:00","fecha":"12:00"},{"data":"2026-11-06","abre":"14:00","fecha":"18:00"}]'::jsonb then
    raise exception 'G1 horário aplicado: %', (select horario_festival from public.participacao_unidades where id = pu);
  end if;
  if not (select whatsapp_autorizado from public.unidades where id = v_un) or (select whatsapp_publico from public.unidades where id = v_un) <> '84999990000' then
    raise exception 'G1 WhatsApp preenchido devia valer como publicável';
  end if;
  -- G2: cópia antiga da página: "false" explícito mantém o número fora; texto no formato lido por inteiro vira períodos
  insert into public.preenchimento_envios (link_id, participacao_id, dados)
  values (v_link, pa, jsonb_build_object('unidades', jsonb_build_array(jsonb_build_object(
           'id', pu, 'whatsapp', '(84) 98888-0000', 'whatsapp_autorizado', false, 'horario_loja', 'Seg a Dom, 8h às 20h',
           'horario_combo', 'Seg a Sex, 10h às 12h'))))
  returning id into v_env;
  set local role authenticated;
  perform public.org_preenchimento_decidir(null, v_env, true);
  reset role;
  if (select whatsapp_autorizado from public.unidades where id = v_un) then raise exception 'G2 "false" explícito devia manter o número fora'; end if;
  if (select horario_loja_texto from public.unidades where id = v_un) is not distinct from 'Seg a Dom, 8h às 20h' then raise exception 'G2 horário da loja não é mais gravado'; end if;
  if jsonb_array_length((select horario_festival from public.participacao_unidades where id = pu)) <> 7 then
    raise exception 'G2 texto antigo lido: %', (select horario_festival from public.participacao_unidades where id = pu);
  end if;
  -- G3: texto que não se lê por inteiro não mexe nos períodos (só fica o texto)
  insert into public.preenchimento_envios (link_id, participacao_id, dados)
  values (v_link, pa, jsonb_build_object('unidades', jsonb_build_array(jsonb_build_object('id', pu, 'horario_combo', 'De terça a domingo das 11 às 19h'))))
  returning id into v_env;
  set local role authenticated;
  perform public.org_preenchimento_decidir(null, v_env, true);
  reset role;
  if jsonb_array_length((select horario_festival from public.participacao_unidades where id = pu)) <> 7
     or (select horarios from public.participacao_unidades where id = pu) <> 'De terça a domingo das 11 às 19h' then
    raise exception 'G3 texto livre: períodos intactos e texto guardado';
  end if;
  -- G4: períodos inválidos no envio recusam a aplicação inteira
  insert into public.preenchimento_envios (link_id, participacao_id, dados)
  values (v_link, pa, jsonb_build_object('unidades', jsonb_build_array(jsonb_build_object('id', pu,
           'horario_festival', '[{"data":"2026-11-06","abre":"18:00","fecha":"09:00"}]'::jsonb))))
  returning id into v_env;
  set local role authenticated;
  begin
    perform public.org_preenchimento_decidir(null, v_env, true);
    raise exception 'G4 período inválido devia recusar a aplicação';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'horario_invalido' then raise; end if; end;
  reset role;

  raise exception 'TESTE_OK';
end $$;
