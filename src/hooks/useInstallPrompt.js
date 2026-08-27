/*
 * Captura do `beforeinstallprompt` do SITE — decisão do Eloi (27/08/2026):
 * `public/manifest.webmanifest` deixou de instalar "o site" e passou a
 * instalar o Painel SCW (`start_url`/`scope` = `/painel/`), pro botão
 * "Instalar app do painel" no diálogo de acesso funcionar em UM clique.
 *
 * ⚠️ Chrome só honra `.prompt()` com gesto de usuário no MESMO documento
 * onde o evento disparou (verificado contra MDN/web.dev antes de escrever
 * isto — não dá pra abrir `/painel/` e chamar `.prompt()` lá sem outro
 * clique, ativação de usuário não atravessa navegação). Por isso a captura
 * mora aqui, no documento do site, não em `/painel/index.html`.
 *
 * Módulo, não hook: o listener precisa estar armado antes de qualquer
 * componente montar — o evento pode disparar cedo, e um `useEffect` só
 * corre depois do primeiro paint.
 */
let evento = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    evento = e
  })
  window.addEventListener('appinstalled', () => { evento = null })
}

/* Se o prompt nativo já foi capturado, dispara na hora (1 clique). Senão —
   engajamento insuficiente ainda, iOS sem essa API, ou já instalado —
   cai no caminho de sempre: abre `/painel/`, que tem a própria captura
   como reserva. */
export async function instalarPainel() {
  if (!evento) {
    window.open('/painel/', '_blank', 'noopener,noreferrer')
    return
  }
  const e = evento
  evento = null
  e.prompt()
  try { await e.userChoice } catch { /* usuário fechou o prompt nativo */ }
}
