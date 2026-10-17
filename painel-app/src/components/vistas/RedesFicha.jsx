import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Folha } from '../Folha'
import { Icone } from '../Icone'
import { Carregando, Erro, Selo, Botao, BotaoIcone, Secao, MaisAcoes, traduzirErro } from '../ui'
import { confirmar, pedirTexto } from '../Confirmar'
import * as R from '../../lib/redes'
import { useUrlsAssinadas, baixarArquivo, prepararArquivo, enviarArquivo, fonteDe, chaveFonte, urlDe } from '../../lib/redesArquivos'
import { tamanhoLegivel } from '../../lib/arquivos'
import { Autor } from '../Avatar'
import { SeletorBiblioteca, ROTULO_ORIGEM } from './SocialBiblioteca'
import { quemAprova } from '../../lib/socialGuia'

/*
 * Ficha de uma publicação (Social media, 16–17/10/2026). Folha larga: no desktop a
 * arte fica ao lado dos dados; no celular, em cima. A arte nunca é esticada
 * nem recortada (contida na proporção do próprio arquivo).
 *
 * Salvar: só o que mudou vai ao banco, com a versão lida. "Salvo" aparece
 * depois da resposta do servidor, nunca antes. Versão desatualizada não
 * sobrescreve ninguém: o texto digitado fica, e a tela mostra o que a outra
 * pessoa mudou para decidir. O que não foi salvo fica guardado neste aparelho
 * (sessionStorage) e volta ao reabrir a ficha.
 *
 * ⛔ Copiar legenda e baixar arte NÃO marcam publicação. Publicado = o botão
 *    "Confirmar publicação", com data e hora reais.
 */

const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }
const norm = (v) => (v == null ? '' : String(v))
const camposDe = (p) => Object.fromEntries(R.CAMPOS.map((k) => [k, norm(p ? p[k] : '')]))
const eImagem = (a) => String(a.mime || '').startsWith('image/')
// Fonte = { bucket, path }: a arte enviada aqui (redes) ou o material referenciado da biblioteca.
const fonteArq = (a) => ({ bucket: a.bucket || 'redes', path: a.path })
const miniDe = (a) => (a.miniatura_path ? { bucket: 'redes', path: a.miniatura_path } : eImagem(a) ? fonteArq(a) : null)

const ERROS_REDES = {
  requisitos_pendentes: 'Ainda falta algo para enviar para aprovação (veja a lista acima).',
  post_fechado: 'Esta publicação já foi publicada ou cancelada: o registro não muda mais por aqui.',
  post_nao_pronto: 'A postagem precisa estar aprovada antes de confirmar a publicação.',
  situacao_invalida: 'Essa etapa não existe mais. Atualize a página.',
  post_nao_publicado: 'Esta publicação não está marcada como publicada.',
  data_no_futuro: 'A data de publicação não pode estar no futuro.',
  data_obrigatoria: 'Informe a data e a hora em que foi publicado.',
  data_invalida: 'Data de publicação inválida.',
  link_invalido: 'O link precisa começar com https://',
  responsavel_invalido: 'Essa pessoa não trabalha com redes no painel. Escolha alguém da lista.',
  arquivo_nao_recebido: 'O arquivo não chegou ao servidor. Tente enviar de novo.',
  arquivo_incompleto: 'O arquivo chegou incompleto. Tente enviar de novo.',
  arquivo_repetido: 'Este arquivo já está na publicação.',
  arquivo_inexistente: 'Este arquivo não está mais na publicação. Atualize a ficha.',
  motivo_obrigatorio: 'Escreva o motivo.',
  versao_desatualizada: 'Outra pessoa salvou esta publicação antes. Confira a versão atual.',
  ordem_invalida: 'A lista de arquivos mudou. Atualize e tente de novo.',
  post_inexistente: 'Esta publicação não existe mais.',
  intervalo_invalido: 'Período inválido.',
  bucket_invalido: 'O servidor ainda não aceita artes aqui. Avise a administração.',
  caminho_invalido: 'O servidor recusou o caminho do arquivo.',
  texto_vazio: 'Escreva algo antes de enviar.',
  formato_nao_suportado: 'Esse material não é imagem nem vídeo (PDF, SVG…): baixe pela biblioteca, mas ele não entra como arte da postagem.',
  tipo_invalido: 'Tipo de material desconhecido.',
  nao_autorizado: 'Sua função não permite isso. (Aprovar é de quem aprova; arte enviada por outra pessoa só a administração troca ou remove.)',
}
export function traduzirRedes(msg) {
  const m = String(msg || '')
  if (/function public\.(redes|social|editorial|equipe)_|(redes|social|editorial)_[a-z_]+\(.*\) does not exist|schema cache/i.test(m)) {
    return 'Esta parte do painel ainda não está pronta no servidor. Avise a administração.'
  }
  for (const [k, frase] of Object.entries(ERROS_REDES)) if (m.includes(k)) return frase
  return traduzirErro(m)
}

// Miniatura própria (nunca a arte esticada): contida, fundo neutro, ícone do formato sem arte.
// `path`: caminho do bucket `redes` (texto) ou fonte { bucket, path } de outro bucket.
export function Miniatura({ path, formato, urls, renovar, grande = false }) {
  const [falhou, setFalhou] = React.useState(false)
  const tentou = React.useRef(false)
  const chave = chaveFonte(fonteDe(path))
  React.useEffect(() => { setFalhou(false); tentou.current = false }, [chave])
  const url = urlDe(urls, path)
  const cls = 'rd-mini' + (grande ? ' rd-mini--grande' : '')
  if (!url || falhou) {
    return <span className={cls + ' rd-mini--vazia'} aria-hidden="true"><Icone nome={(R.FORMATO[formato] || {}).icone || 'imagem'} tamanho={grande ? 24 : 16} /></span>
  }
  return (
    <span className={cls} aria-hidden="true">
      <img src={url} alt="" loading="lazy" onError={() => {
        if (!tentou.current && renovar) { tentou.current = true; renovar(path) } else setFalhou(true)
      }} />
    </span>
  )
}

function Previa({ arquivos, urls, renovar, formato }) {
  const [i, setI] = React.useState(0)
  const dialogo = React.useRef(null)
  const renovados = React.useRef(new Set())
  const n = arquivos.length
  React.useEffect(() => { if (i > n - 1) setI(Math.max(0, n - 1)) }, [n, i])
  if (!n) {
    return (
      <div className="rd-previa rd-previa--vazia">
        <Icone nome={(R.FORMATO[formato] || {}).icone || 'imagem'} tamanho={32} />
        <p>Sem arte ainda</p>
      </div>
    )
  }
  const a = arquivos[Math.min(i, n - 1)]
  const url = urlDe(urls, fonteArq(a))
  const video = !eImagem(a)
  // Razão largura/altura do próprio arquivo: o palco toma essa forma e a arte entra inteira (contain).
  const razao = a.largura && a.altura ? a.largura / a.altura : null
  const midia = (grande) => video
    ? <video src={url} controls preload="metadata" playsInline aria-label={'Vídeo: ' + a.nome} />
    : <img src={url} alt={a.alt || 'Arte: ' + a.nome} onError={() => { if (!renovados.current.has(a.id)) { renovados.current.add(a.id); renovar(fonteArq(a)) } }} className={grande ? 'rd-ampliar__img' : undefined} />
  return (
    <div className="rd-previa">
      <div className="rd-previa__palco" style={razao ? { '--razao': razao } : undefined}>
        {url ? midia(false) : <span className="rd-previa__espera">Carregando a arte…</span>}
      </div>
      <div className="rd-previa__barra">
        {n > 1 && <BotaoIcone icone="seta-esquerda" rotulo="Arquivo anterior" disabled={i === 0} onClick={() => setI(i - 1)} />}
        <span className="rd-previa__conta">{n > 1 ? (i + 1) + ' de ' + n + (formato === 'story' ? ' stories' : '') : a.nome}
          {a.versao > 1 ? ' · versão ' + a.versao : ''}</span>
        {n > 1 && <BotaoIcone icone="seta-direita" rotulo="Próximo arquivo" disabled={i === n - 1} onClick={() => setI(i + 1)} />}
        <BotaoIcone icone="busca" rotulo="Ampliar" disabled={!url} onClick={() => dialogo.current && dialogo.current.showModal()} />
        <BotaoIcone icone="baixar" rotulo="Baixar" alvo={a.nome} onClick={() => baixarArquivo(fonteArq(a), a.nome).catch(() => {})} />
      </div>
      {n > 1 && (
        <ol className="rd-previa__tira" aria-label="Ordem dos arquivos">
          {arquivos.map((x, k) => (
            <li key={x.id}>
              <button type="button" className="rd-previa__mini" aria-current={k === i ? 'true' : undefined}
                aria-label={'Ver ' + (k + 1) + ' de ' + n + ': ' + x.nome} onClick={() => setI(k)}>
                <Miniatura path={miniDe(x)} formato={formato} urls={urls} renovar={renovar} />
              </button>
            </li>
          ))}
        </ol>
      )}
      {/* Ampliar: <dialog> nativo (Esc e foco de graça). As teclas param aqui para a folha não fechar junto. */}
      <dialog ref={dialogo} className="rd-ampliar" aria-label={'Arte ampliada: ' + a.nome}
        onKeyDown={(e) => e.stopPropagation()} onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close() }}>
        <button type="button" className="rd-ampliar__fechar" aria-label="Fechar ampliação" onClick={() => dialogo.current.close()}>
          <Icone nome="fechar" tamanho={20} />
        </button>
        {url && midia(true)}
      </dialog>
    </div>
  )
}

