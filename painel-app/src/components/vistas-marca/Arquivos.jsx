import React from 'react'
import { api, assinarDownload } from '../../lib/marcaApi'
import { dataHoraExtensa } from '../../lib/central'
import { dataCurta } from '../../lib/respostas'
import { agruparPorCategoria, tamanhoLegivel, tipoLegivel } from '../../lib/arquivos'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Vazio, Erro, Secao } from '../ui'
import { ICONE_MARCA } from '../PainelMarcaShell'

/*
 * Downloads (marca) — o que a organização publicou, por categoria, e a
 * confirmação de leitura quando o arquivo pede. Os avisos do aparelho foram
 * para o botão Conta (etapa 7, 29/09/2026).
 *
 * `arquivos`, `arquivo_leitura` e o id do participante são leituras À PARTE,
 * cada uma com o próprio catch — uma falhar não apaga a outra (§10.4-b).
 */
export function Arquivos({ alvo, consumirAlvo, irPara }) {
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
    if (alvo && alvo.id) { setDestaque(alvo.id); if (consumirAlvo) consumirAlvo() }
  }, [alvo]) // eslint-disable-line react-hooks/exhaustive-deps

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
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setAviso('Não deu para registrar a leitura agora. Tente de novo.')
    } finally {
      setConfirmando(null)
    }
  }

  return (
    <section className="ui-vista-marca">
      <VistaCabeca acento="marrom" viewBox="0 0 32 32" strokeWidth={2.2} icone={ICONE_MARCA.arquivos} titulo="Downloads" nota="Fotos do seu combo, marca do festival, guias e documentos" />

      <div className="ui-grade-duas">
        <Secao titulo="Para baixar">
          {erro && <Erro texto="Não deu para carregar os arquivos agora." onTentar={carregar} />}
          {!erro && arquivos === null && <Carregando linhas={3} />}
          {!erro && arquivos && arquivos.length === 0 && <Vazio titulo="Nenhum arquivo ainda">Quando a organização publicar um documento (regulamento, material de divulgação), ele aparece aqui e chega um aviso.</Vazio>}
          {arquivos && arquivos.length > 0 && agruparPorCategoria(arquivos).map((g) => (
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
                        <span className="og-selo" data-tom={a.escopo === 'marca' ? 'andamento' : 'neutro'}>{a.escopo === 'marca' ? 'Só para você' : 'Para todos os participantes'}</span>
                        {a.exige_leitura && (lido
                          ? <span>Leitura confirmada em {dataHoraExtensa(lido)}</span>
                          : <span className="og-selo" data-tom="atencao">Confirme a leitura</span>)}
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

        <Secao titulo="Guia de fotos" nota="Como preparar o combo para a sessão de fotos">
          <p className="ui-nota">As regras da foto, o que fazer e o que evitar, e o que levar no dia.</p>
          <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={() => irPara && irPara('fotos')}>Abrir o guia</button>
        </Secao>
      </div>
    </section>
  )
}
