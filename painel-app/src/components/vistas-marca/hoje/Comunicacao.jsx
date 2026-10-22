import React from 'react'
import { Icone, MODULO_ICONE } from '../../Icone'
import { MacroSecao, GradeModulos, Modulo, Botao } from '../../ui'
import { tempoRelativo } from '../../../lib/central'
import { nivelDoAviso, NIVEIS } from '../../../lib/guia'
import { Cronograma } from './Cronograma'

/*
 * Comunicação e próximos prazos, compactos — cada linha com o seu destino:
 *  conversa (Mensagens) · solicitações (resumo; os itens moram em "Pendências") · avisos recentes · cronograma.
 * Mensagem nova aparece UMA vez, lá em cima (no destaque ou logo abaixo dele): aqui só se diz isso.
 */
export function Comunicacao({ mensagemAcima, solicitacoes, recentes, cronograma, notaCronograma, hoje, irPara, abrirLink }) {
  return (
    <MacroSecao rotulo="Comunicação" titulo="Conversa e próximos prazos">
      <GradeModulos className="ui-modulos--dois">
        <Modulo icone={MODULO_ICONE.mensagens} titulo="Com a organização" sub="Conversa, pedidos e avisos">
          <ul className="gm-pendencias">
            <li className="gm-pendencia" data-tipo="mensagens">
              <span className="gm-pendencia__icone"><Icone nome="mensagens" tamanho={20} /></span>
              <span className="gm-pendencia__corpo">
                <b>Conversa com a organização</b>
                <span>{mensagemAcima ? 'Há mensagem nova, destacada acima.' : 'Tire dúvidas ou envie uma informação.'}</span>
              </span>
              <Botao variante="secundario" onClick={() => irPara('mensagens')}>Falar com a organização</Botao>
            </li>
            {solicitacoes && (
              <li className="gm-pendencia" data-tipo="pedido" data-urgente={solicitacoes.urgente ? '1' : undefined}>
                <span className="gm-pendencia__icone"><Icone nome="pedido" tamanho={20} /></span>
                <span className="gm-pendencia__corpo">
                  <b>{solicitacoes.titulo}</b>
                  {solicitacoes.prazo && <span>{solicitacoes.prazo}</span>}
                </span>
                <Botao variante="secundario" onClick={() => irPara('pedidos')}>Ver solicitações</Botao>
              </li>
            )}
          </ul>
          {recentes.length > 0 && (
            <>
              <p className="im-sub">Avisos recentes</p>
              <ul className="gm-avisos__lista">
                {recentes.map((n) => {
                  const nivel = nivelDoAviso(n)
                  return (
                    <li key={n.id}>
                      <button type="button" className="gm-aviso" onClick={() => n.link && abrirLink(n.link, n.tipo)} disabled={!n.link}>
                        <span className="ui-aviso__nivel" data-nivel={nivel}>{NIVEIS[nivel].rotulo}</span>
                        <b>{n.titulo}</b>
                        <span className="ui-nota">{tempoRelativo(n.criada_em)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Modulo>
        {cronograma.length > 0 && (
          <Modulo icone="calendario" titulo="Próximos prazos" sub={notaCronograma}>
            <Cronograma itens={cronograma} hoje={hoje} />
          </Modulo>
        )}
      </GradeModulos>
    </MacroSecao>
  )
}
