/*
 * Compartilhar (spec 15 §13) — montagem PURA da arte vertical 1080x1920 para Stories e dos textos/links públicos.
 * Regra de privacidade: `dadosDaArte` é uma lista branca. Só sai apelido, números e nomes de casas já validadas; e-mail, WhatsApp,
 * chave pessoal, link de recuperação e token de convite nem entram na função. O desenho em canvas (desenhar.js) só executa o
 * que `layoutDaArte` manda, e a zona central segura (12–88% da largura, 20–80% da altura) é conferida em teste.
 */
import { EDICAO } from '../../config.js'
import { nomeDaCasa } from '../regras.js'
import { EXTRAS } from '../textos-extras.js'

const T = EXTRAS.compartilhar

export const ARTE = { largura: 1080, altura: 1920, fonte: 'Grandstander' }
/** Zona segura do fundo `stories-fundo-v1`: as faixas decoradas ficam fora dela. */
export const ZONA = { x0: 0.12, x1: 0.88, y0: 0.20, y1: 0.80 }
export const MAX_CASAS_NA_ARTE = 8
const MAX_APELIDO = 24
const MAX_LINHAS_CASAS = 4

const num = (n) => (Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : 0)

/** Link público de divulgação: a página da edição. Sem caminho de mapa, grupo ou convite; sem query nem hash. */
export const linkPublicoDaEdicao = (origem) => `${String(origem || '').replace(/\/+$/, '')}${EDICAO.caminho}`
export const linkDaCasa = (origem, slug) => `${linkPublicoDaEdicao(origem)}/participantes/${encodeURIComponent(slug)}`
export const linkDoCombo = (origem, slug) => `${linkPublicoDaEdicao(origem)}/combos/${encodeURIComponent(slug)}`
/** Rota: só ids de unidade (públicos), já filtrados pelo formato que a página de rota aceita. */
export function linkDaRota (origem, ids) {
  const bons = [...new Set((ids || []).filter((x) => /^u[0-9a-f]{6}$|^udemo\d+$/.test(x)))]
  return bons.length ? `${linkPublicoDaEdicao(origem)}/minha-rota?u=${bons.join(',')}` : null
}
/** Texto curto do link para escrever na arte (sem protocolo). */
export const linkSemProtocolo = (link) => String(link || '').replace(/^https?:\/\//i, '')

/**
 * Lista branca do que vai na arte. `mapa` é a resposta de mapa_ler_v2 (que TEM e-mail e WhatsApp: por isso nada é copiado em bloco).
 */
export function dadosDaArte ({ mapa, dados, origem }) {
  const apelido = String(mapa?.apelido ?? '').trim().slice(0, MAX_APELIDO) || 'Sweet Lover'
  const validadas = (Array.isArray(mapa?.casas) ? mapa.casas : []).filter((c) => c?.estado === 'validada' && typeof c.slug === 'string')
  const nomes = [...new Set(validadas.map((c) => nomeDaCasa(dados, c.slug)).filter((n) => n && n !== 'a casa'))]
  return {
    apelido,
    validadas: num(mapa?.casas_validadas),
    total: num(mapa?.total_casas),
    casas: nomes.slice(0, MAX_CASAS_NA_ARTE),
    excedente: Math.max(nomes.length - MAX_CASAS_NA_ARTE, 0),
    link: linkPublicoDaEdicao(origem),
  }
}

/** Texto que acompanha o compartilhamento (e vai para a área de transferência). */
export const textoDoCompartilhamento = (d) => (d.validadas > 0 ? T.texto(d.validadas, d.total, d.link) : T.textoSemProgresso(d.link))

/** Quebra `texto` em linhas que cabem em `largura`, medindo com `medir(texto)`. Palavra maior que a linha fica sozinha. */
export function quebrarLinhas (texto, largura, medir) {
  const linhas = []
  let atual = ''
  for (const palavra of String(texto).split(/\s+/).filter(Boolean)) {
    const tenta = atual ? `${atual} ${palavra}` : palavra
    if (atual && medir(tenta) > largura) { linhas.push(atual); atual = palavra } else atual = tenta
  }
  if (atual) linhas.push(atual)
  return linhas
}

/** Maior tamanho (de `max` a `min`, passo 4) em que `texto` cabe em `largura`. */
export function tamanhoQueCabe (texto, largura, medirEm, max, min) {
  let t = max
  while (t > min && medirEm(texto, t) > largura) t -= 4
  return t
}

/**
 * Posição de tudo que vai na arte, como lista de operações que o canvas executa. `medirEm(texto, tamanho, peso)` mede em px
 * (no teste, uma medida simulada). Tudo fica dentro de ZONA: cartão e textos.
 */
export function layoutDaArte (d, medirEm) {
  const { largura: L, altura: A } = ARTE
  const x0 = Math.round(L * ZONA.x0); const x1 = Math.round(L * ZONA.x1); const cx = L / 2
  const y0 = Math.round(A * ZONA.y0); const y1 = Math.round(A * ZONA.y1)
  const pad = 44
  const util = x1 - x0 - pad * 2
  const ops = []
  const texto = (t, y, tamanho, peso, cor = 'chocolate') => ops.push({ tipo: 'texto', texto: t, x: cx, y, tamanho, peso, cor, largura: medirEm(t, tamanho, peso) })

  ops.push({ tipo: 'cartao', x: x0, y: y0, w: x1 - x0, h: y1 - y0 })
  let y = y0 + 100
  texto(T.arteTitulo, y, tamanhoQueCabe(T.arteTitulo, util, (t, s) => medirEm(t, s, 700), 52, 32), 700)
  y += 130
  texto(d.apelido, y, tamanhoQueCabe(d.apelido, util, (t, s) => medirEm(t, s, 900), 120, 48), 900)
  y += 210
  const grande = `${d.validadas} de ${d.total}`
  texto(grande, y, tamanhoQueCabe(grande, util, (t, s) => medirEm(t, s, 900), 190, 80), 900)
  y += 80
  texto(T.arteCasas, y, tamanhoQueCabe(T.arteCasas, util, (t, s) => medirEm(t, s, 700), 50, 30), 700)
  y += 56
  ops.push({ tipo: 'barra', x: x0 + pad, y, w: util, h: 44, fracao: d.total > 0 ? Math.min(d.validadas / d.total, 1) : 0 })
  y += 44 + 70

  if (d.casas.length) {
    // Quantas casas cabem em MAX_LINHAS_CASAS linhas; as que sobram viram "+N" (a arte nunca cala quantas foram).
    const medir = (t) => medirEm(t, 44, 700)
    const montar = (n) => {
      const resto = d.casas.length - n + d.excedente
      return d.casas.slice(0, n).concat(resto ? [`+${resto}`] : []).join(' · ')
    }
    let n = d.casas.length
    while (n > 0 && quebrarLinhas(montar(n), util, medir).length > MAX_LINHAS_CASAS) n -= 1
    for (const l of quebrarLinhas(montar(n), util, medir).slice(0, MAX_LINHAS_CASAS)) { texto(l, y, 44, 700); y += 60 }
  }

  // Convite e link ancorados no pé do cartão: o corpo acima nunca passa de y1 - 220.
  const yLink = y1 - 80
  const yConvite = yLink - 90
  texto(T.arteConvite, yConvite, tamanhoQueCabe(T.arteConvite, util, (t, s) => medirEm(t, s, 900), 58, 34), 900)
  texto(linkSemProtocolo(d.link), yLink, tamanhoQueCabe(linkSemProtocolo(d.link), util, (t, s) => medirEm(t, s, 700), 44, 24), 700, 'vermelho')
  return { largura: L, altura: A, zona: { x0, x1, y0, y1 }, ops, fimDoCorpo: y }
}
