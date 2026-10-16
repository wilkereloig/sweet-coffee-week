// Regras de leitura da projeção pública da Cartoon (src/edicao/dados/modelo.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as M from '../src/edicao/dados/modelo.js'
import { DEMO_EDICAO } from '../src/edicao/dados/demo/cartoon.js'

const [aurora, bico, quadro] = DEMO_EDICAO.participantes
const NOVE_NOV = (h, m = 0) => new Date(Date.UTC(2026, 10, 9, h + 3, m)) // horário de Natal = UTC−3

test('ausência de declaração é "não informado", nunca "não contém"', () => {
  const item = { nome: 'x', alimentar: [{ aspecto: 'gluten', estado: 'contem' }] }
  const d = M.declaracoes(item)
  assert.equal(d.gluten, 'contem')
  assert.equal(d.leite, 'nao_informado')
  assert.equal(d.lactose, 'nao_informado')
  const r = M.resumoItem(item)
  assert.ok(r.naoInformado.includes('leite'))
  assert.ok(!r.naoContem.includes('leite'))
  assert.equal(M.declaradoSem([item], 'leite'), false)
  assert.equal(M.declaradoSem([{ alimentar: [] }], 'gluten'), false)
})

test('"sem lactose" não é "sem leite"', () => {
  const bebida = aurora.combo.itens[2]
  const r = M.resumoItem(bebida)
  assert.ok(r.contem.includes('leite'))
  assert.equal(r.caracteristicas.lactose, 'nao')
  assert.equal(M.declaradoSem([bebida], 'lactose'), true)
  assert.equal(M.declaradoSem([bebida], 'leite'), false)
})

test('resumo do combo diz em qual componente', () => {
  const linhas = M.resumoCombo(aurora.combo.itens)
  const gluten = linhas.find((l) => l.aspecto === 'gluten')
  assert.deepEqual(gluten.contem, ['[DEMO] Doce', '[DEMO] Salgado'])
  const amendoim = linhas.find((l) => l.aspecto === 'amendoim')
  assert.deepEqual(amendoim.podeConter, ['[DEMO] Salgado'])
  assert.equal(M.fraseAlerta(aurora.combo.itens), 'Contém glúten, leite e ovo')
  assert.equal(M.fraseAlerta(bico.combo.itens), '')
  assert.equal(M.resumoCombo(bico.combo.itens).every((l) => l.naoInformado.length === 3), true)
})

test('modos só contam o "sim" do combo por unidade', () => {
  const m = M.modosDoParticipante(aurora)
  assert.deepEqual(m.delivery.map((u) => u.id), ['udemo1'])
  assert.deepEqual(m.local.map((u) => u.id), ['udemo1', 'udemo2'])
  assert.deepEqual(M.modosDoParticipante(quadro), { local: [], retirada: [], delivery: [] })
})

test('estado do combo agora, no horário de Natal', () => {
  const centro = aurora.unidades[0]
  assert.deepEqual(M.estadoAgora(centro, NOVE_NOV(15)), { estado: 'aberto', ate: '20:00' })
  assert.deepEqual(M.estadoAgora(centro, NOVE_NOV(10)), { estado: 'abre_hoje', as: '14:00' })
  assert.deepEqual(M.estadoAgora(centro, NOVE_NOV(20, 0)), { estado: 'encerrado_hoje' })
  assert.deepEqual(M.estadoAgora(centro, new Date(Date.UTC(2026, 10, 20, 15))), { estado: 'fora_do_periodo' })
  assert.deepEqual(M.estadoAgora(centro, new Date(Date.UTC(2026, 9, 14, 15))), { estado: 'fora_do_periodo' })
  assert.equal(M.textoEstado({ estado: 'fora_do_periodo' }), '')
  const comFolga = { combo: { disponibilidade: [{ data: '2026-11-05', abre: '10:00', fecha: '12:00' }, { data: '2026-11-07', abre: '10:00', fecha: '12:00' }] } }
  assert.deepEqual(M.estadoAgora(comFolga, new Date(Date.UTC(2026, 10, 6, 15))), { estado: 'sem_horario_hoje' })
  assert.deepEqual(M.estadoAgora(quadro.unidades[0], NOVE_NOV(15)), { estado: 'sem_horario' })
  assert.match(M.textoEstado({ estado: 'sem_horario' }), /a confirmar/)
})

