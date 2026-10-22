// "Ver como participante" (22/10/2026): o administrador vê o painel da marca sem gravar nada.
// Lógica do desvio em painel-app/src/lib/marcaApi.js; banco em supabase/migrations/20261104_ver_como_participante.sql
// (teste do banco: supabase/testes/ver-como-participante.sql).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { api, auth, subirLogo, assinarDownload, precisaTrocarSenha, ativarVerComo, consultaDoCaminho, RPC_LEITURA_MARCA } from '../painel-app/src/lib/marcaApi.js'
import { verComoDaUrl } from '../painel-app/src/lib/marcaApi.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const SQL = ler('supabase/migrations/20261104_ver_como_participante.sql')

test('caminho do PostgREST vira a consulta que o banco entende', () => {
  assert.deepEqual(consultaDoCaminho('participantes?select=*&order=created_at.desc&limit=1'),
    { tabela: 'participantes', filtros: [], ordem: [{ c: 'created_at', desc: true, nullslast: false, nullsfirst: false }], select: ['*'], limite: 1 })
  const c = consultaDoCaminho('mensagens?select=id,de,corpo&de=eq.organizacao&lida_em=is.null&order=criada_em.desc.nullslast')
  assert.deepEqual(c.select, ['id', 'de', 'corpo'])
  assert.deepEqual(c.filtros, [{ c: 'de', op: 'eq', v: 'organizacao' }, { c: 'lida_em', op: 'is', v: 'null' }])
  assert.deepEqual(c.ordem, [{ c: 'criada_em', desc: true, nullslast: true, nullsfirst: false }])
  assert.deepEqual(consultaDoCaminho('substituicoes?select=*&item_id=in.(a,b)').filtros, [{ c: 'item_id', op: 'in', v: ['a', 'b'] }])
  assert.deepEqual(consultaDoCaminho('unidade_disponibilidade?order=data,abre').ordem.map((o) => o.c), ['data', 'abre'])
  assert.throws(() => consultaDoCaminho('participantes?id=like.*x*'), /consulta_invalida/)
})

test('todo caminho que as telas da marca leem é entendido (nenhum lança)', () => {
  const caminhos = [
    "participantes?select=*&order=created_at.desc&limit=1", "participacoes?select=*&order=created_at.desc&limit=1",
    "participantes_itens?select=*&participacao_id=eq.X", "participacao_unidades?select=*&participacao_id=eq.X&order=ordem",
    "unidades?select=*&participante_id=eq.X&order=criado_em", "edicoes?select=*&codigo=eq.2026.2", "edicao_cronograma?select=*&edicao_codigo=eq.2026.2&order=ordem",
    "arquivos?select=*&order=publicado_em.desc.nullslast", "solicitacoes?select=*&order=prazo_em.asc.nullslast", "sessoes_fotos?select=*&order=data_hora.asc",
    "vendas_diarias?select=*&participacao_id=eq.X&order=dia.desc", "temas_propostos?select=status,tema,observacao&status=neq.substituido",
  ]
  for (const c of caminhos) assert.doesNotThrow(() => consultaDoCaminho(c), c)
})

test('no modo visualização: lê pelo administrador, recusa TODA gravação, nunca toca a sessão da marca', async () => {
  const pedidos = []
  ativarVerComo({ ler: async (c) => { pedidos.push(c); return [{ ok: 1 }] }, baixar: async (p) => 'https://assinado/' + p })
  try {
    assert.deepEqual(await api('participantes?select=*&limit=1'), [{ ok: 1 }])
    assert.equal(pedidos[0].tabela, 'participantes')
    await api('rpc/marca_minha_logo', { metodo: 'POST', corpo: {} })
    assert.deepEqual(pedidos[1], { rpc: 'marca_minha_logo', args: {} })
    const recusa = /modo_visualizacao/
    await assert.rejects(api('participantes?id=eq.1', { metodo: 'PATCH', corpo: { telefone: '1' } }), recusa)
    await assert.rejects(api('vendas_diarias', { metodo: 'POST', corpo: {} }), recusa)
    await assert.rejects(api('substituicoes?id=eq.1', { metodo: 'DELETE' }), recusa)
    await assert.rejects(api('rpc/marca_enviar_mensagem', { metodo: 'POST', corpo: { p_corpo: 'oi' } }), recusa)
    await assert.rejects(api('rpc/marca_ler_mensagens', { metodo: 'POST', corpo: {} }), recusa, 'abrir a conversa não marca como lido')
    await assert.rejects(api('rpc/marca_usar_voucher', { metodo: 'POST', corpo: {} }), recusa)
    await assert.rejects(auth('user', { password: 'x' }, 'PUT', 't'), recusa, 'trocar a senha da marca')
    await assert.rejects(subirLogo('a/b.png', new Blob(['x']), 'image/png'), recusa)
    assert.equal(await assinarDownload('geral/x.pdf'), 'https://assinado/geral/x.pdf')
    assert.equal(await precisaTrocarSenha(), 'ok')
    assert.equal(pedidos.length, 2, 'nenhuma gravação chegou ao leitor')
  } finally { ativarVerComo(null) }
})

test('as funções de leitura são as mesmas no painel e no banco', () => {
  const m = /funcoes constant text\[\] := array\[([^\]]+)\]/.exec(SQL)
  const doBanco = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort()
  assert.deepEqual([...RPC_LEITURA_MARCA].sort(), doBanco)
})

test('banco: leitora STABLE e SECURITY INVOKER (o Postgres recusa gravar), sem delete, abrir registra na auditoria', () => {
  assert.match(SQL, /function public\.org_ver_como_ler\([^)]*\)\s*returns jsonb language plpgsql stable security invoker/)
  assert.doesNotMatch(SQL, /delete from/i)
  assert.match(SQL, /'participante\.ver_como'/)
  assert.match(SQL, /pode\(p_secret, 'acesso\.gerir'\)/, 'só administrador')
  assert.match(SQL, /revoke all on function public\.org_ver_como_ler\(text, uuid, jsonb\) from public, anon/)
})

test('endereço: só um uuid em ?ver_como abre o modo', () => {
  assert.equal(verComoDaUrl('?ver_como=19f3f1d2-4698-4f5a-a65c-58db587709d3'), '19f3f1d2-4698-4f5a-a65c-58db587709d3')
  assert.equal(verComoDaUrl('?ver_como=x'), null)
  assert.equal(verComoDaUrl(''), null)
})

test('a casca no modo visualização: sem tempo real, sem convite, sem marcar aviso como lido, faixa no topo', () => {
  const jsx = ler('painel-app/src/components/PainelMarcaShell.jsx')
  assert.match(jsx, /if \(verComo\) return undefined\s*\n\s*iniciarSincronizacao/)
  assert.match(jsx, /!n\.lida_em && !verComo/)
  assert.match(jsx, /\{!verComo && <ConviteAparelho/)
  assert.match(jsx, /className="vc-faixa"/)
  const ficha = ler('painel-app/src/components/vistas/FichaMarcaPagina.jsx')
  assert.match(ficha, /pode\('acesso\.gerir'\) \? \[\{ rotulo: 'Ver como participante'/)
})
