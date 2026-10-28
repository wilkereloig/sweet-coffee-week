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

// Dia sem linha = a unidade NÃO abre (23/10/2026). Só o período da edição diz onde o festival começa e termina.
test('estado do combo com o período da edição: dia sem linha DENTRO do festival é "sem combo hoje"; "fora do período" só fora dele', () => {
  const periodo = { inicio: '2026-11-05', fim: '2026-11-15' }
  const util = ['2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'] // fecha sábado e domingo
  const semFimDeSemana = { combo: { disponibilidade: util.map((data) => ({ data, abre: '10:00', fecha: '22:00' })) } }
  const dia = (d, h) => new Date(Date.UTC(2026, 10, d, h + 3, 0)) // horário de Natal = UTC−3
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(8, 15), periodo), { estado: 'sem_horario_hoje' }, 'domingo 8: dentro do festival, sem linha')
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(14, 15), periodo), { estado: 'sem_horario_hoje' }, 'sábado 14, depois do último dia com linha')
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(15, 15), periodo), { estado: 'sem_horario_hoje' }, 'domingo 15, o último dia do festival')
  assert.equal(M.textoEstado(M.estadoAgora(semFimDeSemana, dia(15, 15), periodo)), 'Sem combo hoje')
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(4, 15), periodo), { estado: 'fora_do_periodo' }, 'véspera')
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(16, 15), periodo), { estado: 'fora_do_periodo' }, 'dia seguinte ao festival')
  // dia com linha não muda com o período
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(9, 15), periodo), { estado: 'aberto', ate: '22:00' })
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(9, 8), periodo), { estado: 'abre_hoje', as: '10:00' })
  // sem o período (ou ilegível) o comportamento de antes: vale do primeiro ao último dia que a unidade cita
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(15, 15)), { estado: 'fora_do_periodo' })
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(8, 15)), { estado: 'sem_horario_hoje' })
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(15, 15), { inicio: '', fim: null }), { estado: 'fora_do_periodo' })
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(15, 15), { inicio: '2026-11-05' }), { estado: 'fora_do_periodo' }, 'período pela metade não vale')
  // o jsonb pode trazer a data com hora
  assert.deepEqual(M.estadoAgora(semFimDeSemana, dia(15, 15), { inicio: '2026-11-05T00:00:00', fim: '2026-11-15T00:00:00' }), { estado: 'sem_horario_hoje' })
})

test('texto do estado: horas como "20h", "22h30" e "meia-noite" (o horário passou a poder fechar à meia-noite)', () => {
  assert.equal(M.textoEstado({ estado: 'aberto', ate: '20:00' }), 'Combo disponível agora, até 20h')
  assert.equal(M.textoEstado({ estado: 'aberto', ate: '22:30' }), 'Combo disponível agora, até 22h30')
  assert.equal(M.textoEstado({ estado: 'aberto', ate: '24:00' }), 'Combo disponível agora, até meia-noite')
  assert.equal(M.textoEstado({ estado: 'abre_hoje', as: '09:00' }), 'Combo disponível hoje a partir das 9h')
  assert.equal(M.textoEstado({ estado: 'abre_hoje', as: '14:30' }), 'Combo disponível hoje a partir das 14h30')
  const noite = { combo: { disponibilidade: [{ data: '2026-11-09', abre: '18:00', fecha: '24:00' }] } }
  assert.deepEqual(M.estadoAgora(noite, new Date(Date.UTC(2026, 10, 10, 2, 59))), { estado: 'aberto', ate: '24:00' }, '23h59 em Natal: ainda aberto')
  assert.equal(M.textoEstado(M.estadoAgora(noite, new Date(Date.UTC(2026, 10, 10, 2, 59)))), 'Combo disponível agora, até meia-noite')
  assert.deepEqual(M.estadoAgora(noite, new Date(Date.UTC(2026, 10, 10, 3, 0))), { estado: 'fora_do_periodo' }, '0h do dia 10: já é outro dia')
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
  const f = { q: 'café', bairro: 'Tirol', modo: 'retirada', aberto: true, hoje: true, vegano: true, semAcucar: true, semGluten: true, semLactose: true }
  const s = M.buscaDosFiltros(f)
  assert.deepEqual(M.filtrosDaBusca(s), f)
  assert.equal(M.buscaDosFiltros({}), '')
  assert.deepEqual(M.filtrosDaBusca(''), { q: '', bairro: '', modo: '', aberto: false, hoje: false, vegano: false, semAcucar: false, semGluten: false, semLactose: false })
})

