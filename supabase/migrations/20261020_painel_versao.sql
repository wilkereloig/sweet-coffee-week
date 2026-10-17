-- ─────────────────────────────────────────────────────────────────────────────
-- Painel: versão publicada e aviso por push (18/10/2026). Só acrescenta.
--
-- Quem avisa é o SERVIDOR, não o navegador de alguém: a cada 10 min o
-- pg_cron lê /painel/versao.json DO DOMÍNIO DE PRODUÇÃO (o arquivo que o build
-- grava junto do painel; ver vite.config.js › versaoDoPainel). Versão com
-- `ambiente = production` e id nunca visto → linha em painel_versoes → a
-- enviar-push manda "Painel SCW atualizado" aos aparelhos inscritos.
--   · Só depois de a versão estar NO AR (é o arquivo publicado que conta);
--     preview, build local e deploy que falhou nunca mudam esse arquivo.
--   · Rollback volta a um id já visto: não avisa de novo (o painel avisa).
--   · Uma vez por aparelho e versão (push_versao_envios); assinatura morta
--     (404/410) é desativada; falha de envio tenta de novo, até 3 vezes no
--     primeiro dia, espaçadas.
--   · Preferência por aparelho: push_subscriptions.avisar_versao.
-- Push é o canal extra: falhou, o aviso dentro do painel continua.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.push_subscriptions add column if not exists avisar_versao boolean not null default true;

create table if not exists public.painel_versoes (
  id text primary key check (id ~ '^[0-9a-f]{12,64}$'),
  publicado_em timestamptz,
  commit text,
  novidades text,
  detectada_em timestamptz not null default now(),
  vista_em timestamptz not null default now(),
  push_iniciado_em timestamptz,
  push_tentativas int not null default 0,
  push_concluido_em timestamptz
);
create table if not exists public.push_versao_envios (
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  versao_id text not null references public.painel_versoes(id) on delete cascade,
  estado text not null check (estado in ('ok', 'falhou', 'morta')),
  tentativas int not null default 1,
  em timestamptz not null default now(),
  primary key (subscription_id, versao_id)
);
create table if not exists public.painel_versao_checagens (
  pedido bigint primary key,
  pedido_em timestamptz not null default now(),
  lida_em timestamptz,
  status int
);
alter table public.painel_versoes enable row level security;
alter table public.push_versao_envios enable row level security;
alter table public.painel_versao_checagens enable row level security;
revoke all on public.painel_versoes, public.push_versao_envios, public.painel_versao_checagens from public, anon, authenticated;

