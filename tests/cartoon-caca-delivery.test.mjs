// Carimbo de delivery (06/11/2026): estados nunca prometem carimbo antes da validação, só unidade com delivery "sim" entra, a API só fala
// com o servidor (e a edge function de upload), a imagem é preparada no aparelho, e a migration + as edge functions fecham as regras.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  LIMITES, casaDaConsulta, casasComDelivery, codigoLegivel, dimensoesFinais, estadoDoDelivery, extensaoDoTipo, pedidosDelivery, validadeDoCodigo,
} from '../src/edicao/caca/delivery/logica.js'
import { DELIVERY as T } from '../src/edicao/caca/delivery/textos.js'
import { criarApi } from '../src/edicao/caca/api.js'
import { resolverCena } from '../src/edicao/rotas.js'
import { CACA_CAMINHOS } from '../src/edicao/caca/textos.js'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const CHAVE = 'A'.repeat(32)
const ID = '8d0672dc-5f9a-471d-8495-84794062e723'

test('só pedidos de delivery entram na lista (GPS e visita anterior ficam de fora)', () => {
  assert.deepEqual(pedidosDelivery([{ motivo: 'longe' }, { motivo: 'visita_anterior' }, { motivo: 'delivery', id: 'x' }]).map((p) => p.id), ['x'])
  assert.deepEqual(pedidosDelivery(null), [])
})

test('estados: código aguarda a casa; vencido pede novo; imagem fica em análise; só validada vira "validado"', () => {
  const mapa = { casas: [{ slug: 'a', estado: 'pendente' }, { slug: 'b', estado: 'validada' }] }
  assert.equal(estadoDoDelivery({ estado: 'pendente', via: 'casa', codigo: 'ABC123', expirado: false }, mapa), 'codigo')
  assert.equal(estadoDoDelivery({ estado: 'pendente', via: 'casa', expirado: true }, mapa), 'expirado')
  assert.equal(estadoDoDelivery({ estado: 'pendente', via: 'casa' }, mapa), 'expirado', 'sem código no retorno = não mostra como válido')
  assert.equal(estadoDoDelivery({ estado: 'pendente', via: 'imagem', tem_imagem: true }, mapa), 'analise')
  assert.equal(estadoDoDelivery({ slug: 'a', estado: 'aprovado' }, mapa), 'aprovadoAvaliar')
  assert.equal(estadoDoDelivery({ slug: 'b', estado: 'aprovado' }, mapa), 'aprovadoValido')
  assert.equal(estadoDoDelivery({ slug: 'a', estado: 'negado' }, mapa), 'negado')
})

test('textos: nada promete carimbo antes da casa/organização; a nota interna nunca é exposta; sem data nem hora escritas', () => {
  const fonte = semComentarios(ler('src/edicao/caca/delivery/textos.js'))
  assert.doesNotMatch(fonte, /\b\d{1,2}\s*(?:\/\s*\d{1,2}|de\s+(?:novembro|outubro))/i, 'nenhuma data escrita')
  assert.match(T.estadoTexto.codigo, /n[ãa]o conta/i)
  assert.match(T.estadoTexto.analise, /n[ãa]o conta/i)
  assert.doesNotMatch(Object.values(T.estadoTexto).join(' '), /conquist|ganh/i)
  assert.match(T.estadoTexto.aprovadoAvaliar, /avaliar o combo/i)
  assert.match(T.estadoTexto.aprovadoAvaliar, /mesmo e-mail/i)
  assert.match(T.estado.aprovadoAvaliar, /falta avaliar/i)
  assert.doesNotMatch(T.estadoTexto.negado, /nota|motivo interno/i)
  assert.match(T.codigoNaoChave, /nunca envie o link/i)
  assert.match(T.imagemOrienta, /endere[çc]o de entrega/i)
  assert.match(T.imagemOrienta, /telefone/i)
  assert.match(T.imagemOrienta, /pagamento/i)
  assert.match(T.comoFunciona.join(' '), /n[ãa]o usamos a sua localiza/i)
  for (const m of ['ja_pedido', 'sem_delivery', 'unidade_obrigatoria', 'unidade_invalida', 'data_futura', 'limite_pedidos', 'limite_codigos', 'formato_invalido', 'upload_falhou', 'rede', 'padrao', 'encerrada']) assert.ok(T.recusa[m], `recusa ${m}`)
})

test('código: formato legível e validade em palavras (sem data fixa)', () => {
  assert.equal(codigoLegivel('abc123'), 'ABC-123')
  assert.equal(codigoLegivel('ab'), 'AB')
  const agora = new Date('2026-11-05T12:00:00Z')
  assert.equal(validadeDoCodigo('2026-11-06T11:30:00Z', agora), '23 h 30 min')
  assert.equal(validadeDoCodigo('2026-11-05T12:40:00Z', agora), '40 min')
  assert.equal(validadeDoCodigo('2026-11-05T11:59:00Z', agora), '', 'já venceu')
  assert.equal(validadeDoCodigo('lixo', agora), '')
})

