/*
 * Histórico do painel: UM dono para o Voltar (24/10/2026, pedido do Wilker: "sentindo falta de voltar…
 * tem que funcionar como app, no iPhone e no Android").
 *
 * No app instalado não existe barra nem botão Voltar do navegador (iPhone), e no Android o Voltar do
 * SISTEMA anda pelo histórico da página. Por isso tudo o que mexe no histórico passa por aqui:
 *
 *  · Páginas: cada tela (módulo, aba, ficha) é uma entrada com `scwId` no `history.state`. O modelo
 *    (entradas + posição) vive no sessionStorage, por painel, e se reconcilia em cada popstate — o
 *    "‹ Voltar" do cabeçalho mostra a entrada anterior e as "Telas recentes" a lista desta sessão.
 *  · Camadas: folha (components/Folha.jsx) e confirmação (Confirmar.jsx) empilham uma entrada com o
 *    MESMO endereço. O Voltar do sistema fecha a camada de cima em vez de trocar a tela de baixo;
 *    fechar pela tela tira a entrada de novo (nada de "voltar morto").
 *  · Navegar com camada aberta primeiro tira as entradas das camadas (history.go) e só então empilha
 *    ou substitui — a operação espera o popstate (fila), senão o go() atrasado desfaria o push.
 *
 * As cascas (PainelShell, PainelMarcaShell) NÃO ouvem popstate: ouvem `aoMudarEndereco`, que só avisa
 * quando o endereço mudou de fato (as voltas internas das camadas ficam aqui dentro).
 * ⛔ Nada de `history.pushState/replaceState/back` fora deste arquivo (o teste reprova).
 */

const LIMITE_ENTRADAS = 60
const LIMITE_RECENTES = 12
const LIMITE_NOMES = 300
const ESPERA_VOLTA = 800 // ms: se o popstate de uma volta interna não chegar, a fila segue mesmo assim

const vazio = () => ({ entradas: [], pos: -1, recentes: [], nomes: {} })

