-- Caça aos Carimbos, quais casas e carimbos contam (migration 20261211; achados CACA-SEC-03, SEC-04 e SEC-05). Roda DEPOIS da
-- migration, numa transação, e SEMPRE termina em exceção: TESTE_OK = passou; nada fica no banco (coordenadas, nível, status e
-- carimbos de teste vão embora no rollback). Usa casas reais com QR, mas monta o cenário por UPDATE dentro da transação.
do $t$
declare
  ed constant text := '2026.2';
  hx record; hy record; hz record; hw record;
  k_p1 text; k_p2 text; k_p3 text; k_c1 text; id_p2 uuid; id_p3 uuid; r jsonb; v_total int; v_esperado int; v_antes int;
begin
  -- Todas as casas com QR publicadas e com combo; depois cada cenário muda a sua.
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
  select distinct pa.id, 999, 'marca_e_combo', '{}'::jsonb, true
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado'
     and not exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  update public.publicacoes set nivel = 'marca_e_combo' where vigente;

  -- hx: casa com 2 unidades com QR (uma será conferida, a outra não).
  select pa.id participacao, pa.slug_publico slug, array_agg(pu.id order by q.codigo) pus, array_agg(q.codigo order by q.codigo) qrs,
         array_agg(pu.unidade_id order by q.codigo) us
    into hx
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado'
   group by pa.id, pa.slug_publico having count(*) >= 2 order by pa.id limit 1;
  if hx.participacao is null then raise exception 'falta casa com 2 unidades e QR'; end if;
  select distinct on (pa.id) pa.id participacao, pa.slug_publico slug, pu.id pu, q.codigo qr into hy
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' and pa.id <> hx.participacao order by pa.id limit 1;
  select distinct on (pa.id) pa.id participacao, pa.slug_publico slug, pu.id pu, q.codigo qr into hz
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' and pa.id not in (hx.participacao, hy.participacao) order by pa.id limit 1;
  select distinct on (pa.id) pa.id participacao, pa.slug_publico slug, pu.id pu, q.codigo qr into hw
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' and pa.id not in (hx.participacao, hy.participacao, hz.participacao)
   order by pa.id limit 1;
  if hw.participacao is null then raise exception 'faltam 4 casas com QR'; end if;

  -- Coordenadas: hx tem a unidade 1 conferida e a 2 sem coordenada; hy não tem nenhuma conferida.
  update public.unidades set lat = -5.8, lng = -35.2, coordenada_verificada_em = now() where id = hx.us[1];
  update public.unidades set coordenada_verificada_em = null where id = hx.us[2];
  update public.unidades set coordenada_verificada_em = null
   where id in (select pu.unidade_id from public.participacao_unidades pu where pu.participacao_id = hy.participacao);
  -- Avaliação aberta agora (só na transação).
  update public.edicao_publicacao set fase = 'em_andamento', avaliacao_aberta = true, avaliacao_abre_em = now() - interval '1 day',
         avaliacao_fecha_em = now() + interval '1 day' where edicao_codigo = ed;

  k_p1 := public.mapa_criar_v2(ed, 'P1', 'p1@exemplo.com.br', null, true, true) ->> 'chave';
  k_p2 := public.mapa_criar_v2(ed, 'P2', 'p2@exemplo.com.br', null, true, true) ->> 'chave';
  k_p3 := public.mapa_criar_v2(ed, 'P3', 'p3@exemplo.com.br', null, true, true) ->> 'chave';
  select id into id_p2 from public.mapas_lover where chave_hash = public.mapa_hash(k_p2);
  select id into id_p3 from public.mapas_lover where chave_hash = public.mapa_hash(k_p3);

  -- SEC-03. Casa com unidade conferida: sem localização o servidor escolhe a unidade CONFERIDA e recusa (antes carimbava de graça).
  r := public.mapa_carimbar_casa(k_p1, hx.slug, null, null, null);
  if r ->> 'motivo' is distinct from 'sem_localizacao' then raise exception 'sem GPS deveria ser recusado na casa conferida: %', r; end if;
  r := public.mapa_carimbar_casa(k_p1, hx.slug, -5.8, -35.2, 10);
  if not (r ->> 'ok')::boolean or (select k.origem from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                                    where m.email_norm = 'p1@exemplo.com.br' and k.participacao_id = hx.participacao) <> 'gps'
    then raise exception 'com GPS na unidade conferida deveria carimbar com origem gps: %', r; end if;
  -- Carimbo pela unidade SEM coordenada de uma casa que tem unidade conferida (origem unidade_sem_coordenada) não conta.
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
  values (id_p2, hx.participacao, hx.pus[2], hx.qrs[2], false, now() - interval '5 hours');
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas, criado_em)
  values (ed, hx.participacao, 'Teste', 'p2@exemplo.com.br', '{}'::jsonb, now() - interval '4 hours');
  if (select k.origem from public.carimbos k where k.mapa_id = id_p2) <> 'unidade_sem_coordenada' then raise exception 'origem do carimbo sem coordenada'; end if;
  if exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'p2@exemplo.com.br') then raise exception 'carimbo sem GPS contou em casa com unidade conferida'; end if;
  -- C01 (20261217): o GPS é decidido pela CASA. QR da unidade sem ponto numa casa com unidade conferida: mede até a conferida.
  k_c1 := public.mapa_criar_v2(ed, 'C1', 'c1@exemplo.com.br', null, true, true) ->> 'chave';
  r := public.mapa_carimbar(k_c1, hx.qrs[2], 0, 0, 10);
  if r ->> 'motivo' is distinct from 'longe' then raise exception 'unidade sem ponto, celular longe da conferida: %', r; end if;
  r := public.mapa_carimbar(k_c1, hx.qrs[2], null, null, null);
  if r ->> 'motivo' is distinct from 'sem_localizacao' then raise exception 'unidade sem ponto, sem GPS: %', r; end if;
  r := public.mapa_carimbar(k_c1, hx.qrs[2], 'Infinity'::numeric, 'NaN'::numeric, 10);   -- 20261217: coordenada invalida nunca vira erro de banco
  if r ->> 'motivo' is distinct from 'sem_localizacao' then raise exception 'unidade sem ponto, Infinity: %', r; end if;
  r := public.mapa_carimbar(k_c1, hx.qrs[2], -5.8, -35.2, 10);
  if not (r ->> 'ok')::boolean or (select k.origem from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                                    where m.email_norm = 'c1@exemplo.com.br' and k.participacao_id = hx.participacao) <> 'gps'
    then raise exception 'unidade sem ponto, celular na conferida: deveria carimbar com origem gps: %', r; end if;
  if r ? 'pontos' then raise exception 'pontos é regra extinta'; end if;
  -- C02: casa sem NENHUM ponto conferido não carimba só pelo QR (padrão revisao); com 'conta' (decisão do Wilker) volta ao antigo.
  r := public.mapa_carimbar(k_c1, hy.qr, null, null, null);
  if r ->> 'motivo' is distinct from 'sem_ponto' then raise exception 'QR sozinho deveria recusar com sem_ponto: %', r; end if;
  r := public.mapa_carimbar(k_c1, hy.qr, -5.8, -35.2, 10);
  if r ->> 'motivo' is distinct from 'sem_ponto' then raise exception 'com GPS também (não há ponto para comparar): %', r; end if;
  if exists (select 1 from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id where m.email_norm = 'c1@exemplo.com.br' and k.participacao_id = hy.participacao)
    then raise exception 'sem_ponto não pode gravar carimbo'; end if;
  if public.caca_carimbo_conta(hy.participacao, 'unidade_sem_coordenada') then raise exception 'carimbo sem ponto contou no modo revisao'; end if;
  update public.caca_config set valor = '"conta"'::jsonb where chave = 'carimbo_sem_ponto';
  if not public.caca_carimbo_conta(hy.participacao, 'unidade_sem_coordenada') then raise exception 'modo conta deveria contar em casa sem ponto'; end if;
  if public.caca_carimbo_conta(hx.participacao, 'unidade_sem_coordenada') then raise exception 'casa com ponto nunca conta sem GPS'; end if;
  -- Já em casa em que NENHUMA unidade tem coordenada conferida, o carimbo sem GPS conta (decisão pendente do Wilker, ver 15-caca-gps-excecao.md).
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
  values (id_p2, hy.participacao, hy.pu, hy.qr, false, now() - interval '3 hours');
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas, criado_em)
  values (ed, hy.participacao, 'Teste', 'p2@exemplo.com.br', '{}'::jsonb, now() - interval '2 hours');
  if not exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'p2@exemplo.com.br' and p.casas = 1) then raise exception 'casa sem nenhuma coordenada deveria contar'; end if;
  if (public.mapa_ler_v2(k_p2) ->> 'casas_validadas')::int <> 1 or jsonb_array_length(public.mapa_ler_v2(k_p2) -> 'casas') <> 1
    then raise exception 'mapa_ler_v2 deveria mostrar só o que conta: %', public.mapa_ler_v2(k_p2); end if;

  -- SEC-05. Casa só 'marca' (sem combo) não entra no total e recusa carimbo.
  v_antes := public.caca_total_casas(ed);
  update public.publicacoes set nivel = 'marca' where participacao_id = hw.participacao and vigente;
  if public.caca_total_casas(ed) <> v_antes - 1 then raise exception 'casa sem combo deveria sair do total'; end if;
  select count(*) into v_esperado from public.participacoes pa
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente and pb.nivel = 'marca_e_combo');
  v_total := (public.mapa_ler_v2(k_p1) ->> 'total_casas')::int;
  if v_total <> v_esperado or public.caca_grupo_total(ed) <> v_esperado or (public.caca_metas_ler(k_p1) ->> 'total_casas')::int <> v_esperado
    then raise exception 'total deveria ser % em todo lugar (ler %, grupo %)', v_esperado, v_total, public.caca_grupo_total(ed); end if;
  r := public.mapa_carimbar_casa(k_p1, hw.slug, null, null, null);
  if r ->> 'motivo' is distinct from 'casa_sem_combo' then raise exception 'carimbo em casa sem combo: %', r; end if;
  r := public.mapa_carimbar(k_p1, hw.qr, null, null, null);
  if r ->> 'motivo' is distinct from 'casa_sem_combo' then raise exception 'carimbo por QR em casa sem combo: %', r; end if;
  if exists (select 1 from public.carimbos k where k.participacao_id = hw.participacao) then raise exception 'carimbou casa sem combo'; end if;

  -- SEC-04. Encerrar uma casa já carimbada tira os carimbos dela do progresso junto com o total.
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em) values
    (id_p3, hy.participacao, hy.pu, hy.qr, true, now() - interval '6 hours'),
    (id_p3, hz.participacao, hz.pu, hz.qr, true, now() - interval '6 hours');
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas, criado_em) values
    (ed, hy.participacao, 'Teste', 'p3@exemplo.com.br', '{}'::jsonb, now() - interval '5 hours'),
    (ed, hz.participacao, 'Teste', 'p3@exemplo.com.br', '{}'::jsonb, now() - interval '5 hours');
  if not exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'p3@exemplo.com.br' and p.casas = 2) then raise exception 'P3 deveria ter 2 casas'; end if;
  v_antes := public.caca_total_casas(ed);
  update public.participacoes set status_cadastro = 'encerrado' where id = hz.participacao;
  if public.caca_total_casas(ed) <> v_antes - 1 then raise exception 'casa encerrada deveria sair do total'; end if;
  if not exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'p3@exemplo.com.br' and p.casas = 1) then raise exception 'casa encerrada ainda contava para P3'; end if;
  if (public.mapa_ler_v2(k_p3) ->> 'casas_validadas')::int <> 1 then raise exception 'mapa_ler_v2 de P3 após encerrar'; end if;

  -- Fontes internas fechadas.
  if has_function_privilege('anon', 'public.caca_casas_conta(text)', 'execute') or has_function_privilege('anon', 'public.caca_carimbo_conta(uuid,text)', 'execute')
    then raise exception 'função interna aberta'; end if;

  raise exception 'TESTE_OK total=%', public.caca_total_casas(ed);
end $t$;
