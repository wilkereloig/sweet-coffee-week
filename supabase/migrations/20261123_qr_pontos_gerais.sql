-- QR geral da Cartoon (pedido do Wilker, 30/10/2026). Plano: docs/cartoon-2026-2/12-plano-qr-leituras.md.
--
-- A avaliação passa a ter UM QR para a edição inteira (a pessoa escolhe a casa na própria página) e entram os
-- QR da página inicial e da premiação. Saem o QR de avaliação por casa (d2-<slug>) e a placa geral (pl-geral),
-- que nunca foram impressos. Fica: d1-<slug> (o QR de cada participante), mapa-bitly (QR do cliente, já
-- impresso no cartaz) e teste.
--
-- 'avaliar' e 'premiacao' levam o destino também em qr_pontos.destino: assim o QR já funciona no ar antes da
-- publicação do código (a regra de src/edicao/qrPontos.js é a mesma e segue sendo a fonte; o destino do banco
-- pode ficar, é igual). 'inicio' cai na entrada da edição pela regra.

insert into public.qr_pontos (codigo, tipo, rotulo, destino) values
  ('inicio', 'outro', 'Página inicial da Cartoon', null),
  ('avaliar', 'outro', 'Avaliação geral (a pessoa escolhe a casa)', '/cartoon/avaliar'),
  ('premiacao', 'outro', 'Premiação', '/cartoon/premiacao')
on conflict (codigo) do nothing;

-- Os que saem e já têm leitura de teste (a leitura aponta para o código) viram 'teste': ficam fora da soma.
update public.qr_pontos set tipo = 'teste', ativo = false
 where (codigo like 'd2-%' or codigo = 'pl-geral')
   and exists (select 1 from public.qr_leituras_hora l where l.codigo = qr_pontos.codigo);

-- Os que saem sem nenhuma leitura são apagados.
delete from public.qr_pontos p
 where (p.codigo like 'd2-%' or p.codigo = 'pl-geral')
   and not exists (select 1 from public.qr_leituras_hora l where l.codigo = p.codigo);
