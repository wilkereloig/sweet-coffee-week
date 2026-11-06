/*
 * Pins do mapa mais informativos (06/11/2026): a regra do que cada pin diz e quem ganha o lugar quando há mais de um indicador
 * (indicadores.js), o horário de hoje a partir de `estadoAgora`, o relógio andando e o contrato do desenho (ícones do catálogo,
 * CSS sem !important nem hex, movimento só no pulso e com prefers-reduced-motion). Roda sem navegador:
 *   node --test tests/cartoon-mapa-pins.test.mjs        (o comportamento em tela: cartoon-mapa-pins-navegador.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { NIVEIS, ICONE_NIVEL, ROTULO_NIVEL, nivelDaUnidade, nivelDaCasa, hierarquiaDoPin, partesDoNome, assinaturaDosNiveis, niveisQueMudaram } from '../src/edicao/componentes/mapa/indicadores.js'
import { textoEstadoAgora, textoEstado, estadoAgora, minutosAte, JANELA_ABRE_EM_BREVE } from '../src/edicao/dados/modelo.js'
import { calcularNiveis } from '../src/edicao/cartoon/paginas/mapa/useAberturas.js'

const ler = (c) => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const PERIODO = { inicio: '2026-11-05', fim: '2026-11-15' }
// Natal é UTC−3: 14:00Z = 11:00 em Natal.
const em = (dia, hhmm) => new Date(`${dia}T${hhmm}:00-03:00`)
const unidade = (faixas, id = 'u1') => ({ id, combo: { disponibilidade: faixas } })
const hoje = (abre, fecha) => ({ data: '2026-11-08', abre, fecha })
const U = unidade([hoje('11:00', '20:00')])

test('nível do horário: aberto, abre em breve (até 1 h), fechado', () => {
  assert.equal(nivelDaUnidade(U, em('2026-11-08', '15:30'), PERIODO), 'aberto')
  assert.equal(nivelDaUnidade(U, em('2026-11-08', '10:30'), PERIODO), 'breve') // 30 min
  assert.equal(nivelDaUnidade(U, em('2026-11-08', '10:00'), PERIODO), 'breve') // exatamente 60 min ainda é breve
  assert.equal(nivelDaUnidade(U, em('2026-11-08', '09:59'), PERIODO), 'fechado') // 61 min: abre hoje, mas não em breve
  assert.equal(nivelDaUnidade(U, em('2026-11-08', '20:00'), PERIODO), 'fechado') // encerrou
  assert.equal(nivelDaUnidade(U, em('2026-11-08', '23:10'), PERIODO), 'fechado')
})

test('horário desconhecido ou indeterminável não afirma aberto nem fechado', () => {
  assert.equal(nivelDaUnidade({ id: 'x' }, em('2026-11-08', '12:00'), PERIODO), null) // sem combo
  assert.equal(nivelDaUnidade(unidade([]), em('2026-11-08', '12:00'), PERIODO), null) // combo sem horário cadastrado
  assert.equal(nivelDaUnidade(U, em('2026-11-03', '12:00'), PERIODO), null) // antes do festival
  assert.equal(nivelDaUnidade(U, em('2026-11-20', '12:00'), PERIODO), null) // depois
  assert.equal(nivelDaUnidade(unidade([hoje('abc', '20:00')]), em('2026-11-08', '09:00'), PERIODO), null) // hora ilegível
  assert.equal(nivelDaUnidade(null, new Date(), PERIODO), null)
})

test('dia dentro do festival sem faixa para a unidade: fechado (sem combo hoje), não "desconhecido"', () => {
  const soAmanha = unidade([{ data: '2026-11-09', abre: '11:00', fecha: '20:00' }])
  assert.equal(nivelDaUnidade(soAmanha, em('2026-11-08', '12:00'), PERIODO), 'fechado')
})

test('casa com várias unidades: vale a mais "agora"; só é null se nenhuma tem dado', () => {
  const manha = unidade([hoje('08:00', '12:00')], 'a')
  const tarde = unidade([hoje('14:00', '20:00')], 'b')
  assert.equal(nivelDaCasa([manha, tarde], em('2026-11-08', '10:00'), PERIODO), 'aberto')
  assert.equal(nivelDaCasa([manha, tarde], em('2026-11-08', '13:30'), PERIODO), 'breve')
  assert.equal(nivelDaCasa([manha, tarde], em('2026-11-08', '12:30'), PERIODO), 'fechado')
  assert.equal(nivelDaCasa([manha, unidade([], 'c')], em('2026-11-08', '13:00'), PERIODO), 'fechado') // a que não tem dado não derruba a outra
  assert.equal(nivelDaCasa([unidade([], 'c'), { id: 'd' }], em('2026-11-08', '13:00'), PERIODO), null)
  assert.equal(nivelDaCasa([], new Date(), PERIODO), null)
})

test('relógio andando: o mesmo pin muda de nível a cada marco, e o mapa de níveis só muda de assinatura nas viradas', () => {
  const lista = [{ slug: 'casa', unidades: [U] }]
  const seq = ['09:00', '10:01', '10:59', '11:00', '19:59', '20:00'].map((h) => calcularNiveis(lista, em('2026-11-08', h), PERIODO))
  assert.deepEqual(seq.map((m) => m.get('c:casa')), ['fechado', 'breve', 'breve', 'aberto', 'aberto', 'fechado'])
  assert.deepEqual(seq.map((m) => m.get('u:u1')), ['fechado', 'breve', 'breve', 'aberto', 'aberto', 'fechado'])
  assert.equal(assinaturaDosNiveis(seq[1]), assinaturaDosNiveis(seq[2])) // 10:01 e 10:59: nada a redesenhar
  assert.notEqual(assinaturaDosNiveis(seq[2]), assinaturaDosNiveis(seq[3]))
  assert.deepEqual([...niveisQueMudaram(seq[2], seq[3])].sort(), ['c:casa', 'u:u1'])
  assert.equal(niveisQueMudaram(seq[1], seq[2]).size, 0)
})

test('o pulso só vale para mudança de verdade: primeira leitura e perda de dado não pulsam', () => {
  const antes = new Map([['c:a', 'fechado'], ['c:b', 'aberto'], ['c:c', null]])
  const depois = new Map([['c:a', 'breve'], ['c:b', null], ['c:c', 'aberto'], ['c:novo', 'aberto']])
  assert.deepEqual([...niveisQueMudaram(antes, depois)].sort(), ['c:a', 'c:c'])
  assert.equal(niveisQueMudaram(null, depois).size, 0)
})

test('hierarquia: um selo principal por pin (pendente > conquistada > não visitada); desconhecido não desenha selo', () => {
  assert.equal(hierarquiaDoPin({ estado: 'pendente' }).selo, 'pendente')
  assert.equal(hierarquiaDoPin({ estado: 'conquistada' }).selo, 'conquistada')
  assert.equal(hierarquiaDoPin({ estado: 'nao-visitada' }).selo, 'nao-visitada')
  assert.equal(hierarquiaDoPin({ estado: null }).selo, null) // sem mapa da Caça: nenhum estado
  assert.equal(hierarquiaDoPin({ estado: 'qualquer' }).selo, null)
  assert.equal(hierarquiaDoPin().selo, null)
})

test('hierarquia: extras só em casa conquistada; o ponto do horário perde o canto para o "+N" quando os dois aparecem', () => {
  assert.equal(hierarquiaDoPin({ estado: 'conquistada', revisitas: 3 }).extras, 3)
  assert.equal(hierarquiaDoPin({ estado: 'pendente', revisitas: 3 }).extras, 0)
  assert.equal(hierarquiaDoPin({ estado: 'nao-visitada', revisitas: 2 }).extras, 0)
  assert.equal(hierarquiaDoPin({ estado: 'conquistada', revisitas: -1 }).extras, 0)
  const base = { estado: 'conquistada', revisitas: 2, nivel: 'aberto' }
  assert.equal(hierarquiaDoPin({ ...base, revisitasVisiveis: true }).ponto, null) // "+N" à vista: o ponto some do pin
  assert.equal(hierarquiaDoPin({ ...base, revisitasVisiveis: true }).nivel, 'aberto') // ... mas o dado segue (nome acessível e cartão)
  assert.equal(hierarquiaDoPin({ ...base, revisitasVisiveis: false }).ponto, 'aberto') // mapa real e ilustrado longe: sem "+N"
  assert.equal(hierarquiaDoPin({ estado: 'pendente', revisitas: 0, nivel: 'breve', revisitasVisiveis: true }).ponto, 'breve')
  assert.equal(hierarquiaDoPin({ estado: 'conquistada', revisitas: 0, nivel: 'fechado', revisitasVisiveis: true }).ponto, 'fechado')
})

test('hierarquia: sem nível não há ponto, rótulo nem pulso; nível inválido é ignorado', () => {
  for (const nivel of [null, undefined, 'meio-aberto']) {
    const h = hierarquiaDoPin({ estado: 'pendente', nivel, mudou: true })
    assert.deepEqual([h.nivel, h.ponto, h.mudou, h.rotulo], [null, null, false, ''])
  }
  const h = hierarquiaDoPin({ nivel: 'breve', mudou: true })
  assert.equal(h.mudou, true)
  assert.equal(h.rotulo, ROTULO_NIVEL.breve)
  assert.equal(hierarquiaDoPin({ nivel: 'breve' }).mudou, false)
  assert.equal(hierarquiaDoPin({ estado: 'conquistada', revisitas: 1, nivel: 'breve', mudou: true, revisitasVisiveis: true }).mudou, false) // ponto escondido, nada pulsa
})

test('o nome acessível diz estado, revisitas e horário (texto, nunca só cor ou ícone)', () => {
  assert.deepEqual(partesDoNome({ estado: 'pendente', nivel: 'aberto' }), ['carimbo pendente: falta avaliar', 'combo disponível agora'])
  assert.deepEqual(partesDoNome({ estado: 'conquistada', revisitas: 2, nivel: 'fechado' }), ['conquistada', '2 revisitas', 'combo fora do horário agora'])
  assert.deepEqual(partesDoNome({ estado: 'conquistada', revisitas: 1 }), ['conquistada', '1 revisita'])
  assert.deepEqual(partesDoNome({ estado: null, nivel: null }), [])
  assert.deepEqual(partesDoNome(undefined), [])
  assert.equal(new Set(NIVEIS.map((n) => ROTULO_NIVEL[n])).size, 3)
})

test('cada nível tem ÍCONE próprio e do catálogo de interface (forma além da cor)', () => {
  assert.equal(new Set(NIVEIS.map((n) => ICONE_NIVEL[n])).size, NIVEIS.length)
  for (const n of NIVEIS) assert.ok(existsSync(new URL(`../icones/interface/${ICONE_NIVEL[n]}.svg`, import.meta.url)), `${ICONE_NIVEL[n]}.svg não existe no catálogo`)
})

test('texto do cartão: "Combo abre em N min" só quando o dado é confiável; fora disso, o texto de sempre', () => {
  const abre = (h) => estadoAgora(U, em('2026-11-08', h), PERIODO)
  assert.equal(textoEstadoAgora(abre('10:30'), em('2026-11-08', '10:30')), 'Combo abre em 30 min')
  assert.equal(textoEstadoAgora(abre('10:59'), em('2026-11-08', '10:59')), 'Combo abre em 1 min')
  assert.equal(textoEstadoAgora(abre('10:00'), em('2026-11-08', '10:00')), 'Combo abre em 60 min')
  assert.equal(textoEstadoAgora(abre('09:30'), em('2026-11-08', '09:30')), textoEstado(abre('09:30'))) // longe: "a partir das 11h"
  assert.equal(textoEstadoAgora(abre('15:00'), em('2026-11-08', '15:00')), textoEstado(abre('15:00'))) // aberto: igual ao de sempre
  assert.equal(textoEstadoAgora({ estado: 'abre_hoje', as: 'zz' }, em('2026-11-08', '10:30')), textoEstado({ estado: 'abre_hoje', as: 'zz' }))
  assert.equal(textoEstadoAgora({ estado: 'sem_horario' }, new Date()), textoEstado({ estado: 'sem_horario' }))
  assert.equal(JANELA_ABRE_EM_BREVE, 60)
})

test('minutosAte: horário de Natal, qualquer fuso do aparelho', () => {
  assert.equal(minutosAte('11:00', new Date('2026-11-08T13:30:00Z')), 30) // 10:30 em Natal
  assert.equal(minutosAte('10:00', new Date('2026-11-08T13:30:00Z')), -30)
  assert.equal(minutosAte('', new Date()), null)
  assert.equal(minutosAte(null, new Date()), null)
})

test('muitos pins próximos: calcular todos os níveis é barato', () => {
  // casa i abre às 08:00 + (i % 10) h e fecha 22:00; "agora" = 12:00 em Natal
  const lista = Array.from({ length: 200 }, (_, i) => ({ slug: `casa-${i}`, unidades: [unidade([hoje(`${String(8 + (i % 10)).padStart(2, '0')}:00`, '22:00')], `u${i}`)] }))
  const t = performance.now()
  const m = calcularNiveis(lista, em('2026-11-08', '12:00'), PERIODO)
  assert.ok(performance.now() - t < 500, 'um tick com 200 casas deveria levar poucos ms')
  assert.equal(m.size, 400)
  assert.equal(m.get('c:casa-0'), 'aberto') // abre 08:00
  assert.equal(m.get('c:casa-3'), 'aberto') // abre 11:00
  assert.equal(m.get('c:casa-5'), 'breve') // abre 13:00, daqui a 60 min
  assert.equal(m.get('c:casa-9'), 'fechado') // abre 17:00
})

// ------------------------------------------------------------------ contrato do desenho
test('CSS do ponto do horário: tokens, sem !important, sem hex, movimento só no pulso e com prefers-reduced-motion', () => {
  const css = ler('src/styles/cartoon/11-mundo.css')
  const bloco = css.slice(css.indexOf('.ct-mundo__abertura {'), css.indexOf('/* Nome da casa: sobre o pin'))
  assert.ok(bloco.length > 300)
  assert.ok(!/!important/.test(bloco))
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(bloco), 'cor só por token --ct-*')
  assert.ok(/ct-mundo__abertura\[data-nivel="aberto"\]/.test(bloco) && /\[data-nivel="breve"\]/.test(bloco))
  assert.ok(!/infinite/.test(bloco), 'nenhuma animação contínua')
  assert.ok(/animation: ct-mundo-abertura 1\.2s [^;]* 1 both/.test(bloco), 'o pulso roda uma vez')
  const reduz = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce) {\n  .ct-mundo__casa, .ct-mundo__sicredi'))
  assert.ok(/\.ct-pin\.is-mudou \.ct-mundo__abertura \{ animation: none/.test(reduz))
})

test('os dois mapas desenham o mesmo ponto pela mesma regra', () => {
  const pin = ler('src/edicao/componentes/mapa/pin.js')
  const mundo = ler('src/edicao/cartoon/paginas/mapa/Mundo.jsx')
  const index = ler('src/edicao/cartoon/paginas/mapa/index.jsx')
  assert.ok(pin.includes('hierarquiaDoPin') && pin.includes('ct-mundo__abertura'))
  assert.ok(mundo.includes('hierarquiaDoPin') && mundo.includes('ct-mundo__abertura') && mundo.includes('ICONE_NIVEL'))
  assert.ok(/hierarquiaDoPin\(\{ \.\.\.c, revisitasVisiveis: vista\.zoom \}\)/.test(mundo), 'o ilustrado sabe quando o "+N" está à vista')
  assert.ok(index.includes('useAberturas(lista, periodo)'))
  for (const f of ['MapaUnidades', 'MapaGoogle']) assert.ok(ler(`src/edicao/componentes/mapa/${f}.jsx`).includes('partesDoNome(p.pin)'), `${f}: nome acessível sem o horário`)
})

test('o relógio: um tick de 60 s que só troca o estado do React quando um nível muda', () => {
  const hook = ler('src/edicao/cartoon/paginas/mapa/useAberturas.js')
  assert.ok(/TICK_MS = 60000/.test(hook))
  assert.ok(/assinaturaDosNiveis\(niveis\) === assinaturaDosNiveis\(ultimo\.current\)\) return/.test(hook))
  assert.ok(/visibilitychange/.test(hook), 'recalcula ao voltar para a aba')
  assert.ok(ler('src/edicao/cartoon/paginas/mapa/Cartao.jsx').includes('useAgora(60000)'), 'o cartão anda com o relógio')
})
