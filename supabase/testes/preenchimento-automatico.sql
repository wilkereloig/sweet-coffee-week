-- Teste de 20261125 (preenchimento automático). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
-- Usa o envio aplicado mais recente de qualquer participação como molde e roda tudo como a chave de serviço (a edge function).
do $$
declare
  e public.preenchimento_envios; v_envio uuid; v_envio2 uuid; r jsonb; n int; v_ini timestamptz := now(); v_pid uuid; v_nome text;
begin
  select * into e from public.preenchimento_envios where status = 'aplicado' and dados ? 'combo' order by enviado_em desc limit 1;
  if e.id is null then raise exception 'preparo: nenhum envio aplicado para servir de molde'; end if;
  select participante_id into v_pid from public.participacoes where id = e.participacao_id;
  v_nome := coalesce(nullif(btrim(e.dados -> 'combo' ->> 'combo_nome'), ''), 'Combo');

  update public.admin_config set preenchimento_automatico = true; -- o gatilho chama pg_net (a fila é desfeita no rollback)
  insert into public.preenchimento_envios (link_id, participacao_id, dados)
  values (e.link_id, e.participacao_id, jsonb_set(e.dados, '{combo,combo_descricao}', to_jsonb('Descricao de teste automatico 123.'::text)))
  returning id into v_envio;

  -- sem ser serviço: nada roda
  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.sistema_aplicar_envio(v_envio);
    raise exception 'sistema_aplicar_envio rodou sem a chave de serviço';
  exception when others then
    if sqlerrm <> 'nao_autorizado' then raise exception 'esperava nao_autorizado, veio: %', sqlerrm; end if;
  end;

  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  r := public.sistema_aplicar_envio(v_envio);
  if r ->> 'ok' <> 'true' or r ->> 'ja' <> 'false' then raise exception 'aplicar: %', r; end if;
  if (select status || '|' || revisado_por_rotulo from public.preenchimento_envios where id = v_envio) <> 'aplicado|Automático (formulário)' then
    raise exception 'status/rótulo errados após aplicar';
  end if;
  if (select combo_descricao from public.participacoes where id = e.participacao_id) <> 'Descricao de teste automatico 123.' then
    raise exception 'o envio não chegou ao cadastro';
  end if;
  if not exists (select 1 from public.alteracoes_campo where participacao_id = e.participacao_id and campo = 'combo.descricao' and em >= v_ini
                  and depois like '%teste automatico 123%') then
    raise exception 'a mudança não entrou em alteracoes_campo (Novo/Alterado)';
  end if;

  -- repetir a chamada continua de onde parou (aplicado, ainda não concluído)
  r := public.sistema_aplicar_envio(v_envio);
  if r ->> 'ja' <> 'false' then raise exception 'repetição antes de concluir devia continuar: %', r; end if;

  -- textos para a revisão
  r := public.sistema_textos_para_revisar(e.participacao_id);
  if not exists (select 1 from jsonb_array_elements(r) t where t ->> 'campo' = 'combo.descricao') then raise exception 'combo.descricao fora dos textos: %', r; end if;

  -- gravar: 1 válida; dígito mudado, tamanho absurdo e campo inexistente caem
  n := public.sistema_gravar_revisoes(e.participacao_id, jsonb_build_array(
    jsonb_build_object('campo', 'combo.descricao', 'revisado', 'Descrição de teste automático 123.'),
    jsonb_build_object('campo', 'combo.nome', 'revisado', v_nome || ' 99'),
    jsonb_build_object('campo', 'doce.nome', 'revisado', 'x'),
    jsonb_build_object('campo', 'campo.que.nao.existe', 'revisado', 'qualquer coisa')));
  if n <> 1 then raise exception 'esperava 1 revisão gravada, gravou %', n; end if;
  if (select revisado_por_rotulo from public.revisoes_texto where participacao_id = e.participacao_id and campo = 'combo.descricao') <> 'Claude (automático)' then
    raise exception 'revisão não gravada';
  end if;
  if exists (select 1 from public.revisoes_texto where participacao_id = e.participacao_id and campo = 'combo.nome' and revisado = v_nome || ' 99') then
    raise exception 'revisão com dígito alterado foi aceita';
  end if;

  -- a notificação: uma só, com o link da ficha em Participantes
  perform public.sistema_finalizar_envio(v_envio, 1, 'ok');
  perform public.sistema_finalizar_envio(v_envio, 1, 'ok');
  select count(*) into n from public.notificacoes where link = 'social/participantes/' || v_pid and criada_em >= v_ini;
  if n <> 1 then raise exception 'esperava 1 notificação, achei %', n; end if;
  if (select automatico_concluido_em from public.preenchimento_envios where id = v_envio) is null then raise exception 'não marcou concluído'; end if;
  r := public.sistema_aplicar_envio(v_envio);
  if r ->> 'ja' <> 'true' then raise exception 'depois de concluído devia parar: %', r; end if;

  -- falha: avisa uma vez, no formato antigo
  insert into public.preenchimento_envios (link_id, participacao_id, dados) values (e.link_id, e.participacao_id, e.dados) returning id into v_envio2;
  perform public.sistema_falha_envio(v_envio2, 'teste');
  perform public.sistema_falha_envio(v_envio2, 'teste');
  select count(*) into n from public.notificacoes where link = 'marcas/' || v_pid || '/gestao' and criada_em >= v_ini and titulo like '%não consegui aplicar%';
  if n <> 1 then raise exception 'esperava 1 aviso de falha, achei %', n; end if;

  -- o ciclo roda sem erro (nada tem 2 min ainda)
  perform public.preenchimento_reprocessar();

  raise exception 'TESTE_OK';
end $$;
