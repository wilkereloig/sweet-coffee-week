import React from 'react'
import { Icone } from '../Icone'
import { LogoEditor } from '../LogoEditor'
import { api, registrarPendente, subirLogo, seFaltar } from '../../lib/marcaApi'
import { mascaraWhatsApp, validarWhatsApp } from '../../lib/participantes'
import { camposObrigatorios, progressoCampos, vistaDoBloco } from '../../lib/guia'
import { Carregando, Erro, Vazio } from '../ui'
import { VistaCabeca } from '../VistaCabeca'
import { confirmar } from '../Confirmar'
import {
  TIPOS, ROTULO_TIPO, ROTULO_POSICAO, itensEmOrdem,
  precoNumero, blocoCompleto, valorInformado, custosDeLinhas, primeiroBlocoPendente,
} from '../../lib/cadastro'
import * as E from '../../lib/edicaoMarca'
import { EstadoCampo, Correcao, Publico, Contador } from './edicao/campos'
import { Unidades } from './edicao/Unidades'
import { Atendimento } from './edicao/Atendimento'
import { Alimentar } from './edicao/Alimentar'
import { Previa, ListaFaltando, EstadoPublicacao } from './edicao/Envio'
import '../../styles/edicao-marca.css'

/*
 * Vista "Cadastro" da marca — porte de public/painel/index.html (#mvCadastro,
 * ~1504-1628) + carregar/carregarParticipacao/preencher/desenharItens/
 * desenharUnidades/desenharSessoes/desenharVagas/reservarVaga/progresso/
 * acordeão/autosave/concluir (~4855-5634). Sem DOM: todo campo é controlado
 * por estado React; a lógica de completude vive em lib/cadastro.js e, para a
 * camada de edição (Cartoon 2026.2), em lib/edicaoMarca.js.
 *
 * O resumo (situação, progresso e "salvo") fica preso ao topo da rolagem:
 * os blocos são longos, e quem preenche precisa ver o progresso e o
 * salvamento sem voltar ao início.
 */

const ICONE_BLOCO = ['bloco-marca', 'bloco-tema', 'bloco-itens', 'bloco-preco', 'bloco-local', 'informacao', 'atendimento']
const TITULO_BLOCO = [
  { b: '01 · A marca', s: 'Quem participa' },
  { b: '02 · O tema', s: 'Sua leitura do tema da edição' },
  { b: '03 · Os três itens', s: 'Dois itens de comer e uma bebida' },
  { b: '04 · O combo', s: 'Nome, descrição, condições, valor e custos' },
  { b: '05 · Unidades', s: 'Endereço, WhatsApp e quais participam' },
  { b: '06 · Informações alimentares e trocas', s: 'Alergênicos, características e trocas de cada item' },
  { b: '07 · Atendimento e horário do combo', s: 'Local, retirada, delivery e horário do combo por unidade' },
]

function Bloco({ indice, aberto, completo, faltam = 0, onToggle, children }) {
  const t = TITULO_BLOCO[indice]
  const selo = completo ? 'Pronto' : faltam ? (faltam === 1 ? 'Falta 1' : 'Faltam ' + faltam) : 'Pendente'
  return (
    <div className={'mc-bloco' + (aberto ? ' is-aberto' : '') + (completo ? ' is-pronto' : '')} data-bloco={indice}>
      <button type="button" className="mc-bloco__cabeca" aria-expanded={aberto} aria-controls={'bloco-' + indice} onClick={onToggle}>
        <span className="mc-bloco__disco" aria-hidden="true">
          <Icone nome={ICONE_BLOCO[indice]} tamanho={24} />
        </span>
        <span className="mc-bloco__texto"><b>{t.b}</b><span>{t.s}</span></span>
        <span className={'selo' + (completo ? ' completo' : '')}>{selo}</span>
        <Icone nome="abrir" tamanho={16} className="mc-bloco__chevron" />
      </button>
      <div className="mc-bloco__corpo" id={'bloco-' + indice} hidden={!aberto}>{children}</div>
    </div>
  )
}

function seloParticipacao(status) {
  if (status === 'cadastro_completo') return { classe: 'selo completo', texto: 'Cadastro completo' }
  if (status === 'em_preenchimento') return { classe: 'selo andamento', texto: 'Em preenchimento' }
  if (status === 'encerrado') return { classe: 'selo', texto: 'Edição encerrada' }
  return { classe: 'selo', texto: 'Aguardando cadastro' }
}

