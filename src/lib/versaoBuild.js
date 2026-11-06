/*
 * Identidade de um build publicado: o que o HTML diz de si (a <meta name="scw-versao"> que vite.config.js grava) e os arquivos que ele
 * carrega na abertura. Usado pelo painel (painel-app/src/lib/versao.js) e pelo app da Caça (src/edicao/caca/pwa/atualizacao.js);
 * a regra é uma só para os dois. Sem DOM, sem rede: só texto.
 */
const ENTRADAS = /<(?:script|link)\b[^>]*\b(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g

/** Os arquivos que o HTML novo carrega na abertura (entrada, CSS, pré-carregados). */
export function recursosDoHtml (html) {
  const s = new Set()
  for (const m of String(html || '').matchAll(ENTRADAS)) s.add(m[1])
  return [...s]
}

/** A versão que o HTML declara (ou null). */
export const idDoHtml = (html) => ((/<meta name="scw-versao" content="([0-9a-f]{12,64})"/.exec(String(html || '')) || [])[1] || null)
