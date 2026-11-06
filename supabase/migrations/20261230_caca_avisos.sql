-- Caça aos Carimbos: central de avisos do visitante + comunicados da organização + limites de envio.
-- ADITIVA: não altera caca_push (dispositivos e preferências continuam lá), só acrescenta duas chaves de preferência
-- (voucher, imprevisto) e as tabelas de aviso/entrega. Nenhum envio real acontece por esta migration.
--
-- Modelo (uma fonte por conceito):
--   · caca_push            dispositivos + prefs (já existe)
--   · caca_aviso           um aviso (comunicado da organização OU lembrete automático de uma pessoa)
--   · caca_aviso_entrega   quem recebe cada aviso: lista da central (visto/novo) + estado do push. unique(aviso, mapa) = idempotência
--
-- Regras que o banco impõe (não só a tela):
--   · só a organização com producao.gerir cria/agenda/envia/cancela (pode(secret, ...));
--   · "imprevisto" é urgente, exige casa + dia + situação escritos por quem confirmou, e só vai a quem tem a casa na rota de um grupo;
--   · lembrete comum respeita janela (padrão 08h–21h, America/Fortaleza) e teto por pessoa/dia; urgente ignora a janela, nunca o teto de duplicata;
--   · conteúdo do aviso nunca carrega e-mail, telefone ou chave (checagem de formato do destino e do texto);
--   · ninguém lê o aviso de outro mapa: a leitura é pela chave pessoal do mapa.
-- reverter:
--   drop function if exists public.caca_avisos_ler(text), public.caca_avisos_visto(text, uuid[]),
--     public.caca_aviso_criar(text, jsonb), public.caca_aviso_estimar(text, uuid), public.caca_aviso_enviar(text, uuid),
--     public.caca_aviso_cancelar(text, uuid), public.caca_aviso_listar(text, text), public.caca_aviso_entregas_pendentes(uuid, int),
--     public.caca_aviso_entrega_marcar(text, uuid, uuid[]), public.caca_avisos_gerar_automaticos(timestamptz),
--     public.caca_avisos_limites();
--   drop table if exists public.caca_aviso_entrega, public.caca_aviso;
--   -- restaurar caca_push_prefs_norm e o padrão de caca_push_registrar de 20261207_caca_metas_push.sql

-- ---------------------------------------------------------------- 1. preferências: duas chaves novas
create or replace function public.caca_push_prefs_norm(p jsonb)
 returns jsonb language sql immutable set search_path to 'public'
as $$
  select coalesce(jsonb_object_agg(k, p -> k), '{}'::jsonb)
    from unnest(array['avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto']) k
   where jsonb_typeof(p -> k) = 'boolean'
$$;
revoke all on function public.caca_push_prefs_norm(jsonb) from public, anon, authenticated;

-- Padrão do servidor: voucher é divulgação (desligado até a pessoa escolher); imprevisto é útil e raro (ligado).
-- Reaplica caca_push_registrar com o padrão ampliado (o resto do corpo é idêntico ao de 20261207).
create or replace function public.caca_push_registrar(p_chave text, p_subscription jsonb, p_prefs jsonb default null)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_ep text; v_p text; v_a text; v_hash text; v_prefs jsonb; v_n int;
  v_padrao constant jsonb := '{"avaliacao_pendente":true,"meta":true,"grupo":true,"edicao":false,"voucher":false,"imprevisto":true}';
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;

  v_ep := p_subscription ->> 'endpoint'; v_p := p_subscription -> 'keys' ->> 'p256dh'; v_a := p_subscription -> 'keys' ->> 'auth';
  if v_ep is null or char_length(v_ep) > 2048
     or v_ep !~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/[^\s]+$'
     or v_p is null or v_p !~ '^[A-Za-z0-9_-]{80,100}$'
     or v_a is null or v_a !~ '^[A-Za-z0-9_-]{16,32}$'
  then return jsonb_build_object('ok', false, 'motivo', 'assinatura_invalida'); end if;
  v_hash := public.mapa_hash(v_ep);

  perform pg_advisory_xact_lock(hashtextextended('caca_push:' || m.id::text, 0));
  select count(*) into v_n from public.caca_push where mapa_id = m.id and ativo and endpoint_hash <> v_hash;
  if v_n >= 5 then return jsonb_build_object('ok', false, 'motivo', 'limite_dispositivos'); end if;

  v_prefs := v_padrao
          || coalesce((select c.prefs from public.caca_push c where c.mapa_id = m.id and c.ativo
                        order by c.atualizado_em desc limit 1), '{}'::jsonb)
          || public.caca_push_prefs_norm(p_prefs);
  insert into public.caca_push (mapa_id, endpoint_hash, endpoint, p256dh, auth_chave, prefs)
  values (m.id, v_hash, v_ep, v_p, v_a, v_prefs)
  on conflict (endpoint_hash) do update
     set mapa_id = excluded.mapa_id, endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth_chave = excluded.auth_chave,
         prefs = excluded.prefs, ativo = true, atualizado_em = now();
  return jsonb_build_object('ok', true, 'prefs', v_prefs, 'dispositivos', v_n + 1);
