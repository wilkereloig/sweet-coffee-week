-- Camada de edição Cartoon — fecha a execução direta das funções de GATILHO (14/10/2026).
-- O advisor do Supabase apontou que participacao_unidade_garantir() e
-- disponibilidade_no_festival() (SECURITY DEFINER) apareciam como chamáveis via
-- /rest/v1/rpc. Função de gatilho não tem uso fora do gatilho; o gatilho segue
-- disparando normalmente sem o EXECUTE de anon/authenticated.
revoke all on function public.participacao_unidade_garantir() from public, anon, authenticated;
revoke all on function public.disponibilidade_no_festival() from public, anon, authenticated;
revoke all on function public.unidades_endereco_mudou() from public, anon, authenticated;
