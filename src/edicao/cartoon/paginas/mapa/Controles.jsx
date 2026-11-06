/*
 * Controles da página do mapa compacta (redesign de 06/11/2026): a barra (vistas · busca · Filtros) e o corpo da folha de
 * filtros. Só o essencial fica à vista — as três vistas, a busca e UM botão "Filtros" com o contador de ativos; bairro,
 * como pedir, "aberto agora", "quero ir", "já fui", "meu progresso" e "perto de mim" moram na folha.
 * Na tela cheia a busca também vai para a folha (a barra fica numa linha só: Fechar · vistas · Filtros).
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import * as M from '../../../dados/modelo.js'
import { Chip } from '../../../componentes/sistema/pecas.jsx'
import { MAPA as T, LOVER, ATENDIMENTO } from '../../textos.js'
import { MAPA_CACA as TC } from '../../../caca/mapa/textos.js'

const ESTADOS_FILTRO = ['pendente', 'nao-visitada', 'conquistada']

export const Busca = ({ q, aoBuscar }) => (
  <label className="ct-campo ct-campo--busca ct-mapa__busca"><span className="ct-sr">{T.busca}</span>
    <input type="search" value={q} placeholder={TC.buscaCurta} onChange={(e) => aoBuscar(e.target.value)} enterKeyHint="search" />
  </label>
)

export function BarraDoMapa ({ vistas, vista, aoVista, q, aoBuscar, filtros, aoFiltros, cheia, aoFechar, filtrosAbertos, botaoRota = null, botaoPerto = null }) {
  return (
    <div className="ct-mapa__barra">
      {cheia && (
        <button type="button" className="ct-mapa__sair" data-fechar-cheia onClick={aoFechar} aria-label={TC.telaCheiaFechar}>
          <ScwIcon nome="fechar" tamanho={20} /><span>{TC.telaCheiaFecharCurto}</span>
        </button>
      )}
      <div className="ct-chips ct-mapa__vistas" role="group" aria-label={T.vistas}>
        {vistas.filter((v) => !cheia || v !== 'lista').map((v) => (
          <Chip key={v} ativo={vista === v} onClick={() => aoVista(v)}>
            {v === 'mundo' ? <><span className="ct-mapa__so-largo">{TC.vistaMundoOculto}</span>{TC.vistaMundoVisivel}</> : T.vista[v]}
          </Chip>
        ))}
      </div>
      {!cheia && <Busca q={q} aoBuscar={aoBuscar} />}
      {botaoPerto}
      <button type="button" className={`ct-chip ct-mapa__filtros-botao${filtros > 0 ? ' is-ativo' : ''}`} onClick={aoFiltros}
        aria-haspopup="dialog" aria-expanded={filtrosAbertos} aria-label={filtros > 0 ? `${TC.filtros}, ${TC.filtrosAtivos(filtros)}` : TC.filtros}>
        <ScwIcon nome="configuracoes" tamanho={20} /><span>{TC.filtros}</span>
        {filtros > 0 && <b className="ct-mapa__filtros-conta" aria-hidden="true">{filtros}</b>}
      </button>
      {botaoRota}
    </div>
  )
}

export function CorpoDosFiltros ({ f, muda, opcoes, bairroOpcao, temEstado, hoje, comBusca, aoBuscar, total, ativos, aoLimpar, aoAplicar }) {
  return (
    <div className="ct-mapa__filtros">
      {comBusca && <Busca q={f.q} aoBuscar={aoBuscar} />}
      {opcoes.bairros.length > 1 && (
        <label className="ct-campo ct-filtros__grupo">
          <span className="ct-rotulo">{T.bairro}</span>
          <select value={bairroOpcao} onChange={(e) => muda('bairro', e.target.value)}>
            <option value="">{T.todos}</option>
            {opcoes.bairros.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      )}
      <fieldset className="ct-filtros__grupo">
        <legend className="ct-rotulo">{T.comoPedir}</legend>
        <div className="ct-chips">
          {M.MODOS.map(([k]) => (
            <Chip key={k} ativo={f.modo === k} icone={ATENDIMENTO[k].icone} onClick={() => muda('modo', f.modo === k ? '' : k)}>{ATENDIMENTO[k].rotulo}</Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="ct-filtros__grupo">
        <legend className="ct-rotulo">{T.mostrar}</legend>
        <div className="ct-chips">
          {hoje && <Chip ativo={f.aberto} icone="aberto-agora" onClick={() => muda('aberto', !f.aberto)}>{T.aberto}</Chip>}
          <Chip ativo={f.queroIr} icone="quero-ir" onClick={() => muda('queroIr', !f.queroIr)}>{LOVER.queroIr}</Chip>
          <Chip ativo={f.jaFui} icone="ja-fui" onClick={() => muda('jaFui', !f.jaFui)}>{LOVER.jaFui}</Chip>
        </div>
      </fieldset>
      {temEstado && (
        <fieldset className="ct-filtros__grupo">
          <legend className="ct-rotulo">{TC.filtroEstado}</legend>
          <div className="ct-chips">
            {ESTADOS_FILTRO.map((k) => <Chip key={k} ativo={f.estado === k} onClick={() => muda('estado', f.estado === k ? '' : k)}>{TC.filtroEstados[k]}</Chip>)}
          </div>
        </fieldset>
      )}
      <div className="ct-folha-m__rodape">
        {ativos > 0 && <button type="button" className="ct-link" onClick={aoLimpar}>{TC.filtrosLimpar}</button>}
        <button type="button" className="ct-botao ct-folha-m__aplicar" onClick={aoAplicar}>{TC.filtrosVer(total)}</button>
      </div>
    </div>
  )
}
