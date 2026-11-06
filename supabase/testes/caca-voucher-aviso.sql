-- Teste do aviso diário do voucher em disputa (migration 20270105). Roda numa transação que TERMINA em exceção: nada fica no banco.
-- Resultado esperado: erro "TESTE_OK amanha | dia1:<n> | repete:0 | hoje | fora_do_horario | sem_voucher | desligado | auto_desligado"
do $$
declare r jsonb; v_out text := ''; v_cnt int; v_t text; v_c text;
begin
  insert into caca_config (chave, valor, nota) values ('avisos_auto', '{"ligado":true,"desde":"2026-11-01T00:00:00Z"}', 'teste') on conflict (chave) do update set valor = excluded.valor;
  insert into caca_config (chave, valor, nota) values ('voucher_aviso', '{"ligado":true,"hora":10,"janela_horas":4}', 'teste') on conflict (chave) do update set valor = excluded.valor;

  -- véspera do 1º dia de voucher (06/11, 10h05 em Fortaleza): "amanhã"
  r := caca_voucher_aviso_gerar('2026-11-06T13:05:00Z');
  assert r ->> 'quando' = 'amanha' and (r ->> 'avisos')::int = 1 and (r ->> 'pessoas')::int > 0, 'véspera gera um aviso para todos';
  v_out := 'amanha';
  select count(*) into v_cnt from caca_aviso a join caca_aviso_entrega e on e.aviso_id = a.id where a.chave_dedupe = 'voucher:aviso:2026-11-06';
  assert v_cnt = (r ->> 'pessoas')::int, 'cada mapa principal tem a sua entrega';
  v_out := v_out || ' | dia1:' || (r ->> 'pessoas');
  select a.titulo, a.corpo into v_t, v_c from caca_aviso a where a.chave_dedupe = 'voucher:aviso:2026-11-06';
  assert v_t like 'Amanhã%' and char_length(v_c) <= 240 and v_c like '%23h59%', 'título de véspera, corpo cabe e traz o corte do servidor';
  assert v_c !~* 'sorteio|todo mundo|todos (concorrem|ganham)', 'nunca promete sorteio nem "todos concorrem"';
  assert (select categoria from caca_aviso where chave_dedupe = 'voucher:aviso:2026-11-06') = 'voucher', 'categoria voucher';

  r := caca_voucher_aviso_gerar('2026-11-06T13:20:00Z');
  assert (r ->> 'avisos')::int = 0, 'reprocessar não duplica';
  select count(*) into v_cnt from caca_aviso a where a.chave_dedupe = 'voucher:aviso:2026-11-06';
  assert v_cnt = 1, 'um aviso por dia';
  v_out := v_out || ' | repete:0';

  -- 1º dia de voucher (07/11): "hoje"
  r := caca_voucher_aviso_gerar('2026-11-07T13:05:00Z');
  assert r ->> 'quando' = 'hoje' and (r ->> 'avisos')::int = 1, 'o dia de voucher gera o aviso de hoje';
  assert (select titulo from caca_aviso where chave_dedupe = 'voucher:aviso:2026-11-07') like 'Hoje%', 'título de hoje';
  v_out := v_out || ' | hoje';

  assert caca_voucher_aviso_gerar('2026-11-07T18:00:00Z') ->> 'fora_do_horario' = 'true', '15h: não nasce atrasado';
  v_out := v_out || ' | fora_do_horario';
  -- 12/11: o último dia de voucher (11/11) já passou e não há outro amanhã
  assert caca_voucher_aviso_gerar('2026-11-12T13:05:00Z') ->> 'sem_voucher' = 'true', 'sem voucher em disputa: nada nasce';
  v_out := v_out || ' | sem_voucher';

  update caca_config set valor = '{"ligado":false}' where chave = 'voucher_aviso';
  assert caca_voucher_aviso_gerar('2026-11-08T13:05:00Z') ->> 'voucher_aviso' = 'false', 'interruptor próprio desliga';
  v_out := v_out || ' | desligado';
  update caca_config set valor = '{"ligado":true}' where chave = 'voucher_aviso';
  update caca_config set valor = '{"ligado":false}' where chave = 'avisos_auto';
  assert caca_voucher_aviso_gerar('2026-11-08T13:05:00Z') ->> 'ligado' = 'false', 'avisos automáticos desligados: nada nasce';
  v_out := v_out || ' | auto_desligado';
  raise exception 'TESTE_OK %', v_out;
end $$;
