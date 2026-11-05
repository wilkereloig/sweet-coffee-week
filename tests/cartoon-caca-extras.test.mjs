// Caça aos Carimbos — extras: metas, avisos, notificações, compartilhar e app instalável (docs/cartoon-2026-2/15-caca-front.md).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { organizarMetas, medalhaDoMarco, novasConquistas, lerVistas, gravarVistas, calcularAvisos } from '../src/edicao/caca/metas/logica.js'
import { PREFS_PADRAO, normalizarPrefs, estadoDoPush, classificarErroPush } from '../src/edicao/caca/notificacoes/logica.js'
import {
  dadosDaArte, layoutDaArte, quebrarLinhas, textoDoCompartilhamento, linkPublicoDaEdicao, linkDaCasa, linkDoCombo, linkDaRota, ARTE, ZONA, MAX_CASAS_NA_ARTE,
} from '../src/edicao/caca/compartilhar/arte.js'
import { CACA_PWA, emPaginaDaCaca, trocarHead, registrarSw } from '../src/edicao/caca/pwa/manifesto.js'
import { situacaoInstalacao, momentoUtilParaInstalar, dispensadoAinda } from '../src/edicao/caca/pwa/instalacao.js'
import { EXTRAS, mensagemDoMotivoExtras } from '../src/edicao/caca/textos-extras.js'
import { IMG_CACA } from '../src/edicao/caca/imagens.js'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const MEUS = ['metas', 'notificacoes', 'pwa', 'compartilhar'].map((d) => `src/edicao/caca/${d}`)
const arquivosDe = (dir, ext = /\.(js|jsx)$/) => fs.readdirSync(path.join(raiz, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivosDe(path.join(dir, e.name), ext) : ext.test(e.name) ? [path.join(dir, e.name)] : []))

/* ---------------------------------------------------------------- metas */

const RESP = { total_casas: 27, casas_validadas: 7, metas: [
  { casas: 20, titulo: 'C' }, { casas: 5, titulo: 'A' }, { casas: 10, titulo: 'B' }, { casas: 99, titulo: '' }, { casas: 0, titulo: 'zero' },
] }

test('metas: ordena, descarta marco torto, recalcula alcançada/faltam do número de casas e acha a próxima', () => {
  const m = organizarMetas(RESP)
  assert.deepEqual(m.marcos.map((x) => x.casas), [5, 10, 20])
  assert.deepEqual(m.marcos.map((x) => x.alcancada), [true, false, false])
  assert.deepEqual(m.marcos.map((x) => x.faltam), [0, 3, 13])
  assert.equal(m.proxima.titulo, 'B')
  assert.equal(m.todasAlcancadas, false)
  assert.equal(organizarMetas({ ...RESP, casas_validadas: 30 }).todasAlcancadas, true)
})

test('metas: o marco "completa" do servidor (todas as casas) acompanha o total e a tela o lê como veio', () => {
  const resp = { total_casas: 26, casas_validadas: 26, metas: [
    { casas: 1, titulo: 'Primeiro carimbo', completa: false }, { casas: 9, titulo: 'Pegou o jeito' }, { casas: 26, titulo: 'Mapa completo', completa: true }] }
  const m = organizarMetas(resp)
  assert.deepEqual(m.marcos.map((x) => x.completa), [false, false, true])
  assert.equal(m.marcos[2].casas, 26); assert.equal(m.todasAlcancadas, true)
  assert.equal('emDefinicao' in m, false, 'o estado "em definição" saiu: não há mais marco de exemplo')
  // um rótulo antigo `exemplo: true` não esconde mais nada: o servidor deixou de mandá-lo
  assert.equal(organizarMetas({ total_casas: 27, casas_validadas: 12, metas: [{ casas: 5, titulo: 'A', exemplo: true }] }).marcos.length, 1)
})

test('metas: dado estranho vira lista vazia, nunca exceção', () => {
  for (const ruim of [null, undefined, {}, { metas: 'x' }, { metas: [null, 3, {}] }]) {
    const m = organizarMetas(ruim)
    assert.deepEqual(m.marcos, []); assert.equal(m.proxima, null); assert.equal(m.todasAlcancadas, false)
  }
})

