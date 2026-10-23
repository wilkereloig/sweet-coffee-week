-- =============================================================================
-- REVERSÃO da migration 20261106_marca_salvar_avisa.
--
-- Tira os oito gatilhos `marca_alterou`, as funções `marca_alterou()` e `avisar_alteracao_marca(uuid, text)` e
-- devolve `marca_definir_logo` à definição que estava no banco em 23/10/2026 (lida por pg_get_functiondef antes da
-- migration): volta o aviso próprio "X enviou uma nova logo".
--
-- ⚠️ ANTES de rodar: publicar o painel da marca com o botão "Enviar para análise" (marca_concluir_cadastro), como
-- até 23/10/2026. Sem o gatilho, o painel novo (só "Salvar") nunca leva o cadastro completo para a conferência e a
-- organização deixa de saber das alterações.
-- Dados que a reversão NÃO desfaz (de propósito): avisos "alterou o cadastro" já criados ficam no sino; cadastros que
-- o gatilho concluiu continuam concluídos (é o mesmo estado que o botão antigo deixava).
-- =============================================================================

drop trigger if exists marca_alterou on public.participantes;
drop trigger if exists marca_alterou on public.participacoes;
drop trigger if exists marca_alterou on public.participantes_itens;
drop trigger if exists marca_alterou on public.unidades;
drop trigger if exists marca_alterou on public.participacao_unidades;
drop trigger if exists marca_alterou on public.unidade_disponibilidade;
drop trigger if exists marca_alterou on public.declaracoes_alimentares;
drop trigger if exists marca_alterou on public.substituicoes;

drop function if exists public.marca_alterou();
drop function if exists public.avisar_alteracao_marca(uuid, text);

create or replace function public.marca_definir_logo(p_dados jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v_p uuid := public.meu_participante(); v_id uuid;
begin
  if v_p is null then raise exception 'sem_marca'; end if;
  v_id := public.registrar_logo(v_p, p_dados, 'participante');
  perform public.notificar('organizacao', null, 'cadastro',
    (select nome_marca from public.participantes where id = v_p) || ' enviou uma nova logo',
    'Já está valendo. Confira e peça correção se precisar.', 'marcas/' || v_p || '/cadastro');
  return v_id;
end $function$;
