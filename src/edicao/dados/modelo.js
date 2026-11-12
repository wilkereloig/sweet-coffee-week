/*
 * Regras de leitura da projeção pública — funções puras (tests/cartoon-modelo.test.mjs).
 *
 * Recebem o JSON de edicao_publica()/participante_publico() (seção 3.6 do plano)
 * e devolvem o que as páginas mostram. Três regras que não se negociam:
 *  1. Ausência de declaração = "não informado". Nunca "não contém".
 *  2. "Sem lactose" ≠ "sem leite": são aspectos diferentes, lidos separados.
 *  3. Modo de atendimento só conta quando a unidade declarou "sim" para o COMBO.
 */
import { datasDoFestival, frasesDeLinhas, horaTexto, periodoDoFestivalTexto } from './horarioFestival.js'

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

/**
 * O que algum componente declarou em `chave` ('contem' | 'podeConter'), sem repetir: o catálogo na ordem de sempre e,
 * depois, o "outro alergênico" que a casa escreveu (ele já vem em resumoItem; sem ele o alerta do combo omitia o que o cartão do item mostra).
 */
function declaradosNoCombo (itens, chave) {
  const ordem = ALERGENICOS.map(([, r]) => r)
  const pos = (r) => (ordem.includes(r) ? ordem.indexOf(r) : ordem.length)
  return [...new Set(itens.flatMap((i) => resumoItem(i)[chave]))].sort((a, b) => pos(a) - pos(b))
}

/** Frase curta para perto do preço: "Contém leite, ovo e glúten". Vazia se nada for declarado como contém. */
export function fraseAlerta (itens = []) {
  const contem = declaradosNoCombo(itens, 'contem')
  return contem.length ? `Contém ${juntar(contem)}` : ''
}

/**
 * "Pode conter amendoim e soja": o que algum componente declarou como "pode conter" e que nenhum declarou como "contém"
 * (quem contém já está na frase de cima). Vazia se não houver. Nunca deduz: só repete a declaração da casa.
 */
export function frasePodeConter (itens = []) {
  const contem = declaradosNoCombo(itens, 'contem')
  const pode = declaradosNoCombo(itens, 'podeConter').filter((r) => !contem.includes(r))
  return pode.length ? `Pode conter ${juntar(pode)}` : ''
}

/** Todo componente declarou NÃO conter (nunca vale com "não informado"). */
export function declaradoSem (itens = [], aspecto) {
  if (!itens.length) return false
  if (aspecto === 'lactose') return itens.every((i) => declaracoes(i).lactose === 'nao')
  return itens.every((i) => declaracoes(i)[aspecto] === 'nao_contem')
}

/**
 * As quatro restrições que a página e os filtros respondem para o combo inteiro. `sim`: o que a casa
 * precisa ter declarado em CADA item; `nao`: o que, declarado em QUALQUER item, já responde "não".
 * O resto é "não informado" — nunca deduzido (sem lactose ≠ sem leite; pode conter glúten ≠ sem glúten).
 */
export const RESTRICOES = [
  { chave: 'vegano', sim: (d) => d.vegano === 'sim', nao: (d) => d.vegano === 'nao' },
  { chave: 'acucar', sim: (d) => d.acucar_adicionado === 'nao', nao: (d) => d.acucar_adicionado === 'sim' },
  { chave: 'gluten', sim: (d) => d.gluten === 'nao_contem', nao: (d) => d.gluten === 'contem' || d.gluten === 'pode_conter' },
  { chave: 'lactose', sim: (d) => d.lactose === 'nao', nao: (d) => d.lactose === 'sim' },
]

/** 'sim' · 'nao' · 'nao_informado' para uma restrição (chave de RESTRICOES) no combo inteiro. */
export function veredito (itens = [], chave) {
  const r = RESTRICOES.find((x) => x.chave === chave)
  if (!r || !itens?.length) return 'nao_informado'
  const ds = itens.map(declaracoes)
  if (ds.every(r.sim)) return 'sim'
  return ds.some(r.nao) ? 'nao' : 'nao_informado'
}

/**
 * Combo com opção vegetariana (10/11/2026, pedido do Wilker): vale o DOCE e o SALGADO — a bebida não conta. Cada um tem que ser
 * vegetariano declarado pela casa ou ter uma troca declarada vegetariana. Casa em que só um dos dois é vegetariano não entra.
 * 'direto' = os dois já são vegetarianos · 'troca' = ao menos um só é vegetariano na troca · 'nao' = não (ou não informado).
 */
