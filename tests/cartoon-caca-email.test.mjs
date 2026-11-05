// Caça aos Carimbos — parte pura da edge function caca-email (supabase/functions/caca-email/montar.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { REMETENTE_PADRAO, montarEmail, esc, codigoValido, parseRemetente, mensagemParaLog, provedorEscolhido, politicaFalha, MOTIVOS_PUBLICOS, emailEntregavel, esperaParaPiso, PISO_RESPOSTA_MS, JITTER_RESPOSTA_MS } from '../supabase/functions/caca-email/montar.js'

test('e-mail de recuperar e de confirmar: código, validade, aviso de ignorar, sem apelido', () => {
  for (const fin of ['recuperar', 'confirmar']) {
    const m = montarEmail(fin, '048213')
    assert.ok(m.assunto.includes('048213'))
    for (const parte of [m.html, m.texto]) {
      assert.match(parte, /048213/)
      assert.match(parte, /10 minutos/)
      assert.match(parte, /ignore este e-mail/)
    }
  }
  assert.match(montarEmail('recuperar', '111111').texto, /link antigo/)
  assert.doesNotMatch(montarEmail('confirmar', '111111').texto, /link antigo/)
})

test('só aceita finalidade conhecida e código de exatamente 6 dígitos (nada de texto livre no corpo)', () => {
  assert.equal(montarEmail('outra', '123456'), null)
  for (const ruim of ['12345', '1234567', '12345a', '<b>1</b>', '123 456', '', null, undefined, 123456]) {
    assert.equal(codigoValido(ruim), false, String(ruim))
    assert.equal(montarEmail('recuperar', ruim), null)
  }
  assert.equal(codigoValido('000000'), true)
})

test('escape de HTML cobre os cinco caracteres perigosos e não duplica a entrada do corpo', () => {
  assert.equal(esc(`<script>"a" & 'b'</script>`), '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;')
  assert.equal(esc(null), '')
  const { html } = montarEmail('confirmar', '123456')
  assert.doesNotMatch(html, /<script/i)
  assert.doesNotMatch(html, /\$\{/)
})

test('remetente: "Nome <a@b.com>" e "a@b.com"; lixo vira null', () => {
  assert.deepEqual(parseRemetente('Sweet & Coffee Week <ola@sweetcoffeeweek.com.br>'), { nome: 'Sweet & Coffee Week', email: 'ola@sweetcoffeeweek.com.br' })
  assert.deepEqual(parseRemetente('"Caça" <a@b.co>'), { nome: 'Caça', email: 'a@b.co' })
  assert.deepEqual(parseRemetente(' a@b.co '), { nome: '', email: 'a@b.co' })
  for (const ruim of ['', undefined, 'sem arroba', '<a@b>', 'a@b.co <x>', 'Nome <a b@c.co>']) assert.equal(parseRemetente(ruim), null, String(ruim))
})

test('provedor: Resend primeiro, Brevo só sem Resend; falta lista NOMES e nunca valores', () => {
  const de = 'Time <ola@x.com.br>'
  assert.equal(provedorEscolhido({ RESEND_API_KEY: 'k', BREVO_API_KEY: 'b', EMAIL_FROM: de }).provedor, 'resend')
  assert.equal(provedorEscolhido({ BREVO_API_KEY: 'b', CACA_EMAIL_FROM: de }).provedor, 'brevo')
  assert.equal(provedorEscolhido({ RESEND_API_KEY: 'k', CACA_EMAIL_FROM: 'ruim', EMAIL_FROM: de }).provedor, null, 'CACA_EMAIL_FROM vence a EMAIL_FROM, mesmo inválida')
  const nada = provedorEscolhido({})
  assert.equal(nada.provedor, null)
  assert.deepEqual(nada.faltam, ['RESEND_API_KEY'], 'sem remetente definido vale o padrão')
  assert.deepEqual(provedorEscolhido({ CACA_EMAIL_FROM: 'ruim' }).faltam, ['CACA_EMAIL_FROM (ou EMAIL_FROM) válido', 'RESEND_API_KEY'])
  assert.deepEqual(parseRemetente(REMETENTE_PADRAO)?.email, 'ola@sweetcoffeeweek.com.br')
  assert.equal(provedorEscolhido({ RESEND_API_KEY: 'k' }).provedor, 'resend')
  const semChave = provedorEscolhido({ EMAIL_FROM: de, RESEND_API_KEY: 'segredo-123' })
  assert.ok(!JSON.stringify(provedorEscolhido({ EMAIL_FROM: 'x', RESEND_API_KEY: 'segredo-123' })).includes('segredo-123'))
  assert.equal(semChave.provedor, 'resend')
})

test('política de nova tentativa: rede, timeout, 429 e 5xx repetem uma vez; 4xx de pedido não', () => {
  for (const s of [0, 408, 429, 500, 502, 503]) assert.equal(politicaFalha(s).repetir, true, String(s))
  for (const s of [400, 401, 403, 404, 422]) assert.equal(politicaFalha(s).repetir, false, String(s))
  assert.ok(politicaFalha(429).espera > politicaFalha(500).espera)
})

test('motivos públicos da função são exatamente os que o front sabe tratar', () => {
  assert.deepEqual(MOTIVOS_PUBLICOS, ['email_indisponivel', 'falha_temporaria', 'pedido_invalido', 'metodo_nao_permitido'])
})

test('mensagem do provedor no log: sem e-mail, token ou número longo, e curta', () => {
  const m = mensagemParaLog('Key not found for pessoa@exemplo.com.br token xkeysib-0123456789abcdef0123456789abcdef code 12345678\nlinha')
  assert.doesNotMatch(m, /@|xkeysib|12345678/)
  assert.match(m, /\[email\]/)
  assert.ok(mensagemParaLog('a '.repeat(200)).length <= 120)
  assert.equal(mensagemParaLog(undefined), '')
})

test('SEC-07: só endereço de formato seguro vai ao campo "to" do provedor', () => {
  for (const ok of ['ana@exemplo.com.br', 'Ana.Maria+caca@Exemplo.com', ' a_b-c%d@sub.dominio.co ']) assert.equal(emailEntregavel(ok), true, ok)
  for (const ruim of ['a,b@x.com', 'a"b@x.com', '<a>@x.com', 'a b@x.com', 'a;b@x.com', 'a@x.com,b@y.com', 'joão@x.com', 'a@@x.com', 'a@x', '', null, undefined, 'a@' + 'x'.repeat(250) + '.com'])
    assert.equal(emailEntregavel(ruim), false, String(ruim))
})

test('SEC-07: toda resposta aceita espera o piso fixo mais um acréscimo aleatório limitado', () => {
  assert.equal(esperaParaPiso(0, 0), PISO_RESPOSTA_MS)
  assert.equal(esperaParaPiso(120, 0), PISO_RESPOSTA_MS - 120)
  assert.equal(esperaParaPiso(PISO_RESPOSTA_MS + 500, 0), 0)
  assert.ok(esperaParaPiso(0, 0.999999) < PISO_RESPOSTA_MS + JITTER_RESPOSTA_MS)
  // respostas rápidas e lentas da RPC terminam no mesmo instante (decorrido + espera = piso), qualquer que seja o sorteio
  for (const decorrido of [5, 40, 300]) assert.equal(decorrido + esperaParaPiso(decorrido, 0), PISO_RESPOSTA_MS)
})
