import React from 'react'
import { Botao } from '../ui'
import { ICONE_COMPARTILHAR } from '../Icone'
import { obterArquivo } from '../../lib/redesArquivos'
import { plataforma } from '../../lib/instalar'
import { entregar, compartilhar, suportaCompartilhar, temGestoAtivo, planejarLote, zipArmazenado, nomeNumerado, nomeLivre, LIMITES } from '../../lib/entrega'

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
// `quem`: 'equipe' (tem função) ou 'marca' (tem sessão). O erro diz QUAL arquivo falhou (`e.arquivo`), para a pessoa saber o que tentar à mão.
const textoErro = (e, quem = 'equipe') => {
  const m = String((e && e.message) || '')
  const qual = e && e.arquivo ? ' “' + e.arquivo + '”' : ''
  if (/nao_autorizado|401|403/.test(m)) return quem === 'marca' ? 'Não consegui baixar' + (qual || ' o arquivo') + '. Sua sessão pode ter terminado: entre de novo e tente outra vez.' : 'Sua função não permite baixar' + (qual || ' este arquivo') + '.'
  if (/^rede$|Failed to fetch|NetworkError|Load failed/i.test(m)) return 'A conexão caiu durante o download' + (qual ? ' de' + qual : '') + '.'
  if (/grande/.test(m)) return m.replace(/^grande:/, '')
  return 'Não consegui baixar' + (qual || ' o arquivo') + '.'
}
const cancelado = () => Object.assign(new Error('cancelado'), { name: 'AbortError' })

// Quem busca o ORIGINAL: por padrão o caminho da equipe (arquivo-url). A marca passa o dela (lib/marcaApi.js › obterArquivoMarca).
const obterDaEquipe = (x, nome, opcoes) => obterArquivo(fonteDe(x), nome, opcoes)

/**
 * itens: [{ bucket, path, nome, mime, tamanho }] na ORDEM de entrega
 * (carrossel: a ordem da postagem). numerar: "01-…", "02-…".
 * `obter(item, nome, { mime, sinal })` → Promise<File>: troca o caminho de busca (a marca assina com a própria sessão).
 */
