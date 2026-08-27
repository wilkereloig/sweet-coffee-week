import React from 'react'

/*
 * Arrastar pra baixo fecha — puxador de folha e cabeçalho do diálogo de
 * acesso reusam o mesmo gesto (§5.3: 2ª cópia extrai, não repete).
 * Pointer Events unifica dedo e mouse num evento só; `setPointerCapture`
 * prende os eventos seguintes no alvo mesmo que o ponteiro saia da área
 * pequena do puxador durante o arrasto — sem isso, `pointerup` nunca
 * dispararia de volta nele.
 * Devolve um CALLBACK REF, não aceita um `useRef` pronto: a folha e o
 * diálogo desmontam e remontam a cada abrir/fechar (ambos têm o próprio
 * `montada`/`fechando`), então um `ref.current` capturado uma vez só
 * ficaria preso no primeiro nó — o puxador da segunda abertura em diante
 * ficaria surdo, sem erro nenhum denunciando. O callback ref dispara de
 * novo a cada nó novo, então o efeito sempre escuta o puxador certo.
 * Sem seguir o ponteiro em tempo real (rubber-band): só detecta o gesto e
 * chama `onClose()`, reusando a mesma animação de saída que Esc e clique
 * fora já disparam.
 */
const LIMIAR_PADRAO = 60

export function useArrastarFechar(onClose, limiar = LIMIAR_PADRAO) {
  const [alvo, setAlvo] = React.useState(null)
  const ref = React.useCallback((node) => setAlvo(node), [])

  React.useEffect(() => {
    if (!alvo) return

    let inicioY = null

    const soltar = (e) => {
      if (alvo.hasPointerCapture && alvo.hasPointerCapture(e.pointerId)) {
        alvo.releasePointerCapture(e.pointerId)
      }
    }
    const onDown = (e) => {
      inicioY = e.clientY
      if (alvo.setPointerCapture) alvo.setPointerCapture(e.pointerId)
    }
    const onUp = (e) => {
      soltar(e)
      if (inicioY == null) return
      const delta = e.clientY - inicioY
      inicioY = null
      if (delta > limiar) onClose()
    }
    const onCancel = (e) => {
      soltar(e)
      inicioY = null
    }

    alvo.addEventListener('pointerdown', onDown)
    alvo.addEventListener('pointerup', onUp)
    alvo.addEventListener('pointercancel', onCancel)
    return () => {
      alvo.removeEventListener('pointerdown', onDown)
      alvo.removeEventListener('pointerup', onUp)
      alvo.removeEventListener('pointercancel', onCancel)
    }
  }, [alvo, onClose, limiar])

  return ref
}
