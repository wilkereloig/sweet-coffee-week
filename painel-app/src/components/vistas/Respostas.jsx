import React from 'react'
import { rpc } from '../../lib/rpc'
import { ORIGENS, filtrados, escapar, dataCurta } from '../../lib/respostas'

export function Respostas() {
  const [dados, setDados] = React.useState(null) // null = carregando
  const [erro, setErro] = React.useState(null)
  const [aba, setAba] = React.useState('tudo')
  const [status, setStatus] = React.useState('')
  const [dias, setDias] = React.useState('')
  const [termo, setTermo] = React.useState('')

  const carregar = React.useCallback(async () => {
    setErro(null)
    const senha = sessionStorage.getItem('scw_org') || ''
    const chaves = Object.keys(ORIGENS)
    try {
      const [valida, ...listas] = await Promise.all([
        rpc('admin_ping', { p_secret: senha }),
        ...chaves.map((k) => rpc(ORIGENS[k].rpc, { p_secret: senha })),
      ])
      if (valida !== true) {
        setErro('A senha desta sessão não vale mais. Saia e entre de novo.')
        return
      }
      const novo = {}
      chaves.forEach((k, i) => { novo[k] = listas[i] || [] })
      setDados(novo)
    } catch (e) {
      setErro(e.message)
    }
  }, [])

  React.useEffect(() => { carregar() }, [carregar])

  const vocabStatus = aba === 'tudo'
    ? [...new Set(Object.values(ORIGENS).flatMap((o) => o.status))]
    : ORIGENS[aba].status

  const itens = dados ? filtrados(dados, { aba, status, dias, termo }) : []
  const contagem = { tudo: 0 }
  Object.keys(ORIGENS).forEach((o) => { contagem[o] = (dados && dados[o] || []).length; contagem.tudo += contagem[o] })

  return (
    <section className="og-vista">
      <ul className="og-abas" role="tablist">
        {[['tudo', 'Tudo', null], ...Object.entries(ORIGENS).map(([k, o]) => [k, o.rotulo, o.cor])].map(([chave, rotulo, cor]) => (
          <li key={chave}>
            <button
              type="button" role="tab" className="og-aba"
              aria-selected={aba === chave}
              onClick={() => { setAba(chave); setStatus('') }}
            >
              {cor && <span className="og-aba__ponto" style={{ background: cor }} />}
              {rotulo} <span className="og-aba__n">{contagem[chave] ?? 0}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="og-filtros">
        <label className="og-campo og-campo--busca">
          <span>Buscar</span>
          <input type="search" placeholder="nome, empresa ou e-mail" value={termo} onChange={(e) => setTermo(e.target.value)} />
        </label>
        <label className="og-campo">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {vocabStatus.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="og-campo">
          <span>Período</span>
          <select value={dias} onChange={(e) => setDias(e.target.value)}>
            <option value="">Sempre</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </label>
      </div>

      <div>
        {erro && (
          <div className="og-estado" data-tom="erro">
            <h2>Não consegui carregar</h2>
            <p>{erro}</p>
          </div>
        )}
        {!erro && dados && itens.length === 0 && (
          <div className="og-estado">
            <h2>Nenhuma resposta aqui</h2>
            <p>{contagem.tudo === 0 ? 'Ainda não chegou nenhuma resposta.' : 'Nada com esses filtros.'}</p>
          </div>
        )}
        {!erro && dados && itens.length > 0 && (
          <ul className="og-lista">
            {itens.map(({ origem, reg }) => {
              const o = ORIGENS[origem]
              return (
                <li key={origem + ':' + reg.id}>
                  <button type="button" className="og-item">
                    <span className="og-item__cor" style={{ background: o.cor }} />
                    <p className="og-item__nome">{escapar(o.titulo(reg) || '(sem nome)')}</p>
                    <p className="og-item__meta">{escapar(o.rotulo + (o.meta(reg) ? ' · ' + o.meta(reg) : ''))}</p>
                    <span className="og-item__dir">
                      <span className="og-selo" data-novo={reg.status === 'novo' ? '1' : '0'}>{reg.status}</span>
                      <span className="og-item__data">{dataCurta(reg.created_at)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
