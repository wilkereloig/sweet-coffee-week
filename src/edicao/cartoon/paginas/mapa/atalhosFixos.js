/*
 * Atalhos FIXOS do mapa (06/11/2026): três dos atalhos do jogo ficam sempre à mão sobre o mapa, como botões compactos.
 * Padrão: Progresso · Prêmios · Ranking. A pessoa troca no menu "Atalhos" (escolha de três entre os atalhos disponíveis) e a escolha fica só neste aparelho
 * (localStorage, chave abaixo): nenhum dado sai do navegador. Armazenamento indisponível ou valor estranho → o padrão, sem erro.
 * A lógica mora aqui (testável sem navegador); o desenho está em Atalhos.jsx e o estilo em 16-mapa-tela.css.
 */
export const QUANTOS = 3
export const PADRAO = ['progresso', 'premios', 'ranking']
export const CHAVE_FIXOS = 'scw_atalhos_fixos'

export const TEXTO_FIXOS = {
  grupo: 'Atalhos fixos do mapa',
  configurar: 'Escolher atalhos fixos',
  configTitulo: 'Atalhos fixos no mapa',
  configAjuda: `Escolha ${QUANTOS} para ficarem sempre à mão. Todos continuam neste menu.`,
  configGrupo: 'Atalhos fixos: escolha três',
  configConta: (n) => `${n} de ${QUANTOS} escolhidos`,
  configPronto: 'Pronto',
  configFaltam: (n) => `Escolha mais ${n === 1 ? 'um atalho' : `${n} atalhos`} para salvar.`,
  configCheio: 'Já são três. Desmarque um para trocar.',
  configNoMapa: 'no mapa',
  fixoNome: (rotulo) => `${rotulo}, atalho do mapa`,
}

/** Lista válida: exatamente `QUANTOS` chaves conhecidas, sem repetir. Devolve a lista ou `null`. */
export function fixosValidos (lista, chaves) {
  if (!Array.isArray(lista) || lista.length !== QUANTOS) return null
  if (new Set(lista).size !== QUANTOS) return null
  return lista.every((c) => chaves.includes(c)) ? lista : null
}

const guardado = () => { try { return globalThis.localStorage || null } catch { return null } }

/** Os três atalhos fixos desta pessoa (ou o padrão). */
export function lerFixos (chaves) {
  try {
    const bruto = guardado()?.getItem(CHAVE_FIXOS)
    return (bruto && fixosValidos(JSON.parse(bruto), chaves)) || PADRAO
  } catch { return PADRAO }
}

/** Guarda a escolha. Devolve `true` se salvou; falha de armazenamento não quebra nada (a escolha vale até recarregar). */
export function guardarFixos (lista, chaves) {
  if (!fixosValidos(lista, chaves)) return false
  try {
    const g = guardado()
    if (!g) return false
    g.setItem(CHAVE_FIXOS, JSON.stringify(lista))
    return true
  } catch { return false }
}

/** Marca ou desmarca `chave` num rascunho de escolha. Com `QUANTOS` marcados, as outras ficam travadas (desmarcar primeiro). */
export function alternarEscolha (rascunho, chave) {
  if (rascunho.includes(chave)) return rascunho.filter((c) => c !== chave)
  return rascunho.length >= QUANTOS ? rascunho : [...rascunho, chave]
}
