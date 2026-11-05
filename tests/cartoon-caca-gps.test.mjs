// Caça aos Carimbos — GPS autônomo e pedido de revisão de presença (src/edicao/caca/gps.js, textos-gps.js, api.js, rota/carimbo.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import * as C from '../src/edicao/rota/carimbo.js'
import { criarApi } from '../src/edicao/caca/api.js'
import { precisaDeRevisao, podePedirPresenca, motivoDoPedido, falhaDeLocalizacao, pedidoDaCasa, FALHAS_PARA_PEDIR } from '../src/edicao/caca/gps.js'
import { ajudaLocalizacao } from '../src/edicao/caca/regras.js'
import { GPS, mensagemDoPedido } from '../src/edicao/caca/textos-gps.js'

const raiz = path.resolve(import.meta.dirname, '..')
const CHAVE = 'AbCdEfGhIjKlMnOpQrStUvWxYz012-_9'

/** GPS simulado: `roteiro` = lista de { depois (ms simulados), pos | erro }, disparada pelo relógio simulado. */
function relogio () {
  let agora = 0; let n = 0; const fila = new Map()
  return {
    setT: (fn, ms) => { n += 1; fila.set(n, { fn, em: agora + ms }); return n },
    clearT: (id) => fila.delete(id),
    avancar (ms) {
      const alvo = agora + ms
      for (;;) {
        const prox = [...fila.entries()].filter(([, t]) => t.em <= alvo).sort((a, b) => a[1].em - b[1].em)[0]
        if (!prox) break
        fila.delete(prox[0]); agora = prox[1].em; prox[1].fn()
      }
      agora = alvo
    },
  }
}
function geoFalso (rel, tentativas) {
  // `tentativas[i]` = eventos da i-ésima chamada de watchPosition: { em, acc } ou { em, code }
  const chamadas = { watch: 0, clear: 0, opcoes: [] }
  return {
    chamadas,
    watchPosition (ok, erro, opcoes) {
      const eventos = tentativas[chamadas.watch] || []
      chamadas.watch += 1; chamadas.opcoes.push(opcoes)
      const ids = eventos.map((e) => rel.setT(() => (e.code ? erro({ code: e.code }) : ok({ coords: { latitude: -5.8, longitude: -35.2, accuracy: e.acc } })), e.em))
      return { ids }
    },
    clearWatch: (w) => { chamadas.clear += 1; w?.ids?.forEach((i) => rel.clearT(i)) },
  }
}
async function rodar (tentativas, opcoes = {}) {
  const rel = relogio(); const geo = geoFalso(rel, tentativas)
  const vistas = []
  const p = C.capturarPosicao({ geo, setT: rel.setT, clearT: rel.clearT, aoTentar: (i, n) => vistas.push([i, n]), ...opcoes })
  for (let i = 0; i < 40; i += 1) { await Promise.resolve(); rel.avancar(1000) }
  return { r: await p, geo, vistas }
}

test('GPS bom na 1ª tentativa: pára na hora, pede alta precisão e limpa o watch', async () => {
  const { r, geo, vistas } = await rodar([[{ em: 500, acc: 80 }, { em: 1500, acc: 20 }]])
  assert.deepEqual(r, { lat: -5.8, lng: -35.2, precisao: 20, tentativas: 1 })
  assert.deepEqual(vistas, [[1, 3]])
  assert.equal(geo.chamadas.watch, 1)
  assert.equal(geo.chamadas.clear, 1)
  assert.equal(geo.chamadas.opcoes[0].enableHighAccuracy, true)
  assert.equal(geo.chamadas.opcoes[0].maximumAge, 0)
})

test('sinal que melhora aos poucos: 3 tentativas, vale a melhor leitura e o alvo vai afrouxando', async () => {
  const { r, vistas } = await rodar([[{ em: 1000, acc: 400 }], [{ em: 1000, acc: 180 }], [{ em: 2000, acc: 230 }, { em: 3000, acc: 400 }]])
  assert.deepEqual(vistas, [[1, 3], [2, 3], [3, 3]])
  assert.equal(r.precisao, 180, 'a melhor das três, não a última')
  assert.equal(r.tentativas, 3)
  const { r: r2 } = await rodar([[{ em: 1000, acc: 400 }], [{ em: 1000, acc: 200 }], [{ em: 1000, acc: 240 }]])
  assert.equal(r2.precisao, 200)
})

