/*
 * Ficha geral do participante (15/10/2026) — lógica pura da "Visão do
 * participante", testada em tests/painel-app-ficha-geral.test.mjs.
 *
 * Quatro LEITURAS compõem a página; nenhuma grava nada (abrir a ficha não
 * marca mensagem como lida nem inicia fluxo):
 *   nucleo     get_ficha_360   marca, participação, itens, unidades (linhas),
 *                              sessões, pedidos, arquivos, temas propostos,
 *                              materiais, revisão de dados (já inclui
 *                              get_ficha_participacao — não pedir os dois)
 *   publicacao get_publicacao  camada Cartoon: montar_publico (componentes com
 *                              alergênicos e trocas, unidades com endereço e
 *                              horário), fotos, versão no ar, pendências
 *   correcoes  get_correcoes   alterações pedidas à marca
 *   edicoes    get_edicoes     tema GERAL da edição e qual é a atual
 *
 * Cada fonte tem estado próprio (carregando · ok · erro · sem_permissao ·
 * sem_participacao): erro nas fotos não apaga cadastro e combo, e erro nunca
 * vira "campo vazio".
 */
import { ALERGENICOS, CARACTERISTICAS, formatarPreco, horarioResumido } from '../../../src/edicao/dados/modelo.js'
import { estadoPublicacao, textoPublicacao, diferencas, traduzirPendencia, urlPublicaParticipante } from './publicacao.js'
import { camposObrigatorios, dadosDeLinhas, blocoDoCampo, CAMPOS_APONTAVEIS } from './guia.js'
import { rotulo } from './status.js'

const txt = (v) => (v == null ? '' : String(v).trim())
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios)

// ------------------------------------------------------------------ fontes
export const FONTES_FICHA = {
  nucleo: { rpc: 'get_ficha_360', rotulo: 'cadastro e operação', porParticipacao: true },
  publicacao: { rpc: 'get_publicacao', rotulo: 'combo, unidades e fotos desta edição', porParticipacao: true },
  correcoes: { rpc: 'get_correcoes', rotulo: 'alterações pedidas à marca', porParticipacao: true },
  edicoes: { rpc: 'get_edicoes', rotulo: 'edições', porParticipacao: false },
}

const semPermissao = (msg) => /nao_autorizado/.test(String(msg || ''))

/** Resposta de uma RPC → estado da fonte. `null` = a RPC negou (dado.ler) ou não achou. */
export function lerResposta(dados) {
  return dados == null
    ? { estado: 'sem_permissao', dados: null, erro: null }
    : { estado: 'ok', dados, erro: null }
}
export function lerFalha(e) {
  const msg = String((e && e.message) || e || '')
  return semPermissao(msg) ? { estado: 'sem_permissao', dados: null, erro: null } : { estado: 'erro', dados: null, erro: msg }
}

/**
 * Carregador das quatro fontes, com descarte de resposta velha: trocar de
 * participante (ou recarregar) invalida o que ainda estava em voo — nenhum
 * dado da marca anterior aparece sob o nome da seguinte.
 * `chamar(rpc, args)` → Promise; `aoMudar(fonte, estado, participacaoId)`.
 * `manter: true` (recarga depois de salvar) não volta a "carregando": o
 * conteúdo fica na tela até a resposta nova substituí-lo.
 * @returns {(participacaoId: string|null, opcoes?: {manter?: boolean}) => () => void}
 */
export function criarCarregadorFicha(chamar, aoMudar) {
  let vez = 0
  return function carregar(participacaoId, { manter = false } = {}) {
    const minha = ++vez
    for (const [fonte, def] of Object.entries(FONTES_FICHA)) {
      if (def.porParticipacao && !participacaoId) { aoMudar(fonte, { estado: 'sem_participacao', dados: null, erro: null }, participacaoId); continue }
      if (!manter) aoMudar(fonte, { estado: 'carregando', dados: null, erro: null }, participacaoId)
      Promise.resolve()
        .then(() => chamar(def.rpc, def.porParticipacao ? { p_participacao: participacaoId } : {}))
        .then((d) => { if (minha === vez) aoMudar(fonte, lerResposta(d), participacaoId) },
          (e) => { if (minha === vez) aoMudar(fonte, lerFalha(e), participacaoId) })
    }
    return () => { if (minha === vez) vez++ }
  }
}

