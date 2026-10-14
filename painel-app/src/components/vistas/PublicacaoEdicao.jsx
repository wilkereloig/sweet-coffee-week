import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataHoraCurta } from '../../lib/painelFormat'
import {
  FASES, CHAVES_EDICAO, bloqueioMudanca, paraLocalFortaleza, deLocalFortaleza, traduzirErroPublicacao,
  criteriosDe, rotuloCriterio, media,
} from '../../lib/publicacao'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, Secao, Selo, Botao, Escolha, traduzirErro } from '../ui'
import { confirmar } from '../Confirmar'
import '../../styles/edicao-org.css'

/*
 * Edição › Publicação no site e Edição › Avaliações (Cartoon 2026.2).
 * As chaves 1 e 3–6 de docs/cartoon-2026-2/02-arquitetura-rotas-fases.md §2.6
 * moram em edicao_publicacao e só mudam por definir_publicacao_edicao
 * (edicao.gerir), com auditoria. As chaves 2a/2b (rota pública e entrada do
 * site) são CÓDIGO: aqui só se avisa onde elas moram.
 */

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const msgErro = (e) => traduzirErro(traduzirErroPublicacao(e && e.message))
const PADRAO = { fase: 'preparacao', participantes_publicos: false, combos_publicos: false, avaliacao_aberta: false,
  avaliacao_abre_em: null, avaliacao_fecha_em: null, resultados_publicos: false }

export function ChavesEdicao({ edicao, pode }) {
  const [c, setC] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [salvando, setSalvando] = React.useState(false)
  const [janela, setJanela] = React.useState({ abre: '', fecha: '' })

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      const r = (await rpc('get_publicacao_edicao', { p_secret: lerSenha(), p_edicao: edicao.codigo })) || { ...PADRAO, novo: true }
      setC(r)
      setJanela({ abre: paraLocalFortaleza(r.avaliacao_abre_em), fecha: paraLocalFortaleza(r.avaliacao_fecha_em) })
    } catch (e) { setErro(e.message) }
  }, [edicao.codigo])
  React.useEffect(() => { carregar() }, [carregar])

  if (erro) return <Erro texto={erro} onTentar={carregar} />
  if (!c) return <Carregando linhas={4} />
  const podeMudar = pode('edicao.gerir')
  // D-18: participantes e combos públicos também com curadoria (quem publica cada casa).
  const podeChave = (chave) => podeMudar || ((chave === 'participantes_publicos' || chave === 'combos_publicos') && pode('curadoria.decidir'))

  async function aplicar(mudanca, pergunta, acao) {
    setAviso(null)
    const motivo = bloqueioMudanca(c, mudanca)
    if (motivo) { setAviso(motivo); return }
    if (pergunta && !(await confirmar(pergunta, { acao }))) return
    setSalvando(true)
    try {
      const r = await rpc('definir_publicacao_edicao', { p_secret: lerSenha(), p_edicao: edicao.codigo, p_dados: mudanca })
      setC(r)
      setJanela({ abre: paraLocalFortaleza(r.avaliacao_abre_em), fecha: paraLocalFortaleza(r.avaliacao_fecha_em) })
      setAviso({ ok: 'Salvo. O site lê a mudança na próxima visita.' })
    } catch (e) { setAviso(msgErro(e)) } finally { setSalvando(false) }
  }

  function mudarFase(fase) {
    if (fase === c.fase) return
    const nome = (FASES.find(([k]) => k === fase) || [])[1] || fase
    aplicar({ fase }, 'Mudar a fase da edição para "' + nome + '"? Os textos e o que cada página mostra mudam no site.', 'Mudar fase')
  }
  function salvarJanela(ev) {
    ev.preventDefault()
    const abre = deLocalFortaleza(janela.abre), fecha = deLocalFortaleza(janela.fecha)
    if (!!janela.abre !== !!abre || !!janela.fecha !== !!fecha) { setAviso('Data e hora incompletas.'); return }
    if (abre && fecha && new Date(fecha) <= new Date(abre)) { setAviso('O fim da avaliação precisa ser depois do início.'); return }
    aplicar({ avaliacao_abre_em: abre, avaliacao_fecha_em: fecha })
  }
  const janelaMudou = janela.abre !== paraLocalFortaleza(c.avaliacao_abre_em) || janela.fecha !== paraLocalFortaleza(c.avaliacao_fecha_em)

  return (
    <div className="ui-pilha">
      <p className="ui-nota">
        {c.novo ? 'Esta edição ainda não tem chaves gravadas: tudo desligado, fase Preparação. A primeira mudança cria o registro.'
          : 'Última mudança: ' + (c.atualizado_por || 'organização') + ', em ' + dataHoraCurta(c.atualizado_em) + '.'}
      </p>
      {!podeMudar && <p className="ui-nota">Fase, avaliação e resultados: só quem gerencia a edição. Participantes e combos públicos: também a curadoria.</p>}
      <Aviso aviso={aviso} />

      <Secao titulo="Fase da edição" nota="Muda os textos e o que cada página mostra. Não publica dado nenhum.">
        <div className="eo-chave">
          <Escolha rotulo="Fase" valor={c.fase} opcoes={FASES} disabled={!podeMudar || salvando} onMudar={mudarFase} />
          <Selo dominio="fase_edicao" valor={c.fase} />
        </div>
      </Secao>

      <Secao titulo="Chaves do site" nota="Cada chave liga ou desliga na hora, sem deploy. Desligar não apaga nada.">
        <ul className="og-lista">
          {CHAVES_EDICAO.map(({ chave, rotulo: nome, efeito }) => {
            const ligada = !!c[chave]
            const bloqueio = bloqueioMudanca(c, { [chave]: !ligada })
            const semPermissao = chave === 'resultados_publicos' && !pode('relatorio.ler')
            const pode_ = podeChave(chave)
            return (
              <li key={chave} className="og-item og-item--info">
                <span className="og-item__cor" aria-hidden="true" />
                <span className="og-item__nome">{nome}</span>
                <span className="og-item__dir">
                  <Selo tom={ligada ? 'ok' : 'neutro'}>{ligada ? 'Ligada' : 'Desligada'}</Selo>
                  <Botao icone={ligada ? 'fechar' : 'sucesso'} variante={ligada ? 'secundario' : undefined}
                    disabled={!pode_ || semPermissao || salvando || !!bloqueio}
                    onClick={() => aplicar({ [chave]: !ligada }, ligada ? null : 'Ligar "' + nome + '"? ' + efeito, 'Ligar')}>
                    {ligada ? 'Desligar' : 'Ligar'}<span className="ui-oculto"> {nome}</span>
                  </Botao>
                </span>
                <span className="og-item__meta">{efeito}{bloqueio && pode_ ? ' ' + bloqueio : ''}{semPermissao ? ' Exige também ler relatórios.' : ''}</span>
              </li>
            )
          })}
        </ul>
      </Secao>

      <Secao titulo="Janela da avaliação" nota="Horário de Fortaleza. O servidor só aceita avaliação com a chave ligada e dentro da janela.">
        <form className="ui-form" onSubmit={salvarJanela}>
          <div className="eo-par">
            <label className="og-campo"><span>Abre em</span>
              <input type="datetime-local" value={janela.abre} disabled={!podeMudar} onChange={(e) => setJanela({ ...janela, abre: e.target.value })} /></label>
            <label className="og-campo"><span>Fecha em</span>
              <input type="datetime-local" value={janela.fecha} disabled={!podeMudar} onChange={(e) => setJanela({ ...janela, fecha: e.target.value })} /></label>
          </div>
          {podeMudar && <div className="ui-linha-acoes"><button className="og-btn og-btn--mini" type="submit" disabled={salvando || !janelaMudou}>Salvar janela</button></div>}
        </form>
      </Secao>

      <Secao titulo="Decidido no código">
        <p className="ui-nota">A rota /cartoon pública e a Cartoon na entrada do site são decididas no código (src/edicao/config.js), com deploy autorizado pelo Wilker.</p>
      </Secao>
    </div>
  )
}