test('3 tentativas sem nenhuma leitura: demorou (ou o último erro técnico)', async () => {
  assert.deepEqual((await rodar([[], [], []])).r, { erro: 'demorou' })
  assert.deepEqual((await rodar([[{ em: 100, code: 2 }], [], []])).r, { erro: 'indisponivel' })
  assert.deepEqual((await rodar([[{ em: 100, code: 3 }], [{ em: 100, code: 2 }], []])).r, { erro: 'indisponivel' })
})

test('permissão negada pára na hora, sem insistir nas outras tentativas', async () => {
  const { r, geo, vistas } = await rodar([[{ em: 100, code: 1 }]])
  assert.deepEqual(r, { erro: 'negada' })
  assert.equal(geo.chamadas.watch, 1)
  assert.deepEqual(vistas, [[1, 3]])
})

test('sem API de localização: indisponível, sem lançar', async () => {
  assert.deepEqual(await C.capturarPosicao({ geo: null }), { erro: 'indisponivel' })
  assert.deepEqual(await C.capturarPosicao({ geo: { getCurrentPosition () {} } }), { erro: 'indisponivel' })
  const quebrado = { watchPosition () { throw new Error('x') }, clearWatch () {} }
  assert.deepEqual((await rodar([], { geo: quebrado })).r.erro, 'indisponivel')
})

test('leitura sem precisão numérica vira precisão imprestável, não NaN', async () => {
  const { r } = await rodar([[{ em: 100, acc: undefined }], [], []])
  assert.equal(r.precisao, 100000)
})

test('pedido de revisão: só depois de 2 falhas e só quando ainda é plausível estar na casa', () => {
  const semLoc = { motivo: 'sem_localizacao', posicao: 'negada' }
  assert.equal(podePedirPresenca(semLoc, FALHAS_PARA_PEDIR - 1), false, 'a 1ª falha só orienta')
  assert.equal(podePedirPresenca(semLoc, FALHAS_PARA_PEDIR), true)
  assert.equal(podePedirPresenca({ motivo: 'longe', precisao: 250, distancia_m: 900 }, 2), true, 'GPS fraco')
  assert.equal(podePedirPresenca({ motivo: 'longe', precisao: 20, distancia_m: 420 }, 2), true, 'a poucos passos')
  assert.equal(podePedirPresenca({ motivo: 'longe', precisao: 20, distancia_m: 4200 }, 5), false, 'claramente em outro lugar')
  for (const m of ['cedo', 'nao_aberta', 'encerrada', 'rede', 'qr_invalido', 'casa_sem_combo']) assert.equal(podePedirPresenca({ motivo: m }, 9), false, m)
  assert.equal(podePedirPresenca(null, 9), false)
  assert.equal(falhaDeLocalizacao({ motivo: 'longe' }), true)
  assert.equal(falhaDeLocalizacao({ motivo: 'cedo' }), false)
})

test('motivo do pedido: sem localização · imprecisa (margem > 300 m) · longe', () => {
  assert.equal(motivoDoPedido({ motivo: 'sem_localizacao' }), 'sem_localizacao')
  assert.equal(motivoDoPedido({ motivo: 'longe', precisao: 450 }), 'imprecisa')
  assert.equal(motivoDoPedido({ motivo: 'longe', precisao: 120 }), 'longe')
  assert.equal(motivoDoPedido({ motivo: 'longe' }), 'longe')
})

test('pedido da casa: o mais recente daquele slug', () => {
  const lista = [{ slug: 'b', estado: 'negado' }, { slug: 'a', estado: 'pendente' }, { slug: 'a', estado: 'negado' }]
  assert.equal(pedidoDaCasa(lista, 'a').estado, 'pendente')
  assert.equal(pedidoDaCasa(lista, 'z'), null)
  assert.equal(pedidoDaCasa(null, 'a'), null)
})