// ------------------------------------------------------------------ edição
/** A edição da participação consultada, o tema geral e se ela é a atual. */
export function edicaoDaFicha(codigo, edicoes) {
  if (!codigo) return null
  const e = (edicoes || []).find((x) => x.codigo === codigo) || null
  return { codigo, nome: e ? txt(e.nome) : '', temaGeral: e ? txt(e.tema) : '', atual: e ? !!e.atual : null, inicio: e && e.festival_inicio, fim: e && e.festival_fim }
}

// ------------------------------------------------------------------ tema
const norm = (s) => txt(s).toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim()

/*
 * Tema da MARCA (não o tema geral da edição). Duas fontes, duas etapas:
 * `participacoes.tema_combo` é o que a marca escreveu por último; cada mudança
 * vira uma proposta em `temas_propostos` (gatilho temas_sincronizar), que a
 * curadoria aprova ou recusa. Quando as duas discordam (dado importado antes
 * do gatilho, por exemplo) a ficha diz isso em vez de escolher uma.
 */
export function situacaoTema(pa, temas) {
  const p = pa || {}
  const informado = txt(p.tema_combo)
  const proposta = (temas || []).find((t) => t.status !== 'substituido') || null
  const justificativa = txt(p.tema_justificativa) || txt(proposta && proposta.justificativa)
  if (!informado && !proposta) return { estado: 'sem_tema', tema: '', justificativa: '', proposta: null }
  if (!proposta) return { estado: 'sem_analise', tema: informado, justificativa, proposta: null }
  if (informado && norm(informado) !== norm(proposta.tema)) return { estado: 'divergente', tema: informado, temaProposta: txt(proposta.tema), justificativa, proposta }
  return { estado: proposta.status, tema: informado || txt(proposta.tema), justificativa, proposta }
}
export const TEXTO_TEMA = {
  sem_tema: 'Ainda não informado',
  sem_analise: 'Informado, sem análise registrada',
  divergente: 'Mudou depois da última proposta registrada',
  proposto: 'Proposto, aguardando análise',
  aprovado: 'Aprovado',
  recusado: 'Recusado: outro tema pedido',
}
export const TOM_TEMA = { sem_tema: 'neutro', sem_analise: 'neutro', divergente: 'atencao', proposto: 'andamento', aprovado: 'ok', recusado: 'atencao' }

// ------------------------------------------------------------------ dinheiro
/** Custo informado pela marca: vazio = não informado; 0 = sem custo. Nunca confundir os dois. */
export function textoCusto(v) {
  if (v == null || txt(v) === '') return 'Não informado'
  const n = Number(v)
  if (!isFinite(n)) return 'Não informado'
  return n === 0 ? 'Sem custo (R$ 0,00)' : formatarPreco(n)
}
/** Acréscimo de uma troca: ausente = não informado; 0 = sem custo. */
export function textoAcrescimo(v) {
  if (v == null || txt(v) === '') return 'Acréscimo não informado'
  const n = Number(v)
  return !isFinite(n) ? 'Acréscimo não informado' : n === 0 ? 'Sem acréscimo' : '+ ' + formatarPreco(n)
}

// ------------------------------------------------------------------ alimentar
export const ESTADO_ALIMENTAR = {
  contem: 'Contém', nao_contem: 'Não contém', pode_conter: 'Pode conter (contato cruzado)',
  nao_informado: 'A marca não soube informar', sim: 'Sim', nao: 'Não',
}
const PERGUNTA = { lactose: 'Contém lactose', vegano: 'Vegano', vegetariano: 'Vegetariano', acucar_adicionado: 'Açúcar adicionado' }

/*
 * Declarações de UM componente (ou de uma troca). Linha ausente = "Sem
 * resposta" — nunca "não contém". Leite (alergênico) e lactose (característica)
 * são perguntas diferentes e saem em listas diferentes.
 * `lista === null` = a camada não foi lida (erro ou sem permissão): devolve null.
 */
