/*
 * Sicredi — patrocinador da edição (spec 15 §11). As agências aparecem no mapa com marcador próprio, nome, endereço e
 * "Como chegar", e NUNCA entram em contagem, ranking ou carimbo. Esta lista junta duas fontes:
 *   · as posições NA ARTE (x/y de 0 a 1) vêm de src/data/mundoEdicao.js (gerado; não se edita à mão);
 *   · as posições GEOGRÁFICAS (lat/lng) vêm do localizador de agências da própria Sicredi, conferido com o Google Maps em
 *     03/11/2026 (06_MATERIAIS_PDV/03_MAPA_IMPRESSO/01_RASCUNHO_POSICOES/_bastidores/pontos-sicredi.json, Dropbox da edição).
 * `precisao`: 'confirmada' (ponto conferido na fonte) · 'aproximada' (só a vizinhança) · 'nao-informada' (sem coordenada).
 * Nada aqui é inventado: agência que a arte tem e esta lista não tem aparece como 'nao-informada'.
 * Funções puras (tests/cartoon-caca-mapa.test.mjs).
 */

export const FONTE_SICREDI = 'localizador de agências da Sicredi + Google Maps, 03/11/2026 (pontos de Cidade Verde e São Gonçalo revistos em 10/11/2026)'

export const AGENCIAS_SICREDI = [
  { id: 'sicredi-natal', nome: 'Sicredi Natal (sede)', endereco: 'Rua Tuiuti, 765, Natal', lat: -5.7862581, lng: -35.1948449, precisao: 'confirmada' },
  // O Google Maps mostra Av. Ayrton Senna, 2349; o localizador diz 1995, salas L28 e L29: o número segue em conferência.
  // Ponto corrigido em 10/11/2026 para a ficha "Sicredi" do Google (dentro do Shopping Cidade Verde): o anterior (-5.8918178, -35.1988811)
  // caía 510 m ao norte do shopping.
  { id: 'sicredi-cidade-verde', nome: 'Sicredi Shopping Cidade Verde', endereco: 'Avenida Ayrton Senna, 1995, salas L28 e L29, Parnamirim', lat: -5.896485, lng: -35.198255, precisao: 'confirmada', numeroEmConferencia: true },
  // Ponto corrigido em 10/11/2026 para a ficha "Sicredi São Gonçalo" do Google (Shopping Carajás): o anterior (-5.7669866, -35.2769408)
  // caía 1,7 km a oeste do shopping.
  { id: 'sicredi-sao-goncalo', nome: 'Sicredi São Gonçalo do Amarante', endereco: 'Shopping Carajás, Avenida Bacharel Tomaz Landim, s/n, Conjunto Jardim Lola, São Gonçalo do Amarante', lat: -5.773274, lng: -35.262356, precisao: 'confirmada' },
].map((a) => ({ ...a, fonte: FONTE_SICREDI }))

export const ehSicredi = (id) => typeof id === 'string' && id.startsWith('sicredi-')

const chave = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const num = (n) => (typeof n === 'number' && Number.isFinite(n) ? n : null)

/**
 * As agências para as três vistas: cada uma com `x`/`y` na arte (ou `null`), `lat`/`lng` (ou `null`) e `precisao`.
 * `naArte`: `mundoEdicao().sicredi` ([{ nome, endereco, x, y }]). Agência só na arte vira 'nao-informada'.
 */
export function agenciasSicredi (naArte = [], oficiais = AGENCIAS_SICREDI) {
  const arte = new Map(naArte.map((s) => [chave(s.nome), s]))
  const vistas = new Set()
  const juntas = oficiais.map((a) => {
    const s = arte.get(chave(a.nome))
    if (s) vistas.add(chave(a.nome))
    const temPonto = num(a.lat) !== null && num(a.lng) !== null
    return {
      ...a, x: num(s?.x), y: num(s?.y),
      lat: temPonto ? a.lat : null, lng: temPonto ? a.lng : null,
      precisao: temPonto ? a.precisao : 'nao-informada',
    }
  })
  const soNaArte = naArte.filter((s) => !vistas.has(chave(s.nome))).map((s, i) => ({
    id: `sicredi-arte-${i + 1}`, nome: s.nome, endereco: s.endereco || '', x: num(s.x), y: num(s.y), lat: null, lng: null, precisao: 'nao-informada', fonte: '',
  }))
  return [...juntas, ...soNaArte]
}

/** Agências com ponto no mapa real, já no formato dos marcadores (`aproximada` = ponto só da vizinhança). */
export const pontosSicredi = (agencias, pin) => agencias
  .filter((a) => a.lat !== null && a.lng !== null && a.precisao !== 'nao-informada')
  .map((a) => ({ id: a.id, lat: a.lat, lng: a.lng, titulo: a.nome, aproximada: a.precisao === 'aproximada', sicredi: true, pin }))

/** "Como chegar": ponto conferido → coordenada; senão o endereço escrito; sem nenhum dos dois → ''. */
export function linkComoChegarSicredi (a) {
  const destino = a?.precisao === 'confirmada' && a.lat !== null && a.lng !== null ? `${a.lat},${a.lng}` : a?.endereco
  return destino ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}` : ''
}

/** Casa o texto da busca com nome ou endereço (sem acento nem caixa). Busca vazia = tudo. */
export const agenciaCombina = (a, q) => {
  const t = chave(q)
  return !t || chave(`${a.nome} ${a.endereco}`).includes(t)
}
