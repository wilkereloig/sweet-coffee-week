/*
 * Publicação da edição (Cartoon 2026.2, lado da organização) — lógica pura,
 * testada em tests/painel-app-publicacao.test.mjs.
 *
 * Contrato do banco: supabase/migrations/20261014_cartoon_02_publicacao.sql e
 * _03_revisao.sql. O banco decide (pode(), CHECKs de edicao_publicacao); aqui
 * só se traduz, compara e explica antes de a pessoa clicar.
 */
import { rotuloAspecto, formatarPreco, formatarDia } from '../../../src/edicao/dados/modelo.js'

export const URL_SITE_PARTICIPANTE = 'https://www.sweetcoffeeweek.com.br/cartoon/participantes/'
export const urlPublicaParticipante = (slug) => (slug ? URL_SITE_PARTICIPANTE + slug : '')

// ------------------------------------------------------------- estado de publicação
/** Chave no domínio `publicacao` de status.js. Publicada com alteração depois da aprovação = "alteração em análise". */
export function estadoPublicacao(linha) {
  const e = (linha && (linha.estado_publicacao || linha.estado)) || 'nao_publicado'
  if (e === 'publicado' && linha.alterado_apos_aprovacao) return 'alteracao_em_analise'
  return e
}

/** "Publicada v3", "Publicada v1 (só a casa)", "Retirada do site (v2)", "Não publicada". */
export function textoPublicacao(linha) {
  const e = (linha && (linha.estado_publicacao || linha.estado)) || 'nao_publicado'
  const v = linha && linha.versao
  if (e === 'publicado') return 'Publicada v' + v + (linha.nivel === 'marca' ? ' (só a casa)' : '') + (linha.alterado_apos_aprovacao ? ' · alteração em análise' : '')
  if (e === 'retirado') return 'Retirada do site' + (v ? ' (v' + v + ')' : '')
  return 'Não publicada'
}

export const FILTROS_PUBLICACAO = [
  ['', 'Todas'],
  ['em_analise', 'Aguardando revisão'],
  ['alterado', 'Alterado após aprovação'],
  ['aprovado_sem_publicar', 'Aprovado sem publicar'],
  ['publicado', 'Publicadas'],
  ['retirado', 'Retiradas'],
]

/** Filtro da lista de publicação (linhas de get_publicacoes_edicao). */
export function filtrarPublicacoes(lista, filtro) {
  const ok = {
    em_analise: (l) => l.combo_status === 'em_analise',
    alterado: (l) => !!l.alterado_apos_aprovacao,
    // "Sem publicar" = o combo não está no ar: nunca publicada, retirada ou só a casa.
    aprovado_sem_publicar: (l) => l.combo_status === 'aprovado' && !(l.estado_publicacao === 'publicado' && l.nivel === 'marca_e_combo'),
    publicado: (l) => l.estado_publicacao === 'publicado',
    retirado: (l) => l.estado_publicacao === 'retirado',
  }[filtro]
  return (lista || []).filter(ok || (() => true))
}

/** O botão "Publicar casa e combo" só acende quando o banco aceitaria. */
export const podePublicarCombo = (pub) => !!pub && pub.combo_status === 'aprovado' && (pub.pendencias || []).length === 0

// ------------------------------------------------------------- pendências
const TIPO = { doce: 'Doce', salgado: 'Salgado', bebida: 'Bebida' }
const nomeUnidade = (id, unidades) => {
  const u = (unidades || []).find((x) => x.id_publico === id || x.id === id)
  return u ? 'Unidade ' + (u.nome || u.bairro || id) : 'Unidade ' + id
}
const nomeItem = (pos, itens) => {
  const i = (itens || []).find((x) => String(x.posicao) === String(pos))
  if (!i) return 'Componente ' + pos
  return (TIPO[i.tipo] || 'Componente') + (i.nome ? ' "' + i.nome + '"' : ' ' + pos)
}

/**
 * Código estável de pendencias_publicacao() → frase. `unidades` = get_publicacao.unidades
 * (ou atual.unidades); `itens` = atual.combo.itens.
 */
