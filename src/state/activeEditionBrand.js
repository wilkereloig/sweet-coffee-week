/*
 * Store mínima pra Edições comunicar a logo da cena em foco pro header
 * (SiteHeader/BrandLogo), que fica fora da árvore da página — sem context
 * provider, só um external store (useSyncExternalStore, React 18).
 */
import { useSyncExternalStore } from 'react'

let current = null
const listeners = new Set()

export function setActiveEditionBrand(brand) {
  current = brand
  listeners.forEach((l) => l())
}

function subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) }
function getSnapshot() { return current }
function getServerSnapshot() { return null }

export function useActiveEditionBrand() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
