import React from 'react'
import { Icone } from './Icone'
import { Folha } from './Folha'

/*
 * Prévia de um arquivo de imagem (27/10/2026) — a mesma nos dois painéis. `caminho` é o que mostrar
 * (lib/arquivosPrevia.js · caminhoDaMiniatura: a prévia de 960 px; sem ela, o original pequeno; senão null =
 * ícone). `assinar(caminho)` devolve a URL assinada de 5 min: a marca assina com a própria sessão (marcaApi),
 * a equipe pela arquivo-url. Como a miniatura das fotos oficiais:
 *   · só assina quando chega perto da tela (IntersectionObserver) e o navegador adia a imagem (`loading="lazy"`);
 *   · imagem que não abre (endereço vencido) assina UMA vez de novo; falhou de novo, ícone — nunca derruba a lista.
 * Com `aoAmpliar`, a miniatura é um botão que abre a imagem grande (AmpliarPrevia).
 */
export function PreviaArquivo({ nome, caminho, assinar, aoAmpliar, icone = 'documento', className = '' }) {
  const quadro = React.useRef(null)
  const [url, setUrl] = React.useState(null)
  const [falhou, setFalhou] = React.useState(false)
  const [carregou, setCarregou] = React.useState(false)
  const tentouDeNovo = React.useRef(false)
  const ref = React.useRef(assinar)
  ref.current = assinar

  React.useEffect(() => {
    setUrl(null); setFalhou(false); setCarregou(false); tentouDeNovo.current = false
    if (!caminho) return undefined
    const el = quadro.current
    let vivo = true
    const iniciar = async () => {
      let u = null
      try { u = await ref.current(caminho) } catch { u = null }
      if (!vivo) return
      if (u) setUrl(u); else setFalhou(true)
    }
    if (!el || typeof IntersectionObserver === 'undefined') { iniciar(); return () => { vivo = false } }
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); iniciar() } }, { rootMargin: '240px' })
    io.observe(el)
    return () => { vivo = false; io.disconnect() }
  }, [caminho])

  async function aoErrar() {
    if (tentouDeNovo.current) { setFalhou(true); return }
    tentouDeNovo.current = true
    setCarregou(false)
    let u = null
    try { u = await ref.current(caminho) } catch { u = null }
    if (u) setUrl(u); else setFalhou(true)
  }

  const sem = !caminho || falhou
  const conteudo = sem
    ? <Icone nome={caminho ? 'imagem' : icone} tamanho={24} />
    : (
      <>
        {!carregou && <span className="ui-previa__espera" aria-hidden="true"><Icone nome="imagem" tamanho={20} /></span>}
        {/* alt vazio: o nome do arquivo está em texto logo ao lado. */}
        {url && <img src={url} alt="" loading="lazy" decoding="async" onLoad={() => setCarregou(true)} onError={aoErrar} />}
      </>
    )
  const cls = 'ui-previa' + (sem ? ' ui-previa--sem' : '') + (carregou ? ' is-carregou' : '') + (className ? ' ' + className : '')
  if (aoAmpliar && !sem) {
    return (
      <button type="button" ref={quadro} className={cls + ' ui-previa--botao'} aria-label={'Ver a prévia de ' + nome} onClick={() => aoAmpliar(url)}>
        {conteudo}
      </button>
    )
  }
  return <span ref={quadro} className={cls} aria-hidden="true">{conteudo}</span>
}

/**
 * A imagem grande (a prévia de 960 px), numa folha. `acoes` = os botões de sempre (baixar…), para baixar daqui.
 * `assinar` assina de novo se a URL da miniatura venceu.
 */
export function AmpliarPrevia({ aberto, nome, caminho, url, assinar, sub, acoes, onFechar }) {
  const [src, setSrc] = React.useState(url || null)
  const [erro, setErro] = React.useState(false)
  React.useEffect(() => { setSrc(url || null); setErro(false) }, [url, caminho, aberto])
  async function aoErrar() {
    if (erro) return
    setErro(true)
    try { const u = await assinar(caminho); if (u) { setSrc(u); setErro(false) } } catch { /* fica a mensagem */ }
  }
  return (
    <Folha aberto={aberto} titulo={nome || 'Prévia'} sub={sub || 'Prévia em tamanho reduzido. Baixar entrega o arquivo original.'} larga onFechar={onFechar}>
      <div className="ui-ampliada">
        {src && !erro && <img src={src} alt={'Prévia de ' + (nome || 'arquivo')} decoding="async" onError={aoErrar} />}
        {erro && <p className="ui-nota">Não consegui abrir a prévia agora. O arquivo continua disponível para baixar.</p>}
      </div>
      {acoes && <div className="ui-linha-acoes">{acoes}</div>}
    </Folha>
  )
}
