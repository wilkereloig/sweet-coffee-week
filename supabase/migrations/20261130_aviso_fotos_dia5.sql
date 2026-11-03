-- 03/11/2026 (Wilker: "coloque todas as fotos aprovadas… não notifique agora, deixe lá; notifique no dia 5").
-- As pastas de fotos entram no painel das marcas SEM aviso (publicadas por UPDATE; ver 20261129) e o aviso sai UMA vez, em
-- 05/11/2026 às 09:00 (Natal = 12:00 UTC), por pg_cron. A função só avisa marcas que tenham uma pasta publicada (arquivo com link,
-- categoria "combo") e que ainda não receberam este aviso; depois do dia 5 desagenda o próprio job.
-- Reversão: select cron.unschedule('scw-aviso-fotos-dia5'); drop function public.avisar_fotos_do_combo(boolean);
create or replace function public.avisar_fotos_do_combo(p_forcar boolean default false)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare r record; n int := 0;
  v_titulo constant text := 'Suas fotos do combo já estão no painel';
begin
  if not p_forcar and (now() at time zone 'America/Fortaleza') < timestamp '2026-11-05 09:00' then return 0; end if;
  for r in select distinct pa.participante_id
             from public.arquivos a join public.participacoes pa on pa.id = a.participacao_id
            where a.categoria = 'combo' and a.url_externa is not null and a.publicado_em is not null and not a.arquivado
              and pa.edicao_codigo = public.edicao_atual()
              and not exists (select 1 from public.notificacoes x where x.participante_id = pa.participante_id and x.titulo = v_titulo) loop
    perform public.notificar('marca', r.participante_id, 'fotos', v_titulo,
      'Abra "Fotos oficiais" para ver e baixar as fotos aprovadas do seu combo.', 'cadastro/fotos');
    n := n + 1;
  end loop;
  if not p_forcar and (now() at time zone 'America/Fortaleza') >= timestamp '2026-11-05 09:00' then
    begin perform cron.unschedule('scw-aviso-fotos-dia5'); exception when others then null; end;
  end if;
  return n;
end $function$;
revoke all on function public.avisar_fotos_do_combo(boolean) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'scw-aviso-fotos-dia5') then perform cron.unschedule('scw-aviso-fotos-dia5'); end if;
  perform cron.schedule('scw-aviso-fotos-dia5', '0 12 5 11 *', 'select public.avisar_fotos_do_combo()');
end $$;
