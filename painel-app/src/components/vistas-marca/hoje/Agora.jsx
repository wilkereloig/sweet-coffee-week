import React from 'react'
import { Icone } from '../../Icone'
import { MacroSecao } from '../../ui'

/*
 * O que fazer agora: UMA ação principal (com o motivo e o prazo) — ou, sem tarefa, o que está
 * com a organização, dito com todas as letras. Nunca inventa tarefa para preencher o espaço.
 * `destaque` e `semAcao` vêm de lib/inicioMarca.js (apresentarDestaque, semAcao).
 */
function Destaque({ d, onClick }) {
  return (
    <button type="button" className="gm-proxima im-destaque" data-critica={d.critica ? '1' : undefined} onClick={onClick}>
      <span className="gm-proxima__rotulo im-rotulo">{d.critica && <Icone nome="atencao" tamanho={16} />}{d.rotulo}</span>
      <span className="gm-proxima__titulo">{d.titulo}</span>
      {d.prazo && (
        <span className="im-prazo" data-urgente={d.prazo.urgente ? '1' : undefined}>
          <Icone nome={d.prazo.urgente ? 'atencao' : 'calendario'} tamanho={16} />{d.prazo.texto}
        </span>
      )}
      {d.texto && (d.citacao
        ? <span className="gm-proxima__texto im-citacao"><span className="im-citacao__quem">Comentário da organização</span>“{d.texto}”</span>
        : <span className="gm-proxima__texto">{d.texto}</span>)}
      {d.motivo && <span className="gm-proxima__texto im-motivo">{d.motivo}</span>}
      <span className="gm-proxima__acao">{d.acao}<Icone nome="seta-direita" tamanho={16} /></span>
    </button>
  )
}

function SemAcao({ s }) {
  return (
    <div className="ui-bloco-interno im-espera" data-tipo={s.tipo}>
      <span className="im-espera__icone" aria-hidden="true"><Icone nome={s.tipo === 'espera' ? 'horario' : 'feito'} tamanho={24} /></span>
      <div className="im-espera__corpo">
        <h3 className="im-espera__titulo">{s.titulo}</h3>
        <p className="im-espera__texto">{s.texto}</p>
        {s.itens.length > 0 && (
          <ul className="im-espera__lista">
            {s.itens.map((i) => <li key={i}><Icone nome="horario" tamanho={16} />{i}</li>)}
          </ul>
        )}
      </div>
    </div>
  )
}

export function Agora({ destaque, semAcao, aparte, enviarAparte, ir }) {
  return (
    <MacroSecao rotulo="Agora" titulo="O que fazer agora">
      {destaque ? <Destaque d={destaque} onClick={() => ir(destaque.link, destaque.vista)} /> : <SemAcao s={semAcao} />}
      {(aparte || enviarAparte) && (
        <ul className="gm-pendencias im-aparte">
          {/* Mensagem nova que NÃO é o destaque (há ação crítica): fica logo abaixo, uma vez só. */}
          {aparte && (
            <li className="gm-pendencia" data-tipo="mensagens">
              <span className="gm-pendencia__icone"><Icone nome="mensagens" tamanho={20} /></span>
              <span className="gm-pendencia__corpo"><b>{aparte.titulo}</b><span>{aparte.texto}</span></span>
              <button type="button" className="og-btn og-btn--mini og-btn--vazado" onClick={() => ir(aparte.link, 'mensagens')}>{aparte.acao}</button>
            </li>
          )}
          {/* O envio que perdeu o destaque (correção, pedido ou logo na frente) continua à vista. */}
          {enviarAparte && (
            <li className="gm-pendencia" data-tipo="enviar">
              <span className="gm-pendencia__icone"><Icone nome="enviar" tamanho={20} /></span>
              <span className="gm-pendencia__corpo"><b>{enviarAparte.titulo}</b><span>{enviarAparte.texto}</span></span>
              <button type="button" className="og-btn og-btn--mini og-btn--vazado" onClick={() => ir(enviarAparte.link, enviarAparte.vista)}>{enviarAparte.acao}</button>
            </li>
          )}
        </ul>
      )}
    </MacroSecao>
  )
}
