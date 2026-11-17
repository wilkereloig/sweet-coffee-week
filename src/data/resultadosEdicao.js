/*
 * Resultados da edição em destaque — fonte única do ESTADO de cada divulgação.
 *
 * A edição Cartoon (2026.2) encerrou em 15/11/2026 e tem três resultados, cada
 * um com o próprio estado. Divulgar um NÃO marca os outros como concluídos:
 *
 *   · Sweet Awards       → DERIVADO da base (handoff/awardsData.js): vira
 *                          'divulgado' quando sweetCoffeeHistory.js traz o pódio
 *                          da edição e o status sai de 'em-apuracao'. Não se
 *                          digita aqui.
 *   · Caça aos Carimbos  → manual, abaixo (`caca`).
 *   · Sorteios           → manual, abaixo (`sorteios`).
 *
 * Home (seção Cartoon), Sweet Awards (abertura) e Edições (detalhe da edição)
 * leem daqui — nenhuma página decide sozinha se "já saiu".
 *
 * ⚠️ A4: nada de resultado, data ou cerimônia antes da divulgação oficial. Os
 * resultados saem primeiro no Instagram do festival; `href` só recebe o link da
 * publicação oficial. Passo a passo: docs/numeros-do-site.md, "Publicar o
 * resultado".
 */
import { SWEET_COFFEE_HISTORY } from './sweetCoffeeHistory.js'
import { AWARDS_DADOS, estadoPremiacao } from './handoff/awardsData.js'

/** Edição que o site trata como "a que acabou de acontecer" (escolha editorial).
 *  Não é a última com resultado publicado: essa sai de AWARDS_DADOS. */
export const EDICAO_EM_DESTAQUE = '2026.2'

/* Estados manuais. 'em-apuracao' | 'divulgado'. Com 'divulgado', `href` é o
   link da publicação oficial (Instagram do festival) — obrigatório. */
const MANUAIS = {
  caca: { nome: 'Caça aos Carimbos', estado: 'em-apuracao', href: null },
  sorteios: { nome: 'sorteios', estado: 'em-apuracao', href: null },
}

const divulgado = (r) => r.estado === 'divulgado' && typeof r.href === 'string' && r.href.startsWith('https://')

/** Estado dos resultados da edição em destaque. Função pura: os testes passam
 *  dados sintéticos para conferir a publicação futura. */
export function resultadosDaEdicao({
  code = EDICAO_EM_DESTAQUE,
  history = SWEET_COFFEE_HISTORY,
  awards = AWARDS_DADOS,
  manuais = MANUAIS,
} = {}) {
  const ed = (history.edicoes || []).find((e) => e.id === code) || {}
  /* Resultado manual só conta como divulgado com o link oficial junto. */
  const manual = (r) => ({ nome: r.nome, estado: divulgado(r) ? 'divulgado' : 'em-apuracao', href: divulgado(r) ? r.href : null })
  return {
    code,
    tema: ed.tema || ed.nome || '',
    periodo: ed.periodo || '',
    awards: { nome: 'Sweet Awards', estado: estadoPremiacao(code, awards, history) },
    caca: manual(manuais.caca),
    sorteios: manual(manuais.sorteios),
  }
}

export const RESULTADOS = resultadosDaEdicao()

export default RESULTADOS
