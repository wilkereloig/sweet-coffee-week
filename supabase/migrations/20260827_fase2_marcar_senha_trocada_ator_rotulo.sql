-- ═══════════════════════════════════════════════════════════════════════════
-- marcar_senha_trocada() crava ator_rotulo = 'marca' pra QUALQUER papel
-- 27/08/2026 — achado da revisão adversarial da Fase 2 do plano de funções
-- da organização.
--
-- ⚠️ ESTA MIGRATION NÃO ESTÁ APLICADA NO BANCO. Escrita e revisável aqui;
-- aplicar é ação manual e deliberada do Eloi (§4.1 do CLAUDE.md).
--
-- `20260822_marcar_senha_trocada.sql` foi escrita quando só marca chamava
-- esta função — o literal `'marca'` no insert de auditoria (linha 42
-- daquele arquivo) nunca foi testado contra outro papel. A Fase 2 do plano
-- de funções passou a chamar a MESMA função pra conta nominal de
-- organização (App.jsx, estado 'definir-senha-org') — a função já funciona
-- certo pra qualquer papel (opera só por `auth.uid()`), só a AUDITORIA
-- mentia: todo primeiro acesso de conta da equipe entrava na tabela
-- `auditoria` rotulado como se fosse marca.
--
-- Correção: lê `papel` da PRÓPRIA LINHA que acabou de ser atualizada
-- (`update ... returning papel into v_papel`), sem consulta extra. Nada mais
-- muda — mesma trava (`auth.uid() is null` recusa), mesmo grant
-- (`to authenticated`), mesmo comportamento pra quem já chamava certo.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.marcar_senha_trocada()
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_n     int;
  v_papel text;
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.perfis
     set deve_trocar_senha = false,
         senha_trocada_em  = now()
   where user_id = auth.uid()
  returning papel into v_papel;

  get diagnostics v_n = row_count;

  if v_n > 0 then
    -- Agora a auditoria diz quem foi de verdade — 'marca' ou 'organizacao',
    -- lido da própria linha, nunca escrito à mão.
    insert into public.auditoria (ator_user_id, ator_rotulo, acao, alvo_tabela, alvo_id)
    values (auth.uid(), coalesce(v_papel, 'marca'), 'senha.trocada', 'perfis', auth.uid()::text);
  end if;

  return v_n > 0;
end;
$function$;

-- create or replace PRESERVA a ACL da função existente (revoke/grant já
-- aplicados em 20260822) — nada a repetir aqui.
