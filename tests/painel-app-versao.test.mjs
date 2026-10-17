/*
 * Atualização do painel (18/10/2026): identidade de versão, monitor, fluxo
 * seguro de "Atualizar agora", trabalho pendente e convite do aparelho.
 * Roda a TRANSIÇÃO com dependências falsas (fetch, service worker, storage),
 * não só confere texto. O teste com navegador de verdade (dois builds, SW
 * real) é o roteiro tests/painel-atualizacao-navegador.mjs.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  versaoDaPagina, validarVersao, lerVersaoPublicada, criarMonitor, atualizarAgora,
  resultadoDaAtualizacao, ativarWorkerNovo, recursosDoHtml, idDoHtml, CHAVE_TENTATIVA, MAX_TENTATIVAS,
} from '../painel-app/src/lib/versao.js'
import { registrarPendencia, pendencias, comEnvio } from '../painel-app/src/lib/pendencias.js'
import { etapaDoConvite, conviteAdiado, adiarConvite, plataforma, ADIAMENTO } from '../painel-app/src/lib/instalar.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const A = 'aaaaaaaaaaaaaaaa', B = 'bbbbbbbbbbbbbbbb'
const memoria = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m } }
const resp = (corpo, { status = 200, tipo = 'application/json' } = {}) => ({
  ok: status >= 200 && status < 300, status, headers: { get: (h) => (h.toLowerCase() === 'content-type' ? tipo : null) },
  json: async () => (typeof corpo === 'string' ? JSON.parse(corpo) : corpo), text: async () => (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)),
})
const manifesto = (id, extra = {}) => ({ app: 'painel-scw', id, ambiente: 'production', publicado_em: '2026-10-18T12:00:00Z', ...extra })
const htmlDe = (id, js = '/assets/painel-' + id.slice(0, 6) + '.js', css = '/assets/painel-' + id.slice(0, 6) + '.css') =>
  `<html><head><script type="module" crossorigin src="${js}"></script><link rel="stylesheet" crossorigin href="${css}">\n  <meta name="scw-versao" content="${id}" data-ambiente="production" />\n  </head></html>`

/** Servidor de mentira: publica a versão `id` com seus arquivos. */
function servidor(id, { faltando = [], htmlId = id, versaoStatus = 200 } = {}) {
  const pedidos = []
  const f = async (url) => {
    pedidos.push(url)
    if (url.startsWith('/painel/versao.json')) return versaoStatus === 200 ? resp(manifesto(id)) : resp('<html>erro</html>', { status: versaoStatus, tipo: 'text/html' })
    if (url.startsWith('/painel/?v=')) return resp(htmlDe(htmlId), { tipo: 'text/html' })
    if (url.startsWith('/assets/')) return resp('', { status: faltando.some((x) => url.includes(x)) ? 404 : 200, tipo: 'text/javascript' })
    return resp('', { status: 404 })
  }
  return { f, pedidos }
}

test('identidade: a página lê a meta do build; o arquivo de versão só vale se for do painel', () => {
  const doc = { querySelector: () => ({ getAttribute: (k) => (k === 'content' ? A : 'production') }) }
  assert.deepEqual(versaoDaPagina(doc), { id: A, ambiente: 'production' })
  assert.equal(versaoDaPagina({ querySelector: () => null }), null, 'servidor de desenvolvimento: sem meta, nada a comparar')
  assert.equal(validarVersao({ app: 'outro', id: A }), null)
  assert.equal(validarVersao({ app: 'painel-scw', id: '<html>' }), null)
  assert.equal(validarVersao(manifesto(A)).id, A)
  assert.equal(idDoHtml(htmlDe(B)), B)
  assert.deepEqual(recursosDoHtml(htmlDe(B)).length, 2)
})

