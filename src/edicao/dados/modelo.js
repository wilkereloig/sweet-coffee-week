/*
 * Regras de leitura da projeção pública — funções puras (tests/cartoon-modelo.test.mjs).
 *
 * Recebem o JSON de edicao_publica()/participante_publico() (seção 3.6 do plano)
 * e devolvem o que as páginas mostram. Três regras que não se negociam:
 *  1. Ausência de declaração = "não informado". Nunca "não contém".
 *  2. "Sem lactose" ≠ "sem leite": são aspectos diferentes, lidos separados.
 *  3. Modo de atendimento só conta quando a unidade declarou "sim" para o COMBO.
 */
import { datasDoFestival, frasesDeLinhas, horaTexto } from './horarioFestival.js'

export const ALERGENICOS = [
  ['gluten', 'glúten'], ['leite', 'leite'], ['ovo', 'ovo'], ['amendoim', 'amendoim'],
  ['castanhas', 'castanhas e nozes'], ['soja', 'soja'], ['peixe', 'peixe'], ['crustaceos', 'crustáceos'],
]
export const CARACTERISTICAS = [
  ['lactose', 'lactose'], ['vegano', 'vegano'], ['vegetariano', 'vegetariano'], ['acucar_adicionado', 'açúcar adicionado'],
]
const ROTULO = Object.fromEntries([...ALERGENICOS, ...CARACTERISTICAS, ['outro_alergenico', 'outro alergênico']])
export const rotuloAspecto = (a) => ROTULO[a] || a

export const MODOS = [['local', 'Consumo no local'], ['retirada', 'Retirada'], ['delivery', 'Delivery']]

/** Estado de cada aspecto de um componente; o que não veio é nao_informado. */
export function declaracoes (item) {
  const lidas = Object.fromEntries((item?.alimentar || []).map((d) => [d.aspecto, d]))
  const out = {}
  for (const [a] of [...ALERGENICOS, ...CARACTERISTICAS]) out[a] = lidas[a]?.estado || 'nao_informado'
  if (lidas.outro_alergenico) out.outro_alergenico = lidas.outro_alergenico.estado
  return out
}

/** Resumo de um componente: listas de rótulos por estado, para mostrar junto do produto. */
export function resumoItem (item) {
  const d = declaracoes(item)
  const obs = Object.fromEntries((item?.alimentar || []).filter((x) => x.observacao).map((x) => [x.aspecto, x.observacao]))
  const por = (estado) => ALERGENICOS.filter(([a]) => d[a] === estado).map(([, r]) => r)
  const outro = d.outro_alergenico && d.outro_alergenico !== 'nao_informado' && obs.outro_alergenico
  return {
    contem: [...por('contem'), ...(outro && d.outro_alergenico === 'contem' ? [obs.outro_alergenico] : [])],
    podeConter: [...por('pode_conter'), ...(outro && d.outro_alergenico === 'pode_conter' ? [obs.outro_alergenico] : [])],
    naoContem: por('nao_contem'),
    naoInformado: por('nao_informado'),
    caracteristicas: Object.fromEntries(CARACTERISTICAS.map(([a]) => [a, d[a]])),
    observacoes: obs,
  }
}

/** Resumo do combo inteiro: para cada alergênico, em quais componentes contém / pode conter / não foi informado. */
export function resumoCombo (itens = []) {
  const linhas = []
  for (const [a, rotulo] of ALERGENICOS) {
    const em = (estado) => itens.filter((i) => declaracoes(i)[a] === estado).map((i) => i.nome || i.tipo)
    const contem = em('contem'); const pode = em('pode_conter'); const ni = em('nao_informado')
    if (contem.length || pode.length || ni.length) linhas.push({ aspecto: a, rotulo, contem, podeConter: pode, naoInformado: ni })
  }
  return linhas
}

/** Frase curta para perto do preço: "Contém leite, ovo e glúten". Vazia se nada for declarado como contém. */
export function fraseAlerta (itens = []) {
  const contem = ALERGENICOS.filter(([a]) => itens.some((i) => declaracoes(i)[a] === 'contem')).map(([, r]) => r)
  return contem.length ? `Contém ${juntar(contem)}` : ''
}

/** Todo componente declarou NÃO conter (nunca vale com "não informado"). */
export function declaradoSem (itens = [], aspecto) {
  if (!itens.length) return false
  if (aspecto === 'lactose') return itens.every((i) => declaracoes(i).lactose === 'nao')
  return itens.every((i) => declaracoes(i)[aspecto] === 'nao_contem')
}