// Rótulo por `htmlFor` (não envolvendo o campo: dentro do <label>, o texto já
// digitado num textarea entra no nome acessível). A nota é descrição
// (aria-describedby), não parte do nome.
function Campo({ rotulo, nota, largo, id: idCampo, children }) {
  const auto = React.useId()
  const id = idCampo || auto
  const campo = React.isValidElement(children)
    ? React.cloneElement(children, { id: idCampo ? idCampo : id + '-c', ...(nota ? { 'aria-describedby': id + '-n' } : {}) })
    : children
  return (
    <div className={'rd-campo' + (largo ? ' rd-campo--largo' : '')}>
      <div className="og-campo">
        <span><label htmlFor={idCampo ? idCampo : id + '-c'}>{rotulo}</label></span>
        {campo}
      </div>
      {nota && <small className="rd-campo__nota" id={id + '-n'}>{nota}</small>}
    </div>
  )
}

const ROTULO_CAMPO = { titulo: 'Título interno', perfil: 'Perfil', edicao_codigo: 'Edição', participante_id: 'Participante', formato: 'Formato', legenda: 'Legenda', mencoes: 'Perfis a mencionar', observacoes: 'Observações para quem publica', referencias: 'Referências', programado_para: 'Data e horário', responsavel_id: 'Responsável' }

function valorLegivel(k, v, opcoes) {
  if (v == null || v === '') return '(vazio)'
  if (k === 'programado_para') return R.quandoTexto(v)
  if (k === 'responsavel_id') return ((opcoes.equipe || []).find((e) => e.user_id === v) || {}).nome || 'outra conta'
  if (k === 'participante_id') return ((opcoes.participantes || []).find((e) => e.id === v) || {}).nome || 'participante'
  if (k === 'formato') return (R.FORMATO[v] || {}).rotulo || v
  const s = String(v)
  return s.length > 280 ? s.slice(0, 280) + '…' : s
}

function textoHistorico(h, opcoes) {
  const d = h.detalhe || {}
  switch (h.tipo) {
    case 'criado': return 'Criou a postagem'
    case 'duplicado': return 'Criou como cópia de “' + (d.titulo || 'outra postagem') + '”'
    case 'conteudo': return 'Alterou ' + (d.campos || []).map((c) => (ROTULO_CAMPO[c === 'edicao' ? 'edicao_codigo' : c === 'participante' ? 'participante_id' : c] || c).toLowerCase()).join(', ')
    case 'legenda': return 'Alterou a legenda (' + (d.caracteres_antes ?? '?') + ' → ' + (d.caracteres ?? '?') + ' caracteres)'
    case 'programacao': return 'Reprogramou: ' + (d.de ? R.quandoTexto(d.de) : 'sem data') + ' → ' + (d.para ? R.quandoTexto(d.para) : 'sem data')
    case 'responsavel': return 'Responsável: ' + (d.de || 'ninguém') + ' → ' + (d.para || 'ninguém')
    case 'situacao': return 'Situação: ' + ((R.SITUACAO[d.de] || {}).rotulo || d.de) + ' → ' + ((R.SITUACAO[d.para] || {}).rotulo || d.para) +
      (d.motivo === 'requisitos' ? ' (deixou de cumprir um requisito)' : d.motivo === 'arquivos' || d.motivo === 'conteudo' ? ' (mudou depois de aprovada)'
        : d.motivo === 'ajuste' ? ' (ajuste pedido)' : d.motivo ? ' — ' + d.motivo : '')
    case 'arquivo': return d.acao === 'reordenado' ? 'Reordenou os arquivos' : d.acao === 'substituido' ? 'Substituiu “' + d.anterior + '” por “' + d.nome + '”' + (d.versao ? ' (versão ' + d.versao + ')' : '')
      : d.acao === 'removido' ? 'Removeu “' + d.nome + '” (guardado no histórico)'
      : d.acao === 'associado' ? 'Associou “' + d.nome + '” da biblioteca (' + (ROTULO_ORIGEM[d.origem] || 'material') + ')' : 'Enviou “' + d.nome + '”'
    case 'ajuste': return 'Pediu ajuste: “' + (d.texto || '') + '”'
    case 'publicado': return 'Confirmou a publicação: ' + R.quandoTexto(d.publicado_em) + (d.link ? ' · com link' : ' · sem link') + (d.vale_para ? ' · vale para a sequência inteira' : '')
    case 'execucao': return 'Corrigiu os dados da publicação: ' + R.quandoTexto(d.publicado_em) + (d.link ? ' · com link' : '')
    case 'publicacao_desfeita': return 'Desfez a confirmação de publicação — ' + (d.motivo || '')
    case 'cancelado': return 'Cancelou' + (d.motivo ? ' — ' + d.motivo : '')
    case 'reaberto': return 'Reabriu a postagem'
    default: return h.tipo
  }
}

// Arte escolhida ANTES de existir a postagem: o rascunho é criado na hora e a
// ficha nova (outro id, outra montagem) pega os arquivos daqui e envia.
const ENVIOS_PENDENTES = new Map()

// Pendência → campo onde se resolve (a lista vira atalho).
const CAMPO_DA_PENDENCIA = { sem_arte: 'arte', arte_incompativel: 'arte', sem_responsavel: 'resp', sem_legenda: 'legenda', sem_horario: 'data' }