end $$;
revoke all on function public.caca_push_registrar(text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.caca_push_registrar(text, jsonb, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------- 2. tabelas
create table if not exists public.caca_aviso (
  id uuid primary key default gen_random_uuid(),
  edicao_codigo text not null,
  categoria text not null check (categoria in ('avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto')),
  urgente boolean not null default false,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 80),
  corpo text not null check (char_length(btrim(corpo)) between 1 and 240),
  destino text not null default '/cartoon/caca' check (destino ~ '^/(?!/)[A-Za-z0-9/_-]*$' and char_length(destino) <= 120),
  -- público: {"tipo":"todos"} · {"tipo":"com_push"} · {"tipo":"mapas","ids":[uuid…]} · {"tipo":"casa_na_rota"} (usa participacao_id)
  publico jsonb not null default '{"tipo":"todos"}'::jsonb,
  participacao_id uuid,            -- imprevisto: a casa/unidade afetada
  dia date,                        -- imprevisto: o dia afetado
  vigente_de timestamptz not null default now(),
  vigente_ate timestamptz,
  enviar_em timestamptz,           -- agendado
  estado text not null default 'rascunho' check (estado in ('rascunho', 'agendado', 'enviado', 'cancelado')),
  origem text not null default 'organizacao' check (origem in ('organizacao', 'automatico')),
  chave_dedupe text unique,        -- automático: um evento = um aviso ('meta:<mapa>:<casas>')
  criado_por text, criado_em timestamptz not null default now(),
  enviado_por text, enviado_em timestamptz,
  cancelado_por text, cancelado_em timestamptz,
  alvos int not null default 0, push_enviados int not null default 0, push_falhas int not null default 0,
  constraint caca_aviso_imprevisto_ck check (categoria <> 'imprevisto' or (urgente and participacao_id is not null and dia is not null)),
  constraint caca_aviso_urgente_ck check (not urgente or categoria = 'imprevisto')
);
create index if not exists caca_aviso_estado on public.caca_aviso (edicao_codigo, estado, criado_em desc);
alter table public.caca_aviso enable row level security;
revoke all on table public.caca_aviso from public, anon, authenticated;

create table if not exists public.caca_aviso_entrega (
  aviso_id uuid not null references public.caca_aviso(id) on delete cascade,
  mapa_id uuid not null references public.mapas_lover(id) on delete cascade,
  criado_em timestamptz not null default now(),
  visto_em timestamptz,
  push_estado text check (push_estado in ('enviado', 'falhou', 'sem_aparelho', 'preferencia', 'limite', 'adiado')),
  push_em timestamptz,
  primary key (aviso_id, mapa_id)
);
create index if not exists caca_aviso_entrega_mapa on public.caca_aviso_entrega (mapa_id, criado_em desc);
alter table public.caca_aviso_entrega enable row level security;
revoke all on table public.caca_aviso_entrega from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. limites (configuráveis em caca_config 'avisos_limites')
-- {"lembretes_dia":2,"por_categoria_dia":1,"janela_de":8,"janela_ate":21}  — fuso de Natal.
create or replace function public.caca_avisos_limites()
 returns jsonb language sql stable set search_path to 'public'
as $$
  select '{"lembretes_dia":2,"por_categoria_dia":1,"janela_de":8,"janela_ate":21}'::jsonb
      || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'avisos_limites'), '{}'::jsonb)
