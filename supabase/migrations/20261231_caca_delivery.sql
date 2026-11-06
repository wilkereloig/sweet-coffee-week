-- Caça aos Carimbos: CARIMBO DE DELIVERY — confirmação pela casa (caminho principal) ou análise de imagem pela organização. (06/11/2026)
-- Quem pediu e recebeu o combo por delivery pede o carimbo sem estar perto da casa, sem GPS e sem entregar a chave do mapa:
--   · CASA: o pedido nasce com um código temporário (24 h, uso único, 6 caracteres) que o cliente manda à casa pelo canal em que já
--     trata do pedido; a casa digita o código no painel dela, vê o essencial e confirma que entregou. Vale só para a PRÓPRIA casa
--     (a busca do código é feita só entre as participações da conta logada) e nunca aprova presença, voucher ou outra casa.
--   · IMAGEM: o cliente anexa UM print/foto do pedido; o pedido fica "em análise" e quem decide é a organização, no mesmo painel de
--     pedidos de presença. A imagem mora num bucket PRIVADO (caca-delivery), sem policy: só quem tem URL assinada de vida curta lê.
-- Nada disso carimba ou pontua na abertura: o pedido só vira carimbo na confirmação da casa ou na aprovação da organização, com
-- origem própria ('delivery_casa' | 'delivery_organizacao'), criado_em = now() (nunca retroage apuração de voucher) e, como qualquer
-- carimbo, só vira casa VALIDADA depois da avaliação do combo com o mesmo e-mail do mapa. 12 h por casa/e-mail e janela da avaliação valem.
--
-- Reaproveita a fila de revisão de presença (caca_carimbo_excecao): `motivo = 'delivery'`. Pontuação, pesos e prêmios NÃO mudam.
-- Retenção da imagem: NÃO há prazo aprovado. Esta migration não apaga nada sozinha; deixa a exclusão manual pelo painel
-- (arquivo-url, ação `remover`). Pendência registrada em docs/cartoon-2026-2/16-delivery-carimbo.md.
-- Reverter: supabase/reverter/20261231_caca_delivery.sql

-- ---------------------------------------------------------------- 1. tabela da fila, origem do carimbo
alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_motivo_check;
alter table public.caca_carimbo_excecao add constraint caca_carimbo_excecao_motivo_check
  check (motivo in ('sem_localizacao', 'imprecisa', 'longe', 'visita_anterior', 'delivery'));

alter table public.caca_carimbo_excecao
  add column if not exists via text,
  add column if not exists pedido_data date,
  add column if not exists pedido_ref text,
  add column if not exists codigo text,
  add column if not exists codigo_expira_em timestamptz,
  add column if not exists codigos_gerados integer not null default 0,
  add column if not exists imagem_path text,
  add column if not exists imagem_enviada_em timestamptz,
  add column if not exists imagem_removida_em timestamptz,
  add column if not exists imagem_reservas integer not null default 0;

alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_delivery_check;
alter table public.caca_carimbo_excecao add constraint caca_carimbo_excecao_delivery_check check (
  (motivo = 'delivery' and via in ('casa', 'imagem') and pedido_data is not null and codigo is not null
     and (pedido_ref is null or char_length(pedido_ref) <= 40))
  or (motivo <> 'delivery' and via is null and pedido_data is null and pedido_ref is null and codigo is null
     and imagem_path is null));
alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_via_check;
alter table public.caca_carimbo_excecao add constraint caca_carimbo_excecao_via_check
  check ((via is distinct from 'casa' or codigo_expira_em is not null) and (via is distinct from 'imagem' or imagem_path is not null));
create unique index if not exists caca_excecao_codigo_unico on public.caca_carimbo_excecao (codigo) where codigo is not null;
create index if not exists caca_excecao_delivery on public.caca_carimbo_excecao (edicao_codigo, participacao_id, estado) where motivo = 'delivery';

alter table public.carimbos drop constraint if exists carimbos_origem_check;
alter table public.carimbos add constraint carimbos_origem_check
  check (origem in ('gps', 'unidade_sem_coordenada', 'excecao_painel', 'visita_anterior', 'delivery_casa', 'delivery_organizacao'));
create or replace function public.carimbos_origem_definir()
 returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  if new.origem not in ('excecao_painel', 'visita_anterior', 'delivery_casa', 'delivery_organizacao') then
    new.origem := case when new.conferido then 'gps' else 'unidade_sem_coordenada' end;
  end if;
  return new;
end $function$;

-- Tentativas de código na casa (limite contra adivinhação). Só o servidor lê e escreve.
create table if not exists public.caca_delivery_tentativa (
  id        bigint generated always as identity primary key,
  user_id   uuid not null,
  ok        boolean not null,
  criado_em timestamptz not null default now()
);
create index if not exists caca_delivery_tentativa_user on public.caca_delivery_tentativa (user_id, criado_em desc);
alter table public.caca_delivery_tentativa enable row level security;
revoke all on table public.caca_delivery_tentativa from public, anon, authenticated;

