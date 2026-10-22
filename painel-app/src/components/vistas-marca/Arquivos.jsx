import React from 'react'
import { api } from '../../lib/marcaApi'
import { plataforma } from '../../lib/instalar'
import { ehNovo, organizarArquivos, precisaLeitura, notaDeAbertura, leituraProvisoria } from '../../lib/arquivosMarca'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Vazio, Erro, Secao, Selo, GradeModulos, Modulo, traduzirErro } from '../ui'
import { ItemArquivo } from './arquivos/ItemArquivo'
import { useAcessoArquivo } from './arquivos/useAcessoArquivo'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import '../../styles/arquivos-marca.css'

/*
 * Arquivos (marca) — o que a organização publicou, por categoria, e a
 * confirmação de leitura quando o arquivo pede. As fotos oficiais do combo
 * (categoria combo) moram na aba Fotos (fotos/FotosOficiais.jsx, que usa o mesmo
 * Abrir/Baixar — arquivos/useAcessoArquivo.js). ⚠️ O modo `fotos` deste componente
 * (29/09/2026) não é mais montado por ninguém: ficou só por compatibilidade.
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
  arquivos: {
    botaoLer: 'Li e confirmo a leitura', pedeLer: 'Confirme a leitura', lido: 'Leitura confirmada em ', okLer: 'Leitura registrada.',
    erroLer: 'Não deu para registrar a leitura agora. Tente de novo.',
    blocoLer: 'Para ler e confirmar', blocoLerSub: 'A organização pediu que você confirme a leitura destes arquivos.',
  },
  fotos: {
    botaoLer: 'Conferi as fotos', pedeLer: 'Confirme que conferiu', lido: 'Conferência confirmada em ', okLer: 'Conferência registrada.',
    erroLer: 'Não deu para registrar a conferência agora. Tente de novo.',
    blocoLer: 'Para conferir', blocoLerSub: 'A organização pediu que você confirme que conferiu estas fotos.',
  },
}
// Um assunto = um ícone (nomes do registro único; conferidos em tests/painel-app-arquivos-marca.test.mjs).
const ICONE_CATEGORIA = { combo: 'camera', identidade: 'imagem', guia: 'informacao', documento: 'documento', outro: 'pasta' }

// `fotos` (legado, sem uso): a lista das fotos oficiais (categoria combo) como esta peça já embutiu na aba Fotos;
// hoje elas moram em fotos/FotosOficiais.jsx. Sem ela: a aba Arquivos, com todo o resto.
export function Arquivos({ alvo, consumirAlvo, irPara, fotos = false, recarregarResumo }) {
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
  const texto = fotos ? TEXTO.fotos : TEXTO.arquivos

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
      setLidos(Object.fromEntries((l || []).map((x) => [x.arquivo_id, x.lido_em])))
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
    if (!fotos && a && a.categoria === 'combo' && irPara) { irPara('fotos', { id: alvo.id }); return }
    if (a) setDestaque(alvo.id)
    else if (!fotos) setAviso({ id: null, tom: 'erro', texto: 'Não encontrei esse arquivo na sua lista. Ele pode ter sido retirado pela organização.' })
    if (consumirAlvo) consumirAlvo()
  }, [alvo, arquivos]) // eslint-disable-line react-hooks/exhaustive-deps

  // Só ciência: grava `arquivo_leitura` (quem leu e quando). Não é aceite de termo nem concordância — por isso o
  // botão diz "Li e confirmo a leitura" / "Conferi as fotos". `setLidos` só roda DEPOIS da gravação confirmada:
  // se `api` falha (rede, RLS, sessão), cai no `catch` e o arquivo continua pendente.
  async function confirmarLeitura(a) {
    // Sem a leitura das confirmações não se sabe se a participação existe: "ainda não foi aberta" seria afirmar o que não se sabe.
    if (!leituraConhecida) { setAviso({ id: a.id, tom: 'erro', texto: 'Não deu para conferir suas confirmações agora. Toque em “Tentar de novo” e confirme depois.' }); return }
    if (!participacaoId) { setAviso({ id: a.id, tom: 'erro', texto: 'Sua participação ainda não foi aberta: a confirmação fica disponível quando ela abrir.' }); return }
    setConfirmando(a.id)
    setAviso(null)
    try {
      await api('arquivo_leitura', {
        metodo: 'POST',
        prefer: 'return=minimal,resolution=ignore-duplicates',
        corpo: { arquivo_id: a.id, participacao_id: participacaoId },
      })
      guarda()                      // uma leitura em voo é anterior a esta confirmação: não pode desfazê-la
      // Hora provisória (nunca antes da publicação): a releitura que o próprio registro dispara troca pela do servidor.
      setLidos((l) => ({ ...l, [a.id]: leituraProvisoria(a) }))
      setRecemLidos((s) => new Set(s).add(a.id))   // fica no bloco "Para ler", já confirmado: a lista não pula de lugar
      setAviso({ id: a.id, tom: 'ok', texto: texto.okLer })
      if (recarregarResumo) recarregarResumo()
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setAviso({ id: a.id, tom: 'erro', texto: e && e.message === 'modo_visualizacao' ? traduzirErro(e.message) : texto.erroLer })
    } finally {
      setConfirmando(null)
    }
  }

  const agora = new Date()
  const visiveis = arquivos && arquivos.filter((a) => (fotos ? a.categoria === 'combo' : a.categoria !== 'combo'))
  const { paraLer, grupos, leituraIncerta } = organizarArquivos(visiveis, leituraConhecida ? lidos : null, recemLidos)
  const faltam = paraLer.filter((a) => precisaLeitura(a, lidos)).length   // o selo conta só quem ainda falta confirmar
  const item = (a) => (
    <ItemArquivo key={a.id} a={a} lido={lidos[a.id]} leituraConhecida={leituraConhecida} textos={texto} agora={agora}
      destacado={destaque === a.id} ocupado={ocupado} confirmando={confirmando}
      retorno={aviso && aviso.id === a.id ? aviso : null} aoAcessar={acessar} aoConfirmar={confirmarLeitura} />
  )
  const plural = (n, um, varios) => (n === 1 ? um : n + ' ' + varios)

  const lista = (
    <Secao titulo={fotos ? 'Fotos oficiais' : 'Abrir e baixar'} nota={visiveis && visiveis.length > 0 ? notaDeAbertura(plat, { fotos }) : undefined}>
      {aviso && aviso.id === null && <p className="ui-nota ui-nota--erro" role="alert">{aviso.texto}</p>}
      {erro && <Erro texto="Não deu para carregar os arquivos agora." onTentar={tentarDeNovo} />}
      {!erro && arquivos === null && <Carregando linhas={3} />}
      {!erro && visiveis && visiveis.length === 0 && (fotos
        ? <p className="ui-nota">Ainda não disponíveis. Você será avisado quando as fotos forem liberadas.</p>
        : <Vazio titulo="Nenhum arquivo ainda">Quando a organização publicar guias, documentos ou arquivos da sua marca, eles aparecem aqui, com aviso.</Vazio>)}
      {leituraIncerta && (
        <div className="ui-nota ui-nota--erro" role="alert">
          <p>Não deu para conferir quais arquivos você já leu, então não dá para dizer o que falta confirmar.</p>
          <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={tentarDeNovo}>Tentar de novo</button>
        </div>
      )}
      {visiveis && visiveis.length > 0 && (
        <GradeModulos>
          {paraLer.length > 0 && (
            <Modulo largo icone={fotos ? 'camera' : 'documento'} titulo={texto.blocoLer} sub={texto.blocoLerSub}
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
  if (fotos) return lista

  return (
    <section className="ui-vista-marca">
      <VistaCabeca acento="marrom" icone="arquivos" titulo="Arquivos" nota="Marca do festival, guias e documentos" />
      {lista}
    </section>
  )
}