export function juntar (lista) {
  if (lista.length <= 1) return lista.join('')
  return `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}`
}

/** Unidades onde cada modo está disponível para o combo. */
export function modosDoParticipante (p) {
  const out = { local: [], retirada: [], delivery: [] }
  for (const u of p?.unidades || []) {
    const m = u.combo?.modos || {}
    for (const k of Object.keys(out)) if (m[k] === 'sim') out[k].push(u)
  }
  return out
}

// ------------------------------------------------------------- tempo (horário de Natal, UTC−3)
const FUSO = 'America/Fortaleza'
function partesLocais (agora) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const p = Object.fromEntries(f.formatToParts(agora).map((x) => [x.type, x.value]))
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` }
}

const diaIso = (v) => { const s = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '' }

/**
 * Estado do combo numa unidade agora:
 * aberto · abre_hoje · encerrado_hoje · sem_horario_hoje · fora_do_periodo · sem_horario (nunca cadastrou).
 * Dia sem linha = a unidade NÃO abre (domingo fechado, por exemplo). `periodo` ({ inicio, fim }, o da edição) diz onde o festival
 * começa e termina: dentro dele, dia sem linha é "sem combo hoje"; "fora do período" é só fora dele. Sem `periodo`, os limites são
 * o primeiro e o último dia que a própria unidade cita.
 */
export function estadoAgora (unidade, agora = new Date(), periodo = null) {
  const faixas = unidade?.combo?.disponibilidade || []
  if (!faixas.length) return { estado: 'sem_horario' }
  const { data, hora } = partesLocais(agora)
  const hoje = faixas.filter((f) => f.data === data).sort((a, b) => a.abre.localeCompare(b.abre))
  if (!hoje.length) {
    const citados = faixas.map((f) => f.data).sort()
    const comEdicao = diaIso(periodo?.inicio) && diaIso(periodo?.fim)
    const de = comEdicao ? diaIso(periodo.inicio) : citados[0]
    const ate = comEdicao ? diaIso(periodo.fim) : citados[citados.length - 1]
    return data < de || data > ate ? { estado: 'fora_do_periodo' } : { estado: 'sem_horario_hoje' }
  }
  const atual = hoje.find((f) => hora >= f.abre && hora < f.fecha)
  if (atual) return { estado: 'aberto', ate: atual.fecha }
  const proxima = hoje.find((f) => hora < f.abre)
  if (proxima) return { estado: 'abre_hoje', as: proxima.abre }
  return { estado: 'encerrado_hoje' }
}

export function textoEstado (e) {
  switch (e.estado) {
    case 'aberto': return `Combo disponível agora, até ${horaTexto(e.ate) || e.ate}`
    case 'abre_hoje': return `Combo disponível hoje a partir das ${horaTexto(e.as) || e.as}`
    case 'encerrado_hoje': return 'Combo encerrado por hoje'
    case 'sem_horario_hoje': return 'Sem combo hoje'
    case 'fora_do_periodo': return ''
    default: return 'Horário no festival a confirmar com a loja'
  }
}

// ------------------------------------------------------------- busca e filtros
export const normalizar = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

function textoBusca (p) {
  const partes = [p.casa?.nome, p.combo?.nome, ...(p.combo?.itens || []).map((i) => i.nome),
    ...(p.unidades || []).map((u) => u.endereco?.bairro), ...(p.unidades || []).map((u) => u.nome)]
  return normalizar(partes.filter(Boolean).join(' '))
}

/** Opções de filtro que existem nos dados (nunca oferecer filtro vazio). */
export function opcoesFiltro (lista = []) {
  const bairros = new Set()
  const modos = new Set()
  for (const p of lista) {
    for (const u of p.unidades || []) {
      if (u.endereco?.bairro) bairros.add(u.endereco.bairro)
      for (const [k] of MODOS) if (u.combo?.modos?.[k] === 'sim') modos.add(k)
    }
  }
  return {
    bairros: [...bairros].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    modos: MODOS.filter(([k]) => modos.has(k)).map(([k]) => k),
    semGluten: lista.some((p) => declaradoSem(p.combo?.itens, 'gluten')),
    semLactose: lista.some((p) => declaradoSem(p.combo?.itens, 'lactose')),
  }
}

/** Filtros: { q, bairro, modo, aberto, semGluten, semLactose }. */
export function filtrar (lista = [], f = {}, agora = new Date()) {
  const q = normalizar(f.q || '')
  return lista.filter((p) => {
    if (q && !q.split(/\s+/).every((t) => textoBusca(p).includes(t))) return false
    const us = p.unidades || []
    if (f.bairro && !us.some((u) => u.endereco?.bairro === f.bairro)) return false
    if (f.modo && !us.some((u) => u.combo?.modos?.[f.modo] === 'sim')) return false
    if (f.aberto && !us.some((u) => estadoAgora(u, agora).estado === 'aberto')) return false
    if (f.semGluten && !declaradoSem(p.combo?.itens, 'gluten')) return false
    if (f.semLactose && !declaradoSem(p.combo?.itens, 'lactose')) return false
    return true
  })
}

/** Filtros <-> query string (o catálogo guarda o estado no endereço). */
export function filtrosDaBusca (search = '') {
  const q = new URLSearchParams(search)
  return {
    q: q.get('q') || '', bairro: q.get('bairro') || '', modo: q.get('modo') || '',
    aberto: q.get('aberto') === '1', semGluten: q.getAll('sem').includes('gluten'),
    semLactose: q.getAll('sem').includes('lactose'),
  }
}
export function buscaDosFiltros (f = {}) {
  const q = new URLSearchParams()
  if (f.q) q.set('q', f.q)
  if (f.bairro) q.set('bairro', f.bairro)
  if (f.modo) q.set('modo', f.modo)
  if (f.aberto) q.set('aberto', '1')
  if (f.semGluten) q.append('sem', 'gluten')
  if (f.semLactose) q.append('sem', 'lactose')
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ------------------------------------------------------------- formatos e links
export const formatarPreco = (n) => (typeof n === 'number' || (typeof n === 'string' && n !== '')
  ? Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ')
  : '')

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export function formatarDia (iso) {
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d, 12))
  return `${DIAS[dt.getUTCDay()]} ${d}/${m}`
}

/**
 * Como a unidade funciona nos dias do festival, em frases curtas ("Segunda a sexta, das 10h às 22h" · "Domingo, não abre"):
 * as mesmas linhas {data, abre, fecha} de `combo.disponibilidade`, lidas pelo módulo do horário. Dia sem período = não abre.
 * `periodo` ({ inicio, fim }, o da edição) dá os dias do festival; sem ele (ou se nenhuma linha cai nele), vale do primeiro ao
 * último dia que as linhas citam — e então os dias de fora dessas pontas não são citados. Sem horário nenhum: [].
 */
export function horarioNoFestival (disponibilidade = [], periodo = null) {
  const datas = periodo ? datasDoFestival(String(periodo.inicio || '').slice(0, 10), String(periodo.fim || '').slice(0, 10)) : []
  return frasesDeLinhas(Array.isArray(disponibilidade) ? disponibilidade : [], datas)
}

export function enderecoEmLinha (e = {}) {
  const rua = [e.logradouro, e.numero].filter(Boolean).join(', ')
  return [rua, e.complemento, e.bairro, [e.cidade, e.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ')
}

export function linkComoChegar (u) {
  const destino = u?.coordenada ? `${u.coordenada.lat},${u.coordenada.lng}` : enderecoEmLinha(u?.endereco)
  return destino ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}` : ''
}

export const linkWhatsApp = (numero, texto = '') => (numero
  ? `https://wa.me/55${String(numero).replace(/\D/g, '')}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
  : '')

export const urlPublica = (base, bucket, path) => (path ? `${base}/storage/v1/object/public/${bucket}/${path}` : '')

/**
 * Imagem devolvida pelo banco ({ bucket, path }) → URL. Caminho que começa com "/" é
 * arquivo do próprio site, não objeto do Storage: é o caso da logo do acervo
 * (`logos_marca.origem = 'acervo'`, `/logos/participants/<slug>.png`). Sem esta regra
 * a URL sairia `…/logos//logos/participants/…` e a página mostraria o monograma.
 */
export const urlDaImagem = (base, foto, bucketPadrao) => {
  if (!foto || !foto.path) return ''
  if (typeof foto.path === 'string' && foto.path.startsWith('/')) return foto.path
  return urlPublica(base, foto.bucket || bucketPadrao, foto.path)
}
