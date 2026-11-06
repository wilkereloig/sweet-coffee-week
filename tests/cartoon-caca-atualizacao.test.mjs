// Atualização automática do app instalado da Caça (06/11/2026). Roda a TRANSIÇÃO com dependências falsas (rede, storage, recarga, relógio);
// o roteiro com navegador de verdade e dois builds é tests/cartoon-caca-atualizacao-navegador.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  versaoDaPagina, validarVersao, lerVersaoPublicada, versaoEstaInteira, resultadoDaAtualizacao, criarAtualizador,
  recarregarPagina, limparMarcaDeRecarga, CHAVE_TENTATIVA, MAX_TENTATIVAS, MINIMO_ENTRE_CONSULTAS,
} from '../src/edicao/caca/pwa/atualizacao.js'
import { comEnvio, observarDigitacao, pendencias, _zerar } from '../src/edicao/caca/pwa/pendencias.js'
import { idDoHtml, recursosDoHtml } from '../src/lib/versaoBuild.js'
import { CACA } from '../src/edicao/caca/textos.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const A = 'aaaaaaaaaaaaaaaa'
const B = 'bbbbbbbbbbbbbbbb'
const memoria = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m } }
const resp = (corpo, { status = 200, tipo = 'application/json' } = {}) => ({
  ok: status >= 200 && status < 300, status, headers: { get: (h) => (h.toLowerCase() === 'content-type' ? tipo : null) },
  json: async () => (typeof corpo === 'string' ? JSON.parse(corpo) : corpo), text: async () => (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)),
})
const versao = (id, extra = {}) => ({ app: 'site-scw', id, ambiente: 'production', ...extra })
const html = (id) => `<html><head><script type="module" crossorigin src="/assets/main-${id.slice(0, 6)}.js"></script><link rel="stylesheet" crossorigin href="/assets/main-${id.slice(0, 6)}.css">\n  <meta name="scw-versao" content="${id}" data-ambiente="production" />\n  </head></html>`

/** Um relógio que anda só quando mandamos. */
const relogio = (t = 1_000_000) => { let agora = t; const f = () => agora; f.anda = (ms) => { agora += ms }; return f }

/** Monta um atualizador com tudo falso. `publicada` é a versão que o "servidor" serve agora. */
function montar ({ atual = A, publicada = B, pend = [], conectado = true, inteira = true, sessao = memoria(), tempo = relogio(), ambiente = 'production' } = {}) {
  const ctx = { publicada, pend, conectado, inteira, recargas: [], consultas: 0, sessao, tempo }
  const at = criarAtualizador({
    atual, ambiente, sessao, agora: tempo,
    ler: async () => { ctx.consultas += 1; if (!ctx.conectado) throw new Error('rede'); return versao(ctx.publicada) },
    preparar: async () => ctx.inteira,
    pendencias: () => ctx.pend,
    online: () => ctx.conectado,
    recarregar: (id) => ctx.recargas.push(id),
  })
  return { at, ctx }
}

test('identidade: a página lê a meta do build; o arquivo só vale se for do site (o do painel é recusado)', () => {
  const doc = { querySelector: () => ({ getAttribute: (k) => (k === 'content' ? A : 'production') }) }
  assert.deepEqual(versaoDaPagina(doc), { id: A, ambiente: 'production' })
  assert.equal(versaoDaPagina({ querySelector: () => null }), null, 'desenvolvimento: sem meta, sem comparação')
  assert.equal(validarVersao({ app: 'painel-scw', id: A }), null)
  assert.equal(validarVersao({ app: 'site-scw', id: '<html>' }), null)
  assert.equal(validarVersao(versao(B)).id, B)
  assert.equal(idDoHtml(html(B)), B)
  assert.equal(recursosDoHtml(html(B)).length, 2)
})

test('consulta: da rede, sem cache nem cookie; HTML no lugar do JSON, 404 e rede caída são recusados', async () => {
  let opcoes = null
  const v = await lerVersaoPublicada(async (u, o) => { opcoes = o; assert.match(u, /^\/versao\.json\?t=\d+$/); return resp(versao(B)) })
  assert.equal(v.id, B)
  assert.equal(opcoes.cache, 'no-store')
  assert.equal(opcoes.credentials, 'omit', 'a consulta não leva cookie')
  assert.deepEqual(Object.keys(opcoes.headers), ['Accept'], 'nenhum cabeçalho com dado da pessoa')
  await assert.rejects(lerVersaoPublicada(async () => resp('<!doctype html>', { tipo: 'text/html' })), /invalida/)
  await assert.rejects(lerVersaoPublicada(async () => resp('x', { status: 404, tipo: 'text/html' })), /indisponivel/)
  await assert.rejects(lerVersaoPublicada(async () => { throw new TypeError('Failed to fetch') }), /rede/)
})

