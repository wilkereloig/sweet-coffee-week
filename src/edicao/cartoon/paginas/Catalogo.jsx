/*
 * Catálogo (§5.2): /cartoon/participantes (logo e nome à frente) e
 * /cartoon/combos (foto e composição à frente). Mesma coleção, mesmos filtros,
 * mesma página de destino. Filtros moram na query string (replaceState);
 * a posição de rolagem volta quando o visitante retorna de uma casa.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { Link, Foto, Logo, AvisoDesatualizado, AvisoDemo } from '../../componentes/base.jsx'
import { CATALOGO as T, FASE_TEXTO } from '../textos.js'

const CHAVE_POSICAO = 'scw:cartoon:catalogo:posicao'

function guardarPosicao () {
  try { sessionStorage.setItem(CHAVE_POSICAO, JSON.stringify({ url: location.pathname + location.search, y: scrollY })) } catch { /* sem storage */ }
}
function restaurarPosicao () {
  try {
    const v = JSON.parse(sessionStorage.getItem(CHAVE_POSICAO) || 'null')
    sessionStorage.removeItem(CHAVE_POSICAO)
    if (v && v.url === location.pathname + location.search) {
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, v.y)))
    }
  } catch { /* sem storage */ }
}

function Cartao ({ p, modo, navigate }) {
  const base = modo === 'combos' ? 'combos' : 'participantes'
  const us = p.unidades || []
  const bairros = [...new Set(us.map((u) => u.endereco?.bairro).filter(Boolean))]
  const modos = M.modosDoParticipante(p)
  const disponiveis = M.MODOS.filter(([k]) => modos[k].length).map(([, r]) => r)
  const itens = [...(p.combo?.itens || [])].sort((a, b) => a.posicao - b.posicao)
  return (
    <li className="ct-cartao">
      <Link className="ct-cartao__link" href={`${EDICAO.caminho}/${base}/${p.slug}`} navigate={navigate} aoIr={guardarPosicao}>
        {p.combo
          ? <Foto foto={p.combo.fotos?.principal} proporcao={modo === 'combos' ? '4 / 3' : '1 / 1'} reserva="Foto do combo em produção" />
          : <div className="ct-foto ct-foto--reserva" style={{ '--ct-proporcao': modo === 'combos' ? '4 / 3' : '1 / 1' }}><span>{T.comboEmBreve}</span></div>}
        <div className="ct-cartao__corpo">
          <div className="ct-cartao__casa">
            <Logo casa={p.casa} tamanho={modo === 'combos' ? 36 : 48} />
            <h2 className="ct-cartao__nome">{modo === 'combos' && p.combo?.nome ? p.combo.nome : p.casa.nome}</h2>
          </div>
          {modo === 'combos' && <p className="ct-cartao__sub">{p.casa.nome}</p>}
          {modo === 'combos' && itens.length > 0 && <p className="ct-cartao__sub">{itens.map((i) => i.nome).join(' · ')}</p>}
          <p className="ct-cartao__meta">
            {[bairros.join(', '), us.length > 1 ? `${us.length} unidades` : null].filter(Boolean).join(' · ')}
          </p>
          {disponiveis.length > 0 && <p className="ct-cartao__meta">{disponiveis.join(' · ')}</p>}
        </div>
      </Link>
    </li>
  )
}

