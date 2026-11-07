-- Carimbo exclusivo do Sicredi pela participação na campanha "Ter com quem contar".
-- O participante envia um print da publicação; só a organização transforma o pedido em carimbo.
-- O registro não referencia mapa por FK para que apagar/recuperar um mapa não apague o histórico da pessoa.

create table if not exists public.caca_sicredi_campanha_pedido (
  id uuid primary key default gen_random_uuid(),
  edicao_codigo text not null references public.edicoes(codigo) on update cascade,
  pessoa text not null,
  mapa_id uuid not null,
  apelido text not null,
  estado text not null default 'rascunho' check (estado in ('rascunho', 'pendente', 'aprovado', 'negado')),
  imagem_path text,
  imagem_reservas int not null default 0 check (imagem_reservas between 0 and 5),
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  decidido_em timestamptz,
  decidido_por text,
  decidido_user uuid,
  decisao_nota text check (decisao_nota is null or char_length(decisao_nota) <= 200),
  constraint caca_sicredi_prova_estado check (estado not in ('pendente', 'aprovado') or (imagem_path is not null and enviado_em is not null)),
  constraint caca_sicredi_decisao_estado check ((estado in ('aprovado', 'negado')) = (decidido_em is not null))
);

create unique index if not exists caca_sicredi_campanha_pedido_pessoa_ativo
  on public.caca_sicredi_campanha_pedido (edicao_codigo, pessoa)
  where estado in ('rascunho', 'pendente', 'aprovado');
create index if not exists caca_sicredi_campanha_pedido_fila
  on public.caca_sicredi_campanha_pedido (edicao_codigo, estado, enviado_em desc);

alter table public.caca_sicredi_campanha_pedido enable row level security;
revoke all on table public.caca_sicredi_campanha_pedido from public, anon, authenticated;

-- O participante cria um rascunho para reservar um caminho de upload; ele só chega à fila após o arquivo ser validado.
create or replace function public.caca_sicredi_campanha_pedir(p_chave text)
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; e public.caca_sicredi_campanha_pedido%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then
    return jsonb_build_object('ok', false, 'motivo', 'mapa_nao_principal');
  end if;
  if m.edicao_codigo <> '2026.2' then return jsonb_build_object('ok', false, 'motivo', 'edicao_invalida'); end if;
  if timezone('America/Fortaleza', now())::date > date '2026-11-11' then
    return jsonb_build_object('ok', false, 'motivo', 'campanha_encerrada');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sicredi:' || m.edicao_codigo || ':' || m.email_norm, 0));
  select * into e from public.caca_sicredi_campanha_pedido
   where edicao_codigo = m.edicao_codigo and pessoa = m.email_norm
     and estado in ('rascunho', 'pendente', 'aprovado') for update;
  if e.id is not null then
    if e.estado = 'aprovado' then return jsonb_build_object('ok', false, 'motivo', 'ja_aprovado'); end if;
    if e.estado = 'pendente' then return jsonb_build_object('ok', false, 'motivo', 'ja_enviado'); end if;
    return jsonb_build_object('ok', true, 'id', e.id, 'estado', e.estado, 'existente', true);
  end if;

  insert into public.caca_sicredi_campanha_pedido (edicao_codigo, pessoa, mapa_id, apelido)
  values (m.edicao_codigo, m.email_norm, m.id, coalesce(nullif(btrim(m.apelido), ''), 'Participante'))
  returning * into e;
  perform public.caca_evento_gravar(e.edicao_codigo, null, 'sicredi_pedido_criado', null,
    jsonb_build_object('pedido', e.id), null);
  return jsonb_build_object('ok', true, 'id', e.id, 'estado', e.estado, 'existente', false);
end $$;
revoke all on function public.caca_sicredi_campanha_pedir(text) from public, anon, authenticated;
grant execute on function public.caca_sicredi_campanha_pedir(text) to anon, authenticated;

