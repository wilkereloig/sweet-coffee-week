-- Caça aos Carimbos, correção de segurança da identidade (achados CACA-SEC-01, SEC-02 e SEC-06; Wilker autorizou aplicar em 05/11/2026).
-- Contrato: docs/cartoon-2026-2/15-caca-contrato-identidade.md (seção "Mapa principal"). Teste: supabase/testes/caca-identidade-principal.sql.
--
-- Problema (SEC-01): "pessoa = e-mail normalizado" nunca era verificada na criação do mapa. Quem sabia o e-mail de alguém criava um
-- mapa novo com ele e herdava papel de dono nos grupos, e-mail confirmado, perfil do ranking (apelido/WhatsApp), contato do voucher
-- e o alvo da recuperação.
-- Correção: o direito "por pessoa" passa a ser de UM mapa, o MAPA PRINCIPAL da pessoa na edição:
--     confirmado primeiro (o mais antigo confirmado), senão o mais antigo (ordem: não confirmado por último, confirmação, criado_em, id).
--   · só o principal entra em grupos e age neles; perfil do ranking, contato do prêmio e e-mail confirmado vêm do principal;
--   · confirmar e recuperar agem SÓ no mapa a que o código foi emitido (o principal), nunca em todos os mapas do e-mail;
--   · quem tem o e-mail sempre retoma o principal pela recuperação (a chave antiga dele morre);
--   · mapa secundário (mesmo e-mail, não principal) lê só os próprios carimbos em mapa_ler_v2 e recebe 'negado' nos grupos.
-- Resíduo conhecido (não dá para fechar sem provar posse do e-mail na criação): quem cria mapa com o e-mail de alguém ANTES
-- da pessoa se cadastrar é o principal até o dono do e-mail pedir "recuperar" (chave nova, a do invasor deixa de valer).
--
-- SEC-02: mapa_criar (v1) continuava executável por anon e burlava todos os limites; o front só usa mapa_criar_v2.
-- SEC-06: o teto global (500 pedidos/h de código; 300 mapas/10 min) deixava qualquer anônimo bloquear todo mundo. Saem os dois.
--   · pedido de código: continua 1/min e 5/h POR E-MAIL (igual exista ou não mapa); o teto global passa a contar só códigos
--     realmente emitidos (600/h, protege a cota do provedor) e NÃO sinaliza 'limitado' (não revela existência);
--   · criar mapa: 5/24 h por e-mail e, quando o cabeçalho cf-connecting-ip chega pelo PostgREST, 60 mapas/10 min por IP (hash).
--
-- Não apaga nem converte dado. Reverter: restaurar as definições de 20261203, 20261205 e 20261206 (create or replace do arquivo
-- de origem) e: grant execute on function public.mapa_criar(text,text,text,text,boolean,boolean) to anon, authenticated;
--   drop function if exists public.caca_mapa_principal(text, text); drop table if exists public.mapa_criar_ip;

create index if not exists mapas_lover_pessoa on public.mapas_lover (edicao_codigo, email_norm, criado_em);

create table if not exists public.mapa_criar_ip (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  criado_em timestamptz not null default now()
);
create index if not exists mapa_criar_ip_hash on public.mapa_criar_ip (ip_hash, criado_em desc);
create index if not exists mapa_criar_ip_tempo on public.mapa_criar_ip (criado_em);
alter table public.mapa_criar_ip enable row level security;
revoke all on table public.mapa_criar_ip from public, anon, authenticated;

-- ---------------------------------------------------------------- mapa principal (interna)
create or replace function public.caca_mapa_principal(p_edicao text, p_email text)
 returns uuid language sql stable security definer set search_path to 'public'
as $$
  select m.id from public.mapas_lover m
   where m.edicao_codigo = p_edicao and m.email_norm = lower(btrim(coalesce(p_email, '')))
   order by (m.email_confirmado_em is null), m.email_confirmado_em, m.criado_em, m.id
   limit 1
$$;
revoke all on function public.caca_mapa_principal(text, text) from public, anon, authenticated;

-- E-mail confirmado = o mapa principal da pessoa foi confirmado por código (não herda de mapa irmão).
create or replace function public.caca_email_confirmado(p_edicao text, p_email text)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce((select m.email_confirmado_em is not null from public.mapas_lover m
                    where m.id = public.caca_mapa_principal(p_edicao, p_email)), false)
