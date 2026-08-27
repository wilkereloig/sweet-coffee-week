import React from 'react'
import { INSTAGRAM_URL } from '../config/channels'
import { supabase } from '../lib/supabase'
import { entrarNaOrganizacao, RECADO } from '../lib/adminAccess'
import { entrarComoMarca, RECADO as RECADO_MARCA } from '../lib/marcaAccess'
import { useArrastarFechar } from '../hooks/useArrastarFechar'
import { instalarPainel } from '../hooks/useInstallPrompt'

/*
 * Tela de acesso — refeita em 22/08/2026 a pedido do Eloi, em três frentes:
 *
 * 1. ABRE COMO O MENU. No celular ela deixou de ser um diálogo centrado e
 *    passou a ser a mesma FOLHA da aba "mais": sobe da base, colada na borda,
 *    canto arredondado só em cima, puxador. A curva já era a mesma
 *    (`scwFolha`) — faltava o lugar. E fechar virou movimento também: a folha
 *    sobrevive ao `open: false` pelos 260ms de `.is-fechando` e só então
 *    desmonta, exatamente como o MobileMenu.
 *    No DESKTOP a mesma peça fica centrada: folha subindo da base numa tela de
 *    1440px seria gesto de celular em lugar errado. O que "vale também para o
 *    desktop" é o resto — o passo de senha e o desenho.
 *
 * 2. "ENTRAR" NÃO SAI DAQUI. Antes o botão era um <a> para /organizacao/, e a
 *    senha era pedida lá. Agora o próprio diálogo vira o campo de senha: um
 *    passo só, sem troca de página antes de a pessoa provar quem é.
 *    A porta continua sendo a MESMA do painel — `admin_ping` no banco e a
 *    sessão em `sessionStorage.scw_org`, que é o que /organizacao/ já lê na
 *    abertura (ver src/lib/adminAccess.js). Não há mecanismo novo de
 *    autenticação aqui: há o mesmo, um passo antes.
 *    ⚠️ E vale a regra dos formulários: nada afirma que entrou sem o banco ter
 *    confirmado. Erro de senha, de rede e de sessão têm recados diferentes.
 *
 * 3. O DESENHO. A folha ganhou teto de altura com rolagem interna — antes, no
 *    celular, o pé com "Falar com a equipe" ficava fora da tela.
 *
 * Os dois cards continuam com pesos diferentes (§6.10) — Organização em chapa
 * chocolate, Participante em card bege —, mas em 25/08/2026 o motivo do peso
 * MUDOU: ele diz público, não disponibilidade. Até então o cartão do
 * participante era reserva honesta (§6.12), com moldura tracejada e o selo
 * "Painel · em breve"; `/marca/` entrou no ar e essa frase virou mentira — a
 * única porta pública do domínio negando a área que ela deveria abrir.
 * Tracejado e selo saíram; a porta abre. A régua de 5px segue a ordem dos
 * cards — ver item 5 abaixo para a cor de cada um.
 *
 * 4. "ENTRAR COM O NOME DA MARCA" NÃO SAI DAQUI TAMBÉM — pedido do Eloi,
 *    25/08/2026: a área da marca deve abrir igual à da organização, acoplada
 *    ao mesmo menu. Antes o card era um `<a href="/marca/">` puro: a pessoa
 *    saía do diálogo para um formulário estático, sem nenhuma casca da folha
 *    (régua, X, puxador). Agora ele abre o passo `'marca'` no MESMO diálogo,
 *    com o mesmo desenho do passo da organização — só a cor do selo muda
 *    (roxo, o acento do cartão "Sou participante").
 *    ⚠️ Aqui a autenticação NÃO é a mesma senha compartilhada da organização —
 *    é o Supabase Auth de verdade que `/marca/` já usava (e-mail sintético
 *    `<slug>@marcas.…`, ver `src/lib/marcaAccess.js`). O diálogo só antecipa o
 *    PASSO; a sessão que ele grava em `sessionStorage.scw_marca` é o formato
 *    exato que a página estática já lê no boot (`sessaoSalvar()` de lá) — é
 *    por isso que `window.location.href = '/marca/'`, depois de autenticado,
 *    abre direto no painel em vez de pedir login de novo.
 *    ⚠️ Isso só é seguro porque `public/marca/index.html` passou a checar
 *    `deve_trocar_senha` também ao achar sessão PRONTA no boot, não só dentro
 *    do próprio formulário — sem esse ajuste, uma marca de primeiro acesso
 *    entrando por aqui pularia a troca de senha obrigatória (§10.4-b).
 *
 * 5. OS DOIS FORMULÁRIOS NA MESMA TELA — redesenho de 25/08/2026, a partir do
 *    handoff "Painel SCW app". Os três passos (escolha → senha → marca)
 *    viraram UM: os dois cards da escolha já carregavam o campo e o botão de
 *    entrar. ⛔ **REVERTIDO em 27/08/2026, pedido do Eloi — ver item 6.**
 *    O que sobreviveu da mudança: a cor dos selos (Organização amarelo,
 *    Participante cyan) e o campo duplo da marca (nome + senha, já que
 *    entrar de verdade exige as duas). O que voltou a ser separado é só a
 *    ORDEM DE REVELAÇÃO — ver item 6.
 *
 * 6. A ESCOLHA VOLTOU A SER UM PASSO PRÓPRIO — pedido do Eloi, 27/08/2026,
 *    junto com a padronização do botão "Painel SCW" em todo o site (nav.jsx,
 *    Edicoes.jsx, MobileMenu.jsx). Estado local `passo` (`'boasVindas' |
 *    'organizacao' | 'marca'`), sempre reiniciado em `'boasVindas'` ao
 *    fechar — reabrir nunca deveria pousar num formulário de senha que
 *    ninguém pediu para ver de novo.
 *    A tela `'boasVindas'` mostra os MESMOS dois cards de antes, mas sem
 *    campo nenhum — só ícone, título ("Sou da organização" / "Sou
 *    participante") e descrição; o card inteiro é o gatilho (`<button>`, não
 *    mais `<form>`) que troca o `passo`. As duas telas de login reusam a
 *    MESMA lógica de sempre (`enviarOrg`/`enviarMarca`, `RECADO`/
 *    `RECADO_MARCA`) — nada mudou na autenticação, só quando o campo aparece.
 *    Cada tela de login ganhou um "‹ Voltar" que só troca `passo`, sem
 *    limpar o que já foi digitado na OUTRA tela (só o fechar do diálogo
 *    limpa tudo, no efeito que já existia).
 *    "Primeiro acesso da marca" continua sendo link-que-revela-nota, não
 *    tela nova — mesmo motivo do item 4: duplicar a troca de senha aqui
 *    seria um segundo caminho pro mesmo passo (§5.2).
 *
 * Foco preso no diálogo, Esc fecha, foco volta ao gatilho.
 */