test('restrições do combo: sim só com todos os itens declarados; "não" só com declaração; o resto é não informado', () => {
  const item = (...a) => ({ alimentar: a.map(([aspecto, estado]) => ({ aspecto, estado })) })
  assert.equal(M.veredito(aurora.combo.itens, 'gluten'), 'nao', 'contém glúten em algum item')
  assert.equal(M.veredito(aurora.combo.itens, 'lactose'), 'nao', 'o doce declara lactose')
  assert.equal(M.veredito(aurora.combo.itens, 'vegano'), 'nao_informado')
  assert.equal(M.veredito(bico.combo.itens, 'gluten'), 'nao_informado', 'tudo não informado não vira "não"')
  assert.equal(M.veredito([item(['gluten', 'pode_conter'])], 'gluten'), 'nao', 'pode conter glúten não é sem glúten')
  assert.equal(M.veredito([item(['vegano', 'sim']), item(['vegano', 'sim'])], 'vegano'), 'sim')
  assert.equal(M.veredito([item(['vegano', 'sim']), item()], 'vegano'), 'nao_informado', 'um item calado tira o "sim"')
  assert.equal(M.veredito([item(['acucar_adicionado', 'nao'])], 'acucar'), 'sim')
  assert.equal(M.veredito([item(['leite', 'contem'])], 'lactose'), 'nao_informado', 'contém leite não responde lactose')
  assert.equal(M.veredito([], 'vegano'), 'nao_informado')
  assert.equal(M.veredito(aurora.combo.itens, 'inexistente'), 'nao_informado')
})

test('modo de atendimento da casa: sim por unidade, "não" só quando todas declararam', () => {
  assert.deepEqual(M.estadoModo(aurora, 'delivery').unidades.map((u) => u.id), ['udemo1'])
  assert.equal(M.estadoModo(aurora, 'delivery').estado, 'sim')
  assert.equal(M.estadoModo(bico, 'delivery').estado, 'nao')
  assert.equal(M.estadoModo(quadro, 'local').estado, 'nao_informado', 'unidade sem combo: não informado')
  assert.equal(M.estadoModo({ unidades: [] }, 'local').estado, 'nao_informado', 'sem unidade: não informado')
  const misto = { unidades: [{ id: 'a', combo: { modos: { retirada: 'nao' } } }, { id: 'b', combo: { modos: {} } }] }
  assert.deepEqual(M.estadoModo(misto, 'retirada'), { estado: 'nao_informado', unidades: [misto.unidades[1]] })
})

test('caixa de leitura e endereço: só exibição, sem número repetido', () => {
  assert.equal(M.caixaLegivel('COMBO K POP STAR'), 'Combo K Pop Star')
  assert.equal(M.caixaLegivel('O CHAMADO DO MAR'), 'O Chamado do Mar')
  assert.equal(M.caixaLegivel('Piquenique do pica pau'), 'Piquenique do pica pau', 'caixa mista fica como veio')
  assert.equal(M.caixaLegivel(''), '')
  assert.equal(M.caixaLegivel(null), '')
  const adocee = { logradouro: 'AV PRAIA DE PONTA NEGRA N 8880', numero: '8880', bairro: 'Ponta Negra', cidade: 'Natal' }
  assert.equal(M.ruaEmLinha(adocee), 'Av Praia de Ponta Negra, 8880')
  assert.equal(M.enderecoEmLinha(adocee), 'Av Praia de Ponta Negra, 8880 · Ponta Negra · Natal')
  assert.equal(M.ruaEmLinha({ logradouro: 'Rua Antônio China, 490', numero: '590' }), 'Rua Antônio China, 490, 590', 'número divergente não some')
  assert.equal(M.ruaEmLinha({ logradouro: 'Rua X, 12', numero: '12' }), 'Rua X, 12')
})

