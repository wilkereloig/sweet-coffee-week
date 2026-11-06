// Caça aos Carimbos — sugestão da próxima casa perto da pessoa (src/edicao/caca/mapa/proximidade.js; docs/cartoon-2026-2/16-perto-de-mim-sugestao.md).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  sugerirProximaCasa, posicaoValida, sugestoesLigadas, ligarSugestoes, conviteAdiado, adiarConvite, casasDispensadas, dispensarCasa,
  PRECISAO_MAXIMA_M, LIMITE_LONGE_KM,
} from '../src/edicao/caca/mapa/proximidade.js'

const PERIODO = { inicio: '2026-11-05', fim: '2026-11-15' }
const AGORA = new Date('2026-11-07T15:00:00-03:00') // sábado, festival aberto, 15h em Natal
const VOCE = { lat: -5.8000, lng: -35.2000 }

// ~111 m por 0,001° de latitude: casas a 0,5 km, 1 km, 2 km, 5 km ao norte.
const ao = (kmAoNorte, extra = {}) => ({ lat: VOCE.lat + kmAoNorte / 111.19, lng: VOCE.lng, ...extra })
const horario = (abre = '10:00', fecha = '22:00', data = '2026-11-07') => [{ data, abre, fecha }]
const unidade = (id, coordenada, disponibilidade, extra = {}) => ({ id, nome: '', endereco: { bairro: 'Tirol' }, coordenada, combo: disponibilidade === undefined ? { disponibilidade: horario() } : { disponibilidade }, ...extra })
const casa = (slug, unidades, extra = {}) => ({ slug, casa: { nome: `Casa ${slug}` }, combo: { nome: `Combo ${slug}`, fotos: { principal: { path: `/combos/${slug}.jpg` } } }, unidades, ...extra })
const estados = (mapa) => (slug) => mapa[slug] || 'nao-visitada'
const base = { posicao: VOCE, periodo: PERIODO, agora: AGORA }

const lista = () => [
  casa('longe', [unidade('longe-1', ao(5))]),
  casa('meio', [unidade('meio-1', ao(1))]),
  casa('perto', [unidade('perto-1', ao(0.5))]),
]

test('sem posição, ou com posição inválida, não há sugestão (e nada quebra)', () => {
  for (const posicao of [null, undefined, {}, { lat: 'x', lng: 1 }, { lat: NaN, lng: 1 }, { lat: 95, lng: 0 }, { lat: 0, lng: 181 }]) {
    assert.deepEqual(sugerirProximaCasa({ ...base, lista: lista(), posicao }), { tipo: 'nenhuma', motivo: 'sem-posicao' })
  }
  assert.equal(posicaoValida(VOCE), true)
})

test('rota vazia: sugere a casa mais perto (modo "sozinha") com nome, bairro, combo, foto e distância em linha reta', () => {
  const s = sugerirProximaCasa({ ...base, lista: lista() })
  assert.equal(s.tipo, 'sugestao')
  assert.equal(s.modo, 'sozinha')
  assert.equal(s.slug, 'perto')
  assert.equal(s.unidadeId, 'perto-1')
  assert.equal(s.casa, 'Casa perto')
  assert.equal(s.bairro, 'Tirol')
  assert.equal(s.comboNome, 'Combo perto')
  assert.deepEqual(s.foto, { path: '/combos/perto.jpg' })
  assert.ok(Math.abs(s.km - 0.5) < 0.01, `km ${s.km}`)
  assert.equal(s.distanciaConfiavel, true)
  assert.equal(s.disponibilidade.estado, 'aberto')
})

test('rota preenchida: a rota manda — as casas dela não são sugeridas, a sugestão vira "opção" e a rota não é tocada', () => {
  const paradas = Object.freeze(['perto'])
  const s = sugerirProximaCasa({ ...base, lista: lista(), paradasPendentes: paradas })
  assert.equal(s.tipo, 'sugestao')
  assert.equal(s.modo, 'opcao')
  assert.equal(s.slug, 'meio', 'a mais perto está na rota: a opção é a seguinte')
  assert.deepEqual(paradas, ['perto'], 'a função nunca altera a rota')
  // só sobra casa que já está na rota: nada a oferecer, a rota segue sozinha
  const so = sugerirProximaCasa({ ...base, lista: [casa('perto', [unidade('perto-1', ao(0.5))])], paradasPendentes: ['perto'] })
  assert.deepEqual(so, { tipo: 'nenhuma', motivo: 'so-na-rota' })
})

test('casa já validada ou com carimbo pendente não é "descoberta"; sem o mapa lido, nada é descartado por estado', () => {
  const mapa = estados({ perto: 'conquistada', meio: 'pendente' })
  assert.equal(sugerirProximaCasa({ ...base, lista: lista(), estadoDe: mapa }).slug, 'longe')
  assert.equal(sugerirProximaCasa({ ...base, lista: lista() }).slug, 'perto', 'sem estadoDe (mapa não lido) a conquista é desconhecida')
  const tudo = estados({ perto: 'conquistada', meio: 'conquistada', longe: 'conquistada' })
  assert.deepEqual(sugerirProximaCasa({ ...base, lista: lista(), estadoDe: tudo }), { tipo: 'nenhuma', motivo: 'todas-conquistadas' })
})

