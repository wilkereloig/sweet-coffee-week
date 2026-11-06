import React from 'react'
import { Botao } from '../ui'
import { codigoDoQr } from '../../lib/vouchers'
import '../../styles/vouchers-virtuais.css'

/*
 * Ler o QR do voucher pela câmera, dentro do painel. Só onde o navegador sabe ler QR (`BarcodeDetector`: Chrome no
 * Android e no computador). No iPhone isso não existe — ali a câmera do celular abre o QR do cliente e o painel já
 * chega com o código (`?voucher=`, lib/voucherPendente.js). Ler NÃO registra o uso: só entrega o código à tela.
 *
 * O botão que liga a câmera mora no Balcão (VouchersMarca): este componente só desenha a câmera enquanto `ativo`.
 * A câmera só é pedida quando a pessoa toca no botão (nunca ao abrir a tela). Falha → `aoErro(texto)` e a digitação segue.
 */
export const leitorDeQrDisponivel = () =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

export const TEXTO_SEM_LEITOR = 'Este aparelho não lê QR dentro do painel. Abra o QR do cliente com a câmera do celular (o código chega aqui sozinho) ou digite o código.'

export function LerQrVoucher({ ativo, aoLer, aoParar, aoErro }) {
  const video = React.useRef(null)
  const entregar = React.useRef(aoLer)
  entregar.current = aoLer
  const parar = React.useRef(aoParar)
  parar.current = aoParar
  const falhar = React.useRef(aoErro)
  falhar.current = aoErro

  React.useEffect(() => {
    if (!ativo) return undefined
    let parado = false
    let fluxo = null
    let timer = null
    ;(async () => {
      try {
        fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (parado) { fluxo.getTracks().forEach((t) => t.stop()); return }
        const v = video.current
        v.srcObject = fluxo
        await v.play()
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const girar = async () => {
          if (parado) return
          try {
            const achados = await detector.detect(v)
            const codigo = achados.map((a) => codigoDoQr(a.rawValue)).find(Boolean)
            if (codigo) { parar.current(); entregar.current(codigo); return }
          } catch { /* quadro sem imagem ainda: tenta no próximo */ }
          timer = setTimeout(girar, 250)
        }
        girar()
      } catch (e) {
        falhar.current(e && e.name === 'NotAllowedError'
          ? 'A câmera não foi liberada. Libere nas permissões do navegador, ou digite o código, ou abra o QR do cliente com a câmera do celular.'
          : 'Não deu para abrir a câmera agora. Digite o código ou abra o QR do cliente com a câmera do celular.')
      }
    })()
    return () => { parado = true; clearTimeout(timer); if (fluxo) fluxo.getTracks().forEach((t) => t.stop()) }
  }, [ativo])

  if (!ativo) return null
  return (
    <div className="vv-leitor">
      <video ref={video} className="vv-leitor__video" muted playsInline aria-label="Câmera lendo o QR do voucher" />
      <div className="vv-leitor__acoes">
        <Botao variante="secundario" mini={false} onClick={() => parar.current()}>Parar de ler</Botao>
      </div>
      <p className="ui-nota" role="status">Aponte para o QR do voucher (impresso ou na tela do cliente).</p>
    </div>
  )
}
