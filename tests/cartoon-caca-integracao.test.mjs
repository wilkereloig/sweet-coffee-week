// Mapa da Doçura + Caça numa experiência só: "Já fui" e rota são planejamento/lembrança; quem valida a casa é o servidor.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  lerUnidadeCarimbo, gravarUnidadeCarimbo, prepararAvaliacao, mesmoEmail,
} from '../src/edicao/rota/carimbo.js'
import { pendentes, alternarVisita, visitada } from '../src/edicao/rota/minhaRota.js'
import { estadoDaCasa } from '../src/edicao/caca/mapa/estados.js'
import { MAPA_CACA as T } from '../src/edicao/caca/mapa/textos.js'

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }
const fonte = (p) => readFileSync(fileURLToPath(new URL(`../src/edicao/${p}`, import.meta.url)), 'utf8')
const casa = (slug, ids) => ({ slug, unidades: ids.map((id) => ({ id })) })

test('"Já fui" é anotação: marca a casa inteira e não cria estado de Caça', () => {
  const p = casa('doceria', ['u000001', 'u000002'])
  const v = alternarVisita([], p)
  assert.equal(visitada(p, v), true)
  assert.equal(estadoDaCasa(undefined), 'nao-visitada') // sem registro no servidor, a casa segue "não visitada"
})

test('rota: carimbo pendente NÃO tira a parada; conquistada ou "já fui" tiram', () => {
  const paradas = ['a', 'b', 'c'].map((slug, i) => ({ id: `u00000${i}`, participante: casa(slug, [`u00000${i}`]), ativa: true }))
  const servidor = { a: 'pendente', b: 'conquistada', c: 'nao-visitada' }
  const foi = new Set(['c'])
  const visitou = (p) => foi.has(p.slug) || servidor[p.slug] === 'conquistada' // a mesma regra de paginas/mapa/index.jsx
  assert.deepEqual(pendentes(paradas, visitou).map((pa) => pa.participante.slug), ['a'])
  assert.match(fonte('cartoon/paginas/mapa/index.jsx'), /const visitou = \(p\) => rota\.foi\(p\) \|\| estadoDe\(p\.slug\) === 'conquistada'/)
})

test('unidade carimbada: guardada por casa e usada na avaliação; a explícita vence', () => {
  const s = memoria()
  assert.equal(gravarUnidadeCarimbo('c1', 'doceria', 'u000002', s), true)
  assert.equal(lerUnidadeCarimbo('c1', 'doceria', s), 'u000002')
  assert.equal(lerUnidadeCarimbo('c1', 'outra', s), '')
  assert.equal(lerUnidadeCarimbo('c2', 'doceria', s), '') // por edição
  assert.equal(gravarUnidadeCarimbo('c1', 'x', '', s), false) // sem unidade, não grava
  const ss = memoria()
  // `prepararAvaliacao` lê a memória do mesmo `armazenamento`: o teste usa o mesmo objeto para os dois.
  gravarUnidadeCarimbo('c1', 'doceria', 'u000002', ss)
  const url = prepararAvaliacao({ caminho: '/cartoon', slug: 'doceria', mapa: { apelido: 'Ana', email: 'ana@x.com' }, codigo: 'c1' }, ss)
  assert.match(url, /unidade=u000002/)
  assert.match(prepararAvaliacao({ caminho: '/cartoon', slug: 'doceria', unidade: 'u000009', codigo: 'c1' }, ss), /unidade=u000009/)
  assert.doesNotMatch(prepararAvaliacao({ caminho: '/cartoon', slug: 'sem-memoria', codigo: 'c1' }, ss), /unidade=/)
})

test('avaliação leva o e-mail do mapa para o aviso de e-mail diferente', () => {
  const s = memoria()
  prepararAvaliacao({ caminho: '/cartoon', slug: 'doceria', mapa: { apelido: 'Ana', email: 'Ana@X.com' } }, s)
  const rascunho = JSON.parse(s.getItem('scw:cartoon:avaliacao:rascunho'))
  assert.equal(rascunho.emailMapa, 'Ana@X.com')
  assert.equal(mesmoEmail(' ana@x.com ', rascunho.emailMapa), true)
  assert.equal(mesmoEmail('outra@x.com', rascunho.emailMapa), false)
  assert.match(fonte('cartoon/paginas/awards/Formulario.jsx'), /mesmoEmail\(form\.email, form\.emailMapa\)/)
})

test('textos: um nome para avaliar e o próximo passo depois de "Já fui" sem prometer carimbo', () => {
  assert.equal(T.avaliarValidar, T.avaliarCombo)
  for (const k of ['semMapa', 'nao-visitada', 'pendente']) assert.ok(T.jaFuiPasso[k], k)
  assert.match(T.jaFuiPasso.semMapa, /Anotado só para você/)
  assert.doesNotMatch(Object.values(T.jaFuiPasso).join(' '), /conquistada|ganhou|ponto/i)
})
