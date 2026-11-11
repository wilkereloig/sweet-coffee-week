-- Caça aos Carimbos: avisos de DELIVERY (pedido do Wilker, 11/11/2026: "notificações que estimulam a compra"). ADITIVA.
-- Nenhuma regra do jogo muda. Todo dado do texto vem do cadastro da casa (participacao_unidades): só entra casa com unidade que
-- participa, combo aprovado e delivery_combo = 'sim'; "entrega grátis" só quando TODAS as unidades com delivery dizem grátis em
-- delivery_taxa. O texto nunca promete carimbo: o pedido de delivery só abre uma solicitação (docs/cartoon-2026-2/16).
--
-- O que entra:
--   1. categoria 'delivery' em caca_aviso + preferência própria no push (LIGADA por padrão, como a disputa: quem não tem a chave recebe);
--   2. caca_delivery_gerar: uma vez por dia, na janela (17h–19h de Natal), cada pessoa com carimbo recebe UMA casa com delivery
--      que ainda falta no mapa dela. A casa é escolhida por pessoa (as 12 casas aparecem nos dias que restam, não uma por dia):
--      primeiro as que essa pessoa ainda não recebeu em aviso de delivery, depois um sorteio fixo do dia (md5 de mapa + dia).
--      Um aviso por casa por dia (chave delivery:<dia>:<slug>), entregas para as pessoas daquela casa. Destino: a ficha do combo
--      (/cartoon/combos/<slug>), onde ficam "Pedir delivery" e os canais da casa.
--      Trava: mais de `max_por_dia` (1000) pessoas = não gera nada e registra.
--   3. push: 'delivery' segue os limites de hoje (2 por dia, 1 por categoria, 8h–21h), na prioridade do incentivo (abaixo de tudo).
--   4. painel: caca_delivery_aviso_estado (casas, contagem por dia e casa) e caca_delivery_aviso_definir (interruptor).
-- Interruptor: caca_config 'delivery_aviso' {"ligado": false, "hora": 17, "janela_horas": 2, "max_por_dia": 1000}. Nasce DESLIGADO.
-- Reverter: supabase/reverter/20270130_caca_delivery_avisos.sql

-- ---------------------------------------------------------------- 1. categoria e preferência
alter table public.caca_aviso drop constraint caca_aviso_categoria_check;
alter table public.caca_aviso add constraint caca_aviso_categoria_check check (categoria = any (array[
  'avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio', 'campanha', 'disputa', 'delivery']));

create or replace function public.caca_push_prefs_norm(p jsonb)
returns jsonb language sql immutable set search_path to 'public' as $function$
  select coalesce(jsonb_object_agg(k, p -> k), '{}'::jsonb)
    from unnest(array['avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio', 'campanha', 'disputa', 'delivery']) k
   where jsonb_typeof(p -> k) = 'boolean'
$function$;

insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
values ('delivery_aviso', '{"ligado":false,"hora":17,"janela_horas":2,"max_por_dia":1000}'::jsonb,
        'Avisos de delivery da Caça (uma casa com delivery que falta no mapa, 1 por dia). Ligar pelo painel, em Caça › Avisos.', now(), 'migration')
on conflict (chave) do nothing;

-- ---------------------------------------------------------------- 2. as casas com delivery do combo (só dado do cadastro)
create or replace function public.caca_delivery_casas(p_ed text)
returns table(participacao_id uuid, slug text, nome text, gratis boolean)
language sql stable security definer set search_path to 'public' as $function$
  select pa.id, pa.slug_publico, p.nome_marca, bool_and(coalesce(u.delivery_taxa, '') ~* 'gr[aá]tis')
    from public.participacoes pa
    join public.participantes p on p.id = pa.participante_id
    join public.participacao_unidades u on u.participacao_id = pa.id and u.participa and u.delivery_combo = 'sim'
   where pa.edicao_codigo = p_ed and pa.combo_status = 'aprovado'
     and coalesce(pa.slug_publico, '') ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and coalesce(btrim(p.nome_marca), '') <> ''
   group by pa.id, pa.slug_publico, p.nome_marca
$function$;

-- ---------------------------------------------------------------- 3. gerador
create or replace function public.caca_delivery_gerar(p_agora timestamptz default now())
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_auto jsonb; v_cfg jsonb; v_lim jsonb; v_ed text; v_fuso text; v_loc timestamp; v_dia date; v_h int; v_ini date; v_fim date;
  v_hora int; v_jan int; v_max int; v_cand int; v_avisos int := 0; v_pessoas int := 0; v_casas jsonb := '{}'::jsonb;
  r record; v_id uuid; v_chave text;
