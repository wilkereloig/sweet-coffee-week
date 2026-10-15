/*
 * A ficha PÚBLICA, a mesma que o site mostra (src/edicao/cartoon/paginas/
 * Participante.jsx), dentro do painel. Carregada sob demanda: o estilo e o
 * código da edição só entram quando a marca abre a prévia.
 * Sem `navigate` e sem `rota`, os links internos e a Minha rota somem.
 */
import '../../../../../src/styles/scw-cartoon.css'
import { FichaParticipante } from '../../../../../src/edicao/cartoon/paginas/Participante.jsx'

export default function FichaPrevia({ p }) {
  return (
    <div className="ct-edicao em-previa__ficha">
      <FichaParticipante p={p} fase="em_andamento" />
    </div>
  )
}
