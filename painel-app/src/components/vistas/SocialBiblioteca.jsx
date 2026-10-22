import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Icone } from '../Icone'
import { Folha } from '../Folha'
import { Carregando, Erro, Vazio, Selo, Botao, Escolha, MaisAcoes } from '../ui'
import { confirmar, pedirTexto } from '../Confirmar'
import { Autor } from '../Avatar'
import * as R from '../../lib/redes'
import * as P from '../../lib/pastas'
import { useUrlsAssinadas, prepararArquivo, enviarArquivo, chaveFonte, urlDe } from '../../lib/redesArquivos'
import { Miniatura, traduzirRedes } from './RedesFicha'
import { useEntrega, EstadoEntrega, BotoesEntrega } from './BaixarArquivo'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import * as A from '../../lib/arrastar'
import { useArrasto, FantasmaArrasto } from '../../lib/arrastarReact'

/*
 * Social media › Biblioteca (17/10/2026; PASTAS em 17/10/2026). Uma lista só,
 * por REFERÊNCIA ao que já existe — nada é copiado (social_biblioteca):
 *   arte final (enviada aqui) · foto do combo · foto da loja · logo · material geral.
 * Pastas VIRTUAIS (20261019_social_pastas.sql): organizam essas referências;
 * mover ou renomear não mexe no Storage nem nas postagens. Sem pasta = "Sem
 * pasta". Organizar = redes.gerir (administração/designer); a Social media
 * navega, consulta, baixa e associa. O MESMO navegador serve a página e o
 * seletor dentro da postagem (uma organização só).
 * Sem a migration no servidor, a biblioteca segue sem pastas (aviso discreto).
 * Arquivo privado continua privado: assinatura de vida curta, renovada.
 */

const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }
const ALVO = { vista: 'social', aba: 'biblioteca' }

export const TIPOS_BIB = [
  ['arte', 'Arte final de postagem', 'imagem'], ['foto_combo', 'Foto do combo', 'camera'], ['foto_loja', 'Foto da loja', 'loja'],
  ['logo', 'Logo do participante', 'estrela'], ['campanha', 'Material da campanha', 'pasta'],
]
const TIPO = Object.fromEntries(TIPOS_BIB.map(([k, r, i]) => [k, { rotulo: r, icone: i }]))
export const ROTULO_ORIGEM = { envio: 'Enviada aqui', biblioteca: 'Arte da biblioteca', foto: 'Foto da edição', logo: 'Logo', campanha: 'Material da campanha' }
const SITUACAO_BIB = {
  disponivel: ['Disponível', 'ok'], substituida: ['Versão anterior', 'neutro'], removida: ['Apagada', 'encerrado'],
  enviada: ['Enviada, sem aprovação', 'andamento'], aprovada: ['Aprovada', 'ok'], recusada: ['Recusada', 'encerrado'],
  oficial: ['Logo oficial', 'ok'], anterior: ['Logo anterior', 'neutro'], publicado: ['Publicado às marcas', 'ok'], nao_publicado: ['Não publicado', 'neutro'],
}
// Situação que vale mostrar: o "normal" de cada tipo não ganha selo.
const SITUACAO_NORMAL = new Set(['disponivel', 'aprovada', 'oficial', 'publicado'])
const ACEITA_POST = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
const fonteItem = (x) => ({ bucket: x.bucket, path: x.path })
const miniItem = (x) => (x.miniatura_path ? { bucket: 'redes', path: x.miniatura_path } : String(x.mime || '').startsWith('image/') ? fonteItem(x) : null)
const formatoDe = (x) => (String(x.mime || '').startsWith('video/') ? 'reels' : 'feed')
const itemEntrega = (x) => ({ bucket: x.bucket, path: x.path, nome: x.nome, mime: x.mime, tamanho: x.tamanho })

const ERROS_PASTA = {
  ciclo: 'Uma pasta não pode ir para dentro dela mesma nem de uma pasta que está dentro dela.',
  nome_repetido_no_destino: 'No destino já existe uma pasta com o mesmo nome. Renomeie uma delas antes.',
  nome_repetido: 'Já existe uma pasta com esse nome neste nível.',
  nome_vazio: 'Dê um nome à pasta.', nome_longo: 'Use até 80 caracteres.', nome_invalido: 'O nome não pode ter “/”.',
  pasta_arquivada: 'Essa pasta foi arquivada. Atualize a biblioteca.', pasta_inexistente: 'Essa pasta não existe mais. Atualize a biblioteca.',
  pasta_com_conteudo: 'A pasta tem conteúdo: confirme para onde ele vai.', nada_selecionado: 'Nada selecionado.',
  selecao_grande: 'Mova até 500 materiais de cada vez.',
  cor_invalida: 'Essa cor não está na paleta da marca. Escolha uma das cores da lista.',
  tipo_nao_apagavel: 'Só arte final se apaga por aqui. Logo, foto e material da campanha têm o arquivamento deles (no participante e em Arquivos).',
}
const LIMITE_APAGAR = 200 // o mesmo teto de social_biblioteca_apagar
const traduzir = (m) => { for (const [k, v] of Object.entries(ERROS_PASTA)) if (String(m).includes(k)) return v; return traduzirRedes(m) }
const LIMITE_LISTA = 300 // o mesmo `limit` de social_biblioteca (os mais recentes)
const semPastasNoServidor = (m) => /social_pastas|schema cache|does not exist|ainda não está pronta/i.test(String(m))

/*
 * Material: miniatura em destaque, nome (até 2 linhas; inteiro no rótulo e na
 * prévia), participante; tipo em linha discreta; situação só quando informa.
 * O cartão abre a prévia; "Baixar" fica à vista. Nada clicável aninhado.
 */
function CartaoMaterial({ x, urls, renovar, onAbrir, selecionando, marcado, onMarcar, acao, ondeEsta, onArrastar, arrastando }) {
  const t = TIPO[x.tipo] || {}
  const [sit, tom] = SITUACAO_BIB[x.situacao] || [x.situacao, 'neutro']
  const detalhes = [t.rotulo || x.tipo, x.vinculo !== 'Biblioteca' ? x.vinculo : null, x.largura && x.altura ? x.largura + '×' + x.altura : null].filter(Boolean).join(' · ')
  // Arrastar para uma pasta: o mouse pega o cartão; o toque, só a alça (a rolagem da lista não é roubada).
  return (
    <li className={'bb-arq' + (onArrastar ? ' bb-arq--arrastavel' : '')} data-tipo={x.tipo} data-marcado={marcado ? '1' : undefined} data-arrastando={arrastando ? '1' : undefined}
      onPointerDown={onArrastar ? (e) => onArrastar(e, x, false) : undefined} onDragStart={onArrastar ? (e) => e.preventDefault() : undefined}>
      {selecionando && (
        <label className="bb-arq__marca">
          <input type="checkbox" checked={marcado} onChange={() => onMarcar(x)} />
          <span className="ui-oculto">Selecionar {x.nome}</span>
        </label>
      )}
      <button type="button" className="bb-arq__abrir" onClick={() => (selecionando ? onMarcar(x) : onAbrir(x))}
        aria-label={(selecionando ? (marcado ? 'Desmarcar ' : 'Marcar ') : 'Abrir ') + x.nome + (x.participante_nome ? ', ' + x.participante_nome : '')} title={x.nome}>
        <Miniatura path={miniItem(x)} formato={formatoDe(x)} urls={urls} renovar={renovar} grande />
        <span className="bb-arq__corpo" aria-hidden="true">
          <span className="bb-arq__nome">{x.nome}</span>
          {x.participante_nome && <span className="bb-arq__part">{x.participante_nome}</span>}
          <span className="bb-arq__tipo"><Icone nome={t.icone || 'imagem'} tamanho={16} />{detalhes}</span>
          {ondeEsta && <span className="bb-arq__onde"><Icone nome="pasta" tamanho={16} />{ondeEsta}</span>}
          {(!SITUACAO_NORMAL.has(x.situacao) || !ACEITA_POST.has(x.mime)) && (
            <span className="bb-arq__selos">
              {!SITUACAO_NORMAL.has(x.situacao) && <Selo tom={tom}>{sit}</Selo>}
              {!ACEITA_POST.has(x.mime) && <Selo tom="neutro">Só download</Selo>}
            </span>
          )}
        </span>
      </button>
      {onArrastar && (
        <button type="button" className="bb-arq__alca" tabIndex={-1} aria-hidden="true" title="Arraste até uma pasta"
          onPointerDown={(e) => { e.stopPropagation(); onArrastar(e, x, true) }}>
          <Icone nome="menu" tamanho={20} />
        </button>
      )}
      {!selecionando && acao && <div className="bb-arq__acoes">{acao}</div>}
    </li>
  )
}

