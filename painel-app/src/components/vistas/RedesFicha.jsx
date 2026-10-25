import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Folha } from '../Folha'
import { useNomeDaTela } from '../Trilha'
import { Icone } from '../Icone'
import { Carregando, Erro, Selo, Botao, BotaoIcone, MaisAcoes, traduzirErro } from '../ui'
import { confirmar, pedirTexto } from '../Confirmar'
import * as R from '../../lib/redes'
import { useUrlsAssinadas, prepararArquivo, enviarArquivo, fonteDe, chaveFonte, urlDe } from '../../lib/redesArquivos'
import { useEntrega, EstadoEntrega, BotoesEntrega } from './BaixarArquivo'
import { tamanhoLegivel } from '../../lib/arquivos'
import { Autor } from '../Avatar'
import { SeletorBiblioteca, ROTULO_ORIGEM } from './SocialBiblioteca'
import { quemAprova } from '../../lib/socialGuia'
import { usePendencia } from '../../lib/pendencias'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { AvisoMudancaExterna } from '../AvisoMudancaExterna'
import { FormularioCampanha } from './FormularioCampanha'
import { campanhaDaPostagem } from '../../lib/campanhas'
import { ChecklistPostagem } from './ChecklistPostagem'
import * as K from '../../lib/checklist'

/*
 * Ficha de uma publicação (Social media, 16–17/10/2026; reorganizada em
 * 17/10/2026: LEITURA antes de formulário). Ordem: arte → legenda →
 * programação → próxima ação → o resto (detalhes, arquivos, comentários,
 * histórico), recolhido. Cada bloco edita no lugar ("Editar" → campos →
 * "Salvar"/"Cancelar"); bloco com alteração não salva fica aberto. Postagem
 * nova é um formulário curto: só o título é obrigatório.
 * No desktop a arte fica ao lado; no celular, em cima, com altura controlada,
 * numa tela cheia de rolagem única. A ação em destaque mora no rodapé da
 * folha, FORA da rolagem (Folha `rodape`): nada fica coberto por ela.
 *
 * Salvar: só o que mudou vai ao banco, com a versão lida. "Salvo" aparece
 * depois da resposta do servidor, nunca antes. Versão desatualizada não
 * sobrescreve ninguém: o texto digitado fica, e a tela mostra o que a outra
 * pessoa mudou para decidir. O que não foi salvo fica guardado neste aparelho
 * (sessionStorage) e volta ao reabrir a ficha — inclusive a postagem nova.
 *
 * ⛔ Copiar legenda e baixar arte NÃO marcam publicação. Publicado = o botão
 *    "Confirmar publicação", com data e hora reais.
 */

const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }
const norm = (v) => (v == null ? '' : String(v))
const camposDe = R.camposDoPost
const eImagem = (a) => String(a.mime || '').startsWith('image/')
// Fonte = { bucket, path }: a arte enviada aqui (redes) ou o material referenciado da biblioteca.
const fonteArq = (a) => ({ bucket: a.bucket || 'redes', path: a.path })
// O que a entrega precisa (o ORIGINAL: bucket + caminho do arquivo, nunca a miniatura).
const itemDe = (a) => ({ bucket: a.bucket || 'redes', path: a.path, nome: a.nome, mime: a.mime, tamanho: a.tamanho })
const miniDe = (a) => (a.miniatura_path ? { bucket: 'redes', path: a.miniatura_path } : eImagem(a) ? fonteArq(a) : null)
// Postagem nova ainda não criada: guardada neste aparelho até virar rascunho.
const CHAVE_NOVO = 'scw_redes_rascunho_novo'

