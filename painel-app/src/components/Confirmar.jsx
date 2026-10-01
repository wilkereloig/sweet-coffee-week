import React from 'react'
import { Icone } from './Icone'

/*
 * Confirmação própria do painel — substitui window.confirm/window.prompt, que
 * abriam a caixa cinza do navegador no meio do desenho (redesenho 01/10/2026).
 *
 *   if (!(await confirmar('Arquivar X? Ela sai das listas.'))) return
 *   const motivo = await pedirTexto('Bloquear X?', { rotulo: 'Motivo (opcional)' })  // null = cancelou
 *   avisar('Informe um número inteiro.')               // um botão só, no lugar do alert
 *
 * <dialog> nativo com showModal(): camada de cima, fundo inerte, Esc cancela
 * e o foco volta sozinho para quem abriu — nada disso é reimplementado aqui.
 * O foco entra em "Voltar" (ação segura) ou no campo, nunca no botão que faz.
 * Sem <Confirmacoes/> montado (teste, tela antes do painel), cai na caixa nativa.
 */

let mostrar = null

// Verbo de abertura vira o rótulo do botão ("Arquivar X?" → [Arquivar]).
// Os da segunda lista desfazem ou cortam algo: botão laranja.
const VERBOS = /^(Remover|Arquivar|Cancelar|Desativar|Desligar|Bloquear|Fechar|Sair|Gerar|Trocar|Desbloquear|Marcar|Criar|Publicar|Aplicar|Exigir)\b/
const PERIGO = /^(Remover|Arquivar|Cancelar|Desativar|Desligar|Bloquear|Fechar|Sair|Gerar|Trocar)$/

export function confirmar(texto, opcoes = {}) {
  return new Promise((resolver) => {
    const pedido = { ...opcoes, texto: String(texto || ''), resolver }
    if (mostrar) mostrar(pedido)
    else if (opcoes.aviso) { window.alert(pedido.texto); resolver(true) }
    else resolver(opcoes.campo ? window.prompt(pedido.texto, opcoes.campo.valor || '') : window.confirm(pedido.texto))
  })
}
export const pedirTexto = (texto, campo = {}, opcoes = {}) => confirmar(texto, { ...opcoes, campo })
// Aviso de um botão só (era window.alert): erro ou regra que a pessoa precisa ler.
export const avisar = (texto) => confirmar(texto, { aviso: true, acao: 'Entendi', perigo: false })

function partes(p) {
  // Aviso longo (mensagem de erro): título curto, a frase inteira embaixo.
  if (p.aviso && !p.titulo && p.texto.length > 90) return { titulo: 'Atenção', paragrafos: [p.texto], acao: p.acao, perigo: false }
  const i = p.texto.indexOf('?')
  const titulo = p.titulo || (i > 0 ? p.texto.slice(0, i + 1) : p.texto)
  const resto = p.titulo ? p.texto : i > 0 ? p.texto.slice(i + 1).trim() : ''
  const verbo = (VERBOS.exec(p.texto) || [])[1]
  return {
    titulo,
    paragrafos: resto ? resto.split(/\n{2,}|\n/).filter(Boolean) : [],
    acao: p.acao || verbo || (p.campo ? 'Salvar' : 'Confirmar'),
    perigo: p.perigo != null ? p.perigo : !!(verbo && PERIGO.test(verbo)),
  }
}

export function Confirmacoes() {
  const [pedido, setPedido] = React.useState(null)
  const [valor, setValor] = React.useState('')
  const ref = React.useRef(null)
  const idTitulo = React.useId()

  React.useEffect(() => {
    mostrar = (p) => {
      setPedido((antes) => { if (antes) antes.resolver(antes.campo ? null : false); return p })
      setValor((p.campo && p.campo.valor) || '')
    }
    return () => { mostrar = null }
  }, [])

  React.useEffect(() => {
    const d = ref.current
    if (!pedido || !d) return
    if (!d.open) d.showModal()
    const alvo = d.querySelector('[data-foco]')
    if (alvo) alvo.focus()
  }, [pedido])

  function responder(sim) {
    const p = pedido
    if (!p) return
    if (ref.current && ref.current.open) ref.current.close()
    setPedido(null)
    p.resolver(p.campo ? (sim ? valor : null) : sim)
  }

  if (!pedido) return null
  const { titulo, paragrafos, acao, perigo } = partes(pedido)
  return (
    <dialog ref={ref} className="ui-confirma" aria-labelledby={idTitulo}
      onCancel={(e) => { e.preventDefault(); responder(false) }}
      onClick={(e) => { if (e.target === ref.current) responder(false) }}>
      <form className="ui-confirma__caixa" method="dialog" onSubmit={(e) => { e.preventDefault(); responder(true) }}>
        <span className={'ui-confirma__disco' + (perigo ? ' is-perigo' : '')} aria-hidden="true">
          <Icone nome={perigo || pedido.aviso ? 'atencao-circulo' : 'ok-circulo'} tamanho={24} />
        </span>
        <h2 id={idTitulo} className="ui-confirma__titulo">{titulo}</h2>
        {paragrafos.map((t, i) => <p key={i} className="ui-confirma__texto">{t}</p>)}
        {pedido.campo && (
          <label className="og-campo">
            <span className={pedido.campo.rotulo ? undefined : 'ui-oculto'}>{pedido.campo.rotulo || titulo}</span>
            <input type="text" data-foco value={valor} onChange={(e) => setValor(e.target.value)} />
          </label>
        )}
        <div className="ui-confirma__acoes">
          {!pedido.aviso && <button type="button" className="og-btn og-btn--vazado" data-foco={pedido.campo ? undefined : ''} onClick={() => responder(false)}>Voltar</button>}
          <button type="submit" className={'og-btn' + (perigo ? ' og-btn--perigo' : '')} data-foco={pedido.aviso ? '' : undefined}>{acao}</button>
        </div>
      </form>
    </dialog>
  )
}
