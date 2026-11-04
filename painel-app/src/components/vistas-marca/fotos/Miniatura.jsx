import React from 'react'
import { Icone } from '../../Icone'
import { assinarDownload } from '../../../lib/marcaApi'
import { ehImagem } from '../../../lib/fotosMarca'

/*
 * Miniatura de uma foto oficial. Usa o MESMO endereço autorizado que o botão "Baixar" já usa
 * (`assinarDownload`: URL assinada de 5 minutos, com a sessão da própria marca) — nada fica público e nenhum
 * caminho novo foi criado. Duas escolhas para não pesar:
 *   · só assina quando a miniatura chega perto da tela (IntersectionObserver) e o navegador adia o carregamento
 *     da imagem (`loading="lazy"`);
 *   · se a imagem não abrir (endereço vencido, rede), assina UMA vez de novo; se falhar outra vez, mostra o ícone
 *     e o nome — a falha de uma miniatura nunca derruba a lista.
 * Arquivo que não é imagem (PDF, vídeo) nem tenta: ícone e nome.
 * Exceção: a pasta do Dropbox (link, migration 20261129) não tem arquivo para assinar — a prévia é o mosaico que já vem na
 * própria linha (`previa_dados`, data URL WebP, migration 20261131): aparece direto, sem assinar nada. Imagem que não abre → ícone.
 */
export function Miniatura({ arquivo }) {
  const quadro = React.useRef(null)
  const [url, setUrl] = React.useState(null)
  const [falhou, setFalhou] = React.useState(false)
  const [carregou, setCarregou] = React.useState(false)
  const tentouDeNovo = React.useRef(false)
  const imagem = ehImagem(arquivo)
  const dados = arquivo.previa_dados || null

  const assinar = React.useCallback(async () => {
    try { return await assinarDownload(arquivo.path) } catch { return null }
  }, [arquivo.path])

  React.useEffect(() => {
    if (!imagem) return undefined
    const el = quadro.current
    let vivo = true
    const iniciar = async () => {
      const u = await assinar()
      if (!vivo) return
      if (u) setUrl(u); else setFalhou(true)
    }
    if (!el || typeof IntersectionObserver === 'undefined') { iniciar(); return () => { vivo = false } }
    const io = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) { io.disconnect(); iniciar() } }, { rootMargin: '240px' })
    io.observe(el)
    return () => { vivo = false; io.disconnect() }
  }, [imagem, assinar])

  async function aoErrar() {
    if (tentouDeNovo.current) { setFalhou(true); return }
    tentouDeNovo.current = true
    setCarregou(false)
    const u = await assinar()
    if (u) setUrl(u); else setFalhou(true)
  }

  const sem = (!imagem && !dados) || falhou
  return (
    <div ref={quadro} className={'fm-mini' + (sem ? ' fm-mini--sem' : '') + (carregou || (dados && !sem) ? ' is-carregou' : '')}>
      {sem ? (
        <span className="fm-mini__sem" role="img" aria-label={'Sem prévia: ' + arquivo.nome}>
          <Icone nome={imagem ? 'imagem' : 'documento'} tamanho={24} />
          <span>{arquivo.nome}</span>
        </span>
      ) : dados ? (
        <img src={dados} alt="" decoding="async" onError={() => setFalhou(true)} />
      ) : (
        <>
          {!carregou && <span className="fm-mini__espera" aria-hidden="true"><Icone nome="imagem" tamanho={24} /></span>}
          {/* alt vazio de propósito: o nome da foto está em texto logo ao lado, e repeti-lo faz o leitor de tela dizê-lo duas vezes. */}
          {url && <img src={url} alt="" loading="lazy" decoding="async" onLoad={() => setCarregou(true)} onError={aoErrar} />}
        </>
      )}
    </div>
  )
}
