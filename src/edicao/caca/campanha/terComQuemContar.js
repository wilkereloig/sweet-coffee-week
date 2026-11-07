/*
 * Campanha "Ter com quem contar" (Sicredi, patrocinadora da Cartoon) — fatos, prazo e textos. Funções puras (tests/cartoon-sicredi-campanha.test.mjs).
 *
 * Só o que foi informado pela organização: sem data de resultado, sem validade de voucher, sem regulamento extra.
 * A promoção de vouchers é independente da Caça. A organização pode aprovar o print da publicação e conceder o carimbo especial Sicredi;
 * ele soma pontos no ranking e nos sorteios, sem contar como casa visitada. A escolha dos vouchers é de uma equipe de jornalistas.
 */
import { EDICAO } from '../../config.js'

export const FUSO = 'America/Fortaleza'

export const CAMPANHA = Object.freeze({
  nome: 'Ter com quem contar',
  hashtag: '#TerComQuemContar',
  caminho: `${EDICAO.caminho}/ter-com-quem-contar`,
  /** Último dia para publicar, no fuso de Fortaleza. */
  fim: '2026-11-11',
  fimCurto: '11/11',
  fimLongo: '11 de novembro',
  historias: 10,
  vouchersPorPessoa: 2,
  totalVouchers: 20,
  video: Object.freeze({
    src: '/videos/sicredi/ter-com-quem-contar.mp4',
    capa: '/videos/sicredi/ter-com-quem-contar-capa.jpg',
    largura: 720,
    altura: 1280,
  }),
  perfis: Object.freeze({
    festival: Object.freeze({ arroba: '@sweetcoffeeweek', url: 'https://www.instagram.com/sweetcoffeeweek/' }),
    sicredi: Object.freeze({ arroba: '@sicrediriograndedonorte', url: 'https://www.instagram.com/sicrediriograndedonorte/' }),
  }),
})

/** Dia civil (AAAA-MM-DD) de um instante no fuso de Fortaleza. */
export function diaEmFortaleza (instante) {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instante)
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}

const dias = (iso) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d) / 86400000 }

/**
 * Onde a campanha está, pela data de Fortaleza (não a do aparelho):
 *   antes (faltam N dias) · ultimo-dia (hoje é 11/11) · encerrada (a partir de 12/11, 00h de Fortaleza).
 * `aberta` = ainda dá para participar. Data inválida usa o agora.
 */
export function estadoDaCampanha (agora = new Date()) {
  let t = agora instanceof Date ? agora : new Date(agora)
  if (Number.isNaN(t.getTime())) t = new Date()
  const faltam = dias(CAMPANHA.fim) - dias(diaEmFortaleza(t))
  if (faltam > 0) return { estado: 'antes', aberta: true, faltam, rotulo: faltam === 1 ? 'Falta 1 dia' : `Faltam ${faltam} dias` }
  if (faltam === 0) return { estado: 'ultimo-dia', aberta: true, faltam: 0, rotulo: 'Último dia' }
  return { estado: 'encerrada', aberta: false, faltam: 0, rotulo: 'Campanha encerrada' }
}

/** "Faltam 5 dias · até 11/11" · "Último dia · hoje, 11/11" · "Campanha encerrada". Para os cartões. */
export function prazoCurto (e) {
  if (e.estado === 'antes') return `${e.rotulo} · até ${CAMPANHA.fimCurto}`
  if (e.estado === 'ultimo-dia') return `${e.rotulo} · hoje, ${CAMPANHA.fimCurto}`
  return e.rotulo
}

const IG = CAMPANHA.perfis

