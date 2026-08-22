-- ═══════════════════════════════════════════════════════════════════════════
-- A marca baixa a própria trava de primeiro uso
-- Aplicada em 22/08/2026, junto com o modelo "login pelo nome + senha gerada".
--
-- ⚠️ ESTA FUNÇÃO É O QUE FECHA O CICLO DA SENHA ENTREGUE POR WHATSAPP.
-- A conta nasce com `deve_trocar_senha = true` (Edge Function
-- `criar-acesso-marca`); `/marca/` obriga a troca no primeiro login; e é aqui
-- que a flag cai. Sem esta função a marca trocaria a senha e continuaria presa
-- na tela de troca para sempre — e a senha do WhatsApp nunca deixaria de ser a
-- senha viva.
--
-- POR QUE UMA RPC E NÃO UM UPDATE DIRETO: o grant de `perfis` é só SELECT, de
-- propósito. Papel gravável pelo próprio usuário é promoção de privilégio —
-- qualquer marca viraria organização. Esta é a única porta, e ela só mexe na
-- linha de `auth.uid()`, nunca num id que venha do cliente.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.marcar_senha_trocada()
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_n int;
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.perfis
     set deve_trocar_senha = false,
         senha_trocada_em  = now()
   where user_id = auth.uid();

  get diagnostics v_n = row_count;

  if v_n > 0 then
    -- Aqui a auditoria SABE quem foi: é conta nominal, não a senha
    -- compartilhada da organização.
    insert into public.auditoria (ator_user_id, ator_rotulo, acao, alvo_tabela, alvo_id)
    values (auth.uid(), 'marca', 'senha.trocada', 'perfis', auth.uid()::text);
  end if;

  return v_n > 0;
end;
$function$;

revoke all on function public.marcar_senha_trocada() from public, anon;
grant execute on function public.marcar_senha_trocada() to authenticated;

comment on function public.marcar_senha_trocada() is
  'Baixa deve_trocar_senha do próprio perfil. Chamada por /marca/ depois da troca.';
