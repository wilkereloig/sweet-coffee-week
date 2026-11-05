/*
 * Cartão da casa escolhida (lista 13, M2): fica junto do mapa (embaixo dele), com o que a pessoa precisa para
 * decidir e ir — logo, endereço, como está agora, como pedir — e as ações: como chegar, WhatsApp, ver a casa,
 * quero ir / já fui. Na página única (docs/cartoon-2026-2/14 §14.13) também diz se a casa é parada da rota e o ESTADO dela
 * na Caça (forma + texto, nunca só cor): ainda não visitada, carimbo pendente (falta avaliar, com a ação direta) ou
 * conquistada, com as revisitas. Ver o combo, avaliar e adicionar à rota ("Quero ir") ficam à mão; avaliar sozinho não
 * cria carimbo e o cartão diz isso. Sem escolha, a dica de como escolher.
 * `estado`: 'nao-visitada' | 'pendente' | 'conquistada' | null (sem mapa) — sempre o do servidor.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { EDICAO } from '../../../config.js'
import * as M from '../../../dados/modelo.js'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Botao, Rotulo } from '../../../componentes/sistema/pecas.jsx'
import { QueroIr, JaFui } from '../../MarcasLover.jsx'
import { MAPA as T, PARTICIPANTE as TP, ATENDIMENTO, ICONE } from '../../textos.js'
import { LogoDoPin } from './LogoDoPin.jsx'
import { SeloEstado } from '../../../caca/mapa/SeloEstado.jsx'
import { ESTADO_TEXTO, MAPA_CACA as TC } from '../../../caca/mapa/textos.js'

export function Cartao ({ linha, periodo, navigate, fechar, parada = null, estado = null, revisitas = 0, proxima = false, aoAvaliar }) {
  if (!linha) return <p className="ct-mapa__dica"><ScwIcon nome="informacao" tamanho={20} /><span>{T.dica}</span></p>
  const { u, p, dist } = linha
  const titulo = M.tituloDaUnidade(p, u)
  const est = u.combo ? M.estadoAgora(u, undefined, periodo) : null
  const agora = est ? M.textoEstado(est) : ''
  const modos = M.MODOS.map(([k]) => k).filter((k) => u.combo?.modos?.[k] === 'sim')
  const comoChegar = M.linkComoChegar(u)
  const c = u.coordenada
  const notaLugar = !c ? T.semCoordenada : c.conferir ? (c.precisao === 'rua' ? T.aproximadaRua : T.aproximada) : ''
  return (
    <article className="ct-mapa__cartao" aria-labelledby="mapa-cartao-nome">
      <div className="ct-mapa__cartao-cabeca">
        <LogoDoPin p={p} tamanho={64} />
        <div>
          <p className="ct-rotulo">{proxima ? TC.proximaRotulo : T.cartaoTitulo}</p>
          <h2 id="mapa-cartao-nome" className="ct-mapa__cartao-nome">{titulo}</h2>
        </div>
        <button type="button" className="ct-mapa__fechar" onClick={fechar} aria-label={T.fechar}><ScwIcon nome="fechar" tamanho={20} /></button>
      </div>
      <p className="ct-mapa__cartao-linha"><ScwIcon nome={ICONE.endereco} tamanho={20} /><span>{M.enderecoEmLinha(u.endereco) || TP.unidadesNi}</span></p>
      {notaLugar && <p className={`ct-mapa__local${c ? ' ct-mapa__local--aprox' : ''}`}>{notaLugar}</p>}
      {dist != null && <p className="ct-mapa__cartao-linha ct-nota"><ScwIcon nome={ICONE.comoChegar} tamanho={20} /><span>{T.distancia(dist, !!u.coordenada?.conferir)}</span></p>}
      {agora && (
        <p className={`ct-agora ct-agora--${est.estado} ct-mapa__cartao-linha`}>
          {est.estado === 'aberto' ? <IconeCartoon nome="aberto-agora" tamanho={32} /> : <ScwIcon nome={ICONE.horario} tamanho={20} />}{agora}
        </p>
      )}
      {!p.combo && <p className="ct-nota">{T.semComboNota}</p>}
      {parada && <p className="ct-mapa__cartao-linha"><ScwIcon nome="trajeto" tamanho={20} /><span>{T.parada(parada)}</span></p>}
      {estado && (
        <div className="ct-caca-mapa__cartao-estado">
          <SeloEstado estado={estado} revisitas={revisitas} tamanho={36} longo />
          <p className="ct-nota">{ESTADO_TEXTO[estado].explica}</p>
        </div>
      )}
      {modos.length > 0 && (
        <div>
          <Rotulo>{T.comoPedir}</Rotulo>
          <ul className="ct-mapa__modos">
            {modos.map((k) => <li key={k}><IconeCartoon nome={ATENDIMENTO[k].icone} tamanho={32} /><span>{ATENDIMENTO[k].rotulo}</span></li>)}
          </ul>
        </div>
      )}
      <div className="ct-acoes">
        {comoChegar && <Botao href={comoChegar} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.comoChegar} tamanho={20} />{T.comoChegar}</Botao>}
        {estado === 'pendente' && aoAvaliar && <Botao onClick={() => aoAvaliar(p, u)}>{TC.avaliarValidar}</Botao>}
        <Botao tipo="secundario" href={`${EDICAO.caminho}/combos/${p.slug}`} navigate={navigate}>{TC.verCombo}</Botao>
        {estado !== 'pendente' && estado !== 'conquistada' && aoAvaliar && <Botao tipo="secundario" onClick={() => aoAvaliar(p, u)}>{TC.avaliarCombo}</Botao>}
        <Botao tipo="secundario" href={`${EDICAO.caminho}/participantes/${p.slug}`} navigate={navigate}>{T.verCasa}</Botao>
        {u.whatsapp && <Botao tipo="secundario" href={M.linkWhatsApp(u.whatsapp)} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.whatsapp} tamanho={20} />WhatsApp</Botao>}
      </div>
      <div className="ct-mapa__marcas"><QueroIr u={u} nome={titulo} /><JaFui p={p} /></div>
    </article>
  )
}
