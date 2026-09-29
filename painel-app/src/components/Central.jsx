import React from 'react'
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
const ICONE_TIPO = {
  mensagem: <><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z" /></>,
  pedido: <><path d="M12 4.2 21 20H3Z" /><path d="M12 10.2v4" /><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" /></>,
  arquivo: <><path d="M12 4v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M5 20h14" /></>,
  fotos: <><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" /><circle cx="12" cy="13" r="3.5" /></>,
  cadastro: <><circle cx="12" cy="12" r="8.8" /><path d="M7.8 12.3l3 3 5.4-6.4" /></>,
  formulario: <><path d="M7 4h10a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 7 4Z" /><path d="M9 9h6M9 12.5h6M9 16h3.5" /></>,
}
// Nível do aviso (painel da marca, 29/09/2026): ícone + rótulo, nunca só cor.
const ICONE_NIVEL = {
  informacao: <><circle cx="12" cy="12" r="8.8" /><path d="M12 11v5.4" /><circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none" /></>,
  atencao: <><circle cx="12" cy="12" r="8.8" /><path d="M12 7.4v5.6" /><circle cx="12" cy="16.4" r="1" fill="currentColor" stroke="none" /></>,
  pendencia: ICONE_TIPO.pedido,
  alteracao: <><path d="M5 12a7 7 0 0 1 12-4.9L19 9" /><path d="M19 4.6V9h-4.4" /><path d="M19 12a7 7 0 0 1-12 4.9L5 15" /><path d="M5 19.4V15h4.4" /></>,
  aprovado: ICONE_TIPO.cadastro,
  arquivo: ICONE_TIPO.arquivo,
}
const ICONE_SINO = <><path d="M12 4.4c-3 0-5.4 2.4-5.4 5.6v3.3L5 16.6h14l-1.6-3.3v-3.3c0-3.2-2.4-5.6-5.4-5.6Z" /><path d="M10 19.2a2 2 0 0 0 4 0" /></>

// `niveis` (opcional): { nivelDe(aviso) → chave, NIVEIS[chave] → { rotulo, acao } }.
export function Central({ itens, carregando, erro, onAbrir, onLerTodas, onRecarregar, aberto, onAbrirCentral, onFecharCentral, niveis = null }) {
  const naoLidas = contarNaoLidas(itens)
  const lista = itens || []

  return (
    <>
      <button
        className="pn-cabeca__btn" type="button"
        aria-label={naoLidas ? 'Avisos: ' + naoLidas + (naoLidas === 1 ? ' não lido' : ' não lidos') : 'Avisos'}
        onClick={() => { onAbrirCentral(); if (onRecarregar) onRecarregar() }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONE_SINO}</svg>
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
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {(nivel && ICONE_NIVEL[nivel]) || ICONE_TIPO[n.tipo] || ICONE_TIPO.formulario}
                      </svg>
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
