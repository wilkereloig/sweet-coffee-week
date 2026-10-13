/*
 * PÁGINA INSTITUCIONAL — "Edições": a história do festival em 16 cenas, uma
 * por edição, numa apresentação photo-first (CLAUDE.md §7.2). Estilos em
 * src/styles/scw-edicoes.css; estado e comportamento em ./useEdicoes.js; a
 * regra do teclado em ./teclado.js; o texto de interface e a identidade das
 * cenas em src/data/conteudo/edicoes.js.
 *
 * Desktop (>900px): cena de 100dvh — marca da edição no cabeçalho próprio,
 * coluna editorial à esquerda, mosaico do acervo à direita, painéis
 * flutuantes de marcas e de texto, linha do tempo no rodapé.
 * Celular (≤900px): capítulo vertical — capa 4:5, galeria em pares, frase,
 * ficha, palavras do tema, sanfonas — e a régua de anos fixa na base.
 *
 * Uma cena só no DOM, carregamento controlado (useEdicoes). Edições fica fora
 * do motor de movimento do site: a coreografia é própria (scw-edicoes.css).
 *
 * Dados (NÃO inventar): período, marcas e premiação de handoff/edicoesData.js;
 * fotos de imageLibrary.js (editionPhotos); marca da edição de editionMark();
 * texto longo de edicoesNarrativa.js. O acervo não identifica a marca de cada
 * foto: a galeria é o registro da EDIÇÃO e a lista de marcas segue textual.
 * Preço não aparece na página.
 */
import React from 'react'
import '../../styles/scw-edicoes.css'
import { bgStyle } from '../../data/imageLibrary'
import { TEXTOS } from '../../data/conteudo/edicoes'
import { useEdicoes, TOTAL } from './useEdicoes'
import { Galeria } from './secoes/Galeria'
import { CabecalhoDesktop } from './secoes/CabecalhoDesktop'
import { ColunaDesktop } from './secoes/ColunaDesktop'
import { PaineisDesktop } from './secoes/PaineisDesktop'
import { RodapeDesktop } from './secoes/RodapeDesktop'
import { CapaMobile } from './secoes/CapaMobile'
import { CorpoMobile } from './secoes/CorpoMobile'
import { ReguaMobile } from './secoes/ReguaMobile'

export function EdicoesPage({ navigate, embutido = true, onOpenAccess, accessOpen }) {
  const ed = useEdicoes({ accessOpen })
  const { cena, fotos, numero, estreito, dir, gestos } = ed

  // memo: sem isto a lista nasceria nova a cada render e a galeria do celular
  // refaria páginas (e o aquecimento de cache) por render.
  const fotosDepoisDaCapa = React.useMemo(() => fotos.slice(1), [fotos])

  const ir = (href) => (ev) => {
    ev.preventDefault()
    navigate(href.replace('#', ''))
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  const raiz = ['scw-edx', dir < 0 ? 'is-tras' : '', embutido ? '' : 'scw-edx--solta'].filter(Boolean).join(' ')
  const tokens = {
    '--scw-edx-tom': ed.tom.cor,
    '--scw-edx-tinta': ed.tom.tinta,
    '--scw-edx-tom-txt': ed.tom.txt,
    '--scw-edx-prog': `${((ed.i + 0.5) / TOTAL) * 100}%`,
    '--scw-edx-prog-n': (ed.i + 0.5) / TOTAL,
  }
  const anuncio = `Edição ${numero} de ${TOTAL}: ${cena.tema}, ${cena.code}`
  const etiquetaGaleria = `Fotos da edição ${cena.tema}, ${cena.code}`
  const navegacao = { i: ed.i, numero, cena, anterior: ed.anterior, proxima: ed.proxima, vaiPara: ed.vaiPara, passo: ed.passo }

  if (estreito) {
    return (
      <div className={raiz} style={tokens}>
        <p className="scw-edx__sr" aria-live="polite">{anuncio}</p>
        <section className="scw-edx-mob" aria-label={TEXTOS.rotuloPagina}>
          <div className="scw-edx-mob__conteudo" {...gestos}>
            <CapaMobile key={`capa-${cena.code}`} cena={cena} numero={numero} marca={ed.marca} capa={fotos[0] || null} />
            {/* o resto do acervo em pares 1:1 — a capa é a 1ª foto, nada se repete */}
            <Galeria key={`galeria-${cena.code}`} fotos={fotosDepoisDaCapa} total={fotos.length} porPagina={2} variante="par" etiqueta={etiquetaGaleria} />
            <CorpoMobile {...ed} />
          </div>
          <ReguaMobile {...navegacao} />
        </section>
      </div>
    )
  }

  /* Fundo do desktop: a ÚLTIMA foto do acervo, desfocada sob véu de 87% —
     assim a foto que abre o mosaico não aparece duas vezes na mesma cena. */
  const fotoFundo = fotos.length ? fotos[fotos.length - 1] : null

  return (
    <div className={raiz} style={tokens}>
      <p className="scw-edx__sr" aria-live="polite">{anuncio}</p>
      <section className="scw-edx__palco" aria-roledescription="apresentação" aria-label={TEXTOS.rotuloPagina}>
        <CabecalhoDesktop marca={ed.marca} tema={cena.tema} ir={ir} onOpenAccess={onOpenAccess} accessOpen={accessOpen} />
        <div className="scw-edx__cena" {...gestos}>
          <div className="scw-edx__fundo" aria-hidden="true" key={`fundo-${cena.code}`}>
            {fotoFundo && <span className="scw-edx__fundo-foto" style={bgStyle(fotoFundo)} />}
            <span className="scw-edx__veu" />
          </div>
          <Galeria key={`galeria-${cena.code}`} fotos={fotos} porPagina={3} variante="mosaico" etiqueta={etiquetaGaleria} />
          <ColunaDesktop {...ed} />
          <PaineisDesktop {...ed} />
        </div>
        <RodapeDesktop {...navegacao} />
      </section>
    </div>
  )
}

export default EdicoesPage