export function useEntrega({ obter = obterDaEquipe, quem = 'equipe' } = {}) {
  const [estado, setEstado] = React.useState(null)
  const ultimo = React.useRef(null)
  const vivo = React.useRef(true)
  const cancelar = React.useRef(null)
  // StrictMode monta, desmonta e monta de novo: o efeito religa o "vivo" a cada montagem.
  // Sair da tela no meio de um download interrompe o que ainda estava sendo buscado (e nada é entregue depois).
  React.useEffect(() => { vivo.current = true; return () => { vivo.current = false; if (cancelar.current) cancelar.current.abort() } }, [])
  const definir = (e) => { if (vivo.current) setEstado(e) }

  // `ctl` é do conjunto em andamento: cancelar um não corta o seguinte, e um passo que terminou depois do cancelamento não entrega nada.
  async function preparar(itens, { numerar = false, teto = Infinity } = {}, ctl) {
    const nomes = itens.map((x, i) => (numerar && itens.length > 1 ? nomeNumerado(i, itens.length, x.nome) : x.nome))
    const arquivos = []
    const usados = new Set()
    let soma = 0
    for (const [i, x] of itens.entries()) {
      if (ctl.signal.aborted) throw cancelado()
      definir({ fase: 'preparando', cancelavel: true, texto: itens.length > 1 ? 'Preparando ' + (i + 1) + ' de ' + itens.length + '…' : 'Preparando “' + x.nome + '”…' })
      let arq
      try { arq = await obter(x, nomes[i], { mime: x.mime, sinal: ctl.signal }) }
      catch (e) { if (e && !e.arquivo && e.name !== 'AbortError') e.arquivo = x.nome; throw e }
      if (ctl.signal.aborted) throw cancelado()
      // O nome final só existe depois do download (a extensão vem do tipo real): repetidos ganham " (2)" AQUI, senão dois
      // arquivos viram o mesmo nome dentro do ZIP ("Foto" e "Foto.jpg") e um sobrescreve o outro ao extrair.
      const nome = nomeLivre(arq.name, usados)
      arquivos.push(nome === arq.name ? arq : new File([arq], nome, { type: arq.type }))
      soma += arq.size
      if (soma > teto) throw new Error('grande:Os arquivos passam de ' + Math.round(teto / 1048576) + ' MB. ' + (quem === 'marca' ? 'Baixe uma de cada vez.' : 'Escolha menos (vídeos pesam mais).'))
    }
    return arquivos
  }

  // iPhone/iPad: depois de esperar a rede, o toque que pediu o download já expirou e o Safari pode ignorar o clique do programa
  // (e a tela diria "download iniciado" sem nada ter baixado). Sem toque ativo, pede UM toque novo.
  function entregarOuPedir(arq, texto) {
    if (plataforma().ios && !temGestoAtivo()) { definir({ fase: 'pronto', texto: '“' + arq.name + '” pronto.', baixarDepois: arq, textoDepois: texto }); return }
    entregar(arq)
    definir({ fase: 'iniciado', texto, dica: arq.type !== 'application/zip' })
  }

  async function baixar(itens, { numerar = false, nomeZip = 'arquivos' } = {}) {
    ultimo.current = { acao: 'baixar', itens, opc: { numerar, nomeZip } }
    if (!itens.length) return
    const ctl = new AbortController()
    cancelar.current = ctl
    try {
      if (itens.length === 1) {
        const [arq] = await preparar(itens, {}, ctl)
        entregarOuPedir(arq, 'Download iniciado: “' + arq.name + '”. Confira os downloads do navegador.')
        return
      }
      const plano = planejarLote(itens, { modo: 'zip', movel: movel(), escolhe: quem !== 'marca' })
      if (!plano.ok) { definir({ fase: 'erro', texto: plano.motivo, semRepetir: true }); return }
      const arquivos = await preparar(itens, { numerar, teto: plano.teto }, ctl)
      definir({ fase: 'preparando', texto: 'Compactando ' + arquivos.length + ' arquivos…' })
      const zip = await zipArmazenado(arquivos)
      if (ctl.signal.aborted) return
      const nome = String(nomeZip || 'arquivos').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) + '.zip'
      entregarOuPedir(new File([zip], nome, { type: 'application/zip' }),
        'Download iniciado: arquivo compactado (ZIP) com ' + arquivos.length + ' arquivos. As imagens ficam dentro do ZIP — não vão direto para a galeria.')
    } catch (e) {
      if (e && e.name === 'AbortError') return    // quem cancelou já viu "Cancelado"; sair da tela também não mostra nada
      definir({ fase: 'erro', texto: textoErro(e, quem) })
    }
  }

  async function abrir(arquivos, porToque) {
    const r = await compartilhar(arquivos)
    if (r === 'ok') definir({ fase: 'compartilhado', texto: 'Opções do aparelho usadas. O destino (Fotos, Arquivos ou outro app) é o que você escolheu no aparelho.' })
    else if (r === 'cancelado') definir({ fase: 'cancelado', texto: 'Cancelado. Nada foi baixado.' })
    else if (r === 'sem_gesto' && !porToque) definir({ fase: 'pronto', texto: arquivos.length > 1 ? arquivos.length + ' arquivos prontos.' : '“' + arquivos[0].name + '” pronto.', arquivos })
    else definir({ fase: 'erro', texto: 'Este navegador não abriu as opções de compartilhamento para este arquivo. Use o botão de baixar.', semRepetir: true })
  }

  async function salvar(itens, { numerar = false } = {}) {
    ultimo.current = { acao: 'salvar', itens, opc: { numerar } }
    if (!itens.length) return
    const plano = planejarLote(itens, { modo: 'compartilhar', escolhe: quem !== 'marca' })
    if (!plano.ok) { definir({ fase: 'erro', texto: plano.motivo, semRepetir: true }); return }
    const ctl = new AbortController()
    cancelar.current = ctl
    try {
      const arquivos = await preparar(itens, { numerar, teto: LIMITES.compartilharBytes }, ctl)
      // Toque ainda válido: abre já. Expirou: um botão pede o toque novo.
      if (temGestoAtivo()) await abrir(arquivos, false)
      else definir({ fase: 'pronto', texto: arquivos.length > 1 ? arquivos.length + ' arquivos prontos.' : '“' + arquivos[0].name + '” pronto.', arquivos })
    } catch (e) {
      if (e && e.name === 'AbortError') return
      definir({ fase: 'erro', texto: textoErro(e, quem) })
    }
  }

  // Parar a espera (rede que travou, arquivo grande demais): nada é entregue depois, mesmo que um passo ainda termine.
  const cancelarPreparo = () => {
    if (cancelar.current) cancelar.current.abort()
    definir({ fase: 'cancelado', texto: 'Cancelado. Nada foi baixado.' })
  }
  const tentarDeNovo = () => { const u = ultimo.current; if (u) (u.acao === 'salvar' ? salvar : baixar)(u.itens, u.opc) }
  const abrirOpcoes = () => { if (estado && estado.arquivos) abrir(estado.arquivos, true) }
  // O toque novo que faltava (iPhone): entrega o arquivo que já estava pronto.
  const baixarAgora = () => {
    if (!estado || !estado.baixarDepois) return
    entregar(estado.baixarDepois)
    definir({ fase: 'iniciado', texto: estado.textoDepois || 'Download iniciado.', dica: estado.baixarDepois.type !== 'application/zip' })
  }
  const fechar = () => setEstado(null)
  return { estado, baixar, salvar, tentarDeNovo, abrirOpcoes, baixarAgora, cancelar: cancelarPreparo, fechar, ocupado: !!(estado && estado.fase === 'preparando') }
}