export function alimentarDoItem(lista) {
  if (lista === null) return null
  const por = Object.fromEntries((lista || []).map((d) => [d.aspecto, d]))
  const linha = (a, r) => {
    const d = por[a]
    return { aspecto: a, rotulo: r, estado: d ? d.estado : null, texto: d ? (ESTADO_ALIMENTAR[d.estado] || d.estado) : 'Sem resposta', observacao: txt(d && d.observacao) }
  }
  const alergenicos = ALERGENICOS.map(([a, r]) => linha(a, cap(r)))
  if (por.outro_alergenico) alergenicos.push(linha('outro_alergenico', 'Outro alergênico'))
  const caracteristicas = CARACTERISTICAS.map(([a]) => linha(a, PERGUNTA[a] || a))
  return {
    alergenicos, caracteristicas,
    respondidos: ALERGENICOS.filter(([a]) => por[a]).length,
    total: ALERGENICOS.length,
    contem: alergenicos.filter((x) => x.estado === 'contem').map((x) => x.observacao && x.aspecto === 'outro_alergenico' ? x.observacao : x.rotulo),
    podeConter: alergenicos.filter((x) => x.estado === 'pode_conter').map((x) => x.observacao && x.aspecto === 'outro_alergenico' ? x.observacao : x.rotulo),
  }
}

const DISPONIBILIDADE = { sempre: 'Sempre disponível', sob_consulta: 'Sob consulta', limitada: 'Limitada (até acabar)' }
const MODALIDADE = { local: 'consumo no local', retirada: 'retirada', delivery: 'delivery' }

/** Uma troca legível. `nomeUnidade(id_publico)` traduz as unidades. */
export function trocaLegivel(s, nomeUnidade = (x) => x) {
  return {
    original: txt(s.original), alternativa: txt(s.alternativa),
    disponibilidade: DISPONIBILIDADE[s.disponibilidade] || txt(s.disponibilidade) || 'Não informado',
    acrescimo: textoAcrescimo(s.acrescimo),
    comoSolicitar: txt(s.como_solicitar),
    modalidades: (s.modalidades || []).length ? s.modalidades.map((m) => MODALIDADE[m] || m).join(', ') : 'todas as formas de atendimento',
    unidades: (s.unidades || []).length ? s.unidades.map(nomeUnidade).join(', ') : 'todas as unidades',
    alimentar: s.alimentar ? alimentarDoItem(s.alimentar) : alimentarDoItem([]),
  }
}

// ------------------------------------------------------------------ componentes
const TIPO = { doce: 'Doce', salgado: 'Salgado', bebida: 'Bebida' }

/*
 * Componentes efetivamente cadastrados, na ordem REAL (posicao), com a
 * classificação de cada um — o item 2 pode ser doce. A camada Cartoon
 * (alergênicos, trocas, foto aprovada) vem de get_publicacao.atual, casada
 * por posição. `publicos === null` = camada não lida: alimentar/trocas = null.
 * Selos legados (vegano/sem glúten/sem lactose) e a substituição em texto são
 * de antes da camada Cartoon: saem marcados como registro antigo, nunca como
 * declaração confirmada.
 */
export function componentesDaFicha(itens, publicos, nomeUnidade) {
  const porPos = new Map((publicos || []).map((i) => [String(i.posicao), i]))
  return [...(itens || [])]
    .sort((a, b) => Number(a.posicao) - Number(b.posicao))
    .map((it) => {
      const pub = publicos ? porPos.get(String(it.posicao)) || {} : null
      const selos = [it.vegano && 'vegano', it.sem_gluten && 'sem glúten', it.sem_lactose && 'sem lactose'].filter(Boolean)
      return {
        id: it.id, posicao: it.posicao, tipo: it.tipo, rotuloTipo: TIPO[it.tipo] || 'Componente',
        nome: txt(it.nome), descricao: txt(it.descricao), ingredientes: txt(it.ingredientes),
        alimentar: pub ? alimentarDoItem(pub.alimentar || []) : null,
        trocas: pub ? (pub.substituicoes || []).map((s) => trocaLegivel(s, nomeUnidade)) : null,
        legado: { selos, substituicao: it.tem_substituicao ? txt(it.substituicao) : '' },
      }
    })
}

