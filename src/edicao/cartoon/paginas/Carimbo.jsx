/*
 * Caça aos Carimbos — a página que o QR abre (docs/cartoon-2026-2/14 §14.3 e §14.14):
 *   /cartoon/carimbo/<código da unidade>  QR do balcão (8 caracteres);
 *   /cartoon/carimbo/<slug da casa>        QR do display de mesa (/q/d1-<casa>): mostra "Ver o combo" e "Carimbar",
 *                                          e o banco escolhe a unidade da casa mais perto do celular.
 * Sem mapa no aparelho: começa um (sem senha) ou cola o link pessoal. Com mapa: um toque pede a posição e carimba.
 * Primeira vez na casa = carimbo PENDENTE até avaliar o combo (Wilker, 04/11). Regras e limites são do banco
 * (`mapa_carimbar` / `mapa_carimbar_casa`); aqui só se pede, mostra e explica.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { Link, Logo } from '../../componentes/base.jsx'
import * as C from '../../rota/carimbo.js'

const pontos = (n) => `${n} ${n === 1 ? 'ponto' : 'pontos'}`
const SLUG_CASA = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const COMO_LIGAR = [
  ['No iPhone', 'Ajustes › Privacidade e Segurança › Serviços de Localização › Safari (ou o navegador que você usa) › "Durante o Uso".'],
  ['No Android', 'toque no cadeado ao lado do endereço do site › Permissões › Localização › Permitir.'],
]

export function GuardarMapa ({ chave }) {
  const [copiado, setCopiado] = React.useState(false)
  const link = C.linkDoMapa(globalThis.location?.origin || '', chave)
  const zap = `https://wa.me/?text=${encodeURIComponent(`Meu Mapa da Doçura. Guardo este link para não perder meus carimbos: ${link}`)}`
  const copiar = async () => {
    try { await navigator.clipboard.writeText(link); setCopiado(true) } catch { setCopiado(false) }
  }
  return (
    <div className="ct-carimbar__guardar">
      <p className="ct-sub">Guarde seu mapa</p>
      <p className="ct-nota">Seus carimbos ficam neste aparelho. Mande o link para você mesmo: com ele, o mapa abre em qualquer celular.</p>
      <div className="ct-acoes">
        <a className="ct-botao" href={zap} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a>
        <button type="button" className="ct-botao ct-botao--contorno" onClick={copiar}>{copiado ? 'Link copiado' : 'Copiar o link'}</button>
      </div>
      <p className="ct-sr" aria-live="polite">{copiado ? 'Link copiado.' : ''}</p>
    </div>
  )
}

function ComecarMapa ({ aoAbrir }) {
  const [f, setF] = React.useState({ apelido: '', email: '', whatsapp: '', ranking: false, aceite: false })
  const [erro, setErro] = React.useState('')
  const [enviando, setEnviando] = React.useState(false)
  const [colado, setColado] = React.useState('')
  const [erroLink, setErroLink] = React.useState('')
  const muda = (k, v) => setF((x) => ({ ...x, [k]: v }))

  async function criar (e) {
    e.preventDefault()
    setEnviando(true); setErro('')
    try {
      const r = await C.chamar('mapa_criar', {
        p_edicao: EDICAO.codigo, p_apelido: f.apelido, p_email: f.email, p_whatsapp: f.whatsapp || null, p_ranking: f.ranking, p_aceite: f.aceite,
      })
      if (!C.chaveValida(r?.chave)) throw new Error('resposta')
      C.gravarChave(EDICAO.codigo, r.chave) // sem storage, o mapa segue nesta visita; o link pessoal salva o resto
      aoAbrir(r.chave, true)
    } catch (err) { setErro(C.mensagemCriar(err.message)) } finally { setEnviando(false) }
  }
  function abrirPeloLink (e) {
    e.preventDefault()
    const t = colado.trim(); const i = t.indexOf('#')
    const chave = C.chaveDoHash(i >= 0 ? t.slice(i) : `#mapa=${t}`)
    if (!chave) { setErroLink('Esse não parece o link do seu mapa. Ele termina com #mapa= e uma sequência de letras.'); return }
    C.gravarChave(EDICAO.codigo, chave)
    aoAbrir(chave, false)
  }

  return (
    <>
      <form className="ct-form ct-carimbar__form" onSubmit={criar} noValidate aria-labelledby="mapa-novo">
        <p id="mapa-novo" className="ct-sub">Primeira vez? Comece seu mapa</p>
        <p className="ct-nota">Sem senha e sem cadastro longo. Leva meio minuto.</p>
        <label className="ct-campo"><span>Apelido (aparece no ranking, se você quiser)</span>
          <input type="text" autoComplete="nickname" value={f.apelido} maxLength={24} onChange={(e) => muda('apelido', e.target.value)} required />
        </label>
        <label className="ct-campo"><span>E-mail</span>
          <input type="email" autoComplete="email" value={f.email} maxLength={160} onChange={(e) => muda('email', e.target.value)} required />
          <small>É com ele que você avalia os combos e ganha os pontos extras.</small>
        </label>
        <label className="ct-campo"><span>WhatsApp (opcional, para avisar se você ganhar)</span>
          <input type="tel" autoComplete="tel" inputMode="tel" value={f.whatsapp} maxLength={20} onChange={(e) => muda('whatsapp', e.target.value)} />
        </label>
        <label className="ct-check"><input type="checkbox" checked={f.ranking} onChange={(e) => muda('ranking', e.target.checked)} /> Quero aparecer no ranking</label>
        <label className="ct-check">
          <input type="checkbox" checked={f.aceite} onChange={(e) => muda('aceite', e.target.checked)} required />
          <span>Li e aceito o <a href={`${EDICAO.caminho}/regulamento`} target="_blank" rel="noopener">regulamento</a></span>
        </label>
        {erro && <p className="ct-aviso" role="alert">{erro}</p>}
        <div className="ct-acoes"><button type="submit" className="ct-botao" disabled={enviando}>{enviando ? 'Criando…' : 'Começar e carimbar'}</button></div>
      </form>

      <details className="ct-carimbar__ja-tenho">
        <summary>Já tenho mapa: abrir pelo meu link</summary>
        <form onSubmit={abrirPeloLink} noValidate>
          <label className="ct-campo"><span>Cole aqui o link do seu mapa</span>
            <input type="url" value={colado} onChange={(e) => { setColado(e.target.value); setErroLink('') }} />
          </label>
          {erroLink && <p className="ct-aviso" role="alert">{erroLink}</p>}
          <div className="ct-acoes"><button type="submit" className="ct-botao ct-botao--contorno">Abrir meu mapa</button></div>
        </form>
      </details>
    </>
  )
}

export function Carimbo ({ codigo, navigate, dados }) {
  const porUnidade = C.FORMATO_QR.test(codigo || '')
  const porCasa = !porUnidade && SLUG_CASA.test(codigo || '')
  const valido = porUnidade || porCasa
  const [chave, setChave] = React.useState(() => C.lerChave(EDICAO.codigo))
  const [estado, setEstado] = React.useState('pronto') // pronto · carimbando · ok · recusa
  const [r, setR] = React.useState(null)
  const [novo, setNovo] = React.useState(false)
  const [mapa, setMapa] = React.useState(null)
  const titulo = React.useRef(null)
  const casa = (dados?.participantes || []).find((p) => p.slug === (r?.slug || (porCasa ? codigo : null)))?.casa

  React.useEffect(() => { if (estado === 'ok' || estado === 'recusa') titulo.current?.focus() }, [estado])

  async function carimbar (k = chave) {
    setEstado('carimbando'); setR(null)
    const pos = await C.pedirPosicao()
    try {
      const onde = { p_lat: pos.lat ?? null, p_lng: pos.lng ?? null, p_precisao: pos.precisao ?? null }
      const resp = porCasa
        ? await C.chamar('mapa_carimbar_casa', { p_chave: k, p_slug: codigo, ...onde })
        : await C.chamar('mapa_carimbar', { p_chave: k, p_qr: codigo, ...onde })
      if (resp?.motivo === 'mapa_desconhecido') { C.apagarChave(EDICAO.codigo); setChave(null); setEstado('pronto'); return }
      setR(resp?.motivo === 'sem_localizacao' ? { ...resp, posicao: pos.erro } : resp)
      setEstado(resp?.ok ? 'ok' : 'recusa')
      if (resp?.ok) C.chamar('mapa_ler', { p_chave: k }).then(setMapa).catch(() => {})
    } catch { setR({ motivo: 'rede' }); setEstado('recusa') }
  }
  function abrir (k, criado) { setChave(k); setNovo(criado); carimbar(k) }
  const avaliar = () => navigate(C.prepararAvaliacao({ caminho: EDICAO.caminho, slug: r.slug, unidade: r.unidade, mapa }))

  const links = (
    <div className="ct-acoes">
      <Link href={`${EDICAO.caminho}/minha-rota?painel=album`} navigate={navigate} className="ct-botao ct-botao--contorno">Ver meu mapa</Link>
      <Link href={`${EDICAO.caminho}/participantes`} navigate={navigate} className="ct-botao ct-botao--contorno">Ver as casas</Link>
    </div>
  )

  if (!valido) {
    const m = C.mensagemRecusa({ motivo: 'qr_invalido' })
    return (
      <section className="ct-bloco ct-carimbar">
        <p className="ct-rotulo">Caça aos Carimbos</p>
        <h1 className="ct-h1">{m.titulo}</h1>
        <p className="ct-lead">{m.texto}</p>
        {links}
      </section>
    )
  }

  if (estado === 'ok') {
    const nome = casa?.nome || 'a casa'
    return (
      <section className="ct-bloco ct-carimbar ct-carimbar--ok">
        <p className="ct-rotulo">Caça aos Carimbos</p>
        <h1 ref={titulo} tabIndex={-1} className="ct-h1">{r.avaliou ? 'Carimbado! +1' : 'Carimbo pendente'}</h1>
        <div className="ct-carimbar__casa">
          {casa && <Logo casa={casa} tamanho={88} />}
          <p className="ct-lead">
            {r.primeira ? `Primeira visita na ${nome}.` : `Mais uma visita na ${nome}.`}
            {r.avaliou ? ` Você tem ${pontos(r.pontos)}.` : ' Falta um passo para o carimbo valer.'}
          </p>
        </div>
        {!r.avaliou && (
          <div className="ct-carimbar__avaliar">
            <p className="ct-sub">Avalie o combo para validar</p>
            <p className="ct-nota">O carimbo da {nome} conta depois da avaliação do combo, feita com o mesmo e-mail do seu mapa. Avaliou, ele vale e a casa ainda dá +2 pontos.</p>
            <div className="ct-acoes"><button type="button" className="ct-botao" onClick={avaliar}>Avaliar o combo e validar</button></div>
          </div>
        )}
        {novo && <GuardarMapa chave={chave} />}
        {links}
      </section>
    )
  }

  if (estado === 'recusa') {
    const m = r?.motivo === 'rede'
      ? { titulo: 'Sem conexão agora', texto: 'Confira a internet do celular e tente de novo.' }
      : C.mensagemRecusa(r, { casa: casa?.nome })
    const deNovo = ['longe', 'sem_localizacao', 'rede'].includes(r?.motivo)
    return (
      <section className="ct-bloco ct-carimbar">
        <p className="ct-rotulo">Caça aos Carimbos</p>
        <h1 ref={titulo} tabIndex={-1} className="ct-h1">{m.titulo}</h1>
        <p className="ct-lead">{m.texto}</p>
        {r?.motivo === 'sem_localizacao' && (
          <ul className="ct-carimbar__como">
            {COMO_LIGAR.map(([onde, passos]) => <li key={onde}><strong>{onde}:</strong> {passos}</li>)}
          </ul>
        )}
        {deNovo && <div className="ct-acoes"><button type="button" className="ct-botao" onClick={() => carimbar()}>Tentar de novo</button></div>}
        {novo && <GuardarMapa chave={chave} />}
        {links}
      </section>
    )
  }

  return (
    <section className="ct-bloco ct-carimbar">
      <p className="ct-rotulo">Caça aos Carimbos</p>
      <h1 className="ct-h1">{porCasa && casa ? casa.nome : 'Carimbe sua visita'}</h1>
      {porCasa && casa && <div className="ct-carimbar__casa"><Logo casa={casa} tamanho={88} /></div>}
      <p className="ct-lead">Comeu o combo? Carimbe e junte pontos para os vouchers e o prêmio final. Na primeira vez na casa, avalie o combo para o carimbo valer.</p>
      {porCasa && (
        <div className="ct-acoes">
          <Link href={`${EDICAO.caminho}/participantes/${codigo}`} navigate={navigate} className="ct-botao ct-botao--contorno">Ver o combo</Link>
        </div>
      )}
      {chave
        ? (
          <>
            <div className="ct-acoes">
              <button type="button" className="ct-botao ct-carimbar__principal" onClick={() => carimbar()} disabled={estado === 'carimbando'}>
                {estado === 'carimbando' ? 'Conferindo…' : 'Carimbar aqui'}
              </button>
            </div>
            <p className="ct-nota">O celular pede a sua localização só agora, para conferir que você está na casa. Ela não é guardada.</p>
          </>
          )
        : <ComecarMapa aoAbrir={abrir} />}
      <p className="ct-sr" aria-live="polite">{estado === 'carimbando' ? 'Conferindo o carimbo.' : ''}</p>
      <p className="ct-nota"><Link href={`${EDICAO.caminho}/regulamento`} navigate={navigate}>Regulamento do Mapa da Doçura</Link></p>
    </section>
  )
}
