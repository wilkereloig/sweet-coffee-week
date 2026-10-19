-- =============================================================================
-- Verificação da sincronização em tempo real (migration 20261022_sincronizacao_tempo_real).
--
-- Mesmo padrão dos outros arquivos desta pasta: o bloco simula papéis, grava
-- dentro da transação e TERMINA EM EXCEÇÃO de propósito — a mensagem traz o
-- resultado e a exceção desfaz TUDO (nenhum dado, aviso ou push de verdade).
-- Usa pessoas e marcas que já existem, só para ler/atualizar sem mudar valor.
--
-- Pré-requisito: a migration aplicada (ou colada dentro do bloco por
-- `execute $mig$ … $mig$;` para ensaiar sem aplicar) e o Realtime já ter tido um
-- cliente conectado hoje (é ele quem cria a partição do dia em realtime.messages).
--
-- Esperado: todas as linhas "OK". Qualquer "FALHA" é defeito.
--   · Autorização: quem recebe e quem NÃO recebe cada canal
--   · Emissão: cada gravação gera o sinal certo, só nos canais certos
--   · Sinal mínimo: só {d, r, t} (+ id do broadcast) — nunca registro
--   · Social media nunca recebe vendas, acessos nem mensagens
--   · Pendência resolvida (aprovação, pedido respondido) deixa de contar como aberta
-- =============================================================================
do $teste$
declare
  v_ini bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_admin uuid; v_prod uuid; v_social uuid; v_com uuid;
  v_ba uuid; v_pa uuid; v_bb uuid; v_pb uuid; v_bp uuid; v_pp uuid;
  v_post uuid; v_nid uuid; v_nid2 uuid; v_f uuid; v_a uuid; v_esc text; v_sid uuid; v_spa uuid; v_ped uuid;
  n int; ok boolean; txt text;
