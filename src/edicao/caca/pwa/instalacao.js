/*
 * Convite de instalação do navegador (`beforeinstallprompt`, Chrome/Android/desktop). O evento pode chegar antes de a tela de
 * instalar existir, então ele é guardado aqui e a tela só se inscreve. Também decide o que mostrar (função pura `situacaoInstalacao`).
 */
const ouvintes = new Set()
let evento = null
let instalado = false
let ligado = false

const avisar = () => ouvintes.forEach((f) => f())

/** Liga os ouvintes da janela uma vez só. Devolve a função que desliga. */
export function escutarInstalacao (janela = globalThis.window) {
  if (!janela || ligado) return () => {}
  ligado = true
  const aoOferecer = (e) => { e.preventDefault(); evento = e; avisar() }
  const aoInstalar = () => { evento = null; instalado = true; avisar() }
  janela.addEventListener('beforeinstallprompt', aoOferecer)
  janela.addEventListener('appinstalled', aoInstalar)
  return () => { janela.removeEventListener('beforeinstallprompt', aoOferecer); janela.removeEventListener('appinstalled', aoInstalar); ligado = false }
}

export const estadoDaInstalacao = () => ({ temEvento: !!evento, instaladoAgora: instalado })
export function assinarInstalacao (fn) { ouvintes.add(fn); return () => ouvintes.delete(fn) }

/** Abre o diálogo do navegador. 'accepted' | 'dismissed' | 'indisponivel'. Só chamar a partir de um clique. */
export async function pedirInstalacao () {
  const e = evento
  if (!e) return 'indisponivel'
  try {
    e.prompt()
    const { outcome } = await e.userChoice
    evento = null; avisar()
    return outcome === 'accepted' ? 'accepted' : 'dismissed'
  } catch { return 'indisponivel' }
}

/**
 * O que a tela de instalar mostra:
 *   instalado  — já está no app · botao — o navegador oferece instalar · ios — instrução do Compartilhar · manual — menu do navegador.
 */
export function situacaoInstalacao ({ jaInstalado = false, temEvento = false, ios = false } = {}) {
  if (jaInstalado) return 'instalado'
  if (temEvento) return 'botao'
  return ios ? 'ios' : 'manual'
}

/** Momento útil: só depois do primeiro carimbo (antes disso a pessoa ainda nem viu valor para instalar). */
export const momentoUtilParaInstalar = (mapa) => Array.isArray(mapa?.casas) && mapa.casas.length > 0

/* "Agora não": some por alguns dias (conveniência por pessoa; sem storage, só reaparece). */
const DIAS = 7
export const chaveDispensa = (codigo) => `scw:edicao:${codigo}:caca-app-dispensado`
export const dispensadoAinda = (valor, agora = Date.now(), dias = DIAS) => {
  const t = Number(valor)
  return Number.isFinite(t) && t > 0 && agora - t < dias * 86400000
}
