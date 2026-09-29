import React from 'react'
import { api, assinarDownload } from '../../lib/marcaApi'
import { dataHoraExtensa } from '../../lib/central'
import { dataCurta } from '../../lib/respostas'
import { agruparPorCategoria, tamanhoLegivel, tipoLegivel } from '../../lib/arquivos'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Vazio, Erro, Secao, Selo } from '../ui'

/*
 * Arquivos (marca) — o que a organização publicou, por categoria, e a
 * confirmação de leitura quando o arquivo pede. As fotos oficiais do combo
 * (categoria combo) aparecem na aba Fotos, pelo mesmo componente (29/09/2026).
 *
 * `arquivos`, `arquivo_leitura` e o id do participante são leituras À PARTE,
 * cada uma com o próprio catch — uma falhar não apaga a outra (§10.4-b).
 */
// `fotos`: a lista das fotos oficiais (categoria combo), embutida na aba
// Fotos. Sem ela: a aba Arquivos, com todo o resto.
export function Arquivos({ alvo, consumirAlvo, irPara, fotos = false, recarregarResumo }) {
  const [arquivos, setArquivos] = React.useState(null)
  const [lidos, setLidos] = React.useState({})
  const [participacaoId, setParticipacaoId] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [baixando, setBaixando] = React.useState(null)
  const [confirmando, setConfirmando] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [destaque, setDestaque] = React.useState(null)

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      setArquivos((await api('arquivos?select=*&order=publicado_em.desc.nullslast')) || [])
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setErro(e.message)
    }
    try {
      const [pa, l] = await Promise.all([
        api('participacoes?select=id&order=created_at.desc&limit=1'),
        api('arquivo_leitura?select=arquivo_id,lido_em'),
      ])
      setParticipacaoId((pa && pa[0] && pa[0].id) || null)
      setLidos(Object.fromEntries((l || []).map((x) => [x.arquivo_id, x.lido_em])))
    } catch { /* sem isso só perde a confirmação de leitura; a lista segue */ }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])

  React.useEffect(() => {
    if (!alvo || !alvo.id || !arquivos) return
    // Aviso antigo `arquivos/<id>` de uma foto oficial: ela mora na aba Fotos.
    const a = arquivos.find((x) => x.id === alvo.id)
    if (!fotos && a && a.categoria === 'combo' && irPara) { irPara('fotos', { id: alvo.id }); return }
    setDestaque(alvo.id); if (consumirAlvo) consumirAlvo()
  }, [alvo, arquivos]) // eslint-disable-line react-hooks/exhaustive-deps

  async function baixar(path) {
    // A janela abre no clique, antes do await: aberta depois, o bloqueador de
    // pop-up (principalmente no iPhone) a barra.
    const janela = window.open('', '_blank')
    setBaixando(path)
    setAviso(null)
    try {
      const url = await assinarDownload(path)
      if (janela) { janela.opener = null; janela.location.href = url } else window.location.href = url
    } catch {
      if (janela) janela.close()
      setAviso('Não deu para abrir o arquivo agora. Tente de novo em instantes.')
    } finally {
      setBaixando(null)
    }
  }

  async function confirmarLeitura(arquivoId) {
    if (!participacaoId) { setAviso('Sua participação ainda não foi aberta: a confirmação fica disponível quando ela abrir.'); return }
    setConfirmando(arquivoId)
    setAviso(null)
    try {
      await api('arquivo_leitura', {
        metodo: 'POST',
        prefer: 'return=minimal,resolution=ignore-duplicates',
        corpo: { arquivo_id: arquivoId, participacao_id: participacaoId },
      })
      setLidos((l) => ({ ...l, [arquivoId]: new Date().toISOString() }))
      if (recarregarResumo) recarregarResumo()
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setAviso('Não deu para registrar a leitura agora. Tente de novo.')
    } finally {
      setConfirmando(null)
    }
  }

  const visiveis = arquivos && arquivos.filter((a) => (fotos ? a.categoria === 'combo' : a.categoria !== 'combo'))
  const lista = (
        <Secao titulo={fotos ? 'Fotos oficiais' : 'Para baixar'}>
          {erro && <Erro texto="Não deu para carregar os arquivos agora." onTentar={carregar} />}
          {!erro && arquivos === null && <Carregando linhas={3} />}
          {!erro && visiveis && visiveis.length === 0 && (fotos
            ? <p className="ui-nota">Ainda não disponíveis. Você será avisado quando as fotos forem liberadas.</p>
            : <Vazio titulo="Nenhum arquivo ainda">Quando a organização publicar um documento (regulamento, material de divulgação), ele aparece aqui e chega um aviso.</Vazio>)}
          {visiveis && visiveis.length > 0 && agruparPorCategoria(visiveis).map((g) => (
            <div className="ui-downloads__grupo" key={g.chave}>
              <h3 className="ui-downloads__titulo">{g.rotulo}</h3>
              {g.descricao && <p className="ui-nota">{g.descricao}</p>}
              <ul className="ui-arquivos">
                {g.itens.map((a) => {
                  const detalhe = [tipoLegivel(a.mime, a.path), tamanhoLegivel(a.tamanho), a.versao ? 'versão ' + a.versao : '', dataCurta(a.publicado_em || a.created_at)].filter(Boolean).join(' · ')
                  const lido = lidos[a.id]
                  return (
                    <li key={a.id} className={'ui-arquivo' + (destaque === a.id ? ' is-destaque' : '')}>
                      <div className="ui-arquivo__corpo">
                        <b>{a.nome}</b>
                        <span>{detalhe}</span>
                        {a.descricao && <span>{a.descricao}</span>}
                        <Selo tom={a.escopo === 'marca' ? 'andamento' : 'neutro'}>{a.escopo === 'marca' ? 'Só para você' : 'Para todos os participantes'}</Selo>
                        {a.exige_leitura && (lido
                          ? <span>Leitura confirmada em {dataHoraExtensa(lido)}</span>
                          : <Selo tom="atencao">Confirme a leitura</Selo>)}
                      </div>
                      <div className="ui-linha-acoes">
                        <button className="og-btn og-btn--vazado og-btn--mini" type="button" disabled={baixando === a.path} onClick={() => baixar(a.path)}>
                          {baixando === a.path ? 'Abrindo…' : 'Baixar'}
                        </button>
                        {a.exige_leitura && !lido && (
                          <button className="og-btn og-btn--mini" type="button" disabled={confirmando === a.id} onClick={() => confirmarLeitura(a.id)}>
                            {confirmando === a.id ? 'Registrando…' : 'Li e estou de acordo'}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
        </Secao>
  )
  if (fotos) return lista

  return (
    <section className="ui-vista-marca">
      <VistaCabeca acento="marrom" icone="arquivos" titulo="Arquivos" nota="Marca do festival, guias e documentos" />
      {lista}
    </section>
  )
}
