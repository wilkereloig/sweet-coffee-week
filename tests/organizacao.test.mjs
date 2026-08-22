/*
 * O painel /organizacao é estático: o JS mora inline no HTML e NÃO passa pelo
 * build do Vite. `npm run build` fica verde com o script quebrado — a mesma
 * armadilha que já deixou uma função apagada chegar ao commit em
 * /quero-participar. Estas checagens cobrem esse vão.
 *
 * Rodar: node --test tests/organizacao.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const HTML = readFileSync(new URL('../public/organizacao/index.html', import.meta.url), 'utf8')
const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
const JS = SCRIPTS[0] || ''

test('o HTML traz exatamente um bloco de script inline', () => {
  assert.equal(SCRIPTS.length, 1)
})

test('o script inline compila', () => {
  assert.doesNotThrow(() => new Function(JS))
})

test('toda função crítica está declarada, não só chamada', () => {
  const declaradas = new Set(
    [...JS.matchAll(/(?:function\s+|const\s+|let\s+)([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))
  const criticas = ['rpc', 'carregar', 'render', 'filtrados', 'todos', 'campo', 'escapar',
                    'abrirDetalhe', 'fecharDetalhe', 'salvar', 'montarAbas', 'montarForms', 'montarFiltroStatus',
                    'mostrarEstado', 'abrirPainel', 'dataCurta', 'soDigitos',
                    // casca de aplicativo (22/08/2026)
                    'irPara', 'montarAbasApp', 'ligarTecladoAbas', 'montarEsqueleto']
  const faltando = criticas.filter((f) => !declaradas.has(f))
  assert.deepEqual(faltando, [], 'função chamada mas nunca declarada: ' + faltando.join(', '))
})

test('nenhuma chave secreta no arquivo', () => {
  // Ele vive em public/: o código-fonte é visível para qualquer visitante.
  // A chave publicável (anon) pode estar aqui; service_role, jamais.
  assert.ok(!/service_role/.test(HTML), 'service_role em arquivo de public/')
  assert.ok(!/\bsb_secret_|\beyJ[\w-]+\.[\w-]+\.[\w-]+/.test(HTML), 'parece haver chave secreta ou JWT no arquivo')
  const m = HTML.match(/SUPABASE_KEY\s*=\s*'([^']*)'/)
  assert.ok(m && m[1].startsWith('sb_publishable_'), 'a chave usada não é a publicável')
})

test('a página pede para não ser indexada', () => {
  assert.match(HTML, /<meta\s+name="robots"\s+content="noindex/, 'falta o meta robots noindex')
})

test('as quatro origens têm RPC de leitura e vocabulário de status', () => {
  for (const rpc of ['get_quero_participar', 'get_participation_interests',
                     'get_support_interests', 'get_contact_requests']) {
    assert.ok(JS.includes(rpc), 'origem sem RPC de leitura: ' + rpc)
  }
  // O select de status por origem não pode ficar vazio: sem vocabulário, o
  // painel oferece "" e a gravação falharia no CHECK da tabela.
  const origens = [...JS.matchAll(/status:\s*\[([^\]]*)\]/g)].map((m) => m[1])
  assert.equal(origens.length, 4, 'esperava quatro vocabulários de status, achei ' + origens.length)
  origens.forEach((v, i) => assert.ok(v.includes("'novo'"), 'vocabulário ' + i + ' sem o status inicial'))
})

test('todo texto vindo do banco passa por escapar()', () => {
  // innerHTML com dado de formulário é XSS armazenado: qualquer pessoa pode
  // enviar <img onerror> pelo site público e executar no navegador da equipe.
  const cru = [...JS.matchAll(/innerHTML\s*=([\s\S]*?);\n/g)].map((m) => m[1])
  const suspeitas = cru.filter((t) => /\breg\.[a-z_]+|o\.titulo\(|o\.meta\(/.test(t) && !/escapar\(/.test(t))
  assert.deepEqual(suspeitas, [], 'dado do banco indo cru para innerHTML')
})

test('não afirma gravação sem o servidor confirmar', () => {
  const guarda = JS.indexOf("if (ok !== true)")
  const sucesso = JS.indexOf("'Salvo.'")
  assert.ok(guarda > -1, 'sumiu a checagem do retorno da RPC de gravação')
  assert.ok(sucesso > guarda, '"Salvo." aparece antes de confirmar a gravação')
})

test('o site tem porta de entrada para o painel', () => {
  // O acesso é pelo cartão "Organização" do diálogo de acesso. Sem esse link a
  // página existe mas ninguém acha: não há menu nem rodapé apontando para ela,
  // de propósito.
  const dialogo = readFileSync(new URL('../src/components/AccessDialog.jsx', import.meta.url), 'utf8')
  // A barra final é o detalhe que decide: sem ela o servidor não resolve o
  // índice do diretório e o clique volta para a home. Medido em vite preview,
  // que é o build de produção: /organizacao → index.html do SPA;
  // /organizacao/ → o painel.
  //
  // ⚠️ Aferir a REGRA, não a sintaxe. Este teste já reprovou uma vez sem haver
  // defeito: procurava `href: '/organizacao/'` porque a entrada era um <a>, e
  // em 22/08/2026 ela virou `window.location.href = '/organizacao/'` depois do
  // admin_ping. O destino continuava certo; só a forma tinha mudado. Agora as
  // duas pontas são medidas — existe a forma com barra, e não existe nenhuma
  // sem —, então qualquer sintaxe futura passa e só a barra ausente reprova.
  assert.match(dialogo, /['"]\/organizacao\/['"]/,
    'o caminho do painel precisa terminar em barra, senão cai no fallback do SPA')
  assert.doesNotMatch(dialogo, /['"]\/organizacao['"]/,
    'há um /organizacao sem barra final — essa forma abre a landing, não o painel')
})

test('as páginas estáticas têm rewrite próprio no vercel.json', () => {
  // Rede de segurança para a forma sem barra em produção: a Vercel checa o
  // sistema de arquivos antes dos rewrites, então /organizacao (que não é
  // arquivo) cai aqui em vez de virar SPA.
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  for (const rota of ['/organizacao', '/quero-participar']) {
    const r = vercel.rewrites.find((x) => x.source === rota)
    assert.ok(r, 'sem rewrite para ' + rota)
    assert.equal(r.destination, rota + '/index.html')
  }
})

test('todo asset absoluto existe em public/', () => {
  const pedidos = [...HTML.matchAll(/(?:url\('|src="|href=")(\/[^"')]+)/g)].map((m) => m[1])
  for (const p of new Set(pedidos)) {
    assert.ok(readFileSync(new URL('../public' + p, import.meta.url)), 'asset ausente: ' + p)
  }
})

/* ─────────────────────────────────────────────────────────────────────────
   Casca de aplicativo — acrescentado em 22/08/2026.

   O que estas checagens protegem não é layout (isso o navegador mostra), e sim
   as três coisas que quebram CALADAS: o escopo do service worker, o cache do
   HTML e o cache de dado pessoal.
   ───────────────────────────────────────────────────────────────────────── */