/** "Mover para…": a árvore inteira; ao mover uma PASTA, ela e as de dentro ficam fora (ciclo). */
function MoverPara({ aberto, titulo, pastas, moverPasta = null, atual = null, onEscolher, onFechar }) {
  const destinos = P.arvoreDestinos(pastas, { moverPasta })
  return (
    <Folha aberto={aberto} titulo={titulo} sub="Só a organização muda: o arquivo, o endereço e as postagens que o usam ficam iguais." onFechar={onFechar}>
      <ul className="bb-destinos">
        <li>
          <button type="button" className="bb-destino" disabled={atual === null} onClick={() => onEscolher(null)}>
            <Icone nome="inicio" tamanho={16} />{moverPasta ? 'Biblioteca (primeiro nível)' : 'Sem pasta'}{atual === null && <span className="bb-destino__nota"> · onde está</span>}
          </button>
        </li>
        {destinos.map((d) => (
          <li key={d.id}>
            <button type="button" className="bb-destino" style={{ '--nivel': d.nivel }} disabled={d.proibida || d.id === atual} onClick={() => onEscolher(d.id)}>
              <Icone nome="pasta" tamanho={16} />{P.corValida(d.cor) && <span className="bb-ponto" style={P.estiloPasta(d.cor)} aria-hidden="true" />}{d.nome}
              {d.id === atual && <span className="bb-destino__nota"> · onde está</span>}
              {d.proibida && <span className="bb-destino__nota"> · é a pasta que está sendo movida (ou está dentro dela)</span>}
            </button>
          </li>
        ))}
      </ul>
    </Folha>
  )
}

/** Prévia completa (sem recorte) com as ações que cabem. */
function PreviaMaterial({ x, pastasIdx, entrega, podeOrganizar, podeApagar, onMover, onApagar, onRestaurar, onVerPostagem, onFechar }) {
  const { urls, erro: erroUrl, renovar } = useUrlsAssinadas(x ? [fonteItem(x)] : [])
  const [falhou, setFalhou] = React.useState(false)
  const tentou = React.useRef(false) // renova UMA vez: arquivo quebrado não vira laço de pedidos
  const chaveArq = x ? chaveFonte(fonteItem(x)) : ''
  React.useEffect(() => { tentou.current = false }, [chaveArq])
  React.useEffect(() => { setFalhou(false) }, [chaveArq, urls[chaveArq]])
  if (!x) return null
  const url = urlDe(urls, fonteItem(x))
  const video = String(x.mime || '').startsWith('video/')
  const imagem = String(x.mime || '').startsWith('image/')
  const t = TIPO[x.tipo] || {}
  const [sit] = SITUACAO_BIB[x.situacao] || [x.situacao]
  const razao = x.largura && x.altura ? x.largura / x.altura : null
  return (
    <Folha aberto titulo={x.nome} sub={[t.rotulo, x.participante_nome].filter(Boolean).join(' · ')} onFechar={onFechar} larga cheia>
      <div className="bb-previa">
        <div className="bb-previa__palco" style={razao ? { '--razao': razao } : undefined}>
          {!url && erroUrl ? <span className="rd-previa__espera">Não consegui abrir a prévia. <Botao variante="secundario" icone="atualizar" onClick={() => renovar(fonteItem(x))}>Tentar de novo</Botao></span>
            : !url ? <span className="rd-previa__espera">Carregando…</span>
            : video ? <video src={url} controls preload="metadata" playsInline aria-label={'Vídeo: ' + x.nome} />
            : imagem && !falhou ? <img src={url} alt={x.nome} onError={() => { setFalhou(true); if (!tentou.current) { tentou.current = true; renovar(fonteItem(x)).then(() => setFalhou(false)) } }} />
            : imagem ? <span className="rd-previa__espera"><Icone nome="documento" tamanho={24} /> A prévia não abriu — use Baixar para conferir o arquivo.</span>
            : <span className="rd-previa__espera"><Icone nome="documento" tamanho={24} /> Sem prévia para este formato — use Baixar.</span>}
        </div>
        <div className="bb-previa__acoes">
          <BotoesEntrega entrega={entrega} itens={[itemEntrega(x)]} />
          {podeOrganizar && <Botao variante="secundario" icone="pasta" onClick={onMover}>Mover para…</Botao>}
          {x.post_id && <Botao variante="secundario" icone="seta-direita" onClick={onVerPostagem}>Ver postagem</Botao>}
          {podeApagar && x.tipo === 'arte' && (x.situacao === 'removida'
            ? <Botao variante="secundario" icone="atualizar" onClick={onRestaurar}>Restaurar</Botao>
            : x.situacao !== 'substituida' && <Botao variante="secundario" icone="apagar" className="og-btn--perigo" onClick={onApagar}>Apagar</Botao>)}
        </div>
        <EstadoEntrega entrega={entrega} />
        <dl className="rd-dados">
          <div><dt>Pasta</dt><dd>{x.pasta_id ? P.textoCaminho(pastasIdx.porId, x.pasta_id) : 'Sem pasta'}</dd></div>
          <div><dt>Tipo</dt><dd>{t.rotulo}{x.vinculo ? ' · ' + x.vinculo : ''}</dd></div>
          {x.participante_nome && <div><dt>Participante</dt><dd>{x.participante_nome}</dd></div>}
          {x.largura && x.altura && <div><dt>Tamanho</dt><dd>{x.largura}×{x.altura}{x.tamanho ? ' · ' + Math.max(1, Math.round(x.tamanho / 1024)) + ' KB' : ''}</dd></div>}
          <div><dt>Situação</dt><dd>{sit}{x.versao > 1 ? ' · versão ' + x.versao : ''}</dd></div>
          {x.credito && <div><dt>Crédito</dt><dd>{x.credito}</dd></div>}
          {x.criado_por_rotulo && <div><dt>Enviado por</dt><dd><Autor id={x.criado_por_id} rotulo={x.criado_por_rotulo} tamanho={20} /> · {R.quandoTexto(x.criado_em)}</dd></div>}
        </dl>
      </div>
    </Folha>
  )
}