const MARCA_VAZIA = { nome_marca: '', responsavel: '', telefone: '', email: '', instagram: '', site: '', cnpj: '', razao_social: '', apresentacao_publica: '' }
const TEMA_VAZIO = { tema_combo: '', tema_justificativa: '' }
const COMBO_VAZIO = { combo_nome: '', combo_descricao: '', combo_condicoes: '' }
// Vegano/diet do combo inteiro e o texto "sobre o delivery" saíram (camada de
// edição): viraram declarações por item (bloco 5) e modos por unidade (bloco 6).
// "Para viagem" segue: decide se o custo da embalagem é pedido.
const EXTRAS_VAZIO = { combo_para_viagem: null, combo_proposta: '' }
const ROTULO_TEMA_STATUS = { proposto: 'Tema enviado — em análise pela organização.', aprovado: 'Tema aprovado pela organização.', recusado: 'A organização pediu outro tema.' }
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
      nome: (i.nome || '').trim(), descricao: (i.descricao || '').trim(), ingredientes: (i.ingredientes || '').trim(),
      ...(i.posicao === 2 ? { tipo: i.tipo } : {}),
    },
  }
}
// PATCH só com as colunas que mudaram desde a foto `antes`. Nada mudou →
// nem chama a rede, e conta como confirmado (`[true]`).
function patchMudancas(caminho, corpo, antes) {
  const mudou = {}
  for (const k of Object.keys(corpo)) if (!antes || JSON.stringify(corpo[k]) !== JSON.stringify(antes[k])) mudou[k] = corpo[k]
  if (!Object.keys(mudou).length) return Promise.resolve([true])
  return api(caminho, { metodo: 'PATCH', corpo: mudou, prefer: 'return=representation' })
}
const linha = (l) => (l && l[0] && typeof l[0] === 'object' ? l[0] : null)
// PATCH que volta vazio = a RLS recusou a linha: não é "salvo".
const vazio = (l) => !l || !l.length
const REPR = 'return=representation'
const baseDeclaracao = (x) => E.corpoDeclaracao({ estado: x.estado, observacao: x.observacao || '' })
const baseSubstituicao = (x) => E.corpoSubstituicao(E.substituicaoDeLinha(x))
const baseDisponibilidade = (x) => E.corpoDisponibilidade(E.disponibilidadeDeLinha(x))
const baseUnidade = (x) => E.corpoUnidade(E.unidadeDeLinhas(null, x))

function recadoOperacao(e) {
  const m = String((e && e.message) || '')
  if (m.includes('data_fora_do_festival')) return 'Esse dia está fora das datas do festival.'
  if (e && e.codigo === '23505') return 'Esse dia já tem um horário que começa nessa hora.'
  return 'Não deu para gravar o horário agora. O que você digitou continua na tela. Tente de novo.'
}

