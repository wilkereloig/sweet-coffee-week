import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { ALCANCE as A } from '../../../data/conteudo/apoiar'
import { Cabeca, Destaque } from '../../participar/comum'

/* 02 Alcance — faixa de dados em dois grupos, um por FONTE (histórico
   comercial · Instagram oficial), cada um com a data em que foi apurado. Antes
   eram seis cards iguais lado a lado, e o leitor somava o que não se soma.
   Disco na cor da página em todos (§6.3, leitura de Apoiar): quem distingue o
   dado é o ícone. */
export function Alcance() {
  return (
    <section id="alcance" className="scw-secao scw-secao--bege" aria-labelledby="pa-alcance-titulo">
      <Cabeca
        icone="topicos/alcance"
        rotulo={A.rotulo}
        idTitulo="pa-alcance-titulo"
        titulo={<>{A.titulo} <Destaque>{A.destaque}</Destaque>{A.depois}</>}
        apoio={A.apoio}
      />
      <div className="pa-dados">
        {A.grupos.map((g) => (
          <section className="pa-dados__grupo" key={g.titulo} aria-label={g.titulo}>
            <header className="pa-dados__cabeca">
              <h3>{g.titulo}</h3>
              <p>{g.fonte} · <span>apurado em {g.apurado}</span></p>
            </header>
            <ul className="pa-dados__lista">
              {g.itens.map((n) => (
                <li key={n.t}>
                  <span className="scw-disco pa-num__disco" aria-hidden="true">
                    <ScwIcon nome={n.i} tamanho={24} />
                  </span>
                  <b>{n.n}</b>
                  <strong>{n.t}</strong>
                  <span>{n.d}</span>
                </li>
              ))}
            </ul>
            {g.nota && <p className="pa-dados__nota">{g.nota}</p>}
          </section>
        ))}
      </div>
    </section>
  )
}
