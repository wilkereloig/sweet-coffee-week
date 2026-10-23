import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { existe } from './_icones.mjs'
import { carregar, html } from './_renderizar.mjs'
import { consultaDoCaminho } from '../painel-app/src/lib/marcaApi.js'
import {
  DIAS_NOVO, ehNovo, precisaLeitura, leituraVale, organizarArquivos, formatoLegivel, versaoLegivel, detalhesDoArquivo, publicadoEm,
  publicadoDepoisDaLeitura, leituraProvisoria, tipoDeAbertura, acoesDoArquivo, urlParaBaixar, notaDeAbertura, retornoDaAcao, erroDaAcao,
  pendenciasDeArquivos, mapaDeLeituras, leituraNaFicha,
} from '../painel-app/src/lib/arquivosMarca.js'
import { plataforma } from '../painel-app/src/lib/instalar.js'
import { resumoMarca } from '../painel-app/src/lib/guia.js'

/*
 * Tela Arquivos da marca (22/10/2026): o que vai ao topo, o que é "novo", Abrir × Baixar e o que a tela diz
 * em cada aparelho. Lógica pura + o que o código das telas tem que continuar garantindo.
 */
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const HOOK = ler('painel-app/src/components/vistas-marca/arquivos/useAcessoArquivo.js')
const AGORA = new Date('2026-10-22T15:00:00Z')
const dias = (n) => new Date(AGORA.getTime() - n * 86400000).toISOString()
const arq = (id, extra = {}) => ({ id, nome: 'Arquivo ' + id, categoria: 'documento', path: 'geral/' + id + '.pdf', mime: 'application/pdf', exige_leitura: false, publicado_em: dias(30), ...extra })

// ── Destaque de leitura × novo ───────────────────────────────────────────────

test('o que exige leitura e não foi lido vai ao topo; o lido volta para a categoria', () => {
  const lista = [
    arq('a', { exige_leitura: true, publicado_em: dias(10) }),
    arq('b', { exige_leitura: true, categoria: 'guia', publicado_em: dias(2) }),
    arq('c', { exige_leitura: true, publicado_em: dias(20) }),
    arq('d'),
  ]
  const o = organizarArquivos(lista, { c: dias(1) })
  assert.deepEqual(o.paraLer.map((a) => a.id), ['b', 'a'], 'só os não lidos, o mais recente primeiro')
  assert.deepEqual(o.grupos.map((g) => [g.chave, g.itens.map((i) => i.id)]), [['documento', ['c', 'd']]], 'lido e sem exigência ficam na categoria de sempre')
  assert.equal(precisaLeitura(lista[2], { c: dias(1) }), false)
  assert.equal(precisaLeitura(lista[3], {}), false, 'sem exigência nunca pede leitura')
})

test('sem a leitura das confirmações, nada é chutado como pendente', () => {
  const lista = [arq('a', { exige_leitura: true }), arq('b')]
  const o = organizarArquivos(lista, null)
  assert.deepEqual(o.paraLer, [])
  assert.equal(o.leituraIncerta, true)
  assert.deepEqual(o.grupos.flatMap((g) => g.itens.map((i) => i.id)), ['a', 'b'], 'a lista aparece inteira, nada some')
  assert.equal(organizarArquivos([arq('b')], null).leituraIncerta, false, 'sem exigência de leitura não há o que duvidar')
  assert.deepEqual(organizarArquivos(null, {}), { paraLer: [], grupos: [], leituraIncerta: false })
})

test('as categorias de sempre continuam: mesma ordem, mesmos rótulos', () => {
  const o = organizarArquivos([arq('a', { categoria: 'outro' }), arq('b', { categoria: 'guia' }), arq('c', { categoria: 'identidade' })], {})
  assert.deepEqual(o.grupos.map((g) => g.rotulo), ['Identidade do festival', 'Guias', 'Outros'])
})