test('várias unidades da mesma casa: vale a unidade elegível mais perto', () => {
  const c = casa('rede', [unidade('rede-a', ao(3), undefined, { nome: 'Centro' }), unidade('rede-b', ao(0.8), undefined, { nome: 'Tirol' }), unidade('rede-c', ao(0.3), horario('08:00', '09:00'), { nome: 'Fechada agora' })])
  const s = sugerirProximaCasa({ ...base, lista: [c] })
  assert.equal(s.unidadeId, 'rede-b', 'a mais perto (rede-c) abre às 8h e já encerrou: não é a sugerida')
  assert.equal(s.unidade, 'Tirol')
  assert.equal(s.slug, 'rede')
})

test('horário: encerrado hoje ou sem combo hoje tira a unidade; horário desconhecido entra mas NUNCA vira "aberto"', () => {
  const encerrada = casa('x', [unidade('x-1', ao(0.2), horario('08:00', '09:00'))])
  const semHoje = casa('y', [unidade('y-1', ao(0.3), horario('10:00', '22:00', '2026-11-08'))])
  assert.deepEqual(sugerirProximaCasa({ ...base, lista: [encerrada, semHoje] }), { tipo: 'nenhuma', motivo: 'todas-fechadas' })

  const abreDepois = casa('z', [unidade('z-1', ao(0.4), horario('18:00', '22:00'))])
  const desconhecida = casa('w', [unidade('w-1', ao(0.1), [])])
  const s = sugerirProximaCasa({ ...base, lista: [abreDepois, encerrada, desconhecida] })
  assert.equal(s.slug, 'w')
  assert.equal(s.disponibilidade.estado, 'sem_horario')
  assert.notEqual(s.disponibilidade.estado, 'aberto')
  assert.equal(sugerirProximaCasa({ ...base, lista: [abreDepois] }).disponibilidade.estado, 'abre_hoje')
})

test('empate de distância (até 100 m): aberta agora vem antes de horário a confirmar; ponto conferido antes do aproximado', () => {
  const aberta = casa('aberta', [unidade('aberta-1', ao(0.55))])
  const confirmar = casa('confirmar', [unidade('confirmar-1', ao(0.5), [])])
  assert.equal(sugerirProximaCasa({ ...base, lista: [confirmar, aberta] }).slug, 'aberta')
  // mais de 100 m de diferença: manda a distância
  const maisLonge = casa('maislonge', [unidade('maislonge-1', ao(0.9))])
  assert.equal(sugerirProximaCasa({ ...base, lista: [confirmar, maisLonge] }).slug, 'confirmar')
  const aprox = casa('aprox', [unidade('aprox-1', ao(0.5, { conferir: true, precisao: 'rua' }))])
  const exata = casa('exata', [unidade('exata-1', ao(0.52))])
  assert.equal(sugerirProximaCasa({ ...base, lista: [aprox, exata] }).slug, 'exata')
})

test('coordenada aproximada é dita aproximada, nunca como exata', () => {
  const s = sugerirProximaCasa({ ...base, lista: [casa('a', [unidade('a-1', ao(0.7, { conferir: true, precisao: 'rua' }))])] })
  assert.equal(s.aproximada, true)
  const exata = sugerirProximaCasa({ ...base, lista: [casa('b', [unidade('b-1', ao(0.7))])] })
  assert.equal(exata.aproximada, false)
})

test('dados incompletos: sem ponto, sem combo, sem unidade, lista vazia — ninguém é inventado', () => {
  const semPonto = casa('sp', [unidade('sp-1', null)])
  const semLat = casa('sl', [unidade('sl-1', { lat: null, lng: -35.2 })])
  const semCombo = { slug: 'sc', casa: { nome: 'Sem combo' }, combo: null, unidades: [unidade('sc-1', ao(0.1))] }
  const semUnidade = casa('su', [])
  assert.deepEqual(sugerirProximaCasa({ ...base, lista: [semPonto, semLat] }), { tipo: 'nenhuma', motivo: 'sem-ponto' })
  assert.deepEqual(sugerirProximaCasa({ ...base, lista: [semCombo, semUnidade] }), { tipo: 'nenhuma', motivo: 'sem-casas' })
  assert.deepEqual(sugerirProximaCasa({ ...base, lista: [] }), { tipo: 'nenhuma', motivo: 'sem-casas' })
  assert.deepEqual(sugerirProximaCasa({ ...base }), { tipo: 'nenhuma', motivo: 'sem-casas' })
  // uma casa boa no meio de dados ruins ainda é achada
  assert.equal(sugerirProximaCasa({ ...base, lista: [semPonto, semCombo, casa('ok', [unidade('ok-1', ao(2)), unidade('ok-2', null)])] }).slug, 'ok')
})

