import React from 'react'
import { Botao } from '../ui'
import { obterArquivo } from '../../lib/redesArquivos'
import { entregar, compartilhar, suportaCompartilhar, temGestoAtivo, planejarLote, zipArmazenado, nomeNumerado, nomesUnicos, LIMITES } from '../../lib/entrega'

/*
 * Baixar e salvar, igual na Biblioteca e na ficha da postagem (17/10/2026).
 *  · "Baixar": o ORIGINAL, por download direto. Um arquivo → ele mesmo; vários
 *    → um ZIP (dito como ZIP), nunca dezenas de downloads soltos.
 *  · "Salvar ou compartilhar" (só se o aparelho aceita compartilhar ARQUIVO,
 *    canShare({ files })): prepara o arquivo de verdade e abre as opções do
 *    aparelho. Se a preparação demorou e o toque expirou, aparece "Abrir opções
 *    para salvar" — um toque novo, nunca repetição automática.
 * A tela diz só o que de fato sabe: "download iniciado" e "opções usadas" —
 * nunca o destino final (o sistema do aparelho decide). Cancelar não é erro e
 * não baixa nada.
 */

const movel = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const fonteDe = (x) => ({ bucket: x.bucket || 'redes', path: x.path })
const textoErro = (e) => {
  const m = String((e && e.message) || '')
  if (/nao_autorizado|401|403/.test(m)) return 'Sua função não permite baixar este arquivo.'
  if (/^rede$|Failed to fetch|NetworkError|Load failed/i.test(m)) return 'A conexão caiu durante o download.'
  if (/grande/.test(m)) return m.replace(/^grande:/, '')
  return 'Não consegui baixar o arquivo.'
}

/**
 * itens: [{ bucket, path, nome, mime, tamanho }] na ORDEM de entrega
 * (carrossel: a ordem da postagem). numerar: "01-…", "02-…".
 */
export function useEntrega() {
  const [estado, setEstado] = React.useState(null)
  const ultimo = React.useRef(null)
  const vivo = React.useRef(true)
  // StrictMode monta, desmonta e monta de novo: o efeito religa o "vivo" a cada montagem.
  React.useEffect(() => { vivo.current = true; return () => { vivo.current = false } }, [])
  const definir = (e) => { if (vivo.current) setEstado(e) }

  async function preparar(itens, { numerar = false, teto = Infinity } = {}) {
    const nomes = nomesUnicos(itens.map((x, i) => (numerar && itens.length > 1 ? nomeNumerado(i, itens.length, x.nome) : x.nome)))
    const arquivos = []
    let soma = 0
    for (const [i, x] of itens.entries()) {
      if (itens.length > 1) definir({ fase: 'preparando', texto: 'Preparando ' + (i + 1) + ' de ' + itens.length + '…' })
      const arq = await obterArquivo(fonteDe(x), nomes[i], { mime: x.mime })
      soma += arq.size
      if (soma > teto) throw new Error('grande:Os arquivos passam de ' + Math.round(teto / 1048576) + ' MB. Escolha menos (vídeos pesam mais).')
      arquivos.push(arq)
    }
    return arquivos
  }

  async function baixar(itens, { numerar = false, nomeZip = 'arquivos' } = {}) {
    ultimo.current = { acao: 'baixar', itens, opc: { numerar, nomeZip } }
    if (!itens.length) return
    try {
      if (itens.length === 1) {
        definir({ fase: 'preparando', texto: 'Preparando “' + itens[0].nome + '”…' })
        const [arq] = await preparar(itens)
        entregar(arq)
        definir({ fase: 'iniciado', texto: 'Download iniciado: “' + arq.name + '”. Confira os downloads do navegador.', dica: true })
        return
      }
      const plano = planejarLote(itens, { modo: 'zip', movel: movel() })
      if (!plano.ok) { definir({ fase: 'erro', texto: plano.motivo, semRepetir: true }); return }
      const arquivos = await preparar(itens, { numerar, teto: plano.teto })
      definir({ fase: 'preparando', texto: 'Compactando ' + arquivos.length + ' arquivos…' })
      const zip = await zipArmazenado(arquivos)
      const nome = String(nomeZip || 'arquivos').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) + '.zip'
      entregar(new File([zip], nome, { type: 'application/zip' }))
      definir({ fase: 'iniciado', texto: 'Download iniciado: arquivo compactado (ZIP) com ' + arquivos.length + ' arquivos. As imagens ficam dentro do ZIP — não vão direto para a galeria.' })
    } catch (e) {
      definir({ fase: 'erro', texto: textoErro(e) })
    }
  }

  async function abrir(arquivos, porToque) {
    const r = await compartilhar(arquivos)
    if (r === 'ok') definir({ fase: 'compartilhado', texto: 'Opções do aparelho usadas. O destino (Fotos, Arquivos ou outro app) é o que você escolheu no aparelho.' })
    else if (r === 'cancelado') definir({ fase: 'cancelado', texto: 'Cancelado. Nada foi baixado.' })
    else if (r === 'sem_gesto' && !porToque) definir({ fase: 'pronto', texto: arquivos.length > 1 ? arquivos.length + ' arquivos prontos.' : '“' + arquivos[0].name + '” pronto.', arquivos })
    else definir({ fase: 'erro', texto: 'Este navegador não abriu as opções de compartilhamento para este arquivo. Use “Baixar”.', semRepetir: true })
  }

  async function salvar(itens, { numerar = false } = {}) {
    ultimo.current = { acao: 'salvar', itens, opc: { numerar } }
    if (!itens.length) return
    const plano = planejarLote(itens, { modo: 'compartilhar' })
    if (!plano.ok) { definir({ fase: 'erro', texto: plano.motivo, semRepetir: true }); return }
    try {
      definir({ fase: 'preparando', texto: itens.length > 1 ? 'Preparando ' + itens.length + ' arquivos…' : 'Preparando “' + itens[0].nome + '”…' })
      const arquivos = await preparar(itens, { numerar, teto: LIMITES.compartilharBytes })
      // Toque ainda válido: abre já. Expirou: um botão pede o toque novo.
      if (temGestoAtivo()) await abrir(arquivos, false)
      else definir({ fase: 'pronto', texto: arquivos.length > 1 ? arquivos.length + ' arquivos prontos.' : '“' + arquivos[0].name + '” pronto.', arquivos })
    } catch (e) {
      definir({ fase: 'erro', texto: textoErro(e) })
    }
  }

  const tentarDeNovo = () => { const u = ultimo.current; if (u) (u.acao === 'salvar' ? salvar : baixar)(u.itens, u.opc) }
  const abrirOpcoes = () => { if (estado && estado.arquivos) abrir(estado.arquivos, true) }
  const fechar = () => setEstado(null)
  return { estado, baixar, salvar, tentarDeNovo, abrirOpcoes, fechar, ocupado: !!(estado && estado.fase === 'preparando') }
}

