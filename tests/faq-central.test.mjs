import test from 'node:test'
import assert from 'node:assert/strict'
import FAQ_DADOS from '../src/data/faqCentral.js'

/*
 * Guarda da central de dúvidas (redesign 2026). A busca da página Contato casa
 * múltiplos termos contra pergunta + resposta + palavras-chave + rótulo do
 * assunto + id, e cada resposta pode apontar para uma chave de `links`. Se um
 * item quebrar esse contrato, a pergunta some do filtro ou o link vira ruído.
 */

const { categorias, perguntas, links } = FAQ_DADOS

test('93 perguntas em 10 assuntos (+ "todas" no índice)', () => {
  assert.equal(perguntas.length, 93)
  assert.equal(categorias.length, 11)
  assert.equal(categorias[0][0], 'todas')
})

test('ids são únicos', () => {
  const ids = perguntas.map((q) => q.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('todo `cat` existe no índice de assuntos', () => {
  const conhecidas = new Set(categorias.map(([id]) => id))
  for (const q of perguntas) {
    assert.ok(conhecidas.has(q.cat), `assunto desconhecido em "${q.id}": ${q.cat}`)
  }
})

test('todo assunto tem pelo menos uma pergunta', () => {
  for (const [id] of categorias) {
    if (id === 'todas') continue
    assert.ok(perguntas.some((q) => q.cat === id), `assunto vazio: ${id}`)
  }
})

test('toda pergunta tem texto e ao menos um parágrafo de resposta', () => {
  for (const q of perguntas) {
    assert.ok(q.p && q.p.trim().length > 0, `pergunta sem texto: ${q.id}`)
    assert.ok(Array.isArray(q.r) && q.r.length > 0, `resposta vazia: ${q.id}`)
  }
})

test('`link` aponta para uma chave existente de `links`', () => {
  for (const q of perguntas) {
    if (!q.link) continue
    assert.ok(q.link in links, `link inexistente em "${q.id}": ${q.link}`)
  }
})

test('links pendentes seguem null — não viram link quebrado', () => {
  for (const chave of ['mapa', 'regulamentoRota', 'regulamentoAwards', 'areaAvaliacao', 'pressKit']) {
    assert.equal(links[chave], null, `${chave} deixou de ser null: confira se a rota existe mesmo`)
  }
})

test('imprensa aponta para uma rota que existe de verdade (contato)', () => {
  assert.equal(links.imprensa.rota, 'contato')
})

/* "Comece por aqui" (src/data/conteudo/contato.js) é uma seleção editorial por
   id. Um id errado não quebra nada visível: a pergunta só some da lista, em
   silêncio. Aqui ele reprova. */
test('"Comece por aqui" só aponta para perguntas que existem', async () => {
  const { COMECE } = await import('../src/data/conteudo/contato.js')
  const ids = new Set(perguntas.map((p) => p.id))
  assert.ok(COMECE.perguntas.length > 0, 'a seleção não pode ficar vazia')
  for (const id of COMECE.perguntas) assert.ok(ids.has(id), `id inexistente em COMECE: ${id}`)
  assert.equal(new Set(COMECE.perguntas).size, COMECE.perguntas.length, 'id repetido em COMECE')
})
