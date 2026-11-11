-- Reverte 20270124_caca_disputa_avisos.sql: volta as funções às definições de antes (copiadas do banco em 10/11/2026) e tira a disputa.
-- ATENÇÃO: os avisos da categoria 'disputa' (e as entregas deles, em cascata) são APAGADOS, porque a constraint antiga não os aceita.
-- Antes de rodar, desligue o interruptor no painel e confira quantos são:
--   select count(*) from public.caca_aviso where categoria = 'disputa';

begin;

-- ciclo sem a disputa
create or replace function public.caca_avisos_ciclo()
returns void language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare v_erros jsonb := '{}'::jsonb; v_pend int; v_push text := 'nada_a_enviar';
begin
  begin perform public.caca_avisos_gerar_automaticos(); exception when others then v_erros := v_erros || jsonb_build_object('automaticos', sqlerrm); end;
  begin perform public.caca_avisos_gerar_premios(); exception when others then v_erros := v_erros || jsonb_build_object('premios', sqlerrm); end;
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
  values ('avisos_ciclo_estado', jsonb_build_object('em', now(), 'avisos_com_push_pendente', v_pend, 'push', v_push, 'erros', v_erros),
          'Último ciclo do agendador dos avisos (só leitura: o ciclo grava aqui).', now(), 'agendador')
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = 'agendador';
end $function$;

-- programação como era (sem posição, sem retomada)
create or replace function public.caca_programacao_gerar(p_agora timestamp with time zone default now())
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_auto jsonb; v_cfg jsonb; v_ed text; v_ini date; v_fim date; v_loc timestamp; v_dia date; v_h int; v_hora int; v_jan int;
  v_tipo text; v_idx int; v_total int; v_cfgm jsonb; v_corte text; v_fecha timestamp; v_ate timestamptz; v_vdias jsonb;
  r record; t record; m record; v_id uuid; v_avisos int := 0; v_alvos int := 0; v_cat text;