-- Bucket PRIVADO das imagens. Sem policy: só service_role (edge function caca-delivery grava; arquivo-url lê/remove).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('caca-delivery', 'caca-delivery', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- ---------------------------------------------------------------- 2. utilitários
-- Código da casa: 6 caracteres de um alfabeto sem 0/O/1/I. Único em toda a tabela.
create or replace function public.caca_delivery_gerar_codigo()
 returns text language plpgsql volatile set search_path to 'public'
as $$
declare a constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; r text; b bytea; i int;
begin
  loop
    b := extensions.gen_random_bytes(6); r := '';
    for i in 0..5 loop r := r || substr(a, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from public.caca_carimbo_excecao where codigo = r);
  end loop;
  return r;
end $$;
revoke all on function public.caca_delivery_gerar_codigo() from public, anon, authenticated;

-- Pedido de delivery ainda "de pé": aprovado, em análise (imagem) ou com código válido. Pedido com código vencido não conta nos limites.
create or replace function public.caca_delivery_em_pe(e public.caca_carimbo_excecao)
 returns boolean language sql stable set search_path to 'public'
as $$ select e.estado = 'aprovado' or (e.estado = 'pendente' and (e.via = 'imagem' or e.codigo_expira_em > now())) $$;
revoke all on function public.caca_delivery_em_pe(public.caca_carimbo_excecao) from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. visitante: pedir
-- Retorno: {ok:true, id, estado:'pendente', via:'casa', codigo, expira_em, slug} ou {ok:false, motivo}:
--   mapa_desconhecido · email_nao_confirmado · qr_invalido · casa_sem_combo · encerrada · nao_aberta · data_invalida · data_futura ·
--   sem_delivery (nenhuma unidade da casa declarou delivery) · unidade_obrigatoria · unidade_invalida · ja_pedido · limite_pedidos ·
--   muitos_pendentes · fila_cheia.
-- Sem GPS e sem posição: nada de localização entra aqui. Quem já tem carimbo na casa PODE pedir (revisita); as 12 h valem na decisão.
create or replace function public.caca_delivery_pedir(p_chave text, p_slug text, p_unidade text, p_data date, p_ref text, p_nota text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_slug text := lower(btrim(coalesce(p_slug, ''))); v_pa uuid; v_c public.edicao_publicacao%rowtype;
  v_pu uuid; v_n int; v_id uuid; v_nota text; v_ref text; v_cod text; v_exp timestamptz;
  v_hoje date := (now() at time zone 'America/Fortaleza')::date; v_ini date;
  v_un text := nullif(lower(btrim(coalesce(p_unidade, ''))), '');
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm)
     or not public.caca_email_confirmado(m.edicao_codigo, m.email_norm) then
    return jsonb_build_object('ok', false, 'motivo', 'email_nao_confirmado');
  end if;

  select pa.id into v_pa from public.participacoes pa
   where pa.edicao_codigo = m.edicao_codigo and pa.slug_publico = v_slug and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  if v_pa is null then return jsonb_build_object('ok', false, 'motivo', 'qr_invalido'); end if;
  if not (v_pa in (select public.caca_casas_conta(m.edicao_codigo))) then
    return jsonb_build_object('ok', false, 'motivo', 'casa_sem_combo', 'slug', v_slug);
  end if;
  -- Janela da avaliação da edição (a mesma de qualquer carimbo): o prazo excepcional de 05/11 da visita anterior NÃO vale aqui.
  select * into v_c from public.edicao_publicacao where edicao_codigo = m.edicao_codigo;
  if now() > v_c.avaliacao_fecha_em then return jsonb_build_object('ok', false, 'motivo', 'encerrada', 'slug', v_slug); end if;
  if not coalesce(v_c.avaliacao_aberta, false) or now() < v_c.avaliacao_abre_em then
    return jsonb_build_object('ok', false, 'motivo', 'nao_aberta', 'slug', v_slug);
  end if;

  select e.festival_inicio into v_ini from public.edicoes e where e.codigo = m.edicao_codigo;
  if p_data is null or (v_ini is not null and p_data < v_ini) then return jsonb_build_object('ok', false, 'motivo', 'data_invalida'); end if;
  if p_data > v_hoje then return jsonb_build_object('ok', false, 'motivo', 'data_futura'); end if;

  -- Unidade: só entra quem declarou delivery "sim" para o combo, participa e tem QR ativo. "Não informado" NÃO é delivery.
  select count(*) into v_n from public.participacao_unidades pu
   where pu.participacao_id = v_pa and pu.participa and pu.delivery_combo = 'sim'
     and exists (select 1 from public.carimbo_qr cq where cq.participacao_unidade_id = pu.id and cq.ativo);
  if v_n = 0 then return jsonb_build_object('ok', false, 'motivo', 'sem_delivery', 'slug', v_slug); end if;
  if v_un is null then
    if v_n > 1 then return jsonb_build_object('ok', false, 'motivo', 'unidade_obrigatoria', 'slug', v_slug); end if;
    select pu.id into v_pu from public.participacao_unidades pu
     where pu.participacao_id = v_pa and pu.participa and pu.delivery_combo = 'sim'
       and exists (select 1 from public.carimbo_qr cq where cq.participacao_unidade_id = pu.id and cq.ativo) limit 1;
  else
    select pu.id into v_pu from public.participacao_unidades pu
     where pu.participacao_id = v_pa and pu.participa and pu.delivery_combo = 'sim' and lower(pu.id_publico::text) = v_un
       and exists (select 1 from public.carimbo_qr cq where cq.participacao_unidade_id = pu.id and cq.ativo) limit 1;
  end if;
  if v_pu is null then return jsonb_build_object('ok', false, 'motivo', 'unidade_invalida'); end if;
  v_nota := public.caca_texto_limpo(p_nota, 200);
  v_ref := public.caca_texto_limpo(p_ref, 40);

  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || m.edicao_codigo || ':' || m.email_norm, 0));

  if exists (select 1 from public.caca_carimbo_excecao e
              where e.edicao_codigo = m.edicao_codigo and e.participacao_id = v_pa and e.motivo = 'delivery' and public.caca_delivery_em_pe(e)
                and ((v_ref is not null and lower(e.pedido_ref) = lower(v_ref))
                     or (e.pessoa = m.email_norm and e.pedido_data = p_data and (v_ref is null or e.pedido_ref is null)))) then
    return jsonb_build_object('ok', false, 'motivo', 'ja_pedido', 'slug', v_slug);
  end if;
  if (select count(*) from public.caca_carimbo_excecao e
       where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm and e.participacao_id = v_pa and e.motivo = 'delivery') >= 4 then
    return jsonb_build_object('ok', false, 'motivo', 'limite_pedidos', 'slug', v_slug);
  end if;
  if (select count(*) from public.caca_carimbo_excecao e
       where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm and e.motivo = 'delivery' and e.estado = 'pendente'
         and public.caca_delivery_em_pe(e)) >= 5 then
    return jsonb_build_object('ok', false, 'motivo', 'muitos_pendentes');
  end if;
  if (select count(*) from public.caca_carimbo_excecao e
       where e.edicao_codigo = m.edicao_codigo and e.participacao_id = v_pa and e.motivo = 'delivery' and e.estado = 'pendente'
         and public.caca_delivery_em_pe(e)) >= 60 then
    return jsonb_build_object('ok', false, 'motivo', 'fila_cheia');
  end if;

  v_cod := public.caca_delivery_gerar_codigo();
  v_exp := now() + interval '24 hours';
  insert into public.caca_carimbo_excecao (edicao_codigo, mapa_id, pessoa, participacao_id, participacao_unidade_id, motivo, via,
                                           pedido_data, pedido_ref, nota, codigo, codigo_expira_em, codigos_gerados)
  values (m.edicao_codigo, m.id, m.email_norm, v_pa, v_pu, 'delivery', 'casa', p_data, v_ref, v_nota, v_cod, v_exp, 1)
  returning id into v_id;
  insert into public.caca_evento (edicao_codigo, acao, ator, depois)
  values (m.edicao_codigo, 'delivery_pedido', 'visitante', jsonb_build_object('pedido', v_id, 'casa', v_slug, 'pedido_data', p_data));
  return jsonb_build_object('ok', true, 'id', v_id, 'estado', 'pendente', 'via', 'casa', 'codigo', v_cod, 'expira_em', v_exp, 'slug', v_slug);
