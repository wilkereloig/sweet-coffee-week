import React from 'react'
import { Icone } from './Icone'
import { Folha } from './Folha'
import { confirmar } from './Confirmar'
import { historico } from '../lib/historico'
import { pendencias } from '../lib/pendencias'
import '../styles/trilha.css'

/*
 * "‹ Voltar" + Telas recentes no cabeçalho dos dois painéis (24/10/2026, pedido do Wilker).
 *
 * O Voltar mostra o NOME da tela de onde a pessoa veio ("‹ Sabor de Pão") e volta um passo; a seta ao
 * lado abre as últimas telas desta sessão para pular direto. Some quando não há para onde voltar.
 * O histórico em si é de lib/historico.js; aqui é só a peça de tela. Cada casca diz como nomear as
 * telas dela (`descrever`) e como abrir uma rota (`onIr`).
 */

export function useHistorico() {
  return React.useSyncExternalStore(historico.ouvir, historico.foto, historico.foto)
}

/** A vista diz o nome do que está aberto (ficha, postagem, contato): o Voltar e as Recentes mostram o nome. */
export function useNomeDaTela(vista, item, nome) {
  React.useEffect(() => {
    if (vista && item && nome) historico.nomear('i:' + vista + '|' + item, String(nome))
  }, [vista, item, nome])
}

/** O módulo diz o nome das abas dele ("Operação › Fotos"). */
export function useRotulosDasAbas(vista, abas) {
  const chave = abas.map((a) => (a.chave || '') + '=' + a.rotulo).join('|')
  React.useEffect(() => {
    abas.forEach((a) => { if (typeof a.rotulo === 'string') historico.nomear('a:' + vista + '|' + (a.chave || ''), a.rotulo) })
  }, [vista, chave]) // eslint-disable-line react-hooks/exhaustive-deps
}

// Trabalho pela metade (lib/pendencias.js): o que a tela já guarda neste aparelho não pergunta.
async function podeSair() {
  const p = pendencias().filter((x) => !x.guardaRascunho)
  if (!p.length) return true
  const o_que = p.map((x) => x.rotulo).filter(Boolean)
  return confirmar('Sair desta tela?\n\n' + (o_que.length ? 'Ainda não foi salvo: ' + o_que.join(', ') + '.' : 'Há algo que ainda não foi salvo.'),
    { acao: 'Sair sem salvar', perigo: true })
}

export function quando(t, agora = Date.now()) {
  const min = Math.floor((agora - t) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return 'há ' + min + ' min'
  const h = Math.floor(min / 60)
  return 'há ' + h + ' h'
}

// Chapa escura (texto creme) × clara (texto chocolate) — a mesma regra das cascas (aplicarAcento).
const ESCURAS = new Set(['roxo', 'marrom', 'magenta', 'choco'])
function Disco({ icone, acento }) {
  const cor = acento || 'amarelo'
  return (
    <span className="pn-recentes__disco" aria-hidden="true"
      style={{ '--c': 'var(--scw-' + cor + ')', '--t': 'var(--scw-' + (ESCURAS.has(cor) ? 'creme' : 'choco') + ')' }}>
      <Icone nome={icone || 'visao'} tamanho={20} />
    </span>
  )
}

/**
 * `foto` = useHistorico() (a casca já lê para saber se a linha aparece);
 * `descrever(h)` → { titulo, caminho, falado, icone, acento };
 * `onIr(h)` → a casca abre a rota.
 */
export function Trilha({ foto, descrever, onIr }) {
  const [aberta, setAberta] = React.useState(false)
  const ant = foto.anterior ? descrever(foto.anterior.h) : null
  const temRecentes = foto.recentes.length > 0
  if (!ant && !temRecentes) return null
  const atual = foto.atual ? descrever(foto.atual.h) : null
  const agora = Date.now()

  async function voltar() { if (await podeSair()) historico.voltar() }
  async function ir(h) {
    if (!(await podeSair())) return
    setAberta(false)
    onIr(h)
  }

  return (
    <nav className="pn-trilha" aria-label="Voltar e telas recentes">
      {ant && (
        <button type="button" className="pn-trilha__voltar" onClick={voltar} aria-label={'Voltar para ' + ant.falado}>
          <Icone nome="voltar" tamanho={18} />
          {/* `key`: o nome novo entra com um deslize curto; o botão (e o foco) ficam. */}
          <span className="pn-trilha__nome" key={foto.anterior.id}>{ant.titulo}</span>
        </button>
      )}
      {temRecentes && (
        <button type="button" className={'pn-trilha__recentes' + (ant ? '' : ' pn-trilha__recentes--so')}
          aria-haspopup="dialog" aria-label="Telas recentes" onClick={() => setAberta(true)}>
          <Icone nome={ant ? 'abrir' : 'historico'} tamanho={16} />
          {!ant && <span className="pn-trilha__nome">Telas recentes</span>}
        </button>
      )}
      <Folha aberto={aberta} titulo="Telas recentes" sub="As telas que você abriu nesta sessão. Toque para voltar direto a uma delas."
        onFechar={() => setAberta(false)}>
        <ul className="pn-recentes">
          {atual && (
            <li>
              <div className="pn-recentes__item is-atual" aria-current="page">
                <Disco icone={atual.icone} acento={atual.acento} />
                <span className="pn-recentes__texto">
                  <span className="pn-recentes__titulo">{atual.titulo}</span>
                  {atual.caminho && <span className="pn-recentes__caminho">{atual.caminho}</span>}
                </span>
                <span className="pn-recentes__aqui">Você está aqui</span>
              </div>
            </li>
          )}
          {foto.recentes.map((r) => {
            const d = descrever(r.h)
            return (
              <li key={r.chave}>
                <button type="button" className="pn-recentes__item" onClick={() => ir(r.h)}
                  aria-label={d.falado + ', ' + quando(r.t, agora)}>
                  <Disco icone={d.icone} acento={d.acento} />
                  <span className="pn-recentes__texto">
                    <span className="pn-recentes__titulo">{d.titulo}</span>
                    {d.caminho && <span className="pn-recentes__caminho">{d.caminho}</span>}
                  </span>
                  <span className="pn-recentes__quando">{quando(r.t, agora)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </Folha>
    </nav>
  )
}