test('versão nova inteira: HTML com a mesma id e todos os arquivos que ele abre; senão não está pronta', async () => {
  const servidor = ({ htmlId = B, falta = null } = {}) => async (u) => {
    if (u.startsWith('/cartoon/caca?v=')) return resp(html(htmlId), { tipo: 'text/html' })
    if (u.startsWith('/assets/')) return resp('', { status: falta && u.includes(falta) ? 404 : 200, tipo: 'text/javascript' })
    return resp('', { status: 404 })
  }
  assert.equal(await versaoEstaInteira(versao(B), servidor()), true)
  assert.equal(await versaoEstaInteira(versao(B), servidor({ htmlId: A })), false, 'edge ainda serve o HTML antigo')
  assert.equal(await versaoEstaInteira(versao(B), servidor({ falta: '.css' })), false, 'arquivo da versão nova faltando')
  assert.equal(await versaoEstaInteira(versao(B), async () => { throw new Error('rede') }), false)
})

test('A → B ao abrir: acha a versão nova, confere, e recarrega uma vez (1ª tentativa: recarga simples)', async () => {
  const { at, ctx } = montar()
  await at.verificar({ forcar: true })
  assert.equal(ctx.recargas.length, 1)
  assert.equal(ctx.recargas[0], null)
  assert.equal(at.estado.fase, 'recarregando')
  assert.deepEqual(JSON.parse(ctx.sessao.getItem(CHAVE_TENTATIVA)).esperado, B)
})

test('mesma versão: nada acontece e a primeira abertura nunca vira "atualização"', async () => {
  const { at, ctx } = montar({ publicada: A })
  await at.verificar({ forcar: true })
  assert.equal(ctx.recargas.length, 0)
  assert.equal(at.estado.fase, 'ok')
  assert.equal(ctx.sessao.getItem(CHAVE_TENTATIVA), null)
})

test('segundo plano → volta: a consulta respeita o intervalo mínimo; depois dele, acha a B', async () => {
  const { at, ctx } = montar({ publicada: A })
  await at.verificar({ forcar: true })
  assert.equal(ctx.consultas, 1)
  ctx.publicada = B // deploy enquanto o app estava em segundo plano
  await at.verificar() // volta logo em seguida (<30 s): não consulta de novo
  assert.equal(ctx.consultas, 1)
  assert.equal(ctx.recargas.length, 0)
  ctx.tempo.anda(MINIMO_ENTRE_CONSULTAS + 1_000) // ficou minutos em segundo plano
  await at.verificar()
  assert.equal(ctx.consultas, 2)
  assert.equal(ctx.recargas.length, 1, 'ao voltar do segundo plano, o app velho troca para o novo')
})

test('trabalho pela metade (envio ou campo preenchido): espera, não recarrega, e troca quando terminar', async () => {
  const { at, ctx } = montar({ pend: [{ tipo: 'campo' }] })
  await at.verificar({ forcar: true })
  assert.equal(ctx.recargas.length, 0, 'formulário em andamento não se perde')
  assert.equal(at.estado.fase, 'aguardando')
  assert.equal(at.estado.disponivel.id, B)
  await at.tentarAplicar()
  assert.equal(ctx.recargas.length, 0, 'continua esperando enquanto houver pendência')
  ctx.pend = [] // a pessoa terminou
  await at.tentarAplicar()
  assert.equal(ctx.recargas.length, 1)
})

test('pendência que aparece DURANTE a conferência também segura a recarga', async () => {
  const sessao = memoria()
  let consultasDePendencia = 0
  const at = criarAtualizador({
    atual: A, ambiente: 'production', sessao, ler: async () => versao(B),
    preparar: async () => true,
    pendencias: () => { consultasDePendencia += 1; return consultasDePendencia >= 2 ? [{ tipo: 'envio' }] : [] },
    online: () => true, recarregar: () => assert.fail('não pode recarregar com envio em curso'),
  })
  await at.verificar({ forcar: true })
  assert.equal(at.estado.fase, 'aguardando')
})

