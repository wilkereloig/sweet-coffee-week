import React from 'react'
import { api } from '../../../lib/marcaApi'

/*
 * A marca só SALVA (23/10/2026): o cadastro que fica completo vai sozinho para a conferência da organização. O gatilho do banco
 * faz isso a cada escrita da marca; este componente cobre quem JÁ estava completo e abre a tela sem mudar nada (sem escrita não
 * há gatilho) — senão o selo diria "Completo · a organização vai conferir" e a organização nunca ficaria sabendo.
 * Lê o estado no servidor antes (a tela pode estar atrasada: o gatilho acabou de concluir) e chama a MESMA RPC do gatilho
 * (`marca_concluir_cadastro`: idempotente, confere tudo no servidor; `ok: false` não muda nada). Uma tentativa a cada vez que
 * `ativo` passa a verdadeiro; falha de rede não faz nada (o próximo salvamento conclui).
 */
/**
 * Conclui só se o SERVIDOR ainda a tem em preenchimento. Devolve o status que vale agora (para a tela se atualizar) ou null se
 * nada mudou (`ok: false`: ainda falta algo para o servidor, ou não achou a participação).
 */
export async function concluirSeFaltar(chamar, participacaoId) {
  const pa = ((await chamar('participacoes?select=status_cadastro,combo_status&id=eq.' + participacaoId)) || [])[0]
  if (!pa) return null
  if (!['aguardando_cadastro', 'em_preenchimento'].includes(pa.status_cadastro) || pa.combo_status !== 'rascunho') return pa.status_cadastro
  const r = await chamar('rpc/marca_concluir_cadastro', { metodo: 'POST', corpo: { p_participacao: participacaoId } })
  return r && r.ok ? 'cadastro_completo' : null
}

export function ConcluirSozinho({ ativo, participacaoId, aoConcluir }) {
  const tentou = React.useRef(false)
  React.useEffect(() => {
    if (!ativo) { tentou.current = false; return undefined }
    if (tentou.current || !participacaoId) return undefined
    tentou.current = true
    let vivo = true
    concluirSeFaltar(api, participacaoId)
      .then((status) => { if (vivo && status && aoConcluir) aoConcluir(status) })
      .catch(() => { /* sem rede ou sem permissão: o gatilho do banco conclui no próximo salvamento */ })
    return () => { vivo = false }
  }, [ativo, participacaoId]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
