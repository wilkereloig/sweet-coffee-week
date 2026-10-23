import React from 'react'
import { FichaParticipante } from '../../../../../src/edicao/cartoon/paginas/Participante.jsx'
import '../../../../../src/styles/scw-cartoon.css'

/*
 * Prévia da página pública dentro do painel (docs/cartoon-2026-2/04-painel.md §4.3):
 * o MESMO componente do site, com o conteúdo de montar_publico() que ainda
 * não foi publicado. Fica numa pasta `edicao/` porque o estilo da edição só
 * pode morar em pasta de edição (tests/rotas-edicao.test.mjs); entra por
 * React.lazy, então o CSS e o JS da Cartoon só baixam quando a prévia abre.
 */
export default function PreviaPublica({ p, periodo = null }) {
  return (
    <div className="ct-edicao">
      <FichaParticipante p={p} fase="em_andamento" periodo={periodo} />
    </div>
  )
}