test('versão nova ainda não está inteira no servidor: não recarrega, tenta de novo depois', async () => {
  const { at, ctx } = montar({ inteira: false })
  await at.verificar({ forcar: true })
  assert.equal(ctx.recargas.length, 0)
  assert.equal(at.estado.fase, 'incompleta')
  ctx.inteira = true
  await at.tentarAplicar()
  assert.equal(ctx.recargas.length, 1)
})

test('sem conexão: diz "sem conexão", não promete versão nova, e confere quando a rede volta', async () => {
  const { at, ctx } = montar({ conectado: false })
  await at.verificar({ forcar: true })
  assert.equal(at.estado.fase, 'offline')
  assert.equal(ctx.consultas, 0, 'nem tenta a rede sabendo que ela caiu')
  assert.equal(ctx.recargas.length, 0)
  assert.equal(at.estado.disponivel, null, 'nunca afirma que há versão nova sem ter consultado')
  ctx.conectado = true
  await at.voltouARede()
  assert.equal(ctx.consultas, 1)
  assert.equal(ctx.recargas.length, 1)
})

test('navigator diz online mas a rede falha: vira "sem conexão" (e some quando uma consulta dá certo)', async () => {
  const { at, ctx } = montar({ publicada: A })
  ctx.conectado = true
  const falha = criarAtualizador({
    atual: A, ambiente: 'production', ler: async () => { throw new Error('rede') }, online: () => true, recarregar: () => {},
  })
  await falha.verificar({ forcar: true })
  assert.equal(falha.estado.fase, 'offline')
  await at.verificar({ forcar: true })
  assert.equal(at.estado.fase, 'ok')
})

test('erro do servidor ou JSON estranho: segue como estava, sem recarregar nem avisar', async () => {
  for (const motivo of ['servidor', 'invalida', 'indisponivel']) {
    const recargas = []
    const at = criarAtualizador({ atual: A, ambiente: 'production', ler: async () => { throw new Error(motivo) }, online: () => true, recarregar: (id) => recargas.push(id) })
    await at.verificar({ forcar: true })
    assert.equal(recargas.length, 0)
    assert.equal(at.estado.fase, 'ok')
  }
})

test('sem laço de recarga: a nova que não chega é tentada 2 vezes (2ª com a id no endereço) e depois para', async () => {
  const sessao = memoria()
  const tempo = relogio()
  // abertura 1 (versão A, publicada B): recarga simples
  let m = montar({ sessao, tempo })
  await m.at.verificar({ forcar: true })
  assert.deepEqual(m.ctx.recargas, [null])
  // a recarga trouxe A de novo (HTML velho no edge): nova "página", mesma sessão
  m = montar({ sessao, tempo })
  assert.equal(resultadoDaAtualizacao(A, sessao, tempo).podeTentar, true)
  await m.at.verificar({ forcar: true })
  assert.deepEqual(m.ctx.recargas, [B], '2ª tentativa leva a id da versão para furar o cache')
  // de novo A: esgotou
  m = montar({ sessao, tempo })
  assert.equal(m.at.estado.fase, 'falhou', 'já abre dizendo que não deu')
  await m.at.verificar({ forcar: true })
  assert.equal(m.ctx.recargas.length, 0, 'não recarrega uma 3ª vez')
  assert.equal(MAX_TENTATIVAS, 2)
})

test('depois de uma recarga que deu certo o registro some e nada mais acontece', async () => {
  const sessao = memoria()
  const tempo = relogio()
  const velha = montar({ sessao, tempo })
  await velha.at.verificar({ forcar: true })
  const nova = montar({ atual: B, publicada: B, sessao, tempo })
  assert.equal(sessao.getItem(CHAVE_TENTATIVA), null, 'a versão esperada chegou: registro limpo')
  await nova.at.verificar({ forcar: true })
  assert.equal(nova.ctx.recargas.length, 0)
  assert.equal(nova.at.estado.fase, 'ok')
})

