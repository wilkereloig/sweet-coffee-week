import React from 'react'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { Seta } from '../../../components/Seta'
import { TEXTOS } from '../../../data/conteudo/edicoes'
import { SetaVolta, Xis } from '../icones'
import { teclaDaGaleria } from '../teclado'

/*
 * GALERIA DA EDIÇÃO — o acervo inteiro da edição (11–12 fotos).
 *
 * Uma foto principal num visor de proporção fixa (a reserva de espaço não
 * depende da foto) com `object-fit: contain`: o acervo mistura retrato,
 * paisagem e quadrado, e nenhuma foto perde o produto para caber no quadro.
 * Embaixo (celular) ou ao lado (desktop): as miniaturas, que são a sequência
 * manual — cada uma é um botão. Setas, contador "03 / 12" e legenda.
 *
 * Só anda por escolha: sem autoplay. As setas do teclado trocam a foto apenas
 * com o foco DENTRO da galeria (`data-teclas-proprias`) — a página não captura
 * teclas nem gestos.
 *
 * Ampliar abre um <dialog> nativo de tela cheia: Esc fecha, Tab fica dentro,
 * ←/→ trocam a foto, e o foco volta para a foto principal ao fechar.
 */
const pad2 = (n) => String(n).padStart(2, '0')

export function GaleriaEdicao({ fotos, tema, ano }) {
  const [i, setI] = React.useState(0)
  const [aberta, setAberta] = React.useState(false)   // a foto grande só baixa ao ampliar
  const dialogo = React.useRef(null)
  const fechar = React.useRef(null)
  const palco = React.useRef(null)
  const miniaturas = React.useRef(null)
  const n = fotos.length

  const ir = React.useCallback((k) => setI(((k % n) + n) % n), [n])

  // A miniatura da foto atual fica à vista na faixa, sem rolar a página.
  React.useEffect(() => {
    const f = miniaturas.current
    const b = f && f.children[i]
    if (!f || !b || f.scrollWidth <= f.clientWidth) return
    f.scrollTo({ left: Math.max(0, b.offsetLeft - (f.clientWidth - b.offsetWidth) / 2) })
  }, [i])

  if (!n) {
    return (
      <section className="edx-gal edx-gal--vazia" aria-label={TEXTOS.galeria}>
        <div className="edx-gal__visor"><span className="edx-reserva">{TEXTOS.galeriaPendente}</span></div>
      </section>
    )
  }

  /* O ponto focal do acervo é para RECORTE (cover). Aqui a foto aparece
     inteira (contain), então ela fica no centro do visor. */
  const foto = { ...fotos[i], position: null }
  const legenda = `Registro ${foto.indice} de ${n} · ${tema}, ${ano}`

  const aoTeclar = (ev) => {
    const acao = teclaDaGaleria(ev)
    if (!acao) return
    ev.preventDefault()
    if (acao === 'proxima') ir(i + 1)
    else if (acao === 'anterior') ir(i - 1)
    else if (acao === 'primeira') ir(0)
    else ir(n - 1)
  }

  const ampliar = () => {
    const d = dialogo.current
    if (!d || d.open) return
    d.showModal()
    setAberta(true)
    if (fechar.current) fechar.current.focus()
  }

  // Dentro do diálogo: setas trocam a foto; Tab não escapa.
  const noDialogo = (ev) => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return
    if (ev.key === 'ArrowRight') { ev.preventDefault(); ir(i + 1); return }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); ir(i - 1); return }
    if (ev.key !== 'Tab') return
    const itens = [...dialogo.current.querySelectorAll('button')]
    const primeiro = itens[0]
    const ultimo = itens[itens.length - 1]
    if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus() }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus() }
  }

  return (
    <section className="edx-gal" aria-labelledby="edx-gal-titulo">
      <div className="edx-gal__cabeca">
        <h2 id="edx-gal-titulo" className="edx-gal__titulo">{TEXTOS.galeria}</h2>
        <p className="edx-gal__nota">{TEXTOS.notaFotos}</p>
      </div>

      <div
        className="edx-gal__corpo"
        data-galeria=""
        data-teclas-proprias=""
        role="group"
        aria-roledescription="galeria"
        aria-label={`${TEXTOS.galeria} ${tema}`}
        onKeyDown={aoTeclar}
      >
        <figure className="edx-gal__palco">
          <button type="button" className="edx-gal__visor" ref={palco} onClick={ampliar} aria-label={`Ampliar: ${legenda}`}>
            <FotoAcervo key={foto.src} foto={foto} papel="cartao" prioridade className="edx-gal__foto" />
          </button>
          <figcaption className="edx-gal__legenda">{legenda}</figcaption>
        </figure>

        <div className="edx-gal__lado">
          <div className="edx-gal__controles">
            <button type="button" className="edx-gal__seta" aria-label="Foto anterior" onClick={() => ir(i - 1)}>
              <SetaVolta size={18} />
            </button>
            <span className="edx-gal__contador" aria-hidden="true">{pad2(i + 1)}<span> / {pad2(n)}</span></span>
            <button type="button" className="edx-gal__seta" aria-label="Próxima foto" onClick={() => ir(i + 1)}>
              <Seta size={18} />
            </button>
            <button type="button" className="edx-gal__ampliar" onClick={ampliar}>Ampliar</button>
          </div>
          <p className="edx-sr" aria-live="polite" aria-atomic="true">{`Foto ${i + 1} de ${n}`}</p>

          <ul className="edx-gal__miniaturas" ref={miniaturas}>
            {fotos.map((f, k) => (
              <li key={f.src}>
                <button
                  type="button"
                  className="edx-gal__mini"
                  aria-label={`Foto ${k + 1} de ${n}`}
                  aria-current={k === i ? 'true' : undefined}
                  onClick={() => ir(k)}
                >
                  <FotoAcervo foto={f} papel="miniatura" alt="" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <dialog
        ref={dialogo}
        className="edx-ampliada"
        aria-label={`${TEXTOS.galeria} ${tema}, ampliada`}
        onKeyDown={noDialogo}
        onClose={() => { setAberta(false); if (palco.current) palco.current.focus() }}
      >
        <div className="edx-ampliada__topo">
          <span className="edx-ampliada__contador">{pad2(i + 1)} / {pad2(n)}</span>
          <button type="button" className="edx-ampliada__fechar" ref={fechar} aria-label="Fechar foto ampliada" onClick={() => dialogo.current.close()}>
            <Xis size={20} />
          </button>
        </div>
        <figure className="edx-ampliada__palco">
          {aberta && <FotoAcervo key={foto.src} foto={foto} papel="cheia" className="edx-ampliada__foto" prioridade />}
          <figcaption className="edx-ampliada__legenda">{legenda}</figcaption>
        </figure>
        <div className="edx-ampliada__controles">
          <button type="button" className="edx-gal__seta edx-gal__seta--clara" aria-label="Foto anterior" onClick={() => ir(i - 1)}>
            <SetaVolta size={20} />
          </button>
          <button type="button" className="edx-gal__seta edx-gal__seta--clara" aria-label="Próxima foto" onClick={() => ir(i + 1)}>
            <Seta size={20} />
          </button>
        </div>
      </dialog>
    </section>
  )
}
