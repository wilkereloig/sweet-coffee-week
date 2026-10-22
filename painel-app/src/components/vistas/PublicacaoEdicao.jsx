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
import { AvisoMudancaExterna } from '../AvisoMudancaExterna'
import { useLeitura, useEdicaoProtegida } from '../../lib/leituraVivaReact'
import '../../styles/edicao-org.css'
import { NOMES_PUBLICACAO, ondeFica } from '../../lib/nomesPublicacao'

/*
 * Edição › Liberação no site (rota `publicacao`) e Edição › Avaliações (Cartoon 2026.2).
 * Nomes e frases: lib/nomesPublicacao.js. Aqui se libera a edição INTEIRA; a página de cada
 * marca se publica em Participantes › Páginas das marcas.
 * As chaves 1 e 3–6 de docs/cartoon-2026-2/02-arquitetura-rotas-fases.md §2.6
 * moram em edicao_publicacao e só mudam por definir_publicacao_edicao
 * (edicao.gerir), com auditoria. As chaves 2a/2b (rota pública e entrada do
 * site) são CÓDIGO: aqui só se avisa onde elas moram.
 */

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const msgErro = (e) => traduzirErro(traduzirErroPublicacao(e && e.message))
const PADRAO = { fase: 'preparacao', participantes_publicos: false, combos_publicos: false, avaliacao_aberta: false,
  avaliacao_abre_em: null, avaliacao_fecha_em: null, resultados_publicos: false }
const CAMPOS_JANELA = ['abre', 'fecha']

