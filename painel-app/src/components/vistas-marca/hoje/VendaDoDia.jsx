import React from 'react'
import { api } from '../../../lib/marcaApi'
import { useRegistroEditavel } from '../../../lib/sync/react'
import { usePendencia } from '../../../lib/pendencias'
import { AvisoMudancaExterna } from '../../AvisoMudancaExterna'
import { diaDoFormulario, rotuloDoDia, textoDaVenda } from '../../../lib/sincMarca'

/*
 * Combos vendidos — o gesto diário da marca. O número digitado NUNCA é trocado por uma
 * releitura: se a organização lançar a venda do mesmo dia enquanto a pessoa digita, a tela
 * mostra as duas versões e ela escolhe (AvisoMudancaExterna). Só monta depois de as vendas
 * terem sido lidas, para a primeira leitura não parecer "alteração de outra pessoa".
 * Se a meia-noite passar com número digitado e não salvo, o campo continua sendo do dia
 * em que a pessoa começou (rótulo "Ontem"): a venda não cai no dia errado.
 *
 * ⚠️ Tem estado que o Início não pode perder (número digitado, pendência registrada): quem a
 * desenha a mantém sempre sob a mesma `key`, para que mudar de lugar na página não a remonte.
 */
export function VendaDoDia({ vendas, hoje, total, participacaoId, aoGravar, recarregar, invalidar }) {
  const [diaForm, setDiaForm] = React.useState(hoje)
  const [salvando, setSalvando] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const linhaDoDia = vendas.find((v) => v.dia === diaForm)
  const qtdServidor = textoDaVenda(vendas, diaForm)
  const servidor = React.useMemo(() => ({ quantidade: qtdServidor }), [qtdServidor])
  const venda = useRegistroEditavel(servidor, ['quantidade'], { chave: diaForm })

  React.useEffect(() => {
    const alvo = diaDoFormulario({ hoje, atual: diaForm, sujo: venda.sujo })
    if (alvo !== diaForm) setDiaForm(alvo)
  }, [hoje, diaForm, venda.sujo])

  async function gravar() {
    const n = parseInt(venda.local.quantidade, 10)
    if (isNaN(n) || n < 0) { setErro('Informe um número inteiro, zero ou mais.'); return false }
    setSalvando(true)
    setErro(null)
    try {
      const r = linhaDoDia
        ? await api('vendas_diarias?id=eq.' + linhaDoDia.id, { metodo: 'PATCH', corpo: { quantidade: n }, prefer: 'return=representation' })
        : await api('vendas_diarias', { metodo: 'POST', corpo: { participacao_id: participacaoId, dia: diaForm, quantidade: n }, prefer: 'return=representation' })
      const linha = r && r[0]
      if (!linha) throw new Error('sem_confirmacao')
      invalidar()                                  // uma leitura já em voo é anterior a esta gravação: não pode desfazê-la
      aoGravar(linha)
      venda.salvou({ quantidade: String(linha.quantidade) })
      return true
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return false
      if (/duplicate|unique|23505/i.test(e.message || '')) {
        // A releitura traz o número do outro aparelho: se a pessoa tinha digitado outro, o aviso mostra os dois.
        await recarregar().catch(() => {})
        setErro('Já havia um número lançado hoje em outro aparelho. Confira e atualize.')
        return false
      }
      setErro('Não deu para lançar agora. Tente de novo.')
      return false
    } finally {
      setSalvando(false)
    }
  }
  // Fechar a aba ou atualizar a versão com número digitado e não salvo pergunta antes.
  const pend = usePendencia(venda.sujo, { rotulo: 'Combos vendidos', salvar: gravar })
  const conflito = venda.sujo && Object.keys(venda.conflitos).length > 0
  React.useEffect(() => { if (conflito) pend.sinalizarExterno(); else pend.limparExterno() }, [conflito]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <AvisoMudancaExterna registro={venda} rotulos={{ quantidade: 'Combos vendidos' }} />
      <form className="mc-venda" onSubmit={(ev) => { ev.preventDefault(); gravar() }}>
        <div className="mc-venda__linha">
          <label className="mc-venda__rotulo">
            <span>{rotuloDoDia(diaForm, hoje)}</span>
            <input className="mc-venda__campo" type="number" inputMode="numeric" min="0" step="1" placeholder="0" value={venda.local.quantidade} onChange={(e) => venda.editar('quantidade', e.target.value)} />
          </label>
          <button className="acao acao--amarela" type="submit" disabled={salvando}>{linhaDoDia ? 'Atualizar' : 'Salvar'}</button>
          <span className="mc-venda__total"><b>{total}</b><span>no total da edição</span></span>
        </div>
        {vendas.length > 0 && (
          <div className="mc-venda__dias" aria-label="Últimos dias lançados">
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
        )}
        {erro && <p className="mc-venda__erro" role="alert">{erro}</p>}
      </form>
    </>
  )
}
