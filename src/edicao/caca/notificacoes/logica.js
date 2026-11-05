/*
 * Avisos por notificação (spec 15 §13) — lógica pura. O navegador, a permissão e o banco ficam em aparelho.js e AvisosPush.jsx.
 * Consentimento: nada é pedido ao abrir a Caça. A permissão só é pedida no clique de "Ativar", e as categorias são escolhidas antes.
 */

/** Padrão do servidor na primeira assinatura (contrato metas-push §4): divulgação da edição só por escolha. */
export const PREFS_PADRAO = Object.freeze({ avaliacao_pendente: true, meta: true, grupo: true, edicao: false })
export const CHAVES_PREFS = Object.keys(PREFS_PADRAO)

/** Só as quatro chaves booleanas conhecidas; o resto é ignorado (o servidor faz o mesmo). */
export function normalizarPrefs (p) {
  const saida = { ...PREFS_PADRAO }
  for (const k of CHAVES_PREFS) if (typeof p?.[k] === 'boolean') saida[k] = p[k]
  return saida
}

/**
 * O que a interface oferece, a partir do que o aparelho diz.
 *   nao-suportado · ios-instalar (iPhone só recebe com o app instalado) · bloqueada · desligado (pode pedir) · ligado
 */
export function estadoDoPush ({ suportado, ios = false, instalado = false, permissao = 'default', assinado = false }) {
  if (!suportado) return ios && !instalado ? 'ios-instalar' : 'nao-suportado'
  if (permissao === 'denied') return 'bloqueada'
  return assinado && permissao === 'granted' ? 'ligado' : 'desligado'
}

/** Erro lançado por ligarAvisos / pela chamada ao banco → o que a tela mostra. */
export function classificarErroPush (e) {
  const msg = String(e?.message || '')
  if (msg === 'bloqueado') return { tipo: 'bloqueada' }
  if (msg === 'sem_resposta') return { tipo: 'sem-resposta' }
  if (typeof e?.motivo === 'string') return { tipo: 'motivo', motivo: e.motivo }
  return { tipo: 'erro' }
}
