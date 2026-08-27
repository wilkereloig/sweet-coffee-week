import React from 'react'
import { api } from '../../lib/marcaApi'
import { blocosPendentes, chaveDia } from '../../lib/hoje'
import { VistaCabeca } from '../VistaCabeca'

/*
 * Vista Hoje (marca) — venda do dia + o que falta no cadastro. Porte de
 * public/painel/index.html: markup #mvHoje, .mc-venda* e #mcFaltaBloco
 * (~1469-1502), renderVenda/salvarVenda (~5255-5296), renderFalta (~5309).
 * blocosPendentes/chaveDia vivem em lib/hoje.js (lógica pura, testável).
 *
 * PainelMarcaShell monta `<Vista />` sem props — cada vista carrega os
 * próprios dados (mesmo formato de api() usado pelo resto do app).
 */

export function Hoje() {
  const [estado, setEstado] = React.useState('carregando') // carregando | sem-marca | sem-participacao | pronto | erro
  const [participacaoId, setParticipacaoId] = React.useState(null)
  const [vendas, setVendas] = React.useState([])
  const [faltam, setFaltam] = React.useState([])
  const [qtd, setQtd] = React.useState('')
  const [salvando, setSalvando] = React.useState(false)
  const [erro, setErro] = React.useState(null)

  const hoje = chaveDia(new Date())
  const deHoje = vendas.find((v) => v.dia === hoje)

  const carregar = React.useCallback(async () => {
    setEstado('carregando')
    try {
      const participantes = await api('participantes?select=*&order=created_at.desc')
      const participante = participantes && participantes[0]
      if (!participante) { setEstado('sem-marca'); return }
      const participacoes = await api('participacoes?select=*&order=created_at.desc&limit=1')
      const participacao = (participacoes && participacoes[0]) || null
      if (!participacao) { setEstado('sem-participacao'); return }
      const [itens, unidades, vendasLinhas] = await Promise.all([
        api('participantes_itens?select=*&participacao_id=eq.' + participacao.id),
        api('participacao_unidades?select=*&participacao_id=eq.' + participacao.id),
        api('vendas_diarias?select=*&participacao_id=eq.' + participacao.id + '&order=dia.desc'),
      ])
      setParticipacaoId(participacao.id)
      setVendas(vendasLinhas || [])
      setFaltam(blocosPendentes({ participante, participacao, itens: itens || [], unidades: unidades || [] }))
      setEstado('pronto')
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setEstado('erro')
    }
  }, [])

  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { setQtd(deHoje ? String(deHoje.quantidade) : '') }, [deHoje])

  async function salvar() {
    const n = parseInt(qtd, 10)
    if (isNaN(n) || n < 0) { setErro('Informe um número válido.'); return }
    setSalvando(true)
    setErro(null)
    try {
      const r = deHoje
        ? await api('vendas_diarias?id=eq.' + deHoje.id, { metodo: 'PATCH', corpo: { quantidade: n }, prefer: 'return=representation' })
        : await api('vendas_diarias', { metodo: 'POST', corpo: { participacao_id: participacaoId, dia: hoje, quantidade: n }, prefer: 'return=representation' })
      const linha = r && r[0]
      if (!linha) throw new Error('sem_confirmacao')
      setVendas((atual) => (deHoje ? atual.map((v) => (v.id === deHoje.id ? linha : v)) : [linha, ...atual]))
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setErro('Não deu para lançar agora. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  const total = vendas.reduce((s, v) => s + Number(v.quantidade || 0), 0)

  return (
    <section>
      <VistaCabeca
        acento="amarelo"
        icone={<><circle cx="12" cy="13" r="7.8" /><path d="M12 9v4l3.1 2" /><path d="M10.2 2.6h3.6M12 3.8v2" /></>}
        titulo="Hoje"
        nota="A venda do dia e o que falta no seu cadastro"
      />

      {estado === 'carregando' && <p className="nota">Carregando.</p>}
      {estado === 'erro' && <p className="nota">Não deu para carregar. Recarregue a página.</p>}
      {estado === 'sem-marca' && <p className="nota">Sua conta existe, mas ainda não há marca vinculada a ela. Fale com a organização.</p>}

      {estado === 'sem-participacao' && (
        <div className="mc-venda">
          <p className="rotulo">Combos vendidos</p>
          <div className="mc-venda__espera">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5.4 9.4h21.2a2.4 2.4 0 0 1 2.4 2.4v13.8a2.4 2.4 0 0 1-2.4 2.4H5.4A2.4 2.4 0 0 1 3 25.6V11.8a2.4 2.4 0 0 1 2.4-2.4Z" />
              <path d="M3 15.4h26" /><path d="M10.2 5v6.2M21.8 5v6.2" />
            </svg>
            <span>O lançamento abre no primeiro dia da edição.</span>
          </div>
        </div>
      )}

      {estado === 'pronto' && (
        <>
          <div className="mc-venda">
            <p className="rotulo">Combos vendidos</p>
            <h2 style={{ color: 'var(--scw-creme)' }}>{deHoje ? 'Atualize o número de hoje' : 'Lance o número de hoje'}</h2>
            <p className="nota" style={{ color: 'rgba(254,240,221,.8)' }}>
              {deHoje
                ? 'Lançado. Dá para corrigir o número quantas vezes precisar.'
                : 'Lance o número no fim do expediente. A organização soma tudo para o balanço da edição.'}
            </p>
            <div className="mc-venda__linha">
              <label style={{ margin: 0 }}>
                <span style={{ color: 'rgba(254,240,221,.7)' }}>Hoje</span>
                <input
                  className="mc-venda__campo" type="number" inputMode="numeric" min="0" placeholder="0"
                  value={qtd} onChange={(e) => setQtd(e.target.value)}
                />
              </label>
              <button
                className="acao" type="button" style={{ background: 'var(--scw-amarelo)', color: 'var(--scw-choco)' }}
                disabled={salvando} onClick={salvar}
              >
                {deHoje ? 'Atualizar' : 'Salvar'}
              </button>
              <span className="mc-venda__total"><span>{total}</span><span>no total da edição</span></span>
            </div>
            <div className="mc-venda__dias">
              {vendas.slice(0, 14).map((v) => {
                const d = new Date(v.dia + 'T00:00:00')
                return (
                  <div className={'mc-venda__dia' + (v.dia === hoje ? ' is-hoje' : '')} key={v.id}>
                    <b>{v.quantidade}</b>
                    <span>{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                )
              })}
            </div>
            {erro && <div className="aviso erro" style={{ marginTop: 14 }}>{erro}</div>}
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <p className="rotulo">O que falta</p>
            {faltam.length === 0 ? (
              <>
                <h2>Cadastro entregue</h2>
                <p className="nota" style={{ margin: 0 }}>Tudo preenchido. Mudou alguma coisa? Volte em Cadastro e corrija.</p>
              </>
            ) : (
              <>
                <h2>{faltam.length + (faltam.length === 1 ? ' bloco pendente' : ' blocos pendentes')}</h2>
                <ul className="mc-vagas" style={{ padding: 0, margin: '10px 0 0', listStyle: 'none' }}>
                  {/* ponytail: sem navegação pra aba Cadastro ainda — o Shell
                      não passa função de troca de vista pras vistas da marca.
                      Vira botão de verdade (data-ir-cadastro na origem) quando
                      essa fiação existir; até lá, pílula só informativa. */}
                  {faltam.map((nome) => (
                    <li key={nome}><span className="mc-vaga" style={{ cursor: 'default' }}>{nome}</span></li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}
