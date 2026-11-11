-- Caça aos Carimbos: avisos de DISPUTA (docs/cartoon-2026-2/19, etapa 3; pedido do Wilker, 10/11/2026). ADITIVA.
-- Nenhuma regra do jogo muda: a conta da zona é a MESMA de caca_minha_disputa (20270123) e da apuração (caca_escolher_dia).
--
-- O que entra:
--   1. categoria 'disputa' em caca_aviso + preferência própria no push (LIGADA por padrão: quem não tem a chave recebe);
--   2. caca_disputa_estado: posição e estado de cada mapa no último ciclo (é o "antes" da ultrapassagem);
--   3. caca_disputa_foto(edição, dia): a zona de todo mundo, de uma vez (dentro · empate · fora com faltam exato · final);
--   4. caca_disputa_texto: os textos (todo número vem do banco; sem número exato, sem aviso; nunca promete voucher);
--   5. caca_disputa_gerar: os 4 gatilhos, no ciclo de 15 min, antes da programação:
--        ultrapassagem  estava na zona no ciclo anterior, caiu de posição e saiu (fora ou empate) · 1 por dia
--        perto          fora com 1 ou 2 casas, ou empate, das 10h até 2 h antes do corte · 1 por dia
--        reta_final     nas 2 h antes do corte, quem está na zona, em empate ou a 1 casa · 1 por dia
--        retomada       tem carimbo e 48 h sem carimbar, na janela da programação · 1 a cada 2 dias; tira o incentivo neutro do dia;
--                       no máximo 150 por ciclo (mais casas primeiro), o resto nos ciclos seguintes da janela
--      Os três primeiros só existem em dia de voucher e ANTES do corte, e vencem no corte (vigente_ate): depois do corte nenhum
--      aviso cita o voucher daquele dia. Trava: mais de `max_por_ciclo` (300) avisos num ciclo = não gera nada e registra.
--   6. push: 'disputa' abaixo de prêmio e avaliação pendente (reserva vaga do limite diário para elas) e acima do incentivo;
--   7. programação: os 4 textos neutros de quem tem carimbo passam a dizer a posição (só com o interruptor da disputa ligado);
--   8. painel: caca_disputa_aviso_estado (contagem por dia e tipo) e caca_disputa_aviso_definir (interruptor).
-- Interruptor: caca_config 'disputa_aviso' {"ligado": false, "max_por_ciclo": 300, "retomada_por_ciclo": 150}. Nasce DESLIGADO (ponto de decisão 2).
-- Reverter: supabase/reverter/20270124_caca_disputa_avisos.sql

-- ---------------------------------------------------------------- 1. categoria e preferência
alter table public.caca_aviso drop constraint caca_aviso_categoria_check;
alter table public.caca_aviso add constraint caca_aviso_categoria_check check (categoria = any (array[
  'avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio', 'campanha', 'disputa']));

create or replace function public.caca_push_prefs_norm(p jsonb)
returns jsonb language sql immutable set search_path to 'public' as $function$
  select coalesce(jsonb_object_agg(k, p -> k), '{}'::jsonb)
    from unnest(array['avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio', 'campanha', 'disputa']) k
   where jsonb_typeof(p -> k) = 'boolean'
$function$;

-- ---------------------------------------------------------------- 2. estado do último ciclo
create table if not exists public.caca_disputa_estado (
  mapa_id uuid primary key references public.mapas_lover(id) on delete cascade,
  edicao_codigo text not null,
  dia date not null,
  posicao int,
  estado text not null,
  casas int not null default 0,
  extras int not null default 0,
  atualizado_em timestamptz not null default now()
);
alter table public.caca_disputa_estado enable row level security;
revoke all on public.caca_disputa_estado from anon, authenticated;

insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
values ('disputa_aviso', '{"ligado":false,"max_por_ciclo":300,"retomada_por_ciclo":150}'::jsonb,
        'Avisos de disputa da Caça (ultrapassagem, perto da zona, reta final, retomada). Ligar pelo painel, em Caça › Avisos.', now(), 'migration')
