-- =============================================================================
-- Complemento de sincronizacao.sql: os caminhos que dependem de DADO que pode não existir no
-- banco no dia (vaga aberta, venda, pedido pendente) — aqui criados SINTÉTICOS dentro da
-- transação, que termina em exceção de propósito e desfaz tudo. Rodar depois da migration.
-- Esperado: 13 linhas "OK", falhas: 0.
-- =============================================================================
do $teste$
declare
  v_ini bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_pa uuid; v_paa uuid; v_pb uuid; v_ed text; v_sol uuid; v_nid uuid; ok boolean; n int;
begin
  create temp table zz_res (ord serial, nome text, ok boolean);
  create function pg_temp.msgs(p_ini bigint, p_topico text, p_dom text, p_ref text) returns int language sql as $f$
      select count(*)::int from realtime.messages
       where topic = p_topico and (payload ->> 'd') = p_dom and (p_ref is null or (payload ->> 'r') = p_ref)
         and (payload ->> 't')::bigint >= p_ini $f$;
  select pa.id, pa.participante_id, pa.edicao_codigo into v_paa, v_pa, v_ed from participacoes pa join participantes p on p.id = pa.participante_id where p.user_id is not null order by pa.created_at limit 1;
  select p.id into v_pb from participantes p where p.id <> v_pa and p.user_id is not null order by p.created_at limit 1;

  -- vaga de foto ABERTA nasce: todas as marcas precisam saber (veem as vagas livres)
  insert into sessoes_fotos (participante_id, data_hora, local, status, edicao_codigo) values (null, now() + interval '30 days', 'teste', 'aberto', v_ed);
  insert into zz_res (nome, ok) values
    ('vaga aberta nasce→ scw:marcas recebe "fotos" (sem id de marca)', pg_temp.msgs(v_ini, 'scw:marcas', 'fotos', null) >= 1),
    ('vaga aberta nasce→ scw:org recebe', (select count(*) from realtime.messages where topic = 'scw:org' and (payload ->> 'd') = 'fotos' and (payload ->> 't')::bigint >= v_ini) >= 1),
    ('vaga aberta nasce→ social media NÃO recebe', (select count(*) from realtime.messages where topic = 'scw:social' and (payload ->> 'd') = 'fotos' and (payload ->> 't')::bigint >= v_ini) = 0);
  -- a marca A reserva a vaga: A (e a organização) sabem; B não
  update sessoes_fotos set participante_id = v_pa, participacao_id = v_paa, status = 'agendada' where local = 'teste' and status = 'aberto';
  insert into zz_res (nome, ok) values
    ('reserva→ canal da marca A recebe "fotos"', pg_temp.msgs(v_ini, 'scw:marca:' || v_pa, 'fotos', v_pa::text) >= 1),
    ('reserva→ canal da marca B NÃO recebe', (select count(*) from realtime.messages where topic = 'scw:marca:' || v_pb and (payload ->> 'd') = 'fotos' and (payload ->> 't')::bigint >= v_ini) = 0);

  -- venda: organização e a própria marca; nunca o social media nem outra marca
  insert into vendas_diarias (participacao_id, dia, quantidade) values (v_paa, current_date + 400, 3);
  insert into zz_res (nome, ok) values
    ('venda→ scw:org recebe com o id da marca', pg_temp.msgs(v_ini, 'scw:org', 'vendas', v_pa::text) = 1),
    ('venda→ canal da própria marca recebe', pg_temp.msgs(v_ini, 'scw:marca:' || v_pa, 'vendas', v_pa::text) = 1),
    ('venda→ social media NÃO recebe', (select count(*) from realtime.messages where topic = 'scw:social' and (payload ->> 'd') = 'vendas') = 0),
    ('venda→ outra marca NÃO recebe', (select count(*) from realtime.messages where topic = 'scw:marca:' || v_pb and (payload ->> 'd') = 'vendas') = 0);

  -- pedido: criado → respondido; o aviso "Novo pedido" da marca vira lido
  insert into solicitacoes (escopo, participacao_id, edicao_codigo, titulo, texto) values ('marca', v_paa, v_ed, 'Pedido de teste', 'texto') returning id into v_sol;
  insert into solicitacao_estado (solicitacao_id, participacao_id, estado) values (v_sol, v_paa, 'pendente');
  insert into zz_res (nome, ok) values
    ('pedido criado→ canal da marca A recebe "pedidos"', pg_temp.msgs(v_ini, 'scw:marca:' || v_pa, 'pedidos', null) >= 1),
    ('pedido criado→ canal da marca B NÃO recebe', (select count(*) from realtime.messages where topic = 'scw:marca:' || v_pb and (payload ->> 'd') = 'pedidos' and (payload ->> 't')::bigint >= v_ini) = 0);
  select id into v_nid from notificacoes where para = 'marca' and participante_id = v_pa and tipo = 'pedido' and link = 'pedidos/' || v_sol limit 1;
  if v_nid is null then
    insert into notificacoes (para, participante_id, tipo, titulo, link, push_enviado_em) values ('marca', v_pa, 'pedido', 'Novo pedido', 'pedidos/' || v_sol, now()) returning id into v_nid;
  end if;
  update solicitacao_estado set estado = 'respondido' where solicitacao_id = v_sol and participacao_id = v_paa;
  select (lida_em is not null) into ok from notificacoes where id = v_nid;
  insert into zz_res (nome, ok) values ('pedido respondido: o aviso "Novo pedido" da marca vira lido', coalesce(ok, false));
  -- pedido GERAL (sem participação) vai a todas as marcas
  insert into solicitacoes (escopo, edicao_codigo, titulo, texto) values ('geral', v_ed, 'Pedido geral de teste', 'texto');
  insert into zz_res (nome, ok) values ('pedido geral→ scw:marcas recebe "pedidos"', pg_temp.msgs(v_ini, 'scw:marcas', 'pedidos', null) >= 1);

  raise exception E'RESULTADO\n%', (
    select string_agg(case when z.ok then 'OK    ' else 'FALHA ' end || z.nome, E'\n' order by z.ord) || E'\n\nTotal: ' || count(*) || ' · falhas: ' || count(*) filter (where not z.ok)
      from zz_res z);
end $teste$;
