import React from 'react'
import { api, seFaltar } from '../../lib/marcaApi'
import { dataHoraExtensa } from '../../lib/central'
import { normalizarCodigo, recadoDoVoucher, estadoDoBalcao } from '../../lib/vouchers'
import { voucherPendente, limparVoucherPendente } from '../../lib/voucherPendente'
import { LerQrVoucher, leitorDeQrDisponivel, TEXTO_SEM_LEITOR } from './LerQrVoucher'
import { AjudaCarimbo } from './AjudaCarimbo'
import { CarimboDelivery } from './CarimboDelivery'
import { Secao, Erro } from '../ui'
import { Icone } from '../Icone'
import '../../styles/vouchers-virtuais.css'
import '../../styles/inicio-marca.css'
import { useSincronizar, useGuarda } from '../../lib/sync/react'

/*
 * Balcão da marca (voucher + ajuda com carimbo) — no topo do Início, em todas as fases (05/11/2026).
 * A marca cedeu N vouchers do combo (impressos e virtuais); a organização distribui. Quando alguém apresenta um código
 * no balcão, a marca ESCANEIA o QR ou DIGITA o código e o voucher vira "utilizado". A marca NÃO vê os códigos ainda não
 * usados — só a contagem e os que ela mesma registrou (marca_meus_vouchers).
 *
 * Os atalhos aparecem mesmo antes da contagem carregar ou com a leitura caída (o servidor é quem valida: marca,
 * edição, situação e permissão — marca_usar_voucher). Só ficam desligados quando se SABE que não há voucher.
 * O código chega ao campo por três caminhos — digitado, QR lido pela câmera do celular (abre /painel/?voucher=,
 * guardado antes do login) ou QR lido aqui dentro. Em todos o campo só é PREENCHIDO: a baixa é o botão "Registrar uso".
 */
