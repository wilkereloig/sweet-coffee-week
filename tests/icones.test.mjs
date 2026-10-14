// Iconografia v3 (14/10/2026) — contratos que não podem voltar atrás calados.
// Inspeção visual é na galeria (`npm run dev` → /icones/galeria.html); aqui
// fica o que um teste consegue provar: nome, família, geração e fonte única.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { INTERFACE, EXPRESSIVA, ALIASES, FAMILIAS, existe, temDesenho, canonico } from './_icones.mjs'
import { ANATOMIA_COMBO } from '../src/components/scw-icons/anatomia-combo.js'

const RAIZ = new URL('..', import.meta.url)
const ler = (rel) => readFileSync(new URL(rel, RAIZ), 'utf8')
const arquivos = (pasta, ext) => readdirSync(new URL(pasta, RAIZ), { recursive: true })
  .map(String).map((a) => pasta + a.replace(/\\/g, '/')).filter((a) => ext.test(a))
const CODIGO = [...arquivos('src/', /\.(jsx|js)$/), ...arquivos('painel-app/src/', /\.(jsx|js)$/)]
  .filter((a) => !a.includes('/scw-icons/gerado/') && !a.endsWith('scw-icons-v2.js'))

test('a fonte passa nas regras e o gerado está em dia com ela', () => {
  execFileSync(process.execPath, ['scripts/icones/gerar.mjs', '--verificar'], { cwd: RAIZ, stdio: 'pipe' })
})

test('todo nome citado no código existe — nenhum ícone vazio', () => {
  const faltam = []
  for (const a of CODIGO) {
    const txt = ler(a)
    for (const m of txt.matchAll(/<(?:ScwIcon|IconeUi|Icone)\b[^>]*?\bnome="([a-z0-9/-]+)"/g)) if (!existe(m[1])) faltam.push(a + ': ' + m[1])
    for (const m of txt.matchAll(/\bicone(?:=|: )["']([a-z0-9/-]+)["']/g)) if (!existe(m[1])) faltam.push(a + ': ' + m[1])
    for (const m of txt.matchAll(/\bi: '([a-z0-9/-]+)'/g)) if (!existe(m[1])) faltam.push(a + ': ' + m[1])
  }
  assert.deepEqual(faltam, [])
})

test('tamanho literal está na escala e tem desenho da família que ele pede', () => {
  const erros = []
  for (const a of CODIGO) {
    for (const m of ler(a).matchAll(/<(?:ScwIcon|IconeUi|Icone)\b[^>]*?\bnome="([a-z0-9/-]+)"[^>]*?\btamanho=\{(\d+)\}/g)) {
      const [, nome, t] = m
      const marca = INTERFACE[canonico(nome)] && INTERFACE[canonico(nome)].m
      const escala = [...FAMILIAS.interface.tamanhos, ...FAMILIAS.expressiva.tamanhos]
      if (!marca && !escala.includes(+t)) erros.push(`${a}: ${nome} em ${t}px (fora de 16/20/24 · 32/48/64)`)
      if (!temDesenho(nome, +t)) erros.push(`${a}: ${nome} em ${t}px sem desenho da família`)
    }
  }
  assert.deepEqual(erros, [])
})

test('IconeUi (casca do site) só pede desenho de interface', () => {
  for (const a of CODIGO) {
    for (const m of ler(a).matchAll(/<IconeUi\b[^>]*?\bnome="([a-z0-9/-]+)"/g)) {
      assert.ok(INTERFACE[canonico(m[1])], `${a}: IconeUi não carrega a família expressiva (${m[1]})`)
    }
  }
})

test('SVG de interface só nasce no registro (sem desenho solto em tela)', () => {
  const soltos = CODIGO.filter((a) => /\.jsx$/.test(a) && /<svg\b/.test(ler(a)) && !a.endsWith('scw-icons/registro.jsx'))
  assert.deepEqual(soltos, [])
})

test('título acessível é elemento, nunca HTML concatenado', () => {
  const r = ler('src/components/scw-icons/registro.jsx')
  assert.ok(!r.includes('dangerouslySetInnerHTML'))
  assert.match(r, /<title>\{titulo\}<\/title>/)
  assert.match(r, /'aria-hidden': 'true'/)
})

test('anatomia do combo: quatro exemplos reconhecíveis por categoria, todos expressivos', () => {
  assert.deepEqual(Object.keys(ANATOMIA_COMBO), ['doce', 'salgado', 'bebida'])
  for (const [cat, nomes] of Object.entries(ANATOMIA_COMBO)) {
    assert.equal(nomes.length, 4, cat)
    for (const n of nomes) assert.ok(EXPRESSIVA[n], `${cat}: ${n} sem desenho expressivo`)
  }
  // A capa (a única com movimento reduzido) é a escolha pedida: cupcake, coxinha, xícara.
  assert.deepEqual(Object.values(ANATOMIA_COMBO).map((l) => l[0]), ['cupcake', 'coxinha', 'xicara'])
  // O coador saiu: não representa a categoria inteira.
  assert.ok(!Object.values(ANATOMIA_COMBO).flat().some((n) => /coado|filtro/.test(n)))
})

test('estados têm desenhos distintos (cor nunca é o único sinal)', () => {
  const estados = ['sucesso', 'informacao', 'atencao', 'alerta', 'erro', 'pendente', 'neutro', 'horario', 'carregando']
  const assinaturas = estados.map((n) => JSON.stringify(INTERFACE[n].e))
  assert.equal(new Set(assinaturas).size, estados.length)
})

test('significados corrigidos não voltam: contato é contato, configuração é configuração', () => {
  const { MODULO } = { MODULO: ler('painel-app/src/components/Icone.jsx') }
  assert.match(MODULO, /contatos: 'contatos'/)
  assert.match(MODULO, /config: 'configuracoes'/)
  assert.ok(!/coracao|heart/.test(JSON.stringify(INTERFACE.contatos.e)))
  // configurações = controles deslizantes, não um sol de raios.
  assert.equal(INTERFACE.configuracoes.e.filter(([, , c]) => c === 'solido').length, 2)
})

test('marcadores do painel em CSS vêm do registro, não de caractere', () => {
  const css = ler('painel-app/src/styles/painel.css')
  for (const g of ["content:'!'", "content:'✓'", "content:'›'", 'content:"! "']) assert.ok(!css.includes(g), 'glifo de texto: ' + g)
  assert.ok(!css.includes('data:image/svg'), 'SVG embutido à mão no CSS — usar var(--icone-*)')
  assert.match(ler('painel-app/src/main.jsx'), /scw-icons\/gerado\/icones\.css/)
})

test('alias nunca aponta para nome inexistente e nunca esconde desenho', () => {
  for (const [a, b] of Object.entries(ALIASES)) {
    assert.ok(INTERFACE[b] || EXPRESSIVA[b], `${a} → ${b}`)
    assert.ok(!INTERFACE[a] && !EXPRESSIVA[a], `${a} é alias e desenho ao mesmo tempo`)
  }
})