const ERROS_REDES = {
  campanha_invalida: 'Essa campanha não está disponível (foi arquivada ou não existe). Escolha outra.',
  requisitos_pendentes: 'Ainda falta algo para enviar para aprovação (veja a lista em “Próximo passo”).',
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
  const url = urlDe(urls, path)
  // Arte nova: recomeça. Endereço novo da MESMA arte (renovação): tenta mostrar de novo, mas pede assinatura
  // nova só UMA vez por arte (`tentou` zera com a arte, não com o endereço) — arquivo quebrado não vira laço.
  React.useEffect(() => { tentou.current = false }, [chave])
  React.useEffect(() => { setFalhou(false) }, [chave, url])
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

/*
 * Prévia: a arte inteira (contain, na proporção do arquivo), altura controlada.
 * Sequência e carrossel: posição ("2 de 7"), anterior/próximo e miniaturas —
 * trocar de arquivo nunca depende de gesto. Ações essenciais ao lado: Ampliar
 * e Baixar, com texto. `vazio`: o que mostrar sem arte (o envio, quando pode).
 */
function Previa({ arquivos, urls, erroUrls = null, renovar, formato, entrega, nomeConjunto = 'artes', vazio = null }) {
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
        {vazio}
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
  const nomeSeq = formato === 'story' ? 'stories' : 'artes'
  return (
    <div className="rd-previa">
      <div className="rd-previa__palco" style={razao ? { '--razao': razao } : undefined}>
        {url ? midia(false)
          : erroUrls ? <span className="rd-previa__espera">Não consegui abrir a arte. <Botao variante="secundario" icone="atualizar" onClick={() => renovar(fonteArq(a))}>Tentar de novo</Botao></span>
          : <span className="rd-previa__espera">Carregando a arte…</span>}
      </div>
      {n > 1 && (
        <div className="rd-previa__nav" role="group" aria-label="Trocar de arquivo">
          <BotaoIcone icone="seta-esquerda" rotulo="Arquivo anterior" disabled={i === 0} onClick={() => setI(i - 1)} />
          <span className="rd-previa__conta" aria-live="polite">{(i + 1) + ' de ' + n + ' ' + nomeSeq}{a.versao > 1 ? ' · versão ' + a.versao : ''}</span>
          <BotaoIcone icone="seta-direita" rotulo="Próximo arquivo" disabled={i === n - 1} onClick={() => setI(i + 1)} />
        </div>
      )}
      {n === 1 && <p className="rd-previa__nome">{a.nome}{a.versao > 1 ? ' · versão ' + a.versao : ''}</p>}
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
      {/* Entregar: esta arte (original) e, em sequência, todas na ordem da postagem (nomes numerados). */}
      <div className="rd-previa__acoes">
        <Botao variante="secundario" icone="busca" disabled={!url} onClick={() => dialogo.current && dialogo.current.showModal()}>Ampliar</Botao>
        <BotoesEntrega entrega={entrega} itens={[itemDe(a)]} rotuloBaixar={n > 1 ? 'Baixar esta' : 'Baixar arte'} />
        {n > 1 && <BotoesEntrega entrega={entrega} itens={arquivos.map(itemDe)} numerar nomeZip={nomeConjunto} rotuloBaixar={'Baixar as ' + n + ' (ZIP)'} />}
      </div>
      <EstadoEntrega entrega={entrega} />
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
function Campo({ rotulo, nota, largo, id: idCampo, erro = false, rotuloOculto = false, children }) {
  const auto = React.useId()
  const id = idCampo || auto
  const campo = React.isValidElement(children)
    ? React.cloneElement(children, { id: idCampo ? idCampo : id + '-c', ...(nota ? { 'aria-describedby': id + '-n' } : {}) })
    : children
  return (
    <div className={'rd-campo' + (largo ? ' rd-campo--largo' : '')}>
      <div className="og-campo">
        <span className={rotuloOculto ? 'ui-oculto' : undefined}><label htmlFor={idCampo ? idCampo : id + '-c'}>{rotulo}</label></span>
        {campo}
      </div>
      {nota && <small className={'rd-campo__nota' + (erro ? ' rd-campo__nota--erro' : '')} id={id + '-n'}>{nota}</small>}
    </div>
  )
}

/*
 * Bloco da ficha: título + ação ("Editar") à direita, conteúdo embaixo. Em
 * edição, os campos e "Salvar"/"Cancelar" ficam JUNTO deles — com o teclado
 * do celular aberto, salvar continua ao alcance.
 */
function Bloco({ titulo, acoes, children, className = '', id }) {
  return (
    <section className={'rd-bloco ' + className} id={id}>
      <header className="rd-bloco__cabeca">
        <h3>{titulo}</h3>
        {acoes && <div className="rd-bloco__acoes">{acoes}</div>}
      </header>
      {children}
    </section>
  )
}
function AcoesEdicao({ salvando, onSalvar, onCancelar, podeSalvar = true }) {
  return (
    <div className="ui-acoes rd-bloco__salvar">
      <Botao variante="destaque" icone="feito" disabled={salvando || !podeSalvar} onClick={onSalvar}>{salvando ? 'Salvando…' : 'Salvar'}</Botao>
      <Botao variante="secundario" disabled={salvando} onClick={onCancelar}>Cancelar</Botao>
    </div>
  )
}

// Recolhido por padrão; `aberto` controlado (uma pendência abre o bloco certo).
function Gaveta({ titulo, aberto, onAlternar, children, id, travada = false }) {
  return (
    <details className="rd-gaveta" id={id} open={aberto} onToggle={(e) => {
      // Com campos em edição dentro, a gaveta não fecha (eles sumiriam com "Alterações não salvas").
      if (travada && !e.currentTarget.open) { e.currentTarget.open = true; return }
      if (e.currentTarget.open !== aberto) onAlternar(e.currentTarget.open)
    }}>
      <summary>{titulo}</summary>
      <div className="rd-gaveta__corpo">{children}</div>
    </details>
  )
}

const ROTULO_CAMPO = { titulo: 'Título interno', perfil: 'Perfil', edicao_codigo: 'Edição', campanha_id: 'Campanha', campanha: 'Campanha', participante_id: 'Participante', formato: 'Formato', legenda: 'Legenda', mencoes: 'Perfis a mencionar', observacoes: 'Observações para quem publica', referencias: 'Referências', programado_para: 'Data e horário', responsavel_id: 'Responsável' }

function valorLegivel(k, v, opcoes) {
  if (v == null || v === '') return '(vazio)'
  if (k === 'programado_para') return R.quandoTexto(v)
  if (k === 'responsavel_id') return ((opcoes.equipe || []).find((e) => e.user_id === v) || {}).nome || 'outra conta'
  if (k === 'participante_id') return ((opcoes.participantes || []).find((e) => e.id === v) || {}).nome || 'participante'
  if (k === 'formato') return (R.FORMATO[v] || {}).rotulo || v
  const s = String(v)
  return s.length > 280 ? s.slice(0, 280) + '…' : s
}

function textoHistorico(h) {
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

function lerNovoGuardado() {
  try { const g = JSON.parse(sessionStorage.getItem(CHAVE_NOVO) || 'null'); return g && (g.titulo || g.legenda) ? g : null } catch { return null }
}

export function RedesFicha({ id, pode, opcoes, onFechar, onMudou, onAbrir, inicial = null, onVerParticipante = null, voltaParticipante = false }) {
  const novo = id === 'novo'
  const idCampo = (k) => 'rd-f-' + k + '-' + id
  const padraoNovo = () => ({ ...camposDe(null), perfil: R.PERFIL_PADRAO, formato: 'feed', edicao_codigo: opcoes.edicao_atual || '', responsavel_id: opcoes.eu || '', ...((inicial && inicial.campos) || {}) })
  const [carga, setCarga] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [base, setBase] = React.useState(null)
  const baseRef = React.useRef(null)
  // Postagem nova guardada de antes: volta sozinha — a não ser que esta venha
  // de um participante; aí pergunta, nada é trocado em silêncio.
  const [anterior, setAnterior] = React.useState(() => (novo && inicial && inicial.doParticipante ? lerNovoGuardado() : null))
  const [campos, setCampos] = React.useState(() => {
    if (!novo) return null
    const g = inicial && inicial.doParticipante ? null : lerNovoGuardado()
    return g ? { ...padraoNovo(), ...Object.fromEntries(Object.entries(g).filter(([k]) => R.CAMPOS.includes(k))) } : padraoNovo()
  })
  // Postagem nova: "suja" = diferente de como abriu (o que veio do participante, do
  // rascunho guardado ou os valores automáticos não contam como alteração — fechar
  // sem mexer não pergunta nada).
  const inicioNovo = React.useRef(novo ? campos : null)
  // data/hora digitadas pela metade ("Adicionar neste dia" chega com a data, falta a hora)
  const [dhLocal, setDhLocal] = React.useState(() => (novo && inicial && inicial.data ? { data: inicial.data, hora: '' } : null))
  const [salvando, setSalvando] = React.useState(false)
  const [salvoEm, setSalvoEm] = React.useState(null)
  const [erroAcao, setErroAcao] = React.useState(null)
  // Campos que outra pessoa mudou enquanto ESTA tela tinha o mesmo campo alterado (guardados até a pessoa escolher;
  // o que vale é o cruzamento com o que ela ainda tem alterado — ver "conflito", abaixo).
  const [conflitoChaves, setConflitoChaves] = React.useState([])
  // Campos que acompanharam o que outra pessoa salvou (a pessoa não tinha tocado neles): avisa, não pergunta.
  const [externoAdotado, setExternoAdotado] = React.useState({ campos: [], quem: '' })
  // Aprovar o que se VIU: a tela se relê quando outra pessoa mexe (e passa a mandar a versão nova), então a versão sozinha
  // não prova que quem aprova conferiu a arte. `vistaRef` = o que a pessoa viu ao abrir (ou ao clicar "Conferi").
  const vistaRef = React.useRef(null)
  const [mudouDepois, setMudouDepois] = React.useState(null) // { quem, em, partes } — outra pessoa mudou o que se aprova
  const podeRef = React.useRef(pode)
  podeRef.current = pode
  const [recuperado, setRecuperado] = React.useState(() => novo && !(inicial && inicial.doParticipante) && !!lerNovoGuardado())
  const [ocupado, setOcupado] = React.useState('')
  const [aviso, setAviso] = React.useState('')
  const [envios, setEnvios] = React.useState([])
  const [alts, setAlts] = React.useState({})
  const [comentario, setComentario] = React.useState('')
  const [confirma, setConfirma] = React.useState(null) // formulário de confirmação aberto
  const [ajuste, setAjuste] = React.useState(false)
  const [biblioteca, setBiblioteca] = React.useState(false)
  const [editando, setEditando] = React.useState(() => new Set()) // blocos abertos em edição
  const [gavetas, setGavetas] = React.useState(() => new Set()) // detalhes · arquivos · comentarios · historico
  const entrega = useEntrega() // baixar / salvar ou compartilhar, com preparo, erro e "Tentar de novo"
  const entregaGaveta = useEntrega() // o "Baixar" de cada arquivo na gaveta: o estado aparece ali, não lá na prévia
  const [copiado, setCopiado] = React.useState(false)
  const [novaCampanha, setNovaCampanha] = React.useState(false)
  const [campanhasNovas, setCampanhasNovas] = React.useState([]) // criadas aqui, antes de a lista chegar pelo sinal
  const [verAntigos, setVerAntigos] = React.useState(false)
  const fila = React.useRef(Promise.resolve())
  const primeira = React.useRef(true)
  const focoDepois = React.useRef(null)
  const chaveRascunho = 'scw_redes_rascunho_' + id

  const definirBase = (p) => { baseRef.current = p; setBase(p) }
  const artesDoNovo = React.useRef(null) // artes escolhidas antes do título: não se perdem
  // Opções chegam depois de abrir "Nova postagem" pelo endereço: responsável = eu (se
  // ninguém escolheu) e a edição atual. Valor automático, não alteração da pessoa.
  const escolheuResp = React.useRef(false)
  React.useEffect(() => {
    if (!novo) return
    const auto = {}
    if (opcoes.eu && !escolheuResp.current) auto.responsavel_id = opcoes.eu
    if (opcoes.edicao_atual) auto.edicao_codigo = opcoes.edicao_atual
    if (!Object.keys(auto).length) return
    const aplicar = (c) => { const n = { ...c }; for (const [k, v] of Object.entries(auto)) if (!c[k]) n[k] = v; return n }
    inicioNovo.current = aplicar(inicioNovo.current)
    setCampos((c) => (c ? aplicar(c) : c))
  }, [novo, opcoes.eu, opcoes.edicao_atual])

  // Releitura (primeira carga, depois de uma ação, sinal de outra pessoa, reconexão). Só a MAIS NOVA vale (a velha
  // voltaria a versão antiga), e nunca depois de fechar a ficha, sair ou trocar de conta. É silenciosa: depois da
  // primeira carga não troca nada por "Carregando…"; se falhar mantém o que está na tela.
  // Devolve: a resposta (ok) · null (falhou) · undefined (resposta atrasada, já substituída por outra).
  const guardaCarga = useGuarda()
  const camposRef = React.useRef(campos) // o que está digitado AGORA: a releitura mescla com isto, nunca com uma cópia velha
  camposRef.current = campos
  const propria = React.useRef(false) // uma ação desta pessoa está em curso: a situação nova é dela, não vira aviso
  const versaoDoRascunho = React.useRef(null) // versão em que o texto em conflito foi começado (o rascunho guardado precisa dela)
  const recarregar = React.useCallback(async ({ aposFalha = false } = {}) => {
    if (novo) return null
    const vale = guardaCarga()
    try {
      const r = await rpc('redes_post', { p_secret: lerSenha(), p_id: id })
      if (!vale()) return undefined
      const velha = baseRef.current
      let g = null
      if (primeira.current) {
        primeira.current = false
        try { g = JSON.parse(sessionStorage.getItem(chaveRascunho) || 'null') } catch { /* rascunho ilegível: ignora */ }
        if (!(g && g.campos && Object.keys(g.campos).length)) g = null
      }
      if (velha && camposRef.current) {
        // Versão nova enquanto a pessoa pode ter digitado, em três vias, campo a campo: o que ela não tocou acompanha o
        // servidor; o que digitou NUNCA é trocado; o mesmo campo mudado dos dois lados vira conflito e ela escolhe.
        const m = R.mesclarPostExterno(velha, camposRef.current, r.post)
        setCampos(m.campos)
        if (m.conflitos.length && !versaoDoRascunho.current) versaoDoRascunho.current = velha.versao
        setConflitoChaves((ant) => R.conflitosAbertos(ant, m.conflitos, R.diferencas(r.post, m.campos)))
        const deMim = !!r.eu && r.post.atualizado_por_id === r.eu
        if (m.mudouFora && m.adotados.length && !deMim) {
          setExternoAdotado((x) => ({ campos: [...new Set([...x.campos, ...m.adotados])], quem: r.post.atualizado_por_rotulo || '' }))
        }
        if (m.mudouFora && velha.situacao !== r.post.situacao && !propria.current) {
          setAviso('A situação mudou para “' + ((R.SITUACAO[r.post.situacao] || {}).rotulo || r.post.situacao) + '”.')
        }
        // O salvamento falhou por versão: se nenhum campo dela conflita, nada a decidir — a base já é a nova.
        if (aposFalha && !m.conflitos.length) setErroAcao('Outra pessoa salvou esta postagem enquanto você editava. Confira o que mudou e salve de novo.')
      } else {
        const n = camposDe(r.post)
        if (g) for (const [k, v] of Object.entries(g.campos)) if (R.CAMPOS.includes(k)) n[k] = norm(v)
        setCampos(n)
      }
      // Rascunho feito sobre uma versão que outra pessoa já mudou: avisa, não salva sozinho.
      if (g) setRecuperado(g.versao != null && g.versao !== r.post.versao ? 'antiga' : true)
      const agoraVisto = R.conteudoParaAprovar(r.post, r.arquivos)
      if (vistaRef.current == null || (!!r.eu && r.post.atualizado_por_id === r.eu)) vistaRef.current = agoraVisto // 1ª leitura, ou a mudança é da própria pessoa
      else {
        const partes = R.partesMudadas(vistaRef.current, agoraVisto)
        if (!partes.length) setMudouDepois(null)
        else if (podeRef.current('redes.aprovar') && ['aprovacao', 'rascunho', 'preparacao'].includes(r.post.situacao)) setMudouDepois({ quem: r.post.atualizado_por_rotulo || 'Outra pessoa', em: r.post.atualizado_em, partes })
      }
      definirBase(r.post)
      setCarga(r)
      setErro(null)
      return r
    } catch (e) {
      if (!vale()) return undefined
      setErro(e.message)
      if (baseRef.current && /post_inexistente/.test(e.message)) setErroAcao(e.message) // apagada por outra pessoa: o que está na tela já não existe
      return null
    }
  }, [id, novo, chaveRascunho])
  React.useEffect(() => { recarregar() }, [recarregar])
  // Outra pessoa (ou outra aba, ou a reconexão) mexeu em postagens: relê ESTA, a não ser que o sinal seja só de outra postagem.
  useSincronizar(['redes', 'perfis'], async (aviso) => {
    if (R.avisoDeOutraPostagem(aviso, id)) return
    if ((await recarregar()) === null) throw new Error('redes_post')
  }, { ativo: !novo })

  // Postagem de antes do checklist (ou sem itens): recebe a cópia do modelo do formato, uma vez por abertura. Quem só lê não escreve.
  const garantido = React.useRef(new Set())
  React.useEffect(() => {
    if (novo || !carga || !carga.post || R.FECHADAS.includes(carga.post.situacao) || !podeRef.current('redes.editar')) return
    if ((carga.checklist || []).length > 0 || garantido.current.has(id)) return
    garantido.current.add(id)
    rpc('redes_checklist_garantir', { p_secret: lerSenha(), p_post: id })
      .then((l) => setCarga((c) => (c && c.post && c.post.id === id ? { ...c, checklist: l } : c)))
      .catch(() => { /* sem checklist por ora: a ficha segue normal */ })
  }, [carga, id, novo])

  const mudancas = base && campos ? R.diferencas(base, campos) : {}
  // Conflito aberto = campos que outra pessoa mudou E que esta tela também tem alterados, até a pessoa escolher. Enquanto
  // houver, NADA salva por cima (salvar() recusa): a base já anda para a versão nova, então salvar levaria a versão nova
  // e passaria por cima do trabalho do outro sem ninguém perceber.
  const emConflito = conflitoChaves.filter((k) => k in mudancas)
  const conflito = emConflito.length ? { salvo: base, meus: mudancas, campos: emConflito } : null
  React.useEffect(() => { setConflitoChaves((ant) => (ant.length === emConflito.length ? ant : emConflito)) }, [emConflito.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  const sujo = novo ? !!campos && (R.CAMPOS.some((k) => norm(campos[k]) !== norm(inicioNovo.current[k])) || !!(dhLocal && dhLocal.hora))
    : Object.keys(mudancas).length > 0 || !!dhLocal

  // Guarda o que não foi salvo neste aparelho (volta ao reabrir a ficha).
  React.useEffect(() => {
    if (!campos) return
    try {
      if (novo) {
        if (anterior) return // decidir antes: a guardada não é sobrescrita
        const mudou = R.CAMPOS.some((k) => norm(campos[k]) !== norm(inicioNovo.current[k]))
        if (mudou && (campos.titulo || campos.legenda)) sessionStorage.setItem(CHAVE_NOVO, JSON.stringify(Object.fromEntries(R.CAMPOS.map((k) => [k, campos[k]]))))
        else if (mudou) sessionStorage.removeItem(CHAVE_NOVO)
        return
      }
      if (!base) return
      const d = R.diferencas(base, campos)
      // Com conflito aberto o texto foi começado numa versão ANTERIOR à da base: o rascunho guarda essa, para
      // reabrir avisar ("a postagem foi salva por outra pessoa depois") em vez de parecer um rascunho comum.
      if (!conflito) versaoDoRascunho.current = null
      if (Object.keys(d).length) sessionStorage.setItem(chaveRascunho, JSON.stringify({ versao: versaoDoRascunho.current ?? base.versao, campos: d }))
      else sessionStorage.removeItem(chaveRascunho)
    } catch { /* modo privado */ }
  }, [base, campos, novo, chaveRascunho, anterior, !!conflito]) // eslint-disable-line react-hooks/exhaustive-deps
  // Trabalho pela metade, declarado (fechar a aba e "Atualizar agora" perguntam antes).
  const nomePost = (campos && String(campos.titulo || '').trim()) || (novo ? 'nova postagem' : 'postagem')
  const pendEdicao = usePendencia(sujo, { rotulo: (novo ? 'Nova postagem “' : 'Postagem “') + nomePost + '”: alterações não salvas', salvar: () => salvar(), guardaRascunho: true })
  usePendencia(!!comentario.trim(), { rotulo: 'Comentário digitado em “' + nomePost + '”, ainda não enviado' })
  // Registro aberto que MUDOU por fora e pede escolha: o indicador de sincronização e o "Atualizar agora" ficam sabendo.
  React.useEffect(() => { if (conflito) pendEdicao.sinalizarExterno(); else pendEdicao.limparExterno() }, [!!conflito, nomePost]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (!aviso) return undefined; const t = setTimeout(() => setAviso(''), 4000); return () => clearTimeout(t) }, [aviso])
  React.useEffect(() => { if (!copiado) return undefined; const t = setTimeout(() => setCopiado(false), 2500); return () => clearTimeout(t) }, [copiado])
  // Foco depois de abrir um bloco (Editar, pendência): o campo certo, sem pular a tela.
  React.useEffect(() => {
    const alvo = focoDepois.current
    if (!alvo) return
    focoDepois.current = null
    const el = document.getElementById(alvo)
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }) }
  })

  const post = base || {}
  const fechada = R.FECHADAS.includes(post.situacao)
  const podeEditar = pode('redes.editar') && !fechada
  const podeArquivos = pode('redes.arquivos') && !fechada && !novo
  const arquivos = carga ? carga.arquivos || [] : []
  const ativos = arquivos.filter((a) => !a.removido_em).sort((a, b) => a.ordem - b.ordem)
  const antigos = arquivos.filter((a) => a.removido_em)
  const { urls, erro: erroUrls, renovar } = useUrlsAssinadas([...ativos.map(fonteArq), ...ativos.map(miniDe)])
  // Rascunhos que ainda não têm onde ficar guardados: texto alternativo digitado, confirmação de publicação preenchida
  // e artes que esperam para subir (ou que falharam). Cada um declara a pendência (o envio em andamento já se declara em comEnvio).
  usePendencia(ativos.some((a) => alts[a.id] && norm(alts[a.id].v) !== norm(a.alt)), { rotulo: 'Texto alternativo digitado em “' + nomePost + '”, ainda não salvo' })
  usePendencia(!!confirma && !!(confirma.link.trim() || confirma.obs.trim()), { rotulo: 'Confirmação de publicação de “' + nomePost + '” preenchida, ainda não enviada' })
  usePendencia(envios.some((e) => e.estado === 'na_fila' || e.estado === 'erro'), { rotulo: 'Arte de “' + nomePost + '” que ainda não subiu (na fila ou com falha)', tipo: 'envio' })
  const eu = carga ? carga.eu : null
  // Substituir/remover arte de OUTRA pessoa: só redes.gerir (o banco confere de novo).
  const podeMexer = (a) => podeArquivos && (pode('redes.gerir') || (!!eu && a.criado_por_id === eu))

  function setCampo(k, v) { setCampos((c) => ({ ...c, [k]: v })) }
  const dh = R.partes(campos && campos.programado_para) || { data: '', hora: '' }
  const dataIn = dhLocal ? dhLocal.data : dh.data
  const horaIn = dhLocal ? dhLocal.hora : dh.hora
  function mudarDH(k, v) {
    const n = { data: dataIn, hora: horaIn, [k]: v }
    // Data digitada pela metade (ano "0002" enquanto se digita) não vira instante: antes devolvia null e apagava data E hora.
    if (n.data && n.hora) { const t = R.instanteDe(n.data, n.hora); if (t) { setCampo('programado_para', t); setDhLocal(null) } else setDhLocal(n) }
    else if (!n.data && !n.hora) { setCampo('programado_para', ''); setDhLocal(null) }
    else setDhLocal(n)
  }

  // ── Blocos em edição ──
  const sujas = novo ? [] : R.secoesSujas(mudancas)
  const emEdicao = (s) => !novo && (editando.has(s) || sujas.includes(s) || (s === 'programacao' && !!dhLocal))
  function editar(s, foco) {
    setEditando((x) => new Set(x).add(s))
    if (s === 'detalhes') setGavetas((x) => new Set(x).add('detalhes'))
    focoDepois.current = foco || null
  }
  function cancelarBloco(s) {
    const lidos = camposDe(base)
    setCampos((c) => ({ ...c, ...Object.fromEntries(R.SECOES[s].map((k) => [k, lidos[k]])) }))
    if (s === 'programacao') setDhLocal(null)
    setEditando((x) => { const n = new Set(x); n.delete(s); return n })
  }
  const alternarGaveta = (g, v) => setGavetas((x) => { const n = new Set(x); if (v) n.add(g); else n.delete(g); return n })

  async function gravar(baseLida, dados, enviados) {
    const p = await rpc('redes_salvar', { p_secret: lerSenha(), p_id: id, p_versao: baseLida.versao, p_dados: dados })
    definirBase(p)
    setCampos((atual) => {
      const n = camposDe(p)
      for (const k of R.CAMPOS) if (norm(atual[k]) !== norm(enviados[k])) n[k] = atual[k] // digitado durante o envio
      return n
    })
    setSalvoEm(p.atualizado_em)
    setConflitoChaves([])
    setExternoAdotado({ campos: [], quem: '' })
    setRecuperado(false)
    setEditando(new Set())
    onMudou()
    recarregar()
    return p
  }

  async function salvar() {
    if (novo) return criar()
    if (dhLocal) { setErroAcao('Informe data E hora — ou apague as duas para deixar sem data.'); return null }
    // Conflito aberto: só a escolha explícita ("Salvar as minhas por cima" / "Ficar com a versão salva") destrava.
    if (conflito) { setErroAcao('Escolha acima qual versão fica — a de ' + (base.atualizado_por_rotulo || 'outra pessoa') + ' ou a sua — antes de salvar.'); return null }
    const d = R.diferencas(base, campos)
    // Título e perfil não podem ficar vazios (o banco recusava com erro técnico).
    if ('titulo' in d && !norm(d.titulo).trim()) { setErroAcao('Dê um título à postagem.'); document.getElementById(idCampo('titulo'))?.focus(); return null }
    if ('perfil' in d && !norm(d.perfil).trim()) { setErroAcao('Escolha o perfil em que a postagem vai sair.'); return null }
    if (!Object.keys(d).length) { setEditando(new Set()); return base }
    setSalvando(true); setErroAcao(null)
    try { return await gravar(base, d, { ...campos }) }
    catch (e) { await tratarConflito(e); return null }
    finally { setSalvando(false) }
  }
  // Outra pessoa salvou antes (a versão que esta tela tinha ficou velha): relê e mescla. Campo mudado dos dois lados
  // vira o aviso com as duas versões (nunca sobrescreve calado); sem campo em conflito, a base já é a nova e é só salvar de novo.
  async function tratarConflito(e) {
    if (!/versao_desatualizada/.test(e.message)) { setErroAcao(e.message); return }
    const r = await recarregar({ aposFalha: true })
    if (r === null) setErroAcao(e.message)
  }

  async function manterMinhas() {
    setSalvando(true); setErroAcao(null)
    try { await gravar(conflito.salvo, conflito.meus, { ...campos }) }
    catch (e) { await tratarConflito(e) } // salvaram de novo no meio: compara outra vez
    finally { setSalvando(false) }
  }
  function usarSalva() {
    definirBase(conflito.salvo)
    setCampos(camposDe(conflito.salvo))
    setDhLocal(null)
    setConflitoChaves([])
    setExternoAdotado({ campos: [], quem: '' })
    setEditando(new Set())
  }
  function descartar() {
    if (novo) {
      const c = padraoNovo(); inicioNovo.current = c
      setCampos(c); setDhLocal(null); setRecuperado(false)
      try { sessionStorage.removeItem(CHAVE_NOVO) } catch { /* modo privado */ }
      return
    }
    setCampos(camposDe(base)); setDhLocal(null); setRecuperado(false); setEditando(new Set())
    try { sessionStorage.removeItem(chaveRascunho) } catch { /* modo privado */ }
  }

  async function criar(escolhidosAgora = null) {
    if (escolhidosAgora && escolhidosAgora.length) artesDoNovo.current = escolhidosAgora
    const arquivosEscolhidos = artesDoNovo.current
    if (!String(campos.titulo || '').trim()) {
      const n = arquivosEscolhidos ? arquivosEscolhidos.length : 0
      setErroAcao('Dê um título à postagem — é o único campo obrigatório.' + (n ? ' ' + (n > 1 ? 'As ' + n + ' artes escolhidas ficam guardadas' : 'A arte escolhida fica guardada') + ' e sobem ao criar.' : ''))
      document.getElementById(idCampo('titulo'))?.focus(); return null
    }
    if (dhLocal) { setErroAcao('Informe data E hora — ou apague as duas para deixar sem data.'); return null }
    const d = {}
    for (const k of R.CAMPOS) if (norm(campos[k]) !== '') d[k] = campos[k]
    setSalvando(true); setErroAcao(null)
    try {
      const p = await rpc('redes_criar', { p_secret: lerSenha(), p_dados: d })
      try { sessionStorage.removeItem(CHAVE_NOVO) } catch { /* modo privado */ }
      if (arquivosEscolhidos && arquivosEscolhidos.length) ENVIOS_PENDENTES.set(p.id, arquivosEscolhidos)
      artesDoNovo.current = null
      onMudou()
      onAbrir(p.id)
      return p
    } catch (e) { setErroAcao(e.message); return null }
    finally { setSalvando(false) }
  }

  // Ação de fluxo: salva antes o que estiver pendente; versão sempre a recém-lida.
  async function acao(nome, fn) {
    if (sujo) { const ok = await salvar(); if (!ok) return false }
    propria.current = true // a situação que a releitura trouxer é desta ação: não vira "a situação mudou"
    setOcupado(nome); setErroAcao(null)
    try { await fn(baseRef.current); await recarregar(); onMudou(); return true }
    catch (e) {
      if (/versao_desatualizada/.test(e.message)) { await recarregar(); setErroAcao('A postagem mudou enquanto você olhava. Confira e tente de novo.') }
      else setErroAcao(e.message)
      return false
    } finally { setOcupado(''); propria.current = false }
  }
  const situacao = (s, motivo) => acao('situacao', (b) => rpc('redes_situacao', { p_secret: lerSenha(), p_id: id, p_versao: b.versao, p_situacao: s, p_motivo: motivo || null }))

  async function fechar() {
    // Pelo Esc: a pergunta abre DEPOIS da tecla. Aberta durante ela, o próprio
    // Esc fechava o diálogo recém-aberto como "Voltar" — e nada aparecia.
    const subindo = envios.some((e) => e.estado !== 'feito')
    if (sujo || subindo) await new Promise((ok) => setTimeout(ok, 30))
    if (sujo && !(await confirmar('Fechar sem salvar? O que você digitou fica guardado neste aparelho e volta quando abrir esta postagem de novo.', { acao: 'Fechar sem salvar' }))) return
    // Arte ainda subindo (ou com falha) não pode ser largada em silêncio: ao fechar a ficha, o erro dela não aparece em lugar nenhum.
    if (subindo && !(await confirmar('Há arte ainda subindo ou que falhou. Se fechar agora, a postagem pode ficar sem ela e você não vê o erro.', { acao: 'Fechar mesmo assim', perigo: true }))) return
    onFechar()
  }

  // Baixar (o original, direto; vários → ZIP): estado, erro e "Tentar de novo" em BaixarArquivo.jsx.
  const baixar = (lista) => entrega.baixar(lista.map(itemDe), { numerar: lista.length > 1, nomeZip: post.titulo || 'postagem' })

  async function copiar(texto, rotulo) {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setAviso(rotulo + ' copiada. Cole no Instagram.') }
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
  // Rascunho do texto alternativo: { v: o que a pessoa digitou, base: o que o servidor tinha quando ela começou }.
  // Se outra pessoa mudou este texto no meio, o rascunho NÃO se grava sozinho ao sair do campo: ela escolhe.
  const descartarAlt = (idArq) => setAlts((x) => { const n = { ...x }; delete n[idArq]; return n })
  async function salvarAlt(a, forcar = false) {
    const d = alts[a.id]
    if (d == null || d.v === a.alt) return
    if (!forcar && R.altMudouFora(d, a.alt)) return
    try {
      const novo2 = await rpc('redes_arquivo_alt', { p_secret: lerSenha(), p_arquivo: a.id, p_alt: d.v })
      setCarga((c) => ({ ...c, arquivos: c.arquivos.map((x) => (x.id === a.id ? novo2 : x)) }))
      descartarAlt(a.id)
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

  // ── Render ──
  const titulo = novo ? 'Nova postagem' : (post.titulo || 'Postagem')
  useNomeDaTela('social', id, novo || carga ? titulo : null)
  if (!novo && !carga) {
    return (
      <Folha aberto titulo={titulo} sub="Carregando…" onFechar={onFechar} larga="ampla" cheia>
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
  const nomeResp = campos.responsavel_id ? ((equipe.find((e) => e.user_id === campos.responsavel_id) || {}).nome || post.responsavel_nome || 'Conta atual') : ''
  const story = campos.formato === 'story'
  const idPend = 'rd-pend-' + id
  const idEtapa = 'rd-etapa-' + id
  const aprova = pode('redes.aprovar')
  const nomesAprovadores = quemAprova(opcoes.aprovadores || [])
  const eAutora = !!eu && post.criado_por_id === eu
  const podeCancelar = !fechada && (pode('redes.gerir') || (eAutora && ['rascunho', 'preparacao', 'aprovacao'].includes(post.situacao)))
  const texto = R.textoCompleto(campos.legenda, campos.mencoes)
  const ultimoAjuste = [...comentarios].reverse().find((c) => c.ajuste) || null
  const participante = campos.participante_id ? ((opcoes.participantes || []).find((p) => p.id === campos.participante_id) || {}).nome || post.participante_nome || 'Participante' : ''
  // O limite do Instagram vale para o texto FINAL: legenda + menções (é o que "Copiar legenda" leva).
  const nLegenda = R.contarCaracteres(R.textoCompleto(campos.legenda, campos.mencoes))

  function irPara(pendencia) {
    const o = R.ONDE_PENDENCIA[pendencia] || { secao: 'detalhes', campo: 'titulo' }
    if (o.secao === 'arquivos') {
      if (!podeArquivos) { setAviso('A arte é enviada por quem tem acesso aos arquivos.'); return }
      if (ativos.length) alternarGaveta('arquivos', true)
      focoDepois.current = idCampo('arte')
      setAviso(ativos.length ? 'Envie ou troque a arte em “Arquivos”.' : 'Envie a arte no quadro da prévia.')
      return
    }
    if (!podeEditar) { setAviso('Esse campo não está liberado para a sua função.'); return }
    editar(o.secao, idCampo(o.campo))
  }
  async function pedirAjuste() {
    const t = await pedirTexto('O que precisa mudar em “' + post.titulo + '”? A postagem volta para quem cuida dela, com este comentário.', { rotulo: 'O que mudar' }, { acao: 'Pedir ajuste' })
    if (!t || !t.trim()) return
    if (await acao('ajuste', () => rpc('redes_comentar', { p_secret: lerSenha(), p_post: id, p_corpo: t, p_ajuste: true }))) {
      setAviso('Ajuste pedido. Quem cuida da postagem foi avisado.')
    }
  }
  function abrirConfirmacao() {
    setConfirma({ modo: 'agora', data: R.hoje(), hora: '', link: '', obs: '', sequencia: false })
    focoDepois.current = idEtapa + '-confirmar'
  }

  // A ÚNICA ação em destaque (rodapé). Com alteração não salva, é salvar.
  const principalBruta = (fechada && !sujo) || (novo && !pode('redes.editar')) ? null : R.proximaAcao({ novo, sujo: !novo && sujo, situacao: post.situacao || 'rascunho', bloqueios: bloqueios.length, pode, confirmando: !!confirma })
  // Mudou depois que quem aprova abriu: antes de "Aprovar", a pessoa confere (e o banco ainda recusa versão antiga).
  const principal = principalBruta && principalBruta.chave === 'aprovar' && mudouDepois ? { chave: 'conferir', rotulo: 'Conferi as mudanças', icone: 'feito' } : principalBruta
  function conferiMudancas() { vistaRef.current = R.conteudoParaAprovar(base, arquivos); setMudouDepois(null) }
  // O checklist avisa, não trava: com itens abertos pergunta e deixa seguir.
  async function checklistLiberaEnvio() {
    const pergunta = K.textoConfirmacaoEnvio(carga && carga.checklist)
    return !pergunta || confirmar(pergunta)
  }
  async function executarPrincipal() {
    if (!principal) return
    if (principal.chave === 'criar' || principal.chave === 'salvar') return salvar()
    if (principal.chave === 'enviar') {
      if (principal.bloqueada) { setAviso('Resolva o que falta (em “Próximo passo”) antes de enviar.'); focoDepois.current = idPend; return }
      if (!(await checklistLiberaEnvio())) return
      return situacao('aprovacao')
    }
    if (principal.chave === 'conferir') return conferiMudancas()
    if (principal.chave === 'aprovar') return situacao('pronto')
    if (principal.chave === 'confirmar') return abrirConfirmacao()
  }

  // Erro e alteração não salva vêm antes de qualquer aviso passageiro ("Legenda copiada").
  const estado = erroAcao ? <span className="rd-campo__nota--erro">{traduzirRedes(erroAcao)}</span>
    : salvando ? 'Salvando…'
    : conflito ? 'Outra pessoa salvou antes: escolha acima qual versão fica.'
    : !novo && sujo ? 'Alterações não salvas'
    : aviso ? aviso
    : novo ? 'Só o título é obrigatório. O resto pode ser completado depois.'
    : principal && principal.bloqueada ? 'Falta ' + bloqueios.length + (bloqueios.length === 1 ? ' item' : ' itens') + ' para enviar'
    : salvoEm ? 'Salvo às ' + R.horaCurta(R.partes(salvoEm).hora)
    : post.situacao === 'publicado' ? 'Publicada — o registro não muda mais'
    : post.situacao === 'cancelado' ? 'Cancelada' : 'Tudo salvo'
  const rodape = (
    <div className="rd-rodape">
      <p className="rd-rodape__estado" aria-live="polite">{estado}</p>
      {/* Uma ação só. Desfazer mora junto de cada bloco ("Cancelar") e no aviso de rascunho recuperado. */}
      <div className="ui-acoes">
        {principal && !(principal.chave === 'salvar' && (editando.size > 0 || sujas.length > 0 || !!dhLocal)) && (
          <Botao variante="destaque" icone={principal.icone} disabled={salvando || !!ocupado || (!!conflito && principal.chave === 'salvar')}
            aria-describedby={principal.bloqueada ? idPend : undefined} onClick={executarPrincipal}>
            {principal.chave === 'criar' && salvando ? 'Criando…' : principal.chave === 'salvar' && salvando ? 'Salvando…' : principal.rotulo}
          </Botao>
        )}
      </div>
    </div>
  )

  const sub = novo ? (voltaParticipante ? 'Ainda não criada · ao fechar, volta para o participante' : 'Ainda não criada')
    : <span className="rd-sub">
      <span>{(R.SITUACAO[post.situacao] || {}).rotulo}</span>
      <span>{post.programado_para ? R.quandoTexto(post.programado_para) : 'Sem data'}</span>
      <span>{post.responsavel_nome ? 'Resp.: ' + post.responsavel_nome : 'Sem responsável'}</span>
    </span>

  const selectResp = (
    <select value={campos.responsavel_id} onChange={(e) => { escolheuResp.current = true; setCampo('responsavel_id', e.target.value) }}>
      <option value="">Sem responsável</option>
      {respFora && <option value={campos.responsavel_id}>{post.responsavel_nome || 'Conta atual'} (sem acesso a redes)</option>}
      {equipe.map((e) => <option key={e.user_id} value={e.user_id}>{e.nome}</option>)}
    </select>
  )
  const camposData = (
    <>
      <Campo rotulo="Data" id={idCampo('data')}><input type="date" value={dataIn} onChange={(e) => mudarDH('data', e.target.value)} /></Campo>
      <Campo rotulo="Horário (Fortaleza)" id={idCampo('hora')}><input type="time" step={300} value={horaIn} onChange={(e) => mudarDH('hora', e.target.value)} /></Campo>
    </>
  )
  // No bloco "Legenda" o título do bloco já nomeia o campo: o rótulo fica só para o leitor de tela.
  const campoLegenda = (
    <Campo rotulo={story ? 'Legenda (opcional no Story)' : 'Legenda'} largo id={idCampo('legenda')} erro={nLegenda > R.LIMITE_LEGENDA_INSTAGRAM} rotuloOculto={!novo}
      nota={nLegenda > R.LIMITE_LEGENDA_INSTAGRAM ? nLegenda + ' caracteres — o Instagram aceita até ' + R.LIMITE_LEGENDA_INSTAGRAM + '. Encurte.'
        : nLegenda + ' de ' + R.LIMITE_LEGENDA_INSTAGRAM + ' caracteres' + (campos.mencoes ? ' (legenda + menções)' : '') + ' · hashtags podem ir aqui mesmo'}>
      <textarea rows={8} maxLength={5000} value={campos.legenda} onChange={(e) => setCampo('legenda', e.target.value)} />
    </Campo>
  )
  const campoMencoes = (
    <Campo rotulo="Perfis a mencionar" largo nota="Ex.: @jolie.cafe @outraconta — entram no fim da legenda copiada." id={idCampo('mencoes')}>
      <input type="text" maxLength={500} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={campos.mencoes} onChange={(e) => setCampo('mencoes', e.target.value)} />
    </Campo>
  )
  const campoObs = (
    <Campo rotulo="Observações para quem publica" largo nota="Ex.: marcar a localização, música do Reel, horário que a marca pediu.">
      <textarea rows={3} maxLength={2000} value={campos.observacoes} onChange={(e) => setCampo('observacoes', e.target.value)} />
    </Campo>
  )
  // Campanha: uma por postagem (ou nenhuma). A arquivada só aparece se a postagem já a tem.
  const listaCampanhas = [...(opcoes.campanhas || []), ...campanhasNovas.filter((n) => !(opcoes.campanhas || []).some((c) => c.id === n.id))]
  const campoCampanha = (
    <Campo rotulo="Campanha" nota="Opcional. Agrupa as postagens de uma mesma ação.">
      <select value={campos.campanha_id || ''} onChange={(e) => { if (e.target.value === '__nova__') setNovaCampanha(true); else setCampo('campanha_id', e.target.value) }}>
        <option value="">Nenhuma</option>
        {listaCampanhas.filter((c) => !c.arquivada || c.id === campos.campanha_id).map((c) => <option key={c.id} value={c.id}>{c.nome}{c.arquivada ? ' (arquivada)' : ''}</option>)}
        {pode('redes.editar') && <option value="__nova__">Nova campanha…</option>}
      </select>
    </Campo>
  )
  const camposDetalhes = (
    <div className="rd-grade">
      <Campo rotulo="Título (só a equipe vê)" largo id={idCampo('titulo')}><input type="text" maxLength={120} required placeholder="Ex.: Carrossel do combo, lançamento" value={campos.titulo} onChange={(e) => setCampo('titulo', e.target.value)} /></Campo>
      <Campo rotulo="Formato" nota={R.requisitoFormato(campos.formato)}>
        <select value={campos.formato} onChange={(e) => setCampo('formato', e.target.value)}>
          {R.FORMATOS.map((x) => <option key={x.chave} value={x.chave}>{x.rotulo}</option>)}
        </select>
      </Campo>
      <Campo rotulo="Perfil de destino">
        <input type="text" maxLength={60} autoCapitalize="none" list={'rd-perfis-' + id} value={campos.perfil} onChange={(e) => setCampo('perfil', e.target.value)} />
      </Campo>
      <datalist id={'rd-perfis-' + id}>{[...new Set([R.PERFIL_PADRAO, ...(opcoes.perfis || [])])].map((p) => <option key={p} value={p} />)}</datalist>
      <Campo rotulo="Edição">
        <select value={campos.edicao_codigo} onChange={(e) => setCampo('edicao_codigo', e.target.value)}>
          <option value="">Institucional (sem edição)</option>
          {(opcoes.edicoes || []).map((e) => <option key={e.codigo} value={e.codigo}>{e.codigo} · {e.nome}</option>)}
        </select>
      </Campo>
      {campoCampanha}
      <Campo rotulo="Participante associado">
        <select value={campos.participante_id} onChange={(e) => setCampo('participante_id', e.target.value)}>
          <option value="">Nenhum</option>
          {(opcoes.participantes || []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </Campo>
      <Campo rotulo="Referências ou briefing" largo>
        <textarea rows={3} maxLength={2000} value={campos.referencias} onChange={(e) => setCampo('referencias', e.target.value)} />
      </Campo>
    </div>
  )
  const envioLista = envios.length > 0 && (
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
  )
  // Sem arte: o envio mora no quadro da prévia (um lugar só para o mesmo campo).
  const envioNoQuadro = novo
    ? pode('redes.arquivos') && (
      <label className="rd-soltar">
        <Icone nome="mais" tamanho={20} />
        <span>Escolher a arte</span>
        <span className="rd-campo__nota">Cria o rascunho e envia a arte em seguida.</span>
        <input type="file" multiple accept={R.ACEITE} className="ui-oculto" id={idCampo('arte')}
          onChange={(e) => { const l = [...e.target.files]; e.target.value = ''; if (l.length) criar(l) }} />
      </label>
    )
    : podeArquivos && !ativos.length && (
      <>
        <label className="rd-soltar">
          <Icone nome="mais" tamanho={20} />
          <span>Enviar a arte</span>
          <span className="rd-campo__nota">JPG, PNG, WEBP, MP4 ou MOV, até 50 MB. Pode escolher vários.</span>
          <input type="file" multiple accept={R.ACEITE} className="ui-oculto" id={idCampo('arte')} onChange={(e) => { if (e.target.files.length) adicionarEnvios(e.target.files); e.target.value = '' }} />
        </label>
        <Botao variante="secundario" icone="pasta" onClick={() => { setBiblioteca(true); alternarGaveta('arquivos', true) }}>Escolher da biblioteca</Botao>
      </>
    )

  return (
    <>
    <Folha aberto titulo={titulo} sub={sub} onFechar={fechar} larga="ampla" cheia rodape={rodape}>
      <div className="rd-ficha-c">
        <div className={'rd-ficha' + (novo ? ' rd-ficha--novo' : '')}>
          <div className="rd-ficha__previa">
            <Previa arquivos={ativos} urls={urls} erroUrls={erroUrls} renovar={renovar} formato={campos.formato} entrega={entrega} nomeConjunto={post.titulo || 'postagem'} vazio={envioNoQuadro} />
            {envioLista}
            {story && ativos.length > 1 && <p className="rd-campo__nota">Sequência de {ativos.length} stories no mesmo registro: a confirmação vale para a sequência inteira.</p>}
          </div>

          <div className="rd-ficha__dados">
            {recuperado && (
              <div className="og-aviso" role="status">
                <p>{novo ? 'Recuperei a postagem nova que não tinha sido criada neste aparelho.'
                  : recuperado === 'antiga' ? 'Recuperei alterações que não tinham sido salvas neste aparelho — mas a postagem foi salva por outra pessoa depois. Confira antes de salvar: salvar põe as suas por cima nesses campos.'
                  : 'Recuperei alterações que não tinham sido salvas neste aparelho.'}</p>
                <div className="ui-acoes">{!novo && <Botao onClick={salvar}>Salvar agora</Botao>}<Botao variante="secundario" onClick={descartar}>Descartar</Botao></div>
              </div>
            )}
            {anterior && (
              <div className="og-aviso" role="status">
                <p>Há uma postagem nova não criada, de antes: <b>“{anterior.titulo || 'sem título'}”</b>. Esta foi preenchida com os dados do participante.</p>
                <div className="ui-acoes">
                  <Botao variante="secundario" onClick={() => { const c = { ...padraoNovo(), ...Object.fromEntries(Object.entries(anterior).filter(([k]) => R.CAMPOS.includes(k))) }; inicioNovo.current = c; setCampos(c); setAnterior(null) }}>Continuar a de antes</Botao>
                  <Botao variante="secundario" onClick={() => setAnterior(null)}>Seguir com a do participante</Botao>
                </div>
              </div>
            )}

            {!conflito && externoAdotado.campos.length > 0 && (
              <AvisoMudancaExterna quem={externoAdotado.quem || 'outra pessoa'} rotulos={ROTULO_CAMPO}
                registro={{ conflitos: {}, adotados: externoAdotado.campos, dispensar: () => setExternoAdotado({ campos: [], quem: '' }) }} />
            )}
            {mudouDepois && pode('redes.aprovar') && ['aprovacao', 'rascunho', 'preparacao'].includes(post.situacao) && (
              <div className="og-aviso rd-mudou" role="alert">
                <p><b>{mudouDepois.quem}</b> mudou {R.textoPartes(mudouDepois.partes)}{mudouDepois.em ? ' às ' + R.horaCurta(R.partes(mudouDepois.em).hora) : ''} depois que você abriu esta postagem. Confira antes de aprovar.</p>
                <Botao variante="secundario" icone="feito" onClick={conferiMudancas}>Conferi as mudanças</Botao>
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

            {novo ? (
              <section className="rd-novo" aria-label="Dados essenciais">
                {inicial && inicial.doParticipante && participante && (() => {
                  const veio = [inicial.campos.legenda && 'a legenda', inicial.campos.mencoes && 'o @ da casa (em “Mais detalhes”)'].filter(Boolean)
                  return <p className="rd-campo__nota">Vinculada a <b>{participante}</b>{veio.length ? ': ' + veio.join(' e ') + (veio.length > 1 ? ' já vieram preenchidos.' : ' já veio preenchido.') : '.'}</p>
                })()}
                <div className="rd-grade">
                  <Campo rotulo="Título (só a equipe vê)" largo id={idCampo('titulo')}><input type="text" maxLength={120} required enterKeyHint="next" placeholder="Ex.: Carrossel do combo, lançamento" value={campos.titulo} onChange={(e) => setCampo('titulo', e.target.value)} /></Campo>
                  <Campo rotulo="Formato" nota={R.requisitoFormato(campos.formato)}>
                    <select value={campos.formato} onChange={(e) => setCampo('formato', e.target.value)}>
                      {R.FORMATOS.map((x) => <option key={x.chave} value={x.chave}>{x.rotulo}</option>)}
                    </select>
                  </Campo>
                  <Campo rotulo="Responsável" id={idCampo('resp')}>{selectResp}</Campo>
                  {camposData}
                </div>
                {dhLocal && <p className="rd-campo__nota rd-campo__nota--erro" role="alert">Falta {dhLocal.data ? 'o horário' : 'a data'} — ou apague os dois para ficar sem data.</p>}
                {campoLegenda}
                <details className="rd-gaveta">
                  <summary>Mais detalhes (opcional)</summary>
                  <div className="rd-gaveta__corpo">
                    {campoMencoes}
                    {campoObs}
                    <div className="rd-grade">
                      <Campo rotulo="Perfil de destino">
                        <input type="text" maxLength={60} autoCapitalize="none" list={'rd-perfis-' + id} value={campos.perfil} onChange={(e) => setCampo('perfil', e.target.value)} />
                      </Campo>
                      <datalist id={'rd-perfis-' + id}>{[...new Set([R.PERFIL_PADRAO, ...(opcoes.perfis || [])])].map((p) => <option key={p} value={p} />)}</datalist>
                      <Campo rotulo="Edição">
                        <select value={campos.edicao_codigo} onChange={(e) => setCampo('edicao_codigo', e.target.value)}>
                          <option value="">Institucional (sem edição)</option>
                          {(opcoes.edicoes || []).map((e) => <option key={e.codigo} value={e.codigo}>{e.codigo} · {e.nome}</option>)}
                        </select>
                      </Campo>
                      {campoCampanha}
                      <Campo rotulo="Participante associado">
                        <select value={campos.participante_id} onChange={(e) => setCampo('participante_id', e.target.value)}>
                          <option value="">Nenhum</option>
                          {(opcoes.participantes || []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                      </Campo>
                      <Campo rotulo="Referências ou briefing" largo>
                        <textarea rows={3} maxLength={2000} value={campos.referencias} onChange={(e) => setCampo('referencias', e.target.value)} />
                      </Campo>
                    </div>
                  </div>
                </details>
              </section>
            ) : (
              <>
                {/* Legenda: leitura confortável; editar no lugar. */}
                <Bloco titulo={story ? 'Legenda (opcional no Story)' : 'Legenda'} className="rd-legenda"
                  acoes={!emEdicao('legenda') && <>
                    {texto && <Botao variante="secundario" icone={copiado ? 'feito' : 'copiar'} onClick={() => copiar(texto, 'Legenda')}>{copiado ? 'Copiada' : 'Copiar legenda'}</Botao>}
                    {podeEditar && <Botao variante="secundario" icone="editar" onClick={() => editar('legenda', idCampo('legenda'))}>Editar</Botao>}
                  </>}>
                  {emEdicao('legenda') ? (
                    <div className="rd-bloco__form">
                      {campoLegenda}
                      <AcoesEdicao salvando={salvando} onSalvar={salvar} onCancelar={() => cancelarBloco('legenda')} podeSalvar={!conflito} />
                    </div>
                  ) : (
                    <>
                      {campos.legenda.trim() ? <div className="rd-legenda__texto">{campos.legenda}</div> : <p className="rd-falta">{story ? 'Sem legenda (o Story não exige).' : 'Sem legenda ainda.'}</p>}
                      {texto && (
                        <p className={'rd-legenda__conta' + (nLegenda > R.LIMITE_LEGENDA_INSTAGRAM ? ' rd-campo__nota--erro' : '')}>
                          {nLegenda} de {R.LIMITE_LEGENDA_INSTAGRAM} caracteres{campos.mencoes ? ' (legenda + menções, que “Copiar legenda” leva junto)' : ''}
                        </p>
                      )}
                    </>
                  )}
                  {/* Menções e observações: menor destaque, edição própria. */}
                  {emEdicao('extras') ? (
                    <div className="rd-bloco__form">
                      {campoMencoes}
                      {campoObs}
                      <AcoesEdicao salvando={salvando} onSalvar={salvar} onCancelar={() => cancelarBloco('extras')} podeSalvar={!conflito} />
                    </div>
                  ) : (campos.mencoes || campos.observacoes || podeEditar) && (
                    <div className="rd-legenda__extras">
                      {campos.mencoes && <p className="rd-legenda__extra"><span>Menções</span> {campos.mencoes}</p>}
                      {campos.observacoes && <p className="rd-legenda__extra"><span>Para quem publica</span> {campos.observacoes}</p>}
                      {podeEditar && (
                        <button type="button" className="rd-link rd-legenda__editar" onClick={() => editar('extras', idCampo('mencoes'))}>
                          {campos.mencoes || campos.observacoes ? 'Editar menções e observações' : 'Adicionar menções ou observações para quem publica'}
                        </button>
                      )}
                    </div>
                  )}
                </Bloco>

                {/* Programação: data, horário e responsável à vista. */}
                <Bloco titulo="Programação" className="rd-prog-bloco"
                  acoes={!emEdicao('programacao') && podeEditar && <Botao variante="secundario" icone="editar" onClick={() => editar('programacao', idCampo('data'))}>Editar</Botao>}>
                  {emEdicao('programacao') ? (
                    <div className="rd-bloco__form">
                      <div className="rd-grade">
                        {camposData}
                        <Campo rotulo="Responsável pela publicação" id={idCampo('resp')}>{selectResp}</Campo>
                      </div>
                      {dhLocal && <p className="rd-campo__nota rd-campo__nota--erro" role="alert">Falta {dhLocal.data ? 'o horário' : 'a data'}.</p>}
                      {opcoes.carregadas && !equipe.length && <p className="rd-campo__nota">Ninguém da equipe tem acesso a redes ainda. Em Administração › Equipe, dê a função “Social media” (ou Administrador) a quem vai publicar.</p>}
                      <div className="ui-acoes">
                        {(campos.programado_para || dhLocal) && <Botao variante="secundario" onClick={() => { setCampo('programado_para', ''); setDhLocal(null) }}>Tirar a data (vai para “Sem data”)</Botao>}
                      </div>
                      <AcoesEdicao salvando={salvando} onSalvar={salvar} onCancelar={() => cancelarBloco('programacao')} podeSalvar={!conflito} />
                    </div>
                  ) : (
                    <dl className="rd-prog">
                      <div><dt>Quando</dt><dd>{campos.programado_para ? R.quandoTexto(campos.programado_para) + ' (Fortaleza)' : <span className="rd-falta">Sem data — fica em “Sem data”</span>}</dd></div>
                      <div><dt>Responsável</dt><dd>{campos.responsavel_id ? <Autor id={campos.responsavel_id} rotulo={nomeResp} tamanho={24} /> : <span className="rd-falta">Sem responsável</span>}</dd></div>
                      <div><dt>Perfil</dt><dd>{campos.perfil || R.PERFIL_PADRAO} · {(R.FORMATO[campos.formato] || {}).rotulo}</dd></div>
                    </dl>
                  )}
                </Bloco>

                {/* Próximo passo: o que a etapa pede, e quem faz. A ação principal está no rodapé. */}
                <section className="rd-etapa-bloco" id={idEtapa} aria-labelledby={idEtapa + '-t'} data-situacao={post.situacao}>
                  <h3 id={idEtapa + '-t'}>{post.situacao === 'publicado' ? 'Publicação' : post.situacao === 'cancelado' ? 'Situação' : 'Próximo passo'}</h3>
                  {post.ajuste_aberto && ultimoAjuste && (
                    <div className="rd-ajuste" role="note">
                      <p className="rd-ajuste__quem"><Autor id={ultimoAjuste.autor_id} rotulo={ultimoAjuste.autor_rotulo} tamanho={20}>
                        <span className="ui-autor__nota"> pediu ajuste · {R.quandoTexto(ultimoAjuste.criado_em)}</span></Autor></p>
                      <p className="rd-ajuste__texto">{ultimoAjuste.corpo}</p>
                    </div>
                  )}
                  {(post.situacao === 'rascunho' || post.situacao === 'preparacao') && (
                    bloqueios.length > 0 ? (
                      <div id={idPend} className="rd-pendencias" tabIndex={-1}>
                        <p>Para enviar para aprovação, falta:</p>
                        <ul>{bloqueios.map((p) => (
                          <li key={p}><button type="button" className="rd-pendencia" onClick={() => irPara(p)}>
                            <Icone nome="atencao" tamanho={16} />{R.PENDENCIAS[p]}<span className="ui-oculto"> — ir ao campo</span></button></li>
                        ))}</ul>
                      </div>
                    ) : <p className="rd-etapa">{sujo ? 'Salve as alterações; depois, envie para aprovação.'
                      : post.ajuste_aberto ? 'Faça o ajuste pedido acima e envie de novo para aprovação.'
                      : 'Tudo pronto: envie para aprovação' + (aprova ? '.' : ' de ' + nomesAprovadores + '.')}</p>
                  )}
                  {post.situacao === 'aprovacao' && (
                    <p className="rd-etapa">{aprova ? 'Confira a arte e a legenda. Aprove — ou peça ajuste dizendo o que mudar.' : 'Enviada. Aguardando aprovação de ' + nomesAprovadores + ' — você recebe um aviso.'}</p>
                  )}
                  {post.situacao === 'pronto' && !confirma && (
                    <p className="rd-etapa">Aprovada. Baixe a arte e copie a legenda, publique pelo Instagram e depois confirme aqui.</p>
                  )}
                  {post.situacao === 'cancelado' && (
                    <p className="rd-etapa">Cancelada{post.cancelado_em ? ' em ' + R.quandoTexto(post.cancelado_em) : ''}{post.motivo_cancelamento ? ' — ' + post.motivo_cancelamento : ''}. O histórico fica guardado.</p>
                  )}
                  {pend.includes('atrasada') && <p className="rd-campo__nota"><Icone nome="atencao" tamanho={16} /> Atrasada: o horário previsto já passou.</p>}
                  {conflitos.length > 0 && (
                    <p className="rd-campo__nota">
                      No mesmo perfil, a menos de {R.JANELA_CONFLITO_MIN} min: {conflitos.map((c, i) => (
                        <React.Fragment key={c.id}>{i > 0 && ', '}<button type="button" className="rd-link" onClick={() => onAbrir(c.id)}>{c.titulo} ({R.quandoTexto(c.programado_para)})</button></React.Fragment>
                      ))}. Não bloqueia — confira se é intencional.
                    </p>
                  )}

                  {post.situacao === 'publicado' && (
                    <>
                      <dl className="rd-dados">
                        <div><dt>Publicado em</dt><dd>{R.quandoTexto(post.publicado_em)}</dd></div>
                        <div><dt>Quem confirmou</dt><dd><Autor id={post.publicado_por_id} rotulo={post.publicado_por_rotulo} tamanho={24}>
                          {post.confirmado_em ? <span className="ui-autor__nota"> · {R.quandoTexto(post.confirmado_em)}</span> : null}</Autor></dd></div>
                        <div><dt>Link</dt><dd>{post.link_publicado
                          ? <a className="rd-link" href={post.link_publicado} target="_blank" rel="noopener noreferrer">Abrir no Instagram<span className="ui-oculto"> (abre em outra aba)</span></a> : 'Sem link'}</dd></div>
                        {post.obs_execucao && <div><dt>Observação</dt><dd>{post.obs_execucao}</dd></div>}
                        {post.formato === 'story' && <div><dt>Vale para</dt><dd>A sequência inteira ({(post.publicado_snapshot && post.publicado_snapshot.arquivos || []).length} stories)</dd></div>}
                      </dl>
                      {post.publicado_snapshot && (
                        <details className="rd-retrato">
                          <summary>O que foi ao ar (registro fixo)</summary>
                          <p className="rd-retrato__legenda">{post.publicado_snapshot.legenda || '(sem legenda)'}</p>
                          {post.publicado_snapshot.mencoes && <p>Menções: {post.publicado_snapshot.mencoes}</p>}
                          <ol>{(post.publicado_snapshot.arquivos || []).map((a) => <li key={a.id}>{a.nome}{a.versao > 1 ? ' (versão ' + a.versao + ')' : ''}{a.alt ? ' — alt: ' + a.alt : ''}</li>)}</ol>
                        </details>
                      )}
                    </>
                  )}

                  {confirma && post.situacao !== 'cancelado' && (
                    <form className="rd-confirmar" aria-label="Confirmar publicação" onSubmit={async (e) => {
                      e.preventDefault()
                      const quando = confirma.modo === 'agora' ? new Date().toISOString() : R.instanteDe(confirma.data, confirma.hora)
                      if (!quando) { setErroAcao('Informe a data e a hora em que foi publicado.'); return }
                      const ok = await acao('confirmar', (b) => rpc('redes_confirmar', { p_secret: lerSenha(), p_id: id, p_versao: b.versao, p_publicado_em: quando, p_link: confirma.link.trim() || null, p_obs: confirma.obs.trim() || null }))
                      if (ok) { setConfirma(null); setAviso(post.situacao === 'publicado' ? 'Execução corrigida.' : 'Publicação confirmada.') }
                    }}>
                      <h4 id={idEtapa + '-confirmar'} tabIndex={-1}>{post.situacao === 'publicado' ? 'Corrigir dados da publicação' : 'Confirmar publicação'}</h4>
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
                        <input type="url" inputMode="url" autoCapitalize="none" placeholder="https://www.instagram.com/p/…" value={confirma.link} onChange={(e) => setConfirma({ ...confirma, link: e.target.value })} />
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

                  <div className="ui-acoes rd-etapa__acoes">
                    {(post.situacao === 'rascunho' || post.situacao === 'preparacao') && aprova && pode('redes.editar') && (
                      <Botao icone="sucesso" variante="secundario" disabled={bloqueios.length > 0 || !!ocupado || !!mudouDepois} onClick={() => situacao('pronto')}>Aprovar direto</Botao>
                    )}
                    {post.situacao === 'aprovacao' && aprova && <Botao icone="editar" variante="secundario" disabled={!!ocupado} onClick={pedirAjuste}>Pedir ajuste</Botao>}
                    {post.situacao === 'aprovacao' && !aprova && pode('redes.editar') && <Botao variante="secundario" disabled={!!ocupado} onClick={() => situacao('rascunho')}>Retirar da aprovação</Botao>}
                    {post.situacao === 'pronto' && aprova && <Botao icone="editar" variante="secundario" disabled={!!ocupado} onClick={pedirAjuste}>Pedir ajuste</Botao>}
                    {post.situacao === 'pronto' && !aprova && pode('redes.editar') && <Botao variante="secundario" disabled={!!ocupado} onClick={() => situacao('rascunho')}>Voltar para rascunho</Botao>}
                    {post.situacao === 'cancelado' && pode('redes.gerir') && <Botao icone="restaurar" variante="secundario" onClick={() => situacao('rascunho')}>Reabrir como rascunho</Botao>}
                    <MaisAcoes itens={[
                      pode('redes.editar') && { rotulo: 'Duplicar como rascunho', icone: 'copiar', onClick: async () => {
                        setOcupado('duplicar')
                        try { const d = await rpc('redes_duplicar', { p_secret: lerSenha(), p_id: id }); onMudou(); onAbrir(d.id) } catch (e) { setErroAcao(e.message) } finally { setOcupado('') }
                      } },
                      !fechada && aprova && post.situacao === 'rascunho' && { rotulo: 'Pedir ajuste', icone: 'editar', onClick: pedirAjuste },
                      post.situacao === 'publicado' && pode('redes.gerir') && !confirma && { rotulo: 'Corrigir dados da publicação', icone: 'editar', onClick: () => {
                        const p2 = R.partes(post.publicado_em) || { data: R.hoje(), hora: '' }
                        setConfirma({ modo: 'outro', data: p2.data, hora: p2.hora, link: post.link_publicado || '', obs: post.obs_execucao || '', sequencia: true })
                        focoDepois.current = idEtapa + '-confirmar'
                      } },
                      post.situacao === 'publicado' && pode('redes.gerir') && { rotulo: 'Desfazer confirmação de publicação', icone: 'restaurar', perigo: true, onClick: async () => {
                        const motivo = await pedirTexto('Desfazer a confirmação de publicação? Volta para "Aprovado"; o registro fica no histórico.', { rotulo: 'Motivo (obrigatório)' }, { acao: 'Desfazer confirmação' })
                        if (motivo && motivo.trim()) acao('desfazer', (b) => rpc('redes_desfazer_publicacao', { p_secret: lerSenha(), p_id: id, p_versao: b.versao, p_motivo: motivo }))
                      } },
                      podeCancelar && { rotulo: 'Cancelar postagem', icone: 'excluir', perigo: true, onClick: async () => {
                        const motivo = await pedirTexto('Cancelar “' + post.titulo + '”? Ela sai do calendário; arquivos e histórico ficam guardados.', { rotulo: 'Motivo (opcional)' }, { acao: 'Cancelar postagem' })
                        if (motivo !== null) situacao('cancelado', motivo)
                      } },
                    ]} />
                  </div>
                </section>

                <p className="rd-ultima">
                  Última alteração: <Autor id={post.atualizado_por_id} rotulo={post.atualizado_por_rotulo} tamanho={20}>
                    <span className="ui-autor__nota"> · {R.quandoTexto(post.atualizado_em)}</span></Autor>
                  {post.criado_por_rotulo && <> · criada por <Autor id={post.criado_por_id} rotulo={post.criado_por_rotulo} tamanho={20} /></>}
                </p>

                {/* O resto, recolhido: abre quando precisa. */}
                <ChecklistPostagem postId={id} itens={(carga && carga.checklist) || []} fechada={fechada} podeEditar={podeEditar}
                  onItens={(fn) => setCarga((c) => (c ? { ...c, checklist: fn(c.checklist || []) } : c))} />

                <Gaveta titulo="Detalhes: título interno, formato, edição, campanha e participante" aberto={gavetas.has('detalhes') || emEdicao('detalhes')} travada={emEdicao('detalhes')} onAlternar={(v) => alternarGaveta('detalhes', v)}>
                  {emEdicao('detalhes') ? (
                    <div className="rd-bloco__form">
                      {camposDetalhes}
                      <AcoesEdicao salvando={salvando} onSalvar={salvar} onCancelar={() => cancelarBloco('detalhes')} podeSalvar={!conflito} />
                    </div>
                  ) : (
                    <>
                      <dl className="rd-dados">
                        <div><dt>Título interno</dt><dd>{campos.titulo}</dd></div>
                        <div><dt>Formato</dt><dd>{(R.FORMATO[campos.formato] || {}).rotulo} — <span className="rd-campo__nota">{R.requisitoFormato(campos.formato)}</span></dd></div>
                        <div><dt>Perfil</dt><dd>{campos.perfil || R.PERFIL_PADRAO}</dd></div>
                        <div><dt>Edição</dt><dd>{campos.edicao_codigo || 'Institucional (sem edição)'}</dd></div>
                        <div><dt>Campanha</dt><dd>{(campanhaDaPostagem(post) && campos.campanha_id === post.campanha_id ? post.campanha_nome : (listaCampanhas.find((c) => c.id === campos.campanha_id) || {}).nome) || 'Nenhuma'}</dd></div>
                        <div><dt>Participante</dt><dd>{participante || 'Nenhum'}</dd></div>
                        {campos.referencias && <div><dt>Referências</dt><dd className="rd-pre">{campos.referencias}</dd></div>}
                      </dl>
                      <div className="ui-acoes">
                        {podeEditar && <Botao variante="secundario" icone="editar" onClick={() => editar('detalhes', idCampo('titulo'))}>Editar detalhes</Botao>}
                        {campos.participante_id && onVerParticipante && pode('editorial.ler') && (
                          <Botao variante="secundario" icone="ficha" onClick={() => onVerParticipante(campos.participante_id, campos.edicao_codigo)}>Ver participante e combo</Botao>
                        )}
                      </div>
                    </>
                  )}
                </Gaveta>

                <Gaveta titulo={'Arquivos e versões (' + ativos.length + ')'} aberto={gavetas.has('arquivos')} onAlternar={(v) => alternarGaveta('arquivos', v)}>
                  <p className="rd-campo__nota">{story ? 'Stories da sequência, na ordem.' : campos.formato === 'carrossel' ? 'Ordem do carrossel: o primeiro é a capa.' : 'JPG, PNG, WEBP, MP4 ou MOV, até 50 MB.'}</p>
                  {ativos.length > 0 && (
                    <ol className="rd-arquivos">
                      {ativos.map((a, i) => (
                        <li key={a.id} className="rd-arquivo">
                          <Miniatura path={miniDe(a)} formato={campos.formato} urls={urls} renovar={renovar} grande />
                          <div className="rd-arquivo__info">
                            <p className="rd-arquivo__nome"><span className="rd-arquivo__pos">{i + 1}.</span> {a.nome}</p>
                            <p className="rd-campo__nota">
                              {[R.TIPOS[a.mime] && R.TIPOS[a.mime].toUpperCase(), a.largura && a.altura ? a.largura + '×' + a.altura : null,
                                a.duracao != null ? String(a.duracao).replace('.', ',') + ' s' : null, tamanhoLegivel(a.tamanho), a.versao > 1 ? 'versão ' + a.versao : null,
                                a.origem && a.origem !== 'envio' ? (ROTULO_ORIGEM[a.origem] || 'Biblioteca') : null].filter(Boolean).join(' · ')}
                            </p>
                            <p className="rd-campo__nota rd-arquivo__origem">
                              <Autor id={a.criado_por_id} rotulo={a.criado_por_rotulo} tamanho={20}>
                                <span className="ui-autor__nota"> · {a.origem && a.origem !== 'envio' ? 'associou' : 'enviou'} {R.quandoTexto(a.criado_em)}</span></Autor>
                            </p>
                            {eImagem(a) && (
                              <div className="og-campo">
                                <span><label htmlFor={'rd-alt-' + a.id}>Texto alternativo</label></span>
                                <textarea id={'rd-alt-' + a.id} rows={2} maxLength={1000} value={(alts[a.id] ? alts[a.id].v : a.alt) ?? ''} disabled={!podeArquivos}
                                  placeholder="Descreva a imagem para quem usa leitor de tela"
                                  onChange={(e) => { const v = e.target.value; setAlts((x) => ({ ...x, [a.id]: { v, base: x[a.id] ? x[a.id].base : norm(a.alt) } })) }} onBlur={() => salvarAlt(a)} />
                              </div>
                            )}
                            {eImagem(a) && R.altMudouFora(alts[a.id], a.alt) && (
                              <div className="og-aviso" role="status">
                                <p>Outra pessoa mudou este texto para “{String(a.alt || '(vazio)').slice(0, 200)}”. O seu continua aqui e não foi salvo.</p>
                                <div className="ui-acoes">
                                  <Botao variante="secundario" onClick={() => descartarAlt(a.id)}>Usar o novo</Botao>
                                  <Botao variante="secundario" onClick={() => salvarAlt(a, true)}>Salvar o meu por cima</Botao>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="rd-arquivo__acoes">
                            {podeArquivos && ativos.length > 1 && <BotaoIcone icone="seta-esquerda" rotulo="Mover para antes" alvo={a.nome} disabled={i === 0 || !!ocupado} onClick={() => moverArquivo(i, -1)} />}
                            {podeArquivos && ativos.length > 1 && <BotaoIcone icone="seta-direita" rotulo="Mover para depois" alvo={a.nome} disabled={i === ativos.length - 1 || !!ocupado} onClick={() => moverArquivo(i, 1)} />}
                            <BotaoIcone icone="baixar" rotulo="Baixar" alvo={a.nome} disabled={entregaGaveta.ocupado} onClick={() => entregaGaveta.baixar([itemDe(a)])} />
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
                  {podeArquivos && ativos.some((a) => !podeMexer(a)) && (
                    <p className="rd-campo__nota">Arte enviada por outra pessoa (o designer) só a administração substitui ou remove. Precisa de ajuste? Use “Pedir ajuste” nos comentários.</p>
                  )}
                  {podeArquivos && (
                    <div className="ui-acoes">
                      {ativos.length > 0 && (
                        <label className="og-btn og-btn--mini og-btn--vazado rd-enviar-mais">
                          <Icone nome="mais" tamanho={16} />Enviar mais arquivos
                          <input type="file" multiple accept={R.ACEITE} className="ui-oculto" id={idCampo('arte')} onChange={(e) => { if (e.target.files.length) adicionarEnvios(e.target.files); e.target.value = '' }} />
                        </label>
                      )}
                      <Botao variante="secundario" icone="pasta" aria-expanded={biblioteca} onClick={() => setBiblioteca((x) => !x)}>
                        {biblioteca ? 'Fechar a biblioteca' : 'Escolher da biblioteca'}
                      </Botao>
                    </div>
                  )}
                  {podeArquivos && biblioteca && (
                    <SeletorBiblioteca participanteId={campos.participante_id || null} jaUsados={ativos.map((a) => chaveFonte(fonteArq(a)))}
                      ocupado={ocupado === 'associar'} onEscolher={associar} onFechar={() => setBiblioteca(false)} />
                  )}
                  {antigos.length > 0 && (
                    <div className="rd-antigos">
                      <Botao variante="secundario" aria-expanded={verAntigos} onClick={() => setVerAntigos((x) => !x)}>
                        {verAntigos ? 'Esconder versões anteriores' : 'Mostrar versões anteriores e removidos (' + antigos.length + ')'}
                      </Botao>
                      {verAntigos && (
                        <ul>
                          {antigos.map((a) => (
                            <li key={a.id}>
                              <span>{a.nome}{a.versao ? ' (versão ' + a.versao + ')' : ''} — {a.substituido_por ? 'substituído' : 'removido'} por {a.removido_por_rotulo || '—'} em {R.quandoTexto(a.removido_em)}</span>
                              <BotaoIcone icone="baixar" rotulo="Baixar" alvo={a.nome} disabled={entregaGaveta.ocupado} onClick={() => entregaGaveta.baixar([itemDe(a)])} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <EstadoEntrega entrega={entregaGaveta} />
                </Gaveta>

                <Gaveta titulo={'Comentários (' + comentarios.length + ')'} aberto={gavetas.has('comentarios')} onAlternar={(v) => alternarGaveta('comentarios', v)}>
                  <p className="rd-campo__nota">Pedido de ajuste avisa quem cuida da postagem e a devolve para rascunho.</p>
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
                </Gaveta>

                <Gaveta titulo={'Histórico (' + historia.length + ')'} aberto={gavetas.has('historico')} onAlternar={(v) => alternarGaveta('historico', v)}>
                  <ol className="rd-historico">
                    {historia.map((h) => (
                      <li key={h.id}><span className="rd-historico__quando">{R.quandoTexto(h.em)}</span> <Autor id={h.ator_id} rotulo={h.ator_rotulo} tamanho={20} /> — {textoHistorico(h)}</li>
                    ))}
                  </ol>
                </Gaveta>
              </>
            )}
          </div>
        </div>
      </div>
    </Folha>
    {novaCampanha && (
      <FormularioCampanha campanha={null} onFechar={() => setNovaCampanha(false)}
        onSalvou={(c) => { setCampanhasNovas((l) => [...l, c]); setCampo('campanha_id', c.id); setNovaCampanha(false) }} />
    )}
    </>
  )
}
