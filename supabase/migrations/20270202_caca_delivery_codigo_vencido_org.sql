-- 14/11/2026 (pedido do Wilker): delivery por código cujo código VENCEU passa a poder ser decidido pela
-- organização (Aprovar ou Negar no painel, aba Pedidos de presença). Antes o pedido ficava preso em
-- "Código vencido": a casa não conseguia mais confirmar e a função recusava a organização com aguarda_casa.
-- Única mudança: o aguarda_casa só vale enquanto o código ainda está no prazo (código sem prazo segue barrado).
-- Reverter: supabase/reverter/20270202_caca_delivery_codigo_vencido_org.sql
create or replace function public.caca_excecao_decidir(p_secret text, p_id uuid, p_decisao text, p_nota text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
  -- Código ainda no prazo: quem confirma é a casa. Vencido: a organização decide.
  if v_delivery and e.via <> 'imagem' and coalesce(e.delivery_via_pretendida, 'casa') <> 'imagem'
     and coalesce(e.codigo_expira_em > now(), true) then raise exception 'aguarda_casa'; end if;
  -- Imagem é opcional para pedidos encaminhados à organização.
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
end $function$;
