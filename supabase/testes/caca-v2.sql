-- Caça aos Carimbos, placar v2 (migration 20261203). Roda DEPOIS da migration, na mesma transação, e sempre termina em
-- exceção: TESTE_OK = passou; nada fica no banco. Troca public.pode só dentro da transação.
-- Insere carimbos e avaliações direto (com horas controladas); não usa o GPS. Verifica posições RELATIVAS entre as pessoas
-- do teste, então vale mesmo se já houver mapas reais (as posições absolutas deslocam, a ordem relativa não).
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

do $t$
declare
  ed constant text := '2026.2';
  ca record; cb record; v_total int; v_ids uuid[];
  ch_p1a text; ch_p1b text; ch_p2 text; ch_p3 text; ch_p4 text; ch_p5 text;
  id_p1a uuid; id_p1b uuid; id_p2 uuid; id_p3 uuid; id_p4 uuid; id_p5 uuid;
  r jsonb; a jsonb; pos_p1 int; pos_p2 int; pos_p3 int; pos_p4 int;
begin
  -- Publica as casas com QR (só na transação) para ter um total estável.
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
  select distinct pa.id, 999, 'marca_e_combo', '{}'::jsonb, true
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado'
     and not exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);

  -- Duas casas (A, B) com QR ativo.
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr into ca
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' order by pa.id limit 1;
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr into cb
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' and pa.id <> ca.participacao order by pa.id limit 1;
  if ca.participacao is null or cb.participacao is null then raise exception 'faltam 2 casas com QR'; end if;

  -- Pessoas. P1 tem DOIS mapas com o mesmo e-mail (P1b é o mais recente e não quer aparecer no ranking).
  ch_p1a := public.mapa_criar(ed, 'P1a', 'p1@exemplo.com.br', null, true, true) ->> 'chave';
  ch_p1b := public.mapa_criar(ed, 'P1b', 'p1@exemplo.com.br', null, false, true) ->> 'chave';
  ch_p2  := public.mapa_criar(ed, 'P2',  'p2@exemplo.com.br', null, true, true) ->> 'chave';
  ch_p3  := public.mapa_criar(ed, 'P3',  'p3@exemplo.com.br', null, true, true) ->> 'chave';
  ch_p4  := public.mapa_criar(ed, 'P4',  'p4@exemplo.com.br', null, true, true) ->> 'chave';
  ch_p5  := public.mapa_criar(ed, 'P5',  'p5@exemplo.com.br', null, true, true) ->> 'chave';
  select id into id_p1a from public.mapas_lover where chave_hash = public.mapa_hash(ch_p1a);
  select id into id_p1b from public.mapas_lover where chave_hash = public.mapa_hash(ch_p1b);
  select id into id_p2  from public.mapas_lover where chave_hash = public.mapa_hash(ch_p2);
  select id into id_p3  from public.mapas_lover where chave_hash = public.mapa_hash(ch_p3);
  select id into id_p4  from public.mapas_lover where chave_hash = public.mapa_hash(ch_p4);
  select id into id_p5  from public.mapas_lover where chave_hash = public.mapa_hash(ch_p5);
  update public.mapas_lover set criado_em = now() - interval '10 days' where id = id_p1a;  -- P1b fica o mais recente

  -- Carimbos (horas atrás) e avaliações.
  -- P1: A -72h (mapa a), A -48h (mapa b), B -30h; avaliou A há 60h e B há 10h.   -> final: 2 casas, 1 extra
  -- P2 e P4 (iguais): A -50h, B -40h; avaliaram A -45h e B -35h.                 -> 2 casas, 0 extras
  -- P3: A -100h, -80h, -60h; avaliou A -90h.                                     -> 1 casa, 2 extras
  -- P5: A -5h, sem avaliar.                                                      -> pendente, fora do placar
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em) values
    (id_p1a, ca.participacao, ca.unidade, ca.qr, true, now() - interval '72 hours'),
    (id_p1b, ca.participacao, ca.unidade, ca.qr, true, now() - interval '48 hours'),
    (id_p1a, cb.participacao, cb.unidade, cb.qr, true, now() - interval '30 hours'),
    (id_p2,  ca.participacao, ca.unidade, ca.qr, true, now() - interval '50 hours'),
    (id_p2,  cb.participacao, cb.unidade, cb.qr, true, now() - interval '40 hours'),
    (id_p4,  ca.participacao, ca.unidade, ca.qr, true, now() - interval '50 hours'),
    (id_p4,  cb.participacao, cb.unidade, cb.qr, true, now() - interval '40 hours'),
    (id_p3,  ca.participacao, ca.unidade, ca.qr, true, now() - interval '100 hours'),
    (id_p3,  ca.participacao, ca.unidade, ca.qr, true, now() - interval '80 hours'),
    (id_p3,  ca.participacao, ca.unidade, ca.qr, true, now() - interval '60 hours'),
    (id_p5,  ca.participacao, ca.unidade, ca.qr, true, now() - interval '5 hours');
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas, criado_em) values
    (ed, ca.participacao, 'Teste', 'p1@exemplo.com.br', '{}'::jsonb, now() - interval '60 hours'),
    (ed, cb.participacao, 'Teste', 'p1@exemplo.com.br', '{}'::jsonb, now() - interval '10 hours'),
    (ed, ca.participacao, 'Teste', 'p2@exemplo.com.br', '{}'::jsonb, now() - interval '45 hours'),
    (ed, cb.participacao, 'Teste', 'p2@exemplo.com.br', '{}'::jsonb, now() - interval '35 hours'),
    (ed, ca.participacao, 'Teste', 'p4@exemplo.com.br', '{}'::jsonb, now() - interval '45 hours'),
    (ed, cb.participacao, 'Teste', 'p4@exemplo.com.br', '{}'::jsonb, now() - interval '35 hours'),
    (ed, ca.participacao, 'Teste', 'p3@exemplo.com.br', '{}'::jsonb, now() - interval '90 hours');

  -- 1. Placar agora: casas e extras por PESSOA (os dois mapas de P1 viram uma pessoa; perfil = mapa mais recente).
  if not exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'p1@exemplo.com.br' and p.casas = 2 and p.extras = 1 and p.apelido = 'P1b')
    then raise exception 'P1 deveria ser 2 casas + 1 extra, perfil P1b'; end if;
  if (select count(*) from public.caca_placar_v2(ed) p where p.pessoa = 'p1@exemplo.com.br') <> 1 then raise exception 'P1 apareceu mais de uma vez'; end if;
  if not exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'p2@exemplo.com.br' and p.casas = 2 and p.extras = 0) then raise exception 'P2'; end if;
  if not exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'p3@exemplo.com.br' and p.casas = 1 and p.extras = 2) then raise exception 'P3'; end if;
  if exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'p5@exemplo.com.br') then raise exception 'P5 pendente entrou no placar'; end if;

  -- 2. Ranking: casas, depois extras; empate = mesma posição (sem desempate por hora); a seguinte pula posições.
  select r1.pos into pos_p1 from public.caca_ranking_v2(ed) r1 where r1.pessoa = 'p1@exemplo.com.br';
  select r1.pos into pos_p2 from public.caca_ranking_v2(ed) r1 where r1.pessoa = 'p2@exemplo.com.br';
  select r1.pos into pos_p4 from public.caca_ranking_v2(ed) r1 where r1.pessoa = 'p4@exemplo.com.br';
  select r1.pos into pos_p3 from public.caca_ranking_v2(ed) r1 where r1.pessoa = 'p3@exemplo.com.br';
  if not (pos_p1 < pos_p2) then raise exception 'mais extras deveria ganhar: P1 % x P2 %', pos_p1, pos_p2; end if;
  if pos_p2 <> pos_p4 then raise exception 'empate real deveria ter a mesma posição: % x %', pos_p2, pos_p4; end if;
  if pos_p3 <> pos_p2 + 2 then raise exception 'rank deveria pular após empate de 2: P3 % x P2 %', pos_p3, pos_p2; end if;

  -- 3. Corte: 20 h atrás a avaliação de B de P1 (há 10 h) ainda não existia -> P1 cai para 1 casa + 1 extra.
  if not exists (select 1 from public.caca_placar_v2(ed, now() - interval '20 hours') p where p.pessoa = 'p1@exemplo.com.br' and p.casas = 1 and p.extras = 1)
    then raise exception 'corte: P1 deveria ter 1 casa + 1 extra'; end if;
  if not exists (select 1 from public.caca_placar_v2(ed, now() - interval '20 hours') p where p.pessoa = 'p2@exemplo.com.br' and p.casas = 2 and p.extras = 0)
    then raise exception 'corte: P2 não mudava'; end if;
  -- Anulado não conta.
  update public.carimbos set anulado_em = now(), anulado_motivo = 'teste' where mapa_id = id_p3 and criado_em = (select min(criado_em) from public.carimbos where mapa_id = id_p3);
  if not exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = 'p3@exemplo.com.br' and p.casas = 1 and p.extras = 1) then raise exception 'anulado contou'; end if;

  -- 4. Ranking público: quem não quer aparecer (P1, último mapa) fica de fora, sem e-mail nem WhatsApp, posição real.
  r := public.caca_ranking_publico(ed, 50);
  if r::text like '%exemplo.com.br%' then raise exception 'ranking público vazou contato: %', r; end if;
  if exists (select 1 from jsonb_array_elements(r) e where e ->> 'apelido' in ('P1a', 'P1b', 'P5')) then raise exception 'ranking público mostrou quem não deve: %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r) e where e ->> 'apelido' = 'P2' and (e ->> 'posicao')::int = pos_p2) then raise exception 'P2 sem a posição real: %', r; end if;
  if jsonb_array_length(public.caca_ranking_publico(ed, 1)) <> 1 then raise exception 'limite do ranking público'; end if;

  -- 5. mapa_ler_v2: pendente, validada, posição, empatados, extras por casa; o mapa antigo (mapa_ler) segue igual.
  r := public.mapa_ler_v2(ch_p1a);
  if (r ->> 'casas_validadas')::int <> 2 or (r ->> 'extras')::int <> 1 or (r ->> 'posicao')::int <> pos_p1
     or (r ->> 'total_casas')::int - (r ->> 'faltam')::int <> 2 or (r ->> 'empatados')::int <> 1
    then raise exception 'mapa_ler_v2 de P1: %', r; end if;
  if jsonb_array_length(r -> 'casas') <> 2 then raise exception 'P1 casas: %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'casas') e where e ->> 'estado' = 'validada' and (e ->> 'carimbos')::int = 2 and (e ->> 'extras')::int = 1)
    then raise exception 'casa A de P1 deveria ter 2 carimbos (um em cada mapa) e 1 extra: %', r; end if;
  if (public.mapa_ler_v2(ch_p1b) ->> 'casas_validadas')::int <> 2 then raise exception 'o segundo mapa da pessoa deveria ver o mesmo progresso'; end if;
  r := public.mapa_ler_v2(ch_p5);
  if (r ->> 'casas_validadas')::int <> 0 or (r -> 'posicao') <> 'null'::jsonb or r -> 'casas' -> 0 ->> 'estado' <> 'pendente'
    then raise exception 'mapa_ler_v2 de P5 (pendente): %', r; end if;
  -- Avaliar depois valida o carimbo pendente (a ordem não importa).
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas) values (ed, ca.participacao, 'Teste', 'p5@exemplo.com.br', '{}'::jsonb);
  if (public.mapa_ler_v2(ch_p5) ->> 'casas_validadas')::int <> 1 then raise exception 'avaliar depois não validou'; end if;
  if public.mapa_ler_v2('chave-errada') is not null then raise exception 'chave errada deveria dar null'; end if;
  if public.mapa_ler(ch_p1a) is null then raise exception 'mapa_ler antigo quebrou'; end if;

  -- 6. Apuração v2: 5 dias, top 10 por casas e extras, sorteio final só de mapa completo com peso 100 + extras.
  a := public.get_caca_apuracao_v2('x', ed);
  v_total := (a ->> 'total_casas')::int;
  if jsonb_array_length(a -> 'apuracoes') <> 5 or (a -> 'apuracoes' -> 0 ->> 'dia') <> '2026-11-07' then raise exception 'apurações: %', a -> 'apuracoes'; end if;
  if jsonb_array_length(a -> 'sorteio_final') <> 0 then raise exception 'sorteio com mapa incompleto: %', a -> 'sorteio_final'; end if;
  if not exists (select 1 from jsonb_array_elements(a -> 'reservas') e where e ->> 'apelido' = 'P1b') and v_total > 2 and pos_p1 <= 10 then
    raise exception 'reservas sem P1: %', a -> 'reservas'; end if;

  -- P1 completa as demais casas (1 carimbo + avaliação em cada): entra no sorteio com peso 100 + 1 extra.
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
  select distinct on (pa.id) id_p1a, pa.id, pu.id, q.codigo, true, now() - interval '2 hours'
    from public.publicacoes pb join public.participacoes pa on pa.id = pb.participacao_id and pb.vigente
    join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.id not in (ca.participacao, cb.participacao);
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas)
  select ed, pa.id, 'Teste', 'p1@exemplo.com.br', '{}'::jsonb
    from public.publicacoes pb join public.participacoes pa on pa.id = pb.participacao_id and pb.vigente
   where pa.edicao_codigo = ed and pa.id not in (ca.participacao, cb.participacao);
  a := public.get_caca_apuracao_v2('x', ed);
  if jsonb_array_length(a -> 'sorteio_final') <> 1 or (a -> 'sorteio_final' -> 0 ->> 'peso')::int <> 101
     or (a -> 'sorteio_final' -> 0 ->> 'casas')::int <> v_total or a -> 'sorteio_final' -> 0 ->> 'apelido' <> 'P1b'
    then raise exception 'sorteio final: % (total %)', a -> 'sorteio_final', v_total; end if;
  if (a -> 'apuracoes' -> 4 -> 'ranking' -> 0 ->> 'apelido') <> 'P1b' or (a -> 'apuracoes' -> 4 -> 'ranking' -> 0 ->> 'posicao')::int <> 1
    then raise exception 'dia 11: P1 deveria liderar: %', a -> 'apuracoes' -> 4; end if;

  raise exception 'TESTE_OK casas=%', v_total;
end $t$;
