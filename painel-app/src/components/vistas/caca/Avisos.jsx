import React from 'react'
import { Botao, Secao, Selo, Escolha } from '../../ui'
import { cacaApi, TIPOS_PUSH, tipoPushValido } from '../../../lib/caca'
import { useExecutar } from './comum'

/*
 * Avisos da Caça (push): SÓ simulação. A função `caca-push` só roda em simulação (travada em lib/caca.js › simularPush) e
 * responde quantos aparelhos receberiam. Não há botão de envio: nenhuma notificação real sai daqui.
 */
export function Avisos({ pode }) {
  const [tipo, setTipo] = React.useState(TIPOS_PUSH[0][0])
  const [res, setRes] = React.useState(null)
  const [ocupado, executar] = useExecutar()
  if (!pode('producao.gerir')) return <p className="ui-nota">Só quem gerencia a produção simula o alcance dos avisos.</p>

  async function simular() {
    if (!tipoPushValido(tipo)) return
    setRes(null)
    const r = await executar('push', () => cacaApi.simularPush(tipo))
    if (r) setRes({ ...r, tipo })
  }
  const rotulo = (t) => (TIPOS_PUSH.find(([k]) => k === t) || [])[1]
  return (
    <div className="ui-pilha">
      <Secao titulo="Avisos: quantos receberiam" nota="Simulação. Conta os aparelhos com aviso ligado para o tipo escolhido e não manda nada. Quem escolheu não receber, ou nunca ligou o aviso, não entra na conta.">
        <p className="ui-nota"><Selo tom="atencao">SIMULAÇÃO — nenhuma notificação é enviada</Selo> O envio real não existe nesta tela de propósito.</p>
        <div className="cp-semente">
          <Escolha rotulo="Tipo de aviso" valor={tipo} opcoes={TIPOS_PUSH} onMudar={(t) => { setTipo(t); setRes(null) }} />
          <Botao disabled={!!ocupado} aria-busy={ocupado === 'push' || undefined} onClick={simular}>Simular alcance</Botao>
        </div>
        {res && (
          <ul className="cp-fatos" role="status">
            <li><span>Tipo</span>{rotulo(res.tipo)}</li>
            <li><span>Aparelhos que receberiam</span><strong>{res.destinatarios}</strong></li>
            <li><span>Envio configurado no servidor</span>{res.vapid_configurado ? 'Sim' : 'Não (o envio real ainda não funcionaria)'}</li>
          </ul>
        )}
      </Secao>
    </div>
  )
}
