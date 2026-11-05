-- Caça aos Carimbos, carimbo em casa de unidades mistas e correções de 20261217_caca_carimbo_premio_correcao (achados C01, C02, C04, C09,
-- SEC-04, SEC-05). Roda DEPOIS das migrations, numa transação, e SEMPRE termina em exceção: TESTE_OK = passou; nada fica no banco.
-- Cenário "Marianas": casa com 2 unidades e QR, uma com ponto conferido e outra sem. Troca public.pode só aqui dentro.
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

do $t$
declare
  ed constant text := '2026.2';
  hx record; hy record; k1 text; k9a text; k9b text; k3 text; k5 text; r jsonb; v_id uuid; v_id2 uuid; n int; v_json jsonb;
  m1 uuid; m3 uuid;
begin
  -- Todas as casas com QR publicadas e com combo; janela aberta só na transação.
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
  select distinct pa.id, 999, 'marca_e_combo', '{}'::jsonb, true
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado'
     and not exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  update public.publicacoes set nivel = 'marca_e_combo' where vigente;
  update public.edicao_publicacao set fase = 'em_andamento', avaliacao_aberta = true, avaliacao_abre_em = now() - interval '1 day',
         avaliacao_fecha_em = now() + interval '1 day' where edicao_codigo = ed;

  -- hx = Marianas (ou outra casa com 2 unidades e QR): unidade 1 conferida, unidade 2 SEM ponto.
  select pa.id participacao, pa.slug_publico slug, array_agg(pu.id order by q.codigo) pus, array_agg(q.codigo order by q.codigo) qrs,
         array_agg(pu.unidade_id order by q.codigo) us
    into hx
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado'
   group by pa.id, pa.slug_publico having count(*) >= 2
   order by (pa.slug_publico <> 'marianas-confeitaria'), pa.id limit 1;
  if hx.participacao is null then raise exception 'falta casa com 2 unidades e QR'; end if;
  -- hy = outra casa, sem nenhuma unidade conferida.
  select distinct on (pa.id) pa.id participacao, pa.slug_publico slug, pu.id pu, q.codigo qr into hy
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' and pa.id <> hx.participacao order by pa.id limit 1;
  update public.unidades set lat = -5.8, lng = -35.2, coordenada_verificada_em = now() where id = hx.us[1];
  update public.unidades set coordenada_verificada_em = null where id = hx.us[2];
  update public.unidades set coordenada_verificada_em = null
   where id in (select pu.unidade_id from public.participacao_unidades pu where pu.participacao_id = hy.participacao);

  k1 := public.mapa_criar_v2(ed, 'P1', 'p1-mista@exemplo.com.br', null, true, true) ->> 'chave';
  select id into m1 from public.mapas_lover where chave_hash = public.mapa_hash(k1);

  -- ---- C01: QR da unidade SEM ponto em casa com unidade conferida. O GPS manda; nunca "ok" que depois não conta.
  r := public.mapa_carimbar(k1, hx.qrs[2], null, null, null);
  if r ->> 'motivo' is distinct from 'sem_localizacao' then raise exception 'sem GPS: %', r; end if;
  -- SEC-04: NaN, Infinity e fora do intervalo viram "sem_localizacao" (nunca erro de banco)
  r := public.mapa_carimbar(k1, hx.qrs[2], 'NaN'::numeric, 'Infinity'::numeric, 10);
  if r ->> 'motivo' is distinct from 'sem_localizacao' then raise exception 'NaN/Infinity: %', r; end if;
  r := public.mapa_carimbar(k1, hx.qrs[2], '-Infinity'::numeric, -35.2, 10);
  if r ->> 'motivo' is distinct from 'sem_localizacao' then raise exception '-Infinity: %', r; end if;
  r := public.mapa_carimbar(k1, hx.qrs[2], 91, -35.2, 10);
  if r ->> 'motivo' is distinct from 'sem_localizacao' then raise exception 'latitude 91: %', r; end if;
  r := public.mapa_carimbar_casa(k1, hx.slug, 'Infinity'::numeric, 'NaN'::numeric, 10);
  if r ->> 'motivo' is distinct from 'sem_localizacao' then raise exception 'mapa_carimbar_casa com Infinity: %', r; end if;
  r := public.mapa_carimbar(k1, hx.qrs[2], 0, 0, 10);
  if r ->> 'motivo' is distinct from 'longe' then raise exception 'celular longe da unidade conferida: %', r; end if;
  if exists (select 1 from public.carimbos where mapa_id = m1) then raise exception 'recusa gravou carimbo'; end if;
  r := public.mapa_carimbar(k1, hx.qrs[2], -5.8, -35.2, 10);
  if not (r ->> 'ok')::boolean or not (r ->> 'primeira')::boolean or r ? 'pontos' then raise exception 'na unidade conferida: %', r; end if;
  select k.id into v_id from public.carimbos k where k.mapa_id = m1;
  if (select origem from public.carimbos where id = v_id) <> 'gps' then raise exception 'origem deveria ser gps'; end if;
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas, criado_em)
  values (ed, hx.participacao, 'Teste', 'p1-mista@exemplo.com.br', '{}'::jsonb, now());
  v_json := public.mapa_ler_v2(k1);
  if (v_json ->> 'casas_validadas')::int <> 1 or jsonb_array_length(v_json -> 'casas') <> 1 then
    raise exception 'o carimbo de casa mista deveria contar: %', v_json; end if;
  r := public.mapa_carimbar(k1, hx.qrs[2], -5.8, -35.2, 10);
  if r ->> 'motivo' is distinct from 'cedo' then raise exception '12 h: %', r; end if;

  -- ---- C09: carimbo ANULADO não segura a janela de 12 h.
  if not public.carimbo_anular('x', v_id, 'teste') then raise exception 'anular'; end if;
  if (public.mapa_ler_v2(k1) ->> 'casas_validadas')::int <> 0 then raise exception 'anulado ainda contava'; end if;
  r := public.mapa_carimbar(k1, hx.qrs[1], -5.8, -35.2, 10);
  if not (r ->> 'ok')::boolean or not (r ->> 'primeira')::boolean then raise exception 'anulado deveria liberar e ser "primeira": %', r; end if;
  -- C09: "primeira" é por E-MAIL: o segundo mapa da mesma pessoa, depois da janela, não refaz a primeira vez.
  k9a := public.mapa_criar_v2(ed, 'N9a', 'p9-mista@exemplo.com.br', null, false, true) ->> 'chave';
  k9b := public.mapa_criar_v2(ed, 'N9b', 'p9-mista@exemplo.com.br', null, false, true) ->> 'chave';
  r := public.mapa_carimbar(k9a, hx.qrs[1], -5.8, -35.2, 10);
  if not (r ->> 'ok')::boolean or not (r ->> 'primeira')::boolean then raise exception 'p9a primeira: %', r; end if;
  update public.carimbos set criado_em = now() - interval '13 hours'
   where mapa_id in (select id from public.mapas_lover where email_norm = 'p9-mista@exemplo.com.br');
  r := public.mapa_carimbar(k9b, hx.qrs[1], -5.8, -35.2, 10);
  if not (r ->> 'ok')::boolean or (r ->> 'primeira')::boolean then raise exception 'p9b não é a primeira da pessoa: %', r; end if;

  -- ---- C02: casa SEM nenhum ponto conferido. Padrão revisao: o QR sozinho não carimba.
  k3 := public.mapa_criar_v2(ed, 'P3', 'p3-mista@exemplo.com.br', null, true, true) ->> 'chave';
  select id into m3 from public.mapas_lover where chave_hash = public.mapa_hash(k3);
  update public.caca_config set valor = '"revisao"'::jsonb where chave = 'carimbo_sem_ponto';
  r := public.mapa_carimbar(k3, hy.qr, null, null, null);
  if r ->> 'motivo' is distinct from 'sem_ponto' then raise exception 'revisao sem GPS: %', r; end if;
  r := public.mapa_carimbar(k3, hy.qr, -5.8, -35.2, 10);
  if r ->> 'motivo' is distinct from 'sem_ponto' then raise exception 'revisao com GPS: %', r; end if;
  -- Modo 'conta' (decisão do Wilker): carimba, mas o carimbo fica DISTINGUÍVEL e ANULÁVEL pela organização.
  update public.caca_config set valor = '"conta"'::jsonb where chave = 'carimbo_sem_ponto';
  r := public.mapa_carimbar(k3, hy.qr, null, null, null);
  if not (r ->> 'ok')::boolean then raise exception 'modo conta: %', r; end if;
  select k.id into v_id2 from public.carimbos k where k.mapa_id = m3;
  if (select origem from public.carimbos where id = v_id2) <> 'unidade_sem_coordenada' then raise exception 'origem sem coordenada'; end if;
  if (public.caca_carimbo_revisao_listar('x', ed) ->> 'total')::int < 1 then raise exception 'carimbo sem GPS fora da fila de revisão'; end if;
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas, criado_em)
  values (ed, hy.participacao, 'Teste', 'p3-mista@exemplo.com.br', '{}'::jsonb, now());
  if (public.mapa_ler_v2(k3) ->> 'casas_validadas')::int <> 1 then raise exception 'modo conta deveria contar'; end if;
  if not public.carimbo_anular('x', v_id2, 'sem prova de presença') then raise exception 'anular sem GPS'; end if;
  if (public.mapa_ler_v2(k3) ->> 'casas_validadas')::int <> 0 then raise exception 'anulado sem GPS ainda contava'; end if;
  update public.caca_config set valor = '"revisao"'::jsonb where chave = 'carimbo_sem_ponto';

  -- ---- SEC-04: carimbo_distancia, pedido de revisão e texto limpo
  if public.carimbo_distancia('NaN'::float8, 0, 0, 0) is not null or public.carimbo_distancia(0, 0, 'Infinity'::float8, 0) is not null
     or public.carimbo_distancia(91, 0, 0, 0) is not null or public.carimbo_distancia(0, 181, 0, 0) is not null
    then raise exception 'distância de coordenada inválida deveria ser NULL'; end if;
  if abs(public.carimbo_distancia(0, 0, 0, 1) - 111195) > 300 then raise exception 'distância de 1 grau: %', public.carimbo_distancia(0, 0, 0, 1); end if;
  k5 := public.mapa_criar_v2(ed, 'P5', 'p5-mista@exemplo.com.br', null, true, true) ->> 'chave';
  update public.mapas_lover set email_confirmado_em = now() - interval '1 hour' where email_norm = 'p5-mista@exemplo.com.br';
  r := public.caca_excecao_pedir(k5, hx.slug, 'longe', 'NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric, null);
  if not (r ->> 'ok')::boolean then raise exception 'NaN/Infinity no pedido deveria virar pedido sem posição: %', r; end if;
  if (select distancia_m from public.caca_carimbo_excecao where id = (r ->> 'id')::uuid) is not null then raise exception 'distância de posição inválida'; end if;
  r := public.caca_excecao_pedir(k5, hy.slug, 'sem_localizacao', 91, 10, 5,
                                 '<script>alert(1)</script>' || chr(8238) || 'x' || chr(8203) || chr(8206) || chr(8294) || E'\ty');
  if not (r ->> 'ok')::boolean then raise exception 'pedido com nota estranha: %', r; end if;
  if (select nota from public.caca_carimbo_excecao where id = (r ->> 'id')::uuid) !~ '^<script>alert\(1\)</script>x y$' then
    raise exception 'nota não foi limpa: %', (select nota from public.caca_carimbo_excecao where id = (r ->> 'id')::uuid); end if;
  if public.caca_texto_limpo(chr(8203) || chr(8238), 50) is not null then raise exception 'só invisíveis deveria virar NULL'; end if;
  -- apelido sem caractere invisível/de direção
  perform public.mapa_criar_v2(ed, 'A' || chr(8203) || 'b' || chr(8238), 'p6-mista@exemplo.com.br', null, false, true);
  if (select apelido from public.mapas_lover where email_norm = 'p6-mista@exemplo.com.br') <> 'Ab' then raise exception 'apelido não foi limpo'; end if;
  begin
    perform public.mapa_criar_v2(ed, 'X' || chr(8203) || chr(8203), 'p7-mista@exemplo.com.br', null, false, true);
    raise exception 'apelido só de invisíveis aceito';
  exception when others then if sqlerrm not like '%apelido_invalido%' then raise; end if; end;

  -- ---- C04: placar por pontos (regra extinta) fechado ao público; mapa_carimbar não devolve 'pontos'
  if has_function_privilege('anon', 'public.ranking_mapa(text)', 'execute') or has_function_privilege('authenticated', 'public.ranking_mapa(text)', 'execute')
     or has_function_privilege('anon', 'public.mapa_ler(text)', 'execute') or has_function_privilege('authenticated', 'public.mapa_ler(text)', 'execute')
     or has_function_privilege('anon', 'public.carimbo_placar(text)', 'execute') or has_function_privilege('anon', 'public.caca_texto_limpo(text,integer)', 'execute')
    then raise exception 'RPC legada de pontos aberta'; end if;

  -- ---- SEC-05: definir_publicacao_edicao nega por nao_autorizado (não por erro de coluna ambígua); a janela fica como estava
  update public.edicao_publicacao set avaliacao_aberta = false where edicao_codigo = ed;
  create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select false $f$;
  begin
    perform public.definir_publicacao_edicao('x', ed, '{"avaliacao_aberta": true}'::jsonb); raise exception 'anon abriu a janela';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select p_acao = 'curadoria.decidir' $f$;
  begin
    perform public.definir_publicacao_edicao('x', ed, '{"avaliacao_aberta": true}'::jsonb); raise exception 'curadoria abriu a janela';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  begin
    perform public.definir_publicacao_edicao('x', ed, '{"participantes_publicos": false, "fase": "em_andamento"}'::jsonb); raise exception 'curadoria mudou a fase';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  r := public.definir_publicacao_edicao('x', ed, '{"participantes_publicos": true}'::jsonb);
  if not (r ->> 'participantes_publicos')::boolean or (r ->> 'avaliacao_aberta')::boolean then raise exception 'curadoria mexeu na janela: %', r; end if;
  create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;
  begin
    perform public.definir_publicacao_edicao('x', ed, '{"campo_que_nao_existe": 1}'::jsonb); raise exception 'campo inválido aceito';
  exception when others then if sqlerrm <> 'campo_invalido' then raise; end if; end;
  if (select avaliacao_aberta from public.edicao_publicacao where edicao_codigo = ed) then raise exception 'a janela abriu'; end if;

  raise exception 'TESTE_OK';
end $t$;
