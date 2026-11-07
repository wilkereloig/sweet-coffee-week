-- Caça aos Carimbos: cada pessoa selecionada no voucher do dia escolhe 1 combo
-- digital entre 5 casas doadoras. O QR e a validação continuam usando o fluxo
-- existente de voucher_virtual_ver / marca_usar_voucher.
-- Esta migration é aditiva e deve ser aplicada somente depois da revisão.

create table if not exists public.caca_premio_voucher_pool (
  id uuid primary key default gen_random_uuid(),
  edicao_codigo text not null,
  participacao_id uuid not null references public.participacoes(id) on delete restrict,
  voucher_id uuid not null unique references public.vouchers(id) on delete restrict,
  premio_id uuid unique references public.caca_premio(id) on delete restrict,
  mapa_id uuid references public.mapas_lover(id) on delete set null,
  estado text not null default 'disponivel' check (estado in ('disponivel', 'escolhido', 'usado', 'cancelado')),
  criado_em timestamptz not null default now(),
  escolhido_em timestamptz
);
create unique index if not exists caca_premio_pool_uma_opcao_por_casa
  on public.caca_premio_voucher_pool (edicao_codigo, participacao_id)
  where estado in ('disponivel', 'escolhido');
create index if not exists caca_premio_pool_estado
  on public.caca_premio_voucher_pool (edicao_codigo, estado);
alter table public.caca_premio_voucher_pool enable row level security;
revoke all on table public.caca_premio_voucher_pool from public, anon, authenticated;

-- Reserva um voucher digital disponível de cada uma das cinco casas combinadas.
-- A escolha é por nome da marca para não gravar UUID gerado em migration.
create or replace function public.caca_premio_voucher_pool_configurar(p_secret text, p_edicao text)
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare
  v_alias text;
  v_pa uuid;
  v_voucher uuid;
  v_nome text;
  v_pool int;
  v_pool_id uuid;
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  perform pg_advisory_xact_lock(hashtext('caca_voucher_pool:' || p_edicao));

  select count(*) into v_pool from public.caca_premio_voucher_pool where edicao_codigo = p_edicao;
  if v_pool > 0 then
    if v_pool <> 5 then raise exception 'pool_voucher_incompleto'; end if;
    return public.caca_premio_voucher_pool_listar(p_secret, p_edicao);
  end if;

  foreach v_alias in array array['vivianne', 'sabor de pão', 'maestro', 'cupcake', 'padoca'] loop
    select pa.id, p.nome_marca into v_pa, v_nome
      from public.participacoes pa
      join public.participantes p on p.id = pa.participante_id
     where pa.edicao_codigo = p_edicao
       and (lower(p.nome_marca) like '%' || v_alias || '%')
       and p.arquivado_em is null and pa.status_cadastro is distinct from 'encerrado'
     order by p.nome_marca
     limit 1;
    if v_pa is null then raise exception 'participante_voucher_ausente:%', v_alias; end if;

    select v.id into v_voucher
      from public.vouchers v
     where v.participacao_id = v_pa and v.edicao_codigo = p_edicao
       and v.canal = 'virtual' and v.status = 'disponivel' and v.link_token is not null
       and not exists (select 1 from public.caca_premio_voucher_pool cp where cp.voucher_id = v.id)
     order by v.created_at, v.id
     limit 1 for update skip locked;
    if v_voucher is null then raise exception 'sem_voucher_digital_disponivel:%', v_nome; end if;

    insert into public.caca_premio_voucher_pool (edicao_codigo, participacao_id, voucher_id)
    values (p_edicao, v_pa, v_voucher)
    returning id into v_pool_id;
    perform set_config('app.caca_premio_pool_id', v_pool_id::text, true);
    update public.vouchers set status = 'destinado', destinado_em = now(), responsavel_rotulo = 'Caça aos Carimbos',
           observacao = 'Reservado para escolha dos ganhadores da Caça aos Carimbos.'
     where id = v_voucher;
    v_pa := null; v_voucher := null; v_nome := null;
  end loop;

  perform public.caca_evento_gravar(p_edicao, null, 'vouchers_escolha_preparados', null,
    jsonb_build_object('quantidade', 5, 'casas', array['Vivianne Castro Doces', 'Sabor de Pão', 'O Maestro Café', 'Mr. Cupcake Confeitaria', 'Padoca do Bosque']));
  return public.caca_premio_voucher_pool_listar(p_secret, p_edicao);
