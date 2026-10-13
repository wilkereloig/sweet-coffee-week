import React from 'react'
import { CENAS, TONS, PREMIACAO } from '../../data/conteudo/edicoes'
import { EDICOES_DADOS } from '../../data/handoff/edicoesData'
import { EDICOES_NARRATIVA, ABERTURA } from '../../data/edicoesNarrativa'
import { editionPhotos } from '../../data/imageLibrary'
import { editionMark } from '../../data/editionAssets'
import { deveNavegarPorTecla } from './teclado'

/*
 * Estado e comportamento da página Edições: qual cena está em foco, para que
 * lado ela entrou, qual painel está aberto, se a tela é estreita, o teclado, o
 * arraste e o aquecimento das cenas vizinhas. Os componentes de seção só leem.
 */

export const TOTAL = CENAS.length
export const pad2 = (n) => String(n).padStart(2, '0')

const SEM_DADOS = { periodo: '', n: null, participantes: [], curiosidades: [], premiacao: null }

/* Preço fora da página: as curiosidades que só contam o valor do combo saem da
   lista. Nada é apagado em src/data — só deixa de ser exibido. */
const semPreco = (c) => !/R\$/.test(`${c.x || ''} ${c.v || ''}`)

/** Tudo o que uma cena mostra, derivado das fontes (nada copiado). */
export function cenaDaEdicao(i) {
  const cena = CENAS[i]
  const d = EDICOES_DADOS[cena.code] || SEM_DADOS
  const narrativa = EDICOES_NARRATIVA[cena.code] || {}
  // A história do festival entra pela PRIMEIRA cena: a apresentação é a
  // página, não existe herói separado para contextualizar.
  const abertura = i === 0 ? ABERTURA : null
  const curiosidades = (d.curiosidades || []).filter(semPreco)
  return {
    cena,
    i,
    numero: pad2(i + 1),
    tom: TONS[i % TONS.length],
    marca: editionMark(cena.code),
    fotos: editionPhotos(cena.code),
    participantes: d.participantes || [],
    nParticipantes: d.n != null ? d.n : 'N/D',
    periodo: d.periodo || 'não encontrado',
    premiacao: PREMIACAO[d.premiacao] || 'A conferir',
    narrativa,
    abertura,
    curiosidades,
    temEditorial: !!(abertura || narrativa.marco || narrativa.curiosidade || narrativa.legado || curiosidades.length),
    anterior: CENAS[i - 1] || null,
    proxima: CENAS[i + 1] || null,
  }
}

const consulta = (q) =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(q) : null

/* Mesma quebra da casca do site (900px). Lida já no primeiro render: nascer
   "desktop" e virar "celular" um quadro depois montava o rodapé e o desmontava
   em seguida — e quem mede a base (useReservaDaBase) ficava olhando a peça
   errada. */
function useEstreito() {
  const [estreito, setEstreito] = React.useState(() => !!consulta('(max-width: 900px)')?.matches)
  React.useEffect(() => {
    const mq = consulta('(max-width: 900px)')
    if (!mq) return undefined
    const avaliar = () => setEstreito(mq.matches)
    avaliar()
    mq.addEventListener('change', avaliar)
    return () => mq.removeEventListener('change', avaliar)
  }, [])
  return estreito
}

export function useEdicoes({ accessOpen = false } = {}) {
  const [i, setI] = React.useState(0)
  const [dir, setDir] = React.useState(1)
  const [painel, setPainel] = React.useState(null)   // 'participantes' | 'editorial' | null
  const estreito = useEstreito()
  const atual = React.useRef(0)

  const vaiPara = React.useCallback((k) => {
    const alvo = Math.min(TOTAL - 1, Math.max(0, k))
    if (alvo === atual.current) return
    setDir(alvo < atual.current ? -1 : 1)
    atual.current = alvo
    setI(alvo)
    setPainel(null)
  }, [])
  const passo = React.useCallback((d) => vaiPara(atual.current + d), [vaiPara])
  const alternarPainel = React.useCallback((qual) => setPainel((p) => (p === qual ? null : qual)), [])

  // ---- teclado: a decisão mora em ./teclado.js (testada à parte) ----------
  React.useEffect(() => {
    const aoTeclar = (ev) => {
      const modalAberto = accessOpen || !!document.querySelector('[aria-modal="true"]')
      const acao = deveNavegarPorTecla(ev, { estreito, modalAberto })
      if (!acao) return
      if (acao === 'fechar') { setPainel(null); return }
      ev.preventDefault()
      if (acao === 'proxima') passo(1)
      else if (acao === 'anterior') passo(-1)
      else if (acao === 'primeira') vaiPara(0)
      else if (acao === 'ultima') vaiPara(TOTAL - 1)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [estreito, accessOpen, passo, vaiPara])

  /* ---- carregamento controlado ------------------------------------------
     Só a cena em foco existe no DOM (16 cenas de tela cheia de uma vez
     congelam o compositor, §10.3). Para a troca não piscar, as três primeiras
     fotos das cenas vizinhas (±1) são aquecidas no cache, sem nó no DOM. */
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    ;[i - 1, i + 1].forEach((k) => {
      const viz = CENAS[k]
      if (viz) editionPhotos(viz.code).slice(0, 3).forEach((f) => { const img = new Image(); img.src = f.src })
    })
  }, [i])

  // ---- arraste horizontal da cena (mouse e toque) --------------------------
  // Não começa dentro de região com gestos/teclas próprias (galeria, painel
  // de texto): selecionar texto no painel não pode virar troca de edição.
  const arraste = React.useRef(null)
  const gestos = React.useMemo(() => ({
    onPointerDown: (ev) => {
      const proprio = ev.target && ev.target.closest && ev.target.closest('[data-teclas-proprias]')
      arraste.current = proprio || ev.button > 0 ? null : { x: ev.clientX, y: ev.clientY }
    },
    onPointerUp: (ev) => {
      const a = arraste.current
      arraste.current = null
      if (!a) return
      const dx = ev.clientX - a.x
      const dy = ev.clientY - a.y
      if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy)) passo(dx < 0 ? 1 : -1)
    },
    onPointerCancel: () => { arraste.current = null },
  }), [passo])

  // ---- foco dos painéis: abre no "fechar", volta ao gatilho ----------------
  const refs = {
    participantes: React.useRef(null),
    editorial: React.useRef(null),
    fechar: React.useRef(null),
  }
  const gatilho = React.useRef(null)
  React.useEffect(() => {
    if (painel) {
      gatilho.current = refs[painel] && refs[painel].current
      if (refs.fechar.current) refs.fechar.current.focus()
    } else if (gatilho.current) {
      if (gatilho.current.isConnected) gatilho.current.focus()
      gatilho.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painel])

  const dados = React.useMemo(() => cenaDaEdicao(i), [i])

  return { ...dados, dir, estreito, painel, setPainel, alternarPainel, vaiPara, passo, gestos, refs }
}
