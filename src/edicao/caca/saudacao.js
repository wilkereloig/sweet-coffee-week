/*
 * Saudação do cartão "Mapa de <apelido>" da Central da Caça (pedido do Wilker, 12/11/2026: "Oi, Eloi. Bom dia, boa tarde ou boa noite. Hoje é um bom
 * dia para comer um combo. As frases podem ter várias variações e mudar com o horário e o momento, com um incentivo para jogar, visitar, comer combo").
 *
 * Lógica pura e textos (CLAUDE.md §5.6), sem React: `saudar(contexto, sorteio)` devolve { saudacao, incentivo }. Quem sorteia é a tela, UMA vez por visita
 * (a frase não troca a cada renderização); aqui o sorteio entra como dois números de 0 a 1, e é por isso que dá para testar.
 *
 * Como a frase nasce:
 *   1. SAUDAÇÃO — pelo horário de Natal: bom dia (5h às 11h59), boa tarde (12h às 17h59), boa noite (18h em diante). De 0h às 4h59 ("madrugada") a
 *      saudação também é "boa noite", mas o incentivo fala em descansar. Três formas ("Oi, Eloi! Boa tarde." · "Boa tarde, Eloi!" · "Olá, Eloi! Boa
 *      tarde."); sem apelido, as mesmas sem o nome.
 *   2. INCENTIVO — pelo momento do jogo; vale a primeira regra que se aplica:
 *        fora do festival → nenhum (só a saudação: nunca convida para o que não existe);
 *        mapa completo → comemora · carimbo esperando avaliação → pede a avaliação ·
 *        último dia do festival, ou faltando 1 ou 2 dias → urgência, conforme o estado do mapa;
 *        senão, conforme o estado do mapa (começando · andando · quase completo), sorteia entre as frases gerais, as da faixa do dia, as de sábado
 *        ou domingo e as de HOJE e AGORA com dado real (quantas casas estão com o combo disponível agora; a que horas libera o primeiro combo de hoje).
 *   Nunca promete o que pode estar desligado ou fora do alcance (voucher, disputa, delivery, prêmio, ranking): o teste cartoon-caca-regras trava
 *   essas palavras. Nada de "votar" (a regra do site é "avaliar"). Texto neutro de gênero ("parabéns", "missão cumprida").
 */
import { casasPorMomento, dentroDoFestival, hojeEmNatal, horaEmNatal } from '../dados/modelo.js'
import { horaTexto } from '../dados/horarioFestival.js'

/** Faixa do dia pela hora cheia de Natal (0 a 23): manhã 5–11 · tarde 12–17 · noite 18–23 · madrugada 0–4. Hora estranha → tarde. */
export function faixaDoDia (hora) {
  const h = Number(hora)
  if (!Number.isFinite(h)) return 'tarde'
  if (h >= 5 && h < 12) return 'manha'
  if (h >= 12 && h < 18) return 'tarde'
  return h >= 18 ? 'noite' : 'madrugada'
}

const SAUDACAO = { manha: 'Bom dia', tarde: 'Boa tarde', noite: 'Boa noite', madrugada: 'Boa noite' }

// (saudação do dia, nome) → frase. Sem nome, a mesma sem o vocativo.
const FORMAS = [
  (s, n) => (n ? `Oi, ${n}! ${s}.` : `Oi! ${s}.`),
  (s, n) => (n ? `${s}, ${n}!` : `${s}!`),
  (s, n) => (n ? `Olá, ${n}! ${s}.` : `Olá! ${s}.`),
]

const casas = (n) => `${n} ${n === 1 ? 'casa' : 'casas'}`
const termina = (d) => (d === 1 ? 'O festival termina amanhã' : `O festival termina em ${d} dias`)

/*
 * AS FRASES. Cada uma é um texto ou uma função do contexto (c). Curtas (até ~80 caracteres, duas linhas no celular), com um convite claro: jogar
 * (carimbar, avaliar), visitar uma casa, comer um combo. Para trocar uma frase, é só editar aqui; o teste confere tamanho e palavras proibidas.
 */
