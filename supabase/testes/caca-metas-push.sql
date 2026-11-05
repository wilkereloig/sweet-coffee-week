-- Caça aos Carimbos: metas, origem do carimbo, revisão e push (migration 20261207). Roda DEPOIS da migration, na mesma
-- transação, e sempre termina em exceção: TESTE_OK = passou; nada fica no banco. Troca public.pode só dentro da transação.
-- Não envia push nenhum (só mexe em tabelas); não usa o GPS (insere carimbos direto).
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

do $t$
declare
  ed constant text := '2026.2';
  ca record; cb record; v_total int;
  ch1 text; ch2 text; id1 uuid; id2 uuid;
  k_gps uuid; k_sem uuid; k_anul uuid;
  s1 jsonb; s2 jsonb; s1b jsonb; r jsonb;
  ep1 text := 'https://fcm.googleapis.com/fcm/send/teste-p1-' || repeat('x', 40);
  ep2 text := 'https://updates.push.services.mozilla.com/wpush/v2/teste-p2-' || repeat('y', 40);
  ep1b text := 'https://web.push.apple.com/teste-p1b-' || repeat('z', 40);
  k256 text := repeat('A', 87); kauth text := repeat('B', 22);
begin
  -- Casas publicadas só na transação, como em caca-v2.sql.
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
  select distinct pa.id, 999, 'marca_e_combo', '{}'::jsonb, true
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado'
     and not exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  -- 20261211: só casa com combo entra no total; a casa 'marca' de verdade (ex.: caroli-douces) sai deste cenário.
  update public.publicacoes set nivel = 'marca_e_combo' where vigente;
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr into ca
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' order by pa.id limit 1;
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr into cb
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' and pa.id <> ca.participacao order by pa.id limit 1;
  if ca.participacao is null or cb.participacao is null then raise exception 'faltam 2 casas com QR'; end if;
  -- 20261211: carimbo sem GPS só conta em casa sem nenhuma unidade com coordenada conferida; deixa B assim neste cenário.
  update public.unidades set coordenada_verificada_em = null
   where id in (select pu.unidade_id from public.participacao_unidades pu where pu.participacao_id = cb.participacao);
  ch1 := public.mapa_criar(ed, 'Tmp', 'tmp@exemplo.com.br', null, false, true) ->> 'chave';
  v_total := (public.caca_metas_ler(ch1) ->> 'total_casas')::int;   -- statement à parte: função STABLE não vê o insert do mesmo statement
  if v_total is null then raise exception 'total de casas nulo'; end if;

  ch1 := public.mapa_criar(ed, 'M1', 'm1@exemplo.com.br', null, true, true) ->> 'chave';
  ch2 := public.mapa_criar(ed, 'M2', 'm2@exemplo.com.br', null, true, true) ->> 'chave';
  select id into id1 from public.mapas_lover where chave_hash = public.mapa_hash(ch1);
  select id into id2 from public.mapas_lover where chave_hash = public.mapa_hash(ch2);

  -- 1. Origem do carimbo pelo trigger (insert direto, sem informar origem).
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
    values (id1, ca.participacao, ca.unidade, ca.qr, true, now() - interval '30 hours') returning id into k_gps;
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
    values (id1, cb.participacao, cb.unidade, cb.qr, false, now() - interval '20 hours') returning id into k_sem;
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
    values (id2, ca.participacao, ca.unidade, ca.qr, false, now() - interval '10 hours') returning id into k_anul;
  if (select origem from public.carimbos where id = k_gps) <> 'gps' then raise exception 'conferido=true deveria ser gps'; end if;
  if (select origem from public.carimbos where id = k_sem) <> 'unidade_sem_coordenada' then raise exception 'conferido=false deveria ser unidade_sem_coordenada'; end if;
  -- Quem tenta forçar 'gps' num carimbo não conferido não consegue.
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, origem, criado_em)
    values (id2, cb.participacao, cb.unidade, cb.qr, false, 'gps', now() - interval '9 hours');
  if (select origem from public.carimbos where mapa_id = id2 and participacao_id = cb.participacao) <> 'unidade_sem_coordenada'
    then raise exception 'origem gps forçada passou'; end if;
  -- Valor inventado é normalizado pelo trigger (nunca grava lixo).
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, origem, criado_em)
    values (id2, ca.participacao, ca.unidade, ca.qr, true, 'inventada', now() - interval '8 hours');
  if (select origem from public.carimbos where mapa_id = id2 and criado_em > now() - interval '8 hours 1 minute' and conferido) <> 'gps'
    then raise exception 'origem inventada não foi normalizada'; end if;

  -- 2. Revisão (painel): lista os não-GPS não anulados; anulado some; contato só com relatorio.ler.
  update public.carimbos set anulado_em = now(), anulado_motivo = 'teste' where id = k_anul;
  r := public.caca_carimbo_revisao_listar('x', ed);
  if not exists (select 1 from jsonb_array_elements(r -> 'carimbos') e where e ->> 'carimbo_id' = k_sem::text and e ->> 'origem' = 'unidade_sem_coordenada')
    then raise exception 'revisão sem o carimbo não conferido: %', r; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'carimbos') e where e ->> 'carimbo_id' in (k_gps::text, k_anul::text))
    then raise exception 'revisão listou gps ou anulado: %', r; end if;
  if (select e ->> 'email' from jsonb_array_elements(r -> 'carimbos') e where e ->> 'carimbo_id' = k_sem::text) <> 'm1@exemplo.com.br'
    then raise exception 'revisão deveria trazer o contato com relatorio.ler'; end if;
  execute 'create or replace function public.pode(p_secret text default null, p_acao text default ''dado.ler'') returns boolean language sql as $f$ select p_acao <> ''relatorio.ler'' $f$';
  r := public.caca_carimbo_revisao_listar('x', ed);
  if r::text like '%exemplo.com.br%' or r::text like '%"whatsapp"%' then raise exception 'revisão vazou contato sem relatorio.ler: %', r; end if;
  execute 'create or replace function public.pode(p_secret text default null, p_acao text default ''dado.ler'') returns boolean language sql as $f$ select false $f$';
  begin
    perform public.caca_carimbo_revisao_listar('x', ed);
    raise exception 'revisão sem permissão passou';
  exception when others then
    if sqlerrm <> 'nao_autorizado' then raise; end if;
  end;
  execute 'create or replace function public.pode(p_secret text default null, p_acao text default ''dado.ler'') returns boolean language sql as $f$ select true $f$';
  -- Anular pelo caminho existente tira da lista.
  if not public.carimbo_anular('x', k_sem, 'teste') then raise exception 'carimbo_anular'; end if;
  if exists (select 1 from jsonb_array_elements(public.caca_carimbo_revisao_listar('x', ed) -> 'carimbos') e where e ->> 'carimbo_id' = k_sem::text)
    then raise exception 'carimbo anulado ainda na revisão'; end if;

  -- 3. Metas por casas validadas. M1 valida a casa A (carimbo gps + avaliação) e a B (carimbo + avaliação) -> 2 casas.
  update public.carimbos set anulado_em = null, anulado_motivo = null where id = k_sem;
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas) values
    (ed, ca.participacao, 'Teste', 'm1@exemplo.com.br', '{}'::jsonb),
    (ed, cb.participacao, 'Teste', 'm1@exemplo.com.br', '{}'::jsonb);
  insert into public.caca_config (chave, valor) values ('metas', '[{"casas":1,"titulo":"Uma","exemplo":true},{"casas":2,"titulo":"Duas"},{"casas":3,"titulo":"Tres"},{"casas":3,"titulo":"Duplicada"},{"casas":9999,"titulo":"Impossivel"},{"casas":"x"},"lixo"]'::jsonb)
    on conflict (chave) do update set valor = excluded.valor;
  r := public.caca_metas_ler(ch1);
  if (r ->> 'casas_validadas')::int <> 2 then raise exception 'M1 deveria ter 2 casas validadas: %', r; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'metas') e where (e ->> 'casas')::int > v_total) then raise exception 'meta acima do total apareceu: %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'metas') e where (e ->> 'casas')::int = 1 and (e ->> 'alcancada')::boolean and (e ->> 'exemplo')::boolean)
    then raise exception 'meta 1 deveria estar alcançada e rotulada exemplo: %', r; end if;
  if jsonb_array_length(r -> 'alcancadas') <> 2 then raise exception 'alcançadas: %', r; end if;
  if v_total >= 3 then
    if (r -> 'proxima' ->> 'casas')::int <> 3 or (r -> 'proxima' ->> 'faltam')::int <> 1 then raise exception 'próxima meta: %', r; end if;
    if (select count(*) from jsonb_array_elements(r -> 'metas') e where (e ->> 'casas')::int = 3) <> 1 then raise exception 'meta duplicada: %', r; end if;
  end if;
  r := public.caca_metas_ler(ch2);   -- M2 só tem carimbo anulado/sem avaliação: 0 casas
  if (r ->> 'casas_validadas')::int <> 0 or jsonb_array_length(r -> 'alcancadas') <> 0 or (r -> 'proxima' ->> 'casas')::int <> 1
    then raise exception 'M2 sem casas: %', r; end if;
  if public.caca_metas_ler('chave-errada') is not null then raise exception 'chave errada deveria dar null'; end if;
  -- Valor de configuração quebrado não derruba a leitura.
  update public.caca_config set valor = '{"nao":"array"}'::jsonb where chave = 'metas';
  if jsonb_array_length(public.caca_metas_ler(ch1) -> 'metas') <> 0 then raise exception 'config inválida deveria dar metas vazias'; end if;

  -- 4. Push: registrar, prefs e remover, isolados por mapa.
  s1 := jsonb_build_object('endpoint', ep1, 'keys', jsonb_build_object('p256dh', k256, 'auth', kauth));
  s2 := jsonb_build_object('endpoint', ep2, 'keys', jsonb_build_object('p256dh', k256, 'auth', kauth));
  s1b := jsonb_build_object('endpoint', ep1b, 'keys', jsonb_build_object('p256dh', k256, 'auth', kauth));
  r := public.caca_push_registrar(ch1, s1, '{"edicao":true,"meta":"sim","lixo":true}'::jsonb);
  if not (r ->> 'ok')::boolean or (r -> 'prefs' ->> 'edicao') <> 'true' or (r -> 'prefs' ->> 'meta') <> 'true' or r -> 'prefs' ? 'lixo'
    then raise exception 'registrar M1: %', r; end if;
  if r::text like '%fcm.googleapis%' or r::text like '%' || kauth || '%' then raise exception 'registrar devolveu credencial: %', r; end if;
  r := public.caca_push_registrar(ch2, s2, null);
  if not (r ->> 'ok')::boolean or (r -> 'prefs' ->> 'edicao') <> 'false' or (r -> 'prefs' ->> 'avaliacao_pendente') <> 'true'
    then raise exception 'registrar M2 (padrão do servidor): %', r; end if;
  -- Recusas.
  if public.caca_push_registrar('chave-errada', s1, null) ->> 'motivo' <> 'mapa_desconhecido' then raise exception 'chave errada'; end if;
  if public.caca_push_registrar(ch1, jsonb_build_object('endpoint', 'https://evil.example.com/x', 'keys', jsonb_build_object('p256dh', k256, 'auth', kauth)), null) ->> 'motivo' <> 'assinatura_invalida'
    then raise exception 'endpoint fora da lista passou'; end if;
  if public.caca_push_registrar(ch1, jsonb_build_object('endpoint', 'http://fcm.googleapis.com/fcm/send/x', 'keys', jsonb_build_object('p256dh', k256, 'auth', kauth)), null) ->> 'motivo' <> 'assinatura_invalida'
    then raise exception 'endpoint http passou'; end if;
  if public.caca_push_registrar(ch1, jsonb_build_object('endpoint', 'https://fcm.googleapis.com@evil.example.com/x', 'keys', jsonb_build_object('p256dh', k256, 'auth', kauth)), null) ->> 'motivo' <> 'assinatura_invalida'
    then raise exception 'endpoint com userinfo passou'; end if;
  if public.caca_push_registrar(ch1, jsonb_build_object('endpoint', ep1, 'keys', jsonb_build_object('p256dh', 'curto', 'auth', kauth)), null) ->> 'motivo' <> 'assinatura_invalida'
    then raise exception 'chave p256dh curta passou'; end if;
  if public.caca_push_registrar(ch1, '"texto"'::jsonb, null) ->> 'motivo' <> 'assinatura_invalida' then raise exception 'assinatura não-objeto passou'; end if;
  -- Prefs só do próprio mapa; segundo aparelho herda as prefs do mapa.
  r := public.caca_push_prefs(ch1, '{"grupo":false}'::jsonb);
  if not (r ->> 'ok')::boolean or (r -> 'prefs' ->> 'grupo') <> 'false' or (r -> 'prefs' ->> 'edicao') <> 'true' then raise exception 'prefs M1: %', r; end if;
  if (select prefs ->> 'grupo' from public.caca_push where mapa_id = id2) <> 'true' then raise exception 'prefs de M1 vazaram para M2'; end if;
  r := public.caca_push_registrar(ch1, s1b, null);
  if (r -> 'prefs' ->> 'grupo') <> 'false' or (r ->> 'dispositivos')::int <> 2 then raise exception 'segundo aparelho deveria herdar prefs: %', r; end if;
  if public.caca_push_prefs(ch1, '{"grupo":true}'::jsonb) ->> 'dispositivos' <> '2' then raise exception 'prefs deveria valer nos 2 aparelhos'; end if;
  if public.caca_push_prefs('chave-errada', '{}'::jsonb) ->> 'motivo' <> 'mapa_desconhecido' then raise exception 'prefs chave errada'; end if;
  -- Remover: M2 não consegue apagar o aparelho de M1; M1 consegue.
  if (public.caca_push_remover(ch2, ep1) ->> 'removidos')::int <> 0 then raise exception 'M2 removeu aparelho de M1'; end if;
  if (select count(*) from public.caca_push where mapa_id = id1) <> 2 then raise exception 'aparelhos de M1 mexidos por M2'; end if;
  if (public.caca_push_remover(ch1, ep1) ->> 'removidos')::int <> 1 then raise exception 'M1 não removeu o próprio aparelho'; end if;
  if (select count(*) from public.caca_push where mapa_id = id1) <> 1 then raise exception 'sobrou aparelho errado'; end if;
  if (public.caca_push_remover(ch1, null) ->> 'removidos')::int <> 1 then raise exception 'remover todos'; end if;
  if exists (select 1 from public.caca_push where mapa_id = id1) then raise exception 'M1 ainda tem aparelho'; end if;
  if not exists (select 1 from public.caca_push where mapa_id = id2) then raise exception 'aparelho de M2 sumiu'; end if;
  -- Mesmo aparelho passando para outro mapa: muda de dono, sem duplicar.
  r := public.caca_push_registrar(ch1, s2, null);
  if (select count(*) from public.caca_push where endpoint_hash = public.mapa_hash(ep2)) <> 1
     or (select mapa_id from public.caca_push where endpoint_hash = public.mapa_hash(ep2)) <> id1 then raise exception 'aparelho deveria mudar para M1'; end if;
  -- Limite de 5 aparelhos.
  for i in 1..4 loop
    perform public.caca_push_registrar(ch1, jsonb_build_object('endpoint', 'https://fcm.googleapis.com/fcm/send/lim' || i || repeat('q', 30),
      'keys', jsonb_build_object('p256dh', k256, 'auth', kauth)), null);
  end loop;
  if public.caca_push_registrar(ch1, jsonb_build_object('endpoint', 'https://fcm.googleapis.com/fcm/send/lim9' || repeat('q', 30),
      'keys', jsonb_build_object('p256dh', k256, 'auth', kauth)), null) ->> 'motivo' <> 'limite_dispositivos' then raise exception 'limite de aparelhos'; end if;
  -- Apagar o mapa leva os aparelhos junto.
  perform public.mapa_apagar(ch1);
  if exists (select 1 from public.caca_push where mapa_id = id1) then raise exception 'push não saiu com o mapa'; end if;

  -- 5. Tabelas fechadas para anon/authenticated.
  if has_table_privilege('anon', 'public.caca_push', 'select') or has_table_privilege('authenticated', 'public.caca_push', 'select')
     or has_table_privilege('anon', 'public.caca_config', 'select') or has_table_privilege('anon', 'public.caca_push', 'insert')
    then raise exception 'tabela aberta'; end if;
  if has_function_privilege('anon', 'public.caca_push_prefs_norm(jsonb)', 'execute') or has_function_privilege('anon', 'public.carimbos_origem_definir()', 'execute')
    then raise exception 'função interna com grant'; end if;

  raise exception 'TESTE_OK casas=%', v_total;
end $t$;
