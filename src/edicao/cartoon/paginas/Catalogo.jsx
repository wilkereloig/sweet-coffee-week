/*
 * Catálogo (§5.2; docs/cartoon-2026-2/10 §10.7): /cartoon/participantes (a casa à frente) e
 * /cartoon/combos (o combo à frente). Mesma coleção, mesmos filtros, mesma página de destino.
 * Topo amarelo com retícula (repaginação de 04/11, §10.17): o letreiro, o preço em letreiro (combos) ou a contagem
 * real (casas) e o objeto desenhado do assunto; o cartão tem a foto do combo
 * como protagonista e, sem foto, a logo desenhada no Quadro ("Foto em produção").
 * Filtros moram na query string (useEnderecoDaBusca) e só aparecem os que o dado responde; a posição
 * de rolagem volta quando o visitante retorna de uma casa. "Quero ir" e "Já fui" ficam abaixo do cartão,
 * fora do link (área própria, nunca botão dentro de link).
 */
import { AssinaturaPatrocinio } from '../../componentes/sistema/AssinaturaPatrocinio.jsx'
import React from 'react'
import * as M from '../../dados/modelo.js'
import { Avisos } from '../../componentes/base.jsx'
import { useEnderecoDaBusca } from '../useEnderecoDaBusca.js'
import { TopoCanal } from '../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { Chip, Gibi, Preco } from '../../componentes/sistema/pecas.jsx'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { useAgora } from '../useAgora.js'
import { CATALOGO as T, FASE_TEXTO, ATENDIMENTO, RESTRICAO } from '../textos.js'
import { CartaoCombo } from '../CartaoCombo.jsx'

const CHAVE_POSICAO = 'scw:cartoon:catalogo:posicao'
// [chave do filtro, chave da restrição em M.RESTRICOES]
const FILTROS_RESTRICAO = [['vegetariano', 'vegetariano'], ['vegano', 'vegano'], ['semAcucar', 'acucar'], ['semGluten', 'gluten'], ['semLactose', 'lactose']]
const VAZIO = { q: '', bairro: '', modo: '', aberto: false, hoje: false, vegano: false, vegetariano: false, semAcucar: false, semGluten: false, semLactose: false }

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

