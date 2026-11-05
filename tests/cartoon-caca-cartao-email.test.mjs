// Cartão de e-mail do mapa: o link sai sozinho depois do código, o estado é verdadeiro e o cartão está em toda tela da Caça.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CACA } from '../src/edicao/caca/textos.js'

const fonte = (c) => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8')

test('cartão: envia o link sozinho após o código, com falha e reenvio, sem gravar chave', () => {
  const f = fonte('src/edicao/caca/CartaoEmail.jsx')
  assert.match(f, /aoConcluir=\{aoConfirmar\}/)
  assert.match(f, /async function aoConfirmar[\s\S]*await enviarLink\(\)/, 'o primeiro envio não depende de segundo botão')
  assert.match(f, /T\.tentarEnviar/)
  assert.doesNotMatch(f, /localStorage|console\.|gtag|dataLayer/, 'chave e link nunca em storage, log ou analytics')
  assert.match(f, /sessionStorage/, 'dispensa só na visita')
})

test('textos: "aceito" nunca vira "entregue"', () => {
  const E = CACA.email
  for (const t of [E.confirmadoLinkPedido('a**@x.com'), E.linkPedido('a**@x.com')]) {
    assert.match(t, /Pedimos o envio/)
    assert.doesNotMatch(t, /entregue|chegou|Enviamos/)
  }
  assert.equal(E.tentarEnviar, 'Tentar enviar novamente')
  assert.match(E.confirmadoLinkFalhou, /mapa continua aberto/)
})

test('cartão montado na Central, no mapa e no carimbo; recuperar visível antes do formulário', () => {
  assert.match(fonte('src/edicao/caca/Central.jsx'), /<CartaoEmail /)
  assert.match(fonte('src/edicao/cartoon/paginas/mapa/index.jsx'), /<CartaoEmail caca=\{meu\}/)
  assert.match(fonte('src/edicao/cartoon/paginas/Carimbo.jsx'), /<CartaoEmailDoAparelho/)
  assert.match(fonte('src/edicao/caca/CriarMapa.jsx'), /T\.jaTenhoTopo/)
})

test('um mapa por e-mail: motivo com frase, aviso leva à recuperação sem gravar chave', () => {
  assert.match(CACA.criar.jaTemMapa.titulo, /já tem um mapa/)
  assert.match(fonte('src/edicao/caca/textos.js'), /email_ja_tem_mapa:/)
  const f = fonte('src/edicao/caca/CriarMapa.jsx')
  assert.match(f, /r\.motivo === 'email_ja_tem_mapa'[\s\S]*setJaTem\(true\); return/, 'sai antes de gravar chave')
  assert.match(f, /\/caca\/recuperar/)
  assert.match(fonte('supabase/migrations/20261225_caca_um_mapa_por_email.sql'), /'motivo', 'email_ja_tem_mapa'/)
})
