import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

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

export default defineConfig({
  plugins: [react(), visualOverridesDevApi()],
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
