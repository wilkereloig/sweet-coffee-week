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
const ICONE_MAIS = <Icone nome="mais-acoes" tamanho={24} />

/*
 * Escolher os atalhos (18/10/2026): com `todos` + `onEscolher`, a folha "Mais"
 * ganha "Escolher os atalhos da barra" — marca até `max` áreas, na ordem do
 * menu. Sem esses props (painel da marca), a barra continua fixa.
 */
function EscolherAtalhos({ todos, atuais, max, titulo, icone, acento, onSalvar, onPadrao, onVoltar }) {
  const [marcados, setMarcados] = React.useState(atuais)
  const cheio = marcados.length >= max
  const alternar = (d) => setMarcados((m) => (m.includes(d) ? m.filter((x) => x !== d) : m.length >= max ? m : [...m, d]))
  return (
    <form className="ui-escolher-atalhos" onSubmit={(e) => { e.preventDefault(); onSalvar(todos.filter((d) => marcados.includes(d))) }}>
      <p className="ui-nota" aria-live="polite">Marque até {max} áreas para ficarem na barra. As outras continuam em “Mais”. {marcados.length} de {max} escolhidas.</p>
      <ul className="ui-mais">
        {todos.map((d) => {
          const on = marcados.includes(d)
          return (
            <li key={d}>
              <label className="ui-mais__item ui-mais__item--escolha" data-acento={acento(d)}>
                <input type="checkbox" checked={on} disabled={!on && cheio} onChange={() => alternar(d)} />
                <span className="pn-acento-disco" aria-hidden="true">{icone(d)}</span>
                <span className="ui-mais__texto"><span className="ui-mais__nome">{titulo(d)}</span></span>
              </label>
            </li>
          )
        })}
      </ul>
      <div className="ui-acoes">
        <button type="submit" className="og-btn og-btn--amarelo" disabled={!marcados.length}>Salvar a barra</button>
        <button type="button" className="og-btn og-btn--vazado" onClick={onPadrao}>Usar o padrão</button>
        <button type="button" className="og-btn og-btn--vazado" onClick={onVoltar}>Cancelar</button>
      </div>
    </form>
  )
}

export function AbasCelular({ atalhos, mais, vista, rotulo, titulo, descricao, icone, acento, contadores = {}, onIr, todos = null, onEscolher = null, max = 4 }) {
  const [aberta, setAberta] = React.useState(false)
  const [escolhendo, setEscolhendo] = React.useState(false)
  const podeEscolher = !!(todos && onEscolher && todos.length > 1)
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

      <Folha aberto={aberta} titulo={escolhendo ? 'Atalhos da barra' : 'Mais áreas'}
        sub={escolhendo ? 'Escolha o que fica a um toque, embaixo.' : 'As outras partes do painel.'}
        onFechar={() => { setAberta(false); setEscolhendo(false) }}>
        {escolhendo ? (
          <EscolherAtalhos todos={todos} atuais={atalhos} max={max} titulo={titulo} icone={icone} acento={acento}
            onSalvar={(l) => { onEscolher(l); setEscolhendo(false) }} onPadrao={() => { onEscolher(null); setEscolhendo(false) }}
            onVoltar={() => setEscolhendo(false)} />
        ) : (<>
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
                  : <Icone nome="avancar" tamanho={16} className="ui-mais__ir" />}
              </button>
            </li>
          ))}
        </ul>
        {podeEscolher && (
          <div className="ui-acoes ui-mais__editar">
            <button type="button" className="og-btn og-btn--vazado" onClick={() => setEscolhendo(true)}>
              <Icone nome="editar" tamanho={16} />Escolher os atalhos da barra
            </button>
          </div>
        )}
        </>)}
      </Folha>
    </>
  )
}