test('medalhas: sempre 1..5, nunca decrescem, a última é a maior e nenhum número de marco está fixo no código', () => {
  for (let n = 1; n <= 12; n++) {
    const ms = Array.from({ length: n }, (_, i) => medalhaDoMarco(i, n))
    assert.ok(ms.every((x) => x >= 1 && x <= 5), `n=${n}: ${ms}`)
    assert.deepEqual([...ms].sort((a, b) => a - b), ms)
    if (n > 1) assert.equal(ms[n - 1], 5)
  }
  assert.equal(IMG_CACA.medalha(0), '/images/caca/medalha-1-v1.webp')
  assert.equal(IMG_CACA.medalha(99), '/images/caca/medalha-5-v1.webp')
  const fonte = semComentarios(ler('src/edicao/caca/metas/logica.js'))
  assert.doesNotMatch(fonte, /\b(5|10|20|27)\b/, 'marco de meta escrito no código')
})

test('metas: conquistas novas dependem do que já foi comemorado, e o armazenamento quebrado não derruba', () => {
  const marcos = organizarMetas(RESP).marcos
  assert.deepEqual(novasConquistas(marcos, 0).map((x) => x.casas), [5])
  assert.deepEqual(novasConquistas(marcos, 5), [])
  const loja = new Map()
  const arm = { getItem: (k) => loja.get(k) ?? null, setItem: (k, v) => loja.set(k, v) }
  assert.equal(lerVistas(arm), 0)
  gravarVistas(5, arm); assert.equal(lerVistas(arm), 5)
  const quebrado = { getItem () { throw new Error('x') }, setItem () { throw new Error('x') } }
  assert.equal(lerVistas(quebrado), 0); assert.doesNotThrow(() => gravarVistas(3, quebrado))
})

test('avisos: pendente primeiro, meta nova só se ainda não comemorada, vazio quando está tudo em dia', () => {
  const dados = { participantes: [{ slug: 'x', casa: { nome: 'Casa X' } }] }
  const mapa = { casas: [{ slug: 'x', estado: 'pendente' }, { slug: 'y', estado: 'pendente' }] }
  const metas = organizarMetas(RESP)
  const a = calcularAvisos({ mapa, metas, vistas: 0, dados })
  assert.deepEqual(a.map((x) => x.tipo), ['avaliacao', 'meta'])
  assert.equal(a[0].casa, 'Casa X'); assert.equal(a[0].mais, 1)
  assert.deepEqual(calcularAvisos({ mapa: { casas: [{ slug: 'x', estado: 'validada' }] }, metas, vistas: 5, dados }), [])
  assert.deepEqual(calcularAvisos({}), [])
})

/* ---------------------------------------------------------------- notificações */

test('push: preferências só com as quatro chaves booleanas; divulgação da edição vem desligada', () => {
  assert.deepEqual(PREFS_PADRAO, { avaliacao_pendente: true, meta: true, grupo: true, edicao: false })
  assert.deepEqual(normalizarPrefs({ edicao: true, meta: 'sim', outra: true }), { avaliacao_pendente: true, meta: true, grupo: true, edicao: true })
  assert.deepEqual(normalizarPrefs(null), PREFS_PADRAO)
})

test('push: estados do aparelho (não suportado, iPhone sem app, bloqueada, desligado, ligado)', () => {
  assert.equal(estadoDoPush({ suportado: false }), 'nao-suportado')
  assert.equal(estadoDoPush({ suportado: false, ios: true, instalado: false }), 'ios-instalar')
  assert.equal(estadoDoPush({ suportado: false, ios: true, instalado: true }), 'nao-suportado')
  assert.equal(estadoDoPush({ suportado: true, permissao: 'denied' }), 'bloqueada')
  assert.equal(estadoDoPush({ suportado: true, permissao: 'default', assinado: true }), 'desligado', 'assinatura sem permissão não vale')
  assert.equal(estadoDoPush({ suportado: true, permissao: 'granted', assinado: false }), 'desligado')
  assert.equal(estadoDoPush({ suportado: true, permissao: 'granted', assinado: true }), 'ligado')
})

