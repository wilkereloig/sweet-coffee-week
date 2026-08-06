import { SCW_ICONS, SCW_ICON_SPEC } from './scw-icons-v2'

/**
 * Ícone do festival. Cinco tamanhos e nada entre eles:
 * 16 texto · 20 botão · 24 cabeçalho e cards · 32 passos · 48 chapa colorida.
 * A cor vem sempre do contexto (currentColor) — nunca passe fill/stroke.
 * Decorativo por padrão; com `titulo` vira imagem acessível.
 */
const TAMANHOS = [16, 20, 24, 32, 48]

export default function ScwIcon({ nome, tamanho = 24, titulo, className, ...resto }) {
  const d = SCW_ICONS[nome]
  if (!d) {
    if (import.meta.env?.DEV) console.warn('[ScwIcon] ícone inexistente:', nome)
    return null
  }
  if (import.meta.env?.DEV && !TAMANHOS.includes(tamanho)) {
    console.warn('[ScwIcon] tamanho fora da escala (16/20/24/32/48):', tamanho, nome)
  }
  return (
    <svg
      className={className}
      width={tamanho}
      height={tamanho}
      viewBox={SCW_ICON_SPEC.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={SCW_ICON_SPEC.strokeWidth}
      strokeLinecap={SCW_ICON_SPEC.linecap}
      strokeLinejoin={SCW_ICON_SPEC.linejoin}
      role={titulo ? 'img' : undefined}
      aria-label={titulo || undefined}
      aria-hidden={titulo ? undefined : 'true'}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: (titulo ? `<title>${titulo}</title>` : '') + d }}
      {...resto}
    />
  )
}