-- ── Estado e preferência DESTE aparelho (a pessoa só vê/muda o próprio) ──────
-- Também é a conferência de que a inscrição existe NO SERVIDOR para esta conta.
create or replace function public.push_aparelho(p_secret text, p_endpoint text, p_avisar_versao boolean default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.push_subscriptions;
begin
  if p_endpoint is null or length(p_endpoint) > 2000 then raise exception 'endpoint_invalido' using errcode = '22023'; end if;
  select * into s from public.push_subscriptions x
   where x.endpoint = p_endpoint and x.ativo
     and ((x.papel = 'organizacao' and public.membro_org(p_secret) and x.user_id is not distinct from auth.uid())
          or (x.papel = 'marca' and x.participante_id is not null and x.participante_id = public.meu_participante()))
   limit 1;
  if not found then return jsonb_build_object('registrado', false); end if;
  if p_avisar_versao is not null then
    update public.push_subscriptions set avisar_versao = p_avisar_versao where id = s.id returning * into s;
  end if;
  return jsonb_build_object('registrado', true, 'avisar_versao', s.avisar_versao);
end $$;
revoke all on function public.push_aparelho(text, text, boolean) from public;
grant execute on function public.push_aparelho(text, text, boolean) to anon, authenticated;

-- ── Envio (só a enviar-push, com a chave de serviço) ─────────────────────────
create or replace function public.push_versao_travar(p_versao text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.painel_versoes;
begin
  update public.painel_versoes set push_iniciado_em = now(), push_tentativas = push_tentativas + 1
   where id = p_versao and push_concluido_em is null and push_tentativas < 3
     and (push_iniciado_em is null or push_iniciado_em < now() - interval '10 minutes')
  returning * into v;
  if not found then return jsonb_build_object('travou', false); end if;
  return jsonb_build_object('travou', true, 'alvos', coalesce((
    select jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth_chave', s.auth_chave))
      from public.push_subscriptions s
     where s.ativo and s.avisar_versao
       and not exists (select 1 from public.push_versao_envios e
                        where e.subscription_id = s.id and e.versao_id = p_versao and e.estado in ('ok', 'morta'))
       and (s.papel = 'marca' or s.user_id is null
            or exists (select 1 from public.perfis pf where pf.user_id = s.user_id and pf.ativo and pf.bloqueado_em is null))
  ), '[]'::jsonb));
end $$;

create or replace function public.push_versao_concluir(p_versao text, p_resultados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb := coalesce(p_resultados, '[]'::jsonb); n_ok int; n_falhas int; n_mortas int;
begin
  insert into public.push_versao_envios (subscription_id, versao_id, estado)
  select (x->>'id')::uuid, p_versao, x->>'estado' from jsonb_array_elements(r) x
   where x->>'estado' in ('ok', 'falhou', 'morta')
     and exists (select 1 from public.push_subscriptions s where s.id = (x->>'id')::uuid)
  on conflict (subscription_id, versao_id) do update
    set estado = excluded.estado, tentativas = public.push_versao_envios.tentativas + 1, em = now();
  -- Desativa, não apaga: apagar dado não é decisão de um laço de envio.
  update public.push_subscriptions set ativo = false
   where id in (select (x->>'id')::uuid from jsonb_array_elements(r) x where x->>'estado' = 'morta');
  select count(*) filter (where x->>'estado' = 'ok'), count(*) filter (where x->>'estado' = 'falhou'), count(*) filter (where x->>'estado' = 'morta')
    into n_ok, n_falhas, n_mortas from jsonb_array_elements(r) x;
  if n_falhas = 0 then update public.painel_versoes set push_concluido_em = now() where id = p_versao; end if;
  return jsonb_build_object('ok', n_ok, 'falhou', n_falhas, 'morta', n_mortas);
end $$;
revoke all on function public.push_versao_travar(text), public.push_versao_concluir(text, jsonb) from public, anon, authenticated;

-- ── O ciclo do pg_cron ──────────────────────────────────────────────────────
create or replace function public.painel_versao_ciclo()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare c record; d jsonb; v_id text;
begin
  -- 1. As respostas das consultas anteriores (pg_net responde depois).
  for c in select k.pedido, r.status_code, r.content
             from public.painel_versao_checagens k join net._http_response r on r.id = k.pedido
            where k.lida_em is null loop
    update public.painel_versao_checagens set lida_em = now(), status = c.status_code where pedido = c.pedido;
    continue when c.status_code is distinct from 200;
    begin d := c.content::jsonb; exception when others then continue; end; -- HTML de erro, página inesperada
    v_id := d->>'id';
    continue when d->>'app' is distinct from 'painel-scw' or v_id is null or v_id !~ '^[0-9a-f]{12,64}$'
               or d->>'ambiente' is distinct from 'production';
    insert into public.painel_versoes (id, publicado_em, commit, novidades)
    values (v_id, case when d->>'publicado_em' ~ '^\d{4}-\d\d-\d\dT' then (d->>'publicado_em')::timestamptz end,
            left(d->>'commit', 40), left(d->>'novidades', 160))
    on conflict (id) do update set vista_em = now(); -- já conhecida (rollback, mesma versão): não avisa de novo
  end loop;
  update public.painel_versao_checagens set lida_em = now() where lida_em is null and pedido_em < now() - interval '1 hour';
  -- 2. Push das versões novas; falha tenta de novo (até 3 vezes, no primeiro dia).
  for c in select id from public.painel_versoes
            where push_concluido_em is null and push_tentativas < 3 and detectada_em > now() - interval '1 day'
              and (push_iniciado_em is null or push_iniciado_em < now() - interval '10 minutes') loop
    begin
      perform net.http_post(
        url := 'https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/enviar-push',
        body := jsonb_build_object('versao_id', c.id),
        headers := jsonb_build_object('Content-Type', 'application/json'));
    exception when others then null; -- tenta no próximo ciclo
    end;
  end loop;
  -- 3. Nova consulta ao arquivo publicado (o `t` fura cache intermediário).
  insert into public.painel_versao_checagens (pedido)
  values (net.http_get(url := 'https://www.sweetcoffeeweek.com.br/painel/versao.json?t=' || floor(extract(epoch from now()))::bigint,
                       headers := jsonb_build_object('Accept', 'application/json', 'Cache-Control', 'no-cache')));
end $$;
revoke all on function public.painel_versao_ciclo() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'scw-painel-versao';
select cron.schedule('scw-painel-versao', '*/10 * * * *', 'select public.painel_versao_ciclo()');