test('push: classificação dos erros e frases dos motivos novos', () => {
  assert.deepEqual(classificarErroPush(new Error('bloqueado')), { tipo: 'bloqueada' })
  assert.deepEqual(classificarErroPush(new Error('sem_resposta')), { tipo: 'sem-resposta' })
  assert.deepEqual(classificarErroPush(Object.assign(new Error('x'), { motivo: 'limite_dispositivos' })), { tipo: 'motivo', motivo: 'limite_dispositivos' })
  assert.deepEqual(classificarErroPush(new Error('qualquer coisa')), { tipo: 'erro' })
  assert.match(mensagemDoMotivoExtras('limite_dispositivos'), /5 aparelhos/)
  assert.match(mensagemDoMotivoExtras('rede'), /conexão/i, 'motivo geral cai nos textos da Caça')
})

test('push: o front usa a chave pública do painel e nunca uma privada; não pede permissão fora de clique', () => {
  const ap = semComentarios(ler('src/edicao/caca/notificacoes/aparelho.js'))
  assert.match(ap, /painel-app\/src\/lib\/push\.js/)
  const todos = MEUS.flatMap((d) => arquivosDe(d)).map((f) => semComentarios(ler(f))).join('\n')
  assert.doesNotMatch(todos, /VAPID_PRIVATE|PRIVATE KEY|BEGIN PRIVATE/i)
  assert.doesNotMatch(todos, /Notification\.requestPermission/, 'a permissão só é pedida por ligarAvisos, que o painel já chama a partir de clique')
  const push = semComentarios(ler('src/edicao/caca/notificacoes/AvisosPush.jsx'))
  assert.match(push, /onClick=\{ativar\}/)
})

/* ---------------------------------------------------------------- compartilhar */

const PRIVADOS = { email: 'pessoa.secreta@exemplo.com', whatsapp: '+5584999990000', chave: 'AbCdEfGhIjKlMnOpQrStUvWxYz012345' }
const mapaCom = (n, extra = {}) => ({
  apelido: 'Beatriz', ...PRIVADOS, total_casas: 27, casas_validadas: n, no_ranking: true,
  casas: Array.from({ length: n }, (_, i) => ({ slug: `casa-${i}`, estado: 'validada', carimbos: 2 })).concat([{ slug: 'casa-pend', estado: 'pendente' }]),
  ...extra,
})
const dadosCom = (n) => ({ participantes: Array.from({ length: n }, (_, i) => ({ slug: `casa-${i}`, casa: { nome: `Casa Número ${i}` } })).concat([{ slug: 'casa-pend', casa: { nome: 'Pendente' } }]) })
const medirFalso = (t, tam) => String(t).length * tam * 0.55

test('arte: lista branca — nenhum dado privado entra nos dados, no layout nem no texto', () => {
  const d = dadosDaArte({ mapa: mapaCom(3), dados: dadosCom(3), origem: 'https://exemplo.test' })
  const tudo = JSON.stringify(d) + JSON.stringify(layoutDaArte(d, medirFalso)) + textoDoCompartilhamento(d)
  for (const segredo of Object.values(PRIVADOS)) assert.ok(!tudo.includes(segredo), `vazou ${segredo}`)
  assert.doesNotMatch(tudo, /mapa=|recuperar|convite|token/i)
  assert.deepEqual(Object.keys(d).sort(), ['apelido', 'casas', 'excedente', 'link', 'total', 'validadas'])
  assert.equal(d.validadas, 3); assert.equal(d.casas.length, 3)
  assert.ok(!d.casas.includes('Pendente'), 'casa pendente não é "validada"')
  assert.equal(d.link, 'https://exemplo.test/cartoon')
})

test('arte: muitas casas viram "+N" e apelido enorme é cortado', () => {
  const d = dadosDaArte({ mapa: mapaCom(20, { apelido: 'x'.repeat(80) }), dados: dadosCom(20), origem: 'https://exemplo.test/' })
  assert.equal(d.casas.length, MAX_CASAS_NA_ARTE); assert.equal(d.excedente, 12); assert.equal(d.apelido.length, 24)
  const sem = dadosDaArte({ mapa: { casas_validadas: 0, total_casas: 5 }, dados: null, origem: '' })
  assert.equal(sem.apelido, 'Sweet Lover'); assert.deepEqual(sem.casas, [])
  assert.match(textoDoCompartilhamento(sem), /Vem jogar/)
})

