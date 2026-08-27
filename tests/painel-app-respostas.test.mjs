// `dataCurta` mostra o dia no FUSO DE QUEM VÊ (é o que a produção já faz —
// `public/painel/index.html`, `public/organizacao/index.html` e
// `public/marca/index.html` usam o mesmo `toLocaleDateString` sem fuso
// fixo). Isso é o comportamento certo pro público real (equipe em
// Natal/RN), mas torna o teste dependente do fuso da MÁQUINA que roda —
// sem fixar, o mesmo `assert` passa numa máquina e falha noutra. Fixar
// aqui resolve o determinismo SEM mudar o comportamento real (o código
// de produção nunca fixa fuso — só este teste fixa, pra ele mesmo).
process.env.TZ = 'America/Sao_Paulo'

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ORIGENS, todos, filtrados, dataCurta, camposDetalhe, ROTULO_STATUS } from '../painel-app/src/lib/respostas.js'

test('ORIGENS tem as três origens vivas, participar não voltou', () => {
  assert.deepEqual(Object.keys(ORIGENS).sort(), ['apoiar', 'contato', 'quero_participar'])
})

test('todos junta as origens e ordena por data, mais recente primeiro', () => {
  const dados = {
    quero_participar: [{ id: 1, created_at: '2026-01-01T00:00:00Z' }],
    apoiar: [{ id: 2, created_at: '2026-06-01T00:00:00Z' }],
    contato: [],
  }
  const r = todos(dados)
  assert.deepEqual(r.map((x) => x.reg.id), [2, 1])
  assert.equal(r[0].origem, 'apoiar')
})

test('filtrados por aba específica só devolve aquela origem', () => {
  const dados = {
    quero_participar: [{ id: 1, created_at: '2026-01-01T00:00:00Z', status: 'novo' }],
    apoiar: [{ id: 2, created_at: '2026-01-01T00:00:00Z', status: 'novo' }],
    contato: [],
  }
  const r = filtrados(dados, { aba: 'apoiar', status: '', dias: null, termo: '' })
  assert.equal(r.length, 1)
  assert.equal(r[0].origem, 'apoiar')
})

test('filtrados por termo de busca casa nome, empresa e e-mail', () => {
  const dados = {
    quero_participar: [{ id: 1, created_at: '2026-01-01T00:00:00Z', status: 'novo', empresa: 'Bolomania' }],
    apoiar: [], contato: [],
  }
  const achou = filtrados(dados, { aba: 'tudo', status: '', dias: null, termo: 'bolo' })
  const naoAchou = filtrados(dados, { aba: 'tudo', status: '', dias: null, termo: 'zzz' })
  assert.equal(achou.length, 1)
  assert.equal(naoAchou.length, 0)
})

test('camposDetalhe só mostra campos conhecidos e preenchidos, com rótulo legível', () => {
  const reg = { empresa: 'Bolomania', nome: 'Ana', cidade: '', instagram: '@bolomania', lixo: 'não devia aparecer' }
  const pares = camposDetalhe('quero_participar', reg)
  assert.deepEqual(pares, [['Responsável', 'Ana'], ['Negócio', 'Bolomania'], ['Instagram', '@bolomania']])
})

test('camposDetalhe soma o payload do quero_participar quando o campo não é conhecido', () => {
  const reg = { empresa: 'Bolomania', payload: { historia: 'Começou em casa', extra: '' } }
  const pares = camposDetalhe('quero_participar', reg)
  assert.deepEqual(pares, [['Negócio', 'Bolomania'], ['A história', 'Começou em casa']])
})

test('camposDetalhe devolve lista vazia para origem ou registro ausente', () => {
  assert.deepEqual(camposDetalhe('inexistente', { empresa: 'x' }), [])
  assert.deepEqual(camposDetalhe('quero_participar', null), [])
})

test('ROTULO_STATUS cobre todo status que as três origens aceitam', () => {
  const todosStatus = new Set(Object.values(ORIGENS).flatMap((o) => o.status))
  for (const s of todosStatus) assert.ok(ROTULO_STATUS[s], 'status sem rótulo: ' + s)
})

test('dataCurta formata no padrão dd/mm/aa, no fuso de quem vê', () => {
  // 2026-03-05T00:00:00Z em America/Sao_Paulo (UTC-3) ainda é 04/03 às
  // 21h — é ESSE dia que o calendário de quem vê deve mostrar, não o dia
  // UTC. Confirma com `new Date(...).getDate()` local antes de mudar este
  // valor: ele tem que bater com o fuso fixado no topo do arquivo.
  assert.equal(dataCurta('2026-03-05T00:00:00Z'), '04/03/26')
})
