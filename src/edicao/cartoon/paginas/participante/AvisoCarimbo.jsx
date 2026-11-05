/*
 * Aviso flutuante da ficha: convida a pessoa a carimbar a casa na Caça aos Carimbos (05/11, pedido do Wilker).
 * Aparece em toda abertura da ficha, venha de onde vier (QR do display, catálogo, mapa, link); "fechar" vale só para
 * esta visita — nada é gravado, então volta na próxima. O botão NÃO carimba: leva à tela do carimbo da casa, que cria o
 * mapa se faltar e só registra depois do toque e da localização. Casa com várias unidades: quem escolhe é o banco,
 * pela posição do celular, na tela do carimbo, nunca esta aqui.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { EDICAO } from '../../../config.js'
import { Link } from '../../../componentes/base.jsx'
import { PARTICIPANTE as T } from '../../textos.js'

export function AvisoCarimbo ({ slug, navigate }) {
  const [aberto, setAberto] = React.useState(true)
  if (!aberto) return null
  const A = T.avisoCarimbo
  return (
    <aside className="ct-aviso-carimbo" aria-label={A.rotulo} onKeyDown={(e) => { if (e.key === 'Escape') setAberto(false) }}>
      <p className="ct-aviso-carimbo__texto"><strong>{A.rotulo}</strong>{A.texto}</p>
      <Link className="ct-botao ct-aviso-carimbo__acao" href={`${EDICAO.caminho}/carimbo/${slug}`} navigate={navigate}>{A.acao}</Link>
      <button type="button" className="ct-aviso-carimbo__fechar" onClick={() => setAberto(false)} aria-label={A.fechar}>
        <ScwIcon nome="fechar" tamanho={20} />
      </button>
    </aside>
  )
}
