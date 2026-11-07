/*
 * Campanha "Ter com quem contar" (Sicredi) — /cartoon/ter-com-quem-contar. Fora do menu e da barra de abas: chega pelo cartão da
 * agência no mapa, pelo painel de Prêmios, pelo rodapé e pelo aviso. Regra de prazo e textos em caca/campanha/terComQuemContar.js.
 * Depois de 13/11 (Fortaleza) a página continua abrindo, sem chamada para participar.
 */
import React from 'react'
import { useCaca } from '../../caca/useCaca.js'
import { prepararImagem } from '../../caca/delivery/imagem.js'
import { MARCAS_PARCEIROS } from '../../../data/imageLibrary'
import { TopoCanal } from '../../componentes/sistema/TopoCanal.jsx'
import { Link } from '../../componentes/base.jsx'
import { Botao, Rotulo } from '../../componentes/sistema/pecas.jsx'
import { CAMPANHA, TEXTOS_CAMPANHA as T, estadoDaCampanha } from '../../caca/campanha/terComQuemContar.js'
import { CACA_CAMINHOS } from '../../caca/textos.js'
import { useAgora } from '../useAgora.js'

const EXTERNO = { target: '_blank', rel: 'noopener noreferrer' }

function EnvioCarimboSicredi ({ aberta, navigate }) {
  const caca = useCaca({ comEmail: false })
  const [pedidos, setPedidos] = React.useState([])
  const [erro, setErro] = React.useState('')
  const [ocupado, setOcupado] = React.useState(false)
  const [rascunho, setRascunho] = React.useState(null)
  React.useEffect(() => {
    let vivo = true
    if (caca.estado === 'pronto' && caca.chave) caca.api.sicrediCampanhaMeus(caca.chave).then((r) => { if (vivo && r.ok) setPedidos(r.pedidos || []) })
    return () => { vivo = false }
  }, [caca.estado, caca.chave, caca.api])
  const atual = pedidos.find((p) => p.estado === 'pendente' || p.estado === 'aprovado' || p.estado === 'rascunho')
  async function iniciar () {
    setErro(''); setOcupado(true)
    const r = await caca.api.sicrediCampanhaPedir(caca.chave)
    setOcupado(false)
    if (!r.ok) { setErro(r.motivo === 'campanha_encerrada' ? 'O prazo para enviar a comprovação terminou.' : 'Não deu para iniciar o envio. Tente novamente.'); return }
    setRascunho(r.id); setPedidos((p) => [{ id: r.id, estado: 'rascunho' }, ...p.filter((x) => x.estado !== 'negado')])
  }
  async function enviar (arquivo) {
    setErro(''); setOcupado(true)
    const img = await prepararImagem(arquivo)
    if (!img.ok) { setOcupado(false); setErro('Escolha um print em JPG, PNG ou WebP, com boa leitura.'); return }
    const r = await caca.api.sicrediCampanhaEnviarImagem(caca.chave, rascunho || atual?.id, img)
    setOcupado(false)
    if (!r.ok) { setErro('O envio não foi concluído. Confira sua conexão e tente novamente.'); return }
    setRascunho(null)
    const l = await caca.api.sicrediCampanhaMeus(caca.chave)
    if (l.ok) setPedidos(l.pedidos || [])
  }
  return (
    <section className="ct-bloco ct-tcqc__carimbo" aria-labelledby="tcqc-carimbo">
      <div><Rotulo>Carimbo especial</Rotulo><h2 id="tcqc-carimbo" className="ct-h2">Ganhe o carimbo Sicredi</h2>
        <p>Publique o vídeo da campanha no seu Instagram e envie um print da publicação. A organização confere sua participação.</p>
        <p className="ct-nota">Com a aprovação, você ganha um carimbo Sicredi que soma pontos no ranking e nos sorteios. Ele não conta como casa visitada.</p>
      </div>
      {caca.estado === 'sem-mapa' && <p>Para enviar o print, primeiro <Link href={CACA_CAMINHOS.central} navigate={navigate} className="ct-link">crie seu mapa da Caça aos Carimbos</Link>.</p>}
      {caca.estado === 'carregando' && <p role="status">Carregando seu mapa…</p>}
      {caca.estado === 'falha' && <p role="status">Não foi possível carregar seu mapa agora. Atualize a página e tente de novo.</p>}
      {caca.estado === 'pronto' && (atual?.estado === 'aprovado'
        ? <p className="ct-tcqc__carimbo-status" role="status">Carimbo Sicredi aprovado! Ele já conta no seu ranking e nos sorteios.</p>
        : atual?.estado === 'pendente'
          ? <p className="ct-tcqc__carimbo-status" role="status">Print recebido. A organização vai analisar seu pedido.</p>
          : atual?.estado === 'rascunho' || rascunho
            ? <label className="ct-tcqc__upload">{ocupado ? 'Enviando seu print…' : 'Escolher print da publicação'}
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={ocupado} onChange={(ev) => { const f = ev.target.files?.[0]; if (f) enviar(f); ev.target.value = '' }} />
              </label>
            : aberta
              ? <button className="ct-botao" type="button" disabled={ocupado} onClick={iniciar}>{ocupado ? 'Preparando…' : 'Enviar print da publicação'}</button>
              : <p>O prazo para participar da promoção terminou.</p>)}
      {erro && <p className="ct-tcqc__carimbo-erro" role="alert">{erro}</p>}
      {pedidos.some((p) => p.estado === 'negado') && !atual && aberta && <p>Seu envio anterior não foi aprovado. Você pode tentar novamente com outro print.</p>}
    </section>
  )
}