// ------------------------------------------------------------------ unidades
const RESPOSTA = { sim: 'Sim', nao: 'Não', nao_informado: 'Não informado' }
export const textoResposta = (v) => RESPOSTA[v] || 'Não informado'
const CANAL = { aplicativo: 'Aplicativo de entrega', whatsapp: 'WhatsApp', site: 'Site próprio' }

export function enderecoEmTexto(e) {
  if (!e) return ''
  const rua = [e.logradouro, e.numero].map(txt).filter(Boolean).join(', ')
  const comp = txt(e.complemento)
  const lugar = [txt(e.bairro), [txt(e.cidade), txt(e.uf)].filter(Boolean).join('/')].filter(Boolean).join(', ')
  return [[rua, comp].filter(Boolean).join(' · '), lugar].filter(Boolean).join(' — ')
}

/** Busca do mapa: coordenada conferida vale mais que endereço; endereço precisa de rua e bairro. */
export function consultaMapa(u) {
  if (u.coordenada && u.coordenada.estado === 'conferida') return u.coordenada.lat + ',' + u.coordenada.lng
  const e = u.endereco || {}
  if (!txt(e.logradouro) || !txt(e.bairro)) return ''
  return [[e.logradouro, e.numero].map(txt).filter(Boolean).join(', '), e.bairro, e.cidade || 'Natal', e.uf || 'RN'].map(txt).filter(Boolean).join(', ')
}
export const linkAbrirMapa = (q) => (q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '')
export const linkTrajeto = (q) => (q ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q) : '')

/*
 * Unidades da participação consultada, todas (inclusive as que não participam
 * desta edição). Três origens, cada dado na sua:
 *   pub.unidades       → lista completa + cadastro permanente (nome, rua, bairro,
 *                        cidade, coordenada e quem conferiu)
 *   linhas (360)       → condições DESTA edição (modos, canais, taxa, regiões,
 *                        observação) e os campos do cadastro anterior
 *   pub.atual.unidades → só as que participam: endereço completo, horário da
 *                        loja, horário do combo, WhatsApp autorizado
 * Sem get_publicacao (erro), cai nas linhas do 360, marcadas como cadastro anterior.
 */
export function unidadesDaFicha(linhas, pub) {
  const porId = new Map((linhas || []).map((l) => [l.id, l]))
  const publicas = new Map(((pub && pub.atual && pub.atual.unidades) || []).map((u) => [u.id, u]))
  const base = pub && Array.isArray(pub.unidades)
    ? pub.unidades.map((b) => ({ b, l: porId.get(b.participacao_unidade_id) || null }))
    : (linhas || []).map((l) => ({ b: null, l }))
  return base.map(({ b, l }, i) => {
    const p = b && b.participa ? publicas.get(b.id_publico) || null : null
    const e = (p && p.endereco) || {}
    const ll = l || {}
    const participa = b ? !!b.participa : ll.participa !== false
    const endereco = {
      logradouro: txt(e.logradouro) || txt(b && b.logradouro) || txt(ll.endereco),
      numero: txt(e.numero) || txt(b && b.numero), complemento: txt(e.complemento),
      bairro: txt(e.bairro) || txt(b && b.bairro) || txt(ll.bairro),
      cidade: txt(e.cidade) || txt(b && b.cidade), uf: txt(e.uf), referencia: txt(e.referencia),
    }
    const modosLinha = l ? { local: ll.consumo_local, retirada: ll.retirada, delivery: ll.delivery_combo } : null
    const modos = modosLinha || (p && p.combo && p.combo.modos) || { local: null, retirada: null, delivery: null }
    const canais = (l ? ll.canais_delivery : p && p.combo && p.combo.canais) || []
    const verificada = b && b.coordenada_verificada_em
    const coordenada = b && b.lat != null && b.lng != null
      ? { estado: verificada ? 'conferida' : 'a_conferir', lat: b.lat, lng: b.lng, por: txt(b.coordenada_verificada_por), em: b.coordenada_verificada_em }
      : { estado: 'sem', lat: null, lng: null }
    const u = {
      id: b ? b.participacao_unidade_id : ll.id, unidadeId: b ? b.unidade_id : ll.unidade_id, idPublico: b ? b.id_publico : ll.id_publico,
      nome: txt(b && b.nome) || txt(p && p.nome) || 'Unidade ' + (i + 1),
      participa, endereco, enderecoTexto: enderecoEmTexto(endereco),
      horarioLoja: txt(p && p.horario_loja),
      // null = não se aplica (não participa) ou não lido; [] = participa e não informou.
      horarioCombo: p ? horarioResumido((p.combo && p.combo.disponibilidade) || []) : null,
      modos: { local: modos.local || null, retirada: modos.retirada || null, delivery: modos.delivery || null },
      canais: (Array.isArray(canais) ? canais : []).filter((c) => c && (c.link || c.tipo)).map((c) => ({ rotulo: CANAL[c.tipo] || txt(c.tipo), link: txt(c.link) })),
      regioes: txt(ll.delivery_regioes) || txt(p && p.combo && p.combo.delivery_regioes),
      taxa: txt(ll.delivery_taxa) || txt(p && p.combo && p.combo.delivery_taxa),
      observacao: txt(ll.observacao_combo) || txt(p && p.combo && p.combo.observacao),
      whatsappPublico: txt(p && p.whatsapp),
      coordenada,
      // Campos do cadastro anterior à camada Cartoon (ainda gravados como espelho).
      anterior: { horarios: txt(ll.horarios), mesas: txt(ll.mesas), fazDelivery: !!ll.faz_delivery, soDelivery: !!ll.so_delivery },
      origemCompleta: !!b,
    }
    const q = consultaMapa(u)
    u.mapa = linkAbrirMapa(q)
    u.trajeto = linkTrajeto(q)
    return u
  })
}