test('só unidade com delivery "sim" entra; "não informado" e "não" ficam de fora; unidades com rótulo', () => {
  const dados = { participantes: [
    { slug: 'b', casa: { nome: 'Beta' }, unidades: [{ id: 'u1', nome: 'Centro', combo: { modos: { delivery: 'sim' } }, endereco: { logradouro: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Natal' } }, { id: 'u2', combo: { modos: { delivery: 'nao' } } }] },
    { slug: 'a', casa: { nome: 'Alfa' }, unidades: [{ id: 'u3', combo: { modos: { delivery: 'sim' } } }] },
    { slug: 'c', casa: { nome: 'Gama' }, unidades: [{ id: 'u4', combo: { modos: { delivery: 'nao_informado' } } }] },
    { slug: 'd', casa: { nome: 'Delta' }, unidades: [{ id: 'u5', combo: { modos: { local: 'sim', delivery: 'nao' } } }] },
  ] }
  const r = casasComDelivery(dados)
  assert.deepEqual(r.map((c) => c.slug), ['a', 'b'], 'ordem alfabética, só quem entrega')
  assert.deepEqual(r[1].unidades.map((u) => u.id), ['u1'], 'a unidade sem delivery não entra')
  assert.ok(r[1].unidades[0].rotulo.includes('Centro'))
  assert.deepEqual(casasComDelivery(null), [])
  assert.equal(casaDaConsulta('?casa=a', r), 'a')
  assert.equal(casaDaConsulta('?casa=z', r), '', 'casa fora da lista não pré-seleciona')
  assert.equal(casaDaConsulta('', r), '')
})

test('imagem: lado máximo, nunca amplia; só JPEG, PNG e WebP', () => {
  assert.deepEqual(dimensoesFinais(4000, 3000), { largura: LIMITES.imagemLadoMax, altura: 1200 })
  assert.deepEqual(dimensoesFinais(800, 600), { largura: 800, altura: 600 })
  assert.equal(extensaoDoTipo('image/jpeg'), 'jpg')
  assert.equal(extensaoDoTipo('image/webp'), 'webp')
  assert.equal(extensaoDoTipo('image/heic'), '')
  assert.equal(extensaoDoTipo('application/pdf'), '')
  assert.equal(LIMITES.imagemMaxBytes, 3 * 1024 * 1024)
})

test('rota /cartoon/caca/delivery existe e o caminho está nos atalhos', () => {
  assert.deepEqual(resolverCena('/cartoon/caca/delivery'), { cena: 'caca', secao: 'delivery' })
  assert.equal(CACA_CAMINHOS.delivery, '/cartoon/caca/delivery')
  assert.equal(resolverCena('/cartoon/caca/delivery/x').cena, 'inexistente')
})

function montar (respostas = {}, fetchResp = {}) {
  const chamadas = []; const buscas = []
  const chamar = async (nome, corpo) => { chamadas.push([nome, corpo]); const r = respostas[nome]; if (r instanceof Error) throw r; return r }
  const buscar = async (url, opc) => { buscas.push([url, opc]); const f = fetchResp[url.includes('caca-delivery') ? 'edge' : 'put']; if (f instanceof Error) throw f; return f }
  return { chamadas, buscas, api: criarApi({ chamar, buscar, edicao: '2026.2', urlBase: 'https://x.supabase.co' }) }
}
const resp = (corpo, ok = true) => ({ ok, json: async () => corpo })

test('API: pedir manda só chave, casa, unidade, data, referência e nota; valida antes de sair', async () => {
  const { api, chamadas } = montar({ caca_delivery_pedir: { ok: true, id: ID, estado: 'pendente', via: 'casa', codigo: 'ABC123' } })
  const r = await api.deliveryPedir(CHAVE, { slug: 'carcara', unidade: 'u-1', data: '2026-11-05', ref: ' #123 ', nota: ' ok ' })
  assert.equal(r.ok, true)
  assert.deepEqual(chamadas[0], ['caca_delivery_pedir', { p_chave: CHAVE, p_slug: 'carcara', p_unidade: 'u-1', p_data: '2026-11-05', p_ref: '#123', p_nota: 'ok' }])
  assert.equal((await api.deliveryPedir('curta', { slug: 'carcara', data: '2026-11-05' })).motivo, 'mapa_desconhecido')
  assert.equal((await api.deliveryPedir(CHAVE, { slug: 'Casa Torta', data: '2026-11-05' })).motivo, 'qr_invalido')
  assert.equal((await api.deliveryPedir(CHAVE, { slug: 'carcara', data: '05/11' })).motivo, 'data_invalida')
  assert.equal(chamadas.length, 1)
  assert.equal((await montar({ caca_delivery_pedir: { ok: false, motivo: 'sem_delivery' } }).api.deliveryPedir(CHAVE, { slug: 'a', data: '2026-11-05' })).motivo, 'sem_delivery')
  assert.equal((await montar({ caca_delivery_pedir: new Error('queda de rede') }).api.deliveryPedir(CHAVE, { slug: 'a', data: '2026-11-05' })).motivo, 'rede')
})

test('API: novo código e anexar só com id de pedido válido', async () => {
  const m = montar({ caca_delivery_novo_codigo: { ok: true, codigo: 'XYZ234' }, caca_delivery_anexar: { ok: true, via: 'imagem' } })
  assert.equal((await m.api.deliveryNovoCodigo(CHAVE, ID)).ok, true)
  assert.equal((await m.api.deliveryNovoCodigo(CHAVE, 'x')).motivo, 'pedido_nao_encontrado')
  assert.equal((await m.api.deliveryAnexar(CHAVE, ID, `2026.2/${ID}/${ID}.webp`)).ok, true)
  assert.deepEqual(m.chamadas.map((c) => c[0]), ['caca_delivery_novo_codigo', 'caca_delivery_anexar'])
})

test('API: imagem = URL assinada da edge function, PUT direto no armazenamento, depois anexar; falha em qualquer passo não anexa', async () => {
  const caminho = `2026.2/${ID}/${ID}.webp`
  const ok = montar({ caca_delivery_anexar: { ok: true, via: 'imagem' } }, { edge: resp({ ok: true, url: 'https://x.supabase.co/storage/v1/object/upload/sign/caca-delivery/z?token=t', path: caminho }), put: resp({}) })
  const r = await ok.api.deliveryEnviarImagem(CHAVE, ID, { blob: new Blob(['x']), ext: 'webp', tipo: 'image/webp' })
  assert.equal(r.ok, true)
  assert.equal(ok.buscas[0][0], 'https://x.supabase.co/functions/v1/caca-delivery')
  assert.deepEqual(JSON.parse(ok.buscas[0][1].body), { acao: 'subir', chave: CHAVE, pedido: ID, ext: 'webp' })
  assert.equal(ok.buscas[1][1].method, 'PUT')
  assert.deepEqual(ok.chamadas[0], ['caca_delivery_anexar', { p_chave: CHAVE, p_id: ID, p_path: caminho }])

  const semUrl = montar({}, { edge: resp({ ok: false, motivo: 'limite_imagem' }) })
  assert.equal((await semUrl.api.deliveryEnviarImagem(CHAVE, ID, { blob: new Blob(['x']), ext: 'webp', tipo: 'image/webp' })).motivo, 'limite_imagem')
  const putCaiu = montar({}, { edge: resp({ ok: true, url: 'https://x/u', path: caminho }), put: resp({}, false) })
  assert.equal((await putCaiu.api.deliveryEnviarImagem(CHAVE, ID, { blob: new Blob(['x']), ext: 'webp', tipo: 'image/webp' })).motivo, 'upload_falhou')
  assert.equal(putCaiu.chamadas.length, 0, 'upload que falhou nunca anexa')
  const rede = montar({}, { edge: new Error('offline') })
  assert.equal((await rede.api.deliveryEnviarImagem(CHAVE, ID, { blob: new Blob(['x']), ext: 'webp', tipo: 'image/webp' })).motivo, 'rede')
})

test('nada de chave, código ou imagem em console, analytics, URL ou armazenamento', () => {
  for (const arq of ['src/edicao/caca/delivery/Delivery.jsx', 'src/edicao/caca/delivery/imagem.js', 'src/edicao/caca/delivery/logica.js']) {
    const f = semComentarios(ler(arq))
    assert.doesNotMatch(f, /console\.|localStorage|sessionStorage|gtag|dataLayer/, arq)
  }
})

test('a ficha só oferece "Pedir carimbo do meu delivery" com delivery declarado "sim"', () => {
  const f = ler('src/edicao/cartoon/paginas/participante/ComoPedir.jsx')
  assert.match(f, /estadoModo\(p, 'delivery'\)\.estado === 'sim'[\s\S]{0,200}CACA_CAMINHOS\.delivery/)
})

// ---------------------------------------------------------------- migration e edge functions
const mig = ler('supabase/migrations/20261231_caca_delivery.sql')

test('migration: reaproveita a fila de presença, origem própria, sem GPS e sem posição guardada', () => {
  assert.match(mig, /motivo in \('sem_localizacao', 'imprecisa', 'longe', 'visita_anterior', 'delivery'\)/)
  assert.match(mig, /origem in \('gps', 'unidade_sem_coordenada', 'excecao_painel', 'visita_anterior', 'delivery_casa', 'delivery_organizacao'\)/)
  assert.match(mig, /values \(e\.mapa_id, e\.participacao_id, v_pu, v_qr, null, null, false, 'delivery_casa'\)/, 'sem distância nem precisão')
  const pedir = mig.slice(mig.indexOf('function public.caca_delivery_pedir'), mig.indexOf('function public.caca_delivery_novo_codigo'))
  assert.doesNotMatch(pedir, /p_lat|p_lng|distancia|precisao/, 'o pedido não recebe nem grava posição')
  assert.match(pedir, /delivery_combo = 'sim'/, 'só unidade com delivery declarado')
  assert.doesNotMatch(pedir, /nao_informado/)
  assert.match(pedir, /avaliacao_fecha_em/, 'janela da avaliação da edição')
  assert.doesNotMatch(pedir, /caca_visita_anterior_prazo/, 'o prazo excepcional de 05/11 não vale para delivery')
})

test('migration: código de uso único, 24 h, limite de tentativas, só a própria casa', () => {
  assert.match(mig, /create unique index if not exists caca_excecao_codigo_unico on public\.caca_carimbo_excecao \(codigo\)/)
  assert.match(mig, /interval '24 hours'/)
  assert.match(mig, /v_falhas >= 8/)
  assert.match(mig, /pt\.user_id = v_user/, 'o código só é procurado entre as participações da conta logada')
  assert.match(mig, /for update of x/, 'confirmação trava a linha: duas casas/operadores não confirmam duas vezes')
  assert.match(mig, /'motivo', 'codigo_usado'/)
  assert.match(mig, /'motivo', 'cedo'/, 'respeita as 12 h')
  assert.match(mig, /revoke all on function public\.caca_delivery_consultar\(text\), public\.caca_delivery_confirmar\(text\) from public, anon, authenticated;\s*grant execute on function public\.caca_delivery_consultar\(text\), public\.caca_delivery_confirmar\(text\) to authenticated;/)
  assert.match(mig, /grant execute on function public\.caca_delivery_imagem_reservar\(text, uuid, text\) to service_role;/)
  assert.doesNotMatch(mig, /grant execute on function public\.caca_delivery_imagem_reservar[^;]*anon/)
})

test('migration: imagem em bucket PRIVADO, sem policy, 3 MB, só 3 formatos; nada apaga sozinho', () => {
  assert.match(mig, /'caca-delivery', 'caca-delivery', false, 3145728, array\['image\/jpeg', 'image\/png', 'image\/webp'\]/)
  assert.doesNotMatch(mig, /create policy[^;]*storage\.objects/i, 'sem policy: só service_role escreve e lê')
  assert.doesNotMatch(mig, /delete from storage\.objects/i)
  assert.match(mig, /imagem_invalida/)
  assert.match(mig, /e\.imagem_reservas >= 5/)
})

test('migration: organização só decide o que tem imagem; aprovar nasce com origem própria; alertas não acusam delivery', () => {
  assert.match(mig, /if v_delivery and e\.via <> 'imagem' then raise exception 'aguarda_casa'/)
  assert.match(mig, /sem_imagem/)
  assert.match(mig, /when v_delivery then 'delivery_organizacao'/)
  assert.equal((mig.match(/k\.origem not in \('visita_anterior', 'delivery_casa', 'delivery_organizacao'\)/g) || []).length, 3)
  // o visitante nunca recebe a nota interna nem o caminho da imagem
  const minhas = mig.slice(mig.indexOf('function public.caca_excecao_minhas'), mig.indexOf('function public.caca_delivery_consultar'))
  assert.doesNotMatch(minhas, /'decisao_nota'|'imagem_path'|'decidido_por'/)
})

test('edge function caca-delivery: só reserva pelo banco e assina o envio; sem log; sem chave no retorno', () => {
  const f = ler('supabase/functions/caca-delivery/index.ts')
  assert.match(f, /caca_delivery_imagem_reservar/)
  assert.match(f, /createSignedUploadUrl\(data\.path\)/, 'o caminho vem do banco, nunca do navegador')
  assert.doesNotMatch(semComentarios(f), /console\./)
})

test('edge function arquivo-url: bucket caca-delivery só lê e remove (producao.gerir), nunca sobe, e só caminho gravado num pedido', () => {
  const f = ler('supabase/functions/arquivo-url/index.ts')
  assert.match(f, /'caca-delivery'\]/)
  assert.match(f, /bucket === 'caca-delivery' && \(acao === 'subir'/)
  assert.match(f, /bucket === 'caca-delivery' \? \['producao\.gerir'\]/)
  assert.match(f, /imagem_path', path\)\.eq\('motivo', 'delivery'\)/)
  assert.match(f, /acao === 'remover' && bucket !== 'caca-delivery'/)
})
