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
  const m = HTML.match(/endpoint:\s*'([^']*)'/)
  assert.ok(m, 'CONFIG.endpoint não encontrado')
  assert.ok(m[1].startsWith('https://'), 'endpoint vazio ou não-HTTPS: o envio cairia no mailto')
})

test('só afirma envio depois de confirmar a gravação', () => {
  const js = SCRIPTS[0]
  const ok = js.indexOf("mostrar('ok'")
  const guarda = js.indexOf('if (!r.ok) throw')
  assert.ok(guarda > -1 && ok > guarda, 'a mensagem de sucesso tem que vir DEPOIS da checagem de r.ok')
})

test('todo asset absoluto existe em public/', () => {
  const pedidos = [...HTML.matchAll(/(?:url\('|src="|href=")(\/[^"')]+)/g)].map((m) => m[1])
  for (const p of new Set(pedidos)) {
    const alvo = new URL('../public' + p, import.meta.url)
    // Caixa exata importa: a Vercel roda Linux, o Windows não denuncia.
    assert.ok(readFileSync(alvo), 'asset ausente: ' + p)
  }
})
