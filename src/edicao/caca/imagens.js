/*
 * Arte da Caça (public/images/caca/, propostas v1 — docs/cartoon-2026-2/15-caca-assets.md). Um lugar só para os caminhos:
 * quando o Wilker aprovar (ou trocar) a arte, muda aqui e nas telas inteiras.
 */
const B = '/images/caca'

export const QTD_MEDALHAS = 5

export const IMG_CACA = {
  /** medalha-1 … medalha-5, em ordem crescente de "grandeza". Sem número escrito: o marco que cada uma representa vem do servidor. */
  medalha: (n) => `${B}/medalha-${Math.min(Math.max(Math.trunc(n) || 1, 1), QTD_MEDALHAS)}-v1.webp`,
  storiesFundo: `${B}/stories-fundo-v1.webp`,
  icone192: `${B}/app-icone-192-v2.png`,
  icone512: `${B}/app-icone-512-v2.png`,
  icone512Maskable: `${B}/app-icone-512-maskable-v2.png`,
  iconeApple180: `${B}/app-icone-180-apple-v2.png`,
}