// ------------------------------------------------------------------ fotos
const PAPEL = { combo_principal: 'Foto principal do combo', combo_galeria: 'Galeria do combo', item: 'Foto de componente', loja: 'Foto da loja' }
const ORDEM_PAPEL = { combo_principal: 0, item: 1, loja: 2, combo_galeria: 3 }

/** Caminhos de foto presentes numa versão publicada (conteudo de publicacoes). */
export function fotosPublicadas(conteudo) {
  const s = new Set()
  if (!conteudo) return s
  const add = (f) => { if (f && f.path) s.add(f.path) }
  const c = conteudo.combo || {}
  add(c.fotos && c.fotos.principal)
  for (const f of (c.fotos && c.fotos.galeria) || []) add(f)
  for (const i of c.itens || []) add(i.foto)
  for (const u of conteudo.unidades || []) for (const f of u.fotos || []) add(f)
  return s
}

/*
 * Fotos da participação, com papel REGISTRADO (nunca deduzido do nome do
 * arquivo) e três situações distintas: recebida (enviada), aprovada e
 * publicada (está na versão no ar). Ordem: principal, componentes, loja, galeria.
 */
export function fotosDaFicha(midias, pub, componentes, unidades) {
  const noAr = fotosPublicadas(pub && pub.vigente && pub.vigente.conteudo)
  const nomeItem = Object.fromEntries((componentes || []).map((c) => [c.id, c.rotuloTipo + (c.nome ? ': ' + c.nome : '')]))
  const nomeUni = Object.fromEntries((unidades || []).map((u) => [u.id, u.nome]))
  return [...(midias || [])]
    .sort((a, b) => (ORDEM_PAPEL[a.papel] ?? 9) - (ORDEM_PAPEL[b.papel] ?? 9) || Number(a.ordem || 0) - Number(b.ordem || 0))
    .map((m) => {
      const publicada = noAr.has(m.path)
      return {
        id: m.id, path: m.path, papel: m.papel, rotuloPapel: PAPEL[m.papel] || txt(m.papel),
        itemId: m.item_id || null, unidadeId: m.participacao_unidade_id || null,
        alvo: m.papel === 'item' ? nomeItem[m.item_id] || '' : m.papel === 'loja' ? nomeUni[m.participacao_unidade_id] || '' : '',
        principal: m.papel === 'combo_principal',
        estado: m.estado, publicada,
        situacao: publicada ? 'No ar' : m.estado === 'aprovada' ? 'Aprovada, ainda não publicada' : m.estado === 'enviada' ? 'Recebida, aguardando revisão' : m.estado === 'recusada' ? 'Recusada' : txt(m.estado),
        alt: txt(m.alt), credito: txt(m.credito), origem: m.origem === 'marca' ? 'Enviada pela marca' : 'Sessão oficial',
        largura: m.largura, altura: m.altura,
      }
    })
}
/** Quantas fotos mostrar de saída: as essenciais (principal, componentes, loja) e, se sobrar, até 6. */
export function fotosIniciais(fotos, minimo = 6) {
  const essenciais = fotos.filter((f) => f.papel !== 'combo_galeria').length
  return Math.max(essenciais, Math.min(minimo, fotos.length))
}

