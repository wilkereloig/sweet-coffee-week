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
import { comEnvio } from '../../lib/pendencias'
import { AvisoMudancaExterna } from '../AvisoMudancaExterna'
import { useLeitura, useEdicaoProtegida } from '../../lib/leituraVivaReact'
import { renovarDaLista, CAMPOS_ARQUIVO, formularioDoArquivo, soAlterados, aparar, impressaoDoArquivo, envioReaproveitavel } from '../../lib/leituraViva'

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

/*
 * Módulo Arquivos (reestruturação 29/09/2026, etapa 4). `aba`:
 *   'gerais'        — para todas as marcas (logo, guias, regulamento)
 *   'participantes' — de uma marca só (fotos do combo, artes, documentos)
 *   'arquivados'    — fora do painel da marca, guardados; restaurar devolve
 * Cada lista vem agrupada por categoria, com tipo, tamanho, data e versão.
 */
export function ArquivosOrg({ pode, aba = 'gerais' }) {
  const podeGerir = pode('producao.gerir')
  const [aviso, setAviso] = React.useState(null)
  const [folha, setFolha] = React.useState(null) // null | {tipo:'novo'} | {tipo:'editar', arquivo}
  const [marcaFiltro, setMarcaFiltro] = React.useState('')
  const [ocupado, setOcupado] = React.useState(null)
  // Substituição que já subiu ao armazenamento mas ainda não foi registrada: tentar de novo com o
  // mesmo arquivo não sobe outra vez (o armazenamento não sobrescreve).
  const substituindo = React.useRef(null)

  // Cada uma das três abas é um componente separado com a própria leitura (a lista inteira): todas
  // se relêem sozinhas quando um arquivo, a leitura dele ou a marca muda. A lista de marcas é uma
  // leitura à parte e opcional (função sem permissão não derruba os arquivos).
  const arq = useLeitura(async () => (await rpc('get_arquivos_admin', { p_secret: lerSenha() })) || [], ['arquivos', 'participantes'])
  const part = useLeitura(async () => (await rpc('get_participantes', { p_secret: lerSenha() })) || [], ['participantes'], { opcional: true })
  const arquivos = arq.dados === undefined ? null : arq.dados
  const participantes = part.dados || []
  // A folha de edição mostra o arquivo de AGORA (a lista se relê); se sumiu, fica o que foi clicado.
  const arquivoAberto = folha && folha.tipo === 'editar' ? renovarDaLista(folha.arquivo, arquivos) : null

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

  async function substituir(clicado, file) {
    if (!file) return
    // O seletor de arquivo pode ter ficado aberto um bom tempo: parte da linha de agora.
    const a = renovarDaLista(clicado, arq.atual())
    setAviso(null); setOcupado(a.id)
    let registrando = false
    try {
      const path = caminhoSubstituto(a.path, nomeSeguro(file.name))
      if (!envioReaproveitavel(substituindo.current, path, file)) {
        // Os bytes vão direto ao Storage (a função só assina) — mesma regra de publicar.
        const assinatura = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'subir', bucket: 'arquivos', path })
        const envio = await comEnvio('Envio de “' + file.name + '”', () => fetch(assinatura.url, { method: 'PUT', body: file }))
        if (!envio.ok) throw new Error('o envio para o armazenamento falhou (HTTP ' + envio.status + ')')
        substituindo.current = { path, impressao: impressaoDoArquivo(file) }
      }
      registrando = true
      await rpc('substituir_arquivo', { p_secret: lerSenha(), p_id: a.id, p_path: path, p_mime: file.type || null, p_tamanho: file.size, p_versao: null })
      substituindo.current = null
      // A lista se atualiza sozinha (domínio "arquivos"): não há releitura a esperar.
      setAviso({ ok: '"' + a.nome + '" substituído. A marca já baixa a versão nova.' })
    } catch (e) {
      // O arquivo novo já está lá e só a troca no registro falhou: diz isso, em vez de deixá-lo órfão em silêncio.
      setAviso(traduzirErro(e.message) + (registrando ? ' O arquivo já foi enviado; ao substituir de novo ele não sobe outra vez.' : ''))
    } finally { setOcupado(null) }
  }

  async function arquivar(a, sim) {
    if (sim && !await confirmar('Arquivar "' + a.nome + '"? Sai do painel da marca; fica guardado em Arquivados.')) return
    setAviso(null); setOcupado(a.id)
    try {
      await rpc('arquivar_arquivo', { p_secret: lerSenha(), p_id: a.id, p_arquivar: sim })
      // Confirmado: o arquivo muda de aba na hora; a releitura vem por sinal.
      arq.ajustar((l) => l.map((x) => (x.id === a.id ? { ...x, arquivado: sim } : x)))
    }
    catch (e) { setAviso(traduzirErro(e.message)) } finally { setOcupado(null) }
  }

  if (arq.bloqueada) return <Erro texto={arq.erro} onTentar={arq.recarregar} />
  if (!arquivos) return <Carregando />
  // Uma tabela só, na ordem das categorias, com a categoria como coluna
  // (02/10/2026, pedido do Wilker: a página estava confusa). Antes era uma
  // seção com título por categoria, e cada linha juntava tudo numa frase.
  const linhas = agruparPorCategoria(visiveis).flatMap((g) => g.itens.map((a) => ({ a, categoria: g.rotuloOrg })))
  const nAcoes = 1 + (podeGerir ? (aba === 'arquivados' ? 1 : 3) : 0)

  return (
    <div className="og-embutida">
      {arq.falhouAtualizar && <Erro titulo="Não consegui atualizar" texto={arq.erro} onTentar={arq.recarregar} />}
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
      />
      <FolhaEditarArquivo
        arquivo={arquivoAberto}
        onFechar={() => setFolha(null)}
        onSalvo={arq.invalidar}
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
  return (
    <Folha aberto={!!arquivo} titulo="Editar arquivo" sub={arquivo ? arquivo.nome : ''} onFechar={onFechar}>
      {/* key: outro arquivo = formulário novo; o rascunho de um nunca aparece no outro. */}
      {arquivo && <FormularioArquivo key={arquivo.id} arquivo={arquivo} onFechar={onFechar} onSalvo={onSalvo} />}
    </Folha>
  )
}

