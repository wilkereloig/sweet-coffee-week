-- ─────────────────────────────────────────────────────────────────────────────
-- Push: entrega registrada por aviso e aparelho + reenvio controlado
-- (19/10/2026). SÓ ACRESCENTA. Depende de nada além do que já existe.
--
-- Antes: a enviar-push mandava e CONTAVA (enviados / falharam / removidos) na
-- resposta, e a notificação ficava marcada como enviada mesmo que um aparelho
-- tivesse falhado — falha passageira (5xx do serviço de push) era perdida em
-- silêncio. Agora:
--   · cada (aviso, aparelho) tem um estado: ok · falhou · morta;
--     "ok" quer dizer "o serviço de push ACEITOU" — não prova que apareceu na tela;
--   · 'falhou' é tentado de novo, no máximo 3 vezes no total, espaçado 5 min,
--     só nas últimas 3 h e só enquanto o aviso AINDA não foi lido (quem já leu
--     o aviso não precisa de push);
--   · 'morta' (404/410: desinstalou ou revogou) desativa a inscrição — não apaga;
--   · aviso interno NUNCA depende disto: ele existe antes do push e continua
--     existindo quando o push falha.
-- Sem esta migration a enviar-push segue como era (o registro é opcional).
-- Reversão: supabase/reverter/20261022_sincronizacao_tempo_real.sql (mesmo arquivo).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.push_envios (
  notificacao_id uuid not null references public.notificacoes(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  estado text not null check (estado in ('ok', 'falhou', 'morta')),
  tentativas int not null default 1,
  em timestamptz not null default now(),
  primary key (notificacao_id, subscription_id)
);
create index if not exists push_envios_pendentes on public.push_envios (em) where estado = 'falhou';
alter table public.push_envios enable row level security;
revoke all on public.push_envios from public, anon, authenticated;

-- Quem registra é a enviar-push, com a chave de serviço.
create or replace function public.push_envio_registrar(p_notificacao uuid, p_resultados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb := coalesce(p_resultados, '[]'::jsonb); n_ok int; n_falhou int; n_morta int;
begin
  insert into public.push_envios (notificacao_id, subscription_id, estado)
  select p_notificacao, (x->>'id')::uuid, x->>'estado' from jsonb_array_elements(r) x
   where x->>'estado' in ('ok', 'falhou', 'morta')
     and exists (select 1 from public.push_subscriptions s where s.id = (x->>'id')::uuid)
  on conflict (notificacao_id, subscription_id) do update
    set estado = excluded.estado, tentativas = public.push_envios.tentativas + 1, em = now();
  update public.push_subscriptions set ativo = false
   where id in (select (x->>'id')::uuid from jsonb_array_elements(r) x where x->>'estado' = 'morta');
  select count(*) filter (where x->>'estado' = 'ok'), count(*) filter (where x->>'estado' = 'falhou'), count(*) filter (where x->>'estado' = 'morta')
    into n_ok, n_falhou, n_morta from jsonb_array_elements(r) x;
  return jsonb_build_object('ok', n_ok, 'falhou', n_falhou, 'morta', n_morta);
end $$;

-- O que ainda vale tentar de novo.
create or replace function public.push_envio_pendentes(p_limite int default 50)
returns table (notificacao_id uuid, subscription_id uuid, endpoint text, p256dh text, auth_chave text,
               tipo text, titulo text, texto text, link text)
language sql stable security definer set search_path = public as $$
  select e.notificacao_id, s.id, s.endpoint, s.p256dh, s.auth_chave, n.tipo, n.titulo, n.texto, n.link
    from public.push_envios e
    join public.push_subscriptions s on s.id = e.subscription_id and s.ativo
    join public.notificacoes n on n.id = e.notificacao_id
   where e.estado = 'falhou' and e.tentativas < 3
     and e.em < now() - interval '5 minutes'
     and n.criada_em > now() - interval '3 hours'
     and n.lida_em is null
     and not exists (select 1 from public.notificacao_leitura l
                      where l.notificacao_id = n.id and s.user_id is not null and l.leitor = s.user_id::text)
   order by e.em
   limit least(greatest(coalesce(p_limite, 50), 1), 200)
$$;
revoke all on function public.push_envio_registrar(uuid, jsonb), public.push_envio_pendentes(int) from public, anon, authenticated;

-- A cada 5 min: só chama a função se houver o que reenviar. (Retenção: a tabela cresce
-- ~ avisos × aparelhos por dia — dezenas de linhas; limpeza só será preciso muito adiante.)
create or replace function public.push_reenviar_ciclo()
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if exists (select 1 from public.push_envio_pendentes(1)) then
    begin
      perform net.http_post(
        url := 'https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/enviar-push',
        body := jsonb_build_object('reenviar', true),
        headers := jsonb_build_object('Content-Type', 'application/json'));
    exception when others then null; -- tenta no próximo ciclo
    end;
  end if;
end $$;
revoke all on function public.push_reenviar_ciclo() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'scw-push-reenviar') then
    perform cron.schedule('scw-push-reenviar', '*/5 * * * *', 'select public.push_reenviar_ciclo()');
  end if;
end $$;
