-- Fase 4 do plano de funções da organização (27/08/2026): "as Edge Functions
-- aprendem JWT". As cinco funções de conta (criar-conta-organizacao,
-- regerar-senha-conta, arquivo-url, enviar-push, criar-acesso-marca) rodam
-- com service_role — auth.uid() é sempre nulo lá dentro, então elas não
-- conseguem chamar pode(p_secret, p_acao) e deixar a perna nominal resolver
-- sozinha (essa perna lê auth.uid() do lado de quem chamou a RPC, que na
-- Edge Function é sempre o service_role, nunca a pessoa).
--
-- pode_por_user espelha exatamente a perna nominal de pode() (mesmo texto do
-- primeiro `exists(...)` de 20260825_contas_organizacao_por_funcao.sql),
-- trocando `auth.uid()` por um parâmetro — a própria Edge Function extrai o
-- user_id do JWT (Authorization: Bearer <token>) via admin.auth.getUser() e
-- passa aqui. Não cobre a perna da senha única: quem chama pelo secret
-- continua usando pode(p_secret, p_acao) direto, sem passar por esta função.
create or replace function public.pode_por_user(p_user uuid, p_acao text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.perfis pf
      join public.permissoes pm on pm.funcao = pf.funcao
     where pf.user_id = p_user
       and pf.ativo
       and pf.papel = 'organizacao'
       and pm.acao = p_acao
  );
$$;

-- Só service_role chama isso. A função recebe QUALQUER user_id por
-- parâmetro — exposta a public/anon/authenticated, qualquer conta logada
-- poderia perguntar "fulano pode X?" para o UUID de qualquer outra pessoa,
-- um vazamento de papel/permissão de terceiro que pode(), amarrada ao
-- auth.uid() de quem chama, nunca permitiu.
--
-- As três linhas juntas, mesma lição do CLAUDE.md §4.1 (Fase 2 de
-- autenticação, 23/08/2026): revoke ... from public sozinho não fecha (o
-- Supabase concede EXECUTE explicitamente a anon e authenticated), e
-- revoke ... from anon, authenticated sozinho também não (o Postgres
-- concede EXECUTE a PUBLIC por padrão em toda função nova, e anon herda de
-- PUBLIC).
revoke execute on function public.pode_por_user(uuid, text) from public, anon, authenticated;