on conflict (chave) do nothing;

-- ---------------------------------------------------------------- 3. a zona de todo mundo
-- Mesma conta de caca_minha_disputa: rank = 1 + quem está estritamente acima; cnt = quem empata comigo (eu incluído).
create or replace function public.caca_disputa_foto(p_ed text, p_dia date)
returns table (mapa_id uuid, pessoa text, posicao int, casas int, extras int, carimbos int, ultimo timestamptz,
               estado text, faltam int, empatados int)
language sql stable security definer set search_path to 'public' as $function$
  with cfg as (
    select coalesce(public.caca_pcfg('voucher_dias') @> to_jsonb(p_dia::text), false) tem_dia, public.caca_voucher_qtd(p_dia) q
  ), base as (
    select r.mapa_id, r.pessoa, r.pos, r.casas, r.extras, r.carimbos, r.ultimo,
           r.casas > 0 and not exists (
             select 1 from public.caca_premio p
              where p.edicao_codigo = p_ed and p.tipo = 'voucher_dia' and p.pessoa = r.pessoa
                and (p.estado in ('selecionado', 'confirmado', 'entregue')
                     or (p.dia = p_dia and p.estado in ('expirado', 'substituido', 'cancelado')))) conta
      from public.caca_ranking_v2(p_ed, null) r
  ), e as (
    select b.pessoa, b.casas, b.extras,
           rank() over w rk, row_number() over w rn, count(*) over (partition by b.casas, b.extras) cnt
      from base b where b.conta
    window w as (order by b.casas desc, b.extras desc)
  ), lim as (
    select e.casas lc, e.extras lx from e, cfg where e.rn = cfg.q
  )
  select b.mapa_id, b.pessoa, b.pos, b.casas, b.extras, b.carimbos, b.ultimo,
         case when not cfg.tem_dia or e.pessoa is null then 'final'
              when e.rk - 1 + e.cnt <= cfg.q then 'dentro'
              when e.rk - 1 < cfg.q then 'empate'
              else 'fora' end,
         case when not cfg.tem_dia or e.pessoa is null or e.rk - 1 + e.cnt <= cfg.q then null
              when e.rk - 1 < cfg.q then 1
              else lim.lc - b.casas + case when b.extras > lim.lx then 0 else 1 end end,
         case when cfg.tem_dia and e.pessoa is not null and e.rk - 1 + e.cnt > cfg.q and e.rk - 1 < cfg.q then e.cnt::int end
    from base b cross join cfg left join e on e.pessoa = b.pessoa left join lim on true
$function$;

-- ---------------------------------------------------------------- 4. textos
-- Sem posição, sem hora do corte ou sem número exato de casas: não devolve nada (e o gerador não cria o aviso).
create or replace function public.caca_disputa_texto(p_tipo text, p_pos int, p_estado text, p_faltam int, p_empatados int,
                                                     p_corte text, p_tempo text)
returns table (titulo text, corpo text) language plpgsql immutable set search_path to 'public' as $function$
declare
  v_casas text := case when p_faltam = 1 then 'Falta 1 casa' else 'Faltam ' || p_faltam || ' casas' end;
  v_outros text := case when p_empatados = 2 then 'mais 1 pessoa' else 'mais ' || (p_empatados - 1) || ' pessoas' end;
