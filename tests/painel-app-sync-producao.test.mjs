import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  LEITURA_VAZIA, reduzirLeitura, visaoDaLeitura, bloqueada, atualizacaoFalhou,
  renovarDaLista, valoresEditaveis, soAlterados, aparar, CAMPOS_ARQUIVO, formularioDoArquivo,
  materialParaEntregar, impressaoDoArquivo, envioReaproveitavel,
} from '../painel-app/src/lib/leituraViva.js'
import { iniciarRegistro, reduzirRegistro } from '../painel-app/src/lib/sync/mesclar.js'

const aplicar = (e, ...acoes) => acoes.reduce(reduzirLeitura, e)

// ── uma leitura: a regra que as vistas de produção/publicação/arquivos seguem ──────────────────

test('leitura: a primeira resposta preenche; sem nada e com erro a tela bloqueia', () => {
  const sem = aplicar(LEITURA_VAZIA, { tipo: 'falhou', chave: 'a', erro: 'rede' })
  assert.equal(bloqueada(visaoDaLeitura(sem, 'a')), true, 'sem dados e com erro: tela de erro')
  const ok = aplicar(sem, { tipo: 'chegou', chave: 'a', dados: [1, 2] })
  assert.deepEqual(visaoDaLeitura(ok, 'a'), { dados: [1, 2], erro: null })
  assert.equal(bloqueada(visaoDaLeitura(ok, 'a')), false)
})

test('leitura: releitura que FALHA nunca apaga o que já está na tela', () => {
  const ok = aplicar(LEITURA_VAZIA, { tipo: 'chegou', chave: 'a', dados: [{ id: 1 }] })
  const falhou = aplicar(ok, { tipo: 'falhou', chave: 'a', erro: 'timeout' })
  const v = visaoDaLeitura(falhou, 'a')
  assert.deepEqual(v.dados, [{ id: 1 }], 'conteúdo anterior intacto')
  assert.equal(v.erro, 'timeout')
  assert.equal(bloqueada(v), false, 'não vira a tela de erro')
  assert.equal(atualizacaoFalhou(v), true, 'vira aviso sobre o conteúdo')
  // a próxima resposta boa limpa o aviso
  assert.equal(visaoDaLeitura(aplicar(falhou, { tipo: 'chegou', chave: 'a', dados: [] }), 'a').erro, null)
})

test('leitura: trocar de registro (chave) nunca mostra os dados do anterior', () => {
  const a = aplicar(LEITURA_VAZIA, { tipo: 'chegou', chave: 'ficha-A', dados: { nome: 'Doce Sol' } })
  assert.deepEqual(visaoDaLeitura(a, 'ficha-A').dados, { nome: 'Doce Sol' })
  // a tela já está na ficha B, mas a resposta de B ainda não chegou
  const emB = visaoDaLeitura(a, 'ficha-B')
  assert.equal(emB.dados, undefined, 'nada de A aparece em B')
  assert.equal(emB.erro, null)
  // erro de A (resposta atrasada) não contamina B
  const erroA = aplicar(a, { tipo: 'falhou', chave: 'ficha-A', erro: 'x' })
  assert.equal(visaoDaLeitura(erroA, 'ficha-B').erro, null)
  // falha na própria B, sem dados dela: bloqueia B (e só B)
  const erroB = aplicar(a, { tipo: 'falhou', chave: 'ficha-B', erro: 'sem permissão' })
  assert.equal(bloqueada(visaoDaLeitura(erroB, 'ficha-B')), true)
  assert.equal(visaoDaLeitura(erroB, 'ficha-A').dados, undefined, 'voltar a A relê: o estado guardado já é de B')
})

test('leitura: ajuste local (já confirmado) só mexe nos dados do mesmo registro e só se houver dados', () => {
  const lista = aplicar(LEITURA_VAZIA, { tipo: 'chegou', chave: 'x', dados: [{ id: 1, ok: false }, { id: 2, ok: false }] })
  const marcado = aplicar(lista, { tipo: 'ajustar', chave: 'x', valor: (l) => l.map((i) => (i.id === 2 ? { ...i, ok: true } : i)) })
  assert.deepEqual(visaoDaLeitura(marcado, 'x').dados, [{ id: 1, ok: false }, { id: 2, ok: true }])
  assert.equal(aplicar(lista, { tipo: 'ajustar', chave: 'outro', valor: () => [] }), lista, 'outro registro: ignora')
  assert.equal(aplicar(LEITURA_VAZIA, { tipo: 'ajustar', chave: 'x', valor: () => [] }), LEITURA_VAZIA, 'sem dados: nada a ajustar')
})