-- Só a Edge Function com service_role pode reservar um caminho dentro do bucket privado.
create or replace function public.caca_sicredi_campanha_imagem_reservar(p_chave text, p_id uuid, p_ext text)
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; e public.caca_sicredi_campanha_pedido%rowtype; v_ext text := lower(btrim(coalesce(p_ext, ''))); v_path text;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if v_ext not in ('jpg', 'png', 'webp') then return jsonb_build_object('ok', false, 'motivo', 'formato_invalido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then
    return jsonb_build_object('ok', false, 'motivo', 'mapa_nao_principal');
  end if;
  select * into e from public.caca_sicredi_campanha_pedido
   where id = p_id and edicao_codigo = m.edicao_codigo and pessoa = m.email_norm for update;
  if e.id is null then return jsonb_build_object('ok', false, 'motivo', 'pedido_nao_encontrado'); end if;
  if e.estado <> 'rascunho' or e.imagem_path is not null then return jsonb_build_object('ok', false, 'motivo', 'transicao_invalida'); end if;
  if e.imagem_reservas >= 5 then return jsonb_build_object('ok', false, 'motivo', 'limite_imagem'); end if;
  v_path := e.edicao_codigo || '/' || e.id || '/' || gen_random_uuid() || '.' || v_ext;
  update public.caca_sicredi_campanha_pedido set imagem_reservas = imagem_reservas + 1 where id = e.id;
  return jsonb_build_object('ok', true, 'path', v_path);
end $$;
revoke all on function public.caca_sicredi_campanha_imagem_reservar(text, uuid, text) from public, anon, authenticated;
grant execute on function public.caca_sicredi_campanha_imagem_reservar(text, uuid, text) to service_role;

-- Confirma o arquivo depois do upload assinado; a fila só recebe prova existente e abaixo de 3 MB.
create or replace function public.caca_sicredi_campanha_anexar(p_chave text, p_id uuid, p_path text)
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; e public.caca_sicredi_campanha_pedido%rowtype; o record;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then
    return jsonb_build_object('ok', false, 'motivo', 'mapa_nao_principal');
  end if;
  select * into e from public.caca_sicredi_campanha_pedido
   where id = p_id and edicao_codigo = m.edicao_codigo and pessoa = m.email_norm for update;
  if e.id is null then return jsonb_build_object('ok', false, 'motivo', 'pedido_nao_encontrado'); end if;
  if e.estado <> 'rascunho' or e.imagem_path is not null then return jsonb_build_object('ok', false, 'motivo', 'transicao_invalida'); end if;
  if p_path is null or split_part(p_path, '/', 1) <> e.edicao_codigo or split_part(p_path, '/', 2) <> e.id::text
     or p_path !~ '^[a-z0-9][a-z0-9._-]*/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then
    return jsonb_build_object('ok', false, 'motivo', 'imagem_invalida');
  end if;
  select ob.name, coalesce((ob.metadata ->> 'size')::bigint, 0) tam into o
    from storage.objects ob where ob.bucket_id = 'caca-delivery' and ob.name = p_path;
  if o.name is null then return jsonb_build_object('ok', false, 'motivo', 'imagem_ausente'); end if;
  if o.tam <= 0 or o.tam > 3145728 then return jsonb_build_object('ok', false, 'motivo', 'imagem_invalida'); end if;
  update public.caca_sicredi_campanha_pedido set estado = 'pendente', imagem_path = p_path, enviado_em = now() where id = e.id;
  perform public.caca_evento_gravar(e.edicao_codigo, null, 'sicredi_prova_enviada',
    jsonb_build_object('estado', 'rascunho'), jsonb_build_object('estado', 'pendente', 'pedido', e.id), null);
  return jsonb_build_object('ok', true, 'id', e.id, 'estado', 'pendente');
end $$;
revoke all on function public.caca_sicredi_campanha_anexar(text, uuid, text) from public, anon, authenticated;
grant execute on function public.caca_sicredi_campanha_anexar(text, uuid, text) to anon, authenticated;

-- O participante só lê o estado da própria identidade; caminhos privados nunca saem desta RPC.
create or replace function public.caca_sicredi_campanha_meus(p_chave text)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then
    return jsonb_build_object('ok', true, 'pedidos', '[]'::jsonb, 'principal', false);
  end if;
  return jsonb_build_object('ok', true, 'principal', true, 'pedidos', coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'estado', estado, 'criado_em', criado_em, 'enviado_em', enviado_em,
      'decidido_em', decidido_em, 'decisao_nota', decisao_nota, 'tem_imagem', imagem_path is not null)
      order by criado_em desc)
      from public.caca_sicredi_campanha_pedido where edicao_codigo = m.edicao_codigo and pessoa = m.email_norm
  ), '[]'::jsonb));