test('registro antigo (mais de 10 min) é esquecido: uma publicação posterior pode ser tentada de novo', async () => {
  const sessao = memoria()
  const tempo = relogio()
  sessao.setItem(CHAVE_TENTATIVA, JSON.stringify({ esperado: B, de: A, tentativa: 2, em: tempo() - 11 * 60 * 1000 }))
  assert.equal(resultadoDaAtualizacao(A, sessao, tempo), null)
  const m = montar({ sessao, tempo })
  await m.at.verificar({ forcar: true })
  assert.equal(m.ctx.recargas.length, 1)
})

test('produção e preview nunca se misturam; sem meta de versão (desenvolvimento) o atualizador é inerte', async () => {
  const preview = criarAtualizador({
    atual: A, ambiente: 'preview', ler: async () => versao(B, { ambiente: 'production' }), online: () => true, recarregar: () => assert.fail('misturou ambientes'),
  })
  await preview.verificar({ forcar: true })
  assert.equal(preview.estado.fase, 'ok')
  let lidas = 0
  const dev = criarAtualizador({ atual: undefined, ler: async () => { lidas += 1; return versao(B) }, recarregar: () => assert.fail('dev não recarrega') })
  await dev.verificar({ forcar: true })
  assert.equal(lidas, 0)
})

test('recarga: a 2ª tentativa põe _v no endereço e a abertura tira de volta, sem recarregar', () => {
  const chamadas = []
  const janela = { location: { href: 'https://www.sweetcoffeeweek.com.br/cartoon/caca?origem=app#x', reload: () => chamadas.push(['reload']), replace: (u) => chamadas.push(['replace', u]) } }
  recarregarPagina(null, janela)
  recarregarPagina(B, janela)
  assert.deepEqual(chamadas[0], ['reload'])
  assert.equal(chamadas[1][1], `https://www.sweetcoffeeweek.com.br/cartoon/caca?origem=app&_v=${B}#x`)
  const trocas = []
  const aberta = { location: { href: `https://www.sweetcoffeeweek.com.br/cartoon/caca?origem=app&_v=${B}#x` }, history: { state: null, replaceState: (...a) => trocas.push(a) } }
  limparMarcaDeRecarga(aberta)
  assert.equal(trocas[0][2], '/cartoon/caca?origem=app#x')
  const limpa = { location: { href: 'https://www.sweetcoffeeweek.com.br/cartoon/caca' }, history: { replaceState: () => assert.fail('sem _v não mexe no histórico') } }
  limparMarcaDeRecarga(limpa)
})

/* ── trabalho pela metade ─────────────────────────────────────────────── */

const campo = (valor = '', { tipo = 'text', ligado = true } = {}) => ({
  tagName: 'INPUT', value: valor, isConnected: ligado, getAttribute: (k) => (k === 'type' ? tipo : null),
})
function docFalso () {
  const ouvintes = {}
  return {
    activeElement: null,
    addEventListener: (n, f) => { ouvintes[n] = f },
    removeEventListener: (n) => { delete ouvintes[n] },
    digitar (el) { ouvintes.input?.({ target: el }) },
    ouvintes,
  }
}

test('pendências: envio em curso, campo digitado com conteúdo e campo com foco; campo que saiu da tela ou ficou vazio não conta', async () => {
  _zerar()
  const doc = docFalso()
  const parar = observarDigitacao(doc)
  assert.deepEqual(pendencias(doc), [])
  const apelido = campo('Ana')
  doc.digitar(apelido)
  assert.deepEqual(pendencias(doc).map((p) => p.tipo), ['campo'])
  apelido.value = ''
  assert.deepEqual(pendencias(doc), [], 'campo esvaziado (formulário enviado e limpo) não segura')
  apelido.value = 'Ana'
  apelido.isConnected = false
  assert.deepEqual(pendencias(doc), [], 'formulário que saiu da tela (outra página do app) não segura')
  doc.activeElement = campo('')
  assert.deepEqual(pendencias(doc).map((p) => p.tipo), ['foco'])
  doc.activeElement = { tagName: 'BUTTON', getAttribute: () => null }
  assert.deepEqual(pendencias(doc), [])
  let solta
  const op = comEnvio(() => new Promise((ok) => { solta = ok }))
  assert.deepEqual(pendencias(doc).map((p) => p.tipo), ['envio'])
  solta('feito')
  assert.equal(await op, 'feito')
  assert.deepEqual(pendencias(doc), [], 'envio terminou (também quando falha)')
  await assert.rejects(comEnvio(async () => { throw new Error('x') }), /x/)
  assert.deepEqual(pendencias(doc), [])
  parar()
  assert.equal(doc.ouvintes.input, undefined)
})

