/*
 * Cobrar pendência e avisar ajuste ao participante (26/10/2026) — lógica pura, testada em
 * tests/painel-app-pendencias-aviso.test.mjs. O banco é `org_avisar_marca`
 * (supabase/migrations/20261114_avisar_marca_pendencias.sql): um aviso (sino + push, o toque leva ao
 * `link`) e o mesmo texto na conversa.
 *
 * As pendências vêm de `pendenciasDaFicha` (lib/fichaGeral.js); só entram as `cobravel` (têm `paraMarca`
 * — a frase escrita PARA a marca — e `link`, o campo no painel dela).
 */
import { cobravel, criarCarregadorFicha, pendenciasDaFicha } from './fichaGeral.js'

export const TITULO_MAX = 120
export const TEXTO_MAX = 4000

const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || ''
const saudacao = (responsavel) => (primeiroNome(responsavel) ? 'Olá, ' + primeiroNome(responsavel) + '!' : 'Olá!')

/** Título do aviso pela quantidade (cabe no sino e no push). */
export function tituloCobranca(n) {
  // Conta PENDÊNCIAS, não campos: "Preencher: A, B e C" é uma pendência só.
  return n === 1 ? 'Uma pendência no seu cadastro' : n + ' pendências no seu cadastro'
}

/**
 * Texto da cobrança de UMA marca. `recado` (opcional) entra antes do fecho — no lote é o mesmo para todas.
 * @returns {{ titulo, texto, link }} — `link` é o da primeira pendência (o toque leva até ela)
 */
export function textoCobranca({ responsavel, itens = [], recado = '' } = {}) {
  const lista = itens.filter(cobravel)
  if (!lista.length) return null
  const corpo = lista.length === 1
    ? 'Falta isto no seu cadastro do Sweet & Coffee Week: ' + minuscula(lista[0].paraMarca) + '.'
    : 'Para o seu cadastro do Sweet & Coffee Week ficar completo, falta:\n' + lista.map((x) => '• ' + x.paraMarca).join('\n')
  const fim = 'Toque no aviso para ir direto ao campo. Qualquer dúvida, responda por aqui.'
  const texto = [saudacao(responsavel), corpo, String(recado || '').trim(), fim].filter(Boolean).join('\n\n')
  return { titulo: tituloCobranca(lista.length), texto, link: lista[0].link }
}

const minuscula = (s) => { const t = String(s || '').trim(); return t ? t[0].toLowerCase() + t.slice(1) : t }

/** "Fizemos isto por você": nome do combo definido pela organização. */
export function avisoNomeCombo({ responsavel, nome }) {
  return {
    titulo: 'A organização definiu o nome do seu combo',
    texto: saudacao(responsavel) + '\n\nDefinimos o nome do seu combo: “' + String(nome || '').trim() + '”.\n\nSe quiser outro nome, é só alterar em Meu combo ou responder por aqui.',
    link: 'combo/3/combo_nome',
  }
}

/** "Fizemos isto por você": localização da unidade conferida no mapa. */
export function avisoLocalizacao({ responsavel, unidade }) {
  const u = String(unidade || '').trim() || 'sua unidade'
  return {
    titulo: 'A organização conferiu a localização de ' + u,
    texto: saudacao(responsavel) + '\n\nConferimos no mapa a localização de ' + u + '. É por ela que a loja aparece no mapa do site do festival.\n\nSe o endereço mudou, atualize em Meu cadastro › Unidades ou responda por aqui.',
    link: 'cadastro/4',
  }
}

/** O que falta para poder enviar (null = pode). */
export function erroDoAviso({ titulo, texto }) {
  const t = String(titulo || '').trim()
  const x = String(texto || '').trim()
  if (!t) return 'Escreva o título do aviso.'
  if (t.length > TITULO_MAX) return 'O título passou de ' + TITULO_MAX + ' caracteres.'
  if (!x) return 'Escreva a mensagem.'
  if (x.length > TEXTO_MAX) return 'A mensagem passou de ' + TEXTO_MAX + ' caracteres.'
  return null
}

// ── Lote (lista de Marcas) ────────────────────────────────────────────────
/**
 * As pendências de UMA marca, lidas pelas mesmas quatro fontes da ficha (a mesma regra, a mesma lista).
 * Fonte que falhou vira o item "não consegui verificar" (pendenciasDaFicha), nunca "nada pendente".
 * @returns {Promise<{ itens, falhas }>}
 */
export async function lerPendenciasDe(participante, chamar) {
  const fontes = {}
  const carregar = criarCarregadorFicha(chamar, (fonte, s) => { if (s.estado !== 'carregando') fontes[fonte] = s })
  const falhas = await carregar(participante.participacao_id || null).pronto
  const f = (k) => fontes[k] || { estado: 'sem_participacao', dados: null, erro: null }
  const itens = pendenciasDaFicha({ participante, fontes: { nucleo: f('nucleo'), publicacao: f('publicacao'), correcoes: f('correcoes'), edicoes: f('edicoes') } })
  return { itens, falhas }
}

/**
 * Várias marcas, `porVez` de cada vez (4 marcas = 16 leituras em voo, no máximo). `aoAvancar(feitas, total)`
 * a cada marca pronta; `cancelado()` verdadeiro para de pedir as próximas.
 * @returns {Promise<Array<{ participante, itens, falhas }>>} na ordem recebida
 */
export async function lerPendenciasLote(marcas, chamar, { porVez = 4, aoAvancar = () => {}, cancelado = () => false } = {}) {
  const saida = new Array(marcas.length)
  let proxima = 0
  let feitas = 0
  async function trabalhador() {
    while (proxima < marcas.length && !cancelado()) {
      const i = proxima++
      const participante = marcas[i]
      try {
        saida[i] = { participante, ...(await lerPendenciasDe(participante, chamar)) }
      } catch (e) {
        saida[i] = { participante, itens: [], falhas: ['leitura'] }
      }
      aoAvancar(++feitas, marcas.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(porVez, marcas.length) }, trabalhador))
  return saida.filter(Boolean)
}