// ------------------------------------------------------------------ publicação
/*
 * Três conteúdos que não se confundem: o cadastro atual (pub.atual), a versão
 * no ar (pub.vigente) e a revisão (combo_status). O link só é "público" com
 * versão no ar; antes disso é endereço reservado.
 */
export function resumoPublicacao(pub) {
  if (!pub) return null
  const v = pub.vigente || null
  const linha = { ...pub, versao: v ? v.versao : pub.ultima && pub.ultima.versao, nivel: v && v.nivel }
  return {
    estado: estadoPublicacao(pub),
    texto: textoPublicacao(linha),
    versao: v ? v.versao : null,
    nivel: v ? v.nivel : null,
    publicadoEm: v ? v.publicado_em : null,
    publicadoPor: v ? txt(v.publicado_por) : '',
    link: v ? urlPublicaParticipante(pub.slug) : '',
    reservado: !v && pub.slug ? urlPublicaParticipante(pub.slug) : '',
    diferencas: v ? diferencas(v.conteudo, pub.atual).length : null,
    pendencias: (pub.pendencias || []).length,
    alterado: !!pub.alterado_apos_aprovacao,
    retirada: pub.estado === 'retirado' && pub.ultima ? { em: pub.ultima.retirado_em, por: txt(pub.ultima.retirado_por), motivo: txt(pub.ultima.motivo) } : null,
    comboStatus: pub.combo_status || null,
  }
}

// ------------------------------------------------------------------ navegação
export const SECOES_VISAO = [
  ['cadastro', 'Cadastro'], ['combo', 'Tema e combo'], ['unidades', 'Unidades'],
  ['fotos', 'Fotos'], ['operacao', 'Operação'], ['publicacao', 'Publicação'],
]
const SECAO_DO_BLOCO = { 0: 'cadastro', 1: 'combo', 2: 'combo', 3: 'combo', 4: 'unidades', 5: 'combo', 6: 'unidades', 7: 'fotos' }
export const secaoDoBloco = (b) => SECAO_DO_BLOCO[b] || 'cadastro'
const secaoDaPendencia = (c) => (/^unidade:|^sem_unidade$/.test(c) ? 'unidades' : 'combo')

// ------------------------------------------------------------------ pendências
const ROTULO_CAMPO = Object.fromEntries(CAMPOS_APONTAVEIS)

/*
 * Lista curta e concreta do que falta: o quê, em qual seção. Cada pendência
 * tem CHAVE estável — a mesma falta vinda de duas fontes conta uma vez (o
 * endereço que o cadastro antigo e a camada Cartoon cobram, por exemplo).
 * Fonte que não carregou vira um item "não consegui verificar", nunca
 * "nada pendente".
 */