end $$;

create or replace function public.caca_premio_voucher_pool_listar(p_secret text, p_edicao text)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'edicao.gerir') and not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return jsonb_build_object('opcoes', coalesce((
    select jsonb_agg(jsonb_build_object('id', cp.id, 'marca', p.nome_marca, 'estado', cp.estado,
      'escolhido_em', cp.escolhido_em)
      order by p.nome_marca)
      from public.caca_premio_voucher_pool cp
      join public.participacoes pa on pa.id = cp.participacao_id
      join public.participantes p on p.id = pa.participante_id
     where cp.edicao_codigo = p_edicao), '[]'::jsonb));
end $$;

revoke all on function public.caca_premio_voucher_pool_configurar(text, text) from public, anon, authenticated;
revoke all on function public.caca_premio_voucher_pool_listar(text, text) from public, anon, authenticated;
grant execute on function public.caca_premio_voucher_pool_configurar(text, text) to anon, authenticated;
grant execute on function public.caca_premio_voucher_pool_listar(text, text) to anon, authenticated;

-- Não deixa sortear o voucher do dia sem ao menos uma opção digital para o ganhador.
create or replace function public.caca_premio_voucher_pool_exigir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  perform pg_advisory_xact_lock(hashtext('caca_voucher_pool:' || new.edicao_codigo));
  if new.tipo = 'voucher_dia' and new.estado in ('selecionado', 'confirmado')
     and not exists (select 1 from public.caca_premio_voucher_pool cp join public.vouchers v on v.id = cp.voucher_id
                      where cp.edicao_codigo = new.edicao_codigo and cp.estado = 'disponivel'
                        and v.canal = 'virtual' and v.status = 'destinado' and v.responsavel_rotulo = 'Caça aos Carimbos'
                        and v.link_token is not null) then
    raise exception 'vouchers_premio_indisponiveis';
  end if;
  return new;
end $$;
revoke all on function public.caca_premio_voucher_pool_exigir() from public, anon, authenticated;
drop trigger if exists caca_premio_voucher_pool_exigir on public.caca_premio;
create trigger caca_premio_voucher_pool_exigir before insert on public.caca_premio
  for each row execute function public.caca_premio_voucher_pool_exigir();

-- Aviso aparece na central assim que o resultado diário é gravado, mesmo se o
-- participante ainda precisar confirmar o e-mail antes de escolher o voucher.
create or replace function public.caca_premio_aviso_confirmado()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_aviso uuid; v_titulo text; v_corpo text;
begin
  if new.tipo <> 'voucher_dia' or new.mapa_id is null or new.estado not in ('selecionado', 'confirmado') then return new; end if;
  if tg_op = 'UPDATE' and old.estado is not distinct from new.estado then return new; end if;

  v_titulo := 'Você ganhou o direito de escolher um voucher!';
  v_corpo := 'O resultado do dia ' || to_char(new.dia, 'DD/MM') || ' saiu. Abra Prêmios para confirmar seu e-mail, se necessário, e escolher um combo entre as casas disponíveis.';
  insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, estado, origem, chave_dedupe,
                                 criado_por, enviado_em, enviado_por, alvos)
  values (new.edicao_codigo, 'premio', left(v_titulo, 80), left(v_corpo, 240), '/cartoon/mapa?painel=premios',
          jsonb_build_object('tipo', 'mapas', 'ids', jsonb_build_array(new.mapa_id)), 'enviado', 'automatico',
          'premio:' || new.id || ':selecionado', 'premio', now(), 'premio', 1)
  on conflict (chave_dedupe) do nothing returning id into v_aviso;
  if v_aviso is not null then
    insert into public.caca_aviso_entrega (aviso_id, mapa_id) values (v_aviso, new.mapa_id) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function public.caca_premio_aviso_confirmado() from public, anon, authenticated;
