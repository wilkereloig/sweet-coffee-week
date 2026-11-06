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
import { Link } from '../../../componentes/base.jsx'
import { Botao, Rotulo } from '../../../componentes/sistema/pecas.jsx'
import { QueroIr, JaFui } from '../../MarcasLover.jsx'
import { useRota } from '../../contexto.js'
import { MAPA as T, ATENDIMENTO, ICONE } from '../../textos.js'
import { LogoDoPin } from './LogoDoPin.jsx'
import { SeloEstado } from '../../../caca/mapa/SeloEstado.jsx'
import { ESTADO_TEXTO, MAPA_CACA as TC } from '../../../caca/mapa/textos.js'
import { CACA_CAMINHOS } from '../../../caca/textos.js'
import { DELIVERY as TD } from '../../../caca/delivery/textos.js'

export function Cartao ({ linha, periodo, navigate, fechar, parada = null, estado = null, revisitas = 0, proxima = false, aoAvaliar, irmas = [], aoEscolher }) {
  const [mais, setMais] = React.useState(false)
  const rota = useRota()
  const idMais = React.useId()
  // Trocou de casa ou de endereço: o cartão volta compacto (o resto está em "Mais").
  React.useEffect(() => { setMais(false) }, [linha?.u.id])
  const passoRef = React.useRef(null)
  // Marcou "Já fui" com "Mais" aberto: o próximo passo aparece colado ao botão e a folha rola até ele (fica atrás da barra de abas).
  const jaFuiAgora = !!(linha && rota?.foi?.(linha.p))
  React.useEffect(() => {
    if (jaFuiAgora) passoRef.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [jaFuiAgora])
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
  const deliveryApenas = M.soDelivery(u)
  const passoJaFui = rota?.foi?.(p) && estado !== 'conquistada' ? TC.jaFuiPasso[estado || 'semMapa'] : ''
  // "Aberto agora" é decisão de ir e fica à vista; os outros horários ("abre hoje às 11h") esperam em "Mais".
  const aberto = est?.estado === 'aberto'
  const agoraNo = agora && (
    <p className={`ct-agora ct-agora--${est.estado} ct-mapa__cartao-linha`}>
      {aberto ? <IconeCartoon nome="aberto-agora" tamanho={32} /> : <ScwIcon nome={ICONE.horario} tamanho={20} />}{agora}
    </p>
  )
  const comoChegarBotao = comoChegar && !deliveryApenas && (
    <Botao tipo={pendente ? 'secundario' : 'primario'} href={comoChegar} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.comoChegar} tamanho={20} />{T.comoChegar}</Botao>
  )
  // Casa só delivery: a ação principal é pedir (link do canal; sem link, a ficha mostra como pedir) e o carimbo é o do delivery.
  const linkDelivery = M.canaisSeguros(u)[0]?.link
  const pedirBotao = deliveryApenas && (linkDelivery
    ? <Botao href={linkDelivery} target="_blank" rel="noopener noreferrer"><IconeCartoon nome="delivery" tamanho={32} />{T.pedirDelivery}</Botao>
    : <Botao href={`${EDICAO.caminho}/participantes/${p.slug}`} navigate={navigate}><IconeCartoon nome="delivery" tamanho={32} />{T.comoPedir}</Botao>)
  return (
    <article className="ct-mapa__cartao" aria-labelledby="mapa-cartao-nome" tabIndex={-1}>
      <div className="ct-mapa__cartao-cabeca">
        <LogoDoPin p={p} tamanho={36} estado={estado} />
        {/* Nome e estado na Caça juntos (forma + texto): o "Casa escolhida" de antes só gastava uma linha; fica o rótulo do próximo passo. */}
        <div className="ct-mapa__cartao-id">
          {proxima && <p className="ct-rotulo">{TC.proximaRotulo}</p>}
          <h2 id="mapa-cartao-nome" className="ct-mapa__cartao-nome">{titulo}</h2>
          {deliveryApenas && <span className="ct-mapa__so-delivery"><IconeCartoon nome="delivery" tamanho={32} />{T.soDelivery}</span>}
          {estado && !(deliveryApenas && estado === 'nao-visitada') && <SeloEstado estado={estado} revisitas={revisitas} tamanho={24} longo />}
        </div>
        <button type="button" className="ct-mapa__fechar" onClick={fechar} aria-label={T.fechar}><ScwIcon nome="fechar" tamanho={20} /></button>
      </div>
      {aberto && agoraNo}
      {deliveryApenas
        ? <p className="ct-nota ct-mapa__so-delivery-nota">{T.soDeliveryNota}</p>
        : M.enderecoEmLinha(u.endereco) && <p className="ct-mapa__cartao-linha"><ScwIcon nome={ICONE.endereco} tamanho={20} /><span>{M.enderecoEmLinha(u.endereco)}</span></p>}
      {/* Casa com mais de um endereço: os outros ficam à vista (não escondidos em "Mais"), um toque troca de endereço. */}
      {irmas.length > 0 && (
        <div className="ct-mapa__irmas">
          <Rotulo>{TC.outrosEnderecos(irmas.length)}</Rotulo>
          <ul tabIndex={0} aria-label={TC.outrosEnderecos(irmas.length)}>
            {irmas.map(({ u: o, p: op }) => (
              <li key={o.id}><button type="button" className="ct-mapa__irma" onClick={() => aoEscolher?.(o.id)}><strong>{M.nomeDaUnidade(op, o) || M.tituloDaUnidade(op, o)}</strong><span>{M.enderecoEmLinha(o.endereco)}</span></button></li>
            ))}
          </ul>
        </div>
      )}
      {/* Ações em duas fileiras: a principal ocupa a linha; embaixo, quatro controles do mesmo tamanho (dois botões, "Quero ir" só com o coração, "Mais"). */}
      <div className="ct-acoes ct-mapa__cartao-acoes">
        {pendente && aoAvaliar ? <Botao onClick={() => aoAvaliar(p, u)}>{TC.avaliarValidar}</Botao> : (pedirBotao || comoChegarBotao)}
        {/* Atalho do carimbo: a mesma página do QR do display (pede a localização e só carimba com você na casa); casa só delivery usa o carimbo do delivery. */}
        {deliveryApenas
          ? <Botao tipo="secundario" href={`${CACA_CAMINHOS.delivery}?casa=${encodeURIComponent(p.slug)}`} navigate={navigate}>{TD.titulo}</Botao>
          : <Botao tipo="secundario" href={`${EDICAO.caminho}/carimbo/${p.slug}`} navigate={navigate}>{TC.carimbarAqui}</Botao>}
        <Botao tipo="secundario" href={`${EDICAO.caminho}/combos/${p.slug}`} navigate={navigate}>{TC.verCombo}</Botao>
        <QueroIr u={u} nome={titulo} />
        <button type="button" className="ct-chip ct-mapa__mais-botao" aria-expanded={mais} aria-controls={idMais} aria-label={mais ? TC.menosDetalhes : TC.maisDetalhes} onClick={() => setMais((v) => !v)}>{mais ? TC.menosCurto : TC.maisCurto}</button>
      </div>
      <div id={idMais} className="ct-mapa__mais" hidden={!mais}>
        {!aberto && agoraNo}
        {deliveryApenas && M.enderecoEmLinha(u.endereco) && <p className="ct-mapa__cartao-linha"><ScwIcon nome={ICONE.endereco} tamanho={20} /><span>{M.enderecoEmLinha(u.endereco)}</span></p>}
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
        {/* "Já fui" é só anotação: o próximo passo muda conforme o estado REAL da Caça (do servidor), colado ao botão, sem bloquear nada. */}
        {passoJaFui && (
          <p ref={passoRef} className="ct-nota ct-mapa__ja-fui-passo" role="status">
            {passoJaFui}{!estado && <> <Link href={TC.caminhos.central} navigate={navigate}>{TC.conhecerCaca}</Link></>}
          </p>
        )}
      </div>
    </article>
  )
}