test('a contagem do topo é a do Início (mesma regra de useResumoMarca)', () => {
  // A regra do Início, copiada do hook: se ela mudar lá, este teste reprova a cópia.
  const hook = ler('painel-app/src/components/vistas-marca/useResumoMarca.js')
  assert.match(hook, /api\('arquivo_leitura\?select=arquivo_id,lido_em'\)/, 'o Início lê QUANDO leu (para saber se é da versão atual)')
  assert.match(hook, /const lidos = mapaDeLeituras\(leituras\)/, 'uma linha por participação: vale a leitura mais recente de cada arquivo')
  assert.match(hook, /arquivosParaLer: \(arqs \|\| \[\]\)\.filter\(\(a\) => precisaLeitura\(a, lidos\) && a\.categoria !== 'combo'\)\.length/)
  assert.match(hook, /fotosParaLer: \(arqs \|\| \[\]\)\.filter\(\(a\) => precisaLeitura\(a, lidos\) && a\.categoria === 'combo'\)\.length/)
  const lista = [
    arq('a', { exige_leitura: true }), arq('b', { exige_leitura: true, categoria: 'combo' }), arq('c', { exige_leitura: true, categoria: 'combo' }),
    arq('d', { exige_leitura: true }), arq('e'), arq('f', { exige_leitura: true, categoria: 'guia' }),
    // lido ANTES da versão atual (substituído depois): volta a contar
    arq('g', { exige_leitura: true, publicado_em: dias(2) }), arq('h', { exige_leitura: true, categoria: 'combo', publicado_em: dias(2) }),
  ]
  const lidos = { d: dias(1), c: dias(1), g: dias(5), h: dias(5) }
  const arquivosParaLer = lista.filter((a) => precisaLeitura(a, lidos) && a.categoria !== 'combo').length
  const fotosParaLer = lista.filter((a) => precisaLeitura(a, lidos) && a.categoria === 'combo').length
  assert.deepEqual([arquivosParaLer, fotosParaLer], [3, 2], 'a, f e g · b e h')
  // A tela de Arquivos recebe só o que não é combo; a de Fotos, só o combo — e mostra exatamente essa conta.
  assert.equal(organizarArquivos(lista.filter((a) => a.categoria !== 'combo'), lidos).paraLer.length, arquivosParaLer)
  assert.equal(organizarArquivos(lista.filter((a) => a.categoria === 'combo'), lidos).paraLer.length, fotosParaLer)
  const base = { participacao: { id: 'pa', combo_status: 'rascunho', status_cadastro: 'em_preenchimento' }, arquivosParaLer, fotosParaLer }
  const r = resumoMarca(base)
  assert.equal(r.contagem.arquivos, arquivosParaLer)
  assert.equal(r.contagem.fotos, fotosParaLer)
})

test('"novo" é publicado há até 7 dias — e só isso: o banco não sabe quem abriu', () => {
  assert.equal(DIAS_NOVO, 7)
  assert.equal(ehNovo(arq('a', { publicado_em: dias(0) }), AGORA), true)
  assert.equal(ehNovo(arq('a', { publicado_em: dias(7) }), AGORA), true)
  assert.equal(ehNovo(arq('a', { publicado_em: dias(7.01) }), AGORA), false)
  assert.equal(ehNovo(arq('a', { publicado_em: dias(-1) }), AGORA), false, 'data futura não é novo')
  assert.equal(ehNovo(arq('a', { publicado_em: null, created_at: dias(2) }), AGORA), true, 'sem publicado_em vale created_at')
  assert.equal(ehNovo(arq('a', { publicado_em: null }), AGORA), false)
  assert.equal(ehNovo(arq('a', { publicado_em: 'lixo' }), AGORA), false)
  // Ser novo não muda de bloco: um arquivo novo que exige leitura está no topo POR EXIGIR leitura; um novo sem exigência fica na categoria.
  const o = organizarArquivos([arq('n', { publicado_em: dias(1) }), arq('l', { publicado_em: dias(1), exige_leitura: true })], {})
  assert.deepEqual(o.paraLer.map((a) => a.id), ['l'])
  assert.deepEqual(o.grupos[0].itens.map((a) => a.id), ['n'])
})

// ── O que o dado diz sobre o arquivo ─────────────────────────────────────────

test('formato, tamanho e versão: só o que o dado tem', () => {
  assert.deepEqual(detalhesDoArquivo(arq('a', { tamanho: 2.4 * 1024 * 1024, versao: '2' })), ['PDF', '2,4 MB', 'versão 2'])
  assert.deepEqual(detalhesDoArquivo(arq('a', { tamanho: null, versao: null, path: 'geral/sem-extensao', mime: null })), [], 'nada inventado')
  assert.equal(formatoLegivel({ path: 'x/logo.png' }), 'Imagem PNG')
  assert.equal(formatoLegivel({ path: 'x/sem-extensao', mime: 'image/heic' }), 'Imagem')
  assert.equal(formatoLegivel({ path: 'x/sem-extensao' }), '', 'o genérico "Arquivo" não informa nada')
  assert.equal(versaoLegivel('v3'), 'versão 3')
  assert.equal(versaoLegivel(' 1.2 '), 'versão 1.2')
  assert.equal(versaoLegivel(''), '')
  assert.equal(versaoLegivel(null), '')
  assert.equal(publicadoEm(arq('a', { publicado_em: new Date(2026, 9, 5, 12).toISOString() })), '05/10/2026')
  assert.equal(publicadoEm({ publicado_em: null, created_at: null }), '')
})

