import React from 'react'
import { NAV_LINKS } from './nav'

// Canal oficial de contato do festival (único definido no projeto).
const INSTAGRAM_HANDLE = '@sweetcoffeeweek'
const INSTAGRAM_URL = 'https://instagram.com/sweetcoffeeweek'

// Informações essenciais do institucional (fonte única p/ o rodapé).
const FOOTER_INFO = [
  'Festival gastronômico criado em Natal/RN.',
  'Combos por edição: 1 doce + 1 salgado + 1 bebida.',
  'Realização: F2 Experience.',
  'Canal principal: Instagram oficial.',
]

/**
 * Rodapé institucional do Sweet & Coffee Week.
 * Componente global do institucional — usar em todas as páginas institucionais,
 * exceto o painel interno (ver App.jsx). Segue a régua de espaçamento/container
 * da Home (.section + .wrap). Doc: src/design/SITE_DIRECTION.md (§ Rodapé).
 *
 * Caixa de sugestão: envio honesto, sem backend. Ao enviar, copia o texto pro
 * clipboard e abre o Instagram oficial (canal real). Não simula envio falso.
 * TODO(backend): conectar a sugestão a uma função/endpoint quando o institucional
 * tiver coleta própria (ex.: Formspree/Supabase) e então trocar este fluxo.
 */
export function SiteFooter({ navigate }) {
  const [form, setForm] = React.useState({ nome: '', contato: '', sugestao: '' })
  const [status, setStatus] = React.useState(null) // null | 'sent' | 'fallback'

  const go = (href) => (e) => {
    e.preventDefault()
    navigate(href.replace('#', ''))
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  const onChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (status) setStatus(null)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.sugestao.trim()) return

    const linhas = [
      'Sugestão para o Sweet & Coffee Week:',
      '',
      form.sugestao.trim(),
    ]
    if (form.nome.trim()) linhas.push('', `Nome: ${form.nome.trim()}`)
    if (form.contato.trim()) linhas.push(`Contato: ${form.contato.trim()}`)
    const texto = linhas.join('\n')

    let copied = false
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto)
        copied = true
      }
    } catch {
      copied = false
    }

    // Abre o canal oficial (Instagram) numa nova aba — envio real pelo canal real.
    if (typeof window !== 'undefined') {
      window.open(INSTAGRAM_URL, '_blank', 'noopener,noreferrer')
    }
    setStatus(copied ? 'sent' : 'fallback')
  }

  return (
    <footer className="section site-footer" role="contentinfo">
      <div className="wrap">
        <div className="site-footer__grid">
          {/* Identidade */}
          <div className="site-footer__col site-footer__brand">
            <a href="#/" className="site-footer__name" onClick={go('#/')}>Sweet &amp; Coffee Week</a>
            <p className="site-footer__tagline">
              O festival que transforma Natal em uma rota de sabores, encontros e descobertas.
            </p>
            <a className="site-footer__ig" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              {INSTAGRAM_HANDLE}
            </a>
            <p className="site-footer__realiza">
              Realização<br /><strong>F2 Experience</strong>
            </p>
          </div>

          {/* Navegação institucional — mesma navegação interna do header */}
          <nav className="site-footer__col site-footer__nav" aria-label="Navegação institucional">
            <h3 className="site-footer__h">Navegação</h3>
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <a href={l.href} onClick={go(l.href)}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Informações essenciais */}
          <div className="site-footer__col site-footer__info">
            <h3 className="site-footer__h">O festival</h3>
            <ul>
              {FOOTER_INFO.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>

          {/* Caixa de sugestões */}
          <div className="site-footer__col site-footer__suggest">
            <h3 className="site-footer__h">Tem uma sugestão para o festival?</h3>
            <p className="site-footer__suggest-help">
              Conta pra gente uma ideia, participante, tema ou melhoria que você gostaria de ver
              nas próximas edições.
            </p>
            <form className="site-footer__form" onSubmit={onSubmit} noValidate>
              <label className="site-footer__field">
                <span>Nome <em>(opcional)</em></span>
                <input type="text" value={form.nome} onChange={onChange('nome')} autoComplete="name" />
              </label>
              <label className="site-footer__field">
                <span>E-mail ou Instagram <em>(opcional)</em></span>
                <input type="text" value={form.contato} onChange={onChange('contato')} />
              </label>
              <label className="site-footer__field">
                <span>Sugestão <em>(obrigatório)</em></span>
                <textarea
                  value={form.sugestao}
                  onChange={onChange('sugestao')}
                  rows={3}
                  required
                  aria-required="true"
                />
              </label>
              <button type="submit" className="site-footer__send" disabled={!form.sugestao.trim()}>
                Enviar sugestão
              </button>
            </form>
            <p className="site-footer__status" role="status" aria-live="polite">
              {status === 'sent' &&
                'Copiamos sua sugestão e abrimos o Instagram @sweetcoffeeweek — é só colar na mensagem. Obrigado por contribuir com o Sweet & Coffee Week.'}
              {status === 'fallback' &&
                'O formulário ainda será conectado. Por enquanto, envie sua sugestão pelo Instagram @sweetcoffeeweek.'}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
