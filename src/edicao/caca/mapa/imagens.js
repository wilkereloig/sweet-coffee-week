/*
 * Imagens do mapa da Caça. São PROPOSTAS (v1, geradas em 04/11/2026; docs/cartoon-2026-2/15-caca-assets.md): ainda sem
 * aprovação do Wilker. Trocar a arte = trocar o arquivo e esta lista. Nenhuma tem texto: rótulo e número entram por código.
 * Larguras reais em disco (para `width`/`height` e a proporção do pin).
 */
const PASTA = '/images/caca'

export const IMAGENS_ESTADO = {
  'nao-visitada': { src: `${PASTA}/pin-nao-visitada-v1.webp`, largura: 199, altura: 256 },
  pendente: { src: `${PASTA}/pin-pendente-v1.webp`, largura: 216, altura: 256 },
  conquistada: { src: `${PASTA}/pin-conquistada-v1.webp`, largura: 256, altura: 237 },
}
export const IMAGEM_REVISITA = { src: `${PASTA}/selo-revisita-v1.webp`, largura: 254, altura: 256 }
