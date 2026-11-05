/*
 * Um grupo (spec 15 §7/§8): ranking dos amigos, progresso coletivo, rota colaborativa, convite e saída. Só integrantes
 * leem; o servidor responde "negado" igual para quem não é integrante e para grupo inexistente. Nada do grupo vai para
 * o endereço, o título ou o analytics (só o uuid, que está no caminho e não diz nada sozinho).
 * Props do contrato das seções: `{ caca, navigate, dados, grupoId }`. Sem <h1>.
 */
import React from 'react'
import { Link, Carregando, Falha } from '../../componentes/base.jsx'
import { CACA_CAMINHOS } from '../textos.js'
import { useGrupo } from '../grupos/useGrupo.js'
import { GRUPOS } from '../grupos/textos.js'
import { ProgressoColetivo } from '../grupos/ProgressoColetivo.jsx'
import { Integrantes } from '../grupos/Integrantes.jsx'
import { RotaDoGrupo } from '../grupos/RotaDoGrupo.jsx'
import { ConviteDoGrupo } from '../grupos/ConviteDoGrupo.jsx'
import { SairDoGrupo } from '../grupos/SairDoGrupo.jsx'

const T = GRUPOS.detalhe

export default function GrupoDetalhe ({ caca, navigate, dados, grupoId }) {
  const g = useGrupo({ caca, grupoId })
  const [atualizando, setAtualizando] = React.useState(false)
  const [avisoAtualizar, setAvisoAtualizar] = React.useState('')

  if (g.fase === 'carregando') return <Carregando texto={T.carregando} />
  if (g.fase === 'falha') return <Falha titulo={T.falha.titulo} texto={T.falha.texto} tentar={() => g.ler()} />
  if (g.fase === 'negado') {
    return (
      <div className="ct-caca__bloco" role="alert">
        <h2 className="ct-sub">{T.negado.titulo}</h2>
        <p className="ct-nota">{T.negado.texto}</p>
        <div className="ct-acoes"><Link href={CACA_CAMINHOS.grupos} navigate={navigate} className="ct-botao">{T.negado.acao}</Link></div>
      </div>
    )
  }

  const grupo = g.grupo
  const souDono = grupo.eu?.papel === 'dono'
  const atualizar = async () => {
    setAtualizando(true); setAvisoAtualizar('')
    const r = await g.ler({ silencioso: true })
    setAtualizando(false)
    if (r?.ok) setAvisoAtualizar(T.atualizado)
  }
  const comum = { grupo, grupoId, caca, ler: g.ler, perdeuAcesso: g.perdeuAcesso }

  return (
    <div className="ct-caca__central ct-grupos__detalhe">
      <header className="ct-grupos__cabeca">
        <h2 className="ct-h2 ct-grupos__nome">{grupo.grupo?.nome}</h2>
        <p className="ct-nota">{T.papel(souDono)} {T.integrantes(grupo.membros?.length || 0)}.</p>
        <div className="ct-acoes">
          <button type="button" className="ct-botao ct-botao--contorno" onClick={atualizar} disabled={atualizando}>{atualizando ? T.atualizando : T.atualizar}</button>
        </div>
        <p className="ct-sr" role="status">{avisoAtualizar}</p>
      </header>
      <ProgressoColetivo grupo={grupo} dados={dados} />
      <Integrantes {...comum} />
      <RotaDoGrupo {...comum} dados={dados} aplicar={g.aplicar} />
      <ConviteDoGrupo {...comum} />
      <SairDoGrupo {...comum} navigate={navigate} />
    </div>
  )
}
