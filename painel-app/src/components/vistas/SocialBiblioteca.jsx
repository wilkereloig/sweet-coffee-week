import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Icone } from '../Icone'
import { Carregando, Erro, Vazio, Selo, Botao, BotaoIcone, Escolha } from '../ui'
import { Autor } from '../Avatar'
import * as R from '../../lib/redes'
import { useUrlsAssinadas, baixarArquivo, prepararArquivo, enviarArquivo, chaveFonte } from '../../lib/redesArquivos'
import { Miniatura, traduzirRedes } from './RedesFicha'

/*
 * Social media › Biblioteca (17/10/2026). Uma lista só, por REFERÊNCIA ao que
 * já existe — nada é copiado (social_biblioteca):
 *   arte final de postagem (enviada aqui) · foto do combo · foto da loja ·
 *   logo do participante · material geral da campanha.
 * Arquivo privado continua privado: `redes` e `arquivos` por link assinado de
 * vida curta, renovado; `logos` e `edicao-publico` já são públicos.
 * Enviar arte direto para a biblioteca é do designer/administração (redes.gerir).
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
  disponivel: ['Disponível', 'ok'], substituida: ['Versão anterior', 'neutro'], removida: ['Removida da postagem', 'encerrado'],
  enviada: ['Enviada, sem aprovação', 'andamento'], aprovada: ['Aprovada', 'ok'], recusada: ['Recusada', 'encerrado'],
  oficial: ['Logo oficial', 'ok'], anterior: ['Logo anterior', 'neutro'], publicado: ['Publicado às marcas', 'ok'], nao_publicado: ['Não publicado', 'neutro'],
}
const ACEITA_POST = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
const fonteItem = (x) => ({ bucket: x.bucket, path: x.path })
const miniItem = (x) => (x.miniatura_path ? { bucket: 'redes', path: x.miniatura_path } : String(x.mime || '').startsWith('image/') ? fonteItem(x) : null)
const formatoDe = (x) => (String(x.mime || '').startsWith('video/') ? 'reels' : 'feed')

function CartaoMaterial({ x, urls, renovar, acao, onFalha }) {
  const t = TIPO[x.tipo] || {}
  const [sit, tom] = SITUACAO_BIB[x.situacao] || [x.situacao, 'neutro']
  return (
    <li className="sb-item" data-tipo={x.tipo}>
      <Miniatura path={miniItem(x)} formato={formatoDe(x)} urls={urls} renovar={renovar} grande />
      <div className="sb-item__corpo">
        <p className="sb-item__tipo"><Icone nome={t.icone || 'imagem'} tamanho={16} />{t.rotulo || x.tipo}</p>
        <p className="sb-item__nome">{x.nome}</p>
        <p className="rd-campo__nota">
          {[x.participante_nome, x.vinculo, x.versao ? 'versão ' + x.versao : null, x.largura && x.altura ? x.largura + '×' + x.altura : null].filter(Boolean).join(' · ')}
        </p>
        <p className="sb-item__selos">
          <Selo tom={tom}>{sit}</Selo>
          {!ACEITA_POST.has(x.mime) && <Selo tom="neutro">Só download</Selo>}
        </p>
        {x.criado_por_id && <Autor id={x.criado_por_id} rotulo={x.criado_por_rotulo} tamanho={20} />}
        {x.credito && <p className="rd-campo__nota">Crédito: {x.credito}</p>}
      </div>
      <div className="sb-item__acoes">
        <BotaoIcone icone="baixar" rotulo="Baixar" alvo={x.nome} onClick={() => baixarArquivo(fonteItem(x), x.nome).catch(() => onFalha && onFalha(x.nome))} />
        {acao}
      </div>
    </li>
  )
}

/** Escolher material da biblioteca para uma postagem (dentro da ficha). Associa por referência. */
export function SeletorBiblioteca({ participanteId, jaUsados = [], ocupado, onEscolher }) {
  const [soDele, setSoDele] = React.useState(!!participanteId)
  const [tipo, setTipo] = React.useState('')
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const carregar = React.useCallback(() => {
    setLista(null)
    rpc('social_biblioteca', { p_secret: lerSenha(), p_filtros: { situacao: 'disponivel', tipo, participante: soDele && participanteId ? participanteId : '' } })
      .then((l) => { setLista(l || []); setErro(null) }).catch((e) => setErro(e.message))
  }, [tipo, soDele, participanteId])
  React.useEffect(() => { carregar() }, [carregar])
  const itens = (lista || []).filter((x) => ACEITA_POST.has(x.mime))
  const { urls, renovar } = useUrlsAssinadas(itens.map(miniItem))
  const usados = new Set(jaUsados)
  return (
    <div className="sb-seletor" role="region" aria-label="Escolher da biblioteca">
      <div className="sb-filtros">
        <Escolha rotulo="Tipo" valor={tipo} opcoes={[['', 'Todos'], ...TIPOS_BIB.map(([k, r]) => [k, r])]} onMudar={setTipo} />
        {participanteId && (
          <label className="rd-check"><input type="checkbox" checked={soDele} onChange={(e) => setSoDele(e.target.checked)} /> Só do participante desta postagem</label>
        )}
      </div>
      {erro && <Erro texto={traduzirRedes(erro)} onTentar={carregar} />}
      {!erro && !lista && <Carregando linhas={2} />}
      {lista && !itens.length && <p className="ui-nota">Nada disponível com estes filtros. PDF, SVG e outros formatos ficam na aba Biblioteca, só para baixar.</p>}
      {itens.length > 0 && (
        <ul className="sb-grade sb-grade--compacta">
          {itens.map((x) => {
            const usado = usados.has(chaveFonte(fonteItem(x)))
            return (
              <CartaoMaterial key={x.tipo + x.id} x={x} urls={urls} renovar={renovar}
                acao={<Botao variante={usado ? 'secundario' : 'destaque'} disabled={usado || ocupado} onClick={() => onEscolher(x)}>
                  {usado ? 'Já na postagem' : 'Usar nesta postagem'}</Botao>} />
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function SocialBiblioteca({ rota, navegar, pode, registrarAtualizar }) {
  const f = rota.filtros || {}
  const sit = f.sit === undefined ? 'disponivel' : f.sit === 'todas' ? '' : f.sit
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [opcoes, setOpcoes] = React.useState({ participantes: [], edicoes: [] })
  const [erroOpcoes, setErroOpcoes] = React.useState(null)
  const [aviso, setAviso] = React.useState('')
  const [busca, setBusca] = React.useState(f.q || '')
  const [envios, setEnvios] = React.useState([])
  const [destino, setDestino] = React.useState({ edicao_codigo: '', participante_id: '' })

  // Abre na edição atual (o que a equipe usa agora); "Todas" é escolha explícita (ed=todas).
  const edAtual = f.ed === 'todas' ? '' : f.ed || opcoes.edicao_atual || ''
  const filtros = { tipo: f.tipo || '', edicao: edAtual, participante: f.part || '', situacao: sit, q: f.q || '' }
  const chave = JSON.stringify(filtros)
  const carregar = React.useCallback(async () => {
    try { setLista(await rpc('social_biblioteca', { p_secret: lerSenha(), p_filtros: JSON.parse(chave) })); setErro(null) }
    catch (e) { setErro(e.message) }
  }, [chave])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])
  React.useEffect(() => {
    rpc('redes_opcoes', { p_secret: lerSenha() }).then((o) => { if (o) { setOpcoes(o); setDestino((d) => ({ ...d, edicao_codigo: d.edicao_codigo || o.edicao_atual || '' })) } })
      .catch((e) => setErroOpcoes(e.message))
  }, [])
  const mudar = (patch) => {
    const n = { ...f, ...patch }
    for (const k of Object.keys(n)) if (n[k] === undefined || n[k] === '') delete n[k]
    navegar({ ...ALVO, filtros: n }, { substituir: true })
  }
  React.useEffect(() => {
    if ((f.q || '') === busca) return undefined
    const t = setTimeout(() => mudar({ q: busca || undefined }), 300)
    return () => clearTimeout(t)
  }, [busca]) // eslint-disable-line react-hooks/exhaustive-deps

  const itens = lista || []
  const { urls, renovar } = useUrlsAssinadas(itens.map(miniItem))
  const podeEnviar = pode('redes.gerir')

  async function enviar(files) {
    for (const file of files) {
      const chaveE = crypto.randomUUID()
      setEnvios((l) => [...l, { chave: chaveE, nome: file.name, estado: 'enviando', progresso: 0 }])
      try {
        const prep = await prepararArquivo(file)
        await enviarArquivo(null, file, prep, { biblioteca: { edicao_codigo: destino.edicao_codigo, participante_id: destino.participante_id },
          aoProgredir: (x) => setEnvios((l) => l.map((e) => (e.chave === chaveE ? { ...e, progresso: x } : e))) })
        setEnvios((l) => l.filter((e) => e.chave !== chaveE))
        carregar()
      } catch (e) {
        setEnvios((l) => l.map((x) => (x.chave === chaveE ? { ...x, estado: 'erro', erro: traduzirRedes(e.message) } : x)))
      }
    }
  }

  const contagem = (k) => itens.filter((x) => x.tipo === k).length
  return (
    <div className="sb">
      <p className="rd-aviso-limite"><Icone nome="informacao" tamanho={16} /><span>Artes finais, fotos dos combos e das lojas, logos e materiais da campanha.</span></p>
      {erroOpcoes && <Erro titulo="Não carreguei as edições e os participantes" texto={traduzirRedes(erroOpcoes)} />}
      {aviso && <p className="og-aviso" role="status">{aviso}</p>}

      <div className="sb-filtros">
        <Escolha rotulo="Tipo de material" valor={f.tipo || ''} opcoes={[['', 'Todos'], ...TIPOS_BIB.map(([k, r]) => [k, r])]} onMudar={(v) => mudar({ tipo: v })} />
        <Escolha rotulo="Edição" valor={f.ed === 'todas' ? 'todas' : edAtual} opcoes={[['todas', 'Todas'], ...(opcoes.edicoes || []).map((e) => [e.codigo, e.codigo + ' · ' + e.nome])]} onMudar={(v) => mudar({ ed: v })} />
        <Escolha rotulo="Participante" valor={f.part || ''} opcoes={[['', 'Todos'], ...(opcoes.participantes || []).map((p) => [p.id, p.nome])]} onMudar={(v) => mudar({ part: v })} />
        <Escolha rotulo="Situação" valor={f.sit || 'disponivel'} opcoes={[['disponivel', 'Disponível para usar'], ['todas', 'Tudo, inclusive versões anteriores'],
          ['aprovada', 'Fotos aprovadas'], ['enviada', 'Fotos sem aprovação'], ['oficial', 'Logos oficiais'], ['substituida', 'Versões anteriores de arte']]}
          onMudar={(v) => mudar({ sit: v === 'disponivel' ? undefined : v })} />
        <label className="og-campo rd-busca">
          <span>Buscar</span>
          <input type="search" value={busca} placeholder="Nome, vínculo ou participante" onChange={(e) => setBusca(e.target.value)} />
        </label>
      </div>

      {podeEnviar && (
        <details className="sb-enviar">
          <summary>Enviar arte final para a biblioteca</summary>
          <p className="ui-nota">Para o designer: a arte fica disponível para qualquer postagem. Para mandar direto a uma postagem, use a ficha dela.</p>
          <div className="sb-filtros">
            <Escolha rotulo="Edição" valor={destino.edicao_codigo} opcoes={[['', 'Institucional'], ...(opcoes.edicoes || []).map((e) => [e.codigo, e.codigo + ' · ' + e.nome])]}
              onMudar={(v) => setDestino((d) => ({ ...d, edicao_codigo: v }))} />
            <Escolha rotulo="Participante" valor={destino.participante_id} opcoes={[['', 'Nenhum'], ...(opcoes.participantes || []).map((p) => [p.id, p.nome])]}
              onMudar={(v) => setDestino((d) => ({ ...d, participante_id: v }))} />
          </div>
          <label className="rd-soltar">
            <Icone nome="mais" tamanho={20} />
            <span>Escolher artes</span>
            <span className="rd-campo__nota">JPG, PNG, WEBP, MP4 ou MOV, até 50 MB. Conferidas antes de subir.</span>
            <input type="file" multiple accept={R.ACEITE} className="ui-oculto" onChange={(e) => { if (e.target.files.length) enviar([...e.target.files]); e.target.value = '' }} />
          </label>
          {envios.length > 0 && (
            <ul className="rd-envios" aria-live="polite">
              {envios.map((it) => (
                <li key={it.chave} className="rd-envio" data-estado={it.estado}>
                  <span className="rd-envio__nome">{it.nome}</span>
                  {it.estado === 'erro'
                    ? <span className="rd-campo__nota rd-campo__nota--erro" role="alert">{it.erro}</span>
                    : <span className="rd-envio__estado">Enviando {Math.round(it.progresso * 100)}%</span>}
                </li>
              ))}
            </ul>
          )}
        </details>
      )}

      {erro && <Erro texto={traduzirRedes(erro)} onTentar={carregar} />}
      {!erro && !lista && <Carregando linhas={4} />}
      {lista && (
        <>
          <p className="ui-nota" aria-live="polite">
            {itens.length} {itens.length === 1 ? 'material' : 'materiais'}
            {!f.tipo && itens.length > 0 ? ' — ' + TIPOS_BIB.map(([k, r]) => contagem(k) ? contagem(k) + ' ' + r.toLowerCase() : null).filter(Boolean).join(', ') : ''}
            {itens.length >= 300 ? ' (mostrando os 300 mais recentes; filtre para achar o resto)' : ''}
          </p>
          {itens.length ? (
            <ul className="sb-grade">
              {itens.map((x) => <CartaoMaterial key={x.tipo + x.id} x={x} urls={urls} renovar={renovar} onFalha={(nome) => setAviso('Não consegui baixar “' + nome + '”. Tente de novo.')}
                acao={x.post_id ? <Botao variante="secundario" onClick={() => navegar({ vista: 'social', aba: 'planejamento', filtros: { item: x.post_id } })}>Ver postagem</Botao> : null} />)}
            </ul>
          ) : <Vazio titulo="Nada com estes filtros" icone="busca">Mude o tipo, a edição ou a situação.</Vazio>}
        </>
      )}
    </div>
  )
}
