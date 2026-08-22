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
                    'mostrarEstado', 'abrirPainel', 'dataCurta', 'soDigitos']
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