/*
 * Meu cadastro = blocos 0, 4 e 6; Meu combo = 1, 2, 3 e 5. Mesmo formulário,
 * mesmo salvamento automático, mesmo envio para análise. Os blocos 5 e 6
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
  // Situação do combo vem do resumo (lido a cada minuto): aprovar ou pedir
  // ajuste na organização aparece aqui sem remontar a tela. `comboLocal` só
  // cobre o instante entre enviar e o resumo novo chegar.
  const [comboLocal, setComboLocal] = React.useState(null)
  const comboResumo = resumo && resumo.combo ? resumo.combo : null
  const comboStatus = comboLocal || (comboResumo && comboResumo.status) || 'rascunho'
  const comboNota = comboResumo ? comboResumo.nota : null
  React.useEffect(() => { setComboLocal(null) }, [comboResumo && comboResumo.status])
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
  const [permanentes, setPermanentes] = React.useState([]) // unidades permanentes da marca
  const [declaracoes, setDeclaracoes] = React.useState({})
  const [substituicoes, setSubstituicoes] = React.useState([])
  const [pub, setPub] = React.useState(null)
  // As tabelas da camada de edição só existem com as migrations de 14/10/2026.
  // Sem elas o cadastro antigo segue abrindo, e os blocos novos dizem por quê.
  const [modeloNovo, setModeloNovo] = React.useState(true)
  const [previaAberta, setPreviaAberta] = React.useState(false)
  // Custos que se aplicam (cadastro.js · custosFaltando): embalagem se pode ser
  // para viagem; delivery se alguma unidade entrega O COMBO.
  const custos = {
    viagem: extras.combo_para_viagem === true, delivery: unidades.some((u) => u.participa && u.delivery_combo === 'sim'),
    embalagemStr: custosStr.embalagem, deliveryStr: custosStr.delivery,
  }

  const [blocoAberto, setBlocoAberto] = React.useState(0)
  const [salvoTexto, setSalvoTexto] = React.useState('')
  const [erroSalvar, setErroSalvar] = React.useState(null)
  const [concluindo, setConcluindo] = React.useState(false)
  const [concluirAviso, setConcluirAviso] = React.useState(null)

  const timerRef = React.useRef(null)
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
  const baseRef = React.useRef({ marca: null, participacao: null, itens: {}, un: {}, pu: {}, disp: {}, decl: {}, sub: {} })
  // Gravação em voo (uma por vez, ver salvarEmOrdem).
  const vooRef = React.useRef(null)

  function unidadeVazia() {
    tempSeqRef.current += 1
    return { ...E.unidadeDeLinhas(null, null), _key: 'novo-' + tempSeqRef.current }
  }

  const carregarPub = React.useCallback((id) => {
    if (!id) return
    api('rpc/marca_minha_publicacao', { metodo: 'POST', corpo: { p_participacao: id } }).then(setPub).catch(() => setPub(null))
  }, [])

  // ── Carregar ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const linhas = await api('participantes?select=*&order=created_at.desc')
        if (cancelado) return
        if (!linhas || !linhas.length) {
          setErroCarregar({ titulo: 'Conta sem marca', texto: 'Sua conta existe, mas ainda não há marca vinculada a ela. Fale com a organização.', tentar: false })
          setCarregando(false)
          return
        }
        const p = linhas[0]
        setParticipanteId(p.id)
        const marcaInicial = marcaDeLinha(p)
        setMarca(marcaInicial)
        baseRef.current.marca = corpoMarca(marcaInicial)

        const pas = await api('participacoes?select=*&order=created_at.desc&limit=1')
        if (cancelado) return
        const pa = (pas && pas[0]) || null
        if (!pa) {
          setSemParticipacao(true)
          setCarregando(false)
          return
        }
        setParticipacaoId(pa.id)
        setEdicaoCodigo(pa.edicao_codigo || '')
        setStatusCadastro(pa.status_cadastro || '')
        const daParticipacao = participacaoDeLinha(pa)
        setTema(daParticipacao.tema)
        setCombo(daParticipacao.combo)
        setCustosStr(daParticipacao.custosStr)
        if (pa.edicao_codigo) {
          api('edicoes?select=valor_combo,festival_inicio,festival_fim&codigo=eq.' + encodeURIComponent(pa.edicao_codigo))
            .then((e) => {
              const ed = (e && e[0]) || {}
              setValorCombo(ed.valor_combo ?? null)
              setFestival({ inicio: ed.festival_inicio || null, fim: ed.festival_fim || null })
            }).catch(() => setValorCombo(null))
        } else setValorCombo(null)
        setExtras(daParticipacao.extras)
        baseRef.current.participacao = corpoParticipacao(daParticipacao)
        api('temas_propostos?select=status,tema,observacao&participacao_id=eq.' + pa.id + '&status=neq.substituido&order=created_at.desc&limit=1')
          .then((t) => setRevisao({ tema: (t && t[0]) || null }))
          .catch(() => setRevisao({ tema: null }))

        const [itensRows, puRows, unRows] = await Promise.all([
          api('participantes_itens?select=*&participacao_id=eq.' + pa.id),
          api('participacao_unidades?select=*&participacao_id=eq.' + pa.id + '&order=ordem'),
          api('unidades?select=*&participante_id=eq.' + p.id + '&order=criado_em').catch(seFaltar(null)),
        ])
        if (cancelado) return
        const novo = unRows !== null
        const listaItens = itensRows || []
        const listaPu = puRows || []
        const ids = (xs) => xs.map((x) => x.id).join(',')
        const [dispRows, declRows, subRows] = novo
          ? await Promise.all([
            listaPu.length ? api('unidade_disponibilidade?select=*&participacao_unidade_id=in.(' + ids(listaPu) + ')&order=data,abre') : [],
            listaItens.length ? api('declaracoes_alimentares?select=*&item_id=in.(' + ids(listaItens) + ')') : [],
            listaItens.length ? api('substituicoes?select=*&item_id=in.(' + ids(listaItens) + ')&order=ordem,criado_em') : [],
          ])
          : [[], [], []]
        if (cancelado) return
        const listaUn = unRows || []
        const doBanco = listaPu.map((pu) => E.unidadeDeLinhas(pu, listaUn.find((u) => u.id === pu.unidade_id), dispRows))
        // Sem unidade nesta edição: com unidades guardadas, elas viram sugestão;
        // sem nenhuma, a tela mostra uma em branco para preencher.
        const listaUnidades = doBanco.length || listaUn.length ? doBanco : [unidadeVazia()]
        const subs = (subRows || []).map(E.substituicaoDeLinha)
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
        base.disp = Object.fromEntries((dispRows || []).map((d) => [d.id, baseDisponibilidade(d)]))
        base.decl = Object.fromEntries((declRows || []).map((d) => [d.id, baseDeclaracao(d)]))
        base.sub = Object.fromEntries((subRows || []).map((s) => [s.id, baseSubstituicao(s)]))
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
        setBlocoAberto(vis.includes(pend) ? pend
          : vis.find((n) => (n <= 4 && !blocoCompleto(n, dados)) || contagem[n]) ?? vis[0])
        setCarregando(false)
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
    const marcarUnidade = (k, mudanca) => setUnidades((prev) => prev.map((y) => (y._key === k ? { ...y, ...mudanca } : y)))

    // Unidade = duas linhas: a permanente (unidades) e a desta edição
    // (participacao_unidades). A nova nasce em dois POST, nessa ordem.
    function salvarUnidade(u, ordem) {
      const k = u._key
      const unId = u.unId || idsUnRef.current.get(k)
      const pu = u.puId ? { puId: u.puId } : idsPuRef.current.get(k)
      if (unId && pu) {
        return Promise.all([
          patchMudancas('unidades?id=eq.' + unId, E.corpoUnidade(u), base.un[unId]).then((l) => {
            const x = linha(l)
            if (x) {
              base.un[x.id] = baseUnidade(x)
              // Endereço mudou → o banco tira a conferência do mapa; a tela acompanha.
              if (!!x.coordenada_verificada_em !== u.verificada) marcarUnidade(k, { verificada: !!x.coordenada_verificada_em })
            }
            return l
          }),
          patchMudancas('participacao_unidades?id=eq.' + pu.puId, E.corpoParticipacaoUnidade(u, ordem), base.pu[pu.puId]).then((l) => {
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
            metodo: 'POST', corpo: { participacao_id: participacaoId, unidade_id: id, ...E.corpoParticipacaoUnidade(u, ordem) }, prefer: REPR,
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
          return l
        })
        .finally(() => postandoRef.current.delete(k))
    }

    // Linha filha sem id: POST uma vez (guardado por chave); com id: PATCH do que mudou.
    function salvarFilha({ k, id, tabela, corpo, extra, aoVoltar, aoCriar }) {
      if (id) return patchMudancas(tabela + '?id=eq.' + id, corpo, base[aoVoltar.base][id]).then((l) => { const x = linha(l); if (x) aoVoltar.fn(x); return l })
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
      tarefas.push(patchMudancas('participantes?id=eq.' + participanteId, corpoMarca(marca), base.marca)
        .then((l) => { if (linha(l)) base.marca = corpoMarca(marcaDeLinha(linha(l))); return l }))
    }
    if (mostra(1) || mostra(3)) {
      tarefas.push(patchMudancas('participacoes?id=eq.' + participacaoId, corpoParticipacao({ tema, combo, custosStr, extras }), base.participacao)
        .then((l) => { if (linha(l)) base.participacao = corpoParticipacao(participacaoDeLinha(linha(l))); return l }))
    }
    if (mostra(2)) {
      for (const i of itens) {
        const { caminho, corpo } = pedidoItem(i)
        tarefas.push(patchMudancas(caminho, corpo, base.itens[i.id]).then((l) => { const x = linha(l); if (x) base.itens[x.id] = pedidoItem(x).corpo; return l }))
      }
    }
    if (modeloNovo && (mostra(4) || mostra(6))) unidades.forEach((u, i) => tarefas.push(salvarUnidade(u, i)))
    if (modeloNovo && mostra(6)) {
      for (const u of unidades) {
        for (const d of u.disponibilidade) {
          if (E.erroFaixa(d.abre, d.fecha)) continue // o campo mostra o erro; grava quando corrigir
          tarefas.push(patchMudancas('unidade_disponibilidade?id=eq.' + d.id, E.corpoDisponibilidade(d), base.disp[d.id])
            .then((l) => { const x = linha(l); if (x) base.disp[x.id] = baseDisponibilidade(x); return l }))
        }
      }
    }
    if (modeloNovo && mostra(5)) {
      for (const [itemId, porAspecto] of Object.entries(declaracoes)) {
        for (const [aspecto, d] of Object.entries(porAspecto)) {
          if (!E.declaracaoGravavel(aspecto, d)) continue
          const k = 'dec-' + itemId + '-' + aspecto
          tarefas.push(salvarFilha({
            k, id: d.id || idsRef.current.get(k), tabela: 'declaracoes_alimentares', corpo: E.corpoDeclaracao(d), extra: { item_id: itemId, aspecto },
            aoVoltar: { base: 'decl', fn: (x) => { base.decl[x.id] = baseDeclaracao(x) } },
            aoCriar: (x) => setDeclaracoes((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [aspecto]: { ...(prev[itemId] || {})[aspecto], id: x.id } } })),
          }))
        }
      }
      for (const s of substituicoes) {
        if (!E.substituicaoGravavel(s)) continue
        tarefas.push(salvarFilha({
          k: s._key, id: s.id || idsRef.current.get(s._key), tabela: 'substituicoes', corpo: E.corpoSubstituicao(s), extra: { item_id: s.item_id },
          aoVoltar: { base: 'sub', fn: (x) => { base.sub[x.id] = baseSubstituicao(x) } },
          aoCriar: (x) => setSubstituicoes((prev) => prev.map((y) => (y._key === s._key ? { ...y, id: x.id } : y))),
        }))
      }
    }
    try {
      const respostas = await Promise.all(tarefas)
      if (respostas.some(vazio)) throw new Error('sem_confirmacao')
      if (!pendenteRef.current) setSalvoTexto('Informações salvas.')
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
      setErroSalvar('Não deu para salvar agora. O que você digitou continua na tela. Tente de novo.')
      return false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participanteId, participacaoId, marca, tema, combo, custosStr, itens, unidades, extras, declaracoes, substituicoes, modeloNovo, comboStatus, pub])

  React.useEffect(() => { salvarRef.current = salvar }, [salvar])

  /*
   * Uma gravação por vez. Timer, tela escondida, desmonte e "Enviar" podem
   * pedir juntos, e a mais velha chegaria por último, desfazendo a nova.
   * Pedido durante o voo marca "de novo": roda mais uma vez no fim, com o
   * estado mais recente, e quem pediu recebe o resultado dessa última.
   */
  const salvarEmOrdem = React.useCallback(() => {
    if (vooRef.current) { vooRef.current.deNovo = true; return vooRef.current.fim }
    const voo = { deNovo: false }
    vooRef.current = voo
    voo.fim = (async () => {
      try {
        let ok
        do { voo.deNovo = false; ok = await salvarRef.current() } while (voo.deNovo)
        return ok
      } finally { vooRef.current = null }
    })()
    return voo.fim
  }, [])

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
    function avisar(ev) { if (pendenteRef.current) { ev.preventDefault(); ev.returnValue = '' } }
    // No celular o beforeunload não dispara: trocar de app ou bloquear a tela
    // esconde a página, e é aí que o rascunho precisa ir para o servidor.
    function aoEsconder() { if (document.visibilityState === 'hidden') descarregar() }
    window.addEventListener('beforeunload', avisar)
    document.addEventListener('visibilitychange', aoEsconder)
    return () => {
      tirar()
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

  // Gravação imediata (horário do combo): primeiro descarrega o que está na
  // fila, para nenhum PATCH velho chegar depois da operação.
  async function operar(fn) {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    await salvarEmOrdem()
    try {
      await fn()
      setErroSalvar(null)
      if (!pendenteRef.current) setSalvoTexto('Informações salvas.')
      if (recarregarResumo) recarregarResumo()
      return true
    } catch (e) {
      if (!(e && e.message === 'sessao_expirada')) setErroSalvar(recadoOperacao(e))
      return false
    }
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
  function alterarUnidade(chave, campo, valor) {
    setUnidades((prev) => prev.map((u) => (u._key === chave ? { ...u, [campo]: valor } : u)))
    agendarSalvar()
  }
  function alterarCanal(chave, tipo, valor) {
    setUnidades((prev) => prev.map((u) => (u._key === chave ? { ...u, canais: { ...u.canais, [tipo]: valor } } : u)))
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
    // Sai DESTA edição; a unidade permanente fica guardada (volta como sugestão).
    if (pu) {
      api('participacao_unidades?id=eq.' + pu, { metodo: 'DELETE' }).catch((e) => {
        if (e && e.message === 'sessao_expirada') return
        setErroSalvar('Não deu para remover a unidade agora. Recarregue a página.')
      })
    }
    agendarSalvar() // a ordem das que ficaram muda
  }

  const trocarDisponibilidade = (k, lista) => setUnidades((prev) => prev.map((u) => (u._key === k
    ? { ...u, disponibilidade: lista.map(E.disponibilidadeDeLinha).sort((a, b) => (a.data + a.abre).localeCompare(b.data + b.abre)) }
    : u)))
  const horario = {
    alterar(k, id, campo, valor) {
      setUnidades((prev) => prev.map((u) => (u._key !== k ? u
        : { ...u, disponibilidade: u.disponibilidade.map((d) => (d.id === id ? { ...d, [campo]: valor } : d)) })))
      agendarSalvar()
    },
    async aplicarTodos(u, dias, r) {
      const n = u.disponibilidade.length
      if (n && !(await confirmar('Trocar o horário do combo nesta unidade? ' + (n === 1 ? 'O dia já informado dá' : 'Os ' + n + ' dias já informados dão') + ' lugar ao mesmo horário em todos os dias do festival.'))) return false
      return operar(async () => {
        await api('unidade_disponibilidade?participacao_unidade_id=eq.' + u.puId, { metodo: 'DELETE' })
        for (const d of u.disponibilidade) delete baseRef.current.disp[d.id]
        trocarDisponibilidade(u._key, [])
        const linhas = await api('unidade_disponibilidade', { metodo: 'POST', corpo: E.linhasMesmoHorario(u.puId, dias, r.abre, r.fecha, r.observacao), prefer: REPR })
        for (const x of linhas || []) baseRef.current.disp[x.id] = baseDisponibilidade(x)
        trocarDisponibilidade(u._key, linhas || [])
      })
    },
    incluir(u, novo) {
      return operar(async () => {
        const l = await api('unidade_disponibilidade', {
          metodo: 'POST', corpo: { participacao_unidade_id: u.puId, data: novo.data, abre: novo.abre, fecha: novo.fecha }, prefer: REPR,
        })
        const x = linha(l)
        if (!x) throw new Error('sem_confirmacao')
        baseRef.current.disp[x.id] = baseDisponibilidade(x)
        setUnidades((prev) => prev.map((y) => (y._key === u._key
          ? { ...y, disponibilidade: [...y.disponibilidade, E.disponibilidadeDeLinha(x)].sort((a, b) => (a.data + a.abre).localeCompare(b.data + b.abre)) }
          : y)))
      })
    },
    remover(u, d) {
      return operar(async () => {
        await api('unidade_disponibilidade?id=eq.' + d.id, { metodo: 'DELETE' })
        delete baseRef.current.disp[d.id]
        setUnidades((prev) => prev.map((y) => (y._key === u._key ? { ...y, disponibilidade: y.disponibilidade.filter((x) => x.id !== d.id) } : y)))
      })
    },
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
        api('substituicoes?id=eq.' + id, { metodo: 'DELETE' }).catch((e) => {
          if (e && e.message === 'sessao_expirada') return
          setErroSalvar('Não deu para remover a troca agora. Recarregue a página.')
        })
      }
    },
  }

  const traduzir = (codigo) => E.traduzirFaltando(codigo, { unidades, itens })
  function focarCampo(campo, bloco) {
    window.setTimeout(() => {
      const el = (campo && document.getElementById('campo-' + campo)) || document.getElementById('bloco-' + bloco)
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus) el.focus({ preventScroll: true }) }
    }, 60)
  }
  // Pendência da lista → o campo. Está na OUTRA aba (Meu cadastro × Meu combo): leva até ela.
  function irParaFalta(f) {
    if (f.bloco === null) return
    if (visiveis.includes(f.bloco)) { setBlocoAberto(f.bloco); focarCampo(f.campo, f.bloco) }
    else if (irPara) irPara(vistaDoBloco(f.bloco), { sub: String(f.bloco), campo: f.campo || '' })
  }

  async function abrirPrevia() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    await salvarEmOrdem() // a prévia mostra o que está GRAVADO
    setPreviaAberta(true)
  }

  async function concluir(ev) {
    ev.preventDefault()
    setConcluindo(true)
    setConcluirAviso(null)
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    // Salva antes de concluir: quem valida é o servidor, sobre o que está
    // GRAVADO — concluir com o autosave pendente reprovaria campo cheio.
    if (!(await salvarEmOrdem())) { setConcluindo(false); return } // o erro de salvar já está na tela
    try {
      const r = await api('rpc/marca_concluir_cadastro', { metodo: 'POST', corpo: { p_participacao: participacaoId } })
      if (!r || r.ok !== true) {
        const faltando = ((r && r.faltando) || []).map(traduzir)
        setConcluirAviso({ tom: 'erro', texto: 'Antes de enviar, ainda falta:', faltando })
        // Abre o primeiro bloco pendente desta aba para a pessoa ver onde está a falta.
        const daqui = faltando.find((f) => visiveis.includes(f.bloco))
        if (daqui) setBlocoAberto(daqui.bloco)
      } else {
        const reenvio = comboStatus === 'correcao_solicitada'
        const alteracao = !!(pub && pub.alterado_apos_aprovacao)
        setStatusCadastro('cadastro_completo')
        // O banco já passou o combo para análise: o pedido de ajuste sai da tela.
        if (comboStatus === 'rascunho' || comboStatus === 'correcao_solicitada' || (comboStatus === 'aprovado' && alteracao)) setComboLocal('em_analise')
        setConcluirAviso({
          tom: 'ok',
          texto: alteracao
            ? 'Alterações enviadas em ' + new Date().toLocaleDateString('pt-BR') + '. A versão publicada continua no ar até a organização revisar.'
            : (reenvio ? 'Alterações enviadas novamente' : 'Enviado para análise') + ' em ' + new Date().toLocaleDateString('pt-BR') +
              '. A organização confere e avisa aqui. Mudou alguma coisa? É só editar e enviar de novo.',
        })
        if (recarregarResumo) recarregarResumo()
        if (modeloNovo) carregarPub(participacaoId)
      }
    } catch (e) {
      if (!(e && e.message === 'sessao_expirada')) {
        setConcluirAviso({ tom: 'erro', texto: 'Não deu para concluir agora. Tente de novo em instantes.' })
      }
    } finally {
      setConcluindo(false)
    }
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
  const selo = semParticipacao ? { classe: 'selo', texto: 'Sem edição aberta' } : seloParticipacao(statusCadastro)
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
  // "Faltam N itens para enviar": a regra de marca_concluir_cadastro — os
  // campos obrigatórios (a logo não trava o envio) + o que a página pública
  // precisa (pendencias_publicacao), sem contar "sem unidade" duas vezes.
  const faltaCampos = obrigatorios.filter((c) => !c.ok && c.campo !== 'logo')
  const pendEd = modeloNovo ? E.pendenciasEdicao({ comboNome: combo.combo_nome, unidades, itens, declaracoes }) : []
  const pendEdicao = faltaCampos.some((c) => c.campo === 'unidade-endereco') ? pendEd.filter((c) => c !== 'sem_unidade') : pendEd
  const faltamEnviar = faltaCampos.length + pendEdicao.length
  const contagem = E.contarPorBloco(pendEdicao)
  const faltamNo = (n) => faltaCampos.filter((c) => c.bloco === n).length + (contagem[n] || 0)
  const pronto = (n) => (n <= 4 ? blocoCompleto(n, dadosProgresso) : modeloNovo) && !contagem[n]
  const sugestoes = permanentes.filter((un) => !unidades.some((u) => (u.unId || idsUnRef.current.get(u._key)) === un.id))
  const dias = E.diasDoFestival(festival.inicio, festival.fim)
  const erroWhats = validarWhatsApp(marca.telefone)
  const reenviar = comboStatus === 'correcao_solicitada'
  const alterado = !!(pub && pub.alterado_apos_aprovacao)
  const semModelo = <p className="aviso">Esta etapa abre quando a organização liberar a nova versão do cadastro da edição.</p>
  const blocoProps = (n) => ({
    indice: n, aberto: blocoAberto === n, completo: pronto(n), faltam: faltamNo(n),
    onToggle: () => setBlocoAberto((a) => (a === n ? null : n)),
  })

  return (
    <>
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
          <div className="mc-resumo">
            <span className={selo.classe}>{selo.texto}</span>
            <div className="progresso">
              <b>Cadastro {prog.pct}% concluído</b>
              <div className="trilha" role="progressbar" aria-label="Cadastro concluído" aria-valuemin={0} aria-valuemax={100} aria-valuenow={prog.pct}>
                <i style={{ '--p': prog.pct / 100 }} />
              </div>
              <span className="em-faltam">{faltamEnviar ? (faltamEnviar === 1 ? 'Falta 1 item para enviar' : 'Faltam ' + faltamEnviar + ' itens para enviar') : 'Tudo pronto para enviar'}</span>
            </div>
            <p className="salvo" role="status">{salvoTexto}</p>
          </div>
          {erroSalvar && (
            <div className="aviso erro" role="alert">
              {erroSalvar}{' '}
              <button className="link" type="button" onClick={() => { setErroSalvar(null); salvarEmOrdem() }}>Tentar de novo</button>
            </div>
          )}
          <EstadoPublicacao pub={pub} />

          {/* noValidate: campos obrigatórios moram em blocos fechados (hidden),
              e o navegador travava o envio sem mostrar balão nenhum. Quem
              valida é o servidor (marca_concluir_cadastro), que diz o que falta. */}
          <form
            onSubmit={concluir} noValidate
            // Enter num campo de uma linha (o "Ir" do teclado do celular) não
            // conclui o cadastro: concluir avisa a organização. Só o botão.
            onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault() }}
          >
            {mostra(0) && <Bloco {...blocoProps(0)}>
              <p className="nota">Isto atravessa as edições. Corrija o que mudou.</p>
              {/* Só leitura: o nome é o login da marca (§10.4-b). Mudar aqui a deixaria sem entrar. */}
              <label><span>Nome da marca <EstadoCampo e={est('nome_marca')} /> <Publico /></span><input id="campo-nome_marca" readOnly aria-describedby="nota-nome_marca" value={marca.nome_marca} /><span className="nota" id="nota-nome_marca">Para mudar o nome, fale com a organização.</span><Correcao e={est('nome_marca')} /></label>
              {/* A logo oficial: sobe na hora (não espera o salvamento automático). */}
              {participanteId && (
                <div className="mc-campo-logo">
                  <span className="mc-campo-logo__rotulo">Logo do estabelecimento <EstadoCampo e={est('logo')} /> <Publico /></span>
                  <LogoEditor participanteId={participanteId} nomeMarca={marca.nome_marca} adaptador={adaptadorLogo} modo="marca" onMudou={recarregarResumo} />
                  <Correcao e={est('logo')} />
                </div>
              )}
              {modeloNovo && (
                <label><span>Apresentação da casa <em>(opcional)</em> <EstadoCampo e={est('apresentacao_publica')} /> <Publico /> <Contador valor={marca.apresentacao_publica} max={280} /></span>
                  <textarea id="campo-apresentacao_publica" maxLength={280} aria-describedby="nota-apresentacao" value={marca.apresentacao_publica} onChange={(e) => alterarMarca('apresentacao_publica', e.target.value)} />
                  <span className="nota" id="nota-apresentacao">Duas ou três frases sobre a casa, para a sua página no site. Sem preço nem promoção.</span>
                  <Correcao e={est('apresentacao_publica')} />
                </label>
              )}
              <div className="dupla">
                <label><span>Responsável pelo festival <EstadoCampo e={est('responsavel')} /> <Publico sim={false} /></span><input id="campo-responsavel" required value={marca.responsavel} onChange={(e) => alterarMarca('responsavel', e.target.value)} /><Correcao e={est('responsavel')} /></label>
                {/* O telefone de cadastro É o WhatsApp: é por ele que a organização fala com a marca. */}
                <label><span>WhatsApp do responsável <EstadoCampo e={est('telefone')} /> <Publico sim={false} /></span>
                  <input id="campo-telefone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(84) 99999-9999" required
                    aria-invalid={!!erroWhats} aria-describedby={erroWhats ? 'erro-telefone' : undefined}
                    value={marca.telefone} onChange={(e) => alterarMarca('telefone', mascaraWhatsApp(e.target.value))} />
                  {erroWhats && <span className="gm-campo-erro" id="erro-telefone">{erroWhats}</span>}
                  <Correcao e={est('telefone')} />
                </label>
              </div>
              <div className="dupla">
                <label><span>E-mail de contato <EstadoCampo e={est('email')} /> <Publico sim={false} /></span><input id="campo-email" type="email" inputMode="email" value={marca.email} onChange={(e) => alterarMarca('email', e.target.value)} /><Correcao e={est('email')} /></label>
                <label><span>Instagram <em>(opcional)</em> <EstadoCampo e={est('instagram')} /> <Publico /></span><input id="campo-instagram" placeholder="@suamarca" value={marca.instagram} onChange={(e) => alterarMarca('instagram', e.target.value)} /><Correcao e={est('instagram')} /></label>
              </div>
              <div className="dupla">
                <label><span>Site <em>(opcional)</em> <Publico /></span><input placeholder="https://" value={marca.site} onChange={(e) => alterarMarca('site', e.target.value)} /></label>
                <label><span>CNPJ <em>(opcional)</em> <Publico sim={false} /></span><input inputMode="numeric" value={marca.cnpj} onChange={(e) => alterarMarca('cnpj', e.target.value)} /></label>
              </div>
              <label><span>Razão social <em>(opcional)</em> <Publico sim={false} /></span><input value={marca.razao_social} onChange={(e) => alterarMarca('razao_social', e.target.value)} /></label>
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
              <label><span>Tema escolhido pela marca <EstadoCampo e={est('tema_combo')} /> <Publico sim={false} /></span><input id="campo-tema_combo" required value={tema.tema_combo} onChange={(e) => alterarTema('tema_combo', e.target.value)} /><Correcao e={est('tema_combo')} /></label>
              <label><span>Justificativa <em>(por que esse ângulo, como conversa com a inspiração)</em> <EstadoCampo e={est('tema_justificativa')} /> <Publico sim={false} /></span>
                <textarea id="campo-tema_justificativa" required value={tema.tema_justificativa} onChange={(e) => alterarTema('tema_justificativa', e.target.value)} />
                <Correcao e={est('tema_justificativa')} />
              </label>
            </Bloco>}

            {mostra(2) && <Bloco {...blocoProps(2)}>
              <p className="nota">Cada item é julgado na sua categoria, e a média dos três é o
                Melhor Combo. Descreva como cada um conversa com o tema.</p>
              <p className="nota">Alergênicos, características (vegano, lactose…) e trocas de cada item ficam
                em <b>Informações alimentares e trocas</b>, logo abaixo.</p>
              {comboStatus === 'correcao_solicitada' && (
                <div className="aviso erro" role="alert">A organização pediu um ajuste no combo{comboNota ? ': “' + comboNota + '”' : '.'} Corrija os campos marcados e envie novamente para análise.</div>
              )}
              {comboStatus === 'aprovado' && <div className="aviso" role="status">Combo aprovado pela organização.{comboNota ? ' “' + comboNota + '”' : ''}</div>}
              {itens.length < TIPOS.length && (
                <div className="aviso erro" role="alert">
                  Faltam itens do combo na sua participação. Fale com a organização para liberar.
                </div>
              )}
              <div>
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
                      <label><span>Nome <EstadoCampo e={est('item-' + it.posicao + '-nome')} /> <Publico /></span><input id={'campo-item-' + it.posicao + '-nome'} maxLength={80} value={it.nome || ''} onChange={(e) => alterarItem(it.id, 'nome', e.target.value)} /><Correcao e={est('item-' + it.posicao + '-nome')} /></label>
                      <label><span>Descrição <em>(como conversa com o tema)</em> <EstadoCampo e={est('item-' + it.posicao + '-descricao')} /> <Publico /></span>
                        <textarea id={'campo-item-' + it.posicao + '-descricao'} maxLength={300} value={it.descricao || ''} onChange={(e) => alterarItem(it.id, 'descricao', e.target.value)} />
                        <Correcao e={est('item-' + it.posicao + '-descricao')} />
                      </label>
                      <label><span>Ingredientes <EstadoCampo e={est('item-' + it.posicao + '-ingredientes')} /> <Publico /></span><input id={'campo-item-' + it.posicao + '-ingredientes'} maxLength={600} value={it.ingredientes || ''} onChange={(e) => alterarItem(it.id, 'ingredientes', e.target.value)} /><Correcao e={est('item-' + it.posicao + '-ingredientes')} /></label>
                    </div>
                  )
                })}
              </div>
            </Bloco>}

            {mostra(3) && <Bloco {...blocoProps(3)}>
              {modeloNovo && (
                <>
                  <label><span>Nome do combo <EstadoCampo e={est('combo_nome')} /> <Publico /> <Contador valor={combo.combo_nome} max={80} /></span>
                    <input id="campo-combo_nome" maxLength={80} value={combo.combo_nome} onChange={(e) => alterarCombo('combo_nome', e.target.value)} />
                    <Correcao e={est('combo_nome')} />
                  </label>
                  <label><span>Descrição do combo <EstadoCampo e={est('combo_descricao')} /> <Publico /> <Contador valor={combo.combo_descricao} max={400} /></span>
                    <textarea id="campo-combo_descricao" maxLength={400} value={combo.combo_descricao} onChange={(e) => alterarCombo('combo_descricao', e.target.value)} />
                    <Correcao e={est('combo_descricao')} />
                  </label>
                  <label><span>Condições <em>(opcional)</em> <EstadoCampo e={est('combo_condicoes')} /> <Publico /> <Contador valor={combo.combo_condicoes} max={280} /></span>
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
                <em>definido pela organização</em> <Publico />
              </p>
              <div className="marcar-grupo" role="radiogroup" aria-label="Pode ser para viagem?">
                <span className="marcar-grupo__pergunta">Pode ser para viagem? <Publico sim={false} /></span>
                <label className="marcar"><input type="radio" name="combo_para_viagem" checked={extras.combo_para_viagem === true} onChange={() => alterarExtra('combo_para_viagem', true)} /><span>Sim</span></label>
                <label className="marcar"><input type="radio" name="combo_para_viagem" checked={extras.combo_para_viagem === false} onChange={() => alterarExtra('combo_para_viagem', false)} /><span>Não</span></label>
              </div>
              {custos.viagem && (
                <label className="mc-campo-curto"><span>Custo da embalagem para viagem <em>(em reais)</em> <EstadoCampo e={est('custo_embalagem')} /> <Publico sim={false} /></span>
                  <input id="campo-custo_embalagem" inputMode="decimal" placeholder="0,00" required value={custosStr.embalagem} onChange={(e) => alterarCusto('embalagem', e.target.value)} />
                  <Correcao e={est('custo_embalagem')} />
                </label>
              )}
              {custos.delivery
                ? (
                  <label className="mc-campo-curto"><span>Custo do delivery <em>(em reais)</em> <EstadoCampo e={est('custo_delivery')} /> <Publico sim={false} /></span>
                    <input id="campo-custo_delivery" inputMode="decimal" placeholder="0,00" required value={custosStr.delivery} onChange={(e) => alterarCusto('delivery', e.target.value)} />
                    <Correcao e={est('custo_delivery')} />
                  </label>
                )
                : <p className="nota">Custo do delivery: pedido só se alguma unidade entregar o combo (Meu cadastro › Atendimento e horário do combo).</p>}
              <label><span>A proposta criativa: qual é a história do combo? <em>(opcional)</em> <Publico sim={false} /></span>
                <textarea value={extras.combo_proposta} onChange={(e) => alterarExtra('combo_proposta', e.target.value)} />
              </label>
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
                ? <Atendimento unidades={unidades} dias={dias} est={est} alterar={alterarUnidade} alterarCanal={alterarCanal} horario={horario} />
                : semModelo}
            </Bloco>}

            {modeloNovo && (
              <button className="acao secundaria larga" type="button" onClick={abrirPrevia}>
                <Icone nome="visao" tamanho={16} />Ver como fica no site
              </button>
            )}
            {/* Enviar vale para o cadastro inteiro (as duas abas): quem confere o
                que falta é o servidor (marca_concluir_cadastro). */}
            <button className="acao larga" type="submit" disabled={concluindo}>
              {concluindo ? 'Enviando…' : alterado ? 'Enviar alterações' : reenviar ? 'Enviar novamente para análise' : 'Enviar para análise'}
            </button>
          </form>

          {concluirAviso && (
            <div className={'aviso mc-concluir-aviso ' + concluirAviso.tom} role={concluirAviso.tom === 'erro' ? 'alert' : 'status'}>
              {concluirAviso.texto}
              <ListaFaltando itens={concluirAviso.faltando} onIr={irParaFalta} />
            </div>
          )}
          {modeloNovo && (
            <Previa aberta={previaAberta} onFechar={() => setPreviaAberta(false)} traduzir={traduzir} onIr={irParaFalta}
              carregar={() => api('rpc/marca_previa_publica', { metodo: 'POST', corpo: { p_participacao: participacaoId } })} />
          )}
        </div>
      )}
    </>
  )
}
