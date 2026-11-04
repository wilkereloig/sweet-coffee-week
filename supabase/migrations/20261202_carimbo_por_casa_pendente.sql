-- Caça aos Carimbos (Wilker, 04/11/2026; docs/cartoon-2026-2/14-mapa-da-docura.md §14.14).
--
-- 1. O QR do display de mesa (face do combo, /q/d1-<casa>) também carimba: ele identifica a CASA, não a unidade.
--    mapa_carimbar_casa escolhe a unidade da casa mais perto do celular e passa pela mesma regra de sempre
--    (mapa_carimbar: janela da avaliação, distância, 12 h por casa e por e-mail).
-- 2. Carimbo PENDENTE até a avaliação: os carimbos de uma casa só contam depois que o mapa avaliou o combo dela
--    (mesmo e-mail). Avaliada, a casa vale os seus carimbos + 2. As voltas à casa contam sem nova avaliação.
--    O placar passa a contar só carimbos e casas validados (a assinatura não muda: `avaliadas` = `casas`).
-- Não altera tabela nenhuma.

create or replace function public.carimbo_placar(p_edicao text)
 returns table (mapa_id uuid, apelido text, email_norm text, whatsapp text, no_ranking boolean,
                carimbos int, casas int, avaliadas int, pontos int, ultimo timestamptz)
 language sql stable security definer set search_path to 'public'
as $$
  with c as (
    select k.mapa_id, k.participacao_id, count(*)::int n, max(k.criado_em) ultimo
      from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
     where m.edicao_codigo = p_edicao and k.anulado_em is null
     group by k.mapa_id, k.participacao_id
  ), validadas as (
    select c.* from c join public.mapas_lover m on m.id = c.mapa_id
     where exists (select 1 from public.avaliacoes a
                    where a.edicao_codigo = p_edicao and a.participacao_id = c.participacao_id and a.email_norm = m.email_norm)
  ), por_mapa as (
    select v.mapa_id, sum(v.n)::int carimbos, count(*)::int casas, max(v.ultimo) ultimo from validadas v group by v.mapa_id
  )
  select m.id, m.apelido, m.email_norm, m.whatsapp, m.no_ranking,
         p.carimbos, p.casas, p.casas, p.carimbos + 2 * p.casas, p.ultimo
    from por_mapa p join public.mapas_lover m on m.id = p.mapa_id
$$;

create or replace function public.mapa_carimbar_casa(p_chave text, p_slug text, p_lat numeric, p_lng numeric, p_precisao numeric)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_qr text;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  -- A unidade mais perto do celular; sem posição (ou sem coordenada), a primeira — mapa_carimbar recusa se precisar dela.
  select cq.codigo into v_qr
    from public.carimbo_qr cq
    join public.participacao_unidades pu on pu.id = cq.participacao_unidade_id and pu.participa
    join public.participacoes pa on pa.id = pu.participacao_id
    left join public.unidades u on u.id = pu.unidade_id
   where cq.ativo and pa.edicao_codigo = m.edicao_codigo and pa.slug_publico = lower(btrim(coalesce(p_slug, '')))
   order by case when p_lat is null or p_lng is null or u.lat is null or u.lng is null then null
                 else public.carimbo_distancia(u.lat::float8, u.lng::float8, p_lat::float8, p_lng::float8) end nulls last,
            cq.codigo
   limit 1;
  if v_qr is null then return jsonb_build_object('ok', false, 'motivo', 'qr_invalido'); end if;
  return public.mapa_carimbar(p_chave, v_qr, p_lat, p_lng, p_precisao);
end $$;

revoke all on function public.mapa_carimbar_casa(text, text, numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function public.mapa_carimbar_casa(text, text, numeric, numeric, numeric) to anon, authenticated;

-- 3. Apuração da Caça aos Carimbos para o painel (Edição › Carimbos). Carimbo válido numa data = não anulado, feito
--    até aquela hora, e a casa avaliada (mesmo e-mail do mapa) até aquela hora.
--    · apuracoes: dias 7 a 11/11, corte às 23h59 de Natal; top 10 em carimbos acumulados desde o início (rank: empate
--      aparece com a mesma posição). Quem já ganhou voucher sai das apurações seguintes — a organização decide e
--      exclui olhando a lista (o sistema não guarda o ganhador).
--    · sorteio_final: mapas com as casas todas validadas, cada carimbo válido = 1 chance.
--    · reservas: se faltar mapa completo, os 10 seguintes por casas validadas e depois carimbos.
--    Contato (e-mail, WhatsApp) só com relatorio.ler.
-- ponytail: datas da edição 2026.2 escritas aqui; na próxima edição, ler do cronograma.
create or replace function public.get_caca_apuracao(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_rel boolean; v_total int;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  select count(*) into v_total from public.participacoes pa
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  return jsonb_build_object(
    'total_casas', v_total,
    'apuracoes', (select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'ranking', (
        select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                 'posicao', r.pos, 'apelido', r.apelido, 'carimbos', r.n, 'casas', r.casas,
                 'email', case when v_rel then r.email_norm end, 'whatsapp', case when v_rel then r.whatsapp end)) order by r.pos, r.apelido), '[]'::jsonb)
          from (select rank() over (order by x.n desc) pos, x.*
                  from (select m.id, m.apelido, m.email_norm, m.whatsapp, count(*)::int n, count(distinct k.participacao_id)::int casas
                          from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                         where m.edicao_codigo = p_edicao and k.anulado_em is null and k.criado_em < d.fim
                           and exists (select 1 from public.avaliacoes a where a.edicao_codigo = p_edicao
                                         and a.participacao_id = k.participacao_id and a.email_norm = m.email_norm and a.criado_em < d.fim)
                         group by m.id) x) r
         where r.pos <= 10)) order by d.dia), '[]'::jsonb)
      from (select g::date dia, ((g::date + 1)::timestamp at time zone 'America/Fortaleza') fim
              from generate_series(timestamp '2026-11-07', timestamp '2026-11-11', interval '1 day') g) d),
    'sorteio_final', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                        'apelido', p.apelido, 'chances', p.carimbos, 'casas', p.casas,
                        'email', case when v_rel then p.email_norm end, 'whatsapp', case when v_rel then p.whatsapp end))
                        order by p.carimbos desc, p.apelido), '[]'::jsonb)
                        from public.carimbo_placar(p_edicao) p where p.casas >= v_total and v_total > 0),
    'reservas', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                   'apelido', p.apelido, 'carimbos', p.carimbos, 'casas', p.casas,
                   'email', case when v_rel then p.email_norm end, 'whatsapp', case when v_rel then p.whatsapp end))
                   order by p.casas desc, p.carimbos desc, p.apelido), '[]'::jsonb)
                   from (select * from public.carimbo_placar(p_edicao) p where p.casas < v_total
                          order by p.casas desc, p.carimbos desc limit 10) p));
end $$;

revoke all on function public.get_caca_apuracao(text, text) from public, anon, authenticated;
grant execute on function public.get_caca_apuracao(text, text) to anon, authenticated;
