/*
 * Atalhos fixos do mapa (06/11/2026): padrão, validação, persistência no aparelho (com armazenamento quebrado) e o contrato do desenho
 * (mesma função da lista, ícones distintos e existentes, nomes acessíveis, estilo sem cobrir zoom nem localização).
 * Roda sem navegador: `node --test tests/cartoon-mapa-atalhos-fixos.test.mjs`. O comportamento em tela: cartoon-mapa-atalhos-navegador.mjs.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { QUANTOS, PADRAO, CHAVE_FIXOS, fixosValidos, lerFixos, guardarFixos, alternarEscolha } from '../src/edicao/cartoon/paginas/mapa/atalhosFixos.js'
import { iconeEdicao } from '../src/data/imageLibrary.js'

const ler = (c) => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8')
const CHAVES = ['progresso', 'casas', 'rota', 'premios', 'ranking', 'grupos']

function armazenamento (inicial = {}) {
  const m = new Map(Object.entries(inicial))
  globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)) }, removeItem: (k) => m.delete(k) }
  return m
}

test('o padrão são Progresso, Prêmios e Ranking', () => {
  assert.deepEqual(PADRAO, ['progresso', 'premios', 'ranking'])
  assert.equal(QUANTOS, 3)
  armazenamento()
  assert.deepEqual(lerFixos(CHAVES), PADRAO)
})

test('fixosValidos: três, sem repetir, só chaves conhecidas', () => {
  assert.deepEqual(fixosValidos(['rota', 'casas', 'grupos'], CHAVES), ['rota', 'casas', 'grupos'])
  for (const ruim of [null, 'rota', [], ['rota'], ['rota', 'casas'], ['rota', 'rota', 'casas'], ['rota', 'casas', 'inexistente'], ['rota', 'casas', 'grupos', 'ranking']]) {
    assert.equal(fixosValidos(ruim, CHAVES), null, JSON.stringify(ruim))
  }
})

test('a escolha é guardada no aparelho e relida; valor estranho volta ao padrão', () => {
  const m = armazenamento()
  assert.equal(guardarFixos(['rota', 'casas', 'grupos'], CHAVES), true)
  assert.deepEqual(JSON.parse(m.get(CHAVE_FIXOS)), ['rota', 'casas', 'grupos'])
  assert.deepEqual(lerFixos(CHAVES), ['rota', 'casas', 'grupos'])
  assert.equal(guardarFixos(['rota', 'casas'], CHAVES), false, 'duas não salvam')
  assert.deepEqual(JSON.parse(m.get(CHAVE_FIXOS)), ['rota', 'casas', 'grupos'], 'a escolha antiga fica')
  for (const estranho of ['{', '"x"', '[1,2,3]', '["rota","rota","casas"]', '["premios","ranking","apagada"]']) {
    armazenamento({ [CHAVE_FIXOS]: estranho })
    assert.deepEqual(lerFixos(CHAVES), PADRAO, estranho)
  }
})

test('armazenamento bloqueado ou quebrado não derruba: lê o padrão e a escolha vale até recarregar', () => {
  globalThis.localStorage = { getItem () { throw new Error('bloqueado') }, setItem () { throw new Error('cheio') } }
  assert.deepEqual(lerFixos(CHAVES), PADRAO)
  assert.equal(guardarFixos(['rota', 'casas', 'grupos'], CHAVES), false)
  delete globalThis.localStorage
  assert.deepEqual(lerFixos(CHAVES), PADRAO)
  assert.equal(guardarFixos(['rota', 'casas', 'grupos'], CHAVES), false)
})

test('alternarEscolha: marca, desmarca e trava no quarto', () => {
  assert.deepEqual(alternarEscolha(['a', 'b'], 'c'), ['a', 'b', 'c'])
  assert.deepEqual(alternarEscolha(['a', 'b', 'c'], 'b'), ['a', 'c'])
  assert.deepEqual(alternarEscolha(['a', 'b', 'c'], 'd'), ['a', 'b', 'c'], 'com três, a quarta não entra')
})

test('Prêmios e Ranking têm ícones DIFERENTES, da edição, e os arquivos existem (192×192, fundo transparente)', () => {
  const at = ler('src/edicao/cartoon/paginas/mapa/Atalhos.jsx')
  const pares = Object.fromEntries([...at.matchAll(/\['(\w+)', '([\w-]+)'\]/g)].map((m) => [m[1], m[2]]))
  assert.equal(pares.premios, 'trofeu')
  assert.equal(pares.ranking, 'podio')
  assert.notEqual(pares.premios, pares.ranking)
  assert.equal(new Set(Object.values(pares)).size, Object.values(pares).length, 'nenhum ícone repetido entre os seis atalhos')
  for (const nome of ['trofeu', 'podio']) {
    const i = iconeEdicao(nome)
    assert.ok(i, `iconeEdicao('${nome}')`)
    assert.ok(existsSync(new URL(`../public${i.src}`, import.meta.url)), `arquivo ${i.src}`)
  }
})

test('o botão fixo chama a MESMA função da lista, tem nome acessível e não duplica o seletor da lista', () => {
  const at = ler('src/edicao/cartoon/paginas/mapa/Atalhos.jsx')
  assert.match(at, /fixos\.map\(\(chave\) => \(\s*<button[^>]*data-atalho-fixo=\{chave\}[^>]*aria-label=\{rotuloDe\(chave\)\}/, 'nome acessível = rótulo do atalho')
  assert.match(at, /onClick=\{\(e\) => abrir\(chave, e\.currentTarget\)\}/, 'abre pela mesma função (uma folha por vez, sem lógica nova)')
  assert.match(at, /onClick=\{\(\) => abrir\(chave\)\}/, 'o item da lista segue igual')
  assert.match(at, /role="group" aria-label=\{TX\.grupo\}/)
  assert.match(at, /data-atalho=\{chave\}/, 'a lista continua com os seis')
  assert.match(at, /ATALHOS\.map\(\(\[chave, icone\]\) => \{\s*const marcado/, 'o painel de escolha lista os seis')
  assert.doesNotMatch(at, /(window|globalThis)\.localStorage|sessionStorage/, 'a leitura e a escrita ficam em atalhosFixos.js')
  assert.match(ler('src/edicao/cartoon/paginas/mapa/atalhosFixos.js'), /try \{ return globalThis\.localStorage/, 'acesso ao armazenamento protegido')
})

test('estilo: alvo ≥ 44 px, canto esquerdo (longe do zoom), rótulo só a partir de 480 px, sem cor fora do sistema', () => {
  const css = ler('src/styles/cartoon/16-mapa-tela.css')
  assert.match(css, /\.ct-jogo__fixo \{[^}]*min-width: 48px; min-height: 48px/)
  assert.match(css, /\.ct-jogo__opcao \{[^}]*min-height: 48px/)
  assert.match(css, /\.ct-jogo__opcao input \{[^}]*width: 24px; height: 24px/)
  assert.match(css, /\.ct-jogo__fixos \{ display: flex; gap: 8px; \}/)
  assert.match(css, /@media \(min-width: 480px\) \{ \.ct-jogo__fixo \{[^}]*\} \.ct-jogo__fixo span \{ display: inline; \} \}/)
  const bloco = css.slice(css.indexOf('/* Atalhos FIXOS'), css.indexOf('.ct-jogo__lista {'))
  assert.doesNotMatch(bloco, /#[0-9a-fA-F]{3,8}\b/, 'cores só por token --ct-*')
  assert.match(css, /\.ct-jogo__botao:active, \.ct-jogo__fixo:active \{ translate: none/, 'movimento reduzido cobre o botão fixo')
})