const DOCE_SALGADO = ['doce', 'salgado']
const eVegetariano = (i) => declaracoes(i).vegetariano === 'sim'
const temTrocaVegetariana = (i) => (i?.substituicoes || []).some(eVegetariano)
export function opcaoVegetariana (itens = []) {
  const base = (itens || []).filter((i) => DOCE_SALGADO.includes(i?.tipo))
  if (!DOCE_SALGADO.every((t) => base.some((i) => i.tipo === t))) return 'nao'
  if (!base.every((i) => eVegetariano(i) || temTrocaVegetariana(i))) return 'nao'
  return base.every(eVegetariano) ? 'direto' : 'troca'
}

/** Como a unidade atende o combo num modo: 'sim' · 'nao' · 'nao_informado' (o que não veio). */
const modoDe = (u, k) => (['sim', 'nao'].includes(u?.combo?.modos?.[k]) ? u.combo.modos[k] : 'nao_informado')

/**
 * Um modo de atendimento para a casa inteira: { estado, unidades }.
 * sim = alguma unidade declarou (unidades = essas); sem nenhum sim, alguma em branco = não informado
 * (unidades = as em branco); todas declararam "não" = nao. Sem unidade: não informado.
 */
export function estadoModo (p, k) {
  const us = p?.unidades || []
  const sim = us.filter((u) => modoDe(u, k) === 'sim')
  if (sim.length) return { estado: 'sim', unidades: sim }
  const ni = us.filter((u) => modoDe(u, k) === 'nao_informado')
  if (ni.length || !us.length) return { estado: 'nao_informado', unidades: ni }
  return { estado: 'nao', unidades: [] }
}

/**
 * Canais de pedido da unidade que são link http(s) de verdade. O dado gravado antes da validação do painel não é
 * confiável: nenhum canal vira href sem passar por aqui (a ficha e o atalho do topo usam esta mesma lista).
 */
export const linkHttp = (s) => /^https?:\/\//i.test(String(s ?? '').trim())
export const canaisSeguros = (u) => (u?.combo?.canais || []).filter((c) => linkHttp(c?.link))

/**
 * Para onde vai o atalho "Delivery" do topo da ficha. Só abre um link direto quando não há dúvida de qual unidade o
 * visitante está pedindo — o canal é de cada unidade, e o do primeiro endereço da lista não vale para as outras:
 *  · `link`     — uma só unidade entrega (vale o 1º canal que ela cadastrou), ou todas as que entregam usam o mesmo link;
 *  · `escolher` — mais de uma unidade entrega e os canais diferem (ou só algumas têm canal): a pessoa escolhe a unidade
 *                 em "Como pedir", onde cada uma tem os seus;
 *  · `info`     — nenhuma unidade que entrega tem canal com link: "Como pedir" diz o que a casa informou.
 * Unidade que não declarou delivery "sim" para o combo nunca entra, mesmo com canal gravado.
 */
export function destinoDelivery (p) {
  const modo = estadoModo(p, 'delivery')
  const entregam = modo.estado === 'sim' ? modo.unidades : [] // sem "sim", `unidades` são as em branco, não as que entregam
  const links = entregam.map((u) => canaisSeguros(u).map((c) => String(c.link).trim()))
  const todos = [...new Set(links.flat())]
  if (!todos.length) return { tipo: 'info' }
  if (entregam.length === 1) return { tipo: 'link', link: links[0][0] }
  if (todos.length === 1 && links.every((l) => l.includes(todos[0]))) return { tipo: 'link', link: todos[0] }
  return { tipo: 'escolher' }
}

/**
 * A observação da casa sobre a unidade, só quando diz algo: "Nada", "Não", "-" são a resposta a um campo opcional,
 * não aviso — e na ficha apareciam como se fossem. Só exibição: o dado não muda.
 */
export const observacaoUtil = (t) => {
  const s = String(t ?? '').trim()
  return /^(nada|nenhum[a]?|n[ãa]o( tem| h[áa])?|n\/?a|sem observa[çc][ãa]o|[-–—.]+)$/i.test(s) ? '' : s
}

/**
 * Texto em CAIXA ALTA vira caixa de leitura ("COMBO K POP STAR" → "Combo K Pop Star"); o resto fica como
 * veio. Só exibição: o dado não muda. Preposições e artigos do meio ficam minúsculos.
 */
const MIUDAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas', 'com', 'para'])
export function caixaLegivel (s) {
  const t = String(s ?? '')
  // Caixa alta com conectivo minúsculo ("PAVLOVA da ALEGRIA") também conta: o conectivo não decide a caixa.
  const semMiudas = t.replace(/\p{L}+/gu, (w) => (MIUDAS.has(w) ? '' : w))
  if (!/\p{Lu}/u.test(t) || /\p{Ll}/u.test(semMiudas)) return t
  return t.toLowerCase().replace(/[\p{L}\p{N}]+/gu, (w, i) => (i > 0 && MIUDAS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
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

/** 'AAAA-MM-DD' de hoje em Natal. */
export const hojeEmNatal = (agora = new Date()) => partesLocais(agora).data

/** Hora cheia de agora em Natal (0 a 23). */
export const horaEmNatal = (agora = new Date()) => Number(partesLocais(agora).hora.slice(0, 2))

/**
 * Período da edição para a placa e o texto: { texto: '5 a 15 de novembro', numero: '5 a 15', rotulo: 'de novembro' }.
 * Sem datas válidas em `edicao` ({ inicio, fim }), usa o texto `reserva` (mesma forma); sem os dois, null.
 */
export function periodoDaEdicao (edicao, reserva = '') {
  const de = diaIso(edicao?.inicio); const ate = diaIso(edicao?.fim)
  const texto = (de && ate ? periodoDoFestivalTexto(datasDoFestival(de, ate)).replace(/^(de|em) /, '') : '') || reserva
  const i = texto.lastIndexOf(' de ')
  if (i < 1) return null
  return { texto, numero: texto.slice(0, i), rotulo: texto.slice(i + 1) }
}

/**
 * Quando a avaliação abre, por extenso ('em 5 de novembro'): a data marcada (`avaliacao.abre_em`) ou, sem ela,
 * o primeiro dia do festival (§10.7: "abre em 5 de novembro"). Sem nenhuma das duas, ''.
 */
export function aberturaDaAvaliacao (dados) {
  const dia = diaIso(dados?.avaliacao?.abre_em) || diaIso(dados?.edicao?.inicio)
  return dia ? periodoDoFestivalTexto([dia]) : ''
}

/** Hoje está dentro do festival ({ inicio, fim } da edição)? Sem período, não. */
export function dentroDoFestival (periodo, agora = new Date()) {
  const de = diaIso(periodo?.inicio); const ate = diaIso(periodo?.fim)
  const hoje = hojeEmNatal(agora)
  return !!de && !!ate && hoje >= de && hoje <= ate
}

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

/** Até quantos minutos antes da abertura o combo "abre em breve" (pin do mapa e cartão da casa). */
export const JANELA_ABRE_EM_BREVE = 60

/** Minutos inteiros, hoje em Natal, até `hhmm` ('HH:MM'); negativo ou 0 = já passou. Hora inválida, `null`. */
export function minutosAte (hhmm, agora = new Date()) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ''))
  if (!m) return null
  const [h, min] = partesLocais(agora).hora.split(':').map(Number)
  return Number(m[1]) * 60 + Number(m[2]) - (h * 60 + min)
}

/**
 * `textoEstado` com a contagem regressiva: "Combo abre em 30 min" quando a abertura de hoje está a até JANELA_ABRE_EM_BREVE minutos
 * (o dado é confiável: vem da própria faixa do dia); fora disso, o texto de sempre. Horário indeterminado nunca vira contagem.
 */
export function textoEstadoAgora (e, agora = new Date()) {
  if (e?.estado === 'abre_hoje') {
    const min = minutosAte(e.as, agora)
    if (min !== null && min >= 1 && min <= JANELA_ABRE_EM_BREVE) return `Combo abre em ${min} min`
  }
  return textoEstado(e)
}

/**
 * O elenco no momento (vitrine da Entrada): casas com o combo disponível AGORA e casas que abrem ainda hoje. Mesma regra do Mapa
 * e dos filtros — `estadoAgora`, por UNIDADE: a casa conta como aberta se pelo menos uma unidade estiver atendendo com o combo.
 * Horário ausente ou não informado (`sem_horario`) nunca vira "aberta". Só vale DENTRO do festival (`periodo` = { inicio, fim }
 * da edição): antes e depois, `noFestival` é false e as listas ficam vazias — nada de prometer disponibilidade que não existe.
 * `comHorario`: alguma unidade tem horário cadastrado (sem isso o "nenhuma aberta" seria chute, e a tela diz "horários a confirmar").
 * Retorna { noFestival, comHorario, abertas: [{ p, ate }], abremHoje: [{ p, as }] } — `ate`/`as` em 'HH:MM'; `abremHoje` por horário.
 */
