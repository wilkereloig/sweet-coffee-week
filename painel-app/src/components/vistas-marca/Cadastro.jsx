import React from 'react'
import { Icone } from '../Icone'
import { LogoEditor } from '../LogoEditor'
import { api, registrarPendente, subirLogo } from '../../lib/marcaApi'
import { mascaraWhatsApp, validarWhatsApp } from '../../lib/participantes'
import { camposObrigatorios, progressoCampos } from '../../lib/guia'
import { Carregando, Erro, Vazio } from '../ui'
import { VistaCabeca } from '../VistaCabeca'
import {
  TIPOS, ROTULO_TIPO, CANAIS, NOMES_FALTANDO, ROTULO_POSICAO, itensEmOrdem,
  precoNumero, blocoCompleto,
  primeiroBlocoPendente, canaisParaObjeto, canaisParaArray,
} from '../../lib/cadastro'

/*
 * Estado de cada campo obrigatório (guia da marca, 29/09/2026): ícone + texto
 * ao lado do rótulo, nunca só cor. "Completo/Falta" é calculado ao vivo;
 * "Alteração solicitada" e "Em análise" vêm da organização (correcoes_campo).
 */
const ESTADO_CAMPO = {
  completo: { icone: '✓', texto: 'Completo' },
  falta: { icone: '!', texto: 'Falta' },
  alteracao: { icone: '↺', texto: 'Alteração solicitada' },
  analise: { icone: '◔', texto: 'Em análise' },
  aprovado: { icone: '✓', texto: 'Aprovado' },
}
function EstadoCampo({ e }) {
  if (!e) return null
  const x = ESTADO_CAMPO[e.estado]
  return <span className="gm-campo-estado" data-estado={e.estado}><span aria-hidden="true">{x.icone}</span> {x.texto}</span>
}
function Correcao({ e }) {
  if (!e || e.estado !== 'alteracao' || !e.comentario) return null
  return <span className="gm-correcao" role="note"><b>A organização pediu:</b> {e.comentario}</span>
}

/*
 * Vista "Cadastro" da marca — porte de public/painel/index.html (#mvCadastro,
 * ~1504-1628) + carregar/carregarParticipacao/preencher/desenharItens/
 * desenharUnidades/desenharSessoes/desenharVagas/reservarVaga/progresso/
 * acordeão/autosave/concluir (~4855-5634). Sem DOM: todo campo é controlado
 * por estado React; a lógica de completude vive em lib/cadastro.js.
 *
 * O resumo (situação, progresso e "salvo") fica preso ao topo da rolagem:
 * os blocos são longos, e quem preenche precisa ver o progresso e o
 * salvamento sem voltar ao início.
 */

const ICONE_BLOCO = ['bloco-marca', 'bloco-tema', 'bloco-itens', 'bloco-preco', 'bloco-local']
const TITULO_BLOCO = [
  { b: '01 · A marca', s: 'Quem participa' },
  { b: '02 · O tema', s: 'Sua leitura do tema da edição' },
  { b: '03 · Os três itens', s: 'Dois itens de comer e uma bebida' },
  { b: '04 · Preço e detalhes', s: 'Valor, viagem, delivery e a proposta' },
  { b: '05 · Onde encontrar', s: 'Suas unidades' },
]