end $$;

-- Código novo, só quando o anterior venceu e ainda não há imagem (até 3 por pedido). Com código válido devolve o mesmo.
create or replace function public.caca_delivery_novo_codigo(p_chave text, p_id uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; e public.caca_carimbo_excecao%rowtype; v_cod text; v_exp timestamptz;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  select * into e from public.caca_carimbo_excecao
   where id = p_id and motivo = 'delivery' and edicao_codigo = m.edicao_codigo and pessoa = m.email_norm for update;
  if e.id is null then return jsonb_build_object('ok', false, 'motivo', 'pedido_nao_encontrado'); end if;
  if e.estado <> 'pendente' or e.via <> 'casa' or e.imagem_path is not null then return jsonb_build_object('ok', false, 'motivo', 'transicao_invalida'); end if;
  if e.codigo_expira_em > now() then
    return jsonb_build_object('ok', true, 'id', e.id, 'codigo', e.codigo, 'expira_em', e.codigo_expira_em);
  end if;
  if e.codigos_gerados >= 3 then return jsonb_build_object('ok', false, 'motivo', 'limite_codigos'); end if;
  v_cod := public.caca_delivery_gerar_codigo(); v_exp := now() + interval '24 hours';
  update public.caca_carimbo_excecao set codigo = v_cod, codigo_expira_em = v_exp, codigos_gerados = e.codigos_gerados + 1 where id = e.id;
  return jsonb_build_object('ok', true, 'id', e.id, 'codigo', v_cod, 'expira_em', v_exp);
end $$;

-- ---------------------------------------------------------------- 4. visitante: imagem (reservar caminho → upload assinado → anexar)
-- Só a edge function caca-delivery (service_role) reserva o caminho; o navegador nunca escolhe o nome do arquivo.
-- Até 5 reservas por pedido (falha de rede não perde o pedido nem os dados). Uma imagem por pedido.
create or replace function public.caca_delivery_imagem_reservar(p_chave text, p_id uuid, p_ext text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; e public.caca_carimbo_excecao%rowtype; v_ext text := lower(btrim(coalesce(p_ext, ''))); v_path text;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if v_ext not in ('jpg', 'png', 'webp') then return jsonb_build_object('ok', false, 'motivo', 'formato_invalido'); end if;
  select * into e from public.caca_carimbo_excecao
   where id = p_id and motivo = 'delivery' and edicao_codigo = m.edicao_codigo and pessoa = m.email_norm for update;
  if e.id is null then return jsonb_build_object('ok', false, 'motivo', 'pedido_nao_encontrado'); end if;
  if e.estado <> 'pendente' or e.imagem_path is not null then return jsonb_build_object('ok', false, 'motivo', 'transicao_invalida'); end if;
  if e.imagem_reservas >= 5 then return jsonb_build_object('ok', false, 'motivo', 'limite_imagem'); end if;
  v_path := e.edicao_codigo || '/' || e.id || '/' || gen_random_uuid() || '.' || v_ext;
  update public.caca_carimbo_excecao set imagem_reservas = e.imagem_reservas + 1 where id = e.id;
  return jsonb_build_object('ok', true, 'path', v_path);
end $$;
revoke all on function public.caca_delivery_imagem_reservar(text, uuid, text) from public, anon, authenticated;
grant execute on function public.caca_delivery_imagem_reservar(text, uuid, text) to service_role;

-- Confirma o upload: o objeto precisa existir no bucket, no caminho reservado deste pedido, dentro do tamanho. O pedido passa a "em análise"
-- pela organização e o código da casa deixa de valer. NÃO carimba nem conta nada.
create or replace function public.caca_delivery_anexar(p_chave text, p_id uuid, p_path text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; e public.caca_carimbo_excecao%rowtype; o record;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  select * into e from public.caca_carimbo_excecao
   where id = p_id and motivo = 'delivery' and edicao_codigo = m.edicao_codigo and pessoa = m.email_norm for update;
  if e.id is null then return jsonb_build_object('ok', false, 'motivo', 'pedido_nao_encontrado'); end if;
  if e.estado <> 'pendente' or e.imagem_path is not null then return jsonb_build_object('ok', false, 'motivo', 'transicao_invalida'); end if;
  if p_path is null or p_path !~ ('^' || replace(e.edicao_codigo, '.', '\.') || '/' || e.id || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
    return jsonb_build_object('ok', false, 'motivo', 'imagem_invalida');
  end if;
  select ob.name, coalesce((ob.metadata ->> 'size')::bigint, 0) tam into o from storage.objects ob where ob.bucket_id = 'caca-delivery' and ob.name = p_path;
  if o.name is null then return jsonb_build_object('ok', false, 'motivo', 'imagem_ausente'); end if;
  if o.tam <= 0 or o.tam > 3145728 then return jsonb_build_object('ok', false, 'motivo', 'imagem_invalida'); end if;
  update public.caca_carimbo_excecao set via = 'imagem', imagem_path = p_path, imagem_enviada_em = now(), codigo_expira_em = now() where id = e.id;
  insert into public.caca_evento (edicao_codigo, acao, ator, depois)
  values (e.edicao_codigo, 'delivery_imagem_enviada', 'visitante', jsonb_build_object('pedido', e.id));
  return jsonb_build_object('ok', true, 'id', e.id, 'estado', 'pendente', 'via', 'imagem');
end $$;

-- Aviso para a organização quando chega imagem (sino + push do painel), como nos outros pedidos. Falha no aviso nunca derruba o envio.
create or replace function public.caca_delivery_avisa()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_casa text; v_apelido text; v_n int;
begin
  begin
    select pt.nome_marca into v_casa from public.participacoes pa join public.participantes pt on pt.id = pa.participante_id where pa.id = new.participacao_id;
    select m.apelido into v_apelido from public.mapas_lover m where m.id = new.mapa_id;
    select count(*) into v_n from public.caca_carimbo_excecao e
     where e.edicao_codigo = new.edicao_codigo and e.estado = 'pendente' and not (e.motivo = 'delivery' and e.via = 'casa');
    perform public.notificar('organizacao', null, 'pedido', 'Delivery com imagem: ' || coalesce(v_casa, 'uma casa'),
      coalesce(v_apelido, 'Alguém') || ' enviou a imagem do pedido de ' || to_char(new.pedido_data, 'DD/MM') || '. '
        || v_n || case when v_n = 1 then ' pedido espera' else ' pedidos esperam' end || ' decisão.', 'edicao/carimbos/presenca');
  exception when others then
    raise warning 'caca_delivery_avisa: %', sqlerrm;
  end;
  return null;
end $$;
revoke all on function public.caca_delivery_avisa() from public, anon, authenticated;
drop trigger if exists caca_delivery_avisa on public.caca_carimbo_excecao;
create trigger caca_delivery_avisa after update of imagem_path on public.caca_carimbo_excecao
  for each row when (old.imagem_path is null and new.imagem_path is not null and new.motivo = 'delivery')
  execute function public.caca_delivery_avisa();

-- ---------------------------------------------------------------- 5. visitante: acompanhar (superconjunto da versão de 20261226)
-- Acrescenta `id` e, nos de delivery: via, pedido_data, pedido_ref, codigo (só enquanto vale), expira_em, expirado, tem_imagem.
-- Nunca devolve nota interna, decisor nem caminho da imagem.
create or replace function public.caca_excecao_minhas(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  return jsonb_build_object('ok', true, 'pedidos', (
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', x.id, 'slug', pa.slug_publico, 'estado', x.estado, 'criado_em', x.criado_em,
                                                 'decidido_em', x.decidido_em, 'motivo', x.motivo, 'visita_data', x.visita_data,
                                                 'unidade', pu.id_publico,
                                                 'via', x.via, 'pedido_data', x.pedido_data, 'pedido_ref', x.pedido_ref,
                                                 'codigo', case when x.estado = 'pendente' and x.via = 'casa' and x.codigo_expira_em > now() then x.codigo end,
                                                 'expira_em', case when x.estado = 'pendente' and x.via = 'casa' then x.codigo_expira_em end,
                                                 'expirado', case when x.motivo = 'delivery' and x.estado = 'pendente' and x.via = 'casa'
                                                                  then x.codigo_expira_em <= now() end,
                                                 'tem_imagem', case when x.motivo = 'delivery' then (x.imagem_path is not null) end,
                                                 'codigos_restantes', case when x.motivo = 'delivery' and x.estado = 'pendente' and x.via = 'casa'
                                                                           then greatest(3 - x.codigos_gerados, 0) end)) order by x.criado_em desc), '[]'::jsonb)
      from (select * from public.caca_carimbo_excecao e
             where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm order by e.criado_em desc limit 30) x
      join public.participacoes pa on pa.id = x.participacao_id
      left join public.participacao_unidades pu on pu.id = x.participacao_unidade_id));
end $$;

-- ---------------------------------------------------------------- 6. casa: consultar e confirmar (painel da participante)
-- A conta logada (auth.uid()) só alcança as PRÓPRIAS participações: código de outra casa é "invalido", sem dizer se existe.
-- Falhas devolvem {ok:false, motivo} (não exceção), para a tentativa ficar registrada. 8 falhas em 15 min bloqueiam 15 min.
-- Motivos: nao_autorizado · bloqueado · codigo_invalido · codigo_usado · codigo_expirado · nao_aberta · encerrada · casa_sem_combo · cedo.
create or replace function public.caca_delivery_consultar(p_codigo text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_user uuid := auth.uid(); v_cod text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g')); e record; v_falhas int;
begin
  if v_user is null or not public.conta_ativa() then return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado'); end if;
  delete from public.caca_delivery_tentativa where criado_em < now() - interval '2 days';
  select count(*) into v_falhas from public.caca_delivery_tentativa where user_id = v_user and not ok and criado_em > now() - interval '15 minutes';
  if v_falhas >= 8 then return jsonb_build_object('ok', false, 'motivo', 'bloqueado', 'espera_min', 15); end if;

  select x.id, x.estado, x.via, x.codigo_expira_em, x.pedido_data, x.pedido_ref, x.criado_em, x.participacao_id, x.edicao_codigo, x.pessoa,
         m.apelido, un.nome_unidade
    into e
    from public.caca_carimbo_excecao x
    join public.participacoes pa on pa.id = x.participacao_id
    join public.participantes pt on pt.id = pa.participante_id
    join public.mapas_lover m on m.id = x.mapa_id
    left join public.participacao_unidades pu on pu.id = x.participacao_unidade_id
    left join public.unidades un on un.id = pu.unidade_id
   where x.motivo = 'delivery' and x.codigo = v_cod and pt.user_id = v_user;
  if e.id is null or e.estado = 'negado' or e.via <> 'casa' then
    insert into public.caca_delivery_tentativa (user_id, ok) values (v_user, false);
    return jsonb_build_object('ok', false, 'motivo', 'codigo_invalido');
  end if;
  if e.estado = 'aprovado' then return jsonb_build_object('ok', false, 'motivo', 'codigo_usado'); end if;
  if e.codigo_expira_em <= now() then return jsonb_build_object('ok', false, 'motivo', 'codigo_expirado'); end if;
  return jsonb_build_object('ok', true, 'pedido', jsonb_strip_nulls(jsonb_build_object(
    'apelido', e.apelido, 'unidade', e.nome_unidade, 'pedido_data', e.pedido_data, 'pedido_ref', e.pedido_ref,
    'criado_em', e.criado_em, 'expira_em', e.codigo_expira_em,
    'avaliou', exists (select 1 from public.avaliacoes a where a.edicao_codigo = e.edicao_codigo and a.participacao_id = e.participacao_id and a.email_norm = e.pessoa))));
end $$;

create or replace function public.caca_delivery_confirmar(p_codigo text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_user uuid := auth.uid(); v_cod text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  e public.caca_carimbo_excecao%rowtype; v_c public.edicao_publicacao%rowtype; v_falhas int; v_ult timestamptz; v_pu uuid; v_qr text; v_k uuid;
  v_marca text; v_part uuid; v_slug text;
begin
  if v_user is null or not public.conta_ativa() then return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado'); end if;
  select count(*) into v_falhas from public.caca_delivery_tentativa where user_id = v_user and not ok and criado_em > now() - interval '15 minutes';
  if v_falhas >= 8 then return jsonb_build_object('ok', false, 'motivo', 'bloqueado', 'espera_min', 15); end if;

  select x.* into e from public.caca_carimbo_excecao x
    join public.participacoes pa on pa.id = x.participacao_id
    join public.participantes pt on pt.id = pa.participante_id
   where x.motivo = 'delivery' and x.codigo = v_cod and pt.user_id = v_user
     for update of x;
  if e.id is null or e.estado = 'negado' or e.via <> 'casa' then
    insert into public.caca_delivery_tentativa (user_id, ok) values (v_user, false);
    return jsonb_build_object('ok', false, 'motivo', 'codigo_invalido');
  end if;
  -- Uso único: quem chega depois do primeiro confirmador encontra o pedido já aprovado (a linha estava travada).
  if e.estado = 'aprovado' then return jsonb_build_object('ok', false, 'motivo', 'codigo_usado'); end if;
  if e.codigo_expira_em <= now() then return jsonb_build_object('ok', false, 'motivo', 'codigo_expirado'); end if;

  select * into v_c from public.edicao_publicacao where edicao_codigo = e.edicao_codigo;
  if not coalesce(v_c.avaliacao_aberta, false) or now() < v_c.avaliacao_abre_em then return jsonb_build_object('ok', false, 'motivo', 'nao_aberta'); end if;
  if now() > v_c.avaliacao_fecha_em then return jsonb_build_object('ok', false, 'motivo', 'encerrada'); end if;
  if not (e.participacao_id in (select public.caca_casas_conta(e.edicao_codigo))) then return jsonb_build_object('ok', false, 'motivo', 'casa_sem_combo'); end if;

  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || e.edicao_codigo || ':' || e.pessoa, 0));
  select max(k.criado_em) into v_ult
    from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
   where k.participacao_id = e.participacao_id and m2.edicao_codigo = e.edicao_codigo and k.anulado_em is null
     and (k.mapa_id = e.mapa_id or m2.email_norm = e.pessoa);
  if v_ult is not null and now() < v_ult + interval '12 hours' then
    return jsonb_build_object('ok', false, 'motivo', 'cedo', 'proximo_em', v_ult + interval '12 hours');
  end if;

  v_pu := e.participacao_unidade_id;
  select cq.codigo into v_qr from public.carimbo_qr cq where cq.participacao_unidade_id = v_pu and cq.ativo;
  if v_qr is null then return jsonb_build_object('ok', false, 'motivo', 'casa_sem_combo'); end if;

  select pa.participante_id, pt.nome_marca, pa.slug_publico into v_part, v_marca, v_slug
    from public.participacoes pa join public.participantes pt on pt.id = pa.participante_id where pa.id = e.participacao_id;
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, distancia_m, precisao_m, conferido, origem)
  values (e.mapa_id, e.participacao_id, v_pu, v_qr, null, null, false, 'delivery_casa')
  returning id into v_k;
  update public.caca_carimbo_excecao set estado = 'aprovado', decidido_por = 'Casa: ' || v_marca, decidido_user = v_user,
         decidido_em = now(), decisao_nota = 'Confirmado pela casa', carimbo_id = v_k where id = e.id;
  insert into public.caca_delivery_tentativa (user_id, ok) values (v_user, true);
  perform public.caca_evento_gravar(e.edicao_codigo, null, 'delivery_confirmado', jsonb_build_object('estado', 'pendente'),
    jsonb_build_object('estado', 'aprovado', 'pedido', e.id, 'casa', v_slug, 'carimbo', v_k), 'Confirmado pela casa');
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('carimbo.delivery_casa', 'carimbos', v_k::text, v_part, e.participacao_id, jsonb_build_object('pedido', e.id, 'pedido_data', e.pedido_data));
  return jsonb_build_object('ok', true, 'estado', 'aprovado', 'carimbo_id', v_k);