test('consulta: da rede, sem cache; HTML inesperado, 404 e rede caída são recusados', async () => {
  let opcoes = null
  const v = await lerVersaoPublicada(async (u, o) => { opcoes = o; assert.match(u, /^\/painel\/versao\.json\?t=\d+$/); return resp(manifesto(B)) })
  assert.equal(v.id, B)
  assert.equal(opcoes.cache, 'no-store')
  await assert.rejects(lerVersaoPublicada(async () => resp('<!doctype html>', { tipo: 'text/html' })), /invalida/)
  await assert.rejects(lerVersaoPublicada(async () => resp('x', { status: 404, tipo: 'text/html' })), /indisponivel/)
  await assert.rejects(lerVersaoPublicada(async () => { throw new TypeError('Failed to fetch') }), /rede/)
})

test('monitor: mesma versão (1ª instalação) não avisa; outra avisa; produção não mistura com preview', async () => {
  const igual = criarMonitor({ atual: A, ambiente: 'production', ler: async () => validarVersao(manifesto(A)), local: memoria(), sessao: memoria() })
  await igual.verificar({ forcar: true })
  assert.equal(igual.estado.disponivel, null)
  const outra = criarMonitor({ atual: A, ambiente: 'production', ler: async () => validarVersao(manifesto(B)), local: memoria(), sessao: memoria() })
  await outra.verificar({ forcar: true })
  assert.equal(outra.estado.disponivel.id, B)
  const preview = criarMonitor({ atual: A, ambiente: 'production', ler: async () => validarVersao(manifesto(B, { ambiente: 'preview' })), local: memoria(), sessao: memoria() })
  await preview.verificar({ forcar: true })
  assert.equal(preview.estado.disponivel, null)
  // Rollback: versão "anterior" também é outra versão (igualdade, não ordem).
  const volta = criarMonitor({ atual: B, ler: async () => validarVersao(manifesto(A)), local: memoria(), sessao: memoria() })
  await volta.verificar({ forcar: true })
  assert.equal(volta.estado.disponivel.id, A)
})

test('monitor: uma consulta por vez, e no máximo uma por minuto entre as abas', async () => {
  let n = 0
  const local = memoria()
  let agora = 1000
  const ler = async () => { n++; await new Promise((x) => setTimeout(x, 5)); return validarVersao(manifesto(B)) }
  const m1 = criarMonitor({ atual: A, ler, local, sessao: memoria(), agora: () => agora })
  await Promise.all([m1.verificar(), m1.verificar(), m1.verificar()])
  assert.equal(n, 1, 'três gatilhos ao mesmo tempo = um pedido')
  const m2 = criarMonitor({ atual: A, ler, local, sessao: memoria(), agora: () => agora }) // outra aba, mesmo localStorage
  await m2.verificar()
  assert.equal(n, 1, 'a outra aba reaproveita a consulta recente')
  assert.equal(m2.estado.disponivel.id, B)
  agora += 61000
  await m2.verificar()
  assert.equal(n, 2)
  await m2.verificar({ forcar: true })
  assert.equal(n, 3, '"Verificar atualização" força')
})

test('monitor: "Depois" recolhe sem perder a indicação; offline não consulta', async () => {
  const sessao = memoria()
  const m = criarMonitor({ atual: A, ler: async () => validarVersao(manifesto(B)), local: memoria(), sessao })
  await m.verificar({ forcar: true })
  m.adiar()
  assert.equal(m.estado.adiada, true)
  assert.equal(m.estado.disponivel.id, B, 'continua disponível (ponto no perfil)')
  const m2 = criarMonitor({ atual: A, ler: async () => validarVersao(manifesto(B)), local: memoria(), sessao })
  await m2.verificar({ forcar: true })
  assert.equal(m2.estado.adiada, true, 'adiada vale na aba até ela fechar')
  let n = 0
  const off = criarMonitor({ atual: A, ler: async () => { n++; return null }, online: () => false, local: memoria(), sessao: memoria() })
  await off.verificar({ forcar: true })
  assert.equal(n, 0)
  assert.equal(off.estado.erro, 'offline')
})

