// Carimbo de delivery no painel (06/11/2026): a casa confirma só o pedido dela; a organização decide só o que tem imagem e vê a imagem por link curto.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  RECADO_DELIVERY, codigoDeliveryCompleto, formatarCodigoDelivery, linhasDoPedido, normalizarCodigoDelivery, recadoDoDelivery,
} from '../painel-app/src/lib/deliveryCasa.js'
import { MOTIVO_PEDIDO, aguardandoACasa, aprovavelEmLote, descricaoDoSinal, podeDecidir, rotuloMotivoPedido, textoDaDecisao } from '../painel-app/src/lib/cacaGps.js'
import { ROTULO_ORIGEM, ROTULO_EVENTO } from '../painel-app/src/lib/caca.js'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')

test('código da casa: normaliza hífen, espaço e minúsculas; só 6 caracteres', () => {
  assert.equal(normalizarCodigoDelivery(' abc-123 '), 'ABC123')
  assert.equal(normalizarCodigoDelivery('abc123xyz'), 'ABC123')
  assert.equal(formatarCodigoDelivery('ABC123'), 'ABC-123')
  assert.equal(formatarCodigoDelivery('AB'), 'AB')
  assert.equal(codigoDeliveryCompleto('abc-12'), false)
  assert.equal(codigoDeliveryCompleto('abc-123'), true)
})

test('recados: cada motivo do servidor tem texto claro; desconhecido e rede dizem que NADA foi registrado', () => {
  for (const m of ['codigo_invalido', 'codigo_usado', 'codigo_expirado', 'bloqueado', 'cedo', 'encerrada', 'nao_aberta', 'casa_sem_combo']) assert.ok(RECADO_DELIVERY[m], m)
  assert.match(recadoDoDelivery('codigo_invalido'), /n[ãa]o [ée] desta casa/i, 'código de outra casa tem a mesma mensagem de código que não existe')
  assert.match(recadoDoDelivery('codigo_expirado'), /venceu/i)
  assert.match(recadoDoDelivery('Failed to fetch'), /nada foi registrado/i)
  assert.match(recadoDoDelivery('qualquer coisa'), /nada foi registrado/i)
})

