// Caça aos Carimbos — o mapa (src/edicao/caca/mapa/*; docs/cartoon-2026-2/15-caca-especificacao.md §10–§11).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  estadoDaCasa, revisitasDaCasa, casasDoMapa, progressoPessoal, ordemDasCasas, proximoPasso, novasConquistas, fotografia,
  arteLiberada, filtrarPorEstado, coberturaDoMapa,
} from '../src/edicao/caca/mapa/estados.js'
import {
  AGENCIAS_SICREDI, agenciasSicredi, pontosSicredi, linkComoChegarSicredi, ehSicredi, agenciaCombina,
} from '../src/edicao/caca/mapa/sicredi.js'
import { ESTADO_TEXTO, MAPA_CACA as T } from '../src/edicao/caca/mapa/textos.js'
import { IMAGENS_ESTADO, IMAGEM_REVISITA } from '../src/edicao/caca/mapa/imagens.js'
import { mundoEdicao } from '../src/data/imageLibrary.js'

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

test('próximo passo ignora casa sem unidade (não há o que visitar)', () => {
  const casas = casasDoMapa({ casas: [] })
  assert.deepEqual(proximoPasso({ mapa: {}, casas, ordem: ['sem', 'com'], visitaveis: ['com'] }), { tipo: 'visitar', slug: 'com' })
  assert.deepEqual(proximoPasso({ mapa: {}, casas, ordem: ['sem'], paradas: ['sem'], visitaveis: [] }), { tipo: 'nenhum' })
})

test('ordem das casas: pelo número no caminho do mapa; sem lugar na arte vai para o fim, na ordem da lista', () => {
  const lista = [
    { slug: 'x', unidades: [{ id: 'u1' }] }, { slug: 'y', unidades: [{ id: 'u2' }, { id: 'u3' }] },
    { slug: 'sem', unidades: [] }, { slug: 'z', unidades: [{ id: 'u4' }] },
  ]
  const unidades = { u1: { numero: 3 }, u2: { numero: 5 }, u3: { numero: 2 }, u4: { numero: 1 } }
  assert.deepEqual(ordemDasCasas(lista, unidades), ['z', 'y', 'x', 'sem'], 'a casa leva o MENOR número entre as unidades dela')
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
  assert.equal(mundoEdicao().aprovada, false, 'a arte atual ainda é provisória: este teste avisa se alguém aprovar sem querer')
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