test('arquivo substituído depois da leitura: pede confirmar DE NOVO, sem acusar o relógio do aparelho', () => {
  const a = arq('a', { publicado_em: '2026-10-20T12:00:00Z' })
  assert.equal(publicadoDepoisDaLeitura(a, '2026-10-10T12:00:00Z'), true)
  assert.equal(publicadoDepoisDaLeitura(a, '2026-10-21T12:00:00Z'), false, 'lido depois de publicado')
  assert.equal(publicadoDepoisDaLeitura(a, '2026-10-20T12:00:30Z'), false, 'menos de 1 min de diferença não conta')
  assert.equal(publicadoDepoisDaLeitura(a, '2026-10-20T11:59:30Z'), false, 'a tolerância vale para os dois lados do minuto (é a do banco)')
  assert.equal(publicadoDepoisDaLeitura(a, null), false)
  // Leitura de versão anterior não vale: volta para "Para ler", e a lista conta como pendente.
  const exige = { ...a, exige_leitura: true }
  assert.equal(leituraVale(exige, '2026-10-10T12:00:00Z'), false)
  assert.equal(leituraVale(exige, '2026-10-21T12:00:00Z'), true)
  assert.equal(leituraVale(exige, undefined), false)
  assert.equal(precisaLeitura(exige, { a: '2026-10-10T12:00:00Z' }), true)
  assert.equal(precisaLeitura(exige, { a: '2026-10-21T12:00:00Z' }), false)
  assert.deepEqual(organizarArquivos([exige], { a: '2026-10-10T12:00:00Z' }).paraLer.map((x) => x.id), ['a'])
  // O banco usa a MESMA tolerância (renovar e "N confirmaram"): se divergissem, a marca ficaria sem botão e a organização sem a leitura.
  const sql = ler('supabase/migrations/20261105_marca_confirmar_leitura.sql')
  assert.match(sql, /where l\.lido_em < v_publicado - interval '1 minute'/)
  assert.match(sql, /l\.lido_em >= a\.publicado_em - interval '1 minute'/)
  // Hora provisória da leitura recém-confirmada: nunca antes da publicação, mesmo com o relógio daqui atrasado.
  const provisoria = leituraProvisoria(a, new Date('2026-10-19T00:00:00Z'))
  assert.equal(publicadoDepoisDaLeitura(a, provisoria), false)
  assert.equal(leituraProvisoria(a, new Date('2026-10-22T00:00:00Z')), '2026-10-22T00:00:00.000Z')
})

// ── Abrir × Baixar ───────────────────────────────────────────────────────────

test('só abre no navegador o que ele sabe mostrar; tudo baixa', () => {
  const tipos = (path, mime) => tipoDeAbertura({ path, mime })
  assert.equal(tipos('g/a.pdf', 'application/octet-stream'), 'pdf', 'a extensão vale mais que o mime')
  assert.equal(tipos('g/a.PNG', null), 'imagem')
  assert.equal(tipos('g/a.jpeg'), 'imagem')
  assert.equal(tipos('g/a.svg'), 'imagem')
  assert.equal(tipos('g/a.mp4'), 'video')
  assert.equal(tipos('g/sem-extensao', 'application/pdf'), 'pdf')
  assert.equal(tipos('g/sem-extensao', 'image/webp'), 'imagem')
  for (const outro of ['g/a.zip', 'g/a.ai', 'g/a.docx', 'g/a.xlsx', 'g/a.mov', 'g/a.eps']) assert.equal(tipos(outro), 'outro', outro)
  assert.equal(tipos('g/foto', 'image/heic'), 'outro', 'HEIC não abre em todo navegador')
  const pdf = acoesDoArquivo({ path: 'g/a.pdf' })
  assert.deepEqual([pdf.abrir, pdf.baixar, pdf.dica], [true, true, ''])
  const zip = acoesDoArquivo({ path: 'g/a.zip' })
  assert.deepEqual([zip.abrir, zip.baixar], [false, true])
  assert.match(zip.dica, /não abre no navegador.*Baixar/)
})

test('Baixar pede o link como anexo, com o nome certo; o resto do link fica intacto', () => {
  const link = 'https://x.supabase.co/storage/v1/object/sign/arquivos/geral/guia.pdf?token=abc.def.ghi'
  const u = new URL(urlParaBaixar(link, 'Guia da marca.pdf'))
  assert.equal(u.searchParams.get('download'), 'Guia da marca.pdf')
  assert.equal(u.searchParams.get('token'), 'abc.def.ghi')
  assert.equal(u.pathname, '/storage/v1/object/sign/arquivos/geral/guia.pdf')
  assert.equal(new URL(urlParaBaixar(link, '')).searchParams.get('download'), '', 'sem nome: anexo com o nome do arquivo')
  assert.equal(urlParaBaixar('não é url', 'a.pdf'), 'não é url', 'link ilegível não vira outro')
  // Abrir usa o link como veio (sem `download`): a tela entrega a URL assinada intacta. A mecânica mora num hook só,
  // usado pela aba Arquivos E pelas fotos oficiais da aba Fotos (o "Baixar" das fotos baixa de verdade, com o nome certo).
  assert.match(HOOK, /modo === 'baixar' \? urlParaBaixar\(url, nomeArquivo\(a\.nome, a\.mime, a\.path\)\) : url/)
  assert.match(ler('painel-app/src/components/vistas-marca/Arquivos.jsx'), /useAcessoArquivo\(setAviso\)/)
  assert.match(ler('painel-app/src/components/vistas-marca/fotos/FotosOficiais.jsx'), /useAcessoArquivo\(setAviso\)/)
})

