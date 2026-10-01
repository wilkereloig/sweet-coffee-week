import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { entrarComoContaOrganizacao, CHAVE_SESSAO, RECADO, DOMINIO_EQUIPE, USUARIO_VALIDO, loginDaConta } from '../src/lib/orgAccess.js'

// Lógica pura (signIn e guardar injetados, sem DOM/rede) — mesmo padrão de
// adminAccess.js e marcaAccess.js.

test('CHAVE_SESSAO é própria, diferente da senha única e da marca (decisão D3)', () => {
  assert.equal(CHAVE_SESSAO, 'scw_org_conta')
})

test('vazio: recusa sem chamar signIn nem guardar', async () => {
  let chamouSignIn = false
  let chamouGuardar = false
  const r = await entrarComoContaOrganizacao({
    email: '', senha: '',
    signIn: async () => { chamouSignIn = true },
    guardar: () => { chamouGuardar = true },
  })
  assert.equal(r.ok, false)
  assert.equal(r.erro, 'vazio')
  assert.equal(chamouSignIn, false)
  assert.equal(chamouGuardar, false)
  assert.ok(RECADO.vazio)
})

test('sucesso: guarda a sessão no formato certo, e-mail minúsculo e sem espaço nas pontas', async () => {
  let guardado = null
  const r = await entrarComoContaOrganizacao({
    email: '  Maria@Scw.Com  ',
    senha: 'x',
    signIn: async (email, senha) => {
      assert.equal(email, 'maria@scw.com') // já veio minúsculo/limpo de dentro da lib
      assert.equal(senha, 'x')
      return { data: { session: { access_token: 'a1', refresh_token: 'r1', expires_in: 3600, user: { email: 'maria@scw.com' } } }, error: null }
    },
    guardar: (chave, valor) => { guardado = { chave, valor } },
  })
  assert.equal(r.ok, true)
  assert.equal(guardado.chave, CHAVE_SESSAO)
  const sessao = JSON.parse(guardado.valor)
  assert.equal(sessao.access_token, 'a1')
  assert.equal(sessao.refresh_token, 'r1')
  assert.equal(sessao.email, 'maria@scw.com')
  assert.ok(sessao.expira_em > Date.now(), 'expira_em tem que ser o INSTANTE calculado, não o expires_in cru')
})

test('usuário sem @ vira o endereço interno da equipe; com @ segue como e-mail', async () => {
  const recebidos = []
  for (const digitado of ['Ana.Producao ', 'maria@scw.com']) {
    await entrarComoContaOrganizacao({
      email: digitado, senha: 'x',
      signIn: async (email) => { recebidos.push(email); return { data: {}, error: { message: 'invalid' } } },
      guardar: () => {},
    })
  }
  assert.deepEqual(recebidos, ['ana.producao@' + DOMINIO_EQUIPE, 'maria@scw.com'])
  assert.equal(loginDaConta('ana.producao@' + DOMINIO_EQUIPE), 'ana.producao')
  assert.equal(loginDaConta('maria@scw.com'), 'maria@scw.com')
})

test('o domínio da equipe é o mesmo na lib e na Edge Function que cria a conta', () => {
  const fn = readFileSync(new URL('../supabase/functions/criar-conta-organizacao/index.ts', import.meta.url), 'utf8')
  assert.ok(fn.includes("'" + DOMINIO_EQUIPE + "'"), 'criar-conta-organizacao usa outro domínio — a conta nasceria num endereço que o login não monta')
  assert.ok(fn.includes(USUARIO_VALIDO.source), 'a regra do usuário divergiu entre a lib e a Edge Function')
})

test('credenciais erradas: erro genérico, não confirma qual campo está errado', async () => {
  const r = await entrarComoContaOrganizacao({
    email: 'maria@scw.com', senha: 'errada',
    signIn: async () => ({ data: {}, error: { message: 'invalid_grant' } }),
    guardar: () => {},
  })
  assert.equal(r.ok, false)
  assert.equal(r.erro, 'credenciais')
  assert.equal(/existe|cadastrad/i.test(RECADO.credenciais), false, 'a mensagem não pode confirmar se o e-mail existe')
})

test('rede: signIn rejeita, recusa como falha de rede', async () => {
  const r = await entrarComoContaOrganizacao({
    email: 'maria@scw.com', senha: 'x',
    signIn: async () => { throw new Error('failed to fetch') },
    guardar: () => {},
  })
  assert.equal(r.ok, false)
  assert.equal(r.erro, 'rede')
})

test('sessão bloqueada: credenciais corretas, mas guardar() falha (janela anônima)', async () => {
  const r = await entrarComoContaOrganizacao({
    email: 'maria@scw.com', senha: 'x',
    signIn: async () => ({ data: { session: { access_token: 'a1', refresh_token: 'r1', expires_in: 3600 } }, error: null }),
    guardar: () => { throw new Error('storage bloqueado') },
  })
  assert.equal(r.ok, false)
  assert.equal(r.erro, 'sessao')
})
