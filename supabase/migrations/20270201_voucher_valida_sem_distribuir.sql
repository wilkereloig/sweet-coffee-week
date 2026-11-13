-- 13/11/2026 (pedido do Wilker): todo voucher da marca pode ser validado no balcão, mesmo que a
-- organização não o tenha marcado como destinado/enviado no painel. Os vouchers impressos foram
-- entregues em mãos sem baixa no sistema e as casas recebiam "ainda não foi entregue a ninguém".
-- Continua barrado: código de outra marca, já utilizado, cancelado e voucher reservado à Caça
-- (trigger caca_premio_voucher_pool_proteger, que segue valendo).
create or replace function public.marca_usar_voucher(p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.vouchers%rowtype; v_part uuid; v_marca text;
begin
  select v2.* into v from public.vouchers v2
    join public.participacoes pa on pa.id = v2.participacao_id
    join public.participantes p on p.id = pa.participante_id
   where v2.codigo = upper(regexp_replace(coalesce(p_codigo, ''), '\s', '', 'g'))
     and p.user_id = auth.uid() and public.conta_ativa()
   for update of v2;
  if not found then raise exception 'voucher_nao_encontrado'; end if;
  if v.status = 'utilizado' then raise exception 'voucher_ja_utilizado'; end if;
  if v.status = 'cancelado' then raise exception 'voucher_cancelado'; end if;
  update public.vouchers set status = 'utilizado', utilizado_em = now(), utilizado_rotulo = public.ator_rotulo_atual()
   where id = v.id;
  select pa.participante_id, p.nome_marca into v_part, v_marca
    from public.participacoes pa join public.participantes p on p.id = pa.participante_id where pa.id = v.participacao_id;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('voucher.utilizado', 'vouchers', v.id::text, v_part, v.participacao_id, jsonb_build_object('codigo', v.codigo));
  perform public.notificar('organizacao', null, 'voucher', v_marca || ' registrou um voucher', v.codigo, 'contatos/vouchers');
  return jsonb_build_object('codigo', v.codigo, 'utilizado_em', now());
end $$;
