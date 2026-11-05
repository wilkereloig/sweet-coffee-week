-- Caça aos Carimbos: marcos relativos ao total e gravação pelo painel (migration 20261213). Roda DEPOIS da migration, na mesma
-- transação, e sempre termina em exceção: TESTE_OK = passou; nada fica no banco. Troca public.pode só dentro da transação.
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

do $t$
declare
  ed constant text := '2026.2';
  ca record; cb record; extra uuid;
  ch1 text; id1 uuid; v_total int; v_cfg jsonb; v_antes jsonb; r jsonb; c record;
  semente constant jsonb := '[{"casas":1,"titulo":"Primeiro carimbo"},{"fracao":0.33,"titulo":"Pegou o jeito"},{"fracao":0.67,"titulo":"Quase lá"},{"casas":"todas","titulo":"Mapa completo"}]';
begin
  -- 20261217: o padrão 'revisao' não conta casa sem ponto conferido; este teste usa casa sem ponto, então liga 'conta' só na transação.
  update public.caca_config set valor = '"conta"'::jsonb where chave = 'carimbo_sem_ponto';
  -- 1. Resolução pura, para vários totais (nenhum 27 escrito em função).
  if (select array_agg(casas order by casas) from public.caca_metas_resolver(semente, 27)) <> array[1, 9, 18, 27] then raise exception '27: %', (select array_agg(casas) from public.caca_metas_resolver(semente, 27)); end if;
  if (select array_agg(casas order by casas) from public.caca_metas_resolver(semente, 26)) <> array[1, 9, 17, 26] then raise exception '26'; end if;
  if (select array_agg(casas order by casas) from public.caca_metas_resolver(semente, 3)) <> array[1, 2, 3] then raise exception '3: %', (select array_agg(casas) from public.caca_metas_resolver(semente, 3)); end if;
  if (select array_agg(casas order by casas) from public.caca_metas_resolver(semente, 2)) <> array[1, 2] then raise exception '2'; end if;
  if (select titulo from public.caca_metas_resolver(semente, 1)) <> 'Mapa completo' or (select count(*) from public.caca_metas_resolver(semente, 1)) <> 1 then raise exception '1: todas deveria vencer o empate'; end if;
  if (select count(*) from public.caca_metas_resolver(semente, 0)) <> 0 then raise exception '0 casas: sem marcos'; end if;
  if (select count(*) from public.caca_metas_resolver('{"nao":"array"}'::jsonb, 27)) <> 0
     or (select count(*) from public.caca_metas_resolver('["x",3,{},{"casas":-1,"titulo":"a"},{"casas":"todas"},{"fracao":1.5,"titulo":"a"},{"fracao":0,"titulo":"a"}]'::jsonb, 27)) <> 0
    then raise exception 'config torta deveria resolver para vazio'; end if;
  if (select casas from public.caca_metas_resolver('[{"casas":5,"titulo":"Cinco"},{"casas":99,"titulo":"Alto"}]'::jsonb, 27)) <> 5 then raise exception 'absoluto acima do total deveria sumir'; end if;

  -- 2. Cenário real: casas publicadas só na transação (como em caca-metas-push.sql).
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
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr into cb
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' and pa.id <> ca.participacao order by pa.id limit 1;
  if ca.participacao is null or cb.participacao is null then raise exception 'faltam 2 casas com QR'; end if;
  update public.unidades set coordenada_verificada_em = null
   where id in (select pu.unidade_id from public.participacao_unidades pu where pu.participacao_id = cb.participacao);
  ch1 := public.mapa_criar(ed, 'M1', 'm1@exemplo.com.br', null, true, true) ->> 'chave';
  select id into id1 from public.mapas_lover where chave_hash = public.mapa_hash(ch1);
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
    values (id1, ca.participacao, ca.unidade, ca.qr, true, now() - interval '30 hours'),
           (id1, cb.participacao, cb.unidade, cb.qr, false, now() - interval '20 hours');
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas) values
    (ed, ca.participacao, 'Teste', 'm1@exemplo.com.br', '{}'::jsonb), (ed, cb.participacao, 'Teste', 'm1@exemplo.com.br', '{}'::jsonb);

  -- valores de partida (a migration já os gravou no lugar dos exemplos)
  select valor into v_cfg from public.caca_config where chave = 'metas';
  if v_cfg is distinct from semente then raise exception 'semente da migration diferente do esperado: %', v_cfg; end if;

  r := public.caca_metas_ler(ch1);
  v_total := (r ->> 'total_casas')::int;
  if (r ->> 'casas_validadas')::int <> 2 then raise exception 'M1 deveria ter 2 casas: %', r; end if;
  if (select max((e ->> 'casas')::int) from jsonb_array_elements(r -> 'metas') e) <> v_total
     or not (select (e ->> 'completa')::boolean from jsonb_array_elements(r -> 'metas') e order by (e ->> 'casas')::int desc limit 1)
    then raise exception 'o marco "todas" deveria ser o total (%): %', v_total, r; end if;
  if r::text like '%exemplo%' then raise exception 'resposta ainda fala em exemplo: %', r; end if;
  if jsonb_array_length(r -> 'alcancadas') <> 1 or (r -> 'alcancadas' -> 0 ->> 'casas')::int <> 1 then raise exception 'alcançadas: %', r; end if;
  if (r -> 'proxima' ->> 'faltam')::int <> (r -> 'proxima' ->> 'casas')::int - 2 then raise exception 'próxima: %', r; end if;

  -- "todas" acompanha o total: encerrar uma casa (que não é A nem B) derruba o total e o marco final junto.
  select pa.id into extra from public.participacoes pa
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' and pa.id not in (ca.participacao, cb.participacao)
     and pa.id in (select public.caca_casas_conta(ed)) limit 1;
  update public.participacoes set status_cadastro = 'encerrado' where id = extra;
  r := public.caca_metas_ler(ch1);
  if (r ->> 'total_casas')::int <> v_total - 1 or (select max((e ->> 'casas')::int) from jsonb_array_elements(r -> 'metas') e) <> v_total - 1
    then raise exception 'todas não acompanhou o total: %', r; end if;

  -- 3. Gravar: validações (a configuração não muda em caso de erro), gate e auditoria.
  select valor into v_antes from public.caca_config where chave = 'metas';
  for c in select * from (values
      ('[]', 'metas_invalidas'), ('{"a":1}', 'metas_invalidas'),
      ((select jsonb_agg(jsonb_build_object('casas', g, 'titulo', 'x'))::text from generate_series(1, 21) g), 'metas_invalidas'),
      ('[{"casas":3,"titulo":"x","premio":"viagem"}]', 'metas_invalidas'), ('["lixo"]', 'metas_invalidas'),
      ('[{"casas":3,"titulo":""}]', 'metas_titulo'), ('[{"casas":3,"titulo":"   "}]', 'metas_titulo'), ('[{"casas":3}]', 'metas_titulo'),
      ('[{"casas":3,"titulo":"' || repeat('a', 41) || '"}]', 'metas_titulo'),
      ('[{"casas":0,"titulo":"x"}]', 'metas_casas'), ('[{"casas":"x","titulo":"x"}]', 'metas_casas'), ('[{"casas":201,"titulo":"x"}]', 'metas_casas'),
      ('[{"casas":"3","titulo":"x"}]', 'metas_casas'), ('[{"titulo":"x"}]', 'metas_casas'), ('[{"casas":2.5,"titulo":"x"}]', 'metas_casas'),
      ('[{"fracao":1.5,"titulo":"x"}]', 'metas_fracao'), ('[{"fracao":0,"titulo":"x"}]', 'metas_fracao'), ('[{"fracao":"0.3","titulo":"x"}]', 'metas_fracao'),
      ('[{"fracao":0.3,"casas":4,"titulo":"x"}]', 'metas_fracao'), ('[{"fracao":0.001,"titulo":"x"}]', 'metas_fracao'),
      ('[{"casas":5,"titulo":"a"},{"casas":3,"titulo":"b"}]', 'metas_ordem'), ('[{"casas":3,"titulo":"a"},{"casas":3,"titulo":"b"}]', 'metas_ordem'),
      ('[{"fracao":0.7,"titulo":"a"},{"fracao":0.3,"titulo":"b"}]', 'metas_ordem'), ('[{"casas":"todas","titulo":"a"},{"casas":3,"titulo":"b"}]', 'metas_todas_so_no_fim'),
      ('[{"casas":"todas","titulo":"a"},{"casas":"todas","titulo":"b"}]', 'metas_todas_so_no_fim')
    ) v(entrada, esperado)
  loop
    begin
      perform public.caca_metas_gravar('x', c.entrada::jsonb);
      raise exception 'passou o que deveria falhar (%): %', c.esperado, c.entrada;
    exception when others then
      if sqlerrm <> c.esperado then raise exception 'entrada % deu "%" (esperado "%")', c.entrada, sqlerrm, c.esperado; end if;
    end;
  end loop;
  if (select valor from public.caca_config where chave = 'metas') is distinct from v_antes then raise exception 'config mudou com entrada inválida'; end if;

  execute 'create or replace function public.pode(p_secret text default null, p_acao text default ''dado.ler'') returns boolean language sql as $f$ select p_acao = ''dado.ler'' $f$';
  begin
    perform public.caca_metas_gravar('x', semente);
    raise exception 'gravar sem edicao.gerir passou';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  r := public.caca_metas_painel_ler('x', ed);   -- dado.ler basta para ler
  if jsonb_array_length(r -> 'marcos') <> 4 or (r ->> 'total_casas')::int <> v_total - 1 or jsonb_array_length(r -> 'resolvidos') <> 4 then raise exception 'painel_ler: %', r; end if;
  execute 'create or replace function public.pode(p_secret text default null, p_acao text default ''dado.ler'') returns boolean language sql as $f$ select false $f$';
  begin
    perform public.caca_metas_painel_ler('x', ed);
    raise exception 'ler sem permissão passou';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  execute 'create or replace function public.pode(p_secret text default null, p_acao text default ''dado.ler'') returns boolean language sql as $f$ select true $f$';

  r := public.caca_metas_gravar('x', '[{"casas":2,"titulo":"  Dois  "},{"fracao":0.5,"titulo":"Metade"},{"casas":"todas","titulo":"Tudo"}]'::jsonb);
  if not (r ->> 'ok')::boolean then raise exception 'gravar: %', r; end if;
  select * into c from public.caca_config where chave = 'metas';
  if c.valor <> '[{"casas":2,"titulo":"Dois"},{"fracao":0.5,"titulo":"Metade"},{"casas":"todas","titulo":"Tudo"}]'::jsonb then raise exception 'valor gravado (sem espaços): %', c.valor; end if;
  if c.nota is not null or c.atualizado_por is null then raise exception 'nota/atualizado_por: % / %', c.nota, c.atualizado_por; end if;
  if not exists (select 1 from public.caca_evento where acao = 'metas_gravar' and antes -> 'metas' = v_antes and depois -> 'metas' = c.valor)
    then raise exception 'auditoria sem antes/depois'; end if;
  r := public.caca_metas_ler(ch1);   -- M1 tem 2 casas: marco "2" alcançado, o resto não
  if (r -> 'metas' -> 0 ->> 'titulo') <> 'Dois' or not (r -> 'metas' -> 0 ->> 'alcancada')::boolean or (r -> 'proxima' ->> 'titulo') <> 'Metade' then raise exception 'ler após gravar: %', r; end if;
  if r::text like '%"premio"%' then raise exception 'prêmio apareceu'; end if;
  if public.caca_metas_ler('chave-errada') is not null then raise exception 'chave errada deveria dar null'; end if;

  raise exception 'TESTE_OK caca-metas-marcos';
end $t$;
