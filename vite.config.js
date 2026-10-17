import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

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
        // Espelha os redirects do vercel.json: o painel só vive em /painel/
        // (escopo do service worker). As outras formas redirecionam.
        if (caminho === '/painel/') {
          req.url = '/painel-app/index.html' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '')
          return next()
        }
        if (/^\/(organizacao|marca|painel)\/?$/.test(caminho)) {
          const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
          res.statusCode = 307
          res.setHeader('Location', '/painel/' + q)
          return res.end()
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

/*
 * Identidade da publicação do painel (18/10/2026). Depois de gravar o build:
 * id = sha256 do HTML final do painel + TODOS os arquivos que ele carrega
 * (chunks, inclusive os sob demanda, CSS e assets) + sw.js e manifesto. Muda
 * se qualquer um muda (CSS sozinho também); build igual dá id igual (rollback
 * volta a um id conhecido — a tela compara IGUALDADE, nunca "maior").
 * Grava `painel/versao.json` (o que o painel publicado consulta) e a MESMA id
 * numa <meta name="scw-versao"> do HTML (o que a aba aberta é). Os dois saem
 * no mesmo deploy, então o arquivo de versão nunca aponta para recurso que
 * ainda não existe.
 */
function versaoDoPainel() {
  return {
    name: 'versao-do-painel',
    apply: 'build',
    writeBundle(opts, bundle) {
      const out = opts.dir
      const arqHtml = path.join(out, 'painel-app', 'index.html')
      if (!fs.existsSync(arqHtml)) return
      const html = fs.readFileSync(arqHtml, 'utf8')
      const entrada = Object.values(bundle).find((c) => c.type === 'chunk' && c.isEntry && /painel-app[\\/]index\.html$/.test(c.facadeModuleId || ''))
      if (!entrada) throw new Error('versao-do-painel: não achei a entrada do painel no bundle')
      const usados = new Set()
      const pilha = [entrada.fileName]
      while (pilha.length) {
        const f = pilha.pop()
        if (usados.has(f)) continue
        usados.add(f)
        const c = bundle[f]
        if (!c || c.type !== 'chunk') continue
        const meta = c.viteMetadata || { importedCss: new Set(), importedAssets: new Set() }
        pilha.push(...c.imports, ...c.dynamicImports, ...meta.importedCss, ...meta.importedAssets)
      }
      const h = crypto.createHash('sha256').update(html)
      for (const f of [...usados].sort()) h.update('\n' + f)
      for (const f of ['painel/sw.js', 'painel/app.webmanifest']) {
        const p = path.join(out, f)
        if (fs.existsSync(p)) h.update(fs.readFileSync(p))
      }
      const id = h.digest('hex').slice(0, 16)
      const ambiente = process.env.VERCEL_ENV || 'local'
      let novidades = null
      try {
        novidades = fs.readFileSync(path.resolve(__dirname, 'painel-app/NOVIDADES.txt'), 'utf8')
          .split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#')) || null
      } catch { /* opcional */ }
      const versao = {
        app: 'painel-scw', id, publicado_em: new Date().toISOString(), ambiente,
        commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
        novidades: novidades ? novidades.slice(0, 160) : null,
      }
      fs.mkdirSync(path.join(out, 'painel'), { recursive: true })
      fs.writeFileSync(path.join(out, 'painel', 'versao.json'), JSON.stringify(versao) + '\n')
      fs.writeFileSync(arqHtml, html.replace('</head>', '  <meta name="scw-versao" content="' + id + '" data-ambiente="' + ambiente + '" />\n  </head>'))
    },
  }
}

export default defineConfig({
  plugins: [react(), visualOverridesDevApi(), paginasEstaticasDev(), versaoDoPainel()],
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
