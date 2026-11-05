-- Caça aos Carimbos: marcos de progresso RELATIVOS ao total de casas, configuráveis pelo painel
-- (decisão técnica revisável, Wilker mandou decidir em 05/11/2026; contrato em docs/cartoon-2026-2/15-caca-contrato-metas-push.md §1).
-- ADITIVA: só redefine caca_metas_ler (mesma forma de resposta, sem 'exemplo') e cria caca_metas_painel_ler / caca_metas_gravar.
--
--  · Cada marco de caca_config('metas') é { titulo, e UM de: casas:int | fracao:0.01..0.99 | casas:'todas' }.
--      casas  = número absoluto de casas diferentes;
--      fracao = parte do total, arredondada (round) e nunca menos que 1;
--      'todas' = o mapa completo: acompanha o total da edição, nunca fica à mão em 27.
--  · O servidor resolve contra o total ATUAL (caca_total_casas: 26 hoje porque caroli-douces ainda é só 'marca').
--    Marcos que resolvem para o mesmo número viram um só (o 'todas' vence); marco absoluto acima do total some.
--  · Valores de partida (só substituem os EXEMPLOS antigos 5/10/20/27, nunca uma gravação da organização):
--    "Primeiro carimbo" (1) · "Pegou o jeito" (~1/3) · "Quase lá" (~2/3) · "Mapa completo" (todas).
--    Com 27 casas: 1, 9, 18, 27. Com 26: 1, 9, 17, 26. NENHUM prêmio novo é prometido: os benefícios são os vouchers
--    diários e o prêmio final da especificação.
--  · caca_metas_gravar(p_secret, p_metas): gate edicao.gerir; 1..20 marcos; título 1..40; ordem estritamente crescente
--    (resolvida contra o total atual, ou 27 se ainda não há casas); 'todas' só no fim e uma vez. Audita em caca_evento e
--    o gatilho sync_caca_config (20261209) avisa os painéis abertos.
--  · caca_metas_painel_ler(p_secret, p_edicao): o que o painel edita (marcos crus, nota, quem mudou) + o resolvido.
--
-- reverter:
--   drop function if exists public.caca_metas_gravar(text, jsonb), public.caca_metas_painel_ler(text, text),
--     public.caca_metas_resolver(jsonb, int);
--   -- restaurar caca_metas_ler de 20261211_caca_casas_validas.sql
--   alter table public.caca_config drop column if exists nota, drop column if exists atualizado_por;
--   update public.caca_config set valor = '[{"casas":5,"titulo":"Primeiros passos","exemplo":true},{"casas":10,"titulo":"Já pegou o jeito","exemplo":true},{"casas":20,"titulo":"Quase lá","exemplo":true},{"casas":27,"titulo":"Todas as casas","exemplo":true}]'::jsonb where chave = 'metas';

-- ---------------------------------------------------------------- 1. colunas de proveniência
alter table public.caca_config add column if not exists nota text;
alter table public.caca_config add column if not exists atualizado_por text;

-- ---------------------------------------------------------------- 2. valores de partida (só troca os exemplos antigos)
update public.caca_config
   set valor = jsonb_build_array(
         jsonb_build_object('casas', 1,        'titulo', 'Primeiro carimbo'),
         jsonb_build_object('fracao', 0.33,    'titulo', 'Pegou o jeito'),
         jsonb_build_object('fracao', 0.67,    'titulo', 'Quase lá'),
         jsonb_build_object('casas', 'todas',  'titulo', 'Mapa completo')),
       nota = 'Decisão técnica revisável: marcos relativos ao total de casas (1, cerca de 1/3, cerca de 2/3 e todas). Só comemoram; não prometem prêmio.',
       atualizado_em = now()
 where chave = 'metas'
   and jsonb_typeof(valor) = 'array'
   and not exists (select 1 from jsonb_array_elements(valor) e where coalesce(e ->> 'exemplo', '') <> 'true');