export function Catalogo ({ modo, navigate, dados }) {
  const lista = dados.participantes || []
  const [f, setF] = React.useState(() => M.filtrosDaBusca(location.search))
  const [painel, setPainel] = React.useState(false)
  const opcoes = React.useMemo(() => M.opcoesFiltro(lista), [lista])
  const filtrados = React.useMemo(() => M.filtrar(lista, f), [lista, f])
  const ativos = [f.bairro, f.modo, f.aberto, f.semGluten, f.semLactose].filter(Boolean).length

  React.useEffect(() => { restaurarPosicao() }, [])
  React.useEffect(() => {
    // Os filtros entram no endereço; ?preview e ?demo (revisão) continuam.
    const q = new URLSearchParams(M.buscaDosFiltros(f))
    const atual = new URLSearchParams(location.search)
    for (const k of ['preview', 'demo']) if (atual.has(k)) q.set(k, atual.get(k))
    const s = q.toString()
    history.replaceState(history.state, '', location.pathname + (s ? `?${s}` : ''))
  }, [f])

  const muda = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const limpar = () => setF({ q: '', bairro: '', modo: '', aberto: false, semGluten: false, semLactose: false })

  if (!dados.participantes_publicos || !lista.length) {
    return (
      <section className="ct-bloco">
        <h1 className="ct-h1">{modo === 'combos' ? T.tituloCombos : T.titulo}</h1>
        <p className="ct-lead">{FASE_TEXTO.semElenco}</p>
      </section>
    )
  }

  const filtros = (
    <div className="ct-filtros__campos">
      {opcoes.bairros.length > 1 && (
        <label className="ct-campo">
          <span>{T.bairro}</span>
          <select value={f.bairro} onChange={(e) => muda('bairro', e.target.value)}>
            <option value="">{T.todos}</option>
            {opcoes.bairros.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      )}
      {opcoes.modos.length > 0 && dados.combos_publicos && (
        <fieldset className="ct-chips">
          <legend className="ct-sr">Como pedir</legend>
          {M.MODOS.filter(([k]) => opcoes.modos.includes(k)).map(([k, r]) => (
            <button key={k} type="button" className="ct-chip" aria-pressed={f.modo === k} onClick={() => muda('modo', f.modo === k ? '' : k)}>{r}</button>
          ))}
        </fieldset>
      )}
      {dados.fase === 'em_andamento' && dados.combos_publicos && (
        <label className="ct-check"><input type="checkbox" checked={f.aberto} onChange={(e) => muda('aberto', e.target.checked)} /> {T.aberto}</label>
      )}
      {opcoes.semGluten && <label className="ct-check"><input type="checkbox" checked={f.semGluten} onChange={(e) => muda('semGluten', e.target.checked)} /> {T.semGluten}</label>}
      {opcoes.semLactose && <label className="ct-check"><input type="checkbox" checked={f.semLactose} onChange={(e) => muda('semLactose', e.target.checked)} /> {T.semLactose}</label>}
      {(opcoes.semGluten || opcoes.semLactose) && <p className="ct-nota">{T.declarado}</p>}
    </div>
  )

  return (
    <section className="ct-bloco ct-catalogo" aria-labelledby="cat-titulo">
      <AvisoDesatualizado ativo={dados.desatualizado} />
      <AvisoDemo ativo={dados.demo} />
      <div className="ct-catalogo__cabeca">
        <h1 id="cat-titulo" className="ct-h1">{modo === 'combos' ? T.tituloCombos : T.titulo}</h1>
        <p className="ct-catalogo__conta" aria-live="polite">{T.contagem(filtrados.length)}</p>
      </div>
      <div className="ct-filtros">
        <label className="ct-campo ct-campo--busca">
          <span className="ct-sr">{T.busca}</span>
          <input type="search" value={f.q} placeholder={T.busca} onChange={(e) => muda('q', e.target.value)} />
        </label>
        <button type="button" className="ct-botao ct-botao--contorno ct-filtros__abrir" aria-expanded={painel} onClick={() => setPainel(!painel)}>
          {T.filtros}{ativos ? ` (${ativos})` : ''}
        </button>
        <div className={`ct-filtros__painel${painel ? ' is-aberto' : ''}`}>{filtros}</div>
        {(ativos > 0 || f.q) && <button type="button" className="ct-link" onClick={limpar}>{T.limpar}</button>}
      </div>
      {filtrados.length ? (
        <ul className={`ct-grade ct-grade--${modo}`}>
          {filtrados.map((p) => <Cartao key={p.slug} p={p} modo={modo} navigate={navigate} />)}
        </ul>
      ) : (
        <div className="ct-estado">
          <p>{T.nenhum(f.q)}</p>
          <button type="button" className="ct-botao" onClick={limpar}>{T.verTodas}</button>
        </div>
      )}
    </section>
  )
}
