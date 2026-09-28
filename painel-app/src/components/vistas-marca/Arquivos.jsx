import React from 'react'
import { api, assinarDownload } from '../../lib/marcaApi'
import { dataHoraExtensa } from '../../lib/central'
import { VistaCabeca } from '../VistaCabeca'
import { AvisosAparelho } from '../AvisosAparelho'
import { Carregando, Vazio, Erro, Secao } from '../ui'
import { ICONE_MARCA } from '../PainelMarcaShell'

/*
 * Arquivos (marca) — documentos publicados pela organização, confirmação de
 * leitura (quando o arquivo pede) e os avisos deste aparelho.
 *
 * `arquivos`, `arquivo_leitura` e o id do participante são leituras À PARTE,
 * cada uma com o próprio catch — uma falhar não apaga a outra (§10.4-b).
 */
export function Arquivos({ alvo, consumirAlvo }) {
  const [arquivos, setArquivos] = React.useState(null)
  const [lidos, setLidos] = React.useState({})
  const [participacaoId, setParticipacaoId] = React.useState(null)
  const [participanteId, setParticipanteId] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [baixando, setBaixando] = React.useState(null)
  const [confirmando, setConfirmando] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [destaque, setDestaque] = React.useState(null)

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      setArquivos((await api('arquivos?select=*&order=created_at.desc')) || [])
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setErro(e.message)
    }
    try {
      const [p, pa, l] = await Promise.all([
        api('participantes?select=id&order=created_at.desc&limit=1'),
        api('participacoes?select=id&order=created_at.desc&limit=1'),
        api('arquivo_leitura?select=arquivo_id,lido_em'),
      ])
      setParticipanteId((p && p[0] && p[0].id) || null)
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

  // Grava a assinatura do push pela tabela, sob RLS. O endpoint é UNIQUE e
  // `update` está revogado de propósito — não dá upsert: apaga a linha antiga
  // deste endpoint (a RLS só deixa apagar o que é desta marca) e insere.
  async function registrarPush(a) {
    if (!participanteId) throw new Error('Sua conta ainda não está ligada a uma marca.')
    await api('push_subscriptions?endpoint=eq.' + encodeURIComponent(a.endpoint), { metodo: 'DELETE' }).catch(() => null)
    await api('push_subscriptions', {
      metodo: 'POST',
      prefer: 'return=minimal',
      corpo: {
        papel: 'marca',
        participante_id: participanteId,
        endpoint: a.endpoint,
        p256dh: a.p256dh,
        auth_chave: a.auth,
        user_agent: a.userAgent,
      },
    })
  }
  async function removerPush(endpoint) {
    await api('push_subscriptions?endpoint=eq.' + encodeURIComponent(endpoint), { metodo: 'DELETE' })
  }

  return (
    <section className="ui-vista-marca">
      <VistaCabeca acento="marrom" viewBox="0 0 32 32" strokeWidth={2.2} icone={ICONE_MARCA.arquivos} titulo="Arquivos" nota="Documentos da organização e os avisos deste aparelho" />

      <div className="ui-grade-duas">
        <Secao titulo="Documentos da organização">
          {erro && <Erro texto="Não deu para carregar os arquivos agora." onTentar={carregar} />}
          {!erro && arquivos === null && <Carregando linhas={3} />}
          {!erro && arquivos && arquivos.length === 0 && <Vazio titulo="Nenhum arquivo ainda">Quando a organização publicar um documento (regulamento, material de divulgação), ele aparece aqui e chega um aviso.</Vazio>}
          {arquivos && arquivos.length > 0 && (
            <ul className="ui-arquivos">
              {arquivos.map((a) => {
                const detalhe = [a.versao ? 'versão ' + a.versao : '', a.descricao || ''].filter(Boolean).join(' · ')
                const lido = lidos[a.id]
                return (
                  <li key={a.id} className={'ui-arquivo' + (destaque === a.id ? ' is-destaque' : '')}>
                    <div className="ui-arquivo__corpo">
                      <b>{a.nome}</b>
                      {detalhe && <span>{detalhe}</span>}
                      {a.exige_leitura && <span className="ui-nota">{lido ? 'Leitura confirmada em ' + dataHoraExtensa(lido) : 'A organização pede que você confirme a leitura.'}</span>}
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
          )}
          {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
        </Secao>

        <Secao titulo="Avisos neste aparelho" nota="Aviso é por aparelho: ligue em cada celular ou computador que você usa.">
          <AvisosAparelho
            explicacao="Ligue para saber na hora quando a organização mandar mensagem, fizer um pedido, publicar um arquivo ou marcar as fotos — mesmo com o painel fechado."
            registrar={registrarPush}
            remover={removerPush}
          />
        </Secao>
      </div>
    </section>
  )
}
