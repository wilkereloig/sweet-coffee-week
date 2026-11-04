/*
 * Título de seção (docs/cartoon-2026-2/10 §10.17, repaginação de 04/11). Letreiro de gibi em CSS, no desenho das
 * peças aprovadas da campanha (carrossel de combos, Confirmados, Júri): Grandstander 900 em caixa-alta, letra a letra
 * levemente torta, contorno chocolate e volume 3D; a frase de apoio vai numa etiqueta branca inclinada acima.
 * As letras soltas são o próprio texto do título (busca lê a frase uma vez); o aria-label entrega a frase inteira ao leitor.
 *
 * `apoio`: a etiqueta de cima. Sem ela, um "Apoio: destaque" no texto se divide sozinho no ":".
 * `imagem`: aceita e ignorada desde 04/11 (os letreiros desenhados saíram); fica na API para não quebrar chamadas.
 * `cor`: amarelo (padrão) · vermelho · chocolate · creme. `tamanho`: titulo · display.
 * Ao entrar na tela as letras pulam no lugar uma vez (só com prefers-reduced-motion: no-preference; sem JS, nada some).
 */
import React from 'react'

const TETO_ATRASO = 18 // a partir da 18ª letra o pulo não espera mais: título longo não demora a assentar

function dividir (texto, apoio) {
  if (apoio) return [apoio, texto]
  const i = texto.indexOf(': ')
  return i > 0 ? [texto.slice(0, i + 1), texto.slice(i + 2)] : [null, texto]
}

function Letras ({ texto }) {
  let i = 0
  return texto.split(' ').map((palavra, w) => (
    <React.Fragment key={w}>
      {w > 0 && ' '}
      <span className="ct-letreiro__palavra">
        {[...palavra].map((letra) => {
          const n = i++
          return <span key={n} className="ct-letreiro__letra" style={{ '--i': Math.min(n, TETO_ATRASO) }}>{letra}</span>
        })}
      </span>
    </React.Fragment>
  ))
}

export function Letreiro ({ texto, apoio: apoioDado, nivel = 2, tamanho = 'titulo', cor = 'amarelo', id, className = '' }) {
  const Tag = `h${nivel}`
  const ref = React.useRef(null)
  const [apoio, destaque] = dividir(String(texto ?? ''), apoioDado)

  // Antes da pintura: o que já está na tela pula agora; o que está abaixo espera escondido (is-espera) e pula ao
  // chegar. Sem IntersectionObserver ou com movimento reduzido nada é escondido.
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    if (!window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches) return undefined
    if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('is-entrou'); return undefined }
    el.classList.add('is-espera')
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      el.classList.replace('is-espera', 'is-entrou')
      obs.disconnect()
    }, { threshold: 0.2 })
    obs.observe(el)
    return () => { obs.disconnect(); el.classList.remove('is-espera') }
  }, [destaque])

  // O texto do título é o das próprias letras (busca e textContent leem a frase uma vez, com o espaço entre apoio e
  // destaque); o aria-label dá ao leitor de tela a frase inteira de uma vez, sem depender de como ele junta as letras.
  const frase = apoio ? `${apoio} ${destaque}` : destaque
  return (
    <Tag id={id} ref={ref} aria-label={frase} className={`ct-letreiro ct-letreiro--${tamanho} ct-letreiro--cor-${cor} ${className}`.trim()}>
      <span className="ct-letreiro__desenho">
        {apoio && <><span className="ct-letreiro__apoio">{apoio}</span>{' '}</>}
        <span className="ct-letreiro__linha"><Letras texto={destaque} /></span>
      </span>
    </Tag>
  )
}
