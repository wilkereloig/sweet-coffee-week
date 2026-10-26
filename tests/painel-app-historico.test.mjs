// Histórico do painel (24/10/2026): Voltar do cabeçalho, telas recentes e o Voltar do SISTEMA (Android)
// fechando folhas. Janela falsa com histórico de verdade: go() é assíncrono e dispara popstate/hashchange,
// como no aparelho — é isso que pega a corrida "voltar atrasado desfaz o push".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { criarHistorico } from '../painel-app/src/lib/historico.js'

function janela(hashInicial = '#visao') {
  const pilha = [{ state: null, url: '/painel/' + hashInicial }]
  let i = 0
  const ouv = { popstate: new Set(), hashchange: new Set() }
  const armazem = new Map()
  const resolver = (url) => (url == null ? pilha[i].url : url.startsWith('#') ? '/painel/' + url : url.replace(/^https?:\/\/[^/]+/, ''))
  const hashDe = (u) => { const k = u.indexOf('#'); return k < 0 ? '' : u.slice(k) }
  const disparar = (t) => ouv[t].forEach((f) => f({ type: t }))
  const w = {
    location: { get hash() { return hashDe(pilha[i].url) }, get href() { return 'https://painel.test' + pilha[i].url } },
    history: {
      get state() { return pilha[i].state },
      pushState(s, _t, url) { pilha.splice(i + 1); pilha.push({ state: structuredClone(s), url: resolver(url) }); i++ },
      replaceState(s, _t, url) { pilha[i] = { state: structuredClone(s), url: resolver(url) } },
      go(n) {
        setTimeout(() => {
          const alvo = Math.max(0, Math.min(pilha.length - 1, i + n))
          if (alvo === i) return
          const antes = w.location.hash
          i = alvo
          disparar('popstate')
          if (w.location.hash !== antes) disparar('hashchange')
        }, 1)
      },
      back() { this.go(-1) },
    },
    sessionStorage: { getItem: (k) => (armazem.has(k) ? armazem.get(k) : null), setItem: (k, v) => armazem.set(k, String(v)), removeItem: (k) => armazem.delete(k) },
    addEventListener: (t, f) => ouv[t] && ouv[t].add(f),
    setTimeout: (f, t) => setTimeout(f, t),
    clearTimeout: (t) => clearTimeout(t),
    // apoio do teste
    _pilha: () => pilha.map((p) => p.url.replace('/painel/', '')),
    _i: () => i,
    _voltarSistema: () => w.history.go(-1), // botão/gesto Voltar do Android
    // Link com # / endereço digitado: entrada NOVA sem estado, e o navegador avisa (popstate + hashchange), como o Chrome.
    _fragmento: (h) => { const antes = w.location.hash; pilha.splice(i + 1); pilha.push({ state: null, url: '/painel/' + h }); i++; disparar('popstate'); if (w.location.hash !== antes) disparar('hashchange') },
  }
  return w
}
const esperar = (ms = 25) => new Promise((r) => setTimeout(r, ms))
const chaveDe = (h) => h.replace(/[?&]sub=[^&]*/, '')

test('telas: empilha, o Voltar mostra a anterior e volta uma de cada vez', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  assert.equal(H.foto().anterior, null, 'primeira tela: nada para voltar')
  assert.ok(w.history.state.scwId, 'a entrada atual ganhou id')
  H.irPara('#participantes/lista')
  H.irPara('#participantes/lista?item=p1')
  assert.deepEqual(w._pilha(), ['#visao', '#participantes/lista', '#participantes/lista?item=p1'])
  assert.equal(H.foto().anterior.h, '#participantes/lista')
  H.voltar()
  await esperar()
  assert.equal(w.location.hash, '#participantes/lista')
  assert.equal(H.foto().anterior.h, '#visao')
  H.voltar()
  await esperar()
  assert.equal(w.location.hash, '#visao')
  assert.equal(H.foto().anterior, null)
  assert.equal(H.podeVoltar(), false)
})

