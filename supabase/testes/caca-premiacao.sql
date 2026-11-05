-- Caça aos Carimbos, premiação (migration 20261204). Roda DEPOIS da migration, numa só execução, e SEMPRE termina em
-- exceção: TESTE_OK = passou; nada fica no banco (tudo, inclusive public.pode trocada e as funções pg_temp, é desfeito).
-- Isola os dados: anula (só dentro da transação) qualquer carimbo existente, para o ranking ser só o das pessoas do teste.
-- Não usa o GPS. Nenhum sorteio real: o "real" roda dentro desta transação e some com a exceção final.
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

create or replace function pg_temp.t(p_d date, p_h int, p_m int default 0) returns timestamptz language sql as
$f$ select ((p_d + make_time(p_h, p_m, 0)) at time zone 'America/Fortaleza') $f$;

create or replace function pg_temp.espera(p_sql text, p_msg text) returns void language plpgsql as $f$
begin
  execute p_sql;
  raise exception 'NAO_FALHOU: %', p_sql;
exception when others then
  if sqlerrm not like p_msg then raise exception 'esperava [%] veio [%] em: %', p_msg, sqlerrm, p_sql; end if;
end $f$;

create or replace function pg_temp.car(p_mapa uuid, p_part uuid, p_unid uuid, p_qr text, p_ts timestamptz) returns void language sql as
$f$ insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
    values (p_mapa, p_part, p_unid, p_qr, true, p_ts) $f$;

create or replace function pg_temp.ava(p_ed text, p_email text, p_part uuid, p_ts timestamptz) returns void language sql as
$f$ insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas, criado_em)
    values (p_ed, p_part, 'Teste', p_email, '{}'::jsonb, p_ts) $f$;

-- Completa o mapa: 1 carimbo + 1 avaliação em cada casa publicada que a pessoa ainda não tem.
create or replace function pg_temp.completar(p_ed text, p_mapa uuid, p_email text) returns void language plpgsql as $f$
begin
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
  select distinct on (pa.id) p_mapa, pa.id, pu.id, q.codigo, true, now() - interval '2 hours'
    from public.publicacoes pb join public.participacoes pa on pa.id = pb.participacao_id and pb.vigente
    join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = p_ed
     and not exists (select 1 from public.carimbos k where k.mapa_id = p_mapa and k.participacao_id = pa.id and k.anulado_em is null);
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas, criado_em)
  select p_ed, pa.id, 'Teste', p_email, '{}'::jsonb, now() - interval '1 hour'
    from public.publicacoes pb join public.participacoes pa on pa.id = pb.participacao_id and pb.vigente
   where pa.edicao_codigo = p_ed
     and not exists (select 1 from public.avaliacoes a where a.edicao_codigo = p_ed and a.participacao_id = pa.id and a.email_norm = p_email);
end $f$;

do $t$
declare
  ed constant text := '2026.2';
  ca record; cb record; v_total int;
  hoje date := (now() at time zone 'America/Fortaleza')::date;
  d1 date := (now() at time zone 'America/Fortaleza')::date - 3;
  d2 date := (now() at time zone 'America/Fortaleza')::date - 2;
  d3 date := (now() at time zone 'America/Fortaleza')::date - 1;
  ch text; m1 uuid; m2 uuid; m3 uuid; m4 uuid; m5 uuid; m6 uuid; m7 uuid;
  e1 constant text := 'p1@exemplo.com.br'; e2 constant text := 'p2@exemplo.com.br'; e3 constant text := 'p3@exemplo.com.br';
  e4 constant text := 'p4@exemplo.com.br'; e5 constant text := 'p5@exemplo.com.br'; e6 constant text := 'p6@exemplo.com.br';
  e7 constant text := 'p7@exemplo.com.br';
  r jsonb; r2 jsonb; prem1 uuid; prem2 uuid; prem3 uuid; prem3b uuid; prem3c uuid; prem3d uuid;
  v_hash text; v_a text; v_b text; v_c text; v_y text; v_set text[] := '{}'; v_n int; v_tem boolean;
  pesos int[]; cont int[]; pick int[]; i int; k int; w numeric := 415;