/** "Cor da pasta": só a paleta da marca (sem cor livre — contraste e coerência garantidos). Ajuda a achar a pasta de relance. */
function CorDaPasta({ pasta, onEscolher, onFechar }) {
  return (
    <Folha aberto titulo={'Cor da pasta “' + pasta.nome + '”'} sub="Só ajuda a achar a pasta de relance: os arquivos e as postagens não mudam." onFechar={onFechar}>
      <ul className="bb-cores" role="radiogroup" aria-label="Cor da pasta">
        <li>
          <button type="button" role="radio" aria-checked={!P.corValida(pasta.cor)} className="bb-cor" onClick={() => onEscolher(null)}>
            <span className="bb-cor__amostra" aria-hidden="true"><Icone nome={P.corValida(pasta.cor) ? 'pasta' : 'feito'} tamanho={20} /></span>Padrão
          </button>
        </li>
        {P.CORES_PASTA.map((c) => (
          <li key={c.chave}>
            <button type="button" role="radio" aria-checked={pasta.cor === c.chave} className="bb-cor" onClick={() => onEscolher(c.chave)}>
              <span className="bb-cor__amostra" style={P.estiloPasta(c.chave)} aria-hidden="true"><Icone nome={pasta.cor === c.chave ? 'feito' : 'pasta'} tamanho={20} /></span>{c.rotulo}
            </button>
          </li>
        ))}
      </ul>
    </Folha>
  )
}

/** Envio para a biblioteca (designer): vários de uma vez, com miniatura, progresso, falha e nova tentativa. */
function useEnvios(destino, aoTerminar, para) {
  const [envios, setEnvios] = React.useState([])
  const fila = React.useRef(Promise.resolve())
  const previas = React.useRef([])
  // O envio termina depois de a pessoa ter mudado de pasta: relê a pasta ABERTA AGORA, não a do clique.
  const fim = React.useRef(aoTerminar)
  fim.current = aoTerminar
  const soltar = (lista) => lista.forEach((e) => { if (e.previa) { URL.revokeObjectURL(e.previa); previas.current = previas.current.filter((u) => u !== e.previa) } })
  const atualizar = (chave, patch) => setEnvios((l) => l.map((e) => (e.chave === chave ? { ...e, ...patch } : e)))
  React.useEffect(() => () => previas.current.forEach((u) => URL.revokeObjectURL(u)), [])
  async function enviar(it) {
    atualizar(it.chave, { estado: 'conferindo', erro: null, progresso: 0 })
    try {
      const prep = await prepararArquivo(it.file)
      atualizar(it.chave, { estado: 'enviando' })
      await enviarArquivo(null, it.file, prep, { biblioteca: it.destino, aoProgredir: (x) => atualizar(it.chave, { progresso: x }) })
      // Só depois de o banco registrar: "enviado".
      atualizar(it.chave, { estado: 'feito', progresso: 1 })
      fim.current()
    } catch (e) { atualizar(it.chave, { estado: 'erro', erro: traduzir(e.message) }) }
  }
  function adicionar(files) {
    const novos = [...files].map((file) => {
      const previa = String(file.type).startsWith('image/') ? URL.createObjectURL(file) : null
      if (previa) previas.current.push(previa)
      return { chave: crypto.randomUUID(), file, nome: file.name, tipo: file.type || 'arquivo', estado: 'na_fila', progresso: 0, previa, destino: { ...destino }, para }
    })
    setEnvios((l) => [...l, ...novos])
    for (const it of novos) fila.current = fila.current.then(() => enviar(it))
  }
  const tentar = (it) => { fila.current = fila.current.then(() => enviar(it)) }
  const limpar = () => setEnvios((l) => { soltar(l.filter((e) => e.estado === 'feito')); return l.filter((e) => e.estado !== 'feito') })
  const descartar = (it) => setEnvios((l) => { soltar(l.filter((e) => e.chave === it.chave)); return l.filter((e) => e.chave !== it.chave) })
  return { envios, adicionar, tentar, limpar, descartar }
}

function VincularPasta({ pasta, opcoes, onSalvar, onFechar }) {
  const [ed, setEd] = React.useState(pasta.edicao_codigo || '')
  const [part, setPart] = React.useState(pasta.participante_id || '')
  return (
    <Folha aberto titulo={'Vincular “' + pasta.nome + '”'} sub="Opcional: ajuda a achar a pasta. Os arquivos não mudam." onFechar={onFechar}>
      <div className="sb-filtros">
        <Escolha rotulo="Edição" valor={ed} opcoes={[['', 'Nenhuma'], ...(opcoes.edicoes || []).map((e) => [e.codigo, e.codigo + ' · ' + e.nome])]} onMudar={setEd} />
        <Escolha rotulo="Participante" valor={part} opcoes={[['', 'Nenhum'], ...(opcoes.participantes || []).map((p) => [p.id, p.nome])]} onMudar={setPart} />
      </div>
      <div className="ui-acoes bb-vincular__acoes">
        <Botao variante="destaque" icone="feito" onClick={() => onSalvar({ edicao_codigo: ed, participante_id: part })}>Salvar vínculo</Botao>
        <Botao variante="secundario" onClick={onFechar}>Cancelar</Botao>
      </div>
    </Folha>
  )
}

/*
 * O navegador da biblioteca: caminho, Biblioteca · Sem pasta · Recentes,
 * busca, ordem, filtros; pastas primeiro, arquivos embaixo; seleção explícita.
 * `estado`: { pasta: '' | 'sem' | 'recentes' | uuid, q, tipo, ord, ed, part, sit, ver }.
 */
