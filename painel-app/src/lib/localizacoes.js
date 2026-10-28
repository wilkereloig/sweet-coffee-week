/*
 * Participantes › Localizações — lógica pura da fila de conferência do ponto no mapa (28/10/2026, pedido do Wilker).
 * O participante só preenche o endereço; a administração vê o endereço, abre o Google Maps, cola o ponto e confirma.
 * Sem DOM nem rede; testada em tests/painel-app-localizacoes.test.mjs.
 */
import { lerCoordenada } from './publicacao.js'

export const FILTROS_LOCALIZACAO = [['a_conferir', 'A conferir'], ['conferidas', 'Conferidas'], ['todas', 'Todas']]

export const conferida = (u) => !!(u && u.coordenada_verificada_em)

const t = (v) => String(v == null ? '' : v).trim()

/** "59064570" → "59064-570"; qualquer outra coisa volta como veio. */
export function cepFormatado(cep) {
  const d = t(cep).replace(/\D/g, '')
  return d.length === 8 ? d.slice(0, 5) + '-' + d.slice(5) : t(cep)
}

/** A linha do endereço, como o participante preencheu: rua, número · bairro · cidade/UF · CEP. */
export function enderecoDaUnidade(u) {
  if (!u) return ''
  const rua = [t(u.logradouro), t(u.numero)].filter(Boolean).join(', ')
  const cidade = [t(u.cidade), t(u.uf)].filter(Boolean).join('/')
  return [rua, t(u.complemento), t(u.bairro), cidade, t(u.cep) && 'CEP ' + cepFormatado(u.cep)].filter(Boolean).join(' · ')
}

/** Google Maps pelo ENDEREÇO do participante (é o que se quer comparar com o ponto). */
export function linkEndereco(u) {
  const q = [[t(u.logradouro), t(u.numero)].filter(Boolean).join(', '), t(u.bairro), t(u.cidade) || 'Natal', t(u.uf) || 'RN', t(u.cep) && cepFormatado(u.cep)].filter(Boolean).join(', ')
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q)
}

/** O ponto já gravado, em "lat, lng" (o mesmo par que o Google Maps copia); vazio se não há. */
export function pontoTexto(u) {
  return u && u.lat != null && u.lng != null ? Number(u.lat) + ', ' + Number(u.lng) : ''
}

/** Google Maps pelo PONTO gravado ('' se não há). */
export function linkPonto(u) {
  const p = pontoTexto(u)
  return p ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p) : ''
}

/** Lê o par colado num campo só ("-5.8123, -35.2012"). @returns {{lat:number, lng:number} | {erro:string}} */
export const lerPonto = (texto) => lerCoordenada(texto, '')

export function filtrarLocalizacoes(lista, filtro) {
  const l = lista || []
  if (filtro === 'conferidas') return l.filter(conferida)
  if (filtro === 'todas') return l
  return l.filter((u) => !conferida(u))
}

export function contarLocalizacoes(lista) {
  const l = lista || []
  const conferidas = l.filter(conferida).length
  return { total: l.length, conferidas, aConferir: l.length - conferidas }
}

/** O nome que identifica a unidade na fila: a marca, e a unidade quando ela tem nome próprio. */
export function tituloDaUnidade(u) {
  const marca = t(u.nome_marca) || '(sem nome)'
  const un = t(u.nome_unidade)
  return un && un.toLowerCase() !== marca.toLowerCase() ? marca + ' · ' + un : marca
}
