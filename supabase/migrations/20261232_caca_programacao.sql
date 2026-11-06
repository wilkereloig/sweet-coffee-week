-- Caça: programação diária do festival, avisos de prêmio, categorias novas e prioridade de envio.
-- ADITIVA sobre 20261230 (central/limites) e 20261230_ciclo (agendador). Nada é enviado por esta migration:
-- o que gera avisos continua sob `caca_config.avisos_auto` (interruptor da organização) e a programação sob `caca_config.programacao`.
--
-- O que muda:
--   1. categorias novas: 'incentivo' (lembrete de experimentar/avançar) e 'premio' (seleção e prazo). Preferência própria, padrão ligado;
--      o incentivo só chega como push com folga (1 a cada `incentivo_intervalo_dias`) e nunca tira a vez de prêmio/pendência;
--   2. destino extra permitido: '/cartoon/mapa?painel=premios' (abre o painel de Prêmios do mapa);
--   3. programação diária (caca_programacao_gerar): uma mensagem por pessoa por dia de festival, lida de `edicoes.festival_inicio/fim`
--      (prorrogou o festival => a programação acompanha sozinha), no fuso de Fortaleza, só dentro de uma janela do dia (nunca atrasada);
--   4. avisos de prêmio (caca_avisos_gerar_premios): seleção e lembrete do prazo, a partir de caca_premio;
--   5. o ciclo (15 min) chama tudo, grava como foi (`caca_config.avisos_ciclo_estado`) e processa primeiro o que é prioridade.
-- reverter: select cron.unschedule não é necessário (o job é o mesmo); restaurar caca_avisos_ciclo, caca_aviso_entregas_pendentes,
--   caca_avisos_para_processar, caca_avisos_limites, caca_push_prefs_norm, caca_push_registrar de 20261230*.sql; drop function
--   public.caca_programacao_gerar(timestamptz), public.caca_avisos_gerar_premios(timestamptz), public.caca_programacao_texto(text,int,int,int,text,int,text,text),
--   public.caca_programacao_estado(text), public.caca_programacao_definir(text, jsonb); restaurar as constraints de categoria/destino.

-- ---------------------------------------------------------------- 1. categorias e destino
alter table public.caca_aviso drop constraint if exists caca_aviso_categoria_check;
alter table public.caca_aviso add constraint caca_aviso_categoria_check
  check (categoria in ('avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio'));
alter table public.caca_aviso drop constraint if exists caca_aviso_destino_check;
alter table public.caca_aviso add constraint caca_aviso_destino_check
  check (char_length(destino) <= 120 and (destino ~ '^/(?!/)[A-Za-z0-9/_-]*$' or destino = '/cartoon/mapa?painel=premios'));

-- ---------------------------------------------------------------- 2. preferências: duas chaves novas
create or replace function public.caca_push_prefs_norm(p jsonb)
 returns jsonb language sql immutable set search_path to 'public'
as $$
  select coalesce(jsonb_object_agg(k, p -> k), '{}'::jsonb)
    from unnest(array['avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio']) k
   where jsonb_typeof(p -> k) = 'boolean'
$$;
revoke all on function public.caca_push_prefs_norm(jsonb) from public, anon, authenticated;

create or replace function public.caca_push_registrar(p_chave text, p_subscription jsonb, p_prefs jsonb default null)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_ep text; v_p text; v_a text; v_hash text; v_prefs jsonb; v_n int;
  v_padrao constant jsonb := '{"avaliacao_pendente":true,"meta":true,"grupo":true,"edicao":false,"voucher":false,"imprevisto":true,"incentivo":true,"premio":true}';
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

-- aparelhos já assinados ganham as duas chaves no padrão (o que a pessoa já escolheu não muda)
update public.caca_push set prefs = '{"incentivo":true,"premio":true}'::jsonb || prefs
 where not (prefs ? 'incentivo' and prefs ? 'premio');

-- ---------------------------------------------------------------- 3. limites (+ intervalo do incentivo)
create or replace function public.caca_avisos_limites()
 returns jsonb language sql stable set search_path to 'public'