test('filtro/busca (substituir) não vira passo do Voltar; ir para a tela de onde veio volta em vez de empilhar', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#participantes/lista')
  H.irPara('#participantes/lista?busca=sa', { substituir: true })
  H.irPara('#participantes/lista?busca=sab', { substituir: true })
  assert.deepEqual(w._pilha(), ['#visao', '#participantes/lista?busca=sab'])
  H.irPara('#participantes/lista?busca=sab&item=p1')
  H.irPara('#participantes/lista?busca=sab') // fechar a ficha = ir para a tela de onde veio
  await esperar()
  assert.equal(w._pilha().length, 3, 'não empilhou a lista de novo')
  assert.equal(w._i(), 1, 'voltou no histórico')
})

test('Voltar do sistema com folha aberta fecha a FOLHA; a tela de baixo fica', async () => {
  const w = janela('#operacao/fotos')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#participantes/lista')
  let fechou = 0
  const t = H.abrirCamada(() => { fechou++ })
  assert.deepEqual(w._pilha(), ['#operacao/fotos', '#participantes/lista', '#participantes/lista'], 'a folha tem entrada própria, mesmo endereço')
  let mudouEndereco = 0
  H.aoMudarEndereco(() => { mudouEndereco++ })
  w._voltarSistema()
  await esperar()
  assert.equal(fechou, 1, 'fechou a folha')
  assert.equal(w.location.hash, '#participantes/lista', 'continua na mesma tela')
  assert.equal(mudouEndereco, 0, 'as cascas não trocaram de tela')
  assert.equal(H.foto().anterior.h, '#operacao/fotos', 'o Voltar do cabeçalho segue apontando a tela anterior')
  H.fecharCamada(t) // a folha, ao desmontar, avisa — a entrada já saiu, nada acontece
  await esperar()
  assert.equal(w._i(), 1)
})

test('fechar a folha pela tela tira a entrada dela (sem "voltar morto") e não chama o fechar', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#contatos/pessoas')
  let fechou = 0
  const t = H.abrirCamada(() => { fechou++ })
  H.fecharCamada(t)
  await esperar()
  assert.equal(fechou, 0)
  assert.equal(w._i(), 1, 'voltou para a entrada da tela')
  H.voltar()
  await esperar()
  assert.equal(w.location.hash, '#visao', 'um toque no Voltar já troca de tela')
})

test('navegar com folha aberta (aviso do sino que abre uma ficha): sem entrada fantasma no meio', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  let fechou = 0
  const t = H.abrirCamada(() => { fechou++ })
  H.irPara('#participantes/lista?item=p9') // espera a entrada da folha sair e só então empilha
  H.fecharCamada(t) // a folha desmonta depois
  await esperar()
  assert.deepEqual(w._pilha(), ['#visao', '#participantes/lista?item=p9'])
  assert.equal(fechou, 0)
  H.voltar()
  await esperar()
  assert.equal(w.location.hash, '#visao')
})

test('ficha que mora no endereço (postagem): fechar pelo X volta direto à lista, sem passar pela ficha', async () => {
  const w = janela('#social/planejamento')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#social/planejamento?item=x1') // abrir a postagem
  let fechou = 0
  const t = H.abrirCamada(() => { fechou++ }) // a Folha da postagem
  H.irPara('#social/planejamento') // o X: a vista navega para a lista
  await esperar(40)
  H.fecharCamada(t)
  await esperar()
  assert.equal(w.location.hash, '#social/planejamento')
  assert.equal(w._i(), 0, 'voltou à entrada da lista (nada empilhado)')
  assert.equal(fechou, 0, 'a pergunta de fechar não roda duas vezes')
})

test('ficha que mora no endereço + Voltar do sistema: fecha a folha e a vista volta para a lista', async () => {
  const w = janela('#social/planejamento')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#social/planejamento?item=x1')
  H.abrirCamada(() => H.irPara('#social/planejamento')) // o onFechar da vista navega
  w._voltarSistema()
  await esperar(40)
  assert.equal(w.location.hash, '#social/planejamento')
  assert.equal(w._i(), 0)
})

test('folha + confirmação: o Voltar do sistema fecha só a de cima', async () => {
  const w = janela('#admin/equipe')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  const fechadas = []
  H.abrirCamada(() => fechadas.push('folha'))
  H.abrirCamada(() => fechadas.push('confirmacao'))
  w._voltarSistema()
  await esperar()
  assert.deepEqual(fechadas, ['confirmacao'])
  w._voltarSistema()
  await esperar()
  assert.deepEqual(fechadas, ['confirmacao', 'folha'])
})

