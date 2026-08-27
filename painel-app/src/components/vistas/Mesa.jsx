import React from 'react'
import { rpc } from '../../lib/rpc'
import { ORIGENS } from '../../lib/respostas'
import { ETAPAS, colunasMesa } from '../../lib/mesa'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { VistaCabeca } from '../VistaCabeca'
import { ICONE } from '../PainelShell'

// Ícones dos discos de coluna e do combo do cartão — 32×32, exclusivos desta
// vista (não são os da rail/VistaCabeca, que são 24×24). Copiados à mão de
// public/painel/index.html (ICONE_ETAPA/ICONE_COMBO, ~2371-2383): o arquivo
// é estático e ScwIcon não é alcançável dali, mesma regra de lá.
const ICONE_ETAPA = {
  novas: <><path d="M7.4 4.6h17.2a2 2 0 0 1 2 2v18.8a2 2 0 0 1-2 2H7.4a2 2 0 0 1-2-2V6.6a2 2 0 0 1 2-2Z" /><path d="M10.6 11.4h10.8M10.6 16h10.8M10.6 20.6h5.4" strokeWidth="2.4" /></>,
  analise: <><path d="M4.6 8.6h22.8a2 2 0 0 1 2 2v10.8a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2V10.6a2 2 0 0 1 2-2Z" /><circle cx="10" cy="16" r="2.2" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="2.2" fill="currentColor" stroke="none" /><circle cx="22" cy="16" r="2.2" fill="currentColor" stroke="none" /></>,
  contatadas: <><path d="M28.4 4.6 3.6 14.4l9.2 3.6 3.6 9.2Z" /><path d="M28.4 4.6 12.8 18" strokeWidth="2.4" /></>,
  aprovadas: <><circle cx="16" cy="16" r="12.2" strokeDasharray="0.1 6.2" /><path d="M10.8 16.4l4.2 4.2 6.6-8" /></>,
  acesso: <><path d="M6.6 11.4h18.8l-1.4 14a2.2 2.2 0 0 1-2.2 2H10.2a2.2 2.2 0 0 1-2.2-2Z" /><path d="M11.8 11.4V9a4.2 4.2 0 0 1 8.4 0v2.4" /></>,
  completas: <><circle cx="16" cy="16" r="11.8" /><path fill="currentColor" stroke="none" d="M16 8.2c1.4 4 3.6 6.2 7.6 7.6-4 1.4-6.2 3.6-7.6 7.6-1.4-4-3.6-6.2-7.6-7.6 4-1.4 6.2-3.6 7.6-7.6Z" /></>,
}
const ICONE_COMBO = [
  <><path d="M7 13.4a9 9 0 0 1 18 0Z" /><path d="M7.8 13.4h16.4l-2 11.6a2.2 2.2 0 0 1-2.2 1.8h-8a2.2 2.2 0 0 1-2.2-1.8Z" /><path d="M13.4 17.6l-.6 6.2M18.6 17.6l.6 6.2" strokeWidth="2.4" /></>,
  <><circle cx="11.4" cy="18.4" r="7.6" /><circle cx="22.4" cy="12" r="6.4" /></>,
  <><path d="M6 12h13.6v4.4a6.8 6.8 0 0 1-13.6 0Z" /><path d="M19.6 13.8h2.2a2.8 2.8 0 0 1 0 5.6h-2.2" /><path d="M4.4 27.8h17.2" /><path d="M11 7.6c-1.7-1.5-1.7-3.2 0-4.7M16.2 7.6c-1.7-1.5-1.7-3.2 0-4.7" strokeWidth="2.4" /></>,
]

