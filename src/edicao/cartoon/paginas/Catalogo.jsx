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
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { kitTemaEdicao } from '../../../data/imageLibrary'
import { Link, Foto, proporcaoDe, Avisos } from '../../componentes/base.jsx'
import { useEnderecoDaBusca } from '../useEnderecoDaBusca.js'
import { TopoCanal } from '../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { Chip, Gibi, Preco } from '../../componentes/sistema/pecas.jsx'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import ScwIcon from '../../../components/scw-icons/ScwIcon.jsx'
import { LogoDesenhada } from '../../componentes/sistema/LogoDesenhada.jsx'
import { QueroIrCasa, JaFui } from '../MarcasLover.jsx'
import { MAPA_NO_AR } from '../contexto.js'
import { CATALOGO as T, FASE_TEXTO, ATENDIMENTO, RESTRICAO, TIPO_ORDEM, ICONE } from '../textos.js'

const CHAVE_POSICAO = 'scw:cartoon:catalogo:posicao'
// [chave do filtro, chave da restrição em M.RESTRICOES]
const FILTROS_RESTRICAO = [['vegano', 'vegano'], ['semAcucar', 'acucar'], ['semGluten', 'gluten'], ['semLactose', 'lactose']]
const VAZIO = { q: '', bairro: '', modo: '', aberto: false, hoje: false, vegano: false, semAcucar: false, semGluten: false, semLactose: false }

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

/** Selos do cartão: atendimento que alguma unidade declarou + restrição declarada no combo inteiro. */
function selosDaCasa (p) {
  const modos = M.MODOS.map(([k]) => k).filter((k) => M.estadoModo(p, k).estado === 'sim').map((k) => ATENDIMENTO[k])
  const restricoes = M.RESTRICOES.map((r) => r.chave).filter((k) => M.veredito(p.combo?.itens, k) === 'sim').map((k) => RESTRICAO[k])
  return [...modos, ...restricoes]
}

function Cartao ({ p, modo, navigate, encerrada }) {
  const base = modo === 'combos' ? 'combos' : 'participantes'
  const us = p.unidades || []
  const bairros = [...new Map(us.map((u) => u.endereco?.bairro).filter(Boolean).map((b) => [M.normalizar(b), b])).values()]
  const itens = [...(p.combo?.itens || [])].sort((a, b) => a.posicao - b.posicao || TIPO_ORDEM.indexOf(a.tipo) - TIPO_ORDEM.indexOf(b.tipo))
  const nomeCombo = p.combo?.nome ? M.caixaLegivel(p.combo.nome) : ''
  const foto = p.combo?.fotos?.principal
  const espia = kitTemaEdicao(p.slug)?.objetoB
  const selos = selosDaCasa(p)
  const nomesItens = itens.map((i) => i.nome).filter(Boolean)
  return (
    <li className={`ct-cartao${espia ? ' ct-cartao--espia' : ''}`}>
      <Link className="ct-cartao__link" href={`${EDICAO.caminho}/${base}/${p.slug}`} navigate={navigate} aoIr={guardarPosicao}>
        <div className="ct-cartao__visual">
          {foto ? <Foto foto={foto} proporcao={proporcaoDe(foto, '4 / 3')} alt="" /> : (
            <div className="ct-cartao__reserva">
              <LogoDesenhada casa={p.casa} alt="" />
              <span className="ct-cartao__aviso">{p.combo ? T.fotoEmProducao : T.comboEmBreve}</span>
            </div>
          )}
        </div>
        {espia && <img className="ct-cartao__espia" src={espia.src} width={espia.largura} height={espia.altura} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
        <div className="ct-cartao__corpo">
          <h2 className="ct-cartao__nome">{modo === 'combos' && nomeCombo ? nomeCombo : p.casa.nome}</h2>
          {modo === 'combos' ? nomeCombo && <p className="ct-cartao__sub">{p.casa.nome}</p> : nomeCombo && <p className="ct-cartao__sub">{nomeCombo}</p>}
          {modo === 'combos' && nomesItens.length > 0 && (
            <ul className="ct-cartao__itens">
              {itens.filter((i) => i.nome).map((i) => <li key={i.posicao}><ScwIcon nome={ICONE.tipo[i.tipo]} tamanho={16} /><span>{M.caixaLegivel(i.nome)}</span></li>)}
            </ul>
          )}
          {p.casa.tema && <p className="ct-cartao__tema">{T.tema(p.casa.tema)}</p>}
          {(bairros.length > 0 || us.length > 1) && (
            <p className="ct-cartao__onde">{[bairros.join(' · '), us.length > 1 ? T.unidades(us.length) : null].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        {selos.length > 0 && (
          <ul className="ct-selos ct-cartao__selos">
            {selos.map((s) => <li key={s.icone} className="ct-selo"><IconeCartoon nome={s.icone} tamanho={32} /><span>{s.rotulo}</span></li>)}
          </ul>
        )}
      </Link>
      {!encerrada && MAPA_NO_AR && (p.unidades || []).length > 0 && (
        <div className="ct-cartao__marcas">
          <QueroIrCasa p={p} navigate={navigate} />
          <JaFui p={p} />
        </div>
      )}
    </li>
  )
}

export function Catalogo ({ modo, navigate, dados }) {
  const lista = dados.participantes || []
  // "Aberto agora" é filtro do Mapa; no catálogo vale "com combo hoje".
  const [f, setF] = React.useState(() => ({ ...VAZIO, ...M.filtrosDaBusca(location.search), aberto: false }))
  const [painel, setPainel] = React.useState(false)
  const opcoes = React.useMemo(() => M.opcoesFiltro(lista, dados.edicao), [lista, dados.edicao])
  const filtrados = React.useMemo(() => M.filtrar(lista, f), [lista, f])
  const ativos = [f.bairro, f.modo, f.hoje, f.vegano, f.semAcucar, f.semGluten, f.semLactose].filter(Boolean).length
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
              : <p className="ct-contagem">{lista.length} {combos ? T.placaCombos(lista.length) : T.placa(lista.length)}</p>}
            <p className="ct-lead">{combos ? T.leadCombos(lista.length) : T.lead}</p>
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
                <p className="ct-nota">{T.declarado}</p>
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
            {filtrados.map((p) => <Cartao key={p.slug} p={p} modo={modo} navigate={navigate} encerrada={dados.fase === 'encerrada'} />)}
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