test('monitor: o resultado vai às outras abas pelo canal', async () => {
  const msgs = []
  const canalA = { postMessage: (d) => msgs.push(d) }
  const canalB = {}
  const a = criarMonitor({ atual: A, ler: async () => validarVersao(manifesto(B)), local: memoria(), sessao: memoria(), canal: canalA })
  const b = criarMonitor({ atual: A, ler: async () => null, local: memoria(), sessao: memoria(), canal: canalB })
  await a.verificar({ forcar: true })
  canalB.onmessage({ data: msgs[0] })
  assert.equal(b.estado.disponivel.id, B)
})

function preparar({ atual = A, pub = B, pend = [], online = true, srv = servidor(pub), sessao = memoria(), sw = null } = {}) {
  const m = criarMonitor({ atual, ler: async () => validarVersao(manifesto(pub)), local: memoria(), sessao: memoria() })
  const recargas = []
  const rodar = (extra = {}) => atualizarAgora({ monitor: m, pendencias: () => pend, online: () => online, f: srv.f, sw, sessao, recarregar: (id) => recargas.push(id), ...extra })
  return { m, recargas, rodar, sessao, srv }
}

test('Atualizar agora: confere conexão e trabalho pendente ANTES de qualquer coisa', async () => {
  assert.equal((await preparar({ online: false }).rodar()).fase, 'offline')
  const p = preparar({ pend: [{ rotulo: 'Legenda', tipo: 'edicao', salvar: async () => true }] })
  const r = await p.rodar()
  assert.equal(r.fase, 'pendente')
  assert.equal(r.itens[0].rotulo, 'Legenda')
  assert.equal(p.recargas.length, 0)
  assert.equal(p.srv.pedidos.length, 0, 'nem consultou o servidor')
  // Envio em andamento nunca é interrompido, nem com "atualizar sem salvar".
  const e = preparar({ pend: [{ rotulo: 'Envio de foto.png', tipo: 'envio' }] })
  assert.equal((await e.rodar({ ignorarPendencias: true })).fase, 'pendente')
  assert.equal(e.recargas.length, 0)
  // Edição: só com escolha explícita.
  const d = preparar({ pend: [{ rotulo: 'Legenda', tipo: 'edicao' }] })
  assert.equal((await d.rodar({ ignorarPendencias: true })).fase, 'recarregando')
})

test('Atualizar agora: versão indisponível, incompleta ou de outro deploy não recarrega', async () => {
  const sumiu = preparar({ srv: servidor(B, { versaoStatus: 404 }) })
  assert.equal((await sumiu.rodar()).fase, 'indisponivel')
  const falta = preparar({ srv: servidor(B, { faltando: ['.css'] }) })
  assert.equal((await falta.rodar()).fase, 'incompleta', 'CSS novo ainda não está no servidor')
  const outroDeploy = preparar({ srv: servidor(B, { htmlId: 'cccccccccccccccc' }) })
  assert.equal((await outroDeploy.rodar()).fase, 'incompleta', 'HTML e versão de publicações diferentes')
  for (const x of [sumiu, falta, outroDeploy]) assert.equal(x.recargas.length, 0)
  const igual = preparar({ pub: A })
  assert.equal((await igual.rodar()).fase, 'ja_atual')
})

test('Atualizar agora: recarrega UMA vez; confere a versão ao abrir; sem laço', async () => {
  const p = preparar()
  assert.equal((await p.rodar()).fase, 'recarregando')
  assert.deepEqual(p.recargas, [null], 'primeira vez: recarga simples')
  // Abriu a versão B: deu certo, e o registro some.
  assert.deepEqual(resultadoDaAtualizacao(B, p.sessao), { ok: true, id: B })
  assert.equal(p.sessao.getItem(CHAVE_TENTATIVA), null)
  // Abriu de novo a A (cache teimoso): avisa, e a 2ª tentativa vai por endereço novo.
  const q = preparar()
  await q.rodar()
  const r1 = resultadoDaAtualizacao(A, q.sessao)
  assert.equal(r1.ok, false)
  assert.equal(r1.podeTentar, true)
  await q.rodar()
  assert.deepEqual(q.recargas, [null, B], '2ª tentativa força o endereço')
  assert.equal(resultadoDaAtualizacao(A, q.sessao).podeTentar, MAX_TENTATIVAS > 2)
  assert.equal((await q.rodar()).fase, 'esgotou', 'não tenta para sempre')
  assert.equal(q.recargas.length, 2)
})

