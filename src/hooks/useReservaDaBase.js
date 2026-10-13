import { useLayoutEffect } from 'react'

/*
 * useReservaDaBase — uma peça da PÁGINA presa à base da tela (a régua de anos
 * de Edições, por exemplo) declara a própria altura em `--scw-base-ocupada`, no
 * <body>. Quem também mora na base e é da CASCA — o aviso de cookies — sobe
 * essa altura em vez de pousar em cima do controle (scw-2026.css).
 *
 * Aceita várias refs porque a mesma função costuma ter uma peça por tela (o
 * rodapé do desktop e a régua do celular): vale a maior que estiver visível.
 * O ResizeObserver também acorda quando uma delas sai de `display: none`, que
 * é o que acontece ao cruzar o breakpoint.
 *
 * ⚠️ Mede só as refs que existem NA MONTAGEM. Peça montada condicionalmente
 * (uma por breakpoint, como em Edições) chama o hook ela mesma — e só uma pode
 * estar montada por vez, senão a última a escrever vence. O cleanup apaga a
 * variável; o React roda todos os cleanups antes dos efeitos novos do mesmo
 * commit, então a troca de peça não deixa a reserva zerada.
 */
export function useReservaDaBase(...refs) {
  useLayoutEffect(() => {
    const els = refs.map((r) => r && r.current).filter(Boolean)
    if (!els.length) return
    const corpo = document.body
    const medir = () => {
      const altura = Math.max(0, ...els
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => Math.ceil(el.getBoundingClientRect().height)))
      corpo.style.setProperty('--scw-base-ocupada', `${altura}px`)
    }
    medir()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(medir) : null
    if (ro) els.forEach((el) => ro.observe(el))
    window.addEventListener('resize', medir)
    return () => {
      if (ro) ro.disconnect()
      window.removeEventListener('resize', medir)
      corpo.style.removeProperty('--scw-base-ocupada')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
