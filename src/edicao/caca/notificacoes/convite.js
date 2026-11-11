/*
 * Convite aos avisos no celular (docs/cartoon-2026-2/19, etapa 2) — lógica pura. Aparece na hora em que o aviso faz sentido
 * (carimbo confirmado, hub de quem já carimbou), nunca ao abrir a página, e a permissão do navegador só é pedida no clique.
 * "Agora não" esconde por 3 dias neste aparelho (mesma conta do "Agora não" do app, pwa/instalacao.js).
 */
import { dispensadoAinda } from '../pwa/instalacao.js'

export const DIAS_CONVITE = 3
export const chaveConviteDispensa = (codigo) => `scw:edicao:${codigo}:convite-push-dispensado`
export const conviteDispensado = (valor, agora = Date.now()) => dispensadoAinda(valor, agora, DIAS_CONVITE)

/**
 * Qual convite mostrar, a partir do estado do push (logica.estadoDoPush):
 *   'ativar'   pode pedir a permissão neste aparelho
 *   'instalar' iPhone sem o app instalado: explica por que e como instalar antes (sem app, o iPhone não recebe)
 *   null       já ligado, bloqueado, sem suporte, sem carimbo ou dispensado há menos de 3 dias
 */
export function tipoDoConvite ({ estado, temCarimbo, dispensado }) {
  if (!temCarimbo || dispensado) return null
  if (estado === 'desligado') return 'ativar'
  if (estado === 'ios-instalar') return 'instalar'
  return null
}
