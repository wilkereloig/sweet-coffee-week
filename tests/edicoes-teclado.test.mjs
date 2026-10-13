import test from 'node:test'
import assert from 'node:assert/strict'
import { deveNavegarPorTecla, teclaDaGaleria } from '../src/pages/edicoes/teclado.js'

/*
 * Edições escuta o teclado na janela inteira. A regra que este teste guarda:
 * a página só troca de edição quando a tecla é dela — nunca por cima de campo
 * de texto, diálogo aberto, atalho com modificador, região com teclas próprias
 * (galeria, painel de texto) ou, no celular, das teclas que rolam o documento.
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
const pagina = no('DIV', { class: 'scw-edx' }, corpo)
const botao = no('BUTTON', {}, pagina)
const evento = (key, target = corpo, extra = {}) => ({ key, target, ...extra })

test('setas trocam de edição com o foco na página ou num botão dela', () => {
  assert.equal(deveNavegarPorTecla(evento('ArrowRight')), 'proxima')
  assert.equal(deveNavegarPorTecla(evento('ArrowLeft', botao)), 'anterior')
  assert.equal(deveNavegarPorTecla(evento('Escape', botao)), 'fechar')
  assert.equal(deveNavegarPorTecla(evento('a')), null)
  assert.equal(deveNavegarPorTecla(evento('Enter', botao)), null, 'Enter é do botão, não da página')
})

test('campo de texto, select e conteúdo editável ficam com as próprias teclas', () => {
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
    const campo = no(tag, {}, pagina)
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Escape']) {
      assert.equal(deveNavegarPorTecla(evento(key, campo)), null, `${key} em ${tag}`)
    }
  }
  // isContentEditable já vem herdado pelo navegador nos descendentes
  const editavel = no('P', {}, pagina, { isContentEditable: true })
  assert.equal(deveNavegarPorTecla(evento('ArrowLeft', editavel)), null)
})

test('dentro de diálogo (ou com modal aberto) a página não reage — nem ao Esc', () => {
  const dialogo = no('DIV', { role: 'dialog', 'aria-modal': 'true' }, corpo)
  const dentro = no('BUTTON', {}, no('DIV', {}, dialogo))
  assert.equal(deveNavegarPorTecla(evento('ArrowRight', dentro)), null)
  assert.equal(deveNavegarPorTecla(evento('Escape', dentro)), null, 'o Esc fecha o diálogo, não o painel da página')

  const nativo = no('DIALOG', {}, corpo, { open: true })
  assert.equal(deveNavegarPorTecla(evento('ArrowLeft', no('A', {}, nativo))), null)
  const fechado = no('DIALOG', {}, corpo, { open: false })
  assert.equal(deveNavegarPorTecla(evento('ArrowLeft', no('A', {}, fechado))), 'anterior')

  // foco solto no body, mas um modal aberto na tela
  assert.equal(deveNavegarPorTecla(evento('ArrowRight'), { modalAberto: true }), null)
})

test('modificadores, evento já tratado e composição de IME passam direto', () => {
  for (const mod of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']) {
    assert.equal(deveNavegarPorTecla(evento('ArrowLeft', corpo, { [mod]: true })), null, `${mod}+←`)
  }
  assert.equal(deveNavegarPorTecla(evento('ArrowRight', corpo, { defaultPrevented: true })), null)
  assert.equal(deveNavegarPorTecla(evento('ArrowRight', corpo, { isComposing: true })), null)
})

test('região com teclas próprias (galeria, painel de texto) só cede o Esc', () => {
  const galeria = no('SECTION', { 'data-teclas-proprias': '' }, pagina)
  const seta = no('BUTTON', {}, galeria)
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'PageDown']) {
    assert.equal(deveNavegarPorTecla(evento(key, seta)), null, `${key} na galeria`)
  }
  assert.equal(deveNavegarPorTecla(evento('Escape', seta)), 'fechar')
})

test('no celular PageUp/PageDown/Home/End rolam o documento; no desktop trocam de edição', () => {
  const casos = { PageDown: 'proxima', PageUp: 'anterior', Home: 'primeira', End: 'ultima' }
  for (const [key, acao] of Object.entries(casos)) {
    assert.equal(deveNavegarPorTecla(evento(key)), acao, `${key} no desktop`)
    assert.equal(deveNavegarPorTecla(evento(key), { estreito: true }), null, `${key} no celular`)
  }
  assert.equal(deveNavegarPorTecla(evento('ArrowRight'), { estreito: true }), 'proxima')
})

test('a galeria segue a mesma regra de modificador e de campo', () => {
  const galeria = no('SECTION', { 'data-teclas-proprias': '' }, pagina)
  const seta = no('BUTTON', {}, galeria)
  assert.equal(teclaDaGaleria(evento('ArrowRight', seta)), 'proxima')
  assert.equal(teclaDaGaleria(evento('End', seta)), 'ultima')
  assert.equal(teclaDaGaleria(evento('ArrowLeft', seta, { altKey: true })), null)
  assert.equal(teclaDaGaleria(evento('PageDown', seta)), null)
})