end $$;

-- ---------------------------------------------------------------- 7. organização: listar e decidir (superconjunto de 20261226)
create or replace function public.caca_excecao_listar(p_secret text, p_edicao text, p_estado text default null)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_rel boolean; v_ger boolean; v_est text := nullif(btrim(coalesce(p_estado, '')), '');
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  if v_est is not null and v_est not in ('pendente', 'aprovado', 'negado') then raise exception 'parametro_invalido'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  v_ger := public.pode(p_secret, 'producao.gerir');
  return jsonb_build_object(
    -- `pendentes` = o que a ORGANIZAÇÃO pode decidir agora. Delivery aguardando a casa não é dela: vai em `aguardando_casa`.
    'pendentes', (select count(*) from public.caca_carimbo_excecao e
                   where e.edicao_codigo = p_edicao and e.estado = 'pendente' and not (e.motivo = 'delivery' and e.via = 'casa')),
    'aguardando_casa', (select count(*) from public.caca_carimbo_excecao e
                         where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'delivery' and e.via = 'casa'),
    'pendentes_visita_anterior', (select count(*) from public.caca_carimbo_excecao e
                                   where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'visita_anterior'),
    'pendentes_delivery', (select count(*) from public.caca_carimbo_excecao e
                            where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'delivery' and e.via = 'imagem'),
    'itens', (select coalesce(jsonb_agg(x.o order by x.ordem, x.fila), '[]'::jsonb) from (
        select case when e.estado = 'pendente' then 0 else 1 end ordem,
               case when e.estado = 'pendente' then extract(epoch from e.criado_em) else -extract(epoch from e.criado_em) end fila,
               jsonb_strip_nulls(jsonb_build_object(
                 'id', e.id, 'estado', e.estado, 'criado_em', e.criado_em, 'motivo', e.motivo, 'visita_data', e.visita_data,
                 'via', e.via, 'pedido_data', e.pedido_data, 'pedido_ref', e.pedido_ref,
                 'aguardando_casa', case when e.motivo = 'delivery' and e.estado = 'pendente' then e.via = 'casa' end,
                 'codigo_expirado', case when e.motivo = 'delivery' and e.via = 'casa' and e.estado = 'pendente' then e.codigo_expira_em <= now() end,
                 'imagem', case when v_ger and e.imagem_path is not null and e.imagem_removida_em is null then e.imagem_path end,
                 'imagem_removida', case when e.imagem_removida_em is not null then true end,
                 'imagem_enviada_em', e.imagem_enviada_em,
                 'apelido', m.apelido, 'casa', pt.nome_marca, 'slug', pa.slug_publico,
                 'unidade', pu.id_publico, 'nome_unidade', u.nome_unidade, 'unidades_na_casa', (select count(*) from public.participacao_unidades p2
                                                                                                  where p2.participacao_id = e.participacao_id and p2.participa),
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

-- Igual à de 20261226, com delivery: só a organização decide pedido com IMAGEM (o de código é da casa: 'aguarda_casa'); aprovar cria o
-- carimbo com origem 'delivery_organizacao' (sem exigir imagem ainda existente: ela pode ter sido removida depois de decidida, nunca antes).
-- Erros (exception) novos: aguarda_casa · sem_imagem.
create or replace function public.caca_excecao_decidir(p_secret text, p_id uuid, p_decisao text, p_nota text default null)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare e public.caca_carimbo_excecao%rowtype; v_dec text := lower(btrim(coalesce(p_decisao, ''))); v_nota text;
  v_c public.edicao_publicacao%rowtype; v_pu uuid; v_qr text; v_ult timestamptz; v_k uuid;
  v_ator text := coalesce(public.ator_rotulo_atual(), 'Painel'); v_slug text; v_visita boolean; v_delivery boolean; v_origem text; v_part uuid;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_dec not in ('aprovar', 'negar') then raise exception 'parametro_invalido'; end if;
  v_nota := public.caca_texto_limpo(p_nota, 200);
  select * into e from public.caca_carimbo_excecao where id = p_id for update;
  if e.id is null then raise exception 'pedido_nao_encontrado'; end if;
  if e.estado <> 'pendente' then raise exception 'transicao_invalida'; end if;
  v_visita := e.motivo = 'visita_anterior';
  v_delivery := e.motivo = 'delivery';
  if v_delivery and e.via <> 'imagem' then raise exception 'aguarda_casa'; end if;
  if v_delivery and v_dec = 'aprovar' and (e.imagem_path is null or e.imagem_removida_em is not null) then raise exception 'sem_imagem'; end if;
  v_origem := case when v_visita then 'visita_anterior' when v_delivery then 'delivery_organizacao' else 'excecao_painel' end;
  select pa.slug_publico, pa.participante_id into v_slug, v_part from public.participacoes pa where pa.id = e.participacao_id;

  if v_dec = 'negar' then
    if v_nota is null then raise exception 'nota_obrigatoria'; end if;
    update public.caca_carimbo_excecao set estado = 'negado', decidido_por = v_ator, decidido_user = auth.uid(),
           decidido_em = now(), decisao_nota = v_nota where id = e.id;
    perform public.caca_evento_gravar(e.edicao_codigo, null,
      case when v_visita then 'visita_anterior_negada' when v_delivery then 'delivery_negado' else 'excecao_negada' end,
      jsonb_build_object('estado', 'pendente'), jsonb_build_object('estado', 'negado', 'pedido', e.id, 'casa', v_slug), v_nota);
    return jsonb_build_object('ok', true, 'estado', 'negado');
  end if;

  select * into v_c from public.edicao_publicacao where edicao_codigo = e.edicao_codigo;
  if not coalesce(v_c.avaliacao_aberta, false) or now() < v_c.avaliacao_abre_em then raise exception 'nao_aberta'; end if;
  if now() > v_c.avaliacao_fecha_em then raise exception 'encerrada'; end if;
  if not (e.participacao_id in (select public.caca_casas_conta(e.edicao_codigo))) then raise exception 'casa_sem_combo'; end if;

  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || e.edicao_codigo || ':' || e.pessoa, 0));
  if v_visita and exists (select 1 from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
                           where k.participacao_id = e.participacao_id and m2.edicao_codigo = e.edicao_codigo and k.anulado_em is null
                             and (k.mapa_id = e.mapa_id or m2.email_norm = e.pessoa)) then
    raise exception 'ja_carimbou';
  end if;
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
  values (e.mapa_id, e.participacao_id, v_pu, v_qr, e.distancia_m, e.precisao_m, false, v_origem)
  returning id into v_k;
  update public.caca_carimbo_excecao set estado = 'aprovado', decidido_por = v_ator, decidido_user = auth.uid(),
         decidido_em = now(), decisao_nota = v_nota, carimbo_id = v_k, participacao_unidade_id = v_pu where id = e.id;
  perform public.caca_evento_gravar(e.edicao_codigo, null,
    case when v_visita then 'visita_anterior_aprovada' when v_delivery then 'delivery_aprovado' else 'excecao_aprovada' end,
    jsonb_build_object('estado', 'pendente'), jsonb_build_object('estado', 'aprovado', 'pedido', e.id, 'casa', v_slug, 'carimbo', v_k), v_nota);
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values (case when v_visita then 'carimbo.visita_anterior' when v_delivery then 'carimbo.delivery_organizacao' else 'carimbo.excecao' end,
          'carimbos', v_k::text, v_part, e.participacao_id,
          jsonb_build_object('pedido', e.id, 'nota', v_nota, 'visita_data', e.visita_data, 'pedido_data', e.pedido_data));
  return jsonb_build_object('ok', true, 'estado', 'aprovado', 'carimbo_id', v_k);
end $$;

-- ---------------------------------------------------------------- permissões
revoke all on function public.caca_delivery_pedir(text, text, text, date, text, text), public.caca_delivery_novo_codigo(text, uuid),
  public.caca_delivery_anexar(text, uuid, text) from public, anon, authenticated;
grant execute on function public.caca_delivery_pedir(text, text, text, date, text, text), public.caca_delivery_novo_codigo(text, uuid),
  public.caca_delivery_anexar(text, uuid, text) to anon, authenticated;
revoke all on function public.caca_delivery_consultar(text), public.caca_delivery_confirmar(text) from public, anon, authenticated;
grant execute on function public.caca_delivery_consultar(text), public.caca_delivery_confirmar(text) to authenticated;
-- caca_excecao_minhas / _listar / _decidir mantêm os grants de antes (create or replace não os altera).

-- ---------------------------------------------------------------- alertas da auditoria (get_mapa_carimbos)
-- Carimbo de delivery também nasce na hora da decisão e sem GPS: sai dos alertas "viagem impossível" e "sem conferência", como o de visita anterior.
create or replace function public.get_mapa_carimbos(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_rel boolean;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  return jsonb_build_object(
    'totais', (select jsonb_build_object(
                 'mapas', (select count(*) from public.mapas_lover where edicao_codigo = p_edicao),
                 'carimbos', count(*) filter (where k.anulado_em is null),
                 'anulados', count(*) filter (where k.anulado_em is not null),
                 'sem_conferencia', count(*) filter (where k.anulado_em is null and not k.conferido and k.origem not in ('visita_anterior', 'delivery_casa', 'delivery_organizacao')),
                 'pontos', (select coalesce(sum(p.pontos), 0) from public.carimbo_placar(p_edicao) p),
                 'avaliadas', (select coalesce(sum(p.avaliadas), 0) from public.carimbo_placar(p_edicao) p))
                 from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id where m.edicao_codigo = p_edicao),
    'por_casa_dia', (select coalesce(jsonb_agg(jsonb_build_object('casa', x.nome, 'dia', x.dia, 'n', x.n) order by x.dia desc, x.nome), '[]'::jsonb)
                       from (select pt.nome_marca nome, (k.criado_em at time zone 'America/Fortaleza')::date dia, count(*) n
                               from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                               join public.participacoes pa on pa.id = k.participacao_id
                               join public.participantes pt on pt.id = pa.participante_id
                              where m.edicao_codigo = p_edicao and k.anulado_em is null
                              group by 1, 2) x),
    'ranking', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                  'posicao', r.pos, 'mapa_id', r.mapa_id, 'apelido', r.apelido, 'no_ranking', r.no_ranking,
                  'pontos', r.pontos, 'carimbos', r.carimbos, 'casas', r.casas, 'avaliadas', r.avaliadas, 'ultimo', r.ultimo,
                  'email', case when v_rel then r.email_norm end, 'whatsapp', case when v_rel then r.whatsapp end)) order by r.pos), '[]'::jsonb)
                  from (select row_number() over (order by p.pontos desc, p.casas desc, p.ultimo) pos, p.*
                          from public.carimbo_placar(p_edicao) p) r),
    -- Viagem impossível: carimbos seguidos do mesmo mapa em unidades a mais de 1 km, rápido demais para 60 km/h.
    -- Visita anterior fica fora da janela inteira: o horário dela é o da aprovação, não o da visita.
    'alertas', (select coalesce(jsonb_agg(a order by a ->> 'em' desc), '[]'::jsonb) from (
                  select jsonb_build_object('tipo', 'viagem', 'carimbo_id', s.id, 'mapa_id', s.mapa_id, 'apelido', s.apelido,
                           'em', s.criado_em, 'de', s.casa_antes, 'para', s.casa, 'km', round((s.dist / 1000)::numeric, 1),
                           'minutos', round((extract(epoch from s.criado_em - s.antes) / 60)::numeric)) a
                    from (select k.id, k.mapa_id, m.apelido, k.criado_em, pt.nome_marca casa,
                                 lag(pt.nome_marca) over w casa_antes, lag(k.criado_em) over w antes,
                                 public.carimbo_distancia(u.lat::float8, u.lng::float8,
                                   (lag(u.lat) over w)::float8, (lag(u.lng) over w)::float8) dist
                            from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                            join public.participacao_unidades pu on pu.id = k.participacao_unidade_id
                            left join public.unidades u on u.id = pu.unidade_id
                            join public.participacoes pa on pa.id = k.participacao_id
                            join public.participantes pt on pt.id = pa.participante_id
                           where m.edicao_codigo = p_edicao and k.anulado_em is null and k.origem not in ('visita_anterior', 'delivery_casa', 'delivery_organizacao')
                          window w as (partition by k.mapa_id order by k.criado_em)) s
                   where s.dist > 1000
                     and s.dist / greatest(extract(epoch from s.criado_em - s.antes), 1) > 60000.0 / 3600
                  union all
                  select jsonb_build_object('tipo', 'sem_conferencia', 'carimbo_id', k.id, 'mapa_id', k.mapa_id,
                           'apelido', m.apelido, 'em', k.criado_em, 'casa', pt.nome_marca)
                    from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                    join public.participacoes pa on pa.id = k.participacao_id
                    join public.participantes pt on pt.id = pa.participante_id
                   where m.edicao_codigo = p_edicao and k.anulado_em is null and not k.conferido
                     and k.origem not in ('visita_anterior', 'delivery_casa', 'delivery_organizacao')) t),
    -- Números da sorte, distribuídos na ordem de chegada dos pontos (carimbo = 1; avaliação = 2, na hora em
    -- que a casa ficou com carimbo E avaliação). Só faz sentido exportar no fechamento, depois da auditoria.
    'numeros', case when v_rel then (select coalesce(jsonb_agg(jsonb_build_object(
                    'apelido', n.apelido, 'email', n.email_norm, 'whatsapp', n.whatsapp, 'de', n.de, 'ate', n.ate) order by n.de), '[]'::jsonb)
                  from (select m.apelido, m.email_norm, m.whatsapp, ev.fim - ev.q + 1 de, ev.fim ate
                          from (select e.mapa_id, e.q, sum(e.q) over (order by e.t, e.mapa_id, e.q rows unbounded preceding) fim
                                  from (select k.mapa_id, k.criado_em t, 1 q
                                          from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                                         where m.edicao_codigo = p_edicao and k.anulado_em is null
                                        union all
                                        select b.mapa_id, greatest(b.primeiro, a.criado_em), 2
                                          from (select k.mapa_id, k.participacao_id, min(k.criado_em) primeiro
                                                  from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
                                                 where m.edicao_codigo = p_edicao and k.anulado_em is null
                                                 group by 1, 2) b
                                          join public.mapas_lover m on m.id = b.mapa_id
                                          join public.avaliacoes a on a.edicao_codigo = p_edicao and a.participacao_id = b.participacao_id
                                                                  and a.email_norm = m.email_norm) e) ev
                          join public.mapas_lover m on m.id = ev.mapa_id) n) end);
end $function$;
