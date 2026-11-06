-- Agendador dos avisos da Caça (a cada 15 min): gera os avisos automáticos (SE ligados) e manda a edge processar o push pendente.
-- O interruptor `caca_config.avisos_auto` continua DESLIGADO: agendar não liga nada. Ligar é ação do painel (caca_avisos_auto_definir),
-- e passa a gravar `desde`: só vale o que acontecer DEPOIS de ligar (sem despejar o histórico na central de ninguém).
-- reverter: select cron.unschedule('scw-caca-avisos'); drop function if exists public.caca_avisos_ciclo(), public.caca_avisos_para_processar(),
--   public.caca_avisos_auto_estado(text); -- e restaurar caca_avisos_gerar_automaticos / caca_avisos_auto_definir de 20261230_caca_avisos.sql

-- 1. ligar grava o instante: automáticos só a partir dele
create or replace function public.caca_avisos_auto_definir(p_secret text, p_ligado boolean)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_antes jsonb; v_novo jsonb;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  select valor into v_antes from public.caca_config where chave = 'avisos_auto';
  v_novo := case when coalesce(p_ligado, false) and coalesce((v_antes ->> 'ligado')::boolean, false)
                 then v_antes
                 when coalesce(p_ligado, false) then jsonb_build_object('ligado', true, 'desde', now())
                 else jsonb_build_object('ligado', false) end;
  insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
  values ('avisos_auto', v_novo, 'Avisos automáticos da Caça (meta, avaliação pendente). Valem só depois de ligar.', now(), coalesce(public.ator_rotulo_atual(), 'Painel'))
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  perform public.caca_evento_gravar(null, null, 'avisos_auto', jsonb_build_object('antes', v_antes), v_novo, null);
  return jsonb_build_object('ok', true, 'ligado', coalesce((v_novo ->> 'ligado')::boolean, false), 'desde', v_novo ->> 'desde');
end $$;

create or replace function public.caca_avisos_auto_estado(p_secret text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v jsonb;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  select valor into v from public.caca_config where chave = 'avisos_auto';
  return jsonb_build_object('ligado', coalesce((v ->> 'ligado')::boolean, false), 'desde', v ->> 'desde',
    'agendado', exists (select 1 from cron.job where jobname = 'scw-caca-avisos' and active));
end $$;
revoke all on function public.caca_avisos_auto_definir(text, boolean) from public, anon, authenticated;
revoke all on function public.caca_avisos_auto_estado(text) from public, anon, authenticated;
grant execute on function public.caca_avisos_auto_definir(text, boolean) to anon, authenticated;
grant execute on function public.caca_avisos_auto_estado(text) to anon, authenticated;

-- 2. o gerador respeita `desde`
create or replace function public.caca_avisos_gerar_automaticos(p_agora timestamptz default now())
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_ed text; v_cfg jsonb; v_meta int := 0; v_pend int := 0; r record; v_id uuid; v_total int; v_cfgm jsonb; v_desde timestamptz;
begin
  select valor into v_cfg from public.caca_config where chave = 'avisos_auto';
  if coalesce((v_cfg ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'ligado', false); end if;
  v_desde := coalesce((v_cfg ->> 'desde')::timestamptz, p_agora);
  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  if v_ed is null then return jsonb_build_object('ok', true, 'ligado', true, 'sem_edicao', true); end if;
  v_total := public.caca_total_casas(v_ed);
  select valor into v_cfgm from public.caca_config where chave = 'metas';

  -- meta: alcançada agora e NÃO alcançada no instante em que se ligou
  for r in select m.id mapa, x.casas, x.titulo
             from public.mapas_lover m
             join public.caca_ranking_v2(v_ed) rk on rk.pessoa = m.email_norm
             left join public.caca_ranking_v2(v_ed, v_desde) r0 on r0.pessoa = m.email_norm
             cross join lateral public.caca_metas_resolver(v_cfgm, v_total) x
            where m.edicao_codigo = v_ed and m.id = public.caca_mapa_principal(v_ed, m.email_norm)
              and rk.casas >= x.casas and coalesce(r0.casas, 0) < x.casas
  loop
    insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, estado, origem, chave_dedupe, criado_por, enviado_em, enviado_por, alvos)
    values (v_ed, 'meta', 'Meta alcançada', r.titulo || ': você já validou ' || r.casas || (case when r.casas = 1 then ' casa.' else ' casas.' end),
            '/cartoon/caca/metas', jsonb_build_object('tipo', 'mapas', 'ids', jsonb_build_array(r.mapa)), 'enviado', 'automatico',
            'meta:' || r.mapa || ':' || r.casas, 'automatico', p_agora, 'automatico', 1)
    on conflict (chave_dedupe) do nothing returning id into v_id;
    if v_id is not null then insert into public.caca_aviso_entrega (aviso_id, mapa_id) values (v_id, r.mapa) on conflict do nothing; v_meta := v_meta + 1; end if;
    v_id := null;
  end loop;

  -- avaliação pendente: liberada (último carimbo + 12 h) DEPOIS de ligar, ainda pendente agora, 1 h de folga
  for r in select m.id mapa, k.participacao_id, max(k.criado_em) ultimo
             from public.mapas_lover m
             join public.carimbos k on k.mapa_id = m.id and k.anulado_em is null
            where m.edicao_codigo = v_ed
              and not exists (select 1 from public.avaliacoes a where a.edicao_codigo = v_ed and a.participacao_id = k.participacao_id and a.email_norm = m.email_norm)
            group by m.id, k.participacao_id
           having max(k.criado_em) + interval '13 hours' <= p_agora and max(k.criado_em) + interval '12 hours' >= v_desde
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

-- 3. quais avisos têm push a processar (a edge chama; só service_role)
create or replace function public.caca_avisos_para_processar()
 returns uuid[] language sql stable security definer set search_path to 'public'
as $$
  select coalesce(array_agg(x.id), '{}'::uuid[]) from (
    select a.id from public.caca_aviso a
     where a.estado = 'enviado' and (a.vigente_ate is null or a.vigente_ate > now()) and coalesce(a.enviado_em, a.criado_em) > now() - interval '48 hours'
       and exists (select 1 from public.caca_aviso_entrega e where e.aviso_id = a.id and (e.push_estado is null or e.push_estado = 'adiado'))
     order by coalesce(a.enviado_em, a.criado_em) limit 5) x
$$;
revoke all on function public.caca_avisos_para_processar() from public, anon, authenticated;

-- 4. ciclo: gera (se ligado) e, havendo push pendente, avisa a edge (mesmo padrão do push_reenviar_ciclo: sem credencial, sem escolha)
create or replace function public.caca_avisos_ciclo()
 returns void language plpgsql security definer set search_path to 'public', 'extensions'
as $$
begin
  begin perform public.caca_avisos_gerar_automaticos(); exception when others then null; end;
  if cardinality(public.caca_avisos_para_processar()) > 0 then
    begin
      perform net.http_post(url := 'https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/caca-push',
        body := jsonb_build_object('ciclo', true), headers := jsonb_build_object('Content-Type', 'application/json'));
    exception when others then null;
    end;
  end if;
end $$;
revoke all on function public.caca_avisos_ciclo() from public, anon, authenticated;

select cron.schedule('scw-caca-avisos', '*/15 * * * *', 'select public.caca_avisos_ciclo()')
 where not exists (select 1 from cron.job where jobname = 'scw-caca-avisos');
