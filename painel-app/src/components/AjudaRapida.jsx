import React from 'react'
import { Folha } from './Folha'
import { Secao } from './ui'
import { AJUDA } from '../lib/ajuda'

/*
 * Ajuda rápida — a mesma folha nos dois painéis (gaveta no computador, folha
 * no celular: Esc, foco preso e devolvido vêm da Folha). Abre só pelo botão
 * do cabeçalho, nunca sozinha. `aparelho` é o bloco "Este aparelho"
 * (instalar e avisos), que é também onde o convite dispensado volta.
 */
export function AjudaRapida({ aberto, onFechar, papel, onIr, aparelho = null }) {
  const itens = AJUDA[papel] || []
  return (
    <Folha aberto={aberto} titulo="Ajuda rápida"
      sub={papel === 'marca' ? 'Onde fica cada coisa no painel da sua marca' : 'Onde fica cada coisa no painel da organização'}
      onFechar={onFechar}>
      <div className="ui-pilha">
        <ul className="ui-ajuda">
          {itens.map((i) => (
            <li key={i.titulo} className="ui-ajuda__item">
              <b>{i.titulo}</b>
              <p className="ui-nota">{i.texto}</p>
              {i.link && (
                <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => { onFechar(); onIr(i.link) }}>
                  {i.acao}
                </button>
              )}
            </li>
          ))}
        </ul>
        {aparelho && <Secao titulo="Este aparelho" nota="Instale o painel e ligue os avisos. Vale só para este celular ou computador.">{aparelho}</Secao>}
      </div>
    </Folha>
  )
}