export function pendenciasDaFicha({ participante, fontes, naoLidas = 0 }) {
  const out = new Map()
  const add = (chave, texto, secao, extra = {}) => { if (!out.has(chave)) out.set(chave, { chave, texto, secao, ...extra }) }
  const f = fontes || {}
  const nuc = f.nucleo || {}
  const pub = f.publicacao || {}
  const cor = f.correcoes || {}
  if (!participante || !participante.participacao_id) return []

  for (const [nome, fonte] of [['nucleo', nuc], ['publicacao', pub], ['correcoes', cor]]) {
    if (fonte.estado === 'erro') add('erro:' + nome, 'Não consegui verificar ' + FONTES_FICHA[nome].rotulo + '. As pendências de lá não aparecem aqui.', nome === 'publicacao' ? 'publicacao' : nome === 'correcoes' ? 'comunicacao' : 'cadastro', { erro: true, fonte: nome })
    if (fonte.estado === 'sem_permissao') add('sem:' + nome, 'Sua função não lê ' + FONTES_FICHA[nome].rotulo + '.', 'cadastro', { erro: true, fonte: nome })
  }

  const pubOk = pub.estado === 'ok' && pub.dados
  const codigos = pubOk ? (pub.dados.pendencias || []) : []
  // A camada Cartoon detalha unidade por unidade; o "endereço" do cadastro antigo vira redundante.
  const cartoonCobraUnidade = codigos.some((c) => c === 'sem_unidade' || /^unidade:.+:endereco$/.test(c))

  if (nuc.estado === 'ok' && nuc.dados) {
    const d = nuc.dados
    const pa = d.participacao || {}
    const lista = camposObrigatorios(dadosDeLinhas({ participante: d.marca || {}, participacao: pa, itens: d.itens || [], unidades: d.unidades || [] }))
    // Campos vazios: UMA pendência por seção (lista curta), com os nomes dos campos.
    const faltas = {}
    for (const c of lista) {
      if (c.ok) continue
      if (c.campo === 'unidade-endereco' && cartoonCobraUnidade) continue
      const s = secaoDoBloco(c.bloco)
      ;(faltas[s] = faltas[s] || []).push(c.rotulo)
    }
    for (const [s, nomes] of Object.entries(faltas)) {
      const mostra = nomes.length > 4 ? nomes.slice(0, 3).join(', ') + ' e mais ' + (nomes.length - 3) : nomes.join(', ')
      add('campos:' + s, (nomes.length === 1 ? 'Falta preencher: ' : 'Faltam ' + nomes.length + ' campos: ') + mostra, s, { campos: nomes })
    }
    for (const s of d.solicitacoes || []) if (s.estado !== 'respondido') add('pedido:' + s.id, 'Pedido sem resposta: ' + txt(s.titulo), 'operacao')
    for (const r of d.pendencias || []) add('revisao:' + r.id, 'Dado para conferir: ' + txt(r.titulo), 'operacao')
    const tema = situacaoTema(pa, d.temas)
    if (tema.estado === 'proposto') add('tema:analise', 'Tema "' + tema.tema + '" aguardando análise', 'combo')
    if (tema.estado === 'divergente') add('tema:divergente', 'Tema mudou para "' + tema.tema + '" e a proposta registrada é "' + tema.temaProposta + '"', 'combo')
    if (tema.estado === 'recusado') add('tema:recusado', 'Outro tema pedido: aguardando a marca', 'combo')
    if (pa.combo_status === 'em_analise') add('combo:revisao', 'Combo enviado, aguardando revisão', 'operacao')
    if (pa.combo_status === 'correcao_solicitada') add('combo:ajuste', 'Ajuste pedido no combo: aguardando a marca', 'combo')
  }

  if (pubOk) {
    const p = pub.dados
    const ctx = { unidades: p.unidades, itens: p.atual && p.atual.combo && p.atual.combo.itens }
    for (const c of codigos) add('pub:' + c, traduzirPendencia(c, ctx), secaoDaPendencia(c))
    const recebidas = (p.midias || []).filter((m) => m.estado === 'enviada').length
    if (recebidas) add('fotos:revisao', plural(recebidas, 'foto aguardando revisão', 'fotos aguardando revisão'), 'fotos')
    for (const u of p.unidades || []) {
      if (u.participa && !u.coordenada_verificada_em && txt(u.logradouro)) add('coord:' + u.participacao_unidade_id, 'Unidade ' + (u.nome || u.bairro || u.id_publico) + ': localização no mapa a conferir', 'unidades')
    }
    const r = resumoPublicacao(p)
    if (r.estado === 'alteracao_em_analise') add('pub:alterado', 'Alteração feita depois da versão no ar (v' + r.versao + ')', 'publicacao')
    else if (p.combo_status === 'aprovado' && !r.pendencias && !(r.estado === 'publicado' && r.nivel === 'marca_e_combo')) add('pub:aprovado', 'Combo aprovado, ainda não publicado no site', 'publicacao')
  }

  if (cor.estado === 'ok') {
    for (const c of cor.dados || []) {
      if (c.estado === 'resolvida') continue
      add('correcao:' + c.id, 'Alteração pedida em ' + (ROTULO_CAMPO[c.campo] || c.campo) + ': aguardando a marca', secaoDoBloco(blocoDoCampo(c.campo)))
    }
  }
  if (naoLidas > 0) add('mensagens', plural(naoLidas, 'mensagem nova da marca', 'mensagens novas da marca'), 'comunicacao')
  return [...out.values()]
}

