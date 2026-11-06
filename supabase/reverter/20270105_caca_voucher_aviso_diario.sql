-- Reverte 20270105_caca_voucher_aviso_diario: o ciclo volta a não chamar o gerador, o gerador some, os avisos gerados saem.
create or replace function public.caca_avisos_ciclo()
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare v_erros jsonb := '{}'::jsonb; v_pend int; v_push text := 'nada_a_enviar';
begin
  begin perform public.caca_avisos_gerar_automaticos(); exception when others then v_erros := v_erros || jsonb_build_object('automaticos', sqlerrm); end;
  begin perform public.caca_avisos_gerar_premios(); exception when others then v_erros := v_erros || jsonb_build_object('premios', sqlerrm); end;
  begin perform public.caca_programacao_gerar(); exception when others then v_erros := v_erros || jsonb_build_object('programacao', sqlerrm); end;
  begin perform public.caca_campanha_gerar(); exception when others then v_erros := v_erros || jsonb_build_object('campanha', sqlerrm); end;
  v_pend := cardinality(public.caca_avisos_para_processar());
  if v_pend > 0 then
    begin
      perform net.http_post(url := 'https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/caca-push',
        body := jsonb_build_object('ciclo', true), headers := jsonb_build_object('Content-Type', 'application/json'));
      v_push := 'pedido_enviado';
    exception when others then v_erros := v_erros || jsonb_build_object('push', sqlerrm); v_push := 'falhou';
    end;
  end if;
  insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
  values ('avisos_ciclo_estado', jsonb_build_object('em', now(), 'avisos_com_push_pendente', v_pend, 'push', v_push, 'erros', v_erros),
          'Último ciclo do agendador dos avisos (só leitura: o ciclo grava aqui).', now(), 'agendador')
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = 'agendador';
end $function$;
revoke all on function public.caca_avisos_ciclo() from public, anon, authenticated;
drop function if exists public.caca_voucher_aviso_gerar(timestamptz);
delete from public.caca_aviso_entrega where aviso_id in (select id from public.caca_aviso where chave_dedupe like 'voucher:aviso:%');
delete from public.caca_aviso where chave_dedupe like 'voucher:aviso:%';
delete from public.caca_config where chave = 'voucher_aviso';