begin
  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  if coalesce((v_auto ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'ligado', false); end if;
  v_cfg := '{"ligado":false,"hora":17,"janela_horas":2,"max_por_dia":1000}'::jsonb
        || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'delivery_aviso'), '{}'::jsonb);
  if coalesce((v_cfg ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'delivery', false); end if;
  v_max := greatest(coalesce((v_cfg ->> 'max_por_dia')::int, 1000), 1);

  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  if v_ed is null then return jsonb_build_object('ok', true, 'sem_edicao', true); end if;
  v_fuso := coalesce(public.caca_pcfg('fuso') #>> '{}', 'America/Fortaleza');
  v_loc := p_agora at time zone v_fuso; v_dia := v_loc::date; v_h := extract(hour from v_loc)::int;
  v_ini := (public.caca_pcfg('caca_inicio') #>> '{}')::date; v_fim := (public.caca_pcfg('caca_fim') #>> '{}')::date;
  if v_ini is null or v_fim is null or v_dia < v_ini or v_dia > v_fim then return jsonb_build_object('ok', true, 'fora_do_periodo', true, 'dia', v_dia); end if;
  v_lim := public.caca_avisos_limites();
  v_hora := greatest(coalesce((v_cfg ->> 'hora')::int, 17), (v_lim ->> 'janela_de')::int);
  v_jan := least(greatest(coalesce((v_cfg ->> 'janela_horas')::int, 2), 1), 6);
  if v_h < v_hora or v_h >= least(v_hora + v_jan, (v_lim ->> 'janela_ate')::int) then
    return jsonb_build_object('ok', true, 'fora_do_horario', true, 'dia', v_dia);
  end if;
  -- uma rodada por dia: se o dia já gerou, não gera de novo (quem entrou depois fica para amanhã)
  if exists (select 1 from public.caca_aviso a where a.chave_dedupe like 'delivery:' || v_dia || ':%') then
    return jsonb_build_object('ok', true, 'ja_gerado', true, 'dia', v_dia);
  end if;

  create temporary table if not exists _caca_dlv_casas (participacao_id uuid, slug text, nome text, gratis boolean) on commit drop;
  create temporary table if not exists _caca_dlv_cand (mapa_id uuid, slug text) on commit drop;
  truncate _caca_dlv_casas; truncate _caca_dlv_cand;
  insert into _caca_dlv_casas select * from public.caca_delivery_casas(v_ed);

  insert into _caca_dlv_cand (mapa_id, slug)
  select distinct on (m.id) m.id, c.slug
    from public.mapas_lover m
    cross join _caca_dlv_casas c
   where m.edicao_codigo = v_ed
     and exists (select 1 from public.carimbos k where k.mapa_id = m.id and k.anulado_em is null)
     and not exists (select 1 from public.carimbos k where k.mapa_id = m.id and k.participacao_id = c.participacao_id and k.anulado_em is null)
   order by m.id,
            exists (select 1 from public.caca_aviso_entrega e join public.caca_aviso a on a.id = e.aviso_id
                     where e.mapa_id = m.id and a.chave_dedupe like 'delivery:%:' || c.slug),
            md5(m.id::text || v_dia::text || c.slug);

  select count(*) into v_cand from _caca_dlv_cand;
  if v_cand > v_max then
    raise warning 'caca_delivery_gerar: % pessoas (máximo %); nada foi gerado', v_cand, v_max;
    return jsonb_build_object('ok', false, 'excedeu', v_cand, 'max', v_max, 'dia', v_dia);
  end if;

  for r in select c.slug, cs.nome, cs.gratis, jsonb_agg(to_jsonb(c.mapa_id)) ids, count(*)::int qtd
             from _caca_dlv_cand c join _caca_dlv_casas cs on cs.slug = c.slug group by 1, 2, 3 loop
    v_chave := 'delivery:' || v_dia || ':' || r.slug;
    insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, vigente_ate, estado, origem, chave_dedupe,
                                   criado_por, enviado_em, enviado_por, alvos)
    values (v_ed, 'delivery',
            left(case when r.gratis then r.nome || ': entrega grátis do combo' else r.nome || ' entrega o combo em casa' end, 80),
            left('Ainda falta essa casa no seu mapa. Peça o combo sem sair de casa e, quando receber, peça o carimbo do delivery na Caça.', 240),
            '/cartoon/combos/' || r.slug, jsonb_build_object('tipo', 'mapas', 'ids', r.ids),
            ((v_dia + 1)::timestamp at time zone v_fuso), 'enviado', 'automatico', v_chave, 'delivery', p_agora, 'delivery', r.qtd)
    on conflict (chave_dedupe) do nothing returning id into v_id;
    if v_id is not null then
      v_avisos := v_avisos + 1;
      insert into public.caca_aviso_entrega (aviso_id, mapa_id)
      select v_id, (j #>> '{}')::uuid from jsonb_array_elements(r.ids) j on conflict do nothing;
      v_pessoas := v_pessoas + r.qtd;
      v_casas := v_casas || jsonb_build_object(r.slug, r.qtd);
    end if;
    v_id := null;
  end loop;

  return jsonb_build_object('ok', true, 'dia', v_dia, 'avisos', v_avisos, 'pessoas', v_pessoas, 'por_casa', v_casas);
end $function$;

-- ---------------------------------------------------------------- 4. push: preferência ligada por padrão
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
  v_padrao := a.categoria in ('disputa', 'delivery'); -- disputa e delivery vêm ligadas: quem nunca escolheu recebe

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

-- ---------------------------------------------------------------- 5. o ciclo chama o delivery depois da campanha
create or replace function public.caca_avisos_ciclo()
returns void language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare v_erros jsonb := '{}'::jsonb; v_pend int; v_push text := 'nada_a_enviar'; v_disp jsonb; v_dlv jsonb;
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
  begin
    v_dlv := public.caca_delivery_gerar();
    if v_dlv ? 'excedeu' then v_erros := v_erros || jsonb_build_object('delivery', 'excedeu ' || (v_dlv ->> 'excedeu') || ' pessoas (máximo ' || (v_dlv ->> 'max') || ')'); end if;
  exception when others then v_erros := v_erros || jsonb_build_object('delivery', sqlerrm); end;
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
  values ('avisos_ciclo_estado', jsonb_build_object('em', now(), 'avisos_com_push_pendente', v_pend, 'push', v_push, 'erros', v_erros,
                                                    'disputa', v_disp, 'delivery', v_dlv),
          'Último ciclo do agendador dos avisos (só leitura: o ciclo grava aqui).', now(), 'agendador')
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = 'agendador';
end $function$;

-- ---------------------------------------------------------------- 6. painel
create or replace function public.caca_delivery_aviso_estado(p_secret text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_cfg jsonb; v_auto jsonb; v_ed text;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  v_cfg := '{"ligado":false,"hora":17,"janela_horas":2,"max_por_dia":1000}'::jsonb
        || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'delivery_aviso'), '{}'::jsonb);
  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  return jsonb_build_object(
    'ligado', coalesce((v_cfg ->> 'ligado')::boolean, false),
    'hora', (v_cfg ->> 'hora')::int,
    'janela_horas', (v_cfg ->> 'janela_horas')::int,
    'max_por_dia', (v_cfg ->> 'max_por_dia')::int,
    'avisos_auto', coalesce((v_auto ->> 'ligado')::boolean, false),
    'ultimo_ciclo', (select valor -> 'delivery' from public.caca_config where chave = 'avisos_ciclo_estado'),
    'erro', (select valor -> 'erros' ->> 'delivery' from public.caca_config where chave = 'avisos_ciclo_estado'),
    'aparelhos', (select count(distinct c.mapa_id)::int from public.caca_push c where c.ativo and coalesce((c.prefs ->> 'delivery')::boolean, true)),
    'casas', (select coalesce(jsonb_agg(jsonb_build_object('slug', c.slug, 'nome', c.nome, 'gratis', c.gratis) order by c.nome), '[]'::jsonb)
                from public.caca_delivery_casas(v_ed) c),
    'dias', (select coalesce(jsonb_agg(jsonb_build_object('dia', x.dia, 'casa', x.casa, 'geradas', x.geradas, 'enviadas', x.enviadas)
                                       order by x.dia desc, x.casa), '[]'::jsonb)
               from (select split_part(a.chave_dedupe, ':', 2) dia, split_part(a.chave_dedupe, ':', 3) casa,
                            count(e.mapa_id)::int geradas, (count(*) filter (where e.push_estado = 'enviado'))::int enviadas
                       from public.caca_aviso a left join public.caca_aviso_entrega e on e.aviso_id = a.id
                      where a.categoria = 'delivery' and a.chave_dedupe like 'delivery:%'
                      group by 1, 2) x));
end $function$;

create or replace function public.caca_delivery_aviso_definir(p_secret text, p_ligado boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_antes jsonb; v_novo jsonb;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if p_ligado is null then raise exception 'dados_invalidos'; end if;
  select valor into v_antes from public.caca_config where chave = 'delivery_aviso';
  v_novo := '{"ligado":false,"hora":17,"janela_horas":2,"max_por_dia":1000}'::jsonb || coalesce(v_antes, '{}'::jsonb) || jsonb_build_object('ligado', p_ligado);
  insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
  values ('delivery_aviso', v_novo, 'Avisos de delivery da Caça (uma casa com delivery que falta no mapa, 1 por dia). Ligar pelo painel, em Caça › Avisos.',
          now(), coalesce(public.ator_rotulo_atual(), 'Painel'))
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  perform public.caca_evento_gravar(null, null, 'delivery_aviso', jsonb_build_object('antes', v_antes), v_novo, null);
  return jsonb_build_object('ok', true, 'config', v_novo);
end $function$;

revoke all on function public.caca_delivery_casas(text) from public, anon, authenticated;
revoke all on function public.caca_delivery_gerar(timestamptz) from public, anon, authenticated;
revoke all on function public.caca_delivery_aviso_estado(text) from public;
revoke all on function public.caca_delivery_aviso_definir(text, boolean) from public;
grant execute on function public.caca_delivery_aviso_estado(text) to anon, authenticated;
grant execute on function public.caca_delivery_aviso_definir(text, boolean) to anon, authenticated;