begin
  if p_pos is null or p_pos < 1 then return; end if;
  if p_tipo in ('ultrapassagem', 'perto', 'reta_final') then
    if p_corte is null then return; end if;
    if p_estado = 'fora' and not coalesce(p_faltam > 0, false) then return; end if;
    if p_estado = 'empate' and not coalesce(p_empatados > 1, false) then return; end if;
    if p_estado not in ('dentro', 'empate', 'fora') then return; end if;
  end if;

  if p_tipo = 'ultrapassagem' then
    if p_estado = 'empate' then
      return query select 'Passaram você na disputa de hoje'::text,
        ('Agora você está em ' || p_pos || 'º, empatado com ' || v_outros || ' pela última vaga do voucher de hoje. Uma casa a mais até as '
         || p_corte || ' (horário de Natal) tira você do sorteio.')::text;
    elsif p_estado = 'fora' then
      return query select 'Passaram você na disputa de hoje'::text,
        ('Agora você está em ' || p_pos || 'º e fora da zona de voucher de hoje. ' || v_casas || ' para voltar até as '
         || p_corte || ' (horário de Natal).')::text;
    end if;
  elsif p_tipo = 'perto' then
    if p_estado = 'empate' then
      return query select 'Empate pela última vaga de hoje'::text,
        ('Você está em ' || p_pos || 'º, empatado com ' || v_outros || ' pela última vaga do voucher de hoje. Uma casa a mais até as '
         || p_corte || ' (horário de Natal) tira você do sorteio.')::text;
    elsif p_estado = 'fora' and p_faltam <= 2 then
      return query select 'Você está perto da zona de voucher'::text,
        ('Você está em ' || p_pos || 'º. ' || v_casas || ' para entrar na zona de voucher de hoje. O corte é às '
         || p_corte || ' (horário de Natal).')::text;
    end if;
  elsif p_tipo = 'reta_final' then
    if p_tempo is null then return; end if;
    if p_estado = 'dentro' then
      return query select 'Reta final da disputa de hoje'::text,
        ('O corte das ' || p_corte || ' é daqui a ' || p_tempo || '. Você está em ' || p_pos
         || 'º, na zona de voucher. Segure a posição: a seleção só vale depois da apuração.')::text;
    elsif p_estado = 'empate' then
      return query select 'Reta final da disputa de hoje'::text,
        ('O corte das ' || p_corte || ' é daqui a ' || p_tempo || '. Você está em ' || p_pos
         || 'º, empatado pela última vaga. Uma casa a mais tira você do sorteio.')::text;
    elsif p_estado = 'fora' and p_faltam = 1 then
      return query select 'Reta final da disputa de hoje'::text,
        ('O corte das ' || p_corte || ' é daqui a ' || p_tempo || '. Você está em ' || p_pos
         || 'º e falta 1 casa para entrar na zona de voucher.')::text;
    end if;
  elsif p_tipo = 'retomada' then
    return query select 'Sua Caça está esperando'::text,
      ('Faz mais de 2 dias sem carimbo. Você está em ' || p_pos || 'º no ranking da Caça. Uma casa nova ajuda você a subir.')::text;
  end if;
end $function$;

-- ---------------------------------------------------------------- 5. gerador
create or replace function public.caca_disputa_gerar(p_agora timestamptz default now())
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_auto jsonb; v_cfg jsonb; v_prog jsonb; v_lim jsonb; v_ed text; v_fuso text; v_loc timestamp; v_dia date; v_h int;
  v_ini date; v_fim date; v_tem_dia boolean := false; v_corte timestamptz; v_antes boolean := false; v_hcorte text; v_min int; v_tempo text;
  v_ph int; v_pj int; v_max int; v_ret int; v_cand int; v_avisos int := 0; v_pessoas int := 0; v_tipos jsonb := '{}'::jsonb;
  r record; v_id uuid; v_chave text;
