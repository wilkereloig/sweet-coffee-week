import React from 'react'
import { rotulo as rotuloDe, tom as tomDe } from '../lib/status'
import { Icone, ICONE_TOM } from './Icone'
import { iniciais } from '../lib/logos'

/*
 * Peças de estado e de estrutura usadas pelas vistas dos dois painéis — uma
 * forma só para "carregando", "vazio" e "erro", em vez de cada vista escrever
 * a sua (auditoria 28/09/2026: quatro vistas ficavam em branco enquanto
 * carregavam, uma mostrava "nenhuma conta" antes de os dados chegarem).
 */

// Esqueleto: a FORMA do conteúdo enquanto os dados vêm. aria-hidden — o texto
// para leitor de tela vem no <p> escondido.
export function Carregando({ linhas = 4, texto = 'Carregando…' }) {
  return (
    <div className="ui-carregando" role="status">
      <p className="ui-oculto">{texto}</p>
      <ul className="ui-esqueleto" aria-hidden="true">
        {Array.from({ length: linhas }, (_, i) => <li key={i} />)}
      </ul>
    </div>
  )
}

// Estado vazio: o que não há, por quê, e (quando existe) a ação que resolve.
export function Vazio({ titulo, icone, acao, children }) {
  return (
    <div className={'ui-vazio' + (icone ? ' ui-vazio--icone' : '')}>
      {icone && <span className="ui-vazio__disco" aria-hidden="true"><Icone nome={icone} tamanho={24} /></span>}
      <div className="ui-vazio__corpo">
        <p className="ui-vazio__titulo">{titulo}</p>
        {children && <div className="ui-vazio__texto">{children}</div>}
        {acao && <div className="ui-acoes">{acao}</div>}
      </div>
    </div>
  )
}

// Erro sempre com saída: o texto diz o que houve em linguagem de gente, e o
// botão tenta de novo sem precisar recarregar a página.
export function Erro({ titulo = 'Não consegui carregar', texto, onTentar }) {
  return (
    <div className="ui-erro" role="alert">
      <p className="ui-erro__titulo">{titulo}</p>
      {texto && <p className="ui-erro__texto">{traduzirErro(texto)}</p>}
      {onTentar && <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={onTentar}>Tentar de novo</button>}
    </div>
  )
}

// Mensagem técnica → frase. O código cru só aparece se não houver tradução.
const ERROS = {
  nao_autorizado: 'Sua função não permite esta ação, ou a sessão não vale mais.',
  sessao_expirada: 'Sua sessão terminou. Entre de novo.',
  'Failed to fetch': 'Sem conexão com o servidor. Confira a internet e tente de novo.',
  'Load failed': 'Sem conexão com o servidor. Confira a internet e tente de novo.',
  NetworkError: 'Sem conexão com o servidor. Confira a internet e tente de novo.',
  mensagem_vazia: 'Escreva a mensagem antes de enviar.',
  resposta_vazia: 'Escreva a resposta antes de enviar.',
  texto_vazio: 'Escreva algo antes de salvar.',
  ultimo_administrador: 'Não dá: é o último administrador ativo. Promova outra pessoa antes.',
  conta_ja_existe: 'Já existe uma conta com esse e-mail.',
  marca_sem_acesso: 'Esta marca ainda não tem acesso criado.',
  sem_marca: 'Sua conta ainda não está ligada a uma marca. Fale com a organização.',
}
export function traduzirErro(msg) {
  const m = String(msg || '')
  for (const [chave, frase] of Object.entries(ERROS)) if (m.includes(chave)) return frase
  if (/^HTTP 5|^http_5/.test(m)) return 'O servidor não respondeu direito agora. Tente de novo em instantes.'
  return m
}

// Nível do título de seção. Dentro de uma Folha (gaveta) o título da própria
// folha já é o <h2>; as seções de dentro descem para <h3> sozinhas.
export const NivelTitulo = React.createContext(2)

/*
 * Seção de vista: título, nota curta e ações à direita, conteúdo embaixo —
 * SEM caixa. A hierarquia vem de tipografia e espaço; o filete no topo separa
 * uma seção da outra (auditoria: "caixa dentro de caixa").
 */
