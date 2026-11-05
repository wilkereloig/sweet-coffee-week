-- Caça aos Carimbos, sorteio final verificável (achado CACA-SEC-07; Wilker autorizou aplicar em 05/11/2026).
-- Contrato: docs/cartoon-2026-2/15-caca-contrato-premiacao.md (seção "Semente comprometida"). Teste: supabase/testes/caca-sorteio-seguro.sql.
--
-- Problema: a aleatoriedade era uma semente escolhida por quem opera, a simulação (padrão) não deixava rastro, e nada impedia o
-- sorteio real antes de a avaliação fechar. Dava para testar sementes até sair o resultado desejado e só então rodar o real.
-- Correção (compromisso antes, revelação depois):
--   1. caca_sorteio_comprometer(p_secret, p_edicao, p_hash): registra em caca_evento (imutável) o sha256 da semente, ANTES do fim da
--      avaliação (avaliacao_fecha_em). Um único compromisso por edição; não dá para trocar.
--   2. caca_sorteio_final(..., p_simular := false) só roda depois de avaliacao_fecha_em E com a semente cujo sha256 bate com o
--      compromisso (erros 'avaliacao_ainda_aberta' e 'semente_nao_comprometida'). Como o grupo de concorrentes só fecha no fim da
--      avaliação, quem escolheu a semente antes não sabia o resultado.
--   3. A simulação passa a gravar o evento 'sorteio_simulado' (hash da semente, se é a comprometida, nº de concorrentes): tentativas
--      de sementes diferentes ficam à vista na auditoria. Continua sem criar prêmio.
-- NÃO feito: ação 'substituir' para o prêmio final (hoje, cancelar os ganhadores e repetir exige novo compromisso); fica como decisão.
-- hash de verificação: sha256 do texto da semente SEM espaços nas pontas, em hexadecimal minúsculo.
-- Reverter: restaurar caca_sorteio_final de 20261204; drop function public.caca_sorteio_comprometer(text,text,text), public.caca_sorteio_compromisso(text).

create or replace function public.caca_sorteio_compromisso(p_edicao text) returns text
 language sql stable security definer set search_path to 'public'
as $$
  select e.depois ->> 'hash' from public.caca_evento e
   where e.edicao_codigo = p_edicao and e.acao = 'sorteio_semente_comprometida' order by e.id limit 1
$$;
revoke all on function public.caca_sorteio_compromisso(text) from public, anon, authenticated;

create or replace function public.caca_sorteio_comprometer(p_secret text, p_edicao text, p_hash text) returns jsonb
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_fecha timestamptz; v_h text := lower(btrim(coalesce(p_hash, '')));
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_h !~ '^[0-9a-f]{64}$' then raise exception 'hash_invalido'; end if;
  select avaliacao_fecha_em into v_fecha from public.edicao_publicacao where edicao_codigo = p_edicao;
  if not found then raise exception 'edicao_desconhecida'; end if;
  perform pg_advisory_xact_lock(hashtext('caca_premio:' || p_edicao));
  if public.caca_sorteio_compromisso(p_edicao) is not null then raise exception 'compromisso_ja_registrado'; end if;
  if v_fecha is not null and now() >= v_fecha then raise exception 'compromisso_tardio'; end if;
  perform public.caca_evento_gravar(p_edicao, null, 'sorteio_semente_comprometida', null, jsonb_build_object('hash', v_h));
  return jsonb_build_object('ok', true, 'edicao', p_edicao, 'hash', v_h, 'registrado_em', now(), 'avaliacao_fecha_em', v_fecha);
end $$;
revoke all on function public.caca_sorteio_comprometer(text, text, text) from public, anon, authenticated;
grant execute on function public.caca_sorteio_comprometer(text, text, text) to anon, authenticated;