/* Service worker de mentira (Registration + Container). */
function swFalso({ waiting = false, installing = null, ativaAoPedir = true } = {}) {
  const ouvintes = {}
  const mensagens = []
  const reg = {
    installing, waiting: waiting ? { postMessage: (d) => { mensagens.push(d); if (ativaAoPedir) setTimeout(() => (ouvintes.controllerchange || []).forEach((f) => f()), 5) } } : null,
    update: async () => {},
  }
  return {
    mensagens, reg,
    getRegistration: async () => reg,
    addEventListener: (ev, f) => { (ouvintes[ev] = ouvintes[ev] || []).push(f) },
  }
}

test('worker: em espera é ativado por mensagem e o fluxo espera a troca; sem worker novo, segue', async () => {
  const comEspera = swFalso({ waiting: true })
  assert.equal(await ativarWorkerNovo(comEspera), 'ativado')
  assert.deepEqual(comEspera.mensagens, [{ tipo: 'ativar' }])
  assert.equal(await ativarWorkerNovo(swFalso()), 'sem_worker_novo', 'mudança só do app: não depende de worker')
  assert.equal(await ativarWorkerNovo(null), 'sem_sw')
  const preso = swFalso({ waiting: true, ativaAoPedir: false })
  await assert.rejects(ativarWorkerNovo(preso, { prazo: 30 }), /incompleta/)
  const instalando = { state: 'installing', addEventListener: () => {} }
  await assert.rejects(ativarWorkerNovo(swFalso({ installing: instalando }), { prazo: 30 }), /incompleta/, 'instalação que não termina')
  // No fluxo inteiro: worker preso = nada recarrega.
  const p = preparar({ sw: swFalso({ waiting: true, ativaAoPedir: false }) })
  const r = await atualizarAgora({ monitor: p.m, pendencias: () => [], f: p.srv.f, sw: { getRegistration: async () => ({ installing: null, waiting: { postMessage() {} }, update: async () => {} }), addEventListener() {} }, sessao: p.sessao, recarregar: (x) => p.recargas.push(x) })
  assert.equal(r.fase, 'incompleta')
  assert.equal(p.recargas.length, 0)
})

test('pendências: declaradas, perguntadas na hora e envio sai quando termina (inclusive com erro)', async () => {
  const tirar = registrarPendencia('a', { rotulo: 'Legenda', tipo: 'edicao' })
  let sujo = true
  const tirar2 = registrarPendencia('b', { rotulo: 'Cadastro', ativo: () => sujo })
  assert.deepEqual(pendencias().map((x) => x.rotulo), ['Legenda', 'Cadastro'])
  sujo = false
  assert.deepEqual(pendencias().map((x) => x.rotulo), ['Legenda'])
  tirar(); tirar2()
  let durante = null
  await comEnvio('Envio de x.png', async () => { durante = pendencias().map((x) => x.tipo) })
  assert.deepEqual(durante, ['envio'])
  await assert.rejects(comEnvio('Envio de y.png', async () => { throw new Error('rede') }))
  assert.equal(pendencias().length, 0)
})

