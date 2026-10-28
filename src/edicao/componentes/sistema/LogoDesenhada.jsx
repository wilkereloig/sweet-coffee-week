/*
 * Logo desenhada da casa (docs/cartoon-2026-2/10 §10.14), dentro do Quadro com fita.
 * O rascunho preto e branco fica embaixo; a colorida, por cima, aparece por uma máscara
 * radial que cresce — a cor espalha como tinta (o desenho mora em scw-cartoon.css):
 *  - com mouse (hover: hover): a tinta parte do ponto onde o ponteiro entrou e volta ao sair;
 *    o foco do teclado pinta a partir do centro;
 *  - toque: pinta sozinha, uma vez, quando o desenho chega ao meio da tela (o que já abre na
 *    metade de cima — o topo da ficha — pinta logo ao abrir);
 *  - movimento reduzido: colorida direto (só CSS, sem listener).
 * Dentro de um link (o cartão do catálogo, o mural da Entrada) o gatilho é o link inteiro; fora, o próprio desenho.
 *
 * Sem par desenhado (produção, ou casa sem desenho): a logo oficial (`casa.logo`); sem logo,
 * a inicial em texto. Só o desenho representa a casa: nunca a logo oficial ao lado
 * (decisão do Wilker, 27/10). `alt` padrão = nome da casa; no cartão, que já diz o nome, vai "".
 */
import React from 'react'
import { imagemPublica } from '../../dados/publico.js'
import { Quadro } from './pecas.jsx'

export function LogoDesenhada ({ casa, alt = casa?.nome || '', className = '' }) {
  const par = casa?.logo_desenhada
  const oficial = imagemPublica(casa?.logo)
  const [falhou, setFalhou] = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return undefined
    const pinta = (sim, x = 50, y = 50) => {
      el.style.setProperty('--x', `${x}%`)
      el.style.setProperty('--y', `${y}%`)
      el.classList.toggle('is-pintada', sim)
    }
    if (!window.matchMedia('(hover: hover)').matches) {
      const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { pinta(true); obs.disconnect() } }, { rootMargin: '0px 0px -50% 0px' })
      obs.observe(el)
      return () => obs.disconnect()
    }
    const alvo = el.closest('a') || el
    const lim = (v) => Math.round(Math.min(100, Math.max(0, v)))
    const entra = (e) => {
      if (e.pointerType === 'touch') return
      const r = el.getBoundingClientRect()
      pinta(true, lim((e.clientX - r.left) / r.width * 100), lim((e.clientY - r.top) / r.height * 100))
    }
    const sai = (e) => { if (e.pointerType !== 'touch') el.classList.remove('is-pintada') }
    const foca = () => pinta(true)
    const desfoca = () => el.classList.remove('is-pintada')
    alvo.addEventListener('pointerenter', entra)
    alvo.addEventListener('pointerleave', sai)
    alvo.addEventListener('focusin', foca)
    alvo.addEventListener('focusout', desfoca)
    return () => {
      alvo.removeEventListener('pointerenter', entra)
      alvo.removeEventListener('pointerleave', sai)
      alvo.removeEventListener('focusin', foca)
      alvo.removeEventListener('focusout', desfoca)
    }
  }, [par])

  let desenho
  if (par) {
    desenho = (
      <span className="ct-desenho" ref={ref}>
        <img className="ct-desenho__pb" src={par.pb} width={par.largura} height={par.altura} alt={alt} loading="lazy" decoding="async" />
        <img className="ct-desenho__cor" src={par.cor} width={par.largura} height={par.altura} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      </span>
    )
  } else if (oficial && !falhou) {
    desenho = <span className="ct-desenho"><img src={oficial} alt={alt} loading="lazy" decoding="async" onError={() => setFalhou(true)} /></span>
  } else {
    const inicial = (casa?.nome || '?').replace(/^\[DEMO\]\s*/, '').trim().charAt(0).toUpperCase()
    desenho = alt
      ? <span className="ct-desenho ct-desenho--inicial" role="img" aria-label={alt}>{inicial}</span>
      : <span className="ct-desenho ct-desenho--inicial" aria-hidden="true">{inicial}</span>
  }
  return <Quadro className={`ct-desenho-quadro ${className}`.trim()}>{desenho}</Quadro>
}
