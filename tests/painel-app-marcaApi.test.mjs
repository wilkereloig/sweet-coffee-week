import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renovar, auth, api, precisaTrocarSenha, registrarAoSessaoExpirar, signInComSenha, faltaNoBanco, seFaltar, tokenVivo, recadoSenha } from '../painel-app/src/lib/marcaApi.js'

// api()/precisaTrocarSenha() leem a sessão de sessionStorage, que Node não
// tem — um shim em memória, mínimo, mantém a lib sem DOM de verdade e testa
// o código real (não um atalho que pula lerSessao()/renovar()).
function shimSessionStorage(sessaoInicial) {
  const dados = new Map()
  if (sessaoInicial) dados.set('scw_marca', JSON.stringify(sessaoInicial))
  globalThis.sessionStorage = {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, v),
    removeItem: (k) => dados.delete(k),
  }
}

test('renovar devolve a mesma sessão quando o token ainda tem mais de 60s de validade', async () => {
  const sessao = { access_token: 'a1', refresh_token: 'r1', expira_em: Date.now() + 5 * 60 * 1000, email: 'x@y.z' }
  let chamouFetch = false
  const r = await renovar(sessao, async () => { chamouFetch = true })
  assert.equal(chamouFetch, false)
  assert.equal(r, sessao)
})

test('renovar troca o token quando expirado e o refresh dá certo', async () => {
  const sessao = { access_token: 'velho', refresh_token: 'r1', expira_em: Date.now() - 1000, email: 'x@y.z' }
  const fetchFalso = async (url, opcoes) => {
    assert.equal(url, 'https://dgfmoibynftadsyjcclg.supabase.co/auth/v1/token?grant_type=refresh_token')
    assert.equal(JSON.parse(opcoes.body).refresh_token, 'r1')
    return { ok: true, json: async () => ({ access_token: 'novo', refresh_token: 'r2', expires_in: 3600, user: { email: 'x@y.z' } }) }
  }
  const r = await renovar(sessao, fetchFalso)
  assert.equal(r.access_token, 'novo')
  assert.equal(r.refresh_token, 'r2')
  assert.ok(r.expira_em > Date.now())
})

test('renovar devolve null quando o refresh falha', async () => {
  const sessao = { access_token: 'velho', refresh_token: 'r1', expira_em: Date.now() - 1000, email: 'x@y.z' }
  const fetchFalso = async () => ({ ok: false, status: 401, json: async () => ({ msg: 'refresh inválido' }) })
  const r = await renovar(sessao, fetchFalso)
  assert.equal(r, null)
})

test('renovar lança (não mata a sessão) quando o servidor de auth falha de passagem', async () => {
  const sessao = { access_token: 'velho', refresh_token: 'r1', expira_em: Date.now() - 1000, email: 'x@y.z' }
  for (const status of [429, 500, 503]) {
    const fetchFalso = async () => ({ ok: false, status, json: async () => ({}) })
    await assert.rejects(() => renovar(sessao, fetchFalso), new RegExp('http_' + status))
  }
})

test('renovar devolve null sem sessão nenhuma, sem chamar fetch', async () => {
  let chamouFetch = false
  const r = await renovar(null, async () => { chamouFetch = true })
  assert.equal(r, null)
  assert.equal(chamouFetch, false)
})

test('auth lê o corpo como JSON e reporta ok/status', async () => {
  const fetchFalso = async (url, opcoes) => {
    assert.equal(url, 'https://dgfmoibynftadsyjcclg.supabase.co/auth/v1/token?grant_type=password')
    assert.equal(opcoes.method, 'POST')
    assert.equal(JSON.parse(opcoes.body).email, 'bocaditos@marcas.sweetcoffeeweek.com.br')
    return { ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) }
  }
  const r = await auth('token?grant_type=password', { email: 'bocaditos@marcas.sweetcoffeeweek.com.br', password: 'x' }, 'POST', undefined, fetchFalso)
  assert.equal(r.ok, false)
  assert.equal(r.status, 400)
  assert.deepEqual(r.dados, { error: 'invalid_grant' })
})

/* ─────────────────────────────────────────────────────────────────────────
   precisaTrocarSenha — os três desfechos (Etapa 2.A do handoff de correções):
   antes colapsavam em booleano, escondendo "sessão morta" atrás de "rede
   caiu". Cada teste força um caminho real de renovar()/api(), não um atalho.
   ───────────────────────────────────────────────────────────────────────── */

test('precisaTrocarSenha devolve "ok" — sessão viva, perfil não pede troca', async () => {
  shimSessionStorage({ access_token: 'a', refresh_token: 'r', expira_em: Date.now() + 5 * 60 * 1000, email: 'x@y.z' })
  const r = await precisaTrocarSenha(async () => ({ ok: true, json: async () => [{ deve_trocar_senha: false }] }))
  assert.equal(r, 'ok')
})

