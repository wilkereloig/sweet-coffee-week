-- Caça aos Carimbos: pedido de revisão de presença (alternativa excepcional ao GPS) e resumo de carimbos sem GPS (05/11/2026).
-- Decisão e contrato: docs/cartoon-2026-2/15-caca-gps-excecao.md e 15-caca-contrato-gps.md. Teste: supabase/testes/caca-gps-excecao.sql.
--
-- O que entra:
--  1. caca_carimbo_excecao: o pedido da pessoa (PENDENTE) quando a localização falha de forma persistente. Pedido NÃO conta nada.
--     Guarda só distância e precisão informadas (nunca a posição), a unidade provável e uma nota curta opcional.
--  2. caca_excecao_pedir (visitante, por mapa): grava o pedido com limites; recusa quando o carimbo normal já funcionaria
--     (a casa não tem ponto conferido, ou o celular está dentro do raio) e fora da janela da avaliação.
--  3. caca_excecao_minhas (visitante): o estado dos próprios pedidos (pendente · aprovado · negado), sem notas internas.
--  4. caca_excecao_listar / caca_excecao_decidir (painel): a ORGANIZAÇÃO decide. Aprovar cria o carimbo com origem
--     'excecao_painel' (conferido = false), respeitando as 12 h e a janela, auditado em caca_evento. Negar exige motivo.
--  5. caca_gps_resumo (painel): quantos carimbos sem GPS, por dia e por pessoa, e quantos pedidos esperam decisão.
--  6. Sinal de tempo real (domínio 'carimbos', canal org) na tabela nova.
-- Tudo aditivo: nenhuma função existente muda; mapa_carimbar / mapa_carimbar_casa seguem iguais.
--
-- Reverter: supabase/reverter/20261214_caca_gps_excecao.sql
--   drop trigger if exists sync_caca_carimbo_excecao on public.caca_carimbo_excecao;
--   drop function if exists public.caca_excecao_pedir(text,text,text,numeric,numeric,numeric,text), public.caca_excecao_minhas(text),
--     public.caca_excecao_listar(text,text,text), public.caca_excecao_decidir(text,uuid,text,text), public.caca_gps_resumo(text,text),
--     public.caca_excecao_unidade(uuid,numeric,numeric);
--   drop table if exists public.caca_carimbo_excecao;

-- ---------------------------------------------------------------- 1. tabela
create table if not exists public.caca_carimbo_excecao (
  id                      uuid primary key default gen_random_uuid(),
  edicao_codigo           text not null references public.edicoes (codigo) on update cascade,
  mapa_id                 uuid not null references public.mapas_lover (id) on delete cascade,
  pessoa                  text not null,                       -- e-mail normalizado do mapa (limites e 12 h são por pessoa)
  participacao_id         uuid not null references public.participacoes (id) on delete cascade,
  participacao_unidade_id uuid references public.participacao_unidades (id) on delete set null,
  motivo                  text not null check (motivo in ('sem_localizacao', 'imprecisa', 'longe')),
  distancia_m             integer,
  precisao_m              integer,
  nota                    text check (nota is null or char_length(nota) <= 200),
  estado                  text not null default 'pendente' check (estado in ('pendente', 'aprovado', 'negado')),
  decidido_por            text,
  decidido_user           uuid,
  decidido_em             timestamptz,
  decisao_nota            text check (decisao_nota is null or char_length(decisao_nota) <= 200),
  carimbo_id              uuid references public.carimbos (id) on delete set null,
  criado_em               timestamptz not null default now(),
  check ((estado = 'pendente') = (decidido_em is null))
);
create index if not exists caca_excecao_fila on public.caca_carimbo_excecao (edicao_codigo, estado, criado_em);
create index if not exists caca_excecao_pessoa on public.caca_carimbo_excecao (pessoa, participacao_id, criado_em desc);

alter table public.caca_carimbo_excecao enable row level security;
revoke all on table public.caca_carimbo_excecao from public, anon, authenticated;

