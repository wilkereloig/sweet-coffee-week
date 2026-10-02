/*
 * PWA do painel React (painel-app/) — checagem estrutural (regex sobre texto),
 * mesmo espírito de tests/painel.test.mjs. Sem servidor/browser: só confirma
 * que o manifest e o registro do service worker apontam pro destino real
 * (/painel/), que é o arquivo que public/painel/sw.js já serve.
 *
 * Rodar: node --test tests/painel-app-pwa.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const HTML = readFileSync(new URL('../painel-app/index.html', import.meta.url), 'utf8')
const MAIN = readFileSync(new URL('../painel-app/src/main.jsx', import.meta.url), 'utf8')

test('index.html referencia o manifest do painel e o theme-color certo', () => {
  assert.match(HTML, /<link\s+rel="manifest"\s+href="\/painel\/app\.webmanifest"/,
    'falta o link do manifest do painel')
  assert.match(HTML, /<meta\s+name="theme-color"\s+content="#3D1308"/,
    'theme-color não bate com public/painel/app.webmanifest')
})

test('main.jsx registra o service worker do painel, com escopo próprio', () => {
  assert.match(MAIN, /register\(\s*['"]\/painel\/sw\.js['"]/, 'não registra /painel/sw.js')
  assert.match(MAIN, /scope:\s*['"]\/painel\/['"]/, 'registro sem scope explícito /painel/')
})

test('o registro do SW roda no carregamento do app, não dentro de um componente', () => {
  // As telas de Equipe/Arquivos chamam navigator.serviceWorker.ready só no
  // clique do botão "ligar avisos" — se o registro morasse dentro de um
  // componente de vista, abrir direto noutra vista deixaria essa promise
  // pendente pra sempre.
  assert.ok(!/export function App/.test(MAIN), 'main.jsx não deveria conter o componente App')
  const antesDoRender = MAIN.slice(0, MAIN.indexOf('ReactDOM.createRoot'))
  assert.match(antesDoRender, /serviceWorker\.register/, 'o registro do SW não acontece antes do render inicial')
})

test('nenhum host de banco em texto nos arquivos novos', () => {
  for (const [nome, texto] of [['index.html', HTML], ['main.jsx', MAIN]]) {
    assert.ok(!/dgfmoibynftadsyjcclg\.supabase\.co/.test(texto), nome + ' menciona o host do Supabase')
    assert.ok(!/service_role/.test(texto), nome + ' menciona service_role')
  }
})

// Versão nova pela publicação (02/10/2026): o sw.js não muda entre deploys,
// então o aviso de versão compara o arquivo de entrada do HTML publicado.
import { entradaDoHtml, entradaAtual, podeRecarregarSozinho } from '../painel-app/src/lib/versao.js'

test('versão: lê o arquivo de entrada do HTML publicado', () => {
  const html = '<script src="https://use.typekit.net/ngx4uek.js"></script><script type="module" crossorigin src="/assets/painel-AH0SDHQz.js"></script>'
  assert.equal(entradaDoHtml(html), '/assets/painel-AH0SDHQz.js')
  assert.equal(entradaDoHtml('<html></html>'), null)
  assert.equal(entradaDoHtml(null), null)
})

test('versão: sem arquivo com hash (dev) não compara nada', () => {
  assert.equal(entradaAtual({ querySelector: () => null }), null)
  assert.equal(entradaAtual({ querySelector: () => ({ getAttribute: () => '/assets/painel-X.js' }) }), '/assets/painel-X.js')
})

test('versão: só recarrega sozinho sem janela aberta nem campo em uso', () => {
  const doc = (aberto, tag) => ({ querySelector: () => (aberto ? {} : null), activeElement: tag ? { tagName: tag } : null })
  assert.equal(podeRecarregarSozinho(doc(false, 'BODY')), true)
  assert.equal(podeRecarregarSozinho(doc(true, 'BODY')), false)
  assert.equal(podeRecarregarSozinho(doc(false, 'TEXTAREA')), false)
})

test('versão: a checagem foge do cache do service worker', () => {
  const c = readFileSync(new URL('../painel-app/src/components/Conexao.jsx', import.meta.url), 'utf8')
  assert.match(c, /fetch\('\/painel\/\?v=' \+ Date\.now\(\)/)
  assert.match(c, /sessionStorage\.getItem\(CHAVE_RECARGA\)/, 'recarga automática sem trava de uma vez por versão')
})
