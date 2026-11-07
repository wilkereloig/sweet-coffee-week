/*
 * Ranking geral da Caça (spec 15 §7): o recorte dos primeiros (só quem optou por aparecer, só apelido e progresso) e,
 * para quem tem mapa, a posição da própria pessoa mesmo fora do recorte. Não espera nem exige o mapa: a lista é pública.
 * Props do contrato das seções: `{ caca, navigate, dados }`. Sem <h1>: a página da Caça tem o dela.
 */
import React from 'react'
import { Link, Carregando, Falha } from '../../componentes/base.jsx'
import { CACA_CAMINHOS } from '../textos.js'
import { ListaRanking } from '../ranking/ListaRanking.jsx'
import { RANKING as T } from '../ranking/textos.js'
import { LIMITE_INICIAL, prepararLinhas, indiceDaPessoa, minhaPosicao, proximoLimite, podeVerMais, textoCasas, textoExtras } from '../ranking/regras.js'

// A RPC omite apelidos que não autorizaram a exibição pública, mas preserva
// suas posições para o ranking não promover outras pessoas. Mantemos os lugares
// sem linha como marcadores anônimos; não copiamos progresso nem qualquer dado.
function incluirLugaresAnonimos (linhas) {
  const validas = prepararLinhas(linhas)
  const porPosicao = new Map()
  let maior = 0
  for (const linha of validas) {
    if (!linha.posicao) continue
    maior = Math.max(maior, linha.posicao)
    porPosicao.set(linha.posicao, [...(porPosicao.get(linha.posicao) || []), linha])
  }
  if (!maior) return validas

  const completas = []
  for (let posicao = 1; posicao <= maior; posicao += 1) {
    const grupo = porPosicao.get(posicao)
    if (grupo) completas.push(...grupo)
    else completas.push({ posicao, apelido: '', casas: 0, extras: 0, oculto: true })
  }
  completas.push(...validas.filter((linha) => !linha.posicao))
  return completas
}

function ComoFunciona () {
  // As regras ficam atrás de um "Como funciona?": a lista vem primeiro. A nota de privacidade fica à vista.
  return (
    <section className="ct-rank__regra" aria-labelledby="rank-regra">
      <details className="ct-central__como">
        <summary><h2 id="rank-regra" className="ct-rank__regra-titulo">{T.regra.titulo}</h2></summary>
        <ul>{T.regra.itens.map((t) => <li key={t}>{t}</li>)}</ul>
      </details>
      <p className="ct-nota">{T.regra.privacidade}</p>
    </section>
  )
}

function MinhaPosicao ({ caca, navigate }) {
  const t = T.minha
  if (caca.estado === 'sem-mapa') {
    return (
      <section className="ct-caca__bloco ct-rank__minha" aria-labelledby="rank-minha">
        <h2 id="rank-minha" className="ct-sub">{t.titulo}</h2>
        <p className="ct-nota">{t.semMapa}</p>
        <div className="ct-acoes"><Link href={CACA_CAMINHOS.central} navigate={navigate} className="ct-botao ct-botao--contorno">{t.criarMapa}</Link></div>
      </section>
    )
  }
  if (caca.estado !== 'pronto') return null // carregando/falha: a lista pública aparece sem esperar o mapa
  const m = minhaPosicao(caca.mapa)
  return (
    <section className="ct-caca__bloco ct-rank__minha" aria-labelledby="rank-minha">
      <h2 id="rank-minha" className="ct-sub">{t.titulo}</h2>
      {m.posicao
        ? <p className="ct-rank__minha-texto"><strong>{t.posicao(m.posicao, m.comEmpate)}</strong> {textoCasas(m.casas)} · {textoExtras(m.extras)}.</p>
        : <p className="ct-nota">{t.semPosicao}</p>}
      {m.posicao && !m.apareceNaLista && <p className="ct-nota">{t.foraDaLista}</p>}
    </section>
  )
}

export default function Ranking ({ caca, navigate }) {
  const { api } = caca
  const [limite, setLimite] = React.useState(LIMITE_INICIAL)
  const [carga, setCarga] = React.useState({ fase: 'carregando', linhas: [], totalPublicas: 0 })
  const [tentativa, setTentativa] = React.useState(0)
  const [buscando, setBuscando] = React.useState(true)

  React.useEffect(() => {
    let vivo = true
    setBuscando(true)
    api.ranking(limite).then((r) => {
      if (!vivo) return
      setBuscando(false)
      if (r.ok) setCarga({ fase: 'pronto', linhas: incluirLugaresAnonimos(r.ranking), totalPublicas: r.ranking.length })
      else setCarga((c) => (c.linhas.length ? c : { fase: 'falha', linhas: [], totalPublicas: 0 })) // "ver mais" que falha não apaga o que já está na tela
    })
    return () => { vivo = false }
  }, [api, limite, tentativa])

  const { fase, linhas, totalPublicas } = carga
  const eu = indiceDaPessoa(linhas, caca.estado === 'pronto' ? caca.mapa : null)

  return (
    <div className="ct-rank__pagina">
      <MinhaPosicao caca={caca} navigate={navigate} />

      <section aria-labelledby="rank-lista" aria-busy={fase === 'carregando'}>
        <h2 id="rank-lista" className="ct-sub">{T.lista.titulo}</h2>
        {fase === 'carregando' && <Carregando texto={T.carregando} />}
        {fase === 'falha' && <Falha titulo={T.falha.titulo} texto={T.falha.texto} tentar={() => { setCarga({ fase: 'carregando', linhas: [], totalPublicas: 0 }); setTentativa((n) => n + 1) }} />}
        {fase === 'pronto' && linhas.length === 0 && (
          <div className="ct-estado--vazio"><p className="ct-sub">{T.vazio.titulo}</p><p className="ct-nota">{T.vazio.texto}</p></div>
        )}
        {fase === 'pronto' && linhas.length > 0 && <ListaRanking linhas={linhas} rotulo={T.lista.titulo} indiceEu={eu} />}
        {fase === 'pronto' && podeVerMais(totalPublicas, limite) && (
          <div className="ct-acoes"><button type="button" className="ct-botao ct-botao--contorno" disabled={buscando} onClick={() => setLimite(proximoLimite)}>{buscando ? T.carregandoMais : T.verMais}</button></div>
        )}
      </section>

      <ComoFunciona />
    </div>
  )
}