test('filtros usam só dado declarado', () => {
  const lista = DEMO_EDICAO.participantes
  assert.deepEqual(M.filtrar(lista, { modo: 'delivery' }).map((p) => p.slug), ['demo-casa-aurora'])
  assert.deepEqual(M.filtrar(lista, { bairro: 'Ponta Negra' }).map((p) => p.slug), ['demo-casa-bico-de-pena'])
  assert.deepEqual(M.filtrar(lista, { semGluten: true }), [])
  assert.deepEqual(M.filtrar(lista, { q: 'traco doce' }).map((p) => p.slug), ['demo-casa-aurora'])
  assert.deepEqual(M.filtrar(lista, { aberto: true }, NOVE_NOV(10)).map((p) => p.slug), ['demo-casa-bico-de-pena'])
  const o = M.opcoesFiltro(lista)
  assert.deepEqual(o.modos, ['local', 'retirada', 'delivery'])
  assert.deepEqual(o.bairros, ['Lagoa Nova', 'Ponta Negra', 'Tirol'])
  assert.equal(o.semGluten, false)
})

test('filtros vão e voltam pela query string', () => {
  const f = { q: 'café', bairro: 'Tirol', modo: 'retirada', aberto: true, semGluten: true, semLactose: true }
  const s = M.buscaDosFiltros(f)
  assert.deepEqual(M.filtrosDaBusca(s), f)
  assert.equal(M.buscaDosFiltros({}), '')
})

test('formatos e links', () => {
  assert.equal(M.formatarPreco(38.9), 'R$ 38,90')
  assert.equal(M.formatarPreco(null), '')
  assert.equal(M.formatarDia('2026-11-05'), 'qui 5/11')
  assert.deepEqual(M.horarioResumido(aurora.unidades[0].combo.disponibilidade), [{ dias: 'qui 5/11 a dom 15/11', faixas: '14:00–20:00' }])
  assert.equal(M.linkWhatsApp('(84) 90000-0000'), 'https://wa.me/5584900000000')
  assert.match(M.linkComoChegar({ coordenada: { lat: -5.8, lng: -35.2 } }), /destination=-5\.8%2C-35\.2$/)
  assert.match(M.linkComoChegar(aurora.unidades[1]), /destination=.*Lagoa%20Nova/)
  assert.equal(M.enderecoEmLinha(aurora.unidades[0].endereco), '[DEMO] Rua Exemplo, 100 · Tirol · Natal/RN')
  assert.equal(M.juntar(['a', 'b', 'c']), 'a, b e c')
})

// Logo do acervo (origem 'acervo') é arquivo do site; só a do Storage passa pelo bucket.
test('URL da imagem: caminho absoluto é do site, o resto é do Storage', () => {
  const B = 'https://x.supabase.co'
  assert.equal(M.urlDaImagem(B, { bucket: 'logos', path: '/logos/participants/cookitos.png' }, 'edicao-publico'), '/logos/participants/cookitos.png')
  assert.equal(M.urlDaImagem(B, { bucket: 'logos', path: 'p1/17-logo.png' }, 'edicao-publico'), B + '/storage/v1/object/public/logos/p1/17-logo.png')
  assert.equal(M.urlDaImagem(B, { path: '2026.2/a/b.webp' }, 'edicao-publico'), B + '/storage/v1/object/public/edicao-publico/2026.2/a/b.webp')
  assert.equal(M.urlDaImagem(B, null, 'edicao-publico'), '')
  assert.equal(M.urlDaImagem(B, { bucket: 'logos', path: '' }, 'edicao-publico'), '')
})
