/*
 * A lista "O que você disputa", em balões de notificação (redesenho de 11/11/2026, Wilker: "parece uma redação, não parece notificação"): o e-mail por
 * confirmar (só quem já tem mapa), o voucher do dia, a campanha do Sicredi e o prêmio final. Cada aviso é um balão — ícone do app (a cor diz o tipo),
 * "de onde · quando", um título curto, UMA linha e a ação; a regra completa fica em "Como funciona".
 * Mora num arquivo próprio porque tem dois lugares: o pop-up diário (PopupDisputa) e a tela de boas-vindas de quem ainda não tem mapa (BoasVindas).
 * `disputa`: `montarDisputa` · `campanha`: `useCampanha` · `aoIrAoRegulamento`: o pop-up fecha a folha antes de navegar.
 */
import React from 'react'
import { Botao } from '../../componentes/sistema/pecas.jsx'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { MAPA_CACA as TC } from '../mapa/textos.js'
import { PREMIOS as P } from '../premios/textos.js'
import { prazoCurto, CAMPANHA, TEXTOS_CAMPANHA as TCAMP } from '../campanha/terComQuemContar.js'
import { DISPUTA as T } from './textos.js'

export function ListaDisputa ({ disputa, campanha, navigate, aoIrAoRegulamento }) {
  const v = disputa.voucher
  const f = disputa.final
  const irRegulamento = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault(); aoIrAoRegulamento?.(); navigate(TC.caminhos.regulamento)
  }
  return (
    <ol className="ct-notifs">
      {disputa.emailPendente && (
        <Notificacao tipo="atencao" icone="erro" origem={T.origem.caca} quando={T.agora} titulo={T.emailTitulo} texto={T.emailTexto} />
      )}
      {v && (
        <Notificacao tipo="voucher" icone="ja-fui" origem={T.origem.caca} quando={T.quando[v.quando] || T.agora}
          titulo={v.quando === 'depois' ? T.voucherTitulo.depois(v.data) : T.voucherTitulo[v.quando]} texto={T.voucherChamada[v.quando]}
          etiquetas={[v.corte && T.corte(v.corte), f && (f.feitas > 0 ? T.voucherComCasa(f.feitas, f.total) : T.voucherSemCasa)]}
          detalhe={<><p>{P.fimDoDia(v.corte)}</p><p>{P.vouchersNaoTiram}</p></>} />
      )}
      {campanha.aberta && (
        <Notificacao tipo="campanha" icone="vouchers" origem={T.origem.sicredi} quando={prazoCurto(campanha)}
          titulo={TCAMP.bloco.avisoTitulo} texto={T.campanhaTexto}
          detalhe={<p>{TCAMP.bloco.disputa}</p>}
          acao={<Botao tipo="secundario" href={CAMPANHA.caminho} navigate={navigate}>{TCAMP.bloco.ver}</Botao>} />
      )}
      {f && (
        <Notificacao tipo="final" icone="premio" origem={T.origem.caca} quando={T.ateOFim}
          titulo={T.finalTitulo} texto={P.finalMeta(f.total)}
          progresso={{ feitas: f.feitas, total: f.total, rotulo: f.tipo === 'completo' ? P.faltam(0) : P.progresso(f.feitas, f.total) }}
          detalhe={<><p>{P.finalTexto(disputa.ganhadores)}</p><p>{P.finalRegras} <a href={TC.caminhos.regulamento} onClick={irRegulamento}>{P.regulamento}</a></p></>} />
      )}
    </ol>
  )
}

/**
 * Um balão de notificação: ícone do app (a cor diz o tipo), "de onde · quando", título, uma linha de texto, etiquetas
 * curtas, barra de progresso (prêmio final), a regra completa sob "Como funciona" e, quando houver, a ação.
 */
function Notificacao ({ tipo, icone, origem, quando, titulo, texto, etiquetas = [], progresso = null, detalhe = null, acao = null }) {
  const lista = etiquetas.filter(Boolean)
  const pct = progresso && progresso.total > 0 ? Math.min(100, Math.round((progresso.feitas / progresso.total) * 100)) : 0
  return (
    <li className={`ct-notif ct-notif--${tipo}`}>
      <span className="ct-notif__app" aria-hidden="true"><IconeCartoon nome={icone} tamanho={48} /></span>
      <div className="ct-notif__corpo">
        <p className="ct-notif__meta"><span className="ct-notif__origem">{origem}</span><span className="ct-notif__quando">{quando}</span></p>
        <h3 className="ct-notif__titulo">{titulo}</h3>
        {texto && <p className="ct-notif__texto">{texto}</p>}
        {lista.length > 0 && <ul className="ct-notif__etiquetas">{lista.map((e) => <li key={e}>{e}</li>)}</ul>}
        {progresso && (
          <div className="ct-notif__progresso">
            <span className="ct-notif__barra" role="progressbar" aria-valuemin={0} aria-valuemax={progresso.total} aria-valuenow={progresso.feitas} aria-label={progresso.rotulo}><span style={{ width: `${pct}%` }} /></span>
            <span className="ct-notif__conta">{progresso.rotulo}</span>
          </div>
        )}
        {(detalhe || acao) && (
          <div className="ct-notif__pe">
            {acao}
            {detalhe && <details className="ct-notif__mais"><summary>{T.comoFunciona}</summary><div>{detalhe}</div></details>}
          </div>
        )}
      </div>
    </li>
  )
}
