-- 02/11/2026 (pedido do Wilker: "automatize os participantes que preencheram o formulário… colocar automaticamente na sessão dos
-- participantes. E gerar uma notificação", com crédito da API do Claude).
--
-- Hoje: a marca envia o /preencher → aviso "revise e aplique" → ALGUÉM clica em Aplicar → só então o dado entra no cadastro e
-- em Social media › Participantes; a revisão de texto (`revisoes_texto`) era feita à mão. Com a chave ligada:
--   1. o envio novo chama a edge function `processar-preenchimento` (pg_net, só o id — mesmo padrão do `enviar-push`);
--   2. ela APLICA o envio por `sistema_aplicar_envio` (reaproveita `org_preenchimento_decidir`, que passa a aceitar a chave de
--      serviço) — e as mudanças entram em `alteracoes_campo`, então "Novo/Alterado" por campo aparece em Participantes;
--   3. ela manda os textos livres para a API do Claude (só ortografia/pontuação/maiúsculas) e grava `revisoes_texto`
--      por `sistema_gravar_revisoes`, que confere no servidor: o original é o atual, os DÍGITOS não mudam, o tamanho é parecido;
--   4. `sistema_finalizar_envio` gera UMA notificação (com push) com link para a ficha em Participantes.
-- A API cair NUNCA impede o passo 2 (a revisão é à parte do cadastro). Falha ao aplicar → o envio fica pendente, o cron
-- (5 min) tenta de novo e, passados 30 min, avisa a organização no formato antigo ("revise e aplique").
--
-- ⚠️ Nasce DESLIGADO: `admin_config.preenchimento_automatico = false`. Nada muda até alguém ligar (depois do deploy da função e
-- do secret ANTHROPIC_API_KEY). Ligado, o aviso antigo "enviou… revise e aplique" deixa de sair no envio (senão são dois).
-- ⚠️ `alteracao_campo_marca` só registrava mudança feita pela PRÓPRIA marca logada (meu_participante()). A aplicação automática
-- roda sem sessão: `sistema_aplicar_envio` marca a transação com `scw.alterou_participante` e o gatilho passa a aceitar isso.
-- Reversão: supabase/reverter/20261125_preenchimento_automatico.sql. Teste: supabase/testes/preenchimento-automatico.sql.

-- ── 1. chave, colunas e quem é "serviço" ─────────────────────────────────────
alter table public.admin_config add column if not exists preenchimento_automatico boolean not null default false;
alter table public.preenchimento_envios
  add column if not exists automatico_concluido_em timestamptz,
  add column if not exists aviso_falha_em timestamptz;

create or replace function public.preenchimento_automatico()
 returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce((select preenchimento_automatico from public.admin_config limit 1), false) $$;
revoke all on function public.preenchimento_automatico() from public, anon, authenticated;

-- Só a chave de serviço (a edge function) tem este papel no token; a sessão da equipe e o anon, não.
create or replace function public.eh_servico()
 returns boolean language sql stable
as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role' $$;
revoke all on function public.eh_servico() from public, anon, authenticated;

-- ── 2. o gatilho de "Novo/Alterado" aceita a aplicação automática ─────────────
do $mig$
declare v_def text; v_novo text;
begin
  select pg_get_functiondef('public.alteracao_campo_marca()'::regprocedure) into v_def;
  if v_def like '%scw.alterou_participante%' then return; end if;
  v_novo := replace(v_def, $a$v_eu := public.meu_participante();$a$,
    $b$v_eu := coalesce(public.meu_participante(), nullif(current_setting('scw.alterou_participante', true), '')::uuid);$b$);
  if v_novo = v_def then raise exception 'trecho_nao_encontrado: meu_participante'; end if;
  execute v_novo;
end $mig$;

-- ── 3. aplicar o envio: a chave de serviço pode, com o rótulo "Automático" ────
do $mig$
declare v_def text; v_novo text;
begin
  select pg_get_functiondef('public.org_preenchimento_decidir(text,uuid,boolean,text)'::regprocedure) into v_def;
  if v_def like '%eh_servico()%' then return; end if;
  v_novo := replace(v_def, $a$if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;$a$,
    $b$if not (public.eh_servico() or public.pode(p_secret, 'cadastro.editar')) then raise exception 'nao_autorizado'; end if;$b$);
  if v_novo = v_def then raise exception 'trecho_nao_encontrado: pode'; end if;
  v_def := v_novo;
  v_novo := replace(v_def, 'public.rotulo_ator()',
    $c$(case when public.eh_servico() then 'Automático (formulário)' else public.rotulo_ator() end)$c$);
  if v_novo = v_def then raise exception 'trecho_nao_encontrado: rotulo_ator'; end if;
  execute v_novo;
end $mig$;

-- `org_preenchimento_decidir` chama `org_salvar_*`, que também validam `pode(p_secret, …)`. Liberar o `pode` para toda chave de
-- serviço seria um buraco (outras funções validam a senha de quem digita com o cliente de serviço); então só vale DENTRO da
-- transação de `sistema_aplicar_envio`, que marca `scw.sistema_ativo` e que só a chave de serviço consegue executar.
do $mig$
declare v_def text; v_novo text;
begin
  select pg_get_functiondef('public.pode(text,text)'::regprocedure) into v_def;
  if v_def like '%scw.sistema_ativo%' then return; end if;
  v_novo := regexp_replace(v_def, '(and pm\.acao = p_acao\s*\))(\s*or\s*\()',
    E'\\1 or coalesce(current_setting(''scw.sistema_ativo'', true), '''') = ''on'' \\2');
  if v_novo = v_def then raise exception 'trecho_nao_encontrado: pode (select)'; end if;
  execute v_novo;
end $mig$;

-- ── 4. o aviso antigo só sai quando o automático está desligado ──────────────
do $mig$
declare v_def text; v_novo text;
begin
  select pg_get_functiondef('public.preenchimento_enviar(text,jsonb)'::regprocedure) into v_def;
  if v_def like '%preenchimento_automatico()%' then return; end if;
  v_novo := replace(v_def, E'  perform public.notificar(''organizacao'', null, ''cadastro'',\n    v_marca ||',
                           E'  if not public.preenchimento_automatico() then perform public.notificar(''organizacao'', null, ''cadastro'',\n    v_marca ||');
  if v_novo = v_def then raise exception 'trecho_nao_encontrado: notificar (inicio)'; end if;
  v_def := v_novo;
  v_novo := replace(v_def, E'''/gestao'');\n  return jsonb_build_object(''ok'', true, ''enviado_em'', v_em);',
                           E'''/gestao''); end if;\n  return jsonb_build_object(''ok'', true, ''enviado_em'', v_em);');
  if v_novo = v_def then raise exception 'trecho_nao_encontrado: notificar (fim)'; end if;
  execute v_novo;
end $mig$;

-- ── 5. as funções da edge function (só service_role) ─────────────────────────
-- Aplica o envio (se ainda pendente) e devolve o resumo. Já aplicado e concluído → { ja: true } e a função para.
-- Aplicado pelo automático e ainda não concluído (a função caiu no meio) → continua daí.
create or replace function public.sistema_aplicar_envio(p_envio uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_e public.preenchimento_envios; v_pa public.participacoes; v_marca text; v_n int;
begin
  if not public.eh_servico() then raise exception 'nao_autorizado'; end if;
  select * into v_e from public.preenchimento_envios where id = p_envio for update;
  if not found then return jsonb_build_object('ok', false, 'erro', 'envio_nao_encontrado'); end if;
  select * into v_pa from public.participacoes where id = v_e.participacao_id;
  select nome_marca into v_marca from public.participantes where id = v_pa.participante_id;

  if v_e.status = 'pendente' then
    perform set_config('scw.alterou_participante', v_pa.participante_id::text, true);
    perform set_config('scw.sistema_ativo', 'on', true);
    perform public.org_preenchimento_decidir(null, p_envio, true, null);
    perform set_config('scw.sistema_ativo', '', true);
    perform set_config('scw.alterou_participante', '', true);
  elsif not (v_e.status = 'aplicado' and v_e.automatico_concluido_em is null and v_e.revisado_por_rotulo like 'Automático%') then
    return jsonb_build_object('ok', true, 'ja', true);
  end if;

  select count(*) into v_n from public.preenchimento_envios where link_id = v_e.link_id;
  return jsonb_build_object('ok', true, 'ja', false,
    'participacao_id', v_pa.id, 'participante_id', v_pa.participante_id, 'marca', v_marca, 'envio_n', v_n);
end $function$;

-- Os textos livres da marca que a revisão cobre, com o campo no MESMO formato de `revisoes_texto` (o painel lê por ele):
-- combo.nome|descricao|condicoes · <tipo>.nome|descricao|ingredientes · <tipo>.troca<k>.alternativa|descricao|como_solicitar
-- (k = posição da troca na lista do item, como `montar_publico` a entrega e a tela a lê).
create or replace function public.sistema_textos_para_revisar(p_participacao uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  c jsonb; it jsonb; s jsonb; f text; k int; v_tipo text; v_out jsonb := '[]'::jsonb;
begin
  if not public.eh_servico() then raise exception 'nao_autorizado'; end if;
  c := public.montar_publico(p_participacao, 'marca_e_combo') -> 'combo';
  if c is null then return v_out; end if;
  foreach f in array array['nome', 'descricao', 'condicoes'] loop
    if nullif(btrim(c ->> f), '') is not null then
      v_out := v_out || jsonb_build_array(jsonb_build_object('campo', 'combo.' || f, 'original', c ->> f));
    end if;
  end loop;
  for it in select e from jsonb_array_elements(coalesce(c -> 'itens', '[]'::jsonb)) e loop
    v_tipo := it ->> 'tipo';
    foreach f in array array['nome', 'descricao', 'ingredientes'] loop
      if nullif(btrim(it ->> f), '') is not null then
        v_out := v_out || jsonb_build_array(jsonb_build_object('campo', v_tipo || '.' || f, 'original', it ->> f));
      end if;
    end loop;
    k := 0;
    for s in select e from jsonb_array_elements(coalesce(it -> 'substituicoes', '[]'::jsonb)) e loop
      foreach f in array array['alternativa', 'descricao', 'como_solicitar'] loop
        if nullif(btrim(s ->> f), '') is not null then
          v_out := v_out || jsonb_build_array(jsonb_build_object('campo', v_tipo || '.troca' || k || '.' || f, 'original', s ->> f));
        end if;
      end loop;
      k := k + 1;
    end loop;
  end loop;
  return v_out;
end $function$;

-- Grava as revisões que a API devolveu — `p_revisoes` = [{ campo, revisado }]. O ORIGINAL vem do banco (nunca do que a API
-- devolve) e a revisão só entra se: o campo existe; o texto mudou de fato; os DÍGITOS são os mesmos (preço, horário, número não
-- mudam); o tamanho fica entre 60% e 160% do original. Não sobrescreve revisão já feita (à mão) sobre o MESMO original.
-- Devolve quantas gravou.
create or replace function public.sistema_gravar_revisoes(p_participacao uuid, p_revisoes jsonb)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_textos jsonb; r jsonb; v_orig text; v_rev text; v_n int := 0; v_lin int;
  plano constant text := '\s+';
begin
  if not public.eh_servico() then raise exception 'nao_autorizado'; end if;
  if jsonb_typeof(p_revisoes) <> 'array' then return 0; end if;
  v_textos := public.sistema_textos_para_revisar(p_participacao);
  for r in select e from jsonb_array_elements(p_revisoes) e loop
    select t ->> 'original' into v_orig from jsonb_array_elements(v_textos) t where t ->> 'campo' = r ->> 'campo' limit 1;
    v_rev := btrim(r ->> 'revisado');
    continue when v_orig is null or coalesce(v_rev, '') = '';
    continue when btrim(regexp_replace(v_orig, plano, ' ', 'g')) = btrim(regexp_replace(v_rev, plano, ' ', 'g'));
    continue when regexp_replace(v_orig, '\D', '', 'g') <> regexp_replace(v_rev, '\D', '', 'g');
    v_lin := char_length(btrim(v_orig));
    continue when char_length(v_rev) < v_lin * 0.6 or char_length(v_rev) > v_lin * 1.6;
    insert into public.revisoes_texto (participacao_id, campo, original, revisado, revisado_por_rotulo)
    values (p_participacao, r ->> 'campo', v_orig, v_rev, 'Claude (automático)')
    on conflict (participacao_id, campo) do update
      set original = excluded.original, revisado = excluded.revisado, revisado_em = now(), revisado_por_rotulo = excluded.revisado_por_rotulo
      where public.revisoes_texto.original is distinct from excluded.original;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $function$;

-- A notificação (com push, pelo gatilho de sempre). p_revisao: 'ok' | 'sem_chave' | 'falhou'.
create or replace function public.sistema_finalizar_envio(p_envio uuid, p_revisados integer, p_revisao text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_e public.preenchimento_envios; v_pa public.participacoes; v_marca text; v_n int; v_itens int; v_trocas int; v_lojas int; v_txt text;
begin
  if not public.eh_servico() then raise exception 'nao_autorizado'; end if;
  select * into v_e from public.preenchimento_envios where id = p_envio for update;
  if not found or v_e.automatico_concluido_em is not null then return; end if;
  select * into v_pa from public.participacoes where id = v_e.participacao_id;
  select nome_marca into v_marca from public.participantes where id = v_pa.participante_id;
  select count(*) into v_n from public.preenchimento_envios where link_id = v_e.link_id;
  select count(*) into v_itens from public.participantes_itens where participacao_id = v_pa.id;
  select count(*) into v_trocas from public.substituicoes s join public.participantes_itens i on i.id = s.item_id where i.participacao_id = v_pa.id;
  select count(*) into v_lojas from public.participacao_unidades where participacao_id = v_pa.id;
  v_txt := 'Já está no painel: ' || v_itens || case when v_itens = 1 then ' item' else ' itens' end
        || ' · ' || v_trocas || case when v_trocas = 1 then ' troca' else ' trocas' end
        || ' · ' || v_lojas || case when v_lojas = 1 then ' loja' else ' lojas' end
        || case p_revisao
             when 'ok' then case when p_revisados > 0 then '. Texto revisado em ' || p_revisados || case when p_revisados = 1 then ' campo.' else ' campos.' end else '. Texto já estava correto.' end
             when 'sem_chave' then '. Sem revisão de texto (falta a chave da API).'
             else '. Sem revisão de texto (a API falhou).' end
        || case when nullif(btrim(v_e.dados ->> 'observacao'), '') is not null then ' A marca deixou uma observação.' else '' end;
  perform public.notificar('organizacao', null, 'cadastro',
    v_marca || case when v_n <= 1 then ' preencheu o formulário' else ' enviou alterações no formulário' end,
    v_txt, 'social/participantes/' || v_pa.participante_id);
  update public.preenchimento_envios set automatico_concluido_em = now() where id = p_envio;
end $function$;

-- Falha: avisa uma vez, no formato antigo (o envio fica na fila de "Aplicar" se ainda estava pendente).
create or replace function public.preenchimento_aviso_falha(p_envio uuid, p_erro text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_e public.preenchimento_envios; v_pa public.participacoes; v_marca text;
begin
  select * into v_e from public.preenchimento_envios where id = p_envio for update;
  if not found or v_e.aviso_falha_em is not null or v_e.automatico_concluido_em is not null then return; end if;
  select * into v_pa from public.participacoes where id = v_e.participacao_id;
  select nome_marca into v_marca from public.participantes where id = v_pa.participante_id;
  perform public.notificar('organizacao', null, 'cadastro',
    v_marca || ' enviou o formulário' || case when v_e.status = 'pendente' then ', mas não consegui aplicar sozinho' else ' (aplicado, mas o aviso falhou)' end,
    case when v_e.status = 'pendente' then 'Revise e aplique na ficha (Gestão).' else 'Confira em Social media › Participantes.' end
      || ' Motivo: ' || left(coalesce(nullif(btrim(p_erro), ''), 'sem resposta'), 120),
    case when v_e.status = 'pendente' then 'marcas/' || v_pa.participante_id || '/gestao' else 'social/participantes/' || v_pa.participante_id end);
  update public.preenchimento_envios set aviso_falha_em = now() where id = p_envio;
end $function$;

create or replace function public.sistema_falha_envio(p_envio uuid, p_erro text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.eh_servico() then raise exception 'nao_autorizado'; end if;
  perform public.preenchimento_aviso_falha(p_envio, p_erro);
end $function$;

revoke all on function public.sistema_aplicar_envio(uuid), public.sistema_textos_para_revisar(uuid),
  public.sistema_gravar_revisoes(uuid, jsonb), public.sistema_finalizar_envio(uuid, integer, text),
  public.sistema_falha_envio(uuid, text), public.preenchimento_aviso_falha(uuid, text) from public, anon, authenticated;
grant execute on function public.sistema_aplicar_envio(uuid), public.sistema_textos_para_revisar(uuid),
  public.sistema_gravar_revisoes(uuid, jsonb), public.sistema_finalizar_envio(uuid, integer, text),
  public.sistema_falha_envio(uuid, text) to service_role;

-- ── 6. o gatilho no envio novo e o ciclo de repetição ────────────────────────
create or replace function public.preenchimento_chamar_funcao(p_envio uuid)
 returns void language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
begin
  perform net.http_post(
    url := 'https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/processar-preenchimento',
    body := jsonb_build_object('envio_id', p_envio),
    headers := jsonb_build_object('Content-Type', 'application/json'));
exception when others then null; -- o ciclo de 5 min tenta de novo
end $function$;
revoke all on function public.preenchimento_chamar_funcao(uuid) from public, anon, authenticated;

create or replace function public.preenchimento_disparar_automatico()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if new.status = 'pendente' and public.preenchimento_automatico() then
    perform public.preenchimento_chamar_funcao(new.id);
  end if;
  return null;
end $function$;
revoke all on function public.preenchimento_disparar_automatico() from public, anon, authenticated;

drop trigger if exists preenchimento_automatico on public.preenchimento_envios;
create trigger preenchimento_automatico after insert on public.preenchimento_envios
  for each row execute function public.preenchimento_disparar_automatico();

-- A cada 5 min, só com o automático ligado: refaz o que ficou no meio (pendente há 2 min+, ou aplicado sem concluir) e,
-- passados 30 min sem aplicar, avisa no formato antigo.
create or replace function public.preenchimento_reprocessar()
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare r record;
begin
  if not public.preenchimento_automatico() then return; end if;
  for r in select id from public.preenchimento_envios
            where enviado_em > now() - interval '2 days'
              and ((status = 'pendente' and enviado_em < now() - interval '2 minutes')
                or (status = 'aplicado' and automatico_concluido_em is null and revisado_por_rotulo like 'Automático%'
                    and revisado_em < now() - interval '2 minutes'))
            order by enviado_em limit 5 loop
    perform public.preenchimento_chamar_funcao(r.id);
  end loop;
  for r in select id from public.preenchimento_envios
            where status = 'pendente' and aviso_falha_em is null and enviado_em < now() - interval '30 minutes'
              and enviado_em > now() - interval '2 days' loop
    perform public.preenchimento_aviso_falha(r.id, 'a função não respondeu');
  end loop;
end $function$;
revoke all on function public.preenchimento_reprocessar() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'scw-preenchimento-reprocessar') then
    perform cron.schedule('scw-preenchimento-reprocessar', '*/5 * * * *', 'select public.preenchimento_reprocessar()');
  end if;
end $$;
