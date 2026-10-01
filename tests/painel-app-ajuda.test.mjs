import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { TOUR, etapasDoTour, tourVisto, marcarTour } from '../painel-app/src/lib/ajuda.js'
import { rotaDoLink } from '../painel-app/src/lib/rota.js'
import { interpretarLinkMarca } from '../painel-app/src/lib/guia.js'
import { estadoInstalacao, conviteDispensado, dispensarConvite } from '../painel-app/src/lib/instalar.js'

// As listas de telas saem do próprio código das cascas (JSX não roda no node).
const COMP = new URL('../painel-app/src/components/', import.meta.url)
const fonte = (arq) => readFileSync(new URL(arq, COMP), 'utf8')
const lista = (arq, nome) => {
  const m = new RegExp('const ' + nome + ' = \\[([^\\]]*)\\]').exec(fonte(arq))
  return m[1].match(/'([a-z]+)'/g).map((x) => x.slice(1, -1))
}
const DESTINOS_ORG = lista('PainelShell.jsx', 'DESTINOS')
const DESTINOS_MARCA = lista('PainelMarcaShell.jsx', 'DESTINOS')
const TELAS_MARCA = [...DESTINOS_MARCA, ...lista('PainelMarcaShell.jsx', 'OCULTAS')]

// Toda âncora `data-tour` escrita nos componentes: literais e os botões do
// menu (`'menu-' + d`, um por destino da casca).
const ANCORAS = new Set(readdirSync(COMP).filter((f) => f.endsWith('.jsx'))
  .flatMap((f) => [...fonte(f).matchAll(/data-tour="([a-z-]+)"/g)].map((m) => m[1])))
const ancoraExiste = (a, destinos) => ANCORAS.has(a) || (a.startsWith('menu-') && destinos.includes(a.slice(5)))

const TODAS = () => true
const NENHUMA = () => false

test('tour da organização: link abre tela e âncora existe', () => {
  for (const e of TOUR.organizacao) {
    if (e.link) assert.ok(DESTINOS_ORG.includes((rotaDoLink(e.link) || {}).vista), e.id + ' → ' + e.link)
    for (const a of e.alvos || []) assert.ok(ancoraExiste(a, DESTINOS_ORG), e.id + ': data-tour="' + a + '" não existe')
  }
})

test('tour da marca: link abre tela e âncora existe', () => {
  for (const e of TOUR.marca) {
    if (e.link) assert.ok(TELAS_MARCA.includes((interpretarLinkMarca(e.link) || {}).vista), e.id + ' → ' + e.link)
    for (const a of e.alvos || []) assert.ok(ancoraExiste(a, DESTINOS_MARCA), e.id + ': data-tour="' + a + '" não existe')
  }
})

test('ids únicos e todo texto vira frase, com qualquer função', () => {
  for (const papel of Object.keys(TOUR)) {
    const ids = TOUR[papel].map((e) => e.id)
    assert.equal(new Set(ids).size, ids.length, papel + ': id repetido')
    for (const pode of [TODAS, NENHUMA]) {
      for (const e of etapasDoTour(TOUR[papel], { pode })) {
        assert.equal(typeof e.texto, 'string', e.id)
        assert.ok(e.texto.length > 20, e.id + ' sem texto')
      }
    }
  }
})

test('etapa que exige ação some sem a permissão', () => {
  const com = etapasDoTour(TOUR.organizacao, { pode: TODAS }).map((e) => e.id)
  const sem = etapasDoTour(TOUR.organizacao, { pode: NENHUMA }).map((e) => e.id)
  assert.ok(com.includes('conversa'))
  assert.ok(!sem.includes('conversa'))
  // O texto diz o que a função não faz, em vez de mostrar como se fizesse.
  const acoes = etapasDoTour(TOUR.organizacao, { pode: NENHUMA }).find((e) => e.id === 'acoes')
  assert.match(acoes.texto, /não aprova nem pede correção/)
  assert.match(acoes.texto, /só do Administrador/)
  const acoesTudo = etapasDoTour(TOUR.organizacao, { pode: TODAS }).find((e) => e.id === 'acoes')
  assert.doesNotMatch(acoesTudo.texto, /Sua função/)
})

test('etapa sem âncora na tela some; sem alvos fica', () => {
  const etapas = [{ id: 'a', alvos: ['x'], titulo: 'A', texto: 't' }, { id: 'b', titulo: 'B', texto: 't' }]
  assert.deepEqual(etapasDoTour(etapas, { achar: () => null }).map((e) => e.id), ['b'])
  assert.deepEqual(etapasDoTour(etapas, { achar: () => ({}) }).map((e) => e.id), ['a', 'b'])
  assert.deepEqual(etapasDoTour(null), [])
})

test('etapa de módulo fora do menu some, mesmo com o "mais" na tela', () => {
  const ids = etapasDoTour(TOUR.organizacao, { telas: ['visao', 'participantes'] }).map((e) => e.id)
  for (const fora of ['arquivos', 'edicao', 'admin']) assert.ok(!ids.includes(fora), fora)
  assert.ok(etapasDoTour(TOUR.organizacao).some((e) => e.id === 'admin'))
})

test('tour visto: sem localStorage não quebra (aba privada, node)', () => {
  assert.equal(tourVisto('marca', 'id-1'), false)
  assert.doesNotThrow(() => marcarTour('marca', 'id-1', 'concluido'))
})

test('estado da instalação', () => {
  assert.equal(estadoInstalacao({ standalone: true, ios: true, prompt: true }), 'instalado')
  assert.equal(estadoInstalacao({ standalone: false, ios: false, prompt: true }), 'pronto')
  assert.equal(estadoInstalacao({ standalone: false, ios: true, prompt: false }), 'ios')
  assert.equal(estadoInstalacao({ standalone: false, ios: false, prompt: false }), 'manual')
})

test('"agora não" sem localStorage não quebra (aba privada, node)', () => {
  assert.equal(conviteDispensado('marca'), false)
  assert.doesNotThrow(() => dispensarConvite('marca'))
})