export const TEXTOS_CAMPANHA = Object.freeze({
  titulo: CAMPANHA.nome,
  rotulo: 'Campanha do Sicredi',
  tituloDaAba: CAMPANHA.nome,
  lead: 'O festival completa 10 anos. O Sicredi, maior instituição financeira cooperativa do RN e patrocinador da Cartoon, quer homenagear quem esteve ao lado de você: conte em vídeo uma história de alguém com quem você pôde contar.',
  selo: 'Patrocínio',
  prazoAberto: (e) => (e.estado === 'ultimo-dia' ? `Último dia: hoje, ${CAMPANHA.fimLongo}` : `${e.rotulo} · até ${CAMPANHA.fimLongo}`),
  prazoEncerrado: 'Campanha encerrada',
  encerradaNota: `As publicações iam até ${CAMPANHA.fimLongo}. A página segue aqui para quem quiser rever o vídeo e como a campanha funcionou.`,

  videoTitulo: 'Assista ao vídeo',
  videoRotulo: 'Vídeo da campanha Ter com quem contar',
  videoLegenda: 'O vídeo da campanha, em formato vertical.',
  videoSemSuporte: 'Seu navegador não reproduz este vídeo.',
  videoBaixar: 'Abrir o arquivo do vídeo',

  comoTitulo: 'Como participar',
  passos: [
    { titulo: 'Grave um vídeo de até 1 minuto', texto: 'Conte uma história de um momento em que você pôde contar com alguém especial: um amigo, alguém da família, um professor ou quem fez diferença.' },
    { titulo: 'Publique no feed do Instagram', texto: `Poste o vídeo no feed até ${CAMPANHA.fimLongo}, marcando ${IG.festival.arroba} e ${IG.sicredi.arroba} e usando ${CAMPANHA.hashtag}.` },
    { titulo: 'Deixe o perfil público', texto: `Mantenha o perfil público durante a campanha, para a equipe ver a sua participação, e siga ${IG.sicredi.arroba}.` },
  ],

  escolhaTitulo: 'Como as histórias são escolhidas',
  escolhaTexto: `Uma equipe de jornalistas montada pelo festival seleciona as ${CAMPANHA.historias} histórias mais especiais. Cada pessoa escolhida ganha um par de vouchers para um combo do festival, para ir com a pessoa homenageada.`,
  dados: [
    { numero: String(CAMPANHA.historias), rotulo: 'histórias escolhidas' },
    { numero: String(CAMPANHA.vouchersPorPessoa), rotulo: 'vouchers por pessoa escolhida (um par)' },
    { numero: String(CAMPANHA.totalVouchers), rotulo: 'vouchers no total' },
  ],

  separadaTitulo: 'Separada da Caça aos Carimbos',
  separadaTexto: 'A promoção de vouchers é independente da Caça. Mas, se você enviar o print do vídeo publicado e a organização aprovar, ganha um carimbo especial Sicredi. Ele soma pontos no ranking e nos sorteios, sem contar como casa visitada.',
  separadaAcao: 'Conhecer a Caça aos Carimbos',

  perfisTitulo: 'Perfis no Instagram',
  perfilFestival: `Instagram do festival (${IG.festival.arroba})`,
  perfilSicredi: `Instagram do Sicredi (${IG.sicredi.arroba})`,
  novaAba: '(abre em outra aba)',

  /** Blocos curtos que apontam para a página (cartão da agência no mapa, painel de Prêmios, tela de Metas, rodapé). */
  bloco: {
    titulo: CAMPANHA.nome,
    ver: 'Ver a campanha',
    mapa: 'Conte sua história na campanha do Sicredi. Envie o print da publicação e, após aprovação, ganhe um carimbo especial.',
    premiosTitulo: `Também valendo: ${CAMPANHA.nome}`,
    premios: `Campanha do Sicredi no Instagram: ${CAMPANHA.historias} histórias escolhidas, um par de vouchers para cada pessoa. Quem enviar o print e tiver a participação aprovada também ganha um carimbo especial Sicredi para ranking e sorteios.`,
    // Pop-up "O que você disputa" (mapa): a promoção dita por inteiro, com os 2 vouchers à vista.
    disputa: `Conte em vídeo, no Instagram, uma história de alguém com quem você pôde contar. A equipe do festival escolhe ${CAMPANHA.historias} histórias, e cada pessoa escolhida ganha ${CAMPANHA.vouchersPorPessoa} vouchers (um par) para um combo do festival. Envie o print da publicação para pedir o carimbo especial Sicredi; após aprovação, ele soma pontos no ranking e nos sorteios, sem contar como casa visitada.`,
    metas: 'Na campanha Ter com quem contar, envie o print do vídeo publicado para pedir o carimbo especial Sicredi. A organização analisa e, se aprovar, ele conta no ranking e nos sorteios, mas não como casa visitada.',
    rodape: CAMPANHA.nome,
  },
})
