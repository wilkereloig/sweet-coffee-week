/*
 * A barreira 3, executada.
 *
 * `conferirTurnstile` é extraída do arquivo real da Edge Function e rodada com
 * `Deno.env` e `fetch` injetados — mesmo método de `tests/comportamento.test.mjs`,
 * pelo mesmo motivo: conferir o texto da função não prova o que ela decide.
 *
 * O que estes testes protegem é a diferença entre "o captcha está ligado" e "o
 * captcha protege". Conferir só `success` deixa passar token de outro
 * formulário e token gerado em `localhost`.
 *
 * Rodar: node --test tests/turnstile.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'

const RAIZ = new URL('../', import.meta.url)
const ler = (p) => readFileSync(new URL(p, RAIZ), 'utf8')

const FONTE = ler('supabase/functions/enviar-formulario/index.ts')

// Monta a função com o ambiente e a rede que o teste quiser.
function comAmbiente(env, resposta) {
  const corpo = FONTE
    .replace(/import \{ createClient \}[^\n]*\n/, '')
    .replace(/Deno\.serve\([\s\S]*$/, '')
  const js = transformSync(corpo, { loader: 'ts', format: 'cjs' }).code
  const mod = { exports: {} }
  // `require` entra como tapa-buraco: o esbuild em CJS emite a chamada para o
  // que sobrou do import, e sem ela o modulo nem carrega.
  new Function('module', 'exports', 'Deno', 'fetch', 'FormData', 'AbortSignal', 'require', js +
    '\nexports.conferirTurnstile = conferirTurnstile;' +
    '\nexports.EXIGE_TURNSTILE = EXIGE_TURNSTILE;' +
    '\nexports.RPC_PERMITIDA = RPC_PERMITIDA;')(
    mod, mod.exports,
    { env: { get: (k) => env[k] } },
    async () => resposta,
    globalThis.FormData,
    { timeout: () => undefined },
    () => ({}),
  )
  return mod.exports
}

const AMBIENTE = {
  TURNSTILE_SECRET_KEY: 'segredo-de-teste',
  TURNSTILE_HOSTNAMES: 'sweetcoffeeweek.com.br,www.sweetcoffeeweek.com.br',
}
const ok = (corpo) => ({ ok: true, status: 200, json: async () => corpo })

const conferir = (env, corpo, token = 'tok', acao = 'quero_participar') =>
  comAmbiente(env, ok(corpo)).conferirTurnstile(token, '1.2.3.4', acao)

test('aprova quando os três campos batem', async () => {
  assert.equal(await conferir(AMBIENTE, {
    success: true, action: 'quero_participar', hostname: 'sweetcoffeeweek.com.br',
  }), true)
})

test('reprova token de OUTRO formulário do mesmo widget', async () => {
  // Sem conferir `action`, um token tirado do Contato mandaria pré-cadastro.
  assert.equal(await conferir(AMBIENTE, {
    success: true, action: 'contato', hostname: 'sweetcoffeeweek.com.br',
  }), false)
})

test('reprova token gerado em localhost', async () => {
  // ⛔ O widget aceita localhost para o desenvolvimento funcionar. O servidor
  // de produção NÃO pode aceitar — senão qualquer pessoa gera token na própria
  // máquina e envia para produção.
  for (const host of ['localhost', '127.0.0.1', 'sweetcoffeeweek.com.br.evil.test']) {
    assert.equal(await conferir(AMBIENTE, {
      success: true, action: 'quero_participar', hostname: host,
    }), false, 'devia reprovar hostname ' + host)
  }
})

test('reprova quando a Cloudflare diz que não', async () => {
  assert.equal(await conferir(AMBIENTE, {
    success: false, 'error-codes': ['invalid-input-response'],
  }), false)
})

test('token ausente ou absurdo nem vira requisição', async () => {
  assert.equal(await conferir(AMBIENTE, ok({}), ''), false)
  assert.equal(await conferir(AMBIENTE, ok({}), 'a'.repeat(2049)), false)
})

test('sem a chave privada, fica "não avaliado" — não reprovado', async () => {
  // É o modo desligado por bandeira: o código fica pronto e inerte.
  assert.equal(await conferir({}, { success: true }), null)
})

test('segredo posto e hostnames esquecidos NÃO bloqueia tudo em silêncio', async () => {
  // Recusar aqui derrubaria todo envio do festival por uma variável faltando, e
  // sem ninguém perceber — que é exatamente o defeito que este projeto passou
  // meses caçando. Fica "não avaliado" e grita no log.
  assert.equal(await conferir(
    { TURNSTILE_SECRET_KEY: 'x' },
    { success: true, action: 'quero_participar', hostname: 'sweetcoffeeweek.com.br' },
  ), null)
})

test('Cloudflare fora do ar não derruba o formulário', async () => {
  const mod = comAmbiente(AMBIENTE, { ok: false, status: 502, json: async () => ({}) })
  assert.equal(await mod.conferirTurnstile('tok', '', 'quero_participar'), null)
})

test('só exige Turnstile de formulário que DESENHA o widget', () => {
  // 🐛 A armadilha: Contato e Apoiar mandam `token: ''` porque não renderizam o
  // widget. Exigir token deles no dia em que o segredo for configurado faria os
  // dois descartarem TODO envio, em silêncio.
  const { EXIGE_TURNSTILE, RPC_PERMITIDA } = comAmbiente(AMBIENTE, ok({}))

  for (const form of EXIGE_TURNSTILE) {
    assert.ok(RPC_PERMITIDA[form], 'formulário fora da allowlist: ' + form)
    const pagina = ler('public/' + form.replace(/_/g, '-') + '/index.html')
    assert.match(pagina, /cf-turnstile/,
      form + ' exige Turnstile mas a página não desenha o widget')
    assert.match(pagina, new RegExp("data-action'?,\\s*'" + form + "'"),
      form + ": o widget precisa mandar data-action='" + form + "'")
  }

  // O caminho inverso: quem manda token vazio não pode estar na lista.
  const envia = ler('src/lib/enviarFormulario.js')
  if (/token:\s*''/.test(envia)) {
    for (const form of ['contato', 'apoio']) {
      assert.ok(!EXIGE_TURNSTILE.has(form),
        form + ' está na lista mas ainda manda token vazio — ligaria o descarte total')
    }
  }
})