-- ---------------------------------------------------------------- 3. resolução (interna, uma só)
-- Marcos crus + total → marcos concretos ordenados, sem repetir. Config torta vira conjunto vazio.
create or replace function public.caca_metas_resolver(p_cfg jsonb, p_total int)
 returns table (casas int, titulo text, tipo text)
 language sql immutable set search_path to 'public'
as $$
  select distinct on (r.casas) r.casas, r.titulo, r.tipo
    from (
      select case n.tipo
               when 'todas'  then p_total
               when 'fracao' then greatest(1, round(p_total * n.fracao)::int)
               else n.casas end as casas, n.titulo, n.tipo
        from (
          select left(btrim(coalesce(e.j ->> 'titulo', '')), 40) as titulo,
                 case when e.j ->> 'casas' = 'todas' then 'todas'
                      when (e.j ->> 'fracao') ~ '^0(\.\d{1,4})?$' then 'fracao'
                      when (e.j ->> 'casas') ~ '^\d{1,3}$' then 'casas' end as tipo,
                 case when (e.j ->> 'casas') ~ '^\d{1,3}$' then (e.j ->> 'casas')::int end as casas,
                 case when (e.j ->> 'fracao') ~ '^0(\.\d{1,4})?$' then (e.j ->> 'fracao')::numeric end as fracao
            from jsonb_array_elements(case when jsonb_typeof(p_cfg) = 'array' then p_cfg else '[]'::jsonb end) e(j)
           where jsonb_typeof(e.j) = 'object'
        ) n
       where n.tipo is not null and n.titulo <> ''
         and (n.tipo <> 'fracao' or n.fracao > 0)
    ) r
   where r.casas between 1 and greatest(p_total, 0)
   order by r.casas, (r.tipo = 'todas') desc, r.tipo
$$;
revoke all on function public.caca_metas_resolver(jsonb, int) from public, anon, authenticated;

