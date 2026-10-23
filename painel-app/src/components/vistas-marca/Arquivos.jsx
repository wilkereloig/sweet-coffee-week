import React from 'react'
import { api } from '../../lib/marcaApi'
import { plataforma } from '../../lib/instalar'
import { ehNovo, organizarArquivos, precisaLeitura, notaDeAbertura, leituraProvisoria, pendenciasDeArquivos, mapaDeLeituras } from '../../lib/arquivosMarca'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Vazio, Erro, Secao, Selo, GradeModulos, Modulo, traduzirErro } from '../ui'
import { ItemArquivo } from './arquivos/ItemArquivo'
import { useAcessoArquivo } from './arquivos/useAcessoArquivo'
import { PendenciasFotos } from './fotos/PendenciasFotos'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import '../../styles/arquivos-marca.css'

/*
 * Arquivos (marca) — o que a organização publicou, por categoria, e a
 * confirmação de leitura quando o arquivo pede. As fotos oficiais do combo
 * (categoria combo) moram na aba Fotos (fotos/FotosOficiais.jsx, que usa o mesmo
 * Abrir/Baixar — arquivos/useAcessoArquivo.js).
 *
 * 23/10/2026: no topo, as solicitações da organização sobre arquivos (`pendenciasDeArquivos`, as mesmas que o selo da
 * aba conta). A leitura passa por `marca_confirmar_leitura`: arquivo SUBSTITUÍDO depois da leitura volta a pedir
 * confirmação, e a confirmação nova renova a hora (o banco decide; a tela usa a hora devolvida).
 *
 * 22/10/2026: o que pede leitura vai para o TOPO (separado do "Novo", que é só
 * "publicado há até 7 dias" — o banco não guarda quem abriu o quê); o que acabou
 * de ser confirmado FICA lá, já como "confirmado", até a tela ser reaberta (a lista
 * não pula de lugar sob o dedo); cada arquivo tem "Abrir" (mostra no navegador, só
 * para o que ele sabe mostrar) e "Baixar" (pede o download); a tela diz o que
 * acontece em cada aparelho, sem prometer "salvo". A gravação da leitura não mudou.
 *
 * `arquivos`, `arquivo_leitura` e o id do participante são leituras À PARTE,
 * cada uma com o próprio resultado — uma falhar não apaga a outra (§10.4-b).
 * Releitura (sinal de arquivos ou de participantes) é silenciosa: troca as listas
 * de uma vez, sem "Carregando…", e a que falhar deixa a lista anterior na tela.
 * Sem a leitura das confirmações a tela NÃO afirma o que está pendente.
 */
const TEXTO = {
  botaoLer: 'Li e confirmo a leitura', pedeLer: 'Confirme a leitura', lido: 'Leitura confirmada em ', okLer: 'Leitura registrada.',
  erroLer: 'Não deu para registrar a leitura agora. Tente de novo.',
  blocoLer: 'Para ler e confirmar', blocoLerSub: 'A organização pediu que você confirme a leitura destes arquivos.',
}
// Um assunto = um ícone (nomes do registro único; conferidos em tests/painel-app-arquivos-marca.test.mjs).
const ICONE_CATEGORIA = { combo: 'camera', identidade: 'imagem', guia: 'informacao', documento: 'documento', outro: 'pasta' }

