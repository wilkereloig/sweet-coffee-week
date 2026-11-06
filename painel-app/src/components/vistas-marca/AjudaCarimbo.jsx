import React from 'react'
import { Folha } from '../Folha'

/*
 * "Ajudar com carimbo" (balcão, 05/11/2026): só ORIENTAÇÃO, nenhuma chamada ao servidor. O carimbo é do visitante: ele lê o QR
 * do adesivo e a localização confere a presença. A casa não aprova, não cria nem altera carimbo — quem decide um pedido de
 * revisão de presença é a organização (docs/cartoon-2026-2/15-caca-gps-excecao.md). Ajudar a carimbar NÃO é dar baixa em voucher.
 */
export function AjudaCarimbo({ aberto, onFechar }) {
  return (
    <Folha aberto={aberto} onFechar={onFechar} titulo="Ajudar o cliente a carimbar" sub="Quem carimba é o próprio cliente, no celular dele.">
      <div className="bal-ajuda">
        <ol className="bal-ajuda__passos">
          <li><b>Mostre o adesivo do balcão.</b> O cliente lê o QR com a câmera do celular e abre a tela do carimbo da sua casa.</li>
          <li><b>Ele toca em “Carimbar”</b> e libera a localização quando o celular perguntar. Ela só confere se a pessoa está na casa.</li>
          <li><b>Se a localização falhar:</b> peça que ligue o GPS do celular, libere a localização para o navegador, chegue mais perto do balcão e toque em “Tentar de novo”. A tela mostra o passo a passo do iPhone e do Android.</li>
          <li><b>Se continuar sem funcionar</b> (ou se o navegador bloqueou a localização), a própria tela mostra o botão <b>“Estou na casa e o GPS não funciona”</b>. O cliente envia o pedido ali.</li>
        </ol>
        <p><b>Quem decide o pedido é a organização.</b> A casa não aprova nem cria carimbo, e o cliente vê o andamento na mesma tela (em análise, aprovado ou não aprovado).</p>
        <p><b>Cuidado:</b> nunca peça nem aceite o link de acesso ou a chave pessoal do cliente. Ele usa o próprio celular.</p>
        <p className="ui-nota">Carimbo não é voucher. O voucher do combo é registrado no campo do balcão, logo acima.</p>
      </div>
    </Folha>
  )
}