test('leitura: o registro que a própria gravação devolve vale mesmo antes da primeira leitura e limpa o erro', () => {
  const falhou = aplicar(LEITURA_VAZIA, { tipo: 'falhou', chave: 'ed-1', erro: 'rede' })
  const novo = aplicar(falhou, { tipo: 'ajustar', chave: 'ed-1', valor: { fase: 'avaliacao' } })
  assert.deepEqual(visaoDaLeitura(novo, 'ed-1'), { dados: { fase: 'avaliacao' }, erro: null })
})

// ── linha de uma lista que foi clicada (folhas abertas sobre lista que se relê) ────────────────

test('renovarDaLista: a folha aberta mostra a linha de AGORA; se sumiu, fica a que foi clicada', () => {
  const clicada = { id: 's1', status: 'agendada', local: 'Loja' }
  const lista = [{ id: 's0', status: 'aberto' }, { id: 's1', status: 'cancelada', local: 'Loja nova' }]
  assert.deepEqual(renovarDaLista(clicada, lista), { id: 's1', status: 'cancelada', local: 'Loja nova' })
  assert.equal(renovarDaLista(clicada, [{ id: 's0' }]), clicada, 'sumiu da lista: mantém')
  assert.equal(renovarDaLista(clicada, null), clicada, 'lista ainda não carregou: mantém')
  assert.equal(renovarDaLista(null, lista), null)
  assert.deepEqual(renovarDaLista({ participacao_id: 'p1' }, [{ participacao_id: 'p1', n: 2 }], 'participacao_id'), { participacao_id: 'p1', n: 2 })
})

// ── formulário sobre um registro do servidor ───────────────────────────────────────────────────

test('valoresEditaveis: vazio vira texto vazio, número vira texto, boolean fica', () => {
  const v = valoresEditaveis({ nome: 'Guia', descricao: null, versao: 2, exige: true }, ['nome', 'descricao', 'versao', 'exige', 'faltando'])
  assert.deepEqual(v, { nome: 'Guia', descricao: '', versao: '2', exige: true, faltando: '' })
  assert.equal(valoresEditaveis({}, ['a'], { a: false }).a, false, 'padrão por campo')
})

test('formularioDoArquivo: categoria vazia cai em documento, leitura nula vira falso, versão vira texto', () => {
  const f = formularioDoArquivo({ nome: 'Regulamento', descricao: null, categoria: null, versao: 1, exige_leitura: null })
  assert.deepEqual(f, { nome: 'Regulamento', descricao: '', categoria: 'documento', versao: '1', exige_leitura: false })
  assert.deepEqual(Object.keys(f), CAMPOS_ARQUIVO)
})

test('soAlterados: só vai o que a pessoa mexeu', () => {
  const base = { nome: 'A', descricao: '', versao: '1' }
  assert.deepEqual(soAlterados(base, { ...base }, ['nome', 'descricao', 'versao']), {})
  assert.deepEqual(soAlterados(base, { ...base, descricao: 'nova' }, ['nome', 'descricao', 'versao']), { descricao: 'nova' })
  assert.deepEqual(soAlterados({ a: null }, { a: undefined }, ['a']), {}, 'null e undefined são "vazio" dos dois lados')
  assert.deepEqual(soAlterados({ a: '' }, { a: 'x' }, ['a']), { a: 'x' })
})

test('aparar: tira espaço das pontas só de texto', () => {
  assert.deepEqual(aparar({ nome: '  Guia ', exige_leitura: true, versao: ' 2' }), { nome: 'Guia', exige_leitura: true, versao: '2' })
})

