-- Caça aos Carimbos, identidade e recuperação (Wilker, 04/11/2026; docs/cartoon-2026-2/15-caca-especificacao.md §3-§4).
-- Contrato das funções: docs/cartoon-2026-2/15-caca-contrato-identidade.md
-- ADITIVA: não altera mapa_criar, mapa_ler, mapa_ler_v2, carimbo_*, avaliações nem vouchers. Mapas e chaves existentes seguem valendo.
--
--  * mapas_lover ganha email_confirmado_em e ultimo_acesso_em (nulos; nada é preenchido retroativamente).
--  * mapa_codigo — códigos de 6 dígitos de uso único (confirmar e-mail / recuperar mapa). Só HASH (sha256 com pepper do banco).
--  * mapa_codigo_pedido — contagem de pedidos por e-mail (hash), igual exista ou não o mapa: o limite não revela existência.
--  * caca_segredo — pepper gerado aqui, no banco. NUNCA vai para arquivo, log ou resposta.
--  * O código em claro só sai de mapa_codigo_emitir_interno, que só o service_role executa (edge function caca-email).
--  * Pessoa = e-mail normalizado (lower + btrim). NÃO colapsa ponto/+alias do Gmail.
--  * Recuperar emite chave NOVA só para o mapa mais recente da pessoa; a chave antiga DESSE mapa deixa de valer.
-- reverter:
--   drop function if exists public.mapa_criar_v2(text, text, text, text, boolean, boolean), public.mapa_confirmar_email_status(text),
--     public.mapa_codigo_validar(text, text, text, text), public.mapa_codigo_pedir(text, text, text),
--     public.mapa_codigo_emitir_interno(text, text, text), public.caca_email_confirmado(text, text),
--     public.caca_hash_texto(text), public.caca_igual_ct(text, text);
--   drop table if exists public.mapa_codigo, public.mapa_codigo_pedido, public.caca_segredo;
--   alter table public.mapas_lover drop column if exists email_confirmado_em, drop column if exists ultimo_acesso_em;

-- ---------------------------------------------------------------- tabelas
alter table public.mapas_lover add column if not exists email_confirmado_em timestamptz;
alter table public.mapas_lover add column if not exists ultimo_acesso_em timestamptz;

