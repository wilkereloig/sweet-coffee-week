-- Caça aos Carimbos, identidade só vale com prova do e-mail (achados SEC-01, SEC-03, E2E-2 e C04 da revisão de 05/11/2026;
-- Wilker autorizou aplicar). Contrato: docs/cartoon-2026-2/15-caca-contrato-identidade.md. Teste: supabase/testes/caca-identidade-verificada.sql.
--
-- SEC-01 (sequestro de identidade por e-mail não verificado). mapa_criar aceita qualquer e-mail sem prova de posse; antes, o "mapa
-- principal" era o mais antigo, então quem criasse primeiro um mapa com o e-mail de outra pessoa virava principal: via os carimbos
-- dela, herdava a confirmação que ela fizesse e dava o apelido no ranking/grupos. Agora:
--   · principal = o mapa com e-mail CONFIRMADO (o confirmado há mais tempo). Sem nenhum confirmado, só há principal quando o e-mail
--     tem UM único mapa; com dois ou mais mapas e nenhum confirmado a identidade está "em disputa" e NINGUÉM é principal até alguém
--     provar o e-mail (cada mapa lê só os próprios carimbos; fora do ranking e dos grupos);
--   · o código de CONFIRMAR é emitido e validado para o mapa de quem pediu (a chave vai junto no pedido), nunca para "o principal";
--   · o código de RECUPERAR (a pessoa perdeu a chave) continua indo ao e-mail: quem prova o e-mail recebe a chave nova do principal
--     (ou, em disputa, do mapa mais antigo) e esse mapa fica confirmado.
-- SEC-03 (mail-bomb e negação de recuperação). Código novo NÃO invalida o anterior ainda aberto (a validação confere os 3 mais novos);
--   o limite por e-mail de CONFIRMAR passa a ser por mapa (1/min, 5/h); novo limite por IP (40 pedidos/10 min, hash, tabela
--   mapa_criar_ip); o teto global (600/h) é por finalidade e, ao estourar, sai 'teto' no retorno (a edge function loga o aviso).
-- E2E-2: mapa_apagar remove também o que ficou da pessoa em grupos (integrante, e-mail, apelido) quando era o último mapa do e-mail.
-- C04: as RPCs antigas ranking_mapa(text) e mapa_ler(text) (placar por PONTOS, regra extinta) deixam de ser chamáveis por anon.
--
-- Não apaga dado de mapa de ninguém além do pedido de apagar. Reverter (restaurar definições de 20261210/20261211/20261130):
--   -- reverter: drop function public.mapa_codigo_emitir_interno(text,text,text,text,text); restaurar a de 3 argumentos de 20261210;
--   --           restaurar caca_mapa_principal, mapa_codigo_validar, mapa_codigo_pedir (20261210), caca_placar_v2 (20261211), mapa_apagar (20261130);
--   --           grant execute on function public.ranking_mapa(text), public.mapa_ler(text) to anon, authenticated;

-- ---------------------------------------------------------------- mapa principal (interna)
create or replace function public.caca_mapa_principal(p_edicao text, p_email text)
 returns uuid language sql stable security definer set search_path to 'public'
as $$
  select coalesce(
    (select m.id from public.mapas_lover m
      where m.edicao_codigo = p_edicao and m.email_norm = lower(btrim(coalesce(p_email, ''))) and m.email_confirmado_em is not null
      order by m.email_confirmado_em, m.criado_em, m.id limit 1),
    (select (array_agg(m.id))[1] from public.mapas_lover m
      where m.edicao_codigo = p_edicao and m.email_norm = lower(btrim(coalesce(p_email, '')))
     having count(*) = 1))
