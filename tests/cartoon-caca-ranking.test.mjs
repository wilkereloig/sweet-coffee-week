// Caça aos Carimbos — ranking: apresentação do empate, "você" na lista, posição fora do recorte e limites do "ver mais".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { prepararLinhas, indiceDaPessoa, minhaPosicao, rotuloPosicao, textoCasas, textoExtras, proximoLimite, podeVerMais, LIMITE_INICIAL, LIMITE_MAXIMO } from '../src/edicao/caca/ranking/regras.js'
import { RANKING } from '../src/edicao/caca/ranking/textos.js'

const raiz = path.resolve(import.meta.dirname, '..')

test('empate: mesma posição vira "empatado em Nº", posição vem do servidor e nunca é recalculada', () => {
  const l = prepararLinhas([
    { posicao: 1, apelido: 'Ana', casas: 5, extras: 3 },
    { posicao: 2, apelido: 'Bia', casas: 4, extras: 1 },
    { posicao: 2, apelido: 'Cadu', casas: 4, extras: 1 },
    { posicao: 4, apelido: 'Duda', casas: 2, extras: 0 },
  ])
  assert.deepEqual(l.map((x) => x.empatada), [false, true, true, false])
  assert.deepEqual(l.map((x) => x.posicao), [1, 2, 2, 4], 'a seguinte pula, como rank()')
  assert.equal(RANKING.empatadoEm(2), 'empatado em 2º')
})

test('linhas fora de forma são descartadas ou normalizadas, sem quebrar', () => {
  assert.deepEqual(prepararLinhas(null), [])
  const l = prepararLinhas([null, 'x', { posicao: null, apelido: 'Zé', casas: -3, extras: 'a' }, { posicao: 0, apelido: 'W' }])
  assert.equal(l.length, 2)
  assert.deepEqual([l[0].casas, l[0].extras, l[0].semPosicao, l[0].empatada], [0, 0, true, false])
  assert.equal(l[1].semPosicao, true, 'posição 0 não é posição')
})

test('"você" na lista só quando há UMA linha igual e o mapa aparece no ranking', () => {
  const linhas = prepararLinhas([
    { posicao: 1, apelido: 'Ana', casas: 5, extras: 3 },
    { posicao: 2, apelido: 'Bia', casas: 4, extras: 1 },
    { posicao: 3, apelido: 'Bia', casas: 3, extras: 0 },
  ])
  const mapa = (o) => ({ apelido: 'Bia', no_ranking: true, posicao: 2, casas_validadas: 4, extras: 1, ...o })
  assert.equal(indiceDaPessoa(linhas, mapa()), 1)
  assert.equal(indiceDaPessoa(linhas, mapa({ no_ranking: false })), -1, 'quem não optou por aparecer não tem linha')
  assert.equal(indiceDaPessoa(linhas, mapa({ posicao: null })), -1)
  assert.equal(indiceDaPessoa(linhas, mapa({ extras: 9 })), -1, 'progresso diferente: não é a mesma linha')
  assert.equal(indiceDaPessoa(linhas, null), -1)
  const dupla = prepararLinhas([{ posicao: 2, apelido: 'Bia', casas: 4, extras: 1 }, { posicao: 2, apelido: 'Bia', casas: 4, extras: 1 }])
  assert.equal(indiceDaPessoa(dupla, mapa()), -1, 'duas linhas idênticas: na dúvida, ninguém é "você"')
})

test('posição da própria pessoa vale fora do recorte e `empatados` conta a própria pessoa', () => {
  assert.deepEqual(minhaPosicao({ posicao: 37, empatados: 4, casas_validadas: 3, extras: 0, total_casas: 27, no_ranking: false }),
    { posicao: 37, comEmpate: 3, casas: 3, extras: 0, total: 27, apareceNaLista: false })
  assert.equal(minhaPosicao({ posicao: null }).posicao, null)
  assert.equal(minhaPosicao(null).comEmpate, 0)
  assert.equal(RANKING.minha.posicao(3, 2), 'Você está empatado em 3º lugar com mais 2 pessoas.')
  assert.equal(RANKING.minha.posicao(3, 1), 'Você está empatado em 3º lugar com mais 1 pessoa.')
  assert.equal(RANKING.minha.posicao(3, 0), 'Você está em 3º lugar.')
})

test('rótulos e plurais', () => {
  assert.equal(rotuloPosicao(1), '1º')
  assert.equal(rotuloPosicao(null), '—')
  assert.equal(textoCasas(1), '1 casa')
  assert.equal(textoCasas(0), '0 casas')
  assert.equal(textoExtras(1), '1 carimbo extra')
  assert.equal(textoExtras(2), '2 carimbos extras')
})

test('"ver mais": cresce de 15 em 15 e nunca passa do máximo do servidor (50)', () => {
  assert.equal(LIMITE_INICIAL, 10)
  assert.equal(proximoLimite(10), 25)
  assert.equal(proximoLimite(25), 40)
  assert.equal(proximoLimite(40), LIMITE_MAXIMO)
  assert.equal(proximoLimite(50), LIMITE_MAXIMO)
  assert.equal(podeVerMais(10, 10), true, 'recorte veio cheio: pode haver mais')
  assert.equal(podeVerMais(6, 10), false, 'veio menos que o pedido: acabou')
  assert.equal(podeVerMais(50, 50), false)
})

test('a tela do ranking só mostra apelido e progresso e não toca em dado pessoal', () => {
  const fontes = ['src/edicao/caca/secoes/Ranking.jsx', 'src/edicao/caca/ranking/ListaRanking.jsx'].map((f) => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n')
  assert.doesNotMatch(fontes, /\.email|\.whatsapp|chave_hash|localStorage|sessionStorage|console\./)
  assert.doesNotMatch(fontes, /window\.(confirm|alert|prompt)/)
})

test('textos do ranking: sem "voto/votação", sem "Sweet" sozinho, sem prêmio revelado', () => {
  const texto = JSON.stringify(RANKING)
  assert.doesNotMatch(texto, /\bvot(o|os|ação|ações|ar|am)\b/i)
  assert.doesNotMatch(texto, /\bSweet\b(?! (Awards|Lovers|Gift|&))/)
  assert.doesNotMatch(texto, /plaquinha/i)
})
