import React from 'react'
import '../../styles/scw-home.css'
import { useMovimentoReduzido } from '../../hooks/useCrossfade'
import { Abertura } from './secoes/Abertura'
import { ComoFunciona } from './secoes/ComoFunciona'
import { Registros } from './secoes/Registros'
import { Trajetoria } from './secoes/Trajetoria'
import { Reconhecimento } from './secoes/Reconhecimento'
import { FacaParte } from './secoes/FacaParte'
import { Realizacao } from './secoes/Realizacao'
import { useDestaqueTitulos } from './useHome'

/* ============================================================================
   Home / "O festival" — reequilíbrio de 12/10/2026 (pedido do Wilker).
   Apresenta o festival o ano inteiro; quando houver lançamento autorizado,
   a edição assume a abertura (destaqueEdicao.js) e o resto segue igual.
   01 Abertura · 02 Como funciona · 03 Em registros · 04 Trajetória (→ Edições)
   · 05 Sweet Awards · 06 Faça parte (→ Participar, Apoiar, Contato)
   · 07 Realização (F2).
   Texto editorial: src/data/conteudo/home.js. Fotos: fotosHome()/heroPhotos()
   de imageLibrary.js. Dado: festivalFacts, proximaEdicao, awardsData.
   ========================================================================= */

export function HomePage({ navigate }) {
  const raizRef = React.useRef(null)
  const reduzido = useMovimentoReduzido()
  useDestaqueTitulos(raizRef)

  const ir = (rota) => (evento) => {
    evento.preventDefault()
    navigate(rota)
  }
  /* Âncora na mesma página: o roteador é por hash, então `#festival` mudaria
     a rota — rola até a seção sem tocar no endereço. */
  const rolarPara = (id) => (evento) => {
    evento.preventDefault()
    const alvo = document.getElementById(id)
    if (!alvo) return
    alvo.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'start' })
    alvo.querySelector('h2')?.focus({ preventScroll: true })
  }

  return (
    <div className="hm" ref={raizRef}>
      <Abertura ir={ir} rolarPara={rolarPara} />
      <ComoFunciona />
      <Registros ir={ir} />
      <Trajetoria ir={ir} />
      <Reconhecimento ir={ir} />
      <FacaParte ir={ir} />
      <Realizacao />
    </div>
  )
}

export default HomePage
