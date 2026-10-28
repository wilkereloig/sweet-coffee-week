-- ─────────────────────────────────────────────────────────────────────────────
-- "Ver como participante" — 22/10/2026 (pedido do Wilker). O administrador vê o painel da marca EXATAMENTE como a marca
-- vê, sem gravar nada e sem usar nem tocar a sessão dela.
--
-- Como: o painel da marca lê tudo pela RLS da própria conta (as consultas nem dizem de qual marca são). Aqui uma função
-- SECURITY INVOKER (roda com o papel de quem chama: `authenticated`) confere que quem chama é administrador e, só então,
-- troca a identidade da TRANSAÇÃO para a conta da marca (`request.jwt.claims`/`claim.sub`) e faz a leitura — a mesma RLS,
-- as mesmas funções `marca_*`, nem mais nem menos. A transação termina com a resposta; nada vaza para outra chamada.
--
-- ⛔ Não grava: a leitora é STABLE, e o Postgres recusa INSERT/UPDATE/DELETE dentro de função não volátil (EXECUTE
--    incluído). Tabelas e funções numa lista fechada; identificadores validados e citados (%I), valores como literal (%L).
-- ⚠️ `conta_ativa()` ganha UMA exceção: conta que ainda não trocou a senha temporária (as 25 de 22/10) não enxergaria os
--    próprios dados e o administrador veria tudo vazio. A exceção só vale com a reivindicação `scw_ver_como` = id de quem
--    tem `acesso.gerir` — ninguém de fora escreve `request.jwt.claims` (só funções do banco); um JWT de verdade não traz
--    essa chave (o Auth põe metadado em `user_metadata`/`app_metadata`, nunca no topo).
-- O registro de quem abriu fica na auditoria (`org_ver_como_iniciar`), não na leitora (que não pode gravar).
-- ─────────────────────────────────────────────────────────────────────────────

-- A exceção do modo visualização: só dentro de org_ver_como_ler, que põe a chave depois de conferir o administrador.
create or replace function public.ver_como_ativo()
returns boolean language sql stable security definer set search_path = public as $$
  -- CASE corta antes: requisição comum (sem a chave) nem chama pode_por_user — conta_ativa() roda em toda RLS da marca.
  select case when (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'scw_ver_como') is null then false
              else coalesce(public.pode_por_user((current_setting('request.jwt.claims', true)::jsonb ->> 'scw_ver_como')::uuid, 'acesso.gerir'), false) end
$$;
revoke all on function public.ver_como_ativo() from public, anon, authenticated;

create or replace function public.conta_ativa()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select ativo and bloqueado_em is null and not deve_trocar_senha
                     from public.perfis where user_id = auth.uid()), false)
      or public.ver_como_ativo()
$$;

