-- Reverte 20261125_preenchimento_automatico.sql. Desligar sem reverter: update public.admin_config set preenchimento_automatico = false;
-- A edge function `processar-preenchimento` fica no ar sem efeito (ninguém a chama); apague-a no painel do Supabase se quiser.
-- As revisões gravadas ('Claude (automático)') e as notificações já criadas ficam (são dado).

do $$ begin
  if exists (select 1 from cron.job where jobname = 'scw-preenchimento-reprocessar') then perform cron.unschedule('scw-preenchimento-reprocessar'); end if;
end $$;
drop trigger if exists preenchimento_automatico on public.preenchimento_envios;

-- devolve os trechos das funções antigas
do $mig$
declare v_def text; v_novo text;
begin
  select pg_get_functiondef('public.preenchimento_enviar(text,jsonb)'::regprocedure) into v_def;
  v_novo := replace(replace(v_def,
    E'  if not public.preenchimento_automatico() then perform public.notificar(''organizacao'', null, ''cadastro'',',
    E'  perform public.notificar(''organizacao'', null, ''cadastro'','),
    E'''/gestao''); end if;\n  return jsonb_build_object(''ok'', true, ''enviado_em'', v_em);',
    E'''/gestao'');\n  return jsonb_build_object(''ok'', true, ''enviado_em'', v_em);');
  if v_novo <> v_def then execute v_novo; end if;

  select pg_get_functiondef('public.org_preenchimento_decidir(text,uuid,boolean,text)'::regprocedure) into v_def;
  v_novo := replace(replace(v_def,
    'if not (public.eh_servico() or public.pode(p_secret, ''cadastro.editar'')) then',
    'if not public.pode(p_secret, ''cadastro.editar'') then'),
    '(case when public.eh_servico() then ''Automático (formulário)'' else public.rotulo_ator() end)', 'public.rotulo_ator()');
  if v_novo <> v_def then execute v_novo; end if;

  select pg_get_functiondef('public.alteracao_campo_marca()'::regprocedure) into v_def;
  v_novo := replace(v_def,
    'v_eu := coalesce(public.meu_participante(), nullif(current_setting(''scw.alterou_participante'', true), '''')::uuid);',
    'v_eu := public.meu_participante();');
  if v_novo <> v_def then execute v_novo; end if;

  select pg_get_functiondef('public.pode(text,text)'::regprocedure) into v_def;
  v_novo := regexp_replace(v_def, E'\\s*or coalesce\\(current_setting\\(''scw\\.sistema_ativo'', true\\), ''''\\) = ''on''', '');
  if v_novo <> v_def then execute v_novo; end if;
end $mig$;

drop function if exists public.preenchimento_disparar_automatico();
drop function if exists public.preenchimento_reprocessar();
drop function if exists public.preenchimento_chamar_funcao(uuid);
drop function if exists public.sistema_falha_envio(uuid, text);
drop function if exists public.preenchimento_aviso_falha(uuid, text);
drop function if exists public.sistema_finalizar_envio(uuid, integer, text);
drop function if exists public.sistema_gravar_revisoes(uuid, jsonb);
drop function if exists public.sistema_textos_para_revisar(uuid);
drop function if exists public.sistema_aplicar_envio(uuid);
drop function if exists public.eh_servico();
drop function if exists public.preenchimento_automatico();
alter table public.preenchimento_envios drop column if exists automatico_concluido_em, drop column if exists aviso_falha_em;
alter table public.admin_config drop column if exists preenchimento_automatico;