-- ---------------------------------------------------------------- 4. leitura do visitante
create or replace function public.caca_metas_ler(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_total int; v_casas int; v_cfg jsonb; v_metas jsonb;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  v_total := public.caca_total_casas(m.edicao_codigo);
  -- Progresso da pessoa só no mapa principal; mapa secundário não lê o da pessoa.
  select case when m.id = public.caca_mapa_principal(m.edicao_codigo, m.email_norm)
              then coalesce((select r.casas from public.caca_ranking_v2(m.edicao_codigo) r where r.pessoa = m.email_norm), 0)
              else 0 end into v_casas;
  select valor into v_cfg from public.caca_config where chave = 'metas';

  select coalesce(jsonb_agg(jsonb_build_object(
           'casas', x.casas, 'titulo', x.titulo, 'completa', x.tipo = 'todas',
           'alcancada', v_casas >= x.casas, 'faltam', greatest(x.casas - v_casas, 0)) order by x.casas), '[]'::jsonb)
    into v_metas
    from public.caca_metas_resolver(v_cfg, v_total) x;

  return jsonb_build_object(
    'total_casas', v_total, 'casas_validadas', v_casas, 'metas', v_metas,
    'alcancadas', (select coalesce(jsonb_agg(e) filter (where (e ->> 'alcancada')::boolean), '[]'::jsonb) from jsonb_array_elements(v_metas) e),
    'proxima', (select e from jsonb_array_elements(v_metas) e where not (e ->> 'alcancada')::boolean limit 1));
end $$;

revoke all on function public.caca_metas_ler(text) from public, anon, authenticated;
grant execute on function public.caca_metas_ler(text) to anon, authenticated;

-- ---------------------------------------------------------------- 5. painel: ler
create or replace function public.caca_metas_painel_ler(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_cfg public.caca_config%rowtype; v_total int;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  select * into v_cfg from public.caca_config where chave = 'metas';
  v_total := public.caca_total_casas(p_edicao);
  return jsonb_build_object(
    'total_casas', v_total,
    'marcos', case when jsonb_typeof(v_cfg.valor) = 'array' then v_cfg.valor else '[]'::jsonb end,
    'resolvidos', (select coalesce(jsonb_agg(jsonb_build_object('casas', x.casas, 'titulo', x.titulo, 'tipo', x.tipo) order by x.casas), '[]'::jsonb)
                     from public.caca_metas_resolver(v_cfg.valor, v_total) x),
    'nota', v_cfg.nota, 'atualizado_em', v_cfg.atualizado_em, 'atualizado_por', v_cfg.atualizado_por);
end $$;
revoke all on function public.caca_metas_painel_ler(text, text) from public, anon, authenticated;
grant execute on function public.caca_metas_painel_ler(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 6. painel: gravar
create or replace function public.caca_metas_gravar(p_secret text, p_metas jsonb)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_antes jsonb; v_limpo jsonb; v_ed text; v_ref int; v_ant int := 0; r record; v_res int; v_tem_todas boolean := false;
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  if jsonb_typeof(p_metas) <> 'array' or jsonb_array_length(p_metas) not between 1 and 20 then raise exception 'metas_invalidas'; end if;

  -- total de referência para conferir a ordem: o da edição publicada (27 se ainda não há casas contadas)
  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  v_ref := coalesce(nullif(public.caca_total_casas(v_ed), 0), 27);

  v_limpo := '[]'::jsonb;
  for r in select e.j, e.ord from jsonb_array_elements(p_metas) with ordinality e(j, ord) order by e.ord loop
    if jsonb_typeof(r.j) <> 'object' then raise exception 'metas_invalidas'; end if;
    if (r.j - 'casas' - 'fracao' - 'titulo') <> '{}'::jsonb then raise exception 'metas_invalidas'; end if;   -- nenhum campo extra (prêmio, etc.)
    if coalesce(jsonb_typeof(r.j -> 'titulo'), '') <> 'string' or char_length(btrim(coalesce(r.j ->> 'titulo', ''))) not between 1 and 40 then raise exception 'metas_titulo'; end if;
    if v_tem_todas then raise exception 'metas_todas_so_no_fim'; end if;
    if r.j ? 'fracao' then
      if r.j ? 'casas' or jsonb_typeof(r.j -> 'fracao') <> 'number' or (r.j ->> 'fracao') !~ '^0\.\d{1,4}$' or (r.j ->> 'fracao')::numeric not between 0.01 and 0.99 then
        raise exception 'metas_fracao';
      end if;
      v_res := greatest(1, round(v_ref * (r.j ->> 'fracao')::numeric)::int);
      v_limpo := v_limpo || jsonb_build_array(jsonb_build_object('fracao', (r.j ->> 'fracao')::numeric, 'titulo', btrim(r.j ->> 'titulo')));
    elsif r.j -> 'casas' = to_jsonb('todas'::text) then
      v_res := v_ref; v_tem_todas := true;
      v_limpo := v_limpo || jsonb_build_array(jsonb_build_object('casas', 'todas', 'titulo', btrim(r.j ->> 'titulo')));
    elsif jsonb_typeof(r.j -> 'casas') = 'number' and (r.j ->> 'casas') ~ '^\d{1,3}$' and (r.j ->> 'casas')::int between 1 and 200 then
      v_res := (r.j ->> 'casas')::int;
      v_limpo := v_limpo || jsonb_build_array(jsonb_build_object('casas', v_res, 'titulo', btrim(r.j ->> 'titulo')));
    else raise exception 'metas_casas';
    end if;
    -- ordem estritamente crescente (recusa também duplicata)
    if v_res <= v_ant then raise exception 'metas_ordem'; end if;
    v_ant := v_res;
  end loop;

  select valor into v_antes from public.caca_config where chave = 'metas' for update;
  insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
  values ('metas', v_limpo, null, now(), coalesce(public.ator_rotulo_atual(), 'Painel'))
  on conflict (chave) do update
    set valor = excluded.valor, nota = null, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  perform public.caca_evento_gravar(null, null, 'metas_gravar', jsonb_build_object('metas', v_antes), jsonb_build_object('metas', v_limpo));
  return jsonb_build_object('ok', true, 'metas', v_limpo);
end $$;
revoke all on function public.caca_metas_gravar(text, jsonb) from public, anon, authenticated;
grant execute on function public.caca_metas_gravar(text, jsonb) to anon, authenticated;