end $$;
revoke all on function public.caca_sicredi_campanha_meus(text) from public, anon, authenticated;
grant execute on function public.caca_sicredi_campanha_meus(text) to anon, authenticated;

-- Fila da organização. A chave do painel e a permissão são verificadas no banco.
create or replace function public.caca_sicredi_campanha_listar(p_secret text, p_edicao text, p_estado text default null)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if p_estado is not null and p_estado not in ('rascunho', 'pendente', 'aprovado', 'negado') then raise exception 'parametro_invalido'; end if;
  return jsonb_build_object('ok', true,
    'pendentes', (select count(*) from public.caca_sicredi_campanha_pedido where edicao_codigo = p_edicao and estado = 'pendente'),
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'apelido', apelido, 'estado', estado,
      'criado_em', criado_em, 'enviado_em', enviado_em, 'decidido_em', decidido_em, 'decidido_por', decidido_por,
      'decisao_nota', decisao_nota, 'imagem', imagem_path) order by enviado_em desc nulls last, criado_em desc)
      from public.caca_sicredi_campanha_pedido where edicao_codigo = p_edicao and (p_estado is null or estado = p_estado)), '[]'::jsonb));
end $$;
revoke all on function public.caca_sicredi_campanha_listar(text, text, text) from public, anon, authenticated;
grant execute on function public.caca_sicredi_campanha_listar(text, text, text) to anon, authenticated;

