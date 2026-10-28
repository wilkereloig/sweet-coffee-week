import React from 'react'
import { useRegistroEditavel } from './sync/react.js'
import { usePendencia } from './pendencias.js'

/*
 * Rascunho de um registro da organização que RESISTE a alteração externa
 * (19/10/2026). Junta o que cada formulário precisava repetir:
 *   · useRegistroEditavel — mescla em três vias (o que a pessoa digitou nunca é
 *     trocado em silêncio; o mesmo campo editado dos dois lados vira conflito);
 *   · usePendencia — enquanto há edição não salva, o painel sabe (atualizar
 *     versão, fechar a aba) e, com conflito aberto, sinaliza "mudou por fora";
 * e devolve o próprio `registro` para o <AvisoMudancaExterna registro={r} />.
 *
 *   const r = useRascunhoOrg(servidor, ['nome', 'tema'], { chave: id, rotulo: 'Dados da edição' })
 *   r.local.nome · r.editar('nome', v) · r.sujo · r.conflitos
 *   depois de salvar com sucesso: r.salvou(registroConfirmado)
 *
 * `servidor` precisa ter identidade ESTÁVEL enquanto o conteúdo não muda (useMemo):
 * o hook compara por identidade e mescla a cada troca.
 */
export function useRascunhoOrg(servidor, campos, { chave = null, rotulo = 'Alteração ainda não salva', salvar = null } = {}) {
  const r = useRegistroEditavel(servidor, campos, { chave })
  const pend = usePendencia(r.sujo, { rotulo: rotulo + ': alteração ainda não salva', salvar })
  const nConflitos = Object.keys(r.conflitos).length
  React.useEffect(() => {
    if (nConflitos) pend.sinalizarExterno(); else pend.limparExterno()
  }, [nConflitos, pend])
  return r
}

/*
 * Aviso de "salvou" para o editor que envolve o formulário (EdicaoNaSecao). O editor
 * só sabe que o formulário foi ENVIADO, não se a gravação deu certo: um salvamento
 * que falha precisa continuar contando como alteração não salva. Quem sabe salvar
 * avisa o fim da gravação confirmada por este evento (e marca o formulário com
 * ATRIBUTO_SALVA_POR_EVENTO para o editor não presumir "limpo" no envio).
 */
export const ATRIBUTO_SALVA_POR_EVENTO = 'data-salva-por-evento'
export const EVENTO_SALVO = 'scw:salvo'
export function avisarSalvo(form) {
  if (form && typeof form.dispatchEvent === 'function' && form.isConnected) form.dispatchEvent(new CustomEvent(EVENTO_SALVO, { bubbles: true }))
}
