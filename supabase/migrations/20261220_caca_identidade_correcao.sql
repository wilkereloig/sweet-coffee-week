-- Caça aos Carimbos, identidade: fechamento dos resíduos de SEC-01/SEC-03/SEC-07/E2E-2 (revisão de 05/11/2026; Wilker autorizou aplicar).
-- Depois de 20261216 (identidade_verificada) e 20261219 (principal_booleano). Contrato: docs/cartoon-2026-2/15-caca-contrato-identidade.md.
-- Teste: supabase/testes/caca-identidade-sequestro.sql.
--
-- Nome do arquivo: 20261220 (e não 20261216) para ordenar DEPOIS de 20261216_caca_identidade_verificada.sql ao reaplicar do zero; o
-- nome aplicado no banco é 'caca_identidade_correcao', igual ao deste arquivo.
--
-- 1. SEC-07 (e-mail entregável). mapa_criar_v2 e mapa_codigo_emitir_interno passam a exigir endereço de formato seguro
--    (^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$ sobre o e-mail em minúsculas): o valor vai direto ao campo "to" do provedor e
--    vírgula, aspas ou <> na parte local deixariam o provedor ler outro destinatário. Mapa novo com endereço fora disso responde
--    'email_invalido'. (Banco ao vivo tinha 0 mapas na data; nada a migrar.)
-- 2. SEC-07 (canal lateral). Quando não há nada a enviar (e-mail sem mapa, confirmar já confirmado, chave que não é do e-mail) a RPC
--    faz o mesmo tipo de trabalho do caminho de envio (gerar o código, calcular o hash, gravar uma linha) e devolve igual. A borda
--    (edge function) soma um piso de tempo fixo com acréscimo aleatório. Resíduo aceito: diferença de microssegundos de I/O.
-- 3. SEC-01 (apelido do invasor). RECUPERAR com a identidade em disputa (2+ mapas, nenhum confirmado) entregava a chave do mapa MAIS
--    ANTIGO, que pode ser o do invasor (apelido dele passava a ser o da pessoa no ranking). Agora, em disputa, vai para o mapa com
--    mais carimbos ativos (empate: o mais antigo). Fora de disputa nada muda (o principal).
-- 4. E2E-2 / SEC-01 (herança de grupo). mapa_apagar só mantém a pessoa nos grupos se sobrar outro mapa com e-mail CONFIRMADO. Antes,
--    bastava existir qualquer outro mapa do e-mail: apagar o próprio mapa confirmado deixava o mapa de um invasor (não confirmado, e
--    agora o único, logo principal) herdar a posse e a participação em grupos. Agora a pessoa sai dos grupos (e-mail e apelido
--    apagados, posse repassada, grupo vazio some) e entra de novo por convite. O registro de prêmio já sorteado continua, como diz o
--    regulamento (caca_premio não tem FK com o mapa).
--
-- Reverter: restaurar mapa_criar_v2 (20261130/20261210), mapa_codigo_emitir_interno (20261216) e mapa_apagar (20261216) —
--   -- reverter: create or replace das três funções com o texto desses arquivos.

-- ---------------------------------------------------------------- criar mapa: endereço de formato seguro
create or replace function public.mapa_criar_v2(p_edicao text, p_apelido text, p_email text, p_whatsapp text, p_ranking boolean, p_aceite boolean)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_ip text; v_h text;
begin
  if v_email !~ '^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$' or char_length(v_email) > 254 then
    raise exception 'email_invalido';
  end if;
  perform pg_advisory_xact_lock(hashtext('mapa_criar:' || p_edicao || ':' || v_email));
  if (select count(*) from public.mapas_lover where edicao_codigo = p_edicao and email_norm = v_email
                                                and criado_em > now() - interval '24 hours') >= 5 then
    raise exception 'muitos_pedidos';
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

-- ---------------------------------------------------------------- código por e-mail
create or replace function public.mapa_codigo_emitir_interno(p_edicao text, p_email text, p_finalidade text,
                                                             p_chave text default null, p_ip text default null)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_h text; v_ip text; v_mapa public.mapas_lover%rowtype;
  v_cod text; v_id uuid := gen_random_uuid(); v_b bytea; v_ttl constant interval := interval '10 minutes'; v_pad text;
begin
  if p_finalidade is null or p_finalidade not in ('confirmar', 'recuperar')
     or char_length(v_email) > 254 or v_email !~ '^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$'
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

  -- Quem recebe o código: CONFIRMAR = o mapa da chave enviada (e do mesmo e-mail); RECUPERAR = o principal; em disputa (2+ mapas,
  -- nenhum confirmado) o mapa com mais carimbos ativos, empate o mais antigo (o invasor raramente tem carimbos, a pessoa sim).
  if p_finalidade = 'confirmar' then
    if nullif(btrim(coalesce(p_chave, '')), '') is not null then
      select * into v_mapa from public.mapas_lover
       where chave_hash = public.mapa_hash(p_chave) and edicao_codigo = p_edicao and email_norm = v_email;
    end if;
  else
    select * into v_mapa from public.mapas_lover
     where id = coalesce(public.caca_mapa_principal(p_edicao, v_email),
                         (select m.id from public.mapas_lover m
                           where m.edicao_codigo = p_edicao and m.email_norm = v_email
                           order by (select count(*) from public.carimbos k where k.mapa_id = m.id and k.anulado_em is null) desc,
                                    m.criado_em, m.id limit 1));
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

  -- Nada a enviar (sem mapa, ou confirmar de mapa já confirmado): faz o mesmo trabalho do envio (código, hash, uma linha gravada)
  -- para a resposta não demorar de um jeito diferente. A linha de enchimento é limpa com os pedidos de mais de 2 dias.
  if v_mapa.id is null or (p_finalidade = 'confirmar' and v_mapa.email_confirmado_em is not null) then
    v_b := extensions.gen_random_bytes(4);
    v_pad := public.caca_hash_texto('padding:' || v_id || ':' || get_byte(v_b, 0));
    insert into public.mapa_codigo_pedido (email_hash) values ('pad:' || v_pad);
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
revoke all on function public.mapa_codigo_emitir_interno(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.mapa_codigo_emitir_interno(text, text, text, text, text) to service_role;

-- ---------------------------------------------------------------- apagar o mapa: só fica nos grupos quem ainda tem mapa CONFIRMADO
create or replace function public.mapa_apagar(p_chave text)
 returns boolean language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; g record; v_prox uuid;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || m.edicao_codigo || ':' || m.email_norm, 0));

  -- A pessoa é o e-mail: ela só segue nos grupos se sobrar OUTRO mapa com e-mail confirmado (um mapa não confirmado, que pode ser de
  -- um invasor, não herda a participação nem a posse). Sem isso, sai o integrante (e-mail e apelido) de todos os grupos da edição.
  if not exists (select 1 from public.mapas_lover o
                  where o.edicao_codigo = m.edicao_codigo and o.email_norm = m.email_norm and o.id <> m.id
                    and o.email_confirmado_em is not null) then
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

  delete from public.mapas_lover where id = m.id;  -- carimbos, pedidos de presença, códigos, avisos vão junto (cascade); caca_premio fica (sem FK)
  return true;
end $$;