$$;
revoke all on function public.caca_avisos_limites() from public, anon, authenticated;

-- ---------------------------------------------------------------- 4. visitante: ler e marcar visto
create or replace function public.caca_avisos_ler(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  return jsonb_build_object(
    'avisos', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', a.id, 'categoria', a.categoria, 'urgente', a.urgente, 'titulo', a.titulo, 'corpo', a.corpo,
                  'destino', a.destino, 'quando', coalesce(a.enviado_em, a.criado_em), 'visto', e.visto_em is not null)
                  order by coalesce(a.enviado_em, a.criado_em) desc), '[]'::jsonb)
                 from (select e2.* from public.caca_aviso_entrega e2 where e2.mapa_id = m.id order by e2.criado_em desc limit 60) e
                 join public.caca_aviso a on a.id = e.aviso_id
                where a.estado = 'enviado' and (a.vigente_ate is null or a.vigente_ate > now())),
    'novos', (select count(*)::int from public.caca_aviso_entrega e join public.caca_aviso a on a.id = e.aviso_id
               where e.mapa_id = m.id and e.visto_em is null and a.estado = 'enviado' and (a.vigente_ate is null or a.vigente_ate > now())));
end $$;

create or replace function public.caca_avisos_visto(p_chave text, p_ids uuid[])
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_n int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  update public.caca_aviso_entrega set visto_em = now()
   where mapa_id = m.id and visto_em is null and aviso_id = any (coalesce(p_ids, '{}'::uuid[]));
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'marcados', v_n);
end $$;
revoke all on function public.caca_avisos_ler(text) from public, anon, authenticated;
revoke all on function public.caca_avisos_visto(text, uuid[]) from public, anon, authenticated;
grant execute on function public.caca_avisos_ler(text) to anon, authenticated;
grant execute on function public.caca_avisos_visto(text, uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------- 5. público (interno): quem entra em um aviso
-- Devolve os mapas da edição que o aviso atinge. Nunca devolve dado pessoal, só ids.
create or replace function public.caca_aviso_publico(p_aviso public.caca_aviso)
 returns table (mapa_id uuid) language plpgsql stable set search_path to 'public'
as $$
declare v_t text := p_aviso.publico ->> 'tipo';
begin
  if v_t = 'todos' then
    return query select m.id from public.mapas_lover m where m.edicao_codigo = p_aviso.edicao_codigo;
  elsif v_t = 'com_push' then
    return query select distinct m.id from public.mapas_lover m join public.caca_push c on c.mapa_id = m.id and c.ativo
                  where m.edicao_codigo = p_aviso.edicao_codigo;
  elsif v_t = 'mapas' then
    return query select m.id from public.mapas_lover m
                  where m.edicao_codigo = p_aviso.edicao_codigo
                    and m.id in (select (j #>> '{}')::uuid from jsonb_array_elements(coalesce(p_aviso.publico -> 'ids', '[]'::jsonb)) j);
  elsif v_t = 'casa_na_rota' then
    -- quem tem a casa na rota de um grupo em que está ativo (rota individual fica só no aparelho: não é dado do servidor)
    return query select distinct gm.mapa_id from public.caca_grupo_rota r
                  join public.caca_grupo g on g.id = r.grupo_id
                  join public.caca_grupo_membro gm on gm.grupo_id = g.id and gm.saiu_em is null and gm.removido_em is null
                 where r.participacao_id = p_aviso.participacao_id and g.edicao_codigo = p_aviso.edicao_codigo and gm.mapa_id is not null;
  end if;
end $$;
revoke all on function public.caca_aviso_publico(public.caca_aviso) from public, anon, authenticated;

-- ---------------------------------------------------------------- 6. painel: criar / estimar / enviar / cancelar / listar
create or replace function public.caca_aviso_criar(p_secret text, p_dados jsonb)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_ed text; v_cat text; v_urg boolean; v_pub jsonb; v_t text; v_quando timestamptz; v_id uuid; v_estado text;
  v_dest text; v_titulo text; v_corpo text; v_ate timestamptz;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if jsonb_typeof(p_dados) <> 'object' then raise exception 'dados_invalidos'; end if;
  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  if v_ed is null then raise exception 'sem_edicao'; end if;

  v_cat := p_dados ->> 'categoria';
  v_urg := coalesce((p_dados ->> 'urgente')::boolean, false);
  v_titulo := btrim(coalesce(p_dados ->> 'titulo', ''));
  v_corpo := btrim(coalesce(p_dados ->> 'corpo', ''));
  v_dest := coalesce(nullif(btrim(p_dados ->> 'destino'), ''), '/cartoon/caca');
  v_pub := coalesce(p_dados -> 'publico', '{"tipo":"todos"}'::jsonb);
  v_t := v_pub ->> 'tipo';
  v_quando := nullif(p_dados ->> 'enviar_em', '')::timestamptz;
  v_ate := nullif(p_dados ->> 'vigente_ate', '')::timestamptz;

  if v_cat not in ('edicao', 'voucher', 'imprevisto') then raise exception 'categoria_invalida'; end if;  -- as demais são automáticas
  if v_t not in ('todos', 'com_push', 'mapas', 'casa_na_rota') then raise exception 'publico_invalido'; end if;
  if char_length(v_titulo) not between 1 and 80 then raise exception 'titulo_invalido'; end if;
  if char_length(v_corpo) not between 1 and 240 then raise exception 'corpo_invalido'; end if;
  if v_dest !~ '^/(?!/)[A-Za-z0-9/_-]*$' or v_dest !~ '^/cartoon/caca' then raise exception 'destino_invalido'; end if;
  -- nunca contato nem chave no conteúdo
  if v_titulo || ' ' || v_corpo ~* '(@[a-z0-9.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{8,}\d|#mapa=)' then raise exception 'conteudo_com_dado_pessoal'; end if;
  if v_ate is not null and v_ate <= now() then raise exception 'vigencia_passada'; end if;
  if v_quando is not null and v_quando <= now() - interval '1 minute' then raise exception 'agendamento_passado'; end if;

  if v_cat = 'imprevisto' then
    v_urg := true;
    if v_t <> 'casa_na_rota' then raise exception 'imprevisto_so_para_quem_tem_a_casa'; end if;
    if nullif(p_dados ->> 'participacao_id', '') is null or nullif(p_dados ->> 'dia', '') is null then raise exception 'imprevisto_sem_casa_ou_dia'; end if;
    if not exists (select 1 from public.participacoes where id = (p_dados ->> 'participacao_id')::uuid and edicao_codigo = v_ed) then
      raise exception 'casa_desconhecida';
    end if;
  else
    v_urg := false;
  end if;
  if v_t = 'mapas' and jsonb_typeof(v_pub -> 'ids') is distinct from 'array' then raise exception 'publico_invalido'; end if;

  v_estado := case when v_quando is not null then 'agendado' else 'rascunho' end;
  insert into public.caca_aviso (edicao_codigo, categoria, urgente, titulo, corpo, destino, publico, participacao_id, dia,
                                 vigente_ate, enviar_em, estado, origem, criado_por)
  values (v_ed, v_cat, v_urg, v_titulo, v_corpo, v_dest, jsonb_build_object('tipo', v_t) || case when v_t = 'mapas' then jsonb_build_object('ids', v_pub -> 'ids') else '{}'::jsonb end,
          nullif(p_dados ->> 'participacao_id', '')::uuid, nullif(p_dados ->> 'dia', '')::date,
          v_ate, v_quando, v_estado, 'organizacao', coalesce(public.ator_rotulo_atual(), 'Painel'))
  returning id into v_id;
  perform public.caca_evento_gravar(v_ed, null, 'aviso_criar', null, jsonb_build_object('aviso', v_id, 'categoria', v_cat, 'estado', v_estado), null);
  return jsonb_build_object('ok', true, 'id', v_id, 'estado', v_estado);
end $$;

-- Prévia do público antes do envio: contagens, sem dado pessoal.
create or replace function public.caca_aviso_estimar(p_secret text, p_id uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare a public.caca_aviso%rowtype; v_mapas int; v_push int;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  select * into a from public.caca_aviso where id = p_id;
  if a.id is null then raise exception 'aviso_desconhecido'; end if;
  select count(*) into v_mapas from public.caca_aviso_publico(a);
  select count(distinct c.mapa_id) into v_push from public.caca_push c
   where c.ativo and coalesce((c.prefs ->> a.categoria)::boolean, false) and c.mapa_id in (select mapa_id from public.caca_aviso_publico(a));
  return jsonb_build_object('mapas', v_mapas, 'recebem_push', v_push);
end $$;

-- Envio = ação explícita. Materializa a central (idempotente) e fecha o aviso; o push sai pela edge caca-push, que lê as pendências.
create or replace function public.caca_aviso_enviar(p_secret text, p_id uuid)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare a public.caca_aviso%rowtype; v_n int;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  select * into a from public.caca_aviso where id = p_id for update;
  if a.id is null then raise exception 'aviso_desconhecido'; end if;
  if a.origem <> 'organizacao' then raise exception 'aviso_automatico'; end if;
  if a.estado not in ('rascunho', 'agendado') then raise exception 'aviso_ja_%', a.estado; end if;
  if a.vigente_ate is not null and a.vigente_ate <= now() then raise exception 'vigencia_passada'; end if;
  insert into public.caca_aviso_entrega (aviso_id, mapa_id) select a.id, p.mapa_id from public.caca_aviso_publico(a) p
  on conflict do nothing;
  get diagnostics v_n = row_count;
  update public.caca_aviso set estado = 'enviado', enviado_em = now(), enviado_por = coalesce(public.ator_rotulo_atual(), 'Painel'), alvos = v_n
   where id = a.id;
  perform public.caca_evento_gravar(a.edicao_codigo, null, 'aviso_enviar', null, jsonb_build_object('aviso', a.id, 'alvos', v_n), null);
  return jsonb_build_object('ok', true, 'alvos', v_n);
end $$;

create or replace function public.caca_aviso_cancelar(p_secret text, p_id uuid)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare a public.caca_aviso%rowtype;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  select * into a from public.caca_aviso where id = p_id for update;
  if a.id is null then raise exception 'aviso_desconhecido'; end if;
  if a.estado not in ('rascunho', 'agendado') then raise exception 'so_antes_do_envio'; end if;
  update public.caca_aviso set estado = 'cancelado', cancelado_em = now(), cancelado_por = coalesce(public.ator_rotulo_atual(), 'Painel') where id = a.id;
  perform public.caca_evento_gravar(a.edicao_codigo, null, 'aviso_cancelar', jsonb_build_object('estado', a.estado), jsonb_build_object('aviso', a.id), null);
  return jsonb_build_object('ok', true);
end $$;

-- Lista para o painel: só contagens e estado. Sem mapa, apelido nem contato.
create or replace function public.caca_aviso_listar(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'categoria', a.categoria, 'urgente', a.urgente, 'titulo', a.titulo, 'corpo', a.corpo, 'destino', a.destino,
      'publico', a.publico ->> 'tipo', 'estado', a.estado, 'origem', a.origem, 'enviar_em', a.enviar_em, 'vigente_ate', a.vigente_ate,
      'criado_por', a.criado_por, 'criado_em', a.criado_em, 'enviado_por', a.enviado_por, 'enviado_em', a.enviado_em,
      'cancelado_por', a.cancelado_por, 'cancelado_em', a.cancelado_em,
      'alvos', a.alvos, 'push_enviados', a.push_enviados, 'push_falhas', a.push_falhas,
      'vistos', (select count(*) from public.caca_aviso_entrega e where e.aviso_id = a.id and e.visto_em is not null))
      order by a.criado_em desc), '[]'::jsonb)
    from (select * from public.caca_aviso where edicao_codigo = p_edicao and origem = 'organizacao' order by criado_em desc limit 100) a);
end $$;
revoke all on function public.caca_aviso_criar(text, jsonb) from public, anon, authenticated;
revoke all on function public.caca_aviso_estimar(text, uuid) from public, anon, authenticated;
revoke all on function public.caca_aviso_enviar(text, uuid) from public, anon, authenticated;
revoke all on function public.caca_aviso_cancelar(text, uuid) from public, anon, authenticated;
revoke all on function public.caca_aviso_listar(text, text) from public, anon, authenticated;
grant execute on function public.caca_aviso_criar(text, jsonb) to anon, authenticated;
grant execute on function public.caca_aviso_estimar(text, uuid) to anon, authenticated;
grant execute on function public.caca_aviso_enviar(text, uuid) to anon, authenticated;
grant execute on function public.caca_aviso_cancelar(text, uuid) to anon, authenticated;
grant execute on function public.caca_aviso_listar(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 7. push: fila para a edge (só a edge, com a chave de serviço; sem grant)
-- Devolve as entregas SEM decisão de push de um aviso enviado, já com a decisão de regra tomada aqui:
--   preferencia (pessoa desligou a categoria) · sem_aparelho · limite (teto do dia) · adiado (fora da janela; volta depois) · ok.
-- O que não é 'ok' é gravado e não será reenviado; 'adiado' continua pendente.
-- Contagens do teto olham só push já 'enviado' no dia local de Natal.
create or replace function public.caca_aviso_entregas_pendentes(p_aviso uuid, p_max int default 500)
 returns table (mapa_id uuid, push_id uuid, endpoint text, p256dh text, auth_chave text)
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare a public.caca_aviso%rowtype; lim jsonb := public.caca_avisos_limites(); v_agora timestamp; v_h int; v_dia date;
  v_dentro boolean; r record;
begin
  select * into a from public.caca_aviso where id = p_aviso;
  if a.id is null or a.estado <> 'enviado' or (a.vigente_ate is not null and a.vigente_ate <= now()) then return; end if;
  v_agora := now() at time zone 'America/Fortaleza'; v_h := extract(hour from v_agora)::int; v_dia := v_agora::date;
  v_dentro := v_h >= (lim ->> 'janela_de')::int and v_h < (lim ->> 'janela_ate')::int;

  for r in select e.mapa_id as mid from public.caca_aviso_entrega e
            where e.aviso_id = a.id and (e.push_estado is null or e.push_estado = 'adiado') order by e.criado_em limit p_max
  loop
    if not exists (select 1 from public.caca_push c where c.mapa_id = r.mid and c.ativo) then
      update public.caca_aviso_entrega set push_estado = 'sem_aparelho', push_em = now() where aviso_id = a.id and caca_aviso_entrega.mapa_id = r.mid;
      continue;
    end if;
    if not exists (select 1 from public.caca_push c where c.mapa_id = r.mid and c.ativo and coalesce((c.prefs ->> a.categoria)::boolean, false)) then
      update public.caca_aviso_entrega set push_estado = 'preferencia', push_em = now() where aviso_id = a.id and caca_aviso_entrega.mapa_id = r.mid;
      continue;
    end if;
    if not a.urgente then
      if not v_dentro then
        update public.caca_aviso_entrega set push_estado = 'adiado', push_em = now() where aviso_id = a.id and caca_aviso_entrega.mapa_id = r.mid;
        continue;
      end if;
      if (select count(*) from public.caca_aviso_entrega x join public.caca_aviso y on y.id = x.aviso_id
           where x.mapa_id = r.mid and x.push_estado = 'enviado' and not y.urgente
             and (x.push_em at time zone 'America/Fortaleza')::date = v_dia) >= (lim ->> 'lembretes_dia')::int
         or (select count(*) from public.caca_aviso_entrega x join public.caca_aviso y on y.id = x.aviso_id
              where x.mapa_id = r.mid and x.push_estado = 'enviado' and y.categoria = a.categoria and not y.urgente
                and (x.push_em at time zone 'America/Fortaleza')::date = v_dia) >= (lim ->> 'por_categoria_dia')::int then
        update public.caca_aviso_entrega set push_estado = 'limite', push_em = now() where aviso_id = a.id and caca_aviso_entrega.mapa_id = r.mid;
        continue;
      end if;
    end if;
    return query select r.mid, c.id, c.endpoint, c.p256dh, c.auth_chave
                   from public.caca_push c where c.mapa_id = r.mid and c.ativo and coalesce((c.prefs ->> a.categoria)::boolean, false);
  end loop;
end $$;
revoke all on function public.caca_aviso_entregas_pendentes(uuid, int) from public, anon, authenticated;

-- A edge informa o resultado por mapa ('enviado' | 'falhou') e a função consolida os totais do aviso.
create or replace function public.caca_aviso_entrega_marcar(p_estado text, p_aviso uuid, p_mapas uuid[])
 returns void language plpgsql volatile security definer set search_path to 'public'
as $$
begin
  if p_estado not in ('enviado', 'falhou') then raise exception 'estado_invalido'; end if;
  update public.caca_aviso_entrega set push_estado = p_estado, push_em = now()
   where aviso_id = p_aviso and mapa_id = any (p_mapas) and (push_estado is null or push_estado = 'adiado');
  update public.caca_aviso a set
    push_enviados = (select count(*) from public.caca_aviso_entrega e where e.aviso_id = a.id and e.push_estado = 'enviado'),
    push_falhas = (select count(*) from public.caca_aviso_entrega e where e.aviso_id = a.id and e.push_estado = 'falhou')
   where a.id = p_aviso;
end $$;
revoke all on function public.caca_aviso_entrega_marcar(text, uuid, uuid[]) from public, anon, authenticated;

-- ---------------------------------------------------------------- 8. avisos automáticos (LIGADO SÓ por caca_config 'avisos_auto' = {"ligado":true})
-- Cria avisos por pessoa a partir de FATO do banco; nada de inferência.
--   · meta: pessoa que alcançou um marco de casas validadas → um aviso por (mapa, marco), chave_dedupe;
--   · avaliacao_pendente: casa com carimbo, sem avaliação, já liberada (último carimbo + 12h) → um por (mapa, casa), só se continua pendente AGORA.
-- Não existe voucher/imprevisto automático: voucher só por comunicado da organização (caca_premio está vazia) e imprevisto só confirmado.
-- Nada é enviado aqui: cria o aviso 'enviado' + entrega; o push sai pela edge e passa pelos limites/janela. Sem agendador criado.
create or replace function public.caca_avisos_gerar_automaticos(p_agora timestamptz default now())
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_ed text; v_cfg jsonb; v_meta int := 0; v_pend int := 0; r record; v_id uuid; v_total int; v_cfgm jsonb;
begin
  select valor into v_cfg from public.caca_config where chave = 'avisos_auto';
  if coalesce((v_cfg ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'ligado', false); end if;
  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  if v_ed is null then return jsonb_build_object('ok', true, 'ligado', true, 'sem_edicao', true); end if;
  v_total := public.caca_total_casas(v_ed);
  select valor into v_cfgm from public.caca_config where chave = 'metas';

  -- metas (só no mapa principal da pessoa, como caca_metas_ler)
  for r in select m.id mapa, x.casas, x.titulo
             from public.mapas_lover m
             join public.caca_ranking_v2(v_ed) rk on rk.pessoa = m.email_norm
             cross join lateral public.caca_metas_resolver(v_cfgm, v_total) x
            where m.edicao_codigo = v_ed and m.id = public.caca_mapa_principal(v_ed, m.email_norm) and rk.casas >= x.casas
  loop
    insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, estado, origem, chave_dedupe, criado_por, enviado_em, enviado_por, alvos)
    values (v_ed, 'meta', 'Meta alcançada', r.titulo || ': você já validou ' || r.casas || (case when r.casas = 1 then ' casa.' else ' casas.' end),
            '/cartoon/caca/metas', jsonb_build_object('tipo', 'mapas', 'ids', jsonb_build_array(r.mapa)), 'enviado', 'automatico',
            'meta:' || r.mapa || ':' || r.casas, 'automatico', p_agora, 'automatico', 1)
    on conflict (chave_dedupe) do nothing returning id into v_id;
    if v_id is not null then insert into public.caca_aviso_entrega (aviso_id, mapa_id) values (v_id, r.mapa) on conflict do nothing; v_meta := v_meta + 1; end if;
    v_id := null;
  end loop;

  -- avaliação pendente (liberada há mais de 1 h para não avisar no mesmo instante; continua pendente agora)
  for r in select m.id mapa, k.participacao_id, max(k.criado_em) ultimo
             from public.mapas_lover m
             join public.carimbos k on k.mapa_id = m.id and k.anulado_em is null
            where m.edicao_codigo = v_ed
              and not exists (select 1 from public.avaliacoes a where a.edicao_codigo = v_ed and a.participacao_id = k.participacao_id and a.email_norm = m.email_norm)
            group by m.id, k.participacao_id
           having max(k.criado_em) + interval '13 hours' <= p_agora
  loop
    insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, estado, origem, chave_dedupe, criado_por, enviado_em, enviado_por, alvos)
    values (v_ed, 'avaliacao_pendente', 'Avaliação pendente', 'Falta avaliar uma casa que você carimbou. Leva um minuto.',
            '/cartoon/caca', jsonb_build_object('tipo', 'mapas', 'ids', jsonb_build_array(r.mapa)), 'enviado', 'automatico',
            'pendente:' || r.mapa || ':' || r.participacao_id, 'automatico', p_agora, 'automatico', 1)
    on conflict (chave_dedupe) do nothing returning id into v_id;
    if v_id is not null then insert into public.caca_aviso_entrega (aviso_id, mapa_id) values (v_id, r.mapa) on conflict do nothing; v_pend := v_pend + 1; end if;
    v_id := null;
  end loop;
  return jsonb_build_object('ok', true, 'ligado', true, 'metas', v_meta, 'pendentes', v_pend);
end $$;
revoke all on function public.caca_avisos_gerar_automaticos(timestamptz) from public, anon, authenticated;

-- Painel liga/desliga a geração automática (ação explícita, auditada). Padrão: desligada.
create or replace function public.caca_avisos_auto_definir(p_secret text, p_ligado boolean)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_antes jsonb;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  select valor into v_antes from public.caca_config where chave = 'avisos_auto';
  insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
  values ('avisos_auto', jsonb_build_object('ligado', coalesce(p_ligado, false)), 'Avisos automáticos da Caça (meta, avaliação pendente). Desligado por padrão.', now(), coalesce(public.ator_rotulo_atual(), 'Painel'))
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  perform public.caca_evento_gravar(null, null, 'avisos_auto', jsonb_build_object('antes', v_antes), jsonb_build_object('ligado', coalesce(p_ligado, false)), null);
  return jsonb_build_object('ok', true, 'ligado', coalesce(p_ligado, false));
end $$;
revoke all on function public.caca_avisos_auto_definir(text, boolean) from public, anon, authenticated;
grant execute on function public.caca_avisos_auto_definir(text, boolean) to anon, authenticated;

insert into public.caca_config (chave, valor, nota) values
  ('avisos_auto', '{"ligado":false}', 'Avisos automáticos da Caça (meta, avaliação pendente). Desligado por padrão.'),
  ('avisos_limites', '{"lembretes_dia":2,"por_categoria_dia":1,"janela_de":8,"janela_ate":21}', 'Limites de lembrete por pessoa. Fuso de Natal. Urgente (imprevisto confirmado) ignora a janela.')
on conflict (chave) do nothing;
