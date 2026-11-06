-- Teste da programação do festival (migration 20261232). Roda inteiro numa transação que TERMINA em exceção: nada fica no banco.
-- Resultado esperado: erro "TESTE_OK voucher:{... "tipo": "voucher" ...} | repete:0 | ... | push_incentivo_livre:1 | push_incentivo_2o_no_dia:0/limite | push_premio_apos_incentivo:1 | ..."
do $$
declare r jsonb; r2 jsonb; v_ed text := (select edicao_codigo from edicao_publicacao order by edicao_codigo desc limit 1); v_out text := ''; v_mapa uuid; v_av uuid; v_av2 uuid; v_cnt int; v_txt text;
begin
  insert into caca_config (chave, valor, nota) values ('avisos_auto', '{"ligado":true,"desde":"2026-11-01T00:00:00Z"}', 'teste') on conflict (chave) do update set valor = excluded.valor;
  r := caca_programacao_gerar('2026-11-08T13:05:00Z');                                  -- 10h05 em Fortaleza, dia de voucher
  assert r ->> 'tipo' = 'voucher' and (r ->> 'avisos')::int > 0, 'dia de voucher gera';
  r2 := caca_programacao_gerar('2026-11-08T13:20:00Z');
  assert (r2 ->> 'avisos')::int = 0, 'reprocessar não duplica';
  assert caca_programacao_gerar('2026-11-08T18:00:00Z') ->> 'fora_do_horario' = 'true', '15h: mensagem vencida não nasce';
  assert caca_programacao_gerar('2026-11-04T13:05:00Z') ->> 'fora_do_festival' = 'true', 'antes do festival';
  assert caca_programacao_gerar('2026-11-16T13:05:00Z') ->> 'fora_do_festival' = 'true', 'depois do festival';
  assert caca_programacao_gerar('2026-11-14T13:05:00Z') ->> 'tipo' = 'penultimo', 'penúltimo dia';
  assert caca_programacao_gerar('2026-11-15T13:05:00Z') ->> 'tipo' = 'ultimo', 'último dia';
  select count(*) into v_cnt from caca_aviso a where a.chave_dedupe like 'prog:2026-11-15:%' and a.corpo like '%fecha às 23h59%';
  assert v_cnt > 0, 'último dia cita o horário real de fechamento da avaliação';
  select c.mapa_id into v_mapa from caca_push c where c.ativo limit 1;
  update caca_push set prefs = '{"incentivo":true,"premio":true,"meta":true}'::jsonb || prefs where mapa_id = v_mapa;
  insert into caca_aviso (edicao_codigo, categoria, titulo, corpo, publico, estado, origem, chave_dedupe, enviado_em, alvos)
    values (v_ed, 'incentivo', 'T1', 'C1', '{"tipo":"mapas","ids":[]}', 'enviado', 'automatico', 'teste:inc1', now(), 1) returning id into v_av;
  insert into caca_aviso_entrega (aviso_id, mapa_id) values (v_av, v_mapa);
  select count(*) into v_cnt from caca_aviso_entregas_pendentes(v_av);
  assert v_cnt = 1, 'incentivo livre vai';
  update caca_aviso_entrega set push_estado = 'enviado', push_em = now() where aviso_id = v_av and mapa_id = v_mapa;
  insert into caca_aviso (edicao_codigo, categoria, titulo, corpo, publico, estado, origem, chave_dedupe, enviado_em, alvos)
    values (v_ed, 'incentivo', 'T2', 'C2', '{"tipo":"mapas","ids":[]}', 'enviado', 'automatico', 'teste:inc2', now(), 1) returning id into v_av2;
  insert into caca_aviso_entrega (aviso_id, mapa_id) values (v_av2, v_mapa);
  assert (select count(*) from caca_aviso_entregas_pendentes(v_av2)) = 0 and (select push_estado from caca_aviso_entrega where aviso_id = v_av2) = 'limite', 'segundo incentivo é barrado';
  insert into caca_aviso (edicao_codigo, categoria, titulo, corpo, publico, estado, origem, chave_dedupe, enviado_em, alvos)
    values (v_ed, 'premio', 'P1', 'CP', '{"tipo":"mapas","ids":[]}', 'enviado', 'automatico', 'teste:pr1', now(), 1) returning id into v_av2;
  insert into caca_aviso_entrega (aviso_id, mapa_id) values (v_av2, v_mapa);
  assert (select count(*) from caca_aviso_entregas_pendentes(v_av2)) = 1, 'prêmio não perde a vez para o incentivo';
  raise exception 'TESTE_OK';
end $$;
