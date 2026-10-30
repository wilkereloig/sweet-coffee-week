// QR de contagem por peça (plano docs/cartoon-2026-2/12-plano-qr-leituras.md): a regra do código,
// o redirecionador api/q.js — que NUNCA pode deixar o QR impresso quebrar —, o rewrite e a migration.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { normalizarCodigo, destinoDoCodigo } from '../src/edicao/qrPontos.js'
import handler, { responder, config } from '../api/q.js'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8')

const ORIGEM = 'https://www.sweetcoffeeweek.com.br'
const UTM = 'utm_source=qr&utm_medium=impresso&utm_campaign=cartoon'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const pedido = (codigo, { ua = IPHONE, metodo = 'GET', origem = ORIGEM, cab = {} } = {}) =>
  new Request(`${origem}/api/q?c=${encodeURIComponent(codigo)}`, {
    method: metodo,
    headers: { ...(ua ? { 'user-agent': ua } : {}), ...cab },
  })

// Banco de mentira: guarda o que a função mandou e responde o que o teste quiser.
function bancoFalso (resposta = null, status = 200) {
  const chamadas = []
  const fetchImpl = async (url, init) => {
    chamadas.push({ url: String(url), corpo: JSON.parse(init.body), headers: init.headers })
    return new Response(JSON.stringify(resposta), { status, headers: { 'content-type': 'application/json' } })
  }
  return { fetchImpl, chamadas }
}

test('regra do código: cada peça leva para o destino certo e o resto vai para a entrada da edição', () => {
  const casos = [
    ['d1-cookitos', '/cartoon/participantes/cookitos'],
    ['d1-casa-1190-restaurante-e-coffee', '/cartoon/participantes/casa-1190-restaurante-e-coffee'],
    ['d2-cookitos', '/cartoon/avaliar'],
    ['pl-geral', '/cartoon'],
    ['inicio', '/cartoon'],
    ['avaliar', '/cartoon/avaliar'],
    ['premiacao', '/cartoon/premiacao'],
    ['constructor', '/cartoon'],
    ['mapa-bitly', '/cartoon/mapa'],
    ['teste', '/cartoon'],
    ['d1', '/cartoon'], // sem casa
    ['qualquer-outra-coisa', '/cartoon'],
    ['D1-Cookitos', '/cartoon/participantes/cookitos'], // maiúscula é normalizada
    ['', '/cartoon'], [null, '/cartoon'], [undefined, '/cartoon'],
    ['../etc/passwd', '/cartoon'], ['d1-a b', '/cartoon'], ['d1--x', '/cartoon'], ['d1-x-', '/cartoon'],
    ['x'.repeat(81), '/cartoon'],
  ]
  for (const [codigo, esperado] of casos) assert.equal(destinoDoCodigo(codigo), esperado, `código ${JSON.stringify(codigo)}`)
})

test('normalizarCodigo só aceita a-z, 0-9 e hífen entre eles, até 80 caracteres', () => {
  assert.equal(normalizarCodigo('  D2-Wow-Cookies '), 'd2-wow-cookies')
  assert.equal(normalizarCodigo('a'.repeat(80)), 'a'.repeat(80))
  for (const ruim of ['', 'a'.repeat(81), '-x', 'x-', 'a--b', 'a_b', 'á', 'a/b', 'a?b=c', 'a b', null]) {
    assert.equal(normalizarCodigo(ruim), null, `deveria recusar ${JSON.stringify(ruim)}`)
  }
})

test('leitura normal: conta uma vez e redireciona 302 para a página da casa, com a etiqueta do QR', async () => {
  const { fetchImpl, chamadas } = bancoFalso(null)
  const r = await responder(pedido('d1-cookitos', {
    cab: { 'x-vercel-ip-country': 'BR', 'x-vercel-ip-country-region': 'RN', 'x-vercel-ip-city': 'Natal' },
  }), { fetchImpl })
  assert.equal(r.status, 302)
  assert.equal(r.headers.get('location'), `${ORIGEM}/cartoon/participantes/cookitos?${UTM}&utm_content=d1-cookitos`)
  assert.equal(r.headers.get('cache-control'), 'no-store', 'redirecionamento em cache faria a leitura não contar')
  assert.equal(r.headers.get('x-robots-tag'), 'noindex')
  assert.equal(chamadas.length, 1)
  assert.match(chamadas[0].url, /\/rest\/v1\/rpc\/registrar_leitura_qr$/)
  assert.deepEqual(chamadas[0].corpo, {
    p_codigo: 'd1-cookitos', p_pais: 'BR', p_regiao: 'RN', p_cidade: 'Natal', p_aparelho: 'ios', p_robo: false,
  })
  assert.ok(chamadas[0].headers.apikey, 'sem a chave pública o banco recusa')
})