/** A linha de estado (preparando · iniciado · pronto · erro · cancelado), com a ação que cabe. */
export function EstadoEntrega({ entrega, className = '' }) {
  const e = entrega.estado
  const ref = React.useRef(null)
  const fase = e && e.fase
  // O botão tocado fica desativado enquanto prepara: o resultado leva o foco (o leitor de tela o lê e o teclado continua dali).
  React.useEffect(() => { if (fase && fase !== 'preparando' && ref.current) ref.current.focus() }, [fase, e && e.texto]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!e) return null
  const erro = e.fase === 'erro'
  const dica = e.dica && movel() && !suportaCompartilhar()
  return (
    <div ref={ref} tabIndex={-1} className={'ent ' + className} data-fase={e.fase} role={erro ? 'alert' : 'status'}>
      <p className="ent__texto">{e.texto}</p>
      {dica && <p className="ent__dica">No celular: abra o arquivo baixado e use Compartilhar › Salvar imagem para levá-lo à galeria.</p>}
      <div className="ent__acoes">
        {e.fase === 'pronto' && e.baixarDepois && <Botao variante="destaque" icone="baixar" onClick={entrega.baixarAgora}>Baixar agora</Botao>}
        {e.fase === 'pronto' && !e.baixarDepois && <Botao variante="destaque" icone={ICONE_COMPARTILHAR} onClick={entrega.abrirOpcoes}>Abrir opções para salvar</Botao>}
        {erro && !e.semRepetir && <Botao icone="atualizar" onClick={entrega.tentarDeNovo}>Tentar de novo</Botao>}
        {e.fase === 'preparando' && e.cancelavel && <Botao variante="secundario" icone="fechar" soIcone onClick={entrega.cancelar}>Cancelar</Botao>}
        {e.fase !== 'preparando' && <Botao variante="secundario" icone="fechar" soIcone onClick={entrega.fechar}>Fechar</Botao>}
      </div>
    </div>
  )
}

/**
 * Os botões de um conjunto: "Baixar" (um) ou "Baixar ZIP (N)" (vários), e
 * "Salvar ou compartilhar" quando o aparelho aceita compartilhar arquivo.
 * Um arquivo = só os ícones (o nome vai no aria-label e na dica); vários = o texto diz que é ZIP e quantos.
 */
export function BotoesEntrega({ entrega, itens, numerar = false, nomeZip, rotuloBaixar, compacto = false }) {
  const n = itens.length
  const mime = (itens[0] && itens[0].mime) || 'image/jpeg'
  const pode = React.useMemo(() => suportaCompartilhar(mime), [mime])
  if (!n) return null
  const um = n === 1
  return (
    <>
      <Botao variante="secundario" icone="baixar" soIcone={um} disabled={entrega.ocupado} onClick={() => entrega.baixar(itens, { numerar, nomeZip })}
        aria-label={n > 1 && !rotuloBaixar ? 'Baixar ' + n + ' arquivos num ZIP (arquivo compactado)' : undefined}>
        {rotuloBaixar || (n > 1 ? (compacto ? 'ZIP (' + n + ')' : 'Baixar ZIP (' + n + ')') : 'Baixar')}
      </Botao>
      {pode && n <= LIMITES.compartilharArquivos && (
        <Botao variante="secundario" icone={ICONE_COMPARTILHAR} soIcone={um} disabled={entrega.ocupado} onClick={() => entrega.salvar(itens, { numerar })}
          aria-label={compacto && !um ? 'Salvar ou compartilhar ' + n + ' arquivos' : undefined}>
          {um ? 'Salvar ou compartilhar' : compacto ? 'Salvar (' + n + ')' : 'Salvar ou compartilhar (' + n + ')'}
        </Botao>
      )}
    </>
  )
}
