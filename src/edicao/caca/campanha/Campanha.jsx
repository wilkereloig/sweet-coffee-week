/*
 * Entradas da campanha "Ter com quem contar" espalhadas pelo site (cartão da agência Sicredi, painel de Prêmios, tela de Metas,
 * rodapé, assinatura do patrocínio). A participação na campanha é que pode gerar o carimbo Sicredi, após aprovação do print.
 * O cartão some quando o prazo (13/11, fuso de Fortaleza) passa. A regra de data e os textos moram em terComQuemContar.js.
 */
import React from 'react'
import { Link } from '../../componentes/base.jsx'
import { Botao } from '../../componentes/sistema/pecas.jsx'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { useAgora } from '../../cartoon/useAgora.js'
import { CAMPANHA, TEXTOS_CAMPANHA as T, estadoDaCampanha, prazoCurto } from './terComQuemContar.js'

/** Estado da campanha, relido a cada minuto (vira "encerrada" sozinho à meia-noite de Fortaleza). */
export function useCampanha () {
  const agora = useAgora(60000)
  return estadoDaCampanha(agora)
}

/**
 * Cartão curto com título, 1–2 linhas, prazo e botão para a página. `variante` escolhe o texto: mapa (agência) · premios · metas.
 * Depois de 13/11 não renderiza nada.
 */
export function BlocoCampanha ({ navigate, variante = 'mapa', className = '' }) {
  const e = useCampanha()
  if (!e.aberta) return null
  const mapa = variante === 'mapa'
  const titulo = mapa ? 'Sua história pode ganhar um par de vouchers!' : variante === 'premios' || variante === 'disputa' ? T.bloco.premiosTitulo : T.bloco.titulo
  return (
    <section className={`ct-campanha-bloco${mapa ? ' ct-campanha-bloco--mapa' : ''} ${className}`.trim()} aria-label={T.bloco.titulo}>
      {mapa && <><div className="ct-campanha-bloco__selo"><IconeCartoon nome="vouchers" tamanho={48} /><span>Campanha do Sicredi</span></div></>}
      <h3 className="ct-campanha-bloco__titulo">{titulo}</h3>
      <p className="ct-campanha-bloco__texto">{mapa ? `Conte em vídeo uma história de quem esteve ao seu lado. ${CAMPANHA.historias} histórias serão escolhidas.` : T.bloco[variante]}</p>
      <p className="ct-campanha-bloco__prazo">{prazoCurto(e)}</p>
      <Botao tipo={mapa ? 'primario' : 'secundario'} href={CAMPANHA.caminho} navigate={navigate}>{mapa ? 'Quero participar' : T.bloco.ver}</Botao>
    </section>
  )
}

/** Só uma frase com link, para a tela de Metas: informativo, sem botão grande. */
export function AvisoCampanha ({ navigate }) {
  const e = useCampanha()
  if (!e.aberta) return null
  return (
    <p className="ct-nota ct-campanha-aviso">
      {T.bloco.metas} <Link href={CAMPANHA.caminho} navigate={navigate} className="ct-link">{T.bloco.ver}</Link>
    </p>
  )
}

/** Link de texto (rodapé, assinatura do patrocínio). `Tag`: 'li' no rodapé, nada na assinatura. */
export function LinkDaCampanha ({ navigate, como: Tag, className }) {
  const e = useCampanha()
  if (!e.aberta) return null
  const link = <Link href={CAMPANHA.caminho} navigate={navigate} className={className}>{T.bloco.rodape}</Link>
  return Tag ? <Tag>{link}</Tag> : link
}
