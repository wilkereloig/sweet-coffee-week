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
  const f = { q: 'café', bairro: 'Tirol', modo: 'retirada', aberto: true, hoje: true, vegano: true, vegetariano: true, semAcucar: true, semGluten: true, semLactose: true }
  const s = M.buscaDosFiltros(f)
  assert.deepEqual(M.filtrosDaBusca(s), f)
  assert.equal(M.buscaDosFiltros({}), '')
  assert.deepEqual(M.filtrosDaBusca(''), { q: '', bairro: '', modo: '', aberto: false, hoje: false, vegano: false, vegetariano: false, semAcucar: false, semGluten: false, semLactose: false })
})

test('vegetariano: doce e salgado, direto ou por troca; bebida não conta; só um dos dois não basta', () => {
  const veg = (tipo, estado = 'sim', ...trocas) => ({
    tipo, alimentar: estado ? [{ aspecto: 'vegetariano', estado }] : [],
    substituicoes: trocas.map((t) => ({ alternativa: 'troca', alimentar: t ? [{ aspecto: 'vegetariano', estado: t }] : [] })),
  })
  const bebida = veg('bebida', 'nao')
  assert.equal(M.opcaoVegetariana([veg('doce'), veg('salgado'), bebida]), 'direto', 'bebida não vegetariana não tira')
  assert.equal(M.opcaoVegetariana([veg('doce'), veg('salgado', 'nao', 'sim')]), 'troca', 'salgado só vegetariano na troca')
  assert.equal(M.opcaoVegetariana([veg('doce', null, 'sim'), veg('salgado', 'nao', 'sim')]), 'troca')
  assert.equal(M.opcaoVegetariana([veg('doce'), veg('salgado', 'nao')]), 'nao', 'doce vegetariano e salgado não: fora')
  assert.equal(M.opcaoVegetariana([veg('doce', 'nao'), veg('salgado')]), 'nao', 'salgado vegetariano e doce não: fora')
  assert.equal(M.opcaoVegetariana([veg('doce'), veg('salgado', null)]), 'nao', 'não informado não vale')
  assert.equal(M.opcaoVegetariana([veg('doce'), veg('salgado', 'nao', 'nao')]), 'nao', 'troca declarada "não" não vale')
  assert.equal(M.opcaoVegetariana([veg('doce'), veg('salgado', 'nao', null)]), 'nao', 'troca sem declaração não vale')
  assert.equal(M.opcaoVegetariana([veg('doce')]), 'nao', 'falta o salgado')
  assert.equal(M.opcaoVegetariana([]), 'nao')
  const casa = (slug, itens) => ({ slug, casa: { nome: slug }, unidades: [], combo: { itens } })
  const lista = [casa('a', [veg('doce'), veg('salgado')]), casa('b', [veg('doce'), veg('salgado', 'nao', 'sim')]), casa('c', [veg('doce'), veg('salgado', 'nao')])]
  assert.deepEqual(M.filtrar(lista, { vegetariano: true }).map((p) => p.slug), ['a', 'b'])
  assert.equal(M.opcoesFiltro(lista).vegetariano, true)
  assert.equal(M.opcoesFiltro([lista[2]]).vegetariano, false, 'sem casa vegetariana o filtro não aparece')
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
  assert.equal(M.caixaLegivel('PAVLOVA da ALEGRIA'), 'Pavlova da Alegria', 'conectivo minúsculo não decide a caixa')
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

test('Entrada: período da edição para a placa, abertura da avaliação e bairros com contagem de casas', () => {
  assert.deepEqual(M.periodoDaEdicao({ inicio: '2026-11-05', fim: '2026-11-15' }), { texto: '5 a 15 de novembro', numero: '5 a 15', rotulo: 'de novembro' })
  assert.deepEqual(M.periodoDaEdicao({ inicio: '2026-10-30', fim: '2026-11-02' }), { texto: '30 de outubro a 2 de novembro', numero: '30 de outubro a 2', rotulo: 'de novembro' })
  assert.equal(M.periodoDaEdicao({ inicio: '2026-11-05', fim: '2026-11-05' }).numero, '5')
  assert.equal(M.periodoDaEdicao(null, '5 a 15 de novembro').numero, '5 a 15', 'sem datas, vale a reserva')
  assert.equal(M.periodoDaEdicao({ inicio: 'x' }), null)

  assert.equal(M.aberturaDaAvaliacao({ edicao: { inicio: '2026-11-05' }, avaliacao: { abre_em: null } }), 'em 5 de novembro')
  assert.equal(M.aberturaDaAvaliacao({ edicao: { inicio: '2026-11-05' }, avaliacao: { abre_em: '2026-11-07T00:00:00-03:00' } }), 'em 7 de novembro')
  assert.equal(M.aberturaDaAvaliacao({}), '')

  const casa = (slug, ...bairros) => ({ slug, unidades: bairros.map((bairro) => ({ endereco: { bairro } })) })
  const lista = [casa('a', 'Capim Macio', 'Capim macio'), casa('b', 'capim macio', 'Tirol'), casa('c', 'Tirol'), casa('d', 'Alecrim'), casa('e', '')]
  assert.deepEqual(M.contarBairros(lista), [{ bairro: 'Capim Macio', casas: 2 }, { bairro: 'Tirol', casas: 2 }, { bairro: 'Alecrim', casas: 1 }])
  assert.deepEqual(M.opcoesFiltro(lista).bairros, ['Alecrim', 'Capim Macio', 'Tirol'])
})

test('Mapa: uma linha por unidade; bairro e "aberto agora" valem para a unidade; quero ir e já fui do painel', () => {
  const agora = new Date('2026-11-06T15:00:00-03:00')
  const periodo = { inicio: '2026-11-05', fim: '2026-11-15' }
  const lista = [
    { slug: 'a', casa: { nome: 'Casa A' }, unidades: [
      { id: 'u00000a', endereco: { bairro: 'Tirol' }, coordenada: { lat: -5.80, lng: -35.20 }, combo: { disponibilidade: [{ data: '2026-11-06', abre: '14:00', fecha: '18:00' }] } },
      { id: 'u00000b', endereco: { bairro: 'capim macio' }, coordenada: { lat: -5.86, lng: -35.19, conferir: true } }] },
    { slug: 'b', casa: { nome: 'Casa B' }, unidades: [{ id: 'u00000c', endereco: { bairro: 'Capim Macio' } }] },
  ]
  const ids = (linhas) => linhas.map((x) => x.u.id)
  assert.deepEqual(ids(M.unidadesDoMapa(lista)), ['u00000b', 'u00000c', 'u00000a'], 'sem posição: por bairro, depois casa')
  // O filtro do bairro leva só a unidade daquele bairro, sem diferença de caixa (contrato da Entrada: ?bairro=).
  assert.deepEqual(ids(M.unidadesDoMapa(lista, { bairro: 'Capim Macio' })), ['u00000b', 'u00000c'])
  assert.deepEqual(ids(M.unidadesDoMapa(lista, { aberto: true }, {}, { agora, periodo })), ['u00000a'])
  const marcas = { rota: ['u00000c'], foi: (p) => p.slug === 'a' }
  assert.deepEqual(ids(M.unidadesDoMapa(lista, { queroIr: true }, marcas)), ['u00000c'])
  // "Já fui" é da casa: a outra unidade da Casa A também aparece como visitada.
  assert.deepEqual(ids(M.unidadesDoMapa(lista, { jaFui: true }, marcas)), ['u00000b', 'u00000a'])
  assert.deepEqual(ids(M.unidadesDoMapa(lista, { q: 'casa b' })), ['u00000c'])
  // Com posição: mais perto primeiro, sem coordenada no fim; distância em linha reta.
  const perto = M.unidadesDoMapa(lista, {}, {}, { posicao: { lat: -5.80, lng: -35.201 } })
  assert.deepEqual(ids(perto), ['u00000a', 'u00000b', 'u00000c'])
  assert.ok(perto[0].dist < 0.2 && perto[2].dist === null)
  assert.equal(M.tituloDaUnidade({ casa: { nome: 'Boldfood' } }, { nome: 'BOLDFOOD' }), 'Boldfood')
  assert.equal(M.tituloDaUnidade({ casa: { nome: 'Caroli' } }, { nome: 'Midway' }), 'Caroli · Midway')
  assert.equal(M.tituloDaUnidade({ casa: { nome: 'Caroli' } }, {}), 'Caroli')
  assert.ok(Math.abs(M.km({ lat: -5.8, lng: -35.2 }, { lat: -5.9, lng: -35.2 }) - 11.1) < 0.1)
})

test('atalho de delivery do topo: link direto só sem dúvida de unidade; com várias unidades e canais diferentes, a pessoa escolhe', () => {
  const un = (id, delivery, links = []) => ({ id, combo: { modos: { delivery }, canais: links.map((link) => ({ tipo: 'whatsapp', link })) } })
  const casa = (...unidades) => ({ unidades })
  // uma só unidade entrega: o 1º canal que ela cadastrou
  assert.deepEqual(M.destinoDelivery(casa(un('a', 'sim', ['https://wa.me/1', 'https://ifood.com/x']))), { tipo: 'link', link: 'https://wa.me/1' })
  // várias entregam, cada uma com o seu canal: o link de uma não vale para as outras
  assert.deepEqual(M.destinoDelivery(casa(un('a', 'sim', ['https://wa.me/1']), un('b', 'sim', ['https://wa.me/2']))), { tipo: 'escolher' })
  // várias entregam e todas usam o mesmo link: direto
  assert.deepEqual(M.destinoDelivery(casa(un('a', 'sim', [' https://wa.me/1 ']), un('b', 'sim', ['https://wa.me/1']))), { tipo: 'link', link: 'https://wa.me/1' })
  // só uma das que entregam tem canal: a outra ficaria sem destino, a pessoa escolhe
  assert.deepEqual(M.destinoDelivery(casa(un('a', 'sim', ['https://wa.me/1']), un('b', 'sim'))), { tipo: 'escolher' })
  // unidade que NÃO entrega não conta, mesmo com canal gravado (a Demo Aurora: Centro entrega, Sul não)
  assert.deepEqual(M.destinoDelivery(casa(un('a', 'sim', ['https://wa.me/1']), un('b', 'nao', ['https://wa.me/2']))), { tipo: 'link', link: 'https://wa.me/1' })
  assert.deepEqual(M.destinoDelivery(aurora), { tipo: 'link', link: 'https://wa.me/5584900000000' })
  // link que não é http(s) nunca vira destino; sem canal utilizável, "Como pedir" explica
  assert.deepEqual(M.destinoDelivery(casa(un('a', 'sim', ['javascript:alert(1)', 'wa.me/sem-esquema']))), { tipo: 'info' })
  // ninguém declarou delivery "sim": as unidades "em branco" não são unidades que entregam
  assert.deepEqual(M.destinoDelivery(casa(un('a', 'nao_informado', ['https://wa.me/1']))), { tipo: 'info' })
  assert.deepEqual(M.destinoDelivery({}), { tipo: 'info' })
  assert.deepEqual(M.canaisSeguros(un('a', 'sim', ['https://x.com', 'ftp://x', ''])).map((c) => c.link), ['https://x.com'])
})

test('alertas do combo: "contém" e "pode conter" sem repetir, e o "outro alergênico" da casa entra', () => {
  const item = (...alimentar) => ({ alimentar })
  const c = (aspecto) => ({ aspecto, estado: 'contem' })
  const pc = (aspecto) => ({ aspecto, estado: 'pode_conter' })
  const nao = (aspecto) => ({ aspecto, estado: 'nao_contem' })
  const itens = [item(c('gluten'), pc('amendoim'), pc('leite')), item(c('leite'), pc('soja'), nao('ovo'))]
  assert.equal(M.fraseAlerta(itens), 'Contém glúten e leite')
  // leite está em "contém" no 2º item: não repete em "pode conter"
  assert.equal(M.frasePodeConter(itens), 'Pode conter amendoim e soja')
  assert.equal(M.frasePodeConter([item(nao('ovo'))]), '')
  // ausência de declaração não é "não contém" nem "pode conter"
  assert.equal(M.fraseAlerta([item()]), '')
  assert.equal(M.frasePodeConter([item()]), '')
  // o alergênico escrito pela casa aparece depois do catálogo
  const outro = item(c('ovo'), { aspecto: 'outro_alergenico', estado: 'contem', observacao: 'gergelim' })
  assert.equal(M.fraseAlerta([outro]), 'Contém ovo e gergelim')
  assert.equal(M.frasePodeConter([item({ aspecto: 'outro_alergenico', estado: 'pode_conter', observacao: 'gergelim' })]), 'Pode conter gergelim')
  // a demonstração segue como era
  assert.equal(M.frasePodeConter(aurora.combo.itens), 'Pode conter amendoim')
})

test('observação da unidade: "Nada" e afins não viram aviso na ficha; texto de verdade passa', () => {
  for (const vazio of ['Nada', ' nada ', 'NENHUMA', 'Não', 'não tem', 'n/a', 'NA', '-', '—', '...', 'Sem observação', '', null, undefined]) assert.equal(M.observacaoUtil(vazio), '', String(vazio))
  assert.equal(M.observacaoUtil('Nesta unidade a bebida é servida gelada.'), 'Nesta unidade a bebida é servida gelada.')
  assert.equal(M.observacaoUtil('  Não aceita cartão  '), 'Não aceita cartão')
  assert.equal(M.observacaoUtil('Nada de glúten no recheio'), 'Nada de glúten no recheio')
})

test('precoGeral só existe quando todos os combos declaram o mesmo valor', () => {
  const c = (preco) => ({ combo: { preco } })
  assert.equal(M.precoGeral([c(38.9), c('38.90'), { combo: null }]), '38.9')
  assert.equal(M.precoGeral([c(38.9), c(42)]), null, 'valores diferentes: sem preço geral')
  assert.equal(M.precoGeral([{ combo: {} }, { combo: null }]), null)
  assert.equal(M.precoGeral(undefined), null)
})

// Vitrine "Nosso elenco": casas com o combo disponível agora (mesma regra do Mapa: estadoAgora, por unidade).
test('casasPorMomento: aberta, fechada, sem horário, várias unidades e fora do festival', () => {
  const periodo = { inicio: '2026-11-05', fim: '2026-11-15' }
  const dia = (abre, fecha) => [{ data: '2026-11-09', abre, fecha }]
  const un = (id, disponibilidade) => ({ id, combo: disponibilidade ? { disponibilidade } : { modos: {} } })
  const casa = (slug, ...unidades) => ({ slug, casa: { nome: slug }, unidades })
  const lista = [
    casa('aberta', un('a1', dia('10:00', '20:00'))),
    casa('fechada', un('f1', dia('08:00', '12:00'))), // já encerrou às 15h
    casa('abre-depois', un('d1', dia('17:00', '22:00'))),
    casa('sem-horario', un('s1', null)),
    casa('duas', un('u1', dia('08:00', '12:00')), un('u2', dia('14:00', '23:00'))), // só a 2ª unidade atende
    casa('sem-unidade'),
  ]
  const m = M.casasPorMomento(lista, NOVE_NOV(15), periodo)
  assert.equal(m.noFestival, true)
  assert.equal(m.comHorario, true)
  assert.deepEqual(m.abertas.map((x) => x.p.slug).sort(), ['aberta', 'duas'])
  assert.equal(m.abertas.find((x) => x.p.slug === 'duas').ate, '23:00')
  assert.deepEqual(m.abremHoje.map((x) => [x.p.slug, x.as]), [['abre-depois', '17:00']])
  const todos = [...m.abertas, ...m.abremHoje].map((x) => x.p.slug)
  assert.ok(!todos.includes('fechada') && !todos.includes('sem-horario') && !todos.includes('sem-unidade'), 'fechada e sem horário nunca entram')
  // Antes e depois do festival: nenhuma promessa de disponibilidade.
  for (const fora of [new Date(Date.UTC(2026, 10, 4, 15)), new Date(Date.UTC(2026, 10, 16, 15))]) {
    const f = M.casasPorMomento(lista, fora, periodo)
    assert.deepEqual([f.noFestival, f.abertas.length, f.abremHoje.length], [false, 0, 0])
  }
  assert.equal(M.casasPorMomento(lista, NOVE_NOV(15), null).noFestival, false, 'sem período da edição não há festival para afirmar')
})

test('casasPorMomento: horário que passa muda o resultado; sem horário nenhum não vira "nenhuma aberta"', () => {
  const periodo = { inicio: '2026-11-05', fim: '2026-11-15' }
  const casa = { slug: 'x', casa: { nome: 'x' }, unidades: [{ id: 'x1', combo: { disponibilidade: [{ data: '2026-11-09', abre: '14:00', fecha: '15:00' }] } }] }
  assert.equal(M.casasPorMomento([casa], NOVE_NOV(13, 59), periodo).abertas.length, 0)
  assert.equal(M.casasPorMomento([casa], NOVE_NOV(13, 59), periodo).abremHoje.length, 1)
  assert.equal(M.casasPorMomento([casa], NOVE_NOV(14, 0), periodo).abertas.length, 1)
  assert.equal(M.casasPorMomento([casa], NOVE_NOV(15, 0), periodo).abertas.length, 0, 'fecha às 15h em ponto')
  const sem = M.casasPorMomento([{ slug: 'y', casa: { nome: 'y' }, unidades: [{ id: 'y1' }] }], NOVE_NOV(15), periodo)
  assert.deepEqual([sem.comHorario, sem.abertas.length, sem.abremHoje.length], [false, 0, 0])
})

test('o nome da unidade não repete o da casa (Mr. Cupcake · Mr. Cupcake - Garden)', () => {
  const mr = { casa: { nome: 'Mr. Cupcake Confeitaria' } }
  assert.equal(M.tituloDaUnidade(mr, { nome: 'Mr. Cupcake - Garden - Candelária' }), 'Mr. Cupcake Confeitaria · Garden - Candelária')
  assert.equal(M.tituloDaUnidade(mr, { nome: 'Mr. Cupcake - Satélite - Shopping Del Mar' }), 'Mr. Cupcake Confeitaria · Satélite - Shopping Del Mar')
  assert.equal(M.nomeDaUnidade(mr, { nome: 'Mr. Cupcake Confeitaria - Garden' }), 'Garden')
  assert.equal(M.tituloDaUnidade(mr, { nome: 'Mr. Cupcake Confeitaria' }), 'Mr. Cupcake Confeitaria', 'só o nome da casa: não repete')
  assert.equal(M.tituloDaUnidade({ casa: { nome: 'Caroli Douces' } }, { nome: 'Caroli - Lagoa Seca' }), 'Caroli Douces · Lagoa Seca')
  assert.equal(M.tituloDaUnidade({ casa: { nome: 'Mangai' } }, { nome: 'Midway Mall' }), 'Mangai · Midway Mall', 'nome sem relação com a casa fica como veio')
  assert.equal(M.nomeDaUnidade({ casa: { nome: 'Mangai' } }, {}), '')
})

test('"só delivery" exige delivery sim e consumo no local e retirada declarados não; nao_informado não conta', () => {
  const u = (modos) => ({ combo: { modos } })
  assert.equal(M.soDelivery(u({ local: 'nao', delivery: 'sim', retirada: 'nao' })), true)
  assert.equal(M.soDelivery(u({ local: 'sim', delivery: 'sim', retirada: 'nao' })), false)
  assert.equal(M.soDelivery(u({ local: 'nao', delivery: 'sim', retirada: 'sim' })), false)
  assert.equal(M.soDelivery(u({ local: 'nao_informado', delivery: 'sim', retirada: 'nao' })), false, 'sem resposta não vira "só delivery"')
  assert.equal(M.soDelivery(u({ delivery: 'sim' })), false)
  assert.equal(M.soDelivery(u({ local: 'nao', delivery: 'nao', retirada: 'nao' })), false)
  assert.equal(M.soDelivery({}), false)
})

test('casa só delivery não entra em "mais perto de você" nem na sugestão de visita', async () => {
  const { casasMaisPerto } = await import('../src/edicao/caca/mapa/casasPerto.js')
  const { sugerirProximaCasa } = await import('../src/edicao/caca/mapa/proximidade.js')
  const coordenada = { lat: -5.8, lng: -35.2 }
  const unid = (id, modos) => ({ id, nome: '', coordenada, endereco: { bairro: 'Tirol' }, combo: { modos } })
  const casa = (slug, modos) => ({ slug, casa: { nome: slug }, combo: { nome: 'Combo' }, unidades: [unid(`u-${slug}`, modos)] })
  const aqui = casa('aqui', { local: 'sim', delivery: 'nao', retirada: 'nao' })
  const entrega = casa('entrega', { local: 'nao', delivery: 'sim', retirada: 'nao' })
  const linhas = [aqui, entrega].map((p) => ({ p, u: p.unidades[0], dist: p === aqui ? 2 : 0.5 }))
  assert.deepEqual(casasMaisPerto(linhas).itens.map((x) => x.p.slug), ['aqui'], 'a mais perto é só delivery e fica de fora')
  const s = sugerirProximaCasa({ posicao: { lat: -5.8, lng: -35.2, precisao: 20 }, lista: [entrega, aqui], estadoDe: () => null })
  assert.equal(s.slug, 'aqui', 'a sugestão também pula a casa só delivery')
})