test('precisaTrocarSenha devolve "trocar" — sessão viva, perfil pede troca', async () => {
  shimSessionStorage({ access_token: 'a', refresh_token: 'r', expira_em: Date.now() + 5 * 60 * 1000, email: 'x@y.z' })
  const r = await precisaTrocarSenha(async () => ({ ok: true, json: async () => [{ deve_trocar_senha: true }] }))
  assert.equal(r, 'trocar')
})

test('precisaTrocarSenha devolve "morta" — refresh token não vale mais, não é rede', async () => {
  // Sessão expirada: renovar() tenta o refresh e essa é a chamada que falha.
  shimSessionStorage({ access_token: 'velho', refresh_token: 'r1', expira_em: Date.now() - 1000, email: 'x@y.z' })
  const r = await precisaTrocarSenha(async () => ({ ok: false, status: 401, json: async () => ({ msg: 'refresh inválido' }) }))
  assert.equal(r, 'morta')
})

test('precisaTrocarSenha devolve "ok" quando quem falha é a REDE, não a sessão — não tranca ninguém fora por uma consulta que caiu', async () => {
  // Sessão ainda válida: renovar() nem chama fetch; quem falha é a consulta
  // REST em si (perfis?select=...), com um erro que não é 'sessao_expirada'.
  shimSessionStorage({ access_token: 'a', refresh_token: 'r', expira_em: Date.now() + 5 * 60 * 1000, email: 'x@y.z' })
  const r = await precisaTrocarSenha(async () => { throw new Error('failed to fetch') })
  assert.equal(r, 'ok')
})

/* ─────────────────────────────────────────────────────────────────────────
   registrarAoSessaoExpirar — Caminho A: quem trata a sessão morrendo em
   pleno uso é o callback registrado pelo App, chamado ANTES de api() lançar.
   ───────────────────────────────────────────────────────────────────────── */

test('sessão morta dispara o callback registrado antes de api() lançar sessao_expirada, e não chega a chamar fetch', async () => {
  shimSessionStorage(null) // sem sessão nenhuma — renovar() nem tenta refresh
  let chamado = 0
  registrarAoSessaoExpirar(() => { chamado++ })
  try {
    await assert.rejects(
      () => api('participantes?select=id', {}, async () => { throw new Error('não deveria chamar fetch com sessão morta') }),
      /sessao_expirada/
    )
    assert.equal(chamado, 1)
  } finally {
    registrarAoSessaoExpirar(null) // não vaza pros próximos testes do arquivo
  }
})

test('signInComSenha: senha errada é "credenciais"; 429/5xx lança (vira recado de rede, não de senha)', async () => {
  const resp = (status, corpo = {}) => async () => ({ ok: status < 400, status, json: async () => corpo })
  const errada = await signInComSenha('a@b.c', 'x', resp(400, { error: 'invalid_grant' }))
  assert.equal(errada.error.message, 'credenciais')
  await assert.rejects(() => signInComSenha('a@b.c', 'x', resp(429)), /http_429/)
  await assert.rejects(() => signInComSenha('a@b.c', 'x', resp(503)), /http_503/)
})

test('api() leva status e código do PostgREST no erro; só a ausência no banco vira vazio', async () => {
  shimSessionStorage({ access_token: 'a', refresh_token: 'r', expira_em: Date.now() + 5 * 60 * 1000, email: 'x@y.z' })
  const resp = (status, corpo) => async () => ({ ok: false, status, json: async () => corpo })
  const ausente = await api('tabela_nova?select=*', {}, resp(404, { code: 'PGRST205', message: 'relation not found' })).catch((e) => e)
  assert.equal(ausente.status, 404)
  assert.equal(ausente.codigo, 'PGRST205')
  assert.ok(faltaNoBanco(ausente))
  assert.deepEqual(seFaltar([])(ausente), [])
  const fora = await api('tabela?select=*', {}, resp(503, null)).catch((e) => e)
  assert.equal(fora.status, 503)
  assert.ok(!faltaNoBanco(fora))
  assert.throws(() => seFaltar([])(fora), /http_503/)
})

test('tokenVivo renova o token vencido antes de usar e grava a sessão nova', async () => {
  shimSessionStorage({ access_token: 'velho', refresh_token: 'r1', expira_em: Date.now() - 1000, email: 'x@y.z' })
  const token = await tokenVivo('scw_marca', async () => ({ ok: true, status: 200, json: async () => ({ access_token: 'novo', refresh_token: 'r2', expires_in: 3600 }) }))
  assert.equal(token, 'novo')
  assert.equal(JSON.parse(sessionStorage.getItem('scw_marca')).access_token, 'novo')
  shimSessionStorage(null)
  assert.equal(await tokenVivo('scw_marca', async () => { throw new Error('não deveria chamar') }), null)
})

test('recadoSenha não repassa a mensagem crua do GoTrue', () => {
  assert.match(recadoSenha({ status: 422, dados: { error_code: 'same_password', msg: 'New password should be different' } }), /diferente/)
  assert.match(recadoSenha({ status: 401, dados: {} }), /sessão expirou/)
  assert.doesNotMatch(recadoSenha({ status: 500, dados: { msg: 'Internal error' } }), /Internal/)
})
