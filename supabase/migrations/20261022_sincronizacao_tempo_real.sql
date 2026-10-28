-- ─────────────────────────────────────────────────────────────────────────────
-- Painel: sincronização em tempo real (19/10/2026). SÓ ACRESCENTA.
--
-- O que muda: quando um dado do painel é gravado (por qualquer caminho: RPC,
-- Edge Function, importação, cron), o BANCO avisa quem pode ver aquele dado,
-- com um sinal MÍNIMO — domínio + id opaco + hora — pelo Realtime "Broadcast
-- from Database". O sinal não carrega registro, nome, contato, texto nem token:
-- quem recebe relê o dado pela rota de sempre, que já passa por RPC/RLS. É a
-- releitura autorizada que protege o conteúdo; o sinal só diz "mudou".
--
-- Canais (todos PRIVADOS, política em realtime.messages):
--   scw:org              quem tem 'dado.ler' (organização)
--   scw:social           quem tem 'redes.ver' (social media e administração)
--   scw:marcas           qualquer marca com conta ativa (vagas de foto abertas,
--                        arquivos gerais, edição — nada específico de uma marca)
--   scw:marca:<id>       só a conta dona daquela marca
--   scw:pessoa:<uid>     só a própria pessoa (avisos, leitura, perfil)
-- Social media NÃO entra em scw:org: vendas, vouchers, acessos, pagamentos e
-- mensagens nunca chegam a ela, nem como sinal.
--
-- Segurança:
--   · nenhuma tabela entra na publicação supabase_realtime (nada de
--     postgres_changes, que transmitiria registros);
--   · o cliente só RECEBE: não há política de INSERT em realtime.messages;
--   · os gatilhos nunca derrubam a gravação (erro de sinal é engolido);
--   · repetição na mesma transação vira um sinal só (scw.sync_vistos);
--   · NADA existente é alterado ou removido: funções com `create or replace` de
--     nomes novos (sync_*), gatilhos e política só são criados SE AINDA NÃO
--     existem. Reaplicar é inofensivo; mudar a definição de um gatilho já criado
--     é decisão manual (a reversão está em supabase/reverter/).
--
-- Reversão: supabase/reverter/20261022_sincronizacao_tempo_real.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Quem pode ouvir cada canal ────────────────────────────────────────────
-- pode_por_user() é só do service_role; este invólucro responde apenas sobre
-- QUEM CHAMA (auth.uid()), então não revela nada de outra pessoa.
create or replace function public.sync_pode(p_topico text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_topico is null then return false; end if;
  if p_topico = 'scw:pessoa:' || v_uid::text then return true; end if;
  if p_topico = 'scw:org' then return public.pode_por_user(v_uid, 'dado.ler'); end if;
  if p_topico = 'scw:social' then return public.pode_por_user(v_uid, 'redes.ver'); end if;
  if p_topico = 'scw:marcas' then
    return public.conta_ativa() and exists (select 1 from public.participantes where user_id = v_uid);
  end if;
  if p_topico ~ '^scw:marca:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return public.marca_dona_participante(substr(p_topico, 11)::uuid);
  end if;
  return false;
end $$;
revoke all on function public.sync_pode(text) from public, anon;
grant execute on function public.sync_pode(text) to authenticated, service_role;

-- Os canais que ESTA conta pode ouvir agora. O painel pergunta isto ao entrar e
-- ao reconectar: a lista é do servidor, então permissão revogada some dela.
create or replace function public.sync_meus_canais()
returns text[] language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_pid uuid; r text[] := '{}';
begin
  if v_uid is null then return r; end if;
  r := array['scw:pessoa:' || v_uid::text];
  -- array_append: `text[] || 'literal'` é ambíguo (o literal vira array) e falharia para toda conta
  if public.sync_pode('scw:org') then r := array_append(r, 'scw:org'); end if;
  if public.sync_pode('scw:social') then r := array_append(r, 'scw:social'); end if;
  if public.sync_pode('scw:marcas') then
    r := array_append(r, 'scw:marcas');
    select id into v_pid from public.participantes where user_id = v_uid order by created_at desc limit 1;
    if v_pid is not null then r := array_append(r, 'scw:marca:' || v_pid::text); end if;
  end if;
  return r;
end $$;
revoke all on function public.sync_meus_canais() from public, anon;
grant execute on function public.sync_meus_canais() to authenticated, service_role;

-- O Realtime consulta esta política ao entrar no canal e a cada token novo.
-- Só leitura (select): sem política de insert, o navegador não consegue enviar.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname = 'sync_receber') then
    create policy sync_receber on realtime.messages
      for select to authenticated
      using (extension = 'broadcast' and public.sync_pode((select realtime.topic())));
  end if;