$$;

-- Ponto único da premiação para "e-mail confirmado": o do mapa principal (que também é o perfil/contato do prêmio).
create or replace function public.caca_premio_email_ok(p_edicao text, p_pessoa text)
 returns boolean language sql stable security definer set search_path to 'public'
as $$ select public.caca_email_confirmado(p_edicao, p_pessoa) $$;

-- ---------------------------------------------------------------- código por e-mail
-- Igual a 20261205, com: código emitido para o mapa PRINCIPAL; sem teto global de pedidos (SEC-06).
create or replace function public.mapa_codigo_emitir_interno(p_edicao text, p_email text, p_finalidade text)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_h text; v_mapa public.mapas_lover%rowtype;
  v_cod text; v_id uuid := gen_random_uuid(); v_b bytea; v_ttl constant interval := interval '10 minutes';
begin
  if p_finalidade is null or p_finalidade not in ('confirmar', 'recuperar')
     or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
     or not exists (select 1 from public.edicao_publicacao where edicao_codigo = p_edicao) then
    return jsonb_build_object('ok', true, 'enviar', false);
  end if;

  v_h := public.caca_hash_texto('pedido:' || p_edicao || ':' || v_email);
  perform pg_advisory_xact_lock(hashtext(v_h));
  delete from public.mapa_codigo_pedido where criado_em < now() - interval '2 days';
  delete from public.mapa_codigo where criado_em < now() - interval '2 days';

  -- Limite por e-mail: 1 por minuto e 5 por hora, igual exista ou não mapa (não revela existência).
  if exists (select 1 from public.mapa_codigo_pedido where email_hash = v_h and criado_em > now() - interval '1 minute')
     or (select count(*) from public.mapa_codigo_pedido where email_hash = v_h and criado_em > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', true, 'enviar', false, 'limitado', true);
  end if;
  insert into public.mapa_codigo_pedido (email_hash) values (v_h);

  select * into v_mapa from public.mapas_lover where id = public.caca_mapa_principal(p_edicao, v_email);
  if v_mapa.id is null then return jsonb_build_object('ok', true, 'enviar', false); end if;
  if p_finalidade = 'confirmar' and v_mapa.email_confirmado_em is not null then
    return jsonb_build_object('ok', true, 'enviar', false);
  end if;
  -- Teto de envios (cota do provedor): conta só códigos emitidos, que exigem e-mail com mapa; não sinaliza 'limitado'.
  if (select count(*) from public.mapa_codigo where criado_em > now() - interval '1 hour') >= 600 then
    return jsonb_build_object('ok', true, 'enviar', false);
  end if;

  -- Pedido novo invalida o código anterior ainda aberto da mesma finalidade.
  update public.mapa_codigo c set expira_em = now()
   where c.finalidade = p_finalidade and c.usado_em is null and c.expira_em > now()
     and c.mapa_id in (select m.id from public.mapas_lover m where m.edicao_codigo = p_edicao and m.email_norm = v_email);

  v_b := extensions.gen_random_bytes(4);
  v_cod := lpad((((get_byte(v_b, 0)::bigint << 24) + (get_byte(v_b, 1) << 16) + (get_byte(v_b, 2) << 8) + get_byte(v_b, 3)) % 1000000)::text, 6, '0');
  insert into public.mapa_codigo (id, mapa_id, finalidade, codigo_hash, expira_em)
  values (v_id, v_mapa.id, p_finalidade, public.caca_hash_texto('codigo:' || v_id || ':' || p_finalidade || ':' || v_cod), now() + v_ttl);
  return jsonb_build_object('ok', true, 'enviar', true, 'codigo', v_cod, 'apelido', v_mapa.apelido, 'expira_em', now() + v_ttl);
end $$;

-- Igual a 20261205, mas provar o código confirma SÓ o mapa a que ele foi emitido (o principal), não todos os mapas do e-mail.
create or replace function public.mapa_codigo_validar(p_edicao text, p_email text, p_codigo text, p_finalidade text)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_cod text := btrim(coalesce(p_codigo, '')); c public.mapa_codigo%rowtype;
  v_chave text; v_apelido text; v_inv constant jsonb := jsonb_build_object('ok', false, 'motivo', 'codigo_invalido');
begin
  if p_finalidade is null or p_finalidade not in ('confirmar', 'recuperar') or v_cod !~ '^\d{6}$'
     or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then return v_inv; end if;

  select c2.* into c from public.mapa_codigo c2 join public.mapas_lover m on m.id = c2.mapa_id
   where m.edicao_codigo = p_edicao and m.email_norm = v_email and c2.finalidade = p_finalidade and c2.usado_em is null
   order by c2.criado_em desc limit 1 for update of c2;
  if c.id is null or c.expira_em <= now() or c.tentativas >= 5 then return v_inv; end if;

  if not public.caca_igual_ct(c.codigo_hash, public.caca_hash_texto('codigo:' || c.id || ':' || c.finalidade || ':' || v_cod)) then
    update public.mapa_codigo set tentativas = tentativas + 1 where id = c.id;
    return v_inv;
  end if;

  update public.mapa_codigo set usado_em = now() where id = c.id;
  -- Provar o código prova o controle do e-mail para o mapa que recebeu o código (o principal). Os irmãos não herdam.
  update public.mapas_lover set email_confirmado_em = coalesce(email_confirmado_em, now()) where id = c.mapa_id;

  if p_finalidade = 'confirmar' then return jsonb_build_object('ok', true, 'finalidade', 'confirmar'); end if;

  v_chave := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
  update public.mapas_lover set chave_hash = public.mapa_hash(v_chave), ultimo_acesso_em = now()
   where id = c.mapa_id returning apelido into v_apelido;
  return jsonb_build_object('ok', true, 'finalidade', 'recuperar', 'chave', v_chave, 'apelido', v_apelido);
end $$;

-- {confirmado, valido, principal}. 'confirmado' é da PESSOA (o principal está confirmado); 'principal' diz se ESTA chave é o
-- mapa principal (false = mapa secundário: sem grupos nem progresso da pessoa; o caminho é "recuperar mapa").
create or replace function public.mapa_confirmar_email_status(p_chave text)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('confirmado', false, 'valido', false); end if;
  if m.ultimo_acesso_em is null or m.ultimo_acesso_em < now() - interval '1 hour' then
    update public.mapas_lover set ultimo_acesso_em = now() where id = m.id;
  end if;
  return jsonb_build_object('confirmado', public.caca_email_confirmado(m.edicao_codigo, m.email_norm), 'valido', true,
                            'principal', m.id = public.caca_mapa_principal(m.edicao_codigo, m.email_norm));
end $$;

-- ---------------------------------------------------------------- criar mapa
-- Mesmos argumentos e retorno de mapa_criar. Limite: 5 mapas por e-mail em 24 h e, com o IP conhecido, 60 por IP em 10 min.
-- ponytail: números escritos aqui; viram configuração se a organização pedir. IP só vale se o cabeçalho cf-connecting-ip chegar.
create or replace function public.mapa_criar_v2(p_edicao text, p_apelido text, p_email text, p_whatsapp text,
                                                p_ranking boolean, p_aceite boolean)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_ip text; v_h text;
begin
  if v_email ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and char_length(v_email) <= 254 then
    perform pg_advisory_xact_lock(hashtext('mapa_criar:' || p_edicao || ':' || v_email));
    if (select count(*) from public.mapas_lover where edicao_codigo = p_edicao and email_norm = v_email
                                                  and criado_em > now() - interval '24 hours') >= 5 then
      raise exception 'muitos_pedidos';
    end if;
  end if;
  v_ip := nullif(btrim(coalesce((nullif(current_setting('request.headers', true), '')::json) ->> 'cf-connecting-ip', '')), '');
  if v_ip is not null then
    v_h := public.caca_hash_texto('ip:' || v_ip);
    delete from public.mapa_criar_ip where criado_em < now() - interval '2 days';
    if (select count(*) from public.mapa_criar_ip where ip_hash = v_h and criado_em > now() - interval '10 minutes') >= 60 then
      raise exception 'muitos_pedidos';
    end if;
    insert into public.mapa_criar_ip (ip_hash) values (v_h);
  end if;
  return public.mapa_criar(p_edicao, p_apelido, p_email, p_whatsapp, p_ranking, p_aceite);
end $$;

-- SEC-02: a v1 não tem limite nenhum; só a v2 (SECURITY DEFINER, dono postgres) pode chamá-la.
revoke all on function public.mapa_criar(text, text, text, text, boolean, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------- placar e mapa (perfil e leitura pelo principal)
-- Igual a 20261203, com o PERFIL (apelido, WhatsApp, aparecer no ranking, mapa_id do contato) vindo do mapa principal.
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
       and exists (select 1 from public.avaliacoes a
                    where a.edicao_codigo = p_edicao and a.participacao_id = k.participacao_id
                      and a.email_norm = m.email_norm and (p_ate is null or a.criado_em < p_ate))
  ), por_pessoa as (
    select v.email_norm, count(distinct v.participacao_id)::int casas, count(*)::int carimbos, max(v.criado_em) ultimo
      from val v group by v.email_norm
  ), perfil as (
    select distinct on (m.email_norm) m.email_norm, m.id, m.apelido, m.whatsapp, m.no_ranking
      from public.mapas_lover m where m.edicao_codigo = p_edicao
     order by m.email_norm, (m.email_confirmado_em is null), m.email_confirmado_em, m.criado_em, m.id
  )
  select p.email_norm, f.id, f.apelido, f.whatsapp, f.no_ranking, p.casas, p.carimbos - p.casas, p.carimbos, p.ultimo
    from por_pessoa p join perfil f on f.email_norm = p.email_norm
$$;

-- Igual a 20261203 + 'principal'. Mapa secundário: casas[] só dos carimbos do próprio mapa e progresso calculado deles
-- (sem posição); o progresso e as casas da pessoa são do mapa principal.
create or replace function public.mapa_ler_v2(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_total int; v_pos int; v_cs int := 0; v_exr int := 0; v_emp int := 0; v_princ boolean;
  v_casas jsonb; v_val int; v_ext int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  v_princ := m.id = public.caca_mapa_principal(m.edicao_codigo, m.email_norm);
  select count(*) into v_total from public.participacoes pa
   where pa.edicao_codigo = m.edicao_codigo and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
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
           group by k.participacao_id) x
    join public.participacoes pa on pa.id = x.participacao_id;
  if v_princ then
    select r.pos, r.casas, r.extras into v_pos, v_cs, v_exr from public.caca_ranking_v2(m.edicao_codigo) r where r.pessoa = m.email_norm;
    v_cs := coalesce(v_cs, 0); v_exr := coalesce(v_exr, 0);
    if v_pos is not null then
      select count(*)::int into v_emp from public.caca_ranking_v2(m.edicao_codigo) r where r.pos = v_pos;
    end if;
  end if;
  return jsonb_build_object(
    'edicao', m.edicao_codigo, 'apelido', m.apelido, 'email', m.email_norm, 'whatsapp', m.whatsapp,
    'no_ranking', m.no_ranking, 'principal', v_princ,
    'total_casas', v_total,
    'casas_validadas', case when v_princ then v_cs else v_val end,
    'extras', case when v_princ then v_exr else v_ext end,
    'faltam', greatest(v_total - case when v_princ then v_cs else v_val end, 0),
    'posicao', v_pos, 'empatados', v_emp, 'casas', v_casas);
end $$;

-- ---------------------------------------------------------------- grupos (só o mapa principal age em nome da pessoa)
-- Perfil exibido no grupo = apelido do mapa principal.
create or replace function public.caca_grupo_apelido(p_edicao text, p_pessoa text, p_snapshot text)
 returns text language sql stable security definer set search_path to 'public'
as $$
  select coalesce((select m.apelido from public.mapas_lover m where m.id = public.caca_mapa_principal(p_edicao, p_pessoa)), p_snapshot)
$$;

-- As 9 RPCs que recebem a chave ganham o portão: mapa secundário = 'negado' (igual a "grupo inexistente").
create or replace function public.caca_grupo_criar(p_chave text, p_nome text, p_aceite_visibilidade boolean default false)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_nome text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_id uuid; v_tok text; v_exp timestamptz;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if char_length(v_nome) not between 2 and 40 then return jsonb_build_object('ok', false, 'motivo', 'nome_invalido'); end if;
  if not coalesce(p_aceite_visibilidade, false) then return jsonb_build_object('ok', false, 'motivo', 'aceite_obrigatorio'); end if;
  if (select count(*) from public.caca_grupo_membro gm join public.caca_grupo g on g.id = gm.grupo_id
       where gm.pessoa = m.email_norm and gm.saiu_em is null and g.edicao_codigo = m.edicao_codigo)
     >= public.caca_grupo_cfg('max_grupos_por_pessoa', 5)
    then return jsonb_build_object('ok', false, 'motivo', 'limite_grupos'); end if;
  insert into public.caca_grupo (edicao_codigo, nome, criado_por_mapa) values (m.edicao_codigo, v_nome, m.id) returning id into v_id;
  insert into public.caca_grupo_membro (grupo_id, pessoa, mapa_id, apelido_snapshot, papel, aceite_visibilidade_em)
  values (v_id, m.email_norm, m.id, m.apelido, 'dono', now());
  v_tok := public.caca_grupo_token_novo();
  v_exp := now() + make_interval(days => public.caca_grupo_cfg('convite_validade_dias', 7));
  insert into public.caca_grupo_convite (grupo_id, token_hash, expira_em, criado_por) values (v_id, public.mapa_hash(v_tok), v_exp, m.email_norm);
  return jsonb_build_object('ok', true, 'grupo_id', v_id, 'nome', v_nome, 'convite_token', v_tok, 'convite_expira_em', v_exp);
end $$;

create or replace function public.caca_grupo_convite_novo(p_chave text, p_grupo uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; g public.caca_grupo%rowtype; me public.caca_grupo_membro%rowtype; v_tok text; v_exp timestamptz;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if p_grupo is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  perform public.caca_grupo_lock(p_grupo);
  select * into g from public.caca_grupo where id = p_grupo and edicao_codigo = m.edicao_codigo;
  select * into me from public.caca_grupo_membro where grupo_id = p_grupo and pessoa = m.email_norm and saiu_em is null;
  if g.id is null or me.id is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if g.convites_so_dono and me.papel <> 'dono' then return jsonb_build_object('ok', false, 'motivo', 'so_dono'); end if;
  if (select count(*) from public.caca_grupo_convite c
       where c.grupo_id = p_grupo and c.revogado_em is null and c.expira_em > now()
         and (c.max_usos is null or c.usos < c.max_usos)) >= public.caca_grupo_cfg('max_convites_ativos', 5)
    then return jsonb_build_object('ok', false, 'motivo', 'limite_convites'); end if;
  v_tok := public.caca_grupo_token_novo();
  v_exp := now() + make_interval(days => public.caca_grupo_cfg('convite_validade_dias', 7));
  insert into public.caca_grupo_convite (grupo_id, token_hash, expira_em, criado_por) values (p_grupo, public.mapa_hash(v_tok), v_exp, m.email_norm);
  if me.papel = 'dono' and g.convites_so_dono then update public.caca_grupo set convites_so_dono = false where id = p_grupo; end if;
  return jsonb_build_object('ok', true, 'convite_token', v_tok, 'convite_expira_em', v_exp);
end $$;

create or replace function public.caca_grupo_convite_revogar(p_chave text, p_grupo uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; me public.caca_grupo_membro%rowtype; v_n int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if p_grupo is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  perform public.caca_grupo_lock(p_grupo);
  select gm.* into me from public.caca_grupo_membro gm join public.caca_grupo g on g.id = gm.grupo_id
   where gm.grupo_id = p_grupo and gm.pessoa = m.email_norm and gm.saiu_em is null and g.edicao_codigo = m.edicao_codigo;
  if me.id is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if me.papel <> 'dono' then return jsonb_build_object('ok', false, 'motivo', 'so_dono'); end if;
  update public.caca_grupo_convite set revogado_em = now() where grupo_id = p_grupo and revogado_em is null;
  get diagnostics v_n = row_count;
  update public.caca_grupo set convites_so_dono = true where id = p_grupo;
  return jsonb_build_object('ok', true, 'revogados', v_n);
end $$;

create or replace function public.caca_grupo_entrar(p_chave text, p_token text, p_aceite_visibilidade boolean default false)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; c public.caca_grupo_convite%rowtype; g public.caca_grupo%rowtype; me public.caca_grupo_membro%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  select * into c from public.caca_grupo_convite where token_hash = public.mapa_hash(p_token);
  if c.id is null then return jsonb_build_object('ok', false, 'motivo', 'convite_invalido'); end if;
  perform public.caca_grupo_lock(c.grupo_id);
  select * into c from public.caca_grupo_convite where id = c.id;     -- relê já com o lock (usos / revogação)
  select * into g from public.caca_grupo where id = c.grupo_id;
  if g.edicao_codigo <> m.edicao_codigo then return jsonb_build_object('ok', false, 'motivo', 'edicao_diferente'); end if;
  select * into me from public.caca_grupo_membro where grupo_id = g.id and pessoa = m.email_norm;
  -- Idempotente: quem já é integrante (inclusive por OUTRO mapa do mesmo e-mail) recebe ok, sem novo uso do convite.
  if me.id is not null and me.saiu_em is null then
    return jsonb_build_object('ok', true, 'grupo_id', g.id, 'nome', g.nome, 'ja_membro', true);
  end if;
  if c.revogado_em is not null then return jsonb_build_object('ok', false, 'motivo', 'convite_revogado'); end if;
  if c.expira_em <= now() then return jsonb_build_object('ok', false, 'motivo', 'convite_expirado'); end if;
  if c.max_usos is not null and c.usos >= c.max_usos then return jsonb_build_object('ok', false, 'motivo', 'convite_esgotado'); end if;
  if me.removido_em is not null then return jsonb_build_object('ok', false, 'motivo', 'removido_do_grupo'); end if;
  if not coalesce(p_aceite_visibilidade, false) then return jsonb_build_object('ok', false, 'motivo', 'aceite_obrigatorio'); end if;
  if not exists (select 1 from public.caca_grupo_membro gm where gm.grupo_id = g.id and gm.saiu_em is null)
    then return jsonb_build_object('ok', false, 'motivo', 'convite_invalido'); end if;     -- grupo sem ninguém: convite morto
  if (select count(*) from public.caca_grupo_membro gm where gm.grupo_id = g.id and gm.saiu_em is null)
     >= public.caca_grupo_cfg('max_membros', 30)
    then return jsonb_build_object('ok', false, 'motivo', 'grupo_cheio'); end if;
  if (select count(*) from public.caca_grupo_membro gm join public.caca_grupo g2 on g2.id = gm.grupo_id
       where gm.pessoa = m.email_norm and gm.saiu_em is null and g2.edicao_codigo = m.edicao_codigo)
     >= public.caca_grupo_cfg('max_grupos_por_pessoa', 5)
    then return jsonb_build_object('ok', false, 'motivo', 'limite_grupos'); end if;
  insert into public.caca_grupo_membro (grupo_id, pessoa, mapa_id, apelido_snapshot, papel, aceite_visibilidade_em)
  values (g.id, m.email_norm, m.id, m.apelido, 'membro', now())
  on conflict (grupo_id, pessoa) do update
     set mapa_id = excluded.mapa_id, apelido_snapshot = excluded.apelido_snapshot, papel = 'membro',
         entrou_em = now(), aceite_visibilidade_em = excluded.aceite_visibilidade_em, saiu_em = null;
  update public.caca_grupo_convite set usos = usos + 1 where id = c.id;
  return jsonb_build_object('ok', true, 'grupo_id', g.id, 'nome', g.nome, 'ja_membro', false);
end $$;

create or replace function public.caca_grupo_sair(p_chave text, p_grupo uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; me public.caca_grupo_membro%rowtype; v_prox uuid;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if p_grupo is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  perform public.caca_grupo_lock(p_grupo);
  select gm.* into me from public.caca_grupo_membro gm join public.caca_grupo g on g.id = gm.grupo_id
   where gm.grupo_id = p_grupo and gm.pessoa = m.email_norm and gm.saiu_em is null and g.edicao_codigo = m.edicao_codigo;
  if me.id is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  update public.caca_grupo_membro set saiu_em = now(), papel = 'membro' where id = me.id;
  if me.papel = 'dono' then
    select gm.id into v_prox from public.caca_grupo_membro gm
     where gm.grupo_id = p_grupo and gm.saiu_em is null order by gm.entrou_em, gm.id limit 1;
    if v_prox is not null then update public.caca_grupo_membro set papel = 'dono' where id = v_prox;
    else update public.caca_grupo_convite set revogado_em = now() where grupo_id = p_grupo and revogado_em is null; end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.caca_grupo_remover_membro(p_chave text, p_grupo uuid, p_membro uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; me public.caca_grupo_membro%rowtype; alvo public.caca_grupo_membro%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if p_grupo is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  perform public.caca_grupo_lock(p_grupo);
  select gm.* into me from public.caca_grupo_membro gm join public.caca_grupo g on g.id = gm.grupo_id
   where gm.grupo_id = p_grupo and gm.pessoa = m.email_norm and gm.saiu_em is null and g.edicao_codigo = m.edicao_codigo;
  if me.id is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if me.papel <> 'dono' then return jsonb_build_object('ok', false, 'motivo', 'so_dono'); end if;
  select * into alvo from public.caca_grupo_membro where id = p_membro and grupo_id = p_grupo and saiu_em is null;
  if alvo.id is null then return jsonb_build_object('ok', false, 'motivo', 'membro_desconhecido'); end if;
  if alvo.id = me.id then return jsonb_build_object('ok', false, 'motivo', 'use_sair'); end if;
  update public.caca_grupo_membro set saiu_em = now(), removido_em = now() where id = alvo.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.caca_grupo_listar(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_total int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  v_total := public.caca_grupo_total(m.edicao_codigo);
  return jsonb_build_object('ok', true, 'total_casas', v_total, 'grupos', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'grupo_id', g.id, 'nome', g.nome, 'papel', gm.papel, 'entrou_em', gm.entrou_em,
             'membros_qtd', (select count(*)::int from public.caca_grupo_membro x where x.grupo_id = g.id and x.saiu_em is null),
             'casas_coletivas', (select count(*)::int from public.caca_grupo_casas(g.id)),
             'total_casas', v_total) order by gm.entrou_em desc, g.id), '[]'::jsonb)
      from public.caca_grupo_membro gm join public.caca_grupo g on g.id = gm.grupo_id
     where gm.pessoa = m.email_norm and gm.saiu_em is null and g.edicao_codigo = m.edicao_codigo));
end $$;

create or replace function public.caca_grupo_ler(p_chave text, p_grupo uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; g public.caca_grupo%rowtype; me public.caca_grupo_membro%rowtype;
  v_total int; v_membros jsonb; v_slugs jsonb; v_n int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  select * into g from public.caca_grupo where id = p_grupo and edicao_codigo = m.edicao_codigo;
  select * into me from public.caca_grupo_membro where grupo_id = p_grupo and pessoa = m.email_norm and saiu_em is null;
  if g.id is null or me.id is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  v_total := public.caca_grupo_total(g.edicao_codigo);
  select coalesce(jsonb_agg(jsonb_build_object(
           'membro_id', x.id, 'apelido', x.ap, 'papel', x.papel, 'casas', x.casas, 'extras', x.extras,
           'posicao', x.pos, 'entrou_em', x.entrou_em, 'eu', x.id = me.id) order by x.pos nulls last, x.ap, x.id), '[]'::jsonb)
    into v_membros
    from (select s.*, case when s.casas > 0 then (rank() over (order by s.casas desc, s.extras desc))::int end pos
            from (select gm.id, gm.papel, gm.entrou_em,
                         public.caca_grupo_apelido(g.edicao_codigo, gm.pessoa, gm.apelido_snapshot) ap,
                         coalesce(p.casas, 0) casas, coalesce(p.extras, 0) extras
                    from public.caca_grupo_membro gm
                    left join public.caca_placar_v2(g.edicao_codigo) p on p.pessoa = gm.pessoa
                   where gm.grupo_id = g.id and gm.saiu_em is null) s) x;
  select coalesce(jsonb_agg(c.slug order by c.slug), '[]'::jsonb), count(*)::int into v_slugs, v_n from public.caca_grupo_casas(g.id) c;
  return jsonb_build_object(
    'ok', true,
    'grupo', jsonb_build_object('id', g.id, 'nome', g.nome, 'criado_em', g.criado_em, 'convites_so_dono', g.convites_so_dono),
    'eu', jsonb_build_object('membro_id', me.id, 'papel', me.papel),
    'membros', v_membros,
    'total_casas', v_total, 'casas_coletivas', v_n, 'faltam_coletivo', greatest(v_total - v_n, 0), 'casas_coletivas_slugs', v_slugs,
    'rota_versao', g.rota_versao, 'rota', public.caca_grupo_rota_json(g.id));
end $$;

create or replace function public.caca_grupo_rota_op(p_chave text, p_grupo uuid, p_op text, p_slug text, p_pos int, p_versao int)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; g public.caca_grupo%rowtype; v_casa uuid; v_old int; v_n int; v_pos int; v_mudou boolean := false;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if p_grupo is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  perform public.caca_grupo_lock(p_grupo);                              -- serializa as edições da rota do grupo
  select * into g from public.caca_grupo where id = p_grupo and edicao_codigo = m.edicao_codigo;
  if g.id is null or not exists (select 1 from public.caca_grupo_membro gm
                                  where gm.grupo_id = p_grupo and gm.pessoa = m.email_norm and gm.saiu_em is null)
    then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if p_versao is not null and p_versao <> g.rota_versao then
    return jsonb_build_object('ok', false, 'motivo', 'conflito', 'versao', g.rota_versao, 'rota', public.caca_grupo_rota_json(g.id));
  end if;
  select pa.id into v_casa from public.participacoes pa
   where pa.edicao_codigo = g.edicao_codigo and pa.slug_publico = v_slug and pa.status_cadastro <> 'encerrado'
     and (p_op <> 'adicionar' or exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente));
  if v_casa is null then return jsonb_build_object('ok', false, 'motivo', 'casa_desconhecida'); end if;
  select r.posicao into v_old from public.caca_grupo_rota r where r.grupo_id = g.id and r.participacao_id = v_casa;

  if p_op = 'adicionar' then
    if v_old is null then
      insert into public.caca_grupo_rota (grupo_id, participacao_id, posicao, adicionado_por_pessoa)
      select g.id, v_casa, coalesce(max(r.posicao), 0) + 1, m.email_norm from public.caca_grupo_rota r where r.grupo_id = g.id;
      v_mudou := true;
    end if;
  elsif p_op = 'remover' then
    if v_old is not null then
      delete from public.caca_grupo_rota where grupo_id = g.id and participacao_id = v_casa;
      update public.caca_grupo_rota r set posicao = x.rn
        from (select r2.participacao_id, (row_number() over (order by r2.posicao))::int rn
                from public.caca_grupo_rota r2 where r2.grupo_id = g.id) x
       where r.grupo_id = g.id and r.participacao_id = x.participacao_id and r.posicao <> x.rn;
      v_mudou := true;
    end if;
  elsif p_op = 'mover' then
    if v_old is null then return jsonb_build_object('ok', false, 'motivo', 'nao_esta_na_rota'); end if;
    if p_pos is null or p_pos < 1 then return jsonb_build_object('ok', false, 'motivo', 'posicao_invalida'); end if;
    select count(*)::int into v_n from public.caca_grupo_rota where grupo_id = g.id;
    v_pos := least(p_pos, v_n);
    if v_pos <> v_old then
      -- A casa movida entra meio ponto antes/depois do destino; row_number() reescreve 1..n sem buracos.
      update public.caca_grupo_rota r set posicao = x.rn
        from (select r2.participacao_id,
                     (row_number() over (order by case when r2.participacao_id = v_casa
                                                      then v_pos + case when v_pos < v_old then -0.5 else 0.5 end
                                                      else r2.posicao end))::int rn
                from public.caca_grupo_rota r2 where r2.grupo_id = g.id) x
       where r.grupo_id = g.id and r.participacao_id = x.participacao_id;
      v_mudou := true;
    end if;
  else
    return jsonb_build_object('ok', false, 'motivo', 'operacao_invalida');
  end if;

  if v_mudou then update public.caca_grupo set rota_versao = rota_versao + 1 where id = g.id returning rota_versao into g.rota_versao; end if;
  return jsonb_build_object('ok', true, 'mudou', v_mudou, 'versao', g.rota_versao, 'rota', public.caca_grupo_rota_json(g.id));
end $$;