create or replace function public.caca_sicredi_campanha_decidir(p_secret text, p_id uuid, p_decisao text, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare e public.caca_sicredi_campanha_pedido%rowtype; v_dec text := lower(btrim(coalesce(p_decisao, '')));
  v_nota text; v_ator text := coalesce(public.ator_rotulo_atual(), 'Organização');
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_dec not in ('aprovar', 'negar') then raise exception 'parametro_invalido'; end if;
  v_nota := public.caca_texto_limpo(p_nota, 200);
  select * into e from public.caca_sicredi_campanha_pedido where id = p_id for update;
  if e.id is null then raise exception 'pedido_nao_encontrado'; end if;
  if e.estado <> 'pendente' then raise exception 'transicao_invalida'; end if;
  if v_dec = 'aprovar' and e.imagem_path is null then raise exception 'sem_imagem'; end if;
  if v_dec = 'negar' and v_nota is null then raise exception 'nota_obrigatoria'; end if;

  perform pg_advisory_xact_lock(hashtextextended('sicredi:' || e.edicao_codigo || ':' || e.pessoa, 0));
  if v_dec = 'aprovar' then
    if exists (select 1 from public.caca_sicredi_campanha_pedido where edicao_codigo = e.edicao_codigo and pessoa = e.pessoa
      and estado = 'aprovado' and id <> e.id) then raise exception 'ja_aprovado'; end if;
    update public.caca_sicredi_campanha_pedido set estado = 'aprovado', decidido_por = v_ator, decidido_user = auth.uid(),
      decidido_em = now(), decisao_nota = v_nota where id = e.id;
  else
    update public.caca_sicredi_campanha_pedido set estado = 'negado', decidido_por = v_ator, decidido_user = auth.uid(),
      decidido_em = now(), decisao_nota = v_nota where id = e.id;
  end if;
  perform public.caca_evento_gravar(e.edicao_codigo, null,
    case when v_dec = 'aprovar' then 'sicredi_carimbo_aprovado' else 'sicredi_pedido_negado' end,
    jsonb_build_object('pedido', e.id, 'estado', 'pendente'), jsonb_build_object('pedido', e.id, 'estado', case when v_dec = 'aprovar' then 'aprovado' else 'negado' end), v_nota);
  return jsonb_build_object('ok', true, 'estado', case when v_dec = 'aprovar' then 'aprovado' else 'negado' end);
end $$;
revoke all on function public.caca_sicredi_campanha_decidir(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.caca_sicredi_campanha_decidir(text, uuid, text, text) to anon, authenticated;

create or replace function public.caca_sicredi_campanha_avisa()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_n int;
begin
  if new.estado <> 'pendente' or old.estado = new.estado then return null; end if;
  begin
    select count(*) into v_n from public.caca_sicredi_campanha_pedido where edicao_codigo = new.edicao_codigo and estado = 'pendente';
    perform public.notificar('organizacao', null, 'pedido', 'Comprovante Sicredi para analisar',
      coalesce(new.apelido, 'Um participante') || ' enviou o print da campanha. ' || v_n ||
      case when v_n = 1 then ' pedido Sicredi aguarda análise.' else ' pedidos Sicredi aguardam análise.' end,
      'edicao/carimbos/presenca');
  exception when others then
    raise warning 'caca_sicredi_campanha_avisa: %', sqlerrm;
  end;
  return null;
end $$;
revoke all on function public.caca_sicredi_campanha_avisa() from public, anon, authenticated;
drop trigger if exists caca_sicredi_campanha_avisa on public.caca_sicredi_campanha_pedido;
create trigger caca_sicredi_campanha_avisa after update of estado on public.caca_sicredi_campanha_pedido
  for each row when (old.estado is distinct from new.estado and new.estado = 'pendente')
  execute function public.caca_sicredi_campanha_avisa();

-- Pontuação: o Sicredi soma um carimbo extra sem alterar casas, casas completas ou metas de visita.
-- Como caca_ranking_v2 e as apurações usam caca_placar_v2, esta é a única fonte de pontuação alterada.
create or replace function public.caca_placar_v2(p_edicao text, p_ate timestamptz default null)
returns table (pessoa text, mapa_id uuid, apelido text, whatsapp text, no_ranking boolean,
               casas int, extras int, carimbos int, ultimo timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  with val as (
    select m.email_norm, k.participacao_id, k.criado_em
      from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
     where m.edicao_codigo = p_edicao and k.anulado_em is null
       and (p_ate is null or k.criado_em < p_ate)
       and k.participacao_id in (select public.caca_casas_conta(p_edicao))
       and public.caca_carimbo_conta(k.participacao_id, k.origem)
       and exists (select 1 from public.avaliacoes a
                    where a.edicao_codigo = p_edicao and a.participacao_id = k.participacao_id
                      and a.email_norm = m.email_norm and (p_ate is null or a.criado_em < p_ate))
  ), por_pessoa as (
    select v.email_norm, count(distinct v.participacao_id)::int casas, count(*)::int carimbos, max(v.criado_em) ultimo
      from val v group by v.email_norm
  ), sicredi as (
    select s.pessoa, count(*)::int carimbos, max(s.decidido_em) ultimo
      from public.caca_sicredi_campanha_pedido s
     where s.edicao_codigo = p_edicao and s.estado = 'aprovado' and (p_ate is null or s.decidido_em < p_ate)
     group by s.pessoa
  ), perfil as (
    select m.email_norm, m.id, m.apelido, m.whatsapp, m.no_ranking
      from public.mapas_lover m
     where m.edicao_codigo = p_edicao and m.id = public.caca_mapa_principal(p_edicao, m.email_norm)
  )
  select f.email_norm, f.id, f.apelido, f.whatsapp, f.no_ranking,
         coalesce(p.casas, 0), coalesce(p.carimbos, 0) - coalesce(p.casas, 0) + coalesce(s.carimbos, 0),
         coalesce(p.carimbos, 0) + coalesce(s.carimbos, 0), greatest(p.ultimo, s.ultimo)
    from perfil f left join por_pessoa p on p.email_norm = f.email_norm
                  left join sicredi s on s.pessoa = f.email_norm
   where p.email_norm is not null or s.pessoa is not null
$$;

-- Mantém o detalhe da conquista no mapa pessoal; 'extras' e a posição já vêm do placar acima.
create or replace function public.mapa_ler_v2(p_chave text)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_total int; v_pos int; v_cs int := 0; v_exr int := 0; v_emp int := 0; v_princ boolean;
  v_casas jsonb; v_val int; v_ext int; v_sicredi boolean := false;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  v_princ := coalesce(m.id = public.caca_mapa_principal(m.edicao_codigo, m.email_norm), false);
  v_total := public.caca_total_casas(m.edicao_codigo);
  select coalesce(jsonb_agg(jsonb_build_object(
            'slug', pa.slug_publico, 'carimbos', x.n, 'ultimo', x.ultimo,
            'liberado_em', x.ultimo + interval '12 hours',
            'avaliou', x.avaliou, 'estado', case when x.avaliou then 'validada' else 'pendente' end,
            'extras', case when x.avaliou then x.n - 1 else 0 end) order by x.ultimo desc), '[]'::jsonb),
         (count(*) filter (where x.avaliou))::int,
         coalesce(sum(case when x.avaliou then x.n - 1 else 0 end), 0)::int
    into v_casas, v_val, v_ext
    from (select k.participacao_id, count(*)::int n, max(k.criado_em) ultimo,
                 exists (select 1 from public.avaliacoes a where a.edicao_codigo = m.edicao_codigo
                           and a.participacao_id = k.participacao_id and a.email_norm = m.email_norm) avaliou
            from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
           where m2.edicao_codigo = m.edicao_codigo and m2.email_norm = m.email_norm and k.anulado_em is null
             and (v_princ or k.mapa_id = m.id)
             and k.participacao_id in (select public.caca_casas_conta(m.edicao_codigo))
             and public.caca_carimbo_conta(k.participacao_id, k.origem)
           group by k.participacao_id) x
    join public.participacoes pa on pa.id = x.participacao_id;
  if v_princ then
    select exists (select 1 from public.caca_sicredi_campanha_pedido where edicao_codigo = m.edicao_codigo
      and pessoa = m.email_norm and estado = 'aprovado') into v_sicredi;
    select r.pos, r.casas, r.extras into v_pos, v_cs, v_exr from public.caca_ranking_v2(m.edicao_codigo) r where r.pessoa = m.email_norm;
    v_cs := coalesce(v_cs, 0); v_exr := coalesce(v_exr, 0);
    if v_pos is not null then
      select count(*)::int into v_emp from public.caca_ranking_v2(m.edicao_codigo) r where r.pos = v_pos;
      select count(distinct r.pos)::int into v_pos from public.caca_ranking_v2(m.edicao_codigo) r where r.pos <= v_pos;
    end if;
  end if;
  return jsonb_build_object(
    'edicao', m.edicao_codigo, 'apelido', m.apelido, 'email', m.email_norm, 'whatsapp', m.whatsapp,
    'no_ranking', m.no_ranking, 'principal', v_princ, 'carimbo_sicredi', v_sicredi,
    'total_casas', v_total,
    'casas_validadas', case when v_princ then v_cs else v_val end,
    'extras', case when v_princ then v_exr else v_ext end,
    'faltam', greatest(v_total - case when v_princ then v_cs else v_val end, 0),
    'posicao', v_pos, 'empatados', v_emp, 'casas', v_casas);
end $$;

revoke all on function public.caca_sicredi_campanha_imagem_reservar(text, uuid, text) from public;