export function traduzirPendencia(codigo, { unidades, itens } = {}) {
  const c = String(codigo || '')
  if (c === 'combo_nome') return 'O combo ainda não tem nome.'
  if (c === 'sem_unidade') return 'Nenhuma unidade marcada como participante.'
  if (c === 'participacao_nao_encontrada') return 'Participação não encontrada.'
  let m = /^unidade:([^:]+):(endereco|modos|canais|horario)$/.exec(c)
  if (m) {
    const u = nomeUnidade(m[1], unidades)
    return u + ': ' + {
      endereco: 'endereço incompleto (rua, bairro e cidade).',
      modos: 'consumo no local, retirada e delivery do combo precisam de resposta (sim ou não).',
      canais: 'faz delivery do combo, mas nenhum canal de pedido foi informado.',
      horario: 'sem horário do combo nos dias do festival.',
    }[m[2]]
  }
  m = /^item:([^:]+):alimentar$/.exec(c)
  if (m) return nomeItem(m[1], itens) + ': faltam respostas sobre alergênicos (todos os 8 precisam de resposta, "não sei" vale).'
  return c.replace(/[_:]/g, ' ')
}

// ------------------------------------------------------------- diferença vigente × atual
const ESTADO_AL = { contem: 'contém', nao_contem: 'não contém', pode_conter: 'pode conter', nao_informado: 'não informado', sim: 'sim', nao: 'não' }
const RESPOSTA = { sim: 'sim', nao: 'não', nao_informado: 'não informado' }
const DISP = { sempre: 'sempre', sob_consulta: 'sob consulta', limitada: 'limitada' }
const CANAL = { aplicativo: 'Aplicativo', whatsapp: 'WhatsApp', site: 'Site' }

const txt = (v) => (v == null ? '' : String(v).trim())
const alimentar = (lista) => (lista || [])
  .map((d) => rotuloAspecto(d.aspecto) + ': ' + (ESTADO_AL[d.estado] || d.estado) + (d.observacao ? ' (' + d.observacao + ')' : '')).join('; ')
const substituicoes = (lista) => (lista || []).map((s) => [
  txt(s.original) + ' → ' + txt(s.alternativa),
  [DISP[s.disponibilidade] || s.disponibilidade, s.acrescimo && 'acréscimo ' + s.acrescimo, s.como_solicitar,
    (s.modalidades || []).length && 'em ' + s.modalidades.join(', '), (s.unidades || []).length && 'unidades ' + s.unidades.join(', '),
    (s.alimentar || []).length && alimentar(s.alimentar)].filter(Boolean).join(', '),
].filter(Boolean).join(' — ')).join('; ')
const endereco = (e) => {
  if (!e) return ''
  const rua = [e.logradouro, e.numero, e.complemento].filter(Boolean).join(', ')
  const lugar = [e.bairro, [e.cidade, e.uf].filter(Boolean).join('/')].filter(Boolean).join(', ')
  return [rua, lugar].filter(Boolean).join(' — ') + (e.referencia ? ' (' + e.referencia + ')' : '')
}
const fotos = (lista) => (lista || []).map((f) => f.path).join('; ')

/**
 * Campos legíveis de um conteúdo público (montar_publico), em ordem de leitura.
 * Cada um tem chave estável — é o que a diferença compara.
 */
