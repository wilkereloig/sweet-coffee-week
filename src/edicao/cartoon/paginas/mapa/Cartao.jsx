/*
 * Cartão da casa escolhida (lista 13, M2; compacto desde o redesign de 06/11/2026). Mora numa folha (Folha.jsx):
 * embaixo no celular, na coluna lateral no desktop. O que cabe à vista é o que decide: logo, nome, estado na Caça
 * (forma + texto, nunca só cor), como está agora, endereço e UMA ação principal por contexto —
 *   carimbo pendente → "Avaliar e validar o carimbo";  senão → "Como chegar".
 * Ao lado, as secundárias que mais se usa ("Ver o combo", "Quero ir") e o botão "Mais", que abre o resto: como pedir,
 * ver a casa, WhatsApp, "já fui", avaliar o combo, notas do lugar e os OUTROS ENDEREÇOS da mesma casa (a casa conta
 * uma vez na Caça, mesmo com vários endereços). Avaliar sozinho não cria carimbo e o cartão diz isso.
 * `estado`: 'nao-visitada' | 'pendente' | 'conquistada' | null (sem mapa) — sempre o do servidor.
 * `irmas`: outras unidades da mesma casa, `{ u, p }` · `aoEscolher(id)`: trocar de endereço.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { EDICAO } from '../../../config.js'
import * as M from '../../../dados/modelo.js'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Botao, Rotulo } from '../../../componentes/sistema/pecas.jsx'
import { QueroIr, JaFui } from '../../MarcasLover.jsx'
import { MAPA as T, ATENDIMENTO, ICONE } from '../../textos.js'
import { LogoDoPin } from './LogoDoPin.jsx'
import { SeloEstado } from '../../../caca/mapa/SeloEstado.jsx'
import { ESTADO_TEXTO, MAPA_CACA as TC } from '../../../caca/mapa/textos.js'

export function Cartao ({ linha, periodo, navigate, fechar, parada = null, estado = null, revisitas = 0, proxima = false, aoAvaliar, irmas = [], aoEscolher }) {
  const [mais, setMais] = React.useState(false)
  const idMais = React.useId()
  // Trocou de casa ou de endereço: o cartão volta compacto (o resto está em "Mais").
  React.useEffect(() => { setMais(false) }, [linha?.u.id])
  if (!linha) return null
  const { u, p, dist } = linha
  const titulo = M.tituloDaUnidade(p, u)
  const est = u.combo ? M.estadoAgora(u, undefined, periodo) : null
  const agora = est ? M.textoEstado(est) : ''
  const modos = M.MODOS.map(([k]) => k).filter((k) => u.combo?.modos?.[k] === 'sim')
  const comoChegar = M.linkComoChegar(u)
  const c = u.coordenada
  const notaLugar = !c ? T.semCoordenada : c.conferir ? (c.precisao === 'rua' ? T.aproximadaRua : T.aproximada) : ''
  const pendente = estado === 'pendente'
  // "Aberto agora" é decisão de ir e fica à vista; os outros horários ("abre hoje às 11h") esperam em "Mais".
  const aberto = est?.estado === 'aberto'
  const agoraNo = agora && (
    <p className={`ct-agora ct-agora--${est.estado} ct-mapa__cartao-linha`}>
      {aberto ? <IconeCartoon nome="aberto-agora" tamanho={32} /> : <ScwIcon nome={ICONE.horario} tamanho={20} />}{agora}
    </p>
  )
  const comoChegarBotao = comoChegar && (
    <Botao tipo={pendente ? 'secundario' : 'primario'} href={comoChegar} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.comoChegar} tamanho={20} />{T.comoChegar}</Botao>
  )
  return (
    <article className="ct-mapa__cartao" aria-labelledby="mapa-cartao-nome" tabIndex={-1}>
      <div className="ct-mapa__cartao-cabeca">
        <LogoDoPin p={p} tamanho={36} />
        <div>
          <p className="ct-rotulo">{proxima ? TC.proximaRotulo : T.cartaoTitulo}</p>
          <h2 id="mapa-cartao-nome" className="ct-mapa__cartao-nome">{titulo}</h2>
        </div>
        <button type="button" className="ct-mapa__fechar" onClick={fechar} aria-label={T.fechar}><ScwIcon nome="fechar" tamanho={20} /></button>
      </div>
      {(estado || aberto) && (
        <div className="ct-mapa__cartao-resumo">
          {estado && <SeloEstado estado={estado} revisitas={revisitas} tamanho={28} longo />}
          {aberto && agoraNo}
        </div>
      )}
      {M.enderecoEmLinha(u.endereco) && <p className="ct-mapa__cartao-linha"><ScwIcon nome={ICONE.endereco} tamanho={20} /><span>{M.enderecoEmLinha(u.endereco)}</span></p>}
      {/* Casa com mais de um endereço: os outros ficam à vista (não escondidos em "Mais"), um toque troca de endereço. */}
      {irmas.length > 0 && (
        <div className="ct-mapa__irmas">
          <Rotulo>{TC.outrosEnderecos(irmas.length)}</Rotulo>
          <ul tabIndex={0} aria-label={TC.outrosEnderecos(irmas.length)}>
            {irmas.map(({ u: o, p: op }) => (
              <li key={o.id}><button type="button" className="ct-mapa__irma" onClick={() => aoEscolher?.(o.id)}><strong>{M.tituloDaUnidade(op, o)}</strong><span>{M.enderecoEmLinha(o.endereco)}</span></button></li>
            ))}
          </ul>
        </div>
      )}
      <div className="ct-acoes ct-mapa__cartao-acoes">
        {pendente && aoAvaliar ? <Botao onClick={() => aoAvaliar(p, u)}>{TC.avaliarValidar}</Botao> : comoChegarBotao}
        {/* Atalho do carimbo: a mesma página do QR do display; ela pede a localização e só carimba com você na casa. */}
        <Botao tipo="secundario" href={`${EDICAO.caminho}/carimbo/${p.slug}`} navigate={navigate}>{TC.carimbarAqui}</Botao>
        <Botao tipo="secundario" href={`${EDICAO.caminho}/combos/${p.slug}`} navigate={navigate}>{TC.verCombo}</Botao>
        <QueroIr u={u} nome={titulo} />
        <button type="button" className="ct-chip ct-mapa__mais-botao" aria-expanded={mais} aria-controls={idMais} aria-label={mais ? TC.menosDetalhes : TC.maisDetalhes} onClick={() => setMais((v) => !v)}>{mais ? TC.menosCurto : TC.maisCurto}</button>
      </div>
      <div id={idMais} className="ct-mapa__mais" hidden={!mais}>
        {!aberto && agoraNo}
        {estado && <p className="ct-nota">{ESTADO_TEXTO[estado].explica}</p>}
        {notaLugar && <p className={`ct-mapa__local${c ? ' ct-mapa__local--aprox' : ''}`}>{notaLugar}</p>}
        {dist != null && <p className="ct-mapa__cartao-linha ct-nota"><ScwIcon nome={ICONE.comoChegar} tamanho={20} /><span>{T.distancia(dist, !!u.coordenada?.conferir)}</span></p>}
        {!p.combo && <p className="ct-nota">{T.semComboNota}</p>}
        {parada && <p className="ct-mapa__cartao-linha"><ScwIcon nome="trajeto" tamanho={20} /><span>{T.parada(parada)}</span></p>}
        {modos.length > 0 && (
          <div>
            <Rotulo>{T.comoPedir}</Rotulo>
            <ul className="ct-mapa__modos">
              {modos.map((k) => <li key={k}><IconeCartoon nome={ATENDIMENTO[k].icone} tamanho={32} /><span>{ATENDIMENTO[k].rotulo}</span></li>)}
            </ul>
          </div>
        )}
        {irmas.length > 0 && <p className="ct-nota">{TC.outrosEnderecosNota}</p>}
        <div className="ct-acoes">
          {pendente && comoChegarBotao}
          {!pendente && estado !== 'conquistada' && aoAvaliar && <Botao tipo="secundario" onClick={() => aoAvaliar(p, u)}>{TC.avaliarCombo}</Botao>}
          <Botao tipo="secundario" href={`${EDICAO.caminho}/participantes/${p.slug}`} navigate={navigate}>{T.verCasa}</Botao>
          {u.whatsapp && <Botao tipo="secundario" href={M.linkWhatsApp(u.whatsapp)} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.whatsapp} tamanho={20} />WhatsApp</Botao>}
        </div>
        <div className="ct-mapa__marcas"><JaFui p={p} /></div>
      </div>
    </article>
  )
}