as $$
  select '{"lembretes_dia":2,"por_categoria_dia":1,"janela_de":8,"janela_ate":21,"incentivo_intervalo_dias":2}'::jsonb
      || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'avisos_limites'), '{}'::jsonb)
$$;
revoke all on function public.caca_avisos_limites() from public, anon, authenticated;

-- ---------------------------------------------------------------- 4. push: prioridade e folga do incentivo
-- Regras novas (o resto é idêntico a 20261230):
--   · incentivo NÃO conta no teto de lembretes dos outros: prêmio, pendência e meta nunca perdem a vez para ele;
--   · incentivo só vai a quem NÃO recebeu nenhum push hoje e não recebeu incentivo nos últimos `incentivo_intervalo_dias` dias
--     (aviso de fim de festival — chave 'prog:<dia>:penultimo|ultimo:…' — fica fora do intervalo, não do "nenhum push hoje").
create or replace function public.caca_aviso_entregas_pendentes(p_aviso uuid, p_max int default 500)
 returns table (mapa_id uuid, push_id uuid, endpoint text, p256dh text, auth_chave text)
 language plpgsql volatile security definer set search_path to 'public'
as $$
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
               or (a.categoria <> 'premio' -- seleção e lembrete de prazo do prêmio podem sair no mesmo dia
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
end $$;
revoke all on function public.caca_aviso_entregas_pendentes(uuid, int) from public, anon, authenticated;

-- fila da edge: imprevisto > prêmio > pendência > meta > grupo > o resto; até 12 avisos por ciclo
create or replace function public.caca_avisos_para_processar()
 returns uuid[] language sql stable security definer set search_path to 'public'
as $$
  select coalesce(array_agg(x.id order by x.pri, x.t), '{}'::uuid[]) from (
    select a.id,
           case a.categoria when 'imprevisto' then 0 when 'premio' then 1 when 'avaliacao_pendente' then 2 when 'meta' then 3 when 'grupo' then 4 else 5 end pri,
           coalesce(a.enviado_em, a.criado_em) t
      from public.caca_aviso a
     where a.estado = 'enviado' and (a.vigente_ate is null or a.vigente_ate > now()) and coalesce(a.enviado_em, a.criado_em) > now() - interval '48 hours'
       and exists (select 1 from public.caca_aviso_entrega e where e.aviso_id = a.id and (e.push_estado is null or e.push_estado = 'adiado'))
     order by pri, t limit 12) x
$$;
revoke all on function public.caca_avisos_para_processar() from public, anon, authenticated;

-- ---------------------------------------------------------------- 5. textos da programação (tom Cartoon; sem prêmio prometido, sem urgência falsa)
-- p_tipo: incentivo | voucher | penultimo | ultimo. p_n: casas validadas da pessoa. p_falta/p_meta: próxima meta (nulos se não houver).
create or replace function public.caca_programacao_texto(p_tipo text, p_idx int, p_n int, p_falta int, p_meta text, p_total int,
                                                         p_corte text default '23:59', p_fecha text default null)
 returns table (titulo text, corpo text)
 language plpgsql immutable set search_path to 'public'
as $$
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
end $$;
revoke all on function public.caca_programacao_texto(text, int, int, int, text, int, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- 6. programação diária
-- caca_config 'programacao' = {"ligada":true,"hora":10,"janela_horas":4}: a mensagem do dia só nasce entre `hora` e `hora + janela_horas`
-- (hora de Fortaleza); fora disso nada é criado, então mensagem vencida nunca sai atrasada. Um aviso por (dia, tipo, casas validadas):
-- a pessoa recebe um só por dia, com o progresso dela; vale até o fim do dia. Dia de voucher troca a mensagem do dia (não soma uma segunda);
-- quem já tem voucher ativo recebe a mensagem comum. Mapa completo não recebe incentivo. Idempotente por chave_dedupe.
create or replace function public.caca_programacao_gerar(p_agora timestamptz default now())
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_auto jsonb; v_cfg jsonb; v_ed text; v_ini date; v_fim date; v_loc timestamp; v_dia date; v_h int; v_hora int; v_jan int;
  v_tipo text; v_idx int; v_total int; v_cfgm jsonb; v_corte text; v_fecha timestamp; v_ate timestamptz; v_vdias jsonb;
  r record; t record; m record; v_id uuid; v_avisos int := 0; v_alvos int := 0; v_cat text; v_dest text; v_ids jsonb; v_cnt int;
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

  -- cada pessoa (mapa principal) com as casas validadas e a mensagem do dia (voucher vira comum para quem já tem voucher ativo)
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
      -- o grupo (dia, tipo, casas) já tem aviso de um ciclo anterior: quem chegou depois entra nele (a lista já exclui quem já recebeu hoje)
      select a3.id into v_id from public.caca_aviso a3 where a3.chave_dedupe = 'prog:' || v_dia || ':' || r.tipo || ':' || r.n;
      update public.caca_aviso set alvos = alvos + r.qtd where id = v_id;
    end if;
    insert into public.caca_aviso_entrega (aviso_id, mapa_id)
    select v_id, (j #>> '{}')::uuid from jsonb_array_elements(r.ids) j on conflict do nothing;
    v_alvos := v_alvos + r.qtd;
    v_id := null;
  end loop;
  return jsonb_build_object('ok', true, 'dia', v_dia, 'tipo', v_tipo, 'avisos', v_avisos, 'pessoas', v_alvos);
end $$;
revoke all on function public.caca_programacao_gerar(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------- 7. avisos de prêmio (a partir de caca_premio; só depois de ligar)
create or replace function public.caca_avisos_gerar_premios(p_agora timestamptz default now())
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_auto jsonb; v_ed text; v_desde timestamptz; r record; v_id uuid; v_sel int := 0; v_lem int := 0; v_titulo text; v_corpo text; v_prazo text;
begin
  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  if coalesce((v_auto ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'ligado', false); end if;
  v_desde := coalesce((v_auto ->> 'desde')::timestamptz, p_agora);
  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  if v_ed is null then return jsonb_build_object('ok', true, 'sem_edicao', true); end if;

  for r in select p.id, p.mapa_id, p.tipo, p.dia, p.prazo_ate from public.caca_premio p
            where p.edicao_codigo = v_ed and p.estado = 'selecionado' and p.mapa_id is not null and p.criado_em >= v_desde
              and (p.prazo_ate is null or p.prazo_ate > p_agora)
  loop
    v_prazo := case when r.prazo_ate is null then null
                    else to_char(r.prazo_ate at time zone 'America/Fortaleza', 'DD/MM "às" HH24"h"MI') end;
    -- 1. a seleção
    v_titulo := case when r.tipo = 'voucher_dia' then 'Seleção para o voucher do dia' else 'Seleção para o prêmio final' end;
    v_corpo := case when r.tipo = 'voucher_dia' then 'Você está na seleção do voucher do dia ' || to_char(r.dia, 'DD/MM') || '.' else 'Você está entre os selecionados do prêmio final.' end
            || case when v_prazo is not null then ' Confirme até ' || v_prazo || '.' else '' end || ' Veja em Prêmios como fazer.';
    insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, vigente_ate, estado, origem, chave_dedupe,
                                   criado_por, enviado_em, enviado_por, alvos)
    values (v_ed, 'premio', v_titulo, left(v_corpo, 240), '/cartoon/mapa?painel=premios', jsonb_build_object('tipo', 'mapas', 'ids', jsonb_build_array(r.mapa_id)),
            r.prazo_ate, 'enviado', 'automatico', 'premio:' || r.id || ':selecionado', 'premio', p_agora, 'premio', 1)
    on conflict (chave_dedupe) do nothing returning id into v_id;
    if v_id is not null then insert into public.caca_aviso_entrega (aviso_id, mapa_id) values (v_id, r.mapa_id) on conflict do nothing; v_sel := v_sel + 1; end if;
    v_id := null;

    -- 2. lembrete: nas 3 últimas horas antes do prazo, se continua sem confirmar
    if r.prazo_ate is not null and r.prazo_ate - interval '3 hours' <= p_agora
       and extract(hour from p_agora at time zone 'America/Fortaleza')::int >= (public.caca_avisos_limites() ->> 'janela_de')::int
       and extract(hour from p_agora at time zone 'America/Fortaleza')::int < (public.caca_avisos_limites() ->> 'janela_ate')::int then
      insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, vigente_ate, estado, origem, chave_dedupe,
                                     criado_por, enviado_em, enviado_por, alvos)
      values (v_ed, 'premio', 'O prazo está acabando', 'O prazo para confirmar o seu ' || case when r.tipo = 'voucher_dia' then 'voucher' else 'prêmio' end ||
              ' termina em ' || v_prazo || '. Veja em Prêmios.', '/cartoon/mapa?painel=premios',
              jsonb_build_object('tipo', 'mapas', 'ids', jsonb_build_array(r.mapa_id)), r.prazo_ate, 'enviado', 'automatico',
              'premio:' || r.id || ':lembrete', 'premio', p_agora, 'premio', 1)
      on conflict (chave_dedupe) do nothing returning id into v_id;
      if v_id is not null then insert into public.caca_aviso_entrega (aviso_id, mapa_id) values (v_id, r.mapa_id) on conflict do nothing; v_lem := v_lem + 1; end if;
      v_id := null;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'selecao', v_sel, 'lembrete', v_lem);
end $$;
revoke all on function public.caca_avisos_gerar_premios(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------- 8. o ciclo: gera tudo, grava como foi, aciona a edge
create or replace function public.caca_avisos_ciclo()
 returns void language plpgsql security definer set search_path to 'public', 'extensions'
as $$
declare v_erros jsonb := '{}'::jsonb; v_pend int; v_push text := 'nada_a_enviar';
begin
  begin perform public.caca_avisos_gerar_automaticos(); exception when others then v_erros := v_erros || jsonb_build_object('automaticos', sqlerrm); end;
  begin perform public.caca_avisos_gerar_premios(); exception when others then v_erros := v_erros || jsonb_build_object('premios', sqlerrm); end;
  begin perform public.caca_programacao_gerar(); exception when others then v_erros := v_erros || jsonb_build_object('programacao', sqlerrm); end;
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
end $$;
revoke all on function public.caca_avisos_ciclo() from public, anon, authenticated;

-- ---------------------------------------------------------------- 9. painel: estado + calendário, e ajuste da programação
create or replace function public.caca_programacao_estado(p_secret text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_ed text; v_ini date; v_fim date; v_cfg jsonb; v_vdias jsonb; v_corte text; v_fecha timestamp; v_auto jsonb;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  v_cfg := '{"ligada":true,"hora":10,"janela_horas":4}'::jsonb
        || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'programacao'), '{}'::jsonb);
  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  select festival_inicio, festival_fim into v_ini, v_fim from public.edicoes where codigo = v_ed;
  v_vdias := coalesce((select valor from public.caca_premiacao_config where chave = 'voucher_dias'), '[]'::jsonb);
  v_corte := replace(coalesce((select valor #>> '{}' from public.caca_premiacao_config where chave = 'corte_hora_local'), '23:59'), ':', 'h');
  select (avaliacao_fecha_em at time zone 'America/Fortaleza') into v_fecha from public.edicao_publicacao where edicao_codigo = v_ed;
  return jsonb_build_object(
    'avisos_auto', coalesce((v_auto ->> 'ligado')::boolean, false), 'desde', v_auto ->> 'desde',
    'agendado', exists (select 1 from cron.job where jobname = 'scw-caca-avisos' and active),
    'config', v_cfg, 'limites', public.caca_avisos_limites(),
    'ultimo_ciclo', (select valor from public.caca_config where chave = 'avisos_ciclo_estado'),
    'festival', jsonb_build_object('inicio', v_ini, 'fim', v_fim),
    'calendario', (select coalesce(jsonb_agg(jsonb_build_object(
        'dia', d::date, 'hora', (v_cfg ->> 'hora')::int, 'tipo', tp.tipo, 'titulo', tx.titulo, 'corpo', tx.corpo,
        'gerado', exists (select 1 from public.caca_aviso a where a.edicao_codigo = v_ed and a.chave_dedupe like 'prog:' || d::date || ':%'),
        'pessoas', (select coalesce(sum(a.alvos), 0) from public.caca_aviso a where a.edicao_codigo = v_ed and a.chave_dedupe like 'prog:' || d::date || ':%')
      ) order by d), '[]'::jsonb)
      from generate_series(v_ini::timestamp, v_fim::timestamp, interval '1 day') d
      cross join lateral (select case when d::date = v_fim then 'ultimo' when d::date = v_fim - 1 then 'penultimo'
                                      when v_vdias ? (d::date)::text then 'voucher' else 'incentivo' end tipo) tp
      cross join lateral public.caca_programacao_texto(tp.tipo, d::date - v_ini, 0, null, null, 0, v_corte,
                                                       case when tp.tipo = 'ultimo' and v_fecha is not null then to_char(v_fecha, 'HH24"h"MI') end) tx)
  );
end $$;

create or replace function public.caca_programacao_definir(p_secret text, p_cfg jsonb)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_antes jsonb; v_novo jsonb;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if jsonb_typeof(p_cfg) <> 'object' then raise exception 'dados_invalidos'; end if;
  if p_cfg ? 'ligada' and jsonb_typeof(p_cfg -> 'ligada') <> 'boolean' then raise exception 'dados_invalidos'; end if;
  if p_cfg ? 'hora' and (jsonb_typeof(p_cfg -> 'hora') <> 'number' or (p_cfg ->> 'hora')::numeric not between 8 and 20 or (p_cfg ->> 'hora')::numeric <> trunc((p_cfg ->> 'hora')::numeric)) then raise exception 'hora_invalida'; end if;
  if p_cfg ? 'janela_horas' and (jsonb_typeof(p_cfg -> 'janela_horas') <> 'number' or (p_cfg ->> 'janela_horas')::numeric not between 1 and 8 or (p_cfg ->> 'janela_horas')::numeric <> trunc((p_cfg ->> 'janela_horas')::numeric)) then raise exception 'janela_invalida'; end if;
  select valor into v_antes from public.caca_config where chave = 'programacao';
  v_novo := '{"ligada":true,"hora":10,"janela_horas":4}'::jsonb || coalesce(v_antes, '{}'::jsonb)
         || (select coalesce(jsonb_object_agg(k, p_cfg -> k), '{}'::jsonb) from unnest(array['ligada', 'hora', 'janela_horas']) k where p_cfg ? k);
  insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
  values ('programacao', v_novo, 'Programação diária da Caça: ligada, hora de Fortaleza em que a mensagem do dia nasce e quantas horas ela pode nascer depois.',
          now(), coalesce(public.ator_rotulo_atual(), 'Painel'))
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  perform public.caca_evento_gravar(null, null, 'programacao', jsonb_build_object('antes', v_antes), v_novo, null);
  return jsonb_build_object('ok', true, 'config', v_novo);
end $$;
revoke all on function public.caca_programacao_estado(text) from public, anon, authenticated;
revoke all on function public.caca_programacao_definir(text, jsonb) from public, anon, authenticated;
grant execute on function public.caca_programacao_estado(text) to anon, authenticated;
grant execute on function public.caca_programacao_definir(text, jsonb) to anon, authenticated;

insert into public.caca_config (chave, valor, nota) values
  ('programacao', '{"ligada":true,"hora":10,"janela_horas":4}', 'Programação diária da Caça: ligada, hora de Fortaleza em que a mensagem do dia nasce e quantas horas ela pode nascer depois.')
on conflict (chave) do nothing;
