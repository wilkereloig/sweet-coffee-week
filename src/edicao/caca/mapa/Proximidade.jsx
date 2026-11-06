/*
 * Convite de localização e sugestão "perto de você" no mapa (07/11/2026; regra em proximidade.js, texto em textos-perto.js).
 * Só apresentação: quem pede a posição, guarda a escolha e decide quando mostrar é a página do mapa. A sugestão ajuda a escolher:
 * "Ver combo", "Como chegar" e "Ver no mapa" são só links/atalhos — nenhum deles marca visita, carimbo ou avaliação.
 */
import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon.jsx'
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { Foto } from '../../componentes/base.jsx'
import { Botao } from '../../componentes/sistema/pecas.jsx'
import { MAPA as T, ICONE } from '../../cartoon/textos.js'
import { PERTO_SUGESTAO as P } from './textos-perto.js'

/** Texto de disponibilidade: só diz "disponível agora" quando o horário confirma; horário não informado nunca vira "aberta". */
export function textoDisponibilidade (d) {
  if (!d) return ''
  if (d.estado === 'aberto' || d.estado === 'abre_hoje') return M.textoEstado(d)
  if (d.estado === 'sem_horario') return P.sugestao.horarioAConfirmar
  return ''
}

export function ConviteLocalizacao ({ buscando = false, aoUsar, aoAdiar }) {
  const id = React.useId()
  return (
    <section className="ct-perto-convite" aria-labelledby={id}>
      <ScwIcon nome="local" tamanho={24} />
      <div className="ct-perto-convite__corpo">
        <h2 id={id} className="ct-perto-convite__titulo">{P.convite.titulo}</h2>
        <p>{P.convite.texto}</p>
      </div>
      <div className="ct-perto-convite__acoes">
        <button type="button" className="ct-botao" onClick={aoUsar} disabled={buscando} aria-busy={buscando}>{buscando ? P.convite.buscando : P.convite.usar}</button>
        <button type="button" className="ct-link" onClick={aoAdiar}>{P.convite.agoraNao}</button>
      </div>
    </section>
  )
}

/** `sugestao`: o objeto `tipo: 'sugestao'` de `sugerirProximaCasa`. Ações da página: aoVerNoMapa(slug, unidadeId), aoAgoraNao(slug), aoDesligar(). */
export function SugestaoPerto ({ sugestao, navigate, aoVerNoMapa, aoAgoraNao, aoDesligar }) {
  const id = React.useId()
  if (!sugestao || sugestao.tipo !== 'sugestao') return null
  const { slug, unidadeId, casa, unidade, bairro, comboNome, foto, km, aproximada, disponibilidade, modo, unidadeDados } = sugestao
  const nome = unidade ? `${casa} · ${unidade}` : casa
  const disponibilidadeTexto = textoDisponibilidade(disponibilidade)
  const comoChegar = M.linkComoChegar(unidadeDados)
  const distancia = km != null ? T.distancia(km, aproximada) : ''
  return (
    <section className="ct-perto-sugestao" aria-labelledby={id} data-modo={modo}>
      <div className="ct-perto-sugestao__foto">
        <Foto foto={foto} proporcao="1 / 1" alt={P.sugestao.fotoAlt(comboNome, casa)} reserva={casa.replace(/^\[DEMO\]\s*/, '').trim().charAt(0).toUpperCase()} />
      </div>
      <div className="ct-perto-sugestao__corpo">
        <p className="ct-rotulo">{P.sugestao.titulo[modo]}</p>
        <h2 id={id} className="ct-perto-sugestao__nome">{nome}</h2>
        {comboNome && <p className="ct-perto-sugestao__combo">{comboNome}</p>}
        <ul className="ct-perto-sugestao__fatos">
          {(bairro || distancia) && (
            <li><ScwIcon nome={ICONE.endereco} tamanho={20} /><span>{[bairro, distancia].filter(Boolean).join(' · ')}</span></li>
          )}
          {disponibilidadeTexto && <li><ScwIcon nome={ICONE.horario} tamanho={20} /><span>{disponibilidadeTexto}</span></li>}
        </ul>
        {km == null && <p className="ct-nota">{P.sugestao.semDistancia}</p>}
        {aproximada && <p className="ct-nota ct-perto-sugestao__aprox">{P.sugestao.pontoAproximado}</p>}
        <p className="ct-nota">{P.sugestao.avisoSoSugestao}{modo === 'opcao' && ` ${P.sugestao.avisoRota}`}</p>
        <div className="ct-acoes ct-perto-sugestao__acoes">
          <Botao tipo="secundario" href={`${EDICAO.caminho}/combos/${slug}`} navigate={navigate}>{P.sugestao.verCombo}</Botao>
          {comoChegar && <Botao href={comoChegar} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.comoChegar} tamanho={20} />{P.sugestao.comoChegar}</Botao>}
        </div>
        <div className="ct-perto-sugestao__rodape">
          {aoVerNoMapa && <button type="button" className="ct-link" onClick={() => aoVerNoMapa(slug, unidadeId)}>{P.sugestao.verNoMapa}</button>}
          <button type="button" className="ct-link" aria-label={P.sugestao.agoraNaoCasaConta(casa)} onClick={() => aoAgoraNao?.(slug)}>{P.sugestao.agoraNaoCasa}</button>
          <button type="button" className="ct-link" aria-label={P.sugestao.desligarConta} onClick={() => aoDesligar?.()}>{P.sugestao.desligar}</button>
        </div>
      </div>
    </section>
  )
}

/** Dica discreta quando a pessoa tocou em "Perto de mim"/liberou a localização e a regra não achou casa. */
export const SemSugestao = ({ motivo }) => (P.vazio[motivo] ? <p className="ct-nota ct-perto-vazio" role="status">{P.vazio[motivo]}</p> : null)

/** Liga/desliga as sugestões (escolha da pessoa, guardada só neste aparelho). */
export function InterruptorSugestoes ({ ligadas, aoMudar }) {
  const id = React.useId()
  return (
    <div className="ct-filtros__grupo ct-perto-interruptor">
      <label className="ct-perto-interruptor__linha" htmlFor={id}>
        <input id={id} type="checkbox" checked={ligadas} onChange={(e) => aoMudar(e.target.checked)} aria-describedby={`${id}-ajuda`} />
        <span>{P.interruptor.rotulo}</span>
      </label>
      <p id={`${id}-ajuda`} className="ct-nota">{P.interruptor.ajuda}</p>
    </div>
  )
}