export function ChavesEdicao({ edicao, pode }) {
  const [aviso, setAviso] = React.useState(null)
  const [salvando, setSalvando] = React.useState(false)
  const podeMudar = pode('edicao.gerir')

  // As chaves moram em edicao_publicacao (domínio "edicao") e mudam por definir_publicacao_edicao
  // ("edicao" e "publicacao"): relê sozinha quando outra pessoa liga/desliga algo. Outra edição =
  // leitura nova (as chaves de uma nunca aparecem na outra).
  const leitura = useLeitura(
    async () => (await rpc('get_publicacao_edicao', { p_secret: lerSenha(), p_edicao: edicao.codigo })) || { ...PADRAO, novo: true },
    ['edicao', 'publicacao'], { chave: edicao.codigo },
  )
  const c = leitura.dados
  // A janela digitada resiste à releitura e a qualquer "ligar/desligar" de outra chave: antes cada
  // resposta do servidor reescrevia os dois campos. Acompanha o banco só enquanto a pessoa não mexeu.
  const abreServidor = c ? paraLocalFortaleza(c.avaliacao_abre_em) : ''
  const fechaServidor = c ? paraLocalFortaleza(c.avaliacao_fecha_em) : ''
  const servidorJanela = React.useMemo(() => ({ abre: abreServidor, fecha: fechaServidor }), [abreServidor, fechaServidor])
  const reg = useEdicaoProtegida(servidorJanela, CAMPOS_JANELA, { chave: edicao.codigo, rotulo: 'Janela da avaliação (não salva)', pendente: podeMudar })
  const janela = reg.local
  React.useEffect(() => { setAviso(null); setSalvando(false) }, [edicao.codigo])

  if (leitura.bloqueada) return <Erro texto={leitura.erro} onTentar={leitura.recarregar} />
  if (!c) return <Carregando linhas={4} />
  // D-18: participantes e combos públicos também com curadoria (quem publica cada casa).
  const podeChave = (chave) => podeMudar || ((chave === 'participantes_publicos' || chave === 'combos_publicos') && pode('curadoria.decidir'))

  // Devolve true quando o servidor confirmou a mudança.
  async function aplicar(mudanca, pergunta, acao) {
    setAviso(null)
    const motivo = bloqueioMudanca(c, mudanca)
    if (motivo) { setAviso(motivo); return false }
    if (pergunta && !(await confirmar(pergunta, { acao }))) return false
    setSalvando(true)
    try {
      const r = await rpc('definir_publicacao_edicao', { p_secret: lerSenha(), p_edicao: edicao.codigo, p_dados: mudanca })
      // O servidor devolve o registro inteiro: a tela já mostra o estado novo. A janela digitada
      // não é tocada aqui — ela só acompanha o banco se a pessoa não tiver mexido nela.
      leitura.ajustar(r)
      setAviso({ ok: 'Salvo. O site lê a mudança na próxima visita.' })
      return true
    } catch (e) { setAviso(msgErro(e)); return false } finally { setSalvando(false) }
  }

  function mudarFase(fase) {
    if (fase === c.fase) return
    const nome = (FASES.find(([k]) => k === fase) || [])[1] || fase
    aplicar({ fase }, 'Mudar a fase da edição ' + edicao.codigo + ' para "' + nome + '"? Os textos e o que cada página mostra mudam no site.', 'Mudar fase')
  }
  async function salvarJanela(ev) {
    ev.preventDefault()
    const abre = deLocalFortaleza(janela.abre), fecha = deLocalFortaleza(janela.fecha)
    if (!!janela.abre !== !!abre || !!janela.fecha !== !!fecha) { setAviso('Data e hora incompletas.'); return }
    if (abre && fecha && new Date(fecha) <= new Date(abre)) { setAviso('O fim da avaliação precisa ser depois do início.'); return }
    const brutos = reg.local
    if (await aplicar({ avaliacao_abre_em: abre, avaliacao_fecha_em: fecha })) reg.confirmarSalvo({ abre: brutos.abre, fecha: brutos.fecha })
  }
  const janelaMudou = reg.sujo

  return (
    <div className="ui-pilha">
      {leitura.falhouAtualizar && <Erro titulo="Não consegui atualizar" texto={leitura.erro} onTentar={leitura.recarregar} />}
      <p className="ui-nota">
        <b>{NOMES_PUBLICACAO.edicao.frase}.</b> Vale para a edição {edicao.codigo} inteira, não para uma marca. {NOMES_PUBLICACAO.marcas.frase} fica em {ondeFica('marcas')}.
      </p>
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
                    onClick={() => aplicar({ [chave]: !ligada }, ligada ? null : 'Ligar "' + nome + '" na edição ' + edicao.codigo + '? ' + efeito, 'Ligar')}>
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
              <input type="datetime-local" value={janela.abre} disabled={!podeMudar} onChange={(e) => reg.editar('abre', e.target.value)} /></label>
            <label className="og-campo"><span>Fecha em</span>
              <input type="datetime-local" value={janela.fecha} disabled={!podeMudar} onChange={(e) => reg.editar('fecha', e.target.value)} /></label>
          </div>
          <AvisoMudancaExterna registro={reg} rotulos={{ abre: 'Abre em', fecha: 'Fecha em' }} />
          {podeMudar && <div className="ui-linha-acoes"><button className="og-btn og-btn--mini" type="submit" disabled={salvando || !janelaMudou || reg.conflito}>Salvar janela</button></div>}
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
export function Avaliacoes({ edicao, pode }) {
  const podeLer = pode('relatorio.ler')
  // Os números por casa dependem da edição (critérios, janela). ⚠️ Não existe domínio "avaliações":
  // uma avaliação nova do público chega pela conferência periódica / "Atualizar", não por sinal.
  const leitura = useLeitura(
    async () => (await rpc('get_avaliacoes_resumo', { p_secret: lerSenha(), p_edicao: edicao.codigo })) || [],
    ['edicao'], { chave: edicao.codigo, ativo: podeLer },
  )
  const linhas = leitura.dados === undefined ? null : leitura.dados

  if (!podeLer) return <p className="ui-nota">Sua função não lê relatórios.</p>
  if (leitura.bloqueada) return <Erro texto={leitura.erro} onTentar={leitura.recarregar} />
  if (!linhas) return <Carregando />
  const aviso = leitura.falhouAtualizar ? <Erro titulo="Não consegui atualizar" texto={leitura.erro} onTentar={leitura.recarregar} /> : null
  const criterios = criteriosDe(linhas)
  const total = linhas.reduce((n, l) => n + Number(l.avaliacoes || 0), 0)
  if (!total) return <>{aviso}<Vazio titulo="Nenhuma avaliação ainda">As avaliações do público aparecem aqui, por casa, quando a avaliação abrir.</Vazio></>

  return (
    <>
    {aviso}
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
      <p className="ui-nota">Os vencedores só aparecem no site com a chave "Resultados no site" ligada ({ondeFica('edicao')}).</p>
    </Secao>
    </>
  )
}