test('convite: etapa certa para cada aparelho; adiamento é por conta e vence em 7 dias', () => {
  const av = (registrado, suportado = true) => ({ suportado, registrado })
  assert.equal(etapaDoConvite({ standalone: false, instalacao: 'pronto', movel: false, avisos: av(false) }), 'instalar', 'navegador oferece: instalar')
  assert.equal(etapaDoConvite({ standalone: false, instalacao: 'ios', movel: true, avisos: { suportado: false } }), 'instalar', 'iPhone no Safari: instruções')
  assert.equal(etapaDoConvite({ standalone: false, instalacao: 'manual', movel: false, avisos: av(false) }), 'notificacoes', 'computador sem oferta: pula para notificações')
  assert.equal(etapaDoConvite({ standalone: false, instalacao: 'manual', movel: false, avisos: av(true) }), null)
  assert.equal(etapaDoConvite({ standalone: true, instalacao: 'instalado', movel: true, avisos: av(false) }), 'notificacoes', 'aberto pelo ícone: só notificações')
  assert.equal(etapaDoConvite({ standalone: true, instalacao: 'instalado', movel: true, avisos: av(true) }), null, 'tudo pronto: nada')
  assert.equal(etapaDoConvite({ standalone: true, instalacao: 'instalado', movel: true, avisos: { suportado: false } }), null)
  const guardado = new Map()
  globalThis.localStorage = { getItem: (k) => guardado.get(k) ?? null, setItem: (k, v) => guardado.set(k, v) }
  try {
    adiarConvite('organizacao', 'pessoa-1', 1000)
    assert.equal(conviteAdiado('organizacao', 'pessoa-1', 1000 + ADIAMENTO - 1), true)
    assert.equal(conviteAdiado('organizacao', 'pessoa-2', 1000), false, 'outra conta no mesmo aparelho continua vendo')
    assert.equal(conviteAdiado('organizacao', 'pessoa-1', 1000 + ADIAMENTO + 1), false, 'depois de 7 dias volta')
    assert.ok(![...guardado.values()].some((v) => /senha|token/i.test(v)), 'só a data')
  } finally { delete globalThis.localStorage }
  assert.equal(plataforma('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1', 5).safari, true)
  assert.equal(plataforma('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130 Mobile/15E148 Safari/604.1', 5).safari, false, 'Chrome no iPhone: abrir no Safari')
  assert.equal(plataforma('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36', 5).android, true)
})

