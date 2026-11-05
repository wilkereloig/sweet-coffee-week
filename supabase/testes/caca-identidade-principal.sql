-- Caça aos Carimbos, mapa principal e limites (migration 20261210; achados CACA-SEC-01, SEC-02 e SEC-06). Roda DEPOIS da migration,
-- numa transação, e SEMPRE termina em exceção: TESTE_OK = passou; nada fica no banco. Sem GPS e sem sorteio.
do $t$
declare
  ed constant text := '2026.2';
  ca record; kv1 text; kv2 text; ks text; ko text; ch_new text;
  id_v1 uuid; id_v2 uuid; r jsonb; cod text; i int; v_erro text; gid uuid; tok text;
begin
  -- Casas publicadas (só na transação) para o placar ter total e elegibilidade.
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
  select distinct pa.id, 999, 'marca_e_combo', '{}'::jsonb, true
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado'
     and not exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  update public.publicacoes set nivel = 'marca_e_combo' where vigente;
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr into ca
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' order by pa.id limit 1;
  if ca.participacao is null then raise exception 'falta casa com QR'; end if;

  -- 1. Vítima V (mapa mais antigo, e-mail confirmado) e invasor com o MESMO e-mail (mapa novo).
  kv1 := public.mapa_criar(ed, 'Vitima', 'vitima@exemplo.com.br', '85999990001', true, true) ->> 'chave';
  select id into id_v1 from public.mapas_lover where chave_hash = public.mapa_hash(kv1);
  update public.mapas_lover set criado_em = now() - interval '3 days' where id = id_v1;
  r := public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'confirmar', kv1);
  r := public.mapa_codigo_validar(ed, 'vitima@exemplo.com.br', r ->> 'codigo', 'confirmar', kv1);
  if not (r ->> 'ok')::boolean then raise exception 'V não confirmou: %', r; end if;
  kv2 := public.mapa_criar(ed, 'Atacante', 'vitima@exemplo.com.br', '85988880002', false, true) ->> 'chave';
  select id into id_v2 from public.mapas_lover where chave_hash = public.mapa_hash(kv2);

  if public.caca_mapa_principal(ed, 'Vitima@Exemplo.com.br') is distinct from id_v1 then raise exception 'principal deveria ser o mapa confirmado/antigo'; end if;
  if (select email_confirmado_em from public.mapas_lover where id = id_v2) is not null then raise exception 'atacante nasceu confirmado'; end if;
  if (public.mapa_confirmar_email_status(kv2) ->> 'principal')::boolean or not (public.mapa_confirmar_email_status(kv1) ->> 'principal')::boolean
    then raise exception 'flag principal'; end if;
  if not public.caca_premio_email_ok(ed, 'vitima@exemplo.com.br') then raise exception 'premio_email_ok deveria valer pelo principal confirmado'; end if;

  -- 2. Perfil do ranking e contato do prêmio vêm do principal; o mapa do invasor não vaza progresso nem aparece.
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
  values (id_v1, ca.participacao, ca.unidade, ca.qr, true, now() - interval '5 hours');
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas, criado_em)
  values (ed, ca.participacao, 'Teste', 'vitima@exemplo.com.br', '{}'::jsonb, now() - interval '4 hours');
  if not exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'vitima@exemplo.com.br' and p.apelido = 'Vitima'
                   and p.mapa_id = id_v1 and p.whatsapp = '85999990001' and p.no_ranking and p.casas = 1)
    then raise exception 'perfil/contato do placar deveriam ser do principal: %', (select to_jsonb(p) from public.caca_placar_v2(ed) p where p.pessoa = 'vitima@exemplo.com.br'); end if;
  r := public.mapa_ler_v2(kv1);
  if not (r ->> 'principal')::boolean or (r ->> 'casas_validadas')::int <> 1 or jsonb_array_length(r -> 'casas') <> 1 then raise exception 'mapa_ler_v2 do principal: %', r; end if;
  r := public.mapa_ler_v2(kv2);
  if (r ->> 'principal')::boolean or (r ->> 'casas_validadas')::int <> 0 or jsonb_array_length(r -> 'casas') <> 0 or r -> 'posicao' <> 'null'::jsonb
    then raise exception 'mapa secundário leu o progresso da pessoa: %', r; end if;
  if (public.caca_metas_ler(kv2) ->> 'casas_validadas')::int <> 0 or (public.caca_metas_ler(kv1) ->> 'casas_validadas')::int <> 1 then raise exception 'metas'; end if;

  -- 3. Grupos: o principal cria; o secundário recebe 'negado' em tudo.
  r := public.caca_grupo_criar(kv1, 'Grupo V', true);
  if not (r ->> 'ok')::boolean then raise exception 'V não criou grupo: %', r; end if;
  gid := (r ->> 'grupo_id')::uuid; tok := r ->> 'convite_token';
  if public.caca_grupo_ler(kv2, gid) ->> 'motivo' is distinct from 'negado' then raise exception 'secundário leu o grupo'; end if;
  if public.caca_grupo_convite_revogar(kv2, gid) ->> 'motivo' is distinct from 'negado' then raise exception 'secundário revogou convite'; end if;
  if public.caca_grupo_convite_novo(kv2, gid) ->> 'motivo' is distinct from 'negado' then raise exception 'secundário gerou convite'; end if;
  if public.caca_grupo_listar(kv2) ->> 'motivo' is distinct from 'negado' then raise exception 'secundário listou grupos'; end if;
  if public.caca_grupo_criar(kv2, 'Grupo X', true) ->> 'motivo' is distinct from 'negado' then raise exception 'secundário criou grupo'; end if;
  if public.caca_grupo_entrar(kv2, tok, true) ->> 'motivo' is distinct from 'negado' then raise exception 'secundário entrou'; end if;
  if public.caca_grupo_sair(kv2, gid) ->> 'motivo' is distinct from 'negado' then raise exception 'secundário saiu'; end if;
  if public.caca_grupo_rota_adicionar(kv2, gid, 'qualquer') ->> 'motivo' is distinct from 'negado' then raise exception 'secundário mexeu na rota'; end if;
  r := public.caca_grupo_ler(kv1, gid);
  if not (r ->> 'ok')::boolean or r -> 'membros' -> 0 ->> 'apelido' <> 'Vitima' then raise exception 'principal lê o grupo com o próprio apelido: %', r; end if;
  if (public.caca_grupo_convite_revogar(kv1, gid) ->> 'revogados')::int <> 1 then raise exception 'dono não revogou'; end if;

  -- 4. Recuperar vai para o principal (apelido da vítima, não do invasor); a chave do principal muda, a do secundário não.
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  r := public.mapa_codigo_emitir_interno(ed, 'vitima@exemplo.com.br', 'recuperar');
  if r ->> 'apelido' <> 'Vitima' then raise exception 'recuperar mirou o mapa errado: %', r; end if;
  r := public.mapa_codigo_validar(ed, 'vitima@exemplo.com.br', r ->> 'codigo', 'recuperar');
  ch_new := r ->> 'chave';
  if ch_new is null or public.mapa_ler_v2(kv1) is not null or public.mapa_ler_v2(ch_new) is null or public.mapa_ler_v2(kv2) is null
    then raise exception 'chaves após recuperar'; end if;
  if (select email_confirmado_em from public.mapas_lover where id = id_v2) is not null then raise exception 'recuperar confirmou o mapa do invasor'; end if;

  -- 5. Invasor que se cadastrou ANTES do dono: o dono do e-mail retoma o principal pela recuperação.
  ks := public.mapa_criar(ed, 'Invasor', 'dono@exemplo.com.br', null, true, true) ->> 'chave';
  update public.mapas_lover set criado_em = now() - interval '1 day' where chave_hash = public.mapa_hash(ks);
  ko := public.mapa_criar(ed, 'Dono', 'dono@exemplo.com.br', null, true, true) ->> 'chave';
  r := public.mapa_codigo_emitir_interno(ed, 'dono@exemplo.com.br', 'recuperar');
  r := public.mapa_codigo_validar(ed, 'dono@exemplo.com.br', r ->> 'codigo', 'recuperar');
  if not (r ->> 'ok')::boolean or public.mapa_ler_v2(ks) is not null then raise exception 'a chave do invasor deveria morrer na recuperação'; end if;
  if not (public.mapa_ler_v2(r ->> 'chave') ->> 'principal')::boolean then raise exception 'o mapa recuperado é o principal'; end if;

  -- 6. SEC-02: mapa_criar (v1) não é mais chamável por anon/authenticated.
  if has_function_privilege('anon', 'public.mapa_criar(text,text,text,text,boolean,boolean)', 'execute')
     or has_function_privilege('authenticated', 'public.mapa_criar(text,text,text,text,boolean,boolean)', 'execute')
    then raise exception 'mapa_criar v1 ainda aberta'; end if;
  begin
    set local role anon;
    perform public.mapa_criar(ed, 'Burla', 'burla@exemplo.com.br', null, false, true);
    v_erro := 'chamou';
  exception when insufficient_privilege then v_erro := 'negado'; when others then v_erro := sqlerrm; end;
  reset role;
  if v_erro <> 'negado' then raise exception 'anon chamou mapa_criar v1: %', v_erro; end if;
  perform set_config('request.headers', '', true);

  -- 7. SEC-06: sem teto global. 305 mapas de e-mails diferentes em 10 min passam; 505 pedidos de código para e-mails sem mapa
  --    não impedem o pedido de quem tem mapa.
  for i in 1..305 loop perform public.mapa_criar(ed, 'Massa' || i, 'massa' || i || '@exemplo.com.br', null, false, true); end loop;
  update public.mapa_codigo_pedido set criado_em = now() - interval '2 hours';
  for i in 1..505 loop perform public.mapa_codigo_emitir_interno(ed, 'nx' || i || '@exemplo.com.br', 'confirmar'); end loop;
  ko := public.mapa_criar(ed, 'Massa7b', 'massa7b@exemplo.com.br', null, false, true) ->> 'chave';
  r := public.mapa_codigo_emitir_interno(ed, 'massa7b@exemplo.com.br', 'confirmar', ko);
  if not (r ->> 'enviar')::boolean or r ? 'limitado' then raise exception 'teto global bloqueou um usuário legítimo: %', r; end if;

  -- 8. Limite por IP (quando o cabeçalho chega): 60 mapas em 10 min por IP; outro IP segue livre.
  perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.9"}', true);
  for i in 1..60 loop perform public.mapa_criar(ed, 'Ip' || i, 'ip' || i || '@exemplo.com.br', null, false, true); end loop;
  begin perform public.mapa_criar(ed, 'Ip61', 'ip61@exemplo.com.br', null, false, true); v_erro := null;
  exception when others then v_erro := sqlerrm; end;
  if v_erro is distinct from 'muitos_pedidos' then raise exception '61º mapa do mesmo IP deveria ser barrado: %', v_erro; end if;
  perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.10"}', true);
  perform public.mapa_criar(ed, 'OutroIp', 'outroip@exemplo.com.br', null, false, true);
  if exists (select 1 from public.mapa_criar_ip where ip_hash like '%203.0.113%') then raise exception 'IP em claro'; end if;
  if has_table_privilege('anon', 'public.mapa_criar_ip', 'select') then raise exception 'mapa_criar_ip aberta'; end if;
  perform set_config('request.headers', '', true);

  raise exception 'TESTE_OK';
end $t$;