export function criarHistorico(win) {
  let papel = null
  let chaveDe = (h) => h
  let m = vazio()
  let camadas = [] // [{ token, fechar, consumida, naPilha }] — de baixo para cima
  let pendente = null // { tipo: 'interna' | 'volta', timer }
  let fila = []
  let geracao = 0
  const ouvintes = new Set()
  const ouvintesEndereco = new Set()
  let foto = { anterior: null, atual: null, recentes: [], versao: 0 }
  let seq = 0
  let instalado = false
  let iniciado = null // painel já começado NESTA carga da página (iniciar de novo não mexe no histórico)
  const antesDoInicio = [] // camadas que abriram antes da casca (o efeito do filho roda antes do do pai)

  const novoId = () => Date.now().toString(36) + (++seq).toString(36) + Math.random().toString(36).slice(2, 6)
  const hashAtual = () => (win.location && win.location.hash) || ''
  const estado = () => { try { return win.history.state || {} } catch { return {} } }
  const chaveArmazem = () => 'scw_historico_' + papel
  const agora = () => Date.now()

  function salvar() {
    if (!papel) return
    try { win.sessionStorage.setItem(chaveArmazem(), JSON.stringify(m)) } catch { /* modo privado: fica só na memória */ }
  }
  function ler() {
    try {
      const v = JSON.parse(win.sessionStorage.getItem(chaveArmazem()) || 'null')
      if (v && Array.isArray(v.entradas) && Array.isArray(v.recentes) && v.nomes && typeof v.nomes === 'object') {
        return { entradas: v.entradas.filter((e) => e && typeof e.id === 'string'), pos: Number(v.pos) || 0, recentes: v.recentes.filter((r) => r && typeof r.h === 'string'), nomes: v.nomes }
      }
    } catch { /* armazenamento quebrado: começa de novo */ }
    return vazio()
  }

  function atualizarFoto() {
    const atual = m.entradas[m.pos] || null
    const chaveAtual = atual ? chaveDe(atual.h) : null
    foto = {
      anterior: m.pos > 0 ? m.entradas[m.pos - 1] : null,
      atual: atual ? { h: atual.h, chave: chaveAtual } : null,
      recentes: m.recentes.filter((r) => r.chave !== chaveAtual).slice(0, 8),
      versao: foto.versao + 1,
    }
  }
  function avisar() { atualizarFoto(); ouvintes.forEach((f) => { try { f() } catch { /* ouvinte quebrado não derruba os outros */ } }) }

  function tocarRecente() {
    const e = m.entradas[m.pos]
    if (!e) return
    const chave = chaveDe(e.h)
    m.recentes = [{ chave, h: e.h, t: agora() }, ...m.recentes.filter((r) => r.chave !== chave)].slice(0, LIMITE_RECENTES)
  }

  /* ── camadas ─────────────────────────────────────────────────────────── */
  const naPilha = () => camadas.filter((c) => c.naPilha)
  function consumirTodas() { camadas.forEach((c) => { c.consumida = true }) }

  function esperar(tipo) {
    const timer = win.setTimeout(liberar, ESPERA_VOLTA)
    pendente = { tipo, timer }
  }
  function liberar() {
    if (!pendente) return
    win.clearTimeout(pendente.timer)
    pendente = null
    const f = fila
    fila = []
    f.forEach((op) => { try { op() } catch { /* uma operação quebrada não trava as outras */ } })
  }
  function depoisDaVolta(op) { if (pendente) fila.push(op); else op() }

  function irDireto(n, tipo) {
    esperar(tipo)
    try { win.history.go(n) } catch { liberar() }
  }

  /** Tira as entradas das camadas do topo (consumidas: o popstate delas não fecha nada) e só então roda `op`. */
  function semCamadasNoTopo(op) {
    const k = naPilha().length
    if (!k) { op(); return }
    consumirTodas()
    camadas.forEach((c) => { c.naPilha = false })
    fila.push(op)
    irDireto(-k, 'interna')
  }

  function aoPop() {
    const st = estado()
    const hashAntes = foto.atual ? foto.atual.h : null
    const idAntes = m.entradas[m.pos] ? m.entradas[m.pos].id : null
    // 1) camadas que saíram. As que estão no histórico (`naPilha`) ficam em ordem no topo; o estado em que
    //    caímos diz até qual delas ainda existe. Camada que ainda espera o push (fila) continua na lista.
    const t = st.scwCamada
    const fechar = []
    const ativas = camadas.filter((c) => c.naPilha)
    const esperando = camadas.filter((c) => !c.naPilha && !c.consumida)
    if (!st.scwId) {
      // Entrada NOVA (link com #, endereço digitado), não uma volta: as camadas ficam para trás no histórico,
      // abandonadas — nada de chamar o `fechar` delas (a folha que mora no endereço fecha sozinha com a rota).
      ativas.forEach((c) => { c.consumida = true; c.naPilha = false })
    }
    const k = t ? ativas.findIndex((c) => c.token === t) : -1
    if (t && k < 0) {
      // Entrada de uma camada que já não existe (Avançar depois de fechar uma folha): a página gêmea está
      // `scwN` entradas abaixo — pula para ela, sem virar página duplicada (que daria um Voltar morto depois).
      if (!pendente) { irDireto(-(Number(st.scwN) || 1), 'interna'); return }
      const { scwCamada, scwN, ...resto } = st // eslint-disable-line no-unused-vars
      try { win.history.replaceState(resto, '', win.location.href) } catch { /* segue */ }
    }
    const ficam = k >= 0 ? ativas.slice(0, k + 1) : []
    ativas.slice(ficam.length).reverse().forEach((c) => { c.naPilha = false; if (!c.consumida) fechar.push(c) })
    camadas = [...ficam, ...esperando]
    // 2) a página em que caímos.
    if (papel) {
      const id = estado().scwId
      const idx = id ? m.entradas.findIndex((e) => e.id === id) : -1
      if (idx >= 0) {
        m.pos = idx
        m.entradas[idx].h = hashAtual()
      } else if (id) {
        // Entrada do painel que o modelo perdeu (de outra carga/sessão): não dá para saber onde fica
        // em relação à atual, então o modelo recomeça nela — acrescentar depois inverteria a ordem.
        m.entradas = [{ id, h: hashAtual() }]
        m.pos = 0
      } else {
        // Entrada que o painel não conhece (link com #, endereço digitado): nasce no lugar, depois da atual.
        const nid = novoId()
        try { win.history.replaceState({ ...estado(), scwId: nid }, '', win.location.href) } catch { /* segue */ }
        m.entradas = m.entradas.slice(0, m.pos + 1).concat({ id: nid, h: hashAtual() }).slice(-LIMITE_ENTRADAS)
        m.pos = m.entradas.length - 1
      }
      const idDepois = m.entradas[m.pos] ? m.entradas[m.pos].id : null
      if (idDepois !== idAntes) { geracao++; tocarRecente() }
      salvar()
      avisar()
    }
    const interna = pendente && pendente.tipo === 'interna'
    // 3) a volta que NÓS pedimos chegou: segue a fila.
    if (pendente) liberar()
    // 4) as cascas só ficam sabendo quando o endereço mudou de verdade.
    if (!interna && hashAtual() !== hashAntes) ouvintesEndereco.forEach((f) => { try { f() } catch { /* segue */ } })
    // 5) fecha as folhas cujas entradas saíram — por último: o fechar pode navegar, e acha o estado certo.
    fechar.forEach((c) => { try { c.fechar() } catch { /* segue */ } })
  }

  function instalar() {
    if (instalado || !win.addEventListener) return
    instalado = true
    win.addEventListener('popstate', aoPop)
    // Link com # (navegação de fragmento) cria entrada sem `scwId`: o modelo a adota no lugar.
    win.addEventListener('hashchange', () => { if (papel && !estado().scwId) aoPop() })
  }

  /* ── páginas ─────────────────────────────────────────────────────────── */
  function empilharAgora(h, extra) {
    geracao++
    const id = novoId()
    const st = { ...extra, voltarPara: hashAtual(), scwId: id }
    try { win.history.pushState(st, '', h) } catch { return }
    m.entradas = m.entradas.slice(0, m.pos + 1).concat({ id, h })
    if (m.entradas.length > LIMITE_ENTRADAS) m.entradas = m.entradas.slice(-LIMITE_ENTRADAS)
    m.pos = m.entradas.length - 1
    tocarRecente()
    salvar()
    avisar()
  }
  function substituirAgora(h) {
    geracao++
    try { win.history.replaceState(estado(), '', h) } catch { return }
    if (m.entradas[m.pos]) m.entradas[m.pos].h = h
    tocarRecente()
    salvar()
    avisar()
  }
  function voltarAgora() {
    geracao++
    const k = naPilha().length
    consumirTodas()
    camadas.forEach((c) => { c.naPilha = false })
    irDireto(-(k + 1), 'volta')
  }

  return {
    /** A casca entra: carrega o modelo deste painel e marca a entrada atual. Pode ser chamada de novo (StrictMode). */
    iniciar(novoPapel, opcoes = {}) {
      instalar()
      if (opcoes.chaveDe) chaveDe = opcoes.chaveDe
      if (iniciado === novoPapel) return // de novo (StrictMode, permissões que chegam): o histórico já é deste painel
      if (papel !== novoPapel) { papel = novoPapel; m = ler() }
      const st = estado()
      const idx = st.scwId ? m.entradas.findIndex((e) => e.id === st.scwId) : -1
      if (idx >= 0) {
        m.pos = idx
        m.entradas[idx].h = hashAtual()
      } else {
        const id = novoId()
        const { scwCamada, scwN, ...resto } = st // eslint-disable-line no-unused-vars
        try { win.history.replaceState({ ...resto, scwId: id }, '', win.location.href) } catch { /* segue */ }
        m.entradas = [{ id, h: hashAtual() }]
        m.pos = 0
      }
      iniciado = novoPapel
      // Recarga com folha aberta ("Atualizar agora", F5): a entrada é de uma camada que não existe mais. A página
      // gêmea (mesmo endereço, mesmo id) está `scwN` abaixo — desce para ela; o que espera vai depois (fila).
      if (st.scwCamada && idx >= 0) irDireto(-(Number(st.scwN) || 1), 'interna')
      tocarRecente()
      salvar()
      avisar()
      antesDoInicio.splice(0).forEach((op) => depoisDaVolta(op))
    },

    /** Navegar para `h`: substitui, volta (se `h` é de onde viemos) ou empilha. Espera camadas e voltas em curso. */
    // `fechar`: sair do item para a lista do mesmo módulo (X da ficha, Voltar com a ficha aberta). Se a lista é de onde
    // veio, volta; senão a entrada do item VIRA a lista — empilhar a lista por cima faria o Voltar reabrir o item (e,
    // com a folha da ficha, entrar em laço).
    irPara(h, { substituir = false, fechar = false, extra = {} } = {}) {
      depoisDaVolta(() => semCamadasNoTopo(() => {
        if (h === hashAtual()) { if (m.entradas[m.pos]) { tocarRecente(); salvar(); avisar() } return }
        if (substituir) return substituirAgora(h)
        if (estado().voltarPara === h && m.pos > 0 && m.entradas[m.pos - 1] && m.entradas[m.pos - 1].h === h) return voltarAgora()
        if (fechar) return substituirAgora(h)
        return empilharAgora(h, extra)
      }))
    },

    /** Uma tela para trás (pulando as camadas abertas). Sem tela anterior no painel, não faz nada. */
    voltar() {
      depoisDaVolta(() => { if (m.pos > 0) voltarAgora() })
    },
    podeVoltar: () => m.pos > 0,

    /** Folha/confirmação abriu: entrada com o mesmo endereço; `fechar` roda se o Voltar do sistema a tirar. */
    abrirCamada(fechar) {
      const c = { token: 'c' + novoId(), fechar, consumida: false, naPilha: false }
      camadas.push(c)
      const empurrar = () => {
        if (c.consumida || !camadas.includes(c)) return
        const st = estado()
        // `scwN`: quantas camadas há até a página (a recarga e o Avançar usam para achar a página gêmea).
        try { win.history.pushState({ ...st, scwCamada: c.token, scwN: (Number(st.scwN) || 0) + 1 }, '', win.location.href); c.naPilha = true } catch { /* sem histórico: a folha fecha pela tela */ }
      }
      if (iniciado) depoisDaVolta(empurrar)
      else antesDoInicio.push(empurrar)
      return c.token
    },
    /** A camada fechou pela tela (X, Esc, salvar): tira a entrada dela (e as de cima) sem chamar `fechar`. */
    fecharCamada(token) {
      const i = camadas.findIndex((c) => c.token === token)
      if (i < 0) return
      const c = camadas[i]
      c.consumida = true
      if (!c.naPilha) { camadas.splice(i, 1); return }
      depoisDaVolta(() => {
        const j = camadas.indexOf(c)
        if (j < 0 || !c.naPilha) { if (j >= 0) camadas.splice(j, 1); return }
        const acima = camadas.slice(j).filter((x) => x.naPilha)
        acima.forEach((x) => { x.consumida = true; x.naPilha = false })
        irDireto(-acima.length, 'interna')
      })
    },

    /** `op` roda quando não houver volta em curso (no próximo ciclo). */
    quandoLivre(op) { depoisDaVolta(() => win.setTimeout(op, 0)) },
    geracao: () => geracao,

    /** Nome legível de uma tela/aba/item (a ficha diz "Sabor de Pão"); fica na sessão. */
    nomear(chave, nome) {
      if (!chave || !nome || m.nomes[chave] === nome) return
      m.nomes[chave] = nome
      const ks = Object.keys(m.nomes)
      if (ks.length > LIMITE_NOMES) ks.slice(0, ks.length - LIMITE_NOMES).forEach((k) => delete m.nomes[k])
      salvar()
      avisar()
    },
    nome: (chave) => m.nomes[chave] || null,

    ouvir(f) { ouvintes.add(f); return () => ouvintes.delete(f) },
    foto: () => foto,
    aoMudarEndereco(f) { ouvintesEndereco.add(f); return () => ouvintesEndereco.delete(f) },

    /** Sair / trocar de conta: esquece o que esta sessão viu neste painel. */
    limpar(qual = papel) {
      try { if (qual) win.sessionStorage.removeItem('scw_historico_' + qual) } catch { /* segue */ }
      if (qual === papel) { m = vazio(); iniciado = null; avisar() }
    },
  }
}

// O painel tem UMA instância, presa à janela. Fora do navegador (testes de Node que importam as cascas) vira inerte.
const semJanela = {
  location: { hash: '', href: '' }, history: { state: null, pushState() {}, replaceState() {}, go() {} },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setTimeout: (f, t) => setTimeout(f, t), clearTimeout: (t) => clearTimeout(t),
}
export const historico = criarHistorico(typeof window !== 'undefined' && window.history ? window : semJanela)