// Nos três estados do mapa (novo · andando · quase): `geral` vale a qualquer hora; manha/tarde/noite/madrugada, só na faixa; sabado/domingo, só no
// dia; `abertas` quando há casas com o combo disponível agora; `abre` quando não há, mas o primeiro combo de hoje ainda vai liberar.
export const FRASES = {
  completo: [
    (c) => `Mapa completo: as ${c.total} casas são suas! Parabéns!`,
    'Missão cumprida! Você validou todas as casas.',
    'Hoje é dia de comemorar: parabéns por completar o mapa!',
    'Que conquista, Sweet Lover! O mapa está completo.',
  ],
  pendente: [
    (c) => (c.pendentes === 1 ? 'Falta só avaliar o combo para o carimbo valer.' : `Faltam ${c.pendentes} avaliações para os seus carimbos valerem.`),
    'Avaliar o combo faz a casa entrar de vez no seu mapa.',
    'Que tal avaliar agora, com o combo ainda fresco na lembrança?',
  ],
  ultimoDia: {
    novo: ['Hoje é o último dia do festival: escolha uma casa e comece o seu mapa.', 'Último dia do festival! Veja as casas abertas e vá de combo.', 'Hoje é a última chance de começar o mapa. Escolha uma casa e vá de combo!'],
    andando: ['Último dia do festival: cada casa a mais conta no seu mapa.', 'Hoje é o último dia. Que tal fechar com mais um combo?', 'Último dia: quantas casas ainda cabem no seu mapa hoje?'],
    quase: [
      (c) => `Último dia do festival! ${c.faltam === 1 ? 'Falta' : 'Faltam'} ${c.faltam} para completar o mapa.`,
      'Hoje é o último dia: o mapa completo está bem perto.',
      (c) => `${c.faltam === 1 ? 'Só uma casa separa' : `Só ${c.faltam} casas separam`} você do mapa completo. É hoje!`,
    ],
  },
  retaFinal: {
    novo: [(c) => `${termina(c.diasRestantes)}: que tal começar o seu mapa agora?`, (c) => `${termina(c.diasRestantes)}. Escolha uma casa e vá de combo!`, (c) => `${termina(c.diasRestantes)}. Qual casa vai ser a primeira do seu mapa?`],
    andando: [(c) => `${termina(c.diasRestantes)}: aproveite para somar mais casas ao mapa.`, (c) => `${termina(c.diasRestantes)}. Cada casa conta até o fim!`, (c) => `${termina(c.diasRestantes)}: qual casa vem agora?`],
    quase: [(c) => `${termina(c.diasRestantes)} e o mapa está quase completo. Vai em frente!`, (c) => `${termina(c.diasRestantes)}: é a hora de fechar o mapa. Qual casa vem agora?`, (c) => `${termina(c.diasRestantes)}: o mapa completo está bem perto.`],
  },
  // Nenhuma casa validada nem carimbo esperando: o primeiro passo.
  novo: {
    geral: [
      'O primeiro carimbo está esperando. Escolha uma casa e vá de combo.',
      'Seu mapa está em branco: que tal começar por uma casa perto de você?',
      'Cada casa nova que você validar entra no seu mapa. Que tal a primeira?',
    ],
    manha: ['Hoje é um bom dia para comer um combo.', 'A manhã é boa para começar o mapa: escolha uma casa e vá de combo.', 'Que tal começar o dia com um combo e o primeiro carimbo?'],
    tarde: ['Hoje é um bom dia para comer um combo.', 'A tarde pede passeio: escolha uma casa e carimbe a primeira.', 'Tarde livre? Peça um combo e comece o seu mapa.'],
    noite: ['Esta noite é boa para comer um combo.', 'A noite também rende: veja as casas abertas e comece o mapa.', 'Um combo de fim de dia e o primeiro carimbo. Bora?'],
    madrugada: ['A madrugada é de descanso. Amanhã, escolha uma casa e comece o mapa.', 'Descanse hoje: amanhã o primeiro carimbo espera por você.'],
    sabado: ['Sábado pede passeio: veja as casas abertas hoje e vá de combo.'],
    domingo: ['Domingo é bom de combo: veja as casas abertas hoje e carimbe uma.'],
    abertas: [(c) => `${c.abertas === 1 ? 'Tem 1 casa' : `Tem ${c.abertas} casas`} com combo disponível agora. Que tal começar por ${c.abertas === 1 ? 'ela' : 'uma delas'}?`],
    abre: [(c) => `Hoje o primeiro combo fica disponível às ${c.abreAs}. Dá para se programar!`],
  },
  // Já tem casa validada (e nenhum carimbo esperando): seguir.
  andando: {
    geral: [
      'Cada casa nova conta. Que tal mais um combo hoje?',
      'Seu mapa está crescendo. Escolha a próxima casa e vá de combo.',
      'Tem combo esperando por você. Qual casa vem agora?',
    ],
    manha: ['Hoje é um bom dia para comer um combo.', 'Comece o dia somando mais uma casa ao mapa.', 'Bom começo de dia para mais um combo e mais um carimbo.'],
    tarde: ['Hoje é um bom dia para comer um combo.', 'Tarde boa para mais uma casa no mapa.', 'Que tal um combo agora? Mais um carimbo vem junto.'],
    noite: ['Esta noite é boa para comer um combo.', 'A noite também conta: veja as casas abertas e some mais um carimbo.', 'Um combo de fim de dia deixa o mapa ainda mais cheio.'],
    madrugada: ['Descanse: amanhã o mapa cresce mais um pouco.', 'Hoje já deu! Amanhã tem mais casa para carimbar.'],
    sabado: ['Sábado de passeio: que tal mais uma casa no mapa?'],
    domingo: ['Domingo de combo: veja as casas abertas hoje e some um carimbo.'],
    abertas: [(c) => `${c.abertas === 1 ? '1 casa está' : `${c.abertas} casas estão`} com combo disponível agora. Qual entra no seu mapa?`],
    abre: [(c) => `O primeiro combo de hoje fica disponível às ${c.abreAs}. Programe a próxima casa!`],
  },
  // Faltam 1 a 3 casas para completar o mapa.
  quase: {
    geral: [
      (c) => `${c.faltam === 1 ? 'Falta só 1 casa' : `Faltam só ${c.faltam} casas`} para completar o mapa. Vai em frente!`,
      (c) => `Seu mapa está quase completo: ${c.faltam === 1 ? 'falta' : 'faltam'} ${c.faltam}. Hoje pode ser o dia.`,
      'Reta final do mapa: escolha a próxima casa e vá de combo.',
      'O mapa quase fecha. Que tal um combo para chegar lá?',
    ],
    manha: ['Comece o dia perto do mapa completo: escolha a próxima casa.'],
    tarde: ['Hoje é um bom dia para comer um combo e fechar o mapa.'],
    noite: ['Esta noite pode fechar o seu mapa: veja as casas abertas.'],
    madrugada: ['Descanse: amanhã dá para chegar ainda mais perto de fechar o mapa.'],
    sabado: ['Sábado de passeio e de fechar o mapa: qual casa vem agora?'],
    domingo: ['Domingo de combo: veja as casas abertas hoje e chegue mais perto do mapa completo.'],
    abertas: [(c) => `${c.abertas === 1 ? '1 casa está' : `${c.abertas} casas estão`} com combo disponível agora. Uma delas pode ser a próxima do seu mapa.`],
    abre: [(c) => `O primeiro combo de hoje fica disponível às ${c.abreAs}. Qual casa fecha o seu mapa?`],
  },
}

