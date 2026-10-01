import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { AJUDA } from '../painel-app/src/lib/ajuda.js'
import { rotaDoLink } from '../painel-app/src/lib/rota.js'
import { interpretarLinkMarca } from '../painel-app/src/lib/guia.js'
import { estadoInstalacao, conviteDispensado, dispensarConvite } from '../painel-app/src/lib/instalar.js'

// As listas de telas saem do próprio código das cascas (JSX não roda no node).
const lista = (arq, nome) => {
  const m = new RegExp('const ' + nome + ' = \\[([^\\]]*)\\]').exec(readFileSync(new URL('../painel-app/src/components/' + arq, import.meta.url), 'utf8'))
  return m[1].match(/'([a-z]+)'/g).map((x) => x.slice(1, -1))
}
const DESTINOS_ORG = lista('PainelShell.jsx', 'DESTINOS')
const TELAS_MARCA = [...lista('PainelMarcaShell.jsx', 'DESTINOS'), ...lista('PainelMarcaShell.jsx', 'OCULTAS')]

test('ajuda da organização: todo link abre uma tela que existe', () => {
  for (const i of AJUDA.organizacao) {
    if (!i.link) continue
    const r = rotaDoLink(i.link)
    assert.ok(r && DESTINOS_ORG.includes(r.vista), i.titulo + ' → ' + i.link)
    assert.ok(i.acao, i.titulo + ' sem rótulo de ação')
  }
})

test('ajuda da marca: todo link abre uma tela que existe', () => {
  for (const i of AJUDA.marca) {
    if (!i.link) continue
    const r = interpretarLinkMarca(i.link)
    assert.ok(r && TELAS_MARCA.includes(r.vista), i.titulo + ' → ' + i.link)
    assert.ok(i.acao, i.titulo + ' sem rótulo de ação')
  }
})

test('estado da instalação', () => {
  assert.equal(estadoInstalacao({ standalone: true, ios: true, prompt: true }), 'instalado')
  assert.equal(estadoInstalacao({ standalone: false, ios: false, prompt: true }), 'pronto')
  assert.equal(estadoInstalacao({ standalone: false, ios: true, prompt: false }), 'ios')
  assert.equal(estadoInstalacao({ standalone: false, ios: false, prompt: false }), 'manual')
})

test('"agora não" sem localStorage não quebra (aba privada, node)', () => {
  assert.equal(conviteDispensado('marca'), false)
  assert.doesNotThrow(() => dispensarConvite('marca'))
})
