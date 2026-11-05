-- Caça aos Carimbos, identidade e recuperação (migration 20261205). Roda DEPOIS da migration, numa transação, e sempre
-- termina em exceção: TESTE_OK = passou; nada fica no banco. Como now() é fixo na transação, "tempo passando" é simulado
-- recuando criado_em / expira_em.
do $t$
declare
  ed constant text := '2026.2';
  ch_old text; ch_a1 text; ch_a2 text; ch_b text; ch_new text;
  r jsonb; r2 jsonb; cod text; cod2 text; n int; v_erro text; i int; v_antes int;
begin
  select count(*) into v_antes from public.mapas_lover;

  -- 0. Mapa "antigo" (mapa_criar v1) segue funcionando e lendo; colunas novas nulas.
  ch_old := public.mapa_criar(ed, 'Antigo', 'antigo@exemplo.com.br', null, true, true) ->> 'chave';
  if public.mapa_ler(ch_old) is null or public.mapa_ler_v2(ch_old) is null then raise exception 'mapa existente deixou de ler'; end if;
  if exists (select 1 from public.mapas_lover where email_norm = 'antigo@exemplo.com.br' and (email_confirmado_em is not null or ultimo_acesso_em is not null))
    then raise exception 'colunas novas deveriam ser nulas'; end if;

  -- 1. criar_v2: mesmo retorno de criar; pessoa A com dois mapas, pessoa B com um.
  ch_a1 := public.mapa_criar_v2(ed, 'A1', '  PessoaA@Exemplo.com.br ', null, true, true) ->> 'chave';
  ch_a2 := public.mapa_criar_v2(ed, 'A2', 'pessoaa@exemplo.com.br', null, true, true) ->> 'chave';
  ch_b  := public.mapa_criar_v2(ed, 'Bia', 'pessoab@exemplo.com.br', null, true, true) ->> 'chave';
  if ch_a1 is null or length(ch_a1) < 30 then raise exception 'criar_v2 sem chave'; end if;
  if (select count(*) from public.mapas_lover where email_norm = 'pessoaa@exemplo.com.br') <> 2 then raise exception 'e-mail não normalizado'; end if;
  update public.mapas_lover set criado_em = now() - interval '2 days' where chave_hash = public.mapa_hash(ch_a1);   -- A1 é o mais antigo = principal

  -- 2. Pedir não revela existência: resposta igual; sem código para e-mail sem mapa; entrada inválida também.
  r  := public.mapa_codigo_pedir(ed, 'pessoab@exemplo.com.br', 'confirmar');
  r2 := public.mapa_codigo_pedir(ed, 'naoexiste@exemplo.com.br', 'confirmar');
  if r is distinct from r2 or r <> '{"ok": true}'::jsonb then raise exception 'pedir revelou algo: % x %', r, r2; end if;
  -- (o pedido de B acima já gastou o minuto de B; limpa para os testes seguintes)
  delete from public.mapa_codigo; delete from public.mapa_codigo_pedido;
  r := public.mapa_codigo_emitir_interno(ed, 'naoexiste@exemplo.com.br', 'confirmar');
  if (r ->> 'enviar')::boolean or (r ->> 'codigo') is not null then raise exception 'e-mail sem mapa gerou código: %', r; end if;
  r := public.mapa_codigo_emitir_interno(ed, 'invalido', 'confirmar');
  if (r ->> 'enviar')::boolean then raise exception 'e-mail inválido gerou código'; end if;
  r := public.mapa_codigo_emitir_interno(ed, 'pessoab@exemplo.com.br', 'qualquer');
  if (r ->> 'enviar')::boolean then raise exception 'finalidade inválida gerou código'; end if;
  if (select count(*) from public.mapa_codigo) <> 0 then raise exception 'linhas de código indevidas'; end if;

  -- 3. Limite: o pedido do e-mail inexistente (acima) e o de um existente contam igual. 1/min e 5/hora.
  r := public.mapa_codigo_emitir_interno(ed, 'pessoab@exemplo.com.br', 'confirmar', ch_b);
  if not (r ->> 'enviar')::boolean or (r ->> 'codigo') !~ '^\d{6}$' then raise exception 'B deveria receber código: %', r; end if;
  cod := r ->> 'codigo';
  r := public.mapa_codigo_emitir_interno(ed, 'pessoab@exemplo.com.br', 'confirmar', ch_b);
  if (r ->> 'enviar')::boolean or not (r ->> 'limitado')::boolean then raise exception '2º pedido no mesmo minuto deveria ser limitado: %', r; end if;
  r := public.mapa_codigo_emitir_interno(ed, 'naoexiste@exemplo.com.br', 'confirmar');   -- inexistente: 1º pedido do minuto, nada a enviar
  r2 := public.mapa_codigo_emitir_interno(ed, 'naoexiste@exemplo.com.br', 'confirmar');
  if not (r2 ->> 'limitado')::boolean then raise exception 'limite deveria valer igual para e-mail sem mapa: %', r2; end if;
  -- 5 por hora: recua o minuto, e vê o 6º ser barrado mesmo sem o minuto.
  for i in 1..4 loop
    update public.mapa_codigo_pedido set criado_em = now() - interval '2 minutes' - ((id % 600)::text || ' seconds')::interval where criado_em > now() - interval '1 minute';
    r := public.mapa_codigo_emitir_interno(ed, 'pessoab@exemplo.com.br', 'confirmar', ch_b);
  end loop;
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 minutes' - ((id % 600)::text || ' seconds')::interval where criado_em > now() - interval '1 minute';
  r := public.mapa_codigo_emitir_interno(ed, 'pessoab@exemplo.com.br', 'confirmar', ch_b);
  if (r ->> 'enviar')::boolean or not (r ->> 'limitado')::boolean then raise exception '6º pedido na hora deveria ser limitado: %', r; end if;
  -- passou a hora: libera.
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  delete from public.mapa_codigo;

  -- 4. Validar: errado, certo, reuso. Código só em hash.
  r := public.mapa_codigo_emitir_interno(ed, 'pessoab@exemplo.com.br', 'confirmar', ch_b);
  cod := r ->> 'codigo';
  if exists (select 1 from public.mapa_codigo where codigo_hash = cod or length(codigo_hash) <> 64) then raise exception 'código não está só em hash'; end if;
  if (public.mapa_confirmar_email_status(ch_b) ->> 'confirmado')::boolean then raise exception 'B não deveria estar confirmado ainda'; end if;
  cod2 := lpad(((cod::int + 1) % 1000000)::text, 6, '0');
  r := public.mapa_codigo_validar(ed, 'pessoab@exemplo.com.br', cod2, 'confirmar', ch_b);
  if r <> '{"ok": false, "motivo": "codigo_invalido"}'::jsonb then raise exception 'código errado: %', r; end if;
  if (select tentativas from public.mapa_codigo limit 1) <> 1 then raise exception 'tentativa não contou'; end if;
  r := public.mapa_codigo_validar(ed, 'pessoab@exemplo.com.br', cod, 'recuperar');   -- finalidade trocada
  if (r ->> 'ok')::boolean then raise exception 'código de confirmar serviu para recuperar'; end if;
  r := public.mapa_codigo_validar(ed, 'pessoaa@exemplo.com.br', cod, 'confirmar', ch_a1);   -- outra pessoa
  if (r ->> 'ok')::boolean then raise exception 'código de B serviu para A'; end if;
  r := public.mapa_codigo_validar(ed, 'naoexiste@exemplo.com.br', cod, 'confirmar', ch_b); -- e-mail sem mapa responde igual a código errado
  if r <> '{"ok": false, "motivo": "codigo_invalido"}'::jsonb then raise exception 'e-mail sem mapa respondeu diferente: %', r; end if;
  r := public.mapa_codigo_validar(ed, ' PessoaB@exemplo.com.br ', cod, 'confirmar', ch_b);
  if r <> '{"ok": true, "finalidade": "confirmar"}'::jsonb then raise exception 'código certo não confirmou: %', r; end if;
  if not (public.mapa_confirmar_email_status(ch_b) ->> 'confirmado')::boolean then raise exception 'status não mostra confirmado'; end if;
  if not public.caca_email_confirmado(ed, 'pessoab@exemplo.com.br') then raise exception 'caca_email_confirmado'; end if;
  r := public.mapa_codigo_validar(ed, 'pessoab@exemplo.com.br', cod, 'confirmar', ch_b);   -- reuso
  if (r ->> 'ok')::boolean then raise exception 'código reutilizado'; end if;
  if (select ultimo_acesso_em from public.mapas_lover where chave_hash = public.mapa_hash(ch_b)) is null then raise exception 'ultimo_acesso_em não gravou'; end if;
  -- já confirmado: nada a enviar (e não vaza).
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  r := public.mapa_codigo_emitir_interno(ed, 'pessoab@exemplo.com.br', 'confirmar', ch_b);
  if (r ->> 'enviar')::boolean then raise exception 'já confirmado não deveria receber código'; end if;
  -- chave desconhecida
  r := public.mapa_confirmar_email_status('chave-errada');
  if r <> '{"confirmado": false, "valido": false}'::jsonb then raise exception 'status de chave desconhecida: %', r; end if;

  -- 5. Vencido e tentativas esgotadas.
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  r := public.mapa_codigo_emitir_interno(ed, 'pessoaa@exemplo.com.br', 'confirmar', ch_a1);
  cod := r ->> 'codigo';
  update public.mapa_codigo set expira_em = now() - interval '1 second' where finalidade = 'confirmar' and usado_em is null;
  r := public.mapa_codigo_validar(ed, 'pessoaa@exemplo.com.br', cod, 'confirmar', ch_a1);
  if (r ->> 'ok')::boolean then raise exception 'código vencido valeu'; end if;
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  r := public.mapa_codigo_emitir_interno(ed, 'pessoaa@exemplo.com.br', 'confirmar', ch_a1);   -- (desde 20261216 o pedido novo NÃO invalida o anterior)
  cod := r ->> 'codigo';
  cod2 := lpad(((cod::int + 7) % 1000000)::text, 6, '0');
  for i in 1..5 loop perform public.mapa_codigo_validar(ed, 'pessoaa@exemplo.com.br', cod2, 'confirmar', ch_a1); end loop;
  r := public.mapa_codigo_validar(ed, 'pessoaa@exemplo.com.br', cod, 'confirmar', ch_a1);       -- certo, mas já passou de 5 erros
  if (r ->> 'ok')::boolean then raise exception 'passou de 5 tentativas e ainda valeu'; end if;
  if (select tentativas from public.mapa_codigo where finalidade = 'confirmar' and usado_em is null order by criado_em desc limit 1) > 5 then raise exception 'tentativas passou de 5'; end if;

  -- 6. Recuperar: chave NOVA para o mapa PRINCIPAL (A1, o mais antigo; 20261210); a antiga de A1 morre; o outro mapa de A (A2) e outras pessoas intactos.
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  r := public.mapa_codigo_emitir_interno(ed, 'pessoaa@exemplo.com.br', 'recuperar');
  if not (r ->> 'enviar')::boolean or r ->> 'apelido' <> 'A1' then raise exception 'recuperar deveria mirar o mapa principal: %', r; end if;
  cod := r ->> 'codigo';
  r := public.mapa_codigo_validar(ed, 'pessoaa@exemplo.com.br', cod, 'recuperar');
  if not (r ->> 'ok')::boolean or r ->> 'finalidade' <> 'recuperar' or r ->> 'apelido' <> 'A1' or length(r ->> 'chave') < 30
    then raise exception 'recuperar falhou: %', r; end if;
  ch_new := r ->> 'chave';
  if ch_new = ch_a1 then raise exception 'chave nova igual à antiga'; end if;
  if public.mapa_ler_v2(ch_new) is null then raise exception 'chave nova não lê em mapa_ler_v2'; end if;
  if public.mapa_ler_v2(ch_a1) is not null or public.mapa_ler(ch_a1) is not null then raise exception 'chave antiga ainda vale'; end if;
  if public.mapa_ler_v2(ch_a2) is null then raise exception 'outro mapa da pessoa foi invalidado'; end if;
  if public.mapa_ler_v2(ch_b) is null or public.mapa_ler_v2(ch_old) is null then raise exception 'recuperar mexeu em mapa alheio'; end if;
  if not (public.mapa_confirmar_email_status(ch_new) ->> 'confirmado')::boolean or not (public.mapa_confirmar_email_status(ch_a2) ->> 'confirmado')::boolean or (public.mapa_confirmar_email_status(ch_a2) ->> 'principal')::boolean
    then raise exception 'recuperar deveria confirmar o e-mail da pessoa'; end if;
  r := public.mapa_codigo_validar(ed, 'pessoaa@exemplo.com.br', cod, 'recuperar');   -- uso único
  if (r ->> 'ok')::boolean then raise exception 'código de recuperar reutilizado'; end if;
  if (select count(*) from public.mapas_lover where chave_hash = public.mapa_hash(ch_new)) <> 1 then raise exception 'chave duplicada'; end if;

  -- 7. criar_v2: 5 mapas por e-mail em 24 h; o 6º dá muitos_pedidos; as validações antigas continuam.
  for i in 1..5 loop
    begin perform public.mapa_criar_v2(ed, 'Spam' || i, 'spam@exemplo.com.br', null, false, true);
    exception when others then v_erro := sqlerrm; end;
  end loop;
  begin perform public.mapa_criar_v2(ed, 'Spam6', 'spam@exemplo.com.br', null, false, true); v_erro := null;
  exception when others then v_erro := sqlerrm; end;
  if v_erro is distinct from 'muitos_pedidos' then raise exception 'criar_v2 deveria limitar: %', v_erro; end if;
  if (select count(*) from public.mapas_lover where email_norm = 'spam@exemplo.com.br') <> 5 then raise exception 'contagem de spam'; end if;
  begin perform public.mapa_criar_v2(ed, 'x', 'ok@exemplo.com.br', null, false, true); v_erro := null;
  exception when others then v_erro := sqlerrm; end;
  if v_erro is distinct from 'apelido_invalido' then raise exception 'validação de mapa_criar deveria seguir: %', v_erro; end if;
  begin perform public.mapa_criar_v2(ed, 'Ok', 'ok@exemplo.com.br', null, false, false); v_erro := null;
  exception when others then v_erro := sqlerrm; end;
  if v_erro is distinct from 'aceite_obrigatorio' then raise exception 'aceite: %', v_erro; end if;

  -- 8. Privilégios: anon não toca tabelas nem funções internas; anon pode validar/status/criar_v2; service_role pode emitir.
  if has_table_privilege('anon', 'public.mapa_codigo', 'select') or has_table_privilege('authenticated', 'public.caca_segredo', 'select')
     or has_table_privilege('anon', 'public.mapa_codigo_pedido', 'insert') then raise exception 'tabela aberta'; end if;
  if has_function_privilege('anon', 'public.mapa_codigo_emitir_interno(text,text,text,text,text)', 'execute')
     or has_function_privilege('authenticated', 'public.mapa_codigo_emitir_interno(text,text,text,text,text)', 'execute')
     or has_function_privilege('anon', 'public.mapa_codigo_pedir(text,text,text)', 'execute')
     or has_function_privilege('anon', 'public.caca_email_confirmado(text,text)', 'execute')
     or has_function_privilege('anon', 'public.caca_hash_texto(text)', 'execute') then raise exception 'função interna aberta ao anon'; end if;
  if not has_function_privilege('service_role', 'public.mapa_codigo_emitir_interno(text,text,text,text,text)', 'execute') then raise exception 'service_role sem emitir'; end if;
  if not (has_function_privilege('anon', 'public.mapa_codigo_validar(text,text,text,text,text)', 'execute')
          and has_function_privilege('anon', 'public.mapa_confirmar_email_status(text)', 'execute')
          and has_function_privilege('anon', 'public.mapa_criar_v2(text,text,text,text,boolean,boolean)', 'execute')) then raise exception 'anon sem as funções públicas'; end if;

  raise exception 'TESTE_OK mapas_antes=%', v_antes;
end $t$;