export function casasPorMomento (lista = [], agora = new Date(), periodo = null) {
  const noFestival = dentroDoFestival(periodo, agora)
  const resultado = { noFestival, comHorario: false, abertas: [], abremHoje: [] }
  if (!noFestival) return resultado
  for (const p of lista) {
    const estados = (p.unidades || []).map((u) => {
      if (u?.combo?.disponibilidade?.length) resultado.comHorario = true
      return estadoAgora(u, agora, periodo)
    })
    const abertas = estados.filter((e) => e.estado === 'aberto')
    if (abertas.length) { resultado.abertas.push({ p, ate: abertas.map((e) => e.ate).sort().pop() }); continue }
    const abre = estados.filter((e) => e.estado === 'abre_hoje').map((e) => e.as).sort()
    if (abre.length) resultado.abremHoje.push({ p, as: abre[0] })
  }
  resultado.abremHoje.sort((a, b) => a.as.localeCompare(b.as))
  return resultado
}

// ------------------------------------------------------------- busca e filtros
export const normalizar = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

function textoBusca (p) {
  const partes = [p.casa?.nome, p.combo?.nome, ...(p.combo?.itens || []).map((i) => i.nome),
    ...(p.unidades || []).map((u) => u.endereco?.bairro), ...(p.unidades || []).map((u) => u.nome)]
  return normalizar(partes.filter(Boolean).join(' '))
}

/**
 * Bairros das unidades com quantas casas têm unidade em cada um, do maior para o menor (empate: nome).
 * Bairro escrito de dois jeitos ("Capim Macio" · "Capim macio") vira um só, na grafia com mais maiúsculas;
 * casa com duas unidades no mesmo bairro conta uma vez.
 */
export function contarBairros (lista = []) {
  const bairros = new Map()
  const maiusculas = (s) => (s.match(/\p{Lu}/gu) || []).length
  for (const p of lista) {
    for (const u of p.unidades || []) {
      const nome = String(u.endereco?.bairro || '').trim()
      const k = normalizar(nome)
      if (!k) continue
      const b = bairros.get(k) || { bairro: nome, casas: new Set() }
      if (maiusculas(nome) > maiusculas(b.bairro)) b.bairro = nome
      b.casas.add(p.slug)
      bairros.set(k, b)
    }
  }
  return [...bairros.values()].map(({ bairro, casas }) => ({ bairro, casas: casas.size }))
    .sort((a, b) => b.casas - a.casas || a.bairro.localeCompare(b.bairro, 'pt-BR'))
}

/**
 * Opções de filtro que existem nos dados (nunca oferecer filtro vazio). Bairros como em `contarBairros`,
 * em ordem alfabética. `hoje` só existe com o `periodo` da edição e com hoje dentro dele.
 */
export function opcoesFiltro (lista = [], periodo = null, agora = new Date()) {
  const modos = new Set()
  for (const p of lista) {
    for (const u of p.unidades || []) {
      for (const [m] of MODOS) if (u.combo?.modos?.[m] === 'sim') modos.add(m)
    }
  }
  const algum = (chave) => lista.some((p) => veredito(p.combo?.itens, chave) === 'sim')
  return {
    bairros: contarBairros(lista).map((b) => b.bairro).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    modos: MODOS.filter(([k]) => modos.has(k)).map(([k]) => k),
    hoje: dentroDoFestival(periodo, agora),
    vegano: algum('vegano'),
    vegetariano: lista.some((p) => opcaoVegetariana(p.combo?.itens) !== 'nao'),
    semAcucar: algum('acucar'),
    semGluten: algum('gluten'),
    semLactose: algum('lactose'),
  }
}

