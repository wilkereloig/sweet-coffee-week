-- Sincronização automática painel → site (já aplicada no banco em 05/11/2026 pelo MCP; este arquivo é o registro).
-- A cada 2 minutos, para cada casa JÁ publicada, compara o que o painel diria hoje (montar_publico)
-- com a versão vigente e, se mudou, grava uma versão nova. Não precisa clicar em Publicar de novo.
--
-- Travas:
--  • só casa que já tem publicação vigente (publicar casa NOVA segue manual, pelo painel);
--  • marca_e_combo só sincroniza com combo APROVADO e com nome — se o combo sair de "aprovado"
--    (ajuste pedido, em análise), o site fica na última versão boa;
--  • casa encerrada fica fora;
--  • sem aviso à marca (é atualização de dado, não publicação nova);
--  • CEP em branco NÃO trava (o site não mostra CEP e as casas já estão no ar);
--  • alterado_apos_aprovacao é só o marcador de "mudou e falta publicar": a sincronização publica e o zera.
-- Desligar:  select cron.unschedule('sincronizar-publicacoes');

create or replace function public.sincronizar_publicacoes()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record; v_novo jsonb; v_versao int; n int := 0;
begin
  if not pg_try_advisory_xact_lock(hashtext('sincronizar_publicacoes')) then return 0; end if;

  for r in
    select b.id as pub_id, b.participacao_id, b.nivel, b.conteudo, pc.participante_id, pc.combo_status,
           pc.alterado_apos_aprovacao, pc.combo_nome
      from public.publicacoes b
      join public.participacoes pc on pc.id = b.participacao_id
     where b.vigente and pc.status_cadastro <> 'encerrado'
  loop
    begin
      if r.nivel = 'marca_e_combo' and (r.combo_status <> 'aprovado' or coalesce(btrim(r.combo_nome), '') = '') then
        continue;
      end if;
      if not exists (select 1 from public.participacao_unidades where participacao_id = r.participacao_id and participa) then
        continue;
      end if;

      v_novo := public.montar_publico(r.participacao_id, r.nivel);
      if v_novo is null or (v_novo - 'slug') = (r.conteudo - 'slug') then
        if r.alterado_apos_aprovacao then
          update public.participacoes set alterado_apos_aprovacao = false where id = r.participacao_id;
        end if;
        continue;
      end if;

      select coalesce(max(versao), 0) + 1 into v_versao from public.publicacoes where participacao_id = r.participacao_id;
      update public.publicacoes set vigente = false where id = r.pub_id;
      insert into public.publicacoes (participacao_id, versao, nivel, conteudo, publicado_por)
      values (r.participacao_id, v_versao, r.nivel, v_novo, 'sincronização automática');
      update public.participacoes set alterado_apos_aprovacao = false where id = r.participacao_id and alterado_apos_aprovacao;
      insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, ator_rotulo, detalhe)
      values ('publicacao.sincronizar', 'participacoes', r.participacao_id::text, r.participante_id, r.participacao_id,
              'sincronização automática', jsonb_build_object('versao', v_versao, 'nivel', r.nivel));
      n := n + 1;
    exception when others then
      -- uma casa com erro não pode parar as outras
      raise warning 'sincronizar_publicacoes: % falhou: %', r.participacao_id, sqlerrm;
    end;
  end loop;
  return n;
end $function$;

revoke all on function public.sincronizar_publicacoes() from public, anon, authenticated;
grant execute on function public.sincronizar_publicacoes() to service_role;

select cron.schedule('sincronizar-publicacoes', '*/2 * * * *', 'select public.sincronizar_publicacoes()');
