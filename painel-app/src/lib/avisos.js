/*
 * Avisos push (organização) — porta fiel de public/painel/index.html
 * (~4100-4109). A chave PRIVADA não está no repositório (fica fora do git,
 * ligada só como variável de ambiente da Edge Function); só a pública, que o
 * navegador precisa pra assinar, viaja no código dos dois painéis.
 */
export const VAPID_PUBLICA = 'BCY2ca0nu6BRWc0IeF28O6GiqYwZatuS4hGg86SuD4d02huuvBGyF63MjwBK_wBHkELl5OsLg6UOTgRZ9EIURAg'

// A chave vai para o `subscribe` como bytes, nunca como texto.
export function bytesDaChave(b64) {
  const base = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(base)
  const saida = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) saida[i] = bin.charCodeAt(i)
  return saida
}