/** Filtros: { q, bairro, modo, aberto, hoje, vegano, semAcucar, semGluten, semLactose }. */
export function filtrar (lista = [], f = {}, agora = new Date()) {
  const q = normalizar(f.q || '')
  const bairro = normalizar(f.bairro || '')
  return lista.filter((p) => {
    if (q && !q.split(/\s+/).every((t) => textoBusca(p).includes(t))) return false
    const us = p.unidades || []
    const itens = p.combo?.itens
    if (bairro && !us.some((u) => normalizar(u.endereco?.bairro || '') === bairro)) return false
    if (f.modo && !us.some((u) => u.combo?.modos?.[f.modo] === 'sim')) return false
    if (f.aberto && !us.some((u) => estadoAgora(u, agora).estado === 'aberto')) return false
    // "Com combo hoje": abre hoje e ainda não fechou (agora ou mais tarde).
    if (f.hoje && !us.some((u) => ['aberto', 'abre_hoje'].includes(estadoAgora(u, agora).estado))) return false
    if (f.vegano && veredito(itens, 'vegano') !== 'sim') return false
    if (f.vegetariano && opcaoVegetariana(itens) === 'nao') return false
    if (f.semAcucar && veredito(itens, 'acucar') !== 'sim') return false
    if (f.semGluten && !declaradoSem(itens, 'gluten')) return false
    if (f.semLactose && !declaradoSem(itens, 'lactose')) return false
    return true
  })
}

/** "Casa · Unidade" para listas fora da ficha; unidade com o mesmo nome da casa não repete o nome. */
/**
 * O nome da unidade SEM repetir o da casa (07/11/2026): "Mr. Cupcake - Garden - Candelária" da casa "Mr. Cupcake Confeitaria" vira
 * "Garden - Candelária" (o título fica "Mr. Cupcake Confeitaria · Garden - Candelária", não "… · Mr. Cupcake - Garden …").
 * Tira as PALAVRAS que abrem a unidade e já abrem o nome da casa (comparação sem acento nem caixa) e o separador que sobra.
 * Nome igual ao da casa (ou só o que a casa já diz) devolve ''. Só exibição: o dado não muda.
 */
export function nomeDaUnidade (p, u) {
  const nome = String(u?.nome ?? '').trim()
  const casa = String(p?.casa?.nome ?? '').trim()
  if (!nome || !casa) return nome
  const cw = casa.split(/\s+/)
  const uw = nome.split(/\s+/)
  let i = 0
  while (i < cw.length && i < uw.length && normalizar(cw[i]) === normalizar(uw[i])) i++
  if (i === 0) return nome
  return uw.slice(i).join(' ').replace(/^[\s\-–—·:,|]+/, '').trim()
}
export const tituloDaUnidade = (p, u) => {
  const n = nomeDaUnidade(p, u)
  return n ? `${p.casa.nome} · ${n}` : p.casa.nome
}

/**
 * A unidade atende SÓ por delivery: delivery "sim" e consumo no local e retirada declarados "não". Quem não respondeu
 * (nao_informado) não conta: dizer "só delivery" sem a casa ter dito é inventar. O cartão do mapa usa isto para não mandar a pessoa
 * até lá (sem "Como chegar" nem "Carimbar aqui").
 */
export const soDelivery = (u) => u?.combo?.modos?.delivery === 'sim' && u.combo.modos.local === 'nao' && u.combo.modos.retirada === 'nao'