export function camposPublicos(c) {
  const out = []
  if (!c) return out
  const add = (chave, rotulo, valor) => out.push({ chave, rotulo, valor: txt(valor) })
  const casa = c.casa || {}
  add('casa.nome', 'Casa · nome', casa.nome)
  add('casa.apresentacao', 'Casa · apresentação', casa.apresentacao)
  add('casa.instagram', 'Casa · Instagram', casa.instagram)
  add('casa.site', 'Casa · site', casa.site)
  add('casa.logo', 'Casa · logo', casa.logo && casa.logo.path)

  const combo = c.combo
  if (combo) {
    add('combo.nome', 'Combo · nome', combo.nome)
    add('combo.descricao', 'Combo · descrição', combo.descricao)
    add('combo.condicoes', 'Combo · condições', combo.condicoes)
    add('combo.preco', 'Combo · preço', formatarPreco(combo.preco))
    add('combo.foto', 'Combo · foto principal', combo.fotos && combo.fotos.principal && combo.fotos.principal.path)
    add('combo.galeria', 'Combo · galeria', fotos(combo.fotos && combo.fotos.galeria))
    for (const i of combo.itens || []) {
      const k = 'item.' + i.posicao
      const r = (TIPO[i.tipo] || 'Componente') + ' (' + i.posicao + 'º)'
      add(k + '.nome', r + ' · nome', i.nome)
      add(k + '.descricao', r + ' · descrição', i.descricao)
      add(k + '.ingredientes', r + ' · ingredientes', i.ingredientes)
      add(k + '.alimentar', r + ' · alergênicos e características', alimentar(i.alimentar))
      add(k + '.substituicoes', r + ' · substituições', substituicoes(i.substituicoes))
      add(k + '.foto', r + ' · foto', i.foto && i.foto.path)
    }
  }

  for (const u of c.unidades || []) {
    const k = 'unidade.' + u.id
    const r = 'Unidade ' + (u.nome || (u.endereco && u.endereco.bairro) || u.id)
    add(k + '.nome', r + ' · nome', u.nome)
    add(k + '.endereco', r + ' · endereço', endereco(u.endereco))
    add(k + '.coordenada', r + ' · localização no mapa', u.coordenada && u.coordenada.lat + ', ' + u.coordenada.lng)
    add(k + '.whatsapp', r + ' · WhatsApp', u.whatsapp)
    add(k + '.horario_loja', r + ' · horário da loja', u.horario_loja)
    add(k + '.fotos', r + ' · fotos da loja', fotos(u.fotos))
    const cb = u.combo
    if (cb) {
      const m = cb.modos || {}
      add(k + '.modos', r + ' · atendimento do combo',
        'Consumo no local: ' + (RESPOSTA[m.local] || '—') + ' · Retirada: ' + (RESPOSTA[m.retirada] || '—') + ' · Delivery: ' + (RESPOSTA[m.delivery] || '—'))
      add(k + '.canais', r + ' · canais de delivery', (cb.canais || []).map((x) => (CANAL[x.tipo] || x.tipo) + (x.link ? ' (' + x.link + ')' : '')).join('; '))
      add(k + '.delivery_regioes', r + ' · regiões de entrega', cb.delivery_regioes)
      add(k + '.delivery_taxa', r + ' · taxa de entrega', cb.delivery_taxa)
      add(k + '.observacao', r + ' · observação do combo', cb.observacao)
      add(k + '.disponibilidade', r + ' · horário do combo', (cb.disponibilidade || [])
        .map((d) => formatarDia(d.data) + ' ' + d.abre + '–' + d.fecha + (d.observacao ? ' (' + d.observacao + ')' : '')).join('; '))
    }
  }
  return out
}

/**
 * O que mudou entre a versão no ar (`antes`) e o que seria publicado agora
 * (`depois`), campo a campo. Campo vazio dos dois lados não aparece.
 * @returns {{chave:string, rotulo:string, antes:string, depois:string}[]}
 */
export function diferencas(antes, depois) {
  const velhos = new Map(camposPublicos(antes).map((c) => [c.chave, c]))
  const res = []
  for (const c of camposPublicos(depois)) {
    const v = velhos.get(c.chave)
    const a = v ? v.valor : ''
    velhos.delete(c.chave)
    if (a !== c.valor) res.push({ chave: c.chave, rotulo: c.rotulo, antes: a, depois: c.valor })
  }
  for (const v of velhos.values()) if (v.valor) res.push({ chave: v.chave, rotulo: v.rotulo, antes: v.valor, depois: '' })
  return res
}

// ------------------------------------------------------------- interruptores da edição
export const FASES = [
  ['preparacao', 'Preparação'],
  ['pre_lancamento', 'Pré-lançamento'],
  ['em_andamento', 'Em andamento'],
  ['encerrada', 'Encerrada'],
]