export function RedesFicha({ id, pode, opcoes, onFechar, onMudou, onAbrir, inicial = null, onVerParticipante = null }) {
  const novo = id === 'novo'
  const idCampo = (k) => 'rd-f-' + k + '-' + id
  const [carga, setCarga] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [base, setBase] = React.useState(null)
  const baseRef = React.useRef(null)
  // Nova postagem: "Adicionar neste dia" traz a data; "Criar postagem" do participante, o participante.
  const [campos, setCampos] = React.useState(() => novo
    ? { ...camposDe(null), perfil: R.PERFIL_PADRAO, formato: 'feed', edicao_codigo: opcoes.edicao_atual || '', responsavel_id: opcoes.eu || '', ...((inicial && inicial.campos) || {}) } : null)
  // data/hora digitadas pela metade ("Adicionar neste dia" chega com a data, falta a hora)
  const [dhLocal, setDhLocal] = React.useState(() => (novo && inicial && inicial.data ? { data: inicial.data, hora: '' } : null))
  const [salvando, setSalvando] = React.useState(false)
  const [salvoEm, setSalvoEm] = React.useState(null)
  const [erroAcao, setErroAcao] = React.useState(null)
  const [conflito, setConflito] = React.useState(null)
  const [recuperado, setRecuperado] = React.useState(false)
  const [ocupado, setOcupado] = React.useState('')
  const [aviso, setAviso] = React.useState('')
  const [envios, setEnvios] = React.useState([])
  const [alts, setAlts] = React.useState({})
  const [comentario, setComentario] = React.useState('')
  const [confirma, setConfirma] = React.useState(null) // formulário de confirmação aberto
  const [ajuste, setAjuste] = React.useState(false)
  const [biblioteca, setBiblioteca] = React.useState(false)
  const fila = React.useRef(Promise.resolve())
  const primeira = React.useRef(true)
  const chaveRascunho = 'scw_redes_rascunho_' + id

  const definirBase = (p) => { baseRef.current = p; setBase(p) }
  // Opções chegam depois de abrir "Nova postagem" pelo endereço: o responsável vira "eu" se ninguém escolheu.
  const escolheuResp = React.useRef(false)
  React.useEffect(() => {
    if (novo && opcoes.eu && !escolheuResp.current) setCampos((c) => (c && !c.responsavel_id ? { ...c, responsavel_id: opcoes.eu } : c))
  }, [novo, opcoes.eu])

  const recarregar = React.useCallback(async () => {
    if (novo) return null
    try {
      const r = await rpc('redes_post', { p_secret: lerSenha(), p_id: id })
      const velha = baseRef.current
      setCampos((atual) => {
        const n = camposDe(r.post)
        if (atual && velha) for (const k of Object.keys(R.diferencas(velha, atual))) n[k] = atual[k]
        if (primeira.current) {
          primeira.current = false
          try {
            const g = JSON.parse(sessionStorage.getItem(chaveRascunho) || 'null')
            if (g && g.campos && Object.keys(g.campos).length) {
              for (const [k, v] of Object.entries(g.campos)) if (R.CAMPOS.includes(k)) n[k] = norm(v)
              setRecuperado(true)
            }
          } catch { /* rascunho ilegível: ignora */ }
        }
        return n
      })
      definirBase(r.post)
      setCarga(r)
      setErro(null)
      return r
    } catch (e) { setErro(e.message); return null }
  }, [id, novo, chaveRascunho])
  React.useEffect(() => { recarregar() }, [recarregar])

  const mudancas = base && campos ? R.diferencas(base, campos) : {}
  const sujo = novo ? !!(campos && (campos.titulo || campos.legenda)) : Object.keys(mudancas).length > 0 || !!dhLocal

  // Guarda o que não foi salvo neste aparelho (volta ao reabrir a ficha).
  React.useEffect(() => {
    if (novo || !base || !campos) return
    try {
      const d = R.diferencas(base, campos)
      if (Object.keys(d).length) sessionStorage.setItem(chaveRascunho, JSON.stringify({ versao: base.versao, campos: d }))
      else sessionStorage.removeItem(chaveRascunho)
    } catch { /* modo privado */ }
  }, [base, campos, novo, chaveRascunho])
  React.useEffect(() => {
    if (!sujo) return undefined
    const avisar = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [sujo])
  React.useEffect(() => { if (!aviso) return undefined; const t = setTimeout(() => setAviso(''), 4000); return () => clearTimeout(t) }, [aviso])

  const post = base || {}
  const fechada = R.FECHADAS.includes(post.situacao)
  const podeEditar = pode('redes.editar') && !fechada
  const podeArquivos = pode('redes.arquivos') && !fechada && !novo
  const arquivos = carga ? carga.arquivos || [] : []
  const ativos = arquivos.filter((a) => !a.removido_em).sort((a, b) => a.ordem - b.ordem)
  const antigos = arquivos.filter((a) => a.removido_em)
  const { urls, renovar } = useUrlsAssinadas([...ativos.map(fonteArq), ...ativos.map(miniDe)])
  const eu = carga ? carga.eu : null
  // Substituir/remover arte de OUTRA pessoa: só redes.gerir (o banco confere de novo).
  const podeMexer = (a) => podeArquivos && (pode('redes.gerir') || (!!eu && a.criado_por_id === eu))

  function setCampo(k, v) { setCampos((c) => ({ ...c, [k]: v })) }
  const dh = R.partes(campos && campos.programado_para) || { data: '', hora: '' }
  const dataIn = dhLocal ? dhLocal.data : dh.data
  const horaIn = dhLocal ? dhLocal.hora : dh.hora
  function mudarDH(k, v) {
    const n = { data: dataIn, hora: horaIn, [k]: v }
    if (n.data && n.hora) { setCampo('programado_para', R.instanteDe(n.data, n.hora)); setDhLocal(null) }
    else if (!n.data && !n.hora) { setCampo('programado_para', ''); setDhLocal(null) }
    else setDhLocal(n)
  }

  async function gravar(baseLida, dados, enviados) {
    const p = await rpc('redes_salvar', { p_secret: lerSenha(), p_id: id, p_versao: baseLida.versao, p_dados: dados })
    definirBase(p)
    setCampos((atual) => {
      const n = camposDe(p)
      for (const k of R.CAMPOS) if (norm(atual[k]) !== norm(enviados[k])) n[k] = atual[k] // digitado durante o envio
      return n
    })
    setSalvoEm(p.atualizado_em)
    setConflito(null)
    setRecuperado(false)
    onMudou()
    recarregar()
    return p
  }

  async function salvar() {
    if (novo) return criar()
    if (dhLocal) { setErroAcao('Informe data E hora — ou apague as duas para deixar sem data.'); return null }
    const d = R.diferencas(base, campos)
    if (!Object.keys(d).length) return base
    setSalvando(true); setErroAcao(null)
    try { return await gravar(base, d, { ...campos }) }
    catch (e) {
      if (/versao_desatualizada/.test(e.message)) {
        const r = await rpc('redes_post', { p_secret: lerSenha(), p_id: id }).catch(() => null)
        if (r) { setCarga(r); setConflito({ salvo: r.post, lida: base, meus: d, campos: R.camposEmConflito(base, r.post, d) }) }
        else setErroAcao(e.message)
      } else setErroAcao(e.message)
      return null
    } finally { setSalvando(false) }
  }

  async function manterMinhas() {
    setSalvando(true); setErroAcao(null)
    try { await gravar(conflito.salvo, conflito.meus, { ...campos }) }
    catch (e) { setErroAcao(e.message) }
    finally { setSalvando(false) }
  }
  function usarSalva() {
    definirBase(conflito.salvo)
    setCampos(camposDe(conflito.salvo))
    setDhLocal(null)
    setConflito(null)
  }
  function descartar() {
    setCampos(camposDe(base)); setDhLocal(null); setRecuperado(false)
    try { sessionStorage.removeItem(chaveRascunho) } catch { /* modo privado */ }
  }

  async function criar(arquivosEscolhidos = null) {
    if (!String(campos.titulo || '').trim()) { setErroAcao('Dê um título à postagem antes de enviar a arte.'); document.getElementById(idCampo('titulo'))?.focus(); return null }
    if (dhLocal) { setErroAcao('Informe data E hora — ou apague as duas para deixar sem data.'); return null }
    const d = {}
    for (const k of R.CAMPOS) if (norm(campos[k]) !== '') d[k] = campos[k]
    setSalvando(true); setErroAcao(null)
    try {
      const p = await rpc('redes_criar', { p_secret: lerSenha(), p_dados: d })
      if (arquivosEscolhidos && arquivosEscolhidos.length) ENVIOS_PENDENTES.set(p.id, arquivosEscolhidos)
      onMudou()
      onAbrir(p.id)
      return p
    } catch (e) { setErroAcao(e.message); return null }
    finally { setSalvando(false) }
  }

  // Ação de fluxo: salva antes o que estiver pendente; versão sempre a recém-lida.
  async function acao(nome, fn) {
    if (sujo) { const ok = await salvar(); if (!ok) return false }
    setOcupado(nome); setErroAcao(null)
    try { await fn(baseRef.current); await recarregar(); onMudou(); return true }
    catch (e) {
      if (/versao_desatualizada/.test(e.message)) { await recarregar(); setErroAcao('A postagem mudou enquanto você olhava. Confira e tente de novo.') }
      else setErroAcao(e.message)
      return false
    } finally { setOcupado('') }
  }
  const situacao = (s, motivo) => acao('situacao', (b) => rpc('redes_situacao', { p_secret: lerSenha(), p_id: id, p_versao: b.versao, p_situacao: s, p_motivo: motivo || null }))

  async function fechar() {
    // Pelo Esc: a pergunta abre DEPOIS da tecla. Aberta durante ela, o próprio
    // Esc fechava o diálogo recém-aberto como "Voltar" — e nada aparecia.
    if (sujo) await new Promise((ok) => setTimeout(ok, 30))
    if (sujo && !(await confirmar('Fechar sem salvar? O que você digitou fica guardado neste aparelho e volta quando abrir esta postagem de novo.', { acao: 'Fechar sem salvar' }))) return
    onFechar()
  }

  async function copiar(texto, rotulo) {
    try { await navigator.clipboard.writeText(texto); setAviso(rotulo + ' copiado. Cole no Instagram.') }
    catch { setAviso('Não consegui copiar. Selecione o texto e copie à mão.') }
  }

  // ── Arquivos ──
  function adicionarEnvios(lista, substitui = null) {
    const novos = [...lista].map((file) => ({ chave: crypto.randomUUID(), file, nome: file.name, estado: 'na_fila', progresso: 0, erro: null, substitui }))
    setEnvios((e) => [...e, ...novos])
    for (const it of novos) fila.current = fila.current.then(() => enviar(it))
  }
  const atualizarEnvio = (chave, patch) => setEnvios((l) => l.map((x) => (x.chave === chave ? { ...x, ...patch } : x)))
  async function enviar(it) {
    atualizarEnvio(it.chave, { estado: 'conferindo', erro: null, progresso: 0 })
    try {
      const prep = await prepararArquivo(it.file)
      atualizarEnvio(it.chave, { estado: 'enviando', nota: prep.semPrevia ? 'Vídeo sem prévia neste navegador — sobe assim mesmo.' : null })
      await enviarArquivo(id, it.file, prep, { substitui: it.substitui, aoProgredir: (x) => atualizarEnvio(it.chave, { progresso: x }) })
      setEnvios((l) => l.filter((x) => x.chave !== it.chave))
      await recarregar()
      onMudou()
    } catch (e) { atualizarEnvio(it.chave, { estado: 'erro', erro: traduzirRedes(e.message) }) }
  }
  function tentarDeNovo(it) { fila.current = fila.current.then(() => enviar(it)) }
  // Arte escolhida na postagem nova: entra assim que a ficha recém-criada carrega.
  React.useEffect(() => {
    if (novo || !carga || !ENVIOS_PENDENTES.has(id)) return
    const lista = ENVIOS_PENDENTES.get(id)
    ENVIOS_PENDENTES.delete(id)
    adicionarEnvios(lista)
  }, [carga, id, novo]) // eslint-disable-line react-hooks/exhaustive-deps

  async function moverArquivo(i, delta) {
    const ids = ativos.map((a) => a.id)
    const j = i + delta
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    setOcupado('ordem')
    try { await rpc('redes_arquivos_ordenar', { p_secret: lerSenha(), p_post: id, p_ids: ids }); await recarregar(); onMudou() }
    catch (e) { setErroAcao(e.message) } finally { setOcupado('') }
  }
  async function salvarAlt(a) {
    const v = alts[a.id]
    if (v == null || v === a.alt) return
    try {
      const novo2 = await rpc('redes_arquivo_alt', { p_secret: lerSenha(), p_arquivo: a.id, p_alt: v })
      setCarga((c) => ({ ...c, arquivos: c.arquivos.map((x) => (x.id === a.id ? novo2 : x)) }))
      setAlts((x) => { const n = { ...x }; delete n[a.id]; return n })
      setAviso('Texto alternativo salvo.')
    } catch (e) { setErroAcao(e.message) }
  }
  async function associar(item) {
    setOcupado('associar'); setErroAcao(null)
    try {
      await rpc('redes_arquivo_associar', { p_secret: lerSenha(), p_post: id, p_tipo: item.tipo, p_id: item.id })
      await recarregar(); onMudou(); setAviso('“' + item.nome + '” entrou na postagem.')
      return true
    } catch (e) { setErroAcao(e.message); return false } finally { setOcupado('') }
  }
  async function removerArquivo(a) {
    if (!(await confirmar('Remover “' + a.nome + '” desta publicação? Ele continua guardado no histórico.'))) return
    try { await rpc('redes_arquivo_remover', { p_secret: lerSenha(), p_arquivo: a.id }); await recarregar(); onMudou() }
    catch (e) { setErroAcao(e.message) }
  }
  async function baixarTodos() {
    for (const a of ativos) { await baixarArquivo(fonteArq(a), a.nome).catch((e) => setErroAcao(e.message)); await new Promise((ok) => setTimeout(ok, 400)) }
  }

  // ── Render ──
  const titulo = novo ? 'Nova postagem' : (post.titulo || 'Postagem')
  const sub = novo ? 'Rascunho — ainda não salvo' : [(R.SITUACAO[post.situacao] || {}).rotulo, post.programado_para ? R.quandoTexto(post.programado_para) : 'sem data', post.perfil].filter(Boolean).join(' · ')
  if (!novo && !carga) {
    return (
      <Folha aberto titulo={titulo} sub="Carregando…" onFechar={onFechar} larga="ampla">
        {erro ? <Erro texto={traduzirRedes(erro)} onTentar={recarregar} /> : <Carregando linhas={6} />}
      </Folha>
    )
  }

  const estadoTela = { ...post, ...campos, programado_para: campos.programado_para || null, responsavel_id: campos.responsavel_id || null, situacao: post.situacao || 'rascunho' }
  const pend = novo ? [] : R.pendencias(estadoTela, ativos)
  const bloqueios = pend.filter((p) => p !== 'atrasada')
  const conflitos = carga ? carga.conflitos || [] : []
  const historia = carga ? carga.historico || [] : []
  const comentarios = carga ? carga.comentarios || [] : []
  const equipe = opcoes.equipe || []
  const respFora = campos.responsavel_id && !equipe.some((e) => e.user_id === campos.responsavel_id)
  const story = campos.formato === 'story'
  const idPend = 'rd-pend-' + id
  const aprova = pode('redes.aprovar')
  const nomesAprovadores = quemAprova(opcoes.aprovadores || [])
  const eAutora = !!eu && post.criado_por_id === eu
  const podeCancelar = !fechada && (pode('redes.gerir') || (eAutora && ['rascunho', 'preparacao', 'aprovacao'].includes(post.situacao)))
  const irPara = (pendencia) => {
    const el = document.getElementById(idCampo(CAMPO_DA_PENDENCIA[pendencia] || 'titulo'))
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }) }
    else setAviso(CAMPO_DA_PENDENCIA[pendencia] === 'arte' ? 'A arte é enviada por quem tem acesso aos arquivos.' : 'Esse campo não está liberado para a sua função.')
  }
  const texto = R.textoCompleto(campos.legenda, campos.mencoes)
  const ultimoAjuste = [...comentarios].reverse().find((c) => c.ajuste) || null
  async function pedirAjuste() {
    const t = await pedirTexto('O que precisa mudar em “' + post.titulo + '”? A postagem volta para quem cuida dela, com este comentário.', { rotulo: 'O que mudar' }, { acao: 'Pedir ajuste' })
    if (!t || !t.trim()) return
    if (await acao('ajuste', () => rpc('redes_comentar', { p_secret: lerSenha(), p_post: id, p_corpo: t, p_ajuste: true }))) {
      setAviso('Ajuste pedido. Quem cuida da postagem foi avisado.')
    }
  }

  return (
    <Folha aberto titulo={titulo} sub={sub} onFechar={fechar} larga="ampla">
      <div className="rd-ficha">
        <div className="rd-ficha__previa">
          <Previa arquivos={ativos} urls={urls} renovar={renovar} formato={campos.formato} />
          {story && ativos.length > 1 && <p className="rd-campo__nota">Sequência de {ativos.length} stories no mesmo registro: a confirmação vale para a sequência inteira.</p>}
        </div>

        <div className="rd-ficha__dados">
          {recuperado && (
            <div className="og-aviso" role="status">
              <p>Recuperei alterações que não tinham sido salvas neste aparelho.</p>
              <div className="ui-acoes"><Botao onClick={salvar}>Salvar agora</Botao><Botao variante="secundario" onClick={descartar}>Descartar</Botao></div>
            </div>
          )}

          {conflito && (
            <div className="og-aviso rd-conflito" role="alert">
              <p><b>{conflito.salvo.atualizado_por_rotulo || 'Outra pessoa'}</b> salvou esta postagem {conflito.salvo.atualizado_em ? 'às ' + R.horaCurta(R.partes(conflito.salvo.atualizado_em).hora) : ''} enquanto você editava. Nada seu foi perdido: o que você digitou continua aqui.</p>
              {conflito.campos.length > 0 ? (
                <dl className="rd-conflito__lista">
                  {conflito.campos.map((k) => (
                    <div key={k}>
                      <dt>{ROTULO_CAMPO[k]}</dt>
                      <dd><span>Versão salva:</span> {valorLegivel(k, conflito.salvo[k], opcoes)}</dd>
                      <dd><span>A sua:</span> {valorLegivel(k, conflito.meus[k], opcoes)}</dd>
                    </div>
                  ))}
                </dl>
              ) : <p>A outra pessoa mexeu em outros campos; os seus podem ir sem apagar nada dela.</p>}
              <div className="ui-acoes">
                <Botao onClick={manterMinhas} disabled={salvando}>{conflito.campos.length ? 'Salvar as minhas por cima' : 'Salvar as minhas'}</Botao>
                <Botao variante="secundario" onClick={usarSalva}>Ficar com a versão salva</Botao>
              </div>
            </div>
          )}

          {!novo && (
            <section className="rd-situacao" aria-label="Situação e próximos passos">
              <div className="rd-situacao__selos">
                <Selo dominio="post_redes" valor={post.situacao} />
                {pend.includes('atrasada') && <Selo tom="atencao">Atrasada</Selo>}
                {conflitos.length > 0 && <Selo tom="atencao">Mesmo horário e perfil</Selo>}
                {post.ajuste_aberto && <Selo tom="atencao">Ajuste pedido</Selo>}
              </div>
              <p className="rd-ultima">
                Última alteração: <Autor id={post.atualizado_por_id} rotulo={post.atualizado_por_rotulo} tamanho={20}>
                  <span className="ui-autor__nota"> · {R.quandoTexto(post.atualizado_em)}</span></Autor>
                {post.criado_por_rotulo && <> · criada por <Autor id={post.criado_por_id} rotulo={post.criado_por_rotulo} tamanho={20} /></>}
              </p>
              {post.ajuste_aberto && ultimoAjuste && (
                <div className="rd-ajuste" role="note">
                  <p className="rd-ajuste__quem"><Autor id={ultimoAjuste.autor_id} rotulo={ultimoAjuste.autor_rotulo} tamanho={20}>
                    <span className="ui-autor__nota"> pediu ajuste · {R.quandoTexto(ultimoAjuste.criado_em)}</span></Autor></p>
                  <p className="rd-ajuste__texto">{ultimoAjuste.corpo}</p>
                </div>
              )}
              {!fechada && bloqueios.length > 0 && (
                <div id={idPend} className="rd-pendencias">
                  <p>Para enviar para aprovação falta:</p>
                  <ul>{bloqueios.map((p) => (
                    <li key={p}><button type="button" className="rd-pendencia" onClick={() => irPara(p)}>
                      <Icone nome="atencao" tamanho={16} />{R.PENDENCIAS[p]}<span className="ui-oculto"> — ir ao campo</span></button></li>
                  ))}</ul>
                </div>
              )}
              {conflitos.length > 0 && (
                <p className="rd-campo__nota">
                  No mesmo perfil, a menos de {R.JANELA_CONFLITO_MIN} min: {conflitos.map((c, i) => (
                    <React.Fragment key={c.id}>{i > 0 && ', '}<button type="button" className="rd-link" onClick={() => onAbrir(c.id)}>{c.titulo} ({R.quandoTexto(c.programado_para)})</button></React.Fragment>
                  ))}. Não bloqueia — confira se é intencional.
                </p>
              )}
              <div className="ui-acoes">
                {(post.situacao === 'rascunho' || post.situacao === 'preparacao') && pode('redes.editar') && (
                  <>
                    <Botao icone="enviar" variante="destaque" disabled={bloqueios.length > 0 || !!ocupado} aria-describedby={bloqueios.length ? idPend : undefined}
                      onClick={() => situacao('aprovacao')}>Enviar para aprovação</Botao>
                    {aprova && <Botao icone="sucesso" variante="secundario" disabled={bloqueios.length > 0 || !!ocupado} onClick={() => situacao('pronto')}>Aprovar direto</Botao>}
                  </>
                )}
                {post.situacao === 'aprovacao' && (
                  <>
                    {aprova && <Botao icone="sucesso" variante="destaque" disabled={!!ocupado} onClick={() => situacao('pronto')}>Aprovar</Botao>}
                    {aprova && <Botao icone="editar" variante="secundario" disabled={!!ocupado} onClick={pedirAjuste}>Pedir ajuste</Botao>}
                    {!aprova && <p className="rd-etapa">Enviada. Aguardando aprovação de {nomesAprovadores} — você recebe um aviso.</p>}
                    {!aprova && pode('redes.editar') && <Botao variante="secundario" disabled={!!ocupado} onClick={() => situacao('rascunho')}>Retirar da aprovação</Botao>}
                  </>
                )}
                {post.situacao === 'pronto' && (
                  <>
                    <p className="rd-etapa">Aprovada. Publique pelo Instagram e depois confirme aqui.</p>
                    {texto && <Botao icone="copiar" variante="secundario" onClick={() => copiar(texto, 'Texto completo')}>Copiar texto completo</Botao>}
                    <Botao icone="baixar" variante="secundario" onClick={baixarTodos} disabled={!ativos.length}>{ativos.length > 1 ? 'Baixar as ' + ativos.length + ' artes' : 'Baixar arte'}</Botao>
                    {pode('redes.publicar') && !confirma && <Botao icone="feito" variante="destaque" onClick={() => setConfirma({ modo: 'agora', data: R.hoje(), hora: '', link: '', obs: '', sequencia: false })}>Confirmar publicação…</Botao>}
                    {aprova && <Botao icone="editar" variante="secundario" disabled={!!ocupado} onClick={pedirAjuste}>Pedir ajuste</Botao>}
                    {!aprova && pode('redes.editar') && <Botao variante="secundario" disabled={!!ocupado} onClick={() => situacao('rascunho')}>Voltar para rascunho</Botao>}
                  </>
                )}
                {post.situacao === 'cancelado' && pode('redes.gerir') && <Botao icone="restaurar" onClick={() => situacao('rascunho')}>Reabrir como rascunho</Botao>}
                <MaisAcoes itens={[
                  pode('redes.editar') && { rotulo: 'Duplicar como rascunho', icone: 'copiar', onClick: async () => {
                    setOcupado('duplicar')
                    try { const d = await rpc('redes_duplicar', { p_secret: lerSenha(), p_id: id }); onMudou(); onAbrir(d.id) } catch (e) { setErroAcao(e.message) } finally { setOcupado('') }
                  } },
                  podeCancelar && { rotulo: 'Cancelar postagem', icone: 'excluir', perigo: true, onClick: async () => {
                    const motivo = await pedirTexto('Cancelar “' + post.titulo + '”? Ela sai do calendário; arquivos e histórico ficam guardados.', { rotulo: 'Motivo (opcional)' }, { acao: 'Cancelar postagem' })
                    if (motivo !== null) situacao('cancelado', motivo)
                  } },
                  !fechada && aprova && post.situacao === 'rascunho' && { rotulo: 'Pedir ajuste', icone: 'editar', onClick: pedirAjuste },
                ]} />
              </div>
              {post.situacao === 'cancelado' && <p className="rd-campo__nota">Cancelada {post.cancelado_em ? 'em ' + R.quandoTexto(post.cancelado_em) : ''}{post.motivo_cancelamento ? ' — ' + post.motivo_cancelamento : ''}.</p>}
            </section>
          )}

          {confirma && post.situacao !== 'cancelado' && (
            <form className="rd-confirmar" aria-label="Confirmar publicação" onSubmit={async (e) => {
              e.preventDefault()
              const quando = confirma.modo === 'agora' ? new Date().toISOString() : R.instanteDe(confirma.data, confirma.hora)
              if (!quando) { setErroAcao('Informe a data e a hora em que foi publicado.'); return }
              const ok = await acao('confirmar', (b) => rpc('redes_confirmar', { p_secret: lerSenha(), p_id: id, p_versao: b.versao, p_publicado_em: quando, p_link: confirma.link.trim() || null, p_obs: confirma.obs.trim() || null }))
              if (ok) { setConfirma(null); setAviso(post.situacao === 'publicado' ? 'Execução corrigida.' : 'Publicação confirmada.') }
            }}>
              <h3>{post.situacao === 'publicado' ? 'Corrigir dados da publicação' : 'Confirmar publicação'}</h3>
              <p className="rd-campo__nota">Só confirme depois de publicar pelo Instagram.</p>
              <fieldset className="rd-opcoes">
                <legend>Quando foi publicado</legend>
                <label><input type="radio" name={'q-' + id} checked={confirma.modo === 'agora'} onChange={() => setConfirma({ ...confirma, modo: 'agora' })} /> Publicado agora</label>
                <label><input type="radio" name={'q-' + id} checked={confirma.modo === 'outro'} onChange={() => setConfirma({ ...confirma, modo: 'outro' })} /> Informar data e hora</label>
              </fieldset>
              {confirma.modo === 'outro' && (
                <div className="rd-linha">
                  <Campo rotulo="Data"><input type="date" required value={confirma.data} max={R.hoje()} onChange={(e) => setConfirma({ ...confirma, data: e.target.value })} /></Campo>
                  <Campo rotulo="Hora (Fortaleza)"><input type="time" required value={confirma.hora} onChange={(e) => setConfirma({ ...confirma, hora: e.target.value })} /></Campo>
                </div>
              )}
              <Campo rotulo="Link da publicação (opcional)" nota={story ? 'Story pode não ter endereço durável: confirme sem link.' : 'Cole o endereço do post, se tiver.'}>
                <input type="url" inputMode="url" placeholder="https://www.instagram.com/p/…" value={confirma.link} onChange={(e) => setConfirma({ ...confirma, link: e.target.value })} />
              </Campo>
              <Campo rotulo="Observação (problema ou alteração na hora)">
                <textarea rows={2} maxLength={1000} value={confirma.obs} onChange={(e) => setConfirma({ ...confirma, obs: e.target.value })} />
              </Campo>
              {story && ativos.length > 1 && (
                <label className="rd-check"><input type="checkbox" required checked={confirma.sequencia} onChange={(e) => setConfirma({ ...confirma, sequencia: e.target.checked })} /> A sequência inteira ({ativos.length} stories) foi publicada.</label>
              )}
              <div className="ui-acoes">
                <Botao type="submit" icone="feito" variante="destaque" disabled={!!ocupado}>{ocupado === 'confirmar' ? 'Confirmando…' : post.situacao === 'publicado' ? 'Salvar correção' : 'Confirmar publicação'}</Botao>
                <Botao variante="secundario" onClick={() => setConfirma(null)}>Voltar</Botao>
              </div>
            </form>
          )}

          {post.situacao === 'publicado' && (
            <Secao titulo="Publicação">
              <dl className="rd-dados">
                <div><dt>Publicado em</dt><dd>{R.quandoTexto(post.publicado_em)}</dd></div>
                <div><dt>Quem confirmou</dt><dd><Autor id={post.publicado_por_id} rotulo={post.publicado_por_rotulo} tamanho={24}>
                  {post.confirmado_em ? <span className="ui-autor__nota"> · {R.quandoTexto(post.confirmado_em)}</span> : null}</Autor></dd></div>
                <div><dt>Link</dt><dd>{post.link_publicado ? <a href={post.link_publicado} target="_blank" rel="noopener noreferrer">{post.link_publicado}</a> : 'Sem link'}</dd></div>
                {post.obs_execucao && <div><dt>Observação</dt><dd>{post.obs_execucao}</dd></div>}
                {post.formato === 'story' && <div><dt>Vale para</dt><dd>A sequência inteira ({(post.publicado_snapshot && post.publicado_snapshot.arquivos || []).length} stories)</dd></div>}
              </dl>
              {pode('redes.gerir') && (
                <div className="ui-acoes">
                  {!confirma && <Botao variante="secundario" icone="editar" onClick={() => {
                    const p2 = R.partes(post.publicado_em) || { data: R.hoje(), hora: '' }
                    setConfirma({ modo: 'outro', data: p2.data, hora: p2.hora, link: post.link_publicado || '', obs: post.obs_execucao || '', sequencia: true })
                  }}>Corrigir dados</Botao>}
                  <Botao variante="secundario" icone="restaurar" onClick={async () => {
                    const motivo = await pedirTexto('Desfazer a confirmação de publicação? Volta para "Aprovado"; o registro fica no histórico.', { rotulo: 'Motivo (obrigatório)' }, { acao: 'Desfazer confirmação' })
                    if (motivo && motivo.trim()) acao('desfazer', (b) => rpc('redes_desfazer_publicacao', { p_secret: lerSenha(), p_id: id, p_versao: b.versao, p_motivo: motivo }))
                  }}>Desfazer confirmação</Botao>
                </div>
              )}
              {post.publicado_snapshot && (
                <details className="rd-retrato">
                  <summary>O que foi ao ar (registro fixo)</summary>
                  <p className="rd-retrato__legenda">{post.publicado_snapshot.legenda || '(sem legenda)'}</p>
                  {post.publicado_snapshot.mencoes && <p>Menções: {post.publicado_snapshot.mencoes}</p>}
                  <ol>{(post.publicado_snapshot.arquivos || []).map((a) => <li key={a.id}>{a.nome}{a.versao > 1 ? ' (versão ' + a.versao + ')' : ''}{a.alt ? ' — alt: ' + a.alt : ''}</li>)}</ol>
                </details>
              )}
            </Secao>
          )}

          <Secao titulo="Identificação">
            <div className="rd-grade">
              <Campo rotulo="Título (só a equipe vê)" largo id={idCampo('titulo')}><input type="text" maxLength={120} required value={campos.titulo} disabled={!novo && !podeEditar} onChange={(e) => setCampo('titulo', e.target.value)} /></Campo>
              <Campo rotulo="Perfil de destino">
                <input type="text" maxLength={60} list={'rd-perfis-' + id} value={campos.perfil} disabled={!novo && !podeEditar} onChange={(e) => setCampo('perfil', e.target.value)} />
              </Campo>
              <datalist id={'rd-perfis-' + id}>{[...new Set([R.PERFIL_PADRAO, ...(opcoes.perfis || [])])].map((p) => <option key={p} value={p} />)}</datalist>
              <Campo rotulo="Formato" nota={R.requisitoFormato(campos.formato)}>
                <select value={campos.formato} disabled={!novo && !podeEditar} onChange={(e) => setCampo('formato', e.target.value)}>
                  {R.FORMATOS.map((x) => <option key={x.chave} value={x.chave}>{x.rotulo}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Edição ou campanha">
                <select value={campos.edicao_codigo} disabled={!novo && !podeEditar} onChange={(e) => setCampo('edicao_codigo', e.target.value)}>
                  <option value="">Institucional (sem edição)</option>
                  {(opcoes.edicoes || []).map((e) => <option key={e.codigo} value={e.codigo}>{e.codigo} · {e.nome}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Participante associado">
                <select value={campos.participante_id} disabled={!novo && !podeEditar} onChange={(e) => setCampo('participante_id', e.target.value)}>
                  <option value="">Nenhum</option>
                  {(opcoes.participantes || []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Campo>
              {campos.participante_id && onVerParticipante && pode('editorial.ler') && (
                <div className="rd-campo rd-campo--acao">
                  <Botao variante="secundario" icone="ficha" onClick={() => onVerParticipante(campos.participante_id, campos.edicao_codigo)}>Ver participante e combo</Botao>
                </div>
              )}
            </div>
          </Secao>

          <Secao titulo="Programação" nota="Horário de Fortaleza. Sem data, a postagem fica na fila.">
            <div className="rd-grade">
              <Campo rotulo="Data" id={idCampo('data')}><input type="date" value={dataIn} disabled={!novo && !podeEditar} onChange={(e) => mudarDH('data', e.target.value)} /></Campo>
              <Campo rotulo="Horário previsto"><input type="time" step={300} value={horaIn} disabled={!novo && !podeEditar} onChange={(e) => mudarDH('hora', e.target.value)} /></Campo>
              <Campo rotulo="Responsável pela publicação" id={idCampo('resp')}>
                <select value={campos.responsavel_id} disabled={!novo && !podeEditar} onChange={(e) => { escolheuResp.current = true; setCampo('responsavel_id', e.target.value) }}>
                  <option value="">Sem responsável</option>
                  {respFora && <option value={campos.responsavel_id}>{post.responsavel_nome || 'Conta atual'} (sem acesso a redes)</option>}
                  {equipe.map((e) => <option key={e.user_id} value={e.user_id}>{e.nome}</option>)}
                </select>
              </Campo>
              {campos.responsavel_id && (
                <div className="rd-campo rd-campo--acao"><Autor id={campos.responsavel_id}
                  rotulo={(equipe.find((e) => e.user_id === campos.responsavel_id) || {}).nome || post.responsavel_nome} tamanho={28}>
                  <span className="ui-autor__nota"> · responsável</span></Autor></div>
              )}
              {(campos.programado_para || dhLocal) && (novo || podeEditar) && (
                <div className="rd-campo rd-campo--acao"><Botao variante="secundario" onClick={() => { setCampo('programado_para', ''); setDhLocal(null) }}>Tirar a data (mandar para a fila)</Botao></div>
              )}
            </div>
            {dhLocal && <p className="rd-campo__nota rd-campo__nota--erro" role="alert">Falta {dhLocal.data ? 'o horário' : 'a data'}.</p>}
            {opcoes.carregadas && !equipe.length && <p className="rd-campo__nota">Ninguém da equipe tem acesso a redes ainda. Em Administração › Equipe, dê a função “Social media” (ou Administrador) a quem vai publicar.</p>}
          </Secao>

          <Secao titulo="Conteúdo">
            <Campo rotulo={story ? 'Legenda (opcional no Story)' : 'Legenda'} largo id={idCampo('legenda')}
              nota={campos.legenda.length > R.LIMITE_LEGENDA_INSTAGRAM ? campos.legenda.length + ' caracteres — o Instagram aceita até ' + R.LIMITE_LEGENDA_INSTAGRAM + '. Encurte.'
                : campos.legenda.length + ' de ' + R.LIMITE_LEGENDA_INSTAGRAM + ' caracteres · hashtags podem ir aqui mesmo'}>
              <textarea rows={7} maxLength={5000} value={campos.legenda} disabled={!novo && !podeEditar} onChange={(e) => setCampo('legenda', e.target.value)} />
            </Campo>
            <Campo rotulo="Perfis a mencionar" largo nota="Ex.: @jolie.cafe @outraconta — entram no fim do texto copiado.">
              <input type="text" maxLength={500} value={campos.mencoes} disabled={!novo && !podeEditar} onChange={(e) => setCampo('mencoes', e.target.value)} />
            </Campo>
            {!novo && texto && <div className="ui-acoes"><Botao variante="secundario" icone="copiar" onClick={() => copiar(texto, 'Texto completo')}>Copiar texto completo</Botao></div>}
            <Campo rotulo="Observações para quem publica" largo nota="Ex.: marcar a localização, música do Reel, horário que a marca pediu.">
              <textarea rows={3} maxLength={2000} value={campos.observacoes} disabled={!novo && !podeEditar} onChange={(e) => setCampo('observacoes', e.target.value)} />
            </Campo>
            <Campo rotulo="Referências ou briefing" largo>
              <textarea rows={3} maxLength={2000} value={campos.referencias} disabled={!novo && !podeEditar} onChange={(e) => setCampo('referencias', e.target.value)} />
            </Campo>
          </Secao>

          <Secao titulo="Arquivos" nota={story ? 'Stories da sequência, na ordem.' : campos.formato === 'carrossel' ? 'Ordem do carrossel: o primeiro é a capa.' : 'JPG, PNG, WEBP, MP4 ou MOV, até 50 MB.'}
            acoes={ativos.length > 1 ? <Botao variante="secundario" icone="baixar" onClick={baixarTodos}>Baixar todos</Botao> : null}>
            {novo && pode('redes.arquivos') && (
              <label className="rd-soltar">
                <Icone nome="mais" tamanho={20} />
                <span>Escolher a arte</span>
                <span className="rd-campo__nota">A postagem é criada como rascunho e a arte sobe em seguida.</span>
                <input type="file" multiple accept={R.ACEITE} className="ui-oculto" id={idCampo('arte')}
                  onChange={(e) => { const l = [...e.target.files]; e.target.value = ''; if (l.length) criar(l) }} />
              </label>
            )}
            {ativos.length > 0 && (
              <ol className="rd-arquivos">
                {ativos.map((a, i) => (
                  <li key={a.id} className="rd-arquivo">
                    <Miniatura path={miniDe(a)} formato={campos.formato} urls={urls} renovar={renovar} grande />
                    <div className="rd-arquivo__info">
                      <p className="rd-arquivo__nome"><span className="rd-arquivo__pos">{i + 1}.</span> {a.nome}</p>
                      <p className="rd-campo__nota">
                        {[R.TIPOS[a.mime] && R.TIPOS[a.mime].toUpperCase(), a.largura && a.altura ? a.largura + '×' + a.altura : null,
                          a.duracao != null ? String(a.duracao).replace('.', ',') + ' s' : null, tamanhoLegivel(a.tamanho)].filter(Boolean).join(' · ')}
                      </p>
                      <p className="rd-campo__nota rd-arquivo__origem">
                        {a.versao > 1 && <Selo tom="andamento">Versão {a.versao}</Selo>}
                        {a.origem && a.origem !== 'envio' && <Selo tom="neutro">{ROTULO_ORIGEM[a.origem] || 'Biblioteca'}</Selo>}
                        <Autor id={a.criado_por_id} rotulo={a.criado_por_rotulo} tamanho={20}>
                          <span className="ui-autor__nota"> · {a.origem && a.origem !== 'envio' ? 'associou' : 'enviou'} {R.quandoTexto(a.criado_em)}</span></Autor>
                      </p>
                      {eImagem(a) && (
                        <div className="og-campo">
                          <span><label htmlFor={'rd-alt-' + a.id}>Texto alternativo</label></span>
                          <textarea id={'rd-alt-' + a.id} rows={2} maxLength={1000} value={alts[a.id] ?? a.alt} disabled={!podeArquivos}
                            placeholder="Descreva a imagem para quem usa leitor de tela"
                            onChange={(e) => setAlts((x) => ({ ...x, [a.id]: e.target.value }))} onBlur={() => salvarAlt(a)} />
                        </div>
                      )}
                    </div>
                    <div className="rd-arquivo__acoes">
                      {podeArquivos && ativos.length > 1 && <BotaoIcone icone="seta-esquerda" rotulo="Mover para antes" alvo={a.nome} disabled={i === 0 || !!ocupado} onClick={() => moverArquivo(i, -1)} />}
                      {podeArquivos && ativos.length > 1 && <BotaoIcone icone="seta-direita" rotulo="Mover para depois" alvo={a.nome} disabled={i === ativos.length - 1 || !!ocupado} onClick={() => moverArquivo(i, 1)} />}
                      <BotaoIcone icone="baixar" rotulo="Baixar" alvo={a.nome} onClick={() => baixarArquivo(fonteArq(a), a.nome).catch((e) => setErroAcao(e.message))} />
                      {podeMexer(a) && (a.origem || 'envio') === 'envio' && (
                        <label className="ui-icone-btn rd-arquivo__trocar" data-rotulo="Substituir">
                          <Icone nome="atualizar" tamanho={20} />
                          <span className="ui-oculto">Substituir {a.nome}</span>
                          <input type="file" accept={R.ACEITE} className="ui-oculto" onChange={(e) => { if (e.target.files[0]) adicionarEnvios([e.target.files[0]], a.id); e.target.value = '' }} />
                        </label>
                      )}
                      {podeMexer(a) && <BotaoIcone icone="excluir" rotulo="Remover" alvo={a.nome} perigo onClick={() => removerArquivo(a)} />}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {envios.length > 0 && (
              <ul className="rd-envios" aria-live="polite">
                {envios.map((it) => (
                  <li key={it.chave} className="rd-envio" data-estado={it.estado}>
                    <span className="rd-envio__nome">{it.substitui ? 'Substituindo por ' : ''}{it.nome}</span>
                    {it.estado === 'erro' ? (
                      <>
                        <span className="rd-campo__nota rd-campo__nota--erro" role="alert">{it.erro}</span>
                        <span className="ui-acoes">
                          <Botao onClick={() => tentarDeNovo(it)}>Tentar de novo</Botao>
                          <Botao variante="secundario" onClick={() => setEnvios((l) => l.filter((x) => x.chave !== it.chave))}>Descartar</Botao>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="rd-envio__estado">{it.estado === 'na_fila' ? 'Na fila' : it.estado === 'conferindo' ? 'Conferindo o arquivo…' : 'Enviando ' + Math.round(it.progresso * 100) + '%'}</span>
                        <span className="rd-envio__trilho" role="progressbar" aria-label={'Envio de ' + it.nome} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(it.progresso * 100)}><span style={{ width: it.progresso * 100 + '%' }} /></span>
                        {it.nota && <span className="rd-campo__nota">{it.nota}</span>}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {podeArquivos && ativos.some((a) => !podeMexer(a)) && (
              <p className="rd-campo__nota">Arte enviada por outra pessoa (o designer) só a administração substitui ou remove. Precisa de ajuste? Use “Pedir ajuste” nos comentários.</p>
            )}
            {podeArquivos && (
              <div className="ui-acoes">
                <Botao variante="secundario" icone="pasta" aria-expanded={biblioteca} onClick={() => setBiblioteca((x) => !x)}>
                  {biblioteca ? 'Fechar a biblioteca' : 'Escolher da biblioteca'}
                </Botao>
              </div>
            )}
            {podeArquivos && biblioteca && (
              <SeletorBiblioteca participanteId={campos.participante_id || null} jaUsados={ativos.map((a) => chaveFonte(fonteArq(a)))}
                ocupado={ocupado === 'associar'} onEscolher={associar} />
            )}
            {podeArquivos && (
              <label className="rd-soltar">
                <Icone nome="mais" tamanho={20} />
                <span>{ativos.length ? 'Enviar mais arquivos' : 'Enviar a arte'}</span>
                <span className="rd-campo__nota">Pode escolher vários de uma vez; entram na ordem escolhida.</span>
                <input type="file" multiple accept={R.ACEITE} className="ui-oculto" id={idCampo('arte')} onChange={(e) => { if (e.target.files.length) adicionarEnvios(e.target.files); e.target.value = '' }} />
              </label>
            )}
            {antigos.length > 0 && (
              <details className="rd-antigos">
                <summary>Versões anteriores e removidos ({antigos.length})</summary>
                <ul>
                  {antigos.map((a) => (
                    <li key={a.id}>
                      <span>{a.nome}{a.versao ? ' (versão ' + a.versao + ')' : ''} — {a.substituido_por ? 'substituído' : 'removido'} por {a.removido_por_rotulo || '—'} em {R.quandoTexto(a.removido_em)}</span>
                      <BotaoIcone icone="baixar" rotulo="Baixar" alvo={a.nome} onClick={() => baixarArquivo(fonteArq(a), a.nome).catch((e) => setErroAcao(e.message))} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Secao>

          {!novo && (
            <Secao titulo="Comentários" nota="Pedido de ajuste avisa quem cuida da postagem e a devolve para rascunho.">
              {comentarios.length ? (
                <ul className="rd-comentarios">
                  {comentarios.map((c) => (
                    <li key={c.id} data-ajuste={c.ajuste ? '1' : undefined}>
                      <p className="rd-comentarios__quem">
                        <Autor id={c.autor_id} rotulo={c.autor_rotulo} tamanho={24}><span className="ui-autor__nota"> · {R.quandoTexto(c.criado_em)}</span></Autor>
                        {c.ajuste && <Selo tom="atencao">Pedido de ajuste</Selo>}
                      </p>
                      <p>{c.corpo}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="ui-nota">Nenhum comentário.</p>}
              {pode('redes.editar') && (
                <form className="rd-comentar" onSubmit={async (e) => {
                  e.preventDefault()
                  if (!comentario.trim()) return
                  setOcupado('comentar')
                  try { await rpc('redes_comentar', { p_secret: lerSenha(), p_post: id, p_corpo: comentario, p_ajuste: ajuste }); setComentario(''); setAjuste(false); await recarregar(); onMudou() }
                  catch (err) { setErroAcao(err.message) } finally { setOcupado('') }
                }}>
                  <Campo rotulo="Novo comentário" largo><textarea rows={2} maxLength={2000} value={comentario} onChange={(e) => setComentario(e.target.value)} /></Campo>
                  <label className="rd-check"><input type="checkbox" checked={ajuste} onChange={(e) => setAjuste(e.target.checked)} /> É um pedido de ajuste (na arte, na legenda…)</label>
                  <div className="ui-acoes"><Botao type="submit" icone="enviar" disabled={!comentario.trim() || ocupado === 'comentar'}>{ajuste ? 'Pedir ajuste' : 'Enviar comentário'}</Botao></div>
                </form>
              )}
            </Secao>
          )}

          {!novo && (
            <Secao titulo="Histórico">
              <ol className="rd-historico">
                {historia.map((h) => (
                  <li key={h.id}><span className="rd-historico__quando">{R.quandoTexto(h.em)}</span> <Autor id={h.ator_id} rotulo={h.ator_rotulo} tamanho={20} /> — {textoHistorico(h, opcoes)}</li>
                ))}
              </ol>
            </Secao>
          )}
        </div>
      </div>

      <div className="rd-rodape">
        <p className="rd-rodape__estado" aria-live="polite">
          {erroAcao ? <span className="rd-campo__nota--erro">{traduzirRedes(erroAcao)}</span>
            : aviso ? aviso
            : salvando ? 'Salvando…'
            : conflito ? 'Outra pessoa salvou antes: escolha acima qual versão fica.'
            : sujo ? 'Alterações não salvas'
            : salvoEm ? 'Salvo às ' + R.horaCurta(R.partes(salvoEm).hora)
            : novo ? '' : post.situacao === 'publicado' ? 'Publicada — não muda mais' : post.situacao === 'cancelado' ? 'Cancelada' : 'Tudo salvo'}
        </p>
        <div className="ui-acoes">
          {!novo && sujo && <Botao variante="secundario" onClick={descartar} disabled={salvando}>Descartar alterações</Botao>}
          {(novo || podeEditar) && (
            <Botao variante="destaque" icone="feito" onClick={salvar} disabled={salvando || (!novo && !sujo) || !!conflito}>
              {novo ? (salvando ? 'Criando…' : 'Criar rascunho') : salvando ? 'Salvando…' : 'Salvar alterações'}
            </Botao>
          )}
        </div>
      </div>
    </Folha>
  )
}