-- ---------------------------------------------------------------- utilitário interno
-- Unidade da casa que o pedido representa: conferida primeiro, depois a mais perto do celular (se houver posição), depois o código.
-- Só unidades com QR ativo (o carimbo guarda o código). Null = casa sem QR ativo.
create or replace function public.caca_excecao_unidade(p_participacao uuid, p_lat numeric, p_lng numeric)
 returns uuid language sql stable security definer set search_path to 'public'
as $$
  select pu.id
    from public.participacao_unidades pu
    join public.carimbo_qr cq on cq.participacao_unidade_id = pu.id and cq.ativo
    left join public.unidades u on u.id = pu.unidade_id
   where pu.participa and pu.participacao_id = p_participacao
   order by case when u.coordenada_verificada_em is not null and u.lat is not null then 0 else 1 end,
            case when p_lat is null or p_lng is null or u.lat is null or u.lng is null then null
                 else public.carimbo_distancia(u.lat::float8, u.lng::float8, p_lat::float8, p_lng::float8) end nulls last,
            cq.codigo
   limit 1
$$;
revoke all on function public.caca_excecao_unidade(uuid, numeric, numeric) from public, anon, authenticated;

-- ---------------------------------------------------------------- 2. visitante: pedir
-- Retorno: {ok:true, id, estado:'pendente'} ou {ok:false, motivo}:
--   mapa_desconhecido · motivo_invalido · qr_invalido (casa desconhecida) · casa_sem_combo · nao_aberta · encerrada ·
--   nao_precisa (o carimbo normal vale: a casa não tem ponto conferido ou o celular está no raio) ·
--   cedo (já carimbou aqui há menos de 12 h; liberado_em) · ja_pedido (pedido nesta casa há menos de 12 h; liberado_em) ·
--   limite_dia (2 pedidos por casa no dia de Natal) · muitos_pendentes (5 esperando decisão) · fila_cheia (300 na edição).
-- p_motivo: 'sem_localizacao' (negada/indisponível/tempo) · 'imprecisa' (precisão acima do tolerado) · 'longe' (a distância não fechou).
create or replace function public.caca_excecao_pedir(p_chave text, p_slug text, p_motivo text, p_lat numeric, p_lng numeric,
                                                     p_precisao numeric, p_nota text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_slug text := lower(btrim(coalesce(p_slug, ''))); v_pa uuid; v_c public.edicao_publicacao%rowtype;
  v_motivo text := lower(btrim(coalesce(p_motivo, ''))); v_nota text; v_pu uuid; v_prec int; v_dist int; v_min float8;
  v_ult timestamptz; v_dup timestamptz; v_id uuid; v_pos boolean;
  v_raio constant int := 200; v_folga_max constant int := 300; v_espera constant interval := interval '12 hours';
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if v_motivo not in ('sem_localizacao', 'imprecisa', 'longe') then return jsonb_build_object('ok', false, 'motivo', 'motivo_invalido'); end if;

  select pa.id into v_pa from public.participacoes pa
   where pa.edicao_codigo = m.edicao_codigo and pa.slug_publico = v_slug and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  if v_pa is null then return jsonb_build_object('ok', false, 'motivo', 'qr_invalido'); end if;
  if not (v_pa in (select public.caca_casas_conta(m.edicao_codigo))) then
    return jsonb_build_object('ok', false, 'motivo', 'casa_sem_combo', 'slug', v_slug);
  end if;

  select * into v_c from public.edicao_publicacao where edicao_codigo = m.edicao_codigo;
  if not coalesce(v_c.avaliacao_aberta, false) or now() < v_c.avaliacao_abre_em then
    return jsonb_build_object('ok', false, 'motivo', 'nao_aberta', 'abre_em', v_c.avaliacao_abre_em, 'slug', v_slug);
  end if;
  if now() > v_c.avaliacao_fecha_em then return jsonb_build_object('ok', false, 'motivo', 'encerrada', 'slug', v_slug); end if;

  -- Casa sem nenhuma unidade com ponto conferido: o carimbo normal já vale (sem GPS) — não há o que excepcionar.
  select min(public.carimbo_distancia(u.lat::float8, u.lng::float8, p_lat::float8, p_lng::float8)), count(*) > 0
    into v_min, v_pos
    from public.participacao_unidades pu join public.unidades u on u.id = pu.unidade_id
   where pu.participacao_id = v_pa and pu.participa and u.coordenada_verificada_em is not null and u.lat is not null;
  if not v_pos then return jsonb_build_object('ok', false, 'motivo', 'nao_precisa', 'slug', v_slug); end if;

  v_prec := least(greatest(coalesce(p_precisao, 0), 0), 100000)::int;
  if p_lat is not null and p_lng is not null and p_lat between -90 and 90 and p_lng between -180 and 180 then
    v_dist := round(v_min)::int;
    -- O celular já está no raio da validação normal: carimbar funciona, o pedido seria um atalho.
    if v_dist <= v_raio + least(v_prec, v_folga_max) then
      return jsonb_build_object('ok', false, 'motivo', 'nao_precisa', 'slug', v_slug);
    end if;
  else
    v_dist := null; p_lat := null; p_lng := null;
  end if;

  v_pu := public.caca_excecao_unidade(v_pa, p_lat, p_lng);
  if v_pu is null then return jsonb_build_object('ok', false, 'motivo', 'qr_invalido'); end if;
  v_nota := nullif(left(btrim(regexp_replace(coalesce(p_nota, ''), '[[:cntrl:]]+', ' ', 'g')), 200), '');

  -- Mesma trava por e-mail dos carimbos: pedidos e carimbos simultâneos da mesma pessoa não passam juntos.
  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || m.edicao_codigo || ':' || m.email_norm, 0));

  select max(k.criado_em) into v_ult
    from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
   where k.participacao_id = v_pa and m2.edicao_codigo = m.edicao_codigo and k.anulado_em is null
     and (k.mapa_id = m.id or m2.email_norm = m.email_norm);
  if v_ult is not null and now() < v_ult + v_espera then
    return jsonb_build_object('ok', false, 'motivo', 'cedo', 'liberado_em', v_ult + v_espera, 'slug', v_slug);
  end if;

  select max(e.criado_em) into v_dup from public.caca_carimbo_excecao e
   where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm and e.participacao_id = v_pa;
  if v_dup is not null and now() < v_dup + v_espera then
    return jsonb_build_object('ok', false, 'motivo', 'ja_pedido', 'liberado_em', v_dup + v_espera, 'slug', v_slug);
  end if;
  if (select count(*) from public.caca_carimbo_excecao e
       where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm and e.participacao_id = v_pa
         and (e.criado_em at time zone 'America/Fortaleza')::date = (now() at time zone 'America/Fortaleza')::date) >= 2 then
    return jsonb_build_object('ok', false, 'motivo', 'limite_dia', 'slug', v_slug);
  end if;
  if (select count(*) from public.caca_carimbo_excecao e
       where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm and e.estado = 'pendente') >= 5 then
    return jsonb_build_object('ok', false, 'motivo', 'muitos_pendentes');
  end if;
  if (select count(*) from public.caca_carimbo_excecao e where e.edicao_codigo = m.edicao_codigo and e.estado = 'pendente') >= 300 then
    return jsonb_build_object('ok', false, 'motivo', 'fila_cheia');
  end if;

  insert into public.caca_carimbo_excecao (edicao_codigo, mapa_id, pessoa, participacao_id, participacao_unidade_id, motivo,
                                           distancia_m, precisao_m, nota)
  values (m.edicao_codigo, m.id, m.email_norm, v_pa, v_pu, v_motivo, v_dist, case when p_precisao is null then null else v_prec end, v_nota)
  returning id into v_id;
  insert into public.caca_evento (edicao_codigo, acao, ator, depois)
  values (m.edicao_codigo, 'excecao_pedida', 'visitante', jsonb_build_object('pedido', v_id, 'casa', v_slug, 'motivo', v_motivo));
  return jsonb_build_object('ok', true, 'id', v_id, 'estado', 'pendente', 'slug', v_slug);
