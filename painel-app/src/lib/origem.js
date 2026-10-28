/*
 * Endereço que vai para FORA do painel: mensagem de WhatsApp, link de preenchimento, formulários do site.
 * É sempre o do domínio oficial — nunca o da barra do navegador, que na prévia do Vercel (`*.vercel.app`) e no
 * `localhost` mostraria o nome do estúdio e um endereço que a marca não deve ver (22/10/2026, pedido do Wilker).
 * O banco é o mesmo em qualquer endereço, então o link gerado numa prévia abre igual em produção.
 * `tests/painel-app-preenchimento.test.mjs` reprova o endereço da barra (`location.origin` da janela) voltando em texto para marca.
 */
export const ORIGEM_PUBLICA = 'https://www.sweetcoffeeweek.com.br'
