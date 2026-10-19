/*
 * Executor serializado de recargas (19/10/2026). Puro.
 *
 * Uma tela pode receber vários avisos enquanto ainda carrega o anterior. Regras:
 *   · nunca duas cargas ao mesmo tempo (a resposta velha não ultrapassa a nova);
 *   · aviso que chega durante uma carga NÃO é perdido: ao fim roda mais UMA vez
 *     com o aviso mais recente (vários avisos no meio viram uma única releitura);
 *   · depois de `encerrar()` (tela desmontada) nada mais roda;
 *   · carga que falha não derruba o executor nem impede a próxima.
 * `executar(aviso)` pode devolver Promise; `aoTerminar(resultado)` recebe
 * {ok:true} ou {ok:false, erro} de cada carga (a tela de status usa).
 */
export function criarSerializador(executar, aoTerminar = null) {
  let emVoo = false
  let pendente = null
  let vivo = true
  async function rodar(aviso) {
    if (!vivo) return
    if (emVoo) { pendente = aviso; return }
    emVoo = true
    let proximo = aviso
    try {
      while (proximo && vivo) {
        pendente = null
        try {
          await executar(proximo)
          if (aoTerminar) aoTerminar({ ok: true })
        } catch (erro) {
          if (aoTerminar) aoTerminar({ ok: false, erro })
        }
        proximo = pendente
      }
    } finally { emVoo = false }
  }
  return { rodar, encerrar() { vivo = false; pendente = null }, ocupado: () => emVoo }
}
