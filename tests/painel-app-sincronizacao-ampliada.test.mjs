// Continuação de painel-app-sincronizacao.test.mjs (19/10/2026): do aviso por DOM
// até o barramento, a classificação de TODA chamada do app e o lado marca.
// Comportamento real, não presença de texto no código.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { rpc } from '../painel-app/src/lib/rpc.js'
import { api } from '../painel-app/src/lib/marcaApi.js'
import { barramento } from '../painel-app/src/lib/sync/barramento.js'
import { DOMINIOS_VISTAS } from '../painel-app/src/lib/syncFichas.js'
import {
  RPC_ESCRITA, RPC_LEITURA, RPC_SEM_SINAL, FUNCOES_ESCRITA, FUNCOES_SEM_SINAL, TABELA_ESCRITA, TABELA_SEM_SINAL,
  DOMINIOS, dominiosDeRpc, dominiosDeApi, foiConfirmada,
} from '../painel-app/src/lib/sync/dominios.js'

const ok = (corpo) => async () => ({ ok: true, status: 200, text: async () => JSON.stringify(corpo), json: async () => corpo })

async function comJanela(fn) {
  const anterior = globalThis.window
  globalThis.window = new EventTarget()
  const eventos = []
  globalThis.window.addEventListener('scw:painel:alteracao', (e) => eventos.push(e.detail))
  try { await fn(eventos) } finally { globalThis.window = anterior }
}

test('gravação confirmada chega ao OUVINTE de uma tela pelo barramento (mesma sessão, em ~150 ms)', async () => {
  await comJanela(async () => {
    const recebidos = []
    const desligar = barramento.ouvir(['participantes', 'unidades'], (a) => recebidos.push(a))
    try {
      await rpc('org_salvar_unidade', { p_secret: null, p_unidade: 'x' }, ok(null))
      await new Promise((r) => setTimeout(r, 400))
      assert.equal(recebidos.length, 1)
      assert.deepEqual([...recebidos[0].dominios].sort(), ['participantes', 'unidades'])
      assert.deepEqual(recebidos[0].origens, ['local'])
    } finally { desligar() }
  })
})

test('horário no festival da unidade: org_salvar_horario_unidade é ESCRITA de unidades (devolve o nº de períodos, não {ok})', async () => {
  assert.ok(!RPC_LEITURA.has('org_salvar_horario_unidade') && !RPC_SEM_SINAL.has('org_salvar_horario_unidade'))
  // Mesma tabela e mesmo gatilho de "alterado após aprovação" de org_salvar_unidade: os mesmos domínios.
  assert.deepEqual(dominiosDeRpc('org_salvar_horario_unidade'), dominiosDeRpc('org_salvar_unidade'))
  assert.ok(dominiosDeRpc('org_salvar_horario_unidade').includes('unidades'))
  // A ficha (o editor e a Visão do participante) relê ao receber o que esse salvamento anuncia — desta sessão ou de outra.
  for (const vista of ['fichaParticipacao', 'fichaGeral']) {
    assert.ok(dominiosDeRpc('org_salvar_horario_unidade').some((d) => DOMINIOS_VISTAS[vista].includes(d)), vista)
  }
  await comJanela(async (eventos) => {
    await rpc('org_salvar_horario_unidade', { p_secret: null, p_participacao: 'p', p_unidade: 'u', p_linhas: [{ data: '2026-11-05', abre: '10:00', fecha: '22:00' }] }, ok(1))
    assert.equal(eventos.length, 1)
    assert.deepEqual([...eventos[0].dominios].sort(), ['participantes', 'unidades'])
  })
})

test('retorno {ok:false} (recusa de negócio) e `false` NÃO são alteração confirmada', async () => {
  await comJanela(async (eventos) => {
    await rpc('publicar_participacao', { p_participacao: 'x' }, ok({ ok: false, faltando: ['logo'] }))
    await rpc('organizacao_atualizar_registro', { p_id: 'x' }, ok(false))
    assert.equal(eventos.length, 0)
    await rpc('publicar_participacao', { p_participacao: 'x' }, ok({ ok: true, versao: 3 }))
    assert.equal(eventos.length, 1)
  })
  assert.equal(foiConfirmada(false), false)
  assert.equal(foiConfirmada({ ok: false }), false)
  assert.equal(foiConfirmada(null), true)
  assert.equal(foiConfirmada([]), true)
})

test('padronizar_nomes só avisa quando APLICA; o ensaio (p_aplicar:false) é leitura', async () => {
  assert.deepEqual(dominiosDeRpc('padronizar_nomes', { p_aplicar: false }), [])
  assert.ok(dominiosDeRpc('padronizar_nomes', { p_aplicar: true }).includes('participantes'))
})

test('org_preenchimento(s) leem (e criam link): se avisassem, a tela recarregaria para sempre', async () => {
  await comJanela(async (eventos) => {
    await rpc('org_preenchimentos', { p_secret: null, p_gerar: true }, ok({ links: [] }))
    await rpc('org_preenchimento', { p_secret: null, p_participacao: 'x', p_gerar: true, p_novo: false }, ok({}))
    assert.equal(eventos.length, 0)
  })
})

