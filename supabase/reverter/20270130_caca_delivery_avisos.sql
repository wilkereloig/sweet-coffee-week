-- Reverte 20270130_caca_delivery_avisos.sql: volta o ciclo, o push e as preferências às definições de 20270124 e tira o delivery.
-- ATENÇÃO: os avisos da categoria 'delivery' (e as entregas deles, em cascata) são APAGADOS, porque a constraint antiga não os aceita.
-- Antes de rodar, desligue o interruptor no painel e confira quantos são:
--   select count(*) from public.caca_aviso where categoria = 'delivery';

begin;

-- ---------------------------------------------------------------- o ciclo chama a disputa ANTES da programação
create or replace function public.caca_avisos_ciclo()
returns void language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare v_erros jsonb := '{}'::jsonb; v_pend int; v_push text := 'nada_a_enviar'; v_disp jsonb;
begin
  begin perform public.caca_avisos_gerar_automaticos(); exception when others then v_erros := v_erros || jsonb_build_object('automaticos', sqlerrm); end;
  begin perform public.caca_avisos_gerar_premios(); exception when others then v_erros := v_erros || jsonb_build_object('premios', sqlerrm); end;
  begin
    v_disp := public.caca_disputa_gerar();
    if v_disp ? 'excedeu' then v_erros := v_erros || jsonb_build_object('disputa', 'excedeu ' || (v_disp ->> 'excedeu') || ' avisos (máximo ' || (v_disp ->> 'max') || ')'); end if;
  exception when others then v_erros := v_erros || jsonb_build_object('disputa', sqlerrm); end;
  begin perform public.caca_programacao_gerar(); exception when others then v_erros := v_erros || jsonb_build_object('programacao', sqlerrm); end;
  begin perform public.caca_campanha_gerar(); exception when others then v_erros := v_erros || jsonb_build_object('campanha', sqlerrm); end;
  begin perform public.caca_voucher_aviso_gerar(); exception when others then v_erros := v_erros || jsonb_build_object('voucher_aviso', sqlerrm); end;
  v_pend := cardinality(public.caca_avisos_para_processar());
  if v_pend > 0 then
    begin
      perform net.http_post(url := 'https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/caca-push',
        body := jsonb_build_object('ciclo', true), headers := jsonb_build_object('Content-Type', 'application/json'));
      v_push := 'pedido_enviado';
    exception when others then v_erros := v_erros || jsonb_build_object('push', sqlerrm); v_push := 'falhou';
    end;
  end if;
  insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
  values ('avisos_ciclo_estado', jsonb_build_object('em', now(), 'avisos_com_push_pendente', v_pend, 'push', v_push, 'erros', v_erros, 'disputa', v_disp),
          'Último ciclo do agendador dos avisos (só leitura: o ciclo grava aqui).', now(), 'agendador')
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = 'agendador';
end $function$;

create or replace function public.caca_aviso_entregas_pendentes(p_aviso uuid, p_max integer default 500)
returns table(mapa_id uuid, push_id uuid, endpoint text, p256dh text, auth_chave text)
language plpgsql security definer set search_path to 'public' as $function$
declare a public.caca_aviso%rowtype; lim jsonb := public.caca_avisos_limites(); v_agora timestamp; v_h int; v_dia date;
  v_dentro boolean; r record; v_bloq boolean; v_int int := coalesce((public.caca_avisos_limites() ->> 'incentivo_intervalo_dias')::int, 2);
  v_padrao boolean;