test('a tela diz o que acontece em cada aparelho — e nunca promete "salvo"', () => {
  const UA = {
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    chromeIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1',
    android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  }
  const nota = (ua, o) => notaDeAbertura(plataforma(ua, 0), o)

  assert.match(nota(UA.iphone), /No iPhone, “Abrir” mostra o arquivo em outra aba; para guardá-lo, toque em Compartilhar › Salvar em Arquivos\./)
  assert.match(nota(UA.iphone), /“Baixar” pede ao Safari para baixar o arquivo; ele pode perguntar antes\./)
  assert.match(nota(UA.chromeIos), /pede ao navegador para baixar/, 'no Chrome do iPhone não se fala em Safari')
  assert.match(nota(UA.iphone, { fotos: true }), /mostra a foto em outra aba; para levá-la à galeria, toque em Compartilhar › Salvar imagem\./)
  assert.match(nota(UA.android), /alguns navegadores baixam o PDF em vez de mostrá-lo/)
  assert.doesNotMatch(nota(UA.desktop), /iPhone|Compartilhar|celular/)
  assert.match(nota(UA.desktop), /^“Abrir” mostra o arquivo em outra aba\. “Baixar” pede ao navegador para baixar o arquivo\.$/)

  const todas = [...Object.values(UA).flatMap((ua) => [nota(ua), nota(ua, { fotos: true })]), retornoDaAcao('abrir', 'Guia'), retornoDaAcao('baixar', 'Guia')]
  for (const t of todas) assert.doesNotMatch(t.replace(/Salvar (em Arquivos|imagem)/g, ''), /salv(o|a|os|as|ou|amos)\b|guardad/i, 'promessa de "salvo": ' + t)
  assert.equal(retornoDaAcao('abrir', 'Guia'), '“Guia” aberto em outra aba.')
  assert.equal(retornoDaAcao('baixar', 'Guia'), 'Pedi ao navegador para baixar “Guia”. Confira os downloads dele.')
  assert.equal(erroDaAcao('abrir', 'Guia'), 'Não deu para abrir “Guia” agora. Tente de novo em instantes.')
  assert.equal(erroDaAcao('baixar', 'Guia'), 'Não deu para baixar “Guia” agora. Tente de novo em instantes.')
})

// ── O que o código das telas tem que continuar garantindo ────────────────────

const ARQUIVOS = ler('painel-app/src/components/vistas-marca/Arquivos.jsx')
const ITEM = ler('painel-app/src/components/vistas-marca/arquivos/ItemArquivo.jsx')
const CSS = ler('painel-app/src/styles/arquivos-marca.css')

