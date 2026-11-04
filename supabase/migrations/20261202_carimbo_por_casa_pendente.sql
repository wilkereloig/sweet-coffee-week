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
