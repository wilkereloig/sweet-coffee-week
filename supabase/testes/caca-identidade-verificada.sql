-- Caça aos Carimbos, identidade só vale com prova do e-mail (migration 20261216; achados SEC-01, SEC-03, E2E-2 e C04).
-- Roda DEPOIS da migration, numa transação, e SEMPRE termina em exceção: TESTE_OK = passou; nada fica no banco.
do $t$
declare
  ed constant text := '2026.2';
  ca record; ka text; kv text; kb text; kp text; kp2 text; r jsonb; r2 jsonb; id_a uuid; id_v uuid; gid uuid; gid2 uuid; i int; v_erro text;
  v_slug text;
begin
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
  select distinct pa.id, 999, 'marca_e_combo', '{}'::jsonb, true
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado'
     and not exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  update public.publicacoes set nivel = 'marca_e_combo' where vigente;
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr, pa.slug_publico slug into ca
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' order by pa.id limit 1;
  if ca.participacao is null then raise exception 'falta casa com QR'; end if;

  -- ===== SEC-01: invasor cria o mapa ANTES da vítima
  ka := public.mapa_criar(ed, 'Atacante', 'vitima@exemplo.com.br', null, true, true) ->> 'chave';
  select id into id_a from public.mapas_lover where chave_hash = public.mapa_hash(ka);
  update public.mapas_lover set criado_em = now() - interval '2 days' where id = id_a;
  if public.caca_mapa_principal(ed, 'vitima@exemplo.com.br') is distinct from id_a then raise exception 'mapa único deveria ser o principal'; end if;
  kv := public.mapa_criar(ed, 'Vitima', 'vitima@exemplo.com.br', '85999990001', true, true) ->> 'chave';
  select id into id_v from public.mapas_lover where chave_hash = public.mapa_hash(kv);
  if public.caca_mapa_principal(ed, 'vitima@exemplo.com.br') is not null then raise exception 'dois mapas sem confirmação: identidade em disputa, sem principal'; end if;

  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
  values (id_v, ca.participacao, ca.unidade, ca.qr, true, now() - interval '5 hours');
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas, criado_em)
  values (ed, ca.participacao, 'Teste', 'vitima@exemplo.com.br', '{}'::jsonb, now() - interval '4 hours');
  r := public.mapa_ler_v2(ka);
  if (r ->> 'principal')::boolean or jsonb_array_length(r -> 'casas') <> 0 or (r ->> 'casas_validadas')::int <> 0
    then raise exception 'o invasor enxergou o roteiro da vítima: %', r; end if;
  if exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'vitima@exemplo.com.br') then raise exception 'identidade em disputa não entra no ranking'; end if;
  if public.caca_grupo_criar(ka, 'Grupo do invasor', true) ->> 'motivo' is distinct from 'negado' then raise exception 'invasor criou grupo em disputa'; end if;
  if public.caca_grupo_criar(kv, 'Grupo da vítima', true) ->> 'motivo' is distinct from 'negado' then raise exception 'vítima não confirmada, em disputa, criou grupo'; end if;

  -- O invasor pede o código de confirmar com a chave DELE; só a chave do mesmo e-mail vale.
  r2 := public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'confirmar', ka, null);
  if not (r2 ->> 'enviar')::boolean then raise exception 'confirmar com a chave do próprio mapa deveria emitir'; end if;
  if (public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'confirmar', null, null) ->> 'enviar')::boolean then raise exception 'confirmar sem chave emitiu'; end if;
  if (public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'confirmar', 'chave-qualquer', null) ->> 'enviar')::boolean then raise exception 'chave inválida emitiu'; end if;
  kb := public.mapa_criar(ed, 'Outra', 'outra@exemplo.com.br', null, false, true) ->> 'chave';
  if (public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'confirmar', kb, null) ->> 'enviar')::boolean then raise exception 'chave de OUTRO e-mail emitiu para a vítima'; end if;

  -- A vítima digita o código do invasor com a chave dela: não confirma o mapa errado nem o dela.
  if (public.mapa_codigo_validar(ed, 'vitima@exemplo.com.br', r2 ->> 'codigo', 'confirmar', kv) ->> 'ok')::boolean then raise exception 'código do invasor valeu para a chave da vítima'; end if;
  if (public.mapa_codigo_validar(ed, 'vitima@exemplo.com.br', r2 ->> 'codigo', 'confirmar', null) ->> 'ok')::boolean then raise exception 'confirmar sem chave valeu'; end if;
  if (select email_confirmado_em from public.mapas_lover where id in (id_a, id_v) and email_confirmado_em is not null limit 1) is not null then raise exception 'alguém foi confirmado indevidamente'; end if;

  -- A vítima pede o dela (outro mapa, limite próprio) e confirma: vira o principal; o invasor perde a visão agregada.
  r := public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'confirmar', kv, null);
  if not (r ->> 'enviar')::boolean then raise exception 'a vítima não conseguiu pedir o código (o invasor esgotou o limite dela?): %', r; end if;
  r := public.mapa_codigo_validar(ed, 'vitima@exemplo.com.br', r ->> 'codigo', 'confirmar', kv);
  if not (r ->> 'ok')::boolean then raise exception 'a vítima não confirmou: %', r; end if;
  if public.caca_mapa_principal(ed, 'vitima@exemplo.com.br') is distinct from id_v then raise exception 'principal deveria ser o mapa confirmado da vítima'; end if;
  update public.mapas_lover set email_confirmado_em = now() - interval '1 hour' where id = id_v;   -- now() é fixo na transação: separa os instantes
  r := public.mapa_ler_v2(kv);
  if not (r ->> 'principal')::boolean or (r ->> 'casas_validadas')::int <> 1 then raise exception 'vítima confirmada: %', r; end if;
  if (public.mapa_ler_v2(ka) ->> 'principal')::boolean or jsonb_array_length(public.mapa_ler_v2(ka) -> 'casas') <> 0 then raise exception 'invasor ainda vê o roteiro'; end if;
  if not exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'vitima@exemplo.com.br' and p.apelido = 'Vitima' and p.mapa_id = id_v and p.casas = 1)
    then raise exception 'o ranking deveria mostrar o apelido da vítima'; end if;
  if not public.caca_premio_email_ok(ed, 'vitima@exemplo.com.br') then raise exception 'e-mail confirmado'; end if;
  -- O invasor ainda pode pedir novo código para o mapa dele, mas confirmar nele não o torna principal (o confirmado mais antigo é a vítima).
  r := public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'confirmar', ka, null);
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  r := public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'confirmar', ka, null);
  r := public.mapa_codigo_validar(ed, 'vitima@exemplo.com.br', r ->> 'codigo', 'confirmar', ka);
  if public.caca_mapa_principal(ed, 'vitima@exemplo.com.br') is distinct from id_v then raise exception 'o principal mudou de mãos'; end if;

  -- ===== SEC-03: pedir de novo não derruba o código que já chegou; limite por mapa; limite por IP; teto por finalidade
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  r := public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'recuperar', null, null);
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  r2 := public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'recuperar', null, null);
  if r ->> 'codigo' = r2 ->> 'codigo' then raise exception 'códigos iguais'; end if;
  r := public.mapa_codigo_validar(ed, 'vitima@exemplo.com.br', r ->> 'codigo', 'recuperar', null);
  if not (r ->> 'ok')::boolean then raise exception 'o código anterior ainda aberto deveria valer: %', r; end if;
  if public.mapa_ler_v2(r ->> 'chave') is null or public.mapa_ler_v2(kv) is not null then raise exception 'chave do principal deveria girar'; end if;
  kv := r ->> 'chave';
  -- 3 tentativas erradas queimam só os códigos abertos; o certo seguinte (já queimado) não vale mais depois de 5.
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  r2 := public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'recuperar', null, null);
  for i in 1..5 loop perform public.mapa_codigo_validar(ed, 'vitima@exemplo.com.br', '000000', 'recuperar', null); end loop;
  if (public.mapa_codigo_validar(ed, 'vitima@exemplo.com.br', r2 ->> 'codigo', 'recuperar', null) ->> 'ok')::boolean then raise exception 'código valeu depois de 5 erros'; end if;

  -- limite por mapa em 'confirmar' (1/min): segundo pedido seguido do MESMO mapa é limitado, mas outro mapa do e-mail não é afetado
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  r := public.mapa_codigo_emitir_interno(ed, 'outra@exemplo.com.br', 'confirmar', kb, null);
  r2 := public.mapa_codigo_emitir_interno(ed, 'outra@exemplo.com.br', 'confirmar', kb, null);
  if not (r ->> 'enviar')::boolean or coalesce((r2 ->> 'limitado')::boolean, false) is not true then raise exception 'limite por mapa: % %', r, r2; end if;

  -- limite por IP (hash): 40 pedidos em 10 min por IP, outro IP segue livre; IP nunca em claro
  for i in 1..40 loop perform public.mapa_codigo_emitir_interno(ed, 'nx' || i || '@exemplo.com.br', 'recuperar', null, '203.0.113.7'); end loop;
  if coalesce((public.mapa_codigo_emitir_interno(ed, 'nx41@exemplo.com.br', 'recuperar', null, '203.0.113.7') ->> 'limitado')::boolean, false) is not true then raise exception 'IP não limitado'; end if;
  if (public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'recuperar', null, '203.0.113.8') ->> 'limitado') is not null then raise exception 'outro IP bloqueado'; end if;
  if exists (select 1 from public.mapa_criar_ip where ip_hash like '%203.0.113%') then raise exception 'IP em claro'; end if;

  -- teto por finalidade: 600 códigos de 'recuperar' na hora não impedem 'confirmar'
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  insert into public.mapa_codigo (mapa_id, finalidade, codigo_hash, expira_em)
  select id_v, 'recuperar', 'x', now() - interval '1 minute' from generate_series(1, 600);
  r := public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'recuperar', null, null);
  if (r ->> 'enviar')::boolean or r ->> 'teto' is distinct from 'true' then raise exception 'teto de recuperar: %', r; end if;
  r := public.mapa_codigo_emitir_interno(ed, 'outra@exemplo.com.br', 'confirmar', kb, null);
  if not (r ->> 'enviar')::boolean then raise exception 'o teto de recuperar bloqueou confirmar: %', r; end if;

  -- ===== E2E-2: apagar o mapa não deixa e-mail nem apelido em grupos
  kp := public.mapa_criar(ed, 'Pessoa P', 'p@exemplo.com.br', null, false, true) ->> 'chave';
  kp2 := public.mapa_criar(ed, 'Pessoa Q', 'q@exemplo.com.br', null, false, true) ->> 'chave';
  r := public.caca_grupo_criar(kp, 'Grupo de P', true);
  if not (r ->> 'ok')::boolean then raise exception 'P não criou grupo: %', r; end if;
  gid := (r ->> 'grupo_id')::uuid;
  r2 := public.caca_grupo_entrar(kp2, r ->> 'convite_token', true);
  if not (r2 ->> 'ok')::boolean then raise exception 'Q não entrou: %', r2; end if;
  r := public.caca_grupo_rota_op(kp, gid, 'adicionar', ca.slug, null, null);
  if not (r ->> 'ok')::boolean then raise exception 'rota: %', r; end if;
  r := public.caca_grupo_criar(kp, 'Grupo solo de P', true);
  gid2 := (r ->> 'grupo_id')::uuid;
  if not public.mapa_apagar(kp) then raise exception 'mapa_apagar devolveu false'; end if;
  if exists (select 1 from public.caca_grupo_membro where pessoa = 'p@exemplo.com.br')
     or exists (select 1 from public.caca_grupo_convite where criado_por = 'p@exemplo.com.br')
     or exists (select 1 from public.caca_grupo_rota where adicionado_por_pessoa = 'p@exemplo.com.br')
     or exists (select 1 from public.mapas_lover where email_norm = 'p@exemplo.com.br')
    then raise exception 'sobrou dado pessoal de P'; end if;
  if exists (select 1 from public.caca_grupo where id = gid2) then raise exception 'grupo só dele deveria sumir'; end if;
  if not exists (select 1 from public.caca_grupo_membro where grupo_id = gid and pessoa = 'q@exemplo.com.br' and papel = 'dono' and saiu_em is null)
    then raise exception 'a posse deveria passar a Q'; end if;
  if not exists (select 1 from public.caca_grupo_rota where grupo_id = gid and adicionado_por_pessoa = 'removido') then raise exception 'rota do grupo deveria ficar, anônima'; end if;
  if public.mapa_apagar('chave-inexistente') then raise exception 'apagou chave inexistente'; end if;
  -- pessoa com DOIS mapas: só segue no grupo se o outro mapa estiver CONFIRMADO (20261220; o outro, não confirmado, poderia ser de um invasor)
  kp := public.mapa_criar(ed, 'Dois A', 'dois@exemplo.com.br', null, false, true) ->> 'chave';
  r := public.caca_grupo_criar(kp, 'Grupo de dois', true);
  gid2 := (r ->> 'grupo_id')::uuid;
  kp2 := public.mapa_criar(ed, 'Dois B', 'dois@exemplo.com.br', null, false, true) ->> 'chave';
  update public.mapas_lover set email_confirmado_em = now() - interval '1 hour' where chave_hash = public.mapa_hash(kp2);
  perform public.mapa_apagar(kp);
  if not exists (select 1 from public.caca_grupo_membro where grupo_id = gid2 and pessoa = 'dois@exemplo.com.br') then raise exception 'com outro mapa confirmado a pessoa fica no grupo'; end if;

  -- ===== C04: o placar por pontos não é mais API pública
  if has_function_privilege('anon', 'public.ranking_mapa(text)', 'execute') or has_function_privilege('anon', 'public.mapa_ler(text)', 'execute')
     or has_function_privilege('authenticated', 'public.ranking_mapa(text)', 'execute') then raise exception 'RPC de pontos ainda aberta'; end if;
  begin
    set local role anon; perform public.ranking_mapa(ed); v_erro := 'chamou';
  exception when insufficient_privilege then v_erro := 'negado'; when others then v_erro := sqlerrm; end;
  reset role;
  if v_erro <> 'negado' then raise exception 'anon chamou ranking_mapa: %', v_erro; end if;
  if not has_function_privilege('anon', 'public.mapa_codigo_validar(text,text,text,text,text)', 'execute') then raise exception 'validar sem grant'; end if;
  if has_function_privilege('anon', 'public.mapa_codigo_emitir_interno(text,text,text,text,text)', 'execute') then raise exception 'emitir aberta'; end if;

  raise exception 'TESTE_OK';
end $t$;
