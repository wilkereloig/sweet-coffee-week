import React from 'react'
import { lerPreferencia, salvarPreferencia } from '../lib/consentimento'

/*
 * Diálogo "Preferências de cookies" (13/10/2026).
 *
 * <dialog> nativo com showModal(): o resto da página fica inerte (o foco não
 * sai do diálogo), Escape dispara `cancel` e fecha SEM salvar. O foco volta a
 * quem abriu. Só duas categorias, porque só duas existem no site:
 * funcionamento (sempre ativo) e análise (Google Analytics, opcional).
 *
 * Fechar sem salvar não muda nada: o interruptor só vale quando a pessoa
 * aperta um dos três botões.
 */
export function PreferenciasCookies({ aberto, gatilho, onFechar }) {
  const ref = React.useRef(null)
  const tituloRef = React.useRef(null)
  const [analise, setAnalise] = React.useState(false)

  React.useEffect(() => {
    const d = ref.current
    if (!d) return
    if (aberto && !d.open) {
      const p = lerPreferencia()
      setAnalise(!!(p && p.analise))
      d.showModal()
      if (tituloRef.current) tituloRef.current.focus()
    } else if (!aberto && d.open) {
      d.close()
    }
  }, [aberto])

  // Ao fechar por qualquer caminho, o foco volta ao gatilho.
  React.useEffect(() => {
    const d = ref.current
    if (!d) return
    const aoFechar = () => {
      onFechar()
      // O gatilho pode ter saído de cena (o "Configurar" do aviso some quando a
      // escolha é salva): aí o foco vai para o conteúdo, nunca para o vazio.
      const alvo = gatilho && document.contains(gatilho) ? gatilho : document.getElementById('conteudo')
      if (alvo && typeof alvo.focus === 'function') alvo.focus()
    }
    d.addEventListener('close', aoFechar)
    return () => d.removeEventListener('close', aoFechar)
  }, [gatilho, onFechar])

  // Contenção de foco: Tab no último volta ao primeiro, e o inverso. O modal
  // nativo deixa o foco escapar para a barra do navegador; aqui não escapa.
  const prender = (e) => {
    if (e.key !== 'Tab') return
    const itens = [...ref.current.querySelectorAll('button, a[href]')].filter((el) => !el.disabled)
    if (!itens.length) return
    const primeiro = itens[0]
    const ultimo = itens[itens.length - 1]
    const ativo = document.activeElement
    if (e.shiftKey && (ativo === primeiro || ativo === tituloRef.current)) { e.preventDefault(); ultimo.focus() }
    else if (!e.shiftKey && ativo === ultimo) { e.preventDefault(); primeiro.focus() }
  }

  const decidir = (valor) => {
    salvarPreferencia(valor)
    ref.current.close()
  }

  return (
    <dialog
      ref={ref}
      className="scw-pref"
      aria-labelledby="scw-pref-titulo"
      aria-describedby="scw-pref-intro"
      onKeyDown={prender}
    >
      <div className="scw-pref__caixa">
        <div className="scw-pref__topo">
          <h2 id="scw-pref-titulo" className="scw-pref__titulo" tabIndex={-1} ref={tituloRef}>
            Preferências de cookies
          </h2>
          <button
            type="button"
            className="scw-pref__fechar"
            aria-label="Fechar sem salvar"
            onClick={() => ref.current.close()}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p id="scw-pref-intro" className="scw-pref__intro">
          Escolha o que o site pode usar no seu navegador. Dá para mudar quando quiser, pelo
          link “Preferências de cookies” no rodapé.
        </p>

        <section className="scw-pref__cat" aria-labelledby="scw-pref-func">
          <div className="scw-pref__cat-cabeca">
            <h3 id="scw-pref-func" className="scw-pref__cat-titulo">Funcionamento e segurança</h3>
            <span className="scw-pref__sempre">Sempre ativo</span>
          </div>
          <p>
            Guarda a sua escolha sobre cookies e, se você entrar no Painel SCW, mantém o login
            enquanto a aba estiver aberta. Sem isso o site não lembra o que você decidiu. Não
            mede audiência.
          </p>
        </section>

        <section className="scw-pref__cat" aria-labelledby="scw-pref-analise">
          <div className="scw-pref__cat-cabeca">
            <h3 id="scw-pref-analise" className="scw-pref__cat-titulo">Análise de acesso</h3>
            <button
              type="button"
              role="switch"
              aria-checked={analise}
              aria-labelledby="scw-pref-analise"
              className="scw-pref__chave"
              onClick={() => setAnalise((v) => !v)}
            >
              <span className="scw-pref__chave-trilho" aria-hidden="true"><span /></span>
              <span className="scw-pref__chave-estado" aria-hidden="true">{analise ? 'Ligada' : 'Desligada'}</span>
            </button>
          </div>
          <p>
            Com o Google Analytics, contamos visitas e vemos quais páginas são mais acessadas,
            para melhorar o site. Fica desligada até você permitir. Não é usada para anúncios
            nem para personalizar o que você vê.
          </p>
        </section>

        <div className="scw-pref__acoes">
          <button type="button" className="scw-pref__btn scw-pref__btn--salvar" onClick={() => decidir(analise)}>
            Salvar preferências
          </button>
          <button type="button" className="scw-pref__btn" onClick={() => decidir(false)}>
            Recusar opcionais
          </button>
          <button type="button" className="scw-pref__btn" onClick={() => decidir(true)}>
            Aceitar análise
          </button>
        </div>

        <a className="scw-pref__link" href="#/cookies" onClick={() => ref.current.close()}>
          Política de Cookies
        </a>
      </div>
    </dialog>
  )
}
