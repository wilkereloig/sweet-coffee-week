/*
 * Carregadores das páginas — uma página, um chunk (12/10/2026).
 *
 * Até aqui as sete páginas entravam por import direto no App e viajavam num
 * bundle único de 573 kB: abrir Participar (a única página no ar sob o gate)
 * baixava junto o acervo inteiro de Edições e do Sweet Awards.
 *
 * O mesmo carregador serve ao React.lazy do App e ao `precarregar()` dos menus:
 * chamar `import()` duas vezes não baixa duas vezes — o módulo fica em cache —,
 * então passar o mouse num link adianta o download sem duplicar nada.
 */
const comoPadrao = (nome) => (m) => ({ default: m[nome] })

export const CARREGADORES = {
  home: () => import('./institutional/Home').then(comoPadrao('HomePage')),
  edicoes: () => import('./institutional/Edicoes').then(comoPadrao('EdicoesPage')),
  'historico-awards': () => import('./institutional/HistoricoAwards').then(comoPadrao('HistoricoAwardsPage')),
  participar: () => import('./institutional/Participar').then(comoPadrao('ParticiparPage')),
  apoiar: () => import('./institutional/Apoiar').then(comoPadrao('ApoiarPage')),
  contato: () => import('./institutional/Contato').then(comoPadrao('ContatoPage')),
  'em-breve': () => import('./institutional/EmBreve').then(comoPadrao('EmBrevePage')),
  aguarde: () => import('./institutional/Aguarde').then(comoPadrao('AguardePage')),
  legal: () => import('./institutional/Legal').then(comoPadrao('LegalPage')),
}

/** Adianta o download da página de uma rota (hover/foco/toque no link). */
export function precarregar(rota) {
  const carregar = CARREGADORES[rota]
  if (carregar) carregar().catch(() => {})  // falha aqui é silenciosa: o lazy tenta de novo e mostra o erro
}
