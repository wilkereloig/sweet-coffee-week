// Resolve imports sem extensão (o Vite resolve, o Node ESM não).
export function resolve(spec, ctx, next) {
  if (spec.startsWith('.') && !/\.(js|mjs|json|css)$/.test(spec)) {
    return next(spec + '.js', ctx)
  }
  return next(spec, ctx)
}
