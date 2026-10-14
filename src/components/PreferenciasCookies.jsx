import React from 'react'
import { analisePermitida, salvarPreferencia } from '../lib/consentimento'
import IconeUi from './scw-icons/IconeUi'

/*
 * Diálogo "Preferências de cookies" (13/10/2026).
 *
 * <dialog> nativo com showModal(): o resto da página fica inerte (o foco não
 * sai do diálogo), Escape dispara `cancel` e fecha SEM salvar. O foco volta a
 * quem abriu. Só duas categorias, porque só duas existem no site:
 * funcionamento (sempre ativo) e análise (Google Analytics, ligada por padrão).
 *
 * Fechar sem salvar não muda nada: o interruptor só vale quando a pessoa
 * aperta "Salvar". Texto curto de propósito (pedido do Wilker).
 */
export function PreferenciasCookies({ aberto, gatilho, onFechar }) {
  const ref = React.useRef(null)
  const tituloRef = React.useRef(null)
  const [analise, setAnalise] = React.useState(false)

  React.useEffect(() => {
    const d = ref.current
    if (!d) return
    if (aberto && !d.open) {
      setAnalise(analisePermitida())
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
            <IconeUi nome="fechar" tamanho={20} />
          </button>
        </div>

        <p id="scw-pref-intro" className="scw-pref__intro">
          Você pode mudar isso quando quiser, pelo rodapé do site.
        </p>

        <section className="scw-pref__cat" aria-labelledby="scw-pref-func">
          <div className="scw-pref__cat-cabeca">
            <h3 id="scw-pref-func" className="scw-pref__cat-titulo">Funcionamento e segurança</h3>
            <span className="scw-pref__sempre">Sempre ativo</span>
          </div>
          <p>
            Lembra a sua escolha e mantém o login do Painel SCW.
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
            Conta as visitas pelo Google Analytics para melhorar o site. Sem anúncios.
          </p>
        </section>

        <div className="scw-pref__acoes">
          <button type="button" className="scw-pref__btn scw-pref__btn--salvar" onClick={() => decidir(analise)}>
            Salvar
          </button>
        </div>

        <a className="scw-pref__link" href="#/cookies" onClick={() => ref.current.close()}>
          Política de Cookies
        </a>
      </div>
    </dialog>
  )
}