create or replace function public.caca_sorteio_final(p_secret text, p_edicao text, p_semente text, p_simular boolean default true) returns jsonb
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare
  v_rel boolean; v_fecha timestamptz; v_comp text; v_total int; v_n int; v_base int; v_sem text := btrim(coalesce(p_semente, ''));
  a_pes text[]; a_ape text[]; a_cas int[]; a_ext int[]; a_wpp text[]; a_mid uuid[];
  v_pool int[]; v_k int; v_win int[] := '{}'; v_mot text[] := '{}'; v_rest int[]; v_g int[]; v_falta int; v_pick int[];
  x int; j int; v_grp int := 0; v_conc jsonb; v_gan jsonb := '[]'::jsonb; v_hash text; v_id uuid; v_i int;
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_sem = '' then raise exception 'semente_obrigatoria'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  v_total := public.caca_total_casas(p_edicao);
  v_n := (public.caca_pcfg('ganhadores_final') #>> '{}')::int;
  v_base := (public.caca_pcfg('peso_base') #>> '{}')::int;
  if not coalesce(p_simular, true) then
    perform pg_advisory_xact_lock(hashtext('caca_premio:' || p_edicao));
    if exists (select 1 from public.caca_premio where edicao_codigo = p_edicao and tipo = 'final' and estado in ('selecionado', 'confirmado', 'entregue'))
      then raise exception 'sorteio_final_ja_realizado'; end if;
    -- SEC-07: o sorteio real só roda com a avaliação encerrada e com a semente comprometida (hash registrado antes do fim).
    select avaliacao_fecha_em into v_fecha from public.edicao_publicacao where edicao_codigo = p_edicao;
    if v_fecha is null or now() <= v_fecha then raise exception 'avaliacao_ainda_aberta'; end if;
    v_comp := public.caca_sorteio_compromisso(p_edicao);
    if v_comp is null or v_comp <> encode(extensions.digest(v_sem, 'sha256'), 'hex') then raise exception 'semente_nao_comprometida'; end if;
  end if;

  -- Lista fixa e reproduzível: ordenada por e-mail normalizado.
  select array_agg(r.pessoa order by r.pessoa), array_agg(r.apelido order by r.pessoa), array_agg(r.casas order by r.pessoa),
         array_agg(r.extras order by r.pessoa), array_agg(r.whatsapp order by r.pessoa), array_agg(r.mapa_id order by r.pessoa)
    into a_pes, a_ape, a_cas, a_ext, a_wpp, a_mid
    from public.caca_ranking_v2(p_edicao) r;

  v_pool := array(select i from generate_subscripts(a_pes, 1) i where v_total > 0 and a_cas[i] >= v_total order by i);
  v_k := coalesce(cardinality(v_pool), 0);

  if v_k <= v_n then
    -- todos os completos ganham
    v_pool := array(select i from unnest(v_pool) i order by a_ext[i] desc, i);
    v_win := v_pool;
    for j in 1 .. v_k loop v_mot := v_mot || 'completo'::text; end loop;
    v_falta := v_n - v_k;
    v_rest := array(select i from generate_subscripts(a_pes, 1) i where v_total > 0 and not (i = any(v_pool)) order by a_cas[i] desc, a_ext[i] desc, i);
    while v_falta > 0 and coalesce(cardinality(v_rest), 0) > 0 loop
      v_g := array(select i from unnest(v_rest) i where a_cas[i] = a_cas[v_rest[1]] and a_ext[i] = a_ext[v_rest[1]] order by i);
      if cardinality(v_g) <= v_falta then
        v_win := v_win || v_g;
        for j in 1 .. cardinality(v_g) loop v_mot := v_mot || 'vaga_restante'::text; end loop;
        v_falta := v_falta - cardinality(v_g);
      else
        v_grp := v_grp + 1;
        v_pick := public.caca_sorteio_ponderado(v_sem || ':vagas:' || v_grp, array_fill(1, array[cardinality(v_g)]), v_falta);
        for j in 1 .. cardinality(v_pick) loop
          v_win := v_win || v_g[v_pick[j]];
          v_mot := v_mot || 'vaga_restante_sorteio'::text;
        end loop;
        v_falta := 0;
      end if;
      v_rest := array(select i from unnest(v_rest) i where not (i = any(v_g)) order by a_cas[i] desc, a_ext[i] desc, i);
    end loop;
  else
    v_pick := public.caca_sorteio_ponderado(v_sem,
                array(select v_base + a_ext[i] from unnest(v_pool) with ordinality u(i, o) order by o), v_n);
    for j in 1 .. cardinality(v_pick) loop
      v_win := v_win || v_pool[v_pick[j]];
      v_mot := v_mot || 'sorteio_ponderado'::text;
    end loop;
  end if;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('apelido', a_ape[i], 'casas', a_cas[i], 'extras', a_ext[i],
            'peso', v_base + a_ext[i], 'email', case when v_rel then a_pes[i] end, 'whatsapp', case when v_rel then a_wpp[i] end))
            order by a_pes[i]), '[]'::jsonb) into v_conc from unnest(v_pool) i;
  v_hash := encode(extensions.digest(v_sem || '|' || v_n || '|' || v_base || '|' ||
              coalesce((select string_agg(a_pes[i] || ':' || (v_base + a_ext[i]), ',' order by a_pes[i]) from unnest(v_pool) i), ''), 'sha256'), 'hex');

  for j in 1 .. coalesce(cardinality(v_win), 0) loop
    v_i := v_win[j];
    v_gan := v_gan || jsonb_strip_nulls(jsonb_build_object('posicao', j, 'apelido', a_ape[v_i], 'casas', a_cas[v_i], 'extras', a_ext[v_i],
               'peso', v_base + a_ext[v_i], 'motivo', v_mot[j],
               'email', case when v_rel then a_pes[v_i] end, 'whatsapp', case when v_rel then a_wpp[v_i] end));
    if not coalesce(p_simular, true) then
      insert into public.caca_premio (edicao_codigo, tipo, pessoa, mapa_id, apelido, posicao, estado, semente, detalhe, atualizado_por)
      values (p_edicao, 'final', a_pes[v_i], a_mid[v_i], a_ape[v_i], j, 'selecionado', v_sem,
              jsonb_build_object('casas', a_cas[v_i], 'extras', a_ext[v_i], 'peso', v_base + a_ext[v_i], 'motivo', v_mot[j],
                                 'hash_verificacao', v_hash),
              coalesce(public.ator_rotulo_atual(), 'Painel'))
      returning id into v_id;
      perform public.caca_evento_gravar(p_edicao, v_id, 'sorteio_final', null,
                jsonb_build_object('estado', 'selecionado', 'posicao', j, 'motivo', v_mot[j]));
    end if;
  end loop;
  if not coalesce(p_simular, true) then
    perform public.caca_evento_gravar(p_edicao, null, 'sorteio_final_realizado', null,
              jsonb_build_object('semente', v_sem, 'hash_verificacao', v_hash, 'concorrentes', v_k,
                                 'ganhadores', (select jsonb_agg(g ->> 'apelido' order by (g ->> 'posicao')::int) from jsonb_array_elements(v_gan) g)));
  end if;

  if coalesce(p_simular, true) then      -- a simulação deixa rastro (só o hash da semente), para a auditoria ver tentativas
    perform public.caca_evento_gravar(p_edicao, null, 'sorteio_simulado', null,
              jsonb_build_object('semente_hash', encode(extensions.digest(v_sem, 'sha256'), 'hex'),
                                 'comprometida', coalesce(public.caca_sorteio_compromisso(p_edicao) = encode(extensions.digest(v_sem, 'sha256'), 'hex'), false),
                                 'concorrentes', v_k));
  end if;

  return jsonb_build_object('simulacao', coalesce(p_simular, true), 'edicao', p_edicao, 'semente', v_sem,
    'total_casas', v_total, 'ganhadores_final', v_n, 'peso_base', v_base, 'completos', v_k,
    'regra', case when v_k <= v_n then 'todos_completos_ganham' else 'sorteio_ponderado' end,
    'hash_verificacao', v_hash, 'concorrentes', v_conc, 'ganhadores', v_gan);
end $$;
