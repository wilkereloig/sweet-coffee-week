/*
 * Caça aos Carimbos — a página das seções (docs/cartoon-2026-2/15-caca-front.md). Rotas, em /cartoon/caca:
 *   (central) · recuperar · mapa · ranking · grupos · grupo/<id> · convite/<token> · metas · compartilhar
 * Um <h1> por página e um `useCaca` por página: as seções recebem `caca` pronto e não leem o banco de novo.
 * `mapa` reaproveita a página do mapa existente (que traz o próprio estado e o próprio <h1>).
 */
import React from 'react'
import { Link, Carregando, Falha } from '../../../componentes/base.jsx'
import { useCaca } from '../../../caca/useCaca.js'
import { GuardarMapa } from '../../../caca/GuardarMapa.jsx'
import { Central } from '../../../caca/Central.jsx'
import { Recuperar } from '../../../caca/Recuperar.jsx'
import { CriarMapa } from '../../../caca/CriarMapa.jsx'
import { CACA, CACA_CAMINHOS } from '../../../caca/textos.js'
import { Mapa } from '../mapa/index.jsx'
import Grupos from '../../../caca/secoes/Grupos.jsx'
import GrupoDetalhe from '../../../caca/secoes/GrupoDetalhe.jsx'
import Ranking from '../../../caca/secoes/Ranking.jsx'
import Metas from '../../../caca/secoes/Metas.jsx'
import Compartilhar from '../../../caca/secoes/Compartilhar.jsx'
import { Delivery } from '../../../caca/delivery/Delivery.jsx'
import Convite from '../../../caca/secoes/Convite.jsx'
import { ManifestoDaCaca } from '../../../caca/pwa/ManifestoDaCaca.jsx'

// Seções que só fazem sentido com mapa: sem ele, mostram a criação rápida no lugar do conteúdo.
const PRECISA_DE_MAPA = ['grupos', 'grupo', 'metas', 'compartilhar', 'delivery']
// Seções que funcionam sem esperar (nem depender de) a leitura do mapa: lidam sozinhas com `caca.estado`.
const INDEPENDENTES = ['recuperar', 'ranking', 'convite']

function Conteudo ({ secao, caca, navigate, dados, grupoId, token }) {
  const extra = { caca, navigate, dados }
  switch (secao) {
    case 'recuperar': return <Recuperar caca={caca} navigate={navigate} />
    case 'ranking': return <Ranking {...extra} />
    case 'grupos': return <Grupos {...extra} />
    case 'grupo': return <GrupoDetalhe {...extra} grupoId={grupoId} />
    case 'metas': return <Metas {...extra} />
    case 'compartilhar': return <Compartilhar {...extra} />
    case 'delivery': return <Delivery {...extra} />
    case 'convite':
      return token
        ? <Convite {...extra} token={token} />
        : (
          <div className="ct-caca__bloco" role="alert">
            <p className="ct-sub">{CACA.convite.invalido.titulo}</p>
            <p className="ct-nota">{CACA.convite.invalido.texto}</p>
          </div>
          )
    default: return <Central {...extra} />
  }
}

function PaginaDaCaca ({ secao, navigate, dados, grupoId, token }) {
  const caca = useCaca()
  const central = secao === 'central'
  const precisaMapa = PRECISA_DE_MAPA.includes(secao)

  let corpo
  if (INDEPENDENTES.includes(secao)) corpo = <Conteudo secao={secao} caca={caca} navigate={navigate} dados={dados} grupoId={grupoId} token={token} />
  else if (caca.estado === 'carregando') corpo = <Carregando texto={CACA.carregando} />
  else if (caca.estado === 'falha') corpo = <Falha titulo={CACA.falha.titulo} texto={CACA.falha.texto} tentar={caca.atualizar} />
  else if (precisaMapa && caca.estado === 'sem-mapa') {
    corpo = (
      <>
        <p className="ct-lead">{CACA.precisaDeMapa[secao]}</p>
        <CriarMapa navigate={navigate} aoAbrir={(k, criado) => caca.entrar(k, { criado })} />
      </>
    )
  } else {
    // A central mostra o aviso no próprio lugar; nas outras seções ele abre o corpo (quem acabou de criar o mapa aqui não passou pela central).
    corpo = (
      <>
        {!central && caca.recemCriado && caca.estado === 'pronto' && <GuardarMapa chave={caca.chave} />}
        <Conteudo secao={secao} caca={caca} navigate={navigate} dados={dados} grupoId={grupoId} token={token} />
      </>
    )
  }

  return (
    <section className="ct-bloco ct-caca" aria-busy={caca.estado === 'carregando'}>
      {/* Cabeçalho compacto: o "voltar" (ou, na central, nada) acima do título; sem rótulo repetindo o nome da Caça. */}
      {!central && <p className="ct-caca__voltar"><Link href={CACA_CAMINHOS.central} navigate={navigate}>{CACA.voltar}</Link></p>}
      {/* Na central o título repetiria o letreiro da Caça que já está na barra do topo: fica só para leitor de tela (um <h1> por página). */}
      <h1 className={central ? 'ct-h1 ct-sr' : 'ct-h1'}>{CACA.titulos[secao]}</h1>
      {/* Na central o lead só serve a quem ainda não tem mapa; com mapa, o progresso e o próximo passo ocupam o lugar dele. */}
      {(central ? caca.estado === 'sem-mapa' : (!precisaMapa || caca.estado !== 'sem-mapa')) && <p className="ct-lead">{CACA.leads[secao]}</p>}
      {corpo}
    </section>
  )
}

export function Caca ({ secao = 'central', navigate, dados, grupoId, token }) {
  // ManifestoDaCaca (app instalável) vale para toda página /cartoon/caca*, o mapa inclusive; não renderiza nada.
  return (
    <>
      <ManifestoDaCaca />
      {secao === 'mapa'
        ? <Mapa navigate={navigate} dados={dados} entrada="mapa" />
        : <PaginaDaCaca secao={secao} navigate={navigate} dados={dados} grupoId={grupoId} token={token} />}
    </>
  )
}