test('excecaoPedir: corpo do contrato, nota limpa e cortada, posição só nos campos da RPC', async () => {
  const chamadas = []
  const api = criarApi({ chamar: async (n, c) => { chamadas.push([n, c]); return { ok: true, id: 'x', estado: 'pendente' } }, edicao: '2026.2' })
  const r = await api.excecaoPedir(CHAVE, { slug: 'casa-um', motivo: 'longe', lat: -5.8, lng: -35.2, precisao: 40, nota: `  ${'a'.repeat(300)}  ` })
  assert.equal(r.ok, true)
  assert.equal(chamadas[0][0], 'caca_excecao_pedir')
  assert.deepEqual(Object.keys(chamadas[0][1]).sort(), ['p_chave', 'p_lat', 'p_lng', 'p_motivo', 'p_nota', 'p_precisao', 'p_slug'])
  assert.equal(chamadas[0][1].p_nota.length, 200)
  await api.excecaoPedir(CHAVE, { slug: 'casa-um', motivo: 'sem_localizacao' })
  assert.deepEqual([chamadas[1][1].p_lat, chamadas[1][1].p_lng, chamadas[1][1].p_precisao, chamadas[1][1].p_nota], [null, null, null, null])
  assert.deepEqual(await api.excecaoPedir('lixo', { slug: 'casa-um', motivo: 'longe' }), { ok: false, motivo: 'mapa_desconhecido' })
  assert.deepEqual(await api.excecaoPedir(CHAVE, { slug: 'Casa Ruim!', motivo: 'longe' }), { ok: false, motivo: 'qr_invalido' })
  assert.equal(chamadas.length, 2, 'chave ou slug ruins nem chegam ao banco')
})

test('excecaoPedir: recusa do banco vira motivo (e mantém liberado_em); exceção vira rede', async () => {
  const recusa = criarApi({ chamar: async () => ({ ok: false, motivo: 'ja_pedido', liberado_em: '2026-11-08T10:00:00Z' }), edicao: '2026.2' })
  assert.deepEqual(await recusa.excecaoPedir(CHAVE, { slug: 'a', motivo: 'longe' }), { ok: false, motivo: 'ja_pedido', liberado_em: '2026-11-08T10:00:00Z' })
  const cai = criarApi({ chamar: async () => { throw new Error('Failed to fetch') }, edicao: '2026.2' })
  assert.deepEqual(await cai.excecaoPedir(CHAVE, { slug: 'a', motivo: 'longe' }), { ok: false, motivo: 'rede' })
  const estranha = criarApi({ chamar: async () => 'lixo', edicao: '2026.2' })
  assert.equal((await estranha.excecaoPedir(CHAVE, { slug: 'a', motivo: 'longe' })).ok, false)
})

test('excecaoMinhas: lista (ou vazia) e chave ruim não chama o banco', async () => {
  const api = criarApi({ chamar: async () => ({ ok: true, pedidos: [{ slug: 'a', estado: 'pendente' }] }), edicao: '2026.2' })
  assert.deepEqual(await api.excecaoMinhas(CHAVE), { ok: true, pedidos: [{ slug: 'a', estado: 'pendente' }] })
  assert.deepEqual(await api.excecaoMinhas('lixo'), { ok: false, motivo: 'mapa_desconhecido' })
  const semLista = criarApi({ chamar: async () => ({ ok: true }), edicao: '2026.2' })
  assert.deepEqual(await semLista.excecaoMinhas(CHAVE), { ok: true, pedidos: [] })
})

test('orientação por plataforma e por motivo: iPhone, Android, navegador de app, fachada', () => {
  const a = ajudaLocalizacao({ motivo: 'sem_localizacao', posicao: 'negada' })
  const todo = a.passos.map(([k, v]) => `${k} ${v}`).join(' ')
  assert.match(todo, /iPhone/); assert.match(todo, /Serviços de Localização/); assert.match(todo, /Safari ou Chrome/)
  assert.match(todo, /Android/); assert.match(todo, /cadeado/); assert.match(todo, /Permissões/)
  assert.match(todo, /Instagram/)
  const fraca = ajudaLocalizacao({ motivo: 'longe', precisao: 250, distancia_m: 380 })
  assert.match(fraca.texto, /250 m/); assert.match(fraca.texto, /380 m/)
  assert.match(GPS.dicas.itens.join(' '), /fachada/)
  assert.match(GPS.dicas.itens.join(' '), /alta precisão/)
  assert.equal(GPS.buscando(2, 3), 'Procurando o sinal de GPS (tentativa 2 de 3)…')
})

