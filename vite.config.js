import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Plugin DEV-only: grava src/design/visualOverrides.json a partir do Visual
// Refinement Mode. configureServer só roda no dev server → nada disso entra no
// build de produção. Sem dev server (build/preview), o endpoint simplesmente não existe.
function visualOverridesDevApi() {
  const file = path.resolve(__dirname, 'src/design/visualOverrides.json')
  return {
    name: 'visual-overrides-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__visual-overrides', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('method not allowed')
        }
        let body = ''
        req.on('data', (c) => { body += c })
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}')
            fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
            res.statusCode = 200
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (err) {
            res.statusCode = 400
            res.end(String(err && err.message ? err.message : err))
          }
        })
      })
    },
  }
}

// Plugin DEV-only: faz o dev server resolver o índice das páginas estáticas de
// `public/`, como qualquer servidor comum faz e como a produção faz.
//
// POR QUE EXISTE. O Vite não resolve índice de diretório em `public/`: um GET
// em `/organizacao/` não acha arquivo, cai no fallback do SPA e devolve a
// landing. O painel e o formulário de pré-cadastro ficavam inalcançáveis em
// `npm run dev` — e o sintoma mentia, porque a página ABRIA (só que era outra).
// Estava documentado no §10.4-b e mesmo assim derrubou duas pessoas no mesmo
// dia, o que é o sinal de que a regra precisava virar código.
//
// Consequência prática: o fluxo do diálogo de acesso passa a funcionar em DEV.
// Ele grava a sessão em `sessionStorage` e navega para `/organizacao/`; como
// `sessionStorage` é POR ORIGEM, servir o painel de outra porta nunca ia
// funcionar — a senha ficava na origem do site e o painel lia a dele, vazia.
function paginasEstaticasDev() {
  const publicDir = path.resolve(__dirname, 'public')
  return {
    name: 'paginas-estaticas-dev',
    apply: 'serve',
    configureServer(server) {
      /* Adicionado aqui (e não no retorno de configureServer) de propósito:
         precisa rodar ANTES do fallback do SPA. Só reescrevemos a URL — quem
         entrega o arquivo continua sendo o middleware de `public/` do Vite. */
      server.middlewares.use((req, res, next) => {
        const caminho = (req.url || '').split('?')[0]

        // /organizacao, /marca e /painel não são mais páginas estáticas de
        // `public/` — viraram rewrite pro painel React (vercel.json espelha
        // isto em produção). Sem este atalho, a mesma classe de bug do
        // comentário acima volta: a URL abre, só que a página errada (a
        // landing), porque não existe mais `public/<nome>/index.html` pra
        // resolução de índice achar.
        if (/^\/(organizacao|marca|painel)\/?$/.test(caminho)) {
          req.url = '/painel-app/index.html'
          return next()
        }

        if (!/^\/[a-z0-9-]+\/?$/i.test(caminho)) return next()

        const nome = caminho.replace(/^\/|\/$/g, '')
        if (!fs.existsSync(path.join(publicDir, nome, 'index.html'))) return next()

        /* Sem a barra final, redireciona em vez de servir: é o que um servidor
           comum faz, e mantém DEV honesto com produção — assim um link interno
           escrito sem barra falha aqui, onde custa barato, e não só no ar. */
        if (!caminho.endsWith('/')) {
          res.statusCode = 301
          res.setHeader('location', caminho + '/')
          return res.end()
        }

        req.url = `/${nome}/index.html`
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), visualOverridesDevApi(), paginasEstaticasDev()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        painel: fileURLToPath(new URL('./painel-app/index.html', import.meta.url)),
      },
    },
  },
  server: {
    // Honra a porta atribuída pelo harness (autoPort) via env PORT; cai para 5173 local.
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    watch: {
      // dist_check/dist ficam travados pelo Dropbox → watcher do Vite crasha com
      // EBUSY e derruba o dev server. Nada disso é fonte; ignorar. Idem os
      // vite.config.js.timestamp-*.mjs que o Vite não consegue limpar (lock Dropbox).
      ignored: ['**/dist_check/**', '**/dist/**', '**/vite.config.js.timestamp-*'],
    },
  },
})
