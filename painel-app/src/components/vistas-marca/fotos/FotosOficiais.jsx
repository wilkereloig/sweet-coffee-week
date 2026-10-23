import React from 'react'
import { api, obterArquivoMarca } from '../../../lib/marcaApi'
import { dataHoraExtensa } from '../../../lib/central'
import { plataforma } from '../../../lib/instalar'
import { acoesDoArquivo, notaDeAbertura, leituraProvisoria, mapaDeLeituras } from '../../../lib/arquivosMarca'
import { useEntrega, BotoesEntrega, EstadoEntrega } from '../../vistas/BaixarArquivo'
import { situacaoDaLeitura, detalheDaFoto, situacaoDaConferencia } from '../../../lib/fotosMarca'
import { MacroSecao, Carregando, Erro, Selo, Vazio, traduzirErro } from '../../ui'
import { Icone } from '../../Icone'
import { Miniatura } from './Miniatura'
import { AvisoComFoco } from '../AvisoComFoco'
import { useAcessoArquivo } from '../arquivos/useAcessoArquivo'
import { useSincronizar, useGuarda } from '../../../lib/sync/react'

/*
 * Bloco 3 da aba Fotos — FOTOS OFICIAIS: as que a organização entrega (categoria "combo"), com miniatura, Abrir e
 * Baixar (o MESMO caminho da aba Arquivos: `useAcessoArquivo` — o link assinado ganha `download` para baixar de verdade,
 * e a nota diz o que acontece em cada aparelho, inclusive "Compartilhar › Salvar imagem" no iPhone) e a confirmação
 * de que a marca conferiu. Com 2 fotos ou mais, "Baixar todas (ZIP)" e "Salvar ou compartilhar" — as MESMAS peças da
 * equipe (vistas/BaixarArquivo.jsx), com o caminho de busca da marca (`obterArquivoMarca`, em lib/marcaApi.js).
 * Foto SUBSTITUÍDA depois da conferência volta a pedir "Conferi as fotos" (`marca_confirmar_leitura` renova).
 *
 * Leitura e confirmação são as mesmas da aba Arquivos (que não as mostra mais aqui): `arquivos` (sem os arquivados,
 * como a contagem do Início) e `arquivo_leitura`, cada uma com o próprio resultado — uma falhar não apaga a outra.
 * Falha de leitura NUNCA vira "sem fotos": sem dado diz que não carregou e oferece tentar de novo; sem a leitura da
 * conferência não se afirma que a pessoa ainda não conferiu.
 *
 * O resultado de cada ação (baixar, abrir, conferir) aparece DENTRO do cartão em que a pessoa tocou e recebe o foco:
 * "Conferi as fotos" some depois de gravar, e o foco não pode cair no corpo da página.
 */
