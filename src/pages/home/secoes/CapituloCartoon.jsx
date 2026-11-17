import React from 'react'
import '../../../styles/scw-home-cartoon.css'
import { CAPITULO_CARTOON as T } from '../../../data/conteudo/home'
import { RESULTADOS } from '../../../data/resultadosEdicao'
import { festivalFacts as F } from '../../../data/festivalFacts'
import {
  cidadeEdicao, seloEdicao, fotoAte, LOGO_F2, MARCAS_PARCEIROS as M, TROFEU_DESENHO_EDICAO,
} from '../../../data/imageLibrary'
import { Seta } from '../../../components/Seta'
import ScwIcon from '../../../components/scw-icons/ScwIcon'

/* ============================================================================
   Capítulo Cartoon (16/11/2026) — logo abaixo da abertura, enquanto
   CAPITULO_CARTOON.ativo. "A cidade viveu o desenho. O próximo capítulo é o
   reconhecimento."

   A cidade ilustrada oficial da edição é o elemento principal: quadro grande,
   sem véu por cima, com o selo oficial e a placa do Sweet Awards. O texto fica
   numa área calma ao lado (desktop) ou acima (celular). A arte inteira abre
   num <dialog> nativo — Esc fecha, o foco volta para o botão.

   Único bloco do institucional com a língua da edição (paleta e Grandstander):
   tudo em scw-home-cartoon.css, sob `.hm-cap`. É só ilustração e identidade:
   nada do mapa, da Caça aos Carimbos, da avaliação ou dos vouchers é religado.

   O estado do resultado vem de resultadosEdicao.js; o texto de cada estado, de
   conteudo/home.js. A seção está completa parada: não há laço de animação.
   ========================================================================= */

const Logo = ({ marca, className }) => (
  <img className={className} src={marca.src} alt={marca.alt} width={marca.largura} height={marca.altura} loading="lazy" decoding="async" />
)

/* O <dialog> existe sempre (é nele que showModal() é chamado); o CONTEÚDO só
   entra quando abre — a arte inteira não baixa antes disso. */
function CidadeAmpliada({ cidade, dialogo, aberta, aoFechar }) {
  const [perto, setPerto] = React.useState(false)
  const C = T.cidade
  return (
    <dialog
      ref={dialogo}
      className="hm-cap__ampliada"
      /* Fora do motor de entrada: dentro do diálogo nada espera rolagem para aparecer. */
      data-mo-fora
      aria-labelledby="hm-cap-ampliada-titulo"
      onClose={() => { setPerto(false); aoFechar() }}
      /* Clique no véu (o próprio <dialog>) fecha; clique no conteúdo, não. */
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close() }}
    >
      <div className="hm-cap__ampliada-topo">
        <h3 id="hm-cap-ampliada-titulo" className="hm-cap__ampliada-titulo">{C.titulo}</h3>
        <button type="button" className="hm-cap__ctrl" aria-pressed={perto} onClick={() => setPerto((v) => !v)}>
          <ScwIcon nome={perto ? 'recolher' : 'ampliar'} tamanho={20} /> {perto ? C.afastar : C.aproximar}
        </button>
        <button type="button" className="hm-cap__ctrl hm-cap__ctrl--fechar" data-fechar onClick={() => dialogo.current.close()}>
          <ScwIcon nome="fechar" tamanho={20} /> {C.fechar}
        </button>
      </div>
      {/* Região rolável com foco: aproximada, a arte anda com as setas do teclado. */}
      <div className={'hm-cap__ampliada-palco' + (perto ? ' is-perto' : '')} tabIndex={0} role="group" aria-label={C.titulo}>
        {aberta && (
          <img
            src={cidade.inteira.src}
            srcSet={cidade.inteira.srcSet}
            sizes={perto ? '(min-width: 1000px) 170vw, 260vw' : '100vw'}
            width={cidade.inteira.largura}
            height={cidade.inteira.altura}
            alt={C.alt}
            decoding="async"
          />
        )}
      </div>
      <p className="hm-cap__ampliada-legenda">{C.legenda}</p>
    </dialog>
  )
}

