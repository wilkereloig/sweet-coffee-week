-- Caça aos Carimbos: metas, origem do carimbo, revisão de carimbos sem GPS e push do visitante
-- (Wilker, 04/11/2026; docs/cartoon-2026-2/15-caca-especificacao.md §12 e §13; contrato em 15-caca-contrato-metas-push.md).
-- ADITIVA: não altera mapa_carimbar, carimbo_placar, mapa_ler, ranking_mapa, get_caca_apuracao, submit_avaliacao, vouchers.
--
--  1. caca_config (criada com "if not exists": outra migration da ativação, 20261204, usa a mesma definição) + semente 'metas'.
--     Marcos 5/10/20/27 são EXEMPLO configurável — o Wilker ainda não decidiu os números. Nenhum prêmio novo é prometido.
--  2. carimbos.origem ('gps' | 'unidade_sem_coordenada' | 'excecao_painel') preenchida por TRIGGER a partir de conferido;
--     mapa_carimbar não muda.
--  3. caca_carimbo_revisao_listar: carimbos válidos sem prova de GPS, para a organização anular com carimbo_anular.
--     NÃO existe exceção ao GPS (ver docs/cartoon-2026-2/15-caca-gps-excecao.md).
--  4. caca_push: assinatura de push do visitante (sem login), isolada por mapa. Tabela fechada; acesso só por RPC.
--     O envio é da edge function caca-push (dry_run por padrão).
--
-- Reverter (nesta ordem):
--   drop function if exists public.caca_push_remover(text, text), public.caca_push_prefs(text, jsonb),
--     public.caca_push_registrar(text, jsonb, jsonb), public.caca_push_prefs_norm(jsonb),
--     public.caca_carimbo_revisao_listar(text, text), public.caca_metas_ler(text);
--   drop table if exists public.caca_push;
--   drop trigger if exists carimbos_origem on public.carimbos; drop function if exists public.carimbos_origem_definir();
--   alter table public.carimbos drop column if exists origem;
--   delete from public.caca_config where chave = 'metas';   -- (não apagar a tabela: pode ser de outra migration)