// ------------------------------------------------------------------ permissões
/*
 * Ações de cada seção, pela função de quem lê. O banco decide de novo em cada
 * RPC (pode()); isto só evita oferecer o que vai ser recusado.
 * Cada ação abre um editor EXISTENTE (`editor`), no lugar da seção.
 */
export function acoesDaSecao(secao, pode, ctx = {}) {
  const p = typeof pode === 'function' ? pode : () => false
  const a = (editor, rotuloAcao, principal = false) => ({ editor, rotulo: rotuloAcao, principal })
  if (secao === 'cadastro') return p('cadastro.editar') ? [a('cadastro', 'Editar dados da marca', true)] : []
  if (secao === 'combo') {
    return [
      p('cadastro.editar') && a('combo', 'Editar tema e componentes', true),
      p('curadoria.decidir') && ctx.temaEstado === 'proposto' && a('operacao', 'Analisar tema'),
      p('curadoria.decidir') && ctx.comboStatus === 'em_analise' && a('operacao', 'Revisar combo'),
    ].filter(Boolean)
  }
  if (secao === 'unidades') {
    return [
      p('cadastro.editar') && a('unidades', 'Editar unidades', true),
      p('producao.gerir') && ctx.temPublicacao && a('coordenadas', 'Conferir localização'),
    ].filter(Boolean)
  }
  if (secao === 'fotos') return (p('producao.gerir') || p('curadoria.decidir')) && ctx.temPublicacao ? [a('fotos', 'Revisar fotos', true)] : []
  if (secao === 'operacao') {
    const gere = p('pagamento.gerir') || p('producao.gerir') || p('curadoria.decidir')
    return [a('operacao', gere ? 'Gerenciar operação' : 'Ver detalhes da operação', gere)]
  }
  if (secao === 'publicacao') return ctx.temPublicacao ? [a('publicacao', p('curadoria.decidir') ? 'Gerenciar publicação' : 'Ver publicação e diferenças', p('curadoria.decidir'))] : []
  return []
}

// ------------------------------------------------------------------ cabeçalho
/** Os quatro processos, cada um com o seu estado — nunca um status único. */
export function processosDaFicha(participante, fontes) {
  const p = participante || {}
  const nuc = fontes && fontes.nucleo
  const pub = fontes && fontes.publicacao
  const pa = nuc && nuc.estado === 'ok' && nuc.dados ? nuc.dados.participacao || {} : null
  const tema = pa ? situacaoTema(pa, nuc.dados.temas) : null
  const r = pub && pub.estado === 'ok' ? resumoPublicacao(pub.dados) : null
  const lendo = (f) => !f || f.estado === 'carregando'
  return [
    { chave: 'cadastro', rotulo: 'Cadastro', texto: rotulo('cadastro', p.status_cadastro || 'sem_participacao'), dominio: 'cadastro', valor: p.status_cadastro || 'sem_participacao' },
    { chave: 'tema', rotulo: 'Tema', texto: tema ? TEXTO_TEMA[tema.estado] : lendo(nuc) ? 'Carregando…' : 'Não verificado', tom: tema ? TOM_TEMA[tema.estado] : 'neutro' },
    { chave: 'combo', rotulo: 'Combo', texto: p.combo_status ? rotulo('combo', p.combo_status) : 'Sem combo', dominio: p.combo_status ? 'combo' : null, valor: p.combo_status, tom: p.combo_status ? undefined : 'neutro' },
    { chave: 'publicacao', rotulo: 'Site', texto: r ? r.texto : lendo(pub) ? 'Carregando…' : 'Não verificado', dominio: r ? 'publicacao' : null, valor: r && r.estado, tom: r ? undefined : 'neutro' },
  ]
}
