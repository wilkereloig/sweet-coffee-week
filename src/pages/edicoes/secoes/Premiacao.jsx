import React from 'react'
import { Seta } from '../../../components/Seta'
import { TEXTOS } from '../../../data/conteudo/edicoes'

/*
 * SWEET AWARDS DA EDIÇÃO — só existe quando o acervo registra a premiação
 * (a ficha do topo já diz "Sem premiação" nas outras, sem destaque). Resumo:
 * o 1º lugar de cada categoria, a nota pública da edição (awardsData.js) e o
 * caminho para a página do Awards, que tem o pódio completo. Sem âncora nem
 * filtro: o destino é a página, que é o que existe.
 *
 * Chocolate: é o contraponto escuro do detalhe, e o amarelo do 1º lugar
 * (medalha de ouro, §6.4) só aparece como filete.
 */
export function Premiacao({ premiacao }) {
  return (
    <section className="scw-secao scw-secao--choco edx-premio" aria-labelledby="edx-premio-titulo">
      <div className="edx-premio__cabeca">
        <h2 id="edx-premio-titulo" className="scw-h2">{TEXTOS.premiacao}</h2>
        {premiacao.nota && <p className="scw-corpo edx-premio__nota">{premiacao.nota}</p>}
      </div>
      <div>
        <h3 className="edx-premio__sub">{TEXTOS.primeiros}</h3>
        <ul className="edx-premio__lista">
          {premiacao.categorias.map((c) => (
            <li key={c.nome}>
              <span className="edx-premio__cat">{c.nome}</span>
              <span className="edx-premio__quem">{c.primeiro ? c.primeiro.join(' e ') : 'Não registrado no acervo'}</span>
            </li>
          ))}
        </ul>
        <a className="scw-btn edx-premio__ir" href="#/sweet-awards">{TEXTOS.verAwards}<Seta /></a>
      </div>
    </section>
  )
}