end $$;

-- ── 2. Emissão ───────────────────────────────────────────────────────────────
-- Um sinal por (canal, domínio, id) dentro da transação: importar 24 marcas ou
-- salvar uma ficha inteira não vira tempestade.
create or replace function public.sync_emitir(p_topico text, p_dominio text, p_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_chave text := '~' || coalesce(p_topico, '') || '|' || coalesce(p_dominio, '') || '|' || coalesce(p_ref, '') || '~';
  v_vistos text := coalesce(current_setting('scw.sync_vistos', true), '');
begin
  if p_topico is null or p_dominio is null then return; end if;
  if position(v_chave in v_vistos) > 0 then return; end if;
  if length(v_vistos) < 20000 then perform set_config('scw.sync_vistos', v_vistos || v_chave, true); end if;
  begin
    perform realtime.send(
      jsonb_build_object('d', p_dominio, 'r', p_ref, 't', (extract(epoch from clock_timestamp()) * 1000)::bigint),
      'inv', p_topico, true);
  exception when others then null;   -- o sinal nunca derruba a gravação
  end;
end $$;
revoke all on function public.sync_emitir(text, text, text) from public, anon, authenticated;

-- A marca dona de uma linha, por qualquer caminho que a tabela tenha até ela.
create or replace function public.sync_participante(r jsonb, col text)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  case col
    when 'participante_id' then v := nullif(r ->> 'participante_id', '')::uuid;
    when 'self' then v := nullif(r ->> 'id', '')::uuid;
    when 'self_participacao' then
      select participante_id into v from public.participacoes where id = nullif(r ->> 'id', '')::uuid;
    when 'participacao_id' then
      select participante_id into v from public.participacoes where id = nullif(r ->> 'participacao_id', '')::uuid;
    when 'item_id' then
      select participante_id into v from public.participantes_itens where id = nullif(r ->> 'item_id', '')::uuid;
    when 'participacao_unidade_id' then
      select pa.participante_id into v from public.participacao_unidades pu
        join public.participacoes pa on pa.id = pu.participacao_id
       where pu.id = nullif(r ->> 'participacao_unidade_id', '')::uuid;
    when 'declaracao' then
      select i.participante_id into v from public.participantes_itens i
       where i.id = coalesce(nullif(r ->> 'item_id', '')::uuid,
                             (select s.item_id from public.substituicoes s where s.id = nullif(r ->> 'substituicao_id', '')::uuid));
    else v := null;
  end case;
  return v;
end $$;
revoke all on function public.sync_participante(jsonb, text) from public, anon, authenticated;

-- ── 3. Gatilho genérico ──────────────────────────────────────────────────────
-- tg_argv: 0 = domínio · 1 = destinos "alvo[>domínio],…" · 2 = coluna do id (ou
-- "marca:<coluna>" para o id da marca). Alvos: org, social, marcas,
-- marca:<coluna>, pessoa:<coluna>. "social>editorial" manda ao canal social sob
-- outro nome de domínio (a visão editorial relê a partir daí).
create or replace function public.sync_gatilho()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_dominio text := tg_argv[0];
  v_destinos text := coalesce(tg_argv[1], '');
  v_refcol text := nullif(tg_argv[2], '');
  r jsonb; v_pid uuid; v_ref text; tok text; alvo text; dom text; v_u text;
begin
  begin
    r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    if v_refcol is null then
      foreach tok in array string_to_array(v_destinos, ',') loop
        alvo := split_part(tok, '>', 1);
        if alvo like 'marca:%' then v_ref := public.sync_participante(r, substr(alvo, 7))::text; exit; end if;
      end loop;
    elsif v_refcol like 'marca:%' then
      v_ref := public.sync_participante(r, substr(v_refcol, 7))::text;
    else
      v_ref := r ->> v_refcol;
    end if;
    foreach tok in array string_to_array(v_destinos, ',') loop
      alvo := split_part(tok, '>', 1);
      dom := coalesce(nullif(split_part(tok, '>', 2), ''), v_dominio);
      if alvo = 'org' then perform public.sync_emitir('scw:org', dom, v_ref);
      elsif alvo = 'social' then perform public.sync_emitir('scw:social', dom, v_ref);
      elsif alvo = 'marcas' then perform public.sync_emitir('scw:marcas', dom, v_ref);
      elsif alvo like 'marca:%' then
        v_pid := public.sync_participante(r, substr(alvo, 7));
        if v_pid is not null then
          perform public.sync_emitir('scw:marca:' || v_pid::text, dom, coalesce(v_ref, v_pid::text));
        end if;
      elsif alvo like 'pessoa:%' then
        v_u := r ->> substr(alvo, 8);
        if v_u ~ '^[0-9a-f-]{36}$' then perform public.sync_emitir('scw:pessoa:' || v_u, dom, v_ref); end if;
      end if;
    end loop;
  exception when others then null;
  end;
  return null;
end $$;
revoke all on function public.sync_gatilho() from public, anon, authenticated;

-- Arquivos e pedidos: com participação = daquela marca; sem = de todas as marcas.
create or replace function public.sync_escopo()
returns trigger language plpgsql security definer set search_path = public as $$
declare r jsonb; o jsonb; v_pid uuid; v_ref text;
begin
  begin
    r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    o := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
    v_ref := r ->> 'id';
    perform public.sync_emitir('scw:org', tg_argv[0], v_ref);
    if nullif(r ->> 'participacao_id', '') is not null then
      v_pid := public.sync_participante(r, 'participacao_id');
      if v_pid is not null then perform public.sync_emitir('scw:marca:' || v_pid::text, tg_argv[0], v_ref); end if;
    else
      perform public.sync_emitir('scw:marcas', tg_argv[0], v_ref);
    end if;
    -- mudou de destino (geral ↔ de uma marca): quem perdeu o item precisa saber
    if o is not null and (o ->> 'participacao_id') is distinct from (r ->> 'participacao_id') then
      if nullif(o ->> 'participacao_id', '') is not null then
        v_pid := public.sync_participante(o, 'participacao_id');
        if v_pid is not null then perform public.sync_emitir('scw:marca:' || v_pid::text, tg_argv[0], v_ref); end if;
      else
        perform public.sync_emitir('scw:marcas', tg_argv[0], v_ref);
      end if;
    end if;
  exception when others then null;
  end;
  return null;
end $$;
revoke all on function public.sync_escopo() from public, anon, authenticated;

-- Sessões de foto: a marca dona (a de agora e a de antes), a organização e — se a
-- vaga está/estava aberta — todas as marcas, que enxergam as vagas livres.
create or replace function public.sync_fotos()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_n uuid; v_o uuid; v_ns text; v_os text;
begin
  begin
    if tg_op <> 'DELETE' then v_n := new.participante_id; v_ns := new.status; end if;
    if tg_op <> 'INSERT' then v_o := old.participante_id; v_os := old.status; end if;
    perform public.sync_emitir('scw:org', 'fotos', coalesce(v_n, v_o)::text);
    if v_n is not null then perform public.sync_emitir('scw:marca:' || v_n::text, 'fotos', v_n::text); end if;
    if v_o is not null and v_o is distinct from v_n then
      perform public.sync_emitir('scw:marca:' || v_o::text, 'fotos', v_o::text);
    end if;
    if v_ns = 'aberto' or v_os = 'aberto' then perform public.sync_emitir('scw:marcas', 'fotos', null); end if;
  exception when others then null;
  end;
  return null;
end $$;
revoke all on function public.sync_fotos() from public, anon, authenticated;

-- Avisos: marca → canal da marca; pessoal → canal da pessoa; geral → organização
-- (e social, se for do tipo redes). Não dispara no UPDATE de push_enviado_em,
-- que a Edge Function faz em TODA notificação.
create or replace function public.sync_notificacoes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if new.para = 'marca' then
      if new.participante_id is not null then
        perform public.sync_emitir('scw:marca:' || new.participante_id::text, 'avisos', new.participante_id::text);
      end if;
    elsif new.para_user_id is not null then
      perform public.sync_emitir('scw:pessoa:' || new.para_user_id::text, 'avisos', null);
    else
      perform public.sync_emitir('scw:org', 'avisos', null);
      if new.tipo = 'redes' then perform public.sync_emitir('scw:social', 'avisos', null); end if;
    end if;
  exception when others then null;
  end;
  return null;
end $$;
revoke all on function public.sync_notificacoes() from public, anon, authenticated;

-- Ler um aviso: a contagem das OUTRAS sessões da mesma pessoa se acerta.
create or replace function public.sync_notificacao_leitura()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if new.leitor ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      perform public.sync_emitir('scw:pessoa:' || new.leitor, 'avisos', null);
    end if;
  exception when others then null;
  end;
  return null;
end $$;
revoke all on function public.sync_notificacao_leitura() from public, anon, authenticated;

-- Perfis: a própria pessoa (nome, foto, função, conta pausada/liberada), a equipe
-- (diretório e avatares) e, quando é conta de marca, a lista de acessos.
create or replace function public.sync_perfis()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.perfis; v_pid uuid;
begin
  begin
    r := case when tg_op = 'DELETE' then old else new end;
    perform public.sync_emitir('scw:pessoa:' || r.user_id::text, 'perfis', r.user_id::text);
    if r.papel = 'organizacao' then
      perform public.sync_emitir('scw:org', 'perfis', r.user_id::text);
      perform public.sync_emitir('scw:social', 'perfis', r.user_id::text);
    else
      select id into v_pid from public.participantes where user_id = r.user_id order by created_at desc limit 1;
      perform public.sync_emitir('scw:org', 'acessos', coalesce(v_pid::text, r.user_id::text));
    end if;
  exception when others then null;
  end;
  return null;
end $$;
revoke all on function public.sync_perfis() from public, anon, authenticated;

-- ── 4. Pendência resolvida deixa de contar como aberta ───────────────────────
-- Post que sai de "aprovação" (aprovado, devolvido ou cancelado): o aviso
-- "Aguardando sua aprovação" de cada aprovador vira lido — por pessoa, sem tocar
-- na leitura de ninguém além da dele.
create or replace function public.sync_resolver_aprovacao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into public.notificacao_leitura (notificacao_id, leitor)
    select n.id, n.para_user_id::text
      from public.notificacoes n
     where n.chave_grupo = 'redes:' || new.id::text || ':aprovacao' and n.para_user_id is not null
    on conflict do nothing;
  exception when others then null;
  end;
  return null;
end $$;
revoke all on function public.sync_resolver_aprovacao() from public, anon, authenticated;

-- Pedido respondido: o aviso "Novo pedido" daquela marca vira lido.
create or replace function public.sync_resolver_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    update public.notificacoes n set lida_em = now()
     where n.para = 'marca' and n.tipo = 'pedido' and n.lida_em is null
       and n.link = 'pedidos/' || new.solicitacao_id::text
       and n.participante_id = (select participante_id from public.participacoes where id = new.participacao_id);
  exception when others then null;
  end;
  return null;
end $$;
revoke all on function public.sync_resolver_pedido() from public, anon, authenticated;

-- ── 5. Os gatilhos (só os que ainda não existem) ─────────────────────────────
-- Auxiliar que existe só durante esta migration (schema temporário).
create function pg_temp.sync_novo_gatilho(p_nome text, p_tabela text, p_ddl text)
returns void language plpgsql as $$
begin
  if not exists (select 1 from pg_trigger g
                  where g.tgname = p_nome and g.tgrelid = to_regclass('public.' || quote_ident(p_tabela)) and not g.tgisinternal) then
    execute p_ddl;
  end if;
end $$;

do $$
declare t record;
begin
  -- Genéricos: tabela, eventos, domínio, destinos, coluna do id
  for t in select * from (values
    ('participantes',               'insert or update or delete', 'participantes',  'org,social>editorial,marca:self', ''),
    ('participacoes',               'insert or update or delete', 'participantes',  'org,social>editorial,marca:participante_id', ''),
    ('participante_vinculos',       'insert or update or delete', 'participantes',  'org', 'participante_id'),
    ('participantes_operacao',      'insert or update or delete', 'participantes',  'org,marca:participante_id', ''),
    ('participantes_itens',         'insert or update or delete', 'cadastro',       'org,social>editorial,marca:participante_id', ''),
    ('declaracoes_alimentares',     'insert or update or delete', 'cadastro',       'org,marca:declaracao', ''),
    ('substituicoes',               'insert or update or delete', 'cadastro',       'org,marca:item_id', ''),
    ('midias_participacao',         'insert or update or delete', 'cadastro',       'org,social>editorial,marca:participacao_id', ''),
    ('unidades',                    'insert or update or delete', 'unidades',       'org,marca:participante_id', ''),
    ('participacao_unidades',       'insert or update or delete', 'unidades',       'org,marca:participacao_id', ''),
    ('unidade_disponibilidade',     'insert or update or delete', 'unidades',       'org,marca:participacao_unidade_id', ''),
    ('temas_propostos',             'insert or update or delete', 'temas',          'org,marca:participacao_id', ''),
    ('logos_marca',                 'insert or update or delete', 'logos',          'org,social>editorial,marca:participante_id', ''),
    ('acervo_logos',                'insert or update or delete', 'logos',          'org,social', ''),
    ('correcoes_campo',             'insert or update or delete', 'correcoes',      'org,marca:participacao_id', ''),
    ('revisao_pendencias',          'insert or update or delete', 'correcoes',      'org', 'participante_id'),
    ('solicitacao_estado',          'insert or update or delete', 'pedidos',        'org,marca:participacao_id', ''),
    ('vendas_diarias',              'insert or update or delete', 'vendas',         'org,marca:participacao_id', ''),
    ('vouchers',                    'insert or update or delete', 'vouchers',       'org,marca:participacao_id', ''),
    ('arquivo_leitura',             'insert or update or delete', 'arquivos',       'org,marca:participacao_id', ''),
    ('materiais',                   'insert or update or delete', 'materiais',      'org,marca:participacao_id', ''),
    ('edicoes',                     'insert or update or delete', 'edicao',         'org,social,marcas', 'codigo'),
    ('edicao_cronograma',           'insert or update or delete', 'edicao',         'org,marcas', 'edicao_codigo'),
    ('edicao_publicacao',           'insert or update or delete', 'edicao',         'org,marcas', 'edicao_codigo'),
    ('edicao_criterios',            'insert or update or delete', 'edicao',         'org,marcas', 'edicao_codigo'),
    ('publicacoes',                 'insert or update or delete', 'publicacao',     'org,marca:participacao_id', ''),
    ('mensagens',                   'insert or update or delete', 'mensagens',      'org,marca:participante_id', ''),
    ('redes_posts',                 'insert or update or delete', 'redes',          'social', 'id'),
    ('redes_comentarios',           'insert or update or delete', 'redes',          'social', 'post_id'),
    ('redes_historico',             'insert',                     'redes',          'social', 'post_id'),
    ('redes_arquivos',              'insert or update or delete', 'redes',          'social', 'post_id'),
    ('social_pastas',               'insert or update or delete', 'biblioteca',     'social', 'id'),
    ('social_biblioteca_pasta_item','insert or update or delete', 'biblioteca',     'social', 'pasta_id'),
    ('social_biblioteca_registro',  'insert or update or delete', 'biblioteca',     'social', 'pasta_id'),
    ('permissoes',                  'insert or update or delete', 'perfis',         'org,social', ''),
    ('funcoes',                     'insert or update or delete', 'perfis',         'org,social', ''),
    ('contatos_relacionamento',     'insert or update or delete', 'contatos',       'org', 'id'),
    ('presskit_envios',             'insert or update or delete', 'contatos',       'org', 'id'),
    ('preenchimento_links',         'insert or update or delete', 'preenchimento',  'org', 'marca:participacao_id'),
    ('preenchimento_envios',        'insert or update or delete', 'preenchimento',  'org', 'marca:participacao_id'),
    ('contact_requests',            'insert or update or delete', 'respostas',      'org', 'id'),
    ('quero_participar',            'insert or update or delete', 'respostas',      'org', 'id'),
    ('support_interests',           'insert or update or delete', 'respostas',      'org', 'id'),
    ('auditoria',                   'insert',                     'atividade',      'org', 'participante_id'),
    ('admin_config',                'insert or update or delete', 'configuracao',   'org,social', ''),
    ('acesso_envios',               'insert',                     'acessos',        'org', 'participante_id')
  ) as v(tabela, evento, dominio, destinos, refcol)
  loop
    perform pg_temp.sync_novo_gatilho('sync_' || t.tabela, t.tabela,
      format('create trigger %I after %s on public.%I for each row execute function public.sync_gatilho(%L, %L, %L)',
             'sync_' || t.tabela, t.evento, t.tabela, t.dominio, t.destinos, t.refcol));
  end loop;

  -- Com regra própria
  perform pg_temp.sync_novo_gatilho('sync_redes_arquivos_biblioteca', 'redes_arquivos',
    $d$create trigger sync_redes_arquivos_biblioteca after insert or update or delete on public.redes_arquivos
       for each row execute function public.sync_gatilho('biblioteca', 'social', '')$d$);
  perform pg_temp.sync_novo_gatilho('sync_arquivos', 'arquivos',
    $d$create trigger sync_arquivos after insert or update or delete on public.arquivos
       for each row execute function public.sync_escopo('arquivos')$d$);
  perform pg_temp.sync_novo_gatilho('sync_solicitacoes', 'solicitacoes',
    $d$create trigger sync_solicitacoes after insert or update or delete on public.solicitacoes
       for each row execute function public.sync_escopo('pedidos')$d$);
  perform pg_temp.sync_novo_gatilho('sync_sessoes_fotos', 'sessoes_fotos',
    $d$create trigger sync_sessoes_fotos after insert or update or delete on public.sessoes_fotos
       for each row execute function public.sync_fotos()$d$);
  perform pg_temp.sync_novo_gatilho('sync_notificacoes', 'notificacoes',
    $d$create trigger sync_notificacoes after insert or update of titulo, texto, link, atualizada_em, n_agrupadas, lida_em
       on public.notificacoes for each row execute function public.sync_notificacoes()$d$);
  perform pg_temp.sync_novo_gatilho('sync_notificacao_leitura', 'notificacao_leitura',
    $d$create trigger sync_notificacao_leitura after insert on public.notificacao_leitura
       for each row execute function public.sync_notificacao_leitura()$d$);
  perform pg_temp.sync_novo_gatilho('sync_perfis', 'perfis',
    $d$create trigger sync_perfis after insert or delete or update of nome, avatar_path, avatar_em, funcao, ativo, bloqueado_em, deve_trocar_senha
       on public.perfis for each row execute function public.sync_perfis()$d$);
  perform pg_temp.sync_novo_gatilho('sync_resolver_aprovacao', 'redes_posts',
    $d$create trigger sync_resolver_aprovacao after update of situacao on public.redes_posts
       for each row when (old.situacao = 'aprovacao' and new.situacao is distinct from 'aprovacao')
       execute function public.sync_resolver_aprovacao()$d$);
  perform pg_temp.sync_novo_gatilho('sync_resolver_pedido', 'solicitacao_estado',
    $d$create trigger sync_resolver_pedido after update of estado on public.solicitacao_estado
       for each row when (new.estado = 'respondido' and old.estado is distinct from 'respondido')
       execute function public.sync_resolver_pedido()$d$);
end $$;

comment on function public.sync_pode(text) is 'Autorização dos canais scw:* do Realtime (política sync_receber em realtime.messages).';
comment on function public.sync_emitir(text, text, text) is 'Sinal mínimo de invalidação (domínio + id opaco + hora). Nunca carrega registro.';
