/*
 * PÁGINA DE ESPERA — "Aguarde" (26/08/2026, pedido do Eloi).
 * Substitui Participar como porta de entrada enquanto o pré-cadastro ainda
 * não é anunciado pro público geral: anuncia a próxima edição chegando e
 * aponta só pro Instagram — nada de CTA pro pré-cadastro aqui, de propósito.
 * /participar e /quero-participar/ continuam no ar normalmente (PARTICIPANTES_
 * ONLY_PUBLICATION em App.jsx passou a apontar pra cá em vez de Participar);
 * só não tem link daqui pra lá.
 * Full-screen como a EmBreve antiga (App.jsx trata via isInternal): sem
 * header/nav/rodapé normais, só o botão de Acesso reduzido.
 */
import { MARCA_SCW } from '../../components/nav'
import ScwIcon from '../../components/scw-icons/ScwIcon'
import { festivalFacts as F } from '../../data/festivalFacts'
import { INSTAGRAM_URL, INSTAGRAM_HANDLE } from '../../config/channels'
import '../../styles/scw-aguarde.css'

export function AguardePage() {
  return (
    <section className="ag-tela" aria-labelledby="ag-titulo">
      <img src={MARCA_SCW} alt="Sweet & Coffee Week" className="ag-marca" />
      <span className="ag-rotulo">{F.years.value} anos de Sweet & Coffee Week</span>
      <h1 id="ag-titulo" className="ag-titulo">A próxima edição está chegando.</h1>
      <p className="ag-lead">
        O pré-cadastro de marcas ainda não abriu. Siga a gente no Instagram pra
        saber assim que abrir.
      </p>
      <a className="ag-cta" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
        <ScwIcon nome="redes/instagram" tamanho={20} />
        Seguir {INSTAGRAM_HANDLE}
      </a>
    </section>
  )
}