test('Como chegar: coordenada só quando conferida; aproximada usa o endereço', () => {
  const end = { logradouro: 'Rua Exemplo', numero: '10', bairro: 'Tirol', cidade: 'Natal', uf: 'RN' }
  assert.match(M.linkComoChegar({ endereco: end, coordenada: { lat: -5.8, lng: -35.2 } }), /destination=-5\.8%2C-35\.2$/)
  const aprox = M.linkComoChegar({ endereco: end, coordenada: { lat: -5.8, lng: -35.2, conferir: true, precisao: 'rua' } })
  assert.match(aprox, /destination=Rua%20Exemplo%2C%2010%2C%20Tirol%2C%20Natal%20-%20RN$/)
  assert.match(M.linkComoChegar({ coordenada: { lat: -5.8, lng: -35.2, conferir: true } }), /destination=-5\.8%2C-35\.2$/, 'sem endereço, vale a coordenada')
  assert.equal(M.linkComoChegar({}), '')
})

test('filtros novos: vegano, sem açúcar, com combo hoje e bairro sem diferença de caixa', () => {
  const casa = (slug, bairro, alimentar, disponibilidade = []) => ({
    slug, unidades: [{ endereco: { bairro }, combo: { modos: {}, disponibilidade } }],
    combo: { itens: [{ alimentar: alimentar.map(([aspecto, estado]) => ({ aspecto, estado })) }] },
  })
  const lista = [
    casa('a', 'Capim Macio', [['vegano', 'sim'], ['acucar_adicionado', 'nao']], [{ data: '2026-11-09', abre: '14:00', fecha: '20:00' }]),
    casa('b', 'Capim macio', [['vegano', 'nao']], [{ data: '2026-11-09', abre: '09:00', fecha: '12:00' }]),
    casa('c', 'Tirol', []),
  ]
  const o = M.opcoesFiltro(lista)
  assert.deepEqual(o.bairros, ['Capim Macio', 'Tirol'], 'uma opção por bairro')
  assert.equal(o.vegano, true)
  assert.equal(o.semAcucar, true)
  assert.equal(o.semGluten, false)
  assert.equal(o.hoje, false, 'sem período da edição, "hoje" não aparece')
  const periodo = { inicio: '2026-11-05', fim: '2026-11-15' }
  assert.equal(M.opcoesFiltro(lista, periodo, NOVE_NOV(10)).hoje, true)
  assert.equal(M.opcoesFiltro(lista, periodo, new Date(Date.UTC(2026, 9, 28, 15))).hoje, false, 'antes do festival, "hoje" não aparece')
  assert.deepEqual(M.filtrar(lista, { bairro: 'capim MACIO' }).map((p) => p.slug), ['a', 'b'])
  assert.deepEqual(M.filtrar(lista, { vegano: true }).map((p) => p.slug), ['a'])
  assert.deepEqual(M.filtrar(lista, { semAcucar: true }).map((p) => p.slug), ['a'])
  assert.deepEqual(M.filtrar(lista, { hoje: true }, NOVE_NOV(10)).map((p) => p.slug), ['a', 'b'], '10h: a abre mais tarde, b está aberta')
  assert.deepEqual(M.filtrar(lista, { hoje: true }, NOVE_NOV(13)).map((p) => p.slug), ['a'], '13h: b já fechou por hoje')
  assert.equal(M.hojeEmNatal(new Date(Date.UTC(2026, 10, 10, 2, 59))), '2026-11-09', '23h59 em Natal ainda é dia 9')
  assert.equal(M.dentroDoFestival(null), false)
})

test('formatos e links', () => {
  assert.equal(M.formatarPreco(38.9), 'R$ 38,90')
  assert.equal(M.formatarPreco(null), '')
  assert.equal(M.formatarDia('2026-11-05'), 'qui 5/11')
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
