import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rpc, chamarFuncao } from '../painel-app/src/lib/rpc.js'

// rpc() lê sessão de sessionStorage (dois modos, Fase 2 do plano de funções
// da organização) — Node não tem; shim mínimo em memória, mesma técnica de
// tests/painel-app-marcaApi.test.mjs.
function shimSessionStorage(sessaoInicial) {
  const dados = new Map()
  if (sessaoInicial) dados.set('scw_org_conta', JSON.stringify(sessaoInicial))
  globalThis.sessionStorage = {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, v),
    removeItem: (k) => dados.delete(k),
  }
}

test('rpc devolve o corpo já convertido em JSON', async () => {
  const fetchFalso = async (url, opcoes) => {
    assert.equal(url, 'https://dgfmoibynftadsyjcclg.supabase.co/rest/v1/rpc/admin_ping')
    assert.equal(opcoes.method, 'POST')
    assert.equal(JSON.parse(opcoes.body).p_secret, 'abc')
    return { ok: true, text: async () => 'true' }
  }
  const r = await rpc('admin_ping', { p_secret: 'abc' }, fetchFalso)
  assert.equal(r, true)
})

test('rpc trata resposta 204 sem corpo como null, não como erro', async () => {
  // ⚠️ Bug real já documentado no CLAUDE.md do projeto: RPC `returns void`
  // responde 204 sem corpo, e `r.json()` em cima do vazio estoura. Este
  // teste existe pra essa classe de bug nunca voltar aqui.
  const fetchFalso = async () => ({ ok: true, text: async () => '' })
  const r = await rpc('registrar_algo', {}, fetchFalso)
  assert.equal(r, null)
})

test('rpc lança erro com a mensagem do banco quando a resposta não é ok', async () => {
  const fetchFalso = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ message: 'senha errada' }),
  })
  await assert.rejects(() => rpc('admin_ping', { p_secret: 'x' }, fetchFalso), /senha errada/)
})

test('chamarFuncao devolve o corpo em JSON quando ok', async () => {
  const fetchFalso = async (url, opcoes) => {
    assert.equal(url, 'https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/criar-acesso-marca')
    assert.equal(opcoes.method, 'POST')
    return { ok: true, json: async () => ({ senha_gerada: 'abc123' }) }
  }
  const r = await chamarFuncao('criar-acesso-marca', { slug: 'bocaditos' }, fetchFalso)
  assert.deepEqual(r, { senha_gerada: 'abc123' })
})

test('chamarFuncao lança erro com detalhe/erro do corpo e anexa dados quando não-ok', async () => {
  const fetchFalso = async () => ({
    ok: false,
    status: 409,
    json: async () => ({ erro: 'já existe', candidatura_id: 'xyz' }),
  })
  await assert.rejects(
    () => chamarFuncao('criar-acesso-marca', {}, fetchFalso),
    (e) => {
      assert.match(e.message, /já existe/)
      assert.deepEqual(e.dados, { erro: 'já existe', candidatura_id: 'xyz' })
      return true
    },
  )
})

test('chamarFuncao sem JSON no erro cai no HTTP status', async () => {
  const fetchFalso = async () => ({
    ok: false,
    status: 500,
    json: async () => { throw new Error('corpo vazio') },
  })
  await assert.rejects(() => chamarFuncao('x', {}, fetchFalso), /HTTP 500/)
})

/* ─────────────────────────────────────────────────────────────────────────
   Dois modos (Fase 2 do plano de funções da organização, 27/08/2026):
   sessão nominal de conta troca a chave publicável pelo token da pessoa e
   zera `p_secret`; sem sessão, comportamento idêntico ao de sempre.
   ───────────────────────────────────────────────────────────────────────── */

test('rpc em modo nominal manda o Bearer da pessoa e zera p_secret que o chamador tenha mandado', async () => {
  shimSessionStorage({ access_token: 'tok-nominal', refresh_token: 'r1', expira_em: Date.now() + 5 * 60 * 1000, email: 'x@scw.com' })
  const fetchFalso = async (url, opcoes) => {
    assert.equal(opcoes.headers.Authorization, 'Bearer tok-nominal')
    assert.equal(JSON.parse(opcoes.body).p_secret, null)
    assert.equal(JSON.parse(opcoes.body).outroCampo, 'valor')
    return { ok: true, text: async () => 'true' }
  }
  await rpc('get_participantes', { p_secret: 'senha-que-nunca-deveria-viajar', outroCampo: 'valor' }, fetchFalso)
})

test('rpc em modo nominal NÃO acrescenta p_secret numa chamada que não tinha essa chave', async () => {
  // minhas_permissoes() não declara p_secret — mandar essa chave quebraria a
  // chamada no PostgREST (função de zero argumentos recebendo um a mais).
  shimSessionStorage({ access_token: 'tok-nominal', refresh_token: 'r1', expira_em: Date.now() + 5 * 60 * 1000, email: 'x@scw.com' })
  const fetchFalso = async (url, opcoes) => {
    assert.deepEqual(JSON.parse(opcoes.body), {})
    return { ok: true, text: async () => '[]' }
  }
  await rpc('minhas_permissoes', {}, fetchFalso)
})

test('rpc sem sessão nominal continua no modo de sempre — chave publicável, p_secret do chamador intacto', async () => {
  shimSessionStorage(null)
  const fetchFalso = async (url, opcoes) => {
    assert.match(opcoes.headers.Authorization, /^Bearer sb_publishable_/)
    assert.equal(JSON.parse(opcoes.body).p_secret, 'senha-da-equipe')
    return { ok: true, text: async () => 'true' }
  }
  await rpc('admin_ping', { p_secret: 'senha-da-equipe' }, fetchFalso)
})

test('rpc lança sessao_expirada quando a sessão nominal morreu, sem cair de volta pra chave publicável', async () => {
  // Sessão expirada: renovar() tenta refresh e essa é a chamada que falha.
  shimSessionStorage({ access_token: 'velho', refresh_token: 'r1', expira_em: Date.now() - 1000, email: 'x@scw.com' })
  let chamouRpcDeVerdade = false
  const fetchFalso = async (url) => {
    if (url.includes('/rest/v1/rpc/')) { chamouRpcDeVerdade = true; return { ok: true, text: async () => 'true' } }
    // /auth/v1/token?grant_type=refresh_token — o refresh que falha.
    return { ok: false, status: 401, json: async () => ({ msg: 'refresh inválido' }) }
  }
  await assert.rejects(() => rpc('get_participantes', { p_secret: '' }, fetchFalso), /sessao_expirada/)
  assert.equal(chamouRpcDeVerdade, false, 'sessão morta não pode cair de volta pra chave publicável em silêncio')
})