function IlustracaoPasso ({ indice }) {
  return (
    <svg className="ct-tcqc__ilustracao" viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="50" cy="50" r="43" fill={['#ffb800', '#1bb8b1', '#f3768b'][indice]} />
      {indice === 0 && <><rect x="23" y="31" width="48" height="38" rx="7" fill="#fff7e8" /><path d="M71 42l12-7v29l-12-7z" fill="#e84351" /><circle cx="47" cy="50" r="11" fill="#ffb800" /><path d="M30 25l6-7m-16 12l-7-3" /></>}
      {indice === 1 && <><rect x="29" y="14" width="42" height="72" rx="9" fill="#fff7e8" /><path d="M39 22h22M42 77h16" /><rect x="36" y="31" width="28" height="30" rx="4" fill="#ffb800" /><path d="M45 46h12m-6-6v12" /></>}
      {indice === 2 && <><rect x="25" y="39" width="50" height="37" rx="7" fill="#fff7e8" /><path d="M36 39v-9a14 14 0 0128 0" /><circle cx="50" cy="55" r="4" fill="#e84351" /><path d="M50 59v7M77 26l4-6m3 15l7-1" /></>}
    </svg>
  )
}

export function TerComQuemContar ({ navigate }) {
  const e = estadoDaCampanha(useAgora(60000))
  const sicredi = MARCAS_PARCEIROS.sicredi
  return (
    <div className="ct-tcqc">
      <TopoCanal canal="estreia" className="ct-tcqc__topo" aria-labelledby="tcqc-titulo">
        <Rotulo>{T.rotulo}</Rotulo>
        <h1 id="tcqc-titulo" className="ct-h1">{e.aberta ? 'Sua história pode ganhar um par de vouchers!' : T.titulo}</h1>
        <p className="ct-lead">{e.aberta ? `${T.titulo}: conte a história de alguém com quem você pôde contar. ${CAMPANHA.historias} histórias serão escolhidas.` : T.lead}</p>
        <p className={`ct-tcqc__prazo${e.aberta ? '' : ' is-encerrada'}`} role="status">{e.aberta ? T.prazoAberto(e) : T.prazoEncerrado}</p>
        <div className="ct-tcqc__selo">
          <span className="ct-tcqc__selo-rotulo">{T.selo}</span>
          <img src={sicredi.src} alt={sicredi.alt} width={sicredi.largura} height={sicredi.altura} decoding="async" />
        </div>
      </TopoCanal>

      <div className="ct-bloco ct-tcqc__duas">
        <figure className="ct-tcqc__video">
          <video controls playsInline preload="metadata" poster={CAMPANHA.video.capa} width={CAMPANHA.video.largura} height={CAMPANHA.video.altura} aria-label={T.videoRotulo}>
            <source src={CAMPANHA.video.src} type="video/mp4" />
            {T.videoSemSuporte} <a href={CAMPANHA.video.src}>{T.videoBaixar}</a>.
          </video>
          <figcaption className="ct-nota">{T.videoLegenda}</figcaption>
        </figure>

        {e.aberta
          ? (
            <section aria-labelledby="tcqc-como">
              <h2 id="tcqc-como" className="ct-h2">{T.comoTitulo}</h2>
              <ol className="ct-tcqc__passos" role="list">
                {T.passos.map((p, indice) => (
                  <li key={p.titulo}>
                    <IlustracaoPasso indice={indice} />
                    <div><strong className="ct-tcqc__passo-titulo">{p.titulo}</strong><p>{p.texto}</p></div>
                  </li>
                ))}
              </ol>
            </section>
          )
          : <p className="ct-lead">{T.encerradaNota}</p>}
      </div>

      <EnvioCarimboSicredi aberta={e.aberta} navigate={navigate} />

      <section className="ct-bloco ct-tcqc__escolha" aria-labelledby="tcqc-escolha">
        <h2 id="tcqc-escolha" className="ct-h2">{T.escolhaTitulo}</h2>
        <p className="ct-lead">{T.escolhaTexto}</p>
        <ul className="ct-tcqc__dados">
          {T.dados.map((d) => (
            <li key={d.rotulo}><b>{d.numero}</b><span>{d.rotulo}</span></li>
          ))}
        </ul>
      </section>

      <section className="ct-bloco" aria-labelledby="tcqc-separada">
        <div className="ct-tcqc__separada">
          <h2 id="tcqc-separada" className="ct-sub">{T.separadaTitulo}</h2>
          <p>{T.separadaTexto}</p>
          <div className="ct-acoes">
            <Botao tipo="secundario" href={CACA_CAMINHOS.central} navigate={navigate}>{T.separadaAcao}</Botao>
          </div>
        </div>
      </section>

      <section className="ct-bloco ct-tcqc__perfis" aria-labelledby="tcqc-perfis">
        <h2 id="tcqc-perfis" className="ct-sub">{T.perfisTitulo}</h2>
        <div className="ct-acoes">
          <Botao href={CAMPANHA.perfis.festival.url} {...EXTERNO}>{T.perfilFestival}<span className="ct-sr"> {T.novaAba}</span></Botao>
          <Botao tipo="secundario" href={CAMPANHA.perfis.sicredi.url} {...EXTERNO}>{T.perfilSicredi}<span className="ct-sr"> {T.novaAba}</span></Botao>
        </div>
      </section>
    </div>
  )
}