end $$;

-- ---------------------------------------------------------------- 3. visitante: acompanhar
create or replace function public.caca_excecao_minhas(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  return jsonb_build_object('ok', true, 'pedidos', (
    select coalesce(jsonb_agg(jsonb_build_object('slug', pa.slug_publico, 'estado', x.estado, 'criado_em', x.criado_em,
                                                 'decidido_em', x.decidido_em) order by x.criado_em desc), '[]'::jsonb)
      from (select * from public.caca_carimbo_excecao e
             where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm order by e.criado_em desc limit 30) x
      join public.participacoes pa on pa.id = x.participacao_id));
end $$;

-- ---------------------------------------------------------------- 4. painel: listar e decidir
-- p_estado: null/'' = todos · 'pendente' · 'aprovado' · 'negado'. Pendentes primeiro (o mais antigo no topo), depois os decididos.
-- dado.ler vê apelido, casa e o pedido; e-mail e WhatsApp só com relatorio.ler.
create or replace function public.caca_excecao_listar(p_secret text, p_edicao text, p_estado text default null)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_rel boolean; v_est text := nullif(btrim(coalesce(p_estado, '')), '');
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  if v_est is not null and v_est not in ('pendente', 'aprovado', 'negado') then raise exception 'parametro_invalido'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  return jsonb_build_object(
    'pendentes', (select count(*) from public.caca_carimbo_excecao e where e.edicao_codigo = p_edicao and e.estado = 'pendente'),
    'itens', (select coalesce(jsonb_agg(x.o order by x.ordem, x.fila), '[]'::jsonb) from (
        select case when e.estado = 'pendente' then 0 else 1 end ordem,
               case when e.estado = 'pendente' then extract(epoch from e.criado_em) else -extract(epoch from e.criado_em) end fila,
               jsonb_strip_nulls(jsonb_build_object(
                 'id', e.id, 'estado', e.estado, 'criado_em', e.criado_em, 'motivo', e.motivo,
                 'apelido', m.apelido, 'casa', pt.nome_marca, 'slug', pa.slug_publico,
                 'unidade', pu.id_publico, 'nome_unidade', u.nome_unidade,
                 'distancia_m', e.distancia_m, 'precisao_m', e.precisao_m, 'nota', e.nota,
                 'avaliou', exists (select 1 from public.avaliacoes a where a.edicao_codigo = e.edicao_codigo
                                      and a.participacao_id = e.participacao_id and a.email_norm = e.pessoa),
                 'carimbos_na_casa', (select count(*) from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
                                       where k.participacao_id = e.participacao_id and m2.email_norm = e.pessoa
                                         and m2.edicao_codigo = e.edicao_codigo and k.anulado_em is null),
                 'pedidos_da_pessoa', (select count(*) from public.caca_carimbo_excecao e2
                                        where e2.edicao_codigo = e.edicao_codigo and e2.pessoa = e.pessoa),
                 'decidido_por', e.decidido_por, 'decidido_em', e.decidido_em, 'decisao_nota', e.decisao_nota, 'carimbo_id', e.carimbo_id,
                 'email', case when v_rel then e.pessoa end, 'whatsapp', case when v_rel then m.whatsapp end)) o
          from public.caca_carimbo_excecao e
          join public.mapas_lover m on m.id = e.mapa_id
          join public.participacoes pa on pa.id = e.participacao_id
          join public.participantes pt on pt.id = pa.participante_id
          left join public.participacao_unidades pu on pu.id = e.participacao_unidade_id
          left join public.unidades u on u.id = pu.unidade_id
         where e.edicao_codigo = p_edicao and (v_est is null or e.estado = v_est)
         order by case when e.estado = 'pendente' then 0 else 1 end, case when e.estado = 'pendente' then e.criado_em end,
                  e.criado_em desc
         limit 300) x));
end $$;

-- p_decisao: 'aprovar' | 'negar'. Erros (exception): nao_autorizado · parametro_invalido · pedido_nao_encontrado · transicao_invalida
-- (já decidido) · nota_obrigatoria (negar sem motivo) · nao_aberta · encerrada · casa_sem_combo · cedo (carimbo da pessoa há menos de
-- 12 h nessa casa) · qr_invalido (unidade sem QR ativo).
-- Aprovar cria UM carimbo agora (criado_em = now(): a decisão tardia conta a partir dela, não retroage a apuração já fotografada).
create or replace function public.caca_excecao_decidir(p_secret text, p_id uuid, p_decisao text, p_nota text default null)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare e public.caca_carimbo_excecao%rowtype; v_dec text := lower(btrim(coalesce(p_decisao, ''))); v_nota text;
  v_c public.edicao_publicacao%rowtype; v_pu uuid; v_qr text; v_ult timestamptz; v_k uuid;
  v_ator text := coalesce(public.ator_rotulo_atual(), 'Painel'); v_slug text;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_dec not in ('aprovar', 'negar') then raise exception 'parametro_invalido'; end if;
  v_nota := nullif(left(btrim(regexp_replace(coalesce(p_nota, ''), '[[:cntrl:]]+', ' ', 'g')), 200), '');
  select * into e from public.caca_carimbo_excecao where id = p_id for update;
  if e.id is null then raise exception 'pedido_nao_encontrado'; end if;
  if e.estado <> 'pendente' then raise exception 'transicao_invalida'; end if;
  select pa.slug_publico into v_slug from public.participacoes pa where pa.id = e.participacao_id;

  if v_dec = 'negar' then
    if v_nota is null then raise exception 'nota_obrigatoria'; end if;
    update public.caca_carimbo_excecao set estado = 'negado', decidido_por = v_ator, decidido_user = auth.uid(),
           decidido_em = now(), decisao_nota = v_nota where id = e.id;
    perform public.caca_evento_gravar(e.edicao_codigo, null, 'excecao_negada',
      jsonb_build_object('estado', 'pendente'), jsonb_build_object('estado', 'negado', 'pedido', e.id, 'casa', v_slug), v_nota);
    return jsonb_build_object('ok', true, 'estado', 'negado');
  end if;

  select * into v_c from public.edicao_publicacao where edicao_codigo = e.edicao_codigo;
  if not coalesce(v_c.avaliacao_aberta, false) or now() < v_c.avaliacao_abre_em then raise exception 'nao_aberta'; end if;
  if now() > v_c.avaliacao_fecha_em then raise exception 'encerrada'; end if;
  if not (e.participacao_id in (select public.caca_casas_conta(e.edicao_codigo))) then raise exception 'casa_sem_combo'; end if;

  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || e.edicao_codigo || ':' || e.pessoa, 0));
  select max(k.criado_em) into v_ult
    from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
   where k.participacao_id = e.participacao_id and m2.edicao_codigo = e.edicao_codigo and k.anulado_em is null
     and (k.mapa_id = e.mapa_id or m2.email_norm = e.pessoa);
  if v_ult is not null and now() < v_ult + interval '12 hours' then raise exception 'cedo'; end if;

  v_pu := coalesce(e.participacao_unidade_id, public.caca_excecao_unidade(e.participacao_id, null, null));
  select cq.codigo into v_qr from public.carimbo_qr cq where cq.participacao_unidade_id = v_pu and cq.ativo;
  if v_qr is null then
    v_pu := public.caca_excecao_unidade(e.participacao_id, null, null);
    select cq.codigo into v_qr from public.carimbo_qr cq where cq.participacao_unidade_id = v_pu and cq.ativo;
  end if;
  if v_qr is null then raise exception 'qr_invalido'; end if;

  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, distancia_m, precisao_m, conferido, origem)
  values (e.mapa_id, e.participacao_id, v_pu, v_qr, e.distancia_m, e.precisao_m, false, 'excecao_painel')
  returning id into v_k;
  update public.caca_carimbo_excecao set estado = 'aprovado', decidido_por = v_ator, decidido_user = auth.uid(),
         decidido_em = now(), decisao_nota = v_nota, carimbo_id = v_k, participacao_unidade_id = v_pu where id = e.id;
  perform public.caca_evento_gravar(e.edicao_codigo, null, 'excecao_aprovada',
    jsonb_build_object('estado', 'pendente'), jsonb_build_object('estado', 'aprovado', 'pedido', e.id, 'casa', v_slug, 'carimbo', v_k), v_nota);
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('carimbo.excecao', 'carimbos', v_k::text, e.participacao_id, jsonb_build_object('pedido', e.id, 'nota', v_nota));
  return jsonb_build_object('ok', true, 'estado', 'aprovado', 'carimbo_id', v_k);