/** Distância em linha reta (km) entre dois { lat, lng } — o que o Mapa mostra, dito assim. */
export function km (a, b) {
  const r = (x) => (x * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/**
 * Linhas do Mapa: uma por UNIDADE — bairro e "aberto agora" valem para a unidade, não para a casa.
 * f: { q, bairro, aberto, queroIr, jaFui }; marcas (painel do Sweet Lover): { rota: ids "quero ir", foi(p): casa visitada }.
 * Com `posicao`, ordena pela distância (sem coordenada no fim); sem, por bairro e casa.
 */
export function unidadesDoMapa (lista = [], f = {}, marcas = {}, { agora = new Date(), periodo = null, posicao = null } = {}) {
  const bairro = normalizar(f.bairro || '')
  const rota = marcas.rota || []
  const foiNa = marcas.foi || (() => false)
  return filtrar(lista, { q: f.q })
    .flatMap((p) => (p.unidades || []).map((u) => ({ p, u, quero: rota.includes(u.id), foi: foiNa(p) })))
    .filter(({ u, quero, foi }) => (!bairro || normalizar(u.endereco?.bairro || '') === bairro)
      && (!f.modo || u.combo?.modos?.[f.modo] === 'sim')
      && (!f.aberto || estadoAgora(u, agora, periodo).estado === 'aberto')
      && (!f.queroIr || quero) && (!f.jaFui || foi))
    .map((x) => ({ ...x, dist: posicao && x.u.coordenada ? km(posicao, x.u.coordenada) : null }))
    .sort((a, b) => (posicao ? (a.dist ?? Infinity) - (b.dist ?? Infinity) : 0)
      || (a.u.endereco?.bairro || '').localeCompare(b.u.endereco?.bairro || '', 'pt-BR')
      || a.p.casa.nome.localeCompare(b.p.casa.nome, 'pt-BR'))
}

/** Filtros <-> query string (o catálogo guarda o estado no endereço). */
export function filtrosDaBusca (search = '') {
  const q = new URLSearchParams(search)
  const sem = q.getAll('sem')
  return {
    q: q.get('q') || '', bairro: q.get('bairro') || '', modo: q.get('modo') || '',
    aberto: q.get('aberto') === '1', hoje: q.get('hoje') === '1', vegano: q.get('vegano') === '1', vegetariano: q.get('vegetariano') === '1',
    semAcucar: sem.includes('acucar'), semGluten: sem.includes('gluten'), semLactose: sem.includes('lactose'),
  }
}
export function buscaDosFiltros (f = {}) {
  const q = new URLSearchParams()
  if (f.q) q.set('q', f.q)
  if (f.bairro) q.set('bairro', f.bairro)
  if (f.modo) q.set('modo', f.modo)
  if (f.aberto) q.set('aberto', '1')
  if (f.hoje) q.set('hoje', '1')
  if (f.vegano) q.set('vegano', '1')
  if (f.vegetariano) q.set('vegetariano', '1')
  if (f.semAcucar) q.append('sem', 'acucar')
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

/**
 * "Rua, número" para mostrar: logradouro em caixa alta vira caixa de leitura, e o número que o cadastro
 * já repete no fim do logradouro ("AV … N 8880" + número 8880) não sai duas vezes. Só exibição.
 */
export function ruaEmLinha (e = {}) {
  const num = String(e.numero ?? '').trim()
  let rua = caixaLegivel(String(e.logradouro ?? '').trim())
  if (num) rua = rua.replace(new RegExp(`[\\s,]+(?:n[º°o.]?\\s*)?${num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '')
  return [rua, num].filter(Boolean).join(', ')
}

export function enderecoEmLinha (e = {}) {
  return [ruaEmLinha(e), e.complemento, e.bairro, [e.cidade, e.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ')
}

/**
 * Google Maps até a unidade. Coordenada só quando conferida pela organização: a aproximada do retrato
 * (`conferir`, Nominatim por rua ou número) poderia mandar o visitante para outro ponto da avenida, e o
 * endereço escrito acha melhor. Sem endereço, vale a coordenada que houver.
 */
export function linkComoChegar (u) {
  const c = u?.coordenada
  const e = u?.endereco || {}
  const texto = [ruaEmLinha(e), e.bairro, [e.cidade, e.uf].filter(Boolean).join(' - ')].filter(Boolean).join(', ')
  const destino = c && (!c.conferir || !texto) ? `${c.lat},${c.lng}` : texto
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

// ------------------------------------------------------------- fonte dos dados (DEV)
/**
 * De onde vem a edição. Produção: sempre a RPC. No DEV: ?demo=1 (demonstração) > retrato local do
 * painel (§10.9), se o arquivo existir nesta máquina > RPC. Pura: o teste decide sem navegador.
 */
export const escolherFonte = ({ dev = false, demo = false, retrato = false } = {}) => {
  if (!dev) return 'rpc'
  if (demo) return 'demo'
  return retrato ? 'retrato' : 'rpc'
}

/** "2026-10-28T01:17:34" => "28/10" (dia/mês da leitura do retrato; sem fuso, o texto já é de Natal). */
export const diaMesDoRetrato = (iso) => {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(iso || ''))
  return m ? `${m[2]}/${m[1]}` : ''
}

/**
 * Preço para comunicar como "o preço da edição": só existe quando TODOS os combos que declaram preço declaram o mesmo valor.
 * Com valores diferentes (ou nenhum) devolve null — a página não escolhe um combo como amostra.
 */
export function precoGeral (participantes) {
  const valores = new Set((participantes || []).map((p) => p?.combo?.preco).filter((v) => v !== null && v !== undefined && v !== '').map((v) => String(Number(v))))
  return valores.size === 1 ? [...valores][0] : null
}
