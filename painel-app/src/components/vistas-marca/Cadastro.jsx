import React from 'react'
import { Icone } from '../Icone'
import { LogoEditor } from '../LogoEditor'
import { api, registrarPendente, subirLogo, seFaltar, emVerComo } from '../../lib/marcaApi'
import { registrarPendencia, sinalizarMudancaExterna, limparMudancaExterna } from '../../lib/pendencias'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import * as MC from '../../lib/cadastroMescla'
import { mascaraWhatsApp, validarWhatsApp } from '../../lib/participantes'
import { camposObrigatorios, progressoCampos, vistaDoBloco } from '../../lib/guia'
import { datasDoFestival, linhasCanonicas, mesmasLinhas } from '../../lib/horarioFestival'
import { Carregando, Erro, Vazio, Selo, traduzirErro } from '../ui'
import { VistaCabeca } from '../VistaCabeca'
import { AvisoMudancaExterna } from '../AvisoMudancaExterna'
import {
  TIPOS, ROTULO_TIPO, ROTULO_POSICAO, itensEmOrdem,
  precoNumero, blocoCompleto, valorInformado, custosDeLinhas, primeiroBlocoPendente,
} from '../../lib/cadastro'
import * as E from '../../lib/edicaoMarca'
import { EstadoCampo, EstadoBloco, Correcao, GrupoPublico, Opcional, Contador } from './edicao/campos'
import { Unidades } from './edicao/Unidades'
import { Atendimento } from './edicao/Atendimento'
import { Alimentar } from './edicao/Alimentar'
import { EstadoPublicacao } from './edicao/Envio'
import { ConcluirSozinho } from './edicao/ConcluirSozinho'
import '../../styles/edicao-marca.css'

/*
 * Vista "Cadastro" da marca — porte de public/painel/index.html (#mvCadastro,
 * ~1504-1628) + carregar/carregarParticipacao/preencher/desenharItens/
 * desenharUnidades/desenharSessoes/desenharVagas/reservarVaga/progresso/
 * acordeão/autosave (~4855-5634). Sem DOM: todo campo é controlado
 * por estado React; a lógica de completude vive em lib/cadastro.js e, para a
 * camada de edição (Cartoon 2026.2), em lib/edicaoMarca.js.
 *
 * A marca só SALVA (23/10/2026, pedido do Wilker): não há "enviar", revisão
 * antes do envio nem prévia. O banco (migration 20261106_marca_salvar_avisa)
 * avisa a organização de toda alteração salva e, quando o cadastro fica
 * completo, o passa sozinho para a conferência dela.
 *
 * O resumo (situação, progresso e "salvo") fica preso ao topo da rolagem:
 * os blocos são longos, e quem preenche precisa ver o progresso e o
 * salvamento sem voltar ao início.
 */

const ICONE_BLOCO = ['bloco-marca', 'bloco-tema', 'bloco-itens', 'bloco-preco', 'bloco-local', 'informacao', 'atendimento']

/*
 * Cabeçalho do bloco = UM <button> (sem controle dentro): número da aba, título, a situação em palavras
 * (E.estadoDoBloco) e, recolhido, um resumo do que já tem. O número é LOCAL da aba — Meu cadastro 1·2·3,
 * Meu combo 1·2·3·4 —, mas o índice (data-bloco, bloco-N, links) segue o de sempre.
 */