const escolhe = (lista, x) => (lista.length ? lista[Math.min(lista.length - 1, Math.floor((Number(x) || 0) * lista.length))] : '')

/** Em que ponto do jogo a pessoa está: fora (festival fora do ar) · completo · pendente · novo · quase · andando. */
export function situacaoDoJogo (c) {
  if (!c.noFestival) return 'fora'
  if (c.pendentes > 0) return 'pendente' // como a próxima ação da Central: avaliar vem antes de tudo
  if (c.completo) return 'completo'
  if (!(c.validadas > 0)) return 'novo'
  return c.faltam > 0 && c.faltam <= 3 ? 'quase' : 'andando'
}

// O que entra no sorteio quando nenhuma regra de urgência assumiu: as frases do estado que valem neste momento.
function reunir (banco, c) {
  const pool = [...banco.geral, ...banco[c.faixa]]
  if (c.diaDaSemana === 6) pool.push(...banco.sabado)
  if (c.diaDaSemana === 0) pool.push(...banco.domingo)
  if (c.abertas > 0) pool.push(...banco.abertas)
  else if (c.abreAs) pool.push(...banco.abre)
  return pool
}

/**
 * A saudação e o incentivo do cartão. `c` vem de `contextoDaSaudacao`; `sorteio` = { a, b } (números de 0 a 1: a escolhe a forma da saudação, b a
 * frase do incentivo). Devolve { saudacao, incentivo } — `incentivo` vazio quando não há o que convidar (fora do festival).
 */