begin
  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  if coalesce((v_auto ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'ligado', false); end if;
  v_cfg := '{"ligado":false,"max_por_ciclo":300,"retomada_por_ciclo":150}'::jsonb
        || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'disputa_aviso'), '{}'::jsonb);
  if coalesce((v_cfg ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'disputa', false); end if;
  v_max := greatest(coalesce((v_cfg ->> 'max_por_ciclo')::int, 300), 1);
  v_ret := greatest(coalesce((v_cfg ->> 'retomada_por_ciclo')::int, 150), 0);

  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  if v_ed is null then return jsonb_build_object('ok', true, 'sem_edicao', true); end if;
  v_fuso := coalesce(public.caca_pcfg('fuso') #>> '{}', 'America/Fortaleza');
  v_loc := p_agora at time zone v_fuso; v_dia := v_loc::date; v_h := extract(hour from v_loc)::int;
  v_ini := (public.caca_pcfg('caca_inicio') #>> '{}')::date; v_fim := (public.caca_pcfg('caca_fim') #>> '{}')::date;
  if v_ini is null or v_fim is null or v_dia < v_ini or v_dia > v_fim then return jsonb_build_object('ok', true, 'fora_do_periodo', true, 'dia', v_dia); end if;
  v_lim := public.caca_avisos_limites();
  if v_h < (v_lim ->> 'janela_de')::int or v_h >= (v_lim ->> 'janela_ate')::int then
    return jsonb_build_object('ok', true, 'fora_do_horario', true, 'dia', v_dia);
  end if;

  v_tem_dia := coalesce(public.caca_pcfg('voucher_dias') @> to_jsonb(v_dia::text), false);
  if v_tem_dia then
    v_corte := public.caca_corte(v_dia); -- já inclui o minuto do corte (17:01 = carimbo até 17:00:59 conta)
    v_antes := p_agora < v_corte;
    v_hcorte := regexp_replace(to_char((v_corte - interval '1 minute') at time zone v_fuso, 'HH24"h"MI'), 'h00$', 'h');
    v_min := floor(extract(epoch from (v_corte - interval '1 minute' - p_agora)) / 60)::int;
    v_tempo := case when v_min >= 60 then (v_min / 60) || ' h' || case when v_min % 60 > 0 then ' ' || (v_min % 60) || ' min' else '' end
                    when v_min >= 1 then v_min || ' min' end;
  end if;
  v_prog := '{"hora":10,"janela_horas":4}'::jsonb
         || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'programacao'), '{}'::jsonb);
  v_ph := least(greatest((v_prog ->> 'hora')::int, 8), 20); v_pj := least(greatest((v_prog ->> 'janela_horas')::int, 1), 8);

  create temporary table if not exists _caca_disp_foto (mapa_id uuid, pessoa text, posicao int, casas int, extras int, carimbos int,
    ultimo timestamptz, estado text, faltam int, empatados int) on commit drop;
  create temporary table if not exists _caca_disp_cand (mapa_id uuid, tipo text, titulo text, corpo text) on commit drop;
  truncate _caca_disp_foto; truncate _caca_disp_cand;
  insert into _caca_disp_foto select * from public.caca_disputa_foto(v_ed, v_dia) f where f.mapa_id is not null;

  insert into _caca_disp_cand (mapa_id, tipo, titulo, corpo)
  select f.mapa_id, x.tipo, t.titulo, t.corpo
    from _caca_disp_foto f
    left join public.caca_disputa_estado s on s.mapa_id = f.mapa_id and s.dia = v_dia
    cross join lateral (select case
        when v_antes and s.estado = 'dentro' and f.estado in ('fora', 'empate') and f.posicao > s.posicao then 'ultrapassagem'
        when v_antes and v_tempo is not null and p_agora >= v_corte - interval '2 hours'
             and (f.estado in ('dentro', 'empate') or (f.estado = 'fora' and f.faltam = 1)) then 'reta_final'
        when v_antes and v_h >= 10 and p_agora < v_corte - interval '2 hours'
             and (f.estado = 'empate' or (f.estado = 'fora' and f.faltam in (1, 2))) then 'perto'
        when f.carimbos > 0 and f.ultimo <= p_agora - interval '48 hours' and v_h >= v_ph and v_h < v_ph + v_pj then 'retomada'
      end tipo) x
    cross join lateral public.caca_disputa_texto(x.tipo, f.posicao, f.estado, f.faltam, f.empatados, v_hcorte, v_tempo) t
   where x.tipo is not null
     and not exists (select 1 from public.caca_aviso_entrega e join public.caca_aviso a on a.id = e.aviso_id
                      where e.mapa_id = f.mapa_id
                        and (a.chave_dedupe like 'disputa:' || v_dia || ':' || x.tipo || ':%'
                             or (x.tipo = 'retomada' and a.chave_dedupe like 'disputa:' || (v_dia - 1) || ':retomada:%')
                             -- quem ficou para um ciclo depois e já recebeu o incentivo do dia não recebe os dois
                             or (x.tipo = 'retomada' and a.chave_dedupe like 'prog:' || v_dia || ':incentivo:%')));

  -- Retomada espalhada (decisão do Wilker, 10/11/2026): no máximo `retomada_por_ciclo` (150) por ciclo, quem tem mais casas primeiro
  -- e, empatado, quem está parado há mais tempo. O resto fica para o próximo ciclo da mesma janela (16 ciclos entre 10h e 14h).
  delete from _caca_disp_cand c
   using (select c2.mapa_id from _caca_disp_cand c2 join _caca_disp_foto f2 on f2.mapa_id = c2.mapa_id
           where c2.tipo = 'retomada' order by f2.casas desc, f2.ultimo asc, c2.mapa_id offset v_ret) x
   where c.mapa_id = x.mapa_id and c.tipo = 'retomada';

  select count(*) into v_cand from _caca_disp_cand;
  if v_cand > v_max then
    -- Volume fora do esperado: não manda nada e deixa registrado (o ciclo grava o retorno no estado do agendador via erros).
    insert into public.caca_disputa_estado (mapa_id, edicao_codigo, dia, posicao, estado, casas, extras, atualizado_em)
    select f.mapa_id, v_ed, v_dia, f.posicao, f.estado, f.casas, f.extras, p_agora from _caca_disp_foto f
    on conflict (mapa_id) do update set edicao_codigo = excluded.edicao_codigo, dia = excluded.dia, posicao = excluded.posicao,
      estado = excluded.estado, casas = excluded.casas, extras = excluded.extras, atualizado_em = excluded.atualizado_em;
    raise warning 'caca_disputa_gerar: % avisos num ciclo (máximo %); nada foi gerado', v_cand, v_max;
    return jsonb_build_object('ok', false, 'excedeu', v_cand, 'max', v_max, 'dia', v_dia);
  end if;

  for r in select c.tipo, c.titulo, c.corpo, jsonb_agg(to_jsonb(c.mapa_id)) ids, count(*)::int qtd
             from _caca_disp_cand c group by 1, 2, 3 loop
    v_chave := 'disputa:' || v_dia || ':' || r.tipo || ':' || md5(r.titulo || '|' || r.corpo);
    insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, vigente_ate, estado, origem, chave_dedupe,
                                   criado_por, enviado_em, enviado_por, alvos)
    values (v_ed, 'disputa', left(r.titulo, 80), left(r.corpo, 240), '/cartoon/caca', jsonb_build_object('tipo', 'mapas', 'ids', r.ids),
            case when r.tipo = 'retomada' then ((v_dia + 1)::timestamp at time zone v_fuso) else v_corte end,
            'enviado', 'automatico', v_chave, 'disputa', p_agora, 'disputa', r.qtd)
    on conflict (chave_dedupe) do nothing returning id into v_id;
    if v_id is not null then
      v_avisos := v_avisos + 1;
    else
      select a.id into v_id from public.caca_aviso a where a.chave_dedupe = v_chave;
      update public.caca_aviso set alvos = alvos + r.qtd where id = v_id;
    end if;
    insert into public.caca_aviso_entrega (aviso_id, mapa_id)
    select v_id, (j #>> '{}')::uuid from jsonb_array_elements(r.ids) j on conflict do nothing;
    v_pessoas := v_pessoas + r.qtd;
    v_tipos := v_tipos || jsonb_build_object(r.tipo, coalesce((v_tipos ->> r.tipo)::int, 0) + r.qtd);
    v_id := null;
  end loop;

  insert into public.caca_disputa_estado (mapa_id, edicao_codigo, dia, posicao, estado, casas, extras, atualizado_em)
  select f.mapa_id, v_ed, v_dia, f.posicao, f.estado, f.casas, f.extras, p_agora from _caca_disp_foto f
  on conflict (mapa_id) do update set edicao_codigo = excluded.edicao_codigo, dia = excluded.dia, posicao = excluded.posicao,
    estado = excluded.estado, casas = excluded.casas, extras = excluded.extras, atualizado_em = excluded.atualizado_em;

  return jsonb_build_object('ok', true, 'dia', v_dia, 'voucher', v_tem_dia, 'antes_do_corte', v_antes, 'avisos', v_avisos,
                            'pessoas', v_pessoas, 'por_tipo', v_tipos);
end $function$;

-- ---------------------------------------------------------------- 6. push: preferência ligada por padrão e prioridade
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

create or replace function public.caca_avisos_para_processar()
returns uuid[] language sql stable security definer set search_path to 'public' as $function$
  select coalesce(array_agg(x.id order by x.pri, x.t), '{}'::uuid[]) from (
    select a.id,
           case a.categoria when 'imprevisto' then 0 when 'premio' then 1 when 'avaliacao_pendente' then 2 when 'meta' then 3 when 'grupo' then 4
                            when 'disputa' then 5 else 6 end pri,
           coalesce(a.enviado_em, a.criado_em) t
      from public.caca_aviso a
     where a.estado = 'enviado' and (a.vigente_ate is null or a.vigente_ate > now()) and coalesce(a.enviado_em, a.criado_em) > now() - interval '48 hours'
       and exists (select 1 from public.caca_aviso_entrega e where e.aviso_id = a.id and (e.push_estado is null or e.push_estado = 'adiado'))
     order by pri, t limit 12) x
$function$;

-- ---------------------------------------------------------------- 7. programação: posição nos textos neutros; retomada no lugar do incentivo
drop function public.caca_programacao_texto(text, integer, integer, integer, text, integer, text, text);
create function public.caca_programacao_texto(p_tipo text, p_idx integer, p_n integer, p_falta integer, p_meta text, p_total integer,
                                              p_corte text default '23:59'::text, p_fecha text default null::text, p_pos integer default null)
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
  elsif p_pos is not null and p_pos > 0 then
    -- Com carimbo e posição conhecida (só com os avisos de disputa ligados): o texto diz onde a pessoa está.
    return query select t.a, (t.b || case when p_falta is not null and p_meta is not null
        then ' Faltam ' || p_falta || ' para a meta “' || p_meta || '”.' else '' end)::text from (values
      (0, 'Sua Caça continua', 'Você já validou ' || v_casas || ' e está em ' || p_pos || 'º no ranking. Escolha a próxima casa.'),
      (1, 'Mais um combo?', v_casas || ' validadas até agora, ' || p_pos || 'º no ranking. Confira o mapa e escolha a próxima.'),
      (2, 'Hoje tem caça', 'Você tem ' || v_casas || ' no mapa e está em ' || p_pos || 'º. Que tal uma casa nova hoje?'),
      (3, 'Seguimos no mapa', 'Já são ' || v_casas || ' validadas e você está em ' || p_pos || 'º. Veja as casas que ainda faltam.')
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
revoke all on function public.caca_programacao_texto(text, integer, integer, integer, text, integer, text, text, integer) from public, anon, authenticated;

create or replace function public.caca_programacao_gerar(p_agora timestamp with time zone default now())
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_auto jsonb; v_cfg jsonb; v_ed text; v_ini date; v_fim date; v_loc timestamp; v_dia date; v_h int; v_hora int; v_jan int;
  v_tipo text; v_idx int; v_total int; v_cfgm jsonb; v_corte text; v_fecha timestamp; v_ate timestamptz; v_vdias jsonb;
  r record; t record; m record; v_id uuid; v_avisos int := 0; v_alvos int := 0; v_cat text; v_disp boolean;
begin
  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  if coalesce((v_auto ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'ligado', false); end if;
  v_cfg := '{"ligada":true,"hora":10,"janela_horas":4}'::jsonb
        || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'programacao'), '{}'::jsonb);
  if coalesce((v_cfg ->> 'ligada')::boolean, true) is not true then return jsonb_build_object('ok', true, 'programacao', false); end if;
  -- Avisos de disputa ligados: posição nos textos neutros e a retomada substitui o incentivo neutro do dia.
  v_disp := coalesce((select (valor ->> 'ligado')::boolean from public.caca_config where chave = 'disputa_aviso'), false);

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
    select g.tipo, g.n, case when v_disp and g.tipo = 'incentivo' and g.n > 0 then g.pos end pos, jsonb_agg(to_jsonb(g.mapa)) ids, count(*)::int qtd
      from (select m2.id mapa, coalesce(rk.casas, 0) n, rk.pos,
                   case when v_tipo = 'voucher' and exists (select 1 from public.caca_premio p where p.edicao_codigo = v_ed and p.tipo = 'voucher_dia'
                              and p.pessoa = m2.email_norm and p.estado in ('selecionado', 'confirmado', 'entregue'))
                        then 'incentivo' else v_tipo end tipo,
                   v_disp and exists (select 1 from public.caca_aviso_entrega e4 join public.caca_aviso a4 on a4.id = e4.aviso_id
                                       where e4.mapa_id = m2.id and a4.chave_dedupe like 'disputa:' || v_dia || ':retomada:%') retomou
              from public.mapas_lover m2
              left join public.caca_ranking_v2(v_ed) rk on rk.pessoa = m2.email_norm
             where m2.edicao_codigo = v_ed and m2.id = public.caca_mapa_principal(v_ed, m2.email_norm)
               and not exists (select 1 from public.caca_aviso_entrega e2 join public.caca_aviso a2 on a2.id = e2.aviso_id
                                where e2.mapa_id = m2.id and a2.chave_dedupe like 'prog:' || v_dia || ':%')) g
     where g.n < v_total and not (g.retomou and g.tipo = 'incentivo')
     group by 1, 2, 3
  loop
    select x.casas, x.titulo into m from public.caca_metas_resolver(v_cfgm, v_total) x where x.casas > r.n order by x.casas limit 1;
    select * into t from public.caca_programacao_texto(r.tipo, v_idx, r.n, case when m.casas is not null then m.casas - r.n end, m.titulo, v_total,
                                                        v_corte, case when r.tipo = 'ultimo' and v_fecha is not null then to_char(v_fecha, 'HH24"h"MI') end, r.pos);
    v_cat := case when r.tipo = 'voucher' then 'voucher' else 'incentivo' end;
    insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, vigente_ate, estado, origem, chave_dedupe,
                                   criado_por, enviado_em, enviado_por, alvos)
    values (v_ed, v_cat, left(t.titulo, 80), left(t.corpo, 240), case when r.tipo = 'voucher' then '/cartoon/mapa?painel=premios' else '/cartoon/caca/mapa' end,
            jsonb_build_object('tipo', 'mapas', 'ids', r.ids), v_ate, 'enviado', 'automatico',
            'prog:' || v_dia || ':' || r.tipo || ':' || r.n || coalesce(':p' || r.pos, ''), 'programacao', p_agora, 'programacao', r.qtd)
    on conflict (chave_dedupe) do nothing returning id into v_id;
    if v_id is not null then
      v_avisos := v_avisos + 1;
    else
      select a3.id into v_id from public.caca_aviso a3 where a3.chave_dedupe = 'prog:' || v_dia || ':' || r.tipo || ':' || r.n || coalesce(':p' || r.pos, '');
      update public.caca_aviso set alvos = alvos + r.qtd where id = v_id;
    end if;
    insert into public.caca_aviso_entrega (aviso_id, mapa_id)
    select v_id, (j #>> '{}')::uuid from jsonb_array_elements(r.ids) j on conflict do nothing;
    v_alvos := v_alvos + r.qtd;
    v_id := null;
  end loop;
  return jsonb_build_object('ok', true, 'dia', v_dia, 'tipo', v_tipo, 'avisos', v_avisos, 'pessoas', v_alvos);
end $function$;

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

-- ---------------------------------------------------------------- 8. painel
create or replace function public.caca_disputa_aviso_estado(p_secret text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_cfg jsonb; v_auto jsonb;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  v_cfg := '{"ligado":false,"max_por_ciclo":300,"retomada_por_ciclo":150}'::jsonb
        || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'disputa_aviso'), '{}'::jsonb);
  return jsonb_build_object(
    'ligado', coalesce((v_cfg ->> 'ligado')::boolean, false),
    'max_por_ciclo', (v_cfg ->> 'max_por_ciclo')::int,
    'retomada_por_ciclo', (v_cfg ->> 'retomada_por_ciclo')::int,
    'avisos_auto', coalesce((v_auto ->> 'ligado')::boolean, false),
    'ultimo_ciclo', (select valor -> 'disputa' from public.caca_config where chave = 'avisos_ciclo_estado'),
    'erro', (select valor -> 'erros' ->> 'disputa' from public.caca_config where chave = 'avisos_ciclo_estado'),
    'aparelhos', (select count(distinct c.mapa_id)::int from public.caca_push c where c.ativo and coalesce((c.prefs ->> 'disputa')::boolean, true)),
    'dias', (select coalesce(jsonb_agg(jsonb_build_object('dia', x.dia, 'tipo', x.tipo, 'avisos', x.avisos, 'geradas', x.geradas, 'enviadas', x.enviadas)
                                       order by x.dia desc, x.tipo), '[]'::jsonb)
               from (select split_part(a.chave_dedupe, ':', 2) dia, split_part(a.chave_dedupe, ':', 3) tipo, count(distinct a.id)::int avisos,
                            count(e.mapa_id)::int geradas, (count(*) filter (where e.push_estado = 'enviado'))::int enviadas
                       from public.caca_aviso a left join public.caca_aviso_entrega e on e.aviso_id = a.id
                      where a.categoria = 'disputa' and a.chave_dedupe like 'disputa:%'
                      group by 1, 2) x));
