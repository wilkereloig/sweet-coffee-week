/*
 * Camada de edição — configuração (fase 1 do plano docs/cartoon-2026-2/, 14/10/2026).
 *
 * A edição ativa e os DOIS interruptores que mudam o que o domínio mostra.
 * Os outros quatro (participantes, combos, avaliação, resultados) moram no
 * banco e são acionados pela organização no painel (§2.6 do plano).
 *
 * Mudar qualquer um dos dois abaixo é decisão do Wilker, com deploy — mesma
 * regra das flags de App.jsx (CLAUDE.md §3.4, A3). Nunca ligar por data.
 */

export const EDICAO = {
  codigo: '2026.2',
  caminho: '/cartoon',
  tema: 'Cartoon',
  nome: 'Sweet & Coffee Week Cartoon',
}

// false: /cartoon só abre em DEV e em *.vercel.app?preview=1. true: aberta ao público.
// 16/11/2026 (pedido do Wilker): edição ENCERRADA. Os três interruptores desligados; o código da edição fica inteiro.
// /cartoon/* cai na Home (rotas.js) e os QR impressos passam a abrir a Home (qrPontos.js).
export const CARTOON_PUBLICA = false

// false: mapa, Minha rota e Caça aos Carimbos ficam só em DEV e em *.vercel.app?preview=1; no domínio somem da
// navegação. true: tudo no ar. Nos dois casos o QR d1-<casa> abre a ficha da casa, no combo (qrPontos.js, 05/11);
// com o mapa no ar, a ficha mostra o aviso "Carimbar", que leva à tela do carimbo.
export const MAPA_PUBLICO = false

// 'institucional': / mostra a Home do festival. 'cartoon': / mostra a entrada da
// edição e a Home institucional passa a viver em /festival. Exige CARTOON_PUBLICA.
export const ENTRADA_PRINCIPAL = 'institucional'

// Para onde apontam "o festival" e a marca da casca institucional.
export const INICIO_INSTITUCIONAL = ENTRADA_PRINCIPAL === 'cartoon' ? '/festival' : '/'
