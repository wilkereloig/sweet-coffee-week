import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { Seta } from '../../../components/Seta'
import { TEXTOS } from '../../../data/conteudo/edicoes'
import { Mais } from '../icones'
import { TOTAL } from '../useEdicoes'
import { Ficha, rotuloMarcas } from './DadosEdicao'

/*
 * COLUNA EDITORIAL DO DESKTOP (metade esquerda da cena).
 *
 * Identificação junto do título: selo (ícone + etapa) e, na mesma linha, o ano
 * e a posição da edição na linha do tempo — antes o ano só aparecia pequeno no
 * cabeçalho e na trilha. Depois, tema (h1), frase, ficha e as duas ações.
 *
 * O bloco de texto remonta a cada edição (key) para a entrada coreografada
 * rodar de novo; as AÇÕES não — trocar de edição com o foco num botão não pode
 * jogar o foco no <body>.
 */
export function ColunaDesktop({
  cena, numero, narrativa, periodo, nParticipantes, premiacao,
  temEditorial, abertura, painel, alternarPainel, refs,
}) {
  return (
    <div className="scw-edx__coluna">
      <div className="scw-edx__coluna-texto" key={cena.code}>
        <div className="scw-edx__cena-selo">
          {cena.icone && (
            <span className="scw-edx__cena-disco" aria-hidden="true">
              <ScwIcon nome={cena.icone} tamanho={24} />
            </span>
          )}
          <span className="scw-edx__rotulo">{cena.etapa}</span>
          <span className="scw-edx__quando"><b>{cena.code}</b> edição {numero} de {TOTAL}</span>
        </div>
        <h1 className="scw-edx__tema">{cena.tema}</h1>
        <p className="scw-edx__lead">{narrativa.lead}</p>
        <Ficha classe="scw-edx__meta" periodo={periodo} nParticipantes={nParticipantes} premiacao={premiacao} />
      </div>

      <div className="scw-edx__acoes">
        <button
          type="button"
          ref={refs.participantes}
          className="scw-edx__botao"
          aria-expanded={painel === 'participantes'}
          aria-controls="scw-edx-painel"
          onClick={() => alternarPainel('participantes')}
        >
          {rotuloMarcas(nParticipantes)}
          <Seta size={15} />
        </button>
        {temEditorial && (
          <button
            type="button"
            ref={refs.editorial}
            className="scw-edx__botao scw-edx__botao--vazado"
            aria-expanded={painel === 'editorial'}
            aria-controls="scw-edx-painel"
            onClick={() => alternarPainel('editorial')}
          >
            {abertura ? TEXTOS.editorialAbertura : TEXTOS.editorialEdicao}
            <Mais />
          </button>
        )}
      </div>
    </div>
  )
}
