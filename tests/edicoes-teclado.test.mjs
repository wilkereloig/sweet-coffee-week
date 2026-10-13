import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from '../src/pages/edicoes/teclado.js'

const { teclaDaGaleria } = T

/*
 * Desde 13/10/2026 Edições não captura teclas na página inteira: setas,
 * PageUp/PageDown e Home/End são do navegador. A regra que este teste guarda:
 * só a galeria de uma edição troca foto por ←/→/Home/End, e só com o foco
 * DENTRO dela — nunca por cima de campo de texto, diálogo aberto ou atalho
 * com modificador.
 *
 * Os "elementos" são objetos com a mesma API mínima do DOM que a função lê
 * (tagName, parentElement, getAttribute, isContentEditable, open).
 */

function no(tagName, atributos = {}, pai = null, extra = {}) {
  return {
    tagName,
    parentElement: pai,
    getAttribute: (nome) => (nome in atributos ? String(atributos[nome]) : null),
    ...extra,
  }
}

const corpo = no('BODY')
const pagina = no('DIV', { class: 'edx' }, corpo)
const galeria = no('DIV', { 'data-teclas-proprias': '' }, pagina)
const seta = no('BUTTON', {}, galeria)
const evento = (key, target = corpo, extra = {}) => ({ key, target, ...extra })

test('a página não tem mais regra de teclado própria', () => {
  assert.equal(T.deveNavegarPorTecla, undefined, 'trocar de edição por tecla na janela inteira saiu')
})

test('fora da galeria nenhuma tecla é dela', () => {
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'PageDown', 'PageUp']) {
    assert.equal(teclaDaGaleria(evento(key)), null, `${key} no body`)
    assert.equal(teclaDaGaleria(evento(key, no('A', {}, pagina))), null, `${key} num link da página`)
  }
})

test('com o foco na galeria, ←/→/Home/End trocam a foto; o resto passa', () => {
  assert.equal(teclaDaGaleria(evento('ArrowRight', seta)), 'proxima')
  assert.equal(teclaDaGaleria(evento('ArrowLeft', seta)), 'anterior')
  assert.equal(teclaDaGaleria(evento('Home', seta)), 'primeira')
  assert.equal(teclaDaGaleria(evento('End', seta)), 'ultima')
  for (const key of ['PageDown', 'PageUp', 'Enter', ' ', 'Escape', 'a']) {
    assert.equal(teclaDaGaleria(evento(key, seta)), null, `${JSON.stringify(key)} é do navegador ou do botão`)
  }
})

test('modificadores, evento já tratado e composição de IME passam direto', () => {
  for (const mod of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']) {
    assert.equal(teclaDaGaleria(evento('ArrowLeft', seta, { [mod]: true })), null, `${mod}+←`)
  }
  assert.equal(teclaDaGaleria(evento('ArrowRight', seta, { defaultPrevented: true })), null)
  assert.equal(teclaDaGaleria(evento('ArrowRight', seta, { isComposing: true })), null)
})

test('campo de texto, select e conteúdo editável ficam com as próprias teclas', () => {
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
    assert.equal(teclaDaGaleria(evento('ArrowRight', no(tag, {}, galeria))), null, tag)
  }
  assert.equal(teclaDaGaleria(evento('ArrowLeft', no('P', {}, galeria, { isContentEditable: true }))), null)
})

test('dentro de diálogo aberto (a foto ampliada, o acesso) a regra não vale', () => {
  const nativo = no('DIALOG', {}, galeria, { open: true })
  assert.equal(teclaDaGaleria(evento('ArrowRight', no('BUTTON', {}, nativo))), null)
  const aria = no('DIV', { role: 'dialog', 'aria-modal': 'true' }, galeria)
  assert.equal(teclaDaGaleria(evento('ArrowRight', no('BUTTON', {}, aria))), null)
  const fechado = no('DIALOG', {}, galeria, { open: false })
  assert.equal(teclaDaGaleria(evento('ArrowRight', no('BUTTON', {}, fechado))), 'proxima')
})
