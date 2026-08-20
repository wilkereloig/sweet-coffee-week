/*
 * A página /quero-participar é estática: o JS mora inline no HTML e NÃO passa
 * pelo build do Vite. Ou seja, `npm run build` passa mesmo com o script
 * quebrado — foi assim que um erro de sintaxe e uma função apagada chegaram ao
 * commit sem ninguém ver.
 *
 * Estas checagens cobrem exatamente esse vão. Rodar: node --test tests/quero-participar.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const HTML = readFileSync(new URL('../public/quero-participar/index.html', import.meta.url), 'utf8')
const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])

test('o HTML traz exatamente um bloco de script inline', () => {
  assert.equal(SCRIPTS.length, 1)
})

test('o script inline compila', () => {
  // new Function não executa: só força o parse. Pega string não terminada,
  // parêntese sobrando e afins.
  assert.doesNotThrow(() => new Function(SCRIPTS[0]))
})

test('toda função chamada está declarada', () => {
  const js = SCRIPTS[0]
  const declaradas = new Set([...js.matchAll(/(?:function\s+|const\s+|let\s+)([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))
  // Só as do próprio arquivo: as globais do browser ficam de fora da lista.
  const criticas = ['montarResumo', 'coletar', 'validarPasso', 'validarTudo', 'mostrar',
                    'atualizarOutros', 'atualizarContaChips', 'preenchido', 'marcar', 'campos', 'copiar']
  const faltando = criticas.filter((f) => !declaradas.has(f))
  assert.deepEqual(faltando, [], 'função chamada mas nunca declarada: ' + faltando.join(', '))
})

test('não sobrou referência ao wizard de passos', () => {
  // O formulário virou página única em 20/08/2026. Estes nomes morreram junto;
  // se voltarem, é sinal de que um patch antigo foi reaplicado por cima.
  for (const morto of ['irPara', 'btnAvancar', 'btnVoltar', 'pa-trilha', 'montarRevisao']) {
    assert.ok(!HTML.includes(morto), 'referência morta ao wizard: ' + morto)
  }
})

test('o envio tem destino configurado', () => {
  // Supabase OU endpoint genérico. Sem nenhum dos dois o envio cai no mailto,
  // que não grava nada e não chega ao painel da organização.
  const sb = HTML.match(/supabaseUrl:\s*'([^']*)'/)
  const ep = HTML.match(/endpoint:\s*'([^']*)'/)
  const alvo = (sb && sb[1]) || (ep && ep[1]) || ''
  assert.ok(alvo.startsWith('https://'), 'nenhum destino HTTPS configurado: o envio cairia no mailto')
})

test('a chave do Supabase é a publicável, nunca a service_role', () => {
  assert.ok(!/service_role|\bsb_secret_/.test(HTML), 'chave secreta em arquivo de public/')
  const m = HTML.match(/supabaseKey:\s*'([^']*)'/)
  if (m && m[1]) assert.ok(m[1].startsWith('sb_publishable_'), 'chave não é publicável: ' + m[1].slice(0, 16))
})

test('os campos que a RPC exige saem da coleta', () => {
  // submit_quero_participar levanta exceção sem nome, empresa e email, e lê
  // carroChefe para a coluna consultável. Se o formulário renomear um desses,
  // o envio passa a falhar só em produção — este teste falha antes.
  const ordem = HTML.match(/const ORDEM = \[([\s\S]*?)\]/)
  assert.ok(ordem, 'ORDEM não encontrada')
  for (const campo of ['nome', 'empresa', 'email', 'carroChefe']) {
    assert.ok(ordem[1].includes("'" + campo + "'"), 'campo exigido pela RPC não está em ORDEM: ' + campo)
  }
})

test('só afirma envio depois de confirmar a gravação', () => {
  const js = SCRIPTS[0]
  const ok = js.indexOf("mostrar('ok'")
  const guarda = js.indexOf('if (!r.ok)')
  assert.ok(guarda > -1, 'sumiu a checagem de r.ok')
  assert.ok(ok > guarda, 'a mensagem de sucesso tem que vir DEPOIS da checagem de r.ok')
  // O guard tem que interromper de verdade: sem throw ele vira comentário caro.
  assert.match(js.slice(guarda, ok), /throw\s+new\s+Error/, 'o if (!r.ok) não interrompe o fluxo')
})

test('todo asset absoluto existe em public/', () => {
  const pedidos = [...HTML.matchAll(/(?:url\('|src="|href=")(\/[^"')]+)/g)].map((m) => m[1])
  for (const p of new Set(pedidos)) {
    const alvo = new URL('../public' + p, import.meta.url)
    // Caixa exata importa: a Vercel roda Linux, o Windows não denuncia.
    assert.ok(readFileSync(alvo), 'asset ausente: ' + p)
  }
})