test('link com # (entrada nova) com folha aberta: a folha não é "fechada pelo Voltar" e nada navega de novo', async () => {
  const w = janela('#social/planejamento')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#social/planejamento?item=x1')
  let fechou = 0
  const t = H.abrirCamada(() => { fechou++; H.irPara('#social/planejamento') })
  let mudou = 0
  H.aoMudarEndereco(() => { mudou++ })
  w._fragmento('#social/planejamento?data=2026-11-03&modo=dia')
  await esperar()
  assert.equal(fechou, 0, 'o fechar da folha não roda (não foi o Voltar)')
  assert.equal(w.location.hash, '#social/planejamento?data=2026-11-03&modo=dia', 'o endereço novo fica')
  assert.equal(mudou, 1, 'as cascas trocam de tela uma vez')
  assert.ok(w.history.state.scwId, 'a entrada nova foi adotada')
  H.fecharCamada(t) // a folha desmonta com a rota nova: não mexe no histórico
  await esperar()
  assert.equal(w.location.hash, '#social/planejamento?data=2026-11-03&modo=dia')
  assert.equal(H.foto().anterior.h, '#social/planejamento?item=x1', 'o Voltar do cabeçalho aponta a postagem')
})

test('ficha que mora no endereço aberta de FORA da lista (aviso): o Voltar do sistema não entra em laço', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#social/planejamento?item=x1') // aviso do sino abre a postagem
  const abrir = () => H.abrirCamada(() => H.irPara('#social/planejamento', { fechar: true })) // o X/Voltar da ficha
  abrir()
  w._voltarSistema() // 1º: fecha a ficha, fica a lista do módulo (a entrada da ficha VIRA a lista)
  await esperar(40)
  assert.equal(w.location.hash, '#social/planejamento')
  assert.deepEqual(w._pilha().slice(0, w._i() + 1), ['#visao', '#social/planejamento'], 'nada empilhado por cima (o que sobra é só "para a frente")')
  w._voltarSistema() // 2º: Visão geral
  await esperar(40)
  assert.equal(w.location.hash, '#visao', 'chegou de onde veio, sem reabrir a ficha')
})

test('recarregar com folha aberta: a entrada órfã da folha é pulada (sem Voltar morto)', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#admin/equipe')
  H.abrirCamada(() => {}) // folha aberta…
  assert.equal(w._pilha().length, 3)
  const H2 = criarHistorico(w) // …e a página recarrega ("Atualizar agora", F5)
  H2.iniciar('org', { chaveDe })
  await esperar()
  assert.equal(w._i(), 1, 'desceu para a página gêmea da folha')
  assert.equal(w.history.state.scwCamada, undefined)
  H2.voltar()
  await esperar()
  assert.equal(w.location.hash, '#visao', 'o 1º Voltar já troca de tela')
})

test('Avançar (computador) depois de fechar uma folha: a entrada fantasma é pulada', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#contatos/pessoas')
  const t = H.abrirCamada(() => {})
  H.fecharCamada(t)
  await esperar()
  w.history.go(1) // botão Avançar do navegador
  await esperar(40)
  assert.equal(w._i(), 1, 'voltou para a página')
  H.voltar()
  await esperar()
  assert.equal(w.location.hash, '#visao', 'sem Voltar morto depois')
})

test('folha aberta antes de o histórico começar (1ª carga já com a ficha no endereço): espera e entra certo', async () => {
  const w = janela('#social/planejamento?item=x1')
  const H = criarHistorico(w)
  let fechou = 0
  H.abrirCamada(() => { fechou++; H.irPara('#social/planejamento', { fechar: true }) }) // o efeito da Folha roda antes do da casca
  assert.equal(w._pilha().length, 1, 'não empilhou antes do início')
  H.iniciar('org', { chaveDe })
  await esperar()
  assert.deepEqual(w._pilha(), ['#social/planejamento?item=x1', '#social/planejamento?item=x1'])
  w._voltarSistema()
  await esperar(40)
  assert.equal(fechou, 1, 'o 1º Voltar fecha a ficha')
  assert.equal(w.location.hash, '#social/planejamento')
})

