import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { nomeSeguro } from '../../lib/producao'
import { marcasParaOpcoes } from '../../lib/participantes'
import { CATEGORIAS_ARQUIVO, agruparPorCategoria, tamanhoLegivel, tipoLegivel, caminhoSubstituto } from '../../lib/arquivos'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Folha } from '../Folha'
import { FolhaNovoArquivo } from './Producao'
import { Carregando, Vazio, Erro, Secao, traduzirErro } from '../ui'
import { confirmar } from '../Confirmar'

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

/*
 * Módulo Arquivos (reestruturação 29/09/2026, etapa 4). `aba`:
 *   'gerais'        — para todas as marcas (logo, guias, regulamento)
 *   'participantes' — de uma marca só (fotos do combo, artes, documentos)
 *   'arquivados'    — fora do painel da marca, guardados; restaurar devolve
 * Cada lista vem agrupada por categoria, com tipo, tamanho, data e versão.
 */
export function ArquivosOrg({ registrarAtualizar, pode, aba = 'gerais' }) {
  const podeGerir = pode('producao.gerir')
  const [arquivos, setArquivos] = React.useState(null)
  const [participantes, setParticipantes] = React.useState([])
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [folha, setFolha] = React.useState(null) // null | {tipo:'novo'} | {tipo:'editar', arquivo}
  const [marcaFiltro, setMarcaFiltro] = React.useState('')
  const [ocupado, setOcupado] = React.useState(null)

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      const l = await rpc('get_arquivos_admin', { p_secret: lerSenha() })
      setArquivos(l || [])
    } catch (e) { setErro(e.message) }
    try { setParticipantes((await rpc('get_participantes', { p_secret: lerSenha() })) || []) } catch { setParticipantes([]) }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])

  const opcoesMarcas = marcasParaOpcoes(participantes)
  const visiveis = (arquivos || []).filter((a) =>
    aba === 'arquivados' ? a.arquivado
      : !a.arquivado && (aba === 'gerais' ? a.escopo === 'geral' : a.escopo === 'marca' && (!marcaFiltro || a.participacao_id === marcaFiltro)))

  async function baixar(a) {
    // A janela abre NO clique, antes do await (bloqueador de pop-up do iOS).
    const janela = window.open('', '_blank')
    try {
      const r = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'baixar', bucket: 'arquivos', path: a.path })
      if (janela) { janela.opener = null; janela.location.href = r.url } else window.location.href = r.url
    } catch (e) {
      if (janela) janela.close()
      setAviso('Não deu para abrir o arquivo: ' + traduzirErro(e.message))
    }
  }

  async function substituir(a, file) {
    if (!file) return
    setAviso(null); setOcupado(a.id)
    try {
      const path = caminhoSubstituto(a.path, nomeSeguro(file.name))
      // Os bytes vão direto ao Storage (a função só assina) — mesma regra de publicar.
      const assinatura = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'subir', bucket: 'arquivos', path })
      const envio = await fetch(assinatura.url, { method: 'PUT', body: file })
      if (!envio.ok) throw new Error('o envio para o armazenamento falhou (HTTP ' + envio.status + ')')
      await rpc('substituir_arquivo', { p_secret: lerSenha(), p_id: a.id, p_path: path, p_mime: file.type || null, p_tamanho: file.size, p_versao: null })
      await carregar()
      setAviso({ ok: '"' + a.nome + '" substituído. A marca já baixa a versão nova.' })
    } catch (e) { setAviso(traduzirErro(e.message)) } finally { setOcupado(null) }
  }

  async function arquivar(a, sim) {
    if (sim && !await confirmar('Arquivar "' + a.nome + '"? Sai do painel da marca; fica guardado em Arquivados.')) return
    setAviso(null); setOcupado(a.id)
    try { await rpc('arquivar_arquivo', { p_secret: lerSenha(), p_id: a.id, p_arquivar: sim }); await carregar() }
    catch (e) { setAviso(traduzirErro(e.message)) } finally { setOcupado(null) }
  }

  if (erro) return <Erro texto={erro} onTentar={carregar} />
  if (!arquivos) return <Carregando />
  const grupos = agruparPorCategoria(visiveis)

  return (
    <div className="og-embutida">
      <div className="ui-barra">
        {aba === 'participantes' ? (
          <div className="og-filtros">
            <label className="og-campo"><span>Marca</span>
              <select value={marcaFiltro} onChange={(e) => setMarcaFiltro(e.target.value)}>
                <option value="">Todas</option>
                {opcoesMarcas.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        ) : <span />}
        {aba !== 'arquivados' && (
          <button className="og-btn" type="button" disabled={!podeGerir} onClick={() => setFolha({ tipo: 'novo' })}>Publicar arquivo</button>
        )}
      </div>
      {!podeGerir && <p className="ui-nota">Sua função baixa os arquivos, mas não publica nem altera.</p>}
      {aviso && (typeof aviso === 'string'
        ? <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>
        : <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p>)}

      {grupos.length === 0 && (
        <Vazio titulo={aba === 'arquivados' ? 'Nada arquivado' : 'Nenhum arquivo aqui'}>
          {aba === 'gerais' && 'O que você publicar para todas as marcas aparece aqui e no painel de cada uma.'}
          {aba === 'participantes' && 'Fotos oficiais do combo, artes e documentos de uma marca só.'}
        </Vazio>
      )}
      {grupos.map((g) => (
        <Secao key={g.chave} titulo={g.rotuloOrg} nota={g.itens.length === 1 ? '1 arquivo' : g.itens.length + ' arquivos'}>
          <ul className="og-lista">{g.itens.map((a) => (
            <li key={a.id}>
              <div className="og-item og-item--info">
                <span className="og-item__cor" data-chave="arquivo" aria-hidden="true" />
                <p className="og-item__nome">{a.nome}</p>
                <p className="og-item__meta">{[
                  a.escopo === 'geral' ? 'todas as marcas' : (a.marca || 'uma marca'),
                  tipoLegivel(a.mime, a.path), tamanhoLegivel(a.tamanho),
                  a.versao ? 'versão ' + a.versao : '', dataCurta(a.publicado_em || a.created_at),
                  a.exige_leitura ? Number(a.leituras || 0) + ' confirmaram leitura' : '',
                ].filter(Boolean).join(' · ')}</p>
                <span className="og-item__dir">
                  <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => baixar(a)}>Baixar</button>
                  {podeGerir && !a.arquivado && <>
                    <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => setFolha({ tipo: 'editar', arquivo: a })}>Editar</button>
                    <BotaoSubstituir ocupado={ocupado === a.id} onArquivo={(f) => substituir(a, f)} />
                    <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado === a.id} onClick={() => arquivar(a, true)}>Arquivar</button>
                  </>}
                  {podeGerir && a.arquivado && <button className="og-btn og-btn--mini" type="button" disabled={ocupado === a.id} onClick={() => arquivar(a, false)}>Restaurar</button>}
                </span>
              </div>
            </li>
          ))}</ul>
        </Secao>
      ))}

      <FolhaNovoArquivo
        aberto={!!folha && folha.tipo === 'novo'}
        opcoesMarcas={opcoesMarcas}
        marcaPadrao={marcaFiltro || (opcoesMarcas[0] ? opcoesMarcas[0].value : '')}
        escopoInicial={aba === 'participantes' ? 'marca' : 'geral'}
        categoriaInicial={aba === 'participantes' ? 'combo' : 'documento'}
        podeGerir={podeGerir}
        onFechar={() => setFolha(null)}
        onPublicado={carregar}
      />
      <FolhaEditarArquivo
        arquivo={folha && folha.tipo === 'editar' ? folha.arquivo : null}
        onFechar={() => setFolha(null)}
        onSalvo={carregar}
      />
    </div>
  )
}