export function Mesa({ registrarAtualizar, reportarEstado }) {
  const [candidaturas, setCandidaturas] = React.useState(null) // null = carregando
  const [participantes, setParticipantes] = React.useState([])
  const [participantesErro, setParticipantesErro] = React.useState('')
  const [erro, setErro] = React.useState(null)
  const [copiado, setCopiado] = React.useState(null)

  const carregar = React.useCallback(async () => {
    setErro(null)
    const senha = sessionStorage.getItem(CHAVE_SESSAO) || ''
    try {
      const [valida, lista] = await Promise.all([
        rpc('admin_ping', { p_secret: senha }),
        rpc(ORIGENS.quero_participar.rpc, { p_secret: senha }),
      ])
      if (valida !== true) {
        setErro('A senha desta sessão não vale mais. Saia e entre de novo.')
        return
      }
      setCandidaturas(lista || [])
      // Carga apartada e que NÃO derruba a mesa: `get_participantes` só existe
      // depois da migration das contas — um 404 dela fica contido aqui, sem
      // levar a vista inteira para a tela de erro (CLAUDE.md §10.4-b).
      try {
        const p = (await rpc('get_participantes', { p_secret: senha })) || []
        setParticipantes(p)
        setParticipantesErro('')
        if (reportarEstado) reportarEstado({ participantes: p })
      } catch (e) {
        setParticipantes([])
        setParticipantesErro(e.message)
      }
    } catch (e) {
      setErro(e.message)
    }
  }, [reportarEstado])

  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => {
    if (registrarAtualizar) registrarAtualizar(carregar)
  }, [registrarAtualizar, carregar])

  const colunas = candidaturas ? colunasMesa({ candidaturas, participantes }) : ETAPAS.map((e) => ({ ...e, itens: [] }))

  async function copiarLink(chave, url) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(chave)
    } catch {
      // Sem clipboard (contexto inseguro, permissão negada): a URL já está
      // na tela logo acima — não fingir que copiou.
      setCopiado(chave + ':manual')
    }
    setTimeout(() => setCopiado(null), 2400)
  }

  return (
    <section className="og-vista">
      <VistaCabeca acento="amarelo" icone={ICONE.mesa} titulo="A mesa" nota="Onde cada marca está, do site até o combo fechado" />

      {erro && (
        <div className="og-estado" data-tom="erro">
          <h2>Não consegui carregar</h2>
          <p>{erro}</p>
        </div>
      )}

      {!erro && participantesErro && (
        <div className="og-aviso" data-tom="erro">Não consegui listar as marcas com conta: {participantesErro}</div>
      )}

      {!erro && candidaturas && (
        <div className="og-mesa">
          {colunas.map((e) => (
            <div className="og-mesa__col" key={e.chave}>
              <div className="og-mesa__cabeca">
                <span className="og-mesa__disco" style={{ background: e.cor, color: e.tinta }} aria-hidden="true">
                  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {ICONE_ETAPA[e.chave]}
                  </svg>
                </span>
                <span>
                  <span className="og-mesa__nome">{e.nome}</span>
                  <span className="og-mesa__legenda">{e.legenda}</span>
                </span>
                <span className="og-mesa__n">{e.itens.length}</span>
              </div>
              {e.itens.length === 0 ? (
                <p className="og-mesa__vazio">Ninguém aqui</p>
              ) : (
                e.itens.map((it) => {
                  const chave = it.tipo === 'marca' ? 'marca:' + it.participacaoId : 'cand:' + it.id
                  return (
                    <button type="button" className="og-cartao" key={chave}>
                      <span className="og-cartao__topo">
                        {it.novo && <span className="og-cartao__ponto" aria-hidden="true" />}
                        <b className="og-cartao__nome">{it.nome || '(sem nome)'}</b>
                      </span>
                      <span className="og-cartao__meta">{it.meta || ''}</span>
                      {it.tipo === 'marca' && (
                        <span className="og-cartao__combo">
                          {[0, 1, 2].map((i) => (
                            <span key={i} style={{ color: i < it.itensProntos ? 'var(--scw-choco)' : 'var(--scw-marrom)' }}>
                              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                {ICONE_COMBO[i]}
                              </svg>
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          ))}
        </div>
      )}

      <section className="og-forms" style={{ marginTop: 22 }}>
        <div className="og-forms__cabeca">
          <h2>Os formulários</h2>
          <p>Onde cada resposta desta tela nasce.</p>
        </div>
        <ul className="og-forms__lista">
          {Object.entries(ORIGENS).map(([chave, o]) => {
            const publico = !!o.form
            const url = publico ? window.location.origin + o.form : ''
            return (
              <li className="og-forms__item" key={chave}>
                <div className="og-forms__topo">
                  <span className="og-forms__ponto" style={{ background: o.cor }} aria-hidden="true" />
                  <p className="og-forms__nome">{o.rotulo}</p>
                </div>
                {publico ? (
                  <>
                    <p className="og-forms__url">{url}</p>
                    <div className="og-forms__acoes">
                      <a className="og-btn og-btn--mini" href={o.form} target="_blank" rel="noopener noreferrer">Abrir</a>
                      <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={() => copiarLink(chave, url)}>
                        {copiado === chave ? 'Link copiado' : copiado === chave + ':manual' ? 'Copie da linha acima' : 'Copiar link'}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="og-forms__nota">Ainda não está público. Vive na {o.formNota} e vai ao ar junto com o site institucional.</p>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </section>
  )
}