export function Secao({ titulo, nota, acoes, id, children, className = '' }) {
  const H = React.useContext(NivelTitulo) >= 3 ? 'h3' : 'h2'
  return (
    <section className={'ui-secao ' + className} id={id}>
      {(titulo || acoes) && (
        <header className="ui-secao__cabeca">
          <div className="ui-secao__titulos">
            {titulo && <H className="ui-secao__titulo">{titulo}</H>}
            {nota && <p className="ui-secao__nota">{nota}</p>}
          </div>
          {acoes && <div className="ui-secao__acoes">{acoes}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

// Abas acessíveis (setas mudam a aba, como o padrão WAI-ARIA).
export function Abas({ abas, ativa, onMudar, rotulo }) {
  const refs = React.useRef({})
  function tecla(ev, i) {
    const n = abas.length
    let alvo = null
    if (ev.key === 'ArrowRight') alvo = abas[(i + 1) % n]
    else if (ev.key === 'ArrowLeft') alvo = abas[(i - 1 + n) % n]
    else if (ev.key === 'Home') alvo = abas[0]
    else if (ev.key === 'End') alvo = abas[n - 1]
    if (!alvo) return
    ev.preventDefault()
    onMudar(alvo.chave)
    const el = refs.current[alvo.chave]
    if (el) el.focus()
  }
  return (
    <div className="ui-abas" role="tablist" aria-label={rotulo}>
      {abas.map((a, i) => (
        <button
          key={a.chave}
          ref={(el) => { refs.current[a.chave] = el }}
          type="button" role="tab"
          className="ui-aba"
          aria-selected={ativa === a.chave}
          tabIndex={ativa === a.chave ? 0 : -1}
          onClick={() => onMudar(a.chave)}
          onKeyDown={(ev) => tecla(ev, i)}
        >
          {a.rotulo}
          {a.n > 0 && <span className="ui-aba__n">{a.n}</span>}
        </button>
      ))}
    </div>
  )
}

// Selo de estado — rótulo e cor vêm do dicionário único (lib/status.js), e o
// ÍCONE vem do tom (ICONE_TOM): o estado se reconhece sem depender da cor.
// `children` substitui o texto quando a tela precisa de uma forma mais curta.
// `tom` direto serve a estados que não moram num domínio (ex.: "Pendente").
export function Selo({ dominio, valor, tom, children }) {
  const t = tom || tomDe(dominio, valor)
  return (
    <span className="og-selo" data-tom={t}>
      <Icone nome={ICONE_TOM[t] || 'circulo'} tamanho={16} />
      {children || rotuloDe(dominio, valor)}
    </span>
  )
}
export const Status = Selo

/*
 * ── Peças da reconstrução visual (29/09/2026) ─────────────────────────────
 * Três níveis: página (VistaCabeca) → macroseção → módulo (card). Cada
 * assunto tem o seu card; a separação vem de espaço e superfície, não de
 * linha. Ver docs/superpowers/specs/2026-09-29-reconstrucao-visual-painel-design.md.
 */

// Macroseção: rótulo curto em caixa-alta (o ÚNICO uso de caixa-alta do
// painel) + título. Agrupa módulos de um mesmo assunto.
export function MacroSecao({ rotulo, titulo, nota, acoes, id, children }) {
  const H = React.useContext(NivelTitulo) >= 3 ? 'h3' : 'h2'
  return (
    <section className="ui-macro" id={id}>
      <header className="ui-macro__cabeca">
        <div className="ui-macro__titulos">
          {rotulo && <p className="ui-macro__rotulo">{rotulo}</p>}
          {titulo && <H className="ui-macro__titulo">{titulo}</H>}
          {nota && <p className="ui-macro__nota">{nota}</p>}
        </div>
        {acoes && <div className="ui-acoes">{acoes}</div>}
      </header>
      {children}
    </section>
  )
}

// Grade que põe módulos lado a lado quando cabe (320px por card).
export function GradeModulos({ children, className = '' }) {
  return <div className={'ui-modulos ' + className}>{children}</div>
}

/*
 * Módulo: uma unidade funcional (ex.: "Bebida", "Onde encontrar"). Cabeça com
 * disco de ícone + título + status; corpo; pé com a ação principal NOMEADA
 * ("Editar bebida", nunca só "Editar"). `onClick` torna o card inteiro um
 * atalho (resumo) — nesse caso ele não leva ações dentro.
 */
export function Modulo({ icone, titulo, sub, status, acoes, largo, onClick, rotuloIr, children, className = '', id }) {
  const H = React.useContext(NivelTitulo) >= 3 ? 'h4' : 'h3'
  const cabeca = (
    <div className="ui-modulo__cabeca">
      {icone && <span className="ui-modulo__disco" aria-hidden="true"><Icone nome={icone} tamanho={24} /></span>}
      <div className="ui-modulo__titulos">
        <H className="ui-modulo__titulo">{titulo}</H>
        {sub && <p className="ui-modulo__sub">{sub}</p>}
      </div>
      {status && <div className="ui-modulo__status">{status}</div>}
    </div>
  )
  const cls = 'ui-modulo' + (largo ? ' ui-modulo--largo' : '') + (onClick ? ' ui-modulo--atalho' : '') + (className ? ' ' + className : '')
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} id={id}>
        {cabeca}
        {children && <div className="ui-modulo__corpo">{children}</div>}
        <span className="ui-modulo__ir">{rotuloIr || 'Abrir'} <Icone nome="ir" tamanho={16} /></span>
      </button>
    )
  }
  return (
    <section className={cls} id={id}>
      {cabeca}
      {children && <div className="ui-modulo__corpo">{children}</div>}
      {acoes && <div className="ui-modulo__pe ui-acoes">{acoes}</div>}
    </section>
  )
}

// Valores curtos do mesmo assunto, juntos numa linha: [Vegano: não] [Sem glúten: sim].
export function Chips({ itens, rotulo }) {
  const lista = (itens || []).filter(Boolean)
  if (!lista.length) return null
  return (
    <ul className="ui-chips" aria-label={rotulo}>
      {lista.map((c, i) => (
        <li key={i} className="ui-chip-info" data-sim={c.sim === true ? '1' : c.sim === false ? '0' : undefined}>
          {c.rotulo}{c.valor != null && <>: <b>{c.valor}</b></>}
        </li>
      ))}
    </ul>
  )
}

// Botão com ícone + texto (ação importante nunca é só ícone).
export function Botao({ icone, children, variante, mini = true, className = '', ...resto }) {
  const cls = 'og-btn' + (mini ? ' og-btn--mini' : '') + (variante === 'secundario' ? ' og-btn--vazado' : '') + (variante === 'destaque' ? ' og-btn--amarelo' : '') + (className ? ' ' + className : '')
  return <button type="button" className={cls} {...resto}>{icone && <Icone nome={icone} tamanho={16} />}{children}</button>
}

/*
 * "Mais ações": o que é raro não disputa espaço com a ação principal.
 * <details> nativo — teclado e leitor de tela de graça; fecha ao escolher.
 */
export function MaisAcoes({ itens, rotulo = 'Mais ações' }) {
  const ref = React.useRef(null)
  const lista = (itens || []).filter(Boolean)
  if (!lista.length) return null
  function escolher(fn) { if (ref.current) ref.current.open = false; fn() }
  return (
    <details className="ui-mais-acoes" ref={ref}>
      <summary className="og-btn og-btn--mini og-btn--vazado"><Icone nome="mais-acoes" tamanho={16} />{rotulo}</summary>
      <ul className="ui-mais-acoes__menu">
        {lista.map((a, i) => (
          <li key={i}>
            <button type="button" className={'ui-mais-acoes__item' + (a.perigo ? ' is-perigo' : '')} disabled={a.desativado} onClick={() => escolher(a.onClick)}>
              {a.icone && <Icone nome={a.icone} tamanho={16} />}{a.rotulo}
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}

/*
 * Logo do estabelecimento num slot padrão: proporção original, `contain`,
 * margem interna, nunca recortada (exceção do PAINEL à §6.12 do site: aqui a
 * logo é enviada pela marca, com proporção qualquer). Sem logo: iniciais —
 * nunca imagem genérica.
 */
export function LogoMarca({ url, nome, tamanho = 40, className = '' }) {
  const [falhou, setFalhou] = React.useState(false)
  React.useEffect(() => { setFalhou(false) }, [url])
  const estilo = { '--logo-t': tamanho + 'px' }
  if (url && !falhou) {
    return <span className={'ui-logo ' + className} style={estilo}><img src={url} alt={'Logo de ' + (nome || 'marca')} loading="lazy" onError={() => setFalhou(true)} /></span>
  }
  return <span className={'ui-logo ui-logo--iniciais ' + className} style={estilo} role="img" aria-label={'Sem logo: ' + (nome || 'marca')}>{iniciais(nome)}</span>
}

// Ajuda recolhida: a regra fica a um toque, não ocupando a tela (<details>
// nativo — teclado e leitor de tela de graça).
export function Ajuda({ titulo = 'Como funciona', children }) {
  return (
    <details className="ui-ajuda">
      <summary><span className="ui-ajuda__i" aria-hidden="true">i</span>{titulo}</summary>
      <div className="ui-ajuda__texto">{children}</div>
    </details>
  )
}
