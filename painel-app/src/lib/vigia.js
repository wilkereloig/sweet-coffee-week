/*
 * Vigia de travamento (05/11/2026). Pedido: "o painel trava, congela e não volta" (app instalado no celular, tela
 * parada, nada clica). Não achamos a causa por leitura de código; o vigia grava EVIDÊNCIA e destrava o que dá.
 *
 *   1. Toque sem clique: pointerup que não vira `click` em 600 ms. Uma vez é rolagem/arrasto; 3 no mesmo lugar em 8 s
 *      é tela morta. Grava quem recebeu o toque, o que está por cima e as camadas abertas (dialog, folha, tour).
 *   2. Engasgo do JavaScript: o relógio de 1 s atrasou mais de 4 s com a aba à vista (segundo plano não conta).
 *   3. Tela morta confirmada → aviso com "Recarregar", colocado DENTRO do <dialog> aberto quando houver (um diálogo
 *      modal deixa todo o resto inerte: um aviso fora dele não receberia o toque).
 *
 * Só observa: nunca fecha nem apaga nada da tela. Registro fica neste aparelho (localStorage), no máximo 30 linhas,
 * e aparece em Conta › Verificar atualização, com "Copiar registro". Nada vai ao servidor.
 */
const CHAVE = 'scw_vigia'
const MAXIMO = 30

export function lerRegistro(armazem = (typeof localStorage === 'undefined' ? null : localStorage)) {
  try { const v = JSON.parse(armazem.getItem(CHAVE) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
export function limparRegistro(armazem = (typeof localStorage === 'undefined' ? null : localStorage)) {
  try { armazem.removeItem(CHAVE) } catch { /* sem armazenamento */ }
}
export function gravarRegistro(item, armazem = (typeof localStorage === 'undefined' ? null : localStorage)) {
  try { armazem.setItem(CHAVE, JSON.stringify([...lerRegistro(armazem), item].slice(-MAXIMO))) } catch { /* sem armazenamento */ }
}

/** Texto curto de um elemento: tag#id.classe (sem conteúdo digitado). */
export function descrever(el) {
  if (!el || !el.tagName) return '—'
  const classe = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
  return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + classe
}

/** Camadas que podem prender a tela. */
export function camadasAbertas(doc = document) {
  const lista = []
  doc.querySelectorAll('dialog[open]').forEach((d) => lista.push('dialog' + (d.className ? '.' + String(d.className).trim().split(/\s+/)[0] : '')))
  if (doc.querySelector('.og-detalhe')) lista.push('folha')
  if (doc.querySelector('.ui-tour__fundo')) lista.push('tour')
  return lista
}

/** Decide se uma sequência de toques sem clique é tela morta: `minimo` no mesmo ponto (raio `raio` px) dentro de `janela` ms. */
export function telaMorta(toques, agora, { minimo = 3, janela = 8000, raio = 40 } = {}) {
  const recentes = toques.filter((t) => agora - t.t <= janela)
  if (recentes.length < minimo) return false
  const u = recentes[recentes.length - 1]
  return recentes.filter((t) => Math.hypot(t.x - u.x, t.y - u.y) <= raio).length >= minimo
}

function avisarTravada(doc) {
  if (doc.getElementById('scw-vigia-aviso')) return
  const caixa = doc.createElement('div')
  caixa.id = 'scw-vigia-aviso'
  caixa.setAttribute('role', 'alert')
  caixa.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;padding:14px 16px;border-radius:14px;'
    + 'background:#3b2418;color:#fff7e8;font:700 15px/1.35 system-ui,sans-serif;display:flex;gap:12px;align-items:center;justify-content:space-between;'
  const texto = doc.createElement('span')
  texto.textContent = 'A tela parece travada. Toque em Recarregar.'
  const b = doc.createElement('button')
  b.type = 'button'
  b.textContent = 'Recarregar'
  b.style.cssText = 'min-height:44px;padding:0 16px;border:0;border-radius:10px;background:#ffc20e;color:#3b2418;font:inherit;'
  b.addEventListener('click', () => location.reload())
  caixa.append(texto, b)
  // No <dialog> modal o resto da página é inerte: o aviso só recebe toque se estiver dentro dele.
  const dentro = [...doc.querySelectorAll('dialog[open]')].pop()
  ;(dentro || doc.body).appendChild(caixa)
}

let ligado = false
export function ligarVigia(janela = window) {
  if (ligado || !janela || !janela.document) return () => {}
  ligado = true
  const doc = janela.document
  const toques = []
  let pendente = null
  let ultimoClique = 0

  const aoClicar = () => { ultimoClique = Date.now(); toques.length = 0 }
  const aoSoltar = (e) => {
    if (e.pointerType === 'mouse') return
    const x = e.clientX; const y = e.clientY
    const alvo = e.target
    clearTimeout(pendente)
    pendente = setTimeout(() => {
      if (Date.now() - ultimoClique < 700) return
      toques.push({ t: Date.now(), x, y })
      if (toques.length > 10) toques.shift()
      if (telaMorta(toques, Date.now())) {
        const em = doc.elementFromPoint(x, y)
        gravarRegistro({ quando: new Date().toISOString(), tipo: 'tela_morta', alvo: descrever(alvo), porCima: descrever(em), camadas: camadasAbertas(doc), rota: String(janela.location.hash || '').slice(0, 80), fundo: doc.visibilityState })
        avisarTravada(doc)
        toques.length = 0
      }
    }, 600)
  }
  doc.addEventListener('click', aoClicar, true)
  doc.addEventListener('pointerup', aoSoltar, true)

  // Engasgo do JavaScript: o relógio atrasa. Segundo plano (aba oculta no meio) não conta.
  let esperado = Date.now() + 1000
  let ocultou = false
  doc.addEventListener('visibilitychange', () => { ocultou = true })
  const relogio = setInterval(() => {
    const atraso = Date.now() - esperado
    esperado = Date.now() + 1000
    if (ocultou || doc.visibilityState !== 'visible') { ocultou = false; return }
    if (atraso > 4000) gravarRegistro({ quando: new Date().toISOString(), tipo: 'engasgo', segundos: Math.round(atraso / 1000), rota: String(janela.location.hash || '').slice(0, 80), camadas: camadasAbertas(doc) })
  }, 1000)

  return () => { ligado = false; clearInterval(relogio); clearTimeout(pendente); doc.removeEventListener('click', aoClicar, true); doc.removeEventListener('pointerup', aoSoltar, true) }
}
