import React from 'react'

/*
 * useCrossfade — o relógio das fotos em crossfade dos heróis.
 *
 * Nasceu da segunda cópia (§5.3): `HeroFotos` e a abertura da Home repetiam o
 * mesmo índice ativo, o mesmo `setInterval`, a mesma checagem de movimento
 * reduzido e a mesma memória de "quais camadas já podem pedir a foto". O que
 * muda entre eles é a COMPOSIÇÃO (banda de fundo × moldura com combo
 * sobreposto) — isso fica em cada componente; o tempo fica aqui.
 *
 * O que este relógio garante, e as versões copiadas não garantiam:
 *  - lista vazia ou de uma foto: nenhum timer acorda;
 *  - índice sempre válido, mesmo se a lista encolher;
 *  - a próxima foto é DECODIFICADA antes da troca — numa rede lenta a camada
 *    não acende vazia (o crossfade antigo trocava no relógio, tivesse a foto
 *    chegado ou não);
 *  - aba oculta pausa (não há o que ver, e a CPU do celular agradece);
 *  - `prefers-reduced-motion` é escutado ao vivo, não só lido na montagem;
 *  - pausa manual (WCAG 2.2.2): rotação automática contínua precisa de um
 *    jeito de parar, e quem decide onde fica o botão é o componente.
 *
 * @param {number}   total      quantas fotos há na série
 * @param {object}   [opcoes]
 * @param {number}   [opcoes.intervalo=6200]  ms entre trocas (o do sistema)
 * @param {(i:number)=>string} [opcoes.urlDe]  URL que será EXIBIDA para a foto i
 *        (a de celular ou a de desktop) — é ela que se pré-decodifica
 */
export const INTERVALO_HEROI = 6200

const consultaMovimento = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

export function useMovimentoReduzido() {
  const [reduzido, setReduzido] = React.useState(() => !!consultaMovimento()?.matches)
  React.useEffect(() => {
    const mq = consultaMovimento()
    if (!mq) return
    const aoMudar = () => setReduzido(mq.matches)
    aoMudar()
    if (mq.addEventListener) mq.addEventListener('change', aoMudar)
    else if (mq.addListener) mq.addListener(aoMudar)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', aoMudar)
      else if (mq.removeListener) mq.removeListener(aoMudar)
    }
  }, [])
  return reduzido
}

function usePaginaVisivel() {
  const [visivel, setVisivel] = React.useState(() =>
    typeof document === 'undefined' || document.visibilityState !== 'hidden')
  React.useEffect(() => {
    const aoMudar = () => setVisivel(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', aoMudar)
    return () => document.removeEventListener('visibilitychange', aoMudar)
  }, [])
  return visivel
}

/** Decodifica uma URL; resolve sempre (falha de rede não pode travar a série). */
function prontaParaExibir(url) {
  if (!url || typeof Image === 'undefined') return Promise.resolve()
  const img = new Image()
  img.src = url
  return (img.decode ? img.decode() : new Promise((ok) => { img.onload = ok; img.onerror = ok })).catch(() => {})
}

export function useCrossfade(total, { intervalo = INTERVALO_HEROI, urlDe } = {}) {
  const reduzido = useMovimentoReduzido()
  const visivel = usePaginaVisivel()
  const [pausado, setPausado] = React.useState(false)
  const [bruto, setAtiva] = React.useState(0)
  const ativa = total > 0 ? bruto % total : 0
  const rodando = total > 1 && !reduzido && !pausado && visivel

  // Quais camadas já podem pedir a foto: a visível, a próxima e as que já
  // passaram (voltar a uma foto vista não pode piscar).
  const [pedidas, setPedidas] = React.useState(() => Array.from({ length: total }, (_, i) => i === 0))
  React.useEffect(() => {
    if (!total) return
    setPedidas((antes) => {
      const base = antes.length === total ? antes : Array.from({ length: total }, (_, i) => !!antes[i])
      const proxima = (ativa + 1) % total
      const querProxima = total > 1 && !reduzido
      if (base === antes && base[ativa] && (!querProxima || base[proxima])) return antes
      const agora = base.slice()
      agora[ativa] = true
      if (querProxima) agora[proxima] = true
      return agora
    })
  }, [ativa, total, reduzido])

  const urlRef = React.useRef(urlDe)
  urlRef.current = urlDe

  React.useEffect(() => {
    if (!rodando) return undefined
    let vivo = true
    const t = window.setTimeout(async () => {
      const proxima = (ativa + 1) % total
      await prontaParaExibir(urlRef.current ? urlRef.current(proxima) : null)
      if (vivo) setAtiva(proxima)
    }, intervalo)
    return () => { vivo = false; window.clearTimeout(t) }
  }, [rodando, ativa, total, intervalo])

  const alternarPausa = React.useCallback(() => setPausado((p) => !p), [])

  return {
    ativa,
    pedidas,
    reduzido,
    pausado,
    alternarPausa,
    /** Mostra o botão de pausa? Só quando há algo girando de fato. */
    temRotacao: total > 1 && !reduzido,
  }
}

export default useCrossfade
