import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { editionMark } from '../../../data/editionAssets'
import {
  SECOES, ANTES_DE_2019, MENCAO_NOTA, SEM_RESULTADO, NAO_REGISTRADO,
} from '../../../data/conteudo/sweet-awards'
import { agruparPorTrilha, podioCompleto } from '../consulta'
import { Cabeca } from './Cabeca'
import { medalha } from './medalha'

const ROTULO_TRILHA = { juri_tecnico: 'Júri Técnico', sweet_lovers: 'Sweet Lovers' }
/* Pílula da trilha: cyan sustenta chocolate (6,2:1); magenta só sustenta
   creme em texto grande, então a pílula de Sweet Lovers é roxa com creme (10:1). */
const COR_TRILHA = {
  juri_tecnico: { cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
  sweet_lovers: { cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)' },
}

/* Marca da edição: logo real ou o tema como reserva textual. A escala óptica e
   a superfície (só para arte que some no creme) vêm do resolvedor. */
function MarcaEdicao({ code, tema }) {
  const marca = editionMark(code)
  const { escala, superficie } = marca.apresentacao
  const [quebrada, setQuebrada] = React.useState(false)
  const temLogo = marca.logo && !quebrada
  return (
    <span
      className={'swa-edicao__marca' + (temLogo ? '' : ' swa-edicao__marca--texto') + (temLogo && superficie ? ` swa-edicao__marca--${superficie}` : '')}
      style={temLogo ? { '--swa-marca-escala': escala } : undefined}
      aria-hidden="true"
    >
      {temLogo
        ? <img src={marca.logo} alt="" loading="lazy" decoding="async" onError={() => setQuebrada(true)} />
        : <span>{tema || code}</span>}
    </span>
  )
}

/* Uma categoria do histórico, sem foto (o acervo não liga foto e marca nessas
   edições): o dado aparece por si — medalha, nome do 1º em destaque e as
   colocações que faltam ditas como tais. */
function CategoriaHistorica({ cat, repetido = false }) {
  return (
    <li className="swa-hist-cat">
      <b>{cat.nome}</b>
      {/* Duas categorias da mesma edição unidas pelo alias no mesmo nome: o nome
          da época é o que as distingue (§8.2 vale para o nome canônico). */}
      {repetido && cat.nomeOriginal && <span className="swa-hist-cat__epoca">na época, “{cat.nomeOriginal}”</span>}
      {cat.pod.length > 0 ? (
        <ol className="swa-hist-podio">
          {podioCompleto(cat.pod).map((p) => (
            <li key={p.pos}>
              <span className="swa-hist-medalha" style={{ '--swa-medalha': medalha(p.pos) }} aria-hidden="true"><span className="swa-num">{p.pos}</span></span>
              <span className={`swa-hist-nome${p.pos === 1 ? ' swa-hist-nome--primeiro' : ''}${p.nomes ? '' : ' swa-hist-nome--vazio'}`}>
                <span className="scw-sr">{p.pos}º lugar{p.empate ? ', empate' : ''}: </span>
                {p.nomes ? p.nomes.join(' + ') : NAO_REGISTRADO}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <span className="swa-hist-vazio">{SEM_RESULTADO}</span>
      )}
    </li>
  )
}

function EdicaoAcordeao({ edicao, aberto, onAlternar }) {
  const id = `swa-edicao-${edicao.code.replace('.', '-')}`
  const grupos = agruparPorTrilha(edicao.cats)
  const varias = grupos.length > 1
  return (
    <article className="swa-edicao">
      <h3 className="swa-edicao__h">
        <button
          type="button"
          className="swa-edicao__botao"
          aria-expanded={aberto}
          aria-controls={`${id}-painel`}
          id={`${id}-botao`}
          onClick={onAlternar}
        >
          <MarcaEdicao code={edicao.code} tema={edicao.tema} />
          <span className="swa-edicao__id">
            <span className="swa-edicao__ano">{edicao.code}</span>
            <span className="swa-edicao__titulo">{edicao.tema}</span>
          </span>
          <span className="swa-edicao__cats">
            <b>{edicao.cats.length}</b>
            <span>{edicao.cats.length === 1 ? 'categoria' : 'categorias'}</span>
          </span>
          <span className="swa-edicao__seta" aria-hidden="true"><ScwIcon nome="abrir" tamanho={20} /></span>
        </button>
      </h3>

      <div className="swa-edicao__painel" id={`${id}-painel`} role="region" aria-labelledby={`${id}-botao`} hidden={!aberto}>
        <p className="swa-edicao__periodo">{edicao.periodo}</p>
        {edicao.nota && <p className="swa-edicao__nota">{edicao.nota}</p>}
        {grupos.map((g) => (
          <div className="swa-grupo" key={g.trilha || 'unica'}>
            {varias && ROTULO_TRILHA[g.trilha] && (
              <span
                className="swa-grupo__rotulo"
                style={{ '--swa-grupo': COR_TRILHA[g.trilha].cor, '--swa-grupo-tinta': COR_TRILHA[g.trilha].tinta }}
              >
                {ROTULO_TRILHA[g.trilha]}
              </span>
            )}
            <ul className="swa-hist-cats">
              {/* Chave por posição: a 2020.1 teve "Take Away" e "Delivery" separados,
                  e o alias da base une os dois no mesmo nome canônico. */}
              {g.cats.map((c, i) => (
                <CategoriaHistorica key={i} cat={c} repetido={g.cats.filter((x) => x.nome === c.nome).length > 1} />
              ))}
            </ul>
          </div>
        ))}

        {/* Menção Honrosa: reconhecimento SEM ordem de colocação — sem medalha,
            fora do Hall. Só a 2021.1 tem. */}
        {edicao.mencao && (
          <div className="swa-mencao">
            <span className="swa-mencao__rotulo">Menção Honrosa · {edicao.mencao.categoria}</span>
            <p className="swa-mencao__nomes">{edicao.mencao.nomes.join(' · ')}</p>
            <p className="swa-mencao__nota">{MENCAO_NOTA}</p>
          </div>
        )}
      </div>
    </article>
  )
}

/*
 * 05 — Histórico por edição: acordeão, da mais recente à estreia. Cada edição
 * abre e fecha sozinha (dá para comparar duas abertas). A lista fecha com as
 * cinco primeiras edições, que não tiveram premiação — dito, não escondido.
 */
export function Historico({ edicoes }) {
  const t = SECOES.historico
  const [abertas, setAbertas] = React.useState(() => new Set())
  const alternar = (code) => setAbertas((atual) => {
    const nova = new Set(atual)
    if (nova.has(code)) nova.delete(code)
    else nova.add(code)
    return nova
  })

  return (
    <section id={t.id} className="scw-secao scw-secao--creme" aria-labelledby={`${t.id}-titulo`}>
      <Cabeca secao={t} />
      <div className="swa-edicoes" data-mo-bloco>
        {edicoes.map((e) => (
          <EdicaoAcordeao key={e.code} edicao={e} aberto={abertas.has(e.code)} onAlternar={() => alternar(e.code)} />
        ))}
        <article className="swa-antes" aria-labelledby="swa-antes-titulo">
          <span className="swa-antes__periodo">{ANTES_DE_2019.periodo}</span>
          <h3 className="swa-antes__titulo" id="swa-antes-titulo">{ANTES_DE_2019.titulo}</h3>
          <p className="swa-antes__texto">{ANTES_DE_2019.texto}</p>
        </article>
      </div>
    </section>
  )
}
