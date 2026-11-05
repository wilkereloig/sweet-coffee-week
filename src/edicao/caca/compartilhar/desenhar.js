/*
 * Desenha a arte vertical no canvas (só navegador). A decisão do que vai e onde está em arte.js (testada); aqui só se executa.
 * Cores vêm dos tokens da edição (--ct-*) lidos do documento; texto sempre por código, em Grandstander.
 */
import { ARTE, layoutDaArte } from './arte.js'
import { IMG_CACA } from '../imagens.js'

// Reserva se o token não puder ser lido (ex.: prévia fora da camada da edição). Mesmos valores de scw-cartoon.css.
const RESERVA = { chocolate: '#3A150F', creme: '#FDF0DE', branco: '#FCFCFC', turquesa: '#05BEBA', vermelho: '#ED1C20' }

function cores () {
  const alvo = globalThis.document?.querySelector('.ct-edicao') || globalThis.document?.documentElement
  const estilo = alvo ? globalThis.getComputedStyle(alvo) : null
  const ler = (nome) => estilo?.getPropertyValue(`--ct-${nome}`).trim() || RESERVA[nome]
  return Object.fromEntries(Object.keys(RESERVA).map((k) => [k, ler(k)]))
}

function carregarImagem (src) {
  return new Promise((ok, falha) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = () => falha(new Error('fundo'))
    img.src = src
  })
}

/** Gera o PNG da arte. Rejeita se o fundo ou o canvas falharem; a tela cai no compartilhamento só por link. */
export async function gerarArte (dados) {
  const doc = globalThis.document
  const amostra = `${dados.apelido}${dados.casas.join('')}0123456789 áàâãéêíóôõúç`
  await Promise.all([
    // O texto de amostra faz o navegador baixar também os subconjuntos com acento (á, ç, ã) que o apelido e as casas usam.
    doc.fonts?.load(`900 80px ${ARTE.fonte}`, amostra).catch(() => null),
    doc.fonts?.load(`700 44px ${ARTE.fonte}`, amostra).catch(() => null),
  ])
  const fundo = await carregarImagem(IMG_CACA.storiesFundo)
  const canvas = doc.createElement('canvas')
  canvas.width = ARTE.largura; canvas.height = ARTE.altura
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  const c = cores()
  const fonte = (peso, tam) => `${peso} ${tam}px ${ARTE.fonte}, system-ui, sans-serif`
  const layout = layoutDaArte(dados, (t, tam, peso) => { ctx.font = fonte(peso, tam); return ctx.measureText(t).width })

  ctx.drawImage(fundo, 0, 0, ARTE.largura, ARTE.altura)
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  for (const op of layout.ops) {
    if (op.tipo === 'cartao') {
      ctx.fillStyle = c.chocolate; ctx.beginPath(); ctx.roundRect(op.x + 12, op.y + 12, op.w, op.h, 36); ctx.fill() // sombra dura do desenho
      ctx.fillStyle = c.branco; ctx.strokeStyle = c.chocolate; ctx.lineWidth = 8
      ctx.beginPath(); ctx.roundRect(op.x, op.y, op.w, op.h, 36); ctx.fill(); ctx.stroke()
    } else if (op.tipo === 'barra') {
      ctx.fillStyle = c.creme; ctx.strokeStyle = c.chocolate; ctx.lineWidth = 6
      ctx.beginPath(); ctx.roundRect(op.x, op.y, op.w, op.h, op.h / 2); ctx.fill()
      if (op.fracao > 0) { ctx.fillStyle = c.turquesa; ctx.beginPath(); ctx.roundRect(op.x, op.y, Math.max(op.w * op.fracao, op.h), op.h, op.h / 2); ctx.fill() }
      ctx.beginPath(); ctx.roundRect(op.x, op.y, op.w, op.h, op.h / 2); ctx.stroke()
    } else {
      ctx.font = fonte(op.peso, op.tamanho); ctx.fillStyle = c[op.cor] || c.chocolate
      ctx.fillText(op.texto, op.x, op.y)
    }
  }
  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error('png'))), 'image/png'))
}
