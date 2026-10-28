// Ajudante dos testes: desenha um componente do painel em HTML (react-dom/server) SEM navegador e sem `vite build`.
// O esbuild junta o componente e tudo que ele importa (menos o React) num módulo em memória; CSS é ignorado.
// Serve para provar o que a tela DIZ e OFERECE em cada estado (botão presente, ordem, papel/foco do aviso),
// que a leitura do código-fonte por regex só adivinha. Não prova layout nem foco real: isso é do teste de navegador.
import { buildSync } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const req = createRequire(import.meta.url)

/** Exportações de um arquivo do projeto (caminho a partir da raiz do repositório), já empacotado. */
export function carregar(caminho) {
  const entrada = fileURLToPath(new URL('../' + caminho, import.meta.url))
  const r = buildSync({
    entryPoints: [entrada], bundle: true, write: false, format: 'cjs', platform: 'node', logLevel: 'silent',
    external: ['react', 'react-dom', 'react-dom/server'], loader: { '.css': 'empty' },
  })
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', r.outputFiles[0].text)(mod, mod.exports, req)
  return mod.exports
}

/** O HTML que o componente desenha com estas props. */
export const html = (Componente, props = {}) => renderToStaticMarkup(React.createElement(Componente, props))
