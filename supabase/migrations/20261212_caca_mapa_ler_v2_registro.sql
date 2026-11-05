-- Caça aos Carimbos, mapa_ler_v2 (versionamento da migration já aplicada no banco como 'caca_mapa_ler_v2_registro').
-- Antes só existia no banco (aplicada em 05/11/2026 depois de 20261212_caca_sorteio_seguro.sql); este arquivo guarda o SQL real de
-- supabase_migrations.schema_migrations para o repositório não divergir do banco. Reaplicar é inofensivo (create or replace).
-- Não altera tabela nem apaga dado. Migrations posteriores (20261216 em diante) podem redefinir a função de novo.
-- reverter: restaurar mapa_ler_v2 da versão anterior, 20261211_caca_casas_validas.sql (create or replace function public.mapa_ler_v2 ...).

create or replace function public.mapa_ler_v2(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_total int; v_pos int; v_cs int := 0; v_exr int := 0; v_emp int := 0; v_princ boolean;
  v_casas jsonb; v_val int; v_ext int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  v_princ := m.id = public.caca_mapa_principal(m.edicao_codigo, m.email_norm);
  v_total := public.caca_total_casas(m.edicao_codigo);
  select coalesce(jsonb_agg(jsonb_build_object(
            'slug', pa.slug_publico, 'carimbos', x.n, 'ultimo', x.ultimo,
            'liberado_em', x.ultimo + interval '12 hours',
            'avaliou', x.avaliou, 'estado', case when x.avaliou then 'validada' else 'pendente' end,
            'extras', case when x.avaliou then x.n - 1 else 0 end) order by x.ultimo desc), '[]'::jsonb),
         (count(*) filter (where x.avaliou))::int,
         coalesce(sum(case when x.avaliou then x.n - 1 else 0 end), 0)::int
    into v_casas, v_val, v_ext
    from (select k.participacao_id, count(*)::int n, max(k.criado_em) ultimo,
                 exists (select 1 from public.avaliacoes a where a.edicao_codigo = m.edicao_codigo
                           and a.participacao_id = k.participacao_id and a.email_norm = m.email_norm) avaliou
            from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
           where m2.edicao_codigo = m.edicao_codigo and m2.email_norm = m.email_norm and k.anulado_em is null
             and (v_princ or k.mapa_id = m.id)
             and k.participacao_id in (select public.caca_casas_conta(m.edicao_codigo))
             and public.caca_carimbo_conta(k.participacao_id, k.origem)
           group by k.participacao_id) x
    join public.participacoes pa on pa.id = x.participacao_id;
  if v_princ then
    select r.pos, r.casas, r.extras into v_pos, v_cs, v_exr from public.caca_ranking_v2(m.edicao_codigo) r where r.pessoa = m.email_norm;
    v_cs := coalesce(v_cs, 0); v_exr := coalesce(v_exr, 0);
    if v_pos is not null then
      select count(*)::int into v_emp from public.caca_ranking_v2(m.edicao_codigo) r where r.pos = v_pos;
    end if;
  end if;
  return jsonb_build_object(
    'edicao', m.edicao_codigo, 'apelido', m.apelido, 'email', m.email_norm, 'whatsapp', m.whatsapp,
    'no_ranking', m.no_ranking, 'principal', v_princ,
    'total_casas', v_total,
    'casas_validadas', case when v_princ then v_cs else v_val end,
    'extras', case when v_princ then v_exr else v_ext end,
    'faltam', greatest(v_total - case when v_princ then v_cs else v_val end, 0),
    'posicao', v_pos, 'empatados', v_emp, 'casas', v_casas);
end $$;
