-- Caça aos Carimbos (migration 20261202). Roda DEPOIS da migration, na mesma transação, e sempre termina em exceção:
-- TESTE_OK = passou; nada fica no banco. Liga a janela, publica as casas e troca public.pode só dentro da transação.
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

do $t$
declare
  v_chave text; r jsonb; m jsonb; c record; v_id uuid; v_longe record;
begin
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
  select distinct pa.id, 999, 'marca_e_combo', '{}'::jsonb, true
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = '2026.2' and pa.status_cadastro <> 'encerrado'
     and not exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  -- 20261211: só casa com combo entra no total; a casa 'marca' de verdade (ex.: caroli-douces) sai deste cenário.
  update public.publicacoes set nivel = 'marca_e_combo' where vigente;
  update public.edicao_publicacao set fase = 'em_andamento', avaliacao_abre_em = now() - interval '1 day',
         avaliacao_fecha_em = now() + interval '1 day', avaliacao_aberta = true where edicao_codigo = '2026.2';

  v_chave := public.mapa_criar('2026.2', 'Teste', 'teste-caca@exemplo.com.br', null, false, true) ->> 'chave';
  select id into v_id from public.mapas_lover where chave_hash = public.mapa_hash(v_chave);

  -- Casa com várias unidades: carimba pela casa estando numa unidade que NÃO é a primeira pelo código.
  select pa.id participacao, pa.slug_publico slug, pu.id_publico unidade, u.lat, u.lng into c
    from public.carimbo_qr q join public.participacao_unidades pu on pu.id = q.participacao_unidade_id and pu.participa
    join public.participacoes pa on pa.id = pu.participacao_id
    join public.unidades u on u.id = pu.unidade_id
   where q.ativo and pa.edicao_codigo = '2026.2' and u.lat is not null
     and (select count(*) from public.participacao_unidades x join public.unidades y on y.id = x.unidade_id
           where x.participacao_id = pa.id and x.participa and y.lat is not null) >= 2
   order by q.codigo desc limit 1;
  if c.slug is null then raise exception 'sem casa com 2 unidades com ponto'; end if;

  r := public.mapa_carimbar_casa(v_chave, c.slug, c.lat, c.lng, 10);
  if not (r ->> 'ok')::boolean then raise exception 'carimbar pela casa recusou: %', r; end if;
  if r ->> 'unidade' <> c.unidade then raise exception 'não escolheu a unidade mais perto: % x %', r ->> 'unidade', c.unidade; end if;
  if (r ->> 'avaliou')::boolean or not (r ->> 'primeira')::boolean then raise exception 'primeira visita errada: %', r; end if;

  m := public.mapa_ler(v_chave);
  if (m -> 'casas' -> 0 ->> 'carimbos')::int <> 1 then raise exception 'mapa_ler com pendente: %', m; end if;

  r := public.mapa_carimbar_casa(v_chave, c.slug, c.lat, c.lng, 10);
  if r ->> 'motivo' <> 'cedo' then raise exception 'as 12 h não travaram: %', r; end if;

  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas)
  values ('2026.2', c.participacao, 'Teste', 'teste-caca@exemplo.com.br', '{}'::jsonb);
  if (public.mapa_ler_v2(v_chave) ->> 'casas_validadas')::int <> 1 then raise exception 'avaliar não validou a casa'; end if;

  update public.carimbos set criado_em = now() - interval '13 hours' where mapa_id = v_id;
  r := public.mapa_carimbar_casa(v_chave, c.slug, c.lat, c.lng, 10);
  if not (r ->> 'ok')::boolean or (r ->> 'primeira')::boolean then raise exception 'volta à casa: %', r; end if;

  -- Longe de toda unidade conferida: recusa.
  select pa.slug_publico slug into v_longe
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.unidades u on u.id = pu.unidade_id
   where pa.edicao_codigo = '2026.2' and pa.id <> c.participacao and u.coordenada_verificada_em is not null and u.lat is not null limit 1;
  if v_longe.slug is not null then
    r := public.mapa_carimbar_casa(v_chave, v_longe.slug, -23.55, -46.63, 10);
    if r ->> 'motivo' <> 'longe' then raise exception 'longe não recusou: %', r; end if;
  end if;

  if public.mapa_carimbar_casa(v_chave, 'casa-que-nao-existe', 0, 0, 10) ->> 'motivo' <> 'qr_invalido' then raise exception 'slug ruim'; end if;
  if public.mapa_carimbar_casa('chave-errada', c.slug, 0, 0, 10) ->> 'motivo' <> 'mapa_desconhecido' then raise exception 'chave ruim'; end if;

  -- (O trecho de apuração/sorteio v1, com pontos e 'chances', saiu em 05/11/2026: regra extinta; ver caca-premiacao.sql e caca-v2.sql.)
  raise exception 'TESTE_OK casa=%', c.slug;
end $t$;