test('a cidade chega decodificada (a Vercel manda com percent-encoding)', async () => {
  const { fetchImpl, chamadas } = bancoFalso(null)
  await responder(pedido('d2-cookitos', { cab: { 'x-vercel-ip-city': 'S%C3%A3o%20Gon%C3%A7alo%20do%20Amarante' } }), { fetchImpl })
  assert.equal(chamadas[0].corpo.p_cidade, 'São Gonçalo do Amarante')
  // encoding quebrado não derruba nada
  await responder(pedido('d2-cookitos', { cab: { 'x-vercel-ip-city': '%E0%A4%A' } }), { fetchImpl })
  assert.equal(chamadas.length, 2)
})

test('aparelho: iPhone vira ios, Android vira android, o resto vira outro', async () => {
  for (const [ua, esperado] of [[IPHONE, 'ios'], [ANDROID, 'android'], [DESKTOP, 'outro']]) {
    const { fetchImpl, chamadas } = bancoFalso(null)
    await responder(pedido('pl-geral', { ua }), { fetchImpl })
    assert.equal(chamadas[0].corpo.p_aparelho, esperado)
  }
})

test('robô: HEAD, sem user-agent, pré-visualização e prefetch contam como robô; celular e desktop não', async () => {
  const casos = [
    ['HEAD', { metodo: 'HEAD' }, true],
    ['sem user-agent', { ua: '' }, true],
    ['WhatsApp', { ua: 'WhatsApp/2.23.20.0 A' }, true],
    ['Facebook', { ua: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' }, true],
    ['Googlebot', { ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }, true],
    ['prefetch', { cab: { 'sec-purpose': 'prefetch' } }, true],
    ['iPhone', {}, false],
    ['Android', { ua: ANDROID }, false],
    ['desktop', { ua: DESKTOP }, false],
  ]
  for (const [nome, opcoes, esperado] of casos) {
    const { fetchImpl, chamadas } = bancoFalso(null)
    await responder(pedido('d1-cookitos', opcoes), { fetchImpl })
    assert.equal(chamadas[0].corpo.p_robo, esperado, nome)
  }
})

test('NUNCA quebra: banco fora, erro 500 e resposta lixo redirecionam exatamente como a leitura normal', async () => {
  const normal = await responder(pedido('d2-cookitos'), { fetchImpl: bancoFalso(null).fetchImpl })
  const falhas = [
    async () => { throw new Error('rede caiu') },
    async () => new Response('erro interno', { status: 500 }),
    async () => new Response('<html>não é json</html>', { status: 200 }),
    async () => new Response('', { status: 204 }),
  ]
  for (const fetchImpl of falhas) {
    const r = await responder(pedido('d2-cookitos'), { fetchImpl })
    assert.equal(r.status, 302)
    assert.equal(r.headers.get('location'), normal.headers.get('location'))
  }
})

test('NUNCA quebra: banco lento é abandonado no limite e o QR redireciona do mesmo jeito', async () => {
  const lento = (url, init) => new Promise((_, rejeita) => init.signal.addEventListener('abort', () => rejeita(new Error('abortado'))))
  const t0 = Date.now()
  const r = await responder(pedido('d1-cookitos'), { fetchImpl: lento, limiteMs: 25 })
  assert.ok(Date.now() - t0 < 1000, 'esperou o banco além do limite')
  assert.equal(r.status, 302)
  assert.equal(r.headers.get('location'), `${ORIGEM}/cartoon/participantes/cookitos?${UTM}&utm_content=d1-cookitos`)
})

test('destino manual do banco vale; o que não é caminho do próprio site é ignorado', async () => {
  const manual = await responder(pedido('d1-cookitos'), { fetchImpl: bancoFalso('/cartoon/mapa?x=1').fetchImpl })
  const url = new URL(manual.headers.get('location'))
  assert.equal(url.origin, ORIGEM)
  assert.equal(url.pathname, '/cartoon/mapa')
  assert.equal(url.searchParams.get('x'), '1')
  assert.equal(url.searchParams.get('utm_content'), 'd1-cookitos')

  const regra = await responder(pedido('d1-cookitos'), { fetchImpl: bancoFalso(null).fetchImpl })
  for (const perigoso of ['//evil.example', 'https://evil.example', '/\\evil.example', 'javascript:alert(1)', '/a b', '', 42, { x: 1 }, ['/cartoon']]) {
    const r = await responder(pedido('d1-cookitos'), { fetchImpl: bancoFalso(perigoso).fetchImpl })
    assert.equal(r.headers.get('location'), regra.headers.get('location'), `aceitou ${JSON.stringify(perigoso)}`)
  }
})

test('código inválido não chama o banco e vai para a entrada da edição, sem utm_content', async () => {
  for (const ruim of ['../../etc/passwd', 'a b', '', 'x'.repeat(200)]) {
    const { fetchImpl, chamadas } = bancoFalso(null)
    const r = await responder(pedido(ruim), { fetchImpl })
    assert.equal(r.status, 302)
    assert.equal(r.headers.get('location'), `${ORIGEM}/cartoon?${UTM}`)
    assert.equal(chamadas.length, 0, `chamou o banco com ${JSON.stringify(ruim)}`)
  }
})

test('maiúscula vira minúscula e o último pedaço do caminho vale quando não vem ?c=', async () => {
  const a = bancoFalso(null)
  await responder(pedido('D1-Cookitos'), { fetchImpl: a.fetchImpl })
  assert.equal(a.chamadas[0].corpo.p_codigo, 'd1-cookitos')

  const b = bancoFalso(null)
  await responder(new Request(`${ORIGEM}/q/d2-wow-cookies`, { headers: { 'user-agent': IPHONE } }), { fetchImpl: b.fetchImpl })
  assert.equal(b.chamadas[0].corpo.p_codigo, 'd2-wow-cookies')
})

test('a origem do pedido manda: prévia da Vercel e domínio oficial redirecionam para si mesmos', async () => {
  const previa = 'https://sweet-coffee-week-git-qr-abc.vercel.app'
  const r = await responder(pedido('pl-geral', { origem: previa }), { fetchImpl: bancoFalso(null).fetchImpl })
  assert.equal(r.headers.get('location'), `${previa}/cartoon?${UTM}&utm_content=pl-geral`)
})

test('api/q.js é função de borda e o rewrite entrega /q/:codigo a ela', () => {
  assert.equal(config.runtime, 'edge')
  assert.equal(typeof handler, 'function')
  const rewrites = JSON.parse(ler('vercel.json')).rewrites
  assert.ok(
    rewrites.some((r) => r.source === '/q/:codigo' && r.destination === '/api/q?c=:codigo'),
    'falta o rewrite /q/:codigo → /api/q?c=:codigo no vercel.json',
  )
  assert.ok(!fs.existsSync(path.join(raiz, 'public', 'q')), 'um public/q/ venceria o rewrite')
})

test('gerador de QR e api/q.js leem a regra do mesmo módulo', () => {
  assert.match(ler('scripts/qr-edicao.mjs'), /from '\.\.\/src\/edicao\/qrPontos\.js'/)
  assert.match(ler('api/q.js'), /from '\.\.\/src\/edicao\/qrPontos\.js'/)
  assert.doesNotMatch(ler('scripts/qr-edicao.mjs'), /\/avaliar`/, 'destino escrito de novo no gerador')
})

test('migration: tabelas fechadas e a função aberta só para o que precisa', () => {
  const sql = ler('supabase/migrations/20261121_qr_leituras.sql')
  assert.equal((sql.match(/enable row level security/g) || []).length, 2)
  assert.match(sql, /revoke all on public\.qr_pontos from anon, authenticated/)
  assert.match(sql, /revoke all on public\.qr_leituras_hora from anon, authenticated/)
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete|all)[^;]*public\.qr_/i, 'tabela de QR não pode ter grant')
  assert.match(sql, /security definer/)
  assert.match(sql, /set search_path to 'public'/)
  // o revoke tem que cobrir PUBLIC: sozinho "anon, authenticated" não fecha (docs/regras/04)
  assert.match(sql, /revoke all on function public\.registrar_leitura_qr\([^)]*\) from public;/)
  assert.match(sql, /grant execute on function public\.registrar_leitura_qr\([^)]*\) to anon, authenticated, service_role;/)
})
