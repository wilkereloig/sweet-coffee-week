/*
 * Arrastar arquivo até uma pasta na Biblioteca (21/10/2026): lógica pura + o que a tela precisa ligar.
 * O comportamento no navegador (mouse e toque de verdade) é `node tests/painel-biblioteca-arrastar-navegador.mjs`.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RAIZ, LIMITE_ARRASTO, itensDoArrasto, destinoValido, rotuloArrasto, direcaoRolagem, limiar, passou } from '../painel-app/src/lib/arrastar.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const chave = (x) => x.tipo + ':' + x.id
const a = { tipo: 'arte', id: '1', nome: 'A.png', pasta_id: null }
const b = { tipo: 'arte', id: '2', nome: 'B.png', pasta_id: 'p1' }
const c = { tipo: 'logo', id: '3', nome: 'C.png', pasta_id: 'p2' }

test('itens do arrasto: o pego, ou a seleção inteira se ele está nela', () => {
  const marcados = new Map([[chave(a), a], [chave(b), b]])
  assert.deepEqual(itensDoArrasto(a, marcados, true, chave), [a, b])
  assert.deepEqual(itensDoArrasto(c, marcados, true, chave), [c], 'fora da seleção arrasta só ele')
  assert.deepEqual(itensDoArrasto(a, marcados, false, chave), [a], 'sem modo de seleção arrasta só ele')
  assert.deepEqual(itensDoArrasto(a, null, true, chave), [a])
})

test('destino válido: só se algo mudaria de lugar; raiz = sem pasta', () => {
  assert.equal(destinoValido([a], 'p1'), true)
  assert.equal(destinoValido([b], 'p1'), false, 'já está lá')
  assert.equal(destinoValido([a, b], 'p1'), true, 'basta um mudar')
  assert.equal(destinoValido([a], RAIZ), false, 'sem pasta → sem pasta: nada muda')
  assert.equal(destinoValido([b], RAIZ), true)
  assert.equal(destinoValido([c], RAIZ), true, 'logo e foto também são organizados')
  assert.equal(destinoValido([a], null), false)
  assert.equal(destinoValido([a], ''), false)
  assert.equal(destinoValido([], 'p1'), false)
  assert.equal(destinoValido(Array.from({ length: LIMITE_ARRASTO + 1 }, (_, i) => ({ tipo: 'arte', id: String(i), pasta_id: null })), 'p1'), false, 'o teto é o do banco')
})

test('etiqueta, rolagem e limiar', () => {
  assert.equal(rotuloArrasto([a]), 'A.png')
  assert.equal(rotuloArrasto([a, b, c]), '3 arquivos')
  assert.equal(direcaoRolagem(10, 0, 800), -1)
  assert.equal(direcaoRolagem(790, 0, 800), 1)
  assert.equal(direcaoRolagem(400, 0, 800), 0)
  assert.equal(direcaoRolagem(120, 100, 800), -1, 'a borda é a do quadro que rola, não a da janela')
  assert.ok(limiar(false) > limiar(true), 'o mouse precisa de mais folga que a alça')
  assert.equal(passou(0, 0, 3, 3, 6), false)
  assert.equal(passou(0, 0, 6, 6, 6), true)
})

test('tela: alvos, alça de toque, mesma RPC de "Mover para…", só quem organiza', () => {
  const BIB = ler('painel-app/src/components/vistas/SocialBiblioteca.jsx')
  const CSS = ler('painel-app/src/styles/painel.css')
  const HOOK = ler('painel-app/src/lib/arrastarReact.jsx')
  // Alvos: cartão da pasta, atalhos Biblioteca/Sem pasta, caminho (raiz e pastas de cima). "Recentes" não é alvo.
  assert.match(BIB, /className="bb-pasta" data-alvo-pasta=\{podeOrganizar \? p\.id : undefined\}/)
  assert.match(BIB, /k === 'recentes' \? \{\} : \{ 'data-alvo-pasta': A\.RAIZ/)
  assert.match(BIB, /className="rd-link" data-alvo-pasta=\{A\.RAIZ\}/)
  assert.match(BIB, /className="rd-link" data-alvo-pasta=\{p\.id\}/)
  // Soltar e "Mover para…" são a mesma operação (uma função só chama a RPC).
  assert.equal((BIB.match(/rpc\('social_biblioteca_mover'/g) || []).length, 1, 'uma chamada só a social_biblioteca_mover')
  assert.match(BIB, /async function soltarEm\(itens, destinoId\)[\s\S]*moverItens\(itens, destinoId\)/)
  assert.match(BIB, /useArrasto\(\{ ativo: podeOrganizar, aoSoltar: soltarEm \}\)/, 'só quem organiza (redes.gerir, com pastas) arrasta')
  assert.match(BIB, /onArrastar=\{podeOrganizar \?/)
  // Toque só pela alça; a alça não rouba a rolagem do resto do cartão.
  assert.match(HOOK, /e\.pointerType === 'mouse' \? e\.button !== 0 : !alca/)
  assert.match(CSS, /\.bb-arq__alca\{[^}]*touch-action:none/)
  assert.doesNotMatch(CSS.slice(CSS.indexOf('.bb-arq{')), /\.bb-arq\{[^}]*touch-action:none/, 'o cartão em si continua rolando')
  // O clique depois de arrastar é engolido (não abre a prévia); a etiqueta vai para o body (não fica presa em container).
  assert.match(HOOK, /window\.addEventListener\('click', engolir, true\)/)
  assert.match(HOOK, /createPortal\([\s\S]*document\.body/)
  assert.match(HOOK, /key === 'Escape'/)
  // Acessibilidade: a alça é só do ponteiro; o teclado continua com "Selecionar" + "Mover…".
  assert.match(BIB, /className="bb-arq__alca" tabIndex=\{-1\} aria-hidden="true"/)
  assert.match(BIB, /Mover…/)
})
