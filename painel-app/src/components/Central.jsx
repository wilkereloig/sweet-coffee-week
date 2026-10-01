import React from 'react'
import { Icone } from './Icone'
import { Folha } from './Folha'
import { Carregando, Erro, Vazio } from './ui'
import { tempoRelativo, contarNaoLidas } from '../lib/central'

/*
 * Central de avisos — o sino do cabeçalho e a lista, IGUAL nos dois painéis.
 * Os avisos vêm do banco (tabela `notificacoes`, gerada por gatilho: mensagem,
 * pedido, arquivo, sessão de fotos, cadastro concluído, formulário novo) — o
 * "lida" fica gravado e sobrevive a recarregar a página e trocar de aparelho.
 * Cada aviso leva ao item (link), nunca a um painel genérico.
 *
 * Quem carrega e marca como lida é o shell (organização: RPC; marca: tabela
 * sob RLS). Este componente só desenha e avisa o clique.
 */
// Ícones por tipo e por nível: nomes do registro único (components/Icone.jsx).
const ICONE_TIPO = { mensagem: 'mensagem', pedido: 'pedido', arquivo: 'arquivo', fotos: 'fotos', cadastro: 'ok-circulo', formulario: 'formulario' }
const ICONE_NIVEL = { informacao: 'informacao', atencao: 'atencao-circulo', pendencia: 'pedido', alteracao: 'alteracao', aprovado: 'ok-circulo', arquivo: 'arquivo' }

// `niveis` (opcional): { nivelDe(aviso) → chave, NIVEIS[chave] → { rotulo, acao } }.
export function Central({ itens, carregando, erro, onAbrir, onLerTodas, onRecarregar, aberto, onAbrirCentral, onFecharCentral, niveis = null }) {
  const naoLidas = contarNaoLidas(itens)
  const lista = itens || []

  return (
    <>
      <button
        className="pn-cabeca__btn" type="button" data-tour="sino"
        aria-label={naoLidas ? 'Avisos: ' + naoLidas + (naoLidas === 1 ? ' não lido' : ' não lidos') : 'Avisos'}
        onClick={() => { onAbrirCentral(); if (onRecarregar) onRecarregar() }}
      >
        <Icone nome="sino" tamanho={20} />
        {naoLidas > 0 && <span className="pn-badge" aria-hidden="true">{naoLidas > 99 ? '99+' : naoLidas}</span>}
      </button>

      <Folha
        aberto={aberto}
        titulo="Avisos"
        sub={naoLidas ? naoLidas + (naoLidas === 1 ? ' não lido' : ' não lidos') : 'Tudo em dia'}
        onFechar={onFecharCentral}
      >
        {naoLidas > 0 && (
          <div className="ui-linha-acoes">
            <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={onLerTodas}>Marcar todos como lidos</button>
          </div>
        )}
        {carregando && !lista.length && <Carregando linhas={3} texto="Carregando os avisos…" />}
        {erro && <Erro titulo="Não deu para atualizar os avisos" texto={erro} onTentar={onRecarregar} />}
        {!carregando && !erro && lista.length === 0 && (
          <Vazio titulo="Nada por aqui ainda">Quando chegar mensagem, pedido, arquivo ou mudança na agenda, aparece aqui.</Vazio>
        )}
        {lista.length > 0 && (
          <ul className="ui-avisos">
            {lista.map((n) => {
              const lida = !!(n.lida || n.lida_em)
              const nivel = niveis ? niveis.nivelDe(n) : null
              const info = nivel ? niveis.NIVEIS[nivel] : null
              return (
                <li key={n.id}>
                  <button type="button" className={'ui-aviso' + (lida ? '' : ' is-naolida')} onClick={() => onAbrir(n)}>
                    <span className="ui-aviso__disco" data-tipo={n.tipo} data-nivel={nivel || undefined} aria-hidden="true">
                      <Icone nome={(nivel && ICONE_NIVEL[nivel]) || ICONE_TIPO[n.tipo] || ICONE_TIPO.formulario} tamanho={20} />
                    </span>
                    <span className="ui-aviso__corpo">
                      {info && <span className="ui-aviso__nivel" data-nivel={nivel}>{info.rotulo}</span>}
                      <span className="ui-aviso__titulo">{n.titulo}</span>
                      {n.texto && <span className="ui-aviso__texto">{n.texto}</span>}
                      <span className="ui-aviso__meta">
                        {tempoRelativo(n.criada_em)}
                        {n.ator_rotulo && n.ator_rotulo !== 'Acesso compartilhado' && !n.ator_rotulo.startsWith('Marca ·') ? ' · por ' + n.ator_rotulo : ''}
                      </span>
                      {info && n.link && <span className="ui-aviso__acao">{info.acao} →</span>}
                    </span>
                    {!lida && <span className="ui-aviso__ponto"><span className="ui-oculto">Não lido</span></span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Folha>
    </>
  )
}
