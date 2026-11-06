-- A escolha por imagem não deve aparecer como pedido à casa antes do upload.
alter table public.caca_carimbo_excecao add column if not exists delivery_via_pretendida text;

create or replace function public.caca_delivery_pedir_imagem(p_chave text, p_slug text, p_unidade text, p_data date, p_ref text, p_nota text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  r := public.caca_delivery_pedir(p_chave, p_slug, p_unidade, p_data, p_ref, p_nota);
  if r->>'ok' = 'true' then
    update public.caca_carimbo_excecao set delivery_via_pretendida = 'imagem' where id = (r->>'id')::uuid;
  end if;
  return r;
end $$;
revoke all on function public.caca_delivery_pedir_imagem(text, text, text, date, text, text) from public, anon, authenticated;
grant execute on function public.caca_delivery_pedir_imagem(text, text, text, date, text, text) to anon, authenticated;

-- Fila de delivery da própria marca. O sinal em tempo real não contém dados do cliente.
create or replace function public.caca_delivery_pendentes_marca()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_result jsonb;
begin
  if v_user is null or not public.conta_ativa() then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', x.id, 'codigo', x.codigo, 'apelido', m.apelido,
    'unidade', un.nome_unidade, 'pedido_data', x.pedido_data,
    'pedido_ref', x.pedido_ref, 'expira_em', x.codigo_expira_em
  ) order by x.criado_em desc), '[]'::jsonb) into v_result
  from public.caca_carimbo_excecao x
  join public.participacoes pa on pa.id = x.participacao_id
  join public.participantes pt on pt.id = pa.participante_id
  join public.mapas_lover m on m.id = x.mapa_id
  left join public.participacao_unidades pu on pu.id = x.participacao_unidade_id
  left join public.unidades un on un.id = pu.unidade_id
  where pt.user_id = v_user and x.motivo = 'delivery' and x.via = 'casa'
    and x.estado = 'pendente' and x.codigo_expira_em > now()
    and coalesce(x.delivery_via_pretendida, 'casa') = 'casa';
  return jsonb_build_object('ok', true, 'pedidos', v_result);
end $$;
revoke all on function public.caca_delivery_pendentes_marca() from public, anon, authenticated;
grant execute on function public.caca_delivery_pendentes_marca() to authenticated;

create or replace function public.caca_delivery_sinal_marca()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_participante uuid;
begin
  if new.motivo = 'delivery' then
    select participante_id into v_participante from public.participacoes where id = new.participacao_id;
    if v_participante is not null then
      perform public.sync_emitir('scw:marca:' || v_participante::text, 'carimbos', null);
    end if;
    perform public.sync_emitir('scw:org', 'carimbos', null);
  end if;
  return new;
end $$;
revoke all on function public.caca_delivery_sinal_marca() from public, anon, authenticated;
create trigger caca_delivery_sinal_marca after insert or update on public.caca_carimbo_excecao
for each row execute function public.caca_delivery_sinal_marca();

-- A pessoa pode retomar o envio da foto depois de sair ou recarregar.
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
                                                 'via', x.via, 'via_pretendida', x.delivery_via_pretendida, 'pedido_data', x.pedido_data, 'pedido_ref', x.pedido_ref,
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


-- A organização acompanha separadamente pedidos sem imagem e solicitações à casa.
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
                         where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'delivery' and e.via = 'casa' and coalesce(e.delivery_via_pretendida, 'casa') = 'casa'),
    'aguardando_imagem', (select count(*) from public.caca_carimbo_excecao e where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'delivery' and e.via = 'casa' and e.delivery_via_pretendida = 'imagem'),
    'pendentes_visita_anterior', (select count(*) from public.caca_carimbo_excecao e
                                   where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'visita_anterior'),
    'pendentes_delivery', (select count(*) from public.caca_carimbo_excecao e
                            where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'delivery' and e.via = 'imagem'),
    'itens', (select coalesce(jsonb_agg(x.o order by x.ordem, x.fila), '[]'::jsonb) from (
        select case when e.estado = 'pendente' then 0 else 1 end ordem,
               case when e.estado = 'pendente' then extract(epoch from e.criado_em) else -extract(epoch from e.criado_em) end fila,
               jsonb_strip_nulls(jsonb_build_object(
                 'id', e.id, 'estado', e.estado, 'criado_em', e.criado_em, 'motivo', e.motivo, 'visita_data', e.visita_data,
                 'via', e.via, 'via_pretendida', e.delivery_via_pretendida, 'pedido_data', e.pedido_data, 'pedido_ref', e.pedido_ref,
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
