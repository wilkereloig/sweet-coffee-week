import React from 'react'
import { api } from '../../lib/marcaApi'
import { dataHoraExtensa } from '../../lib/central'
import { normalizarCodigo } from '../../lib/vouchers'
import { Secao } from '../ui'

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
  const [codigo, setCodigo] = React.useState('')
  const [aviso, setAviso] = React.useState(null)
  const [enviando, setEnviando] = React.useState(false)

  const carregar = React.useCallback(() => {
    api('rpc/marca_meus_vouchers', { metodo: 'POST', corpo: {} }).then(setDados).catch(() => setDados(null))
  }, [])
  React.useEffect(() => { carregar() }, [carregar])

  async function usar(ev) {
    ev.preventDefault()
    const c = normalizarCodigo(codigo)
    if (!c || c === 'SCW-') { setAviso({ erro: 'Digite o código do voucher.' }); return }
    setEnviando(true); setAviso(null)
    try {
      await api('rpc/marca_usar_voucher', { metodo: 'POST', corpo: { p_codigo: c } })
      setAviso({ ok: 'Voucher ' + c + ' registrado. Pode entregar o combo.' })
      setCodigo('')
      carregar()
    } catch (e) {
      const m = String((e && e.message) || '')
      const chave = Object.keys(RECADO).find((k) => m.includes(k))
      setAviso({ erro: chave ? RECADO[chave] : 'Não deu para registrar agora. Tente de novo.' })
    } finally { setEnviando(false) }
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