begin
  create temp table zz_res (ord serial, nome text, ok boolean);

  -- ── auxiliares (só existem nesta transação) ────────────────────────────────
  execute $h$
    create function pg_temp.le_como(p_uid uuid, p_topico text) returns int language plpgsql as $f$
    declare n int;
    begin
      perform realtime.send(jsonb_build_object('d', 'teste', 'r', null, 't', 0), 'inv', p_topico, true);
      perform set_config('request.jwt.claims', case when p_uid is null then '{}' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, true);
      perform set_config('realtime.topic', p_topico, true);
      execute 'set local role ' || case when p_uid is null then 'anon' else 'authenticated' end;
      begin select count(*) into n from realtime.messages where topic = p_topico and extension = 'broadcast';
      exception when others then n := -1; end;
      execute 'reset role';
      return n;
    end $f$ $h$;
  execute $h$
    create function pg_temp.msgs(p_ini bigint, p_topico text, p_dom text, p_ref text) returns int language sql as $f$
      select count(*)::int from realtime.messages
       where topic = p_topico and (payload ->> 'd') = p_dom and (p_ref is null or (payload ->> 'r') = p_ref)
         and (payload ->> 't')::bigint >= p_ini $f$ $h$;

  -- ── personas reais (nada é alterado: o bloco inteiro é desfeito) ───────────
  select user_id into v_admin from perfis where papel = 'organizacao' and funcao = 'administrador' and ativo and bloqueado_em is null and not deve_trocar_senha order by created_at limit 1;
  select user_id into v_prod from perfis where papel = 'organizacao' and funcao = 'producao' and ativo and bloqueado_em is null and not deve_trocar_senha order by created_at limit 1;
  select user_id into v_social from perfis where papel = 'organizacao' and funcao = 'social' order by created_at limit 1;
  select user_id into v_com from perfis where papel = 'organizacao' and funcao = 'comercial' order by created_at limit 1;
  select p.user_id, p.id into v_ba, v_pa from participantes p join perfis f on f.user_id = p.user_id
   where f.papel = 'marca' and f.ativo and f.bloqueado_em is null and not f.deve_trocar_senha order by p.created_at limit 1;
  select p.user_id, p.id into v_bb, v_pb from participantes p join perfis f on f.user_id = p.user_id
   where f.papel = 'marca' and f.ativo and f.bloqueado_em is null and not f.deve_trocar_senha and p.id <> v_pa order by p.created_at limit 1;
  select p.user_id, p.id into v_bp, v_pp from participantes p join perfis f on f.user_id = p.user_id
   where f.papel = 'marca' and f.deve_trocar_senha order by p.created_at limit 1;
  insert into zz_res (nome, ok) values ('personas encontradas (admin, produção, social, comercial, marca A, marca B, marca pendente)',
    v_admin is not null and v_prod is not null and v_social is not null and v_com is not null and v_ba is not null and v_bb is not null and v_bp is not null);
  -- o social media do banco ainda não trocou a senha: ativa SÓ nesta transação para testar o papel
  update perfis set deve_trocar_senha = false where user_id = v_social;

  -- ── 1. quem recebe cada canal ──────────────────────────────────────────────
  insert into zz_res (nome, ok) values
    ('admin recebe scw:org',                   pg_temp.le_como(v_admin, 'scw:org') > 0),
    ('admin recebe scw:social',                pg_temp.le_como(v_admin, 'scw:social') > 0),
    ('admin NÃO recebe scw:marcas',            pg_temp.le_como(v_admin, 'scw:marcas') <= 0),
    ('admin NÃO recebe canal de uma marca',    pg_temp.le_como(v_admin, 'scw:marca:' || v_pa) <= 0),
    ('admin recebe o próprio canal pessoal',   pg_temp.le_como(v_admin, 'scw:pessoa:' || v_admin) > 0),
    ('admin NÃO recebe canal pessoal de outro',pg_temp.le_como(v_admin, 'scw:pessoa:' || v_prod) <= 0),
    ('produção recebe scw:org',                pg_temp.le_como(v_prod, 'scw:org') > 0),
    ('produção NÃO recebe scw:social',         pg_temp.le_como(v_prod, 'scw:social') <= 0),
    ('social recebe scw:social',               pg_temp.le_como(v_social, 'scw:social') > 0),
    ('social NÃO recebe scw:org (vendas, acessos, mensagens)', pg_temp.le_como(v_social, 'scw:org') <= 0),
    ('social NÃO recebe scw:marcas',           pg_temp.le_como(v_social, 'scw:marcas') <= 0),
    ('comercial com senha a trocar NÃO recebe scw:org', pg_temp.le_como(v_com, 'scw:org') <= 0),
    ('comercial com senha a trocar ainda recebe o canal pessoal', pg_temp.le_como(v_com, 'scw:pessoa:' || v_com) > 0),
    ('marca A recebe scw:marcas',              pg_temp.le_como(v_ba, 'scw:marcas') > 0),
    ('marca A recebe o PRÓPRIO canal',         pg_temp.le_como(v_ba, 'scw:marca:' || v_pa) > 0),
    ('marca A NÃO recebe o canal da marca B',  pg_temp.le_como(v_ba, 'scw:marca:' || v_pb) <= 0),
    ('marca A NÃO recebe scw:org',             pg_temp.le_como(v_ba, 'scw:org') <= 0),
    ('marca A NÃO recebe scw:social',          pg_temp.le_como(v_ba, 'scw:social') <= 0),
    ('marca A NÃO recebe canal pessoal da marca B', pg_temp.le_como(v_ba, 'scw:pessoa:' || v_bb) <= 0),
    ('marca B NÃO recebe o canal da marca A',  pg_temp.le_como(v_bb, 'scw:marca:' || v_pa) <= 0),
    ('marca com senha a trocar NÃO recebe scw:marcas', pg_temp.le_como(v_bp, 'scw:marcas') <= 0),
    ('marca com senha a trocar NÃO recebe o próprio canal de marca', pg_temp.le_como(v_bp, 'scw:marca:' || v_pp) <= 0),
    ('marca com senha a trocar recebe o canal pessoal (para saber de bloqueio)', pg_temp.le_como(v_bp, 'scw:pessoa:' || v_bp) > 0),
    ('anônimo NÃO recebe nada: scw:org',       pg_temp.le_como(null, 'scw:org') <= 0),
    ('anônimo NÃO recebe nada: canal de marca',pg_temp.le_como(null, 'scw:marca:' || v_pa) <= 0),
    ('tópico mal formado é negado (id inválido)', pg_temp.le_como(v_ba, 'scw:marca:nao-e-uuid') <= 0),
    ('tópico mal formado é negado (prefixo realtime:)', pg_temp.le_como(v_admin, 'realtime:scw:org') <= 0),
    ('tópico mal formado é negado (espaço)',   pg_temp.le_como(v_admin, 'scw:org ') <= 0);

  -- lista de canais do servidor (o painel só entra no que vier daqui)
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select array_to_string(array(select unnest(public.sync_meus_canais()) order by 1), ',') into txt;
  execute 'reset role';
  insert into zz_res (nome, ok) values ('sync_meus_canais do admin = pessoal + org + social', txt = 'scw:org,scw:pessoa:' || v_admin || ',scw:social');
  perform set_config('request.jwt.claims', json_build_object('sub', v_ba, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select array_to_string(array(select unnest(public.sync_meus_canais()) order by 1), ',') into txt;
  execute 'reset role';
  insert into zz_res (nome, ok) values ('sync_meus_canais da marca A = pessoal + marcas + a própria marca', txt = 'scw:marca:' || v_pa || ',scw:marcas,scw:pessoa:' || v_ba);

  -- o navegador só RECEBE: não consegue publicar em canal nenhum
  execute 'set local role authenticated';
  ok := false;
  begin insert into realtime.messages (topic, extension, payload, event, private) values ('scw:org', 'broadcast', '{"d":"participantes"}', 'inv', true);
  exception when others then ok := true; end;
  execute 'reset role';
  insert into zz_res (nome, ok) values ('authenticated NÃO consegue inserir em realtime.messages', ok);

  -- ── 2. emissão: gravar → sinal certo, só nos canais certos ─────────────────
  update participantes set updated_at = updated_at where id = v_pa;
  insert into zz_res (nome, ok) values
    ('participantes→ scw:org recebe 1 sinal "participantes" da marca A (cascata deduplicada)', pg_temp.msgs(v_ini, 'scw:org', 'participantes', v_pa::text) = 1),
    ('participantes→ scw:social recebe como "editorial"', pg_temp.msgs(v_ini, 'scw:social', 'editorial', v_pa::text) = 1),
    ('participantes→ canal da marca A recebe', pg_temp.msgs(v_ini, 'scw:marca:' || v_pa, 'participantes', v_pa::text) = 1),
    ('participantes→ canal da marca B NÃO recebe nada da marca A', (select count(*) from realtime.messages where topic = 'scw:marca:' || v_pb and (payload ->> 'r') = v_pa::text) = 0),
    ('participantes→ scw:marcas NÃO recebe dado de uma marca', pg_temp.msgs(v_ini, 'scw:marcas', 'participantes', v_pa::text) = 0),
    ('participantes→ scw:social NÃO recebe o domínio "participantes" (só editorial)', pg_temp.msgs(v_ini, 'scw:social', 'participantes', v_pa::text) = 0);
  select bool_and((select array_agg(k order by k) from jsonb_object_keys(payload - 'id') k) = array['d', 'r', 't']) into ok
    from realtime.messages where topic = 'scw:org' and (payload ->> 'r') = v_pa::text and (payload ->> 't')::bigint >= v_ini;
  insert into zz_res (nome, ok) values ('sinal mínimo: só d, r, t (+ id do broadcast) — nunca registro', coalesce(ok, false));
  update participantes set updated_at = updated_at where id = v_pa;
  insert into zz_res (nome, ok) values ('repetição na mesma transação não gera sinal novo', pg_temp.msgs(v_ini, 'scw:org', 'participantes', v_pa::text) = 1);

  -- mensagem da organização para a marca A (e o aviso que o próprio banco gera)
  insert into mensagens (participante_id, de, corpo) values (v_pa, 'organizacao', 'teste de sincronizacao');
  insert into zz_res (nome, ok) values
    ('mensagens→ canal da marca A', pg_temp.msgs(v_ini, 'scw:marca:' || v_pa, 'mensagens', v_pa::text) = 1),
    ('mensagens→ scw:org', pg_temp.msgs(v_ini, 'scw:org', 'mensagens', v_pa::text) = 1),
    ('aviso da mensagem→ canal da marca A (domínio avisos)', pg_temp.msgs(v_ini, 'scw:marca:' || v_pa, 'avisos', null) >= 1),
    ('mensagens→ social media NÃO recebe', (select count(*) from realtime.messages where topic = 'scw:social' and (payload ->> 'd') in ('mensagens', 'avisos') and (payload ->> 't')::bigint >= v_ini) = 0),
    ('mensagens→ canal da marca B NÃO recebe', (select count(*) from realtime.messages where topic = 'scw:marca:' || v_pb and (payload ->> 't')::bigint >= v_ini) = 0);

  -- venda: nunca chega ao social media
  select id into v_a from vendas_diarias limit 1;
  if v_a is not null then
    update vendas_diarias set updated_at = updated_at where id = v_a;
    insert into zz_res (nome, ok) values
      ('vendas→ scw:org recebe', (select count(*) from realtime.messages where topic = 'scw:org' and (payload ->> 'd') = 'vendas' and (payload ->> 't')::bigint >= v_ini) >= 1),
      ('vendas→ social media NÃO recebe (dado financeiro)', (select count(*) from realtime.messages where topic = 'scw:social' and (payload ->> 'd') = 'vendas') = 0);
  end if;

  -- aviso pessoal: só a própria pessoa
  insert into notificacoes (para, tipo, titulo, para_user_id, push_enviado_em) values ('organizacao', 'redes', 'teste', v_admin, now()) returning id into v_nid;
  insert into zz_res (nome, ok) values
    ('aviso pessoal→ canal pessoal do admin', pg_temp.msgs(v_ini, 'scw:pessoa:' || v_admin, 'avisos', null) = 1),
    ('aviso pessoal→ NÃO vai ao canal geral da organização', pg_temp.msgs(v_ini, 'scw:org', 'avisos', null) = 0),
    ('aviso pessoal→ NÃO vai ao canal pessoal da produção', pg_temp.msgs(v_ini, 'scw:pessoa:' || v_prod, 'avisos', null) = 0);
  -- ler um aviso: as outras sessões da MESMA pessoa se acertam
  insert into notificacao_leitura (notificacao_id, leitor) values (v_nid, v_prod::text);
  insert into zz_res (nome, ok) values ('ler aviso→ canal pessoal de quem leu', pg_temp.msgs(v_ini, 'scw:pessoa:' || v_prod, 'avisos', null) = 1);
  -- leitura da conta compartilhada (legado) não tem canal
  insert into notificacao_leitura (notificacao_id, leitor) values (v_nid, 'compartilhada');
  insert into zz_res (nome, ok) values ('leitura "compartilhada" não vaza para canal nenhum', (select count(*) from realtime.messages where topic like 'scw:pessoa:comp%') = 0);

  -- perfil: a pessoa, a equipe e (marca) a lista de acessos
  update perfis set nome = nome where user_id = v_social;
  update perfis set ativo = ativo where user_id = v_ba;
  insert into zz_res (nome, ok) values
    ('perfil da equipe→ canal pessoal', pg_temp.msgs(v_ini, 'scw:pessoa:' || v_social, 'perfis', v_social::text) = 1),
    ('perfil da equipe→ scw:org e scw:social (diretório e avatar)', pg_temp.msgs(v_ini, 'scw:org', 'perfis', v_social::text) = 1 and pg_temp.msgs(v_ini, 'scw:social', 'perfis', v_social::text) = 1),
    ('perfil de MARCA→ scw:org como "acessos"', pg_temp.msgs(v_ini, 'scw:org', 'acessos', v_pa::text) = 1),
    ('perfil de MARCA→ nenhum domínio restrito (acessos, vendas, mensagens, vouchers, pedidos) chega ao social media', (select count(*) from realtime.messages where topic = 'scw:social' and (payload ->> 'd') in ('acessos', 'vendas', 'mensagens', 'vouchers', 'pedidos', 'avisos') and (payload ->> 't')::bigint >= v_ini) = 0);

  -- vaga de foto aberta chega a todas as marcas; sessão de uma marca só a ela
  select id into v_f from sessoes_fotos where status = 'aberto' limit 1;
  if v_f is not null then
    update sessoes_fotos set status = status where id = v_f;
    insert into zz_res (nome, ok) values ('vaga aberta→ scw:marcas', (select count(*) from realtime.messages where topic = 'scw:marcas' and (payload ->> 'd') = 'fotos' and (payload ->> 't')::bigint >= v_ini) >= 1);
  end if;
  select id, escopo into v_a, v_esc from arquivos order by created_at limit 1;
  if v_a is not null then
    update arquivos set nome = nome where id = v_a;
    insert into zz_res (nome, ok) values ('arquivo ('|| v_esc || ')→ org recebe e escopo certo', pg_temp.msgs(v_ini, 'scw:org', 'arquivos', v_a::text) = 1
      and (case when v_esc = 'geral' then pg_temp.msgs(v_ini, 'scw:marcas', 'arquivos', v_a::text) = 1 else pg_temp.msgs(v_ini, 'scw:marcas', 'arquivos', v_a::text) = 0 end));
  end if;

  -- ── 3. pendência resolvida deixa de contar como aberta ─────────────────────
  select id into v_post from redes_posts order by id limit 1;
  if v_post is not null then
    insert into notificacoes (para, tipo, titulo, para_user_id, chave_grupo, push_enviado_em)
      values ('organizacao', 'redes', 'Aguardando sua aprovação', v_admin, 'redes:' || v_post || ':aprovacao', now()) returning id into v_nid2;
    update redes_posts set situacao = 'aprovacao' where id = v_post;
    select count(*) into n from notificacao_leitura where notificacao_id = v_nid2;
    insert into zz_res (nome, ok) values ('post EM aprovação: o aviso do aprovador continua aberto', n = 0);
    update redes_posts set situacao = 'pronto' where id = v_post;
    select count(*) into n from notificacao_leitura where notificacao_id = v_nid2 and leitor = v_admin::text;
    insert into zz_res (nome, ok) values ('post SAIU de aprovação: o aviso do aprovador vira lido (só o dele)', n = 1);
    insert into zz_res (nome, ok) values ('post muda→ scw:social recebe "redes" com o id do post', pg_temp.msgs(v_ini, 'scw:social', 'redes', v_post::text) >= 1);
    insert into zz_res (nome, ok) values ('post muda→ scw:org NÃO recebe "redes"', pg_temp.msgs(v_ini, 'scw:org', 'redes', v_post::text) = 0);
  end if;

  select solicitacao_id, participacao_id into v_sid, v_spa from solicitacao_estado where estado = 'pendente' limit 1;
  if v_sid is not null then
    insert into notificacoes (para, participante_id, tipo, titulo, link, push_enviado_em)
      values ('marca', (select participante_id from participacoes where id = v_spa), 'pedido', 'Novo pedido', 'pedidos/' || v_sid, now()) returning id into v_ped;
    update solicitacao_estado set estado = 'respondido' where solicitacao_id = v_sid and participacao_id = v_spa;
    select (lida_em is not null) into ok from notificacoes where id = v_ped;
    insert into zz_res (nome, ok) values ('pedido respondido: o aviso "Novo pedido" da marca vira lido', coalesce(ok, false));
  else
    insert into zz_res (nome, ok) values ('(sem pedido pendente no banco para testar a resolução — não aplicável)', true);
  end if;

  -- ── 4. robustez ────────────────────────────────────────────────────────────
  perform public.sync_emitir(null, null, null);
  perform public.sync_emitir('scw:org', 'dominio_qualquer', null);
  insert into zz_res (nome, ok) values ('emissão com argumento nulo/estranho não levanta erro (gravação nunca cai por causa do sinal)', true);

  raise exception E'RESULTADO\n%', (
    select string_agg(case when z.ok then 'OK    ' else 'FALHA ' end || z.nome, E'\n' order by z.ord) || E'\n\nTotal: ' || count(*) || ' · falhas: ' || count(*) filter (where not z.ok)
      from zz_res z);
end $teste$;