$$;
revoke all on function public.caca_mapa_principal(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- código por e-mail
create or replace function public.mapa_codigo_emitir_interno(p_edicao text, p_email text, p_finalidade text,
                                                             p_chave text default null, p_ip text default null)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_h text; v_ip text; v_mapa public.mapas_lover%rowtype;
  v_cod text; v_id uuid := gen_random_uuid(); v_b bytea; v_ttl constant interval := interval '10 minutes';
begin
  if p_finalidade is null or p_finalidade not in ('confirmar', 'recuperar')
     or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
     or not exists (select 1 from public.edicao_publicacao where edicao_codigo = p_edicao) then
    return jsonb_build_object('ok', true, 'enviar', false);
  end if;

  -- Limite por origem (IP em hash): conta todo pedido, exista ou não mapa, então não revela nada.
  if nullif(btrim(coalesce(p_ip, '')), '') is not null then
    v_ip := public.caca_hash_texto('codigo-ip:' || btrim(p_ip));
    delete from public.mapa_criar_ip where criado_em < now() - interval '2 days';
    if (select count(*) from public.mapa_criar_ip where ip_hash = v_ip and criado_em > now() - interval '10 minutes') >= 40 then
      return jsonb_build_object('ok', true, 'enviar', false, 'limitado', true);
    end if;
    insert into public.mapa_criar_ip (ip_hash) values (v_ip);
  end if;

  -- Quem recebe o código: CONFIRMAR = o mapa da chave enviada (e do mesmo e-mail); RECUPERAR = o principal (em disputa, o mais antigo).
  if p_finalidade = 'confirmar' then
    if nullif(btrim(coalesce(p_chave, '')), '') is not null then
      select * into v_mapa from public.mapas_lover
       where chave_hash = public.mapa_hash(p_chave) and edicao_codigo = p_edicao and email_norm = v_email;
    end if;
  else
    select * into v_mapa from public.mapas_lover
     where id = coalesce(public.caca_mapa_principal(p_edicao, v_email),
                         (select m.id from public.mapas_lover m where m.edicao_codigo = p_edicao and m.email_norm = v_email
                           order by m.criado_em, m.id limit 1));
  end if;

  -- Limite de pedidos: 1/min e 5/h. RECUPERAR é por e-mail (igual exista ou não mapa); CONFIRMAR é por mapa (só quem tem a chave).
  v_h := public.caca_hash_texto('pedido:' || p_edicao || ':' ||
           case when p_finalidade = 'confirmar' then 'c:' || coalesce(v_mapa.id::text, v_email) else v_email end);
  perform pg_advisory_xact_lock(hashtext(v_h));
  delete from public.mapa_codigo_pedido where criado_em < now() - interval '2 days';
  delete from public.mapa_codigo where criado_em < now() - interval '2 days';
  if exists (select 1 from public.mapa_codigo_pedido where email_hash = v_h and criado_em > now() - interval '1 minute')
     or (select count(*) from public.mapa_codigo_pedido where email_hash = v_h and criado_em > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', true, 'enviar', false, 'limitado', true);
  end if;
  insert into public.mapa_codigo_pedido (email_hash) values (v_h);

  if v_mapa.id is null then return jsonb_build_object('ok', true, 'enviar', false); end if;
  if p_finalidade = 'confirmar' and v_mapa.email_confirmado_em is not null then
    return jsonb_build_object('ok', true, 'enviar', false);
  end if;
  -- Teto de envios por finalidade (cota do provedor): um tipo não esgota o outro. Não sinaliza 'limitado' ao visitante.
  if (select count(*) from public.mapa_codigo where finalidade = p_finalidade and criado_em > now() - interval '1 hour') >= 600 then
    raise warning 'caca_codigo_teto finalidade=%', p_finalidade;
    return jsonb_build_object('ok', true, 'enviar', false, 'teto', true);
  end if;

  -- Sem invalidar o código anterior ainda aberto: pedir de novo (ou alguém pedir por você) não derruba o código que chegou.
  v_b := extensions.gen_random_bytes(4);
  v_cod := lpad((((get_byte(v_b, 0)::bigint << 24) + (get_byte(v_b, 1) << 16) + (get_byte(v_b, 2) << 8) + get_byte(v_b, 3)) % 1000000)::text, 6, '0');
  insert into public.mapa_codigo (id, mapa_id, finalidade, codigo_hash, expira_em)
  values (v_id, v_mapa.id, p_finalidade, public.caca_hash_texto('codigo:' || v_id || ':' || p_finalidade || ':' || v_cod), now() + v_ttl);
  return jsonb_build_object('ok', true, 'enviar', true, 'codigo', v_cod, 'apelido', v_mapa.apelido, 'expira_em', now() + v_ttl);
end $$;

-- A de 3 argumentos sai (a fachada de resposta uniforme passa a chamar a nova).
create or replace function public.mapa_codigo_pedir(p_edicao text, p_email text, p_finalidade text)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare r jsonb := public.mapa_codigo_emitir_interno(p_edicao, p_email, p_finalidade, null, null);
begin
  return case when coalesce((r ->> 'limitado')::boolean, false)
              then jsonb_build_object('ok', true, 'limitado', true) else jsonb_build_object('ok', true) end;
end $$;
drop function if exists public.mapa_codigo_emitir_interno(text, text, text);
revoke all on function public.mapa_codigo_emitir_interno(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.mapa_codigo_emitir_interno(text, text, text, text, text) to service_role;

-- Valida o código entre os (até 3) mais novos ainda abertos da pessoa. O que vale é o mapa a que o código foi emitido.
create or replace function public.mapa_codigo_validar(p_edicao text, p_email text, p_codigo text, p_finalidade text)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_cod text := btrim(coalesce(p_codigo, '')); c public.mapa_codigo%rowtype;
  v_chave text; v_apelido text; v_ids uuid[] := '{}'; v_ok boolean := false;
  v_inv constant jsonb := jsonb_build_object('ok', false, 'motivo', 'codigo_invalido');
begin
  if p_finalidade is null or p_finalidade not in ('confirmar', 'recuperar') or v_cod !~ '^\d{6}$'
     or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then return v_inv; end if;

  for c in
    select c2.* from public.mapa_codigo c2 join public.mapas_lover m on m.id = c2.mapa_id
     where m.edicao_codigo = p_edicao and m.email_norm = v_email and c2.finalidade = p_finalidade
       and c2.usado_em is null and c2.expira_em > now() and c2.tentativas < 5
     order by c2.criado_em desc limit 3 for update of c2
  loop
    v_ids := v_ids || c.id;
    if public.caca_igual_ct(c.codigo_hash, public.caca_hash_texto('codigo:' || c.id || ':' || c.finalidade || ':' || v_cod)) then
      v_ok := true; exit;
    end if;
  end loop;
  if not v_ok then
    if array_length(v_ids, 1) > 0 then update public.mapa_codigo set tentativas = tentativas + 1 where id = any (v_ids); end if;
    return v_inv;
  end if;

  update public.mapa_codigo set usado_em = now() where id = c.id;
  -- Provar o código prova o e-mail para o mapa que o recebeu; os outros mapas do e-mail não herdam.
  update public.mapas_lover set email_confirmado_em = coalesce(email_confirmado_em, now()) where id = c.mapa_id;

  if p_finalidade = 'confirmar' then return jsonb_build_object('ok', true, 'finalidade', 'confirmar'); end if;

  v_chave := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
  update public.mapas_lover set chave_hash = public.mapa_hash(v_chave), ultimo_acesso_em = now()
   where id = c.mapa_id returning apelido into v_apelido;
  return jsonb_build_object('ok', true, 'finalidade', 'recuperar', 'chave', v_chave, 'apelido', v_apelido);
end $$;

-- ---------------------------------------------------------------- placar: o perfil vem do mapa principal (nunca de mapa em disputa)
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
  ), perfil as (
    select m.email_norm, m.id, m.apelido, m.whatsapp, m.no_ranking
      from public.mapas_lover m
     where m.edicao_codigo = p_edicao and m.id = public.caca_mapa_principal(p_edicao, m.email_norm)
  )
  select p.email_norm, f.id, f.apelido, f.whatsapp, f.no_ranking, p.casas, p.carimbos - p.casas, p.carimbos, p.ultimo
    from por_pessoa p join perfil f on f.email_norm = p.email_norm
$$;

-- ---------------------------------------------------------------- apagar o mapa apaga também o que a pessoa deixou em grupos
-- Só quando era o ÚLTIMO mapa do e-mail na edição (a pessoa é o e-mail: com outro mapa vivo ela segue nos grupos).
-- Sai o integrante (e-mail e apelido); dono que sai passa a posse ao integrante mais antigo; grupo sem ninguém ativo some com
-- convites e rota; o que o integrante adicionou na rota/convites de grupos que ficam vira 'removido'.
create or replace function public.mapa_apagar(p_chave text)
 returns boolean language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; g record; v_prox uuid;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || m.edicao_codigo || ':' || m.email_norm, 0));

  if not exists (select 1 from public.mapas_lover o
                  where o.edicao_codigo = m.edicao_codigo and o.email_norm = m.email_norm and o.id <> m.id) then
    for g in select gm.grupo_id, gm.papel, gm.saiu_em from public.caca_grupo_membro gm
               join public.caca_grupo gr on gr.id = gm.grupo_id
              where gm.pessoa = m.email_norm and gr.edicao_codigo = m.edicao_codigo
    loop
      perform public.caca_grupo_lock(g.grupo_id);
      delete from public.caca_grupo_membro where grupo_id = g.grupo_id and pessoa = m.email_norm;
      if not exists (select 1 from public.caca_grupo_membro x where x.grupo_id = g.grupo_id and x.saiu_em is null) then
        delete from public.caca_grupo where id = g.grupo_id;     -- convites, rota e integrantes que já tinham saído vão junto (cascade)
      else
        update public.caca_grupo_convite set criado_por = 'removido' where grupo_id = g.grupo_id and criado_por = m.email_norm;
        update public.caca_grupo_rota set adicionado_por_pessoa = 'removido' where grupo_id = g.grupo_id and adicionado_por_pessoa = m.email_norm;
        if g.papel = 'dono' and g.saiu_em is null then
          select x.id into v_prox from public.caca_grupo_membro x
           where x.grupo_id = g.grupo_id and x.saiu_em is null order by x.entrou_em, x.id limit 1;
          update public.caca_grupo_membro set papel = 'dono' where id = v_prox;
        end if;
      end if;
    end loop;
  end if;

  delete from public.mapas_lover where id = m.id;  -- carimbos, pedidos de presença, códigos vão junto (cascade)
  return true;
