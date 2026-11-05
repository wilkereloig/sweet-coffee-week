-- Caça aos Carimbos, 'principal' sempre booleano (achado do teste de navegador de 05/11/2026, depois de 20261216).
-- Com a identidade em disputa (2+ mapas, nenhum confirmado) caca_mapa_principal devolve NULL, e `m.id = NULL` dava `principal: null`
-- em mapa_ler_v2 e mapa_confirmar_email_status. O contrato diz boolean: aqui vira false. Só o literal muda; o resto é igual a 20261211/20261210.
-- Reverter: restaurar mapa_ler_v2 de 20261211 e mapa_confirmar_email_status de 20261210.

create or replace function public.mapa_ler_v2(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_total int; v_pos int; v_cs int := 0; v_exr int := 0; v_emp int := 0; v_princ boolean;
  v_casas jsonb; v_val int; v_ext int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  v_princ := coalesce(m.id = public.caca_mapa_principal(m.edicao_codigo, m.email_norm), false);
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

create or replace function public.mapa_confirmar_email_status(p_chave text)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('confirmado', false, 'valido', false); end if;
  if m.ultimo_acesso_em is null or m.ultimo_acesso_em < now() - interval '1 hour' then
    update public.mapas_lover set ultimo_acesso_em = now() where id = m.id;
  end if;
  return jsonb_build_object('confirmado', public.caca_email_confirmado(m.edicao_codigo, m.email_norm), 'valido', true,
                            'principal', coalesce(m.id = public.caca_mapa_principal(m.edicao_codigo, m.email_norm), false));
end $$;
