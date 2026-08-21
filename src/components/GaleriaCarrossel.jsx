/*
 * GaleriaCarrossel — fita de fotos que corre sozinha, com legenda por item.
 *
 * Serve as duas galerias irmãs da seção 02 da Home (combos de outras edições e
 * Sweet Gift), que antes eram grades 2×2 fixas. Com o acervo crescendo — dez
 * fotos de Sweet Gift, dezesseis edições — a grade mostrava quatro e escondia
 * o resto (pedido do Wilke, 21/08/2026).
 *
 * A fita é a MESMA técnica do marquee: a lista é renderizada duas vezes e a
 * animação desloca -50%, então o ponto de emenda cai exatamente onde a segunda
 * cópia começa e o laço não tem costura. Reusa `scwMarquee`, que já existe.
 *
 * O que ela NÃO faz, de propósito:
 * · não tem setas nem pontos — não é navegação, é vitrine; quem quiser ver
 *   tudo tem o link "ver todas" que já existe na cabeça de cada galeria;
 * · não para sozinha em item nenhum: é fluxo contínuo, não slideshow.
 *
 * Acessibilidade e controle:
 * · a fita PARA no hover e no foco de teclado, senão ler a legenda de um item
 *   em movimento é impossível;
 * · com `prefers-reduced-motion` a animação não roda e a fita vira uma faixa
 *   de rolagem manual — o conteúdo continua todo alcançável;
 * · a segunda cópia é `aria-hidden`: para um leitor de tela a lista tem o
 *   tamanho real, não o dobro.
 */

import React from 'react'

/* A fita só pede as fotos quando o leitor se aproxima dela.
 *
 * `loading="lazy"` NÃO serve aqui, e o motivo é sutil: o navegador decide pela
 * posição de LAYOUT, e a fita anda por `transform`. Os quadros que entram em
 * cena deslizando continuam, para o navegador, na mesma posição de sempre —
 * fora da tela. Medido: 34 das 40 molduras nunca completavam o download, e a
 * fita rodava com o bege da reserva no lugar da foto.
 *
 * Então o gatilho é a fita inteira, com o mesmo IntersectionObserver que o
 * resto do site usa (§6.15). Antes de entrar em cena, nenhuma foto é pedida;
 * depois, todas. `rootMargin` de 300px pede um pouco antes de aparecer, para a
 * primeira volta já começar com imagem.
 */
function useEmVista(ref) {
  const [emVista, setEmVista] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    /* Sem observer (navegador antigo, teste sem DOM), mostra tudo: a regra do
       §6.15 vale aqui também — quando o mecanismo falha, nada fica escondido. */
    if (!el || typeof IntersectionObserver === 'undefined') { setEmVista(true); return }
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      setEmVista(true)
      obs.disconnect()          // uma vez pedida, a foto fica: não faz sentido observar de novo
    }, { rootMargin: '300px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])

  return emVista
}

export function GaleriaCarrossel({ itens, duracao = 46 }) {
  const ref = React.useRef(null)
  const emVista = useEmVista(ref)

  if (!itens || !itens.length) return null

  const fita = (copia) =>
    itens.map((item, i) => (
      <li key={`${copia}-${item.src || i}`}>
        {item.src
          ? <figure
              className="hm-galeria__foto"
              role={copia === 0 && !emVista ? 'img' : undefined}
              aria-label={copia === 0 && !emVista ? item.alt : undefined}
              aria-hidden={copia === 0 ? undefined : 'true'}
            >
              {/* Antes de a fita entrar em cena fica só o bege da moldura — a
                  mesma reserva honesta do §6.12, e o alt vive no `role="img"`
                  da moldura enquanto isso. A segunda cópia existe só para o
                  laço não ter emenda, então vai sempre com `alt=""`. */}
              {emVista
                ? <img src={item.src} alt={copia === 0 ? item.alt : ''} decoding="async" />
                : null}
            </figure>
          : <div className="scw-reserva hm-galeria__reserva">{item.reserva}</div>}
        <span className="hm-galeria__nome">
          {item.titulo}
          {item.legenda ? <b>{item.legenda}</b> : null}
        </span>
      </li>
    ))

  return (
    <div className="hm-fita" ref={ref}>
      {/* A duração cresce com o número de itens para que a VELOCIDADE seja a
          mesma nas duas galerias — uma fita de dez fotos no mesmo tempo de uma
          de quatro correria duas vezes e meia mais rápido. */}
      <ul className="hm-fita__trilha" style={{ '--fita-duracao': `${duracao}s` }}>
        {fita(0)}
        {fita(1)}
      </ul>
    </div>
  )
}

export default GaleriaCarrossel