-- ---------------------------------------------------------------- 1. configuração e metas
create table if not exists public.caca_config (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.caca_config enable row level security;
revoke all on table public.caca_config from public, anon, authenticated;

insert into public.caca_config (chave, valor) values ('metas', jsonb_build_array(
  jsonb_build_object('casas', 5,  'titulo', 'Primeiros passos',   'exemplo', true),
  jsonb_build_object('casas', 10, 'titulo', 'Já pegou o jeito',   'exemplo', true),
  jsonb_build_object('casas', 20, 'titulo', 'Quase lá',           'exemplo', true),
  jsonb_build_object('casas', 27, 'titulo', 'Todas as casas',     'exemplo', true)))
on conflict (chave) do nothing;

-- Metas da edição + o que a pessoa já alcançou (casas diferentes validadas) + a próxima.
-- Meta com mais casas do que a edição tem não aparece (nunca seria alcançada). null = chave desconhecida.
create or replace function public.caca_metas_ler(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_total int; v_casas int; v_cfg jsonb; v_metas jsonb;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  select count(*)::int into v_total from public.participacoes pa
   where pa.edicao_codigo = m.edicao_codigo and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  select coalesce((select r.casas from public.caca_ranking_v2(m.edicao_codigo) r where r.pessoa = m.email_norm), 0) into v_casas;
  select valor into v_cfg from public.caca_config where chave = 'metas';

  select coalesce(jsonb_agg(jsonb_build_object(
           'casas', x.casas, 'titulo', x.titulo, 'exemplo', x.exemplo,
           'alcancada', v_casas >= x.casas, 'faltam', greatest(x.casas - v_casas, 0)) order by x.casas), '[]'::jsonb)
    into v_metas
    from (select distinct on (n.casas) n.casas, n.titulo, n.exemplo
            from (select (e.j ->> 'casas')::int casas, left(btrim(coalesce(e.j ->> 'titulo', '')), 60) titulo,
                         coalesce(e.j ->> 'exemplo' = 'true', false) exemplo
                    from jsonb_array_elements(case when jsonb_typeof(v_cfg) = 'array' then v_cfg else '[]'::jsonb end) e(j)
                   where jsonb_typeof(e.j) = 'object' and (e.j ->> 'casas') ~ '^\d{1,3}$') n
           where n.casas between 1 and v_total
           order by n.casas) x;

  return jsonb_build_object(
    'total_casas', v_total, 'casas_validadas', v_casas, 'metas', v_metas,
    'alcancadas', (select coalesce(jsonb_agg(e) filter (where (e ->> 'alcancada')::boolean), '[]'::jsonb) from jsonb_array_elements(v_metas) e),
    'proxima', (select e from jsonb_array_elements(v_metas) e where not (e ->> 'alcancada')::boolean limit 1));
end $$;

revoke all on function public.caca_metas_ler(text) from public, anon, authenticated;
grant execute on function public.caca_metas_ler(text) to anon, authenticated;

-- ---------------------------------------------------------------- 2. origem do carimbo
alter table public.carimbos
  add column if not exists origem text not null default 'gps'
  check (origem in ('gps', 'unidade_sem_coordenada', 'excecao_painel'));

-- Carimbos que já existiam sem prova de GPS (conferido = false) passam a constar como tal.
update public.carimbos set origem = 'unidade_sem_coordenada' where not conferido and origem = 'gps';

-- conferido = a unidade tem coordenada conferida E o celular passou na distância (mapa_carimbar). Senão a unidade não tem
-- coordenada. 'excecao_painel' é reservada: só vale se quem insere pedir explicitamente (nenhuma função de hoje faz isso).
create or replace function public.carimbos_origem_definir()
 returns trigger language plpgsql set search_path to 'public'
as $$
begin
  if new.origem is distinct from 'excecao_painel' then
    new.origem := case when new.conferido then 'gps' else 'unidade_sem_coordenada' end;
  end if;
  return new;
end $$;
revoke all on function public.carimbos_origem_definir() from public, anon, authenticated;

drop trigger if exists carimbos_origem on public.carimbos;
create trigger carimbos_origem before insert on public.carimbos
  for each row execute function public.carimbos_origem_definir();

-- ---------------------------------------------------------------- 3. revisão (painel)
-- Carimbos NÃO anulados cuja origem não é 'gps', mais recentes primeiro (até 500; 'total' diz quantos existem).
-- A organização revisa e anula com carimbo_anular(p_secret, carimbo_id, motivo) (permissão producao.gerir).
-- dado.ler vê apelido e casa; e-mail e WhatsApp só com relatorio.ler.
create or replace function public.caca_carimbo_revisao_listar(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_rel boolean;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  return jsonb_build_object(
    'total', (select count(*) from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
               where m.edicao_codigo = p_edicao and k.anulado_em is null and k.origem <> 'gps'),
    'carimbos', (select coalesce(jsonb_agg(x.o order by x.criado_em desc), '[]'::jsonb) from (
        select k.criado_em,
               jsonb_strip_nulls(jsonb_build_object(
                 'carimbo_id', k.id, 'mapa_id', k.mapa_id, 'apelido', m.apelido, 'criado_em', k.criado_em,
                 'origem', k.origem, 'casa', pt.nome_marca, 'slug', pa.slug_publico,
                 'nome_unidade', u.nome_unidade, 'distancia_m', k.distancia_m, 'precisao_m', k.precisao_m,
                 'email', case when v_rel then m.email_norm end, 'whatsapp', case when v_rel then m.whatsapp end)) o
          from public.carimbos k
          join public.mapas_lover m on m.id = k.mapa_id
          join public.participacoes pa on pa.id = k.participacao_id
          join public.participantes pt on pt.id = pa.participante_id
          left join public.participacao_unidades pu on pu.id = k.participacao_unidade_id
          left join public.unidades u on u.id = pu.unidade_id
         where m.edicao_codigo = p_edicao and k.anulado_em is null and k.origem <> 'gps'
         order by k.criado_em desc limit 500) x));
end $$;

revoke all on function public.caca_carimbo_revisao_listar(text, text) from public, anon, authenticated;
grant execute on function public.caca_carimbo_revisao_listar(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 4. push do visitante
-- ⚠️ endpoint de push é credencial (quem o tem manda notificação ao aparelho). Tabela sem policy e sem grant: só a edge
-- function caca-push (service_role) lê; nenhuma RPC devolve endpoint, p256dh ou auth. NÃO usa push_subscriptions do painel.
create table if not exists public.caca_push (
  id uuid primary key default gen_random_uuid(),
  mapa_id uuid not null references public.mapas_lover(id) on delete cascade,
  endpoint_hash text not null unique,
  endpoint text not null check (char_length(endpoint) <= 2048),
  p256dh text not null,
  auth_chave text not null,
  prefs jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists caca_push_mapa on public.caca_push (mapa_id) where ativo;
alter table public.caca_push enable row level security;
revoke all on table public.caca_push from public, anon, authenticated;

-- Só as quatro preferências conhecidas, só se forem booleanas. Interna (sem grant).
create or replace function public.caca_push_prefs_norm(p jsonb)
 returns jsonb language sql immutable set search_path to 'public'
as $$
  select coalesce(jsonb_object_agg(k, p -> k), '{}'::jsonb)
    from unnest(array['avaliacao_pendente', 'meta', 'grupo', 'edicao']) k
   where jsonb_typeof(p -> k) = 'boolean'
$$;
revoke all on function public.caca_push_prefs_norm(jsonb) from public, anon, authenticated;

-- Registra (ou move para este mapa) a assinatura de push do aparelho. Devolve {ok, prefs, dispositivos} ou {ok:false, motivo}.
-- motivos: 'mapa_desconhecido' · 'assinatura_invalida' · 'limite_dispositivos' (máx. 5 aparelhos ativos por mapa).
-- Preferência: padrão do servidor (avaliacao_pendente, meta, grupo = true; edicao = false, que é divulgação) <- a que o mapa
-- já tinha <- a enviada agora.
-- O endpoint só é aceito se for HTTPS num serviço de push conhecido (Chrome/FCM, Firefox, Safari, Edge/WNS): sem isso um
-- visitante faria a função de envio chamar qualquer endereço da internet.
create or replace function public.caca_push_registrar(p_chave text, p_subscription jsonb, p_prefs jsonb default null)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_ep text; v_p text; v_a text; v_hash text; v_prefs jsonb; v_n int;
  v_padrao constant jsonb := '{"avaliacao_pendente":true,"meta":true,"grupo":true,"edicao":false}';
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

-- Muda as preferências do mapa (vale para todos os aparelhos ativos dele). Chaves não enviadas ficam como estavam.
-- {ok:true, prefs, dispositivos} · {ok:false, motivo:'mapa_desconhecido'|'sem_assinatura'}.
create or replace function public.caca_push_prefs(p_chave text, p_prefs jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_novo jsonb := public.caca_push_prefs_norm(p_prefs); v_n int; v_prefs jsonb;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  update public.caca_push set prefs = prefs || v_novo, atualizado_em = now() where mapa_id = m.id and ativo;
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('ok', false, 'motivo', 'sem_assinatura'); end if;
  select c.prefs into v_prefs from public.caca_push c where c.mapa_id = m.id and c.ativo order by c.atualizado_em desc limit 1;
  return jsonb_build_object('ok', true, 'prefs', v_prefs, 'dispositivos', v_n);
end $$;

-- Remove (apaga) a assinatura deste aparelho, só se for deste mapa. p_endpoint nulo = todos os aparelhos do mapa.
-- {ok:true, removidos:n} · {ok:false, motivo:'mapa_desconhecido'}. Endpoint de outro mapa: removidos = 0.
create or replace function public.caca_push_remover(p_chave text, p_endpoint text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_n int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  delete from public.caca_push where mapa_id = m.id
     and (p_endpoint is null or endpoint_hash = public.mapa_hash(p_endpoint));
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'removidos', v_n);
end $$;

revoke all on function public.caca_push_registrar(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.caca_push_prefs(text, jsonb) from public, anon, authenticated;
revoke all on function public.caca_push_remover(text, text) from public, anon, authenticated;
grant execute on function public.caca_push_registrar(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.caca_push_prefs(text, jsonb) to anon, authenticated;
grant execute on function public.caca_push_remover(text, text) to anon, authenticated;
