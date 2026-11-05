/* Sair do grupo, com confirmação em linha. O dono que sai passa o grupo a quem está há mais tempo nele (regra do banco). */
import React from 'react'
import { CACA_CAMINHOS } from '../textos.js'
import { GRUPOS, mensagemDoMotivoGrupo } from './textos.js'
import { Confirmar } from './Confirmar.jsx'

const T = GRUPOS.sair

export function SairDoGrupo ({ grupo, grupoId, caca, navigate }) {
  const souDono = grupo.eu?.papel === 'dono'
  const [perguntando, setPerguntando] = React.useState(false)
  const [ocupado, setOcupado] = React.useState(false)
  const [erro, setErro] = React.useState('')

  async function sair () {
    setOcupado(true); setErro('')
    const r = await caca.api.grupoSair(caca.chave, grupoId)
    setOcupado(false)
    if (r.ok || r.motivo === 'negado') { navigate(CACA_CAMINHOS.grupos); return } // negado = já não estava mais no grupo
    if (r.motivo === 'mapa_desconhecido') { caca.atualizar(); return }
    setPerguntando(false); setErro(mensagemDoMotivoGrupo(r.motivo))
  }

  return (
    <section className="ct-caca__bloco" aria-labelledby="grupo-sair">
      <h2 id="grupo-sair" className="ct-sub">{T.titulo}</h2>
      <p className="ct-nota">{T.texto}{souDono ? ` ${T.textoDono}` : ''}</p>
      {perguntando
        ? <Confirmar pergunta={T.pergunta} confirma={T.confirma} voltar={T.voltar} aoConfirmar={sair} aoVoltar={() => setPerguntando(false)} ocupado={ocupado} />
        : <div className="ct-acoes"><button type="button" className="ct-botao ct-botao--contorno" onClick={() => { setErro(''); setPerguntando(true) }}>{T.acao}</button></div>}
      {erro && <p className="ct-aviso" role="alert">{erro}</p>}
    </section>
  )
}