end $$;

-- ---------------------------------------------------------------- 5. painel: resumo dos carimbos sem GPS
-- sem_gps = carimbos não anulados com origem diferente de 'gps' (unidade sem ponto conferido ou exceção do painel).
-- contam = os que entram no progresso (caca_carimbo_conta); dia = dia de Natal. Sem contato: dado.ler basta.
create or replace function public.caca_gps_resumo(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return (
    with k as (
      select (c.criado_em at time zone 'America/Fortaleza')::date dia, m.email_norm pessoa, m.apelido, c.criado_em, c.origem,
             (c.participacao_id in (select public.caca_casas_conta(p_edicao))
              and public.caca_carimbo_conta(c.participacao_id, c.origem)) conta
        from public.carimbos c join public.mapas_lover m on m.id = c.mapa_id
       where m.edicao_codigo = p_edicao and c.anulado_em is null and c.origem <> 'gps'
    )
    select jsonb_build_object(
      'total', (select count(*) from k),
      'contam', (select count(*) from k where conta),
      'excecao_painel', (select count(*) from k where origem = 'excecao_painel'),
      'pedidos_pendentes', (select count(*) from public.caca_carimbo_excecao e where e.edicao_codigo = p_edicao and e.estado = 'pendente'),
      'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'sem_gps', d.n, 'contam', d.nc, 'pessoas', d.p) order by d.dia), '[]'::jsonb)
                    from (select dia, count(*) n, count(*) filter (where conta) nc, count(distinct pessoa) p from k group by dia) d),
      'por_pessoa', (select coalesce(jsonb_agg(jsonb_build_object('apelido', x.apelido, 'sem_gps', x.n, 'contam', x.nc, 'ultimo', x.ultimo)
                                                order by x.n desc, x.ultimo desc), '[]'::jsonb)
                       from (select pessoa, max(apelido) apelido, count(*) n, count(*) filter (where conta) nc, max(criado_em) ultimo
                               from k group by pessoa order by count(*) desc, max(criado_em) desc limit 50) x)));
end $$;

-- ---------------------------------------------------------------- permissões
revoke all on function public.caca_excecao_pedir(text, text, text, numeric, numeric, numeric, text),
  public.caca_excecao_minhas(text), public.caca_excecao_listar(text, text, text), public.caca_excecao_decidir(text, uuid, text, text),
  public.caca_gps_resumo(text, text) from public, anon, authenticated;
grant execute on function public.caca_excecao_pedir(text, text, text, numeric, numeric, numeric, text),
  public.caca_excecao_minhas(text), public.caca_excecao_listar(text, text, text), public.caca_excecao_decidir(text, uuid, text, text),
  public.caca_gps_resumo(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 6. sinal de tempo real
do $$
begin
  if not exists (select 1 from pg_trigger g where g.tgname = 'sync_caca_carimbo_excecao'
                  and g.tgrelid = to_regclass('public.caca_carimbo_excecao') and not g.tgisinternal) then
    create trigger sync_caca_carimbo_excecao after insert or update or delete on public.caca_carimbo_excecao
      for each row execute function public.sync_gatilho('carimbos', 'org', 'id');
  end if;
end $$;