test('service worker: espera sem skipWaiting na instalação, ativa por mensagem, limpa só o que é do painel', () => {
  const sw = ler('public/painel/sw.js')
  const instalar = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('message'"))
  assert.doesNotMatch(instalar.replace(/\/\*[\s\S]*?\*\//g, ''), /skipWaiting/, 'install sem skipWaiting')
  assert.match(sw, /e\.data\.tipo === 'ativar'\) self\.skipWaiting\(\)/)
  assert.match(sw, /k\.indexOf\(PREFIXO\) === 0 && k !== CASCA_NOME && k !== ASSETS_NOME/, 'limpeza só com o prefixo do painel')
  assert.doesNotMatch(sw, /localStorage|unregister\(/)
  assert.match(sw, /url\.pathname === '\/painel\/versao\.json'\) return/, 'versão sempre da rede')
  assert.match(sw, /versao \? \{ tipo: 'verificar-versao' \}/, 'push de versão só pede verificação, nunca recarga')
  for (const [p, pre] of [['public/organizacao/sw.js', 'scw-org-'], ['public/marca/sw.js', 'scw-marca-']]) {
    assert.match(ler(p), new RegExp("k\\.indexOf\\('" + pre + "'\\) === 0 && k !== VERSAO"), p + ': só o próprio cache')
  }
})

test('publicação: versão e HTML sem cache; assets com hash imutáveis; escopo do app intacto', () => {
  const v = JSON.parse(ler('vercel.json'))
  const h = (src) => ((v.headers.find((x) => x.source === src) || {}).headers || []).map((x) => x.key + ': ' + x.value).join('; ')
  assert.match(h('/painel/versao.json'), /no-store/)
  assert.match(h('/painel/'), /no-cache/)
  assert.match(h('/painel/sw.js'), /no-store/)
  assert.match(h('/assets/(.*)'), /immutable/)
  const man = JSON.parse(ler('public/painel/app.webmanifest'))
  assert.equal(man.scope, '/painel/')
  assert.equal(man.start_url.startsWith('/painel/'), true)
})

test('banco: o aviso por push vem do servidor, só com a versão de produção no ar', () => {
  const sql = ler('supabase/migrations/20261020_painel_versao.sql')
  assert.match(sql, /https:\/\/www\.sweetcoffeeweek\.com\.br\/painel\/versao\.json/)
  assert.match(sql, /d->>'ambiente' is distinct from 'production'/)
  assert.match(sql, /on conflict \(id\) do update set vista_em = now\(\)/, 'versão já vista (rollback) não avisa de novo')
  assert.match(sql, /e\.estado in \('ok', 'morta'\)/, 'uma vez por aparelho e versão')
  assert.match(sql, /push_tentativas < 3/)
  assert.match(sql, /s\.avisar_versao/, 'preferência do aparelho')
  assert.match(sql, /revoke all on function public\.push_versao_travar\(text\), public\.push_versao_concluir\(text, jsonb\) from public, anon, authenticated/)
  const fn = ler('supabase/functions/enviar-push/index.ts')
  assert.match(fn, /admin\.rpc\('push_versao_travar'/)
  assert.match(fn, /Toque para abrir e atualizar\./)
  assert.match(fn, /url: '\/painel\/\?verificar=1'/)
})

/* O sw.js de verdade, num "self" simulado: push mostra a notificação e o toque só pede verificação. */
import vm from 'node:vm'
function rodarSw({ abas = [] } = {}) {
  const ouvintes = {}
  const mostradas = []
  const abertas = []
  const self = {
    addEventListener: (ev, f) => { ouvintes[ev] = f },
    registration: { showNotification: async (t, o) => { mostradas.push({ t, o }) } },
    clients: { matchAll: async () => abas, openWindow: async (u) => { abertas.push(u) }, claim: async () => {} },
    skipWaiting: () => { self.pulou = true },
    location: { origin: 'https://painel.teste' },
  }
  vm.runInNewContext(ler('public/painel/sw.js'), { self, caches: {}, fetch, URL, Response, console })
  const esperar = (ev) => new Promise((ok) => ouvintes[ev.tipo]({ ...ev, waitUntil: (p) => p.then(ok, ok) }))
  return { ouvintes, mostradas, abertas, self, esperar }
}

test('worker: push de versão mostra "Painel SCW atualizado"; o toque com aba aberta só pede verificação (nunca recarrega)', async () => {
  const msgs = []
  const aba = { url: 'https://painel.teste/painel/#social/biblioteca', postMessage: (m) => msgs.push(m), focus: async () => {} }
  const sw = rodarSw({ abas: [aba] })
  const carga = { titulo: 'Painel SCW atualizado', corpo: 'Há melhorias disponíveis. Toque para abrir e atualizar.', url: '/painel/?verificar=1', tag: 'scw-versao', tipo: 'versao' }
  await sw.esperar({ tipo: 'push', data: { json: () => carga } })
  assert.equal(sw.mostradas[0].t, 'Painel SCW atualizado')
  assert.equal(sw.mostradas[0].o.tag, 'scw-versao', 'versão nova substitui o aviso da anterior')
  assert.equal(sw.mostradas[0].o.data.versao, true)
  let fechou = false
  await sw.esperar({ tipo: 'notificationclick', notification: { data: sw.mostradas[0].o.data, close: () => { fechou = true } } })
  assert.ok(fechou)
  assert.equal(JSON.stringify(msgs), JSON.stringify([{ tipo: 'verificar-versao' }]), 'aba aberta: só verifica')
  assert.equal(sw.abertas.length, 0)
  // Sem aba: abre o painel já pedindo a verificação.
  const sem = rodarSw()
  await sem.esperar({ tipo: 'push', data: { json: () => carga } })
  await sem.esperar({ tipo: 'notificationclick', notification: { data: sem.mostradas[0].o.data, close() {} } })
  assert.deepEqual(sem.abertas, ['/painel/?verificar=1'])
  // Aviso comum continua levando ao item, e URL de fora nunca é aberta.
  const comum = rodarSw()
  await comum.esperar({ tipo: 'push', data: { json: () => ({ titulo: 'x', url: 'https://golpe.example/' }) } })
  assert.equal(comum.mostradas[0].o.data.url, '/painel/')
  // Ativação só por mensagem.
  const at = rodarSw()
  at.ouvintes.message({ data: { tipo: 'outra' } })
  assert.ok(!at.self.pulou)
  at.ouvintes.message({ data: { tipo: 'ativar' } })
  assert.ok(at.self.pulou)
})
