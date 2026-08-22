import React from 'react'
import { INSTAGRAM_URL } from '../config/channels'
import { supabase } from '../lib/supabase'
import { entrarNaOrganizacao, RECADO } from '../lib/adminAccess'

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
 * O que NÃO mudou, de propósito: os dois cards continuam com pesos diferentes
 * (§6.10) — Organização em chapa chocolate com ação amarela, Participante em
 * bege com moldura tracejada, a mesma reserva honesta das fotos que faltam
 * (§6.12), sem hover e sem botão morto. A régua de 5px segue a ordem dos cards:
 * cyan à esquerda, roxo à direita.
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
  const campoRef = React.useRef(null)

  const [montada, setMontada] = React.useState(open)
  const [fechando, setFechando] = React.useState(false)
  const [passo, setPasso] = React.useState('escolha')
  const [senha, setSenha] = React.useState('')
  const [erro, setErro] = React.useState(null)
  const [verificando, setVerificando] = React.useState(false)

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

  /* Reabrir sempre começa na escolha, e a senha digitada não sobrevive ao
     fechamento — ela não fica pendurada em memória à espera da próxima vez. */
  React.useEffect(() => {
    if (open) return
    setPasso('escolha')
    setSenha('')
    setErro(null)
    setVerificando(false)
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

  /* Ao entrar no passo da senha o cursor já vai para o campo: é a única coisa
     a fazer naquela tela. */
  React.useEffect(() => {
    if (passo === 'senha' && campoRef.current) campoRef.current.focus()
  }, [passo])

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

  const enviar = async (ev) => {
    ev.preventDefault()
    if (verificando) return
    setErro(null)
    setVerificando(true)
    const r = await entrarNaOrganizacao({
      senha,
      rpc,
      guardar: (chave, valor) => window.sessionStorage.setItem(chave, valor),
    })
    if (!r.ok) {
      setVerificando(false)
      setErro(r.erro)
      if (campoRef.current) campoRef.current.focus()
      return
    }
    /* Navegação normal do navegador, não `navigate()`: /organizacao/ é página
       estática fora do bundle, e a barra final é o que faz o servidor resolver
       o índice do diretório em vez de cair no fallback do SPA (§10.4-b). */
    window.location.href = '/organizacao/'
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
          <span className="scw-acesso__puxador" aria-hidden="true" />
          <div className="scw-acesso__marca">
            <img src="/logos/lockup-scw-creme.svg" alt="Sweet &amp; Coffee Week" />
            <span className="scw-acesso__eyebrow">Área<br />de acesso</span>
          </div>
          <button type="button" className="scw-acesso__fechar" onClick={onClose} aria-label="Fechar">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="scw-acesso__regua" aria-hidden="true" />
        </div>

        {passo === 'escolha' ? (
          <div className="scw-acesso__corpo">
            <h2 className="scw-acesso__titulo" id="scw-acesso-titulo">
              Entrar no <em className="scw-italico" style={{ color: 'var(--scw-marrom)' }}>Sweet &amp; Coffee Week</em>.
            </h2>
            <p className="scw-acesso__lead">Escolha por onde você entra.</p>

            <div className="scw-grade" style={{ '--scw-min': '260px', '--scw-gap': 'clamp(12px,1.6vw,18px)' }}>
              <div className="scw-acesso__cartao scw-acesso__cartao--destaque">
                <div className="scw-acesso__cabeca">
                  <span
                    className="scw-acesso__selo"
                    aria-hidden="true"
                    /* Cyan sobre chocolate fecha 4,9:1. Roxo aqui daria 1,45:1 — por
                       isso ele só aparece no card claro (§6.1). */
                    style={{ background: 'var(--scw-cyan)', color: 'var(--scw-choco)' }}
                  >
                    <svg width="21" height="21" viewBox="0 0 32 32" fill="none">
                      <path d={TRACO_ORG} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <b className="scw-h3">Organização</b>
                </div>
                <span className="scw-acesso__cartao-txt">
                  Respostas dos formulários do site: contato, participação e apoio.
                </span>
                <button type="button" className="scw-acesso__acao" onClick={() => setPasso('senha')}>
                  Entrar com a senha
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="scw-acesso__cartao scw-acesso__cartao--reserva">
                <div className="scw-acesso__cabeca">
                  <span
                    className="scw-acesso__selo"
                    aria-hidden="true"
                    style={{ background: 'rgba(77, 37, 126, .14)', color: 'var(--scw-roxo)' }}
                  >
                    <svg width="21" height="21" viewBox="0 0 32 32" fill="none">
                      <path d={TRACO_PART} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <b className="scw-h3">Sou participante</b>
                </div>
                <span className="scw-acesso__cartao-txt">
                  Combo, dados da edição e resultados do Sweet Awards.
                </span>
                <span className="scw-acesso__espera">Painel · em breve</span>
              </div>
            </div>

            <div className="scw-acesso__pe">
              <p className="scw-acesso__pe-texto">
                O painel do participante ainda está em construção. Até lá, a equipe atende por aqui.
              </p>
              <a className="scw-acesso__cta" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                Falar com a equipe
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 12L12 4M6 4h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        ) : (
          <div className="scw-acesso__corpo scw-acesso__corpo--senha">
            <button
              type="button"
              className="scw-acesso__voltar"
              onClick={() => { setPasso('escolha'); setErro(null); setSenha('') }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Voltar
            </button>

            <div className="scw-acesso__cabeca">
              <span
                className="scw-acesso__selo"
                aria-hidden="true"
                style={{ background: 'var(--scw-cyan)', color: 'var(--scw-choco)' }}
              >
                <svg width="21" height="21" viewBox="0 0 32 32" fill="none">
                  <path d={TRACO_ORG} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h2 className="scw-acesso__titulo" id="scw-acesso-titulo">Painel da organização</h2>
            </div>
            <p className="scw-acesso__lead">
              Respostas dos formulários do site. A senha é a mesma do painel — só a organização tem.
            </p>

            <form className="scw-acesso__form" onSubmit={enviar} noValidate>
              <label className="scw-campo">
                <span>Senha</span>
                <input
                  ref={campoRef}
                  type="password"
                  name="senha"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); if (erro) setErro(null) }}
                  aria-invalid={erro ? 'true' : undefined}
                  aria-describedby={erro ? 'scw-acesso-erro' : undefined}
                />
              </label>

              {/* `role="alert"` para o leitor de tela anunciar sem que o foco saia
                  do campo — quem errou a senha continua onde precisa digitar. */}
              {erro && (
                <p className="scw-acesso__erro" id="scw-acesso-erro" role="alert">
                  {RECADO[erro]}
                </p>
              )}

              <button type="submit" className="scw-acesso__acao scw-acesso__acao--largo" disabled={verificando}>
                {verificando ? 'Conferindo…' : 'Entrar no painel'}
                {!verificando && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </form>

            <p className="scw-acesso__nota">
              Esqueceu a senha? Ela não é recuperável — o banco guarda só o resumo dela.
              Quem administra o projeto redefine.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
