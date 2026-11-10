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
import { usarAoVivo, quandoAtualizou } from '../ranking/aoVivo.js'
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

  const [ritmo, setRitmo] = React.useState(null) // { horas, ritmo[] }: indicador complementar; falhou ou veio vazio = não aparece
  const [atualizado, setAtualizado] = React.useState(0) // instante da última resposta boa
  const [velho, setVelho] = React.useState(false) // a última releitura falhou: o que está na tela é o ranking anterior
  const [, setTique] = React.useState(0) // só para o "há N min" andar

  React.useEffect(() => {
    let vivo = true
    setBuscando(true)
    api.ranking(limite).then((r) => {
      if (!vivo) return
      setBuscando(false)
      setVelho(!r.ok)
      if (r.ok) { setCarga({ fase: 'pronto', linhas: incluirLugaresAnonimos(r.ranking), totalPublicas: r.ranking.length }); setAtualizado(Date.now()) }
      else setCarga((c) => (c.linhas.length ? c : { fase: 'falha', linhas: [], totalPublicas: 0 })) // releitura que falha não apaga o que já está na tela
    })
    api.ritmo().then((r) => { if (vivo && r.ok) setRitmo(r) })
    return () => { vivo = false }
  }, [api, limite, tentativa])

  // Durante o uso: relê o ranking e o mapa da pessoa (a posição dela) a cada minuto com a aba à vista, e ao voltar à aba ou à internet.
  const reler = () => { setTentativa((n) => n + 1); caca.atualizar?.() }
  usarAoVivo(() => { if (carga.fase === 'pronto') reler(); setTique((n) => n + 1) })

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
        {fase === 'pronto' && (
          <p className="ct-nota ct-rank__ao-vivo">
            <span role="status">{velho ? T.semRede : T.atualizado(quandoAtualizou(atualizado))}</span>{' '}
            <button type="button" className="ct-link" data-rank-atualizar disabled={buscando} onClick={reler}>{buscando ? T.atualizando : T.atualizar}</button>
          </p>
        )}
        {fase === 'pronto' && podeVerMais(totalPublicas, limite) && (
          <div className="ct-acoes"><button type="button" className="ct-botao ct-botao--contorno" disabled={buscando} onClick={() => setLimite(proximoLimite)}>{buscando ? T.carregandoMais : T.verMais}</button></div>
        )}
      </section>

      {ritmo?.ritmo?.length > 0 && (
        <section className="ct-caca__bloco ct-rank__ritmo" aria-labelledby="rank-ritmo">
          <h2 id="rank-ritmo" className="ct-sub">{T.ritmo.titulo(ritmo.horas)}</h2>
          <ol className="ct-rank__ritmo-lista">
            {ritmo.ritmo.map((p, i) => (
              <li key={`${p.apelido}-${i}`}><strong>{p.apelido}</strong><span>{[p.casas_novas > 0 && T.ritmo.casas(p.casas_novas), p.extras_novos > 0 && T.ritmo.extras(p.extras_novos)].filter(Boolean).join(' · ')}</span></li>
            ))}
          </ol>
          <p className="ct-nota">{T.ritmo.nota}</p>
        </section>
      )}

      <ComoFunciona />
    </div>
  )
}