function NavegadorBiblioteca({ modo = 'pagina', estado, mudar, abrirPasta, pode, navegar, participanteId = null, jaUsados = [], ocupado = false, onEscolher = null }) {
  const seletor = modo === 'seletor'
  const [pastasR, setPastasR] = React.useState(null) // { pastas, pode_organizar } | { indisponivel }
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [opcoes, setOpcoes] = React.useState({ participantes: [], edicoes: [] })
  const [busca, setBusca] = React.useState(estado.q || '')
  const [filtrosAbertos, setFiltrosAbertos] = React.useState(false)
  const [selecionando, setSelecionando] = React.useState(false)
  const [marcados, setMarcados] = React.useState(() => new Map())
  const [mover, setMover] = React.useState(null) // { itens } | { pasta }
  const [vincular, setVincular] = React.useState(null)
  const [corDe, setCorDe] = React.useState(null) // pasta cuja cor está sendo escolhida
  const [aviso, setAviso] = React.useState('')
  const [soDele, setSoDele] = React.useState(!!participanteId)
  const entrega = useEntrega()
  // Três leituras com guarda própria: resposta velha nunca sobrescreve a nova, nem depois de sair, trocar de conta
  // ou de fechar a tela. A releitura por sinal é SILENCIOSA (não troca nada por "Carregando…", mantém pasta aberta,
  // busca, filtros e seleção) e, se falhar, MANTÉM o que está na tela — devolve false para o indicador de sincronização.
  const guardaPastas = useGuarda()
  const guardaLista = useGuarda()
  const guardaOpcoes = useGuarda()
  const temPastas = React.useRef(false)
  const temLista = React.useRef(false)

  const carregarPastas = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guardaPastas()
    try {
      const r = await rpc('social_pastas_listar', { p_secret: lerSenha() })
      if (!vale()) return true
      temPastas.current = true
      setPastasR(r)
      return true
    } catch (e) {
      if (!vale()) return true
      // Releitura que falha não troca as pastas boas por "indisponível"/erro (as pastas somem e o arquivo parece perdido).
      // Servidor sem a migration das pastas não é falha de sincronização: é a resposta (a biblioteca segue sem pastas).
      const semPastas = semPastasNoServidor(e.message)
      if (!(silencioso && temPastas.current)) setPastasR(semPastas ? { indisponivel: true, pastas: [] } : { erro: e.message, pastas: [] })
      return semPastas
    }
  }, [guardaPastas])
  React.useEffect(() => { carregarPastas() }, [carregarPastas])
  // Edições e participantes dos filtros (o seletor dentro da postagem não tem filtros: não precisa).
  const carregarOpcoes = React.useCallback(async () => {
    const vale = guardaOpcoes()
    try {
      const o = await rpc('redes_opcoes', { p_secret: lerSenha() })
      if (vale() && o) setOpcoes(o)
      return true
    } catch { return !vale() }
  }, [guardaOpcoes])
  React.useEffect(() => { if (!seletor) carregarOpcoes() }, [carregarOpcoes, seletor])
  useSincronizar(['participantes', 'editorial', 'edicao'], async () => { if (!(await carregarOpcoes())) throw new Error('redes_opcoes') }, { ativo: !seletor })

  const comPastas = !!pastasR && !pastasR.indisponivel && !pastasR.erro
  const podeOrganizar = comPastas && !!pastasR.pode_organizar && !seletor
  // Apagar não depende das pastas (é a mesma permissão de organizar, redes.gerir; o banco confere de novo).
  const podeApagar = !seletor && !!pode('redes.gerir')
  // Arrastar arquivo até uma pasta (mouse: o cartão; toque: a alça) = "Mover para…"; só quem organiza e com pastas no servidor.
  const arrastar = useArrasto({ ativo: podeOrganizar, aoSoltar: soltarEm })
  const sobre = arrastar.arrasto ? arrastar.arrasto.sobre : null
  const alvo = (id) => (sobre === id ? '1' : undefined)
  const pastas = React.useMemo(() => (pastasR && pastasR.pastas) || [], [pastasR])
  const idx = React.useMemo(() => P.indexar(pastas), [pastas])
  const local = estado.pasta || ''
  const pastaAtual = local && local !== 'sem' && local !== 'recentes' ? idx.porId.get(local) || null : null
  const pastaPerdida = comPastas && !!local && local !== 'sem' && local !== 'recentes' && !pastaAtual
  const buscando = !!(estado.q || '').trim()
  const ord = estado.ord || (local === 'recentes' ? 'recente' : 'nome')
  const soDoParticipante = seletor && soDele && !!participanteId

  // O que pedir ao banco: a pasta aberta (ou "sem pasta" na raiz), recentes ou a busca em tudo.
  const filtros = {
    tipo: estado.tipo || '', edicao: estado.ed || '', participante: (soDoParticipante && participanteId) || estado.part || '',
    situacao: seletor ? 'disponivel' : estado.sit === 'todas' ? '' : estado.sit || 'disponivel', q: estado.q || '', ordem: ord,
    ...(local === 'recentes' ? { recentes: true } : {}),
    ...(comPastas && !buscando && !soDoParticipante && local !== 'recentes' ? { pasta: pastaAtual ? pastaAtual.id : 'sem' } : {}),
  }
  const chave = pastasR ? JSON.stringify(filtros) : ''
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    if (!chave) return true
    const vale = guardaLista()
    if (!silencioso) setErro(null)
    try {
      const r = await rpc('social_biblioteca', { p_secret: lerSenha(), p_filtros: JSON.parse(chave) })
      if (!vale()) return true
      temLista.current = true
      setLista(r || [])
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!(silencioso && temLista.current)) setErro(e.message)
      return false
    }
  }, [chave, guardaLista])
  // Trocar de pasta esvazia a lista na hora: sem isto os arquivos da pasta anterior ficavam à vista (e marcáveis, arrastáveis)
  // sob o nome da nova até a resposta chegar. Declarado ANTES do efeito que carrega.
  React.useEffect(() => { setLista(null); temLista.current = false }, [local])
  React.useEffect(() => { carregar() }, [carregar])
  const recarregarTudo = React.useCallback(() => { carregarPastas(); carregar() }, [carregarPastas, carregar])
  // A lista mostra arte final (redes/biblioteca), fotos e logos (editorial = o que a Social media recebe do cadastro; logos = acervo).
  // Os dois instrumentos — a página e o seletor dentro da postagem — se inscrevem do mesmo jeito.
  useSincronizar(['biblioteca', 'redes', 'editorial', 'logos'], async () => {
    const [a, b] = await Promise.all([carregarPastas({ silencioso: true }), carregar({ silencioso: true })])
    if (!a || !b) throw new Error('biblioteca')
  })
  React.useEffect(() => { setMarcados(new Map()); setSelecionando(false) }, [local])
  // A seleção sobrevive à releitura: ficam os que ainda existem (já com o objeto novo); quem sumiu sai.
  React.useEffect(() => { if (lista) setMarcados((m) => R.podarSelecao(m, lista, P.chaveItem)) }, [lista])
  React.useEffect(() => { if (!aviso) return undefined; const t = setTimeout(() => setAviso(''), 5000); return () => clearTimeout(t) }, [aviso])
  React.useEffect(() => { setBusca(estado.q || '') }, [estado.q])
  React.useEffect(() => {
    if ((estado.q || '') === busca) return undefined
    const t = setTimeout(() => mudar({ q: busca || undefined }), 300)
    return () => clearTimeout(t)
  }, [busca]) // eslint-disable-line react-hooks/exhaustive-deps

  const itens = (lista || []).filter((x) => !seletor || ACEITA_POST.has(x.mime))
  const { urls, renovar } = useUrlsAssinadas(itens.map(miniItem))
  const subpastas = !comPastas || local === 'sem' || local === 'recentes' || soDoParticipante ? []
    : buscando ? P.buscarPastas(pastas, estado.q) : P.ordenarPastas(idx.filhos.get(pastaAtual ? pastaAtual.id : null) || [], ord)
  const trilha = pastaAtual ? P.caminho(idx.porId, pastaAtual.id) : []
  const usados = new Set(jaUsados)
  const envio = useEnvios({ pasta_id: pastaAtual ? pastaAtual.id : '', edicao_codigo: (pastaAtual && pastaAtual.edicao_codigo) || '', participante_id: (pastaAtual && pastaAtual.participante_id) || '' },
    () => { carregar(); carregarPastas() }, pastaAtual ? pastaAtual.nome : 'Sem pasta')
  const marcadosLista = [...marcados.values()]
  const nFiltros = [estado.ed, estado.part, estado.sit].filter(Boolean).length
  const vendo = estado.ver ? itens.find((x) => P.chaveItem(x) === estado.ver) || null : null

  const marcar = (x) => setMarcados((m) => { const n = new Map(m); if (n.has(P.chaveItem(x))) n.delete(P.chaveItem(x)); else n.set(P.chaveItem(x), x); return n })
  const irPara = (p) => { setBusca(''); abrirPasta(p) }
  const voltar = () => irPara(trilha.length > 1 ? trilha[trilha.length - 2].id : '')

  // ── Organizar (redes.gerir; o banco confere de novo) ──
  async function novaPasta() {
    const irmas = idx.filhos.get(pastaAtual ? pastaAtual.id : null) || []
    const nome = await pedirTexto('Nova pasta' + (pastaAtual ? ' dentro de “' + pastaAtual.nome + '”' : ' na Biblioteca') + '?', { rotulo: 'Nome da pasta' }, { acao: 'Criar pasta' })
    if (nome == null) return
    const v = P.validarNome(nome, irmas)
    if (!v.ok) { setAviso(v.erro); return }
    try { await rpc('social_pasta_criar', { p_secret: lerSenha(), p_dados: { nome: v.nome, pai_id: pastaAtual ? pastaAtual.id : null } }); setAviso('Pasta “' + v.nome + '” criada.'); carregarPastas() }
    catch (e) { setAviso(traduzir(e.message)) }
  }
  async function renomear(p) {
    const nome = await pedirTexto('Renomear “' + p.nome + '”?', { rotulo: 'Nome da pasta', valor: p.nome }, { acao: 'Renomear' })
    if (nome == null) return
    const v = P.validarNome(nome, idx.filhos.get(p.pai_id || null) || [], p.id)
    if (!v.ok) { setAviso(v.erro); return }
    if (v.nome === p.nome) return
    try { await rpc('social_pasta_editar', { p_secret: lerSenha(), p_id: p.id, p_dados: { nome: v.nome } }); setAviso('Renomeada para “' + v.nome + '”.'); carregarPastas() }
    catch (e) { setAviso(traduzir(e.message)) }
  }
  async function arquivar(p) {
    const destino = p.pai_id ? '“' + (idx.porId.get(p.pai_id) || {}).nome + '”' : 'o primeiro nível da Biblioteca (os arquivos, para “Sem pasta”)'
    // `n_itens` é o que a pasta MOSTRA; `n_itens_todos` inclui arte apagada, que também sobe de pasta (e decide a confirmação).
    const todos = Number(p.n_itens_todos ?? p.n_itens)
    const apagadas = Math.max(0, todos - Number(p.n_itens))
    const cheia = todos > 0 || Number(p.n_pastas) > 0
    const texto = cheia
      ? 'Arquivar “' + p.nome + '”? ' + Number(p.n_pastas) + ' subpasta(s) e ' + Number(p.n_itens) + ' arquivo(s)' + (apagadas ? ' (mais ' + apagadas + ' já apagado' + (apagadas === 1 ? '' : 's') + ')' : '') + ' vão para ' + destino + '. Nenhum arquivo é apagado.'
      : 'Arquivar “' + p.nome + '”? Ela está vazia. Nenhum arquivo é apagado.'
    if (!(await confirmar(texto, { acao: 'Arquivar pasta' }))) return
    try {
      await rpc('social_pasta_arquivar', { p_secret: lerSenha(), p_id: p.id, p_confirmar: cheia })
      setAviso('Pasta arquivada.' + (cheia ? ' O conteúdo foi para ' + destino + '.' : ''))
      if (pastaAtual && pastaAtual.id === p.id) irPara(p.pai_id || '')
      recarregarTudo()
    } catch (e) { setAviso(traduzir(e.message)) }
  }
  // Mover materiais: o diálogo "Mover para…" e o arrastar até uma pasta fazem exatamente isto.
  async function moverItens(itens, destinoId) {
    await rpc('social_biblioteca_mover', { p_secret: lerSenha(), p_itens: itens.map(P.refItem), p_pasta: destinoId })
    const pasta = destinoId ? idx.porId.get(destinoId) : null
    setAviso(itens.length + (itens.length === 1 ? ' arquivo movido' : ' arquivos movidos') + ' para ' + (destinoId ? '“' + (pasta ? pasta.nome : 'a pasta') + '”' : '“Sem pasta”') + '.')
    setMarcados(new Map()); setSelecionando(false)
    if (estado.ver) mudar({ ver: undefined })
  }
  async function moverPara(destinoId) {
    const m = mover
    setMover(null)
    try {
      if (m.pasta) {
        await rpc('social_pasta_mover', { p_secret: lerSenha(), p_id: m.pasta.id, p_destino: destinoId })
        setAviso('“' + m.pasta.nome + '” agora está em ' + P.textoCaminho(idx.porId, destinoId) + '.')
      } else await moverItens(m.itens, destinoId)
      recarregarTudo()
    } catch (e) { setAviso(traduzir(e.message)) }
  }
  async function soltarEm(itens, destinoId) {
    try { await moverItens(itens, destinoId); recarregarTudo() } catch (e) { setAviso(traduzir(e.message)) }
  }
  // ── Apagar e restaurar arte final (só `arte`; arquivo nenhum sai do Storage — dá para restaurar) ──
  async function apagar(its) {
    const artes = its.filter((x) => x.tipo === 'arte' && x.situacao !== 'removida' && x.situacao !== 'substituida')
    if (!artes.length) { setAviso(traduzir('tipo_nao_apagavel')); return }
    if (artes.length > LIMITE_APAGAR) { setAviso('Apague até ' + LIMITE_APAGAR + ' artes de cada vez.'); return }
    const outras = its.length - artes.length
    const emPostagem = artes.filter((x) => x.post_id).length
    const texto = (artes.length === 1 ? 'Apagar “' + artes[0].nome + '”?' : 'Apagar ' + artes.length + ' artes?')
      + ' Sai da biblioteca e não aparece mais para usar em postagens.'
      + (emPostagem ? ' ' + (emPostagem === 1 ? 'Ela também sai da postagem' + (artes[0].vinculo && artes[0].vinculo !== 'Biblioteca' ? ' “' + artes[0].vinculo + '”' : '') : emPostagem + ' delas também saem das postagens') + ' (só de postagens ainda abertas).' : '')
      + ' O arquivo fica guardado e dá para restaurar em Filtros › Situação › Artes apagadas.'
      + (outras ? ' ' + outras + (outras === 1 ? ' item selecionado não é' : ' itens selecionados não são') + ' arte final (logo, foto ou material) e ' + (outras === 1 ? 'fica' : 'ficam') + ' como está.' : '')
    if (!(await confirmar(texto, { acao: 'Apagar', perigo: true }))) return
    try {
      const r = await rpc('social_biblioteca_apagar', { p_secret: lerSenha(), p_itens: artes.map(P.refItem) })
      const n = Number(r && r.apagados) || 0
      setAviso(n === 1 ? '1 arte apagada.' : n + ' artes apagadas.')
      setMarcados(new Map()); setSelecionando(false)
      if (estado.ver) mudar({ ver: undefined })
      recarregarTudo()
    } catch (e) { setAviso(traduzir(e.message)) }
  }
  async function restaurar(its) {
    const artes = its.filter((x) => x.tipo === 'arte' && x.situacao === 'removida')
    if (!artes.length) return
    try {
      const r = await rpc('social_biblioteca_restaurar', { p_secret: lerSenha(), p_itens: artes.map(P.refItem) })
      const n = Number(r && r.restaurados) || 0
      setAviso(n === 1 ? '1 arte restaurada.' : n + ' artes restauradas.')
      if (estado.ver) mudar({ ver: undefined })
      recarregarTudo()
    } catch (e) { setAviso(traduzir(e.message)) }
  }
  async function definirCor(p, cor) {
    setCorDe(null)
    if ((cor || null) === (P.corValida(p.cor) ? p.cor : null)) return
    try {
      await rpc('social_pasta_editar', { p_secret: lerSenha(), p_id: p.id, p_dados: { cor: cor || '' } })
      setAviso(cor ? 'Cor da pasta “' + p.nome + '”: ' + P.rotuloCor(cor) + '.' : 'Pasta “' + p.nome + '” voltou à cor padrão.')
      carregarPastas()
    } catch (e) { setAviso(traduzir(e.message)) }
  }
  async function salvarVinculo(p, dados) {
    setVincular(null)
    try { await rpc('social_pasta_editar', { p_secret: lerSenha(), p_id: p.id, p_dados: dados }); setAviso('Vínculo da pasta salvo.'); carregarPastas() }
    catch (e) { setAviso(traduzir(e.message)) }
  }

  const acoesPasta = (p) => [
    { rotulo: 'Renomear', icone: 'editar', onClick: () => renomear(p) },
    { rotulo: 'Cor da pasta…', icone: 'estrela', onClick: () => setCorDe(p) },
    { rotulo: 'Vincular a edição ou participante', icone: 'ficha', onClick: () => setVincular(p) },
    { rotulo: 'Mover para…', icone: 'pasta', onClick: () => setMover({ pasta: p }) },
    { rotulo: 'Arquivar', icone: 'arquivar', perigo: true, onClick: () => arquivar(p) },
  ]
  const tituloLocal = buscando ? 'Busca em toda a biblioteca' : soDoParticipante ? 'Deste participante' : local === 'sem' ? 'Sem pasta' : local === 'recentes' ? 'Recentes' : pastaAtual ? pastaAtual.nome : 'Biblioteca'
  const nomeArq = itens.length === 1 ? 'arquivo' : 'arquivos'

  return (
    <div className={'bb' + (seletor ? ' bb--seletor' : '')}>
      {/* Onde estou: voltar + caminho; atalhos fixos. */}
      <div className="bb-topo">
        {comPastas && !buscando && pastaAtual && (
          <Botao variante="secundario" icone="seta-esquerda" onClick={voltar} aria-label={'Voltar para ' + (trilha.length > 1 ? trilha[trilha.length - 2].nome : 'Biblioteca')}>Voltar</Botao>
        )}
        {(local || buscando) && <nav className="bb-caminho" aria-label="Caminho da pasta">
          <ol>
            <li>{local || buscando ? <button type="button" className="rd-link" data-alvo-pasta={A.RAIZ} data-alvo={alvo(A.RAIZ)} onClick={() => irPara('')}>Biblioteca</button> : <span aria-current="page">Biblioteca</span>}</li>
            {!buscando && local === 'sem' && <li><span aria-current="page">Sem pasta</span></li>}
            {!buscando && local === 'recentes' && <li><span aria-current="page">Recentes</span></li>}
            {!buscando && trilha.map((p, i) => (
              <li key={p.id}>{i === trilha.length - 1 ? <span aria-current="page">{p.nome}</span> : <button type="button" className="rd-link" data-alvo-pasta={p.id} data-alvo={alvo(p.id)} onClick={() => irPara(p.id)}>{p.nome}</button>}</li>
            ))}
            {buscando && <li><span aria-current="page">Busca</span></li>}
          </ol>
        </nav>}
      </div>
      {comPastas && (
        <div className="bb-atalhos" role="group" aria-label="Acesso rápido">
          {[['', 'Biblioteca', 'inicio'], ['sem', 'Sem pasta', 'pasta'], ['recentes', 'Recentes', 'horario']].map(([k, r, i]) => (
            <button key={r} type="button" className="bb-atalho" aria-pressed={!buscando && !soDoParticipante && local === k} onClick={() => irPara(k)}
              {...(k === 'recentes' ? {} : { 'data-alvo-pasta': A.RAIZ, 'data-alvo': alvo(A.RAIZ) })}><Icone nome={i} tamanho={16} />{r}</button>
          ))}
        </div>
      )}
      {pastasR && pastasR.indisponivel && !seletor && (
        <p className="ui-nota bb-aviso-servidor"><Icone nome="informacao" tamanho={16} /> Pastas ainda não ativadas no servidor (falta aplicar a atualização do banco). A biblioteca segue funcionando, sem pastas.</p>
      )}
      {pastasR && pastasR.erro && <Erro texto={'Não consegui carregar as pastas: ' + traduzir(pastasR.erro) + ' Os arquivos abaixo estão sem a separação por pasta.'} onTentar={carregarPastas} />}
      {pastaPerdida && (
        <p className="og-aviso" role="status">Esta pasta não existe mais (foi arquivada ou o link é antigo). <Botao variante="secundario" onClick={() => irPara('')}>Ir para a Biblioteca</Botao></p>
      )}

      <div className="sb-ferramentas">
        <label className="og-campo rd-busca">
          <span className="ui-oculto">Buscar na biblioteca</span>
          <input type="search" value={busca} placeholder="Buscar arquivo, pasta ou participante" enterKeyHint="search" onChange={(e) => setBusca(e.target.value)} />
        </label>
        <label className="rd-ver">
          <span className="ui-oculto">Ordenar</span>
          <select value={ord} onChange={(e) => mudar({ ord: e.target.value })}>
            <option value="nome">Nome (A–Z)</option>
            <option value="recente">Atualização</option>
          </select>
        </label>
        <label className="rd-ver">
          <span className="ui-oculto">Tipo de material</span>
          <select value={estado.tipo || ''} onChange={(e) => mudar({ tipo: e.target.value || undefined })}>
            <option value="">Todos os tipos</option>
            {TIPOS_BIB.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
          </select>
        </label>
        {!seletor && (
          <button type="button" className="rd-filtros-btn" aria-expanded={filtrosAbertos} onClick={() => setFiltrosAbertos((x) => !x)}>
            Filtros{nFiltros > 0 && <><span className="og-aba__n" aria-hidden="true">{nFiltros}</span><span className="ui-oculto"> ({nFiltros} {nFiltros === 1 ? 'ativo' : 'ativos'})</span></>}
          </button>
        )}
        {seletor && participanteId && (
          <label className="rd-check"><input type="checkbox" checked={soDele} onChange={(e) => setSoDele(e.target.checked)} /> Só deste participante (todas as pastas)</label>
        )}
      </div>
      {filtrosAbertos && !seletor && (
        <div className="rd-filtros" role="region" aria-label="Filtros da biblioteca">
          <div className="rd-filtros__campos">
            <Escolha rotulo="Edição" valor={estado.ed || ''} opcoes={[['', 'Todas'], ...(opcoes.edicoes || []).map((e) => [e.codigo, e.codigo + ' · ' + e.nome])]} onMudar={(v) => mudar({ ed: v || undefined })} />
            <Escolha rotulo="Participante" valor={estado.part || ''} opcoes={[['', 'Todos'], ...(opcoes.participantes || []).map((p) => [p.id, p.nome])]} onMudar={(v) => mudar({ part: v || undefined })} />
            <Escolha rotulo="Situação" valor={estado.sit || 'disponivel'} opcoes={[['disponivel', 'Disponível para usar'], ['todas', 'Tudo, inclusive versões anteriores'],
              ['aprovada', 'Fotos aprovadas'], ['enviada', 'Fotos sem aprovação'], ['oficial', 'Logos oficiais'], ['substituida', 'Versões anteriores de arte'], ['removida', 'Artes apagadas']]}
              onMudar={(v) => mudar({ sit: v === 'disponivel' ? undefined : v })} />
          </div>
          <div className="ui-acoes">
            {nFiltros > 0 && <Botao variante="secundario" icone="fechar" onClick={() => mudar({ ed: undefined, part: undefined, sit: undefined })}>Limpar filtros</Botao>}
            <Botao variante="secundario" onClick={() => setFiltrosAbertos(false)}>Fechar filtros</Botao>
          </div>
        </div>
      )}

      {/* A pasta aberta: nome, vínculo e o que dá para fazer com ela. */}
      <div className="bb-cabeca">
        <div className="bb-cabeca__titulos">
          <h2 className="bb-cabeca__titulo">{pastaAtual && P.corValida(pastaAtual.cor) && <span className="bb-ponto" style={P.estiloPasta(pastaAtual.cor)} aria-hidden="true" />}{tituloLocal}</h2>
          {pastaAtual && (pastaAtual.edicao_codigo || pastaAtual.participante_nome) && (
            <p className="bb-cabeca__vinculo">{[pastaAtual.edicao_codigo && 'Edição ' + pastaAtual.edicao_codigo, pastaAtual.participante_nome].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div className="bb-cabeca__acoes">
          {podeOrganizar && !buscando && !pastaPerdida && local !== 'sem' && local !== 'recentes' && <Botao variante="secundario" icone="mais" onClick={novaPasta}>Nova pasta</Botao>}
          {!seletor && pode('redes.gerir') && !buscando && local !== 'recentes' && !pastaPerdida && (
            <label className="og-btn og-btn--mini og-btn--amarelo bb-enviar">
              <Icone nome="mais" tamanho={16} />Enviar arquivos
              <input type="file" multiple accept={R.ACEITE} className="ui-oculto" onChange={(e) => { if (e.target.files.length) envio.adicionar(e.target.files); e.target.value = '' }} />
            </label>
          )}
          {podeOrganizar && pastaAtual && <MaisAcoes itens={acoesPasta(pastaAtual)} rotulo={<>Pasta<span className="ui-oculto"> {pastaAtual.nome}: opções</span></>} />}
        </div>
      </div>

      {aviso && <p className="og-aviso" role="status">{aviso}</p>}
      {envio.envios.length > 0 && (
        <div className="bb-envios">
          <p className="bb-envios__titulo">Envios</p>
          <ul className="rd-envios" aria-live="polite">
            {envio.envios.map((it) => (
              <li key={it.chave} className="rd-envio bb-envio" data-estado={it.estado}>
                <span className="bb-envio__mini" aria-hidden="true">{it.previa ? <img src={it.previa} alt="" /> : <Icone nome="play" tamanho={20} />}</span>
                <span className="bb-envio__info">
                  <span className="rd-envio__nome">{it.nome}</span>
                  <span className="rd-campo__nota">{String(R.TIPOS[it.tipo] || it.tipo).toUpperCase()} · {Math.max(1, Math.round(it.file.size / 1024))} KB · para “{it.para}”</span>
                  {it.estado === 'erro' ? <span className="rd-campo__nota rd-campo__nota--erro" role="alert">{it.erro}</span>
                    : it.estado === 'feito' ? <span className="rd-envio__estado">Enviado e registrado</span>
                    : <>
                      <span className="rd-envio__estado">{it.estado === 'na_fila' ? 'Na fila' : it.estado === 'conferindo' ? 'Conferindo o arquivo…' : 'Enviando ' + Math.round(it.progresso * 100) + '%'}</span>
                      <span className="rd-envio__trilho" role="progressbar" aria-label={'Envio de ' + it.nome} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(it.progresso * 100)}><span style={{ width: it.progresso * 100 + '%' }} /></span>
                    </>}
                </span>
                {it.estado === 'erro' && (
                  <span className="ui-acoes bb-envio__acoes"><Botao onClick={() => envio.tentar(it)}>Tentar de novo</Botao><Botao variante="secundario" onClick={() => envio.descartar(it)}>Descartar</Botao></span>
                )}
              </li>
            ))}
          </ul>
          {envio.envios.some((e) => e.estado === 'feito') && <Botao variante="secundario" onClick={envio.limpar}>Limpar enviados</Botao>}
        </div>
      )}

      {/* Pastas primeiro. */}
      {subpastas.length > 0 && (
        <section className="bb-secao" aria-labelledby={'bb-pastas-' + modo}>
          <h3 id={'bb-pastas-' + modo} className="bb-secao__titulo">{buscando ? 'Pastas encontradas' : 'Pastas'} ({subpastas.length})</h3>
          <ul className="bb-pastas">
            {subpastas.map((p) => (
              <li key={p.id} className="bb-pasta" data-alvo-pasta={podeOrganizar ? p.id : undefined} data-alvo={alvo(p.id)}>
                <button type="button" className="bb-pasta__abrir" onClick={() => irPara(p.id)}>
                  <span className="bb-pasta__icone" style={P.estiloPasta(p.cor)} aria-hidden="true"><Icone nome="pasta" tamanho={20} /></span>
                  <span className="bb-pasta__corpo">
                    <span className="bb-pasta__nome">{p.nome}</span>
                    <span className="bb-pasta__meta">
                      {buscando ? 'Em ' + P.textoCaminho(idx.porId, p.pai_id) : [Number(p.n_pastas) ? p.n_pastas + (Number(p.n_pastas) === 1 ? ' pasta' : ' pastas') : null,
                        Number(p.n_itens) + (Number(p.n_itens) === 1 ? ' arquivo' : ' arquivos'), p.edicao_codigo, p.participante_nome].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
                {podeOrganizar && <MaisAcoes itens={acoesPasta(p)} rotulo={<span className="ui-oculto">Opções da pasta {p.nome}</span>} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Arquivos embaixo. */}
      <section className="bb-secao" aria-labelledby={'bb-arqs-' + modo}>
        <div className="bb-secao__cabeca">
          <h3 id={'bb-arqs-' + modo} className="bb-secao__titulo">{lista ? itens.length + ' ' + nomeArq : 'Arquivos'}{!buscando && !soDoParticipante && local === '' && comPastas ? ' sem pasta' : ''}</h3>
          {!seletor && itens.length > 0 && (
            <Botao variante="secundario" icone={selecionando ? 'fechar' : 'feito'} aria-pressed={selecionando} onClick={() => { setSelecionando((x) => !x); setMarcados(new Map()) }}>
              {selecionando ? 'Cancelar seleção' : 'Selecionar'}
            </Botao>
          )}
        </div>
        {erro && <Erro texto={traduzir(erro)} onTentar={carregar} />}
        {!erro && !lista && <Carregando linhas={3} />}
        {lista && lista.length >= LIMITE_LISTA && <p className="ui-nota">Mostrando os {LIMITE_LISTA} mais recentes. Use a busca, o tipo ou os filtros para achar os outros.</p>}
        {lista && !itens.length && !subpastas.length && (
          <Vazio titulo={buscando ? 'Nada encontrado' : pastaAtual ? 'Pasta vazia' : local === 'sem' ? 'Tudo organizado' : 'Nada aqui'} icone={buscando ? 'busca' : 'pasta'}>
            {buscando ? 'Mude a busca ou o tipo.' : pastaAtual ? (podeOrganizar ? 'Envie arquivos aqui ou mova arquivos de “Sem pasta”.' : 'Ainda não há arquivos nesta pasta.') : local === 'sem' ? 'Todos os arquivos já estão em alguma pasta.' : 'Mude o tipo ou os filtros.'}
          </Vazio>
        )}
        {itens.length > 0 && (
          <ul className={'bb-arqs' + (seletor ? ' bb-arqs--lista' : '')}>
            {itens.map((x) => {
              const usado = usados.has(chaveFonte(fonteItem(x)))
              return (
                <CartaoMaterial key={P.chaveItem(x)} x={x} urls={urls} renovar={renovar}
                  ondeEsta={(buscando || local === 'recentes' || soDoParticipante) && comPastas ? (x.pasta_id ? P.textoCaminho(idx.porId, x.pasta_id) : 'Sem pasta') : null}
                  selecionando={selecionando} marcado={marcados.has(P.chaveItem(x))} onMarcar={marcar}
                  onArrastar={podeOrganizar ? (e, it, alca) => arrastar.iniciar(e, A.itensDoArrasto(it, marcados, selecionando, P.chaveItem), { alca }) : undefined}
                  arrastando={!!arrastar.arrasto && arrastar.arrasto.itens.some((i) => P.chaveItem(i) === P.chaveItem(x))}
                  onAbrir={(it) => { if (!seletor) mudar({ ver: P.chaveItem(it) }, { empilhar: true }) }}
                  acao={seletor
                    ? <Botao variante={usado ? 'secundario' : 'destaque'} icone={usado ? 'feito' : 'mais'} disabled={usado || ocupado} onClick={() => onEscolher(x)}>{usado ? 'Já na postagem' : 'Usar nesta postagem'}</Botao>
                    : <Botao variante="secundario" icone="baixar" disabled={entrega.ocupado} aria-label={'Baixar ' + x.nome} onClick={() => entrega.baixar([itemEntrega(x)])}>Baixar</Botao>} />
              )
            })}
          </ul>
        )}
      </section>

      {/* Seleção e estado do download: presos embaixo, sem cobrir de vez (a lista tem folga embaixo). */}
      {!seletor && (selecionando || (entrega.estado && !vendo)) && (
        <div className="bb-barra" role="region" aria-label={selecionando ? 'Seleção' : 'Download'}>
          {selecionando && (
            <div className="bb-barra__sel">
              <p className="bb-barra__n" aria-live="polite">
                {marcadosLista.length} {marcadosLista.length === 1 ? 'selecionado' : 'selecionados'}
                <button type="button" className="rd-link bb-barra__todos" onClick={() => setMarcados(marcadosLista.length === itens.length ? new Map() : new Map(itens.map((x) => [P.chaveItem(x), x])))}>
                  {marcadosLista.length === itens.length ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              </p>
              {marcadosLista.length > 0 && (
                <div className="bb-barra__acoes">
                  <BotoesEntrega entrega={entrega} itens={marcadosLista.map(itemEntrega)} nomeZip={tituloLocal} compacto />
                  {podeOrganizar && <Botao variante="secundario" icone="pasta" onClick={() => setMover({ itens: marcadosLista })}>Mover…</Botao>}
                  {podeApagar && marcadosLista.some((x) => x.tipo === 'arte' && x.situacao !== 'removida' && x.situacao !== 'substituida') && (
                    <Botao variante="secundario" icone="apagar" className="og-btn--perigo" onClick={() => apagar(marcadosLista)}>Apagar…</Botao>
                  )}
                  {podeApagar && marcadosLista.some((x) => x.tipo === 'arte' && x.situacao === 'removida') && (
                    <Botao variante="secundario" icone="atualizar" onClick={() => restaurar(marcadosLista)}>Restaurar</Botao>
                  )}
                </div>
              )}
            </div>
          )}
          {!vendo && <EstadoEntrega entrega={entrega} />}
        </div>
      )}

      {!seletor && vendo && (
        <PreviaMaterial x={vendo} pastasIdx={idx} entrega={entrega} podeOrganizar={podeOrganizar} podeApagar={podeApagar}
          onMover={() => setMover({ itens: [vendo] })} onApagar={() => apagar([vendo])} onRestaurar={() => restaurar([vendo])} onFechar={() => mudar({ ver: undefined })}
          onVerPostagem={() => navegar({ vista: 'social', aba: 'planejamento', filtros: { item: vendo.post_id } })} />
      )}
      {!seletor && estado.ver && lista && !vendo && <p className="og-aviso" role="status">Este arquivo não está nesta pasta (ou mudou de lugar). <button type="button" className="rd-link" onClick={() => mudar({ ver: undefined })}>Fechar</button></p>}
      {comPastas && !seletor && (
        <MoverPara aberto={!!mover} pastas={pastas} moverPasta={mover && mover.pasta ? mover.pasta.id : null}
          atual={mover ? (mover.pasta ? mover.pasta.pai_id || null : mover.itens.length === 1 ? mover.itens[0].pasta_id || null : undefined) : undefined}
          titulo={mover ? (mover.pasta ? 'Mover a pasta “' + mover.pasta.nome + '” para…' : 'Mover ' + mover.itens.length + (mover.itens.length === 1 ? ' arquivo' : ' arquivos') + ' para…') : 'Mover para…'}
          onEscolher={moverPara} onFechar={() => setMover(null)} />
      )}
      {vincular && <VincularPasta pasta={vincular} opcoes={opcoes} onSalvar={(d) => salvarVinculo(vincular, d)} onFechar={() => setVincular(null)} />}
      {corDe && <CorDaPasta pasta={corDe} onEscolher={(c) => definirCor(corDe, c)} onFechar={() => setCorDe(null)} />}
      <FantasmaArrasto arrasto={arrastar.arrasto} />
    </div>
  )
}

/** Escolher material para uma postagem (dentro da ficha, no lugar): as MESMAS pastas, sem organizar. */
export function SeletorBiblioteca({ participanteId, jaUsados = [], ocupado, onEscolher, onFechar }) {
  const [estado, setEstado] = React.useState({ pasta: '' })
  const mudar = (patch) => setEstado((e) => { const n = { ...e, ...patch }; for (const k of Object.keys(n)) if (n[k] === undefined) delete n[k]; return n })
  return (
    <div className="sb-seletor" role="region" aria-label="Escolher da biblioteca">
      <div className="sb-seletor__cabeca">
        <p className="sb-seletor__titulo">Escolher da biblioteca</p>
        {onFechar && <Botao variante="secundario" icone="fechar" onClick={onFechar}>Fechar</Botao>}
      </div>
      <NavegadorBiblioteca modo="seletor" estado={estado} mudar={mudar} abrirPasta={(p) => mudar({ pasta: p || undefined, q: undefined })} pode={() => false}
        participanteId={participanteId} jaUsados={jaUsados} ocupado={ocupado} onEscolher={onEscolher} />
    </div>
  )
}

export function SocialBiblioteca({ rota, navegar, pode }) {
  const f = rota.filtros || {}
  const fAtual = React.useRef(f)
  fAtual.current = f
  // Filtros e prévia moram no endereço: abrir um arquivo e voltar devolve a pasta, os filtros e a posição.
  const mudar = React.useCallback((patch, opc = {}) => {
    const n = { ...fAtual.current, ...patch }
    for (const k of Object.keys(n)) if (n[k] === undefined || n[k] === '') delete n[k]
    navegar({ ...ALVO, filtros: n }, { substituir: !opc.empilhar })
  }, [navegar])
  // Entrar numa pasta é um passo (o Voltar do navegador volta à anterior); a busca e a prévia saem.
  const abrirPasta = React.useCallback((p) => {
    const n = { ...fAtual.current, pasta: p || undefined }
    delete n.q; delete n.ver
    for (const k of Object.keys(n)) if (n[k] === undefined || n[k] === '') delete n[k]
    navegar({ ...ALVO, filtros: n })
  }, [navegar])
  return <NavegadorBiblioteca modo="pagina" estado={f} mudar={mudar} abrirPasta={abrirPasta} pode={pode} navegar={navegar} />
}
