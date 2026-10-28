-- ─────────────────────────────────────────────────────────────────────────────
-- Pedido da organização: "Complementar a resposta" não pode apagar a resposta anterior (auditoria de 21/10/2026).
-- Só substitui `marca_responder_solicitacao` (mesma assinatura e mesmo retorno).
--
-- Bug: a tela oferece "Complementar a resposta" para pedido já respondido, mas a função gravava `resposta = <texto novo>`
-- — o que a marca tinha escrito antes sumia (e o histórico da organização só guarda o que está na linha).
-- Agora, se já existe resposta, o texto novo entra DEPOIS dela, com a data do complemento. Passar de 4000 caracteres no
-- total é recusado (`resposta_longa`), em vez de cortar o fim do que a pessoa acabou de escrever.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.marca_responder_solicitacao(p_solicitacao uuid, p_resposta text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  novo text := trim(coalesce(p_resposta, ''));
  anterior text;
  junto text;
begin
  if novo = '' then raise exception 'resposta_vazia'; end if;

  select nullif(trim(coalesce(e.resposta, '')), '') into anterior
    from public.solicitacao_estado e
   where e.solicitacao_id = p_solicitacao
     and exists (select 1 from public.participacoes pa
                  where pa.id = e.participacao_id and pa.participante_id = public.meu_participante());
  if not found then raise exception 'pedido_nao_encontrado'; end if;

  junto := case when anterior is null then novo
                else anterior || E'\n\n— Complemento de ' || to_char(now() at time zone 'America/Fortaleza', 'DD/MM "às" HH24:MI') || E' —\n' || novo end;
  if char_length(junto) > 4000 then raise exception 'resposta_longa'; end if;

  update public.solicitacao_estado e set
    estado = 'respondido', respondido_em = now(), respondido_por = auth.uid(), resposta = junto
   where e.solicitacao_id = p_solicitacao
     and exists (select 1 from public.participacoes pa
                  where pa.id = e.participacao_id and pa.participante_id = public.meu_participante());
end $function$;
