/*
 * Estado da central de dúvidas — assunto, busca, respostas abertas e quantas
 * perguntas estão à mostra. É um estado só para a página inteira: a busca do
 * herói e a da central escrevem no MESMO `busca`, então quem digita lá em cima
 * já encontra a lista filtrada quando chega aqui embaixo.
 *
 * Regras que vêm de antes e não mudam:
 *  · a busca ignora acento e caixa e exige TODOS os termos (AND), casando
 *    pergunta + resposta + palavras-chave + rótulo do assunto + id;
 *  · digitar troca o filtro para "Todas" sozinho; apagar volta à entrada.
 * O que é novo (12/10/2026):
 *  · a entrada é "Comece por aqui" (seleção editorial, conteudo/contato.js);
 *  · "Todas" e o resultado da busca entram de 10 em 10 ("Mostrar mais") —
 *    93 acordeões de uma vez eram uma parede, não uma consulta;
 *  · só a PRIMEIRA resposta abre sozinha (eram duas).
 */
import React from 'react'
import FAQ_DADOS from '../../data/faqCentral'
import { normalizeText } from '../../lib/contactRequest'
import { CENTRAL, COMECE, LISTA } from '../../data/conteudo/contato'

const { categorias: CATEGORIAS, perguntas: PERGUNTAS } = FAQ_DADOS

export const TOTAL = PERGUNTAS.length
export const CAT_PADRAO = COMECE.id

const PERGUNTAS_COMECE = COMECE.perguntas
  .map((id) => PERGUNTAS.find((q) => q.id === id))
  .filter(Boolean)

/* Índice na ordem de consulta: a entrada, os dez assuntos e "Todas" por
   último — a lista inteira é o recurso, não o começo. */
export const ASSUNTOS = [
  { id: COMECE.id, rotulo: COMECE.rotulo, n: PERGUNTAS_COMECE.length },
  ...CATEGORIAS.filter(([id]) => id !== 'todas').map(([id, rotulo]) => ({
    id,
    rotulo,
    n: PERGUNTAS.filter((q) => q.cat === id).length,
  })),
  { id: 'todas', rotulo: 'Todas', n: TOTAL },
]

export const rotuloCat = (id) => (CATEGORIAS.find((c) => c[0] === id) || ['', ''])[1]

export function filtrarPerguntas(cat, busca) {
  if (cat === COMECE.id) return PERGUNTAS_COMECE
  const termos = normalizeText(busca).split(/\s+/).filter(Boolean)
  return PERGUNTAS.filter((q) => {
    if (cat !== 'todas' && q.cat !== cat) return false
    if (!termos.length) return true
    const alvo = normalizeText(
      [q.p, (q.r || []).join(' '), (q.k || []).join(' '), rotuloCat(q.cat), q.id].join(' '),
    )
    return termos.every((t) => alvo.includes(t))
  })
}

export function useCentralDuvidas() {
  const [cat, setCat] = React.useState(CAT_PADRAO)
  const [busca, setBusca] = React.useState('')
  // null = estado inicial da lista: a primeira resposta abre sozinha.
  const [abertos, setAbertos] = React.useState(null)
  const [limite, setLimite] = React.useState(LISTA.inicial)

  const buscando = busca.trim() !== ''
  const lista = filtrarPerguntas(cat, busca)
  const comLimite = buscando || cat === 'todas'
  const visiveis = comLimite ? lista.slice(0, limite) : lista
  const restantes = lista.length - visiveis.length
  const autoAbertos = lista.slice(0, 1).map((q) => q.id)
  const idsAbertos = abertos === null ? autoAbertos : abertos

  const recomecar = () => { setAbertos(null); setLimite(LISTA.inicial) }

  const alternar = (id) =>
    setAbertos((atual) => {
      const base = atual === null ? autoAbertos : atual
      return base.includes(id) ? base.filter((x) => x !== id) : base.concat([id])
    })

  const mudarBusca = (valor) => {
    setBusca(valor)
    setCat(valor.trim() ? 'todas' : CAT_PADRAO)
    recomecar()
  }
  const limparBusca = () => mudarBusca('')
  const escolherCat = (id) => { setCat(id); setBusca(''); recomecar() }

  /* Mostrar mais leva o foco para a primeira pergunta nova: quem navega por
     teclado continua de onde a lista cresceu, em vez de voltar ao topo. */
  const mostrarMais = () => {
    const primeiraNova = lista[visiveis.length]
    setLimite((n) => n + LISTA.passo)
    if (primeiraNova && typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        const el = document.getElementById(`faq-b-${primeiraNova.id}`)
        if (el) el.focus()
      })
    }
  }

  const titulo = buscando
    ? CENTRAL.tituloBusca
    : cat === COMECE.id ? COMECE.rotulo : cat === 'todas' ? CENTRAL.tituloTodas : rotuloCat(cat)

  return {
    cat, busca, buscando, lista, visiveis, restantes, idsAbertos, titulo,
    // Lista de vários assuntos: cada pergunta mostra de qual é.
    misturado: buscando || cat === 'todas' || cat === COMECE.id,
    proximoPasso: Math.min(LISTA.passo, restantes),
    alternar, mudarBusca, limparBusca, escolherCat, mostrarMais,
  }
}