export function VouchersMarca({ className }) {
  const [dados, setDados] = React.useState(undefined)
  const [erroLeitura, setErroLeitura] = React.useState(null)
  const [codigo, setCodigo] = React.useState('')
  const [aviso, setAviso] = React.useState(null)
  const [enviando, setEnviando] = React.useState(false)
  const [doQr, setDoQr] = React.useState(() => voucherPendente()) // código que veio do QR e ainda não foi registrado
  const [digitando, setDigitando] = React.useState(() => !!voucherPendente())
  const [lendo, setLendo] = React.useState(false)
  const [ajuda, setAjuda] = React.useState(false)
  const [delivery, setDelivery] = React.useState(false)
  const campo = React.useRef(null)
  const cartao = React.useRef(null)

  const guarda = useGuarda()
  const temDados = React.useRef(false)

  // Releitura silenciosa (sinal de vouchers): a que falha mantém o cartão que já estava na tela e rejeita
  // (o indicador de sincronização mostra a falha). A tela só diz que não carregou quando nunca houve dado.
  const carregar = React.useCallback(async () => {
    const vale = guarda()
    try {
      const d = await api('rpc/marca_meus_vouchers', { metodo: 'POST', corpo: {} }).catch(seFaltar(null))   // sem a função no banco: null
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
  React.useEffect(() => { if (doQr) { setCodigo(doQr); setDigitando(true) } }, [doQr])
  // Vindo do QR do cliente (câmera do celular): leva o balcão à vista, já com o código.
  React.useEffect(() => { if (doQr && cartao.current) cartao.current.scrollIntoView({ block: 'start' }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Abriu o campo de digitação: o foco vai para ele.
  React.useEffect(() => { if (digitando && campo.current) campo.current.focus() }, [digitando])

  const estado = estadoDoBalcao(dados, erroLeitura)

  function lidoPelaCamera(c) { setAviso(null); setLendo(false); setDoQr(c); setCodigo(c); setDigitando(true) }
  function escanear() {
    setAviso(null)
    if (!leitorDeQrDisponivel()) { setLendo(false); setAviso({ erro: TEXTO_SEM_LEITOR }); setDigitando(true); return }
    setLendo((l) => !l)
  }
  function digitar() { setLendo(false); setAviso(null); setDigitando(true); if (campo.current) campo.current.focus() }

  async function usar(ev) {
    ev.preventDefault()
    const c = normalizarCodigo(codigo)
    if (!c || c === 'SCW-') { setAviso({ erro: 'Digite o código do voucher.' }); return }
    setEnviando(true); setAviso(null)
    try {
      await api('rpc/marca_usar_voucher', { metodo: 'POST', corpo: { p_codigo: c } })
      setAviso({ ok: 'Voucher ' + c + ' registrado. Pode entregar o combo.' })
      setCodigo('')
      setDoQr('')
      setDigitando(false)
      limparVoucherPendente()
      // Sem releitura aqui: marca_usar_voucher anuncia 'vouchers' e a assinatura acima já atualiza a contagem.
    } catch (e) {
      setAviso({ erro: recadoDoVoucher(e && e.message) })
    } finally { setEnviando(false) }
  }

  const usados = (dados && dados.utilizados) || []
  const virt = dados && dados.virtuais ? dados.virtuais : null
  const nota = estado.tipo === 'ok'
    ? 'Sua marca cedeu ' + dados.total + ' vouchers impressos · ' + dados.distribuidos + ' já distribuídos' + (virt && Number(virt.total) ? ' · ' + virt.total + ' virtuais (' + virt.distribuidos + ' distribuídos)' : '') + ' · ' + usados.length + ' usados'
    : 'Registre o voucher do cliente (impresso ou na tela dele) e ajude quem não conseguiu carimbar.'
  const desligado = !estado.ativo

  return (
    <Secao id="vouchers" titulo="Balcão" nota={nota} className={className}>
      <div ref={cartao} className="bal">
        <div className="bal-acoes">
          <button type="button" className="bal-acao bal-acao--principal" onClick={escanear} disabled={desligado} aria-pressed={lendo}>
            <Icone nome="camera" tamanho={28} />
            <span>{lendo ? 'Parar de escanear' : 'Escanear QR do voucher'}</span>
          </button>
          <button type="button" className="bal-acao" onClick={digitar} disabled={desligado}>
            <Icone nome="editar" tamanho={28} />
            <span>Digitar código do voucher</span>
          </button>
          <button type="button" className="bal-acao bal-acao--ajuda" onClick={() => setAjuda(true)}>
            <Icone nome="informacao" tamanho={28} />
            <span>Ajudar com carimbo</span>
          </button>
          <button type="button" className="bal-acao" onClick={() => setDelivery(true)}>
            <Icone nome="pedido" tamanho={28} />
            <span>Carimbo de delivery</span>
          </button>
        </div>

        {estado.tipo === 'sem-vouchers' && <p className="ui-nota" role="status">Sua marca não tem vouchers nesta edição, então não há o que registrar aqui.</p>}
        {estado.tipo === 'indisponivel' && <p className="ui-nota" role="status">Os vouchers ainda não estão ativos para a sua marca nesta edição.</p>}
        {estado.tipo === 'erro' && <Erro texto="Não deu para carregar a contagem dos vouchers. Você ainda pode registrar: o painel confere o código ao enviar." onTentar={() => { setErroLeitura(null); carregar().catch(() => {}) }} />}

        <LerQrVoucher ativo={lendo && !desligado} aoLer={lidoPelaCamera} aoParar={() => setLendo(false)}
          aoErro={(texto) => { setLendo(false); setAviso({ erro: texto }); setDigitando(true) }} />

        {digitando && !desligado && (
          <form className="ui-form ui-form--linha-dupla" onSubmit={usar}>
            <label className="og-campo"><span>Código que o cliente apresentou</span>
              <input ref={campo} type="text" autoComplete="off" autoCapitalize="characters" placeholder="SCW-XXXXX" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </label>
            <button className="og-btn" type="submit" disabled={enviando}>{enviando ? 'Registrando…' : 'Registrar uso'}</button>
          </form>
        )}
        {doQr && digitando && !aviso && <p className="vv-lido" role="status">Código <b>{doQr}</b> lido do QR. Confira com o cliente e toque em “Registrar uso”.</p>}

        <div aria-live="polite">
          {aviso && (aviso.ok ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p> : <p className="ui-nota ui-nota--erro" role="alert">{aviso.erro}</p>)}
        </div>

        {usados.length > 0 && (
          <ul className="ui-lista-simples">{usados.map((u) => (
            <li key={u.codigo}><b>{u.codigo}{u.canal === 'virtual' ? ' · virtual' : ''}</b><span>usado em {dataHoraExtensa(u.utilizado_em)}</span></li>
          ))}</ul>
        )}
      </div>
      <AjudaCarimbo aberto={ajuda} onFechar={() => setAjuda(false)} />
      <CarimboDelivery aberto={delivery} onFechar={() => setDelivery(false)} />
    </Secao>
  )
}