const SW = readFileSync(new URL('../public/organizacao/sw.js', import.meta.url), 'utf8')
const APP_MANIFEST = JSON.parse(
  readFileSync(new URL('../public/organizacao/app.webmanifest', import.meta.url), 'utf8'))

test('as funções da casca de app estão declaradas', () => {
  // Redundante com a checagem de funções críticas acima, e de propósito: esta
  // nomeia o motivo, então quem apagar uma delas lê "casca de app" no erro.
  for (const f of ['irPara', 'montarAbasApp', 'montarEsqueleto']) {
    assert.match(JS, new RegExp(String.raw`function\s+${f}\s*\(`), 'função não declarada: ' + f)
  }
})

test('o service worker tem escopo próprio e não é da raiz', () => {
  // 🔴 Um SW registrado da raiz passa a interceptar o site inteiro, inclusive a
  // landing que está no ar. Desfazer isso não é deploy: é desregistro no
  // navegador de cada visitante.
  assert.match(JS, /register\(\s*['"]\/organizacao\/sw\.js['"]/, 'SW fora de /organizacao/')
  assert.match(JS, /scope:\s*['"]\/organizacao\/['"]/, 'registro sem scope explícito')
})

test('o manifest do painel tem escopo próprio, com barra final', () => {
  // Sem a barra o escopo vira a raiz e instalar o painel instalaria o site.
  assert.equal(APP_MANIFEST.scope, '/organizacao/')
  assert.equal(APP_MANIFEST.start_url, '/organizacao/')
})

test('os dois manifests não se sobrepõem', () => {
  // São dois apps distintos: /manifest.webmanifest instala o site.
  const site = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  assert.equal(site.scope, '/', 'o manifest do site mudou de escopo')
  assert.notEqual(site.scope, APP_MANIFEST.scope)
})

test('o service worker não cacheia dado do banco', () => {
  // O nome do serviço não pode aparecer nem em comentário: sem o host escrito,
  // não há o que copiar e colar quando alguém for "fazer o offline funcionar".
  assert.ok(!/supabase/i.test(SW), 'o SW menciona o serviço de banco — PII não pode encostar em caches')
  assert.match(SW, /origin\s*!==\s*self\.location\.origin/, 'falta o corte de origem externa')
})

test('o HTML do painel é sempre da rede, nunca do cache', () => {
  // O JS do painel é inline no documento: HTML cacheado congela o painel
  // inteiro numa versão antiga, e a correção só chega quando a pessoa limpa o
  // navegador. O cache ali é socorro de rede caída, não estratégia.
  const navegacao = SW.match(/mode\s*===\s*'navigate'[\s\S]*?\n\s*return;/)
  assert.ok(navegacao, 'o SW não trata navegação explicitamente')
  assert.match(navegacao[0], /respondWith\(\s*\n?\s*fetch\(/, 'navegação não busca a rede primeiro')
})

test('o SW não é cacheado pelo CDN', () => {
  const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  const h = v.headers.find((x) => x.source === '/organizacao/sw.js')
  assert.ok(h, 'sem header de no-store para o service worker')
  assert.match(h.headers[0].value, /no-store/)
})

test('o painel abre num destino e a barra tem os três', () => {
  // Se um destino sumir do HTML, irPara() cai no fallback e a aba fica órfã.
  for (const v of ['resumo', 'respostas', 'formularios']) {
    assert.match(HTML, new RegExp('id="vista-' + v + '"'), 'falta a seção do destino ' + v)
    assert.match(HTML, new RegExp('data-vista="' + v + '"'), 'falta o botão do destino ' + v)
  }
})

test('o bloco de prefers-reduced-motion é o último do CSS', () => {
  // Ele zera animação e transição de tudo que veio antes. Regra acrescentada
  // depois dele escaparia do reduced-motion sem ninguém notar.
  const style = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'))
  const i = style.lastIndexOf('@media (prefers-reduced-motion')
  assert.ok(i > 0, 'o painel não respeita prefers-reduced-motion')
  const depois = style.slice(i).replace(/@media[^{]*\{[\s\S]*?\n\}/, '').trim()
  assert.equal(depois, '', 'há CSS depois do bloco de reduced-motion: ' + depois.slice(0, 80))
})
