/*
 * Convidar pelo grupo aberto. Qualquer integrante gera um link novo (enquanto o dono não tiver cancelado os links); só o
 * dono cancela todos. O link aparece só na resposta que o criou e fica apenas em memória: não há como recuperá-lo depois.
 */
import React from 'react'
import { GRUPOS, mensagemDoMotivoGrupo } from './textos.js'
import { CompartilharConvite } from './CompartilharConvite.jsx'
import { Confirmar } from './Confirmar.jsx'

const T = GRUPOS.convite

export function ConviteDoGrupo ({ grupo, grupoId, caca, ler, perdeuAcesso }) {
  const souDono = grupo.eu?.papel === 'dono'
  const travado = grupo.grupo?.convites_so_dono === true
  const [convite, setConvite] = React.useState(null) // { token, expiraEm }: só em memória
  const [ocupado, setOcupado] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  const [cancelando, setCancelando] = React.useState(false)

  const falhou = (r) => {
    if (r.motivo === 'negado') { perdeuAcesso(); return }
    if (r.motivo === 'mapa_desconhecido') { caca.atualizar(); return }
    setAviso({ tipo: 'erro', texto: mensagemDoMotivoGrupo(r.motivo) })
    if (r.motivo === 'so_dono') ler({ silencioso: true })
  }

  async function gerar () {
    setOcupado(true); setAviso(null)
    const r = await caca.api.grupoConviteNovo(caca.chave, grupoId)
    setOcupado(false)
    if (!r.ok) { falhou(r); return }
    setConvite({ token: r.convite_token, expiraEm: r.convite_expira_em })
    if (souDono && travado) ler({ silencioso: true }) // o dono destrava a geração para os integrantes
  }
  async function cancelar () {
    setOcupado(true); setAviso(null)
    const r = await caca.api.grupoConviteRevogar(caca.chave, grupoId)
    setOcupado(false); setCancelando(false)
    if (!r.ok) { falhou(r); return }
    setConvite(null)
    setAviso({ tipo: 'ok', texto: T.cancelado(Number(r.revogados) || 0) })
    ler({ silencioso: true })
  }

  const bloqueado = travado && !souDono
  return (
    <section className="ct-caca__bloco" aria-labelledby="grupo-convite">
      <h2 id="grupo-convite" className="ct-sub">{T.titulo}</h2>
      <p className="ct-nota">{T.texto}</p>
      {convite && <CompartilharConvite token={convite.token} nomeGrupo={grupo.grupo?.nome || ''} expiraEm={convite.expiraEm} />}
      {bloqueado
        ? <p className="ct-aviso" role="status">{T.travado}</p>
        : <div className="ct-acoes"><button type="button" className="ct-botao ct-botao--contorno" onClick={gerar} disabled={ocupado}>{ocupado ? T.gerando : convite ? T.gerarOutro : T.gerar}</button></div>}
      {souDono && !cancelando && <div className="ct-acoes"><button type="button" className="ct-botao ct-botao--contorno" onClick={() => setCancelando(true)} disabled={ocupado}>{T.cancelar}</button></div>}
      {souDono && cancelando && <Confirmar pergunta={T.cancelarPergunta} confirma={T.cancelarConfirma} aoConfirmar={cancelar} aoVoltar={() => setCancelando(false)} ocupado={ocupado} />}
      <p className="ct-sr" role="status">{aviso?.tipo === 'ok' ? aviso.texto : ''}</p>
      {aviso?.tipo === 'ok' && <p className="ct-nota" aria-hidden="true">{aviso.texto}</p>}
      {aviso?.tipo === 'erro' && <p className="ct-aviso" role="alert">{aviso.texto}</p>}
    </section>
  )
}
