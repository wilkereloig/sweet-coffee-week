/*
 * Atalhos da barra do celular escolhidos por cada pessoa (18/10/2026, pedido
 * do Wilker). Até quatro áreas na barra; o resto fica em "Mais". A escolha é
 * deste aparelho (localStorage, chave por conta) — sem ela, vale o padrão.
 * Área que a pessoa deixou de ver (permissão mudou) sai sozinha da escolha.
 */
export const MAX_ATALHOS = 4

/** Ordem final da barra: a escolha (só o que ela vê, sem repetir) ou o padrão. */
export function atalhosDaBarra(salvos, visiveis, padrao, max = MAX_ATALHOS) {
  const vale = (lista) => [...new Set((Array.isArray(lista) ? lista : []).filter((d) => visiveis.includes(d)))].slice(0, max)
  const escolha = vale(salvos)
  return escolha.length ? escolha : vale(padrao)
}

export const chaveAtalhos = (conta) => 'scw_barra_' + (conta || 'compartilhada')

export function lerAtalhos(conta) {
  try { const v = JSON.parse(localStorage.getItem(chaveAtalhos(conta)) || 'null'); return Array.isArray(v) ? v : null } catch { return null }
}
export function gravarAtalhos(conta, lista) {
  try {
    if (lista && lista.length) localStorage.setItem(chaveAtalhos(conta), JSON.stringify(lista))
    else localStorage.removeItem(chaveAtalhos(conta))
  } catch { /* modo privado: vale só nesta abertura */ }
}
