import React from 'react'

// Cabine de foto: selfie (câmera) ou foto enviada → moldura Lovers + adesivos
// arrastáveis/redimensionáveis → compartilhar/baixar (9:16).
// Stage base 360x640, capturado a 3x = 1080x1920 (html-to-image).
// MOLDURA: por enquanto desenhada em CSS/DOM (.pb-frame). Para trocar por um PNG,
// coloque /moldura-lovers.png e troque o bloco <PbFrame/> por
// <img className="pb-frame-img" src="/moldura-lovers.png" alt="" />.

const A = (n) => `/images/adesivos-site/adesivo%20(${n}).png`
const PALETTE = [43, 44, 50, 10, 8, 17, 35, 31, 25, 46, 21, 1, 5, 33]

let _sid = 0

export function PhotoBoothModal({ open, onClose }) {
  const [mode, setMode] = React.useState('choose') // choose | selfie | edit
  const [imgSrc, setImgSrc] = React.useState(null)
  const [stickers, setStickers] = React.useState([])
  const [sel, setSel] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [camErr, setCamErr] = React.useState('')
  const [facing, setFacing] = React.useState(() => {
    try { return sessionStorage.getItem('pb-facing') || 'user' } catch { return 'user' }
  })
  const [camStarting, setCamStarting] = React.useState(false)
  const [multiCam, setMultiCam] = React.useState(false)
  const [zoomCap, setZoomCap] = React.useState(null) // { min, max, step } se o device expõe zoom
  const [zoom, setZoom] = React.useState(1)
  const videoRef = React.useRef(null)
  const streamRef = React.useRef(null)
  const stageRef = React.useRef(null)
  const fileRef = React.useRef(null)
  const drag = React.useRef(null)

  const stopCam = React.useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }, [])

  React.useEffect(() => {
    if (!open) { stopCam(); setMode('choose'); setImgSrc(null); setStickers([]); setSel(null); setCamErr(''); setZoomCap(null); setZoom(1) }
  }, [open, stopCam])

  React.useEffect(() => () => stopCam(), [stopCam])

  async function startCam(which) {
    const want = which || facing
    setCamErr(''); setCamStarting(true); setMode('selfie')
    stopCam(); setZoomCap(null); setZoom(1)
    try {
      // Resolução genérica (sem forçar retrato 1080x1920): evita o modo recortado/zoom
      // agressivo que o Android escolhia. O recorte 9:16 fica no CSS e na captura.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: want }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      await new Promise(r => requestAnimationFrame(r))
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}) }
      // Capacidades do device: zoom óptico/digital e quantas câmeras existem.
      try {
        const track = stream.getVideoTracks()[0]
        const caps = track && track.getCapabilities ? track.getCapabilities() : null
        if (caps && caps.zoom && caps.zoom.max > caps.zoom.min) {
          setZoomCap({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 })
          const st = track.getSettings ? track.getSettings() : {}
          setZoom(st.zoom || caps.zoom.min)
        }
      } catch {}
      try {
        const devs = await navigator.mediaDevices.enumerateDevices()
        setMultiCam(devs.filter(d => d.kind === 'videoinput').length > 1)
      } catch {}
      try { sessionStorage.setItem('pb-facing', want) } catch {}
    } catch (e) {
      const msg = e && e.name === 'NotAllowedError'
        ? 'Permissão de câmera negada. Libere o acesso nas configurações do navegador ou use "Enviar foto".'
        : e && e.name === 'NotFoundError'
        ? 'Nenhuma câmera encontrada. Use "Enviar foto".'
        : 'Não foi possível acessar a câmera. Use "Enviar foto".'
      setCamErr(msg); setMode('choose')
    } finally {
      setCamStarting(false)
    }
  }

  function startSelfie() { startCam(facing) }

  function switchCam() {
    const next = facing === 'user' ? 'environment' : 'user'
    setFacing(next)
    startCam(next)
  }

  function applyZoom(v) {
    setZoom(v)
    const track = streamRef.current && streamRef.current.getVideoTracks()[0]
    if (track && track.applyConstraints) track.applyConstraints({ advanced: [{ zoom: v }] }).catch(() => {})
  }

  function capture() {
    const v = videoRef.current
    if (!v) return
    const cw = v.videoWidth, ch = v.videoHeight
    const target = 9 / 16
    let sw = cw, sh = cw / target
    if (sh > ch) { sh = ch; sw = ch * target }
    const sx = (cw - sw) / 2, sy = (ch - sh) / 2
    const canvas = document.createElement('canvas')
    canvas.width = 1080; canvas.height = 1920
    const ctx = canvas.getContext('2d')
    if (facing === 'user') { ctx.translate(1080, 0); ctx.scale(-1, 1) } // espelha só a câmera frontal
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, 1080, 1920)
    setImgSrc(canvas.toDataURL('image/jpeg', 0.92))
    stopCam(); setMode('edit')
  }

  function onFile(e) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => { setImgSrc(String(reader.result)); setMode('edit') }
    reader.readAsDataURL(f)
  }

  function addSticker(n) {
    setStickers(s => [...s, { id: ++_sid, src: A(n), x: 180, y: 320, scale: 1, rot: 0 }])
  }
  function removeSticker(id) { setStickers(s => s.filter(k => k.id !== id)); setSel(null) }

  function onStickerDown(e, st) {
    e.stopPropagation()
    setSel(st.id)
    const rect = stageRef.current.getBoundingClientRect()
    const scaleX = 360 / rect.width
    drag.current = { mode: 'move', id: st.id, startX: e.clientX, startY: e.clientY, ox: st.x, oy: st.y, scaleX }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  function onHandleDown(e, st) {
    e.stopPropagation()
    const rect = stageRef.current.getBoundingClientRect()
    const scaleX = 360 / rect.width
    const cx = rect.left + (st.x / scaleX), cy = rect.top + (st.y / scaleX)
    const d0 = Math.hypot(e.clientX - cx, e.clientY - cy)
    drag.current = { mode: 'resize', id: st.id, d0, s0: st.scale, a0: Math.atan2(e.clientY - cy, e.clientX - cx), r0: st.rot, cx, cy }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  function onMove(e) {
    const dr = drag.current
    if (!dr) return
    if (dr.mode === 'move') {
      const dx = (e.clientX - dr.startX) * dr.scaleX
      const dy = (e.clientY - dr.startY) * dr.scaleX
      setStickers(s => s.map(k => k.id === dr.id ? { ...k, x: Math.max(0, Math.min(360, dr.ox + dx)), y: Math.max(0, Math.min(640, dr.oy + dy)) } : k))
    } else {
      const d = Math.hypot(e.clientX - dr.cx, e.clientY - dr.cy)
      const a = Math.atan2(e.clientY - dr.cy, e.clientX - dr.cx)
      const scale = Math.max(0.3, Math.min(3, dr.s0 * (d / (dr.d0 || 1))))
      const rot = dr.r0 + (a - dr.a0) * 180 / Math.PI
      setStickers(s => s.map(k => k.id === dr.id ? { ...k, scale, rot } : k))
    }
  }
  function onUp() {
    drag.current = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }

  async function exportBlob() {
    setSel(null)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    const { toBlob } = await import('html-to-image')
    return toBlob(stageRef.current, { pixelRatio: 3, width: 360, height: 640, cacheBust: true })
  }
  async function doShare() {
    if (busy) return; setBusy(true)
    try {
      const blob = await exportBlob()
      if (!blob) throw new Error('sem imagem')
      const file = new File([blob], 'sweet-lovers-foto.png', { type: 'image/png' })
      const text = 'No Sweet & Coffee Week Lovers 💛 sweetcoffeeweek.com.br @sweetcoffeeweek'
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text })
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); URL.revokeObjectURL(a.href) }
    } catch (e) { if (import.meta.env.DEV) console.error('[photobooth share]', e) }
    finally { setBusy(false) }
  }
  async function doDownload() {
    if (busy) return; setBusy(true)
    try {
      const blob = await exportBlob()
      if (!blob) throw new Error('sem imagem')
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sweet-lovers-foto.png'; a.click(); URL.revokeObjectURL(a.href)
    } catch (e) { if (import.meta.env.DEV) console.error('[photobooth dl]', e) }
    finally { setBusy(false) }
  }

  if (!open) return null

  return (
    <div className="share-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="share-modal__panel pb-panel" onClick={(e) => e.stopPropagation()}>
        <button className="share-modal__close" onClick={onClose} aria-label="Fechar">✕</button>

        {mode === 'choose' && (
          <div className="pb-choose">
            <h2 className="pb-title">Foto Sweet Lover</h2>
            <p className="pb-sub">Tire uma selfie ou envie a foto do combo, coloque a moldura e os adesivos, e poste no seu Story 💛</p>
            <button className="lovers-button lovers-button--primary" onClick={startSelfie}>Tirar selfie</button>
            <button className="lovers-button lovers-button--secondary" onClick={() => fileRef.current && fileRef.current.click()}>Enviar foto</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            {camErr && <p className="pb-err">{camErr}</p>}
          </div>
        )}

        {mode === 'selfie' && (
          <div className="pb-selfie">
            <div className="pb-stage">
              <video ref={videoRef} playsInline muted className={'pb-video' + (facing === 'user' ? ' pb-video--mirror' : '')} />
              {camStarting && <div className="pb-loading"><span className="pb-spinner" />Iniciando câmera…</div>}
              {multiCam && (
                <button className="pb-switch" onClick={switchCam} disabled={camStarting} aria-label="Trocar câmera" title="Trocar câmera">⟲</button>
              )}
              <PbFrame />
            </div>
            {zoomCap && (
              <div className="pb-zoom">
                <span aria-hidden="true">−</span>
                <input type="range" min={zoomCap.min} max={zoomCap.max} step={zoomCap.step} value={zoom}
                  onChange={(e) => applyZoom(parseFloat(e.target.value))} aria-label="Zoom da câmera" />
                <span aria-hidden="true">+</span>
              </div>
            )}
            <div className="pb-actions">
              <button className="lovers-button lovers-button--primary" onClick={capture} disabled={camStarting}>Capturar</button>
              <button className="lovers-button lovers-button--secondary" onClick={() => { stopCam(); setMode('choose') }}>Voltar</button>
            </div>
          </div>
        )}

        {mode === 'edit' && (
          <div className="pb-edit">
            <div ref={stageRef} className="pb-stage" onPointerDown={() => setSel(null)}>
              {imgSrc && <img className="pb-photo" src={imgSrc} alt="" />}
              {stickers.map(st => (
                <div key={st.id}
                  className={'pb-sticker' + (sel === st.id ? ' is-sel' : '')}
                  style={{ left: st.x, top: st.y, transform: `translate(-50%,-50%) rotate(${st.rot}deg) scale(${st.scale})` }}
                  onPointerDown={(e) => onStickerDown(e, st)}>
                  <img src={st.src} alt="" draggable="false" />
                  {sel === st.id && (
                    <>
                      <button className="pb-sticker__del" onPointerDown={(e) => { e.stopPropagation(); removeSticker(st.id) }}>✕</button>
                      <span className="pb-sticker__handle" onPointerDown={(e) => onHandleDown(e, st)} />
                    </>
                  )}
                </div>
              ))}
              <PbFrame />
            </div>
            <div className="pb-palette">
              {PALETTE.map(n => (
                <button key={n} className="pb-palette__item" onClick={() => addSticker(n)}>
                  <img src={A(n)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
            <div className="pb-actions">
              <button className="lovers-button lovers-button--primary" disabled={busy} onClick={doShare}>{busy ? 'Gerando…' : 'Compartilhar'}</button>
              <button className="lovers-button lovers-button--secondary" disabled={busy} onClick={doDownload}>Baixar</button>
              <button className="share-modal__copy" onClick={() => { setImgSrc(null); setStickers([]); setMode('choose') }}>Trocar foto</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Moldura Lovers (DOM). Para trocar por PNG: substitua por
// <img className="pb-frame-img" src="/moldura-lovers.png" alt="" />
function PbFrame() {
  return (
    <div className="pb-frame" aria-hidden="true">
      <div className="pb-frame__top">SWEET &amp; COFFEE WEEK LOVERS</div>
      <div className="pb-frame__bottom">
        <span>@sweetcoffeeweek</span>
        <span>sweetcoffeeweek.com.br</span>
      </div>
    </div>
  )
}
