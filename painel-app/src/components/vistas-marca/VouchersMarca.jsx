import React from 'react'
import { api, seFaltar } from '../../lib/marcaApi'
import { dataHoraExtensa } from '../../lib/central'
import { normalizarCodigo } from '../../lib/vouchers'
import { Secao, Erro } from '../ui'
import { useSincronizar, useGuarda } from '../../lib/sync/react'

/*
 * Vouchers na área da marca (reestruturação 29/09/2026, etapa 6).
 * A marca cedeu N vouchers do combo; a organização distribui. Quando alguém
 * apresenta um código no balcão, a marca digita aqui e o voucher vira
 * "utilizado". A marca NÃO vê os códigos ainda não usados — só a contagem e
 * os que ela mesma registrou (marca_meus_vouchers).
 */
const RECADO = {
  voucher_nao_encontrado: 'Código não encontrado para a sua marca. Confira as letras e números.',
  voucher_ja_utilizado: 'Este voucher já foi usado.',
  voucher_cancelado: 'Este voucher foi cancelado pela organização e não vale mais.',
  voucher_nao_distribuido: 'Este voucher ainda não foi entregue a ninguém pela organização.',
}

export function VouchersMarca({ className }) {
  const [dados, setDados] = React.useState(undefined)
  const [erroLeitura, setErroLeitura] = React.useState(null)
  const [codigo, setCodigo] = React.useState('')
  const [aviso, setAviso] = React.useState(null)
  const [enviando, setEnviando] = React.useState(false)

  const guarda = useGuarda()
  const temDados = React.useRef(false)

  // Releitura silenciosa (sinal de vouchers): a que falha mantém o cartão que já estava na tela e rejeita
  // (o indicador de sincronização mostra a falha). Antes a falha virava `null` e o cartão sumia, como se
  // a marca não tivesse vouchers; agora a tela só diz que não carregou quando nunca houve dado.
  const carregar = React.useCallback(async () => {
    const vale = guarda()
    try {
      const d = await api('rpc/marca_meus_vouchers', { metodo: 'POST', corpo: {} }).catch(seFaltar(null))   // sem a função no banco: sem cartão
      if (!vale()) return
      setDados(d)
      setErroLeitura(null)
      temDados.current = true
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      if (!vale()) return
      if (!temDados.current) setErroLeitura(e.message || 'erro')
      throw e
    }
  }, [guarda])
  React.useEffect(() => { carregar().catch(() => {}) }, [carregar])
  useSincronizar(['vouchers'], carregar)

  async function usar(ev) {
    ev.preventDefault()
    const c = normalizarCodigo(codigo)
    if (!c || c === 'SCW-') { setAviso({ erro: 'Digite o código do voucher.' }); return }
    setEnviando(true); setAviso(null)
    try {
      await api('rpc/marca_usar_voucher', { metodo: 'POST', corpo: { p_codigo: c } })
      setAviso({ ok: 'Voucher ' + c + ' registrado. Pode entregar o combo.' })
      setCodigo('')
      // Sem releitura aqui: marca_usar_voucher anuncia 'vouchers' e a assinatura acima já atualiza a contagem.
    } catch (e) {
      const m = String((e && e.message) || '')
      const chave = Object.keys(RECADO).find((k) => m.includes(k))
      setAviso({ erro: chave ? RECADO[chave] : 'Não deu para registrar agora. Tente de novo.' })
    } finally { setEnviando(false) }
  }

  if (erroLeitura && dados === undefined) {
    return (
      <Secao id="vouchers" titulo="Vouchers do combo" className={className}>
        <Erro texto="Não deu para carregar os vouchers agora." onTentar={() => { setErroLeitura(null); carregar().catch(() => {}) }} />
      </Secao>
    )
  }
  // Sem vouchers gerados para a marca nesta edição, o cartão não aparece.
  if (!dados || !Number(dados.total)) return null
  const usados = dados.utilizados || []
  return (
    <Secao
      id="vouchers" titulo="Vouchers do combo" className={className}
      nota={'Sua marca cedeu ' + dados.total + ' vouchers · ' + dados.distribuidos + ' já distribuídos · ' + usados.length + ' usados'}
    >
      <form className="ui-form ui-form--linha-dupla" onSubmit={usar}>
        <label className="og-campo"><span>Código que o cliente apresentou</span>
          <input type="text" autoComplete="off" autoCapitalize="characters" placeholder="SCW-XXXXX" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        </label>
        <button className="og-btn" type="submit" disabled={enviando}>{enviando ? 'Registrando…' : 'Registrar uso'}</button>
      </form>
      {aviso && (aviso.ok ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p> : <p className="ui-nota ui-nota--erro" role="alert">{aviso.erro}</p>)}
      {usados.length > 0 && (
        <ul className="ui-lista-simples">{usados.map((u) => (
          <li key={u.codigo}><b>{u.codigo}</b><span>usado em {dataHoraExtensa(u.utilizado_em)}</span></li>
        ))}</ul>
      )}
    </Secao>
  )
}
