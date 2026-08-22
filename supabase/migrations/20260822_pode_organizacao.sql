-- Fase 2 — autenticação da organização: a função-ponte.
-- docs/INSTRUCAO-painel-fase2.md §6.
--
-- Objetivo: abrir um segundo caminho de acesso, nominal e auditável, SEM fechar
-- o primeiro. `admin_ok` continua funcionando; quem tiver conta com
-- perfis.papel = 'organizacao' passa a entrar sem senha compartilhada.
--
-- ⚠️ Esta migration NÃO remove `admin_ok`, NÃO mexe na tela de senha única e
-- NÃO obriga login nominal em /organizacao/. Ver §6.4.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. A ponte
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.pode_organizacao(p_secret text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.perfis
       where user_id = auth.uid() and papel = 'organizacao' and ativo
    )
    or (p_secret is not null and public.admin_ok(p_secret));
$$;

-- Ninguém chama isto de fora: as 14 RPCs abaixo são SECURITY DEFINER e a
-- executam como dona. Exposta a `anon`, ela viraria mais um oráculo de senha
-- ao lado de `admin_ping` — sem ganho nenhum.
revoke execute on function public.pode_organizacao(text) from public;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Trocar o guard nas 14 RPCs da organização
-- ─────────────────────────────────────────────────────────────────────────
-- A troca é feita por reescrita da própria definição, e não copiando 14 corpos
-- para dentro deste arquivo. Copiar seria criar a segunda fonte de verdade que
-- o CLAUDE.md §5.2 proíbe: o corpo real fica no banco, e um dia os dois
-- divergiriam sem ninguém notar.
--
-- Conferido em 22/08/2026, antes de escrever: cada uma das 14 tem EXATAMENTE
-- uma ocorrência, e todas na forma literal `public.admin_ok(p_secret)`.
-- O bloco reconfere isso em tempo de execução e aborta se algo não bater.
--
-- Fora da lista de propósito (§6.2): `admin_ok` (é a base), `admin_ping` (é o
-- próprio teste da senha), `get_rankings` (pública) e todas as `submit_*`.
do $migra$
declare
  r        record;
  v_def    text;
  v_novo   text;
  v_qtd    int;
  v_total  int := 0;
  ALVOS    text[] := array[
    'get_audit_report', 'get_contact_requests', 'get_feedback_admin',
    'get_feedback_report', 'get_organizacao_resumo', 'get_participantes',
    'get_participation_interests', 'get_pesquisa_report', 'get_quero_participar',
    'get_rankings_admin', 'get_support_interests', 'get_suspicious_votes',
    'organizacao_apagar_registro', 'organizacao_atualizar_registro'
  ];
begin
  for r in
    select p.oid, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f' and p.proname = any (ALVOS)
     order by p.proname
  loop
    v_def := pg_get_functiondef(r.oid);
    v_qtd := (length(v_def) - length(replace(v_def, 'public.admin_ok(p_secret)', ''))) / 25;

    if v_qtd <> 1 then
      raise exception
        'guard inesperado em %(): % ocorrências de public.admin_ok(p_secret), esperava 1',
        r.proname, v_qtd;
    end if;

    v_novo := replace(v_def, 'public.admin_ok(p_secret)', 'public.pode_organizacao(p_secret)');
    execute v_novo;
    v_total := v_total + 1;
  end loop;

  if v_total <> array_length(ALVOS, 1) then
    raise exception 'esperava % funções, reescrevi %', array_length(ALVOS, 1), v_total;
  end if;

  raise notice 'pode_organizacao aplicada em % RPCs', v_total;
end
$migra$;