function Bloco({ indice, numero, aberto, completo, estado, resumo, proximo, onToggle, onContinuar, children }) {
  const t = E.TITULOS_BLOCO[indice]
  return (
    <div className={'mc-bloco' + (aberto ? ' is-aberto' : '') + (completo ? ' is-pronto' : '')} data-bloco={indice}>
      <button type="button" className="mc-bloco__cabeca" aria-expanded={aberto} aria-controls={'bloco-' + indice} onClick={onToggle}>
        <span className="mc-bloco__disco" aria-hidden="true">
          <Icone nome={ICONE_BLOCO[indice]} tamanho={24} />
        </span>
        <span className="em-bloco__col">
          <span className="mc-bloco__texto"><b>{numero ? numero + ' · ' : ''}{t.titulo}</b>{aberto && <span>{t.sub}</span>}</span>
          <span className="em-bloco__linha">
            <EstadoBloco e={estado} />
            {!aberto && resumo && <span className="em-bloco__resumo">{resumo}</span>}
          </span>
        </span>
        <Icone nome="abrir" tamanho={16} className="mc-bloco__chevron" />
      </button>
      <div className="mc-bloco__corpo" id={'bloco-' + indice} hidden={!aberto}>
        {children}
        {/* Só navega: abre a próxima seção depois de gravar o que está na fila. No último bloco o botão é o
            "Salvar" do fim do formulário, logo abaixo (dois "Salvar" colados confundiriam). */}
        {proximo && (
          <div className="em-continuar">
            <button className="acao secundaria" type="button" onClick={onContinuar}>
              {'Continuar: ' + proximo}<Icone nome="seta-direita" tamanho={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const rolarPara = (el) => {
  if (!el) return
  const quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' })
}

const MARCA_VAZIA = { nome_marca: '', responsavel: '', telefone: '', email: '', instagram: '', site: '', cnpj: '', razao_social: '', apresentacao_publica: '' }
const TEMA_VAZIO = { tema_combo: '', tema_justificativa: '' }
const COMBO_VAZIO = { combo_nome: '', combo_descricao: '', combo_condicoes: '' }
// Vegano/diet do combo inteiro e o texto "sobre o delivery" saíram (camada de
// edição): viraram declarações por item (bloco 5) e modos por unidade (bloco 6).
// "Para viagem" segue: decide se o custo da embalagem é pedido.
const EXTRAS_VAZIO = { combo_para_viagem: null, combo_proposta: '' }
const ROTULO_TEMA_STATUS = { proposto: 'Tema recebido — em análise pela organização.', aprovado: 'Tema aprovado pela organização.', recusado: 'A organização pediu outro tema.' }
const temTexto = (v) => String(v == null ? '' : v).trim() !== ''
const ouNulo = (v) => String(v == null ? '' : v).trim() || null

/*
 * Linha do banco → estado da tela, e estado da tela → corpo do PATCH. A mesma
 * conta, aplicada ao que o servidor devolveu, é a "foto" do que está gravado
 * (baseRef): cada salvamento manda só o que mudou desde ela, para não
 * escrever por cima, com o valor lido na abertura, o que a organização
 * editou com a tela aberta.
 */
const marcaDeLinha = (p) => ({
  nome_marca: p.nome_marca || '', responsavel: p.responsavel || '', telefone: p.telefone || '',
  email: p.email || '', instagram: p.instagram || '', site: p.site || '', cnpj: p.cnpj || '',
  razao_social: p.razao_social || '', apresentacao_publica: p.apresentacao_publica || '',
})
// O nome da marca NÃO vai no corpo: ele é o login dela (§10.4-b) e só a
// organização o muda.
// `camposMarca`/`camposParticipacao` são consts nomeadas de propósito:
// tests/painel-infra confere cada chave contra o grant de UPDATE.
function corpoMarca(marca) {
  const camposMarca = {
    responsavel: marca.responsavel.trim(), telefone: marca.telefone.trim(),
    email: marca.email.trim(), instagram: marca.instagram.trim(), site: marca.site.trim(),
    cnpj: marca.cnpj.trim(), razao_social: marca.razao_social.trim(),
    apresentacao_publica: ouNulo(marca.apresentacao_publica),
  }
  return camposMarca
}
const paraStr = (n) => (n == null ? '' : String(n).replace('.', ','))
const numeroOuNulo = (s) => (valorInformado(s) ? precoNumero(s) : null)
const participacaoDeLinha = (pa) => ({
  tema: { tema_combo: pa.tema_combo || '', tema_justificativa: pa.tema_justificativa || '' },
  combo: { combo_nome: pa.combo_nome || '', combo_descricao: pa.combo_descricao || '', combo_condicoes: pa.combo_condicoes || '' },
  // Valor do combo é da organização (edicoes.valor_combo); a marca informa os custos.
  custosStr: { embalagem: paraStr(pa.custo_embalagem), delivery: paraStr(pa.custo_delivery) },
  extras: { combo_para_viagem: pa.combo_para_viagem ?? null, combo_proposta: pa.combo_proposta || '' },
})
function corpoParticipacao({ tema, combo, custosStr, extras }) {
  const camposParticipacao = {
    tema_combo: tema.tema_combo.trim(), tema_justificativa: tema.tema_justificativa.trim(),
    combo_nome: ouNulo(combo.combo_nome), combo_descricao: ouNulo(combo.combo_descricao), combo_condicoes: ouNulo(combo.combo_condicoes),
    custo_embalagem: numeroOuNulo(custosStr.embalagem), custo_delivery: numeroOuNulo(custosStr.delivery),
    combo_para_viagem: extras.combo_para_viagem, combo_proposta: extras.combo_proposta.trim() || null,
  }
  return camposParticipacao
}
// Os selos vegano/sem glúten/sem lactose e a substituição em texto são legado:
// deixaram de ser escritos (bloco 5 os substitui, 03-modelo-de-dados §3.4–3.5).
function pedidoItem(i) {
  return {
    caminho: 'participantes_itens?id=eq.' + i.id,
    corpo: {
      nome: (i.nome || '').trim(), descricao: (i.descricao || '').trim(),
      ...(i.posicao === 2 ? { tipo: i.tipo } : {}),
    },
  }
}
// PATCH só com as colunas que mudaram desde a foto `antes`. Nada mudou →
// nem chama a rede, e conta como confirmado (`[true]`). `bloqueados` = colunas em
// conflito com a organização (19/10/2026): ficam de fora até a pessoa escolher.
function patchMudancas(caminho, corpo, antes, bloqueados) {
  const mudou = {}
  for (const k of Object.keys(corpo)) {
    if (bloqueados && bloqueados.has(k)) continue
    if (!antes || JSON.stringify(corpo[k]) !== JSON.stringify(antes[k])) mudou[k] = corpo[k]
  }
  if (!Object.keys(mudou).length) return Promise.resolve([true])
  return api(caminho, { metodo: 'PATCH', corpo: mudou, prefer: 'return=representation' })
}
const linha = (l) => (l && l[0] && typeof l[0] === 'object' ? l[0] : null)
// PATCH que volta vazio = a RLS recusou a linha: não é "salvo".
const vazio = (l) => !l || !l.length
const REPR = 'return=representation'
const baseDeclaracao = (x) => E.corpoDeclaracao({ estado: x.estado, observacao: x.observacao || '' })
const baseSubstituicao = (x) => E.corpoSubstituicao(E.substituicaoDeLinha(x))
const baseUnidade = (x) => E.corpoUnidade(E.unidadeDeLinhas(null, x))

// Foto do que o servidor confirmou (baseRef): uma por entidade, no espaço do corpo do PATCH.
const baseVazia = () => ({ marca: null, participacao: null, itens: {}, un: {}, pu: {}, decl: {}, sub: {} })
// Só o que a tela mostra das unidades guardadas (sugestões): atualizar o resto não precisa renderizar de novo.
const assinaturaPermanentes = (rs) => JSON.stringify((rs || []).map((r) => [r.id, r.nome_unidade, r.bairro, r.logradouro, r.numero]))
// As conversões acima (donas do contrato do grant) emprestadas à mesclagem pura.
const MAPAS = { marcaDeLinha, corpoMarca, participacaoDeLinha, corpoParticipacao, pedidoItem }

/*
 * TUDO o que o cadastro mostra, numa foto só. A abertura da tela e a releitura silenciosa
 * (sincronização, 19/10/2026) leem por esta mesma função: uma fonte só para "o que o
 * servidor tem agora". `edicao` e `tema` são complementos — se a leitura falhar, vêm
 * `undefined` ("não li") e a tela fica com o que já mostra. `unRows === null` na foto
 * original = as tabelas da camada de edição ainda não existem (`novo: false`).
 */
async function lerSnapshot() {
  const linhas = await api('participantes?select=*&order=created_at.desc')
  if (!linhas || !linhas.length) return { tipo: 'sem_marca' }
  const p = linhas[0]
  const pas = await api('participacoes?select=*&order=created_at.desc&limit=1')
  const pa = (pas && pas[0]) || null
  if (!pa) return { tipo: 'sem_participacao', p }
  const [itensRows, puRows, unRows, edicao, tema] = await Promise.all([
    api('participantes_itens?select=*&participacao_id=eq.' + pa.id),
    api('participacao_unidades?select=*&participacao_id=eq.' + pa.id + '&order=ordem'),
    api('unidades?select=*&participante_id=eq.' + p.id + '&order=criado_em').catch(seFaltar(null)),
    pa.edicao_codigo
      ? api('edicoes?select=valor_combo,festival_inicio,festival_fim&codigo=eq.' + encodeURIComponent(pa.edicao_codigo)).then((e) => (e && e[0]) || {}).catch(() => undefined)
      : Promise.resolve(null),
    api('temas_propostos?select=status,tema,observacao&participacao_id=eq.' + pa.id + '&status=neq.substituido&order=created_at.desc&limit=1')
      .then((t) => (t && t[0]) || null).catch(() => undefined),
  ])
  const novo = unRows !== null
  const listaItens = itensRows || []
  const listaPu = puRows || []
  const ids = (xs) => xs.map((x) => x.id).join(',')
  const [declRows, subRows] = novo
    ? await Promise.all([
      listaItens.length ? api('declaracoes_alimentares?select=*&item_id=in.(' + ids(listaItens) + ')') : [],
      listaItens.length ? api('substituicoes?select=*&item_id=in.(' + ids(listaItens) + ')&order=ordem,criado_em') : [],
    ])
    : [[], []]
  // O horário no festival já vem na linha da unidade da edição (participacao_unidades.horario_festival).
  return {
    tipo: 'ok', p, pa, edicao, tema, novo, itensRows: listaItens, puRows: listaPu, unRows: unRows || [],
    declRows: declRows || [], subRows: subRows || [],
  }
}

/*
 * Meu cadastro = blocos 0, 4 e 6; Meu combo = 1, 2, 3 e 5. Mesmo formulário,
 * mesmo salvamento automático, mesmo "Salvar". Os blocos 5 e 6
 * (camada de edição) entram na aba a que pertencem (vistaDoBloco) sem que
 * quem monta a vista precise listá-los.
 */
export function Cadastro({ alvo, consumirAlvo, irPara, blocos = [0, 1, 2, 3, 4], resumo = null, recarregarResumo } = {}) {
  const mostra = (n) => blocos.includes(n) || ((n === 5 || n === 6) && blocos.some((b) => vistaDoBloco(b) === vistaDoBloco(n)))
  const visiveis = [0, 1, 2, 3, 4, 5, 6].filter(mostra)
  const adaptadorLogo = React.useMemo(() => ({
    carregar: () => api('rpc/marca_minha_logo', { metodo: 'POST', corpo: {} }),
    subir: (path, blob, mime) => subirLogo(path, blob, mime),
    definir: (dados) => api('rpc/marca_definir_logo', { metodo: 'POST', corpo: { p_dados: dados } }),
    usarAcervo: () => api('rpc/marca_usar_logo_acervo', { metodo: 'POST', corpo: {} }),
    manter: () => api('rpc/marca_manter_logo', { metodo: 'POST', corpo: {} }),
  }), [])
  const ehCombo = !mostra(0)
  const [extras, setExtras] = React.useState(EXTRAS_VAZIO)
  const [revisao, setRevisao] = React.useState({ tema: null })
  // Situação do combo vem do resumo (relido depois de cada salvamento e a cada aviso da organização): aprovar,
  // pedir ajuste ou o banco passar o cadastro completo para a conferência aparece aqui sem remontar a tela.
  const comboResumo = resumo && resumo.combo ? resumo.combo : null
  const comboStatus = (comboResumo && comboResumo.status) || 'rascunho'
  const comboNota = comboResumo ? comboResumo.nota : null
  const [carregando, setCarregando] = React.useState(true)
  const [erroCarregar, setErroCarregar] = React.useState(null) // { titulo, texto, tentar }
  const [tentativa, setTentativa] = React.useState(0)
  const [semParticipacao, setSemParticipacao] = React.useState(false)

  const [participanteId, setParticipanteId] = React.useState(null)
  const [participacaoId, setParticipacaoId] = React.useState(null)
  const [edicaoCodigo, setEdicaoCodigo] = React.useState('')
  const [statusCadastro, setStatusCadastro] = React.useState('')

  const [marca, setMarca] = React.useState(MARCA_VAZIA)
  const [tema, setTema] = React.useState(TEMA_VAZIO)
  const [combo, setCombo] = React.useState(COMBO_VAZIO)
  const [custosStr, setCustosStr] = React.useState({ embalagem: '', delivery: '' })
  const [valorCombo, setValorCombo] = React.useState(undefined)
  const [festival, setFestival] = React.useState({ inicio: null, fim: null })
  const [itens, setItens] = React.useState([])
  const [unidades, setUnidades] = React.useState([])
  // Para quem pergunta "há horário incompleto?" fora do render (registro de trabalho pela metade).
  const horarioPendenteRef = React.useRef(false)
  horarioPendenteRef.current = unidades.some((u) => u._horarioPendente)
  const [permanentes, setPermanentes] = React.useState([]) // unidades permanentes da marca
  const [declaracoes, setDeclaracoes] = React.useState({})
  const [substituicoes, setSubstituicoes] = React.useState([])
  const [pub, setPub] = React.useState(null)
  // As tabelas da camada de edição só existem com as migrations de 14/10/2026.
  // Sem elas o cadastro antigo segue abrindo, e os blocos novos dizem por quê.
  const [modeloNovo, setModeloNovo] = React.useState(true)
  // Custos que se aplicam (cadastro.js · custosFaltando): embalagem se pode ser
  // para viagem; delivery se alguma unidade entrega O COMBO.
  const custos = {
    viagem: extras.combo_para_viagem === true, delivery: unidades.some((u) => u.participa && u.delivery_combo === 'sim'),
    embalagemStr: custosStr.embalagem, deliveryStr: custosStr.delivery,
  }

  const [blocoAberto, setBlocoAberto] = React.useState(0)
  const [salvoTexto, setSalvoTexto] = React.useState('')
  const [erroSalvar, setErroSalvar] = React.useState(null)
  // Gravação em voo: só para o rótulo "Salvando…".
  const [salvando, setSalvando] = React.useState(false)

  const timerRef = React.useRef(null)
  const salvarJaRef = React.useRef(false) // "Salvar" mudou a tela (WhatsApp antigo): grava assim que ela renderizar
  const emVooRef = React.useRef(0) // quantas gravações estão em voo agora (salvarEmOrdem)
  const resumoRef = React.useRef(resumo) // o resumo mais recente, para a abertura (efeito que não re-roda)
  const salvarRef = React.useRef(() => Promise.resolve())
  const tempSeqRef = React.useRef(0)
  // Linhas com POST em voo e ids já devolvidos pelo servidor (por chave
  // local): o estado React só vê o id depois do próximo render.
  const postandoRef = React.useRef(new Set())
  const idsRef = React.useRef(new Map()) // declarações e trocas: chave → id
  const idsUnRef = React.useRef(new Map()) // unidade: chave → unidades.id
  const idsPuRef = React.useRef(new Map()) // unidade: chave → { puId, id_publico }
  const removidasRef = React.useRef(new Set()) // removidas com o POST ainda em voo
  // Há edição que ainda não foi confirmada pelo servidor (debounce correndo
  // ou última gravação falhou).
  const pendenteRef = React.useRef(false)
  // Foto do que o servidor tem gravado (ver patchMudancas).
  const baseRef = React.useRef(baseVazia())
  // Gravação em voo (uma por vez, ver salvarEmOrdem).
  const vooRef = React.useRef(null)

  /* Sincronização com a organização (19/10/2026). A releitura é silenciosa e MESCLA (lib/cadastroMescla):
     o digitado nunca é trocado; o que a pessoa não tocou acompanha o servidor; o mesmo campo editado dos
     dois lados vira conflito e ela escolhe. Nada aqui grava — quem grava é o salvamento da pessoa. */
  const vivoRef = React.useRef(null)                 // a tela agora (atribuída a cada render)
  const prontoRef = React.useRef(false)              // a abertura terminou
  const pedidoCargaRef = React.useRef(false)         // chegou aviso durante a abertura
  const ciclosRef = React.useRef(0)                  // sobe no começo e no fim de toda gravação
  const adiadoRef = React.useRef(false)              // releitura descartada por causa de uma gravação
  const recarregarRef = React.useRef(null)
  const conflitosRef = React.useRef({})              // conflitos abertos: ui → { ent, id, chave, meu, deles, … }
  const orfasRef = React.useRef(new Set())           // linhas que a organização removeu e a pessoa edita: não são mais gravadas
  const esquecidasRef = React.useRef(new Set())      // ids que a PESSOA removeu (DELETE em voo): não ressuscitam
  const dispensadasRef = React.useRef(new Set())     // avisos de "removida" que a pessoa dispensou (a linha fica na tela, sem gravar)
  const [externo, setExterno] = React.useState({ conflitos: {}, adotados: {} })
  const guarda = useGuarda()
  const guardaPub = useGuarda()
  resumoRef.current = resumo
  vivoRef.current = {
    marca, tema, combo, custosStr, extras, itens, unidades, declaracoes, substituicoes,
    edicaoCodigo, statusCadastro, valorCombo, festival, permanentes, modeloNovo, participanteId, participacaoId, semParticipacao,
  }

  function unidadeVazia() {
    tempSeqRef.current += 1
    return { ...E.unidadeDeLinhas(null, null), _key: 'novo-' + tempSeqRef.current }
  }

  const carregarPub = React.useCallback((id) => {
    if (!id) return
    api('rpc/marca_minha_publicacao', { metodo: 'POST', corpo: { p_participacao: id } }).then(setPub).catch(() => setPub(null))
  }, [])

  // ── Carregar ──────────────────────────────────────────────────────────────
  // A abertura (e a troca de participação) sobrescreve a tela inteira; a releitura silenciosa da
  // sincronização, mais abaixo, lê pela MESMA `lerSnapshot` mas só mescla.
  React.useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const snap = await lerSnapshot()
        if (cancelado) return
        if (snap.tipo === 'sem_marca') {
          setErroCarregar({ titulo: 'Conta sem marca', texto: 'Sua conta existe, mas ainda não há marca vinculada a ela. Fale com a organização.', tentar: false })
          setCarregando(false)
          return
        }
        const p = snap.p
        baseRef.current = baseVazia()
        setErroCarregar(null)
        setParticipanteId(p.id)
        const marcaInicial = marcaDeLinha(p)
        setMarca(marcaInicial)
        baseRef.current.marca = corpoMarca(marcaInicial)
        if (snap.tipo === 'sem_participacao') {
          setSemParticipacao(true)
          setParticipacaoId(null)
          setCarregando(false)
          prontoRef.current = true
          return
        }
        const pa = snap.pa
        setSemParticipacao(false)
        setParticipacaoId(pa.id)
        setEdicaoCodigo(pa.edicao_codigo || '')
        setStatusCadastro(pa.status_cadastro || '')
        const daParticipacao = participacaoDeLinha(pa)
        setTema(daParticipacao.tema)
        setCombo(daParticipacao.combo)
        setCustosStr(daParticipacao.custosStr)
        const ed = snap.edicao // undefined = a leitura falhou: o valor fica "a definir"
        setValorCombo(ed ? ed.valor_combo ?? null : null)
        setFestival({ inicio: ed ? ed.festival_inicio || null : null, fim: ed ? ed.festival_fim || null : null })
        setExtras(daParticipacao.extras)
        baseRef.current.participacao = corpoParticipacao(daParticipacao)
        setRevisao({ tema: snap.tema || null })

        const { novo, itensRows: listaItens, puRows: listaPu, unRows: listaUn, declRows, subRows } = snap
        const doBanco = listaPu.map((pu) => E.unidadeDeLinhas(pu, listaUn.find((u) => u.id === pu.unidade_id)))
        // Sem unidade nesta edição: com unidades guardadas, elas viram sugestão;
        // sem nenhuma, a tela mostra uma em branco para preencher.
        const listaUnidades = doBanco.length || listaUn.length ? doBanco : [unidadeVazia()]
        const subs = subRows.map(E.substituicaoDeLinha)
        setModeloNovo(novo)
        setItens(listaItens)
        setUnidades(listaUnidades)
        setPermanentes(listaUn)
        setDeclaracoes(E.declaracoesPorItem(declRows))
        setSubstituicoes(subs)
        const base = baseRef.current
        base.itens = Object.fromEntries(listaItens.map((i) => [i.id, pedidoItem(i).corpo]))
        base.un = Object.fromEntries(listaUn.map((u) => [u.id, baseUnidade(u)]))
        base.pu = Object.fromEntries(listaPu.map((r) => [r.id, E.corpoParticipacaoUnidadeDeLinha(r)]))
        base.decl = Object.fromEntries(declRows.map((d) => [d.id, baseDeclaracao(d)]))
        base.sub = Object.fromEntries(subRows.map((s) => [s.id, baseSubstituicao(s)]))
        if (novo) carregarPub(pa.id)
        // Abre o primeiro bloco pendente DESTA aba (ou o primeiro dela).
        const dados = {
          marca: { nome_marca: p.nome_marca || '', responsavel: p.responsavel || '', telefone: p.telefone || '' },
          tema: daParticipacao.tema, itens: listaItens, unidades: listaUnidades, custos: custosDeLinhas(pa, listaPu),
        }
        const contagem = novo
          ? E.contarPorBloco(E.pendenciasEdicao({ comboNome: pa.combo_nome, unidades: listaUnidades, itens: listaItens, declaracoes: E.declaracoesPorItem(declRows) }))
          : {}
        const pend = primeiroBlocoPendente(dados)
        const vis = [0, 1, 2, 3, 4, 5, 6].filter(mostra)
        // Correção pedida pela organização vem antes de campo vazio (se o resumo já chegou).
        const corrigir = ((resumoRef.current && resumoRef.current.pendencias) || []).find((p) => p.tipo === 'correcao' && vis.includes(Number(p.bloco)))
        setBlocoAberto(corrigir ? Number(corrigir.bloco)
          : vis.includes(pend) ? pend
            : vis.find((n) => (n <= 4 && !blocoCompleto(n, dados)) || contagem[n]) ?? vis[0])
        setCarregando(false)
        prontoRef.current = true
        // Aviso que chegou enquanto a tela abria: a foto pode ser mais velha que ele.
        if (pedidoCargaRef.current) {
          pedidoCargaRef.current = false
          if (recarregarRef.current) recarregarRef.current({ dominios: [], refs: [], origens: ['local'] }).catch(() => {})
        }
      } catch (e) {
        if (cancelado) return
        if (e && e.message === 'sessao_expirada') return
        setErroCarregar({ titulo: 'Não consegui carregar o cadastro', texto: e && e.message, tentar: true })
        setCarregando(false)
      }
    })()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativa])

  // ── Autosave (debounce 900ms, mesmo tempo do arquivo estático) ───────────
  const salvar = React.useCallback(async () => {
    if (!participanteId || !participacaoId) return false
    // Baixa a pendência ANTES do voo: o que for digitado enquanto este
    // salvamento corre volta a marcá-la, e o "Salvo" não mente sobre isso.
    pendenteRef.current = false
    const base = baseRef.current
    // Conflito aberto = a pessoa ainda não escolheu: a coluna NÃO vai no PATCH. Linha que a
    // organização removeu e a pessoa edita (órfã) deixa de ser gravada. (19/10/2026)
    const conf = conflitosRef.current
    const orfas = orfasRef.current
    const bloq = (ent, id) => MC.bloqueadasDe(conf, ent, id)
    const marcarUnidade = (k, mudanca) => setUnidades((prev) => prev.map((y) => (y._key === k ? { ...y, ...mudanca } : y)))

    // Unidade = duas linhas: a permanente (unidades) e a desta edição
    // (participacao_unidades). A nova nasce em dois POST, nessa ordem.
    // Campo inválido não vai no PATCH (o campo mostra o erro): o "Salvo" tem que dizer o que ficou de fora.
    const omitidos = new Set()
    function salvarUnidade(u, ordem) {
      const k = u._key
      for (const c of E.camposInvalidosDaUnidade(u)) omitidos.add(c)
      const unId = u.unId || idsUnRef.current.get(k)
      const pu = u.puId ? { puId: u.puId } : idsPuRef.current.get(k)
      if (pu && orfas.has('pu:' + pu.puId)) return Promise.resolve([true]) // a organização tirou esta unidade da edição
      if (unId && pu) {
        return Promise.all([
          patchMudancas('unidades?id=eq.' + unId, E.corpoUnidade(u), base.un[unId], bloq('un', unId)).then((l) => {
            const x = linha(l)
            if (x) {
              base.un[x.id] = baseUnidade(x)
              // Endereço mudou → o banco tira a conferência do mapa; a tela acompanha.
              if (!!x.coordenada_verificada_em !== u.verificada) marcarUnidade(k, { verificada: !!x.coordenada_verificada_em })
            }
            return l
          }),
          patchMudancas('participacao_unidades?id=eq.' + pu.puId, E.corpoParticipacaoUnidade(u, ordem), base.pu[pu.puId], bloq('pu', pu.puId)).then((l) => {
            const x = linha(l)
            if (x) base.pu[x.id] = E.corpoParticipacaoUnidadeDeLinha(x)
            return l
          }),
        ]).then(([a, b]) => (vazio(a) || vazio(b) ? [] : [true]))
      }
      // Unidade vazia não vira linha — a tela sempre mostra uma em branco. A
      // já guardada (sugestão aceita) entra direto.
      if (!unId && !temTexto(u.logradouro)) return Promise.resolve([true])
      // POST já em voo para esta unidade (rede lenta, segundo autosave antes do
      // id voltar): não cria outra linha — a próxima rodada faz PATCH.
      if (postandoRef.current.has(k)) return Promise.resolve([true])
      postandoRef.current.add(k)
      const passo1 = unId
        ? Promise.resolve(unId)
        : api('unidades', { metodo: 'POST', corpo: { participante_id: participanteId, ...E.corpoUnidade(u) }, prefer: REPR }).then((l) => {
          const x = linha(l)
          if (!x) throw new Error('sem_confirmacao')
          idsUnRef.current.set(k, x.id)
          base.un[x.id] = baseUnidade(x)
          setPermanentes((prev) => [...prev, x])
          marcarUnidade(k, { unId: x.id })
          return x.id
        })
      return passo1
        .then((id) => {
          if (removidasRef.current.has(k)) { removidasRef.current.delete(k); return null }
          return api('participacao_unidades', {
            metodo: 'POST', corpo: { participacao_id: participacaoId, unidade_id: id, ...E.corpoNovaParticipacaoUnidade(u, ordem) }, prefer: REPR,
          })
        })
        .then((l) => {
          if (l === null) return [true]
          const x = linha(l)
          if (!x) return l
          if (removidasRef.current.has(k)) {
            removidasRef.current.delete(k)
            api('participacao_unidades?id=eq.' + x.id, { metodo: 'DELETE' }).catch(() => {})
            return l
          }
          idsPuRef.current.set(k, { puId: x.id, id_publico: x.id_publico })
          base.pu[x.id] = E.corpoParticipacaoUnidadeDeLinha(x)
          marcarUnidade(k, { puId: x.id, id_publico: x.id_publico })
          // O horário não vai no INSERT (a coluna só tem grant de UPDATE). Se a tela já tem um — unidade que a organização tirou
          // da edição e a pessoa manteve —, grava agora, num PATCH que só leva o que difere da linha recém-criada.
          if (!mesmasLinhas(u.horario_festival, x.horario_festival)) {
            return patchMudancas('participacao_unidades?id=eq.' + x.id, E.corpoParticipacaoUnidade(u, ordem), base.pu[x.id])
              .then((m) => { const y = linha(m); if (y) base.pu[y.id] = E.corpoParticipacaoUnidadeDeLinha(y); return m })
          }
          return l
        })
        .finally(() => postandoRef.current.delete(k))
    }

    // Linha filha sem id: POST uma vez (guardado por chave); com id: PATCH do que mudou.
    function salvarFilha({ k, id, ent, tabela, corpo, extra, aoVoltar, aoCriar }) {
      if (id && orfas.has(ent + ':' + id)) return Promise.resolve([true])
      if (id) return patchMudancas(tabela + '?id=eq.' + id, corpo, base[aoVoltar.base][id], bloq(ent, id)).then((l) => { const x = linha(l); if (x) aoVoltar.fn(x); return l })
      if (postandoRef.current.has(k)) return Promise.resolve([true])
      postandoRef.current.add(k)
      return api(tabela, { metodo: 'POST', corpo: { ...extra, ...corpo }, prefer: REPR })
        .then((l) => {
          const x = linha(l)
          if (!x) return l
          if (removidasRef.current.has(k)) {
            removidasRef.current.delete(k)
            api(tabela + '?id=eq.' + x.id, { metodo: 'DELETE' }).catch(() => {})
            return l
          }
          idsRef.current.set(k, x.id)
          aoVoltar.fn(x)
          aoCriar(x)
          return l
        })
        .finally(() => postandoRef.current.delete(k))
    }

    const tarefas = []
    /* Só grava os blocos DESTA aba (Meu cadastro = 0, 4 e 6; Meu combo = 1, 2,
       3 e 5). As duas abas são instâncias separadas: gravar tudo deixaria o
       salvamento de uma escrever, com o valor velho que ela leu, o que a outra
       acabou de salvar. `[true]` = nada a confirmar (sem mudança). */
    if (mostra(0)) {
      tarefas.push(patchMudancas('participantes?id=eq.' + participanteId, corpoMarca(marca), base.marca, bloq('marca'))
        .then((l) => { if (linha(l)) base.marca = corpoMarca(marcaDeLinha(linha(l))); return l }))
    }
    if (mostra(1) || mostra(3)) {
      tarefas.push(patchMudancas('participacoes?id=eq.' + participacaoId, corpoParticipacao({ tema, combo, custosStr, extras }), base.participacao, bloq('participacao'))
        .then((l) => { if (linha(l)) base.participacao = corpoParticipacao(participacaoDeLinha(linha(l))); return l }))
    }
    if (mostra(2)) {
      for (const i of itens) {
        if (orfas.has('item:' + i.id)) continue
        const { caminho, corpo } = pedidoItem(i)
        tarefas.push(patchMudancas(caminho, corpo, base.itens[i.id], bloq('item', i.id)).then((l) => { const x = linha(l); if (x) base.itens[x.id] = pedidoItem(x).corpo; return l }))
      }
    }
    // O horário no festival é coluna da unidade da edição: vai junto com ela, só quando o seletor o entregou COMPLETO
    // (`u.horario_festival`). O rascunho incompleto nunca é gravado — o salvamento só diz que ele ficou de fora.
    if (modeloNovo && (mostra(4) || mostra(6))) unidades.forEach((u, i) => tarefas.push(salvarUnidade(u, i)))
    const horariosFora = modeloNovo && mostra(6) ? E.frasesHorarioNaoSalvo(unidades) : []
    if (modeloNovo && mostra(5)) {
      for (const [itemId, porAspecto] of Object.entries(declaracoes)) {
        for (const [aspecto, d] of Object.entries(porAspecto)) {
          if (!E.declaracaoGravavel(aspecto, d)) continue
          const k = 'dec-' + itemId + '-' + aspecto
          tarefas.push(salvarFilha({
            k, id: d.id || idsRef.current.get(k), ent: 'decl', tabela: 'declaracoes_alimentares', corpo: E.corpoDeclaracao(d), extra: { item_id: itemId, aspecto },
            aoVoltar: { base: 'decl', fn: (x) => { base.decl[x.id] = baseDeclaracao(x) } },
            aoCriar: (x) => setDeclaracoes((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [aspecto]: { ...(prev[itemId] || {})[aspecto], id: x.id } } })),
          }))
        }
      }
      for (const s of substituicoes) {
        if (!E.substituicaoGravavel(s)) continue
        tarefas.push(salvarFilha({
          k: s._key, id: s.id || idsRef.current.get(s._key), ent: 'sub', tabela: 'substituicoes', corpo: E.corpoSubstituicao(s), extra: { item_id: s.item_id },
          aoVoltar: { base: 'sub', fn: (x) => { base.sub[x.id] = baseSubstituicao(x) } },
          aoCriar: (x) => setSubstituicoes((prev) => prev.map((y) => (y._key === s._key ? { ...y, id: x.id } : y))),
        }))
      }
    }
    try {
      const respostas = await Promise.all(tarefas)
      if (respostas.some(vazio)) throw new Error('sem_confirmacao')
      const aguardando = Object.values(conflitosRef.current).some((c) => c.chave !== '__removida')
      const lista = [...omitidos]
      const faltou = lista.length ? 'Salvo, menos ' + (lista.length > 1 ? lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1] : lista[0]) + ' (corrija o campo para gravar).' : ''
      // O que ficou de fora e por quê, numa voz só: campo inválido, conflito a escolher e horário ainda incompleto.
      const dizer = [aguardando ? 'Salvo, menos o que aguarda a sua escolha.' : faltou, ...horariosFora].filter(Boolean)
      if (!pendenteRef.current) setSalvoTexto(dizer.length ? dizer.join(' ') : 'Informações salvas.')
      setErroSalvar(null)
      // Pendências, progresso e números das abas acompanham o que foi gravado.
      if (recarregarResumo) recarregarResumo()
      // Combo aprovado e mexido agora: o banco marca "alterado depois da aprovação".
      if (comboStatus === 'aprovado' && pub && !pub.alterado_apos_aprovacao) carregarPub(participacaoId)
      return true
    } catch (e) {
      pendenteRef.current = true
      if (e && e.message === 'sessao_expirada') return false
      setSalvoTexto('')
      // O horário que o banco recusa (outra aba, dia que saiu do festival) diz o motivo; o resto segue a frase de sempre.
      const horarioRecusado = /horario_invalido|data_fora_do_festival/.test(String((e && e.message) || ''))
      setErroSalvar(horarioRecusado
        ? 'Não deu para salvar o horário no festival. ' + traduzirErro(e.message) + ' O que você digitou continua na tela.'
        : 'Não deu para salvar agora. O que você digitou continua na tela. Tente de novo.')
      return false
    } finally {
      // Cada PATCH trocou a base pelo que o servidor devolveu — inclusive a coluna em conflito, que não foi
      // enviada. Devolve ao conflito a base de antes: senão o PRÓXIMO salvamento mandaria a minha por cima, calado.
      MC.reimporConflitos(base, conflitosRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participanteId, participacaoId, marca, tema, combo, custosStr, itens, unidades, extras, declaracoes, substituicoes, modeloNovo, comboStatus, pub])

  React.useEffect(() => { salvarRef.current = salvar }, [salvar])

  /*
   * Uma gravação por vez. Timer, tela escondida, desmonte e "Salvar" podem
   * pedir juntos, e a mais velha chegaria por último, desfazendo a nova.
   * Pedido durante o voo marca "de novo": roda mais uma vez no fim, com o
   * estado mais recente, e quem pediu recebe o resultado dessa última.
   */
  // Uma releitura da sincronização que caiu no meio de uma gravação foi descartada (a foto podia ter
  // pegado metade dela): quando a gravação acaba, ela roda de novo — mesmo se a gravação falhou.
  const soltarAdiada = React.useCallback(() => {
    if (!adiadoRef.current || !recarregarRef.current) return
    adiadoRef.current = false
    setTimeout(() => { if (recarregarRef.current) recarregarRef.current({ dominios: [], refs: [], origens: ['local'] }).catch(() => {}) }, 0)
  }, [])

  // "Salvando…" liga no começo de toda gravação e desliga quando a última termina (um contador, não um liga/desliga).
  const emVoo = React.useCallback((delta) => {
    emVooRef.current = Math.max(0, emVooRef.current + delta)
    setSalvando(emVooRef.current > 0)
  }, [])

  const salvarEmOrdem = React.useCallback(() => {
    if (vooRef.current) { vooRef.current.deNovo = true; return vooRef.current.fim }
    const voo = { deNovo: false }
    vooRef.current = voo
    ciclosRef.current += 1
    emVoo(1)
    voo.fim = (async () => {
      try {
        let ok
        do { voo.deNovo = false; ok = await salvarRef.current() } while (voo.deNovo)
        return ok
      } finally { vooRef.current = null; ciclosRef.current += 1; emVoo(-1); soltarAdiada() }
    })()
    return voo.fim
  }, [soltarAdiada, emVoo])

  // Nada digitado se perde: trocar de aba (desmonte), sair da conta
  // (descarregarPendentes no App) e fechar a página (beforeunload avisa).
  React.useEffect(() => {
    function descarregar() {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      if (pendenteRef.current) return salvarEmOrdem()
      // Sem pendência, mas com gravação em voo: quem sai espera ela terminar.
      return vooRef.current ? vooRef.current.fim : Promise.resolve()
    }
    const tirar = registrarPendente(descarregar)
    // Declarado também para o painel todo (lib/pendencias): "Atualizar agora" salva antes.
    const tirarGeral = registrarPendencia('cadastro-marca', {
      rotulo: 'Seu cadastro: alterações ainda sendo salvas',
      ativo: () => !!pendenteRef.current || !!vooRef.current || Object.keys(conflitosRef.current).length > 0,
      salvar: async () => (await descarregar()) !== false,
    })
    // Horário no festival montado só pela metade NÃO se grava (o banco recusa) e some ao sair da tela: conta como trabalho pela metade.
    const tirarHorario = registrarPendencia('cadastro-horario', {
      rotulo: 'Seu cadastro: o horário no festival está incompleto e não foi salvo',
      ativo: () => horarioPendenteRef.current,
    })
    function avisar(ev) { if (pendenteRef.current) { ev.preventDefault(); ev.returnValue = '' } }
    // No celular o beforeunload não dispara: trocar de app ou bloquear a tela
    // esconde a página, e é aí que o rascunho precisa ir para o servidor.
    function aoEsconder() { if (document.visibilityState === 'hidden') descarregar() }
    window.addEventListener('beforeunload', avisar)
    document.addEventListener('visibilitychange', aoEsconder)
    return () => {
      tirar()
      tirarGeral()
      tirarHorario()
      window.removeEventListener('beforeunload', avisar)
      document.removeEventListener('visibilitychange', aoEsconder)
      descarregar()
    }
  }, [salvarEmOrdem])

  function agendarSalvar() {
    pendenteRef.current = true
    setSalvoTexto('')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { salvarEmOrdem() }, 900)
  }

  /*
   * "Salvar": grava agora o que está na fila (o salvamento automático continua). Tocar em Salvar é salvar as unidades
   * também: o WhatsApp antigo, digitado quando era preciso autorizar, vai para o site (E.whatsappLegado). A mudança
   * entra na TELA antes de gravar — o efeito abaixo grava depois do render, com o estado novo, e a base nunca vê
   * diferença ao abrir.
   */
  function salvarAgora() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (modeloNovo && mostra(4) && unidades.some(E.whatsappLegado)) {
      pendenteRef.current = true
      salvarJaRef.current = true
      setSalvoTexto('')
      setUnidades((prev) => prev.map((u) => (E.whatsappLegado(u) ? { ...u, whatsapp_autorizado: true } : u)))
      return
    }
    salvarEmOrdem()
  }
  React.useEffect(() => {
    if (!salvarJaRef.current) return
    salvarJaRef.current = false
    salvarEmOrdem()
  }, [unidades, salvarEmOrdem])

  // ── Sincronização: releitura silenciosa que MESCLA (19/10/2026) ──────────────
  const aplicarTela = React.useCallback((t) => {
    if (!t) return
    if (t.marca) setMarca((a) => MC.aplicarCampos(a, t.marca))
    if (t.tema) setTema((a) => MC.aplicarCampos(a, t.tema))
    if (t.combo) setCombo((a) => MC.aplicarCampos(a, t.combo))
    if (t.custosStr) setCustosStr((a) => MC.aplicarCampos(a, t.custosStr))
    if (t.extras) setExtras((a) => MC.aplicarCampos(a, t.extras))
    if (t.itens) setItens((a) => MC.aplicarItens(a, t.itens))
    if (t.unidades) setUnidades((a) => MC.aplicarUnidades(a, t.unidades))
    if (t.declaracoes) setDeclaracoes((a) => MC.aplicarDeclaracoes(a, t.declaracoes))
    if (t.substituicoes) setSubstituicoes((a) => MC.aplicarSubstituicoes(a, t.substituicoes))
  }, [])

  // Outra participação (edição nova) ou o modelo novo que acabou de existir: não há o que mesclar,
  // recomeça do zero. Antes grava o que estava pendente — na participação de ONDE foi digitado — e, se
  // essa gravação falhar, não troca nada (nada digitado se perde nem vai para a edição errada).
  const reiniciar = React.useCallback(async (vale) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (pendenteRef.current && (await salvarEmOrdem()) === false) return
    if (!vale()) return
    idsRef.current = new Map()
    idsUnRef.current = new Map()
    idsPuRef.current = new Map()
    postandoRef.current = new Set()
    removidasRef.current = new Set()
    esquecidasRef.current = new Set()
    orfasRef.current = new Set()
    dispensadasRef.current = new Set()
    conflitosRef.current = {}
    baseRef.current = baseVazia()
    pendenteRef.current = false
    prontoRef.current = false
    limparMudancaExterna('cadastro-marca')
    setExterno({ conflitos: {}, adotados: {} })
    setErroSalvar(null)
    setCarregando(true)
    setTentativa((n) => n + 1)
  }, [salvarEmOrdem])

  const recarregarMesclando = React.useCallback(async (aviso) => {
    if (!prontoRef.current) { pedidoCargaRef.current = true; return } // a abertura ainda corre: ela relê no fim
    const vale = guarda()
    // Uma gravação por vez: espera a que está em voo (até ~4 s). Mesclar no meio dela leria metade.
    for (let i = 0; i < 80 && vooRef.current; i += 1) {
      if (!vale()) return
      await vooRef.current.fim.catch(() => {})
    }
    if (!vale()) return
    if (vooRef.current) { adiadoRef.current = true; return }
    const ciclo = ciclosRef.current
    let snap
    try { snap = await lerSnapshot() } catch (e) { if (e && e.message === 'sessao_expirada') return; throw e } // erro: o hook marca "sem sincronizar"
    if (!vale()) return
    // Uma gravação rodou durante a leitura: a foto pode ter pegado metade dela. A própria gravação anuncia
    // o que mudou e a releitura vem sozinha (e `soltarAdiada` cobre a gravação que falhou).
    if (vooRef.current || ciclo !== ciclosRef.current) { adiadoRef.current = true; return }
    if (snap.tipo !== 'ok') return // sem marca / sem participação: nada a mesclar
    const v = vivoRef.current
    if (!v.participacaoId || snap.pa.id !== v.participacaoId || snap.p.id !== v.participanteId || snap.novo !== v.modeloNovo) {
      await reiniciar(vale)
      return
    }

    const plano = MC.planejarMesclagem({
      vivo: v, base: baseRef.current, snap, mapas: MAPAS, esquecidas: esquecidasRef.current,
      // ids que o servidor já devolveu e o estado React ainda não renderizou (POST que acabou de voltar)
      ids: {
        unId: (u) => u.unId || idsUnRef.current.get(u._key) || null,
        puId: (u) => u.puId || (idsPuRef.current.get(u._key) || {}).puId || null,
        declId: (itemId, aspecto, d) => d.id || idsRef.current.get('dec-' + itemId + '-' + aspecto) || null,
        subId: (sb) => sb.id || idsRef.current.get(sb._key) || null,
      },
    })
    baseRef.current = plano.base
    orfasRef.current = new Set(plano.orfas)
    for (const id of [...esquecidasRef.current]) if (!plano.servidorIds.has(id)) esquecidasRef.current.delete(id)
    aplicarTela(plano.tela)

    // O que a tela só mostra: troca por igual não renderiza (a mesma referência volta).
    const ex = plano.exibicao
    setEdicaoCodigo(ex.edicaoCodigo)
    setStatusCadastro(ex.statusCadastro)
    if ('valorCombo' in ex) {
      setValorCombo(ex.valorCombo)
      setFestival((f) => (MC.igualValor(f, ex.festival) ? f : ex.festival))
    }
    if ('revisaoTema' in ex) setRevisao((r) => (MC.igualValor(r.tema, ex.revisaoTema) ? r : { tema: ex.revisaoTema }))
    if ('permanentes' in ex) setPermanentes((antes) => (assinaturaPermanentes(antes) === assinaturaPermanentes(ex.permanentes) ? antes : ex.permanentes))
    const dominios = (aviso && aviso.dominios) || []
    if (snap.novo && (dominios.includes('publicacao') || ((aviso && aviso.origens) || []).includes('reconciliacao'))) {
      const validaPub = guardaPub()
      api('rpc/marca_minha_publicacao', { metodo: 'POST', corpo: { p_participacao: v.participacaoId } })
        .then((x) => { if (validaPub()) setPub((antes) => (MC.igualValor(antes, x) ? antes : x)) })
        .catch(() => { /* fica a que já estava na tela */ })
    }

    // Conflitos abertos e o aviso "atualizamos estes campos". Sem novidade, nem setState: o eco do próprio
    // salvamento não pisca, não mexe em foco nem em rolagem e não reinicia o salvamento automático.
    const abertos = Object.fromEntries(Object.entries(plano.conflitos).filter(([ui]) => !dispensadasRef.current.has(ui)))
    const assinatura = (c) => JSON.stringify(Object.entries(c).map(([k, x]) => [k, x.meu, x.deles]).sort())
    const mudouConflitos = assinatura(conflitosRef.current) !== assinatura(abertos)
    conflitosRef.current = abertos
    const temAdotados = Object.keys(plano.adotados).length > 0
    if (mudouConflitos || temAdotados) {
      setExterno((e) => ({ conflitos: abertos, adotados: temAdotados ? { ...e.adotados, ...plano.adotados } : e.adotados }))
    }
    // Mudança de fora num registro que a pessoa está editando: o painel todo passa a saber (atualização de versão, etc.).
    if (Object.keys(abertos).length || (temAdotados && (pendenteRef.current || vooRef.current))) sinalizarMudancaExterna('cadastro-marca', true)
    else limparMudancaExterna('cadastro-marca')
  }, [guarda, guardaPub, reiniciar, aplicarTela])
  recarregarRef.current = recarregarMesclando
  // O que este cadastro realmente lê: marca e participação (participantes), itens/declarações/trocas (cadastro),
  // unidades e o horário no festival (unidades), tema em análise (temas), valor e datas (edicao), a página no ar (publicacao).
  useSincronizar(['participantes', 'cadastro', 'unidades', 'temas', 'edicao', 'publicacao'], recarregarMesclando)

  // A pessoa escolheu num conflito. "Usar a nova" leva o valor da organização para a tela E para a base;
  // "Manter a minha" só leva a base — e o salvamento seguinte manda a minha, de propósito.
  function resolverConflito(ui, como) {
    const c = conflitosRef.current[ui]
    if (!c) return
    const base = baseRef.current
    if (c.chave === '__removida') {
      if (como === 'adotar') { aplicarTela(c.tela); MC.apagarDaBase(base, c) }
      else if (c.manterTela) {
        // a linha volta a ser gravada como NOVA (sem os ids que a organização apagou)
        aplicarTela(c.manterTela)
        const l = c.limparIds || {}
        ;(l.pu || []).forEach((k) => idsPuRef.current.delete(k))
        ;(l.un || []).forEach((k) => idsUnRef.current.delete(k))
        ;(l.ids || []).forEach((k) => idsRef.current.delete(k))
        MC.apagarDaBase(base, c)
        agendarSalvar()
      } else dispensadasRef.current.add(ui) // sem como recriar aqui: continua na tela, mas não é gravada
    } else {
      if (como === 'adotar') aplicarTela(c.tela)
      MC.definirNaBase(base, c, c.deles)
      if (como === 'manter') agendarSalvar()
    }
    const { [ui]: _resolvido, ...resto } = conflitosRef.current
    conflitosRef.current = resto
    setExterno((e) => { const { [ui]: _r, ...conflitos } = e.conflitos; return { ...e, conflitos } })
    if (!Object.keys(resto).length) limparMudancaExterna('cadastro-marca')
  }

  // ── Campos ────────────────────────────────────────────────────────────────
  function alterarMarca(campo, valor) { setMarca((prev) => ({ ...prev, [campo]: valor })); agendarSalvar() }
  function alterarTema(campo, valor) { setTema((prev) => ({ ...prev, [campo]: valor })); agendarSalvar() }
  function alterarCombo(campo, valor) { setCombo((prev) => ({ ...prev, [campo]: valor })); agendarSalvar() }
  function alterarCusto(campo, valor) { setCustosStr((prev) => ({ ...prev, [campo]: valor })); agendarSalvar() }
  function alterarExtra(campo, valor) { setExtras((prev) => ({ ...prev, [campo]: valor })); agendarSalvar() }
  function alterarItem(id, campo, valor) {
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)))
    agendarSalvar()
  }
  // Mexer numa unidade é salvá-la: E.editarUnidade também decide o WhatsApp da loja no site.
  function alterarUnidade(chave, campo, valor) {
    setUnidades((prev) => prev.map((u) => (u._key === chave ? E.editarUnidade(u, { [campo]: valor }) : u)))
    agendarSalvar()
  }
  // Atendimento (bloco 6): mexer aqui NÃO publica o WhatsApp antigo (o aviso de que ele vai para o site só aparece no bloco 4).
  function alterarAtendimento(chave, campo, valor) {
    setUnidades((prev) => prev.map((u) => (u._key === chave ? E.editarUnidade(u, { [campo]: valor }, { liberaLegado: false }) : u)))
    agendarSalvar()
  }
  function alterarCanal(chave, tipo, valor) {
    setUnidades((prev) => prev.map((u) => (u._key === chave ? E.editarUnidade(u, { canais: { ...u.canais, [tipo]: valor } }, { liberaLegado: false }) : u)))
    agendarSalvar()
  }
  function adicionarUnidade() {
    setUnidades((prev) => [...prev, unidadeVazia()])
  }
  function usarSugestao(un) {
    setUnidades((prev) => [...prev.filter((u) => u.unId || temTexto(u.logradouro)), { ...E.unidadeDeLinhas(null, un), _key: 'un-' + un.id }])
    agendarSalvar()
  }
  function removerUnidade(chave) {
    const alvoU = unidades.find((u) => u._key === chave)
    // Sem unidade nenhuma (e sem sugestão), sobra uma em branco para preencher.
    setUnidades((prev) => {
      const resto = prev.filter((u) => u._key !== chave)
      return resto.length || permanentes.length ? resto : [unidadeVazia()]
    })
    const pu = alvoU && (alvoU.puId || (idsPuRef.current.get(alvoU._key) || {}).puId)
    if (alvoU && !pu && postandoRef.current.has(alvoU._key)) removidasRef.current.add(alvoU._key)
    if (pu) esquecidasRef.current.add(String(pu))
    // Sai DESTA edição; a unidade permanente fica guardada (volta como sugestão).
    if (pu) {
      // A sugestão aceita de novo usa a mesma chave ('un-<id>'): sem isto o próximo salvamento faria PATCH na linha apagada.
      idsPuRef.current.delete(chave)
      delete baseRef.current.pu[pu]
      api('participacao_unidades?id=eq.' + pu, { metodo: 'DELETE' }).catch((e) => {
        if (e && e.message === 'sessao_expirada') return
        setErroSalvar('Não deu para remover a unidade agora. Recarregue a página.')
      })
    }
    agendarSalvar() // a ordem das que ficaram muda
  }

  /*
   * Horário no festival: o seletor (components/HorarioFestival.jsx) só entrega `linhas` quando o horário está COMPLETO.
   * Completo → vira o horário da unidade e segue o salvamento de sempre (PATCH em participacao_unidades). Incompleto →
   * `horario_festival` NÃO se mexe (mexer nele de fora refaria o rascunho do seletor): a unidade só ganha o marcador
   * `_horarioPendente`, que o salvamento usa para avisar. Rascunho incompleto nunca é gravado; o marcador nunca vai ao banco.
   */
  function alterarHorario(chave, r) {
    setUnidades((prev) => prev.map((u) => {
      if (u._key !== chave) return u
      return r.completo
        ? E.editarUnidade(u, { horario_festival: linhasCanonicas(r.linhas), _horarioPendente: null }, { liberaLegado: false })
        : { ...u, _horarioPendente: { faltando: r.faltando || [], semDiaAberto: !!r.semDiaAberto } }
    }))
    agendarSalvar()
  }

  function alterarDeclaracao(itemId, aspecto, campo, valor) {
    setDeclaracoes((prev) => {
      const doItem = { ...(prev[itemId] || {}) }
      doItem[aspecto] = { observacao: '', ...doItem[aspecto], [campo]: valor }
      return { ...prev, [itemId]: doItem }
    })
    agendarSalvar()
  }
  const sub = {
    adicionar(itemId) {
      tempSeqRef.current += 1
      setSubstituicoes((prev) => [...prev, {
        _key: 'troca-' + tempSeqRef.current, id: null, item_id: itemId, original: '', alternativa: '',
        disponibilidade: 'sob_consulta', acrescimo: '', como_solicitar: '', modalidades: [], unidades: [],
      }])
    },
    alterar(k, campo, valor) {
      setSubstituicoes((prev) => prev.map((s) => (s._key === k ? { ...s, [campo]: valor } : s)))
      agendarSalvar()
    },
    remover(k) {
      const s = substituicoes.find((x) => x._key === k)
      setSubstituicoes((prev) => prev.filter((x) => x._key !== k))
      if (!s) return
      const id = s.id || idsRef.current.get(k)
      if (!id && postandoRef.current.has(k)) removidasRef.current.add(k)
      if (id) {
        delete baseRef.current.sub[id]
        esquecidasRef.current.add(String(id))
        api('substituicoes?id=eq.' + id, { metodo: 'DELETE' }).catch((e) => {
          if (e && e.message === 'sessao_expirada') return
          setErroSalvar('Não deu para remover a troca agora. Recarregue a página.')
        })
      }
    },
  }

  function focarCampo(campo, bloco) {
    window.setTimeout(() => {
      const el = (campo && document.getElementById('campo-' + campo)) || document.getElementById('bloco-' + bloco)
      if (el) {
        // Item de "Informações alimentares" recolhido: abre para o campo estar na tela.
        const fechado = el.closest && el.closest('details:not([open])')
        if (fechado) fechado.open = true
        el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus) el.focus({ preventScroll: true })
      }
    }, 60)
  }
  // Pendência da lista → o campo. Está na OUTRA aba (Meu cadastro × Meu combo): leva até ela.
  function irParaFalta(f) {
    if (f.bloco === null) return
    if (visiveis.includes(f.bloco)) { setBlocoAberto(f.bloco); focarCampo(f.campo, f.bloco) }
    else if (irPara) irPara(vistaDoBloco(f.bloco), { sub: String(f.bloco), campo: f.campo || '' })
  }

  // "Continuar": SÓ navega. Grava o que está na fila (em ordem, como o resto) e abre a próxima seção da aba.
  // O último bloco não tem "Continuar": o botão dele é o "Salvar" do fim do formulário.
  async function continuar(n) {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (pendenteRef.current) await salvarEmOrdem() // se falhar, o aviso de erro já está na tela e o digitado continua
    const prox = visiveis[visiveis.indexOf(n) + 1]
    if (prox === undefined) return
    // O botão que foi tocado fica dentro de um bloco que se recolhe (some do foco): o foco vai para o
    // cabeçalho de onde a pessoa continua, e o leitor de tela anuncia o título e "expandido".
    setBlocoAberto(prox)
    window.setTimeout(() => {
      const alvo = document.querySelector('[data-bloco="' + prox + '"]')
      rolarPara(alvo)
      const cabeca = alvo && alvo.querySelector('.mc-bloco__cabeca')
      if (cabeca) cabeca.focus({ preventScroll: true })
    }, 60)
  }

  // Vindo de "escolher horário das fotos" (Hoje ou aviso): rola até a agenda.
  // Vindo de uma pendência (`cadastro/<bloco>/<campo>`, etapa 7): abre o
  // bloco e põe o cursor no campo que falta.
  React.useEffect(() => {
    if (carregando || !alvo) return
    if (/^[0-7]$/.test(String(alvo.sub || ''))) {
      setBlocoAberto(Number(alvo.sub))
      focarCampo(alvo.campo, alvo.sub)
      if (consumirAlvo) consumirAlvo()
    }
  }, [carregando, alvo]) // eslint-disable-line react-hooks/exhaustive-deps

  if (carregando) return <Carregando linhas={4} texto="Carregando o seu cadastro…" />

  if (erroCarregar) {
    return (
      <Erro
        titulo={erroCarregar.titulo}
        texto={erroCarregar.texto}
        onTentar={erroCarregar.tentar ? () => { setErroCarregar(null); setCarregando(true); setTentativa((n) => n + 1) } : null}
      />
    )
  }

  // A logo é o 17º campo: quem sabe se está confirmada é o resumo (banco).
  const logoOk = !!(resumo && resumo.campo && (resumo.campo('logo') || {}).estado !== 'falta')
  const dadosProgresso = { marca, tema, itens, unidades, custos, logo: logoOk }
  const prog = progressoCampos(dadosProgresso)
  // Estado de cada campo: completo/falta ao vivo; o que a organização disse
  // (alteração pedida, em análise, aprovado) vem do resumo.
  const obrigatorios = camposObrigatorios(dadosProgresso)
  const vivo = Object.fromEntries(obrigatorios.filter((c) => c.campo).map((c) => [c.campo, c.ok]))
  const est = (id) => {
    const org = resumo && resumo.campo ? resumo.campo(id) : null
    if (org && (org.estado === 'alteracao' || (org.estado === 'analise' && vivo[id]))) return org
    if (!(id in vivo)) return null
    if (!vivo[id]) return { estado: 'falta' }
    return org && (org.estado === 'aprovado' || org.estado === 'analise') ? org : { estado: 'completo' }
  }
  // "Faltam N informações": a regra de marca_concluir_cadastro (que o banco roda sozinho a cada salvamento) — os
  // campos obrigatórios (a logo não trava) + o que a página pública precisa (pendencias_publicacao), sem contar
  // "sem unidade" duas vezes. É o mesmo número que decide quando o cadastro vai para a conferência da organização.
  const faltaCampos = obrigatorios.filter((c) => !c.ok && c.campo !== 'logo')
  const pendEd = modeloNovo ? E.pendenciasEdicao({ comboNome: combo.combo_nome, unidades, itens, declaracoes }) : []
  const pendEdicao = faltaCampos.some((c) => c.campo === 'unidade-endereco') ? pendEd.filter((c) => c !== 'sem_unidade') : pendEd
  const faltam = faltaCampos.length + pendEdicao.length
  // O que falta, a da aba aberta primeiro: o primeiro é o destino de "Ir para o que falta" (mesmo na outra aba).
  const proximaFalta = E.faltasDoCadastro({ faltaCampos, pendEdicao, unidades, itens, visiveis })[0] || null
  const contagem = E.contarPorBloco(pendEdicao)
  const faltamNo = (n) => faltaCampos.filter((c) => c.bloco === n).length + (contagem[n] || 0)
  const pronto = (n) => (n <= 4 ? blocoCompleto(n, dadosProgresso) : modeloNovo) && !contagem[n]
  const sugestoes = permanentes.filter((un) => !unidades.some((u) => (u.unId || idsUnRef.current.get(u._key)) === un.id))
  const dias = datasDoFestival(festival.inicio, festival.fim)
  const erroWhats = validarWhatsApp(marca.telefone)
  const alterado = !!(pub && pub.alterado_apos_aprovacao)
  const semModelo = <p className="aviso">Esta etapa abre quando a organização liberar a nova versão do cadastro da edição.</p>
  // Situação em palavras: COMPLETO (statusCadastro) e APROVADO (comboStatus) são coisas diferentes; "preenchido" não é "aprovado".
  const situacao = E.situacaoDaMarca({ semParticipacao, statusCadastro, comboStatus, alterado, publicada: !!(pub && pub.estado === 'publicado'), faltam })
  const salvamento = E.rotuloSalvamento({ salvando, erro: !!erroSalvar, texto: salvoTexto })
  // Blocos com correção pedida (a organização apontou um campo, ou o tema foi recusado).
  const comCorrecao = new Set(((resumo && resumo.pendencias) || []).filter((p) => p.tipo === 'correcao').map((p) => Number(p.bloco)))
  const tituloDoProximo = (n) => { const p = visiveis[visiveis.indexOf(n) + 1]; return p === undefined ? null : E.TITULOS_BLOCO[p].titulo }
  const blocoProps = (n) => ({
    indice: n, numero: E.numeroLocalDoBloco(n, visiveis), aberto: blocoAberto === n, completo: pronto(n),
    estado: E.estadoDoBloco({
      bloco: n, faltam: faltamNo(n), pronto: pronto(n), correcao: comCorrecao.has(n),
      comboStatus, temaStatus: revisao.tema ? revisao.tema.status : null, alterado,
    }),
    resumo: E.resumoDoBloco(n, { marca, tema, combo, itens, unidades, declaracoes }),
    proximo: tituloDoProximo(n), onContinuar: () => continuar(n),
    onToggle: () => setBlocoAberto((a) => (a === n ? null : n)),
  })
  // Alteração de fora: só o que pertence aos blocos DESTA aba (Meu cadastro × Meu combo).
  const confVisiveis = Object.entries(externo.conflitos).filter(([, c]) => visiveis.includes(c.bloco))
  const adotVisiveis = Object.entries(externo.adotados).filter(([, a]) => visiveis.includes(a.bloco))
  const registroExterno = {
    conflitos: Object.fromEntries(confVisiveis.map(([ui, c]) => [ui, { meu: MC.valorLegivel(c.chave, c.meu, dias), deles: MC.valorLegivel(c.chave, c.deles, dias) }])),
    adotados: adotVisiveis.map(([ui]) => ui),
    dispensar: () => setExterno((e) => ({ ...e, adotados: {} })),
    adotar: (ui) => resolverConflito(ui, 'adotar'),
    manter: (ui) => resolverConflito(ui, 'manter'),
    adotarTodos: () => confVisiveis.forEach(([ui]) => resolverConflito(ui, 'adotar')),
    manterTodos: () => confVisiveis.forEach(([ui]) => resolverConflito(ui, 'manter')),
  }
  const rotulosExterno = Object.fromEntries([...confVisiveis, ...adotVisiveis].map(([ui, x]) => [ui, x.rotulo]))

  // Tudo preenchido e ainda "em preenchimento" (ela completou antes de a marca só salvar): conclui sozinho, sem esperar uma escrita.
  const concluirSozinho = modeloNovo && !semParticipacao && !!participacaoId && !emVerComo() && faltam === 0 && comboStatus === 'rascunho'
    && ['aguardando_cadastro', 'em_preenchimento'].includes(statusCadastro) && !pendenteRef.current && !vooRef.current

  return (
    <>
      <ConcluirSozinho ativo={concluirSozinho} participacaoId={participacaoId}
        aoConcluir={(status) => { if (status) setStatusCadastro(status); if (recarregarResumo) recarregarResumo() }} />
      <VistaCabeca
        acento={ehCombo ? 'laranja' : 'cyan'} icone={ehCombo ? 'combo' : 'cadastro'}
        titulo={ehCombo ? 'Meu combo' : 'Meu cadastro'}
        nota={semParticipacao ? 'Área da marca' : (marca.nome_marca || 'Sua marca') + ' · edição ' + edicaoCodigo}
      />

      {semParticipacao && (
        <Vazio titulo="Ainda não há edição aberta para você">
          Sua conta está ativa, mas a organização ainda não abriu a sua participação na próxima
          edição. Assim que abrir, o formulário aparece aqui. Você não precisa fazer nada agora.
        </Vazio>
      )}

      {!semParticipacao && (
        <div>
          {/* Três coisas diferentes, uma em cada lugar: a SITUAÇÃO (selo), o PROGRESSO dos dados básicos (%) e quantas
              informações FALTAM no cadastro inteiro (linha de baixo). O salvamento é outro assunto. Este é o único elemento preso ao topo. */}
          <div className="mc-resumo">
            <Selo tom={situacao.tom}>{situacao.texto}</Selo>
            <div className="progresso">
              <b>{prog.pct}% dos dados básicos preenchidos</b>
              <div className="trilha" role="progressbar" aria-label="Dados obrigatórios preenchidos" aria-valuemin={0} aria-valuemax={100} aria-valuenow={prog.pct}>
                <i style={{ '--p': prog.pct / 100 }} />
              </div>
              <span className="em-faltam">{E.textoFaltam({ faltam, chave: situacao.chave })}</span>
            </div>
            {/* "Salvando…" fica fora do leitor de tela (senão anuncia a cada pausa na digitação); o erro tem UMA voz: o aviso abaixo. */}
            <p className="salvo em-salvo" role="status" data-estado={salvamento.estado}>
              {salvamento.texto && (
                <span className="em-salvo__rotulo" aria-hidden={salvamento.estado === 'salvando' || salvamento.estado === 'erro' ? 'true' : undefined}>
                  <Icone nome={salvamento.estado === 'salvando' ? 'horario' : salvamento.estado === 'salvo' ? 'feito' : 'atencao'} tamanho={16} />{salvamento.texto}
                </span>
              )}
              {salvamento.detalhe && <span className="em-salvo__detalhe">{salvamento.detalhe}</span>}
            </p>
          </div>
          {situacao.nota && <p className="nota em-situacao">{situacao.nota}</p>}
          {erroSalvar && (
            <div className="aviso erro" role="alert">
              {erroSalvar}{' '}
              <button className="link" type="button" onClick={() => { setErroSalvar(null); salvarEmOrdem() }}>Tentar de novo</button>
            </div>
          )}
          <AvisoMudancaExterna registro={registroExterno} rotulos={rotulosExterno} />
          <EstadoPublicacao pub={pub} />

          {/* noValidate: campos obrigatórios moram em blocos fechados (hidden),
              e o navegador travava o "Salvar" sem mostrar balão nenhum. O que
              falta aparece em cada campo e na linha "Faltam N informações". */}
          <form
            onSubmit={(e) => { e.preventDefault(); salvarAgora() }} noValidate
            // Enter num campo de uma linha (o "Ir" do teclado do celular) não
            // dispara nada: o salvamento automático já cuida. Só o botão.
            onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault() }}
          >
            {mostra(0) && <Bloco {...blocoProps(0)}>
              <p className="nota">Isto atravessa as edições. Corrija o que mudou.</p>
              <GrupoPublico>
                {/* Só leitura: o nome é o login da marca (§10.4-b). Mudar aqui a deixaria sem entrar. */}
                <label><span>Nome da marca <EstadoCampo e={est('nome_marca')} /></span><input id="campo-nome_marca" readOnly aria-describedby="nota-nome_marca" value={marca.nome_marca} /><span className="nota" id="nota-nome_marca">Para mudar o nome, fale com a organização.</span><Correcao e={est('nome_marca')} /></label>
                {/* A logo oficial: sobe na hora (não espera o salvamento automático). */}
                {participanteId && (
                  <div className="mc-campo-logo">
                    <span className="mc-campo-logo__rotulo">Logo do estabelecimento <Opcional>pode enviar depois</Opcional> <EstadoCampo e={est('logo')} /></span>
                    <LogoEditor participanteId={participanteId} nomeMarca={marca.nome_marca} adaptador={adaptadorLogo} modo="marca" onMudou={recarregarResumo} />
                    <Correcao e={est('logo')} />
                  </div>
                )}
                {modeloNovo && (
                  <label><span>Apresentação da casa <Opcional /> <EstadoCampo e={est('apresentacao_publica')} /> <Contador valor={marca.apresentacao_publica} max={280} /></span>
                    <textarea id="campo-apresentacao_publica" maxLength={280} aria-describedby="nota-apresentacao" value={marca.apresentacao_publica} onChange={(e) => alterarMarca('apresentacao_publica', e.target.value)} />
                    <span className="nota" id="nota-apresentacao">Duas ou três frases sobre a casa, para a sua página no site. Sem preço nem promoção.</span>
                    <Correcao e={est('apresentacao_publica')} />
                  </label>
                )}
                <div className="dupla">
                  <label><span>Instagram <Opcional /> <EstadoCampo e={est('instagram')} /></span><input id="campo-instagram" placeholder="@suamarca" value={marca.instagram} onChange={(e) => alterarMarca('instagram', e.target.value)} /><Correcao e={est('instagram')} /></label>
                  <label><span>Site <Opcional /></span><input placeholder="https://" value={marca.site} onChange={(e) => alterarMarca('site', e.target.value)} /></label>
                </div>
              </GrupoPublico>
              <GrupoPublico sim={false}>
                <div className="dupla">
                  <label><span>Responsável pelo festival <EstadoCampo e={est('responsavel')} /></span><input id="campo-responsavel" required value={marca.responsavel} onChange={(e) => alterarMarca('responsavel', e.target.value)} /><Correcao e={est('responsavel')} /></label>
                  {/* O telefone de cadastro É o WhatsApp: é por ele que a organização fala com a marca. */}
                  <label><span>WhatsApp do responsável <EstadoCampo e={est('telefone')} /></span>
                    <input id="campo-telefone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(84) 99999-9999" required
                      aria-invalid={!!erroWhats} aria-describedby={erroWhats ? 'erro-telefone' : undefined}
                      value={marca.telefone} onChange={(e) => alterarMarca('telefone', mascaraWhatsApp(e.target.value))} />
                    {erroWhats && <span className="gm-campo-erro" id="erro-telefone">{erroWhats}</span>}
                    <Correcao e={est('telefone')} />
                  </label>
                </div>
                <div className="dupla">
                  <label><span>E-mail de contato <Opcional /> <EstadoCampo e={est('email')} /></span><input id="campo-email" type="email" inputMode="email" value={marca.email} onChange={(e) => alterarMarca('email', e.target.value)} /><Correcao e={est('email')} /></label>
                  <label><span>CNPJ <Opcional /></span><input inputMode="numeric" value={marca.cnpj} onChange={(e) => alterarMarca('cnpj', e.target.value)} /></label>
                </div>
                <label><span>Razão social <Opcional /></span><input value={marca.razao_social} onChange={(e) => alterarMarca('razao_social', e.target.value)} /></label>
              </GrupoPublico>
            </Bloco>}

            {mostra(1) && <Bloco {...blocoProps(1)}>
              <p className="nota">O festival nasce de um tema, e cada marca lê esse tema do seu
                jeito. Conte qual foi a sua leitura.</p>
              {revisao.tema && (
                <div className={'aviso' + (revisao.tema.status === 'recusado' ? ' erro' : '')} role={revisao.tema.status === 'recusado' ? 'alert' : 'status'}>
                  {ROTULO_TEMA_STATUS[revisao.tema.status]}{revisao.tema.observacao ? ' “' + revisao.tema.observacao + '”' : ''}
                  {revisao.tema.status === 'aprovado' && ' Mudar o tema agora manda a escolha para nova análise.'}
                </div>
              )}
              <p className="nota">Na edição, cada tema é de uma marca só. Se duas pedirem o mesmo, a organização decide pela ordem de chegada e pelo pagamento em dia.</p>
              <GrupoPublico sim={false}>
                <label><span>Tema escolhido pela marca <EstadoCampo e={est('tema_combo')} /></span><input id="campo-tema_combo" required value={tema.tema_combo} onChange={(e) => alterarTema('tema_combo', e.target.value)} /><Correcao e={est('tema_combo')} /></label>
                <label><span>Justificativa <em>(por que esse ângulo, como conversa com a inspiração)</em> <EstadoCampo e={est('tema_justificativa')} /></span>
                  <textarea id="campo-tema_justificativa" required value={tema.tema_justificativa} onChange={(e) => alterarTema('tema_justificativa', e.target.value)} />
                  <Correcao e={est('tema_justificativa')} />
                </label>
              </GrupoPublico>
            </Bloco>}

            {mostra(2) && <Bloco {...blocoProps(2)}>
              <p className="nota">Alergênicos, características (vegano, lactose…) e trocas de cada item ficam
                em <b>Informações alimentares e trocas</b>, logo abaixo.</p>
              {comboStatus === 'correcao_solicitada' && (
                <div className="aviso erro" role="alert">A organização pediu um ajuste no combo{comboNota ? ': “' + comboNota + '”' : '.'} Corrija os campos marcados e salve: a organização recebe a alteração.</div>
              )}
              {comboStatus === 'aprovado' && <div className="aviso" role="status">Combo aprovado pela organização.{comboNota ? ' “' + comboNota + '”' : ''}</div>}
              {itens.length < TIPOS.length && (
                <div className="aviso erro" role="alert">
                  Faltam itens do combo na sua participação. Fale com a organização para liberar.
                </div>
              )}
              <GrupoPublico>
                {itensEmOrdem(itens).map((it) => {
                  const tipo = it.tipo
                  return (
                    <div className="item" key={it.id}>
                      <div className="topo"><b>{it.posicao ? ROTULO_POSICAO[it.posicao] : ROTULO_TIPO[tipo]}</b></div>
                      {it.posicao === 2 && (
                        <div className="marcar-grupo" role="radiogroup" aria-label="O item 2 é doce ou salgado?">
                          <label className="marcar"><input type="radio" name={'tipo-' + it.id} checked={tipo === 'salgado'} onChange={() => alterarItem(it.id, 'tipo', 'salgado')} /><span>Salgado</span></label>
                          <label className="marcar"><input type="radio" name={'tipo-' + it.id} checked={tipo === 'doce'} onChange={() => alterarItem(it.id, 'tipo', 'doce')} /><span>Doce</span></label>
                        </div>
                      )}
                      <label><span>Nome <EstadoCampo e={est('item-' + it.posicao + '-nome')} /></span><input id={'campo-item-' + it.posicao + '-nome'} maxLength={80} value={it.nome || ''} onChange={(e) => alterarItem(it.id, 'nome', e.target.value)} /><Correcao e={est('item-' + it.posicao + '-nome')} /></label>
                      <label><span>Descrição <em>(como conversa com o tema)</em> <EstadoCampo e={est('item-' + it.posicao + '-descricao')} /></span>
                        <textarea id={'campo-item-' + it.posicao + '-descricao'} maxLength={300} value={it.descricao || ''} onChange={(e) => alterarItem(it.id, 'descricao', e.target.value)} />
                        <Correcao e={est('item-' + it.posicao + '-descricao')} />
                      </label>
                    </div>
                  )
                })}
              </GrupoPublico>
            </Bloco>}

            {mostra(3) && <Bloco {...blocoProps(3)}>
              <GrupoPublico>
                {modeloNovo && (
                  <>
                    <label><span>Nome do combo <EstadoCampo e={est('combo_nome')} /> <Contador valor={combo.combo_nome} max={80} /></span>
                      <input id="campo-combo_nome" maxLength={80} value={combo.combo_nome} onChange={(e) => alterarCombo('combo_nome', e.target.value)} />
                      <Correcao e={est('combo_nome')} />
                    </label>
                    <label><span>Descrição do combo <EstadoCampo e={est('combo_descricao')} /> <Contador valor={combo.combo_descricao} max={400} /></span>
                      <textarea id="campo-combo_descricao" maxLength={400} value={combo.combo_descricao} onChange={(e) => alterarCombo('combo_descricao', e.target.value)} />
                      <Correcao e={est('combo_descricao')} />
                    </label>
                    <label><span>Condições <Opcional /> <EstadoCampo e={est('combo_condicoes')} /> <Contador valor={combo.combo_condicoes} max={280} /></span>
                      <input id="campo-combo_condicoes" maxLength={280} aria-describedby="nota-condicoes" value={combo.combo_condicoes} onChange={(e) => alterarCombo('combo_condicoes', e.target.value)} />
                      <span className="nota" id="nota-condicoes">Ex.: só no salão; até durar o estoque do dia. Não escreva preço: o valor é o oficial da edição.</span>
                      <Correcao e={est('combo_condicoes')} />
                    </label>
                  </>
                )}
                {/* Valor do combo: a organização define, um para todas as marcas. */}
                <p className="mc-valor-combo">
                  <span>Valor do combo</span>
                  <b>{valorCombo === undefined ? '…' : valorCombo == null ? 'a definir' : 'R$ ' + Number(valorCombo).toFixed(2).replace('.', ',')}</b>
                  <em>definido pela organização</em>
                </p>
              </GrupoPublico>
              <GrupoPublico sim={false}>
                <div className="marcar-grupo" role="radiogroup" aria-label="Pode ser para viagem?">
                  <span className="marcar-grupo__pergunta">Pode ser para viagem?</span>
                  <label className="marcar"><input type="radio" name="combo_para_viagem" checked={extras.combo_para_viagem === true} onChange={() => alterarExtra('combo_para_viagem', true)} /><span>Sim</span></label>
                  <label className="marcar"><input type="radio" name="combo_para_viagem" checked={extras.combo_para_viagem === false} onChange={() => alterarExtra('combo_para_viagem', false)} /><span>Não</span></label>
                </div>
                {custos.viagem && (
                  <label className="mc-campo-curto"><span>Custo da embalagem para viagem <em>(em reais)</em> <EstadoCampo e={est('custo_embalagem')} /></span>
                    <input id="campo-custo_embalagem" inputMode="decimal" placeholder="0,00" required value={custosStr.embalagem} onChange={(e) => alterarCusto('embalagem', e.target.value)} />
                    <Correcao e={est('custo_embalagem')} />
                  </label>
                )}
                {custos.delivery
                  ? (
                    <label className="mc-campo-curto"><span>Custo do delivery <em>(em reais)</em> <EstadoCampo e={est('custo_delivery')} /></span>
                      <input id="campo-custo_delivery" inputMode="decimal" placeholder="0,00" required value={custosStr.delivery} onChange={(e) => alterarCusto('delivery', e.target.value)} />
                      <Correcao e={est('custo_delivery')} />
                    </label>
                  )
                  : <p className="nota">Custo do delivery: pedido só se alguma unidade entregar o combo (Meu cadastro › Atendimento e horário no festival).</p>}
                <label><span>A proposta criativa: qual é a história do combo? <Opcional /></span>
                  <textarea value={extras.combo_proposta} onChange={(e) => alterarExtra('combo_proposta', e.target.value)} />
                </label>
              </GrupoPublico>
            </Bloco>}

            {mostra(4) && <Bloco {...blocoProps(4)}>
              {modeloNovo
                ? <Unidades unidades={unidades} sugestoes={sugestoes} est={est} alterar={alterarUnidade}
                  adicionar={adicionarUnidade} remover={removerUnidade} usarSugestao={usarSugestao} />
                : semModelo}
            </Bloco>}

            {mostra(5) && <Bloco {...blocoProps(5)}>
              {modeloNovo
                ? <Alimentar itens={itens} declaracoes={declaracoes} substituicoes={substituicoes} unidades={unidades}
                  est={est} alterarDeclaracao={alterarDeclaracao} sub={sub} />
                : semModelo}
            </Bloco>}

            {mostra(6) && <Bloco {...blocoProps(6)}>
              {modeloNovo
                ? <Atendimento unidades={unidades} dias={dias} est={est} alterar={alterarAtendimento} alterarCanal={alterarCanal} alterarHorario={alterarHorario} desabilitado={emVerComo()} />
                : semModelo}
            </Bloco>}

            {/* A marca só salva (23/10/2026): não há envio nem revisão à parte. O que falta leva ao campo — mesmo na
                outra aba — e o cadastro que fica completo vai sozinho para a conferência da organização. */}
            {proximaFalta && (
              <p className="nota em-salvar__falta">
                <Icone nome="atencao" tamanho={16} />
                <span>{E.textoFaltam({ faltam })} para completar o cadastro.{' '}
                  <button className="link" type="button" onClick={() => irParaFalta(proximaFalta)}>
                    {proximaFalta.naOutraAba ? 'Ir para ' + E.ROTULO_AREA[proximaFalta.area] : 'Ir para o que falta'}<Icone nome="seta-direita" tamanho={16} />
                  </button>
                </span>
              </p>
            )}
            <p className="nota em-salvar__nota" id="nota-salvar">
              <Icone nome="informacao" tamanho={16} />
              <span><b>Os dados são salvos automaticamente.</b> Tudo o que você salva chega para a organização, que atualiza o site.</span>
            </p>
            <button className="acao larga" type="submit" aria-describedby="nota-salvar">Salvar</button>
          </form>
        </div>
      )}
    </>
  )
}
