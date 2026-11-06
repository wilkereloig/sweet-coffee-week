-- Teste da campanha "Ter com quem contar" (migration 20261234). Roda inteiro numa transação que TERMINA em exceção: nada fica no banco.
-- Resultado esperado: erro "TESTE_OK desligada | dia1:<n> | repete:0 | fora_do_horario | ultimo_dia | encerrada | pref_campanha:false | push_sem_pref:preferencia | push_com_pref:1"
do $$
declare r jsonb; v_ed text := (select edicao_codigo from edicao_publicacao order by edicao_codigo desc limit 1); v_out text := ''; v_cnt int; v_mapa uuid; v_av uuid; v_pref text; v_txt text;
begin
  insert into caca_config (chave, valor, nota) values ('avisos_auto', '{"ligado":true,"desde":"2026-11-01T00:00:00Z"}', 'teste') on conflict (chave) do update set valor = excluded.valor;
  delete from caca_config where chave = 'campanha_sicredi';
  r := caca_campanha_gerar('2026-11-08T13:05:00Z');
  assert r ->> 'campanha' = 'false', 'desligada por padrão: nada nasce';
  v_out := 'desligada';
  insert into caca_config (chave, valor, nota) values ('campanha_sicredi', '{"ligada":true}', 'teste') on conflict (chave) do update set valor = excluded.valor;

  r := caca_campanha_gerar('2026-11-08T13:05:00Z');                               -- 10h05 em Fortaleza
  assert (r ->> 'avisos')::int = 1 and (r ->> 'pessoas')::int > 0, 'dia comum gera um aviso para todos';
  v_out := v_out || ' | dia1:' || (r ->> 'pessoas');
  select count(*) into v_cnt from caca_aviso a join caca_aviso_entrega e on e.aviso_id = a.id where a.chave_dedupe = 'camp:sicredi:2026-11-08';
  assert v_cnt = (r ->> 'pessoas')::int, 'cada mapa principal tem a sua entrega';
  select a.corpo into v_txt from caca_aviso a where a.chave_dedupe = 'camp:sicredi:2026-11-08';
  assert v_txt not ilike '%sorteio%' and v_txt like '%#TerComQuemContar%', 'texto: sem sorteio, com a hashtag';

  r := caca_campanha_gerar('2026-11-08T13:20:00Z');
  assert (r ->> 'avisos')::int = 0, 'reprocessar não duplica';
  select count(*) into v_cnt from caca_aviso a where a.chave_dedupe = 'camp:sicredi:2026-11-08';
  assert v_cnt = 1, 'um aviso por dia';
  v_out := v_out || ' | repete:0';

  assert caca_campanha_gerar('2026-11-08T18:00:00Z') ->> 'fora_do_horario' = 'true', '15h: não nasce atrasado';
  v_out := v_out || ' | fora_do_horario';
  r := caca_campanha_gerar('2026-11-11T13:05:00Z');
  assert (r ->> 'avisos')::int = 1, 'último dia gera';
  select a.titulo into v_txt from caca_aviso a where a.chave_dedupe = 'camp:sicredi:2026-11-11';
  assert v_txt like 'Último dia%', 'último dia tem título próprio';
  v_out := v_out || ' | ultimo_dia';
  assert caca_campanha_gerar('2026-11-12T13:05:00Z') ->> 'encerrada' = 'true', 'depois de 11/11 não nasce';
  v_out := v_out || ' | encerrada';

  -- preferência: a chave existe e vem desligada; push só com a preferência ligada
  select c.mapa_id into v_mapa from caca_push c where c.ativo limit 1;
  v_pref := (select (c.prefs ->> 'campanha') from caca_push c where c.mapa_id = v_mapa and c.ativo order by c.atualizado_em desc limit 1);
  assert v_pref = 'false', 'aparelhos existentes ganham campanha desligada';
  v_out := v_out || ' | pref_campanha:' || v_pref;
  insert into caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, estado, origem, chave_dedupe, enviado_em, alvos)
    values (v_ed, 'campanha', 'T', 'C', '/cartoon/ter-com-quem-contar', '{"tipo":"mapas","ids":[]}', 'enviado', 'automatico', 'teste:camp1', now(), 1) returning id into v_av;
  insert into caca_aviso_entrega (aviso_id, mapa_id) values (v_av, v_mapa);
  update caca_push set prefs = prefs || '{"campanha":false}' where mapa_id = v_mapa;
  select count(*) into v_cnt from caca_aviso_entregas_pendentes(v_av);
  assert v_cnt = 0, 'sem preferência não vai push';
  v_out := v_out || ' | push_sem_pref:' || (select push_estado from caca_aviso_entrega where aviso_id = v_av and mapa_id = v_mapa);
  update caca_aviso_entrega set push_estado = null, push_em = null where aviso_id = v_av and mapa_id = v_mapa;
  update caca_push set prefs = prefs || '{"campanha":true}' where mapa_id = v_mapa;
  select count(*) into v_cnt from caca_aviso_entregas_pendentes(v_av);
  assert v_cnt >= 1, 'com a preferência ligada o push vai (dentro da janela de envio)';
  v_out := v_out || ' | push_com_pref:' || v_cnt;
  raise exception 'TESTE_OK %', v_out;
end $$;
