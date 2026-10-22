import React from 'react'
import { Icone } from '../../Icone'
import { Carregando, Erro } from '../../ui'
import { textoPublicacao } from '../../../lib/edicaoMarca'

const FichaPrevia = React.lazy(() => import('./FichaPrevia.jsx'))

/*
 * O que falta, já traduzido (traduzirFaltando), cada item levando ao campo. Quando a falta é da OUTRA área
 * (Meu cadastro × Meu combo), `textoCompleto` diz onde ("Falta em Meu combo: …") e o botão leva até lá.
 */
export function ListaFaltando({ itens, onIr }) {
  if (!itens || !itens.length) return null
  return (
    <ul className="em-faltando">
      {itens.map((f, n) => (
        <li key={n}>
          {f.bloco !== null && onIr
            ? <button className="link" type="button" onClick={() => onIr(f)}>{f.textoCompleto || f.texto}<Icone nome="seta-direita" tamanho={16} /></button>
            : (f.textoCompleto || f.texto)}
        </li>
      ))}
    </ul>
  )
}

/*
 * Revisão antes de enviar (lib/edicaoMarca · revisaoPorArea): o que falta em cada área, lado a lado, com o
 * caminho até cada item — inclusive o que está na outra aba. É leitura: quem decide se pode enviar é o servidor.
 */
export function Revisao({ revisao, aberta, onToggle, onIr }) {
  return (
    <details className="ui-recolhe em-revisao" id="em-revisao" open={aberta} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary>
        <span>Revisar antes de enviar</span>
        <span className="em-revisao__resumo">{revisao.areas.map((a) => a.texto).join(' · ')}</span>
      </summary>
      <div className="em-revisao__corpo">
        {revisao.areas.map((a) => (
          <div className="em-revisao__area" key={a.chave} data-pronto={a.pronto ? 'sim' : 'nao'}>
            <p className="em-revisao__titulo">
              <Icone nome={a.pronto ? 'feito' : 'atencao'} tamanho={16} />
              <b>{a.rotulo}</b>
              <span>{a.pronto ? 'pronto' : a.faltam === 1 ? '1 informação falta' : a.faltam + ' informações faltam'}</span>
            </p>
            <ListaFaltando itens={a.itens} onIr={onIr} />
          </div>
        ))}
        <p className="nota em-revisao__nota">Esta lista é uma conferência. Ao enviar, o sistema confere de novo e mostra o que ainda faltar.</p>
      </div>
    </details>
  )
}

/* Estado da publicação (marca_minha_publicacao): o que está no ar, à parte da revisão. */
export function EstadoPublicacao({ pub }) {
  const t = textoPublicacao(pub)
  if (!t) return null
  return (
    <>
      <p className="em-publicacao" data-tom={t.tom} role="status">
        <Icone nome={t.tom === 'ok' ? 'sucesso' : t.tom === 'erro' ? 'alerta' : 'informacao'} tamanho={16} />
        <span>{t.texto}{t.link && <> <a href={t.link} target="_blank" rel="noopener noreferrer">Ver a página no site<Icone nome="link-externo" tamanho={16} /></a></>}</span>
      </p>
      {pub.alterado_apos_aprovacao && (
        <div className="aviso" role="note">
          Você alterou dados já aprovados. A versão publicada continua no ar até a organização revisar.
          Quando terminar, toque em <b>Enviar alterações</b>.
        </div>
      )}
    </>
  )
}

/*
 * Prévia: o JSON de marca_previa_publica (o mesmo montar_publico da
 * publicação, sem gravar versão) desenhado pela ficha do site. <dialog>
 * nativo: Esc fecha, fundo inerte, foco volta para quem abriu.
 */
export function Previa({ aberta, onFechar, carregar, traduzir, onIr }) {
  const ref = React.useRef(null)
  const [res, setRes] = React.useState({ estado: 'carregando' })
  React.useEffect(() => {
    const d = ref.current
    if (!d) return undefined
    if (!aberta) { if (d.open) d.close(); return undefined }
    if (!d.open) d.showModal()
    let vivo = true
    setRes({ estado: 'carregando' })
    carregar()
      .then((r) => { if (vivo) setRes({ estado: 'ok', previa: r && r.previa, faltando: (r && r.faltando) || [] }) })
      .catch((e) => { if (vivo && !(e && e.message === 'sessao_expirada')) setRes({ estado: 'erro', texto: e && e.message }) })
    return () => { vivo = false }
  }, [aberta]) // eslint-disable-line react-hooks/exhaustive-deps

  const fechar = () => ref.current && ref.current.close()
  const faltando = res.estado === 'ok' ? res.faltando.map(traduzir) : []
  return (
    <dialog ref={ref} className="em-previa" aria-labelledby="em-previa-titulo" onClose={onFechar}>
      <div className="em-previa__faixa">
        <p id="em-previa-titulo"><b>Prévia — ainda não publicada</b>
          <span>É assim que sua página aparece no site, com o que já está salvo.</span></p>
        <button className="og-btn og-btn--mini" type="button" onClick={fechar}><Icone nome="fechar" tamanho={16} />Fechar prévia</button>
      </div>
      {res.estado === 'carregando' && <Carregando linhas={5} texto="Montando a prévia…" />}
      {res.estado === 'erro' && <Erro titulo="Não consegui montar a prévia" texto={res.texto} />}
      {res.estado === 'ok' && (
        <>
          {faltando.length > 0 && (
            <div className="aviso em-previa__falta">
              <b>Para a página ir ao ar ainda falta:</b>
              <ListaFaltando itens={faltando} onIr={(f) => { fechar(); onIr(f) }} />
            </div>
          )}
          {res.previa
            ? <React.Suspense fallback={<Carregando linhas={5} texto="Montando a prévia…" />}><FichaPrevia p={res.previa} /></React.Suspense>
            : <Erro titulo="Ainda não há o que mostrar" texto="A participação não foi encontrada. Fale com a organização." />}
        </>
      )}
    </dialog>
  )
}