-- Quem é a conta da marca, para um administrador (conta pessoal; a senha compartilhada não entra).
create or replace function public.ver_como_alvo(p_secret text, p_participante uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid;
begin
  if auth.uid() is null or not public.pode(p_secret, 'acesso.gerir') then raise exception 'nao_autorizado'; end if;
  select user_id into v_uid from public.participantes where id = p_participante and arquivado_em is null;
  if v_uid is null then raise exception 'sem_conta'; end if;
  return v_uid;
end $$;
revoke all on function public.ver_como_alvo(text, uuid) from public, anon;
grant execute on function public.ver_como_alvo(text, uuid) to authenticated;

-- Abrir o modo: confere, registra na auditoria e devolve o nome (a faixa do topo).
create or replace function public.org_ver_como_iniciar(p_secret text, p_participante uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_p public.participantes;
begin
  perform public.ver_como_alvo(p_secret, p_participante);
  select * into v_p from public.participantes where id = p_participante;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values ('participante.ver_como', 'participantes', p_participante::text, p_participante, jsonb_build_object('marca', v_p.nome_marca));
  return jsonb_build_object('participante_id', v_p.id, 'nome_marca', v_p.nome_marca);
end $$;
revoke all on function public.org_ver_como_iniciar(text, uuid) from public, anon;
grant execute on function public.org_ver_como_iniciar(text, uuid) to authenticated;

/*
 * A leitura. p_consulta:
 *   { "tabela": "...", "select": ["col",…] | ["*"], "filtros": [{"c","op","v"}], "ordem": [{"c","desc","nullslast"}], "limite": n }
 *   { "rpc": "marca_minha_logo" | …, "args": { "p_participacao": "<uuid>" } }
 * op: eq neq gt gte lt lte (v texto) · in (v lista) · is (v 'null' | 'true' | 'false').
 */
create or replace function public.org_ver_como_ler(p_secret text, p_participante uuid, p_consulta jsonb)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  v_admin uuid := auth.uid();
  v_uid uuid := public.ver_como_alvo(p_secret, p_participante);
  v_tab text; v_fn text; v_sel text; v_where text := ''; v_ord text := ''; v_lim int;
  f jsonb; o jsonb; v_op text; v_res jsonb;
  ident constant text := '^[a-z_][a-z0-9_]{0,62}$';
  tabelas constant text[] := array['participantes', 'participacoes', 'participantes_itens', 'participacao_unidades', 'unidades',
    'edicoes', 'edicao_cronograma', 'temas_propostos', 'unidade_disponibilidade', 'declaracoes_alimentares', 'substituicoes',
    'vendas_diarias', 'solicitacoes', 'solicitacao_estado', 'mensagens', 'notificacoes', 'sessoes_fotos', 'arquivos',
    'arquivo_leitura', 'correcoes_campo'];
  funcoes constant text[] := array['marca_minha_logo', 'marca_minha_historia', 'marca_meus_vouchers', 'marca_minha_publicacao', 'marca_previa_publica'];
begin
  -- Daqui em diante a transação é a conta da marca (para a RLS e para auth.uid()).
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_uid, 'role', 'authenticated', 'scw_ver_como', v_admin)::text, true);
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  if p_consulta ? 'rpc' then
    v_fn := p_consulta ->> 'rpc';
    if not v_fn = any (funcoes) then raise exception 'consulta_invalida'; end if;
    if v_fn in ('marca_minha_publicacao', 'marca_previa_publica') then
      execute format('select public.%I($1)', v_fn) into v_res using (p_consulta -> 'args' ->> 'p_participacao')::uuid;
    else
      execute format('select public.%I()', v_fn) into v_res;
    end if;
    return v_res;
  end if;

  v_tab := p_consulta ->> 'tabela';
  if v_tab is null or not v_tab = any (tabelas) then raise exception 'consulta_invalida'; end if;

  if p_consulta -> 'select' is null or p_consulta -> 'select' = '["*"]'::jsonb then
    v_sel := '*';
  else
    select string_agg(quote_ident(c), ', ') into v_sel from jsonb_array_elements_text(p_consulta -> 'select') c;
    if v_sel is null or exists (select 1 from jsonb_array_elements_text(p_consulta -> 'select') c where c !~ ident) then
      raise exception 'consulta_invalida';
    end if;
  end if;

  for f in select * from jsonb_array_elements(coalesce(p_consulta -> 'filtros', '[]'::jsonb)) loop
    if (f ->> 'c') !~ ident then raise exception 'consulta_invalida'; end if;
    v_op := f ->> 'op';
    v_where := v_where || ' and ' || case
      when v_op in ('eq', 'neq', 'gt', 'gte', 'lt', 'lte') then
        format('%I %s %L', f ->> 'c', case v_op when 'eq' then '=' when 'neq' then '<>' when 'gt' then '>' when 'gte' then '>=' when 'lt' then '<' else '<=' end, f ->> 'v')
      when v_op = 'in' and jsonb_typeof(f -> 'v') = 'array' then
        format('%I::text = any (%L::text[])', f ->> 'c', array(select jsonb_array_elements_text(f -> 'v')))
      when v_op = 'is' and (f ->> 'v') in ('null', 'true', 'false') then
        format('%I is %s', f ->> 'c', f ->> 'v')
      else null end;
    if v_where is null then raise exception 'consulta_invalida'; end if;
  end loop;

  for o in select * from jsonb_array_elements(coalesce(p_consulta -> 'ordem', '[]'::jsonb)) loop
    if (o ->> 'c') !~ ident then raise exception 'consulta_invalida'; end if;
    v_ord := v_ord || case when v_ord = '' then '' else ', ' end || format('%I', o ->> 'c')
      || case when (o ->> 'desc')::boolean then ' desc' else ' asc' end
      || case when (o ->> 'nullslast')::boolean then ' nulls last' when (o ->> 'nullsfirst')::boolean then ' nulls first' else '' end;
  end loop;
  v_lim := least(coalesce((p_consulta ->> 'limite')::int, 500), 500);

  execute format(
    'select coalesce(jsonb_agg(to_jsonb(t) - %L order by t.%I), %L::jsonb) from (select %s, row_number() over (%s) as %I from public.%I where true%s %s limit %s) t',
    '__ordem', '__ordem', '[]', v_sel, case when v_ord = '' then '' else 'order by ' || v_ord end, '__ordem', v_tab, v_where,
    case when v_ord = '' then '' else 'order by ' || v_ord end, v_lim)
  into v_res;
  return v_res;
end $$;
revoke all on function public.org_ver_como_ler(text, uuid, jsonb) from public, anon;
grant execute on function public.org_ver_como_ler(text, uuid, jsonb) to authenticated;