export function Catalogo ({ modo, navigate, dados }) {
  const lista = dados.participantes || []
  // Casa só com marca (combo ainda não revelado) fica na lista, mas não entra na contagem de combos.
  const nCombos = lista.filter((p) => p.combo).length
  // "Aberto agora" é filtro do Mapa; no catálogo vale "com combo hoje".
  const [f, setF] = React.useState(() => ({ ...VAZIO, ...M.filtrosDaBusca(location.search), aberto: false }))
  const [painel, setPainel] = React.useState(false)
  const opcoes = React.useMemo(() => M.opcoesFiltro(lista, dados.edicao), [lista, dados.edicao])
  const agora = useAgora() // "Com combo hoje" acompanha o relógio: a lista aberta a noite toda não congela o horário
  const filtrados = React.useMemo(() => M.filtrar(lista, f, agora), [lista, f, agora])
  const ativos = [f.bairro, f.modo, f.hoje, f.vegano, f.vegetariano, f.semAcucar, f.semGluten, f.semLactose].filter(Boolean).length
  const restricoes = FILTROS_RESTRICAO.filter(([k]) => opcoes[k])
  const combos = modo === 'combos'
  // O preço é o da edição (o mesmo em todas as casas): no topo dos combos, o preço em letreiro "Combo R$ …".
  const preco = M.precoGeral(lista)
  const precoTexto = combos && preco ? M.formatarPreco(preco) : null
  const titulo = <Letreiro nivel={1} id="cat-titulo" texto={combos ? T.tituloCombos : T.titulo} />

  React.useEffect(() => { restaurarPosicao() }, [])
  useEnderecoDaBusca(M.buscaDosFiltros(f)) // os filtros entram no endereço; ?preview e ?demo continuam

  const muda = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const limpar = () => setF(VAZIO)
  const avisos = (
    <>
      <Avisos desatualizado={dados.desatualizado} demo={dados.demo} retrato={dados.retrato} />
    </>
  )

  if (!dados.participantes_publicos || !lista.length) {
    return (
      <>
        {avisos}
        <TopoCanal canal="estreia" className="ct-catalogo__topo ct-reticula" aria-labelledby="cat-titulo">
          <div className="ct-catalogo__chamada">{titulo}<p className="ct-lead">{FASE_TEXTO.semElenco}</p></div>
        </TopoCanal>
      </>
    )
  }

  return (
    <div className="ct-catalogo">
      {avisos}
      <TopoCanal canal="estreia" className="ct-catalogo__topo ct-reticula" aria-labelledby="cat-titulo">
        <div className="ct-catalogo__chamada">
          {titulo}
          <div className="ct-catalogo__dados">
            {precoTexto
              ? <Preco rotulo={T.precoRotulo} valor={precoTexto} />
              : <p className="ct-contagem">{combos ? nCombos : lista.length} {combos ? T.placaCombos(nCombos) : T.placa(lista.length)}</p>}
            <p className="ct-lead">{combos ? T.leadCombos(nCombos) : T.lead}</p>
          </div>
        </div>
        <div className="ct-catalogo__cena" aria-hidden="true">
          <span className="ct-explosao ct-catalogo__explosao" />
          <Gibi chave={combos ? 'bandeja' : 'loja'} className="ct-catalogo__desenho" prioridade />
        </div>
      </TopoCanal>
      <AssinaturaPatrocinio />

      <section className="ct-bloco ct-catalogo__corpo">
        <div className="ct-filtros ct-filtros--catalogo">
          <label className="ct-campo ct-campo--busca">
            <span className="ct-sr">{T.busca}</span>
            <input type="search" value={f.q} placeholder={T.busca} onChange={(e) => muda('q', e.target.value)} />
          </label>
          {/* Venda (11/11): o filtro de delivery fica à vista, fora do painel de filtros. */}
          {opcoes.modos.includes('delivery') && dados.combos_publicos && (
            <Chip className="ct-filtros__rapido" ativo={f.modo === 'delivery'} icone={ATENDIMENTO.delivery.icone} onClick={() => muda('modo', f.modo === 'delivery' ? '' : 'delivery')}>{ATENDIMENTO.delivery.rotulo}</Chip>
          )}
          <button type="button" className="ct-botao ct-botao--contorno ct-filtros__abrir" aria-expanded={painel} aria-controls="cat-filtros" onClick={() => setPainel(!painel)}>
            {T.filtros}{ativos ? ` (${ativos})` : ''}
          </button>
          <div id="cat-filtros" className={`ct-filtros__painel${painel ? ' is-aberto' : ''}`}>
            {opcoes.bairros.length > 1 && (
              <label className="ct-campo ct-filtros__grupo">
                <span className="ct-rotulo">{T.bairro}</span>
                <select value={f.bairro} onChange={(e) => muda('bairro', e.target.value)}>
                  <option value="">{T.todos}</option>
                  {opcoes.bairros.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
            )}
            {opcoes.modos.length > 0 && dados.combos_publicos && (
              <fieldset className="ct-filtros__grupo">
                <legend className="ct-rotulo">{T.comoPedir}</legend>
                <div className="ct-chips">
                  {opcoes.modos.map((k) => (
                    <Chip key={k} ativo={f.modo === k} icone={ATENDIMENTO[k].icone} onClick={() => muda('modo', f.modo === k ? '' : k)}>{ATENDIMENTO[k].rotulo}</Chip>
                  ))}
                </div>
              </fieldset>
            )}
            {opcoes.hoje && dados.combos_publicos && dados.fase === 'em_andamento' && (
              <fieldset className="ct-filtros__grupo">
                <legend className="ct-rotulo">{T.quando}</legend>
                <div className="ct-chips"><Chip ativo={f.hoje} icone="aberto-agora" onClick={() => muda('hoje', !f.hoje)}>{T.hoje}</Chip></div>
              </fieldset>
            )}
            {restricoes.length > 0 && (
              <fieldset className="ct-filtros__grupo">
                <legend className="ct-rotulo">{T.restricoes}</legend>
                <div className="ct-chips">
                  {restricoes.map(([k, chave]) => (
                    <Chip key={k} ativo={f[k]} icone={RESTRICAO[chave].icone} onClick={() => muda(k, !f[k])}>{RESTRICAO[chave].rotulo}</Chip>
                  ))}
                </div>
                {restricoes.some(([k]) => k !== 'vegetariano') && <p className="ct-nota">{T.declarado}</p>}
                {opcoes.vegetariano && <p className="ct-nota">{T.declaradoVegetariano}</p>}
              </fieldset>
            )}
          </div>
        </div>

        <div className="ct-catalogo__resumo">
          <p className="ct-catalogo__conta" aria-live="polite">{combos ? T.contagemCombos(filtrados.length, lista.length) : T.contagem(filtrados.length, lista.length)}</p>
          {(ativos > 0 || f.q) && <button type="button" className="ct-link" onClick={limpar}>{T.limpar}</button>}
        </div>

        {filtrados.length ? (
          <ul className={`ct-elenco ct-elenco--${modo}`}>
            {filtrados.map((p) => <CartaoCombo key={p.slug} p={p} modo={modo} navigate={navigate} encerrada={dados.fase === 'encerrada'} aoIr={guardarPosicao} />)}
          </ul>
        ) : (
          <div className="ct-estado ct-estado--vazio">
            <IconeCartoon nome="vazio" tamanho={64} />
            <p>{T.nenhum(f.q)}</p>
            <button type="button" className="ct-botao" onClick={limpar}>{T.verTodas}</button>
          </div>
        )}
      </section>
    </div>
  )
}
