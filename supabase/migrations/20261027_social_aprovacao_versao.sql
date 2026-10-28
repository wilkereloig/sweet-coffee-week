-- ─────────────────────────────────────────────────────────────────────────────
-- Social media › Aprovação: o que muda em "Aguardando aprovação" é visto por quem aprova (21/10/2026,
-- achado da auditoria). Depende de 20261018_social_aprovacao.sql. Só substitui `redes_rever_etapa` (mesma
-- assinatura, mesmo retorno) acrescentando UM ramo.
--
-- Bug: trocar, acrescentar, remover ou reordenar arte (e mexer na legenda) com a postagem em "Aguardando
-- aprovação" NÃO subia a versão da postagem. Quem aprova, com a postagem aberta, via a imagem trocar sozinha
-- (a tela relê pelo sinal de sincronização) e clicava "Aprovar" com a versão nova já lida — aprovava uma arte
-- que não tinha conferido.
-- Agora, nessa situação: a versão sobe e o "atualizado por / em" passa a ser de quem mudou (então a tela de
-- quem aprova sabe QUEM mudou e quando), e os aprovadores são avisados — exceto se quem mudou é um deles.
-- A tela de quem aprova também exige conferir o que mudou antes de aprovar (RedesFicha.jsx).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.redes_rever_etapa(p_post uuid, p_conteudo_mudou boolean, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.redes_posts;
begin
  select * into p from public.redes_posts where id = p_post;
  if not found or p.situacao not in ('aprovacao', 'pronto', 'preparacao') then return; end if;
  if exists (select 1 from unnest(public.redes_pendencias(p_post)) x where x <> 'atrasada') then
    update public.redes_posts set situacao = 'rascunho', versao = versao + 1 where id = p_post;
    perform public.redes_registrar(p_post, 'situacao', jsonb_build_object('de', p.situacao, 'para', 'rascunho', 'motivo', 'requisitos'));
  elsif p.situacao = 'pronto' and p_conteudo_mudou and not public.pode_por_user(auth.uid(), 'redes.aprovar') then
    update public.redes_posts set situacao = 'aprovacao', versao = versao + 1 where id = p_post;
    perform public.redes_registrar(p_post, 'situacao', jsonb_build_object('de', 'pronto', 'para', 'aprovacao', 'motivo', p_motivo));
    perform public.redes_avisar_aprovadores(p_post, 'Alterada depois de aprovada: ' || p.titulo, 'Confira de novo antes de publicar.');
  elsif p.situacao = 'aprovacao' and p_conteudo_mudou then
    -- Mudou enquanto espera aprovação: a versão sobe (aprovar com a versão antiga é recusado), o carimbo é de quem
    -- mudou e os aprovadores são avisados (o aviso é o mesmo, agrupado por postagem). Quem aprova e mexeu não se avisa.
    perform public.redes_carimbar(p_post);
    if not public.pode_por_user(auth.uid(), 'redes.aprovar') then
      perform public.redes_avisar_aprovadores(p_post, 'Alterada enquanto aguarda aprovação: ' || p.titulo,
        case when p_motivo = 'arquivos' then 'A arte mudou. Confira de novo antes de aprovar.' else 'O texto mudou. Confira de novo antes de aprovar.' end);
    end if;
  end if;
end $$;