test('Arquivos sem o modo `fotos` (morto) e a leitura gravada por marca_confirmar_leitura, com a hora do banco', () => {
  assert.match(ARQUIVOS, /export function Arquivos\(\{ alvo, consumirAlvo, irPara, recarregarResumo, resumo, abrirLink \}\)/)
  assert.doesNotMatch(ARQUIVOS, /fotos = false|\bfotos \?|if \(fotos\)|TEXTO\.fotos/, 'o modo `fotos` saiu inteiro')
  const f = ARQUIVOS.slice(ARQUIVOS.indexOf('async function confirmarLeitura'), ARQUIVOS.indexOf('const visiveis'))
  assert.match(f, /const r = await api\('rpc\/marca_confirmar_leitura', \{\s*metodo: 'POST',\s*corpo: \{ p_arquivo: a\.id, p_participacao: a\.participacao_id \|\| participacaoId \},/)
  assert.doesNotMatch(ARQUIVOS, /ignore-duplicates/, 'a gravação direta (que não renovava a leitura) saiu')
  assert.match(f, /\[a\.id\]: \(r && r\.lido_em\) \|\| leituraProvisoria\(a\)/, 'a hora que o banco gravou; provisória só sem ela')
  assert.ok(f.indexOf("await api('rpc/marca_confirmar_leitura'") < f.indexOf('setLidos('), 'só marca como lido DEPOIS de gravar')
  assert.ok(f.indexOf('setLidos(') < f.indexOf('} catch'), 'e dentro do try')
  assert.match(f.slice(f.indexOf('} catch')), /setAviso\(\{ id: a\.id, tom: 'erro'/, 'a falha avisa em vez de confirmar')
  assert.doesNotMatch(f.slice(f.indexOf('} catch')), /setLidos\(/, 'a falha nunca marca como lido')
  assert.match(f, /e\.message === 'modo_visualizacao' \? traduzirErro/, 'no "Ver como participante" o aviso é o de modo visualização')
  assert.doesNotMatch(ARQUIVOS, /estou de acordo/)
})

test('as palavras da leitura continuam as combinadas (ciência, não aceite)', () => {
  for (const t of ['Li e confirmo a leitura', 'Confirme a leitura', 'Leitura confirmada em ']) assert.ok(ARQUIVOS.includes(t), t)
  // As da conferência de foto moram nas fotos oficiais (o modo `fotos` de Arquivos saiu).
  const fo = ler('painel-app/src/components/vistas-marca/fotos/FotosOficiais.jsx')
  for (const t of ['Conferi as fotos', 'Confirme que conferiu', 'Conferência confirmada em ']) assert.ok(fo.includes(t), t)
  // Arquivo substituído: a dica pede confirmar de novo (antes só informava).
  assert.match(ITEM, /confirme a leitura de novo/)
})

test('abrir/baixar: a janela abre no clique, antes do await; a falha fecha a janela e avisa', () => {
  const f = HOOK.slice(HOOK.indexOf('async function acessar'), HOOK.indexOf('return { ocupado'))
  assert.ok(f.length > 200, 'achou a função no hook')
  assert.ok(f.indexOf("window.open('', '_blank')") < f.indexOf('await assinarDownload'), 'pop-up bloqueado no iPhone se abrir depois do await')
  assert.match(f, /janela\.opener = null/)
  assert.match(f, /catch \(e\) \{\s*if \(janela\) janela\.close\(\)/)
  assert.match(f.slice(f.indexOf('} catch')), /erroDaAcao\(modo, a\.nome\)/)
  assert.doesNotMatch(f, /salvo/i)
})

test('a tela só lê as tabelas que já lia; a única escrita é o registro da leitura (uma RPC)', () => {
  const tela = ARQUIVOS + ITEM
  const tabelas = new Set([...tela.matchAll(/api\(\s*'([a-z_]+)[?']/g)].map((m) => m[1]))
  assert.deepEqual([...tabelas].sort(), ['arquivo_leitura', 'arquivos', 'participacoes'])
  assert.deepEqual([...tela.matchAll(/rpc\/([a-z_]+)/g)].map((m) => m[1]), ['marca_confirmar_leitura'])
  assert.deepEqual([...tela.matchAll(/metodo: '([A-Z]+)'/g)].map((m) => m[1]), ['POST'], 'a única escrita é o registro da leitura')
  assert.match(ARQUIVOS, /api\('arquivos\?select=\*&arquivado=eq\.false&order=publicado_em\.desc\.nullslast'\)/, 'a mesma lista que o Início conta (arquivado fora)')
  assert.doesNotMatch(tela, /window\.(confirm|prompt|alert)\(|setInterval/)
})

test('falha de leitura nunca vira lista vazia nem "tudo pendente"', () => {
  assert.match(ARQUIVOS, /if \(rArq\.status === 'fulfilled'\) \{ setArquivos\(rArq\.value \|\| \[\]\)/)
  assert.match(ARQUIVOS, /else if \(!temArquivos\.current\) setErro/, 'releitura que falha mantém a lista; erro só sem dado algum')
  assert.match(ARQUIVOS, /organizarArquivos\(visiveis, leituraConhecida \? lidos : null, recemLidos\)/)
  assert.match(ARQUIVOS, /leituraIncerta && /)
  assert.match(ITEM, /Confirmação não verificada/)
})

test('sem a leitura das confirmações NÃO se oferece "Li e confirmo": o botão só existe com `leituraConhecida`', () => {
  // `pendente` decide o botão (ItemArquivo) e o selo "Confirmação não verificada" aparece no mesmo caso: não podem se contradizer.
  assert.match(ITEM, /const vale = leituraVale\(a, lido\)/, 'leitura de versão anterior não vale')
  assert.match(ITEM, /const pendente = !!a\.exige_leitura && !vale && !!leituraConhecida/)
  assert.match(ITEM, /\{pendente && \(\s*<button/, 'o botão de confirmar depende de `pendente`')
  assert.match(ITEM, /leituraConhecida\s*\? <Selo tom="atencao">\{textos\.pedeLer\}<\/Selo>\s*: <Selo tom="neutro">Confirmação não verificada<\/Selo>/)
  // Reforço em quem grava: com a leitura desconhecida, "participação não aberta" seria afirmar o que não se sabe.
  const f = ARQUIVOS.slice(ARQUIVOS.indexOf('async function confirmarLeitura'), ARQUIVOS.indexOf('const agora'))
  assert.ok(f.indexOf('!leituraConhecida') > 0 && f.indexOf('!leituraConhecida') < f.indexOf('!participacaoId'), 'a checagem da leitura vem antes da de participação')
  assert.match(f, /Não deu para conferir suas confirmações agora/)
})

test('a linha desenhada: sem a leitura das confirmações não há botão de confirmar; com ela, só para quem ainda não confirmou', () => {
  const { ItemArquivo } = carregar('painel-app/src/components/vistas-marca/arquivos/ItemArquivo.jsx')
  const textos = { botaoLer: 'Li e confirmo a leitura', pedeLer: 'Confirme a leitura', lido: 'Leitura confirmada em ', okLer: 'Leitura registrada.' }
  const a = arq('a1', { nome: 'Manual', exige_leitura: true })
  const base = { a, textos, agora: AGORA, aoAcessar() {}, aoConfirmar() {} }
  const incerta = html(ItemArquivo, { ...base, lido: undefined, leituraConhecida: false })
  assert.match(incerta, /Confirmação não verificada/)
  assert.doesNotMatch(incerta, /Li e confirmo a leitura/, 'o botão contradiria o selo "não verificada"')
  assert.match(incerta, /aria-label="Baixar Manual"/, 'abrir e baixar não dependem da leitura')
  const pendente = html(ItemArquivo, { ...base, lido: undefined, leituraConhecida: true })
  assert.match(pendente, /aria-label="Li e confirmo a leitura: Manual"/)
  assert.match(pendente, /Confirme a leitura/)
  assert.doesNotMatch(pendente, /Confirmação não verificada/)
  const lido = html(ItemArquivo, { ...base, lido: dias(1), leituraConhecida: true })
  assert.match(lido, /Leitura confirmada em/)
  assert.doesNotMatch(lido, /Li e confirmo a leitura/)
  // Substituído depois da leitura (publicado há 30 dias, lido há 40): pede de novo, com o botão, e diz por quê.
  const antiga = html(ItemArquivo, { ...base, lido: dias(40), leituraConhecida: true })
  assert.match(antiga, /aria-label="Li e confirmo a leitura: Manual"/)
  assert.match(antiga, /Confirme a leitura/)
  assert.match(antiga, /depois da sua leitura de .*confirme a leitura de novo/)
  assert.doesNotMatch(antiga, /Leitura confirmada em/)
  // O resultado nasce no item, com o papel certo e o alvo de foco (o botão tocado some).
  assert.match(html(ItemArquivo, { ...base, lido: dias(0), leituraConhecida: true, retorno: { id: 'a1', tom: 'ok', texto: 'Leitura registrada.' } }), /<p tabindex="-1" class="ui-nota ui-nota--ok am-item__retorno" role="status">Leitura registrada\.<\/p>/)
  assert.match(html(ItemArquivo, { ...base, lido: undefined, leituraConhecida: true, retorno: { id: 'a1', tom: 'erro', texto: 'Não deu.' } }), /class="ui-nota ui-nota--erro am-item__retorno" role="alert">Não deu\./)
  assert.doesNotMatch(html(ItemArquivo, { ...base, lido: undefined, leituraConhecida: true, retorno: null }), /role="(alert|status)"/)
})

test('o que acabou de ser confirmado FICA no bloco "Para ler" (como confirmado) até a tela ser reaberta; o selo conta só quem falta', () => {
  const lista = [
    arq('a', { exige_leitura: true, publicado_em: dias(10) }),
    arq('b', { exige_leitura: true, publicado_em: dias(2) }),
    arq('c', { exige_leitura: true, publicado_em: dias(20) }),
    arq('d', { exige_leitura: false }),
  ]
  // 'b' acabou de ser confirmado nesta visita: já consta em `lidos` (otimista) e em `mantidos`.
  const lidos = { b: dias(0) }
  const antes = organizarArquivos(lista, {}).paraLer.map((a) => a.id)
  const depois = organizarArquivos(lista, lidos, new Set(['b']))
  assert.deepEqual(antes, ['b', 'a', 'c'])
  assert.deepEqual(depois.paraLer.map((a) => a.id), ['b', 'a', 'c'], 'o item não pula de lugar')
  assert.deepEqual(depois.paraLer.filter((a) => precisaLeitura(a, lidos)).map((a) => a.id), ['a', 'c'], 'quem ainda falta')
  // Sem `mantidos` (tela reaberta), o lido volta para a categoria, como sempre foi.
  assert.deepEqual(organizarArquivos(lista, lidos).paraLer.map((a) => a.id), ['a', 'c'])
  assert.deepEqual(organizarArquivos(lista, lidos).grupos.flatMap((g) => g.itens.map((i) => i.id)).sort(), ['b', 'd'])
  // Arquivo que não exige leitura nunca sobe, mesmo estando em `mantidos`; sem a leitura conhecida, nada é chutado.
  assert.deepEqual(organizarArquivos(lista, lidos, new Set(['d'])).paraLer.map((a) => a.id), ['a', 'c'])
  assert.deepEqual(organizarArquivos(lista, null, new Set(['b'])).paraLer, [])
  // A tela guarda o id SÓ depois de gravar, e o selo diz "Tudo confirmado" quando ninguém falta.
  const f = ARQUIVOS.slice(ARQUIVOS.indexOf('async function confirmarLeitura'), ARQUIVOS.indexOf('const agora'))
  assert.ok(f.indexOf("await api('rpc/marca_confirmar_leitura'") > 0)
  assert.ok(f.indexOf("await api('rpc/marca_confirmar_leitura'") < f.indexOf('setRecemLidos('))
  assert.doesNotMatch(f.slice(f.indexOf('} catch')), /setRecemLidos/)
  assert.match(ARQUIVOS, /faltam > 0 \? <Selo tom="atencao">[^]*<Selo tom="ok">Tudo confirmado<\/Selo>/)
})

test('o resultado da ação nasce NO item e recebe o foco (o botão tocado some, o foco não cai no corpo da página)', () => {
  assert.match(ITEM, /<AvisoComFoco aviso=\{retorno\} className="am-item__retorno" \/>/)
  const comp = ler('painel-app/src/components/vistas-marca/AvisoComFoco.jsx')
  assert.match(comp, /tabIndex=\{-1\}/)
  assert.match(comp, /ref\.current\.focus\(\)/)
  assert.match(comp, /role=\{erro \? 'alert' : 'status'\}/)
  assert.match(comp, /new WeakSet\(\)/, 'o foco entra uma vez por aviso: a releitura que refaz a tela não o rouba de novo')
})

test('ícones, botões e estilos seguem as regras do painel', () => {
  const nomes = [...(ARQUIVOS + ITEM).matchAll(/(?:nome|icone)="([a-z0-9/-]+)"/g)].map((m) => m[1])
  const mapa = [...ARQUIVOS.slice(ARQUIVOS.indexOf('const ICONE_CATEGORIA')).split('\n')[0].matchAll(/:\s*'([a-z0-9/-]+)'/g)].map((m) => m[1])
  assert.ok(nomes.length >= 4 && mapa.length === 5)
  for (const n of [...nomes, ...mapa]) assert.ok(existe(n), 'ícone inexistente: ' + n)
  // Alvo de toque ≥ 44px: todo botão da linha é og-btn--mini (min-height 44 no painel.css).
  const botoes = [...ITEM.matchAll(/<button\b[^>]*className="([^"]*)"/g)].map((m) => m[1])
  assert.equal(botoes.length, 3)
  for (const c of botoes) assert.match(c, /og-btn--mini/)
  // Selo sempre com ícone + texto (a peça <Selo>); nada de span de selo à mão.
  assert.doesNotMatch(ARQUIVOS + ITEM, /className="og-selo"/)
  // CSS: só prefixo am-, só tokens (sem cor/raio/fonte literal), sem caixa-alta, sem fundo/borda/sombra de card.
  for (const m of CSS.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{[^{}]*\}/g)) assert.match(m[1], /\.am-/, 'seletor fora do prefixo am-: ' + m[1].trim())
  assert.doesNotMatch(CSS.replace(/\/\*[\s\S]*?\*\//g, ''), /#[0-9a-fA-F]{3,8}\b|rgba?\(|text-transform|box-shadow:|font-family:/)
  for (const m of CSS.matchAll(/border-radius:([^;}]+)/g)) assert.match(m[1].trim(), /^var\(--r-\d\)$/)
  for (const m of CSS.matchAll(/font:([^;}]+)/g)) assert.match(m[1], /var\(--f-(ui|texto|titulo)\)/, 'fonte literal: ' + m[1])
})

test('toda leitura da tela cabe no "Ver como participante": consulta válida, tabela da lista fechada do banco', () => {
  const sql = ler('supabase/migrations/20261104_ver_como_participante.sql')
  const tabelas = [...sql.match(/tabelas constant text\[\] := array\[([^\]]*)\]/)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
  assert.ok(tabelas.length > 10)
  const caminhos = [...(ARQUIVOS + ITEM).matchAll(/api\(\s*'([^']+)'/g)].map((m) => m[1]).filter((c) => !c.startsWith('rpc/'))
  assert.ok(caminhos.length >= 3, 'achou as leituras da tela')
  for (const c of caminhos) {
    const q = consultaDoCaminho(c)
    assert.ok(tabelas.includes(q.tabela), 'tabela fora da lista do "Ver como": ' + q.tabela)
  }
})

// ── Solicitações sobre arquivos (bloco `arquivo`) ────────────────────────────

test('as solicitações de bloco "arquivo" aparecem no topo da aba — e a aba mostra exatamente o que o selo conta', () => {
  const base = { participacao: { id: 'pa', combo_status: 'rascunho', status_cadastro: 'em_preenchimento' }, arquivosParaLer: 2 }
  const pedido = (id, bloco) => ({ id, titulo: 'Pedido ' + id, bloco, prioridade: 'normal', estado: 'pendente', prazo_em: null })
  const r = resumoMarca({ ...base, pedidos: [pedido('p1', 'arquivo'), pedido('p2', 'fotos'), pedido('p3', 'combo'), { ...pedido('p4', 'arquivo'), estado: 'respondido' }] })
  const itens = pendenciasDeArquivos(r)
  assert.deepEqual(itens.map((p) => [p.tipo, p.link]), [['pedido', 'pedidos/p1']], 'só a de arquivo, pendente; nem a de fotos nem a de combo')
  // O que pede leitura (tipo `arquivo`) já está em "Para ler e confirmar": não se repete aqui, mas o selo conta os dois.
  assert.ok(r.pendencias.some((p) => p.tipo === 'arquivo' && p.vista === 'arquivos'))
  assert.equal(itens.length + base.arquivosParaLer, r.contagem.arquivos)
  assert.deepEqual(pendenciasDeArquivos(null), [])
  assert.deepEqual(pendenciasDeArquivos({}), [])
  // A tela usa a MESMA peça da aba Fotos, com título e classe próprios (o CSS das fotos não é carregado aqui).
  assert.match(ARQUIVOS, /<PendenciasFotos itens=\{pendenciasDeArquivos\(resumo\)\} abrirLink=\{abrirLink\} titulo="Solicitações sobre arquivos" classe="am-pendencias" \/>/)
  assert.ok(ARQUIVOS.indexOf('<PendenciasFotos') < ARQUIVOS.indexOf('{lista}'), 'acima da lista')
  assert.match(CSS, /\.am-pendencias\.ui-bloco-interno\{/)
  const { PendenciasFotos } = carregar('painel-app/src/components/vistas-marca/fotos/PendenciasFotos.jsx')
  const h = html(PendenciasFotos, { itens, abrirLink() {}, titulo: 'Solicitações sobre arquivos', classe: 'am-pendencias' })
  assert.match(h, /<section class="am-pendencias ui-bloco-interno" aria-label="Solicitações sobre arquivos"><b>Solicitações sobre arquivos<\/b>/)
  assert.match(h, /data-tipo="pedido"/)
  assert.match(h, />Responder<\/button>/)
  assert.match(html(PendenciasFotos, { itens, abrirLink() {} }), /class="fm-pendencias ui-bloco-interno" aria-label="O que falta nas fotos"/, 'a aba Fotos segue igual')
})

test('leituras da marca: o mesmo arquivo em duas participações vale pela leitura mais recente, em qualquer ordem', () => {
  const antiga = { arquivo_id: 'x', lido_em: '2026-10-01T10:00:00Z' }
  const nova = { arquivo_id: 'x', lido_em: '2026-10-20T10:00:00Z' }
  assert.deepEqual(mapaDeLeituras([antiga, nova]), { x: nova.lido_em })
  assert.deepEqual(mapaDeLeituras([nova, antiga]), { x: nova.lido_em }, 'o último da lista não ganha por ser o último')
  assert.deepEqual(mapaDeLeituras([nova, { arquivo_id: 'y', lido_em: '2026-10-02T00:00:00Z' }, null, { lido_em: 'x' }]), { x: nova.lido_em, y: '2026-10-02T00:00:00Z' })
  assert.deepEqual(mapaDeLeituras(null), {})
  // E o efeito que importa: com a leitura antiga em último, o arquivo não volta a pedir confirmação.
  const a = arq('x', { exige_leitura: true, publicado_em: '2026-10-10T00:00:00Z' })
  assert.equal(precisaLeitura(a, mapaDeLeituras([nova, antiga])), false)
  assert.equal(precisaLeitura(a, Object.fromEntries([nova, antiga].map((l) => [l.arquivo_id, l.lido_em]))), true, 'a regra antiga (o último ganha) errava')
})

test('ficha da equipe: "leu em" só vale para a versão atual (a mesma regra da marca)', () => {
  const fmt = (v) => 'D(' + v.slice(0, 10) + ')'
  const a = { exige_leitura: true, publicado_em: '2026-10-10T00:00:00Z' }
  assert.equal(leituraNaFicha({ ...a, lido_em: '2026-10-12T00:00:00Z' }, fmt), 'leu em D(2026-10-12)')
  assert.equal(leituraNaFicha({ ...a, lido_em: '2026-10-05T00:00:00Z' }, fmt), 'leu a versão anterior em D(2026-10-05); falta confirmar a atual')
  assert.equal(leituraNaFicha({ ...a, lido_em: null }, fmt), 'ainda não confirmou a leitura')
  assert.equal(leituraNaFicha({ ...a, lido_em: null }, fmt, 'leitura não confirmada'), 'leitura não confirmada')
  assert.equal(leituraNaFicha({ exige_leitura: false, lido_em: null }, fmt), 'sem confirmação de leitura')
  assert.equal(leituraNaFicha({ ...a, publicado_em: undefined, lido_em: '2026-10-05T00:00:00Z' }, fmt), 'leu em D(2026-10-05)', 'sem publicado_em (ficha antiga) não inventa defasagem')
})

test('a dica "confirme a leitura de novo" só aparece quando o arquivo exige leitura (senão não há botão)', () => {
  const { ItemArquivo } = carregar('painel-app/src/components/vistas-marca/arquivos/ItemArquivo.jsx')
  const textos = { botaoLer: 'Li e confirmo a leitura', pedeLer: 'Confirme a leitura', lido: 'Leitura confirmada em ', okLer: 'Leitura registrada.' }
  const base = { textos, agora: AGORA, aoAcessar() {}, aoConfirmar() {}, leituraConhecida: true }
  const sem = html(ItemArquivo, { ...base, a: arq('a2', { nome: 'Guia', exige_leitura: false }), lido: dias(40) })
  assert.doesNotMatch(sem, /confirme a leitura de novo/)
  assert.doesNotMatch(sem, /Li e confirmo a leitura/)
  const com = html(ItemArquivo, { ...base, a: arq('a3', { nome: 'Guia', exige_leitura: true }), lido: dias(40) })
  assert.match(com, /confirme a leitura de novo/)
  assert.match(com, /Li e confirmo a leitura/)
})

test('as duas fichas da equipe dizem "leu" pela mesma regra da marca (e o banco entrega publicado_em)', () => {
  for (const f of ['FichaCadastro', 'FichaVisao']) {
    assert.match(ler('painel-app/src/components/vistas/' + f + '.jsx'), /leituraNaFicha\(a, dataCurta/, f + ' não pode voltar a "leu em" cru')
  }
  assert.match(ler('supabase/migrations/20261108_ficha_arquivo_publicado_em.sql'), /'publicado_em', a\.publicado_em,\s*\n\s*'lido_em', l\.lido_em/)
})
