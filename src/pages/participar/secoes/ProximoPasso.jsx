import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { Rotulo } from '../../../components/Rotulo'
import { Seta } from '../../../components/Seta'
import { PRE_CADASTRO, PROXIMO as P } from '../../../data/conteudo/participar'
import { Destaque } from '../comum'

/* 06 Próximo passo.
   ⚠️ O FORMULÁRIO NÃO MORA AQUI (22/08/2026). O pré-cadastro é a página
   estática /quero-participar/, que grava em `quero_participar` — a tabela que
   o painel da organização lê. Duas telas pedindo os mesmos dados seriam duas
   fontes de verdade do mesmo cadastro (§5.2).
   ⛔ `<a href>` com a barra final, nunca navigate() nem `#/` (§10.4-b).
   O id `pre-cadastro` é destino de link da central de dúvidas (faqCentral). */
export function ProximoPasso() {
  return (
    <section id="pre-cadastro" className="scw-secao scw-secao--creme" aria-labelledby="pa-proximo-titulo">
      <div className="pa-form__intro">
        <Rotulo icone="documento">{P.rotulo}</Rotulo>
        <h2 className="scw-h2" id="pa-proximo-titulo">
          {P.titulo} <Destaque>{P.destaque}</Destaque>
        </h2>
        <p>{P.texto}</p>
      </div>

      <div className="pa-cta">
        <ul className="pa-cta__lista">
          {P.lista.map((l) => (
            <li key={l.texto}><ScwIcon nome={l.icone} tamanho={20} />{l.texto}</li>
          ))}
        </ul>
        <a className="scw-btn scw-btn--pagina pa-cta__botao" href={PRE_CADASTRO}>
          Fazer pré-cadastro <Seta />
        </a>
      </div>
    </section>
  )
}
