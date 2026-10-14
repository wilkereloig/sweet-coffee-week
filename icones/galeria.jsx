import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import '../src/styles/fonts-nexa-slab.css'
import '../src/styles/scw-2026.css'
import './galeria.css'
import INTERFACE from '../src/components/scw-icons/gerado/interface'
import EXPRESSIVA from '../src/components/scw-icons/gerado/expressiva'
import { FAMILIAS, ALIASES, NOMES } from '../src/components/scw-icons/gerado/especificacao'
import { IconeSvg } from '../src/components/scw-icons/registro'
import ScwIcon from '../src/components/scw-icons/ScwIcon'
import { ANATOMIA_COMBO } from '../src/components/scw-icons/anatomia-combo'

/* Galeria interna da iconografia v3 — inspeção em tamanho REAL de uso, em fundo
   claro, escuro e colorido, e dentro das peças que o site e o painel usam. */

const FUNDOS = [
  { id: 'creme', fundo: 'var(--scw-creme)', tinta: 'var(--scw-choco)' },
  { id: 'chocolate', fundo: 'var(--scw-choco)', tinta: 'var(--scw-creme)' },
  { id: 'amarelo', fundo: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { id: 'cyan', fundo: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
  { id: 'roxo', fundo: 'var(--scw-roxo)', tinta: 'var(--scw-creme)' },
]

const GRUPOS_UI = [
  ['Navegação', 'inicio edicao trofeu loja menu mais-acoes voltar avancar abrir recolher seta-esquerda seta-direita seta-cima link-externo fechar'],
  ['Ações', 'mais editar copiar enviar baixar atualizar restaurar arquivar excluir compartilhar busca play pausa som som-desligado'],
  ['Conteúdo', 'documento ficha pasta imagem camera calendario horario local trajeto'],
  ['Pessoas e acesso', 'conta pessoas equipe contatos chave cadeado sair'],
  ['Comunicação', 'mensagem mensagens depoimento email celular sino instagram'],
  ['Estados', 'sucesso feito informacao atencao exclamacao alerta erro pendente neutro carregando pedido concluido'],
  ['Festival', 'combo cupcake coxinha xicara preco tema visao operacao configuracoes voucher imprensa estrela coracao medalha avaliacao curadoria ciclo descobrir apoio alcance moedas atendimento compra duvida historico'],
]

function Desenho({ nome, familia, tamanho }) {
  const cat = familia === 'expressiva' ? EXPRESSIVA : INTERFACE
  const d = cat[nome]
  if (!d) return <span className="gl-falta">?</span>
  return <IconeSvg resolvido={{ canon: nome, familia: d.m ? 'marcas' : familia, desenho: d }} tamanho={tamanho} />
}

function Grade({ familia, nomes, tamanhos, fundo }) {
  return (
    <div className="gl-grade" style={{ background: fundo.fundo, color: fundo.tinta, '--gl-col': familia === 'expressiva' ? '210px' : '112px' }}>
      {nomes.map((n) => (
        <figure key={n} className="gl-peca" title={(familia === 'expressiva' ? EXPRESSIVA : INTERFACE)[n]?.t}>
          <div className="gl-peca__tamanhos">
            {tamanhos.map((t) => <span key={t} className="gl-peca__caixa" style={{ width: t, height: t }}><Desenho nome={n} familia={familia} tamanho={t} /></span>)}
          </div>
          <figcaption>{n}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function Exemplos() {
  return (
    <div className="gl-exemplos">
      <div>
        <h3>Botão com rótulo</h3>
        <div className="gl-linha">
          <button className="gl-btn gl-btn--cheio" type="button"><ScwIcon nome="mais" tamanho={20} />Adicionar unidade</button>
          <button className="gl-btn" type="button"><ScwIcon nome="baixar" tamanho={20} />Baixar guia</button>
          <button className="gl-btn" type="button">Quero participar<ScwIcon nome="seta-direita" tamanho={20} /></button>
          <button className="gl-btn" type="button" disabled><ScwIcon nome="enviar" tamanho={20} />Enviar (desabilitado)</button>
          <button className="gl-btn" type="button" aria-busy="true"><ScwIcon nome="carregando" tamanho={20} className="gl-gira" />Enviando…</button>
        </div>
      </div>
      <div>
        <h3>Botão só com ícone · desenho 20 em alvo 44</h3>
        <div className="gl-linha">
          {['editar', 'copiar', 'arquivar', 'restaurar', 'excluir', 'fechar', 'mais-acoes'].map((n) => (
            <button key={n} type="button" className="gl-btn-icone" aria-label={n} data-rotulo={n}><ScwIcon nome={n} tamanho={20} /></button>
          ))}
        </div>
      </div>
      <div>
        <h3>Abas do celular · 24</h3>
        <nav className="gl-abas">
          {[['inicio', 'festival'], ['edicao', 'edições'], ['trofeu', 'awards'], ['loja', 'participar'], ['mais-acoes', 'mais']].map(([n, r], i) => (
            <span key={n} className={'gl-aba' + (i === 1 ? ' is-ativa' : '')}><ScwIcon nome={n} tamanho={24} /><b>{r}</b></span>
          ))}
        </nav>
      </div>
      <div>
        <h3>Linha de lista · uma e duas linhas</h3>
        <ul className="gl-lista">
          <li><ScwIcon nome="documento" tamanho={20} /><span>Regulamento da edição</span><ScwIcon nome="avancar" tamanho={16} /></li>
          <li><ScwIcon nome="camera" tamanho={20} /><span>Sessão de fotos<small>Sábado, 18/10 às 19h30 · Lagoa Nova</small></span><ScwIcon nome="avancar" tamanho={16} /></li>
        </ul>
      </div>
      <div>
        <h3>Selos de estado · 16 (cor nunca sozinha)</h3>
        <div className="gl-linha">
          {[['sucesso', 'Aprovado', 'ok'], ['horario', 'Em análise', 'andamento'], ['atencao', 'Alteração pedida', 'atencao'], ['alerta', 'Prazo hoje', 'atencao'], ['erro', 'Recusado', 'erro'], ['pendente', 'Aguardando', 'neutro'], ['neutro', 'Sem sessão', 'neutro'], ['arquivar', 'Encerrado', 'neutro']].map(([n, r, t]) => (
            <span key={r} className="gl-selo" data-tom={t}><ScwIcon nome={n} tamanho={16} />{r}</span>
          ))}
        </div>
      </div>
      <div>
        <h3>Rótulo de seção · 20</h3>
        <div className="gl-linha">
          {['ciclo', 'loja', 'avaliacao', 'apoio', 'alcance', 'duvida', 'imprensa', 'trajeto'].map((n) => (
            <span key={n} className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome={n} tamanho={20} />{n}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Anatomia({ isolado }) {
  const cores = { doce: ['var(--scw-magenta)', 'var(--scw-creme)'], salgado: ['var(--scw-amarelo)', 'var(--scw-choco)'], bebida: ['var(--scw-cyan)', 'var(--scw-choco)'] }
  return (
    <div className="gl-anatomia">
      {Object.entries(ANATOMIA_COMBO).map(([cat, nomes]) => (
        <div key={cat} className="gl-anatomia__linha">
          <b>{cat}</b>
          {nomes.map((n, i) => (
            <figure key={n} className="gl-anatomia__item">
              <span className={isolado ? 'gl-anatomia__solto' : 'gl-anatomia__disco'} style={isolado ? null : { background: cores[cat][0], color: cores[cat][1] }}>
                <Desenho nome={n} familia="expressiva" tamanho={64} />
              </span>
              <figcaption>{n}{i === 0 ? ' · capa' : ''}</figcaption>
            </figure>
          ))}
        </div>
      ))}
    </div>
  )
}

function Galeria() {
  const [fundo, setFundo] = useState(FUNDOS[0])
  const total = NOMES.interface.length + NOMES.expressiva.length + NOMES.marcas.length
  return (
    <main className="gl">
      <header className="gl-topo">
        <h1>Iconografia SCW v3</h1>
        <p>{NOMES.interface.length} interface · {NOMES.expressiva.length} expressiva · {NOMES.marcas.length} marca · {Object.keys(ALIASES).length} nomes antigos por alias · {total} desenhos. Fonte em <code>icones/</code>; gere com <code>npm run icones</code>.</p>
        <div className="gl-fundos" role="radiogroup" aria-label="Fundo">
          {FUNDOS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={f.id === fundo.id} onClick={() => setFundo(f)} style={{ background: f.fundo, color: f.tinta }}>{f.id}</button>
          ))}
        </div>
      </header>

      <section>
        <h2>Anatomia do combo — isolada (sem disco)</h2>
        <Anatomia isolado />
        <h2>Anatomia do combo — no disco da Home</h2>
        <Anatomia />
      </section>

      <section>
        <h2>Interface · 16 · 20 · 24 — traço {Object.entries(FAMILIAS.interface.traco).map(([t, v]) => t + 'px→' + ((v * t) / 24).toFixed(2)).join(' · ')}</h2>
        {GRUPOS_UI.map(([titulo, nomes]) => (
          <div key={titulo}>
            <h3>{titulo}</h3>
            <Grade familia="interface" nomes={nomes.split(' ')} tamanhos={[16, 20, 24]} fundo={fundo} />
          </div>
        ))}
        <h3>Todos os fundos, 20px</h3>
        {FUNDOS.map((f) => <Grade key={f.id} familia="interface" nomes={[...NOMES.interface, ...NOMES.marcas]} tamanhos={[20]} fundo={f} />)}
      </section>

      <section>
        <h2>Expressiva · 32 · 48 · 64</h2>
        <Grade familia="expressiva" nomes={NOMES.expressiva} tamanhos={[32, 48, 64]} fundo={fundo} />
        <h3>Disco de seção</h3>
        <div className="gl-linha">
          {NOMES.expressiva.map((n, i) => (
            <span key={n} className="gl-disco" style={{ background: FUNDOS[(i % 4) + 1].fundo, color: FUNDOS[(i % 4) + 1].tinta }}><Desenho nome={n} familia="expressiva" tamanho={32} /></span>
          ))}
        </div>
      </section>

      <section>
        <h2>Aplicação</h2>
        <Exemplos />
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('raiz')).render(<Galeria />)