end $function$;

create or replace function public.caca_disputa_aviso_definir(p_secret text, p_ligado boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_antes jsonb; v_novo jsonb;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if p_ligado is null then raise exception 'dados_invalidos'; end if;
  select valor into v_antes from public.caca_config where chave = 'disputa_aviso';
  v_novo := '{"ligado":false,"max_por_ciclo":300,"retomada_por_ciclo":150}'::jsonb || coalesce(v_antes, '{}'::jsonb) || jsonb_build_object('ligado', p_ligado);
  insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
  values ('disputa_aviso', v_novo, 'Avisos de disputa da Caça (ultrapassagem, perto da zona, reta final, retomada). Ligar pelo painel, em Caça › Avisos.',
          now(), coalesce(public.ator_rotulo_atual(), 'Painel'))
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  perform public.caca_evento_gravar(null, null, 'disputa_aviso', jsonb_build_object('antes', v_antes), v_novo, null);
  return jsonb_build_object('ok', true, 'config', v_novo);
end $function$;

revoke all on function public.caca_disputa_foto(text, date) from public, anon, authenticated;
revoke all on function public.caca_disputa_texto(text, int, text, int, int, text, text) from public, anon, authenticated;
revoke all on function public.caca_disputa_gerar(timestamptz) from public, anon, authenticated;
revoke all on function public.caca_disputa_aviso_estado(text) from public;
revoke all on function public.caca_disputa_aviso_definir(text, boolean) from public;
grant execute on function public.caca_disputa_aviso_estado(text) to anon, authenticated;
grant execute on function public.caca_disputa_aviso_definir(text, boolean) to anon, authenticated;
