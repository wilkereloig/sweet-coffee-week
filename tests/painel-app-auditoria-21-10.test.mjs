/*
 * Correções da auditoria geral do painel — 21/10/2026 (lote 1). Cada teste prende um defeito que já existiu.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { FUNCOES_ESCRITA } from '../painel-app/src/lib/sync/dominios.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('Respostas › Criar acesso: a resposta da função não sombreia o rascunho da triagem (a conta nascia e a tela dizia "Não criou")', () => {
  const s = ler('painel-app/src/components/vistas/Respostas.jsx')
  const corpo = s.slice(s.indexOf('async function criarAcesso()'), s.indexOf('const naoAprovado'))
  assert.doesNotMatch(corpo, /const r = await chamarFuncao/, '`r` é o rascunho da triagem (useRascunhoOrg)')
  assert.match(corpo, /const resp = await chamarFuncao\('criar-acesso-marca'/)
  assert.match(corpo, /r\.editar\('status', 'aguardando_cadastro'\)/, 'o rascunho acompanha o status novo')
  assert.match(corpo, /senha: resp\.senha/)
})

test('criar-acesso-marca avisa a lista de candidaturas (o banco move a candidatura para "aguardando cadastro")', () => {
  assert.ok(FUNCOES_ESCRITA['criar-acesso-marca'].includes('respostas'))
})

test('Biblioteca: a arte em uso não vira "Apagada" só porque a primeira postagem a largou', () => {
  const sql = ler('supabase/migrations/20261026_social_biblioteca_arte_em_uso.sql')
  assert.match(sql, /order by a\.path, \(a\.removido_em is not null\), a\.criado_em/, 'entre as linhas do mesmo caminho, a ativa vem antes')
  assert.match(sql, /redes_exigir\(p_secret, 'redes\.ver'\)/)
  assert.doesNotMatch(sql, /drop |delete from/i)
})

test('Sair encerra só ESTE aparelho (sem escopo o GoTrue encerra a conta em todos)', () => {
  const app = ler('painel-app/src/App.jsx')
  assert.equal((app.match(/auth\('logout\?scope=local'/g) || []).length, 2, 'organização e marca')
  assert.doesNotMatch(app, /auth\('logout',/)
})

test('rascunhos do Social media não passam para a próxima conta na mesma aba', async () => {
  const { limparRascunhosSocial, PREFIXO_RASCUNHO, CHAVE_NOVA_POSTAGEM } = await import('../painel-app/src/lib/rascunhosSocial.js')
  const dados = { scw_redes_rascunho_abc: '1', scw_redes_rascunho_novo: '2', scw_social_nova_postagem: '3', scw_org: 'senha', outra: '4' }
  const st = { ...dados, removeItem(k) { delete this[k] } }
  limparRascunhosSocial(st)
  assert.deepEqual(Object.keys(st).filter((k) => k !== 'removeItem').sort(), ['outra', 'scw_org'], 'só os rascunhos saem')
  assert.doesNotThrow(() => limparRascunhosSocial(null))
  assert.doesNotThrow(() => limparRascunhosSocial({ removeItem() { throw new Error('bloqueado') }, scw_redes_rascunho_x: '1' }))
  // As chaves são as que as telas realmente gravam.
  assert.ok(ler('painel-app/src/components/vistas/RedesFicha.jsx').includes("'" + PREFIXO_RASCUNHO + "_novo'"))
  assert.ok(ler('painel-app/src/components/vistas/RedesFicha.jsx').includes("'" + PREFIXO_RASCUNHO + "_' + id"))
  assert.ok(ler('painel-app/src/components/vistas/SocialParticipantes.jsx').includes("'" + CHAVE_NOVA_POSTAGEM + "'"))
  const app = ler('painel-app/src/App.jsx')
  assert.match(app, /async function sairOrg[\s\S]*limparRascunhosSocial\(\)/)
  assert.match(app, /function trocaLocal\(\) \{\s*limparRascunhosSocial\(\)/)
})

test('pedido arquivado não conta como "faltando resposta" (a tela de destino não o mostra)', () => {
  assert.match(ler('painel-app/src/components/vistas/Mesa.jsx'), /s\.publicada_em && !s\.arquivada/)
  assert.match(ler('painel-app/src/lib/notificacoes.js'), /s\.publicada_em && !s\.arquivada && Number\(s\.pendentes/)
})

test('agenda de fotos: sessão remarcada ocupa o horário', () => {
  const fonte = ler('painel-app/src/lib/producao.js')
  assert.match(fonte, /x\.status === 'remarcada'/, 'o slot enxerga a sessão remarcada')
  assert.match(fonte, /s\.status === 'agendada' \|\| s\.status === 'remarcada'/, 'e a mostra como reservada')
})

test('Operação › Pedidos: restaurar o último arquivado não deixa a lista vazia sem saída', () => {
  assert.match(ler('painel-app/src/components/vistas/Producao.jsx'), /solicitacoes && \(verArquivados \|\| solicitacoes\.some\(\(s\) => s\.arquivada\)\)/)
})

test('aprovar tema e criar acessos em lote pedem confirmação', () => {
  for (const [arq, re] of [
    ['painel-app/src/components/vistas/Edicao.jsx', /status === 'aprovado' && !\(await confirmar\('Aprovar o tema/],
    ['painel-app/src/components/vistas/FichaOperacao.jsx', /status === 'aprovado' && !\(await confirmar\('Aprovar o tema/],
  ]) assert.match(ler(arq), re, arq)
  const m = ler('painel-app/src/components/vistas/Marcas.jsx')
  assert.equal((m.match(/confirmar\('Criar o acesso de '/g) || []).length, 2, 'botão do topo e ação em lote')
})

// ── Lote 2: aprovação da Eline — aprovar o que se VIU ─────────────────────────────────────────────────────────────
test('aprovação: o que a pessoa julga (arte por id+versão na ordem, texto, formato, horário) e o que mudou desde que viu', async () => {
  const R = await import('../painel-app/src/lib/redes.js')
  const a = (id, ordem, extra = {}) => ({ id, ordem, versao: 1, removido_em: null, ...extra })
  const post = { legenda: 'Oi', mencoes: '@a', formato: 'feed', programado_para: '2026-11-03T20:00:00+00:00', observacoes: '' }
  const visto = R.conteudoParaAprovar(post, [a('x', 0), a('y', 1)])
  assert.equal(visto.arte, 'x:1,y:1')
  // O mesmo instante escrito de outro jeito, ou uma arte removida/antiga, não é mudança.
  assert.deepEqual(R.partesMudadas(visto, R.conteudoParaAprovar({ ...post, programado_para: '2026-11-03T20:00:00.000Z' }, [a('y', 1), a('x', 0), a('z', 2, { removido_em: 'x' })])), [])
  // Trocar a arte (nova versão), reordenar, acrescentar ou mexer no texto/horário é mudança — e diz o quê.
  assert.deepEqual(R.partesMudadas(visto, R.conteudoParaAprovar(post, [a('x', 0, { versao: 2 }), a('y', 1)])), ['arte'])
  assert.deepEqual(R.partesMudadas(visto, R.conteudoParaAprovar(post, [a('y', 0), a('x', 1)])), ['arte'])
  assert.deepEqual(R.partesMudadas(visto, R.conteudoParaAprovar({ ...post, legenda: 'Oi!', programado_para: '2026-11-03T21:00:00Z' }, [a('x', 0), a('y', 1)])), ['legenda', 'horario'])
  assert.equal(R.textoPartes(['arte']), 'a arte')
  assert.equal(R.textoPartes(['arte', 'legenda']), 'a arte e a legenda')
  assert.equal(R.textoPartes(['arte', 'legenda', 'horario']), 'a arte, a legenda e o horário')
  assert.equal(R.textoPartes([]), '')
  assert.deepEqual(R.partesMudadas(null, visto).length > 0, true, 'sem o que foi visto, tudo conta como mudança')
})

test('aprovação: o banco sobe a versão e avisa quem aprova; a tela exige "Conferi" antes de "Aprovar"', () => {
  const sql = ler('supabase/migrations/20261027_social_aprovacao_versao.sql')
  assert.match(sql, /elsif p\.situacao = 'aprovacao' and p_conteudo_mudou then\s+[\s\S]*redes_carimbar\(p_post\)/, 'a versão sobe em "aguardando aprovação"')
  assert.match(sql, /not public\.pode_por_user\(auth\.uid\(\), 'redes\.aprovar'\)[\s\S]*redes_avisar_aprovadores/, 'avisa os aprovadores, menos se quem mexeu é um deles')
  assert.doesNotMatch(sql, /drop |delete from/i)
  assert.ok(sql.includes("p.situacao = 'pronto' and p_conteudo_mudou"), 'o ramo de "pronto" continua igual')
  const f = ler('painel-app/src/components/vistas/RedesFicha.jsx')
  assert.match(f, /principalBruta\.chave === 'aprovar' && mudouDepois \? \{ chave: 'conferir'/, 'com mudança não conferida, o botão principal é "Conferi as mudanças"')
  assert.match(f, /if \(principal\.chave === 'conferir'\) return conferiMudancas\(\)/)
  assert.match(f, /!!ocupado \|\| !!mudouDepois\} onClick=\{\(\) => situacao\('pronto'\)\}>Aprovar direto/, '"Aprovar direto" também espera a conferência')
  assert.match(f, /podeRef\.current\('redes\.aprovar'\)/, 'só quem aprova vê o aviso')
  assert.match(f, /R\.conteudoParaAprovar\(r\.post, r\.arquivos\)/)
})

// ── Lote 3 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test('cadastro da marca: o "Salvo" diz o que ficou de fora por inválido (CEP, UF, WhatsApp da unidade)', async () => {
  const E = await import('../painel-app/src/lib/edicaoMarca.js')
  assert.deepEqual(E.camposInvalidosDaUnidade({ cep: '5902', uf: 'RN', whatsapp_publico: '' }), ['o CEP'])
  assert.deepEqual(E.camposInvalidosDaUnidade({ cep: '59000000', uf: 'RNX', whatsapp_publico: '' }), ['a UF'])
  assert.deepEqual(E.camposInvalidosDaUnidade({ cep: '59000-000', uf: 'rn', whatsapp_publico: '(84) 99999-0000' }), [])
  const corpo = E.corpoUnidade({ cep: '5902', uf: 'RNX', logradouro: 'Rua A' })
  assert.ok(!('cep' in corpo) && !('uf' in corpo) && corpo.logradouro === 'Rua A', 'o que é inválido continua fora do PATCH')
  const c = ler('painel-app/src/components/vistas-marca/Cadastro.jsx')
  assert.match(c, /E\.camposInvalidosDaUnidade\(u\)/)
  assert.match(c, /'Salvo, menos ' \+ /)
})

test('cadastro da marca: remover unidade, troca e horário do dia pedem confirmação', () => {
  for (const [arq, re] of [
    ['painel-app/src/components/vistas-marca/edicao/Unidades.jsx', /await confirmar\('Remover ' \+ nome/],
    ['painel-app/src/components/vistas-marca/edicao/Alimentar.jsx', /await confirmar\('Remover esta troca\?'/],
    ['painel-app/src/components/vistas-marca/edicao/Atendimento.jsx', /await confirmar\('Tirar o horário de '/],
  ]) {
    const s = ler(arq)
    assert.match(s, re, arq)
    assert.match(s, /import \{ confirmar \} from '\.\.\/\.\.\/Confirmar'/, arq + ' importa a confirmação')
  }
})

test('Visão geral: "Tudo em dia" e "Nada pendente" só depois de ler tudo', () => {
  const m = ler('painel-app/src/components/vistas/Mesa.jsx')
  assert.match(m, /falhas: \[\], lidas: false/)
  assert.match(m, /falhas, lidas: true,/)
  assert.match(m, /!extra\.lidas \? <p className="ui-nota">Conferindo o que está pendente…<\/p>/)
  assert.match(m, /extra\.falhas\.length \? <p className="ui-nota">Não consegui ler tudo, então não dá para dizer que está em dia\./)
  assert.match(m, /!extra\.lidas \? <p className="ui-nota">Conferindo…<\/p> : <p className="ui-nota">Nada pendente agora\./)
})

test('Social media: responsável sem acesso não trava a gravação; "Próximos itens" só do futuro', () => {
  const sql = ler('supabase/migrations/20261028_social_resumo_e_responsavel.sql')
  assert.match(sql, /if p\.responsavel_id is distinct from antes\.responsavel_id then perform public\.redes_conferir_responsavel\(p\.responsavel_id\); end if;/)
  assert.doesNotMatch(sql, /perform public\.redes_conferir_responsavel\(p\.responsavel_id\);\n  p := public\.redes_gravar/, 'não confere mais a cada gravação')
  assert.match(sql, /from abertos where programado_para >= now\(\) and programado_para < now\(\) \+ interval '7 days'/)
  assert.doesNotMatch(sql, /programado_para is not null and programado_para < now\(\)/)
  assert.doesNotMatch(sql, /drop |delete from/i)
  assert.ok(existsSync(new URL('../supabase/testes/social-resumo-e-responsavel.sql', import.meta.url)))
})

test('Social media › ficha da postagem: limite de legenda conta as menções, título vazio avisa, fechar com arte subindo pergunta, data pela metade não apaga', async () => {
  const R = await import('../painel-app/src/lib/redes.js')
  assert.equal(R.contarCaracteres('oi 😀'), 4, 'um emoji conta 1')
  assert.equal(R.contarCaracteres(null), 0)
  assert.equal(R.contarCaracteres(R.textoCompleto('a'.repeat(2190), '@casa.cafe @outra.casa')), 2190 + 2 + 22, 'legenda + menções = o texto que vai para o Instagram')
  assert.equal(R.instanteDe('0002-11-03', '20:00'), null, 'ano digitado pela metade não é instante')
  const f = ler('painel-app/src/components/vistas/RedesFicha.jsx')
  assert.match(f, /nLegenda = R\.contarCaracteres\(R\.textoCompleto\(campos\.legenda, campos\.mencoes\)\)/)
  assert.match(f, /'titulo' in d && !norm\(d\.titulo\)\.trim\(\)\) \{ setErroAcao\('Dê um título à postagem\.'\)/)
  assert.match(f, /'perfil' in d && !norm\(d\.perfil\)\.trim\(\)/)
  assert.match(f, /const subindo = envios\.some\(\(e\) => e\.estado !== 'feito'\)/)
  assert.match(f, /Fechar mesmo assim/)
  assert.match(f, /if \(t\) \{ setCampo\('programado_para', t\); setDhLocal\(null\) \} else setDhLocal\(n\)/, 'data inválida fica como rascunho de digitação')
})
