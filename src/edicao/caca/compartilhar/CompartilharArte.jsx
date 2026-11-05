/*
 * A arte de Stories do progresso (spec 15 §13): gera o PNG no aparelho (canvas, nada vai ao servidor), mostra a prévia e oferece
 * compartilhar (arquivo, quando o aparelho aceita), baixar e copiar o texto. Sem casa validada não há arte: só o convite por link.
 */
import React from 'react'
import { EXTRAS } from '../textos-extras.js'
import { dadosDaArte, textoDoCompartilhamento } from './arte.js'
import { gerarArte } from './desenhar.js'
import { aceitaArquivo, compartilhar, copiar, baixar } from './partilha.js'

const T = EXTRAS.compartilhar
const NOME_DO_ARQUIVO = 'caca-aos-carimbos-progresso.png'

export function CompartilharArte ({ caca, dados }) {
  const origem = globalThis.location?.origin || ''
  // Recalcula só quando o mapa muda; a lista branca de arte.js é a única porta dos dados para a imagem.
  const arte = React.useMemo(() => dadosDaArte({ mapa: caca.mapa, dados, origem }), [caca.mapa, dados, origem])
  const assinatura = JSON.stringify(arte) // o efeito depende do CONTEÚDO da arte, não da identidade dos objetos de entrada
  const texto = textoDoCompartilhamento(arte)
  const temProgresso = arte.validadas > 0
  const [estado, setEstado] = React.useState(temProgresso ? 'gerando' : 'sem-casas') // 'gerando' | 'pronta' | 'falhou' | 'sem-casas'
  const [blob, setBlob] = React.useState(null)
  const [previa, setPrevia] = React.useState('')
  const [aviso, setAviso] = React.useState('')

  React.useEffect(() => {
    if (!temProgresso) { setEstado('sem-casas'); return undefined }
    let vivo = true
    let url = ''
    setEstado('gerando')
    gerarArte(arte).then((b) => {
      if (!vivo) return
      url = URL.createObjectURL(b)
      setBlob(b); setPrevia(url); setEstado('pronta')
    }).catch(() => { if (vivo) setEstado('falhou') })
    return () => { vivo = false; if (url) URL.revokeObjectURL(url) }
  }, [assinatura, temProgresso]) // eslint-disable-line react-hooks/exhaustive-deps

  const arquivo = () => (blob ? new File([blob], NOME_DO_ARQUIVO, { type: 'image/png' }) : null)
  const enviar = async () => {
    const f = arquivo()
    const r = await compartilhar({ titulo: T.tituloCompartilhamento, texto, url: arte.link, arquivo: f })
    if (r === 'falhou') {
      if (blob) { baixar(blob, NOME_DO_ARQUIVO); setAviso(T.baixou) } else setAviso((await copiar(texto)) === 'copiado' ? T.copiado : T.falhouCopiar)
    } else setAviso('')
  }
  const copiarTexto = async () => setAviso((await copiar(texto)) === 'copiado' ? T.copiado : T.falhouCopiar)
  const podeCompartilhar = typeof globalThis.navigator?.share === 'function'
  const arqOk = blob ? aceitaArquivo(arquivo()) : false

  return (
    <section className="ct-caca__bloco ct-caca-story" aria-labelledby="caca-story" aria-busy={estado === 'gerando'}>
      <h2 id="caca-story" className="ct-sub">{T.previa}</h2>
      <p className="ct-nota">{T.privacidade}</p>
      {estado === 'sem-casas' && <p className="ct-aviso" role="status">{T.semCasas}</p>}
      {estado === 'gerando' && <p className="ct-nota" role="status">{T.gerando}</p>}
      {estado === 'falhou' && <p className="ct-aviso" role="alert">{T.falhaArte}</p>}
      <div className="ct-caca-story__layout">
        <div className="ct-caca-story__lado">
          <div className="ct-acoes">
            {podeCompartilhar && <button type="button" className="ct-botao" disabled={estado === 'gerando'} onClick={enviar}>{estado === 'pronta' && arqOk ? T.compartilhar : T.convidar}</button>}
            {estado === 'pronta' && <button type="button" className="ct-botao ct-botao--contorno" onClick={() => { baixar(blob, NOME_DO_ARQUIVO); setAviso(T.baixou) }}>{T.baixar}</button>}
            <button type="button" className="ct-botao ct-botao--contorno" onClick={copiarTexto}>{T.copiarTexto}</button>
          </div>
          <p className="ct-nota" role="status">{aviso}</p>
          <p className="ct-caca-story__texto ct-nota">{texto}</p>
        </div>
        {estado === 'pronta' && (
          <img className="ct-caca-story__arte" src={previa} width={270} height={480} alt={T.previaAlt(arte.apelido, arte.validadas, arte.total)} />
        )}
      </div>
    </section>
  )
}