// Botão de verdade (teclado e leitor de tela) que abre o seletor de arquivo.
function BotaoSubstituir({ ocupado, onArquivo }) {
  const ref = React.useRef(null)
  return (
    <>
      <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado} onClick={() => ref.current && ref.current.click()}>
        {ocupado ? 'Enviando…' : 'Substituir'}
      </button>
      <input ref={ref} type="file" hidden onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; onArquivo(f) }} />
    </>
  )
}

function FolhaEditarArquivo({ arquivo, onFechar, onSalvo }) {
  const [form, setForm] = React.useState({})
  const [aviso, setAviso] = React.useState(null)
  const [salvando, setSalvando] = React.useState(false)
  React.useEffect(() => {
    if (!arquivo) return
    setForm({ nome: arquivo.nome || '', descricao: arquivo.descricao || '', categoria: arquivo.categoria || 'documento', versao: arquivo.versao || '', exige_leitura: !!arquivo.exige_leitura })
    setAviso(null)
  }, [arquivo && arquivo.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const mudar = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function salvar(ev) {
    ev.preventDefault()
    setSalvando(true); setAviso(null)
    try { await rpc('atualizar_arquivo', { p_secret: lerSenha(), p_id: arquivo.id, p_dados: form }); await onSalvo(); onFechar() }
    catch (e) { setAviso(traduzirErro(e.message)) } finally { setSalvando(false) }
  }

  return (
    <Folha aberto={!!arquivo} titulo="Editar arquivo" sub={arquivo ? arquivo.nome : ''} onFechar={onFechar}>
      {arquivo && (
        <form className="og-bloco og-bloco--colado" onSubmit={salvar}>
          <label className="og-campo"><span>Nome que a marca vê</span><input type="text" value={form.nome || ''} onChange={mudar('nome')} /></label>
          <label className="og-campo"><span>Categoria</span>
            <select value={form.categoria || 'documento'} onChange={mudar('categoria')}>
              {CATEGORIAS_ARQUIVO.map((c) => <option key={c.chave} value={c.chave}>{c.rotuloOrg}</option>)}
            </select>
          </label>
          <label className="og-campo"><span>Descrição <em>(opcional)</em></span><input type="text" value={form.descricao || ''} onChange={mudar('descricao')} /></label>
          <label className="og-campo"><span>Versão <em>(opcional)</em></span><input type="text" value={form.versao || ''} onChange={mudar('versao')} /></label>
          <label className="og-campo og-campo--linha"><input type="checkbox" checked={!!form.exige_leitura} onChange={mudar('exige_leitura')} /><span>Pedir confirmação de leitura</span></label>
          {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
          <button className="og-btn" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </form>
      )}
    </Folha>
  )
}
