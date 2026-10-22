import React from 'react'
import { Icone } from '../../Icone'

/*
 * O que ainda falta nesta aba, lido de `resumoMarca` (guia.js) — o MESMO texto do Início e o MESMO número do
 * selo da aba: marcar a sessão (tipo `fotos`), conferir fotos oficiais (tipo `arquivo`) e responder uma solicitação
 * da organização sobre as fotos (tipo `pedido`, que leva à tela Solicitações). Nada é recalculado aqui; cada linha
 * só leva até o bloco (ou a tela) que resolve. Sem pendência, o bloco nem aparece.
 */
const ALVO = { fotos: 'fm-agendamento', arquivo: 'fm-oficiais' }
const ICONE = { fotos: 'camera', arquivo: 'imagem', pedido: 'pedido' }
const BOTAO = { fotos: 'Ver horários', arquivo: 'Ver as fotos', pedido: 'Responder' }

function irAte(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ block: 'start' })
  const titulo = el.querySelector('h2')
  if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }) }
}

export function PendenciasFotos({ itens, abrirLink }) {
  if (!itens || itens.length === 0) return null
  return (
    <section className="fm-pendencias ui-bloco-interno" aria-label="O que falta nas fotos">
      <b>O que falta nas fotos</b>
      <ul className="gm-pendencias">
        {itens.map((p, i) => (
          <li key={i} className="gm-pendencia" data-tipo={p.tipo}>
            <span className="gm-pendencia__icone"><Icone nome={ICONE[p.tipo] || 'imagem'} tamanho={20} /></span>
            <span className="gm-pendencia__corpo">
              <b>{p.titulo}</b>
              {p.texto && <span>{p.texto}</span>}
            </span>
            <button type="button" className="og-btn og-btn--mini og-btn--vazado" onClick={() => (ALVO[p.tipo] ? irAte(ALVO[p.tipo]) : abrirLink && p.link && abrirLink(p.link))}>
              {BOTAO[p.tipo] || p.acao || 'Abrir'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