test('iniciar de novo (permissões chegam, StrictMode) com folha aberta não mexe no histórico', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  let fechou = 0
  H.abrirCamada(() => { fechou++ })
  H.iniciar('org', { chaveDe })
  await esperar()
  assert.equal(w._pilha().length, 2, 'a entrada da folha continua')
  assert.ok(w.history.state.scwCamada, 'a folha segue com a entrada dela')
  w._voltarSistema()
  await esperar()
  assert.equal(fechou, 1)
})

test('duas operações seguidas com volta em curso: a fila espera o popstate (o push não é desfeito)', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  const t = H.abrirCamada(() => {})
  H.fecharCamada(t) // volta interna em curso
  H.irPara('#operacao/pedidos') // tem de esperar
  await esperar()
  assert.deepEqual(w._pilha(), ['#visao', '#operacao/pedidos'])
  assert.equal(w._i(), 1)
})

test('telas recentes: mais nova primeiro, sem repetir, sem a atual; seção da ficha conta como a mesma tela', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#operacao/fotos')
  H.irPara('#participantes/lista?item=p1')
  H.irPara('#participantes/lista?item=p1&sub=gestao', { substituir: true })
  H.irPara('#operacao/fotos') // é de onde a ficha veio: volta (assíncrono)
  await esperar()
  const r = H.foto().recentes.map((x) => x.h)
  assert.deepEqual(r, ['#participantes/lista?item=p1&sub=gestao', '#visao'])
})

test('recarregar a aba: o histórico desta sessão volta (mesma posição, mesma tela anterior)', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#participantes/lista')
  H.irPara('#arquivos/gerais')
  const H2 = criarHistorico(w) // recarga: módulo novo, mesma aba
  H2.iniciar('org', { chaveDe })
  assert.equal(H2.foto().anterior.h, '#participantes/lista')
  assert.equal(H2.foto().recentes.length, 2)
})

test('cada painel tem o seu histórico e Sair limpa o desta sessão', async () => {
  const w = janela('#inicio')
  const H = criarHistorico(w)
  H.iniciar('marca', { chaveDe })
  H.irPara('#combo')
  assert.ok(w.sessionStorage.getItem('scw_historico_marca'))
  H.limpar('marca')
  assert.equal(w.sessionStorage.getItem('scw_historico_marca'), null)
  assert.equal(H.foto().recentes.length, 0)
})

test('Voltar para entrada do painel que o modelo não conhece: recomeça nela (a tela de onde saiu não vira "anterior")', async () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.irPara('#a')
  H.irPara('#b')
  H.limpar('org') // o modelo perde as entradas, o navegador não
  H.iniciar('org', { chaveDe })
  w._voltarSistema()
  await esperar()
  assert.equal(w.location.hash, '#a')
  assert.equal(H.foto().anterior, null, '#b fica à FRENTE no navegador; não pode ser o Voltar')
})

test('nomes das telas ficam na sessão (a ficha diz "Sabor de Pão")', () => {
  const w = janela('#visao')
  const H = criarHistorico(w)
  H.iniciar('org', { chaveDe })
  H.nomear('i:participantes|p1', 'Sabor de Pão')
  assert.equal(H.nome('i:participantes|p1'), 'Sabor de Pão')
  const H2 = criarHistorico(w)
  H2.iniciar('org', { chaveDe })
  assert.equal(H2.nome('i:participantes|p1'), 'Sabor de Pão')
})

test('ninguém mexe no histórico fora de lib/historico.js', () => {
  const raiz = new URL('../painel-app/src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
  const arquivos = []
  const andar = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) andar(p); else if (/\.(jsx?|mjs)$/.test(n)) arquivos.push(p) } }
  andar(raiz)
  const fora = arquivos.filter((p) => !/lib[\\/]historico\.js$/.test(p) && /history\.(pushState|back\(|go\()/.test(readFileSync(p, 'utf8')))
  assert.deepEqual(fora, [], 'push/back/go do histórico só em lib/historico.js')
})