function Bloco({ indice, aberto, completo, onToggle, children }) {
  const t = TITULO_BLOCO[indice]
  return (
    <div className={'mc-bloco' + (aberto ? ' is-aberto' : '') + (completo ? ' is-pronto' : '')} data-bloco={indice}>
      <button type="button" className="mc-bloco__cabeca" aria-expanded={aberto} aria-controls={'bloco-' + indice} onClick={onToggle}>
        <span className="mc-bloco__disco" aria-hidden="true">
          <Icone nome={ICONE_BLOCO[indice]} tamanho={24} />
        </span>
        <span className="mc-bloco__texto"><b>{t.b}</b><span>{t.s}</span></span>
        <span className={'selo' + (completo ? ' completo' : '')}>{completo ? 'Pronto' : 'Pendente'}</span>
        <svg className="mc-bloco__chevron" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.8 12.6 16 21.8l9.2-9.2" /></svg>
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

const MARCA_VAZIA = { nome_marca: '', responsavel: '', telefone: '', email: '', instagram: '', site: '', cnpj: '', razao_social: '' }
const TEMA_VAZIO = { tema_combo: '', tema_justificativa: '' }
// Campos do combo que a planilha da organização pede (29/09/2026). Nenhum é
// obrigatório para concluir: a regra atual só exige tema, itens, preço e endereço.
const EXTRAS_VAZIO = { combo_para_viagem: null, combo_vegano: null, combo_diet: null, combo_delivery: '', combo_proposta: '' }
const ROTULO_TEMA_STATUS = { proposto: 'Tema enviado — em análise pela organização.', aprovado: 'Tema aprovado pela organização.', recusado: 'A organização pediu outro tema.' }

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
  razao_social: p.razao_social || '',
})
// O nome da marca NÃO vai no corpo: ele é o login dela (§10.4-b) e só a
// organização o muda.
function corpoMarca(marca) {
  const camposMarca = {
    responsavel: marca.responsavel.trim(), telefone: marca.telefone.trim(),
    email: marca.email.trim(), instagram: marca.instagram.trim(), site: marca.site.trim(),
    cnpj: marca.cnpj.trim(), razao_social: marca.razao_social.trim(),
  }
  return camposMarca
}
const participacaoDeLinha = (pa) => ({
  tema: { tema_combo: pa.tema_combo || '', tema_justificativa: pa.tema_justificativa || '' },
  precoStr: pa.combo_preco == null ? '' : String(pa.combo_preco).replace('.', ','),
  extras: {
    combo_para_viagem: pa.combo_para_viagem ?? null, combo_vegano: pa.combo_vegano ?? null, combo_diet: pa.combo_diet ?? null,
    combo_delivery: pa.combo_delivery || '', combo_proposta: pa.combo_proposta || '',
  },
})
function corpoParticipacao({ tema, precoStr, extras }) {
  const camposParticipacao = {
    tema_combo: tema.tema_combo.trim(), tema_justificativa: tema.tema_justificativa.trim(),
    combo_preco: precoNumero(precoStr) || null,
    combo_para_viagem: extras.combo_para_viagem, combo_vegano: extras.combo_vegano, combo_diet: extras.combo_diet,
    combo_delivery: extras.combo_delivery.trim() || null, combo_proposta: extras.combo_proposta.trim() || null,
  }
  return camposParticipacao
}
function pedidoItem(i) {
  return {
    caminho: 'participantes_itens?id=eq.' + i.id,
    corpo: {
      nome: (i.nome || '').trim(), descricao: (i.descricao || '').trim(), ingredientes: (i.ingredientes || '').trim(),
      vegano: !!i.vegano, sem_gluten: !!i.sem_gluten, sem_lactose: !!i.sem_lactose,
      ...(i.posicao === 2 ? { tipo: i.tipo } : {}),
    },
  }
}
const unidadeDeLinha = (u) => ({
  _key: u.id, id: u.id, endereco: u.endereco || '', bairro: u.bairro || '',
  horarios: u.horarios || '', faz_delivery: !!u.faz_delivery, canais: canaisParaObjeto(u.canais_delivery),
})
const corpoUnidade = (u, ordem) => ({
  ordem, endereco: u.endereco.trim(), bairro: u.bairro.trim(), horarios: u.horarios.trim(),
  faz_delivery: !!u.faz_delivery, canais_delivery: canaisParaArray(u.canais),
})
// PATCH só com as colunas que mudaram desde a foto `antes`. Nada mudou →
// nem chama a rede, e conta como confirmado (`[true]`).
function patchMudancas(caminho, corpo, antes) {
  const mudou = {}
  for (const k of Object.keys(corpo)) if (!antes || JSON.stringify(corpo[k]) !== JSON.stringify(antes[k])) mudou[k] = corpo[k]
  if (!Object.keys(mudou).length) return Promise.resolve([true])
  return api(caminho, { metodo: 'PATCH', corpo: mudou, prefer: 'return=representation' })
}

