/*
 * Entrada do bundle de tests/painel-app-sync-vistas-navegador.mjs (19/10/2026): monta as vistas REAIS do
 * painel (Produção, Arquivos, Materiais, Publicação, Logo…) numa página vazia, para o teste dirigir por
 * Playwright contra um servidor falso. Não faz parte do app.
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Producao } from '../../painel-app/src/components/vistas/Producao.jsx'
import { ArquivosOrg } from '../../painel-app/src/components/vistas/ArquivosOrg.jsx'
import { MateriaisEdicao } from '../../painel-app/src/components/vistas/MateriaisEdicao.jsx'
import { ChavesEdicao, Avaliacoes } from '../../painel-app/src/components/vistas/PublicacaoEdicao.jsx'
import { ListaPublicacao, AbaPublicacao } from '../../painel-app/src/components/vistas/Publicacao.jsx'
import { LogoEditor } from '../../painel-app/src/components/LogoEditor.jsx'
import { Confirmacoes } from '../../painel-app/src/components/Confirmar.jsx'
import { rpc } from '../../painel-app/src/lib/rpc.js'
import { barramento } from '../../painel-app/src/lib/sync/barramento.js'
import { sincronizacao } from '../../painel-app/src/lib/sync/index.js'
import { pendencias, mudancasExternas } from '../../painel-app/src/lib/pendencias.js'

const h = React.createElement
window.__anunciar = (d) => barramento.anunciar(d, { origem: 'remota' })
window.__estadoSync = () => sincronizacao.estado()
window.__pendencias = () => pendencias().map((p) => p.rotulo)
window.__externas = () => mudancasExternas().map((p) => p.rotulo)
window.__edicaoMudou = 0

let raiz = null
function montar(elemento) {
  if (!raiz) raiz = createRoot(document.getElementById('root'))
  raiz.render(h(React.Fragment, null, elemento, h(Confirmacoes)))
}
const pode = () => true
const rota = { filtros: {} }

// Vigia: acusa se alguma vez apareceu o esqueleto "Carregando…" DEPOIS de liberado o vigia.
window.__vigia = { ligado: false, viu: [] }
new MutationObserver(() => {
  if (!window.__vigia.ligado) return
  document.querySelectorAll('.ui-carregando').forEach((el) => window.__vigia.viu.push(el.textContent))
}).observe(document.documentElement, { childList: true, subtree: true })

window.__montarProducao = (secao) => montar(h(Producao, { pode, rota, navegar: () => {}, secao, onEdicaoMudou: () => { window.__edicaoMudou++ } }))
window.__montarArquivos = (aba) => montar(h(ArquivosOrg, { pode, aba }))
window.__montarMateriais = () => montar(h(MateriaisEdicao, { pode }))
window.__montarChaves = (codigo) => montar(h(ChavesEdicao, { edicao: { codigo }, pode }))
window.__montarAvaliacoes = (codigo) => montar(h(Avaliacoes, { edicao: { codigo }, pode }))
window.__montarLista = (codigo) => montar(h(ListaPublicacao, { edicao: { codigo }, rota, navegar: () => {} }))
window.__montarAba = (id, nome) => montar(h(AbaPublicacao, { participante: { participacao_id: id, nome_marca: nome, edicao_codigo: '2026.2' }, pode, onMudou: () => { window.__mudou = (window.__mudou || 0) + 1 } }))
window.__montarLogo = (id, nome) => {
  const adaptador = { carregar: () => rpc('get_logo_marca', { p_secret: '', p_participante: id }), remover: () => rpc('remover_logo', { p_secret: '', p_participante: id }) }
  montar(h(LogoEditor, { participanteId: id, nomeMarca: nome, adaptador, podeEditar: true, modo: 'org', onMudou: () => { window.__logoMudou = (window.__logoMudou || 0) + 1 } }))
}
