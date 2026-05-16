const PALETTE = {
  '--bg':          '#FFF4EC',
  '--bg-soft':     '#FBEADC',
  '--ink':         '#2B1810',
  '--accent':      '#E8553A',
  '--accent-deep': '#C13E25',
  '--peach':       '#F2B6A0',
}

export function applyPalette() {
  const r = document.documentElement
  Object.entries(PALETTE).forEach(([k, v]) => r.style.setProperty(k, v))
}
