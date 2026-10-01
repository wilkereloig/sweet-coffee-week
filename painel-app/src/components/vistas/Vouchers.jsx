import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { dataHoraCurta } from '../../lib/painelFormat'
import { resumoPorMarca, resumoPorContato } from '../../lib/vouchers'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { FichaContato, erroContato } from './Contatos'
import { Carregando, Vazio, Erro, Secao, Selo, Ajuda, LogoMarca } from '../ui'
import { urlLogo } from '../../lib/logos'
import { confirmar } from '../Confirmar'

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

/*
 * Contatos › Vouchers (reestruturação 29/09/2026, etapa 6). Regra do Wilker:
 * cada marca da edição cede N vouchers do próprio combo (N configurável na
 * edição, padrão 7). A organização destina cada voucher a uma pessoa e marca
 * o envio; a MARCA registra o uso digitando o código no painel dela.
 * Duas leituras: por marca (quanto cada uma ainda tem) e por pessoa.
 */
export function Vouchers({ registrarAtualizar, pode, rota, navegar }) {
  const [dados, setDados] = React.useState(null)
  const [contatos, setContatos] = React.useState([])
  const [logos, setLogos] = React.useState({})
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [visao, setVisao] = React.useState('marcas')
  const [aberta, setAberta] = React.useState(null) // participacao_id expandida
  const [destino, setDestino] = React.useState({ contato: '', quantidade: 1 })
  const [gerando, setGerando] = React.useState(false)
  const podeMudar = pode('relacionamento.gerir')
  const aberto = rota.filtros.item || null

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      const d = await rpc('get_vouchers', { p_secret: lerSenha() })
      if (d == null) throw new Error('nao_autorizado')
      setDados(d)
    } catch (e) { setErro(e.message) }
    try { setContatos((await rpc('get_contatos', { p_secret: lerSenha() })) || []) } catch { setContatos([]) }
    // Logo de cada marca (leitura à parte: sem ela a lista segue com iniciais).
    try { setLogos(Object.fromEntries(((await rpc('get_logos', { p_secret: lerSenha() })) || []).map((l) => [l.participante_id, l.path]))) } catch { setLogos({}) }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])

  async function gerar() {
    setGerando(true); setAviso(null)
    try {
      const n = await rpc('gerar_vouchers', { p_secret: lerSenha() })
      setAviso({ ok: n ? n + (n === 1 ? ' voucher gerado.' : ' vouchers gerados.') : 'Todas as marcas já estão com a cota completa.' })
      await carregar()
    } catch (e) { setAviso(erroContato(e.message)) } finally { setGerando(false) }
  }
  async function destinar(participacao) {
    if (!destino.contato) { setAviso('Escolha para quem vai o voucher.'); return }
    setAviso(null)
    try {
      const cods = await rpc('destinar_vouchers', { p_secret: lerSenha(), p_participacao: participacao, p_contato: destino.contato, p_quantidade: Number(destino.quantidade) || 1, p_obs: null })
      setAviso({ ok: 'Destinado: ' + (cods || []).join(', ') + '.' })
      setDestino({ contato: '', quantidade: 1 })
      await carregar()
    } catch (e) { setAviso(erroContato(e.message)) }
  }
  async function mudar(v, status) {
    if (status === 'cancelado' && !await confirmar('Cancelar o voucher ' + v.codigo + '? Ele deixa de valer na marca.')) return
    setAviso(null)
    try { await rpc('atualizar_voucher', { p_secret: lerSenha(), p_voucher: v.id, p_status: status, p_obs: null }); await carregar() }
    catch (e) { setAviso(erroContato(e.message)) }
  }

  if (erro) return <Erro texto={erro} onTentar={carregar} />
  if (!dados) return <Carregando />
  if (!dados.edicao) return <Vazio titulo="Nenhuma edição aberta">Abra a edição em Edição › Configuração.</Vazio>
  const porMarca = resumoPorMarca(dados.vouchers, dados.marcas, dados.cota)
  const porPessoa = resumoPorContato(dados.vouchers)
  const faltaGerar = porMarca.reduce((s, m) => s + m.faltaGerar, 0)
  const soma = (k) => porMarca.reduce((s, m) => s + m[k], 0)

  return (
    <div className="og-embutida">
      <div className="ui-barra">
        <div className="ui-filtros-mini" role="group" aria-label="Ver por">
          <button type="button" className="ui-chip" aria-pressed={visao === 'marcas'} onClick={() => setVisao('marcas')}>Por marca</button>
          <button type="button" className="ui-chip" aria-pressed={visao === 'pessoas'} onClick={() => setVisao('pessoas')}>Por pessoa ({porPessoa.length})</button>
        </div>
        {podeMudar && faltaGerar > 0 && (
          <button className="og-btn" type="button" disabled={gerando} onClick={gerar}>{gerando ? 'Gerando…' : 'Gerar ' + faltaGerar + ' vouchers da edição'}</button>
        )}
      </div>
      <ul className="ui-numeros ui-numeros--compacto" aria-label="Resumo dos vouchers">
        {[['gerados', 'gerados'], ['disponiveis', 'disponíveis'], ['destinados', 'destinados'], ['enviados', 'enviados'], ['utilizados', 'usados']].map(([k, r]) => (
          <li key={k}><span className="ui-numero"><span className="ui-numero__n">{soma(k)}</span><span className="ui-numero__rotulo">{r}</span></span></li>
        ))}
      </ul>
      <Ajuda titulo="Como os vouchers funcionam">
        <p>Cada marca da edição {dados.edicao} cede {dados.cota} vouchers do próprio combo. Cada voucher tem um código (SCW-XXXXX) que só vale naquela marca.</p>
        <p>A equipe destina o voucher a uma pessoa e marca quando ele foi enviado. Quem registra o uso é a marca, digitando o código no painel dela na hora em que o cliente apresenta.</p>
      </Ajuda>
      {aviso && (aviso.ok ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p> : <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>)}

      {visao === 'marcas' && (
        <Secao titulo={'Marcas da edição ' + dados.edicao} nota={porMarca.length + ' marcas · ' + dados.cota + ' vouchers cada'}>
          {porMarca.length === 0 && <Vazio titulo="Nenhuma marca na edição" />}
          <ul className="og-lista">{porMarca.map((m) => (
            <li key={m.participacao_id}>
              <button type="button" className="og-item og-item--logo" aria-expanded={aberta === m.participacao_id} onClick={() => setAberta(aberta === m.participacao_id ? null : m.participacao_id)}>
                <LogoMarca url={urlLogo(logos[m.participante_id])} nome={m.marca} tamanho={36} />
                <span className="og-item__nome">{m.marca}</span>
                <span className="og-item__meta">{m.gerados} de {m.cota} gerados · {m.disponiveis} disponíveis · {m.destinados} destinados · {m.enviados} enviados · {m.utilizados} usados</span>
                <span className="og-item__dir">{m.faltaGerar > 0 && <Selo tom="atencao">Faltam gerar {m.faltaGerar}</Selo>}</span>
              </button>
              {aberta === m.participacao_id && (
                <div className="ui-pilha ui-expandido">
                  <ul className="og-lista">{m.vouchers.map((v) => (
                    <li key={v.id}>
                      <div className="og-item og-item--info">
                        <span className="og-item__cor" data-chave="arquivo" aria-hidden="true" />
                        <p className="og-item__nome">{v.codigo}</p>
                        <p className="og-item__meta">{v.contato ? <button type="button" className="og-link" onClick={() => navegar({ filtros: { item: v.contato_id } })}>{v.contato}</button> : 'sem destino'}{[v.enviado_em && ' · enviado ' + dataCurta(v.enviado_em), v.utilizado_em && ' · usado ' + dataHoraCurta(v.utilizado_em), v.responsavel_rotulo && ' · por ' + v.responsavel_rotulo].filter(Boolean).join('')}</p>
                        <span className="og-item__dir">
                          <Selo dominio="voucher" valor={v.status} />
                          {podeMudar && v.status === 'destinado' && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => mudar(v, 'enviado')}>Enviado</button>}
                          {podeMudar && ['destinado', 'enviado'].includes(v.status) && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => mudar(v, 'disponivel')}>Liberar</button>}
                          {podeMudar && v.status !== 'utilizado' && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => mudar(v, 'cancelado')}>Cancelar</button>}
                        </span>
                      </div>
                    </li>
                  ))}</ul>
                  {podeMudar && m.disponiveis > 0 && (
                    <form className="ui-form ui-form--linha-dupla" onSubmit={(e) => { e.preventDefault(); destinar(m.participacao_id) }}>
                      <label className="og-campo"><span>Para quem</span>
                        <select value={destino.contato} onChange={(e) => setDestino({ ...destino, contato: e.target.value })}>
                          <option value="">Escolha um contato</option>
                          {contatos.filter((c) => c.ativo !== false).map((c) => <option key={c.id} value={c.id}>{c.nome}{c.instagram ? ' · ' + c.instagram : ''}</option>)}
                        </select>
                      </label>
                      <label className="og-campo"><span>Quantidade</span>
                        <input type="number" min="1" max={m.disponiveis} inputMode="numeric" value={destino.quantidade} onChange={(e) => setDestino({ ...destino, quantidade: e.target.value })} />
                      </label>
                      <button className="og-btn og-btn--mini" type="submit">Destinar</button>
                    </form>
                  )}
                </div>
              )}
            </li>
          ))}</ul>
        </Secao>
      )}

      {visao === 'pessoas' && (
        <Secao titulo="Quem recebeu nesta edição">
          {porPessoa.length === 0 && <Vazio titulo="Nenhum voucher destinado ainda" />}
          <ul className="og-lista">{porPessoa.map((p) => (
            <li key={p.contato_id}>
              <button type="button" className="og-item" onClick={() => navegar({ filtros: { item: p.contato_id } })}>
                <span className="og-item__cor" data-chave="arquivo" aria-hidden="true" />
                <span className="og-item__nome">{p.contato}</span>
                <span className="og-item__meta">{p.total} {p.total === 1 ? 'voucher' : 'vouchers'} · {p.enviados} enviados · {p.utilizados} usados · {p.marcas.join(', ')}</span>
              </button>
            </li>
          ))}</ul>
        </Secao>
      )}

      <FichaContato id={aberto} pode={pode} onFechar={() => navegar({ filtros: {} })} onMudou={carregar} />
    </div>
  )
}
