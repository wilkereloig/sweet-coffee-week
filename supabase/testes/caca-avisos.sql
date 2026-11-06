-- Caça aos Carimbos: central de avisos, comunicados da organização, limites e automáticos (migration 20261230).
-- Roda DEPOIS da migration, na mesma transação, e sempre termina em exceção: TESTE_OK = passou; nada fica no banco e nada é enviado.
-- Troca public.pode só dentro da transação.
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select p_secret = 'x' $f$;

do $t$
declare
  ed constant text := '2026.2';
  ca record; cb record; ch1 text; ch2 text; id1 uuid; id2 uuid; r jsonb; v_id uuid; v_id2 uuid; n int; g uuid; c record; ok boolean;
begin
  update public.caca_config set valor = '"conta"'::jsonb where chave = 'carimbo_sem_ponto';
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr into ca
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' order by pa.id limit 1;
  if ca.participacao is null then raise exception 'falta 1 casa com QR'; end if;
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
    select ca.participacao, 999, 'marca_e_combo', '{}'::jsonb, true
     where not exists (select 1 from public.publicacoes pb where pb.participacao_id = ca.participacao and pb.vigente);
  update public.publicacoes set nivel = 'marca_e_combo' where vigente;
  update public.unidades set coordenada_verificada_em = null where id in (select unidade_id from public.participacao_unidades where id = ca.unidade);

  ch1 := public.mapa_criar(ed, 'A1', 'a1@exemplo.com.br', null, true, true) ->> 'chave';
  ch2 := public.mapa_criar(ed, 'B2', 'b2@exemplo.com.br', null, true, true) ->> 'chave';
  select id into id1 from public.mapas_lover where chave_hash = public.mapa_hash(ch1);
  select id into id2 from public.mapas_lover where chave_hash = public.mapa_hash(ch2);

  -- 1. Permissão no servidor
  begin perform public.caca_aviso_criar('errada', '{"categoria":"edicao","titulo":"a","corpo":"b"}'::jsonb); raise exception 'deveria negar';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  begin perform public.caca_aviso_enviar('errada', gen_random_uuid()); raise exception 'deveria negar';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  begin perform public.caca_avisos_auto_definir('errada', true); raise exception 'deveria negar';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;

  -- 2. Validações do conteúdo (sem dado pessoal, destino interno, categoria manual, vigência)
  begin perform public.caca_aviso_criar('x', '{"categoria":"meta","titulo":"a","corpo":"b"}'::jsonb); raise exception 'meta e manual?';
  exception when others then if sqlerrm <> 'categoria_invalida' then raise; end if; end;
  begin perform public.caca_aviso_criar('x', '{"categoria":"edicao","titulo":"Oi","corpo":"fale com fulano@exemplo.com"}'::jsonb); raise exception 'e-mail no texto?';
  exception when others then if sqlerrm <> 'conteudo_com_dado_pessoal' then raise; end if; end;
  begin perform public.caca_aviso_criar('x', '{"categoria":"edicao","titulo":"Oi","corpo":"ligue 84 99999-1234"}'::jsonb); raise exception 'telefone no texto?';
  exception when others then if sqlerrm <> 'conteudo_com_dado_pessoal' then raise; end if; end;
  begin perform public.caca_aviso_criar('x', '{"categoria":"edicao","titulo":"Oi","corpo":"b","destino":"https://x.com"}'::jsonb); raise exception 'destino externo?';
  exception when others then if sqlerrm <> 'destino_invalido' then raise; end if; end;
  begin perform public.caca_aviso_criar('x', '{"categoria":"edicao","titulo":"Oi","corpo":"b","destino":"/painel"}'::jsonb); raise exception 'destino fora da Caça?';
  exception when others then if sqlerrm <> 'destino_invalido' then raise; end if; end;
  begin perform public.caca_aviso_criar('x', '{"categoria":"edicao","titulo":"Oi","corpo":"b","vigente_ate":"2020-01-01T00:00:00Z"}'::jsonb); raise exception 'vigência passada?';
  exception when others then if sqlerrm <> 'vigencia_passada' then raise; end if; end;
  -- imprevisto: só para quem tem a casa na rota, com casa e dia
  begin perform public.caca_aviso_criar('x', '{"categoria":"imprevisto","titulo":"Fechada","corpo":"b","publico":{"tipo":"todos"}}'::jsonb); raise exception 'imprevisto para todos?';
  exception when others then if sqlerrm <> 'imprevisto_so_para_quem_tem_a_casa' then raise; end if; end;
  begin perform public.caca_aviso_criar('x', '{"categoria":"imprevisto","titulo":"Fechada","corpo":"b","publico":{"tipo":"casa_na_rota"}}'::jsonb); raise exception 'sem casa?';
  exception when others then if sqlerrm <> 'imprevisto_sem_casa_ou_dia' then raise; end if; end;

  -- 3. Comunicado geral: rascunho -> estimar -> enviar (idempotente) -> central -> visto
  r := public.caca_aviso_criar('x', '{"categoria":"edicao","titulo":"Aviso geral","corpo":"A rota de hoje abre às 10h.","publico":{"tipo":"todos"}}'::jsonb);
  v_id := (r ->> 'id')::uuid;
  if r ->> 'estado' <> 'rascunho' then raise exception 'estado inicial: %', r; end if;
  r := public.caca_aviso_estimar('x', v_id);
  if (r ->> 'mapas')::int < 2 then raise exception 'estimativa: %', r; end if;
  if (select count(*) from public.caca_aviso_entrega where aviso_id = v_id) <> 0 then raise exception 'rascunho não pode ter entrega'; end if;
  if (public.caca_avisos_ler(ch1) -> 'avisos') <> '[]'::jsonb then raise exception 'rascunho vazou para a central'; end if;
  r := public.caca_aviso_enviar('x', v_id);
  n := (r ->> 'alvos')::int;
  if n < 2 then raise exception 'alvos: %', r; end if;
  begin perform public.caca_aviso_enviar('x', v_id); raise exception 'reenvio?';
  exception when others then if sqlerrm <> 'aviso_ja_enviado' then raise; end if; end;
  if (select count(*) from public.caca_aviso_entrega where aviso_id = v_id) <> n then raise exception 'entregas duplicadas'; end if;
  r := public.caca_avisos_ler(ch1);
  if (r ->> 'novos')::int <> 1 or jsonb_array_length(r -> 'avisos') <> 1 then raise exception 'central do mapa 1: %', r; end if;
  if (r -> 'avisos' -> 0 ->> 'visto')::boolean then raise exception 'nasce como visto'; end if;
  if r::text ~* '(a1@exemplo|b2@exemplo|chave_hash|mapa_id)' then raise exception 'central vazou dado pessoal: %', r; end if;
  perform public.caca_avisos_visto(ch1, array[v_id]);
  r := public.caca_avisos_ler(ch1);
  if (r ->> 'novos')::int <> 0 or not (r -> 'avisos' -> 0 ->> 'visto')::boolean then raise exception 'visto não gravou: %', r; end if;
  if (public.caca_avisos_ler(ch2) ->> 'novos')::int <> 1 then raise exception 'visto do mapa 1 mexeu no mapa 2'; end if;
  if public.caca_avisos_ler('chave-inexistente') is not null then raise exception 'chave falsa leu aviso'; end if;
  if (public.caca_avisos_visto('chave-inexistente', array[v_id]) ->> 'ok')::boolean then raise exception 'chave falsa marcou visto'; end if;

  -- 4. Cancelar só antes do envio
  r := public.caca_aviso_criar('x', '{"categoria":"voucher","titulo":"Voucher de hoje","corpo":"Tem voucher em disputa hoje.","enviar_em":"2999-01-01T12:00:00Z"}'::jsonb);
  v_id2 := (r ->> 'id')::uuid;
  if r ->> 'estado' <> 'agendado' then raise exception 'agendado: %', r; end if;
  perform public.caca_aviso_cancelar('x', v_id2);
  if (select estado from public.caca_aviso where id = v_id2) <> 'cancelado' then raise exception 'não cancelou'; end if;
  begin perform public.caca_aviso_enviar('x', v_id2); raise exception 'enviou cancelado?';
  exception when others then if sqlerrm <> 'aviso_ja_cancelado' then raise; end if; end;
  begin perform public.caca_aviso_cancelar('x', v_id); raise exception 'cancelou enviado?';
  exception when others then if sqlerrm <> 'so_antes_do_envio' then raise; end if; end;

  -- 5. Imprevisto: vai só para membros ativos de grupo com a casa na rota (privacidade: não-integrante não recebe)
  insert into public.caca_grupo (edicao_codigo, nome, criado_por_mapa) values (ed, 'Grupo teste', id1) returning id into g;
  insert into public.caca_grupo_membro (grupo_id, pessoa, mapa_id, apelido_snapshot, papel, aceite_visibilidade_em) values (g, 'a1@exemplo.com.br', id1, 'A1', 'dono', now());
  insert into public.caca_grupo_rota (grupo_id, participacao_id, posicao, adicionado_por_pessoa) values (g, ca.participacao, 1, 'a1@exemplo.com.br');
  r := public.caca_aviso_criar('x', jsonb_build_object('categoria','imprevisto','titulo','Casa fechada hoje','corpo','Confirmado pela organização: não abre hoje.',
         'publico', jsonb_build_object('tipo','casa_na_rota'), 'participacao_id', ca.participacao, 'dia', (now() at time zone 'America/Fortaleza')::date));
  v_id := (r ->> 'id')::uuid;
  if not (select urgente from public.caca_aviso where id = v_id) then raise exception 'imprevisto deve ser urgente'; end if;
  r := public.caca_aviso_estimar('x', v_id);
  if (r ->> 'mapas')::int <> 1 then raise exception 'imprevisto: só o integrante (mapa 1): %', r; end if;
  perform public.caca_aviso_enviar('x', v_id);
  if (public.caca_avisos_ler(ch1) ->> 'novos')::int <> 1 then raise exception 'integrante não recebeu o imprevisto'; end if;
  if (public.caca_avisos_ler(ch2) ->> 'novos')::int <> 0 and (select count(*) from public.caca_aviso_entrega where aviso_id = v_id and mapa_id = id2) <> 0 then
    raise exception 'não integrante recebeu aviso do grupo'; end if;
  if exists (select 1 from public.caca_aviso_entrega where aviso_id = v_id and mapa_id = id2) then raise exception 'não integrante tem entrega'; end if;
  -- saiu do grupo: não recebe mais
  update public.caca_grupo_membro set saiu_em = now() where grupo_id = g and mapa_id = id1;
  r := public.caca_aviso_criar('x', jsonb_build_object('categoria','imprevisto','titulo','Outro','corpo','Confirmado.','publico', jsonb_build_object('tipo','casa_na_rota'),
         'participacao_id', ca.participacao, 'dia', (now() at time zone 'America/Fortaleza')::date));
  if (public.caca_aviso_estimar('x', (r ->> 'id')::uuid) ->> 'mapas')::int <> 0 then raise exception 'quem saiu do grupo ainda entra no público'; end if;

  -- 6. Limites e janela do push (sem enviar nada: só a decisão). Mapa 2 ganha um aparelho fictício.
  insert into public.caca_push (mapa_id, endpoint_hash, endpoint, p256dh, auth_chave, prefs)
    values (id2, 'h-teste', 'https://fcm.googleapis.com/fcm/send/teste', repeat('A', 87), repeat('B', 22),
            '{"avaliacao_pendente":true,"meta":true,"grupo":true,"edicao":true,"voucher":false,"imprevisto":true}');
  -- preferência desligada: voucher
  r := public.caca_aviso_criar('x', '{"categoria":"voucher","titulo":"Voucher","corpo":"Hoje tem voucher em disputa.","publico":{"tipo":"mapas","ids":[]}}'::jsonb);
  v_id := (r ->> 'id')::uuid;
  update public.caca_aviso set publico = jsonb_build_object('tipo','mapas','ids', jsonb_build_array(id1, id2)) where id = v_id;
  perform public.caca_aviso_enviar('x', v_id);
  n := (select count(*) from public.caca_aviso_entregas_pendentes(v_id));
  if n <> 0 then raise exception 'voucher desligado não pode ter pendência de push: %', n; end if;
  if (select push_estado from public.caca_aviso_entrega where aviso_id = v_id and mapa_id = id2) <> 'preferencia' then raise exception 'esperava preferencia'; end if;
  if (select push_estado from public.caca_aviso_entrega where aviso_id = v_id and mapa_id = id1) <> 'sem_aparelho' then raise exception 'esperava sem_aparelho'; end if;

  -- janela e teto: comunicado "edicao" ligado no mapa 2
  update public.caca_config set valor = '{"lembretes_dia":2,"por_categoria_dia":1,"janela_de":0,"janela_ate":24}' where chave = 'avisos_limites';
  r := public.caca_aviso_criar('x', '{"categoria":"edicao","titulo":"E1","corpo":"Um.","publico":{"tipo":"mapas","ids":[]}}'::jsonb);
  v_id := (r ->> 'id')::uuid;
  update public.caca_aviso set publico = jsonb_build_object('tipo','mapas','ids', jsonb_build_array(id2)) where id = v_id;
  perform public.caca_aviso_enviar('x', v_id);
  if (select count(*) from public.caca_aviso_entregas_pendentes(v_id)) <> 1 then raise exception 'dentro da janela deveria liberar 1 aparelho'; end if;
  perform public.caca_aviso_entrega_marcar('enviado', v_id, array[id2]);
  -- segundo da mesma categoria no mesmo dia: bloqueado pelo teto por categoria
  r := public.caca_aviso_criar('x', '{"categoria":"edicao","titulo":"E2","corpo":"Dois.","publico":{"tipo":"mapas","ids":[]}}'::jsonb);
  v_id2 := (r ->> 'id')::uuid;
  update public.caca_aviso set publico = jsonb_build_object('tipo','mapas','ids', jsonb_build_array(id2)) where id = v_id2;
  perform public.caca_aviso_enviar('x', v_id2);
  if (select count(*) from public.caca_aviso_entregas_pendentes(v_id2)) <> 0 then raise exception 'teto por categoria não segurou'; end if;
  if (select push_estado from public.caca_aviso_entrega where aviso_id = v_id2 and mapa_id = id2) <> 'limite' then raise exception 'esperava limite'; end if;
  -- fora da janela (janela vazia): adiado, continua pendente; reprocessar não duplica
  update public.caca_config set valor = '{"lembretes_dia":2,"por_categoria_dia":1,"janela_de":0,"janela_ate":0}' where chave = 'avisos_limites';
  r := public.caca_aviso_criar('x', '{"categoria":"edicao","titulo":"E3","corpo":"Tres.","publico":{"tipo":"mapas","ids":[]}}'::jsonb);
  v_id := (r ->> 'id')::uuid;
  update public.caca_aviso set publico = jsonb_build_object('tipo','mapas','ids', jsonb_build_array(id2)) where id = v_id;
  perform public.caca_aviso_enviar('x', v_id);
  if (select count(*) from public.caca_aviso_entregas_pendentes(v_id)) <> 0 then raise exception 'fora da janela não pode enviar'; end if;
  if (select push_estado from public.caca_aviso_entrega where aviso_id = v_id and mapa_id = id2) <> 'adiado' then raise exception 'esperava adiado'; end if;
  -- urgente ignora a janela
  r := public.caca_aviso_criar('x', jsonb_build_object('categoria','imprevisto','titulo','Urgente','corpo','Confirmado.','publico', jsonb_build_object('tipo','casa_na_rota'),
         'participacao_id', ca.participacao, 'dia', (now() at time zone 'America/Fortaleza')::date));
  v_id2 := (r ->> 'id')::uuid;
  update public.caca_grupo_membro set saiu_em = null where grupo_id = g and mapa_id = id1;
  insert into public.caca_grupo_membro (grupo_id, pessoa, mapa_id, apelido_snapshot, papel, aceite_visibilidade_em) values (g, 'b2@exemplo.com.br', id2, 'B2', 'membro', now());
  perform public.caca_aviso_enviar('x', v_id2);
  if (select count(*) from public.caca_aviso_entregas_pendentes(v_id2)) <> 1 then raise exception 'urgente deveria ignorar a janela'; end if;

  -- 7. Automáticos: desligados por padrão; ligados geram uma vez só (idempotente) e respeitam o fato
  if (public.caca_avisos_gerar_automaticos() ->> 'ligado')::boolean then raise exception 'automático deveria nascer desligado'; end if;
  perform public.caca_avisos_auto_definir('x', true);
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
    values (id1, ca.participacao, ca.unidade, ca.qr, true, now() - interval '30 hours');
  r := public.caca_avisos_gerar_automaticos();
  if (r ->> 'pendentes')::int < 1 then raise exception 'avaliação pendente não gerou: %', r; end if;
  n := (r ->> 'pendentes')::int;
  r := public.caca_avisos_gerar_automaticos();
  if (r ->> 'pendentes')::int <> 0 or (r ->> 'metas')::int <> 0 then raise exception 'segunda rodada duplicou: %', r; end if;
  -- avaliou: não gera mais lembrete obsoleto
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas) values (ed, ca.participacao, 'Teste', 'a1@exemplo.com.br', '{}'::jsonb);
  delete from public.caca_aviso where chave_dedupe like 'pendente:' || id1 || ':%';
  r := public.caca_avisos_gerar_automaticos();
  if exists (select 1 from public.caca_aviso where chave_dedupe like 'pendente:' || id1 || ':%') then raise exception 'lembrete obsoleto para avaliação já feita'; end if;

  -- 8. Privacidade das tabelas: sem grant para anon/authenticated
  for c in select unnest(array['caca_aviso','caca_aviso_entrega']) t loop
    if has_table_privilege('anon', 'public.' || c.t, 'select') or has_table_privilege('authenticated', 'public.' || c.t, 'select') then raise exception 'tabela % legível', c.t; end if;
  end loop;
  if has_function_privilege('anon', 'public.caca_aviso_entregas_pendentes(uuid,int)', 'execute') or has_function_privilege('anon', 'public.caca_avisos_gerar_automaticos(timestamptz)', 'execute')
     or has_function_privilege('anon', 'public.caca_aviso_entrega_marcar(text,uuid,uuid[])', 'execute') then raise exception 'função interna exposta'; end if;

  raise exception 'TESTE_OK';
end $t$;