begin
  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  if coalesce((v_auto ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'ligado', false); end if;
  v_cfg := '{"ligada":true,"hora":10,"janela_horas":4}'::jsonb
        || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'programacao'), '{}'::jsonb);
  if coalesce((v_cfg ->> 'ligada')::boolean, true) is not true then return jsonb_build_object('ok', true, 'programacao', false); end if;

  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  if v_ed is null then return jsonb_build_object('ok', true, 'sem_edicao', true); end if;
  select festival_inicio, festival_fim into v_ini, v_fim from public.edicoes where codigo = v_ed;
  if v_ini is null or v_fim is null then return jsonb_build_object('ok', true, 'sem_datas', true); end if;

  v_loc := p_agora at time zone 'America/Fortaleza'; v_dia := v_loc::date; v_h := extract(hour from v_loc)::int;
  v_hora := least(greatest((v_cfg ->> 'hora')::int, 8), 20); v_jan := least(greatest((v_cfg ->> 'janela_horas')::int, 1), 8);
  if v_dia < v_ini or v_dia > v_fim then return jsonb_build_object('ok', true, 'fora_do_festival', true, 'dia', v_dia); end if;
  if v_h < v_hora or v_h >= v_hora + v_jan then return jsonb_build_object('ok', true, 'fora_do_horario', true, 'dia', v_dia); end if;

  v_vdias := coalesce((select valor from public.caca_premiacao_config where chave = 'voucher_dias'), '[]'::jsonb);
  v_tipo := case when v_dia = v_fim then 'ultimo'
                 when v_dia = v_fim - 1 then 'penultimo'
                 when v_vdias ? v_dia::text then 'voucher'
                 else 'incentivo' end;
  v_idx := v_dia - v_ini;
  v_ate := ((v_dia + 1)::timestamp at time zone 'America/Fortaleza');
  v_total := public.caca_total_casas(v_ed);
  select valor into v_cfgm from public.caca_config where chave = 'metas';
  v_corte := coalesce((select valor #>> '{}' from public.caca_premiacao_config where chave = 'corte_hora_local'), '23:59');
  v_corte := replace(v_corte, ':', 'h');
  select (avaliacao_fecha_em at time zone 'America/Fortaleza') into v_fecha from public.edicao_publicacao where edicao_codigo = v_ed;
  if v_fecha is not null and v_fecha::date <> v_dia then v_fecha := null; end if;

  for r in
    select case when v_tipo = 'voucher' and g.ganhou then 'incentivo' else v_tipo end tipo, g.n, jsonb_agg(to_jsonb(g.mapa)) ids, count(*)::int qtd
      from (select m2.id mapa, coalesce(rk.casas, 0) n,
                   exists (select 1 from public.caca_premio p where p.edicao_codigo = v_ed and p.tipo = 'voucher_dia' and p.pessoa = m2.email_norm
                              and p.estado in ('selecionado', 'confirmado', 'entregue')) ganhou
              from public.mapas_lover m2
              left join public.caca_ranking_v2(v_ed) rk on rk.pessoa = m2.email_norm
             where m2.edicao_codigo = v_ed and m2.id = public.caca_mapa_principal(v_ed, m2.email_norm)
               and not exists (select 1 from public.caca_aviso_entrega e2 join public.caca_aviso a2 on a2.id = e2.aviso_id
                                where e2.mapa_id = m2.id and a2.chave_dedupe like 'prog:' || v_dia || ':%')) g
     where g.n < v_total
     group by 1, 2
  loop
    select x.casas, x.titulo into m from public.caca_metas_resolver(v_cfgm, v_total) x where x.casas > r.n order by x.casas limit 1;
    select * into t from public.caca_programacao_texto(r.tipo, v_idx, r.n, case when m.casas is not null then m.casas - r.n end, m.titulo, v_total,
                                                        v_corte, case when r.tipo = 'ultimo' and v_fecha is not null then to_char(v_fecha, 'HH24"h"MI') end);
    v_cat := case when r.tipo = 'voucher' then 'voucher' else 'incentivo' end;
    insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, vigente_ate, estado, origem, chave_dedupe,
                                   criado_por, enviado_em, enviado_por, alvos)
    values (v_ed, v_cat, left(t.titulo, 80), left(t.corpo, 240), case when r.tipo = 'voucher' then '/cartoon/mapa?painel=premios' else '/cartoon/caca/mapa' end,
            jsonb_build_object('tipo', 'mapas', 'ids', r.ids), v_ate, 'enviado', 'automatico',
            'prog:' || v_dia || ':' || r.tipo || ':' || r.n, 'programacao', p_agora, 'programacao', r.qtd)
    on conflict (chave_dedupe) do nothing returning id into v_id;
    if v_id is not null then
      v_avisos := v_avisos + 1;
    else
      select a3.id into v_id from public.caca_aviso a3 where a3.chave_dedupe = 'prog:' || v_dia || ':' || r.tipo || ':' || r.n;
      update public.caca_aviso set alvos = alvos + r.qtd where id = v_id;
    end if;
    insert into public.caca_aviso_entrega (aviso_id, mapa_id)
    select v_id, (j #>> '{}')::uuid from jsonb_array_elements(r.ids) j on conflict do nothing;
    v_alvos := v_alvos + r.qtd;
    v_id := null;
  end loop;
  return jsonb_build_object('ok', true, 'dia', v_dia, 'tipo', v_tipo, 'avisos', v_avisos, 'pessoas', v_alvos);
end $function$;

drop function public.caca_programacao_texto(text, integer, integer, integer, text, integer, text, text, integer);
create function public.caca_programacao_texto(p_tipo text, p_idx integer, p_n integer, p_falta integer, p_meta text, p_total integer,
                                              p_corte text default '23:59'::text, p_fecha text default null::text)
returns table(titulo text, corpo text) language plpgsql immutable set search_path to 'public' as $function$
declare v_i int := greatest(coalesce(p_idx, 0), 0) % 4; v_casas text := case when p_n = 1 then '1 casa' else p_n || ' casas' end;
  v_prog text := '';
begin
  if coalesce(p_n, 0) > 0 then
    v_prog := ' Você já validou ' || v_casas || '.' || case when p_falta is not null and p_meta is not null
      then ' Faltam ' || p_falta || ' para a meta “' || p_meta || '”.' else '' end;
  end if;

  if p_tipo = 'ultimo' then
    return query select 'Último dia do festival'::text,
      ('Hoje é a última chance de experimentar os combos e avançar na Caça. Cada casa tem o seu horário: confira antes de sair.' || v_prog ||
       case when p_fecha is not null then ' A avaliação, que faz o carimbo valer, fecha às ' || p_fecha || '.' else '' end)::text;
  elsif p_tipo = 'penultimo' then
    return query select 'Penúltimo dia do festival'::text,
      ('O Sweet & Coffee Week termina amanhã. Ainda dá tempo de experimentar combos e avançar na Caça; confira o horário da casa antes de ir.' || v_prog)::text;
  elsif p_tipo = 'voucher' then
    return query select 'Hoje tem voucher em disputa'::text,
      ('Quem tiver ao menos 1 casa validada até as ' || p_corte || ' concorre à seleção do voucher do dia. O resultado só sai depois da apuração.' ||
       case when coalesce(p_n, 0) = 0 then ' Valide uma casa hoje para entrar.' else v_prog end)::text;
  elsif coalesce(p_n, 0) = 0 then
    return query select t.a, t.b from (values
      (0, 'Bora começar a Caça?', 'Hoje é um novo dia para experimentar um combo no Sweet & Coffee Week. Escolha uma casa e comece o seu mapa.'),
      (1, 'Qual combo vai ser o primeiro?', 'O mapa está aberto para você descobrir casas diferentes. Veja as casas e escolha por onde começar.'),
      (2, 'Um combo, um carimbo', 'Experimente um combo e valide o carimbo da casa. Cada casa diferente conta para a sua Caça.'),
      (3, 'Tem casa nova te esperando', 'Veja no mapa o que fica perto de você e confira os horários antes de sair.')
    ) as t(i, a, b) where t.i = v_i;
  else
    return query select t.a, (t.b || case when p_falta is not null and p_meta is not null
        then ' Faltam ' || p_falta || ' para a meta “' || p_meta || '”.' else '' end)::text from (values
      (0, 'Sua Caça continua', 'Você já validou ' || v_casas || '. Escolha a próxima casa.'),
      (1, 'Mais um combo?', v_casas || ' validadas até agora. Confira o mapa e escolha a próxima.'),
      (2, 'Hoje tem caça', 'Você tem ' || v_casas || ' no mapa. Que tal uma casa nova hoje?'),
      (3, 'Seguimos no mapa', 'Já são ' || v_casas || ' validadas. Veja as casas que ainda faltam.')
    ) as t(i, a, b) where t.i = v_i;
  end if;
end $function$;
revoke all on function public.caca_programacao_texto(text, integer, integer, integer, text, integer, text, text) from public, anon, authenticated;

-- push como era
create or replace function public.caca_avisos_para_processar()
returns uuid[] language sql stable security definer set search_path to 'public' as $function$
  select coalesce(array_agg(x.id order by x.pri, x.t), '{}'::uuid[]) from (
    select a.id,
           case a.categoria when 'imprevisto' then 0 when 'premio' then 1 when 'avaliacao_pendente' then 2 when 'meta' then 3 when 'grupo' then 4 else 5 end pri,
           coalesce(a.enviado_em, a.criado_em) t
      from public.caca_aviso a
     where a.estado = 'enviado' and (a.vigente_ate is null or a.vigente_ate > now()) and coalesce(a.enviado_em, a.criado_em) > now() - interval '48 hours'
       and exists (select 1 from public.caca_aviso_entrega e where e.aviso_id = a.id and (e.push_estado is null or e.push_estado = 'adiado'))
     order by pri, t limit 12) x
$function$;

create or replace function public.caca_aviso_entregas_pendentes(p_aviso uuid, p_max integer default 500)
returns table(mapa_id uuid, push_id uuid, endpoint text, p256dh text, auth_chave text)
language plpgsql security definer set search_path to 'public' as $function$
declare a public.caca_aviso%rowtype; lim jsonb := public.caca_avisos_limites(); v_agora timestamp; v_h int; v_dia date;
  v_dentro boolean; r record; v_bloq boolean; v_int int := coalesce((public.caca_avisos_limites() ->> 'incentivo_intervalo_dias')::int, 2);
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
                      and (x.push_em at time zone 'America/Fortaleza')::date = v_dia) >= (lim ->> 'lembretes_dia')::int
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
                   from public.caca_push c where c.mapa_id = r.mid and c.ativo and coalesce((c.prefs ->> a.categoria)::boolean, false);
  end loop;
end $function$;

create or replace function public.caca_push_prefs_norm(p jsonb)
returns jsonb language sql immutable set search_path to 'public' as $function$
  select coalesce(jsonb_object_agg(k, p -> k), '{}'::jsonb)
    from unnest(array['avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio', 'campanha']) k
   where jsonb_typeof(p -> k) = 'boolean'
$function$;

drop function if exists public.caca_disputa_aviso_definir(text, boolean);
drop function if exists public.caca_disputa_aviso_estado(text);
drop function if exists public.caca_disputa_gerar(timestamptz);
drop function if exists public.caca_disputa_texto(text, int, text, int, int, text, text);
drop function if exists public.caca_disputa_foto(text, date);
drop table if exists public.caca_disputa_estado;
delete from public.caca_config where chave = 'disputa_aviso';

delete from public.caca_aviso where categoria = 'disputa';
alter table public.caca_aviso drop constraint caca_aviso_categoria_check;
alter table public.caca_aviso add constraint caca_aviso_categoria_check check (categoria = any (array[
  'avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio', 'campanha']));

commit;