export function FotosOficiais({ participacao, alvo, consumirAlvo, recarregarResumo }) {
  const [arquivos, setArquivos] = React.useState(null)
  const [lidos, setLidos] = React.useState({})
  const [leituraOk, setLeituraOk] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const [confirmando, setConfirmando] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)          // { id, tom: 'ok' | 'erro', texto } — id = a foto
  const [destaque, setDestaque] = React.useState(null)
  const { ocupado, acessar } = useAcessoArquivo(setAviso)
  // Todas de uma vez (2 ou mais): o mesmo ZIP / "Salvar ou compartilhar" da equipe, buscando pela sessão DA MARCA.
  const entrega = useEntrega({ obter: obterArquivoMarca, quem: 'marca' })

  const guarda = useGuarda()
  const temArquivos = React.useRef(false)
  const plat = React.useMemo(() => plataforma(), [])

  const carregar = React.useCallback(async () => {
    const vale = guarda()
    const [rArq, rLeit] = await Promise.allSettled([
      api('arquivos?select=*&arquivado=eq.false&categoria=eq.combo&order=publicado_em.desc.nullslast'),
      api('arquivo_leitura?select=arquivo_id,lido_em'),
    ])
    if (!vale()) return
    const morta = (r) => r.status === 'rejected' && r.reason && r.reason.message === 'sessao_expirada'
    if (morta(rArq) || morta(rLeit)) return                   // o App leva ao login
    // A conferência entra antes da lista: a lista nunca aparece "sem conferência" por uma ordem de gravação.
    if (rLeit.status === 'fulfilled') {
      setLidos(mapaDeLeituras(rLeit.value))   // uma linha por participação: vale a leitura mais recente de cada foto
      setLeituraOk(true)
    }
    if (rArq.status === 'fulfilled') { setArquivos(rArq.value || []); setErro(null); temArquivos.current = true }
    else if (!temArquivos.current) setErro(rArq.reason && rArq.reason.message)
    // A leitura da conferência que falha mantém a anterior (se houve); a falha conta no indicador de sincronização.
    const falha = [rArq, rLeit].find((r) => r.status === 'rejected')
    if (falha) throw falha.reason
  }, [guarda])
  React.useEffect(() => { carregar().catch(() => {}) }, [carregar])
  useSincronizar(['arquivos', 'participantes'], carregar)
  const tentarDeNovo = () => { setErro(null); carregar().catch(() => {}) }

  // Aviso de foto oficial (`fotos`/`arquivos/<id>`): destaca a foto e leva até ela.
  React.useEffect(() => {
    if (!alvo || !alvo.id || !arquivos) return
    setDestaque(alvo.id)
    if (consumirAlvo) consumirAlvo()
    const el = document.getElementById('fm-foto-' + alvo.id)
    if (el) el.scrollIntoView({ block: 'center' })
  }, [alvo, arquivos]) // eslint-disable-line react-hooks/exhaustive-deps

  // Só ciência: grava `arquivo_leitura` (quem conferiu e quando). Não é aceite de termo. `setLidos` só roda DEPOIS da
  // gravação confirmada: se `api` falha (rede, RLS, sessão), cai no `catch` e a foto continua por conferir.
  async function conferir(a) {
    if (!participacao) { setAviso({ id: a.id, tom: 'erro', texto: 'Sua participação ainda não foi aberta: a conferência fica disponível quando ela abrir.' }); return }
    setConfirmando(a.id)
    setAviso(null)
    try {
      // Também renova a conferência de uma foto substituída depois dela (o banco decide).
      const r = await api('rpc/marca_confirmar_leitura', {
        metodo: 'POST',
        corpo: { p_arquivo: a.id, p_participacao: a.participacao_id || participacao.id },
      })
      guarda()                      // uma leitura em voo é anterior a esta confirmação: não pode desfazê-la
      // A hora que o banco gravou; sem ela, uma provisória (nunca antes da publicação) até a releitura que o registro dispara.
      setLidos((l) => ({ ...l, [a.id]: (r && r.lido_em) || leituraProvisoria(a) }))
      setLeituraOk(true)
      setAviso({ id: a.id, tom: 'ok', texto: 'Conferência registrada.' })
      if (recarregarResumo) recarregarResumo()
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      // "Ver como participante": nada é gravado e repetir não adianta — a frase do modo, não "tente de novo".
      setAviso({ id: a.id, tom: 'erro', texto: e && e.message === 'modo_visualizacao' ? traduzirErro(e.message) : 'Não deu para registrar a conferência agora. Tente de novo.' })
    } finally {
      setConfirmando(null)
    }
  }

  const situacao = situacaoDaLeitura({ dados: arquivos, erro })
  const semConferencia = situacao === 'pronto' && !leituraOk && arquivos.some((a) => a.exige_leitura)
  return (
    <MacroSecao id="fm-oficiais" rotulo="Fotos oficiais" titulo="As fotos do seu combo" nota="As fotos que a organização entrega. Baixe cada uma e, quando pedido, confirme que conferiu.">
      {situacao === 'erro' && <Erro texto="Não deu para carregar as fotos oficiais agora." onTentar={tentarDeNovo} />}
      {situacao === 'carregando' && <Carregando linhas={3} texto="Carregando as fotos oficiais…" />}
      {situacao === 'pronto' && arquivos.length === 0 && (
        <Vazio titulo="As fotos oficiais ainda não estão disponíveis" icone="imagem">Você será avisado quando a organização liberar as fotos.</Vazio>
      )}
      {semConferencia && (
        <Erro titulo="Não deu para verificar suas conferências" texto="Não conseguimos ver quais fotos você já conferiu. Tente de novo antes de confirmar." onTentar={tentarDeNovo} />
      )}
      {situacao === 'pronto' && arquivos.length > 0 && <p className="ui-nota">{notaDeAbertura(plat, { fotos: true })}</p>}
      {situacao === 'pronto' && arquivos.length > 1 && (
        <>
          <div className="ui-linha-acoes">
            <BotoesEntrega entrega={entrega} nomeZip="Fotos oficiais" rotuloBaixar="Baixar todas (ZIP)"
              itens={arquivos.map((a) => ({ path: a.path, nome: a.nome, mime: a.mime, tamanho: a.tamanho }))} />
          </div>
          <EstadoEntrega entrega={entrega} />
        </>
      )}
      {situacao === 'pronto' && arquivos.length > 0 && (
        <ul className="fm-fotos">
          {arquivos.map((a) => {
            const conf = situacaoDaConferencia(a, lidos, leituraOk)
            const ocupadoAqui = ocupado && ocupado.id === a.id
            return (
              <li key={a.id} id={'fm-foto-' + a.id} className={'fm-foto ui-bloco-interno' + (destaque === a.id ? ' is-destaque' : '')}>
                <Miniatura arquivo={a} />
                <div className="fm-foto__corpo">
                  <b>{a.nome}</b>
                  <span>{detalheDaFoto(a)}</span>
                  {a.descricao && <span>{a.descricao}</span>}
                  <Selo tom={a.escopo === 'marca' ? 'andamento' : 'neutro'}>{a.escopo === 'marca' ? 'Só para você' : 'Para todos os participantes'}</Selo>
                  {conf === 'lido' && <span className="fm-foto__conf"><Icone nome="sucesso" tamanho={16} />Conferência confirmada em {dataHoraExtensa(lidos[a.id])}</span>}
                  {conf === 'pendente' && <Selo tom="atencao">Confirme que conferiu</Selo>}
                  {conf === 'pendente' && lidos[a.id] && <span>Esta versão foi publicada depois da sua conferência de {dataHoraExtensa(lidos[a.id])}. Confira e confirme de novo.</span>}
                </div>
                <div className="ui-linha-acoes">
                  {acoesDoArquivo(a).abrir && (
                    <button className="og-btn og-btn--vazado og-btn--mini" type="button" aria-label={'Abrir ' + a.nome} disabled={ocupadoAqui} onClick={() => acessar(a, 'abrir')}>
                      <Icone nome="link-externo" tamanho={16} />{ocupadoAqui && ocupado.modo === 'abrir' ? 'Abrindo…' : 'Abrir'}
                    </button>
                  )}
                  <button className="og-btn og-btn--vazado og-btn--mini" type="button" aria-label={'Baixar ' + a.nome} disabled={ocupadoAqui} onClick={() => acessar(a, 'baixar')}>
                    <Icone nome="baixar" tamanho={16} />{ocupadoAqui && ocupado.modo === 'baixar' ? 'Preparando…' : 'Baixar'}
                  </button>
                  {conf === 'pendente' && (
                    <button className="og-btn og-btn--mini" type="button" aria-label={'Conferi as fotos: ' + a.nome} disabled={confirmando === a.id} onClick={() => conferir(a)}>
                      {confirmando === a.id ? 'Registrando…' : 'Conferi as fotos'}
                    </button>
                  )}
                </div>
                <AvisoComFoco aviso={aviso && aviso.id === a.id ? aviso : null} />
              </li>
            )
          })}
        </ul>
      )}
    </MacroSecao>
  )
}