test('posição imprecisa (> 1,5 km de margem): sugere sem distância, não inventa precisão', () => {
  const s = sugerirProximaCasa({ ...base, lista: lista(), posicao: { ...VOCE, precisao: PRECISAO_MAXIMA_M + 1 } })
  assert.equal(s.tipo, 'sugestao')
  assert.equal(s.km, null)
  assert.equal(s.distanciaConfiavel, false)
  const boa = sugerirProximaCasa({ ...base, lista: lista(), posicao: { ...VOCE, precisao: 30 } })
  assert.equal(boa.distanciaConfiavel, true)
  assert.ok(Number.isFinite(boa.km))
})

test('pessoa longe da cidade (> 60 km): não há "perto" — diz isso em vez de sugerir', () => {
  const s = sugerirProximaCasa({ ...base, lista: lista(), posicao: { lat: -3.7, lng: -38.5 } }) // Fortaleza
  assert.equal(s.tipo, 'nenhuma')
  assert.equal(s.motivo, 'longe')
  assert.ok(s.km > LIMITE_LONGE_KM)
})

test('casa dispensada hoje não volta; sem outras casas, o motivo é "dispensadas"', () => {
  const s = sugerirProximaCasa({ ...base, lista: lista(), dispensadas: new Set(['perto']) })
  assert.equal(s.slug, 'meio')
  const unica = sugerirProximaCasa({ ...base, lista: [casa('perto', [unidade('perto-1', ao(0.5))])], dispensadas: new Set(['perto']) })
  assert.deepEqual(unica, { tipo: 'nenhuma', motivo: 'dispensadas' })
})

test('a sugestão não carimba, não avalia e não mexe nos dados: só devolve um objeto novo', () => {
  const dados = lista()
  const antes = JSON.stringify(dados)
  sugerirProximaCasa({ ...base, lista: dados })
  assert.equal(JSON.stringify(dados), antes)
})

// ------------------------------------------------------------------ preferências e memória no aparelho
const armazem = () => { const d = new Map(); return { d, getItem: (k) => (d.has(k) ? d.get(k) : null), setItem: (k, v) => { d.set(k, String(v)) } } }
const quebrado = { getItem () { throw new Error('bloqueado') }, setItem () { throw new Error('bloqueado') } }

test('preferência de sugestões: ligada por padrão, a pessoa desliga e religa', () => {
  const a = armazem()
  assert.equal(sugestoesLigadas(a), true)
  ligarSugestoes(false, a)
  assert.equal(sugestoesLigadas(a), false)
  ligarSugestoes(true, a)
  assert.equal(sugestoesLigadas(a), true)
})

test('convite de localização adiado: some por 7 dias e volta depois (não insiste)', () => {
  const a = armazem()
  assert.equal(conviteAdiado(a, AGORA), false)
  adiarConvite(a, AGORA)
  assert.equal(conviteAdiado(a, new Date(AGORA.getTime() + 6 * 86400000)), true)
  assert.equal(conviteAdiado(a, new Date(AGORA.getTime() + 8 * 86400000)), false)
})

test('dispensa vale um dia: no mesmo dia a casa não volta (sem aviso repetido), no dia seguinte volta', () => {
  const a = armazem()
  assert.equal(casasDispensadas(a, AGORA).size, 0)
  dispensarCasa('perto', a, AGORA)
  dispensarCasa('perto', a, AGORA)
  dispensarCasa('meio', a, AGORA)
  assert.deepEqual([...casasDispensadas(a, AGORA)].sort(), ['meio', 'perto'])
  assert.equal(casasDispensadas(a, new Date(AGORA.getTime() + 86400000)).size, 0)
})

test('armazenamento bloqueado ou corrompido nunca derruba a tela', () => {
  assert.equal(sugestoesLigadas(quebrado), true)
  assert.doesNotThrow(() => ligarSugestoes(false, quebrado))
  assert.equal(conviteAdiado(quebrado, AGORA), false)
  assert.doesNotThrow(() => adiarConvite(quebrado, AGORA))
  assert.equal(casasDispensadas(quebrado, AGORA).size, 0)
  assert.doesNotThrow(() => dispensarCasa('x', quebrado, AGORA))
  const ruim = armazem(); ruim.d.set('scw_perto_dispensas', '{lixo'); ruim.d.set('scw_perto_convite', 'ontem')
  assert.equal(casasDispensadas(ruim, AGORA).size, 0)
  assert.equal(conviteAdiado(ruim, AGORA), false)
})

test('privacidade: nenhuma coordenada é guardada e o módulo não envia nada (sem rede, sem analytics, sem log)', () => {
  const a = armazem()
  ligarSugestoes(true, a); adiarConvite(a, AGORA); dispensarCasa('perto', a, AGORA)
  const guardado = [...a.d.values()].join('|')
  assert.doesNotMatch(guardado, /-?5\.8\d|-?35\.2\d/, 'nem a posição da pessoa nem a de casa alguma vai para o aparelho')
  const fonte = readFileSync(fileURLToPath(new URL('../src/edicao/caca/mapa/proximidade.js', import.meta.url)), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  assert.doesNotMatch(fonte, /\b(fetch|XMLHttpRequest|sendBeacon|gtag|dataLayer|console\.|navigator\.geolocation|watchPosition|localStorage\.setItem\(\s*['"][^'"]*(lat|lng|pos))/)
})
