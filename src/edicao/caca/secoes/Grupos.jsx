/*
 * Seus grupos (spec 15 §8): criar um grupo (nome + aviso de visibilidade com aceite), receber o link de convite no
 * momento da criação e abrir os grupos de que a pessoa faz parte. A página já garante que há mapa.
 * Props do contrato das seções: `{ caca, navigate, dados }`. Sem <h1>.
 */
import React from 'react'
import { Link, Carregando, Falha } from '../../componentes/base.jsx'
import { CACA_CAMINHOS } from '../textos.js'
import { GRUPOS } from '../grupos/textos.js'
import { resumoDoGrupo } from '../grupos/regras.js'
import { CriarGrupo } from '../grupos/CriarGrupo.jsx'
import { CompartilharConvite } from '../grupos/CompartilharConvite.jsx'

const L = GRUPOS.lista
const C = GRUPOS.criar

function GrupoCriado ({ criado, navigate, aoOutro }) {
  const titulo = React.useRef(null)
  React.useEffect(() => { titulo.current?.focus() }, [])
  return (
    <section className="ct-caca__bloco ct-grupos__criado" aria-labelledby="grupo-criado">
      <h2 id="grupo-criado" className="ct-sub" tabIndex={-1} ref={titulo}>{C.pronto(criado.nome)}</h2>
      <CompartilharConvite token={criado.token} nomeGrupo={criado.nome} expiraEm={criado.expiraEm} />
      <div className="ct-acoes">
        <Link href={CACA_CAMINHOS.grupo(criado.id)} navigate={navigate} className="ct-botao">{C.abrir}</Link>
        <button type="button" className="ct-botao ct-botao--contorno" onClick={aoOutro}>{C.outro}</button>
      </div>
    </section>
  )
}

function Lista ({ carga, navigate, tentar }) {
  if (carga.fase === 'carregando') return <Carregando texto={L.carregando} />
  if (carga.fase === 'falha') return <Falha titulo={L.falha.titulo} texto={L.falha.texto} tentar={tentar} />
  if (carga.grupos.length === 0) return <div className="ct-estado--vazio"><p className="ct-sub">{L.vazio.titulo}</p><p className="ct-nota">{L.vazio.texto}</p></div>
  return (
    <ul className="ct-grupos__lista">
      {carga.grupos.map((g) => (
        <li key={g.id} className="ct-grupos__cartao">
          <p className="ct-grupos__cartao-nome">{g.nome}</p>
          <p className="ct-nota">
            {g.dono ? `${L.dono} · ` : ''}{L.integrantes(g.integrantes)} · {L.casas(g.coletivas, g.total)}
          </p>
          <div className="ct-acoes">
            <Link href={CACA_CAMINHOS.grupo(g.id)} navigate={navigate} className="ct-botao ct-botao--contorno" aria-label={L.abrirRotulo(g.nome)}>{L.abrir}</Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Grupos ({ caca, navigate }) {
  const { api, chave, atualizar } = caca
  const [carga, setCarga] = React.useState({ fase: 'carregando', grupos: [] })
  const [tentativa, setTentativa] = React.useState(0)
  const [criado, setCriado] = React.useState(null) // { id, nome, token, expiraEm }: o token só vive aqui, em memória

  React.useEffect(() => {
    let vivo = true
    api.grupoListar(chave).then((r) => {
      if (!vivo) return
      if (r.ok) setCarga({ fase: 'pronto', grupos: (Array.isArray(r.grupos) ? r.grupos : []).map(resumoDoGrupo) })
      else if (r.motivo === 'mapa_desconhecido') atualizar()
      else setCarga((c) => (c.grupos.length ? c : { fase: 'falha', grupos: [] }))
    })
    return () => { vivo = false }
  }, [api, chave, atualizar, tentativa])

  const depoisDeCriar = (novo) => { setCriado(novo); setTentativa((n) => n + 1) }

  const temGrupos = carga.fase === 'pronto' && carga.grupos.length > 0
  const lista = (
    <section aria-labelledby="grupos-lista" aria-busy={carga.fase === 'carregando'}>
      <h2 id="grupos-lista" className="ct-sub">{L.titulo}</h2>
      <Lista carga={carga} navigate={navigate} tentar={() => { setCarga({ fase: 'carregando', grupos: [] }); setTentativa((n) => n + 1) }} />
    </section>
  )
  const criar = <CriarGrupo caca={caca} aoCriar={depoisDeCriar} />

  // Quem já tem grupo vê os grupos primeiro; "criar outro" fica fechado. Sem grupo, a criação é a ação da tela e vem aberta.
  return (
    <div className="ct-caca__central ct-grupos">
      {criado && <GrupoCriado criado={criado} navigate={navigate} aoOutro={() => setCriado(null)} />}
      {temGrupos && lista}
      {!criado && (temGrupos
        ? <details className="ct-grupos__novo"><summary>{C.outro}</summary>{criar}</details>
        : criar)}
      {!temGrupos && lista}
    </div>
  )
}
