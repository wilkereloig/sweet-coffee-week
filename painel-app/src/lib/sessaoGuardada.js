/*
 * Sessão por token — a da marca (scw_marca) e a da conta da equipe
 * (scw_org_conta) — fica guardada NO APARELHO, até a pessoa tocar em Sair.
 * 02/10/2026, pedido do Wilker: o app instalado tem que abrir já logado. O
 * iOS apaga o sessionStorage ao fechar o app, e a marca tinha que entrar de
 * novo a cada visita. Antes era o contrário, de propósito ("morre com a aba").
 *
 * ⛔ A senha compartilhada (scw_org) NÃO passa por aqui: é senha em texto
 * puro e continua morrendo com a aba.
 *
 * O diálogo do site ainda grava a sessão em sessionStorage antes de abrir o
 * painel: a leitura acha lá e muda para o aparelho. Sem localStorage (modo
 * privado, Node nos testes), tudo cai no sessionStorage, como antes.
 */
const aparelho = () => { try { return globalThis.localStorage || null } catch { return null } }

export function gravarGuardada(chave, valor) {
  try {
    aparelho().setItem(chave, valor)
    sessionStorage.removeItem(chave)
  } catch {
    try { sessionStorage.setItem(chave, valor) } catch { /* modo privado */ }
  }
}

export function lerGuardada(chave) {
  try { const v = aparelho()?.getItem(chave); if (v != null) return v } catch { /* sem aparelho */ }
  let daAba = null
  try { daAba = sessionStorage.getItem(chave) } catch { return null }
  if (daAba != null) gravarGuardada(chave, daAba)
  return daAba
}

export function apagarGuardada(chave) {
  try { aparelho()?.removeItem(chave) } catch { /* sem aparelho */ }
  try { sessionStorage.removeItem(chave) } catch { /* modo privado */ }
}