// Meu cadastro = blocos 0 e 4; Meu combo = 1, 2 e 3. Mesmo formulário,
// mesmo salvamento automático, mesmo envio para análise.
export function Cadastro({ alvo, consumirAlvo, irPara, blocos = [0, 1, 2, 3, 4], resumo = null, recarregarResumo } = {}) {
  const mostra = (n) => blocos.includes(n)
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
  const [precoStr, setPrecoStr] = React.useState('')
  const [itens, setItens] = React.useState([])
  const [unidades, setUnidades] = React.useState([])

  const [blocoAberto, setBlocoAberto] = React.useState(0)
  const [salvoTexto, setSalvoTexto] = React.useState('')
  const [erroSalvar, setErroSalvar] = React.useState(null)
  const [concluindo, setConcluindo] = React.useState(false)
  const [concluirAviso, setConcluirAviso] = React.useState(null)

  const timerRef = React.useRef(null)
  const salvarRef = React.useRef(() => Promise.resolve())
  const tempSeqRef = React.useRef(0)
  // Unidades com POST em voo e ids já devolvidos pelo servidor (por _key):
  // o estado React só vê o id depois do próximo render.
  const postandoRef = React.useRef(new Set())
  const idsCriadosRef = React.useRef(new Map())
  const removidasRef = React.useRef(new Set()) // removidas com o POST ainda em voo
  // Há edição que ainda não foi confirmada pelo servidor (debounce correndo
  // ou última gravação falhou).
  const pendenteRef = React.useRef(false)
  // Foto do que o servidor tem gravado (ver patchMudancas).
  const baseRef = React.useRef({ marca: null, participacao: null, itens: {}, unidades: {} })
  // Gravação em voo (uma por vez, ver salvarEmOrdem).
  const vooRef = React.useRef(null)

  function unidadeVazia() {
    tempSeqRef.current += 1
    return { _key: 'novo-' + tempSeqRef.current, id: null, endereco: '', bairro: '', horarios: '', faz_delivery: false, canais: canaisParaObjeto([]) }
  }

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
        const precoInicial = daParticipacao.precoStr
        setTema(daParticipacao.tema)
        setPrecoStr(precoInicial)
        setExtras(daParticipacao.extras)
        baseRef.current.participacao = corpoParticipacao(daParticipacao)
        api('temas_propostos?select=status,tema,observacao&participacao_id=eq.' + pa.id + '&status=neq.substituido&order=created_at.desc&limit=1')
          .then((t) => setRevisao({ tema: (t && t[0]) || null }))
          .catch(() => setRevisao({ tema: null }))

        const [itensRows, unidadesRows] = await Promise.all([
          api('participantes_itens?select=*&participacao_id=eq.' + pa.id),
          api('participacao_unidades?select=*&participacao_id=eq.' + pa.id + '&order=ordem'),
        ])
        if (cancelado) return
        const listaItens = itensRows || []
        const listaUnidades = (unidadesRows && unidadesRows.length)
          ? unidadesRows.map(unidadeDeLinha)
          : [unidadeVazia()]
        setItens(listaItens)
        setUnidades(listaUnidades)
        baseRef.current.itens = Object.fromEntries(listaItens.map((i) => [i.id, pedidoItem(i).corpo]))
        baseRef.current.unidades = Object.fromEntries((unidadesRows || []).map((u) => [u.id, corpoUnidade(unidadeDeLinha(u), u.ordem)]))
        // Abre o primeiro bloco pendente DESTA aba (ou o primeiro dela).
        const pend = primeiroBlocoPendente({
          marca: { nome_marca: p.nome_marca || '', responsavel: p.responsavel || '', telefone: p.telefone || '' },
          tema: { tema_combo: pa.tema_combo || '', tema_justificativa: pa.tema_justificativa || '' },
          itens: listaItens, unidades: listaUnidades, precoStr: precoInicial,
        })
        setBlocoAberto(blocos.includes(pend) ? pend : blocos.find((n) => !blocoCompleto(n, {
          marca: { nome_marca: p.nome_marca || '', responsavel: p.responsavel || '', telefone: p.telefone || '' },
          tema: { tema_combo: pa.tema_combo || '', tema_justificativa: pa.tema_justificativa || '' },
          itens: listaItens, unidades: listaUnidades, precoStr: precoInicial,
        })) ?? blocos[0])
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
    const salvarItens = () => Promise.all(itens.map((i) => {
      const { caminho, corpo } = pedidoItem(i)
      return patchMudancas(caminho, corpo, base.itens[i.id])
    }))
    const salvarUnidades = () => Promise.all(unidades.map((u, i) => {
      const corpo = corpoUnidade(u, i)
      const id = u.id || idsCriadosRef.current.get(u._key)
      if (id) return patchMudancas('participacao_unidades?id=eq.' + id, corpo, base.unidades[id])
      // Unidade vazia não vira linha — a tela sempre mostra uma em branco.
      if (!corpo.endereco) return Promise.resolve([true])
      // POST já em voo para esta unidade (rede lenta, segundo autosave antes do
      // id voltar): não cria outra linha — a próxima rodada faz PATCH.
      if (postandoRef.current.has(u._key)) return Promise.resolve([true])
      postandoRef.current.add(u._key)
      return api('participacao_unidades', { metodo: 'POST', corpo: { ...corpo, participacao_id: participacaoId }, prefer: 'return=representation' })
        .then((linhas) => {
          const novoId = linhas && linhas[0] && linhas[0].id
          if (novoId && removidasRef.current.has(u._key)) {
            removidasRef.current.delete(u._key)
            api('participacao_unidades?id=eq.' + novoId, { metodo: 'DELETE' }).catch(() => {})
            return linhas
          }
          if (novoId) {
            idsCriadosRef.current.set(u._key, novoId)
            setUnidades((prev) => prev.map((x) => (x._key === u._key ? { ...x, id: novoId } : x)))
          }
          return linhas
        })
        .finally(() => postandoRef.current.delete(u._key))
    }))
    try {
      /* Só grava os blocos DESTA aba (Meu cadastro = 0 e 4; Meu combo = 1, 2 e 3).
         As duas abas são instâncias separadas: gravar tudo deixaria o salvamento
         de uma escrever, com o valor velho que ela leu, o que a outra acabou de
         salvar. `[true]` = nada a confirmar (bloco fora desta aba ou sem mudança). */
      const nada = Promise.resolve([true])
      const [rm, rp, ri, ru] = await Promise.all([
        mostra(0) ? patchMudancas('participantes?id=eq.' + participanteId, corpoMarca(marca), base.marca) : nada,
        mostra(1) || mostra(3) ? patchMudancas('participacoes?id=eq.' + participacaoId, corpoParticipacao({ tema, precoStr, extras }), base.participacao) : nada,
        mostra(2) ? salvarItens() : Promise.resolve([]),
        mostra(4) ? salvarUnidades() : Promise.resolve([]),
      ])
      // A foto passa a ser o que o servidor devolveu (linha gravada de verdade).
      const linha = (l) => (l && l[0] && typeof l[0] === 'object' ? l[0] : null)
      if (linha(rm)) base.marca = corpoMarca(marcaDeLinha(linha(rm)))
      if (linha(rp)) base.participacao = corpoParticipacao(participacaoDeLinha(linha(rp)))
      ri.forEach((l) => { const x = linha(l); if (x) base.itens[x.id] = pedidoItem(x).corpo })
      ru.forEach((l) => { const x = linha(l); if (x) base.unidades[x.id] = corpoUnidade(unidadeDeLinha(x), x.ordem) })
      // PATCH que volta vazio = a RLS recusou a linha: não é "salvo".
      const vazio = (l) => !l || !l.length
      if (vazio(rm) || vazio(rp) || ri.some(vazio) || ru.some(vazio)) throw new Error('sem_confirmacao')
      if (!pendenteRef.current) setSalvoTexto('Informações salvas.')
      setErroSalvar(null)
      // Pendências, progresso e números das abas acompanham o que foi gravado.
      if (recarregarResumo) recarregarResumo()
      return true
    } catch (e) {
      pendenteRef.current = true
      if (e && e.message === 'sessao_expirada') return false
      setSalvoTexto('')
      setErroSalvar('Não deu para salvar agora. O que você digitou continua na tela. Tente de novo.')
      return false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participanteId, participacaoId, marca, tema, precoStr, itens, unidades, extras])

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

  // ── Campos ────────────────────────────────────────────────────────────────
  function alterarMarca(campo, valor) { setMarca((prev) => ({ ...prev, [campo]: valor })); agendarSalvar() }
  function alterarTema(campo, valor) { setTema((prev) => ({ ...prev, [campo]: valor })); agendarSalvar() }
  function alterarPreco(valor) { setPrecoStr(valor); agendarSalvar() }
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
    agendarSalvar()
  }
  function removerUnidade(chave) {
    const alvo = unidades.find((u) => u._key === chave)
    // Sempre sobra uma unidade em branco para preencher.
    setUnidades((prev) => {
      const resto = prev.filter((u) => u._key !== chave)
      return resto.length ? resto : [unidadeVazia()]
    })
    const idAlvo = alvo && (alvo.id || idsCriadosRef.current.get(alvo._key))
    if (alvo && !idAlvo && postandoRef.current.has(alvo._key)) removidasRef.current.add(alvo._key)
    if (idAlvo) {
      api('participacao_unidades?id=eq.' + idAlvo, { metodo: 'DELETE' }).catch((e) => {
        if (e && e.message === 'sessao_expirada') return
        setErroSalvar('Não deu para remover a unidade agora. Recarregue a página.')
      })
    }
    agendarSalvar()
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
        const faltando = (r && r.faltando) || []
        setConcluirAviso({ tom: 'erro', texto: 'Falta preencher: ' + faltando.map((f) => NOMES_FALTANDO[f] || f).join(', ') + '.' })
        // Abre o primeiro bloco pendente para a pessoa ver onde está a falta.
        const pend = primeiroBlocoPendente({ marca, tema, itens, unidades, precoStr })
        if (pend !== null && blocos.includes(pend)) setBlocoAberto(pend)
        // A falta está na OUTRA aba (Meu cadastro × Meu combo): leva até ela.
        else if (pend !== null && irPara) setConcluirAviso((a) => ({ ...a, ir: { vista: [0, 4].includes(pend) ? 'cadastro' : 'combo', sub: String(pend) } }))
      } else {
        const reenvio = comboStatus === 'correcao_solicitada'
        setStatusCadastro('cadastro_completo')
        // O banco já passou o combo para análise: o pedido de ajuste sai da tela.
        if (comboStatus === 'rascunho' || comboStatus === 'correcao_solicitada') setComboLocal('em_analise')
        setConcluirAviso({
          tom: 'ok',
          texto: (reenvio ? 'Alterações enviadas novamente' : 'Enviado para análise') + ' em ' + new Date().toLocaleDateString('pt-BR') +
            '. A organização confere e avisa aqui. Mudou alguma coisa? É só editar e enviar de novo.',
        })
        if (recarregarResumo) recarregarResumo()
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
    if (/^[0-4]$/.test(String(alvo.sub || ''))) {
      setBlocoAberto(Number(alvo.sub))
      const campo = alvo.campo
      window.setTimeout(() => {
        const el = campo ? document.getElementById('campo-' + campo) : document.getElementById('bloco-' + alvo.sub)
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus) el.focus({ preventScroll: true }) }
      }, 60)
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
  const dadosProgresso = { marca, tema, itens, unidades, precoStr, logo: logoOk }
  const prog = progressoCampos(dadosProgresso)
  const selo = semParticipacao ? { classe: 'selo', texto: 'Sem edição aberta' } : seloParticipacao(statusCadastro)
  // Estado de cada campo: completo/falta ao vivo; o que a organização disse
  // (alteração pedida, em análise, aprovado) vem do resumo.
  const vivo = Object.fromEntries(camposObrigatorios(dadosProgresso).filter((c) => c.campo).map((c) => [c.campo, c.ok]))
  const est = (id) => {
    const org = resumo && resumo.campo ? resumo.campo(id) : null
    if (org && (org.estado === 'alteracao' || (org.estado === 'analise' && vivo[id]))) return org
    if (!(id in vivo)) return null
    if (!vivo[id]) return { estado: 'falta' }
    return org && (org.estado === 'aprovado' || org.estado === 'analise') ? org : { estado: 'completo' }
  }
  const erroWhats = validarWhatsApp(marca.telefone)
  const reenviar = comboStatus === 'correcao_solicitada'

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
            </div>
            <p className="salvo" role="status">{salvoTexto}</p>
          </div>
          {erroSalvar && (
            <div className="aviso erro" role="alert">
              {erroSalvar}{' '}
              <button className="link" type="button" onClick={() => { setErroSalvar(null); salvarEmOrdem() }}>Tentar de novo</button>
            </div>
          )}

          {/* noValidate: campos obrigatórios moram em blocos fechados (hidden),
              e o navegador travava o envio sem mostrar balão nenhum. Quem
              valida é o servidor (marca_concluir_cadastro), que diz o que falta. */}
          <form
            onSubmit={concluir} noValidate
            // Enter num campo de uma linha (o "Ir" do teclado do celular) não
            // conclui o cadastro: concluir avisa a organização. Só o botão.
            onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault() }}
          >
            {mostra(0) && <Bloco indice={0} aberto={blocoAberto === 0} completo={blocoCompleto(0, dadosProgresso)} onToggle={() => setBlocoAberto((a) => (a === 0 ? null : 0))}>
              <p className="nota">Isto atravessa as edições. Corrija o que mudou.</p>
              {/* Só leitura: o nome é o login da marca (§10.4-b). Mudar aqui a deixaria sem entrar. */}
              <label><span>Nome da marca <EstadoCampo e={est('nome_marca')} /></span><input id="campo-nome_marca" readOnly aria-describedby="nota-nome_marca" value={marca.nome_marca} /><span className="nota" id="nota-nome_marca">Para mudar o nome, fale com a organização.</span><Correcao e={est('nome_marca')} /></label>
              {/* A logo oficial: sobe na hora (não espera o salvamento automático). */}
              {participanteId && (
                <div className="mc-campo-logo">
                  <span className="mc-campo-logo__rotulo">Logo do estabelecimento <EstadoCampo e={est('logo')} /></span>
                  <LogoEditor participanteId={participanteId} nomeMarca={marca.nome_marca} adaptador={adaptadorLogo} modo="marca" onMudou={recarregarResumo} />
                  <Correcao e={est('logo')} />
                </div>
              )}
              <div className="dupla">
                <label><span>Responsável pelo festival <EstadoCampo e={est('responsavel')} /></span><input id="campo-responsavel" required value={marca.responsavel} onChange={(e) => alterarMarca('responsavel', e.target.value)} /><Correcao e={est('responsavel')} /></label>
                {/* O telefone de cadastro É o WhatsApp: é por ele que a organização fala com a marca. */}
                <label><span>WhatsApp <EstadoCampo e={est('telefone')} /></span>
                  <input id="campo-telefone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(84) 99999-9999" required
                    aria-invalid={!!erroWhats} aria-describedby={erroWhats ? 'erro-telefone' : undefined}
                    value={marca.telefone} onChange={(e) => alterarMarca('telefone', mascaraWhatsApp(e.target.value))} />
                  {erroWhats && <span className="gm-campo-erro" id="erro-telefone">{erroWhats}</span>}
                  <Correcao e={est('telefone')} />
                </label>
              </div>
              <div className="dupla">
                <label><span>E-mail de contato <EstadoCampo e={est('email')} /></span><input id="campo-email" type="email" inputMode="email" value={marca.email} onChange={(e) => alterarMarca('email', e.target.value)} /><Correcao e={est('email')} /></label>
                <label><span>Instagram <em>(opcional)</em> <EstadoCampo e={est('instagram')} /></span><input id="campo-instagram" placeholder="@suamarca" value={marca.instagram} onChange={(e) => alterarMarca('instagram', e.target.value)} /><Correcao e={est('instagram')} /></label>
              </div>
              <div className="dupla">
                <label><span>Site <em>(opcional)</em></span><input placeholder="https://" value={marca.site} onChange={(e) => alterarMarca('site', e.target.value)} /></label>
                <label><span>CNPJ <em>(opcional)</em></span><input inputMode="numeric" value={marca.cnpj} onChange={(e) => alterarMarca('cnpj', e.target.value)} /></label>
              </div>
              <label><span>Razão social <em>(opcional)</em></span><input value={marca.razao_social} onChange={(e) => alterarMarca('razao_social', e.target.value)} /></label>
            </Bloco>}

            {mostra(1) && <Bloco indice={1} aberto={blocoAberto === 1} completo={blocoCompleto(1, dadosProgresso)} onToggle={() => setBlocoAberto((a) => (a === 1 ? null : 1))}>
              <p className="nota">O festival nasce de um tema, e cada marca lê esse tema do seu
                jeito. Conte qual foi a sua leitura.</p>
              {revisao.tema && (
                <div className={'aviso' + (revisao.tema.status === 'recusado' ? ' erro' : '')} role={revisao.tema.status === 'recusado' ? 'alert' : 'status'}>
                  {ROTULO_TEMA_STATUS[revisao.tema.status]}{revisao.tema.observacao ? ' “' + revisao.tema.observacao + '”' : ''}
                  {revisao.tema.status === 'aprovado' && ' Mudar o tema agora manda a escolha para nova análise.'}
                </div>
              )}
              <p className="nota">Na edição, cada tema é de uma marca só. Se duas pedirem o mesmo, a organização decide pela ordem de chegada e pelo pagamento em dia.</p>
              <label><span>Tema escolhido pela marca <EstadoCampo e={est('tema_combo')} /></span><input id="campo-tema_combo" required value={tema.tema_combo} onChange={(e) => alterarTema('tema_combo', e.target.value)} /><Correcao e={est('tema_combo')} /></label>
              <label><span>Justificativa <em>(por que esse ângulo, como conversa com a inspiração)</em> <EstadoCampo e={est('tema_justificativa')} /></span>
                <textarea id="campo-tema_justificativa" required value={tema.tema_justificativa} onChange={(e) => alterarTema('tema_justificativa', e.target.value)} />
                <Correcao e={est('tema_justificativa')} />
              </label>
            </Bloco>}

            {mostra(2) && <Bloco indice={2} aberto={blocoAberto === 2} completo={blocoCompleto(2, dadosProgresso)} onToggle={() => setBlocoAberto((a) => (a === 2 ? null : 2))}>
              <p className="nota">Cada item é julgado na sua categoria, e a média dos três é o
                Melhor Combo. Descreva como cada um conversa com o tema.</p>
              <p className="nota"><b>Marcar vegano, sem glúten ou sem lactose amplia o público
                que chega até você</b>: muita gente escolhe a rota pelo que consegue comer.
                As restrições valem por item: o doce pode ser vegano e o salgado não.</p>
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
                      <label><span>Nome <EstadoCampo e={est('item-' + it.posicao + '-nome')} /></span><input id={'campo-item-' + it.posicao + '-nome'} value={it.nome || ''} onChange={(e) => alterarItem(it.id, 'nome', e.target.value)} /><Correcao e={est('item-' + it.posicao + '-nome')} /></label>
                      <label><span>Descrição <em>(como conversa com o tema)</em> <EstadoCampo e={est('item-' + it.posicao + '-descricao')} /></span>
                        <textarea id={'campo-item-' + it.posicao + '-descricao'} value={it.descricao || ''} onChange={(e) => alterarItem(it.id, 'descricao', e.target.value)} />
                        <Correcao e={est('item-' + it.posicao + '-descricao')} />
                      </label>
                      <label><span>Ingredientes <EstadoCampo e={est('item-' + it.posicao + '-ingredientes')} /></span><input id={'campo-item-' + it.posicao + '-ingredientes'} value={it.ingredientes || ''} onChange={(e) => alterarItem(it.id, 'ingredientes', e.target.value)} /><Correcao e={est('item-' + it.posicao + '-ingredientes')} /></label>
                      {/* As três restrições são UM assunto: ficam juntas numa linha. */}
                      <fieldset className="marcar-grupo mc-restricoes">
                        <legend className="marcar-grupo__pergunta">Restrições alimentares</legend>
                        <label className="marcar"><input type="checkbox" checked={!!it.vegano} onChange={(e) => alterarItem(it.id, 'vegano', e.target.checked)} /><span>Vegano</span></label>
                        <label className="marcar"><input type="checkbox" checked={!!it.sem_gluten} onChange={(e) => alterarItem(it.id, 'sem_gluten', e.target.checked)} /><span>Sem glúten</span></label>
                        <label className="marcar"><input type="checkbox" checked={!!it.sem_lactose} onChange={(e) => alterarItem(it.id, 'sem_lactose', e.target.checked)} /><span>Sem lactose</span></label>
                      </fieldset>
                    </div>
                  )
                })}
              </div>
            </Bloco>}

            {mostra(3) && <Bloco indice={3} aberto={blocoAberto === 3} completo={blocoCompleto(3, dadosProgresso)} onToggle={() => setBlocoAberto((a) => (a === 3 ? null : 3))}>
              <label className="mc-campo-curto"><span>Valor do combo <em>(em reais)</em> <EstadoCampo e={est('combo_preco')} /></span>
                <input id="campo-combo_preco" inputMode="decimal" placeholder="0,00" required value={precoStr} onChange={(e) => alterarPreco(e.target.value)} />
                <Correcao e={est('combo_preco')} />
              </label>
              <p className="nota">Sobre o combo inteiro <em>(opcional — ajuda a organização a divulgar)</em>:</p>
              {[['combo_para_viagem', 'Pode ser para viagem?'], ['combo_vegano', 'O combo é vegano?'], ['combo_diet', 'O combo é diet?']].map(([campo, pergunta]) => (
                <div className="marcar-grupo" role="radiogroup" aria-label={pergunta} key={campo}>
                  <span className="marcar-grupo__pergunta">{pergunta}</span>
                  <label className="marcar"><input type="radio" name={campo} checked={extras[campo] === true} onChange={() => alterarExtra(campo, true)} /><span>Sim</span></label>
                  <label className="marcar"><input type="radio" name={campo} checked={extras[campo] === false} onChange={() => alterarExtra(campo, false)} /><span>Não</span></label>
                </div>
              ))}
              <label><span>Sobre o delivery do combo <em>(opcional)</em></span>
                <input value={extras.combo_delivery} onChange={(e) => alterarExtra('combo_delivery', e.target.value)} placeholder="ex.: só retirada; delivery pelo app X" />
              </label>
              <label><span>A proposta criativa: qual é a história do combo? <em>(opcional)</em></span>
                <textarea value={extras.combo_proposta} onChange={(e) => alterarExtra('combo_proposta', e.target.value)} />
              </label>
            </Bloco>}

            {mostra(4) && <Bloco indice={4} aberto={blocoAberto === 4} completo={blocoCompleto(4, dadosProgresso)} onToggle={() => setBlocoAberto((a) => (a === 4 ? null : 4))}>
              <p className="nota">Uma por endereço. Rede com várias lojas cadastra cada uma.
                Continua contando como uma marca só. O horário aqui é o <b>dos dias do
                festival</b>, que pode ser diferente do horário normal da loja.</p>
              <div>
                {unidades.map((u, i) => (
                  <div className="unidade" key={u._key}>
                    <div className="topo">
                      <b>Unidade {i + 1}</b>
                      <button className="link" type="button" aria-label={'Remover a unidade ' + (i + 1)} onClick={() => removerUnidade(u._key)}>remover</button>
                    </div>
                    <label><span>Endereço {i === 0 && <EstadoCampo e={est('unidade-endereco')} />}</span><input id={i === 0 ? 'campo-unidade-endereco' : undefined} value={u.endereco} onChange={(e) => alterarUnidade(u._key, 'endereco', e.target.value)} />{i === 0 && <Correcao e={est('unidade-endereco')} />}</label>
                    <div className="dupla">
                      <label><span>Bairro</span><input value={u.bairro} onChange={(e) => alterarUnidade(u._key, 'bairro', e.target.value)} /></label>
                      <label><span>Horário durante o festival</span>
                        <input placeholder="seg a sáb, 10h às 22h" value={u.horarios} onChange={(e) => alterarUnidade(u._key, 'horarios', e.target.value)} />
                      </label>
                    </div>
                    <label className="marcar">
                      <input type="checkbox" checked={!!u.faz_delivery} onChange={(e) => alterarUnidade(u._key, 'faz_delivery', e.target.checked)} />
                      <span>Esta unidade faz delivery</span>
                    </label>
                    <div className="canais" hidden={!u.faz_delivery}>
                      <b>Link de cada canal</b>
                      {CANAIS.map((c) => (
                        <label key={c.tipo}>
                          <span>{c.rotulo} <em>(deixe em branco se não usa)</em></span>
                          <input placeholder={c.dica} value={u.canais[c.tipo]} onChange={(e) => alterarCanal(u._key, c.tipo, e.target.value)} />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="acao secundaria" type="button" onClick={adicionarUnidade}><Icone nome="mais" tamanho={16} />Adicionar unidade</button>
            </Bloco>}

            {/* Enviar vale para o cadastro inteiro (as duas abas): quem confere o
                que falta é o servidor (marca_concluir_cadastro). */}
            <button className="acao larga" type="submit" disabled={concluindo}>
              {concluindo ? 'Enviando…' : reenviar ? 'Enviar novamente para análise' : 'Enviar para análise'}
            </button>
          </form>

          {concluirAviso && <div className={'aviso mc-concluir-aviso ' + concluirAviso.tom} role={concluirAviso.tom === 'erro' ? 'alert' : 'status'}>{concluirAviso.texto}
            {concluirAviso.ir && <> <button type="button" className="og-btn og-btn--mini og-btn--vazado" onClick={() => irPara(concluirAviso.ir.vista, { sub: concluirAviso.ir.sub })}>{concluirAviso.ir.vista === 'combo' ? 'Ir para Meu combo' : 'Ir para Meu cadastro'}</button></>}
          </div>}
        </div>
      )}
    </>
  )
}
