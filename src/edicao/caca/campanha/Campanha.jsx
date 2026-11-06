/*
 * Entradas da campanha "Ter com quem contar" espalhadas pelo site (cartão da agência Sicredi, painel de Prêmios, tela de Metas,
 * rodapé, assinatura do patrocínio). Só aponta para /cartoon/ter-com-quem-contar: não conta carimbo, meta nem ranking, e some
 * quando o prazo (11/11, fuso de Fortaleza) passa. A regra de data e os textos moram em terComQuemContar.js.
 */
import React from 'react'
import { Link } from '../../componentes/base.jsx'
import { Botao } from '../../componentes/sistema/pecas.jsx'
import { useAgora } from '../../cartoon/useAgora.js'
import { CAMPANHA, TEXTOS_CAMPANHA as T, estadoDaCampanha, prazoCurto } from './terComQuemContar.js'

/** Estado da campanha, relido a cada minuto (vira "encerrada" sozinho à meia-noite de Fortaleza). */
export function useCampanha () {
  const agora = useAgora(60000)
  return estadoDaCampanha(agora)
}

/**
 * Cartão curto com título, 1–2 linhas, prazo e botão para a página. `variante` escolhe o texto: mapa (agência) · premios · metas.
 * Depois de 11/11 não renderiza nada.
 */
export function BlocoCampanha ({ navigate, variante = 'mapa', className = '' }) {
  const e = useCampanha()
  if (!e.aberta) return null
  const titulo = variante === 'premios' || variante === 'disputa' ? T.bloco.premiosTitulo : T.bloco.titulo
  return (
    <section className={`ct-campanha-bloco ${className}`.trim()} aria-label={T.bloco.titulo}>
      <h3 className="ct-campanha-bloco__titulo">{titulo}</h3>
      <p className="ct-campanha-bloco__texto">{T.bloco[variante]}</p>
      <p className="ct-campanha-bloco__prazo">{prazoCurto(e)}</p>
      <Botao tipo="secundario" href={CAMPANHA.caminho} navigate={navigate}>{T.bloco.ver}</Botao>
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