test('lado marca: PATCH/POST/DELETE confirmados avisam; GET e push não; vazio por RLS não é confirmação', async () => {
  const sessao = JSON.stringify({ access_token: 'a.b.c', refresh_token: 'r', expira_em: Date.now() + 3600e3, email: 'x@y' })
  const antes = globalThis.localStorage
  globalThis.localStorage = { getItem: () => sessao, setItem() {}, removeItem() {} }
  try {
    await comJanela(async (eventos) => {
      await api('participantes_itens?id=eq.1', { metodo: 'PATCH', corpo: { nome: 'a' }, prefer: 'return=representation' }, ok([{ id: 1 }]))
      assert.equal(eventos.length, 1)
      assert.ok(eventos[0].dominios.includes('cadastro'))
      await api('participantes_itens?id=eq.1', { metodo: 'PATCH', corpo: { nome: 'a' }, prefer: 'return=representation' }, ok([]))
      assert.equal(eventos.length, 1, 'PATCH que a RLS não deixou gravar (volta []) não é alteração')
      await api('participantes_itens?select=*', {}, ok([{ id: 1 }]))
      await api('push_subscriptions', { metodo: 'POST', corpo: {} }, ok(null))
      assert.equal(eventos.length, 1, 'leitura e assinatura de push do aparelho não avisam')
      await api('rpc/marca_ler_notificacoes', { metodo: 'POST', corpo: { p_ids: null } }, ok(2))
      assert.equal(eventos.length, 2)
      assert.deepEqual(eventos[1].dominios, ['avisos'])
      await api('rpc/marca_minha_logo', { metodo: 'POST', corpo: {} }, ok({}))
      assert.equal(eventos.length, 2, 'RPC de leitura da marca não avisa')
    })
  } finally { globalThis.localStorage = antes }
})

test('o evento DOM carrega só domínios, origem e id opaco — nunca o corpo da gravação', async () => {
  await comJanela(async (eventos) => {
    await rpc('salvar_contato', { p_secret: null, p_dados: { nome: 'Fulana', telefone: '84 99999-0000', email: 'f@x.com' } }, ok('00000000-0000-0000-0000-000000000000'))
    const txt = JSON.stringify(eventos)
    assert.ok(!/Fulana|99999|f@x\.com/.test(txt))
    assert.deepEqual(Object.keys(eventos[0]).sort(), ['dominios', 'em', 'origem', 'ref'])
  })
})

function arquivosJs(dir) {
  const lista = []
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome)
    if (statSync(p).isDirectory()) lista.push(...arquivosJs(p))
    else if (/\.(js|jsx)$/.test(nome)) lista.push(p)
  }
  return lista
}

test('toda RPC/Edge Function chamada pelo painel está classificada (leitura, sem sinal ou gravação com domínios)', () => {
  const raiz = join(import.meta.dirname, '..', 'painel-app', 'src')
  const nomes = new Set()
  for (const arq of arquivosJs(raiz)) {
    if (arq.includes(join('lib', 'sync'))) continue
    const src = readFileSync(arq, 'utf8')
    for (const m of src.matchAll(/(?:rpc|chamarFuncao)\(\s*'([a-zA-Z0-9_-]+)'/g)) nomes.add(m[1])
    for (const m of src.matchAll(/rpc\/([a-z_0-9]+)/g)) nomes.add(m[1])
    for (const m of src.matchAll(/\brpc:\s*'([a-z_0-9]+)'/g)) nomes.add(m[1])
  }
  assert.ok(nomes.size > 100, 'achou as chamadas do app (' + nomes.size + ')')
  const sem = [...nomes].filter((n) => !(
    /^get_/.test(n) || RPC_LEITURA.has(n) || RPC_SEM_SINAL.has(n) || n in RPC_ESCRITA || n in FUNCOES_ESCRITA || FUNCOES_SEM_SINAL.has(n)))
  assert.deepEqual(sem, [], 'RPC/função sem classificação em painel-app/src/lib/sync/dominios.js: ' + sem.join(', '))
})

test('tabelas gravadas direto pelo lado marca estão classificadas', () => {
  const raiz = join(import.meta.dirname, '..', 'painel-app', 'src', 'components', 'vistas-marca')
  const lidas = new Set(['edicoes', 'temas_propostos', 'perfis', 'solicitacoes', 'notificacoes', 'mensagens', 'correcoes_campo', 'solicitacao_estado'])
  const tabelas = new Set()
  for (const arq of arquivosJs(raiz)) {
    const src = readFileSync(arq, 'utf8')
    for (const m of src.matchAll(/api\(\s*[`']([a-z_]+)[?`'][^)]*metodo:\s*'(?:POST|PATCH|PUT|DELETE)'/g)) tabelas.add(m[1])
  }
  const sem = [...tabelas].filter((t) => !(t in TABELA_ESCRITA) && !TABELA_SEM_SINAL.has(t) && !lidas.has(t))
  assert.deepEqual(sem, [], 'tabela escrita pela marca sem domínio: ' + sem.join(', '))
})

test('todo domínio usado nas tabelas de classificação existe no vocabulário fechado', () => {
  const usados = new Set([
    ...Object.values(RPC_ESCRITA).flat(), ...Object.values(FUNCOES_ESCRITA).flat(), ...Object.values(TABELA_ESCRITA).flat(),
  ])
  const fora = [...usados].filter((d) => !DOMINIOS.includes(d))
  assert.deepEqual(fora, [])
  assert.equal(dominiosDeApi('participantes?id=eq.1', 'PATCH').includes('participantes'), true)
  assert.deepEqual(dominiosDeApi('rpc/marca_confirmar_leitura', 'POST'), ['arquivos'], 'confirmar a leitura relê Arquivos, Fotos e o Início')
  assert.deepEqual(dominiosDeApi('participantes?id=eq.1', 'GET'), [])
})
