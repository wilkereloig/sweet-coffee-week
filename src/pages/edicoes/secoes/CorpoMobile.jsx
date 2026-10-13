import React from 'react'
import { TEXTOS } from '../../../data/conteudo/edicoes'
import { Chevron } from '../icones'
import { Editorial } from './Editorial'
import { Ficha, ListaMarcas, rotuloMarcas } from './DadosEdicao'

/*
 * CORPO DO CELULAR — frase da edição, ficha, as palavras do tema e duas
 * sanfonas (marcas e texto editorial) que abrem no lugar. Só a frase remonta
 * por edição; as sanfonas ficam, para o foco não cair no <body> quando a
 * edição troca pela régua.
 */
function Sanfona({ aberta, controla, vazada, onClick, children }) {
  return (
    <button
      type="button"
      className={`scw-edx-mob__sanfona${vazada ? ' scw-edx-mob__sanfona--vazada' : ''}`}
      aria-expanded={aberta}
      aria-controls={controla}
      onClick={onClick}
    >
      <span>{children}</span>
      <span className="scw-edx-mob__chevron"><Chevron /></span>
    </button>
  )
}

export function CorpoMobile({
  cena, narrativa, periodo, nParticipantes, premiacao, participantes,
  temEditorial, abertura, curiosidades, painel, alternarPainel,
}) {
  return (
    <div className="scw-edx-mob__corpo">
      <p className="scw-edx-mob__lead" key={`lead-${cena.code}`}>{narrativa.lead}</p>

      <Ficha classe="scw-edx-mob__meta" periodo={periodo} nParticipantes={nParticipantes} premiacao={premiacao} />

      <div className="scw-edx-mob__tema-palavras">
        <span className="scw-edx-mob__palavras-rot" id="scw-edx-palavras">O tema em palavras</span>
        <ul className="scw-edx-mob__palavras" aria-labelledby="scw-edx-palavras">
          {cena.palavras.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </div>

      <Sanfona aberta={painel === 'participantes'} controla="scw-edx-marcas" onClick={() => alternarPainel('participantes')}>
        {rotuloMarcas(nParticipantes)}
      </Sanfona>
      {painel === 'participantes' && (
        <div className="scw-edx-mob__lista" id="scw-edx-marcas" data-teclas-proprias="">
          <ListaMarcas classe="scw-edx-mob__marcas" participantes={participantes} />
        </div>
      )}

      {temEditorial && (
        <Sanfona aberta={painel === 'editorial'} controla="scw-edx-editorial" vazada onClick={() => alternarPainel('editorial')}>
          {abertura ? TEXTOS.editorialAbertura : TEXTOS.editorialEdicao}
        </Sanfona>
      )}
      {painel === 'editorial' && (
        <Editorial
          id="scw-edx-editorial"
          classe="scw-edx__editorial--cartao"
          narrativa={narrativa}
          abertura={abertura}
          curiosidades={curiosidades}
        />
      )}
    </div>
  )
}