export function CapituloCartoon({ ir, resultados = RESULTADOS }) {
  const dialogo = React.useRef(null)
  const abridor = React.useRef(null)
  const [aberta, setAberta] = React.useState(false)
  if (T.ativo !== true) return null

  const cidade = cidadeEdicao()
  const selo = seloEdicao()
  const E = T.estados[resultados.awards.estado] || T.estados['em-apuracao']
  const G = T.gratidao

  /* Caça aos Carimbos e sorteios: cada um no seu estado. */
  const outros = [resultados.caca, resultados.sorteios]
  const pendentes = outros.filter((r) => r.estado !== 'divulgado')
  const divulgados = outros.filter((r) => r.estado === 'divulgado')

  const ampliar = () => {
    const d = dialogo.current
    if (!d || d.open) return
    setAberta(true)
    d.showModal()
    d.querySelector('[data-fechar]')?.focus()
  }

  return (
    <section id={T.id} className="hm-cap" aria-labelledby="hm-cap-titulo">
      <div className="hm-cap__palco">
        <div className="hm-cap__texto">
          <p className="hm-cap__rotulo">{T.rotulo}</p>
          <h2 id="hm-cap-titulo" className="hm-cap__titulo" tabIndex={-1}>{E.titulo}</h2>
          <p className="hm-cap__apoio">{E.apoio}</p>
          <p className="hm-cap__estado">
            <span className="hm-cap__ponto" aria-hidden="true" />{E.estado}
          </p>
          <div className="hm-cap__acoes">
            <a className="hm-cap__btn" href="/sweet-awards" onClick={ir('/sweet-awards')}>
              {E.acao} <Seta />
            </a>
            <a className="hm-cap__btn hm-cap__btn--claro" href={T.secundaria.href} onClick={ir(T.secundaria.href)}>
              {T.secundaria.rotulo}
            </a>
          </div>
        </div>

        <figure className="hm-cap__cena">
          <div
            className="hm-cap__quadro"
            style={cidade.placeholder ? { backgroundImage: `url("${cidade.placeholder}")` } : undefined}
          >
            <img
              className="hm-cap__cidade"
              src={cidade.recorte.src}
              srcSet={cidade.recorte.srcSet}
              sizes="(min-width: 1000px) 62vw, 80vw"
              width={cidade.recorte.largura}
              height={cidade.recorte.altura}
              alt={T.cidade.alt}
              loading="lazy"
              decoding="async"
            />
            <button type="button" className="hm-cap__ctrl hm-cap__ver" ref={abridor} onClick={ampliar}>
              <ScwIcon nome="ampliar" tamanho={20} /> {T.cidade.ampliar}
            </button>
          </div>
          <img
            className="hm-cap__selo"
            src={fotoAte(selo.src, 480)}
            alt={selo.alt}
            width={selo.largura}
            height={selo.altura}
            loading="lazy"
            decoding="async"
          />
          <p className="hm-cap__placa">
            <span className="hm-cap__placa-texto"><small>{E.placa[0]}</small>{E.placa[1]}</span>
            <img
              src={fotoAte(TROFEU_DESENHO_EDICAO.src, 480)}
              alt=""
              width={TROFEU_DESENHO_EDICAO.largura}
              height={TROFEU_DESENHO_EDICAO.altura}
              loading="lazy"
              decoding="async"
            />
          </p>
        </figure>
        {/* Depois da cidade no código: no celular a arte chega antes deste aviso;
            no desktop a grade o devolve para a coluna do texto. */}
        <p className="hm-cap__outros">
          {pendentes.length > 0 && <>{T.outros['em-apuracao'](pendentes.map((r) => r.nome))}{' '}</>}
          {divulgados.map((r) => (
            <React.Fragment key={r.nome}>
              <a href={r.href} target="_blank" rel="noopener noreferrer">{T.outros.verResultado(r.nome)}</a>{' '}
            </React.Fragment>
          ))}
          <a
            className="hm-cap__insta"
            href={T.outros.instagram.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${T.outros.instagram.rotulo} no Instagram (abre em nova aba)`}
          >
            <ScwIcon nome="instagram" tamanho={20} /> {T.outros.instagram.rotulo}
          </a>
        </p>
      </div>

      <div className="hm-cap__gratos">
        <h3 className="hm-cap__gratos-titulo">{G.titulo}</h3>
        <ul className="hm-cap__gratos-lista">
          {G.itens.map((g) => (
            <li key={g.texto}><strong>{g.titulo(F.lastEdition.marcas)}</strong> {g.texto}</li>
          ))}
        </ul>
        {/* Marcas sobre branco: é o fundo da versão preferencial da Sicredi (manual
            de identidade) e serve às demais. Nenhuma é recolorida. */}
        <dl className="hm-cap__creditos">
          <div>
            <dt>{G.creditos.patrocinio}</dt>
            <dd><Logo marca={M.sicredi} className="hm-cap__logo hm-cap__logo--sicredi" /></dd>
          </div>
          <div>
            <dt>{G.creditos.apoio}</dt>
            <dd>
              <Logo marca={M.senac} className="hm-cap__logo" />
              <Logo marca={M.espacoReduzido} className="hm-cap__logo" />
            </dd>
          </div>
          <div>
            <dt>{G.creditos.realizacao}</dt>
            <dd><Logo marca={LOGO_F2} className="hm-cap__logo" /></dd>
          </div>
        </dl>
      </div>

      <CidadeAmpliada
        cidade={cidade}
        dialogo={dialogo}
        aberta={aberta}
        aoFechar={() => { setAberta(false); abridor.current?.focus() }}
      />
    </section>
  )
}

export default CapituloCartoon
