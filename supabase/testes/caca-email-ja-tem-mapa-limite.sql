-- Limite por IP da resposta "e-mail já tem mapa" (migration 20261228). Roda DEPOIS da migration, numa transação, e sempre termina
-- em exceção: TESTE_OK = passou; nada fica no banco.
do $t$
declare ed constant text := '2026.2'; r jsonb; i int; ch text;
begin
  perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.77"}', true);
  r := public.mapa_criar_v2(ed, 'Ana', 'limite.ja@exemplo.com.br', null, true, true);
  ch := r ->> 'chave';
  if ch is null then raise exception 'primeiro mapa deveria ser criado: %', r; end if;

  -- 10 respostas "já tem mapa" passam
  for i in 1..10 loop
    r := public.mapa_criar_v2(ed, 'Outra', 'limite.ja@exemplo.com.br', null, true, true);
    if r ->> 'motivo' is distinct from 'email_ja_tem_mapa' then raise exception 'consulta % deveria responder email_ja_tem_mapa: %', i, r; end if;
  end loop;

  -- a 11ª, do mesmo IP, vira muitos_pedidos
  begin
    perform public.mapa_criar_v2(ed, 'Outra', 'limite.ja@exemplo.com.br', null, true, true);
    raise exception 'a 11ª consulta deveria ser barrada';
  exception when others then if sqlerrm <> 'muitos_pedidos' then raise; end if; end;

  -- criar mapa com e-mail NOVO, do mesmo IP, continua funcionando (o segundo limite só conta a resposta "já tem")
  if public.mapa_criar_v2(ed, 'Beto', 'limite.novo@exemplo.com.br', null, true, true) ->> 'chave' is null then
    raise exception 'e-mail novo deveria criar mesmo depois do limite de consultas';
  end if;

  -- sem cabeçalho de IP (chamada interna/teste) não há limite por IP e o comportamento antigo se mantém
  perform set_config('request.headers', '', true);
  if public.mapa_criar_v2(ed, 'Outra', 'limite.ja@exemplo.com.br', null, true, true) ->> 'motivo' is distinct from 'email_ja_tem_mapa' then
    raise exception 'sem IP deveria responder email_ja_tem_mapa';
  end if;

  raise exception 'TESTE_OK';
end $t$;