test('editar arquivo com outra pessoa mexendo ao mesmo tempo: o que vai ao servidor não desfaz o dela', () => {
  const doBanco = { nome: 'Regulamento', descricao: 'v1', categoria: 'documento', versao: 1, exige_leitura: false }
  // a folha abre
  let reg = iniciarRegistro(formularioDoArquivo(doBanco), CAMPOS_ARQUIVO)
  // a pessoa troca o nome
  reg = reduzirRegistro(reg, { tipo: 'editar', campo: 'nome', valor: '  Regulamento 2027 ' })
  // outra pessoa SUBSTITUI o arquivo (versão 2) e liga a confirmação de leitura; a lista se relê
  const depois = { ...doBanco, versao: 2, exige_leitura: true }
  reg = reduzirRegistro(reg, { tipo: 'servidor', servidor: formularioDoArquivo(depois) })
  assert.equal(reg.local.nome, '  Regulamento 2027 ', 'o que está digitado não foi trocado')
  assert.equal(reg.local.versao, '2', 'o campo que ela não tocou acompanhou o banco')
  assert.equal(reg.local.exige_leitura, true)
  assert.deepEqual(Object.keys(reg.conflitos), [], 'não houve edição dos dois lados no mesmo campo')
  // salvar: só o nome vai (o formulário inteiro mandaria versao 1 / leitura falsa de volta)
  const enviado = aparar(soAlterados(reg.base, reg.local, CAMPOS_ARQUIVO))
  assert.deepEqual(enviado, { nome: 'Regulamento 2027' })
})

test('editar arquivo: o MESMO campo mudado dos dois lados vira conflito e continua com o que foi digitado', () => {
  const doBanco = { nome: 'Guia', descricao: '', categoria: 'guia', versao: 1, exige_leitura: false }
  let reg = iniciarRegistro(formularioDoArquivo(doBanco), CAMPOS_ARQUIVO)
  reg = reduzirRegistro(reg, { tipo: 'editar', campo: 'nome', valor: 'Guia da marca' })
  reg = reduzirRegistro(reg, { tipo: 'servidor', servidor: formularioDoArquivo({ ...doBanco, nome: 'Guia 2027' }) })
  assert.deepEqual(reg.conflitos, { nome: { meu: 'Guia da marca', deles: 'Guia 2027' } })
  assert.equal(reg.local.nome, 'Guia da marca')
})

// ── material: a linha que vai para salvar_material ─────────────────────────────────────────────

test('materialParaEntregar: parte da linha de AGORA, não da de quando clicou', () => {
  const agora = [{ id: 'm1', item: 'mesa', quantidade: 6, status: 'separado', marca: 'Doce Sol', unidade_id: 'u1' }]
  const r = materialParaEntregar(agora, 'm1', 'Ana')
  assert.deepEqual(r.item, { id: 'm1', item: 'mesa', quantidade: 6, status: 'entregue', marca: 'Doce Sol', unidade_id: 'u1', recebido_por: 'Ana' })
  assert.equal(agora[0].status, 'separado', 'não muda a lista de origem')
})

test('materialParaEntregar: recusa o que mudou durante o diálogo', () => {
  assert.equal(materialParaEntregar([], 'm1', 'Ana').motivo, 'sumiu')
  assert.equal(materialParaEntregar(null, 'm1', 'Ana').motivo, 'sumiu')
  assert.equal(materialParaEntregar([{ id: 'm1', status: 'entregue' }], 'm1', 'Ana').motivo, 'ja_entregue')
  assert.equal(materialParaEntregar([{ id: 'm1', status: 'cancelado' }], 'm1', 'Ana').motivo, 'cancelado')
})

// ── envio que subiu mas não foi registrado ─────────────────────────────────────────────────────

test('envioReaproveitavel: o mesmo arquivo no mesmo caminho não sobe de novo; outro, sobe', () => {
  const arq = { name: 'guia.pdf', size: 1234, lastModified: 99 }
  const ultimo = { path: 'geral/guia.pdf', impressao: impressaoDoArquivo(arq) }
  assert.equal(envioReaproveitavel(ultimo, 'geral/guia.pdf', arq), true)
  assert.equal(envioReaproveitavel(ultimo, 'geral/outro.pdf', arq), false, 'outro caminho')
  assert.equal(envioReaproveitavel(ultimo, 'geral/guia.pdf', { ...arq, size: 1235 }), false, 'arquivo mudou')
  assert.equal(envioReaproveitavel(ultimo, 'geral/guia.pdf', { ...arq, lastModified: 100 }), false, 'arquivo mudou')
  assert.equal(envioReaproveitavel(null, 'geral/guia.pdf', arq), false, 'nada subiu antes')
})