test('campo que não é de texto (caixa de marcar, botão, senha de outro tipo) não segura a atualização', () => {
  _zerar()
  const doc = docFalso()
  observarDigitacao(doc)
  doc.digitar(campo('on', { tipo: 'checkbox' }))
  doc.digitar(campo('x', { tipo: 'submit' }))
  assert.deepEqual(pendencias(doc), [])
})

/* ── fiação (texto): o que o teste de comportamento não alcança ───────── */

test('build: o site grava /versao.json e a meta com a mesma id; o arquivo nunca é guardado em cache', () => {
  const vite = ler('vite.config.js')
  assert.match(vite, /function versaoDoSite\(\)/)
  assert.match(vite, /versaoDoPainel\(\), versaoDoSite\(\)/, 'o plugin está ligado')
  assert.match(vite, /app: 'site-scw'/)
  assert.match(vite, /'versao\.json'/)
  assert.match(vite, /name="scw-versao"/)
  assert.doesNotMatch(vite.slice(vite.indexOf('function versaoDoSite'), vite.indexOf('function arquivosDoGrafo')), /process\.env\.(?!VERCEL_ENV|VERCEL_GIT_COMMIT_SHA)/, 'nada de segredo no arquivo de versão')
  const cfg = JSON.parse(ler('vercel.json'))
  const h = (src) => cfg.headers.find((x) => x.source === src)?.headers.find((x) => x.key === 'Cache-Control')?.value || ''
  assert.match(h('/versao.json'), /no-store/)
  assert.match(h('/caca-sw.js'), /no-store/)
  assert.match(h('/index.html'), /no-store/)
  assert.match(h('/painel/versao.json'), /no-store/, 'o painel segue como estava')
})

test('o painel segue com a leitura do HTML de sempre (agora numa regra só) e o service worker da Caça continua sem cache', () => {
  const painel = ler('painel-app/src/lib/versao.js')
  assert.match(painel, /from '\.\.\/\.\.\/\.\.\/src\/lib\/versaoBuild\.js'/)
  assert.match(painel, /export \{ recursosDoHtml, idDoHtml \}/)
  const sw = ler('public/caca-sw.js')
  const codigo = sw.replace(/\/\*[\s\S]*?\*\//g, '') // os comentários explicam o que o SW NÃO faz e citam as palavras
  assert.doesNotMatch(codigo, /caches\.|respondWith|cache\.put/, 'o service worker da Caça não guarda nem responde nada')
  assert.match(sw, /self\.addEventListener\('push'/, 'push preservado')
  assert.match(sw, /notificationclick/)
})

test('a página monta o atualizador, e o envio ao banco e a localização contam como trabalho em curso', () => {
  assert.match(ler('src/edicao/caca/pwa/ManifestoDaCaca.jsx'), /<AtualizacaoDaCaca \/>/)
  const rota = ler('src/edicao/rota/carimbo.js')
  assert.match(rota, /export function chamar[\s\S]*?comEnvio\(/)
  assert.match(rota, /export function pedirPosicao[\s\S]*?comEnvio\(/)
  assert.match(ler('src/edicao/caca/api.js'), /comEnvio\(\(\) => globalThis\.fetch/)
  const comp = ler('src/edicao/caca/pwa/AtualizacaoDaCaca.jsx')
  for (const gatilho of ['visibilitychange', 'pageshow', "'online'", "'offline'", 'vite:preloadError']) assert.ok(comp.includes(gatilho), `gatilho ${gatilho}`)
})

test('textos do aviso: três situações, nada de "atualizado" sem ter chegado, nada de "votar" ou "Sweet" sozinho', () => {
  const T = CACA.atualizacao
  assert.deepEqual(Object.keys(T).sort(), ['aguardando', 'falhou', 'offline'])
  const tudo = Object.values(T).join(' ')
  assert.doesNotMatch(tudo, /atualizad[oa]\b(?! da)/i, 'o app não se diz atualizado')
  assert.doesNotMatch(tudo, /vot(o|a|ar|ação)\b|\bSweet\b(?! &)/i)
  assert.match(T.offline, /Sem conexão/)
  assert.doesNotMatch(T.offline, /nova versão está|há uma versão nova/i, 'offline não promete versão nova')
})