function Aviso({ aviso }) {
  if (!aviso) return null
  return aviso.ok
    ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p>
    : <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>
}

/* ── Avaliações: só números por casa, nenhum dado pessoal ──────────────── */
export function Avaliacoes({ edicao, pode, registrarAtualizar }) {
  const [linhas, setLinhas] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const carregar = React.useCallback(async () => {
    setErro(null)
    try { setLinhas((await rpc('get_avaliacoes_resumo', { p_secret: lerSenha(), p_edicao: edicao.codigo })) || []) } catch (e) { setErro(e.message) }
  }, [edicao.codigo])
  React.useEffect(() => { if (pode('relatorio.ler')) carregar() }, [carregar, pode])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])

  if (!pode('relatorio.ler')) return <p className="ui-nota">Sua função não lê relatórios.</p>
  if (erro) return <Erro texto={erro} onTentar={carregar} />
  if (!linhas) return <Carregando />
  const criterios = criteriosDe(linhas)
  const total = linhas.reduce((n, l) => n + Number(l.avaliacoes || 0), 0)
  if (!total) return <Vazio titulo="Nenhuma avaliação ainda">As avaliações do público aparecem aqui, por casa, quando a avaliação abrir.</Vazio>

  return (
    <Secao titulo={'Avaliações da edição ' + edicao.codigo} nota={total + (total === 1 ? ' avaliação' : ' avaliações') + '. Média por critério; quem avaliou não aparece aqui.'}>
      <div className="ui-tabela-rolagem" tabIndex={0} role="region" aria-label="Avaliações por casa">
        <table className="ui-tabela">
          <thead><tr>
            <th scope="col">Casa</th><th scope="col">Avaliações</th><th scope="col">Substituições</th>
            {criterios.map((k) => <th key={k} scope="col">{rotuloCriterio(k)}</th>)}
          </tr></thead>
          <tbody>{linhas.map((l) => (
            <tr key={l.participacao_id}>
              <th scope="row" className="eo-tabela__nome">{l.nome}</th>
              <td>{l.avaliacoes}</td>
              <td>{l.substituicoes}</td>
              {criterios.map((k) => <td key={k}>{media(l.medias && l.medias[k])}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="ui-nota">Os vencedores só aparecem no site com a chave "Resultados no site" ligada (Edição › Publicação no site).</p>
    </Secao>
  )
}
