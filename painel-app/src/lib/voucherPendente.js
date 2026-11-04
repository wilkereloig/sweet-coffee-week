/*
 * Voucher que chegou pelo QR (/painel/?voucher=SCW-XXXXX), lido ANTES do login: a marca pode abrir o QR com a câmera
 * do celular sem estar entrando no painel. Guarda o código na sessão (`sessionStorage`, só desta aba) e o Início o
 * entrega à tela de vouchers, que PREENCHE o campo — nunca registra o uso sozinho: quem confirma é a marca.
 * Lógica de leitura do endereço em `lib/vouchers.js › codigoDaUrl` (testada).
 */
import { codigoDaUrl } from './vouchers.js'

const CHAVE = 'scw_voucher_pendente'

function sessao() { try { return globalThis.sessionStorage || null } catch { return null } }

/** Lê `?voucher=` do endereço atual e guarda. Chamado uma vez, no `main.jsx`, antes de montar o app. */
export function capturarVoucherDaUrl(busca = globalThis.location && globalThis.location.search, armazenamento = sessao()) {
  const c = codigoDaUrl(busca)
  if (c && armazenamento) { try { armazenamento.setItem(CHAVE, c) } catch { /* sem armazenamento: o código se perde */ } }
  return c
}

export function voucherPendente(armazenamento = sessao()) {
  try { return (armazenamento && armazenamento.getItem(CHAVE)) || '' } catch { return '' }
}

export function limparVoucherPendente(armazenamento = sessao()) {
  try { armazenamento && armazenamento.removeItem(CHAVE) } catch { /* nada a fazer */ }
}