export function saudar (c, sorteio = {}) {
  const saudacao = escolhe(FORMAS, sorteio.a)(SAUDACAO[c.faixa] || SAUDACAO.tarde, c.nome)
  const situacao = situacaoDoJogo(c)
  let lista = []
  if (situacao === 'completo' || situacao === 'pendente') lista = FRASES[situacao]
  else if (situacao !== 'fora') {
    if (c.ultimoDia) lista = FRASES.ultimoDia[situacao]
    else if (c.diasRestantes >= 1 && c.diasRestantes <= 2) lista = FRASES.retaFinal[situacao]
    else lista = reunir(FRASES[situacao], c)
  }
  const frase = escolhe(lista, sorteio.b)
  return { saudacao, incentivo: typeof frase === 'function' ? frase(c) : frase }
}

const diaIso = (v) => { const s = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '' }
const utc = (iso) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d) }

/**
 * Tudo o que a saudação precisa saber, num objeto só. `apelido`: o do mapa; `resumo`: `resumoProgresso` (total, validadas, faltam, pendentes,
 * completo); `dados`: a edição (`edicao.inicio/fim` e as casas com os horários) — sem ela (ainda carregando) não há dado de hora de casa nem
 * data de fim, e a saudação cai nas frases gerais. `agora`: o relógio (injetável, para teste). Hora e data são de Natal, como o resto do site.
 */
export function contextoDaSaudacao ({ apelido, resumo = {}, dados = null, agora = new Date() }) {
  const periodo = dados?.edicao || null
  const comPeriodo = !!(diaIso(periodo?.inicio) && diaIso(periodo?.fim))
  const hoje = hojeEmNatal(agora)
  const fim = diaIso(periodo?.fim)
  const momento = casasPorMomento(dados?.participantes || [], agora, periodo)
  return {
    nome: String(apelido ?? '').replace(/\s+/g, ' ').trim().slice(0, 24),
    faixa: faixaDoDia(horaEmNatal(agora)),
    diaDaSemana: new Date(utc(hoje)).getUTCDay(), // 0 = domingo … 6 = sábado
    noFestival: comPeriodo ? dentroDoFestival(periodo, agora) : true, // sem o período ainda (carregando) não corta o convite
    ultimoDia: !!fim && hoje === fim,
    diasRestantes: fim ? Math.round((utc(fim) - utc(hoje)) / 86_400_000) : null,
    abertas: momento.abertas.length,
    abreAs: momento.abremHoje[0] ? horaTexto(momento.abremHoje[0].as) : '',
    total: Number(resumo.total) || 0,
    validadas: Number(resumo.validadas) || 0,
    faltam: Number(resumo.faltam) || 0,
    pendentes: Number(resumo.pendentes) || 0,
    completo: !!resumo.completo,
  }
}
