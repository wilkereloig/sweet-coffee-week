import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { nomeSeguro } from '../../lib/producao'
import { marcasParaOpcoes } from '../../lib/participantes'
import { CATEGORIAS_ARQUIVO, agruparPorCategoria, tamanhoLegivel, tipoLegivel, caminhoSubstituto } from '../../lib/arquivos'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Folha } from '../Folha'
import { FolhaNovoArquivo } from './Producao'
import { Carregando, Vazio, Erro, traduzirErro, BotaoIcone, Escolha } from '../ui'
import { Icone } from '../Icone'
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
  // Uma tabela só, na ordem das categorias, com a categoria como coluna
  // (02/10/2026, pedido do Wilker: a página estava confusa). Antes era uma
  // seção com título por categoria, e cada linha juntava tudo numa frase.
  const linhas = agruparPorCategoria(visiveis).flatMap((g) => g.itens.map((a) => ({ a, categoria: g.rotuloOrg })))
  const nAcoes = 1 + (podeGerir ? (aba === 'arquivados' ? 1 : 3) : 0)

  return (
    <div className="og-embutida">
      <div className="ui-barra">
        {aba === 'participantes'
          ? <Escolha rotulo="Marca" valor={marcaFiltro} onMudar={setMarcaFiltro} opcoes={[['', 'Todas'], ...opcoesMarcas.map((o) => [o.value, o.label])]} />
          : <p className="ui-contagem ui-barra__contagem">{linhas.length === 1 ? '1 arquivo' : linhas.length + ' arquivos'}</p>}
        {aba !== 'arquivados' && (
          <button className="og-btn" type="button" disabled={!podeGerir} onClick={() => setFolha({ tipo: 'novo' })}><Icone nome="mais" tamanho={16} />Publicar arquivo</button>
        )}
      </div>
      {!podeGerir && <p className="ui-nota">Só leitura.</p>}
      {aviso && (typeof aviso === 'string'
        ? <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>
        : <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p>)}

      {linhas.length === 0 && (
        <Vazio titulo={aba === 'arquivados' ? 'Nada arquivado' : 'Nenhum arquivo aqui'}>
          {aba === 'gerais' && 'Aparece aqui e no painel de cada marca.'}
          {aba === 'participantes' && 'Fotos do combo, artes e documentos de uma marca só.'}
        </Vazio>
      )}
      {linhas.length > 0 && (
        <ul className="og-lista og-lista--colunas og-lista--arquivos og-lista--acoes" style={{ '--acoes-l': (nAcoes * 48 + 16) + 'px' }}>
          <li className="og-lista__cabeca" aria-hidden="true">
            <span>Arquivo</span><span>Para</span><span>Categoria</span><span>Formato</span><span>Publicado</span><span>Leitura</span>
          </li>
          {linhas.map(({ a, categoria }) => (
            <li key={a.id}>
              <div className="og-item og-item--info">
                <span className="og-item__cor" data-chave="arquivo" aria-hidden="true" />
                <span className="og-item__nome">{a.nome}{a.versao > 1 && <span className="og-item__versao"> · v{a.versao}</span>}</span>
                <span className="og-item__cel"><span className="ui-oculto">Para: </span>{a.escopo === 'geral' ? 'Todas as marcas' : (a.marca || 'Uma marca')}</span>
                <span className="og-item__cel"><span className="ui-oculto">Categoria: </span>{categoria}</span>
                <span className="og-item__cel"><span className="ui-oculto">Formato: </span>{[tipoLegivel(a.mime, a.path), tamanhoLegivel(a.tamanho)].filter(Boolean).join(' · ')}</span>
                <span className="og-item__cel"><span className="ui-oculto">Publicado: </span>{dataCurta(a.publicado_em || a.created_at)}</span>
                <span className="og-item__cel" data-vazio={a.exige_leitura ? undefined : '1'}><span className="ui-oculto">Leitura: </span>{a.exige_leitura ? (Number(a.leituras || 0) === 1 ? '1 confirmou' : Number(a.leituras || 0) + ' confirmaram') : '—'}</span>
              </div>
              <span className="og-item__acoes">
                <BotaoIcone icone="baixar" rotulo="Baixar" alvo={a.nome} onClick={() => baixar(a)} />
                {podeGerir && !a.arquivado && <>
                  <BotaoIcone icone="editar" rotulo="Editar" alvo={a.nome} onClick={() => setFolha({ tipo: 'editar', arquivo: a })} />
                  <BotaoSubstituir alvo={a.nome} ocupado={ocupado === a.id} onArquivo={(f) => substituir(a, f)} />
                  <BotaoIcone icone="arquivar" rotulo="Arquivar" alvo={a.nome} disabled={ocupado === a.id} onClick={() => arquivar(a, true)} />
                </>}
                {podeGerir && a.arquivado && <BotaoIcone icone="restaurar" rotulo="Restaurar" alvo={a.nome} disabled={ocupado === a.id} onClick={() => arquivar(a, false)} />}
              </span>
            </li>
          ))}
        </ul>
      )}

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
function BotaoSubstituir({ alvo, ocupado, onArquivo }) {
  const ref = React.useRef(null)
  return (
    <>
      <BotaoIcone icone="atualizar" rotulo={ocupado ? 'Enviando…' : 'Substituir'} alvo={alvo} disabled={ocupado} aria-busy={ocupado || undefined}
        onClick={() => ref.current && ref.current.click()} />
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