function FormularioArquivo({ arquivo, onFechar, onSalvo }) {
  // O formulário resiste a alteração de outra pessoa (a lista se relê sozinha): o que está digitado
  // nunca é trocado e o que a pessoa não tocou acompanha o banco. `arquivo` chega sempre fresco.
  const servidor = React.useMemo(() => formularioDoArquivo(arquivo), [arquivo])
  const reg = useEdicaoProtegida(servidor, CAMPOS_ARQUIVO, { chave: arquivo.id, rotulo: 'Edição do arquivo (não salva)' })
  const form = reg.local
  const [aviso, setAviso] = React.useState(null)
  const [salvando, setSalvando] = React.useState(false)
  const mudar = (k) => (e) => reg.editar(k, e.target.type === 'checkbox' ? e.target.checked : e.target.value)

  async function salvar(ev) {
    ev.preventDefault()
    const brutos = reg.local
    // Só o que a pessoa mudou: mandar o formulário inteiro desfaria o que outra pessoa alterou
    // (versão, confirmação de leitura…) enquanto a folha estava aberta.
    const alterados = aparar(soAlterados(reg.base, reg.local, CAMPOS_ARQUIVO))
    if (!Object.keys(alterados).length) { onFechar(); return }
    setSalvando(true); setAviso(null)
    try {
      await rpc('atualizar_arquivo', { p_secret: lerSenha(), p_id: arquivo.id, p_dados: alterados })
      reg.confirmarSalvo(alterados, brutos)
      onSalvo() // uma leitura em voo, de antes desta gravação, não pode desfazê-la na lista
      onFechar()
    }
    catch (e) { setAviso(traduzirErro(e.message)) } finally { setSalvando(false) }
  }

  return (
    <form className="og-bloco og-bloco--colado" onSubmit={salvar}>
      <AvisoMudancaExterna registro={reg} rotulos={{ nome: 'Nome', descricao: 'Descrição', categoria: 'Categoria', versao: 'Versão', exige_leitura: 'Confirmação de leitura' }} />
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
      {reg.conflito && <p className="ui-nota">Escolha acima qual versão vale em cada campo para poder salvar.</p>}
      <button className="og-btn" type="submit" disabled={salvando || reg.conflito}>{salvando ? 'Salvando…' : 'Salvar'}</button>
    </form>
  )
}