/* Espelha .scw-acesso.is-fechando em scw-motion.css, como SAIDA no MobileMenu. */
const SAIDA = 260

const FOCAVEIS = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'

/* Prancheta com visto: gestão e apuração. A estrela fica reservada ao Sweet Awards. */
const TRACO_ORG = 'M8 8h16v19H8zM12 8V5h8v3M12.5 18l3 3 6-7'
/* Toldo de loja: quem entra aqui é o estabelecimento, não o consumidor. */
const TRACO_PART = 'M4 12l3-6h18l3 6M6 12v14h20V12M13 26v-7h6v7'

const semMovimento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* A `rpc` que a lib recebe. Fica aqui e não na lib para a lógica seguir
   testável sem cliente de banco (§4.1). */
const rpc = async (nome, corpo) => {
  const { data, error } = await supabase.rpc(nome, corpo)
  if (error) throw error
  return data
}

export function AccessDialog({ open, onClose }) {
  const caixaRef = React.useRef(null)
  const campoOrgRef = React.useRef(null)
  /* Arrastar pra baixo fecha, como puxar uma folha de verdade — mesmo gesto
     do puxador da folha de menu (§5.3). Só o puxador escuta (não a caixa
     inteira nem o cabeçalho): um gesto pego em qualquer lugar do formulário
     confundiria "arrastar pra ler" com "arrastar pra fechar". */
  const puxadorRef = useArrastarFechar(onClose)

  const [montada, setMontada] = React.useState(open)
  const [fechando, setFechando] = React.useState(false)
  const [passo, setPasso] = React.useState('boasVindas')
  const [senhaOrg, setSenhaOrg] = React.useState('')
  const [nomeMarca, setNomeMarca] = React.useState('')
  const [senhaMarca, setSenhaMarca] = React.useState('')
  const [erroOrg, setErroOrg] = React.useState(null)
  const [erroMarca, setErroMarca] = React.useState(null)
  const [enviandoOrg, setEnviandoOrg] = React.useState(false)
  const [enviandoMarca, setEnviandoMarca] = React.useState(false)
  const [mostrarPrimeiro, setMostrarPrimeiro] = React.useState(false)

  /* Saída animada: a folha continua montada pelos 260ms de `.is-fechando`.
     Sem movimento, desmonta na hora. Mesma mecânica do MobileMenu. */
  React.useEffect(() => {
    if (open) { setMontada(true); setFechando(false); return }
    if (!montada) return
    if (semMovimento()) { setMontada(false); return }
    setFechando(true)
    const t = window.setTimeout(() => { setMontada(false); setFechando(false) }, SAIDA)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /* Fechar não deixa nada pendurado em memória à espera da próxima vez: nem
     senha digitada, nem erro, nem a nota do primeiro acesso aberta. */
  React.useEffect(() => {
    if (open) return
    setPasso('boasVindas')
    setSenhaOrg('')
    setNomeMarca('')
    setSenhaMarca('')
    setErroOrg(null)
    setErroMarca(null)
    setEnviandoOrg(false)
    setEnviandoMarca(false)
    setMostrarPrimeiro(false)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const gatilho = document.activeElement
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (caixaRef.current) caixaRef.current.focus()

    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflowAnterior
      if (gatilho && typeof gatilho.focus === 'function') gatilho.focus()
    }
  }, [open, onClose])

  if (!montada) return null

  const prenderTab = (ev) => {
    if (ev.key !== 'Tab') return
    const caixa = caixaRef.current
    if (!caixa) return
    const itens = [...caixa.querySelectorAll(FOCAVEIS)]
    if (!itens.length) return
    const primeiro = itens[0]
    const ultimo = itens[itens.length - 1]
    if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus() }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus() }
  }

  const enviarOrg = async (ev) => {
    ev.preventDefault()
    if (enviandoOrg) return
    setErroOrg(null)
    setEnviandoOrg(true)
    const r = await entrarNaOrganizacao({
      senha: senhaOrg,
      rpc,
      guardar: (chave, valor) => window.sessionStorage.setItem(chave, valor),
    })
    if (!r.ok) {
      setEnviandoOrg(false)
      setErroOrg(r.erro)
      if (campoOrgRef.current) campoOrgRef.current.focus()
      return
    }
    /* Navegação normal do navegador, não `navigate()`: /organizacao/ é página
       estática fora do bundle, e a barra final é o que faz o servidor resolver
       o índice do diretório em vez de cair no fallback do SPA (§10.4-b). */
    window.location.href = '/organizacao/'
  }

  const enviarMarca = async (ev) => {
    ev.preventDefault()
    if (enviandoMarca) return
    setErroMarca(null)
    setEnviandoMarca(true)
    const r = await entrarComoMarca({
      nome: nomeMarca,
      senha: senhaMarca,
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      guardar: (chave, valor) => window.sessionStorage.setItem(chave, valor),
    })
    if (!r.ok) {
      setEnviandoMarca(false)
      setErroMarca(r.erro)
      return
    }
    /* Mesma navegação de navegador que a organização usa, e pelo mesmo motivo:
       /marca/ é página estática fora do bundle (§10.4-b). A sessão que acabou
       de ser gravada em sessionStorage.scw_marca é o que a página lê no boot
       para abrir direto — sem passar pelo próprio formulário de login dela. */
    window.location.href = '/marca/'
  }

  return (
    <div
      className={'scw-acesso' + (fechando ? ' is-fechando' : '')}
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={'scw-acesso__caixa' + (fechando ? ' is-fechando' : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scw-acesso-titulo"
        aria-hidden={fechando ? 'true' : undefined}
        tabIndex={-1}
        ref={caixaRef}
        onKeyDown={prenderTab}
      >
        {/* Faixa + régua num invólucro só para poderem grudar JUNTAS no topo
            (`position: sticky`). Como a rolagem é da própria caixa, sem isto o
            X saía de cena assim que o conteúdo rolava — na gaveta do desktop,
            que é alta, isso é perder a saída. */}
        <div className="scw-acesso__cabecalho">
        <div className="scw-acesso__topo">
          {/* O puxador mora DENTRO da faixa chocolate, não acima dela: como
              irmão anterior ele caía numa tira creme de 15px que sobrava sobre
              a faixa e lia como falha de render, não como pega. */}
          <span className="scw-acesso__puxador" aria-hidden="true" ref={puxadorRef} />
          <div className="scw-acesso__marca">
            <img src="/logos/lockup-scw-creme.svg" alt="Sweet &amp; Coffee Week" />
            <span className="scw-acesso__eyebrow">Painel<br />SCW</span>
          </div>
        </div>
        <div className="scw-acesso__regua" aria-hidden="true" />
        </div>

        <div className="scw-acesso__corpo">
          {passo === 'boasVindas' && (
            <>
              <h2 className="scw-acesso__titulo" id="scw-acesso-titulo">Bem-vindo ao Painel SCW</h2>
              <p className="scw-acesso__lead">
                Escolha sua área. Cada uma abre um login diferente.
              </p>

              <div className="scw-grade" style={{ '--scw-min': '260px', '--scw-gap': 'clamp(12px,1.6vw,18px)' }}>
                <button
                  type="button"
                  className="scw-acesso__cartao scw-acesso__cartao--destaque scw-acesso__cartao--escolha"
                  onClick={() => setPasso('organizacao')}
                >
                  <div className="scw-acesso__cabeca">
                    <span
                      className="scw-acesso__selo"
                      aria-hidden="true"
                      /* Amarelo sobre chocolate fecha 9,5:1 (§6.1). */
                      style={{ background: 'var(--scw-amarelo)', color: 'var(--scw-choco)' }}
                    >
                      <svg width="21" height="21" viewBox="0 0 32 32" fill="none">
                        <path d={TRACO_ORG} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <b className="scw-h3">Sou da organização</b>
                  </div>
                  <span className="scw-acesso__cartao-txt">
                    Equipe do Sweet &amp; Coffee Week. Vê todas as marcas e move o caminho.
                  </span>
                </button>

                <button
                  type="button"
                  className="scw-acesso__cartao scw-acesso__cartao--marca scw-acesso__cartao--escolha"
                  onClick={() => setPasso('marca')}
                >
                  <div className="scw-acesso__cabeca">
                    <span
                      className="scw-acesso__selo"
                      aria-hidden="true"
                      /* Chocolate sobre cyan fecha 6,2:1 (§6.1). */
                      style={{ background: 'var(--scw-cyan)', color: 'var(--scw-choco)' }}
                    >
                      <svg width="21" height="21" viewBox="0 0 32 32" fill="none">
                        <path d={TRACO_PART} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <b className="scw-h3">Sou participante</b>
                  </div>
                  <span className="scw-acesso__cartao-txt">
                    Sua casa. Cadastro do combo, pedidos e a venda de cada dia.
                  </span>
                </button>
              </div>

              <div className="scw-acesso__pe">
                <div className="scw-acesso__pe-coluna">
                  {/* Um clique de verdade agora: `manifest.webmanifest` do site
                      passou a apontar pro painel (start_url/scope = /painel/,
                      decisão do Eloi 27/08/2026), então o `beforeinstallprompt`
                      capturado em useInstallPrompt.js já é o do painel — não
                      precisa navegar pra disparar o `.prompt()` nativo. Se o
                      evento ainda não chegou (engajamento insuficiente, iOS sem
                      essa API, ou já instalado), cai no caminho de sempre: abre
                      /painel/ numa aba nova, que tem a própria captura como
                      reserva. */}
                  <button
                    type="button"
                    className="scw-acesso__link-secundario"
                    onClick={instalarPainel}
                  >
                    Instalar app do painel
                  </button>
                </div>
                <a className="scw-acesso__cta" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                  Falar com a equipe
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 12L12 4M6 4h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </>
          )}

          {passo === 'organizacao' && (
            <>
              <button type="button" className="scw-acesso__link-secundario" onClick={() => setPasso('boasVindas')}>
                ‹ Voltar
              </button>
              <form className="scw-acesso__cartao scw-acesso__cartao--destaque" onSubmit={enviarOrg} noValidate>
                <div className="scw-acesso__cabeca">
                  <span
                    className="scw-acesso__selo"
                    aria-hidden="true"
                    style={{ background: 'var(--scw-amarelo)', color: 'var(--scw-choco)' }}
                  >
                    <svg width="21" height="21" viewBox="0 0 32 32" fill="none">
                      <path d={TRACO_ORG} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h2 className="scw-h3" id="scw-acesso-titulo">Organização</h2>
                </div>
                <span className="scw-acesso__cartao-txt">
                  Equipe do Sweet &amp; Coffee Week. Vê todas as marcas e move o caminho.
                </span>

                <label className="scw-campo">
                  <span>Senha da equipe</span>
                  <input
                    ref={campoOrgRef}
                    type="password"
                    name="senha"
                    autoComplete="current-password"
                    value={senhaOrg}
                    onChange={(e) => { setSenhaOrg(e.target.value); if (erroOrg) setErroOrg(null) }}
                    aria-invalid={erroOrg ? 'true' : undefined}
                    aria-describedby={erroOrg ? 'scw-acesso-erro-org' : undefined}
                  />
                </label>

                {/* `role="alert"` para o leitor de tela anunciar sem que o foco saia
                    do campo — quem errou a senha continua onde precisa digitar. */}
                {erroOrg && (
                  <p className="scw-acesso__erro" id="scw-acesso-erro-org" role="alert">
                    {RECADO[erroOrg]}
                  </p>
                )}

                <button type="submit" className="scw-acesso__acao" disabled={enviandoOrg}>
                  {enviandoOrg ? 'Conferindo…' : 'Entrar no painel'}
                  {!enviandoOrg && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </form>
            </>
          )}

          {passo === 'marca' && (
            <>
              <button type="button" className="scw-acesso__link-secundario" onClick={() => setPasso('boasVindas')}>
                ‹ Voltar
              </button>
              <form className="scw-acesso__cartao scw-acesso__cartao--marca" onSubmit={enviarMarca} noValidate>
                <div className="scw-acesso__cabeca">
                  <span
                    className="scw-acesso__selo"
                    aria-hidden="true"
                    style={{ background: 'var(--scw-cyan)', color: 'var(--scw-choco)' }}
                  >
                    <svg width="21" height="21" viewBox="0 0 32 32" fill="none">
                      <path d={TRACO_PART} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h2 className="scw-h3" id="scw-acesso-titulo">Participante</h2>
                </div>
                <span className="scw-acesso__cartao-txt">
                  Sua casa. Cadastro do combo, pedidos e a venda de cada dia.
                </span>

                <label className="scw-campo">
                  <span>Login da marca</span>
                  <input
                    type="text"
                    name="nome"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={nomeMarca}
                    onChange={(e) => { setNomeMarca(e.target.value); if (erroMarca) setErroMarca(null) }}
                    aria-invalid={erroMarca ? 'true' : undefined}
                    aria-describedby={erroMarca ? 'scw-acesso-erro-marca' : undefined}
                  />
                </label>

                <label className="scw-campo">
                  <span>Senha</span>
                  <input
                    type="password"
                    name="senha"
                    autoComplete="current-password"
                    placeholder="sua senha"
                    value={senhaMarca}
                    onChange={(e) => { setSenhaMarca(e.target.value); if (erroMarca) setErroMarca(null) }}
                  />
                </label>

                {/* `role="alert"` para o leitor de tela anunciar sem tirar o foco
                    do campo — mesmo padrão do formulário da organização. */}
                {erroMarca && (
                  <p className="scw-acesso__erro" id="scw-acesso-erro-marca" role="alert">
                    {RECADO_MARCA[erroMarca]}
                  </p>
                )}

                {/* ⚠️ Sem <a href> aqui: a área não existe como link no DOM para
                    nenhum rastreador — reforça o `Disallow: /marca` do
                    robots.txt. A navegação real para /marca/ (página estática
                    fora do bundle, §10.4-b) só acontece em enviarMarca, já
                    autenticada. */}
                <button type="submit" className="scw-acesso__acao scw-acesso__acao--marca" disabled={enviandoMarca}>
                  {enviandoMarca ? 'Conferindo…' : 'Entrar no painel'}
                  {!enviandoMarca && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  className="scw-acesso__link-secundario"
                  onClick={() => setMostrarPrimeiro((v) => !v)}
                  aria-expanded={mostrarPrimeiro}
                >
                  Primeiro acesso da marca
                </button>
                {mostrarPrimeiro && (
                  <p className="scw-acesso__pe-texto">
                    Seu primeiro acesso usa os mesmos dois campos, com a senha que a
                    organização mandou. Depois de entrar, você escolhe uma sua.
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
