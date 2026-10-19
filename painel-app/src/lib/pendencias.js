import React from 'react'

/*
 * Trabalho pela metade, declarado por quem o tem (18/10/2026). Antes, o painel
 * adivinhava ("tem campo com foco? tem janela aberta?"); agora cada tela diz o
 * que não foi salvo — e a atualização de versão, o convite do app e o
 * "beforeunload" leem daqui.
 *
 * Item: { rotulo, tipo: 'edicao' | 'envio', salvar?: async () => boolean,
 *         guardaRascunho?: boolean, ativo?: () => boolean }
 *   · `salvar`: quando a tela sabe salvar sozinha (o "Salvar e atualizar").
 *   · `guardaRascunho`: a tela já guarda neste aparelho (volta ao reabrir).
 *   · `ativo`: pergunta na hora (formulário que se descobre sujo por evento).
 * Nada daqui vai para o armazenamento: é só o que está na memória da aba.
 */
const itens = new Map()
const ouvintes = new Set()
const avisar = () => ouvintes.forEach((f) => f())

export function registrarPendencia(chave, item) {
  itens.set(chave, item)
  avisar()
  return () => { if (itens.get(chave) === item) { itens.delete(chave); avisar() } }
}

/** O que está pendente AGORA (os `ativo()` são perguntados na hora). */
export function pendencias() {
  return [...itens.values()].filter((x) => { try { return !x.ativo || x.ativo() } catch { return true } })
}
export const temPendencia = () => pendencias().length > 0

export function ouvirPendencias(f) { ouvintes.add(f); return () => ouvintes.delete(f) }

/*
 * Alteração EXTERNA num registro em edição (19/10/2026): quando chega mudança de outra
 * pessoa/sessão enquanto este item está pendente, a tela avisa aqui (além do aviso no
 * próprio formulário) — o indicador de sincronização e quem decide atualizar a versão
 * passam a saber que há um registro aberto que mudou por fora. Só um rótulo, nunca conteúdo.
 */
export function sinalizarMudancaExterna(chave, detalhe = true) {
  const it = itens.get(chave)
  if (!it) return false
  it.externo = detalhe
  avisar()
  return true
}
export function limparMudancaExterna(chave) {
  const it = itens.get(chave)
  if (!it || !it.externo) return
  delete it.externo
  avisar()
}
/** Itens pendentes cujo registro mudou por fora: [{ rotulo }]. */
export function mudancasExternas() {
  return [...itens.values()].filter((x) => x.externo).map((x) => ({ rotulo: x.rotulo }))
}

if (typeof window !== 'undefined') {
  // Um "beforeunload" só, para todo o painel: fechar a aba com algo pela metade pergunta.
  window.addEventListener('beforeunload', (e) => { if (temPendencia()) { e.preventDefault(); e.returnValue = '' } })
}

/** Registra enquanto `ativo`. `salvar` pode mudar a cada render (fica num ref). */
export function usePendencia(ativo, { rotulo, tipo = 'edicao', salvar = null, guardaRascunho = false }) {
  const salvarRef = React.useRef(salvar)
  salvarRef.current = salvar
  const chave = React.useId()
  React.useEffect(() => {
    if (!ativo) return undefined
    return registrarPendencia(chave, {
      rotulo, tipo, guardaRascunho,
      salvar: salvar ? () => salvarRef.current() : null,
    })
  }, [ativo, rotulo, tipo, guardaRascunho, !!salvar, chave]) // eslint-disable-line react-hooks/exhaustive-deps
  // Quem quiser sinalizar "este registro mudou por fora" usa o retorno (os demais ignoram).
  return React.useMemo(() => ({
    chave,
    sinalizarExterno: (detalhe) => sinalizarMudancaExterna(chave, detalhe),
    limparExterno: () => limparMudancaExterna(chave),
  }), [chave])
}

/** Envio de arquivo em andamento: registrado enquanto a promessa não termina. */
let nEnvio = 0
export async function comEnvio(rotulo, promessa) {
  const tirar = registrarPendencia('envio-' + (++nEnvio), { rotulo, tipo: 'envio' })
  try { return await (typeof promessa === 'function' ? promessa() : promessa) } finally { tirar() }
}