test('textos do pedido: nunca prometem carimbo, não revelam a surpresa nem põem a casa no fluxo, e "Sweet" não aparece sozinho', () => {
  const T = GPS.pedido
  const todos = [T.lead, T.quemDecide, T.privacidade, T.enviadoTexto('Casa'), T.emAnalise('Casa'), T.aprovadoNota('Casa'), T.negadoNota('Casa'),
    ...Object.values(GPS.pedidoRecusa).map((t) => (typeof t === 'function' ? t('depois das 10h') : t)), ...GPS.dicas.itens].join(' | ')
  assert.match(T.lead, /não vale carimbo por si só/)
  assert.match(T.enviadoTexto('Casa'), /nada foi carimbado/i)
  assert.match(T.quemDecide, /organização/); assert.match(T.quemDecide, /nunca a casa/)
  assert.doesNotMatch(todos, /\bvot(a|e|ação)/i)
  assert.doesNotMatch(todos, /plaquinha|Sweet Lover/i)
  assert.doesNotMatch(todos, /\bSweet\b(?! (Lovers?|Awards|&))/)
  assert.equal(mensagemDoPedido('nao_existe'), GPS.pedidoRecusa.generico)
  assert.match(mensagemDoPedido('ja_pedido', 'depois das 10h'), /depois das 10h/)
})

test('Carimbo.jsx: pede a localização só no toque, só confirma com ok do servidor e a posição vai só para a RPC', () => {
  const src = readFileSync(path.join(raiz, 'src/edicao/cartoon/paginas/Carimbo.jsx'), 'utf8')
  assert.match(src, /C\.capturarPosicao/)
  assert.doesNotMatch(src, /pedirPosicao/, 'a tela usa a captura progressiva')
  const efeitos = src.slice(src.indexOf('React.useEffect'), src.indexOf('async function carimbar'))
  assert.doesNotMatch(efeitos, /capturarPosicao|geolocation/, 'nenhum efeito pede localização sozinho')
  assert.match(src, /final\.ok === true/)
  assert.doesNotMatch(src, /analytics|gtag|sendBeacon|navigator\.share|wa\.me/i)
  const pedido = readFileSync(path.join(raiz, 'src/edicao/caca/PedidoPresenca.jsx'), 'utf8')
  assert.doesNotMatch(pedido, /localStorage|sessionStorage|console\./, 'o pedido não guarda nem loga a posição')
})

test('casa sem ponto conferido: o QR sozinho recusa com sem_ponto e o pedido de revisão é oferecido já na primeira vez (C02)', () => {
  const r = { motivo: 'sem_ponto', slug: 'x' }
  assert.equal(precisaDeRevisao(r), true)
  assert.equal(precisaDeRevisao({ motivo: 'longe' }), false)
  assert.equal(podePedirPresenca(r, 0), true)
  assert.equal(falhaDeLocalizacao(r), false) // não é falha de GPS: não mostra dicas de sinal nem soma "falhas seguidas"
  assert.equal(motivoDoPedido(r), 'sem_localizacao')
  assert.match(C.mensagemRecusa(r).texto, /pedir à organização/)
  assert.match(GPS.pedido.leadSemPonto, /QR sozinho não vale carimbo/)
})

test('motivos novos do servidor têm texto: casa_sem_combo no carimbo e email_nao_confirmado no pedido (C05, SEC-02)', () => {
  assert.match(C.mensagemRecusa({ motivo: 'casa_sem_combo' }).titulo, /ainda não tem combo/)
  assert.doesNotMatch(C.mensagemRecusa({ motivo: 'casa_sem_combo' }).texto, /tente de novo/i)
  assert.match(mensagemDoPedido('email_nao_confirmado'), /confirme o seu e-mail/)
})
