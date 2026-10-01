import React from 'react'
import { Icone } from './Icone'
import { Folha } from './Folha'

/*
 * Barra de abas do celular (≤900px) dos dois painéis: no máximo quatro
 * atalhos + "Mais". Oito destinos espremidos em 390px davam células de ~48px
 * com rótulo cortado. As outras áreas continuam a um toque, numa folha
 * (Folha.jsx: Esc fecha, o foco fica preso nela e volta ao botão "Mais", e
 * sem animação com prefers-reduced-motion). Quem decide QUAIS áreas existem
 * continua sendo a casca (permissões) — aqui só se decide onde aparecem.
 */
const ICONE_MAIS = <Icone nome="grade" tamanho={22} />

export function AbasCelular({ atalhos, mais, vista, rotulo, titulo, descricao, icone, acento, contadores = {}, onIr }) {
  const [aberta, setAberta] = React.useState(false)
  const naMais = mais.includes(vista)
  const celulas = atalhos.length + (mais.length ? 1 : 0)
  const posicao = naMais ? atalhos.length : atalhos.indexOf(vista)
  const nMais = mais.reduce((n, d) => n + (contadores[d] || 0), 0)

  function ir(d) { setAberta(false); onIr(d) }

  return (
    <>
      <nav className="og-abasapp" aria-label="Seções do painel" data-tour="menu">
        <div className="og-abasapp__grade" style={{ '--og-i': posicao, '--og-cols': celulas }}>
          {posicao >= 0 && <span className="og-abasapp__indicador" aria-hidden="true" />}
          {atalhos.map((d) => (
            <button
              key={d}
              className={'og-abaapp' + (d === vista ? ' is-ativa' : '')}
              type="button"
              data-tour={'menu-' + d}
              aria-current={d === vista ? 'page' : undefined}
              aria-label={contadores[d] ? titulo(d) + ' (' + contadores[d] + ' não lidas)' : undefined}
              onClick={() => ir(d)}
            >
              <span className="og-abaapp__icone">
                {icone(d)}
                {contadores[d] > 0 && <span className="pn-badge" aria-hidden="true">{contadores[d]}</span>}
              </span>
              <span className="og-abaapp__rotulo">{rotulo(d)}</span>
            </button>
          ))}
          {mais.length > 0 && (
            <button
              className={'og-abaapp' + (naMais ? ' is-ativa' : '')}
              type="button"
              data-tour="menu-mais"
              aria-haspopup="dialog"
              aria-expanded={aberta}
              aria-label={'Mais áreas' + (naMais ? ' — aberta: ' + titulo(vista) : '') + (nMais ? ' (' + nMais + ' não lidas)' : '')}
              onClick={() => setAberta(true)}
            >
              <span className="og-abaapp__icone">
                {ICONE_MAIS}
                {nMais > 0 && <span className="pn-badge" aria-hidden="true">{nMais}</span>}
              </span>
              <span className="og-abaapp__rotulo">mais</span>
            </button>
          )}
        </div>
      </nav>

      <Folha aberto={aberta} titulo="Mais áreas" sub="As outras partes do painel." onFechar={() => setAberta(false)}>
        <ul className="ui-mais">
          {mais.map((d) => (
            <li key={d}>
              <button
                type="button"
                className="ui-mais__item"
                data-acento={acento(d)}
                aria-current={d === vista ? 'page' : undefined}
                onClick={() => ir(d)}
              >
                <span className="pn-acento-disco" aria-hidden="true">{icone(d)}</span>
                <span className="ui-mais__texto">
                  <span className="ui-mais__nome">{titulo(d)}</span>
                  <span className="ui-mais__nota">{descricao(d)}</span>
                </span>
                {contadores[d] > 0 && <span className="pn-badge" aria-label={contadores[d] + ' não lidas'}>{contadores[d]}</span>}
                {d === vista
                  ? <span className="ui-mais__estado">aberta</span>
                  : <span className="ui-mais__ir" aria-hidden="true">›</span>}
              </button>
            </li>
          ))}
        </ul>
      </Folha>
    </>
  )
}