export const CHAVES_EDICAO = [
  { chave: 'participantes_publicos', rotulo: 'Participantes no site', efeito: 'Ligada, o catálogo mostra as casas que têm versão publicada.' },
  { chave: 'combos_publicos', rotulo: 'Combos no site', efeito: 'Ligada, a seção do combo aparece nas casas publicadas com o combo.' },
  { chave: 'avaliacao_aberta', rotulo: 'Avaliação aberta', efeito: 'Ligada, o site aceita avaliações, e só dentro da janela abaixo.' },
  { chave: 'resultados_publicos', rotulo: 'Resultados no site', efeito: 'Ligada, a premiação mostra os vencedores gravados.' },
]

/**
 * Espelho dos 3 CHECKs de edicao_publicacao: devolve o motivo da primeira
 * regra violada pelo estado `c`, ou null se o banco aceitaria.
 */
export function problemaChaves(c) {
  if (!c) return null
  if (c.combos_publicos && !c.participantes_publicos) return 'Os combos só aparecem com os participantes no site: ligue os participantes antes (ou desligue os combos primeiro).'
  if (c.avaliacao_aberta) {
    if (c.fase !== 'em_andamento') return 'A avaliação só abre com a edição em andamento.'
    if (!c.avaliacao_abre_em || !c.avaliacao_fecha_em) return 'Defina quando a avaliação abre e fecha antes de abri-la.'
    if (new Date(c.avaliacao_fecha_em) <= new Date(c.avaliacao_abre_em)) return 'O fim da avaliação precisa ser depois do início.'
    if (c.resultados_publicos) return 'Os resultados só são publicados com a avaliação fechada.'
  }
  return null
}

/** Motivo para a mudança `mudanca` não poder ser aplicada a `c` (null = pode). */
export const bloqueioMudanca = (c, mudanca) => problemaChaves({ ...c, ...mudanca })

// Fortaleza é UTC−3 o ano todo (sem horário de verão desde 2001).
// ponytail: deslocamento fixo; se o Ceará voltar a ter horário de verão, trocar por Intl.
const FORTALEZA_MS = -3 * 3600e3

/** timestamptz (ISO) → valor de <input type="datetime-local"> no horário de Fortaleza. */
export function paraLocalFortaleza(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!isFinite(t)) return ''
  return new Date(t + FORTALEZA_MS).toISOString().slice(0, 16)
}

/** Valor de datetime-local (horário de Fortaleza) → ISO com fuso, ou null. */
export function deLocalFortaleza(v) {
  if (!v || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null
  return v + ':00-03:00'
}

// ------------------------------------------------------------- coordenadas e mapa
export const CAIXA_NATAL = { latMin: -6.30, latMax: -5.55, lngMin: -35.55, lngMax: -34.95 }
const num = (v) => {
  const s = String(v == null ? '' : v).trim().replace(',', '.')
  return s === '' || !/^-?\d+(\.\d+)?$/.test(s) ? NaN : Number(s)
}

/**
 * Lê latitude e longitude digitadas (vírgula ou ponto decimal). Aceita o par
 * colado inteiro no primeiro campo ("-5.8123, -35.2012", como o Google Maps copia).
 * @returns {{lat:number, lng:number} | {erro:string}}
 */
export function lerCoordenada(lat, lng) {
  let a = lat, b = lng
  const par = /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(String(lat || ''))
  if (par && !String(lng || '').trim()) { a = par[1]; b = par[2] }
  const la = num(a), ln = num(b)
  if (!isFinite(la) || !isFinite(ln)) return { erro: 'Informe latitude e longitude em números (ex.: -5.8123 e -35.2012).' }
  const k = CAIXA_NATAL
  if (la < k.latMin || la > k.latMax || ln < k.lngMin || ln > k.lngMax) {
    return { erro: 'Esse ponto fica fora da região de Natal. Confira se latitude e longitude não estão trocadas.' }
  }
  return { lat: la, lng: ln }
}

/** Link do Google Maps: pela coordenada, se houver; senão pelo endereço. */
export function linkMapa(u) {
  if (!u) return ''
  const q = u.lat != null && u.lng != null ? u.lat + ',' + u.lng
    : [[u.logradouro, u.numero].filter(Boolean).join(', '), u.bairro, u.cidade || 'Natal', 'RN'].filter(Boolean).join(', ')
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q)
}