begin
  -- Isolamento: nada de carimbo real entra no ranking durante o teste.
  update public.carimbos set anulado_em = now(), anulado_motivo = 'teste' where anulado_em is null;

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

  ch := public.mapa_criar(ed, 'P1', e1, null, true, true) ->> 'chave'; select id into m1 from public.mapas_lover where chave_hash = public.mapa_hash(ch);
  ch := public.mapa_criar(ed, 'P2', e2, null, true, true) ->> 'chave'; select id into m2 from public.mapas_lover where chave_hash = public.mapa_hash(ch);
  ch := public.mapa_criar(ed, 'P3', e3, null, true, true) ->> 'chave'; select id into m3 from public.mapas_lover where chave_hash = public.mapa_hash(ch);
  ch := public.mapa_criar(ed, 'P4', e4, null, true, true) ->> 'chave'; select id into m4 from public.mapas_lover where chave_hash = public.mapa_hash(ch);
  ch := public.mapa_criar(ed, 'P5', e5, null, true, true) ->> 'chave'; select id into m5 from public.mapas_lover where chave_hash = public.mapa_hash(ch);
  ch := public.mapa_criar(ed, 'P6', e6, null, true, true) ->> 'chave'; select id into m6 from public.mapas_lover where chave_hash = public.mapa_hash(ch);
  ch := public.mapa_criar(ed, 'P7', e7, null, true, true) ->> 'chave'; select id into m7 from public.mapas_lover where chave_hash = public.mapa_hash(ch);

  -- Dados (horas de Natal).
  -- P1: d1 A10 B11 A12 (extra); avaliou A,B d1 13h        -> d1: 2 casas + 1 extra
  -- P2: d1 A14 B14:30; avaliou d1 15h                     -> d1: 2 casas
  -- P3, P4, P5: d1 A10, avaliaram d1 11h                  -> d1: 1 casa
  -- P6: d2 A10, avaliou d2 11h                            -> entra só em d2
  -- P7: d1 A10, MAS avaliou só d2 09h (depois do corte de d1) -> pendente em d1, entra em d2
  perform pg_temp.car(m1, ca.participacao, ca.unidade, ca.qr, pg_temp.t(d1, 10));
  perform pg_temp.car(m1, cb.participacao, cb.unidade, cb.qr, pg_temp.t(d1, 11));
  perform pg_temp.car(m1, ca.participacao, ca.unidade, ca.qr, pg_temp.t(d1, 12));
  perform pg_temp.ava(ed, e1, ca.participacao, pg_temp.t(d1, 13)); perform pg_temp.ava(ed, e1, cb.participacao, pg_temp.t(d1, 13));
  perform pg_temp.car(m2, ca.participacao, ca.unidade, ca.qr, pg_temp.t(d1, 14));
  perform pg_temp.car(m2, cb.participacao, cb.unidade, cb.qr, pg_temp.t(d1, 14, 30));
  perform pg_temp.ava(ed, e2, ca.participacao, pg_temp.t(d1, 15)); perform pg_temp.ava(ed, e2, cb.participacao, pg_temp.t(d1, 15));
  perform pg_temp.car(m3, ca.participacao, ca.unidade, ca.qr, pg_temp.t(d1, 10)); perform pg_temp.ava(ed, e3, ca.participacao, pg_temp.t(d1, 11));
  perform pg_temp.car(m4, ca.participacao, ca.unidade, ca.qr, pg_temp.t(d1, 10)); perform pg_temp.ava(ed, e4, ca.participacao, pg_temp.t(d1, 11));
  perform pg_temp.car(m5, ca.participacao, ca.unidade, ca.qr, pg_temp.t(d1, 10)); perform pg_temp.ava(ed, e5, ca.participacao, pg_temp.t(d1, 11));
  perform pg_temp.car(m6, ca.participacao, ca.unidade, ca.qr, pg_temp.t(d2, 10)); perform pg_temp.ava(ed, e6, ca.participacao, pg_temp.t(d2, 11));
  perform pg_temp.car(m7, ca.participacao, ca.unidade, ca.qr, pg_temp.t(d1, 10)); perform pg_temp.ava(ed, e7, ca.participacao, pg_temp.t(d2, 9));

  -- 0. Configuração: defaults, validação, auditoria.
  r := public.caca_config_ler('x');
  if (r -> 'peso_base' ->> 'valor')::int <> 100 or (r -> 'ganhadores_final' ->> 'valor')::int <> 3
     or (r -> 'prazo_segunda_chamada_min' ->> 'valor')::int <> 120 or not (r -> 'prazo_segunda_chamada_min' ->> 'proposta')::boolean
     or r -> 'voucher_dias' -> 'valor' ->> 4 <> '2026-11-11' or r -> 'fuso' ->> 'valor' <> 'America/Fortaleza'
     or r -> 'voucher_validade_ate' ->> 'valor' <> '2026-11-15' or r -> 'corte_hora_local' ->> 'valor' <> '23:59'
     or (r -> 'prazo_confirmacao_proximo_dia_hora' ->> 'valor')::int <> 12 or (r -> 'intervalo_carimbo_h' ->> 'valor')::int <> 12
    then raise exception 'defaults da config: %', r; end if;
  perform pg_temp.espera(format('select public.caca_config_gravar(%L,%L,%L::jsonb)', 'x', 'inventada', '1'), 'chave_desconhecida');
  perform pg_temp.espera(format('select public.caca_config_gravar(%L,%L,%L::jsonb)', 'x', 'peso_base', '"cem"'), 'valor_invalido');
  perform pg_temp.espera(format('select public.caca_config_gravar(%L,%L,%L::jsonb)', 'x', 'fuso', '"Marte/Olimpo"'), 'valor_invalido');
  perform pg_temp.espera(format('select public.caca_config_gravar(%L,%L,%L::jsonb)', 'x', 'voucher_dias', '["2026-13-45"]'), 'valor_invalido');
  perform pg_temp.espera(format('select public.caca_config_gravar(%L,%L,%L::jsonb)', 'x', 'corte_hora_local', '"25:99"'), 'valor_invalido');
  perform pg_temp.espera(format('select public.caca_config_gravar(%L,%L,%L::jsonb)', 'x', 'ganhadores_final', '0'), 'valor_invalido');
  perform public.caca_config_gravar('x', 'voucher_dias', to_jsonb(array[d1::text, d2::text, d3::text, hoje::text]));
  if (public.caca_config_ler('x') -> 'voucher_dias' -> 'valor' ->> 3) <> hoje::text then raise exception 'voucher_dias não gravou'; end if;
  if not exists (select 1 from public.caca_evento where acao = 'config_gravar' and depois ->> 'chave' = 'voucher_dias') then raise exception 'config sem auditoria'; end if;

  -- 1. Guardas do dia.
  perform pg_temp.espera(format('select public.caca_apurar_dia(%L,%L,%L::date)', 'x', ed, hoje + 9), 'dia_fora_do_periodo');
  perform pg_temp.espera(format('select public.caca_apurar_dia(%L,%L,%L::date)', 'x', ed, hoje), 'dia_nao_encerrado');

  -- 2. Apura d1: P1 lidera (2 casas + 1 extra); P7 (avaliou depois do corte) e P6 (só em d2) ficam de fora da foto.
  r := public.caca_apurar_dia('x', ed, d1);
  prem1 := (r -> 'premio' ->> 'id')::uuid;
  if r -> 'premio' ->> 'apelido' <> 'P1' or r -> 'premio' ->> 'estado' <> 'selecionado' or r -> 'premio' ->> 'dia' <> d1::text
     or (r -> 'premio' -> 'detalhe' ->> 'casas')::int <> 2 or (r -> 'premio' -> 'detalhe' ->> 'extras')::int <> 1
     or (r -> 'premio' ->> 'email_confirmado')::boolean then raise exception 'd1: %', r; end if;
  if (r -> 'premio' ->> 'prazo_ate')::timestamptz <> pg_temp.t(d1 + 1, 12) then raise exception 'prazo d1 deveria ser 12h do dia seguinte: %', r -> 'premio' ->> 'prazo_ate'; end if;
  if (r -> 'snapshot' ->> 'participantes')::int <> 5 or (r -> 'snapshot' ->> 'ja_existia')::boolean then raise exception 'foto d1 deveria ter 5 pessoas (P1..P5): %', r -> 'snapshot'; end if;
  if (r -> 'snapshot' ->> 'corte')::timestamptz <> pg_temp.t(d1, 23, 59) + interval '1 minute' then raise exception 'corte d1'; end if;
  v_hash := r -> 'snapshot' ->> 'hash';
  if (r -> 'premio' ->> 'email') <> e1 then raise exception 'com relatorio.ler deveria vir o contato: %', r -> 'premio'; end if;

  -- 3. Idempotência: apurar de novo devolve a mesma foto e o mesmo prêmio.
  r2 := public.caca_apurar_dia('x', ed, d1);
  if not (r2 ->> 'ja_apurado')::boolean or (r2 -> 'premio' ->> 'id')::uuid <> prem1 or r2 -> 'snapshot' ->> 'hash' <> v_hash
    then raise exception 'reapurar d1 deveria devolver o mesmo: %', r2; end if;
  if (select count(*) from public.caca_premio where tipo = 'voucher_dia' and dia = d1) <> 1 then raise exception 'd1 com mais de um prêmio'; end if;

  -- 4. A foto do dia é congelada: anular carimbo depois NÃO muda o snapshot (mas muda o ranking ao vivo).
  update public.carimbos set anulado_em = now(), anulado_motivo = 'teste' where mapa_id = m5 and anulado_em is null;
  if exists (select 1 from public.caca_ranking_v2(ed, public.caca_corte(d1)) q where q.apelido = 'P5') then raise exception 'ranking ao vivo deveria ter perdido P5'; end if;
  select count(*) into v_n from public.caca_apuracao_dia a, jsonb_array_elements(a.ranking) e
   where a.edicao_codigo = ed and a.dia = d1 and e ->> 'apelido' = 'P5' and (e ->> 'casas')::int = 1;
  if v_n <> 1 then raise exception 'a foto de d1 perdeu P5 após anulação'; end if;
  if (select hash from public.caca_apuracao_dia where edicao_codigo = ed and dia = d1) <> v_hash then raise exception 'hash mudou'; end if;
  perform pg_temp.espera(format('update public.caca_apuracao_dia set ranking = %L::jsonb where dia = %L::date', '[]', d1), 'registro_imutavel%');
  perform pg_temp.espera(format('delete from public.caca_apuracao_dia where dia = %L::date', d1), 'registro_imutavel%');
  perform pg_temp.espera('truncate public.caca_apuracao_dia', 'registro_imutavel%');
  perform pg_temp.espera('update public.caca_evento set acao = ''x''', 'registro_imutavel%');
  perform pg_temp.espera('delete from public.caca_evento', 'registro_imutavel%');

  -- 5. Transições válidas e inválidas.
  perform pg_temp.espera(format('select public.caca_premio_acao(%L,%L::uuid,%L)', 'x', prem1, 'entregar'), 'transicao_invalida');
  perform pg_temp.espera(format('select public.caca_premio_acao(%L,%L::uuid,%L)', 'x', prem1, 'dançar'), 'acao_invalida');
  perform pg_temp.espera(format('select public.caca_premio_acao(%L,%L::uuid,%L)', 'x', gen_random_uuid(), 'confirmar'), 'premio_nao_encontrado');
  perform pg_temp.espera(format('select public.caca_premio_acao(%L,%L::uuid,%L)', 'x', prem1, 'confirmar'), 'email_nao_confirmado');   -- 20261218
  update public.mapas_lover set email_confirmado_em = now() where edicao_codigo = ed and email_norm = (select pessoa from public.caca_premio where id = prem1);
  r := public.caca_premio_acao('x', prem1, 'confirmar', 'conferido');
  update public.mapas_lover set email_confirmado_em = null where edicao_codigo = ed and email_norm = (select pessoa from public.caca_premio where id = prem1);
  if r -> 'premio' ->> 'estado' <> 'confirmado' or (r -> 'premio' ->> 'prazo_ate') is not null or r -> 'premio' ->> 'motivo' <> 'conferido'
    then raise exception 'confirmar: %', r; end if;

  -- 6. d2: P1 (confirmado) sai das apurações seguintes, mesmo liderando; P2 é o escolhido. Foto d2 tem P6 e P7 (avaliação 09h de d2).
  r := public.caca_apurar_dia('x', ed, d2);
  prem2 := (r -> 'premio' ->> 'id')::uuid;
  if r -> 'premio' ->> 'apelido' <> 'P2' or r -> 'premio' ->> 'estado' <> 'selecionado' then raise exception 'd2 deveria escolher P2 (P1 já ganhou): %', r -> 'premio'; end if;
  if (r -> 'snapshot' ->> 'participantes')::int <> 6 then raise exception 'foto d2 deveria ter 6 pessoas (P1-P4, P6, P7): %', r -> 'snapshot'; end if;
  if (r -> 'premio' ->> 'prazo_ate')::timestamptz <> pg_temp.t(d2 + 1, 12) then raise exception 'prazo d2'; end if;

  -- 7. d3: P1 (confirmado) e P2 (selecionado pendente, temporário) ficam de fora; 4 empatados (P3, P4, P6, P7) -> sorteio com semente.
  --    Mesma semente = mesmo resultado (cada tentativa roda em sub-transação desfeita).
  for i in 1 .. 2 loop
    begin
      r := public.caca_apurar_dia('x', ed, d3, 'semente-A');
      if i = 1 then v_a := r -> 'premio' ->> 'email'; else v_b := r -> 'premio' ->> 'email'; end if;
      raise exception 'RB';
    exception when others then
      if sqlerrm <> 'RB' then raise; end if;
    end;
  end loop;
  if v_a is null or v_a <> v_b then raise exception 'mesma semente deveria dar o mesmo sorteado: % x %', v_a, v_b; end if;
  if v_a not in (e3, e4, e6, e7) then raise exception 'sorteado fora do grupo de empatados: %', v_a; end if;
  if exists (select 1 from public.caca_premio where dia = d3) or exists (select 1 from public.caca_apuracao_dia where dia = d3) then raise exception 'sub-transação não desfez'; end if;
  for i in 1 .. 14 loop
    begin
      r := public.caca_apurar_dia('x', ed, d3, 'sem-' || i);
      v_c := r -> 'premio' ->> 'email';
      if not (v_c = any(v_set)) then v_set := v_set || v_c; end if;
      raise exception 'RB';
    exception when others then
      if sqlerrm <> 'RB' then raise; end if;
    end;
  end loop;
  if cardinality(v_set) < 2 then raise exception 'sementes diferentes deveriam variar o sorteado: %', v_set; end if;
  if exists (select 1 from unnest(v_set) s where s not in (e3, e4, e6, e7)) then raise exception 'sorteio escolheu quem não devia: %', v_set; end if;

  r := public.caca_apurar_dia('x', ed, d3, 'semente-A');
  prem3 := (r -> 'premio' ->> 'id')::uuid;
  if r -> 'premio' ->> 'email' <> v_a or r -> 'premio' ->> 'semente' <> 'semente-A' or not (r -> 'premio' -> 'detalhe' ->> 'desempate')::boolean
     or (r -> 'premio' -> 'detalhe' ->> 'empatados')::int <> 4 then raise exception 'd3: %', r -> 'premio'; end if;

  -- 8. P2 expira (selecionado -> expirado) e VOLTA a concorrer: substituir o sorteado de d3 chama P2 (2 casas), prazo = agora + 120 min.
  r := public.caca_premio_acao('x', prem2, 'expirar', 'não respondeu');
  if r -> 'premio' ->> 'estado' <> 'expirado' then raise exception 'expirar: %', r; end if;
  r := public.caca_premio_acao('x', prem3, 'substituir', 'quem foi sorteado não apareceu');
  prem3b := (r -> 'novo_premio' ->> 'id')::uuid;
  if r -> 'premio' ->> 'estado' <> 'substituido' or r -> 'novo_premio' ->> 'email' <> e2 or r -> 'novo_premio' ->> 'estado' <> 'selecionado'
     or (r -> 'novo_premio' ->> 'substitui_id')::uuid <> prem3 or not (r -> 'novo_premio' -> 'detalhe' ->> 'segunda_chamada')::boolean
     then raise exception 'substituir deveria chamar P2: %', r; end if;
  if abs(extract(epoch from (r -> 'novo_premio' ->> 'prazo_ate')::timestamptz - now()) - 7200) > 2 then raise exception 'prazo da 2ª chamada deveria ser 120 min: %', r -> 'novo_premio'; end if;
  if (select count(*) from public.caca_premio where pessoa = e2) <> 2 then raise exception 'P2 deveria ter expirado(d2) + selecionado(d3)'; end if;

  -- 9. Prazo configurável: 30 min na próxima chamada; nem P2 nem o sorteado anterior voltam NO MESMO dia.
  perform public.caca_config_gravar('x', 'prazo_segunda_chamada_min', '30'::jsonb);
  r := public.caca_premio_acao('x', prem3b, 'substituir');
  prem3c := (r -> 'novo_premio' ->> 'id')::uuid;
  if r -> 'novo_premio' ->> 'email' in (e1, e2, e5, v_a) or r -> 'novo_premio' ->> 'email' not in (e3, e4, e6, e7) then raise exception 'próximo elegível errado: %', r -> 'novo_premio'; end if;
  if abs(extract(epoch from (r -> 'novo_premio' ->> 'prazo_ate')::timestamptz - now()) - 1800) > 2 then raise exception 'prazo deveria ser 30 min: %', r -> 'novo_premio'; end if;

  -- 10. E-mail já confirmado: o chamado nasce 'confirmado', sem prazo.
  select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mapas_lover' and column_name = 'email_confirmado_em') into v_tem;
  if v_tem then execute 'update public.mapas_lover set email_confirmado_em = now() where edicao_codigo = $1' using ed;
  else perform public.caca_config_gravar('x', 'email_confirmado_se_sem_coluna', 'true'::jsonb); end if;
  r := public.caca_premio_acao('x', prem3c, 'substituir');
  prem3d := (r -> 'novo_premio' ->> 'id')::uuid;
  if r -> 'novo_premio' ->> 'estado' <> 'confirmado' or (r -> 'novo_premio' ->> 'prazo_ate') is not null or not (r -> 'novo_premio' ->> 'email_confirmado')::boolean
    then raise exception 'e-mail confirmado deveria nascer confirmado: %', r -> 'novo_premio'; end if;
  select pessoa into v_y from public.caca_premio where id = prem3d;

  -- 11. Índices únicos: 2 ativos da mesma pessoa, ou 2 ativos no mesmo dia, são impossíveis.
  perform pg_temp.espera(format($q$insert into public.caca_premio (edicao_codigo, tipo, dia, pessoa, estado) values (%L,'voucher_dia',%L::date,%L,'selecionado')$q$, ed, d2, v_y),
                         'duplicate key%caca_premio_voucher_pessoa_ativo%');
  perform pg_temp.espera(format($q$insert into public.caca_premio (edicao_codigo, tipo, dia, pessoa, estado) values (%L,'voucher_dia',%L::date,%L,'selecionado')$q$, ed, d3, e5),
                         'duplicate key%caca_premio_voucher_dia_ativo%');

  -- 12. Entrega e transições proibidas.
  r := public.caca_premio_acao('x', prem3d, 'entregar');
  if r -> 'premio' ->> 'estado' <> 'entregue' then raise exception 'entregar: %', r; end if;
  perform pg_temp.espera(format('select public.caca_premio_acao(%L,%L::uuid,%L)', 'x', prem3d, 'cancelar'), 'transicao_invalida');
  perform pg_temp.espera(format('select public.caca_premio_acao(%L,%L::uuid,%L)', 'x', prem3d, 'substituir'), 'transicao_invalida');
  perform pg_temp.espera(format('select public.caca_premio_acao(%L,%L::uuid,%L)', 'x', prem1, 'expirar'), 'transicao_invalida');
  perform pg_temp.espera(format('select public.caca_premio_acao(%L,%L::uuid,%L)', 'x', prem2, 'confirmar'), 'transicao_invalida');

  -- 13. Auditoria: todo passo deixou evento (quem/ação/antes/depois).
  select count(*) into v_n from public.caca_evento where premio_id in (prem1, prem2, prem3, prem3b, prem3c, prem3d);
  if v_n < 11 then raise exception 'poucos eventos de auditoria: %', v_n; end if;
  if exists (select 1 from public.caca_evento where acao in ('confirmar', 'expirar', 'substituir', 'entregar') and (ator is null or antes is null or depois is null))
    then raise exception 'evento sem ator/antes/depois'; end if;

  -- 14. Sem relatorio.ler: nenhum e-mail/WhatsApp aparece. Sem permissão alguma: tudo recusa.
  execute $q$create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select p_acao <> 'relatorio.ler' $f$$q$;
  r := public.caca_premio_listar('x', ed);
  if r::text like '%exemplo.com.br%' then raise exception 'listar vazou contato sem relatorio.ler'; end if;
  if jsonb_array_length(r -> 'premios') <> 6 or jsonb_array_length(r -> 'apuracoes') <> 3 then raise exception 'listar: % prêmios, % apurações', jsonb_array_length(r -> 'premios'), jsonb_array_length(r -> 'apuracoes'); end if;
  if public.caca_apurar_dia('x', ed, d1)::text like '%exemplo.com.br%' then raise exception 'apurar vazou contato'; end if;
  if public.caca_sorteio_final('x', ed, 'qualquer', true)::text like '%exemplo.com.br%' then raise exception 'sorteio vazou contato'; end if;
  execute $q$create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select false $f$$q$;
  perform pg_temp.espera(format('select public.caca_config_ler(%L)', 'x'), 'nao_autorizado');
  perform pg_temp.espera(format('select public.caca_config_gravar(%L,%L,%L::jsonb)', 'x', 'peso_base', '1'), 'nao_autorizado');
  perform pg_temp.espera(format('select public.caca_apurar_dia(%L,%L,%L::date)', 'x', ed, d1), 'nao_autorizado');
  perform pg_temp.espera(format('select public.caca_premio_acao(%L,%L::uuid,%L)', 'x', prem1, 'entregar'), 'nao_autorizado');
  perform pg_temp.espera(format('select public.caca_premio_listar(%L,%L)', 'x', ed), 'nao_autorizado');
  perform pg_temp.espera(format('select public.caca_sorteio_final(%L,%L,%L)', 'x', ed, 's'), 'nao_autorizado');
  execute $q$create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$$q$;

  -- 15a. Prêmio final com até 3 completos: todos ganham; vagas restantes por mais casas, depois sorteio.
  perform pg_temp.completar(ed, m1, e1);
  v_total := public.caca_total_casas(ed);
  if v_total < 5 then raise exception 'o teste precisa de ao menos 5 casas publicadas (tem %)', v_total; end if;
  if (select q.casas from public.caca_placar_v2(ed) q where q.pessoa = e1) <> v_total then raise exception 'P1 não completou o mapa'; end if;
  perform pg_temp.espera(format('select public.caca_sorteio_final(%L,%L,%L)', 'x', ed, '  '), 'semente_obrigatoria');
  r := public.caca_sorteio_final('x', ed, 'final-a', true);
  if (r ->> 'completos')::int <> 1 or r ->> 'regra' <> 'todos_completos_ganham' or jsonb_array_length(r -> 'ganhadores') <> 3 or jsonb_array_length(r -> 'concorrentes') <> 1
     or r -> 'ganhadores' -> 0 ->> 'email' <> e1 or r -> 'ganhadores' -> 0 ->> 'motivo' <> 'completo'
     or r -> 'ganhadores' -> 1 ->> 'email' <> e2 or r -> 'ganhadores' -> 1 ->> 'motivo' <> 'vaga_restante'
     or r -> 'ganhadores' -> 2 ->> 'motivo' <> 'vaga_restante_sorteio' or r -> 'ganhadores' -> 2 ->> 'email' not in (e3, e4, e6, e7)
    then raise exception 'final (<=3 completos): %', r; end if;
  if public.caca_sorteio_final('x', ed, 'final-a', true) -> 'ganhadores' <> r -> 'ganhadores' then raise exception 'mesma semente deveria repetir o final'; end if;
  if exists (select 1 from public.caca_premio where tipo = 'final') or exists (select 1 from public.caca_evento where acao like 'sorteio_final%') then raise exception 'simulação gravou'; end if;

  -- 15b. Mais de 3 completos: sorteio ponderado sem reposição (peso = 100 + extras).
  perform pg_temp.completar(ed, m2, e2); perform pg_temp.completar(ed, m3, e3); perform pg_temp.completar(ed, m4, e4);
  r := public.caca_sorteio_final('x', ed, 'final-b', true);
  if (r ->> 'completos')::int <> 4 or r ->> 'regra' <> 'sorteio_ponderado' or jsonb_array_length(r -> 'ganhadores') <> 3 or jsonb_array_length(r -> 'concorrentes') <> 4
    then raise exception 'final (>3 completos): %', r; end if;
  if (select sum((c ->> 'peso')::int) from jsonb_array_elements(r -> 'concorrentes') c) <> 401 then raise exception 'pesos deveriam somar 100+101+100+100: %', r -> 'concorrentes'; end if;
  if (select count(distinct g ->> 'email') from jsonb_array_elements(r -> 'ganhadores') g) <> 3 then raise exception 'ganhadores repetidos: %', r -> 'ganhadores'; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'ganhadores') g where g ->> 'email' not in (e1, e2, e3, e4) or g ->> 'motivo' <> 'sorteio_ponderado') then raise exception 'ganhador fora dos completos: %', r -> 'ganhadores'; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'concorrentes') c where c ->> 'email' = e1 and (c ->> 'peso')::int = 101) then raise exception 'P1 (1 extra) deveria pesar 101: %', r -> 'concorrentes'; end if;
  if public.caca_sorteio_final('x', ed, 'final-b', true) -> 'ganhadores' <> r -> 'ganhadores' or public.caca_sorteio_final('x', ed, 'final-b', true) ->> 'hash_verificacao' <> r ->> 'hash_verificacao'
    then raise exception 'mesma semente deveria repetir o sorteio ponderado'; end if;
  v_set := '{}';
  for i in 1 .. 20 loop
    v_set := v_set || (select string_agg(g ->> 'email', ',' order by g ->> 'email') from jsonb_array_elements(public.caca_sorteio_final('x', ed, 'v-' || i, true) -> 'ganhadores') g);
  end loop;
  if (select count(distinct s) from unnest(v_set) s) < 3 then raise exception 'sementes diferentes deveriam variar os ganhadores'; end if;
  if exists (select 1 from public.caca_premio where tipo = 'final') or exists (select 1 from public.caca_evento where acao like 'sorteio_final%') then raise exception 'simulação gravou'; end if;

  -- 15c. Sorteio "real" (só dentro desta transação): grava 3 prêmios + eventos, uma vez só; ganhar voucher não exclui (P1 concorre).
  -- 20261212 (SEC-07): o sorteio real exige a semente comprometida antes do fim da avaliação e a avaliação encerrada.
  update public.edicao_publicacao set fase = 'em_andamento', avaliacao_aberta = true, avaliacao_abre_em = now() - interval '3 days',
         avaliacao_fecha_em = now() + interval '1 day' where edicao_codigo = ed;
  perform public.caca_sorteio_comprometer('x', ed, encode(extensions.digest('final-b', 'sha256'), 'hex'));
  update public.edicao_publicacao set avaliacao_fecha_em = now() - interval '1 minute' where edicao_codigo = ed;
  r2 := public.caca_sorteio_final('x', ed, 'final-b', false);
  if r2 -> 'ganhadores' <> r -> 'ganhadores' then raise exception 'o real deveria repetir a simulação com a mesma semente'; end if;
  if (select count(*) from public.caca_premio where tipo = 'final' and estado = 'selecionado' and semente = 'final-b') <> 3
     or (select array_agg(posicao order by posicao) from public.caca_premio where tipo = 'final') <> array[1, 2, 3]
     or (select count(*) from public.caca_evento where acao = 'sorteio_final') <> 3 or (select count(*) from public.caca_evento where acao = 'sorteio_final_realizado') <> 1
    then raise exception 'sorteio real não gravou o esperado'; end if;
  perform pg_temp.espera(format('select public.caca_sorteio_final(%L,%L,%L,false)', 'x', ed, 'outra'), 'sorteio_final_ja_realizado');
  if (public.caca_sorteio_final('x', ed, 'outra', true) ->> 'simulacao')::boolean is not true or (select count(*) from public.caca_premio where tipo = 'final') <> 3 then raise exception 'simular depois do real não pode gravar'; end if;
  select id into prem1 from public.caca_premio where tipo = 'final' and posicao = 1;
  perform pg_temp.espera(format('select public.caca_premio_acao(%L,%L::uuid,%L)', 'x', prem1, 'substituir'), 'transicao_invalida');
  if public.caca_premio_acao('x', prem1, 'confirmar') -> 'premio' ->> 'estado' <> 'confirmado' then raise exception 'confirmar final'; end if;

  -- 16. Pesos 100 / 100 / 105 / 110: distribuição empírica do 1º sorteado em 30 000 sementes (esperado peso / 415) e prova pela soma.
  pesos := array[100, 100, 105, 110]; cont := array[0, 0, 0, 0];
  for i in 1 .. 30000 loop
    pick := public.caca_sorteio_ponderado('estat-' || i, pesos, 1);
    cont[pick[1]] := cont[pick[1]] + 1;
  end loop;
  for k in 1 .. 4 loop
    if abs(cont[k]::numeric / 30000 - pesos[k] / w) > 0.012 then raise exception 'distribuição fora do esperado: peso % deu % de 30000 (esperado %)', pesos[k], cont[k], round(30000 * pesos[k] / w); end if;
  end loop;
  if not (cont[4] > cont[1]) then raise exception 'quem pesa mais deveria sair mais: %', cont; end if;
  for i in 1 .. 2000 loop
    pick := public.caca_sorteio_ponderado('tres-' || i, pesos, 3);
    if cardinality(pick) <> 3 or pick[1] = pick[2] or pick[1] = pick[3] or pick[2] = pick[3] or exists (select 1 from unnest(pick) q where q not between 1 and 4)
      then raise exception 'sorteio sem reposição falhou: %', pick; end if;
  end loop;
  if exists (select 1 from generate_series(1, 2000) g where public.caca_prng('p', g) < 0 or public.caca_prng('p', g) >= 1) then raise exception 'prng fora de [0,1)'; end if;
  if public.caca_prng('p', 7) <> public.caca_prng('p', 7) or public.caca_prng('p', 7) = public.caca_prng('p', 8) then raise exception 'prng não determinístico/variável'; end if;

  raise exception 'TESTE_OK casas=% dist=%', v_total, cont;
end $t$;
