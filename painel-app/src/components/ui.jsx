import React from 'react'

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

export function Vazio({ titulo, children }) {
  return (
    <div className="ui-vazio">
      <p className="ui-vazio__titulo">{titulo}</p>
      {children && <div className="ui-vazio__texto">{children}</div>}
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
