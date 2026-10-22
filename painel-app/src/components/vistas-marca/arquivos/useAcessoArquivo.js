import React from 'react'
import { assinarDownload } from '../../../lib/marcaApi'
import { nomeArquivo } from '../../../lib/entrega'
import { urlParaBaixar, retornoDaAcao, erroDaAcao } from '../../../lib/arquivosMarca'

/*
 * Abrir × Baixar de um arquivo da marca — a MESMA mecânica na aba Arquivos e nas fotos oficiais da aba Fotos.
 *
 * Abrir = o navegador MOSTRA o arquivo (só PDF, imagem e vídeo); Baixar = pede o download (o link assinado ganha
 * `download`, e o Storage responde como anexo, com o nome certo). A janela abre no clique, antes do await: aberta
 * depois, o bloqueador de pop-up (principalmente no iPhone) a barra. O texto de retorno diz só o que se sabe —
 * nunca "salvo". `aoAvisar` recebe `{ id, tom, texto }` (ou `null` ao começar) e é quem decide onde o aviso aparece.
 */
export function useAcessoArquivo(aoAvisar) {
  const [ocupado, setOcupado] = React.useState(null)   // { id, modo }

  async function acessar(a, modo) {
    const janela = window.open('', '_blank')
    setOcupado({ id: a.id, modo })
    aoAvisar(null)
    try {
      const url = await assinarDownload(a.path)
      const destino = modo === 'baixar' ? urlParaBaixar(url, nomeArquivo(a.nome, a.mime, a.path)) : url
      if (janela) { janela.opener = null; janela.location.href = destino } else window.location.href = destino
      aoAvisar({ id: a.id, tom: 'ok', texto: retornoDaAcao(modo, a.nome) })
    } catch (e) {
      if (janela) janela.close()
      if (e && e.message === 'sessao_expirada') return
      aoAvisar({ id: a.id, tom: 'erro', texto: erroDaAcao(modo, a.nome) })
    } finally {
      setOcupado(null)
    }
  }

  return { ocupado, acessar }
}
