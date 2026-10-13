import React from 'react'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { Seta } from '../../../components/Seta'
import { TEXTOS } from '../../../data/conteudo/edicoes'
import { SetaVolta } from '../icones'
import { teclaDaGaleria } from '../teclado'
import { pad2 } from '../useEdicoes'

/*
 * GALERIA DA EDIÇÃO — o acervo inteiro da edição (11–12 fotos), na ordem do
 * acervo, em páginas do tamanho do mosaico: 3 no desktop (`mosaico`), 2 no
 * celular (`par`). A última página é ancorada no fim, então o mosaico nunca
 * mostra buraco.
 *
 * Só anda por escolha (12/10/2026): o giro automático de 6s saiu. Foto que
 * troca sozinha dentro da cena é conteúdo que alguém perde (§6.15 — atmosfera
 * não carrega informação; §6.16 — nada de autoplay de fotos) e, sem botão de
 * pausa visível, descumpria a WCAG 2.2.2. Setas, teclado (←/→/Home/End) e
 * arraste continuam iguais.
 *
 * A barra é `seta · contador · seta` — três peças, nada mais (§7.2).
 * `data-teclas-proprias`: aqui as setas do teclado percorrem FOTOS; a página
 * não troca de edição com o foco dentro da galeria.
 */

function paginasDe(fotos, porPagina) {
  const n = fotos.length
  if (!n) return []
  const passo = Math.max(1, porPagina)
  return Array.from({ length: Math.ceil(n / passo) }, (_, k) => {
    const inicio = Math.max(0, Math.min(k * passo, n - passo))
    return fotos.slice(inicio, inicio + passo)
  })
}

/* Um quadro. Guarda a foto que sai por baixo enquanto a nova entra, pra a
   troca não piscar (ref no render + estado com prazo, porque só o ref sumiria
   no primeiro re-render alheio). */
function Quadro({ foto, classe, papel, prioridade, children }) {
  const anterior = React.useRef(null)
  const [residual, setResidual] = React.useState(null)
  const antes = anterior.current
  const sai = antes && (!foto || antes.src !== foto.src) ? antes : residual

  React.useEffect(() => {
    const anteriorFoto = anterior.current
    anterior.current = foto || null
    if (!anteriorFoto || !foto || anteriorFoto.src === foto.src) return undefined
    setResidual(anteriorFoto)
    const t = setTimeout(() => setResidual(null), 420)
    return () => clearTimeout(t)
  }, [foto])

  return (
    <figure className={`scw-gal__quadro${classe ? ` ${classe}` : ''}`}>
      {sai && <FotoAcervo foto={sai} papel={papel} alt="" className="scw-gal__foto scw-gal__foto--sai" />}
      {foto
        ? <FotoAcervo key={foto.src} foto={foto} papel={papel} prioridade={prioridade} className="scw-gal__foto scw-gal__foto--entra" />
        : <span className="scw-edx__reserva">{TEXTOS.fotoPendente}</span>}
      {children}
    </figure>
  )
}

export function Galeria({ fotos, total, porPagina, variante, etiqueta }) {
  const paginas = React.useMemo(() => paginasDe(fotos, porPagina), [fotos, porPagina])
  const n = paginas.length
  const [k, setK] = React.useState(0)
  const [sentido, setSentido] = React.useState(1)
  const arraste = React.useRef(null)

  const irPara = (alvo, s) => {
    if (n < 2) return
    setSentido(s)
    setK(((alvo % n) + n) % n)
  }
  const andar = (d) => irPara(k + d, d)

  // aquece a próxima página no cache (sem nó no DOM)
  React.useEffect(() => {
    if (typeof window === 'undefined' || n < 2) return
    ;(paginas[(k + 1) % n] || []).forEach((f) => { const img = new Image(); img.src = f.src })
  }, [k, n, paginas])

  if (!n) {
    return (
      <section className={`scw-gal scw-gal--${variante}`} aria-label={etiqueta}>
        <div className="scw-gal__quadros">
          <figure className="scw-gal__quadro"><span className="scw-edx__reserva">{TEXTOS.galeriaPendente}</span></figure>
        </div>
      </section>
    )
  }

  const pagina = paginas[Math.min(k, n - 1)]
  const de = pagina[0].indice
  const ate = pagina[pagina.length - 1].indice
  const quantas = total || fotos.length
  const anuncio = de === ate ? `Foto ${de} de ${quantas}` : `Fotos ${de} a ${ate} de ${quantas}`
  const mosaico = variante === 'mosaico'

  const aoTeclar = (ev) => {
    const acao = teclaDaGaleria(ev)
    if (!acao) return
    ev.preventDefault()
    ev.stopPropagation()
    if (acao === 'proxima') andar(1)
    else if (acao === 'anterior') andar(-1)
    else if (acao === 'primeira') irPara(0, -1)
    else irPara(n - 1, 1)
  }

  // Arraste próprio: o stopPropagation evita que o gesto vire troca de EDIÇÃO.
  const gestos = {
    onPointerDown: (ev) => { arraste.current = { x: ev.clientX, y: ev.clientY }; ev.stopPropagation() },
    onPointerUp: (ev) => {
      const a = arraste.current
      arraste.current = null
      ev.stopPropagation()
      if (!a) return
      const dx = ev.clientX - a.x
      const dy = ev.clientY - a.y
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) andar(dx < 0 ? 1 : -1)
    },
    onPointerCancel: () => { arraste.current = null },
  }

  return (
    <section
      className={`scw-gal scw-gal--${variante}${sentido < 0 ? ' is-voltando' : ''}`}
      data-galeria=""
      data-teclas-proprias=""
      role="group"
      aria-roledescription="carrossel"
      aria-label={etiqueta}
      onKeyDown={aoTeclar}
      {...gestos}
    >
      <div className="scw-gal__quadros">
        {pagina.map((f, j) => (
          <Quadro
            key={j}
            foto={f}
            papel={mosaico && j === 0 ? 'cheia' : mosaico ? 'cartao' : 'miniatura'}
            prioridade={mosaico && k === 0 && j === 0}
            classe={mosaico && j === 0 ? 'scw-gal__quadro--largo' : ''}
          >
            {mosaico && j === 0 ? <span className="scw-edx__topo-scrim" aria-hidden="true" /> : null}
          </Quadro>
        ))}
      </div>

      <p className="scw-edx__sr" aria-live="polite" aria-atomic="true">{anuncio}</p>

      <div className="scw-gal__barra">
        <button type="button" className="scw-gal__seta" aria-label="Fotos anteriores desta edição" onClick={() => andar(-1)}>
          <SetaVolta />
        </button>
        <span className="scw-gal__contador">
          {pad2(de)}–{pad2(ate)}<span>/{pad2(quantas)}</span>
        </span>
        <button type="button" className="scw-gal__seta" aria-label="Próximas fotos desta edição" onClick={() => andar(1)}>
          <Seta size={15} />
        </button>
      </div>
    </section>
  )
}