export function Arquivos({ alvo, consumirAlvo, irPara, recarregarResumo, resumo, abrirLink }) {
  const [arquivos, setArquivos] = React.useState(null)
  const [lidos, setLidos] = React.useState({})
  const [leituraConhecida, setLeituraConhecida] = React.useState(false)
  const [participacaoId, setParticipacaoId] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [confirmando, setConfirmando] = React.useState(null)
  const [recemLidos, setRecemLidos] = React.useState(() => new Set())   // ids confirmados nesta visita: ficam no bloco "Para ler"
  const [aviso, setAviso] = React.useState(null)          // { id, tom: 'ok' | 'erro', texto } — id = o arquivo, ou null para a lista inteira
  const [destaque, setDestaque] = React.useState(null)
  const { ocupado, acessar } = useAcessoArquivo(setAviso)

  const guarda = useGuarda()
  const temArquivos = React.useRef(false)
  const plat = React.useMemo(() => plataforma(), [])

  const carregar = React.useCallback(async () => {
    const vale = guarda()
    const [rArq, rLeit] = await Promise.allSettled([
      api('arquivos?select=*&arquivado=eq.false&order=publicado_em.desc.nullslast'),
      Promise.all([
        api('participacoes?select=id&order=created_at.desc&limit=1'),
        api('arquivo_leitura?select=arquivo_id,lido_em'),
      ]),
    ])
    if (!vale()) return
    const morta = (r) => r.status === 'rejected' && r.reason && r.reason.message === 'sessao_expirada'
    if (morta(rArq) || morta(rLeit)) return                   // o App leva ao login
    if (rArq.status === 'fulfilled') { setArquivos(rArq.value || []); setErro(null); temArquivos.current = true }
    else if (!temArquivos.current) setErro(rArq.reason && rArq.reason.message)
    if (rLeit.status === 'fulfilled') {
      const [pa, l] = rLeit.value
      setParticipacaoId((pa && pa[0] && pa[0].id) || null)   // participação nova (outra edição) entra aqui
      setLidos(mapaDeLeituras(l))   // uma linha por participação: vale a leitura mais recente de cada arquivo
      setLeituraConhecida(true)
    }
    // Sem a leitura de confirmação a lista segue (só falta o "lido"), mas a falha conta no indicador.
    const falha = [rArq, rLeit].find((r) => r.status === 'rejected')
    if (falha) throw falha.reason
  }, [guarda])
  React.useEffect(() => { carregar().catch(() => {}) }, [carregar])
  useSincronizar(['arquivos', 'participantes'], carregar)
  const tentarDeNovo = () => { setErro(null); carregar().catch(() => {}) }

  React.useEffect(() => {
    if (!alvo || !alvo.id || !arquivos) return
    // Aviso antigo `arquivos/<id>` de uma foto oficial: ela mora na aba Fotos.
    const a = arquivos.find((x) => x.id === alvo.id)
    if (a && a.categoria === 'combo' && irPara) { irPara('fotos', { id: alvo.id }); return }
    if (a) setDestaque(alvo.id)
    else setAviso({ id: null, tom: 'erro', texto: 'Não encontrei esse arquivo na sua lista. Ele pode ter sido retirado pela organização.' })
    if (consumirAlvo) consumirAlvo()
  }, [alvo, arquivos]) // eslint-disable-line react-hooks/exhaustive-deps

  // Só ciência: grava `arquivo_leitura` (quem leu e quando) por `marca_confirmar_leitura` — que também RENOVA a
  // leitura de um arquivo substituído depois dela. Não é aceite de termo nem concordância — por isso o botão diz
  // "Li e confirmo a leitura". `setLidos` só roda DEPOIS da gravação confirmada: se `api` falha (rede, sessão,
  // arquivo retirado), cai no `catch` e o arquivo continua pendente.
  async function confirmarLeitura(a) {
    // Sem a leitura das confirmações não se sabe se a participação existe: "ainda não foi aberta" seria afirmar o que não se sabe.
    if (!leituraConhecida) { setAviso({ id: a.id, tom: 'erro', texto: 'Não deu para conferir suas confirmações agora. Toque em “Tentar de novo” e confirme depois.' }); return }
    if (!participacaoId) { setAviso({ id: a.id, tom: 'erro', texto: 'Sua participação ainda não foi aberta: a confirmação fica disponível quando ela abrir.' }); return }
    setConfirmando(a.id)
    setAviso(null)
    try {
      // Arquivo só desta marca em OUTRA participação (edição antiga) confirma por ela; o geral, pela mais recente.
      const r = await api('rpc/marca_confirmar_leitura', {
        metodo: 'POST',
        corpo: { p_arquivo: a.id, p_participacao: a.participacao_id || participacaoId },
      })
      guarda()                      // uma leitura em voo é anterior a esta confirmação: não pode desfazê-la
      // A hora que o banco gravou; sem ela, uma provisória (nunca antes da publicação) até a releitura que o registro dispara.
      setLidos((l) => ({ ...l, [a.id]: (r && r.lido_em) || leituraProvisoria(a) }))
      setRecemLidos((s) => new Set(s).add(a.id))   // fica no bloco "Para ler", já confirmado: a lista não pula de lugar
      setAviso({ id: a.id, tom: 'ok', texto: TEXTO.okLer })
      if (recarregarResumo) recarregarResumo()
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      const gone = e && e.message === 'arquivo_nao_encontrado'
      if (gone) carregar().catch(() => {})   // a lista mostrava um arquivo que já saiu: relê
      setAviso({ id: a.id, tom: 'erro', texto: e && e.message === 'modo_visualizacao' ? traduzirErro(e.message) : gone ? 'A organização retirou ou trocou este arquivo. A lista foi atualizada.' : TEXTO.erroLer })
    } finally {
      setConfirmando(null)
    }
  }

  const agora = new Date()
  const visiveis = arquivos && arquivos.filter((a) => a.categoria !== 'combo')
  const { paraLer, grupos, leituraIncerta } = organizarArquivos(visiveis, leituraConhecida ? lidos : null, recemLidos)
  const faltam = paraLer.filter((a) => precisaLeitura(a, lidos)).length   // o selo conta só quem ainda falta confirmar
  const item = (a) => (
    <ItemArquivo key={a.id} a={a} lido={lidos[a.id]} leituraConhecida={leituraConhecida} textos={TEXTO} agora={agora}
      destacado={destaque === a.id} ocupado={ocupado} confirmando={confirmando}
      retorno={aviso && aviso.id === a.id ? aviso : null} aoAcessar={acessar} aoConfirmar={confirmarLeitura} />
  )
  const plural = (n, um, varios) => (n === 1 ? um : n + ' ' + varios)

  const lista = (
    <Secao titulo="Abrir e baixar" nota={visiveis && visiveis.length > 0 ? notaDeAbertura(plat) : undefined}>
      {aviso && aviso.id === null && <p className="ui-nota ui-nota--erro" role="alert">{aviso.texto}</p>}
      {erro && <Erro texto="Não deu para carregar os arquivos agora." onTentar={tentarDeNovo} />}
      {!erro && arquivos === null && <Carregando linhas={3} />}
      {!erro && visiveis && visiveis.length === 0 && (
        <Vazio titulo="Nenhum arquivo ainda">Quando a organização publicar guias, documentos ou arquivos da sua marca, eles aparecem aqui, com aviso.</Vazio>)}
      {leituraIncerta && (
        <div className="ui-nota ui-nota--erro" role="alert">
          <p>Não deu para conferir quais arquivos você já leu, então não dá para dizer o que falta confirmar.</p>
          <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={tentarDeNovo}>Tentar de novo</button>
        </div>
      )}
      {visiveis && visiveis.length > 0 && (
        <GradeModulos>
          {paraLer.length > 0 && (
            <Modulo largo icone="documento" titulo={TEXTO.blocoLer} sub={TEXTO.blocoLerSub}
              status={faltam > 0 ? <Selo tom="atencao">{plural(faltam, '1 para confirmar', 'para confirmar')}</Selo> : <Selo tom="ok">Tudo confirmado</Selo>}>
              <ul className="am-lista">{paraLer.map(item)}</ul>
            </Modulo>
          )}
          {grupos.map((g) => {
            const novos = g.itens.filter((a) => ehNovo(a, agora)).length
            return (
              <Modulo key={g.chave} largo icone={ICONE_CATEGORIA[g.chave] || 'pasta'} titulo={g.rotulo} sub={g.descricao || undefined}
                status={novos > 0 ? <Selo tom="andamento">{plural(novos, '1 novo', 'novos')}</Selo> : undefined}>
                <ul className="am-lista">{g.itens.map(item)}</ul>
              </Modulo>
            )
          })}
        </GradeModulos>
      )}
    </Secao>
  )
  return (
    <section className="ui-vista-marca">
      <VistaCabeca acento="marrom" icone="arquivos" titulo="Arquivos" nota="Marca do festival, guias e documentos" />
      <PendenciasFotos itens={pendenciasDeArquivos(resumo)} abrirLink={abrirLink} titulo="Solicitações sobre arquivos" classe="am-pendencias" />
      {lista}
    </section>
  )
}