test('arte: todo texto e o cartão ficam na zona segura do fundo (12–88% x 20–80%), sem sobrepor o convite', () => {
  for (const n of [1, 3, 8, 20, 27]) {
    for (const apelido of ['Bia', 'Maria Eduarda dos Santos Pereira']) {
      const d = dadosDaArte({ mapa: mapaCom(n, { apelido }), dados: dadosCom(n), origem: 'https://www.sweetcoffeeweek.com.br' })
      const L = layoutDaArte(d, medirFalso)
      assert.equal(L.largura, ARTE.largura); assert.equal(L.altura, ARTE.altura)
      const x0 = ARTE.largura * ZONA.x0; const x1 = ARTE.largura * ZONA.x1; const y0 = ARTE.altura * ZONA.y0; const y1 = ARTE.altura * ZONA.y1
      for (const op of L.ops) {
        if (op.tipo === 'texto') {
          assert.ok(op.x - op.largura / 2 >= x0 && op.x + op.largura / 2 <= x1, `texto fora da zona: ${op.texto} (${n}, ${apelido})`)
          assert.ok(op.y - op.tamanho >= y0 && op.y <= y1, `texto fora da zona vertical: ${op.texto}`)
        } else {
          assert.ok(op.x >= x0 - 1 && op.x + op.w <= x1 + 1 && op.y >= y0 - 1 && (op.y + (op.h || 0)) <= y1 + 1, `${op.tipo} fora da zona`)
        }
      }
      const textos = L.ops.filter((o) => o.tipo === 'texto')
      const convite = textos.find((o) => o.texto === EXTRAS.compartilhar.arteConvite)
      const ultimoCorpo = Math.max(...textos.filter((o) => o !== convite && o.cor !== 'vermelho').map((o) => o.y))
      assert.ok(ultimoCorpo < convite.y - convite.tamanho, `corpo encosta no convite (n=${n})`)
    }
  }
})

test('arte: quebra de linhas respeita a largura e não perde palavras', () => {
  const linhas = quebrarLinhas('aaa bbb ccc ddd eee', 8 * 0.55 * 10, (t) => t.length * 5.5)
  assert.equal(linhas.join(' '), 'aaa bbb ccc ddd eee')
  assert.ok(linhas.every((l) => l.length * 5.5 <= 44 || !l.includes(' ')))
  assert.deepEqual(quebrarLinhas('', 100, () => 0), [])
})

test('links públicos: só a página da edição, a casa, o combo e a rota (ids de unidade); nada de chave ou convite', () => {
  const o = 'https://exemplo.test'
  assert.equal(linkPublicoDaEdicao(`${o}/`), `${o}/cartoon`)
  assert.equal(linkDaCasa(o, 'casa-x'), `${o}/cartoon/participantes/casa-x`)
  assert.equal(linkDoCombo(o, 'casa-x'), `${o}/cartoon/combos/casa-x`)
  assert.equal(linkDaRota(o, ['uabcdef', 'uabcdef', 'udemo2', 'lixo', PRIVADOS.chave]), `${o}/cartoon/mapa?u=uabcdef,udemo2`)
  assert.equal(linkDaRota(o, []), null); assert.equal(linkDaRota(o, ['lixo']), null)
})