end $$;

-- ---------------------------------------------------------------- C04: placar por pontos (regra extinta) fora da API pública
revoke all on function public.ranking_mapa(text), public.mapa_ler(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- CONFIRMAR só vale para o mapa de quem digita (ajuste no mesmo dia)
-- Sem isto, quem recebe dois e-mails (um que pediu, outro que um invasor pediu com a chave do mapa dele) poderia digitar o código do
-- invasor e confirmar o mapa errado. Agora a validação de 'confirmar' leva a chave e só olha os códigos emitidos àquele mapa.
create or replace function public.mapa_codigo_validar(p_edicao text, p_email text, p_codigo text, p_finalidade text, p_chave text default null)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_cod text := btrim(coalesce(p_codigo, '')); c public.mapa_codigo%rowtype;
  v_chave text; v_apelido text; v_ids uuid[] := '{}'; v_ok boolean := false; v_alvo uuid;
  v_inv constant jsonb := jsonb_build_object('ok', false, 'motivo', 'codigo_invalido');
begin
  if p_finalidade is null or p_finalidade not in ('confirmar', 'recuperar') or v_cod !~ '^\d{6}$'
     or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then return v_inv; end if;
  if p_finalidade = 'confirmar' then
    select id into v_alvo from public.mapas_lover
     where chave_hash = public.mapa_hash(p_chave) and edicao_codigo = p_edicao and email_norm = v_email;
    if v_alvo is null then return v_inv; end if;
  end if;

  for c in
    select c2.* from public.mapa_codigo c2 join public.mapas_lover m on m.id = c2.mapa_id
     where m.edicao_codigo = p_edicao and m.email_norm = v_email and c2.finalidade = p_finalidade
       and (v_alvo is null or c2.mapa_id = v_alvo)
       and c2.usado_em is null and c2.expira_em > now() and c2.tentativas < 5
     order by c2.criado_em desc limit 3 for update of c2
  loop
    v_ids := v_ids || c.id;
    if public.caca_igual_ct(c.codigo_hash, public.caca_hash_texto('codigo:' || c.id || ':' || c.finalidade || ':' || v_cod)) then
      v_ok := true; exit;
    end if;
  end loop;
  if not v_ok then
    if array_length(v_ids, 1) > 0 then update public.mapa_codigo set tentativas = tentativas + 1 where id = any (v_ids); end if;
    return v_inv;
  end if;

  update public.mapa_codigo set usado_em = now() where id = c.id;
  update public.mapas_lover set email_confirmado_em = coalesce(email_confirmado_em, now()) where id = c.mapa_id;

  if p_finalidade = 'confirmar' then return jsonb_build_object('ok', true, 'finalidade', 'confirmar'); end if;

  v_chave := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
  update public.mapas_lover set chave_hash = public.mapa_hash(v_chave), ultimo_acesso_em = now()
   where id = c.mapa_id returning apelido into v_apelido;
  return jsonb_build_object('ok', true, 'finalidade', 'recuperar', 'chave', v_chave, 'apelido', v_apelido);
end $$;
drop function if exists public.mapa_codigo_validar(text, text, text, text);
revoke all on function public.mapa_codigo_validar(text, text, text, text, text) from public;
grant execute on function public.mapa_codigo_validar(text, text, text, text, text) to anon, authenticated;
