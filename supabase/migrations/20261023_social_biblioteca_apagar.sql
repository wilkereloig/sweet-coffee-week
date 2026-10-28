-- ─────────────────────────────────────────────────────────────────────────────
-- Social media › Biblioteca: APAGAR e RESTAURAR arte (21/10/2026, pedido do Wilker).
-- Depende de 20261017_social_media.sql e 20261019_social_pastas.sql. Só ACRESCENTA
-- duas funções; nada existente muda.
--
-- "Apagar" segue a regra do painel (excluir = arquivar + restaurar): a arte sai da
-- biblioteca e das postagens abertas, fica registrada com quem apagou e quando
-- (removido_em / removido_por_rotulo, a MESMA marca que redes_arquivo_remover
-- grava) e volta com "Restaurar". O arquivo no Storage NÃO é tocado.
--
-- Só `arte` (redes_arquivos, bucket `redes`) se apaga por aqui. Logo, foto do
-- combo/loja e material geral pertencem a outra tela (participante, Arquivos) e
-- têm o próprio arquivamento: pedir para apagar qualquer deles é recusado
-- (tipo_nao_apagavel) em vez de ser ignorado em silêncio.
-- Quem pode: redes.gerir (a mesma permissão de organizar a biblioteca).
-- Arte presa a uma postagem JÁ publicada ou cancelada não sai (post_fechado):
-- seria apagar o registro do que foi ao ar.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.social_biblioteca_apagar(p_secret text, p_itens jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare it jsonb; v_id uuid; a public.redes_arquivos; n int := 0;
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'nada_selecionado' using errcode = '22023'; end if;
  if jsonb_array_length(p_itens) > 200 then raise exception 'selecao_grande' using errcode = '22023'; end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    if coalesce(it->>'tipo', '') <> 'arte' then raise exception 'tipo_nao_apagavel' using errcode = '22023'; end if;
    v_id := nullif(it->>'id', '')::uuid;
    select * into a from public.redes_arquivos where id = v_id and bucket = 'redes' for update;
    if v_id is null or not found then raise exception 'arquivo_inexistente' using errcode = 'P0002'; end if;
    if a.removido_em is not null then continue; end if; -- já apagada: nada a fazer
    if a.post_id is not null then perform public.redes_post_aberto(a.post_id); end if;
    update public.redes_arquivos set removido_em = now(), removido_por_rotulo = public.ator_rotulo_atual() where id = a.id;
    if a.post_id is not null then
      perform public.redes_registrar(a.post_id, 'arquivo', jsonb_build_object('acao', 'removido', 'nome', a.nome, 'pela', 'biblioteca'));
      perform public.redes_rever_pronto(a.post_id);
    end if;
    n := n + 1;
  end loop;
  return jsonb_build_object('apagados', n);
end $$;

create or replace function public.social_biblioteca_restaurar(p_secret text, p_itens jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare it jsonb; v_id uuid; a public.redes_arquivos; n int := 0;
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'nada_selecionado' using errcode = '22023'; end if;
  if jsonb_array_length(p_itens) > 200 then raise exception 'selecao_grande' using errcode = '22023'; end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    if coalesce(it->>'tipo', '') <> 'arte' then raise exception 'tipo_nao_apagavel' using errcode = '22023'; end if;
    v_id := nullif(it->>'id', '')::uuid;
    select * into a from public.redes_arquivos where id = v_id and bucket = 'redes' for update;
    if v_id is null or not found then raise exception 'arquivo_inexistente' using errcode = 'P0002'; end if;
    -- Versão anterior (substituída por outra) não volta: restaurar quebraria a ordem das versões.
    if a.removido_em is null or a.substituido_por is not null then continue; end if;
    if a.post_id is not null then perform public.redes_post_aberto(a.post_id); end if;
    update public.redes_arquivos set removido_em = null, removido_por_rotulo = null where id = a.id;
    if a.post_id is not null then
      perform public.redes_registrar(a.post_id, 'arquivo', jsonb_build_object('acao', 'restaurado', 'nome', a.nome, 'pela', 'biblioteca'));
      perform public.redes_rever_pronto(a.post_id);
    end if;
    n := n + 1;
  end loop;
  return jsonb_build_object('restaurados', n);
end $$;

revoke all on function public.social_biblioteca_apagar(text, jsonb), public.social_biblioteca_restaurar(text, jsonb) from public;
grant execute on function public.social_biblioteca_apagar(text, jsonb), public.social_biblioteca_restaurar(text, jsonb) to anon, authenticated;
-- (mesmo padrão das RPCs do Social media: a permissão de verdade é o redes_exigir de cada uma.)