begin
  select * into a from public.caca_aviso where id = p_aviso;
  if a.id is null or a.estado <> 'enviado' or (a.vigente_ate is not null and a.vigente_ate <= now()) then return; end if;
  v_agora := now() at time zone 'America/Fortaleza'; v_h := extract(hour from v_agora)::int; v_dia := v_agora::date;
  v_dentro := v_h >= (lim ->> 'janela_de')::int and v_h < (lim ->> 'janela_ate')::int;
  v_padrao := a.categoria = 'disputa'; -- a disputa vem ligada: quem nunca escolheu recebe

  for r in select e.mapa_id as mid from public.caca_aviso_entrega e
            where e.aviso_id = a.id and (e.push_estado is null or e.push_estado = 'adiado') order by e.criado_em limit p_max
  loop
    if not exists (select 1 from public.caca_push c where c.mapa_id = r.mid and c.ativo) then
      update public.caca_aviso_entrega set push_estado = 'sem_aparelho', push_em = now() where aviso_id = a.id and caca_aviso_entrega.mapa_id = r.mid;
      continue;
    end if;
    if not exists (select 1 from public.caca_push c where c.mapa_id = r.mid and c.ativo and coalesce((c.prefs ->> a.categoria)::boolean, v_padrao)) then
      update public.caca_aviso_entrega set push_estado = 'preferencia', push_em = now() where aviso_id = a.id and caca_aviso_entrega.mapa_id = r.mid;
      continue;
    end if;
    if not a.urgente then
      if not v_dentro then
        update public.caca_aviso_entrega set push_estado = 'adiado', push_em = now() where aviso_id = a.id and caca_aviso_entrega.mapa_id = r.mid;
        continue;
      end if;
      if a.categoria = 'incentivo' then
        v_bloq := exists (select 1 from public.caca_aviso_entrega x
                           where x.mapa_id = r.mid and x.push_estado = 'enviado' and (x.push_em at time zone 'America/Fortaleza')::date = v_dia)
               or (coalesce(a.chave_dedupe, '') !~ ':(penultimo|ultimo):'
                   and exists (select 1 from public.caca_aviso_entrega x join public.caca_aviso y on y.id = x.aviso_id
                                where x.mapa_id = r.mid and x.push_estado = 'enviado' and y.categoria = 'incentivo'
                                  and (x.push_em at time zone 'America/Fortaleza')::date > v_dia - v_int));
      else
        v_bloq := (select count(*) from public.caca_aviso_entrega x join public.caca_aviso y on y.id = x.aviso_id
                    where x.mapa_id = r.mid and x.push_estado = 'enviado' and not y.urgente and y.categoria <> 'incentivo'
                      and (x.push_em at time zone 'America/Fortaleza')::date = v_dia)
                  -- disputa fica abaixo de prêmio e avaliação pendente: guarda a vaga do dia para as que ainda esperam push
                  + case when a.categoria = 'disputa' then (
                      select count(*) from public.caca_aviso_entrega x join public.caca_aviso y on y.id = x.aviso_id
                       where x.mapa_id = r.mid and (x.push_estado is null or x.push_estado = 'adiado') and y.estado = 'enviado'
                         and y.categoria in ('premio', 'avaliacao_pendente') and (y.vigente_ate is null or y.vigente_ate > now())
                         and (coalesce(y.enviado_em, y.criado_em) at time zone 'America/Fortaleza')::date = v_dia) else 0 end
                  >= (lim ->> 'lembretes_dia')::int
               or (a.categoria <> 'premio'
                   and (select count(*) from public.caca_aviso_entrega x join public.caca_aviso y on y.id = x.aviso_id
                    where x.mapa_id = r.mid and x.push_estado = 'enviado' and y.categoria = a.categoria and not y.urgente
                      and (x.push_em at time zone 'America/Fortaleza')::date = v_dia) >= (lim ->> 'por_categoria_dia')::int);
      end if;
      if v_bloq then
        update public.caca_aviso_entrega set push_estado = 'limite', push_em = now() where aviso_id = a.id and caca_aviso_entrega.mapa_id = r.mid;
        continue;
      end if;
    end if;
    return query select r.mid, c.id, c.endpoint, c.p256dh, c.auth_chave
                   from public.caca_push c where c.mapa_id = r.mid and c.ativo and coalesce((c.prefs ->> a.categoria)::boolean, v_padrao);
  end loop;
end $function$;

drop function if exists public.caca_delivery_aviso_estado(text);
drop function if exists public.caca_delivery_aviso_definir(text, boolean);
drop function if exists public.caca_delivery_gerar(timestamptz);
drop function if exists public.caca_delivery_casas(text);

delete from public.caca_aviso where categoria = 'delivery';
alter table public.caca_aviso drop constraint caca_aviso_categoria_check;
alter table public.caca_aviso add constraint caca_aviso_categoria_check check (categoria = any (array[
  'avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio', 'campanha', 'disputa']));

create or replace function public.caca_push_prefs_norm(p jsonb)
returns jsonb language sql immutable set search_path to 'public' as $function$
  select coalesce(jsonb_object_agg(k, p -> k), '{}'::jsonb)
    from unnest(array['avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio', 'campanha', 'disputa']) k
   where jsonb_typeof(p -> k) = 'boolean'
$function$;

delete from public.caca_config where chave = 'delivery_aviso';

commit;