create table if not exists public.caca_segredo (
  nome text primary key,
  valor text not null
);
insert into public.caca_segredo (nome, valor)
values ('pepper', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (nome) do nothing;

create table if not exists public.mapa_codigo (
  id uuid primary key default gen_random_uuid(),
  mapa_id uuid not null references public.mapas_lover(id) on delete cascade,
  finalidade text not null check (finalidade in ('confirmar', 'recuperar')),
  codigo_hash text not null,
  expira_em timestamptz not null,
  tentativas int not null default 0,
  usado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists mapa_codigo_mapa on public.mapa_codigo (mapa_id, finalidade, criado_em desc);

create table if not exists public.mapa_codigo_pedido (
  id bigint generated always as identity primary key,
  email_hash text not null,
  criado_em timestamptz not null default now()
);
create index if not exists mapa_codigo_pedido_email on public.mapa_codigo_pedido (email_hash, criado_em desc);
create index if not exists mapa_codigo_pedido_tempo on public.mapa_codigo_pedido (criado_em);

alter table public.caca_segredo enable row level security;
alter table public.mapa_codigo enable row level security;
alter table public.mapa_codigo_pedido enable row level security;
revoke all on table public.caca_segredo, public.mapa_codigo, public.mapa_codigo_pedido from public, anon, authenticated;

-- ---------------------------------------------------------------- internas (sem grant)
create or replace function public.caca_hash_texto(p_txt text)
 returns text language sql stable security definer set search_path to 'public'
as $$ select encode(extensions.digest((select valor from public.caca_segredo where nome = 'pepper') || ':' || coalesce(p_txt, ''), 'sha256'), 'hex') $$;

-- Comparação sem parar no primeiro byte diferente (entradas de mesmo tamanho: hex de sha256).
create or replace function public.caca_igual_ct(a text, b text)
 returns boolean language plpgsql immutable set search_path to 'public'
as $$
declare r int := 0; i int;
begin
  if a is null or b is null or length(a) <> length(b) then return false; end if;
  for i in 1..length(a) loop r := r | (ascii(substr(a, i, 1)) # ascii(substr(b, i, 1))); end loop;
  return r = 0;
end $$;

-- ---------------------------------------------------------------- service_role (edge function caca-email)
-- Núcleo do pedido. Nunca revela se o e-mail tem mapa: o limite conta igual nos dois casos.
-- Retorna {ok:true, enviar:boolean, limitado?:true, codigo?, apelido?, expira_em?}. Só enviar=true traz codigo.
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

  -- Limite: 1 por minuto e 5 por hora por e-mail; teto global de 500 pedidos por hora (protege a cota do provedor).
  if exists (select 1 from public.mapa_codigo_pedido where email_hash = v_h and criado_em > now() - interval '1 minute')
     or (select count(*) from public.mapa_codigo_pedido where email_hash = v_h and criado_em > now() - interval '1 hour') >= 5
     or (select count(*) from public.mapa_codigo_pedido where criado_em > now() - interval '1 hour') >= 500 then
    return jsonb_build_object('ok', true, 'enviar', false, 'limitado', true);
  end if;
  insert into public.mapa_codigo_pedido (email_hash) values (v_h);

  select * into v_mapa from public.mapas_lover
   where edicao_codigo = p_edicao and email_norm = v_email order by criado_em desc, id limit 1;
  if v_mapa.id is null then return jsonb_build_object('ok', true, 'enviar', false); end if;
  if p_finalidade = 'confirmar' and public.caca_email_confirmado(p_edicao, v_email) then
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

-- Fachada de resposta uniforme: executa o pedido e devolve SÓ {ok:true[, limitado:true]} (sem código). Útil quando
-- quem chama (service_role) não precisa do código em claro, e nos testes de "resposta igual".
create or replace function public.mapa_codigo_pedir(p_edicao text, p_email text, p_finalidade text)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare r jsonb := public.mapa_codigo_emitir_interno(p_edicao, p_email, p_finalidade);
begin
  return case when coalesce((r ->> 'limitado')::boolean, false)
              then jsonb_build_object('ok', true, 'limitado', true) else jsonb_build_object('ok', true) end;
end $$;

-- Pessoa com e-mail confirmado na edição (qualquer mapa dela confirmado). A função de vouchers usa esta.
create or replace function public.caca_email_confirmado(p_edicao text, p_email text)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (select 1 from public.mapas_lover m
                  where m.edicao_codigo = p_edicao and m.email_norm = lower(btrim(coalesce(p_email, '')))
                    and m.email_confirmado_em is not null)
$$;

revoke all on function public.caca_hash_texto(text) from public, anon, authenticated;
revoke all on function public.caca_igual_ct(text, text) from public, anon, authenticated;
revoke all on function public.mapa_codigo_emitir_interno(text, text, text) from public, anon, authenticated;
revoke all on function public.mapa_codigo_pedir(text, text, text) from public, anon, authenticated;
revoke all on function public.caca_email_confirmado(text, text) from public, anon, authenticated;
grant execute on function public.mapa_codigo_emitir_interno(text, text, text) to service_role;
grant execute on function public.mapa_codigo_pedir(text, text, text) to service_role;
grant execute on function public.caca_email_confirmado(text, text) to service_role;

-- ---------------------------------------------------------------- visitante (anônimo)
-- Valida o código. Qualquer falha (sem pedido, errado, vencido, usado, tentativas esgotadas, e-mail sem mapa) responde
-- igual: {ok:false, motivo:'codigo_invalido'}, para não revelar se o e-mail existe.
--   confirmar -> {ok:true, finalidade:'confirmar'}   (marca email_confirmado_em em todos os mapas da pessoa)
--   recuperar -> {ok:true, finalidade:'recuperar', chave, apelido}  (chave NOVA, devolvida uma única vez)
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
  -- Provar o código prova o controle do e-mail: confirma todos os mapas da pessoa na edição.
  update public.mapas_lover set email_confirmado_em = coalesce(email_confirmado_em, now())
   where edicao_codigo = p_edicao and email_norm = v_email;

  if p_finalidade = 'confirmar' then return jsonb_build_object('ok', true, 'finalidade', 'confirmar'); end if;

  v_chave := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
  update public.mapas_lover set chave_hash = public.mapa_hash(v_chave), ultimo_acesso_em = now()
   where id = c.mapa_id returning apelido into v_apelido;
  return jsonb_build_object('ok', true, 'finalidade', 'recuperar', 'chave', v_chave, 'apelido', v_apelido);
end $$;

-- {confirmado, valido}. valido=false: chave desconhecida. confirmado é da PESSOA (qualquer mapa do mesmo e-mail).
-- Também carimba ultimo_acesso_em (no máximo 1 gravação por hora por mapa).
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
  return jsonb_build_object('confirmado', public.caca_email_confirmado(m.edicao_codigo, m.email_norm), 'valido', true);
end $$;

-- Igual a mapa_criar (mesmos argumentos e retorno {chave}) com limite de abuso. Erro novo: 'muitos_pedidos'.
--   por e-mail: 5 mapas em 24 h · global na edição: 300 mapas em 10 min. Os demais erros são os de mapa_criar.
-- ponytail: limites escritos aqui; viram configuração se a organização pedir.
create or replace function public.mapa_criar_v2(p_edicao text, p_apelido text, p_email text, p_whatsapp text,
                                                p_ranking boolean, p_aceite boolean)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and char_length(v_email) <= 254 then
    perform pg_advisory_xact_lock(hashtext('mapa_criar:' || p_edicao || ':' || v_email));
    if (select count(*) from public.mapas_lover where edicao_codigo = p_edicao and email_norm = v_email
                                                  and criado_em > now() - interval '24 hours') >= 5
       or (select count(*) from public.mapas_lover where edicao_codigo = p_edicao
                                                    and criado_em > now() - interval '10 minutes') >= 300 then
      raise exception 'muitos_pedidos';
    end if;
  end if;
  return public.mapa_criar(p_edicao, p_apelido, p_email, p_whatsapp, p_ranking, p_aceite);
end $$;

revoke all on function public.mapa_codigo_validar(text, text, text, text) from public, anon, authenticated;
revoke all on function public.mapa_confirmar_email_status(text) from public, anon, authenticated;
revoke all on function public.mapa_criar_v2(text, text, text, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.mapa_codigo_validar(text, text, text, text) to anon, authenticated;
grant execute on function public.mapa_confirmar_email_status(text) to anon, authenticated;
grant execute on function public.mapa_criar_v2(text, text, text, text, boolean, boolean) to anon, authenticated;
