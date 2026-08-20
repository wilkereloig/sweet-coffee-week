import { ErrorBoundary } from 'site-sweet-coffee-week'

// Passthrough: sem erro, mostra os filhos normalmente.
export const SemErro = () => (
  <ErrorBoundary>
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>Conteúdo normal da página.</div>
  </ErrorBoundary>
)

// Um filho que lança na primeira renderização — é o único jeito real de
// disparar getDerivedStateFromError, e é exatamente o que a tela cobre.
function Quebra() {
  throw new Error('Falha de exemplo para o preview')
}
export const TelaDeErro = () => (
  <ErrorBoundary>
    <Quebra />
  </ErrorBoundary>
)
