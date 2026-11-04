-- Teste de 20261130 (Mapa da Doçura — carimbo pelo QR fixo). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
-- Precisa de 1 administrador ativo e 1 unidade publicada da edição 2026.2 com ponto conferido.
-- Abre a janela da avaliação só dentro do teste (a exceção final desfaz tudo).
do $$
declare
  adm uuid; pu uuid; pa uuid; lat numeric; lng numeric; qr text; ch1 text; ch2 text; ch3 text; r jsonb; mapa uuid; car uuid;
begin
  select user_id into adm from public.perfis
   where funcao = 'administrador' and papel = 'organizacao' and ativo and bloqueado_em is null and not deve_trocar_senha limit 1;
  select x.id, x.participacao_id, u.lat, u.lng, q.codigo into pu, pa, lat, lng, qr
    from public.participacao_unidades x
    join public.participacoes p on p.id = x.participacao_id and p.edicao_codigo = '2026.2' and p.status_cadastro <> 'encerrado'
    join public.unidades u on u.id = x.unidade_id and u.coordenada_verificada_em is not null and u.lat is not null
    join public.carimbo_qr q on q.participacao_unidade_id = x.id and q.ativo
   where x.participa and exists (select 1 from public.publicacoes pb where pb.participacao_id = p.id and pb.vigente) limit 1;
  if adm is null or pu is null then raise exception 'preparo: faltou administrador ou unidade publicada com ponto conferido'; end if;

  update public.edicao_publicacao set fase = 'em_andamento', resultados_publicos = false, avaliacao_aberta = true,
         avaliacao_abre_em = now() - interval '1 hour', avaliacao_fecha_em = now() + interval '1 day'
   where edicao_codigo = '2026.2';

  -- 1) criar e carimbar perto
  ch1 := public.mapa_criar('2026.2', 'Teste Lover', 'teste.mapa@exemplo.com', null, true, true) ->> 'chave';
  r := public.mapa_carimbar(ch1, upper(qr), lat, lng, 20);
  if not (r ->> 'ok')::boolean or not (r ->> 'primeira')::boolean or (r ->> 'pontos')::int <> 1 then raise exception '1: %', r; end if;

  -- 2) de novo antes das 12 h: recusa
  r := public.mapa_carimbar(ch1, qr, lat, lng, 20);
  if r ->> 'motivo' <> 'cedo' or r ->> 'liberado_em' is null then raise exception '2: %', r; end if;

  -- 3) mapa novo com o MESMO e-mail não zera
  ch2 := public.mapa_criar('2026.2', 'Outra aba', 'Teste.Mapa@exemplo.com ', null, false, true) ->> 'chave';
  r := public.mapa_carimbar(ch2, qr, lat, lng, 20);
  if r ->> 'motivo' <> 'cedo' then raise exception '3: %', r; end if;

  -- 4) longe (~5,5 km) e sem localização: recusa
  ch3 := public.mapa_criar('2026.2', 'De casa', 'longe@exemplo.com', '84999990000', false, true) ->> 'chave';
  r := public.mapa_carimbar(ch3, qr, lat + 0.05, lng, 20);
  if r ->> 'motivo' <> 'longe' then raise exception '4a: %', r; end if;
  r := public.mapa_carimbar(ch3, qr, null, null, null);
  if r ->> 'motivo' <> 'sem_localizacao' then raise exception '4b: %', r; end if;
  -- margem do GPS ajuda até o teto: ~445 m com precisão de 5 km → limite 200 + 300 = 500 m → passa
  r := public.mapa_carimbar(ch3, qr, lat + 0.004, lng, 5000);
  if not (r ->> 'ok')::boolean then raise exception '4c: %', r; end if;

  -- 5) QR inválido e chave desconhecida
  if public.mapa_carimbar(ch1, 'zzzzzzzz', lat, lng, 20) ->> 'motivo' <> 'qr_invalido' then raise exception '5a'; end if;
  if public.mapa_carimbar('nao-existe', qr, lat, lng, 20) ->> 'motivo' <> 'mapa_desconhecido' then raise exception '5b'; end if;

  -- 6) avaliação do mesmo e-mail dá +2
  insert into public.avaliacoes (edicao_codigo, participacao_id, participacao_unidade_id, nome, email_norm, notas)
  values ('2026.2', pa, pu, 'Teste Lover', 'teste.mapa@exemplo.com', '{}'::jsonb);
  r := public.mapa_ler(ch1);
  if (r ->> 'pontos')::int <> 3 or (r ->> 'avaliadas')::int <> 1 or not ((r -> 'casas' -> 0 ->> 'avaliou')::boolean) then raise exception '6: %', r; end if;

  -- 7) organização: painel enxerga, anula, troca o QR (o velho morre)
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.get_mapa_carimbos(null, '2026.2');
  if jsonb_array_length(r -> 'ranking') < 2 then raise exception '7a: %', r -> 'ranking'; end if;
  select id into mapa from public.mapas_lover where chave_hash = public.mapa_hash(ch1);
  select id into car from public.carimbos where mapa_id = mapa;
  if not public.carimbo_anular(null, car, 'teste') then raise exception '7b'; end if;
  if (public.mapa_ler(ch1) ->> 'pontos')::int <> 0 then raise exception '7c: %', public.mapa_ler(ch1); end if;
  perform public.carimbo_qr_novo(null, pu);
  if public.mapa_carimbar(ch3, qr, lat, lng, 20) ->> 'motivo' <> 'qr_invalido' then raise exception '7d'; end if;

  -- 8) apagar o mapa leva os carimbos. Em duas etapas: num OR o Postgres pode avaliar o exists ANTES do apagar.
  if not public.mapa_apagar(ch3) then raise exception '8a'; end if;
  if exists (select 1 from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
              where m.email_norm = 'longe@exemplo.com') then raise exception '8b'; end if;

  raise exception 'TESTE_OK';
end $$;