// ------------------------------------------------------------- slug e fotos
export const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const validarSlug = (s) => (SLUG_VALIDO.test(String(s || '')) ? null
  : 'Use só letras minúsculas sem acento, números e hífen entre as palavras (ex.: cafe-da-praca).')

export const PAPEIS_MIDIA = [
  ['combo_principal', 'Foto principal do combo'],
  ['combo_galeria', 'Galeria do combo'],
  ['item', 'Foto de um componente'],
  ['loja', 'Foto da loja'],
]
export const BUCKET_EDICAO = 'edicao-publico'
/** Caminho no bucket edicao-publico: <edição>/<participação>/<uuid>.webp */
export const caminhoMidia = (edicao, participacaoId, uuid) => edicao + '/' + participacaoId + '/' + uuid + '.webp'
export const ALT_MAXIMO = 160
export const CREDITO_MAXIMO = 80

/** Aprovar foto exige texto alternativo (o site usa como alt da imagem). */
export const motivoNaoAprovar = (m) => (!m || !txt(m.alt) ? 'Escreva o texto alternativo antes de aprovar: é o que o leitor de tela lê no site.' : null)

// ------------------------------------------------------------- erros
const ERROS = [
  [/combo_nao_aprovado/, 'O combo ainda não foi aprovado: publique só a casa, ou aprove o combo na aba Operação.'],
  [/motivo_obrigatorio/, 'Escreva o motivo da retirada: a marca recebe esse texto.'],
  [/nada_publicado/, 'Esta casa não tem versão no ar para retirar.'],
  [/nome_sem_slug/, 'O nome da casa não gera um endereço válido. Defina o endereço público antes de publicar.'],
  [/participacao_encerrada/, 'A participação está encerrada e não pode ser publicada.'],
  [/nivel_invalido/, 'Nível de publicação inválido.'],
  [/unidade_nao_encontrada/, 'Unidade não encontrada.'],
  [/midia_nao_encontrada/, 'Foto não encontrada. Atualize a página.'],
  [/estado_invalido/, 'Situação de foto inválida.'],
  [/campo_invalido/, 'Campo não permitido nesta tela.'],
  [/edicao_publicacao.*check|check constraint.*edicao_publicacao/i, 'Combinação de chaves não permitida.'],
  [/slug_publico.*check|check constraint.*slug/i, 'Endereço público inválido: só letras minúsculas, números e hífen.'],
  [/duplicate key.*slug|participacoes_slug_publico_edicao/i, 'Esse endereço já é usado por outra casa desta edição.'],
  [/alt.*check|check constraint.*midias_participacao/i, 'Texto alternativo até 160 caracteres e crédito até 80.'],
  [/bucket_invalido|caminho_invalido/, 'O servidor ainda não aceita fotos da edição (a função arquivo-url precisa liberar o bucket edicao-publico).'],
]
/** Código do banco desta camada → frase; o resto passa intacto (o traduzirErro de ui.jsx cuida). */
export function traduzirErroPublicacao(msg) {
  const m = String(msg || '')
  for (const [re, frase] of ERROS) if (re.test(m)) return frase
  return m
}

// ------------------------------------------------------------- avaliações
/** Chaves de critério presentes nas linhas de get_avaliacoes_resumo, na ordem em que aparecem. */
export function criteriosDe(linhas) {
  const vistos = []
  for (const l of linhas || []) for (const k of Object.keys(l.medias || {})) if (!vistos.includes(k)) vistos.push(k)
  return vistos
}
export const rotuloCriterio = (k) => { const s = String(k || '').replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1) }
export const media = (v) => (v == null || v === '' || !isFinite(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