/** A linha de estado (preparando · iniciado · pronto · erro · cancelado), com a ação que cabe. */
export function EstadoEntrega({ entrega, className = '' }) {
  const e = entrega.estado
  if (!e) return null
  const erro = e.fase === 'erro'
  const dica = e.dica && movel() && !suportaCompartilhar()
  return (
    <div className={'ent ' + className} data-fase={e.fase} role={erro ? 'alert' : 'status'}>
      <p className="ent__texto">{e.texto}</p>
      {dica && <p className="ent__dica">No celular: abra o arquivo baixado e use Compartilhar › Salvar imagem para levá-lo à galeria.</p>}
      <div className="ent__acoes">
        {e.fase === 'pronto' && <Botao variante="destaque" icone="compartilhar" onClick={entrega.abrirOpcoes}>Abrir opções para salvar</Botao>}
        {erro && !e.semRepetir && <Botao icone="atualizar" onClick={entrega.tentarDeNovo}>Tentar de novo</Botao>}
        {e.fase !== 'preparando' && <Botao variante="secundario" onClick={entrega.fechar}>Fechar</Botao>}
      </div>
    </div>
  )
}

/**
 * Os botões de um conjunto: "Baixar" (um) ou "Baixar ZIP (N)" (vários), e
 * "Salvar ou compartilhar" quando o aparelho aceita compartilhar arquivo.
 */
export function BotoesEntrega({ entrega, itens, numerar = false, nomeZip, rotuloBaixar, compacto = false }) {
  const n = itens.length
  const mime = (itens[0] && itens[0].mime) || 'image/jpeg'
  const pode = React.useMemo(() => suportaCompartilhar(mime), [mime])
  if (!n) return null
  return (
    <>
      <Botao variante="secundario" icone="baixar" disabled={entrega.ocupado} onClick={() => entrega.baixar(itens, { numerar, nomeZip })}
        aria-label={n > 1 ? 'Baixar ' + n + ' arquivos num ZIP (arquivo compactado)' : undefined}>
        {rotuloBaixar || (n > 1 ? (compacto ? 'ZIP (' + n + ')' : 'Baixar ZIP (' + n + ')') : 'Baixar')}
      </Botao>
      {pode && n <= LIMITES.compartilharArquivos && (
        <Botao variante="secundario" icone="compartilhar" disabled={entrega.ocupado} onClick={() => entrega.salvar(itens, { numerar })}
          aria-label={compacto ? 'Salvar ou compartilhar' + (n > 1 ? ' ' + n + ' arquivos' : '') : undefined}>
          {compacto ? (n > 1 ? 'Salvar (' + n + ')' : 'Salvar') : n > 1 ? 'Salvar ou compartilhar (' + n + ')' : 'Salvar ou compartilhar'}
        </Botao>
      )}
    </>
  )
}