drop trigger if exists caca_premio_aviso_confirmado on public.caca_premio;
create trigger caca_premio_aviso_confirmado after insert or update of estado on public.caca_premio
  for each row execute function public.caca_premio_aviso_confirmado();

-- Prêmios e opções são lidos somente pelo mapa autenticado com sua chave pessoal.
create or replace function public.caca_meus_premios(p_chave text)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then
    return jsonb_build_object('premios', '[]'::jsonb);
  end if;

  return jsonb_build_object('premios', coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', p.id, 'tipo', p.tipo, 'dia', p.dia, 'estado', p.estado, 'prazo_ate', p.prazo_ate,
      'valido_ate', p.detalhe ->> 'valido_ate',
      'email_confirmado', public.caca_premio_email_ok(p.edicao_codigo, p.pessoa),
      'voucher', (select jsonb_build_object('marca', marca.nome_marca, 'token', v.link_token, 'estado', v.status)
                    from public.caca_premio_voucher_pool cp
                    join public.vouchers v on v.id = cp.voucher_id
                    join public.participacoes pa on pa.id = cp.participacao_id
                    join public.participantes marca on marca.id = pa.participante_id
                   where cp.premio_id = p.id and cp.mapa_id = m.id),
      'opcoes', case when p.tipo = 'voucher_dia' and p.estado = 'confirmado'
                           and public.caca_premio_email_ok(p.edicao_codigo, p.pessoa)
        then (select coalesce(jsonb_agg(jsonb_build_object('id', cp.id, 'marca', marca.nome_marca) order by marca.nome_marca), '[]'::jsonb)
                from public.caca_premio_voucher_pool cp
                join public.participacoes pa on pa.id = cp.participacao_id
                join public.participantes marca on marca.id = pa.participante_id
               where cp.edicao_codigo = p.edicao_codigo and cp.estado = 'disponivel')
        else '[]'::jsonb end
    )) order by p.criado_em desc), '[]'::jsonb)
      from public.caca_premio p
     where p.edicao_codigo = m.edicao_codigo and p.mapa_id = m.id
       and p.estado in ('selecionado', 'confirmado', 'entregue')));
end $$;
revoke all on function public.caca_meus_premios(text) from public, anon, authenticated;
grant execute on function public.caca_meus_premios(text) to anon, authenticated;

