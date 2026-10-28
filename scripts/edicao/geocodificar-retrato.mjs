// Coordenadas das unidades do retrato local (spec §10.14): geocodifica no Nominatim
// (OpenStreetMap) as unidades que o banco ainda não tem com coordenada verificada.
//   node scripts/edicao/geocodificar-retrato.mjs [--aceitar-rua]
//
// - Lê e regrava src/edicao/dados/retrato/cartoon.local.json. NADA vai para o banco.
// - Idempotente: pula quem já tem `coordenada` (do banco ou de uma rodada anterior).
// - 1 requisição por segundo (política de uso do Nominatim), com User-Agent do projeto.
// - Resultado gravado em `coordenada` com "conferir": true — a organização confere no painel.
// - Não chuta: sem resultado, resultado em outra cidade, resultado ambíguo (candidatos a
//   mais de 1,5 km um do outro) ou endereço que não parece logradouro => a unidade fica
//   sem coordenada e entra em `retrato.sem_coordenada` com o motivo.
// - Resultado só de RUA (o número não existe no mapa) NÃO vira coordenada: o ponto cairia em
//   qualquer lugar da avenida e "Como chegar" mandaria o visitante para o lugar errado.
//   Com --aceitar-rua ele é gravado com "precisao": "rua" (para o mapa tratar como aproximado).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ARQUIVO = fileURLToPath(new URL('../../src/edicao/dados/retrato/cartoon.local.json', import.meta.url))
const UA = 'SweetCoffeeWeek-retrato-local/1.0 (geocodificacao pontual de enderecos do festival; uso local)'
const ACEITAR_RUA = process.argv.includes('--aceitar-rua')
// Natal e Parnamirim: lon_min, lat_max, lon_max, lat_min (formato do Nominatim).
const CAIXA = '-35.45,-5.55,-35.10,-6.00'
const RUA = /^(av|avenida|r|rua|tv|travessa|al|alameda|estr|estrada|rod|rodovia|br|pc|praca|praça|largo|beco|via)\b\.?\s/i
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

/** "Ponto 2: R. Oiti, 20 - loja 03 - Shopping Del Mar…" => { logradouro: "R. Oiti", numero: "20" }. */
function limparEndereco (e = {}) {
  let log = String(e.logradouro || '').replace(/^ponto\s*\d+\s*:\s*/i, '').trim()
  // O campo às vezes traz o endereço inteiro: fica o primeiro trecho que parece logradouro.
  const trechos = log.split(/\s+-\s+/)
  log = trechos.find((t) => RUA.test(t.trim())) || trechos[0]
  let numero = String(e.numero || '').trim()
  let bairro = String(e.bairro || '').trim()
  const noFim = log.match(/^(.+?)(?:\s+N)?[,\s]+(\d{1,5})(?:\s*,\s*(.+))?$/i)
  if (noFim) {
    if (numero && numero !== noFim[2]) return { divergente: true }
    log = noFim[1].replace(/,\s*$/, '').trim(); numero = noFim[2]; bairro = bairro || (noFim[3] || '').trim()
  }
  return { logradouro: log, numero, bairro, cidade: e.cidade || 'Natal', uf: e.uf || 'RN' }
}

const rad = (g) => (g * Math.PI) / 180
function km (a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

async function buscar (q) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=br&viewbox=${CAIXA}&bounded=1&q=${encodeURIComponent(q)}`
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR' }, signal: AbortSignal.timeout(20000) })
  if (r.status === 429 || r.status === 403) throw Object.assign(new Error(`nominatim_${r.status}`), { fatal: true })
  if (!r.ok) throw new Error(`nominatim_${r.status}`)
  return (await r.json()).map((x) => ({ lat: Number(x.lat), lng: Number(x.lon), rua: x.category === 'highway' || x.addresstype === 'road' }))
}

async function resolver (unidade) {
  const e = limparEndereco(unidade.endereco)
  if (e.divergente) return { motivo: 'número do campo "número" diverge do número escrito no logradouro' }
  if (!RUA.test(`${e.logradouro} `)) return { motivo: 'o endereço cadastrado não é um logradouro (sem rua ou avenida)' }
  if (!e.numero) return { motivo: 'sem número no cadastro' }
  const q = [e.logradouro, e.numero, e.bairro, e.cidade, e.uf].filter(Boolean).join(', ')
  const achados = await buscar(q)
  if (!achados.length) return { motivo: 'o OpenStreetMap não achou o endereço' }
  if (achados.some((a) => km(achados[0], a) > 1.5)) return { motivo: 'resultado ambíguo (candidatos a mais de 1,5 km um do outro)' }
  const melhor = achados.find((a) => !a.rua) || achados[0]
  if (melhor.rua && !ACEITAR_RUA) return { motivo: 'o OpenStreetMap só conhece a rua, não o número' }
  return { lat: Number(melhor.lat.toFixed(6)), lng: Number(melhor.lng.toFixed(6)), precisao: melhor.rua ? 'rua' : 'numero' }
}

const retrato = JSON.parse(readFileSync(ARQUIVO, 'utf8'))
const pendentes = retrato.participantes.flatMap((p) => (p.unidades || []).filter((u) => !u.coordenada).map((u) => ({ p, u })))
console.log(`${pendentes.length} unidades sem coordenada`)

let feitas = 0
for (const [i, { p, u }] of pendentes.entries()) {
  if (i) await espera(1100)
  let r
  try { r = await resolver(u) } catch (err) {
    if (err.fatal) { console.error(`${err.message}: o Nominatim recusou — pare e tente mais tarde`); break }
    r = { motivo: `falha na consulta (${err.message})` }
  }
  if (r.lat) {
    u.coordenada = { lat: r.lat, lng: r.lng, conferir: true, fonte: 'osm-nominatim', precisao: r.precisao }
    feitas++
    console.log(`ok     ${p.slug} ${u.id} ${r.lat},${r.lng} (${r.precisao})`)
  } else console.log(`sem    ${p.slug} ${u.id}: ${r.motivo}`)
  if (r.motivo) u.__motivo = r.motivo
}

retrato.retrato.geocodificado_em = new Date().toISOString().slice(0, 19)
retrato.retrato.sem_coordenada = retrato.participantes.flatMap((p) => (p.unidades || [])
  .filter((u) => !u.coordenada).map((u) => ({ unidade: u.id, motivo: u.__motivo || 'não consultada' })))
for (const p of retrato.participantes) for (const u of p.unidades || []) delete u.__motivo

writeFileSync(ARQUIVO, `${JSON.stringify(retrato, null, 2)}\n`)
console.log(`${feitas} geocodificadas agora; ${retrato.retrato.sem_coordenada.length} continuam sem coordenada`)
