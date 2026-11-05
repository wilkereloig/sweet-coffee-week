// Caça aos Carimbos — o mapa (src/edicao/caca/mapa/*; docs/cartoon-2026-2/15-caca-especificacao.md §10–§11).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  estadoDaCasa, revisitasDaCasa, casasDoMapa, progressoPessoal, ordemDasCasas, proximoPasso, novasConquistas, fotografia,
  arteLiberada, filtrarPorEstado, coberturaDoMapa, distanciasPorCasa,
} from '../src/edicao/caca/mapa/estados.js'
import {
  AGENCIAS_SICREDI, agenciasSicredi, pontosSicredi, linkComoChegarSicredi, ehSicredi, agenciaCombina,
} from '../src/edicao/caca/mapa/sicredi.js'
import { contarFiltros, casasEEnderecos, enderecosDaCasa } from '../src/edicao/caca/mapa/tela.js'
import { ESTADO_TEXTO, MAPA_CACA as T, distanciaCurta } from '../src/edicao/caca/mapa/textos.js'
import { IMAGENS_ESTADO, IMAGEM_REVISITA } from '../src/edicao/caca/mapa/imagens.js'
import { mundoEdicao, iconeEdicao } from '../src/data/imageLibrary.js'

const PUB = fileURLToPath(new URL('../public/', import.meta.url))
const noDisco = (src) => existsSync(join(PUB, src.replace(/^\//, '')))

const mapa = {
  total_casas: 4, casas_validadas: 1, extras: 2, faltam: 3,
  casas: [
    { slug: 'a', carimbos: 3, avaliou: true, estado: 'validada', extras: 2 },
    { slug: 'b', carimbos: 1, avaliou: false, estado: 'pendente', extras: 0 },
  ],
}

test('estado da casa vem do servidor: validada, pendente ou não visitada', () => {
  assert.equal(estadoDaCasa(undefined), 'nao-visitada')
  assert.equal(estadoDaCasa({ estado: 'validada' }), 'conquistada')
  assert.equal(estadoDaCasa({ estado: 'pendente', carimbos: 1 }), 'pendente')
  // leitura antiga, sem `estado`
  assert.equal(estadoDaCasa({ carimbos: 2, avaliou: true }), 'conquistada')
  assert.equal(estadoDaCasa({ carimbos: 1, avaliou: false }), 'pendente')
  assert.equal(estadoDaCasa({ carimbos: 0 }), 'nao-visitada')
})

test('revisitas: só casa conquistada tem; usa `extras` do servidor; sem ele, carimbos − 1', () => {
  assert.equal(revisitasDaCasa({ estado: 'validada', carimbos: 5, extras: 2 }), 2)
  assert.equal(revisitasDaCasa({ estado: 'validada', carimbos: 1, extras: 0 }), 0)
  assert.equal(revisitasDaCasa({ carimbos: 4, avaliou: true }), 3)
  assert.equal(revisitasDaCasa({ estado: 'pendente', carimbos: 3, extras: 2 }), 0, 'pendente não acumula revisita')
  assert.equal(revisitasDaCasa(undefined), 0)
  assert.equal(revisitasDaCasa({ estado: 'validada', extras: -3 }), 0)
})

test('progresso pessoal: X de N com o total do servidor, nunca passa de N e nada é escrito à mão', () => {
  assert.deepEqual(progressoPessoal(mapa, 99), { total: 4, feitas: 1, pendentes: 1, extras: 2, completo: false })
  assert.equal(progressoPessoal(null, 27).total, 27, 'sem resposta do servidor, vale o total da edição')
  assert.equal(progressoPessoal({ total_casas: 3, casas_validadas: 9 }).feitas, 3)
  assert.equal(progressoPessoal({ total_casas: 3, casas_validadas: 3 }).completo, true)
  assert.equal(progressoPessoal({}).completo, false)
  assert.equal(progressoPessoal({ total_casas: 'x', casas_validadas: -1 }, 0).feitas, 0)
})

test('casas do mapa: slug → casa; sem mapa não há estado', () => {
  assert.equal(casasDoMapa(null), null)
  assert.equal(casasDoMapa({}), null)
  const m = casasDoMapa(mapa)
  assert.equal(m.get('a').estado, 'validada')
  assert.equal(casasDoMapa({ casas: [null, { slug: 1 }, { slug: 'z' }] }).size, 1)
})

test('próximo passo: avaliar vence rota, rota vence caminho, e cada caso tem o seu', () => {
  const casas = casasDoMapa(mapa)
  const ordem = ['d', 'c', 'b', 'a']
  assert.deepEqual(proximoPasso({ mapa, casas, ordem, paradas: ['c'] }), { tipo: 'avaliar', slug: 'b' })
  const semPendente = { ...mapa, casas: [mapa.casas[0]] }
  const c2 = casasDoMapa(semPendente)
  assert.deepEqual(proximoPasso({ mapa: semPendente, casas: c2, ordem, paradas: ['a', 'c', 'd'] }), { tipo: 'rota', slug: 'c' }, 'a casa já conquistada na rota é pulada')
  assert.deepEqual(proximoPasso({ mapa: semPendente, casas: c2, ordem, paradas: [] }), { tipo: 'visitar', slug: 'd' })
  assert.deepEqual(proximoPasso({ mapa: null, casas: null, ordem }), { tipo: 'criar-mapa' })
  const tudo = casasDoMapa({ casas: ordem.map((slug) => ({ slug, estado: 'validada' })) })
  assert.deepEqual(proximoPasso({ mapa: {}, casas: tudo, ordem }), { tipo: 'completo' })
  assert.deepEqual(proximoPasso({ mapa: {}, casas: casasDoMapa({ casas: [] }), ordem: [] }), { tipo: 'nenhum' })
})

test('próximo passo sem objetivo: a casa não visitada mais perto do celular; a seguinte quando essa é validada', () => {
  const lista = [
    { slug: 'longe', unidades: [{ coordenada: { lat: -5.80, lng: -35.20 } }] },
    { slug: 'perto', unidades: [{ coordenada: { lat: -5.7945, lng: -35.2110 } }, { coordenada: { lat: -5.90, lng: -35.30 } }] },
    { slug: 'meio', unidades: [{ coordenada: { lat: -5.7960, lng: -35.2000 } }] },
    { slug: 'sem-ponto', unidades: [{}] },
  ]
  const ordem = ['sem-ponto', 'longe', 'meio', 'perto']
  const eu = { lat: -5.7945, lng: -35.2100 }
  const d = distanciasPorCasa(lista, eu)
  assert.deepEqual([...d.keys()].sort(), ['longe', 'meio', 'perto'], 'casa sem coordenada fica fora; várias unidades valem pela mais perto')
  assert.ok(d.get('perto') < 0.2 && d.get('perto') < d.get('meio') && d.get('meio') < d.get('longe'))
  assert.equal(distanciasPorCasa(lista, null).size, 0)
  assert.equal(distanciasPorCasa(lista, { lat: NaN, lng: 1 }).size, 0)
  const sem = casasDoMapa({ casas: [] })
  const p1 = proximoPasso({ mapa: {}, casas: sem, ordem, distancias: d })
  assert.equal(p1.tipo, 'visitar'); assert.equal(p1.slug, 'perto'); assert.equal(p1.km, d.get('perto'))
  const feita = casasDoMapa({ casas: [{ slug: 'perto', estado: 'validada' }] })
  assert.equal(proximoPasso({ mapa: {}, casas: feita, ordem, distancias: d }).slug, 'meio', 'validou a mais perto: vai para a segunda')
  const duas = casasDoMapa({ casas: [{ slug: 'perto', estado: 'validada' }, { slug: 'meio', estado: 'validada' }] })
  assert.equal(proximoPasso({ mapa: {}, casas: duas, ordem, distancias: d }).slug, 'longe')
  // sem posição (negada/desligada): a ordem do mapa, sem distância
  assert.deepEqual(proximoPasso({ mapa: {}, casas: sem, ordem, distancias: new Map() }), { tipo: 'visitar', slug: 'sem-ponto' })
  assert.deepEqual(proximoPasso({ mapa: {}, casas: sem, ordem }), { tipo: 'visitar', slug: 'sem-ponto' })
  // objetivo marcado vence a distância: avaliar e rota continuam na frente
  const pend = casasDoMapa({ casas: [{ slug: 'longe', estado: 'pendente' }] })
  assert.deepEqual(proximoPasso({ mapa: {}, casas: pend, ordem, distancias: d }), { tipo: 'avaliar', slug: 'longe' })
  assert.deepEqual(proximoPasso({ mapa: {}, casas: sem, ordem, paradas: ['longe'], distancias: d }), { tipo: 'rota', slug: 'longe' })
  // todas as visitáveis validadas: completo, com ou sem distância
  const tudo = casasDoMapa({ casas: ordem.map((slug) => ({ slug, estado: 'validada' })) })
  assert.deepEqual(proximoPasso({ mapa: {}, casas: tudo, ordem, distancias: d }), { tipo: 'completo' })
})

test('textos do próximo passo: distância curta e dica de localização', () => {
  assert.equal(distanciaCurta(0.35), 'a 350 m')
  assert.equal(distanciaCurta(0.004), 'a 10 m')
  assert.equal(distanciaCurta(1.24), 'a 1,2 km')
  assert.equal(T.proximoAcao.visitar('Diva do Café', 0.35), 'Conhecer Diva do Café · a 350 m')
  assert.equal(T.proximoAcao.visitar('Diva do Café'), 'Conhecer Diva do Café')
  assert.match(T.proximo.visitar('Diva do Café', 1.24), /mais perto de você, a 1,2 km/)
  assert.match(T.proximo.visitar('Diva do Café'), /próxima casa do caminho/)
  assert.ok(T.pertoDica.disponivel && T.pertoDica.negada && !T.pertoDica.indisponivel)
})

test('a assinatura do Sicredi abre a ficha da casa (só no site) e o Mapa, e não é fixa', () => {
  const src = (f) => readFileSync(fileURLToPath(new URL(`../src/edicao/${f}`, import.meta.url)), 'utf8')
  const ficha = src('cartoon/paginas/participante/index.jsx')
  assert.match(ficha, /\{navigate && <AssinaturaPatrocinio \/>\}/, 'na ficha só com navigate: a prévia do painel não leva patrocinador')
  assert.ok(ficha.indexOf('<AssinaturaPatrocinio />') < ficha.indexOf('<Topo '), 'a assinatura vem antes do topo da ficha')
  assert.match(src('cartoon/paginas/mapa/index.jsx'), /<AssinaturaPatrocinio \/>/)
  const css = readFileSync(fileURLToPath(new URL('../src/styles/cartoon/01-base.css', import.meta.url)), 'utf8')
  assert.doesNotMatch(css.match(/\.ct-assina-patrocinio \{[^}]*\}/)[0], /position: (fixed|sticky)/, 'não é fixa na tela (manual da Sicredi)')
})

test('próximo passo ignora casa sem unidade (não há o que visitar)', () => {
  const casas = casasDoMapa({ casas: [] })
  assert.deepEqual(proximoPasso({ mapa: {}, casas, ordem: ['sem', 'com'], visitaveis: ['com'] }), { tipo: 'visitar', slug: 'com' })
  assert.deepEqual(proximoPasso({ mapa: {}, casas, ordem: ['sem'], paradas: ['sem'], visitaveis: [] }), { tipo: 'nenhum' })
})

test('ordem das casas: de cima para baixo no desenho (norte → sul); sem lugar na arte vai para o fim, na ordem da lista', () => {
  const lista = [
    { slug: 'x', unidades: [{ id: 'u1' }] }, { slug: 'y', unidades: [{ id: 'u2' }, { id: 'u3' }] },
    { slug: 'sem', unidades: [] }, { slug: 'z', unidades: [{ id: 'u4' }] },
  ]
  const unidades = { u1: { y: 0.6 }, u2: { y: 0.9 }, u3: { y: 0.2 }, u4: { y: 0.1 } }
  assert.deepEqual(ordemDasCasas(lista, unidades), ['z', 'y', 'x', 'sem'], 'a casa leva a posição MAIS ao norte entre as unidades dela')
})

test('conquista nova: só o que virou conquistada desde a última visita; primeira visita não faz festa', () => {
  const agora = casasDoMapa({ casas: [{ slug: 'a', estado: 'validada' }, { slug: 'b', estado: 'validada' }, { slug: 'c', estado: 'pendente' }] })
  assert.deepEqual(novasConquistas(null, agora), [], 'sem fotografia anterior: nada de festa')
  assert.deepEqual(novasConquistas({ a: 'conquistada', b: 'pendente', c: 'nao-visitada' }, agora), ['b'])
  assert.deepEqual(novasConquistas({}, agora), ['a', 'b'])
  assert.deepEqual(novasConquistas({ a: 'conquistada' }, null), [])
  assert.deepEqual(fotografia(agora), { a: 'conquistada', b: 'conquistada', c: 'pendente' })
  assert.deepEqual(fotografia(null), {})
})

test('a arte ilustrada só é liberada aprovada, ou no DEV como prévia (nunca em silêncio)', () => {
  assert.equal(arteLiberada({ aprovada: true, dev: false }), true)
  assert.equal(arteLiberada({ aprovada: false, dev: false }), false)
  assert.equal(arteLiberada({ aprovada: false, dev: true }), true)
  assert.equal(arteLiberada({ aprovada: 'true', dev: false }), false, 'só o booleano true aprova')
  assert.equal(arteLiberada({}), false)
  // Desde 05/11 a arte é a final do Illustrator (15-caca-mapa-final.md): aprovar nunca é em silêncio — a arte aprovada diz de onde veio,
  // quando foi salva e quem aprovou. Reverter: `mapa-mundo-final.py --provisoria` (só o selo) ou `mapa-mundo.py` (volta à provisória).
  const m = mundoEdicao()
  assert.equal(typeof m.aprovada, 'boolean')
  if (m.aprovada) assert.ok(m.arte?.fonte && m.arte?.salvoEm && m.arte?.aprovacao, 'arte aprovada sem origem, data e aprovação registradas')
})

test('filtro por estado: usa o estado do servidor; sem mapa não filtra nada', () => {
  const casas = casasDoMapa(mapa)
  const linhas = ['a', 'b', 'c'].map((slug) => ({ p: { slug } }))
  assert.deepEqual(filtrarPorEstado(linhas, 'conquistada', casas).map((x) => x.p.slug), ['a'])
  assert.deepEqual(filtrarPorEstado(linhas, 'pendente', casas).map((x) => x.p.slug), ['b'])
  assert.deepEqual(filtrarPorEstado(linhas, 'nao-visitada', casas).map((x) => x.p.slug), ['c'])
  assert.equal(filtrarPorEstado(linhas, 'pendente', null), linhas)
  assert.equal(filtrarPorEstado(linhas, '', casas), linhas)
})

test('cobertura do mapa real: conferida, aproximada e sem localização', () => {
  const us = [{ coordenada: { lat: 1, lng: 2 } }, { coordenada: { lat: 1, lng: 2, conferir: true } }, {}, { coordenada: null }]
  assert.deepEqual(coberturaDoMapa(us), { conferidas: 1, aproximadas: 1, sem: 2, total: 4 })
  assert.equal(T.cobertura({ conferidas: 1, aproximadas: 0, sem: 0 }), '1 unidade com localização conferida')
  assert.match(T.cobertura({ conferidas: 2, aproximadas: 1, sem: 3 }), /2 unidades.*1 com localização aproximada.*3 sem localização/)
  assert.deepEqual(coberturaDoMapa([]), { conferidas: 0, aproximadas: 0, sem: 0, total: 0 })
})

test('Sicredi: as 3 agências da arte ganham ponto geográfico conferido, e nada é inventado', () => {
  const m = mundoEdicao()
  const ag = agenciasSicredi(m.sicredi)
  assert.equal(ag.length, m.sicredi.length, 'uma por agência da arte, sem sobrar nem faltar')
  for (const a of ag) {
    assert.ok(ehSicredi(a.id), a.id)
    assert.equal(a.precisao, 'confirmada', `${a.nome}: ponto conferido na fonte`)
    assert.ok(a.x >= 0 && a.x <= 1 && a.y >= 0 && a.y <= 1, `${a.nome}: posição na arte`)
    assert.ok(Math.abs(a.lat + 5.8) < 0.3 && Math.abs(a.lng + 35.2) < 0.3, `${a.nome}: dentro da região de Natal`)
    assert.ok(a.fonte && a.endereco)
  }
  assert.equal(new Set(ag.map((a) => a.id)).size, ag.length)
  assert.equal(ag.find((a) => a.id === 'sicredi-cidade-verde').numeroEmConferencia, true)
})

test('Sicredi: agência que a arte tem e a lista oficial não tem fica "não informada", sem coordenada', () => {
  const ag = agenciasSicredi([{ nome: 'Sicredi Natal (sede)', x: 0.5, y: 0.5 }, { nome: 'Sicredi Nova', endereco: 'Rua X', x: 0.1, y: 0.2 }])
  const nova = ag.find((a) => a.nome === 'Sicredi Nova')
  assert.equal(nova.precisao, 'nao-informada')
  assert.equal(nova.lat, null)
  assert.equal(linkComoChegarSicredi(nova), `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Rua X')}`)
  assert.equal(linkComoChegarSicredi({ precisao: 'nao-informada', endereco: '' }), '')
  assert.equal(pontosSicredi(ag, {}).some((p) => p.id === nova.id), false, 'sem coordenada, fora do mapa real (segue na lista)')
  // nome com acento da arte casa com o oficial
  assert.equal(agenciasSicredi([{ nome: 'SICREDI SAO GONCALO DO AMARANTE', x: 1, y: 1 }]).find((a) => a.id === 'sicredi-sao-goncalo').x, 1)
  // oficial sem coordenada válida vira "não informada"
  assert.equal(agenciasSicredi([], [{ id: 'sicredi-z', nome: 'Z', endereco: 'R', lat: null, lng: 3, precisao: 'confirmada' }])[0].precisao, 'nao-informada')
})

test('Sicredi: "Como chegar" usa a coordenada conferida; a aproximada cai para o endereço escrito', () => {
  const a = AGENCIAS_SICREDI[0]
  assert.equal(linkComoChegarSicredi(a), `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${a.lat},${a.lng}`)}`)
  const aprox = { ...a, precisao: 'aproximada' }
  assert.match(decodeURIComponent(linkComoChegarSicredi(aprox)), /Rua Tuiuti/)
  const pts = pontosSicredi(agenciasSicredi(mundoEdicao().sicredi), { src: '/s.svg', rotulo: 'Patrocinador' })
  assert.equal(pts.length, 3)
  assert.ok(pts.every((p) => p.sicredi === true && p.aproximada === false && p.pin.rotulo === 'Patrocinador'))
})

test('Sicredi: busca por nome ou endereço, sem acento nem caixa', () => {
  const a = AGENCIAS_SICREDI[2]
  assert.equal(agenciaCombina(a, 'sao goncalo'), true)
  assert.equal(agenciaCombina(a, 'SICREDI'), true)
  assert.equal(agenciaCombina(a, 'carajas'), true)
  assert.equal(agenciaCombina(a, 'caroli douces'), false)
  assert.equal(agenciaCombina(a, ''), true)
  assert.equal(ehSicredi('u1a2b3c'), false)
  assert.equal(ehSicredi(null), false)
})

test('textos: cada estado diz o que é, sem "voto/votação", sem "Sweet" sozinho, sem revelar a surpresa', () => {
  for (const e of ['nao-visitada', 'pendente', 'conquistada']) {
    assert.ok(ESTADO_TEXTO[e].curto && ESTADO_TEXTO[e].rotulo && ESTADO_TEXTO[e].explica)
    assert.ok(noDisco(IMAGENS_ESTADO[e].src), IMAGENS_ESTADO[e].src)
  }
  assert.ok(noDisco(IMAGEM_REVISITA.src))
  assert.match(ESTADO_TEXTO.pendente.rotulo, /falta avaliar/i)
  const tudo = JSON.stringify([ESTADO_TEXTO, T.proximo, T.sicrediAviso, T.avisoIlustrado]) + T.progresso(1, 27) + T.casaNoMundo({ numero: 1, titulo: 'X', estado: 'pendente' })
  assert.doesNotMatch(tudo, /vot[oa]|plaquinha|Sweet Lover/i)
  assert.doesNotMatch(tudo, /apoia a cultura e o com[eé]rcio/i)
  assert.match(T.proximo.completo, /uma surpresa/)
})

test('textos do Sicredi: "Patrocinador", "o Sicredi", e que não conta como casa nem carimbo', () => {
  assert.equal(T.sicrediRotulo, 'Patrocinador')
  assert.match(T.sicrediAviso, /^O Sicredi é o patrocinador/)
  assert.match(T.sicrediAviso, /não contam como casa nem como carimbo/)
  assert.match(T.sicrediNoMundo('Sicredi Natal', 'Rua A'), /Não conta como casa nem como carimbo/)
  assert.match(T.sicrediNomeMarcador('Sicredi Natal', true), /patrocinador, ponto aproximado, não conta como casa/)
  assert.doesNotMatch(JSON.stringify(T), /Patrocínio/)
})

test('o aviso fixo do mundo ilustrado diz que não mostra posições reais, e a trilha não é caminho de carro', () => {
  assert.match(T.avisoIlustrado, /ilustrativo/)
  assert.match(T.avisoIlustrado, /não mostra posições reais/)
  assert.match(T.avisoTrilha, /Não é o caminho de carro/)
})

test('nome falado da casa no desenho: número, nome, tema, estado, revisitas, parada e próxima', () => {
  const nome = T.casaNoMundo({ numero: 3, titulo: 'Caroli Douces', tema: 'Doces do Mundo', estado: 'conquistada', revisitas: 2, parada: 1, proxima: true })
  assert.equal(nome, '3. Caroli Douces, tema Doces do Mundo, conquistada, 2 revisitas, parada 1 da sua rota, sua próxima casa')
  assert.equal(T.casaNoMundo({ numero: 4, titulo: 'Outra', estado: null }), '4. Outra', 'sem mapa não se diz estado')
  assert.match(T.casaNoMundo({ numero: 1, titulo: 'X', estado: 'pendente' }), /carimbo pendente: falta avaliar/)
})

test('arquivos da frente existem e os dados gerados continuam coerentes com as três agências', () => {
  const m = mundoEdicao()
  assert.equal(m.sicredi.length, 3)
  assert.ok(noDisco(m.sicrediBandeira))
  const sicredi = readFileSync(new URL('../src/edicao/caca/mapa/sicredi.js', import.meta.url), 'utf8')
  assert.doesNotMatch(sicredi, /apoia a cultura/i)
})

// ---- Página do mapa compacta (redesign de 06/11/2026): contagens, filtros, tela cheia, textos ----

test('filtros ativos: o contador do botão conta só os filtros da folha, nunca a busca por texto', () => {
  assert.equal(contarFiltros({}), 0)
  assert.equal(contarFiltros({ q: 'tirol' }), 0)
  assert.equal(contarFiltros({ q: 'x', bairro: 'Tirol', modo: 'delivery', aberto: true, queroIr: true, jaFui: true, estado: 'pendente' }), 6)
  assert.equal(contarFiltros({ aberto: true }, { aberto: false }), 0, '"aberto agora" fora do festival não conta (não esconde nada)')
  assert.equal(T.filtrosAtivos(1), '1 filtro ativo')
  assert.equal(T.filtrosAtivos(3), '3 filtros ativos')
  assert.equal(T.filtrosVer(1), 'Ver 1 endereço')
  assert.equal(T.filtrosVer(12), 'Ver 12 endereços')
})

test('casas × endereços: a Caça conta casas; uma casa com vários endereços é uma casa só', () => {
  const lista = [
    { slug: 'a', unidades: [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }] },
    { slug: 'b', unidades: [{ id: 'u4' }] },
    { slug: 'c', unidades: [] }, // sem endereço publicado: não é casa visitável
    { slug: 'd' },
  ]
  assert.deepEqual(casasEEnderecos(lista), { casas: 2, enderecos: 4 })
  assert.deepEqual(casasEEnderecos(), { casas: 0, enderecos: 0 })
  assert.equal(T.casasEnderecos(26, 41), '26 casas · 41 endereços')
  assert.equal(T.casasEnderecos(1, 1), '1 casa', 'casa com endereço único não repete a conta')
  assert.equal(T.casasEnderecos(5, 5), '5 casas')
  assert.equal(T.mostrando(12, 41), 'Mostrando 12 de 41 endereços')
  assert.equal(T.mostrando(41, 41), '', 'sem filtro efetivo, nada de "mostrando"')
  assert.match(T.casasEnderecosNota, /Cada casa vale um carimbo, mesmo com mais de um endereço/)
  const linhas = [{ p: { slug: 'a' }, u: { id: 'u1' } }, { p: { slug: 'a' }, u: { id: 'u2' } }, { p: { slug: 'b' }, u: { id: 'u4' } }]
  assert.deepEqual(enderecosDaCasa(linhas, 'a', 'u1').map((x) => x.u.id), ['u2'], 'os outros endereços da MESMA casa, sem o atual')
  assert.deepEqual(enderecosDaCasa(linhas, 'b', 'u4'), [])
  assert.equal(T.outrosEnderecos(1), 'Esta casa tem mais 1 endereço')
  assert.equal(T.outrosEnderecos(4), 'Esta casa tem mais 4 endereços')
})

test('textos da tela cheia e do painel: nomes claros, sem "votar", sem "Sweet" sozinho', () => {
  assert.equal(T.telaCheiaAbrir, 'Abrir mapa em tela cheia')
  assert.equal(T.telaCheiaFechar, 'Fechar tela cheia')
  assert.match(T.telaCheiaAbrir.toLowerCase(), new RegExp(T.telaCheiaAbrirCurto.toLowerCase()), 'o rótulo curto visível cabe no nome acessível (WCAG 2.5.3)')
  assert.equal(T.minhaRotaConta(0), 'Minha rota, sem paradas')
  assert.equal(T.minhaRotaConta(1), 'Minha rota, 1 parada')
  assert.equal(T.minhaRotaConta(4), 'Minha rota, 4 paradas')
  for (const k of ['avaliar', 'rota', 'visitar']) assert.ok(T.proximoAcao[k]('Cookitos').includes('Cookitos'))
  assert.equal(T.proximoAcao.avaliar('Cookitos'), 'Avaliar o combo de Cookitos')
  const tudo = JSON.stringify([T.filtros, T.filtrosTitulo, T.filtrosLimpar, T.telaCheiaRegiao, T.casasEnderecosNota, T.casasEnderecosCurta, T.outrosEnderecosNota, T.proximoAcao.avaliar('X')])
  assert.doesNotMatch(tudo, /vot[oa]|plaquinha|Sweet Lover/i)
})

test('a tela cheia é do próprio contêiner (CSS fixo + 100dvh + safe areas), com Fullscreen API só como melhoria', () => {
  const css = readFileSync(new URL('../src/styles/cartoon/16-mapa-tela.css', import.meta.url), 'utf8')
  const regra = css.match(/\.ct-mapa__explorar\.is-cheia \{([^}]*)\}/)[1]
  assert.match(regra, /position:\s*fixed/)
  assert.match(regra, /100dvh/)
  assert.match(css, /env\(safe-area-inset-top\)/)
  assert.match(css, /env\(safe-area-inset-bottom\)/)
  assert.match(css, /prefers-reduced-motion/)
  const hook = readFileSync(new URL('../src/edicao/cartoon/paginas/mapa/useTelaCheia.js', import.meta.url), 'utf8')
  assert.match(hook, /typeof raiz\.requestFullscreen === 'function'/, 'a Fullscreen API só é tentada onde existe (iPhone cai no modo por CSS)')
  assert.match(hook, /\.catch\(/, 'recusa da Fullscreen API nunca quebra a tela cheia')
  assert.match(hook, /travar\(/)
  assert.match(hook, /devolverFoco/)
  const barra = readFileSync(new URL('../src/edicao/cartoon/paginas/mapa/Controles.jsx', import.meta.url), 'utf8')
  assert.match(barra, /data-fechar-cheia/, 'o botão Fechar da tela cheia é o primeiro foco')
  const cartao = readFileSync(new URL('../src/edicao/cartoon/paginas/mapa/Cartao.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(cartao, /window\.(confirm|prompt|alert)/)
})

test('o Mundo não conhece a tela cheia: a interface dele segue só com os dados (trocar a arte não mexe nela)', () => {
  const mundo = readFileSync(new URL('../src/edicao/cartoon/paginas/mapa/Mundo.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(mundo, /cheia|fullscreen|Fullscreen/)
  assert.match(mundo, /export function Mundo \(\{ mundo, casas, agencias = \[\], trilha, selecionada, aoSelecionar, recentes = new Set\(\), rodaAproxima = false \}\)/)
})

// ---- Atalhos do jogo na tela cheia (06/11/2026) ----

test('atalhos do jogo: cinco itens na ordem pedida, cada um com ícone ilustrado da edição, rótulo curto e título de folha', () => {
  const fonte = readFileSync(new URL('../src/edicao/cartoon/paginas/mapa/Atalhos.jsx', import.meta.url), 'utf8')
  const chaves = [...fonte.matchAll(/\['(\w+)', '([\w-]+)'\]/g)].map((m) => [m[1], m[2]])
  assert.deepEqual(chaves.map((c) => c[0]), ['progresso', 'casas', 'rota', 'ranking', 'grupos'])
  for (const [chave, icone] of chaves) {
    assert.ok(iconeEdicao(icone), `ícone da edição "${icone}" existe`)
    assert.ok(T.atalho[chave] && T.atalhoTitulo[chave], `rótulo e título de ${chave}`)
    assert.ok(T.atalho[chave].length <= 10, `rótulo curto: ${T.atalho[chave]}`)
  }
  assert.equal(T.atalhoTitulo.progresso, 'Progresso e carimbos')
  assert.equal(T.atalhosNome(''), 'Atalhos do jogo')
  assert.equal(T.atalhosNome(T.atalhosResumo(2, 26)), 'Atalhos do jogo, 2 de 26 casas validadas')
  assert.equal(T.atalhoFechar('Ranking'), 'Fechar: Ranking')
  assert.doesNotMatch(JSON.stringify([T.atalho, T.atalhoTitulo, T.atalhoGruposSemMapa]), /vot[oa]|Sweet Lover/i)
})

test('atalhos: uma folha por vez (variante "jogo"), lista recolhe ao abrir, Escape em pilha e foco devolvido ao botão', () => {
  const at = readFileSync(new URL('../src/edicao/cartoon/paginas/mapa/Atalhos.jsx', import.meta.url), 'utf8')
  assert.match(at, /const \[aberta, setAberta\] = React\.useState\(null\)/, 'uma folha por vez')
  assert.match(at, /const abrir = \(chave\) => \{ setLista\(false\); setAberta\(chave\) \}/, 'abrir a folha recolhe a lista')
  assert.match(at, /useEscape\(lista, fecharLista\)/, 'a lista entra na pilha de Escape')
  assert.match(at, /<Folha variante="jogo"/)
  assert.match(at, /aria-label=\{TC\.atalhosNome\(resumo\)\}/, 'o botão tem nome')
  assert.match(at, /voltarAoBotao/)
  assert.doesNotMatch(at, /window\.(confirm|prompt|alert)/)
  const folha = readFileSync(new URL('../src/edicao/cartoon/paginas/mapa/Folha.jsx', import.meta.url), 'utf8')
  assert.match(folha, /variante === 'jogo'/)
  const pag = readFileSync(new URL('../src/edicao/cartoon/paginas/mapa/index.jsx', import.meta.url), 'utf8')
  assert.match(pag, /\{cheia && \(\s*<Atalhos /, 'os atalhos só existem na tela cheia (a página já tem barra, faixa, "Minha rota" e abas)')
  assert.match(pag, /React\.lazy\(\(\) => import\('\.\.\/\.\.\/\.\.\/caca\/secoes\/Ranking\.jsx'\)\)/, 'Ranking sob demanda')
  assert.match(pag, /React\.lazy\(\(\) => import\('\.\.\/\.\.\/\.\.\/caca\/secoes\/Grupos\.jsx'\)\)/, 'Grupos sob demanda')
  assert.match(pag, /\{!cheia && <Folha variante="painel"/, 'sem o painel lateral atrás do véu: nenhum id repetido')
  const css = readFileSync(new URL('../src/styles/cartoon/16-mapa-tela.css', import.meta.url), 'utf8')
  assert.match(css, /\.ct-jogo__botao \{[^}]*min-height: 48px/, 'alvo do botão ≥ 44 px')
  assert.match(css, /\.ct-jogo__item \{[^}]*min-height: 48px/)
  assert.match(css, /\.ct-jogo \{[^}]*env\(safe-area-inset-left\)/, 'respeita o entalhe')
})