create or replace function public.caca_meus_premios_escolher_voucher(p_chave text, p_premio uuid, p_opcao uuid)
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; p public.caca_premio%rowtype; cp public.caca_premio_voucher_pool%rowtype; v public.vouchers%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null or m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then raise exception 'mapa_desconhecido'; end if;
  perform pg_advisory_xact_lock(hashtext('caca_voucher_pool:' || m.edicao_codigo));
  select * into p from public.caca_premio where id = p_premio and edicao_codigo = m.edicao_codigo and mapa_id = m.id for update;
  if p.id is null then raise exception 'premio_nao_encontrado'; end if;
  if p.tipo <> 'voucher_dia' then raise exception 'tipo_invalido'; end if;
  if p.estado <> 'confirmado' then
    if p.estado = 'selecionado' and not public.caca_premio_email_ok(p.edicao_codigo, p.pessoa) then raise exception 'email_nao_confirmado'; end if;
    raise exception 'premio_nao_confirmado';
  end if;
  if not public.caca_premio_email_ok(p.edicao_codigo, p.pessoa) then raise exception 'email_nao_confirmado'; end if;
  if exists (select 1 from public.caca_premio_voucher_pool where premio_id = p.id) then raise exception 'voucher_ja_escolhido'; end if;

  select * into cp from public.caca_premio_voucher_pool where id = p_opcao and edicao_codigo = p.edicao_codigo and estado = 'disponivel' for update;
  if cp.id is null then raise exception 'voucher_opcao_indisponivel'; end if;
  select * into v from public.vouchers where id = cp.voucher_id and canal = 'virtual' and status = 'destinado'
    and responsavel_rotulo = 'Caça aos Carimbos' and link_token is not null for update;
  if v.id is null then raise exception 'voucher_opcao_indisponivel'; end if;

  perform set_config('app.caca_premio_pool_id', cp.id::text, true);
  update public.vouchers set status = 'destinado', destinado_em = now(), responsavel_rotulo = 'Caça aos Carimbos',
         observacao = 'Prêmio da Caça aos Carimbos · ' || coalesce(p.apelido, 'participante')
   where id = v.id;
  update public.caca_premio_voucher_pool set estado = 'escolhido', premio_id = p.id, mapa_id = m.id, escolhido_em = now()
   where id = cp.id;
  perform public.caca_evento_gravar(p.edicao_codigo, p.id, 'voucher_escolhido_pelo_ganhador', null,
    jsonb_build_object('casa', (select nome_marca from public.participantes where id = (select participante_id from public.participacoes where id = cp.participacao_id))));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.caca_meus_premios_escolher_voucher(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.caca_meus_premios_escolher_voucher(text, uuid, uuid) to anon, authenticated;

-- Quando a casa valida o QR, o prêmio pessoal também passa para entregue.
create or replace function public.caca_premio_voucher_pool_usado()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare cp public.caca_premio_voucher_pool%rowtype; p public.caca_premio%rowtype;
begin
  if new.status <> 'utilizado' or old.status = new.status then return new; end if;
  update public.caca_premio_voucher_pool set estado = 'usado'
   where voucher_id = new.id and estado = 'escolhido' returning * into cp;
  if cp.id is null or cp.premio_id is null then return new; end if;
  update public.caca_premio set estado = 'entregue', atualizado_em = now(), atualizado_por = 'Validação do QR', prazo_ate = null
   where id = cp.premio_id and estado = 'confirmado' returning * into p;
  if p.id is not null then
    perform public.caca_evento_gravar(p.edicao_codigo, p.id, 'voucher_validado_na_casa', null,
      jsonb_build_object('estado', 'entregue', 'casa', (select nome_marca from public.participantes where id = (select participante_id from public.participacoes where id = cp.participacao_id))));
  end if;
  return new;
end $$;
revoke all on function public.caca_premio_voucher_pool_usado() from public, anon, authenticated;
drop trigger if exists caca_premio_voucher_pool_usado on public.vouchers;
create trigger caca_premio_voucher_pool_usado after update of status on public.vouchers
  for each row execute function public.caca_premio_voucher_pool_usado();

-- Os vouchers reservados não podem ser destinados por outro caminho do painel.
create or replace function public.caca_premio_voucher_pool_proteger()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_pool uuid;
        v_estado text;
begin
  if new.status is distinct from old.status then
    select id, estado into v_pool, v_estado from public.caca_premio_voucher_pool
     where voucher_id = old.id and estado in ('disponivel', 'escolhido') for update;
    if v_pool is not null
       and not (v_estado = 'escolhido' and old.status = 'destinado' and new.status = 'utilizado')
       and current_setting('app.caca_premio_pool_id', true) is distinct from v_pool::text then
      raise exception 'voucher_reservado_caca';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.caca_premio_voucher_pool_proteger() from public, anon, authenticated;
drop trigger if exists caca_premio_voucher_pool_proteger on public.vouchers;
create trigger caca_premio_voucher_pool_proteger before update of status on public.vouchers
  for each row execute function public.caca_premio_voucher_pool_proteger();
