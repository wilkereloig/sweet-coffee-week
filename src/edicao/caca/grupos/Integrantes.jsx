/*
 * Ranking dos amigos (spec 15 §7): mesma regra do ranking geral — mais casas diferentes, depois mais carimbos extras,
 * empate na MESMA posição. Só o dono remove integrante (confirmação em linha); a remoção vale na hora e a lista é relida.
 */
import React from 'react'
import { ListaRanking } from '../ranking/ListaRanking.jsx'
import { linhasDoGrupo } from './regras.js'
import { GRUPOS, mensagemDoMotivoGrupo } from './textos.js'
import { Confirmar } from './Confirmar.jsx'

const T = GRUPOS.amigos

export function Integrantes ({ grupo, caca, grupoId, ler, perdeuAcesso }) {
  const souDono = grupo.eu?.papel === 'dono'
  const [confirmando, setConfirmando] = React.useState('')
  const [ocupado, setOcupado] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  const linhas = linhasDoGrupo(grupo).map((l) => ({ ...l, rotuloDono: GRUPOS.detalhe.donoRotulo }))

  async function remover (l) {
    setOcupado(true); setAviso(null)
    const r = await caca.api.grupoRemoverMembro(caca.chave, grupoId, l.membro_id)
    setOcupado(false); setConfirmando('')
    if (r.ok) { setAviso({ tipo: 'ok', texto: T.removido(l.apelido) }); ler({ silencioso: true }); return }
    if (r.motivo === 'negado') { perdeuAcesso(); return }
    if (r.motivo === 'mapa_desconhecido') { caca.atualizar(); return }
    setAviso({ tipo: 'erro', texto: mensagemDoMotivoGrupo(r.motivo) })
    if (r.motivo === 'membro_desconhecido') ler({ silencioso: true })
  }

  const acao = souDono ? (l) => {
    if (l.eu) return null
    if (confirmando === l.membro_id) {
      return (
        <div className="ct-rank__acao">
          <Confirmar pergunta={T.removerPergunta(l.apelido)} confirma={T.removerConfirma} aoConfirmar={() => remover(l)} aoVoltar={() => setConfirmando('')} ocupado={ocupado} />
        </div>
      )
    }
    return (
      <div className="ct-rank__acao">
        <button type="button" className="ct-botao ct-botao--contorno ct-grupos__mini" aria-label={T.removerRotulo(l.apelido)} onClick={() => { setAviso(null); setConfirmando(l.membro_id) }}>{T.remover}</button>
      </div>
    )
  } : undefined

  return (
    <section className="ct-caca__bloco" aria-labelledby="grupo-amigos">
      <h2 id="grupo-amigos" className="ct-sub">{T.titulo}</h2>
      <p className="ct-nota">{T.explica}</p>
      <ListaRanking linhas={linhas} rotulo={T.titulo} acao={acao} />
      <p className="ct-sr" role="status">{aviso?.tipo === 'ok' ? aviso.texto : ''}</p>
      {aviso?.tipo === 'erro' && <p className="ct-aviso" role="alert">{aviso.texto}</p>}
      {aviso?.tipo === 'ok' && <p className="ct-nota" aria-hidden="true">{aviso.texto}</p>}
    </section>
  )
}
