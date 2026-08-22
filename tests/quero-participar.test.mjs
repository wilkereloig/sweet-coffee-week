/*
 * A página /quero-participar é estática: o JS mora inline no HTML e NÃO passa
 * pelo build do Vite. Ou seja, `npm run build` passa mesmo com o script
 * quebrado — foi assim que um erro de sintaxe e uma função apagada chegaram ao
 * commit sem ninguém ver.
 *
 * Estas checagens cobrem exatamente esse vão. Rodar: node --test tests/quero-participar.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import SWEET_COFFEE_HISTORY from '../src/data/sweetCoffeeHistory.js'
import { festivalFacts } from '../src/data/festivalFacts.js'

const HTML = readFileSync(new URL('../public/quero-participar/index.html', import.meta.url), 'utf8')
const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])

test('o HTML traz exatamente um bloco de script inline', () => {
  assert.equal(SCRIPTS.length, 1)
})

test('o script inline compila', () => {
  // new Function não executa: só força o parse. Pega string não terminada,
  // parêntese sobrando e afins.
  assert.doesNotThrow(() => new Function(SCRIPTS[0]))
})

test('toda função chamada está declarada', () => {
  const js = SCRIPTS[0]
  const declaradas = new Set([...js.matchAll(/(?:function\s+|const\s+|let\s+)([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))
  // Só as do próprio arquivo: as globais do browser ficam de fora da lista.
  const criticas = ['montarResumo', 'coletar', 'validarPasso', 'validarTudo', 'mostrar',
                    'atualizarOutros', 'atualizarContaChips', 'preenchido', 'marcar', 'campos', 'copiar']
  const faltando = criticas.filter((f) => !declaradas.has(f))
  assert.deepEqual(faltando, [], 'função chamada mas nunca declarada: ' + faltando.join(', '))
})

test('não sobrou referência ao wizard de passos', () => {
  // O formulário virou página única em 20/08/2026. Estes nomes morreram junto;
  // se voltarem, é sinal de que um patch antigo foi reaplicado por cima.
  for (const morto of ['irPara', 'btnAvancar', 'btnVoltar', 'pa-trilha', 'montarRevisao']) {
    assert.ok(!HTML.includes(morto), 'referência morta ao wizard: ' + morto)
  }
})

test('o envio tem destino configurado', () => {
  // Supabase OU endpoint genérico. Sem nenhum dos dois o envio cai no mailto,
  // que não grava nada e não chega ao painel da organização.
  const sb = HTML.match(/supabaseUrl:\s*'([^']*)'/)
  const ep = HTML.match(/endpoint:\s*'([^']*)'/)
  const alvo = (sb && sb[1]) || (ep && ep[1]) || ''
  assert.ok(alvo.startsWith('https://'), 'nenhum destino HTTPS configurado: o envio cairia no mailto')
})

test('a chave do Supabase é a publicável, nunca a service_role', () => {
  assert.ok(!/service_role|\bsb_secret_/.test(HTML), 'chave secreta em arquivo de public/')
  const m = HTML.match(/supabaseKey:\s*'([^']*)'/)
  if (m && m[1]) assert.ok(m[1].startsWith('sb_publishable_'), 'chave não é publicável: ' + m[1].slice(0, 16))
})

test('os campos que a RPC exige saem da coleta', () => {
  // submit_quero_participar levanta exceção sem nome, empresa e email, e lê
  // carroChefe para a coluna consultável. Se o formulário renomear um desses,
  // o envio passa a falhar só em produção — este teste falha antes.
  const ordem = HTML.match(/const ORDEM = \[([\s\S]*?)\]/)
  assert.ok(ordem, 'ORDEM não encontrada')
  for (const campo of ['nome', 'empresa', 'email', 'carroChefe']) {
    assert.ok(ordem[1].includes("'" + campo + "'"), 'campo exigido pela RPC não está em ORDEM: ' + campo)
  }
})

test('só afirma envio depois de confirmar a gravação', () => {
  const js = SCRIPTS[0]
  const ok = js.indexOf("mostrar('ok'")
  const guarda = js.indexOf('if (!r.ok)')
  assert.ok(guarda > -1, 'sumiu a checagem de r.ok')
  assert.ok(ok > guarda, 'a mensagem de sucesso tem que vir DEPOIS da checagem de r.ok')
  // O guard tem que interromper de verdade: sem throw ele vira comentário caro.
  assert.match(js.slice(guarda, ok), /throw\s+new\s+Error/, 'o if (!r.ok) não interrompe o fluxo')
})

test('todo asset absoluto existe em public/', () => {
  const pedidos = [...HTML.matchAll(/(?:url\('|src="|href=")(\/[^"')]+)/g)].map((m) => m[1])
  for (const p of new Set(pedidos)) {
    const alvo = new URL('../public' + p, import.meta.url)
    // Caixa exata importa: a Vercel roda Linux, o Windows não denuncia.
    assert.ok(readFileSync(alvo), 'asset ausente: ' + p)
  }
})

/* ── Números do herói ────────────────────────────────────────────────────────
 *
 * A página é estática e mora em public/: não importa festivalFacts.js nem
 * sweetCoffeeHistory.js, então os três números do herói estão escritos à mão no
 * HTML. Foi assim que "+120 marcas" ficou meses no ar enquanto a base dizia 123.
 *
 * Estes testes são a costura que falta: recalculam da base a cada rodada e
 * reprovam se o HTML divergir. Nenhum valor esperado é digitado aqui.
 */

