-- Prova opcional para pedidos de carimbo de visita anterior.
-- A pessoa pode explicar a visita no relato, anexar uma foto ou fazer os dois;
-- o pedido continua na fila de revisão e só a organização decide se aprova.
-- Reaproveita o bucket privado caca-delivery e a coluna imagem_path existente.
-- Reverter: supabase/reverter/20270110_caca_visita_anterior_provas.sql

alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_delivery_check;
alter table public.caca_carimbo_excecao add constraint caca_carimbo_excecao_delivery_check check (
  (motivo = 'delivery' and via in ('casa', 'imagem') and pedido_data is not null and codigo is not null
    and (pedido_ref is null or char_length(pedido_ref) <= 40))
  or (motivo = 'visita_anterior' and via is null and pedido_data is null and pedido_ref is null and codigo is null)
  or (motivo not in ('delivery', 'visita_anterior') and via is null and pedido_data is null and pedido_ref is null
    and codigo is null and imagem_path is null)
);

-- A Edge Function continua sendo a única porta para a URL de envio assinada.
-- O banco confere que o pedido pertence ao mapa e que segue pendente.
create or replace function public.caca_visita_anterior_imagem_reservar(p_chave text, p_id uuid, p_ext text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; e public.caca_carimbo_excecao%rowtype;
  v_ext text := lower(btrim(coalesce(p_ext, ''))); v_path text;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if v_ext not in ('jpg', 'png', 'webp') then return jsonb_build_object('ok', false, 'motivo', 'formato_invalido'); end if;
  select * into e from public.caca_carimbo_excecao
   where id = p_id and motivo = 'visita_anterior' and edicao_codigo = m.edicao_codigo and pessoa = m.email_norm for update;
  if e.id is null then return jsonb_build_object('ok', false, 'motivo', 'pedido_nao_encontrado'); end if;
  if e.estado <> 'pendente' or e.imagem_path is not null then return jsonb_build_object('ok', false, 'motivo', 'transicao_invalida'); end if;
  if e.imagem_reservas >= 5 then return jsonb_build_object('ok', false, 'motivo', 'limite_imagem'); end if;
  v_path := e.edicao_codigo || '/' || e.id || '/' || gen_random_uuid() || '.' || v_ext;
  update public.caca_carimbo_excecao set imagem_reservas = e.imagem_reservas + 1 where id = e.id;
  return jsonb_build_object('ok', true, 'path', v_path);
end $$;
revoke all on function public.caca_visita_anterior_imagem_reservar(text, uuid, text) from public, anon, authenticated;
grant execute on function public.caca_visita_anterior_imagem_reservar(text, uuid, text) to service_role;

create or replace function public.caca_visita_anterior_anexar(p_chave text, p_id uuid, p_path text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; e public.caca_carimbo_excecao%rowtype; o record;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  select * into e from public.caca_carimbo_excecao
   where id = p_id and motivo = 'visita_anterior' and edicao_codigo = m.edicao_codigo and pessoa = m.email_norm for update;
  if e.id is null then return jsonb_build_object('ok', false, 'motivo', 'pedido_nao_encontrado'); end if;
  if e.estado <> 'pendente' or e.imagem_path is not null then return jsonb_build_object('ok', false, 'motivo', 'transicao_invalida'); end if;
  if p_path is null or p_path !~ ('^' || replace(e.edicao_codigo, '.', '\.') || '/' || e.id || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
    return jsonb_build_object('ok', false, 'motivo', 'imagem_invalida');
  end if;
  select ob.name, coalesce((ob.metadata ->> 'size')::bigint, 0) tam into o
    from storage.objects ob where ob.bucket_id = 'caca-delivery' and ob.name = p_path;
  if o.name is null then return jsonb_build_object('ok', false, 'motivo', 'imagem_ausente'); end if;
  if o.tam <= 0 or o.tam > 3145728 then return jsonb_build_object('ok', false, 'motivo', 'imagem_invalida'); end if;
  update public.caca_carimbo_excecao set imagem_path = p_path, imagem_enviada_em = now() where id = e.id;
  insert into public.caca_evento (edicao_codigo, acao, ator, depois)
  values (e.edicao_codigo, 'visita_anterior_imagem_enviada', 'visitante', jsonb_build_object('pedido', e.id));
  begin
    perform public.sync_emitir('scw:org', 'carimbos', null);
  exception when others then
    raise warning 'caca_visita_anterior_anexar: falha ao sinalizar a organizacao: %', sqlerrm;
  end;
  return jsonb_build_object('ok', true, 'id', e.id, 'estado', 'pendente', 'via', 'organizacao');
end $$;
revoke all on function public.caca_visita_anterior_anexar(text, uuid, text) from public, anon, authenticated;
grant execute on function public.caca_visita_anterior_anexar(text, uuid, text) to anon, authenticated;

-- Não permite aprovar o caso de foto exclusiva antes que o arquivo chegue.
-- Relatos escritos continuam podendo ser aprovados sem foto.
create or replace function public.caca_visita_anterior_prova_validar()
 returns trigger language plpgsql set search_path to 'public'
as $$
begin
  if old.motivo = 'visita_anterior' and old.estado = 'pendente' and new.estado = 'aprovado'
     and (btrim(coalesce(new.nota, '')) = '' or (btrim(coalesce(new.nota, '')) = 'Foto como prova'
       and (new.imagem_path is null or new.imagem_removida_em is not null))) then
    raise exception 'prova_obrigatoria';
  end if;
  return new;
end $$;
revoke all on function public.caca_visita_anterior_prova_validar() from public, anon, authenticated;
drop trigger if exists caca_visita_anterior_prova_validar on public.caca_carimbo_excecao;
create trigger caca_visita_anterior_prova_validar before update of estado on public.caca_carimbo_excecao
  for each row execute function public.caca_visita_anterior_prova_validar();

-- A tela do participante recebe só um sinal booleano; o caminho privado da foto
-- nunca é devolvido ao navegador do participante.
create or replace function public.caca_excecao_minhas(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  return jsonb_build_object('ok', true, 'pedidos', (
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', x.id, 'slug', pa.slug_publico, 'estado', x.estado, 'criado_em', x.criado_em,
      'decidido_em', x.decidido_em, 'motivo', x.motivo, 'visita_data', x.visita_data,
      'unidade', pu.id_publico, 'via', x.via, 'via_pretendida', x.delivery_via_pretendida,
      'pedido_data', x.pedido_data, 'pedido_ref', x.pedido_ref,
      'codigo', case when x.estado = 'pendente' and x.via = 'casa' and x.codigo_expira_em > now() then x.codigo end,
      'expira_em', case when x.estado = 'pendente' and x.via = 'casa' then x.codigo_expira_em end,
      'expirado', case when x.motivo = 'delivery' and x.estado = 'pendente' and x.via = 'casa' then x.codigo_expira_em <= now() end,
      'tem_imagem', case when x.motivo in ('delivery', 'visita_anterior') then x.imagem_path is not null end,
      'imagem_removida', case when x.motivo in ('delivery', 'visita_anterior') then x.imagem_removida_em is not null end,
      'codigos_restantes', case when x.motivo = 'delivery' and x.estado = 'pendente' and x.via = 'casa'
        then greatest(3 - x.codigos_gerados, 0) end)) order by x.criado_em desc), '[]'::jsonb)
      from (select * from public.caca_carimbo_excecao e
             where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm order by e.criado_em desc limit 30) x
      join public.participacoes pa on pa.id = x.participacao_id
      left join public.participacao_unidades pu on pu.id = x.participacao_unidade_id));
end $$;

-- create or replace preserva as permissões já definidas para caca_excecao_minhas.