test('compartilhar: os arquivos não tocam em chave pessoal, link de recuperação, console nem diálogo nativo', () => {
  for (const f of arquivosDe('src/edicao/caca/compartilhar')) {
    const fonte = semComentarios(ler(f))
    assert.doesNotMatch(fonte, /\bchave\b|linkDoMapa|recuperar|\bemail\b|whatsapp/i, f)
  }
  for (const f of MEUS.flatMap((d) => arquivosDe(d)).concat(['src/edicao/caca/secoes/Metas.jsx', 'src/edicao/caca/secoes/Compartilhar.jsx', 'src/edicao/caca/secoes/Notificacoes.jsx', 'src/edicao/caca/secoes/Instalar.jsx'])) {
    const fonte = semComentarios(ler(f))
    assert.doesNotMatch(fonte, /console\.|window\.(confirm|prompt|alert)|\balert\(|\bconfirm\(|!important/, f)
    assert.ok(!(f.endsWith('.jsx') && /['"`]#[0-9a-fA-F]{3,8}['"`]/.test(fonte)), `${f}: hex solto em componente`)
  }
})

/* ---------------------------------------------------------------- app instalável */

test('manifest da Caça: válido, disjunto do painel e com ícones que existem', () => {
  const m = JSON.parse(ler('public/caca/manifest.webmanifest'))
  const painel = JSON.parse(ler('public/painel/app.webmanifest'))
  assert.equal(m.id, '/cartoon/caca'); assert.equal(m.scope, CACA_PWA.escopo)
  assert.equal(m.start_url, CACA_PWA.inicio); assert.match(m.start_url, /^\/cartoon\/caca\?origem=app$/)
  assert.ok(m.start_url.startsWith(m.scope), 'start_url dentro do escopo')
  assert.equal(m.display, 'standalone'); assert.equal(m.lang, 'pt-BR')
  assert.ok(m.name && m.short_name && m.short_name.length <= 20)
  assert.match(m.theme_color, /^#[0-9A-Fa-f]{6}$/); assert.match(m.background_color, /^#[0-9A-Fa-f]{6}$/)
  const disjuntos = (a, b) => !a.startsWith(b) && !b.startsWith(a)
  assert.ok(disjuntos(m.scope, painel.scope), 'escopos se cruzam')
  assert.notEqual(m.id, painel.id)
  assert.ok(disjuntos(m.start_url.split('?')[0], painel.start_url))
  const propositos = m.icons.map((i) => i.purpose)
  assert.ok(propositos.includes('any') && propositos.includes('maskable'))
  assert.ok(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512'))
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(raiz, 'public', i.src)), `ícone ausente: ${i.src}`)
  assert.equal(CACA_PWA.manifesto, '/caca/manifest.webmanifest')
  assert.ok(fs.existsSync(path.join(raiz, 'public', CACA_PWA.manifesto)))
  assert.ok(fs.existsSync(path.join(raiz, 'public', CACA_PWA.sw)))
  assert.ok(fs.existsSync(path.join(raiz, 'public', IMG_CACA.iconeApple180)))
})

test('o manifest global do site é o da Caça (iPhone não relê o manifest trocado depois do carregamento)', () => {
  assert.deepEqual(JSON.parse(ler('public/manifest.webmanifest')), JSON.parse(ler('public/caca/manifest.webmanifest')),
    'public/manifest.webmanifest deve ser cópia exata de public/caca/manifest.webmanifest')
})

test('o manifest do painel e o link global do index.html continuam como estavam', () => {
  const painel = JSON.parse(ler('public/painel/app.webmanifest'))
  assert.equal(painel.scope, '/painel/')
  assert.match(ler('painel-app/index.html'), /<link\s+rel="manifest"\s+href="\/painel\/app\.webmanifest"/)
  assert.match(ler('index.html'), /<link rel="manifest" href="\/manifest\.webmanifest" \/>/)
})

test('escopo: só páginas /cartoon/caca* ganham o manifest', () => {
  assert.ok(emPaginaDaCaca('/cartoon/caca')); assert.ok(emPaginaDaCaca('/cartoon/caca/metas'))
  assert.ok(!emPaginaDaCaca('/cartoon/cacaxyz')); assert.ok(!emPaginaDaCaca('/cartoon')); assert.ok(!emPaginaDaCaca('/painel/'))
})

/** DOM mínimo: só o que trocarHead usa. */
function docFalso (iniciais) {
  const els = iniciais.map(([sel, attrs]) => ({ sel, attrs: { ...attrs }, removido: false }))
  const mk = (e) => ({ getAttribute: (k) => (k in e.attrs ? e.attrs[k] : null), setAttribute: (k, v) => { e.attrs[k] = v }, removeAttribute: (k) => { delete e.attrs[k] }, remove: () => { e.removido = true }, _e: e })
  return {
    els,
    querySelector: (sel) => { const e = els.find((x) => x.sel === sel && !x.removido); return e ? mk(e) : null },
    createElement: (tag) => { const e = { sel: `#novo-${tag}`, attrs: {}, removido: false, tag }; els.push(e); e.sel = null; return mk(e) },
    head: { appendChild: (el) => { el._e.sel = el._e.attrs.rel ? `link[rel="${el._e.attrs.rel}"]` : `meta[name="${el._e.attrs.name}"]` } },
  }
}

test('trocarHead: aplica e restaura o manifest, o ícone e o título do app; cria o que faltar e remove ao sair', () => {
  const doc = docFalso([
    ['link[rel="manifest"]', { href: '/manifest.webmanifest' }],
    ['link[rel="apple-touch-icon"]', { href: '/favicon-180.png' }],
  ])
  const desfazer = trocarHead(doc)
  assert.equal(doc.querySelector('link[rel="manifest"]').getAttribute('href'), CACA_PWA.manifesto)
  assert.equal(doc.querySelector('link[rel="apple-touch-icon"]').getAttribute('href'), IMG_CACA.iconeApple180)
  assert.equal(doc.querySelector('meta[name="apple-mobile-web-app-title"]').getAttribute('content'), CACA_PWA.titulo)
  desfazer()
  assert.equal(doc.querySelector('link[rel="manifest"]').getAttribute('href'), '/manifest.webmanifest')
  assert.equal(doc.querySelector('link[rel="apple-touch-icon"]').getAttribute('href'), '/favicon-180.png')
  assert.equal(doc.querySelector('meta[name="apple-mobile-web-app-title"]'), null, 'o que foi criado sai junto')
  assert.doesNotThrow(() => trocarHead(null)())
})

test('registro do SW: escopo /cartoon/caca; sem suporte ou com erro não derruba', async () => {
  let chamado
  const nav = { serviceWorker: { register: (url, opc) => { chamado = [url, opc]; return Promise.resolve({}) } } }
  await registrarSw(nav)
  assert.deepEqual(chamado, ['/caca-sw.js', { scope: '/cartoon/caca' }])
  assert.equal(await registrarSw({}), null)
  assert.equal(await registrarSw({ serviceWorker: { register: () => Promise.reject(new Error('x')) } }), null)
})

test('instalação: situação, momento útil e "agora não" por alguns dias', () => {
  assert.equal(situacaoInstalacao({ jaInstalado: true, temEvento: true }), 'instalado')
  assert.equal(situacaoInstalacao({ temEvento: true, ios: true }), 'botao')
  assert.equal(situacaoInstalacao({ ios: true }), 'ios')
  assert.equal(situacaoInstalacao({}), 'manual')
  assert.equal(momentoUtilParaInstalar(null), false); assert.equal(momentoUtilParaInstalar({ casas: [] }), false)
  assert.equal(momentoUtilParaInstalar({ casas: [{ slug: 'a' }] }), true)
  const agora = Date.now()
  assert.equal(dispensadoAinda(String(agora - 86400000), agora), true)
  assert.equal(dispensadoAinda(String(agora - 8 * 86400000), agora), false)
  assert.equal(dispensadoAinda(null, agora), false); assert.equal(dispensadoAinda('lixo', agora), false)
})

/** Roda public/caca-sw.js num contexto isolado com um `self` falso e devolve os ouvintes + o que foi mostrado/aberto. */
function rodarSw () {
  const ouvintes = {}
  const mostradas = []; const abertas = []; let claimed = false
  const self = {
    addEventListener: (tipo, fn) => { ouvintes[tipo] = fn },
    registration: { showNotification: (t, o) => { mostradas.push([t, o]); return Promise.resolve() } },
    clients: { claim: () => { claimed = true; return Promise.resolve() }, matchAll: () => Promise.resolve([]), openWindow: (u) => { abertas.push(u); return Promise.resolve() } },
    skipWaiting () {},
  }
  vm.runInNewContext(ler('public/caca-sw.js'), { self, URL, Promise })
  const esperar = async (tipo, ev) => { let p; ouvintes[tipo]({ ...ev, waitUntil: (x) => { p = x } }); await p }
  return { ouvintes, mostradas, abertas, esperar, claimed: () => claimed }
}

test('SW da Caça: mostra push do tipo caca, só aceita caminho interno da Caça e abre a central ao tocar', async () => {
  const sw = rodarSw()
  assert.ok(sw.ouvintes.push && sw.ouvintes.notificationclick && sw.ouvintes.fetch && sw.ouvintes.install && sw.ouvintes.activate)
  const dado = (o) => ({ data: { json: () => o } })
  await sw.esperar('push', dado({ titulo: 'Falta avaliar', corpo: 'Avalie o combo', url: '/cartoon/caca/metas', tag: 'scw-caca-meta', tipo: 'caca' }))
  await sw.esperar('push', dado({ titulo: 'x'.repeat(200), corpo: 'y'.repeat(400), url: '//evil.test/x' }))
  await sw.esperar('push', dado({ url: '/painel/' }))
  await sw.esperar('push', { data: { json: () => { throw new Error('json ruim') } } })
  const [primeira, longa, painel, ruim] = sw.mostradas
  assert.equal(primeira[0], 'Falta avaliar'); assert.equal(primeira[1].data.url, '/cartoon/caca/metas'); assert.equal(primeira[1].tag, 'scw-caca-meta')
  assert.equal(longa[0].length, 80); assert.equal(longa[1].body.length, 240); assert.equal(longa[1].data.url, '/cartoon/caca', 'URL externa vira a central')
  assert.equal(painel[1].data.url, '/cartoon/caca', 'o painel nunca é destino')
  assert.equal(ruim[0], 'Caça aos Carimbos', 'carga ilegível ainda mostra algo (push exige notificação visível)')
  let fechou = false
  await sw.esperar('notificationclick', { notification: { data: { url: '/cartoon/caca/metas' }, close: () => { fechou = true } } })
  assert.ok(fechou); assert.deepEqual(sw.abertas, ['/cartoon/caca/metas'])
  await sw.esperar('activate', {}); assert.ok(sw.claimed())
})

test('SW da Caça: não guarda cache, não toca no painel e não conhece o banco', () => {
  const fonte = semComentarios(ler('public/caca-sw.js'))
  assert.doesNotMatch(fonte, /\bcaches\b|cache\.|supabase|service_role|localStorage|fetch\(/i)
  assert.doesNotMatch(fonte, /\/painel|\/organizacao|\/marca\b/)
  assert.match(fonte, /ESCOPO = '\/cartoon\/caca'/)
  const painelSw = ler('public/painel/sw.js')
  assert.match(painelSw, /\/painel\//)
  assert.doesNotMatch(painelSw, /cartoon\/caca/, 'o service worker do painel não sabe da Caça')
})

test('vercel.json: cabeçalhos do SW da Caça e nada do painel alterado', () => {
  const v = JSON.parse(ler('vercel.json'))
  const h = v.headers.find((x) => x.source === '/caca-sw.js')
  assert.ok(h, 'falta cabeçalho de /caca-sw.js')
  const por = Object.fromEntries(h.headers.map((x) => [x.key, x.value]))
  assert.match(por['Cache-Control'], /no-store/); assert.equal(por['Service-Worker-Allowed'], '/cartoon/caca')
  assert.ok(v.headers.some((x) => x.source === '/painel/sw.js' && x.headers.some((y) => /no-store/.test(y.value))))
  assert.ok(!v.rewrites.some((r) => /caca-sw|\/caca\//.test(r.source)), 'rewrite não pode engolir o SW nem o manifest da Caça')
})

test('textos extras: sem voto/votação, sem "Sweet" sozinho, sem prêmio por meta e a surpresa continua surpresa', () => {
  const todos = JSON.stringify(EXTRAS, (_, v) => (typeof v === 'function' ? v(3, 'Título', 'x') : v))
  assert.doesNotMatch(todos, /\bvot(o|os|a|ar|ação|ações)\b/i)
  assert.doesNotMatch(todos, /\bSweet\b(?!\s*(&|Lovers?|Awards|Gift))/)
  assert.match(EXTRAS.metas.nota, /uma surpresa/)
  assert.doesNotMatch(todos, /ganha(r)? um|prêmio por meta|troféu/i)
  assert.match(EXTRAS.push.honestidade, /podem atrasar ou não chegar/)
})
