import React from 'react'

/**
 * Captura erros de render/runtime e mostra uma tela legível em vez de
 * deixar a página em branco. Exibe a mensagem do erro para diagnóstico.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error?.message || String(this.state.error)
    const stack = this.state.error?.stack || ''
    const comp = this.state.info?.componentStack || ''

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: '#FFF1E6', fontFamily: 'Helvetica, Arial, sans-serif',
      }}>
        <div style={{
          maxWidth: 560, width: '100%', background: '#fff', borderRadius: 18,
          padding: '28px 24px', boxShadow: '0 12px 40px rgba(0,0,0,.12)', color: '#3F1A0A',
        }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#D63648' }}>Algo deu errado.</h1>
          <p style={{ margin: '0 0 16px', fontSize: 15, lineHeight: 1.5 }}>
            Recarregue a página. Se continuar, envie um print desta mensagem.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              border: 0, borderRadius: 999, padding: '10px 20px', cursor: 'pointer',
              background: '#D63648', color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 18,
            }}>
            Recarregar
          </button>
          <pre style={{
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.45,
            background: '#FBEADC', borderRadius: 10, padding: 12, margin: 0, maxHeight: 320, overflow: 'auto',
            color: '#6B4A3A',
          }}>{msg}{'\n\n'}{comp || stack}</pre>
        </div>
      </div>
    )
  }
}