const NUMEROS = [...HTML.matchAll(
  /<li><span class="scw-stat__regua" style="background:(#[0-9A-Fa-f]{6})"[^>]*><\/span><b>([^<]+)<\/b><span>([^<]+)<\/span><\/li>/g,
)].map(([, regua, valor, rotulo]) => ({ regua, valor, rotulo }))

// Marca canônica: aplica os aliases, para uma rede não contar como várias casas.
const normalizar = (s) => String(s)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/['\u2019`]/g, "'")
  .toLowerCase().replace(/\s+/g, ' ').trim()

const CANON = {}
for (const [canon, aliases] of Object.entries(SWEET_COFFEE_HISTORY.participantAliases ?? {})) {
  for (const alias of [].concat(aliases)) CANON[normalizar(alias)] = canon
}

const POR_EDICAO = (SWEET_COFFEE_HISTORY.edicoes ?? [])
  .map((ed) => [...new Set((ed.participantes ?? []).map((n) => CANON[normalizar(n)] ?? n))])

// Para cada marca, os índices das edições em que ela apareceu.
const APARICOES = new Map()
POR_EDICAO.forEach((marcas, i) => {
  for (const marca of marcas) {
    if (!APARICOES.has(marca)) APARICOES.set(marca, [])
    APARICOES.get(marca).push(i)
  }
})

test('o herói mostra exatamente três números', () => {
  assert.equal(NUMEROS.length, 3, 'o bloco .pa-numeros deixou de ter três itens')
})

test('"68% das marcas voltaram" confere com a base', () => {
  const distintas = APARICOES.size
  const voltaram = [...APARICOES.values()].filter((eds) => eds.length > 1).length
  const esperado = Math.round((voltaram / distintas) * 100) + '%'

  const item = NUMEROS.find((n) => /voltaram/.test(n.rotulo))
  assert.ok(item, 'sumiu o número de marcas que voltaram')
  assert.equal(item.valor, esperado,
    `HTML diz ${item.valor}, a base diz ${esperado} (${voltaram} de ${distintas} marcas distintas)`)
})

test('"+7 estreias por edição" confere com a base', () => {
  // Estreia = a primeira edição de cada marca. A 1ª edição não conta: lá todas
  // estreavam, e incluí-la inflaria a média.
  const estreiasDepoisDaPrimeira = [...APARICOES.values()].filter((eds) => eds[0] > 0).length
  const edicoesSeguintes = POR_EDICAO.length - 1
  const esperado = '+' + Math.floor(estreiasDepoisDaPrimeira / edicoesSeguintes)

  const item = NUMEROS.find((n) => /estreias/.test(n.rotulo))
  assert.ok(item, 'sumiu o número de estreias por edição')
  assert.equal(item.valor, esperado,
    `HTML diz ${item.valor}, a base diz ${esperado} ` +
    `(${estreiasDepoisDaPrimeira} estreias em ${edicoesSeguintes} edições)`)
})

test('"+18 mi visualizações" confere com festivalFacts', () => {
  // Este não sai da base histórica: é número comercial do acervo §9.5. A fonte
  // canônica no código é festivalFacts.igViews — é dela que o HTML tem de copiar.
  const item = NUMEROS.find((n) => /visualiza/.test(n.rotulo))
  assert.ok(item, 'sumiu o número de visualizações')
  const noHtml = Number(item.valor.replace(/[^\d]/g, ''))
  assert.equal(noHtml, festivalFacts.igViews.value,
    `HTML diz ${noHtml}, festivalFacts.igViews diz ${festivalFacts.igViews.value}`)
})

test('irmãos não repetem cor de régua', () => {
  // §6.3: dois irmãos com a mesma cor é defeito, não economia.
  const cores = NUMEROS.map((n) => n.regua.toUpperCase())
  assert.equal(new Set(cores).size, cores.length, 'duas réguas com a mesma cor: ' + cores.join(' '))

  // E cada uma tem de ser token da paleta (§6.1) — hex solto fora da tabela não entra.
  const PALETA = ['#FEF0DD', '#F8E4C1', '#3D1308', '#6A2C15', '#FDBB1A', '#01AFCC', '#4D257E', '#F10767', '#FF4810']
  for (const cor of cores) assert.ok(PALETA.includes(cor), 'cor fora da paleta do §6.1: ' + cor)
})