test('resumo do pedido para a casa: o essencial, nunca e-mail, telefone ou endereço do cliente', () => {
  const linhas = linhasDoPedido({ apelido: 'Ana', unidade: 'Centro', pedido_data: '2026-11-05', pedido_ref: '#9', avaliou: false, email: 'a@b.c', whatsapp: '84', endereco: 'Rua' })
  const texto = JSON.stringify(linhas)
  assert.match(texto, /Ana/); assert.match(texto, /5\/11\/2026/); assert.match(texto, /#9/); assert.match(texto, /Ainda n[ãa]o avaliou/)
  assert.doesNotMatch(texto, /a@b\.c|whatsapp|Rua/)
  assert.deepEqual(linhasDoPedido(null), [])
})

test('tela da casa: chama só consultar e confirmar, em duas etapas, sem guardar o código em lugar nenhum', () => {
  const f = ler('painel-app/src/components/vistas-marca/CarimboDelivery.jsx')
  assert.match(f, /caca_delivery_consultar/); assert.match(f, /caca_delivery_confirmar/)
  assert.match(f, /Confirmar entrega/); assert.match(f, /Não é este pedido/)
  assert.doesNotMatch(f, /localStorage|sessionStorage|console\.|history\.|location\./)
  assert.match(f, /Nunca peça o link nem a chave do mapa/)
  const v = ler('painel-app/src/components/vistas-marca/VouchersMarca.jsx')
  assert.match(v, /Confirmar carimbo de delivery/); assert.match(v, /<CarimboDelivery aberto=\{delivery\}/)
  assert.match(ler('painel-app/src/lib/sync/dominios.js'), /caca_delivery_confirmar: \['carimbos'\]/)
})

test('"ver como participante" nunca grava: as RPCs de delivery da casa não estão na lista de leitura', () => {
  const m = ler('painel-app/src/lib/marcaApi.js')
  assert.doesNotMatch(m, /caca_delivery_confirmar|caca_delivery_consultar/)
})

test('fila da organização: delivery com código é da casa; pedido para organização pode não ter imagem', () => {
  assert.ok(MOTIVO_PEDIDO.delivery); assert.match(rotuloMotivoPedido('delivery'), /Delivery/)
  const comCodigo = { estado: 'pendente', motivo: 'delivery', via: 'casa', aguardando_casa: true }
  const comImagem = { estado: 'pendente', motivo: 'delivery', via: 'imagem' }
  assert.equal(aguardandoACasa(comCodigo), true); assert.equal(aguardandoACasa(comImagem), false)
  assert.equal(podeDecidir(comCodigo), false, 'organização não decide delivery que espera a casa')
  const semImagem = { ...comCodigo, via_pretendida: 'imagem' }
  assert.equal(podeDecidir(semImagem), true, 'organização pode decidir sem imagem')
  assert.equal(aguardandoACasa(semImagem), false)
  assert.equal(podeDecidir(comImagem), true)
  assert.equal(podeDecidir({ estado: 'pendente', motivo: 'longe' }), true, 'os outros pedidos seguem iguais')
  assert.equal(podeDecidir({ estado: 'aprovado', motivo: 'delivery', via: 'imagem' }), false)
  const vencido = { ...comCodigo, codigo_expirado: true }
  assert.equal(podeDecidir(vencido), true, 'código vencido: a organização decide (a casa não confirma mais)')
  assert.equal(aguardandoACasa(vencido), false)
  assert.equal(aprovavelEmLote(vencido), false, 'código vencido não entra no Aprovar todos: decide-se um por um')
  assert.match(descricaoDoSinal({ motivo: 'delivery', pedido_data: '2026-11-05', pedido_ref: 'X1' }), /pedido de 05\/11\/2026 \(ref\. X1\).*sem prova de local/)
  assert.match(textoDaDecisao({ motivo: 'delivery', apelido: 'Ana', casa: 'Alfa' }, 'aprovar'), /imagem é opcional/i)
  assert.match(textoDaDecisao({ motivo: 'delivery', apelido: 'Ana', casa: 'Alfa' }, 'aprovar'), /n[ãa]o muda voucher/i)
})

test('origens e eventos de delivery têm rótulo no painel', () => {
  assert.match(ROTULO_ORIGEM.delivery_casa, /casa/i); assert.match(ROTULO_ORIGEM.delivery_organizacao, /organiza/i)
  for (const e of ['delivery_pedido', 'delivery_confirmado', 'delivery_imagem_enviada', 'delivery_aprovado', 'delivery_negado']) assert.ok(ROTULO_EVENTO[e], e)
})

test('imagem na organização: link por arquivo-url (300 s), exclusão manual com confirmação, nada aberto sem permissão de gerir', () => {
  const f = ler('painel-app/src/components/vistas/caca/Excecoes.jsx')
  assert.match(f, /imagemDelivery\(p\.imagem\)/); assert.match(f, /removerImagemDelivery\(p\.imagem\)/)
  assert.match(f, /gerir && <Botao[^>]*Ver a imagem/); assert.match(f, /confirmar\(/)
  assert.match(f, /aba\.opener = null/)
  const c = ler('painel-app/src/lib/caca.js')
  assert.match(c, /bucket: 'caca-delivery'/)
})

test('o texto da ajuda do balcão não promete mais que a casa nunca cria carimbo: a exceção do delivery está dita', () => {
  const a = ler('painel-app/src/components/vistas-marca/AjudaCarimbo.jsx')
  assert.match(a, /A casa não aprova carimbo presencial nem de outra casa/)
  assert.match(a, /Confirmar carimbo de delivery/)
})

test('banco: delivery com código vencido pode ser decidido pela organização (migration 20270202 e o reverter)', () => {
  const sql = ler('supabase/migrations/20270202_caca_delivery_codigo_vencido_org.sql')
  const rev = ler('supabase/reverter/20270202_caca_delivery_codigo_vencido_org.sql')
  assert.match(sql, /coalesce\(e\.codigo_expira_em > now\(\), true\) then raise exception 'aguarda_casa'/)
  assert.doesNotMatch(rev, /codigo_expira_em/)
  assert.match(rev, /<> 'imagem' then raise exception 'aguarda_casa'/)
})

test('pedidos de uma pessoa: o filtro vai ao banco (sem o teto de 300) e a tela mostra a foto à vista', () => {
  const sql = ler('supabase/migrations/20270203_caca_excecao_listar_pessoa.sql')
  assert.match(sql, /p_mapa uuid default null/)
  assert.match(sql, /p_mapa is null or e\.mapa_id = p_mapa/)
  assert.match(sql, /'pessoas'/)
  assert.match(sql, /grant execute on function public\.caca_excecao_listar\(text, text, text, uuid\)/)
  const api = ler('painel-app/src/lib/caca.js')
  assert.match(api, /p_mapa: mapa/)
  const tela = ler('painel-app/src/components/vistas/caca/Excecoes.jsx')
  assert.match(tela, /rotulo="Pessoa"/)
  assert.match(tela, /<FotoDoPedido /)
  assert.match(tela, /<img src=\{src\} alt=/)
})
