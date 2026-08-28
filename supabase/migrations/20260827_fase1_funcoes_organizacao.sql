-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 1 do plano de funções da organização · 27/08/2026
-- Handoff "Plano · Implementação e aprimoramento das funções (organização)".
--
-- ⚠️ ESTA MIGRATION NÃO ESTÁ APLICADA NO BANCO. Escrita e revisável aqui;
-- aplicar é ação manual e deliberada do Eloi (§4.1 do CLAUDE.md — não há
-- CLI/config.toml neste projeto).
--
-- Decisões aplicadas nesta migration (as demais do plano não mexem em banco):
--   D1 · recuperação de senha por Edge Function dedicada — ver
--        supabase/functions/regerar-senha-conta/, não precisa de SQL aqui além
--        do guard que ela já chama (`pode`, ação `acesso.gerir`, já existe).
--   D2 · restringir 5 relatórios sensíveis a uma ação nova, `relatorio.ler`.
--
-- Os 11 nomes de função e a contagem abaixo vêm de leitura DIRETA do banco de
-- produção em 27/08/2026 (prosrc de pg_proc via Supabase MCP), não de grep nos
-- arquivos .sql — migrations posteriores reescrevem funções que uma anterior
-- já criou, e contar ocorrência de texto nos arquivos soma versão velha com
-- versão nova (CLAUDE.md §10.9: "conferir migration por contagem não pega a
-- divergência").
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Nova ação: relatorio.ler ─────────────────────────────────────────────
-- Hoje estas cinco RPCs exigem só `dado.ler` — o mesmo que abre qualquer tela
-- de "só olhar" — mas carregam material sensível: auditoria, votos suspeitos,
-- e pesquisa/feedback com dado pessoal de público. A função Consulta não
-- deveria alcançar isso.
--
-- ⚠️ DECISÃO PENDENTE DE CONFIRMAÇÃO ANTES DE APLICAR: esta migration dá
-- `relatorio.ler` só para Administrador. O plano original cogitava "e talvez
-- Curadoria" sem decidir — se Curadoria também deve enxergar estes 5
-- relatórios, acrescente antes de aplicar:
--   insert into public.permissoes (funcao, acao) values ('curadoria', 'relatorio.ler');
insert into public.permissoes (funcao, acao) values
  ('administrador', 'relatorio.ler')
on conflict do nothing;

-- ── 2 · Uniformizar o guard das 11 RPCs que ainda usam pode_organizacao(p_secret) ──
-- `pode_organizacao(p_secret)` é literalmente `pode(p_secret, 'dado.ler')` —
-- a troca não muda comportamento pra 6 delas. As outras 5 passam a exigir
-- `relatorio.ler`, que só Administrador tem (item 1 acima) — ESSAS SIM mudam
-- de comportamento: Curadoria, Produção e Consulta deixam de enxergá-las.
--
-- Mesma técnica de 20260825_contas_organizacao_por_funcao.sql: reescreve a
-- definição a partir do próprio banco (pg_get_functiondef), nunca copia o
-- corpo pra cá — copiar seria a segunda fonte de verdade que o §5.2 proíbe.
-- Aborta se algum dos 11 nomes não existir, ou se o guard não aparecer
-- exatamente uma vez no corpo — divergência ali é bug, não detalhe.
do $migra$
declare
  r                 record;
  v_def             text;
  v_acao            text;
  v_trocas          int := 0;
  v_nomes_trocados  text[] := array[]::text[];
  v_esperados constant text[] := array[
    -- Vão para relatorio.ler — a leitura sensível (D2):
    'get_audit_report', 'get_suspicious_votes', 'get_pesquisa_report',
    'get_feedback_report', 'get_rankings_admin',
    -- Continuam dado.ler — só trocam a chamada indireta pela direta:
    'get_contact_requests', 'get_feedback_admin', 'get_organizacao_resumo',
    'get_participation_interests', 'get_quero_participar', 'get_support_interests'
  ];
begin
  -- `prokind = 'f'` exclui procedure/aggregate/window (nenhuma das 11 é, mas
  -- barato de garantir); nome único confirmado por leitura direta do banco em
  -- 27/08 (nenhuma delas está sobrecarregada). Ainda assim conta por NOME
  -- DISTINTO no fim, não por linha do loop — sobrecarga futura não infla o
  -- contador escondendo um nome que faltou.
  for r in
    select p.oid, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and p.proname = any(v_esperados)
  loop
    v_acao := case r.proname
                when 'get_audit_report'     then 'relatorio.ler'
                when 'get_suspicious_votes' then 'relatorio.ler'
                when 'get_pesquisa_report'  then 'relatorio.ler'
                when 'get_feedback_report'  then 'relatorio.ler'
                when 'get_rankings_admin'   then 'relatorio.ler'
                else 'dado.ler'
              end;

    v_def := pg_get_functiondef(r.oid);

    if (length(v_def) - length(replace(v_def, 'pode_organizacao(p_secret)', '')))
       / length('pode_organizacao(p_secret)') <> 1 then
      raise exception 'guard nao encontrado exatamente uma vez em %', r.proname;
    end if;

    execute replace(v_def, 'pode_organizacao(p_secret)', format('pode(p_secret, %L)', v_acao));
    v_nomes_trocados := v_nomes_trocados || r.proname;
    v_trocas := v_trocas + 1;
  end loop;

  if v_trocas <> 11 or cardinality(array(select distinct unnest(v_nomes_trocados))) <> 11 then
    raise exception 'esperava trocar 11 funcoes (nomes distintos), trocou % (% distintos) — algum nome de v_esperados nao foi encontrado ou está sobrecarregado',
      v_trocas, cardinality(array(select distinct unnest(v_nomes_trocados)));
  end if;
end
$migra$;

-- ── 3 · minhas_permissoes() ─────────────────────────────────────────────────
-- O que o front precisa pra montar a UI por função (Fase 3 do plano), sem
-- expor a matriz inteira: `permissoes`/`funcoes` têm RLS ligada e ZERO
-- policies (deny-all) — ler direto não funciona, e criar policy pra isso
-- exporia a matriz de todo mundo em vez do recorte da própria pessoa.
--
-- security definer resolve por auth.uid(), sem receber p_secret. Quem entra
-- pela senha única não tem perfil de organização (não passa pelo `where
-- pf.user_id = auth.uid()`), então esta função devolve conjunto vazio pra
-- ela — o front trata isso como "acesso total", que é exatamente o que o
-- banco já faz pra esse caminho (`pode()`, segunda perna do OR).
create or replace function public.minhas_permissoes()
returns table (funcao text, rotulo text, acoes text[], deve_trocar_senha boolean, ativo boolean)
language sql stable security definer set search_path = public as $$
  select pf.funcao, f.rotulo,
         coalesce(
           (select array_agg(pm.acao) from public.permissoes pm where pm.funcao = pf.funcao),
           array[]::text[]
         ),
         pf.deve_trocar_senha, pf.ativo
    from public.perfis pf
    left join public.funcoes f on f.codigo = pf.funcao
   where pf.user_id = auth.uid()
     and pf.papel = 'organizacao';
$$;

revoke all on function public.minhas_permissoes() from public, anon;
grant execute on function public.minhas_permissoes() to authenticated;
