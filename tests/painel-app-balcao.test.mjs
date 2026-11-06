import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { recadoDoVoucher, estadoDoBalcao } from '../painel-app/src/lib/vouchers.js'
import { ordemDoInicio } from '../painel-app/src/lib/inicioMarca.js'

/*
 * Balcão (05/11/2026): atalhos de voucher e de carimbo no topo do Início da marca e na Visão geral da organização.
 * Mensagens de erro, estados do cartão e o que o código NÃO pode fazer (registrar sem toque, ajudar com carimbo chamando o servidor).
 */
const ler = (caminho) => readFileSync(new URL('../painel-app/src/components/' + caminho, import.meta.url), 'utf8')

test('recado do voucher: cada resposta do servidor tem a sua frase; desconhecido e rede caída nunca dizem "registrado"', () => {
  assert.match(recadoDoVoucher('voucher_nao_encontrado'), /não encontrado/i)
  assert.match(recadoDoVoucher('voucher_nao_encontrado'), /outra casa/i, 'o código de outra marca responde igual ao inexistente')
  assert.match(recadoDoVoucher('voucher_ja_utilizado'), /já foi usado/i)
  assert.match(recadoDoVoucher('voucher_cancelado'), /cancelado/i)
  assert.match(recadoDoVoucher('voucher_nao_distribuido'), /ainda não foi entregue/i)
  assert.match(recadoDoVoucher('voucher_fora_da_validade'), /validade/i)
  assert.match(recadoDoVoucher('PostgREST: voucher_ja_utilizado (P0001)'), /já foi usado/i, 'a chave vem dentro de uma mensagem maior')
  assert.match(recadoDoVoucher('Failed to fetch'), /sem conexão.*NÃO foi registrado/i)
  assert.match(recadoDoVoucher('NetworkError when attempting to fetch resource.'), /sem conexão/i)
  assert.match(recadoDoVoucher('sessao_expirada'), /sessão/i)
  assert.match(recadoDoVoucher(''), /tente de novo/i)
  for (const m of ['voucher_nao_encontrado', 'Failed to fetch', 'x', '']) assert.doesNotMatch(recadoDoVoucher(m), /registrado\.$/i)
})

test('estado do balcão: atalhos ligados enquanto carrega ou se a leitura cai; desligados só quando se sabe que não há voucher', () => {
  assert.deepEqual(estadoDoBalcao(undefined, null), { tipo: 'carregando', ativo: true })
  assert.deepEqual(estadoDoBalcao(undefined, 'erro'), { tipo: 'erro', ativo: true }, 'leitura caída não esconde os atalhos: o servidor valida')
  assert.deepEqual(estadoDoBalcao(null, null), { tipo: 'indisponivel', ativo: false })
  assert.deepEqual(estadoDoBalcao({ total: 0, utilizados: [] }, null), { tipo: 'sem-vouchers', ativo: false })
  assert.deepEqual(estadoDoBalcao({ total: '0', virtuais: { total: 0 } }, null), { tipo: 'sem-vouchers', ativo: false })
  assert.deepEqual(estadoDoBalcao({ total: 7, distribuidos: 2, utilizados: [] }, null), { tipo: 'ok', ativo: true })
  assert.deepEqual(estadoDoBalcao({ total: 0, virtuais: { total: 2 } }, null), { tipo: 'ok', ativo: true }, 'só virtuais também vale')
})

test('o balcão sobe para logo abaixo da identificação em todas as fases e nenhum bloco some ou se repete', () => {
  for (const m of ['antes', 'durante', 'depois', 'indefinido']) {
    const o = ordemDoInicio(m)
    assert.deepEqual(o.slice(0, 3), ['identificacao', 'balcao', 'agora'], m)
    assert.equal(new Set(o).size, o.length, m)
    assert.ok(!o.includes('vouchers'), 'o bloco antigo de vouchers foi absorvido pelo balcão: ' + m)
  }
})

test('marca: a baixa continua só no botão "Registrar uso"; ler QR só preenche o campo; a ajuda não chama o servidor', () => {
  const balcao = ler('vistas-marca/VouchersMarca.jsx')
  assert.equal((balcao.match(/api\('rpc\/marca_usar_voucher'/g) || []).length, 1, 'uma única chamada de baixa')
  assert.match(balcao, /onSubmit=\{usar\}/, 'a baixa nasce do envio do formulário')
  const lido = balcao.slice(balcao.indexOf('function lidoPelaCamera'), balcao.indexOf('function escanear'))
  assert.doesNotMatch(lido, /usar\(|api\(/, 'ler o QR só preenche o campo')
  const leitor = ler('vistas-marca/LerQrVoucher.jsx')
  assert.doesNotMatch(leitor, /api\(|marca_usar_voucher/, 'o leitor só entrega o código')
  assert.match(leitor, /if \(!ativo\) return undefined/, 'a câmera só abre depois do toque')
  const ajuda = ler('vistas-marca/AjudaCarimbo.jsx')
  assert.doesNotMatch(ajuda, /api\(|rpc\(|fetch\(/, 'a ajuda é só orientação')
  assert.match(ajuda, /nunca peça nem aceite/i)
  assert.match(ajuda, /A casa não aprova carimbo presencial nem de outra casa/)
  assert.match(balcao, /recadoDoVoucher/, 'os erros vêm da tabela testada')
})

test('organização: os atalhos só levam a telas existentes, exigem dado.ler e não chamam nenhuma operação de escrita', () => {
  const src = ler('vistas/mesa/AtalhosBalcao.jsx')
  assert.match(src, /pode\('dado\.ler'\)/)
  assert.match(src, /vista: 'contatos', aba: 'vouchers'/)
  assert.match(src, /vista: 'edicao', aba: 'carimbos', filtros: \{ sub: 'presenca' \}/)
  assert.doesNotMatch(src, /usar_voucher|decidirExcecao|atualizar_voucher|rpc\(/, 'só leitura da contagem, nada que grave')
  assert.match(ler('vistas/Mesa.jsx'), /<AtalhosBalcao /)
})
