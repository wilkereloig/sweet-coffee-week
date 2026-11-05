-- Caça aos Carimbos, premiação (Wilker, 04/11/2026; docs/cartoon-2026-2/15-caca-especificacao.md §5 e §6).
-- ADITIVA: só objetos novos. NÃO altera carimbo_placar, mapa_ler, ranking_mapa, get_caca_apuracao, mapa_carimbar,
-- submit_avaliacao nem os vouchers existentes. Usa caca_ranking_v2 (20261203) como fonte do ranking.
--
-- O que cria
--   · caca_premiacao_config          : datas, corte, fuso, pesos, prazos... tudo configurável (e auditado em caca_evento).
--   · caca_apuracao_dia    : foto CONGELADA do ranking de cada dia de voucher (imutável; hash sha256 verificável).
--   · caca_premio          : seleção/ganho (voucher do dia e prêmio final) e a máquina de estados.
--   · caca_evento          : auditoria append-only (quem, ação, antes/depois, quando).
--   · RPCs de painel       : caca_apurar_dia, caca_premio_acao, caca_premio_listar, caca_sorteio_final,
--                            caca_config_ler, caca_config_gravar (todas com p_secret + public.pode()).
--
-- Decisões desta migration (sinalizadas, nada inventado além do pedido)
--   · Corte do dia = hora local de Natal em caca_premiacao_config (padrão 23:59). O minuto 23:59 INTEIRO conta: o limite exclusivo
--     passado a caca_ranking_v2 é 23:59 + 1 minuto (23:59:59 entra, 00:00:00 não).
--   · prazo_segunda_chamada_min = 120 é PROPOSTA (proposta=true na tabela), não decisão.
--   · E-mail confirmado: lido de mapas_lover.email_confirmado_em SE a coluna existir (migration de identidade, 20261205);
--     senão vale caca_premiacao_config.email_confirmado_se_sem_coluna (padrão false = "não confirmado"). Ponto único de troca:
--     função interna caca_premio_email_ok(). E-mail confirmado => o premiado já nasce 'confirmado' (sem prazo).
--   · Sorteio verificável: PRNG determinístico = primeiros 48 bits de sha256(semente || ':' || índice) / 2^48.
--     Mesma semente + mesma lista (ordenada por e-mail) = mesmo resultado. Semente de desempate do voucher é gravada.
--   · Só pessoas com ao menos 1 casa validada existem no ranking, logo só elas concorrem a voucher.
--   · caca_premio guarda e-mail (pessoa) e apelido COPIADOS; mapa_id é só referência (sem FK, para não travar "apagar meu
--     mapa"). Retenção desses dados depois do festival = pendência de decisão (regulamento: "aDefinir").
--   · intervalo_carimbo_h é só informativo aqui: mapa_carimbar ainda usa 12 h fixo (não alterado por ser migration aditiva).
--
-- reverter:
--   drop function if exists public.caca_sorteio_final(text,text,text,boolean), public.caca_config_gravar(text,text,jsonb),
--     public.caca_config_ler(text), public.caca_premio_listar(text,text), public.caca_premio_acao(text,uuid,text,text),
--     public.caca_apurar_dia(text,text,date,text), public.caca_premio_json(public.caca_premio,boolean),
--     public.caca_premio_dia_criar(text,date,jsonb,uuid,boolean,text), public.caca_escolher_dia(text,date,text),
--     public.caca_evento_gravar(text,uuid,text,jsonb,jsonb,text), public.caca_premio_email_ok(text,text),
--     public.caca_sorteio_ponderado(text,int[],int), public.caca_prng(text,int), public.caca_total_casas(text),
--     public.caca_corte(date), public.caca_pcfg(text), public.caca_imutavel();
--   drop table if exists public.caca_evento, public.caca_premio, public.caca_apuracao_dia, public.caca_premiacao_config;

-- ---------------------------------------------------------------- tabelas
create table if not exists public.caca_premiacao_config (
  chave         text primary key,
  valor         jsonb not null,
  proposta      boolean not null default false,
  nota          text,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

create table if not exists public.caca_apuracao_dia (
  edicao_codigo text not null,
  dia           date not null,
  corte         timestamptz not null,
  total_casas   int not null,
  ranking       jsonb not null,
  hash          text not null,
  criado_por    text,
  criado_em     timestamptz not null default now(),
  primary key (edicao_codigo, dia)
);

create table if not exists public.caca_premio (
  id             uuid primary key default gen_random_uuid(),
  edicao_codigo  text not null,
  tipo           text not null check (tipo in ('voucher_dia', 'final')),
  dia            date,
  pessoa         text not null,
  mapa_id        uuid,
  apelido        text,
  posicao        int,
  estado         text not null default 'selecionado'
                 check (estado in ('selecionado', 'confirmado', 'entregue', 'expirado', 'substituido', 'cancelado')),
  prazo_ate      timestamptz,
  substitui_id   uuid references public.caca_premio (id),
  motivo         text,
  semente        text,
  detalhe        jsonb not null default '{}'::jsonb,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por text,
  check ((tipo = 'voucher_dia') = (dia is not null))
);
-- Nunca 2 prêmios ATIVOS (selecionado/confirmado/entregue) da mesma pessoa no voucher; nem 2 no mesmo dia.
create unique index if not exists caca_premio_voucher_pessoa_ativo
  on public.caca_premio (edicao_codigo, pessoa) where tipo = 'voucher_dia' and estado in ('selecionado', 'confirmado', 'entregue');
create unique index if not exists caca_premio_voucher_dia_ativo
  on public.caca_premio (edicao_codigo, dia) where tipo = 'voucher_dia' and estado in ('selecionado', 'confirmado', 'entregue');
create unique index if not exists caca_premio_final_pessoa_ativo
  on public.caca_premio (edicao_codigo, pessoa) where tipo = 'final' and estado in ('selecionado', 'confirmado', 'entregue');
create unique index if not exists caca_premio_final_posicao_ativo
  on public.caca_premio (edicao_codigo, posicao) where tipo = 'final' and estado in ('selecionado', 'confirmado', 'entregue');

create table if not exists public.caca_evento (
  id            bigint generated always as identity primary key,
  edicao_codigo text,
  premio_id     uuid references public.caca_premio (id),
  acao          text not null,
  ator          text,
  ator_user     uuid,
  antes         jsonb,
  depois        jsonb,
  nota          text,
  quando        timestamptz not null default now()
);

alter table public.caca_premiacao_config enable row level security;
alter table public.caca_apuracao_dia enable row level security;
alter table public.caca_premio enable row level security;
alter table public.caca_evento enable row level security;
revoke all on table public.caca_premiacao_config, public.caca_apuracao_dia, public.caca_premio, public.caca_evento from public, anon, authenticated;

-- Imutabilidade: foto do dia e auditoria não mudam nem somem.
create or replace function public.caca_imutavel() returns trigger language plpgsql as $$
begin raise exception 'registro_imutavel: %', tg_table_name; end $$;
revoke all on function public.caca_imutavel() from public, anon, authenticated;

drop trigger if exists caca_apuracao_dia_imutavel on public.caca_apuracao_dia;
create trigger caca_apuracao_dia_imutavel before update or delete on public.caca_apuracao_dia
  for each row execute function public.caca_imutavel();
drop trigger if exists caca_apuracao_dia_sem_truncate on public.caca_apuracao_dia;
create trigger caca_apuracao_dia_sem_truncate before truncate on public.caca_apuracao_dia
  for each statement execute function public.caca_imutavel();
drop trigger if exists caca_evento_imutavel on public.caca_evento;
create trigger caca_evento_imutavel before update or delete on public.caca_evento
  for each row execute function public.caca_imutavel();
drop trigger if exists caca_evento_sem_truncate on public.caca_evento;
create trigger caca_evento_sem_truncate before truncate on public.caca_evento
  for each statement execute function public.caca_imutavel();

-- Defaults (spec §5 e §6). Só semeia; não sobrescreve o que já foi configurado.
insert into public.caca_premiacao_config (chave, valor, proposta, nota) values
  ('voucher_dias', '["2026-11-07","2026-11-08","2026-11-09","2026-11-10","2026-11-11"]'::jsonb, false, 'Um voucher por dia (7 a 11/11).'),
  ('corte_hora_local', '"23:59"'::jsonb, false, 'Hora local de corte. O minuto inteiro conta (até 23:59:59).'),
  ('fuso', '"America/Fortaleza"'::jsonb, false, 'Fuso de Natal.'),
  ('peso_base', '100'::jsonb, false, 'Prêmio final: peso = peso_base + carimbos extras.'),
  ('ganhadores_final', '3'::jsonb, false, 'Prêmio final: número de ganhadores.'),
  ('prazo_confirmacao_proximo_dia_hora', '12'::jsonb, false, 'E-mail não confirmado: confirma até esta hora do dia seguinte.'),
  ('prazo_segunda_chamada_min', '120'::jsonb, true, 'PROPOSTA, não decisão: minutos de prazo a partir do aviso, nas chamadas seguintes.'),
  ('voucher_validade_ate', '"2026-11-15"'::jsonb, false, 'Validade do voucher.'),
  ('intervalo_carimbo_h', '12'::jsonb, false, 'Informativo: intervalo entre carimbos na mesma casa. mapa_carimbar ainda usa 12 fixo.'),
  ('email_confirmado_se_sem_coluna', 'false'::jsonb, false, 'Enquanto mapas_lover.email_confirmado_em não existir: tratar e-mail como confirmado?')
on conflict (chave) do nothing;

-- ---------------------------------------------------------------- internas (sem grant)
create or replace function public.caca_pcfg(p_chave text) returns jsonb
 language sql stable security definer set search_path to 'public'
as $$ select valor from public.caca_premiacao_config where chave = p_chave $$;

-- Limite EXCLUSIVO (para caca_ranking_v2): fim do minuto de corte do dia, em hora local.
create or replace function public.caca_corte(p_dia date) returns timestamptz
 language sql stable security definer set search_path to 'public'
as $$
  select ((p_dia + (public.caca_pcfg('corte_hora_local') #>> '{}')::time) at time zone (public.caca_pcfg('fuso') #>> '{}'))
         + interval '1 minute'
$$;

create or replace function public.caca_total_casas(p_edicao text) returns int
 language sql stable security definer set search_path to 'public'
as $$
  select count(*)::int from public.participacoes pa
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente)
$$;

-- PRNG determinístico em [0,1): 48 bits de sha256(semente || ':' || i).
create or replace function public.caca_prng(p_semente text, p_i int) returns double precision
 language sql immutable set search_path to 'public'
as $$
  select (('x' || encode(substr(extensions.digest(coalesce(p_semente, '') || ':' || p_i::text, 'sha256'), 1, 6), 'hex'))::bit(48)::bigint)::double precision
         / 281474976710656.0
$$;

-- Sorteio ponderado SEM reposição: devolve até p_n posições (1-based) de p_pesos, na ordem sorteada.
-- Rodada r usa caca_prng(semente, r). Pesos devem ser > 0. Pesos iguais = sorteio uniforme.
create or replace function public.caca_sorteio_ponderado(p_semente text, p_pesos int[], p_n int) returns int[]
 language plpgsql immutable set search_path to 'public'
as $$
declare v_rest int[] := array(select generate_series(1, coalesce(cardinality(p_pesos), 0)));
        v_out int[] := '{}'; r int; w numeric; u numeric; cum numeric; x int; v_pick int;
begin
  for r in 0 .. least(coalesce(p_n, 0), cardinality(v_rest)) - 1 loop
    w := 0;
    foreach x in array v_rest loop w := w + p_pesos[x]; end loop;
    u := public.caca_prng(p_semente, r)::numeric * w;
    cum := 0; v_pick := v_rest[cardinality(v_rest)];
    foreach x in array v_rest loop
      cum := cum + p_pesos[x];
      if u < cum then v_pick := x; exit; end if;
    end loop;
    v_out := v_out || v_pick;
    v_rest := array_remove(v_rest, v_pick);
  end loop;
  return v_out;
end $$;

-- Ponto único para "e-mail confirmado" (a migration de identidade cria mapas_lover.email_confirmado_em).
create or replace function public.caca_premio_email_ok(p_edicao text, p_pessoa text) returns boolean
 language plpgsql stable security definer set search_path to 'public'
as $$
declare v boolean;
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'mapas_lover' and column_name = 'email_confirmado_em') then
    return coalesce((public.caca_pcfg('email_confirmado_se_sem_coluna') #>> '{}')::boolean, false);
  end if;
  execute 'select coalesce(bool_or(email_confirmado_em is not null), false) from public.mapas_lover where edicao_codigo = $1 and email_norm = $2'
     into v using p_edicao, p_pessoa;
  return coalesce(v, false);
end $$;

create or replace function public.caca_evento_gravar(p_edicao text, p_premio uuid, p_acao text, p_antes jsonb, p_depois jsonb, p_nota text default null)
 returns void language sql volatile security definer set search_path to 'public'
as $$
  insert into public.caca_evento (edicao_codigo, premio_id, acao, ator, ator_user, antes, depois, nota)
  values (p_edicao, p_premio, p_acao, coalesce(public.ator_rotulo_atual(), 'Painel'), auth.uid(), p_antes, p_depois, p_nota)
$$;

-- JSON de um prêmio. Contato (e-mail, WhatsApp) só com p_rel (relatorio.ler).
create or replace function public.caca_premio_json(p public.caca_premio, p_rel boolean) returns jsonb
 language sql stable security definer set search_path to 'public'
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', p.id, 'tipo', p.tipo, 'dia', p.dia, 'posicao', p.posicao, 'estado', p.estado, 'apelido', p.apelido,
    'prazo_ate', p.prazo_ate,
    'vencido', (p.estado = 'selecionado' and p.prazo_ate is not null and p.prazo_ate < now()),
    'email_confirmado', public.caca_premio_email_ok(p.edicao_codigo, p.pessoa),
    'substitui_id', p.substitui_id, 'motivo', p.motivo, 'semente', p.semente, 'detalhe', p.detalhe,
    'criado_em', p.criado_em, 'atualizado_em', p.atualizado_em,
    'email', case when p_rel then p.pessoa end,
    'whatsapp', case when p_rel then (select m.whatsapp from public.mapas_lover m where m.id = p.mapa_id) end))
$$;

-- Escolhe o 1º elegível do dia a partir da FOTO do dia. Elegível = tem casa validada na foto E
--   · não tem voucher confirmado/entregue (ganhou de verdade);
--   · não está 'selecionado' pendente (temporário: se expirar, volta a concorrer);
--   · não passou por este mesmo dia e falhou (expirado/substituído/cancelado no dia).
-- Ordem: mais casas, mais extras; empate = sorteio com semente (gravada em 'semente' quando houve empate).
-- Devolve null se não houver elegível.
create or replace function public.caca_escolher_dia(p_edicao text, p_dia date, p_semente text) returns jsonb
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_rank jsonb; v_cands jsonb; v_n int; v_sem text := nullif(btrim(coalesce(p_semente, '')), ''); v_idx int;
begin
  select ranking into v_rank from public.caca_apuracao_dia where edicao_codigo = p_edicao and dia = p_dia;
  if v_rank is null then return null; end if;
  select jsonb_agg(x.e order by x.pessoa) into v_cands
    from (select e, e ->> 'pessoa' pessoa,
                 rank() over (order by (e ->> 'casas')::int desc, (e ->> 'extras')::int desc) rk
            from jsonb_array_elements(v_rank) e
           where (e ->> 'casas')::int > 0
             and not exists (select 1 from public.caca_premio p
                              where p.edicao_codigo = p_edicao and p.tipo = 'voucher_dia' and p.pessoa = e ->> 'pessoa'
                                and (p.estado in ('selecionado', 'confirmado', 'entregue')
                                     or (p.dia = p_dia and p.estado in ('expirado', 'substituido', 'cancelado'))))) x
   where x.rk = 1;
  v_n := coalesce(jsonb_array_length(v_cands), 0);
  if v_n = 0 then return null; end if;
  if v_n = 1 then
    return (v_cands -> 0) || jsonb_build_object('desempate', false, 'empatados', 1);
  end if;
  v_sem := coalesce(v_sem, replace(gen_random_uuid()::text, '-', ''));
  v_idx := (public.caca_sorteio_ponderado(v_sem, array_fill(1, array[v_n]), 1))[1] - 1;
  return (v_cands -> v_idx) || jsonb_build_object('desempate', true, 'empatados', v_n, 'semente', v_sem);
end $$;

-- Cria o prêmio do dia para o escolhido. Primeira chamada: e-mail não confirmado => prazo até a hora configurada do dia
-- seguinte; chamada seguinte (substituição) => agora + prazo_segunda_chamada_min. E-mail confirmado => já 'confirmado'.
create or replace function public.caca_premio_dia_criar(p_edicao text, p_dia date, p_pick jsonb, p_substitui uuid, p_segunda boolean, p_nota text)
 returns uuid language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_conf boolean; v_estado text; v_prazo timestamptz; v_id uuid; v_ator text := coalesce(public.ator_rotulo_atual(), 'Painel');
begin
  v_conf := public.caca_premio_email_ok(p_edicao, p_pick ->> 'pessoa');
  v_estado := case when v_conf then 'confirmado' else 'selecionado' end;
  if not v_conf then
    v_prazo := case when p_segunda
      then now() + make_interval(mins => (public.caca_pcfg('prazo_segunda_chamada_min') #>> '{}')::int)
      else ((p_dia + 1) + make_time((public.caca_pcfg('prazo_confirmacao_proximo_dia_hora') #>> '{}')::int, 0, 0))
           at time zone (public.caca_pcfg('fuso') #>> '{}') end;
  end if;
  insert into public.caca_premio (edicao_codigo, tipo, dia, pessoa, mapa_id, apelido, posicao, estado, prazo_ate, substitui_id,
                                  motivo, semente, detalhe, atualizado_por)
  values (p_edicao, 'voucher_dia', p_dia, p_pick ->> 'pessoa', (p_pick ->> 'mapa_id')::uuid, p_pick ->> 'apelido',
          (p_pick ->> 'pos')::int, v_estado, v_prazo, p_substitui, nullif(btrim(coalesce(p_nota, '')), ''), p_pick ->> 'semente',
          jsonb_build_object('casas', (p_pick ->> 'casas')::int, 'extras', (p_pick ->> 'extras')::int,
                             'desempate', (p_pick ->> 'desempate')::boolean, 'empatados', (p_pick ->> 'empatados')::int,
                             'email_confirmado', v_conf, 'segunda_chamada', p_segunda,
                             'valido_ate', public.caca_pcfg('voucher_validade_ate')),
          v_ator)
  returning id into v_id;
  perform public.caca_evento_gravar(p_edicao, v_id, case when p_segunda then 'chamar_proximo' else 'selecionar' end,
                                    null, jsonb_build_object('estado', v_estado, 'prazo_ate', v_prazo, 'dia', p_dia), p_nota);
  return v_id;
end $$;

revoke all on function public.caca_pcfg(text), public.caca_corte(date), public.caca_total_casas(text),
  public.caca_prng(text, int), public.caca_sorteio_ponderado(text, int[], int), public.caca_premio_email_ok(text, text),
  public.caca_evento_gravar(text, uuid, text, jsonb, jsonb, text), public.caca_premio_json(public.caca_premio, boolean),
  public.caca_escolher_dia(text, date, text), public.caca_premio_dia_criar(text, date, jsonb, uuid, boolean, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------- painel
-- Lê a configuração. Gate dado.ler.
create or replace function public.caca_config_ler(p_secret text) returns jsonb
 language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return (select coalesce(jsonb_object_agg(c.chave, jsonb_build_object('valor', c.valor, 'proposta', c.proposta, 'nota', c.nota,
            'atualizado_em', c.atualizado_em, 'atualizado_por', c.atualizado_por)), '{}'::jsonb) from public.caca_premiacao_config c);
end $$;

-- Grava UMA chave existente (não cria chaves novas), validando tipo/faixa. Gate edicao.gerir. Auditado.
create or replace function public.caca_config_gravar(p_secret text, p_chave text, p_valor jsonb) returns jsonb
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_antes jsonb; v_txt text := p_valor #>> '{}';
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  select valor into v_antes from public.caca_premiacao_config where chave = p_chave for update;
  if not found then raise exception 'chave_desconhecida'; end if;
  begin
    case p_chave
      when 'voucher_dias' then
        if jsonb_typeof(p_valor) <> 'array' or jsonb_array_length(p_valor) not between 1 and 31 then raise exception 'x'; end if;
        if exists (select 1 from jsonb_array_elements(p_valor) e where jsonb_typeof(e) <> 'string') then raise exception 'x'; end if;
        perform (e #>> '{}')::date from jsonb_array_elements(p_valor) e;
      when 'corte_hora_local' then
        if jsonb_typeof(p_valor) <> 'string' or v_txt !~ '^\d{2}:\d{2}$' then raise exception 'x'; end if;
        perform v_txt::time;
      when 'fuso' then
        if jsonb_typeof(p_valor) <> 'string' or not exists (select 1 from pg_timezone_names where name = v_txt) then raise exception 'x'; end if;
      when 'voucher_validade_ate' then
        if jsonb_typeof(p_valor) <> 'string' then raise exception 'x'; end if;
        perform v_txt::date;
      when 'peso_base' then
        if jsonb_typeof(p_valor) <> 'number' or v_txt !~ '^\d{1,5}$' or v_txt::int not between 1 and 10000 then raise exception 'x'; end if;
      when 'ganhadores_final' then
        if jsonb_typeof(p_valor) <> 'number' or v_txt !~ '^\d{1,2}$' or v_txt::int not between 1 and 20 then raise exception 'x'; end if;
      when 'prazo_confirmacao_proximo_dia_hora' then
        if jsonb_typeof(p_valor) <> 'number' or v_txt !~ '^\d{1,2}$' or v_txt::int not between 0 and 23 then raise exception 'x'; end if;
      when 'prazo_segunda_chamada_min' then
        if jsonb_typeof(p_valor) <> 'number' or v_txt !~ '^\d{1,4}$' or v_txt::int not between 1 and 1440 then raise exception 'x'; end if;
      when 'intervalo_carimbo_h' then
        if jsonb_typeof(p_valor) <> 'number' or v_txt !~ '^\d{1,2}$' or v_txt::int not between 0 and 72 then raise exception 'x'; end if;
      when 'email_confirmado_se_sem_coluna' then
        if jsonb_typeof(p_valor) <> 'boolean' then raise exception 'x'; end if;
      else null;
    end case;
  exception when others then raise exception 'valor_invalido';
  end;
  update public.caca_premiacao_config set valor = p_valor, atualizado_em = now(), atualizado_por = coalesce(public.ator_rotulo_atual(), 'Painel')
   where chave = p_chave;
  perform public.caca_evento_gravar(null, null, 'config_gravar', jsonb_build_object('chave', p_chave, 'valor', v_antes),
                                    jsonb_build_object('chave', p_chave, 'valor', p_valor));
  return jsonb_build_object('ok', true, 'chave', p_chave, 'valor', p_valor);
end $$;

-- Congela o ranking do dia (uma vez só, imutável) e seleciona o 1º elegível. Gate edicao.gerir.
-- Idempotente: se o dia já tem prêmio ativo, devolve o existente (ja_apurado = true). p_semente opcional (só usada em empate).
create or replace function public.caca_apurar_dia(p_secret text, p_edicao text, p_dia date, p_semente text default null) returns jsonb
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_rel boolean; v_corte timestamptz; v_snap public.caca_apuracao_dia%rowtype; v_rank jsonb; v_ja boolean := true;
        v_ex public.caca_premio%rowtype; v_pick jsonb; v_id uuid; v_prem public.caca_premio%rowtype;
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  if coalesce(btrim(p_edicao), '') = '' or p_dia is null then raise exception 'parametro_invalido'; end if;
  if not (public.caca_pcfg('voucher_dias') @> to_jsonb(p_dia::text)) then raise exception 'dia_fora_do_periodo'; end if;
  v_corte := public.caca_corte(p_dia);
  if v_corte > now() then raise exception 'dia_nao_encerrado'; end if;
  perform pg_advisory_xact_lock(hashtext('caca_premio:' || p_edicao));

  select * into v_snap from public.caca_apuracao_dia where edicao_codigo = p_edicao and dia = p_dia;
  if v_snap.dia is null then
    v_ja := false;
    select coalesce(jsonb_agg(jsonb_build_object('pos', r.pos, 'pessoa', r.pessoa, 'mapa_id', r.mapa_id, 'apelido', r.apelido,
             'casas', r.casas, 'extras', r.extras, 'carimbos', r.carimbos) order by r.pos, r.pessoa), '[]'::jsonb)
      into v_rank from public.caca_ranking_v2(p_edicao, v_corte) r;
    insert into public.caca_apuracao_dia (edicao_codigo, dia, corte, total_casas, ranking, hash, criado_por)
    values (p_edicao, p_dia, v_corte, public.caca_total_casas(p_edicao), v_rank,
            encode(extensions.digest(p_edicao || '|' || p_dia::text || '|' || v_corte::text || '|' || v_rank::text, 'sha256'), 'hex'),
            coalesce(public.ator_rotulo_atual(), 'Painel'))
    returning * into v_snap;
    perform public.caca_evento_gravar(p_edicao, null, 'apurar_dia', null,
              jsonb_build_object('dia', p_dia, 'corte', v_corte, 'hash', v_snap.hash, 'participantes', jsonb_array_length(v_rank)));
  end if;

  select * into v_ex from public.caca_premio
   where edicao_codigo = p_edicao and tipo = 'voucher_dia' and dia = p_dia and estado in ('selecionado', 'confirmado', 'entregue');
  if v_ex.id is null then
    v_pick := public.caca_escolher_dia(p_edicao, p_dia, p_semente);
    if v_pick is not null then
      v_id := public.caca_premio_dia_criar(p_edicao, p_dia, v_pick, null, false, null);
      select * into v_ex from public.caca_premio where id = v_id;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'edicao', p_edicao, 'dia', p_dia,
    'snapshot', jsonb_build_object('hash', v_snap.hash, 'corte', v_snap.corte, 'criado_em', v_snap.criado_em,
                                   'participantes', jsonb_array_length(v_snap.ranking), 'ja_existia', v_ja),
    'ja_apurado', (v_ex.id is not null and v_ja),
    'premio', case when v_ex.id is not null then public.caca_premio_json(v_ex, v_rel) end,
    'motivo', case when v_ex.id is null then 'sem_elegivel' end);
end $$;

-- Ações sobre um prêmio. Gate edicao.gerir. Transições:
--   confirmar  : selecionado -> confirmado
--   entregar   : confirmado  -> entregue
--   expirar    : selecionado -> expirado
--   cancelar   : selecionado|confirmado -> cancelado
--   substituir : (voucher_dia) selecionado|confirmado|expirado -> substituido E chama o próximo elegível do mesmo dia
--                (prazo = agora + prazo_segunda_chamada_min; sem próximo => erro sem_proximo_elegivel e nada muda)
create or replace function public.caca_premio_acao(p_secret text, p_premio uuid, p_acao text, p_nota text default null) returns jsonb
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare p public.caca_premio%rowtype; v_rel boolean; v_ed text; v_novo uuid; v_pick jsonb; v_estado text; v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
        v_novo_row public.caca_premio%rowtype; v_ator text := coalesce(public.ator_rotulo_atual(), 'Painel');
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  select edicao_codigo into v_ed from public.caca_premio where id = p_premio;
  if v_ed is null then raise exception 'premio_nao_encontrado'; end if;
  perform pg_advisory_xact_lock(hashtext('caca_premio:' || v_ed));
  select * into p from public.caca_premio where id = p_premio for update;

  v_estado := case p_acao
    when 'confirmar' then case when p.estado = 'selecionado' then 'confirmado' end
    when 'entregar' then case when p.estado = 'confirmado' then 'entregue' end
    when 'expirar' then case when p.estado = 'selecionado' then 'expirado' end
    when 'cancelar' then case when p.estado in ('selecionado', 'confirmado') then 'cancelado' end
    when 'substituir' then case when p.tipo = 'voucher_dia' and p.estado in ('selecionado', 'confirmado', 'expirado') then 'substituido' end
    else 'acao_invalida' end;
  if v_estado = 'acao_invalida' then raise exception 'acao_invalida'; end if;
  if v_estado is null then raise exception 'transicao_invalida'; end if;

  update public.caca_premio set estado = v_estado, atualizado_em = now(), atualizado_por = v_ator,
         prazo_ate = case when v_estado in ('confirmado', 'entregue') then null else prazo_ate end,
         motivo = coalesce(v_nota, motivo)
   where id = p.id;
  perform public.caca_evento_gravar(p.edicao_codigo, p.id, p_acao, jsonb_build_object('estado', p.estado, 'prazo_ate', p.prazo_ate),
                                    jsonb_build_object('estado', v_estado), v_nota);

  if p_acao = 'substituir' then
    v_pick := public.caca_escolher_dia(p.edicao_codigo, p.dia, null);
    if v_pick is null then raise exception 'sem_proximo_elegivel'; end if;
    v_novo := public.caca_premio_dia_criar(p.edicao_codigo, p.dia, v_pick, p.id, true, v_nota);
    select * into v_novo_row from public.caca_premio where id = v_novo;
  end if;

  select * into p from public.caca_premio where id = p.id;
  return jsonb_build_object('ok', true, 'premio', public.caca_premio_json(p, v_rel),
                            'novo_premio', case when v_novo_row.id is not null then public.caca_premio_json(v_novo_row, v_rel) end);
end $$;

-- Lista fotos dos dias, prêmios e os últimos 200 eventos. Gate dado.ler; e-mail/WhatsApp só com relatorio.ler.
create or replace function public.caca_premio_listar(p_secret text, p_edicao text) returns jsonb
 language plpgsql stable security definer set search_path to 'public'
as $$
declare v_rel boolean;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  return jsonb_build_object(
    'premios', (select coalesce(jsonb_agg(public.caca_premio_json(p, v_rel) order by p.tipo, p.dia, p.posicao, p.criado_em), '[]'::jsonb)
                  from public.caca_premio p where p.edicao_codigo = p_edicao),
    'apuracoes', (select coalesce(jsonb_agg(jsonb_build_object('dia', a.dia, 'corte', a.corte, 'hash', a.hash,
                    'total_casas', a.total_casas, 'participantes', jsonb_array_length(a.ranking),
                    'criado_em', a.criado_em, 'criado_por', a.criado_por,
                    'ranking', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('posicao', (e ->> 'pos')::int,
                                  'apelido', e ->> 'apelido', 'casas', (e ->> 'casas')::int, 'extras', (e ->> 'extras')::int,
                                  'email', case when v_rel then e ->> 'pessoa' end)) order by (e ->> 'pos')::int, e ->> 'apelido'), '[]'::jsonb)
                                  from jsonb_array_elements(a.ranking) e where (e ->> 'pos')::int <= 10)) order by a.dia), '[]'::jsonb)
                    from public.caca_apuracao_dia a where a.edicao_codigo = p_edicao),
    'eventos', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'premio_id', x.premio_id, 'acao', x.acao, 'ator', x.ator,
                    'antes', x.antes, 'depois', x.depois, 'nota', x.nota, 'quando', x.quando) order by x.id desc), '[]'::jsonb)
                  from (select * from public.caca_evento v where v.edicao_codigo = p_edicao or v.edicao_codigo is null
                         order by v.id desc limit 200) x));
end $$;

-- Prêmio final (regulamento em src/edicao/cartoon/regulamento.js). Gate edicao.gerir.
--   · concorrem os que validaram TODAS as casas (casas >= total);
--   · até N (ganhadores_final) completos: todos ganham; as vagas restantes vão para quem tem mais casas, depois mais extras
--     (carimbos), persistindo o empate, sorteio entre os empatados;
--   · mais de N completos: sorteio ponderado SEM reposição, peso = peso_base + extras, PRNG de sha256(semente||índice).
-- p_simular = true (padrão) NUNCA grava nada (nem evento). Só p_simular = false grava (caca_premio tipo final + eventos),
-- e só uma vez por edição (sorteio_final_ja_realizado). p_semente é obrigatória; anote-a para quem quiser conferir.
create or replace function public.caca_sorteio_final(p_secret text, p_edicao text, p_semente text, p_simular boolean default true) returns jsonb
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare
  v_rel boolean; v_total int; v_n int; v_base int; v_sem text := btrim(coalesce(p_semente, ''));
  a_pes text[]; a_ape text[]; a_cas int[]; a_ext int[]; a_wpp text[]; a_mid uuid[];
  v_pool int[]; v_k int; v_win int[] := '{}'; v_mot text[] := '{}'; v_rest int[]; v_g int[]; v_falta int; v_pick int[];
  x int; j int; v_grp int := 0; v_conc jsonb; v_gan jsonb := '[]'::jsonb; v_hash text; v_id uuid; v_i int;
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_sem = '' then raise exception 'semente_obrigatoria'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  v_total := public.caca_total_casas(p_edicao);
  v_n := (public.caca_pcfg('ganhadores_final') #>> '{}')::int;
  v_base := (public.caca_pcfg('peso_base') #>> '{}')::int;
  if not coalesce(p_simular, true) then
    perform pg_advisory_xact_lock(hashtext('caca_premio:' || p_edicao));
    if exists (select 1 from public.caca_premio where edicao_codigo = p_edicao and tipo = 'final' and estado in ('selecionado', 'confirmado', 'entregue'))
      then raise exception 'sorteio_final_ja_realizado'; end if;
  end if;

  -- Lista fixa e reproduzível: ordenada por e-mail normalizado.
  select array_agg(r.pessoa order by r.pessoa), array_agg(r.apelido order by r.pessoa), array_agg(r.casas order by r.pessoa),
         array_agg(r.extras order by r.pessoa), array_agg(r.whatsapp order by r.pessoa), array_agg(r.mapa_id order by r.pessoa)
    into a_pes, a_ape, a_cas, a_ext, a_wpp, a_mid
    from public.caca_ranking_v2(p_edicao) r;

  v_pool := array(select i from generate_subscripts(a_pes, 1) i where v_total > 0 and a_cas[i] >= v_total order by i);
  v_k := coalesce(cardinality(v_pool), 0);

  if v_k <= v_n then
    -- todos os completos ganham
    v_pool := array(select i from unnest(v_pool) i order by a_ext[i] desc, i);
    v_win := v_pool;
    for j in 1 .. v_k loop v_mot := v_mot || 'completo'::text; end loop;
    v_falta := v_n - v_k;
    v_rest := array(select i from generate_subscripts(a_pes, 1) i where v_total > 0 and not (i = any(v_pool)) order by a_cas[i] desc, a_ext[i] desc, i);
    while v_falta > 0 and coalesce(cardinality(v_rest), 0) > 0 loop
      v_g := array(select i from unnest(v_rest) i where a_cas[i] = a_cas[v_rest[1]] and a_ext[i] = a_ext[v_rest[1]] order by i);
      if cardinality(v_g) <= v_falta then
        v_win := v_win || v_g;
        for j in 1 .. cardinality(v_g) loop v_mot := v_mot || 'vaga_restante'::text; end loop;
        v_falta := v_falta - cardinality(v_g);
      else
        v_grp := v_grp + 1;
        v_pick := public.caca_sorteio_ponderado(v_sem || ':vagas:' || v_grp, array_fill(1, array[cardinality(v_g)]), v_falta);
        for j in 1 .. cardinality(v_pick) loop
          v_win := v_win || v_g[v_pick[j]];
          v_mot := v_mot || 'vaga_restante_sorteio'::text;
        end loop;
        v_falta := 0;
      end if;
      v_rest := array(select i from unnest(v_rest) i where not (i = any(v_g)) order by a_cas[i] desc, a_ext[i] desc, i);
    end loop;
  else
    v_pick := public.caca_sorteio_ponderado(v_sem,
                array(select v_base + a_ext[i] from unnest(v_pool) with ordinality u(i, o) order by o), v_n);
    for j in 1 .. cardinality(v_pick) loop
      v_win := v_win || v_pool[v_pick[j]];
      v_mot := v_mot || 'sorteio_ponderado'::text;
    end loop;
  end if;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('apelido', a_ape[i], 'casas', a_cas[i], 'extras', a_ext[i],
            'peso', v_base + a_ext[i], 'email', case when v_rel then a_pes[i] end, 'whatsapp', case when v_rel then a_wpp[i] end))
            order by a_pes[i]), '[]'::jsonb) into v_conc from unnest(v_pool) i;
  v_hash := encode(extensions.digest(v_sem || '|' || v_n || '|' || v_base || '|' ||
              coalesce((select string_agg(a_pes[i] || ':' || (v_base + a_ext[i]), ',' order by a_pes[i]) from unnest(v_pool) i), ''), 'sha256'), 'hex');

  for j in 1 .. coalesce(cardinality(v_win), 0) loop
    v_i := v_win[j];
    v_gan := v_gan || jsonb_strip_nulls(jsonb_build_object('posicao', j, 'apelido', a_ape[v_i], 'casas', a_cas[v_i], 'extras', a_ext[v_i],
               'peso', v_base + a_ext[v_i], 'motivo', v_mot[j],
               'email', case when v_rel then a_pes[v_i] end, 'whatsapp', case when v_rel then a_wpp[v_i] end));
    if not coalesce(p_simular, true) then
      insert into public.caca_premio (edicao_codigo, tipo, pessoa, mapa_id, apelido, posicao, estado, semente, detalhe, atualizado_por)
      values (p_edicao, 'final', a_pes[v_i], a_mid[v_i], a_ape[v_i], j, 'selecionado', v_sem,
              jsonb_build_object('casas', a_cas[v_i], 'extras', a_ext[v_i], 'peso', v_base + a_ext[v_i], 'motivo', v_mot[j],
                                 'hash_verificacao', v_hash),
              coalesce(public.ator_rotulo_atual(), 'Painel'))
      returning id into v_id;
      perform public.caca_evento_gravar(p_edicao, v_id, 'sorteio_final', null,
                jsonb_build_object('estado', 'selecionado', 'posicao', j, 'motivo', v_mot[j]));
    end if;
  end loop;
  if not coalesce(p_simular, true) then
    perform public.caca_evento_gravar(p_edicao, null, 'sorteio_final_realizado', null,
              jsonb_build_object('semente', v_sem, 'hash_verificacao', v_hash, 'concorrentes', v_k,
                                 'ganhadores', (select jsonb_agg(g ->> 'apelido' order by (g ->> 'posicao')::int) from jsonb_array_elements(v_gan) g)));
  end if;

  return jsonb_build_object('simulacao', coalesce(p_simular, true), 'edicao', p_edicao, 'semente', v_sem,
    'total_casas', v_total, 'ganhadores_final', v_n, 'peso_base', v_base, 'completos', v_k,
    'regra', case when v_k <= v_n then 'todos_completos_ganham' else 'sorteio_ponderado' end,
    'hash_verificacao', v_hash, 'concorrentes', v_conc, 'ganhadores', v_gan);
end $$;

revoke all on function public.caca_config_ler(text), public.caca_config_gravar(text, text, jsonb),
  public.caca_apurar_dia(text, text, date, text), public.caca_premio_acao(text, uuid, text, text),
  public.caca_premio_listar(text, text), public.caca_sorteio_final(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.caca_config_ler(text), public.caca_config_gravar(text, text, jsonb),
  public.caca_apurar_dia(text, text, date, text), public.caca_premio_acao(text, uuid, text, text),
  public.caca_premio_listar(text, text), public.caca_sorteio_final(text, text, text, boolean) to anon, authenticated;
