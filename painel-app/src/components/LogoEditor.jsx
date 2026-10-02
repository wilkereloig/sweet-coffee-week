import React from 'react'
import { Selo, LogoMarca, Botao, Carregando, Erro, traduzirErro } from './ui'
import { Icone } from './Icone'
import { validarLogo, validarVetor, caminhoLogo, mimeDe, urlLogo, extensao, ACEITA_EXIBICAO, ACEITA_VETOR } from '../lib/logos'
import { dataCurta } from '../lib/respostas'
import { confirmar } from './Confirmar'

/*
 * Logo do estabelecimento — o MESMO editor na ficha da organização e no Meu
 * cadastro da marca (29/09/2026). Quem muda é o `adaptador`:
 *   carregar() → logo_info · subir(path, blob, mime) · definir(dados) ·
 *   usarAcervo() · manter()? · restaurar(id)? · remover()?
 * Fluxo: escolher → conferir (prévia local, nada sobe antes) → confirmar.
 */
const ORIGEM = {
  participante: 'Enviada pela marca',
  organizacao: 'Adicionada pela organização',
  acervo: 'Recuperada do acervo do festival',
  edicao_anterior: 'Importada de edição anterior',
}
const RECADO = {
  logo_caminho_invalido: 'O arquivo não foi para a pasta desta marca. Tente de novo.',
  sem_sugestao: 'Não há logo desta marca no acervo.',
  sem_logo: 'Ainda não há logo para manter.',
  sem_marca: 'Sua conta não está ligada a uma marca. Fale com a organização.',
}
const erroLegivel = (e) => {
  const m = String((e && e.message) || e || '')
  for (const [k, v] of Object.entries(RECADO)) if (m.includes(k)) return v
  return traduzirErro(m)
}

// Lê largura/altura de raster e o texto de SVG, para validar antes de subir.
function inspecionar(file) {
  return new Promise((resolve) => {
    if (extensao(file.name) === 'svg') {
      file.text().then((t) => resolve({ textoSvg: t })).catch(() => resolve({}))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { resolve({ largura: img.naturalWidth, altura: img.naturalHeight }); URL.revokeObjectURL(url) }
    img.onerror = () => { resolve({ quebrada: true }); URL.revokeObjectURL(url) }
    img.src = url
  })
}

export function LogoEditor({ participanteId, nomeMarca, adaptador, podeEditar = true, modo = 'org', onMudou }) {
  const [info, setInfo] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [ocupado, setOcupado] = React.useState(false)
  const [escolha, setEscolha] = React.useState(null) // { file, url, meta, vetor }
  const [enviando, setEnviando] = React.useState(false) // mostra o seletor
  const inputRef = React.useRef(null)

  const carregar = React.useCallback(async () => {
    try { setInfo(await adaptador.carregar()); setErro(null) } catch (e) { setErro(erroLegivel(e)) }
  }, [adaptador])
  React.useEffect(() => { carregar() }, [carregar])
  // Revoga a prévia só quando ELA muda (anexar o vetor não troca a imagem).
  const urlPrevia = escolha && escolha.url
  React.useEffect(() => () => { if (urlPrevia) URL.revokeObjectURL(urlPrevia) }, [urlPrevia])

  // `texto` pode depender do estado novo (logo guardada sem participação aberta
  // não está "valendo", e a tela não pode dizer que está).
  async function depois(texto) {
    setEscolha(null); setEnviando(false)
    let novo = null
    try { novo = await adaptador.carregar(); setInfo(novo); setErro(null) } catch (e) { setErro(erroLegivel(e)) }
    setAviso({ ok: true, texto: typeof texto === 'function' ? texto(novo) : texto })
    if (onMudou) onMudou()
  }
  async function executar(fn, texto) {
    setOcupado(true); setAviso(null)
    try { await fn(); await depois(texto) } catch (e) { setAviso({ texto: erroLegivel(e) }) } finally { setOcupado(false) }
  }

  async function aoEscolher(file) {
    if (!file) return
    setAviso(null)
    const meta = await inspecionar(file)
    if (meta.quebrada) { setAviso({ texto: 'Não consegui abrir essa imagem. Confira o arquivo.' }); return }
    const problema = validarLogo({ nome: file.name, tamanho: file.size, ...meta })
    if (problema) { setAviso({ texto: problema }); return }
    setEscolha({ file, url: URL.createObjectURL(file), meta, vetor: null })
  }
  async function aoEscolherVetor(file) {
    if (!file) return
    const textoSvg = extensao(file.name) === 'svg' ? await file.text().catch(() => '') : undefined
    const problema = validarVetor({ nome: file.name, tamanho: file.size, textoSvg })
    if (problema) { setAviso({ texto: problema }); return }
    setEscolha((e) => ({ ...e, vetor: file }))
  }

  function confirmar() {
    const { file, meta, vetor } = escolha
    return executar(async () => {
      const path = caminhoLogo(participanteId, file.name, 'logo')
      const mime = mimeDe(file.name)
      await adaptador.subir(path, new Blob([file], { type: mime }), mime)
      let dadosVetor = {}
      if (vetor) {
        const pv = caminhoLogo(participanteId, vetor.name, 'vetor')
        const mv = mimeDe(vetor.name, true)
        await adaptador.subir(pv, new Blob([vetor], { type: mv }), mv)
        dadosVetor = { path_vetor: pv, mime_vetor: mv, nome_vetor: vetor.name }
      }
      await adaptador.definir({ path, mime, nome_original: file.name, tamanho: file.size, largura: meta.largura || null, altura: meta.altura || null, ...dadosVetor })
    }, (novo) => (novo && novo.estado !== 'confirmada'
      ? 'Logo guardada. Ela passa a valer na edição quando sua participação for aberta.'
      : modo === 'marca' ? 'Logo enviada e já valendo. A organização foi avisada e pode pedir ajuste.' : 'Logo confirmada. Ela já aparece no painel.'))
  }

  // O alvo `#campo-logo` existe desde o primeiro render: "Enviar logo" rola
  // até aqui antes de a RPC responder.
  if (erro) return <div className="ui-logo-editor" id="campo-logo" tabIndex={-1}><Erro texto={erro} onTentar={carregar} /></div>
  if (!info) return <div className="ui-logo-editor" id="campo-logo" tabIndex={-1}><Carregando linhas={2} /></div>

  const atual = info.atual
  const sug = info.sugestao
  const estado = info.estado
  const usadaEm = (atual && atual.usada_em) || []

  return (
    <div className="ui-logo-editor" id="campo-logo" tabIndex={-1}>
      {/* Sempre montado: "Trocar arquivo" da prévia também usa este campo. */}
      <input ref={inputRef} className="ui-oculto" type="file" accept={ACEITA_EXIBICAO} tabIndex={-1} aria-hidden="true" onChange={(e) => { aoEscolher(e.target.files[0]); e.target.value = '' }} />
      <div className="ui-logo-editor__topo">
        <LogoMarca url={urlLogo(atual && atual.path)} nome={nomeMarca} tamanho={96} />
        <div className="ui-logo-editor__texto">
          <Selo dominio="logo" valor={estado} />
          {atual ? (
            <p className="ui-nota">
              {ORIGEM[atual.origem] || 'Arquivo da marca'}{atual.criado_em ? ' em ' + dataCurta(atual.criado_em) : ''}
              {modo === 'org' && atual.criado_por_rotulo ? ' · por ' + atual.criado_por_rotulo : ''}
              {atual.nome_original ? ' · ' + atual.nome_original : ''}
              {usadaEm.length ? ' · usada em ' + usadaEm.join(', ') : ''}
              {atual.path_vetor ? ' · com versão vetorial' : ''}
            </p>
          ) : <p className="ui-nota">{modo === 'marca' ? 'Você ainda precisa enviar a logo oficial da sua marca em alta resolução.' : 'Nenhuma logo definida para esta marca.'}</p>}
        </div>
      </div>

      {/* Acervo: não pedir upload de novo quando o festival já tem o arquivo. */}
      {!escolha && estado === 'acervo' && sug && (
        <div className="ui-bloco-interno ui-logo-editor__sugestao">
          <LogoMarca url={urlLogo(sug.path)} nome={sug.nome} tamanho={64} />
          <div>
            <b>Logo encontrada no acervo</b>
            <p className="ui-nota">Arquivo que o festival já usa para {sug.nome}.</p>
            {podeEditar && <div className="ui-acoes">
              <Botao icone="feito" disabled={ocupado} onClick={() => executar(adaptador.usarAcervo, 'Logo do acervo confirmada.')}>Usar esta logo</Botao>
              <Botao icone="baixar" variante="secundario" onClick={() => setEnviando(true)}>Enviar outro arquivo</Botao>
            </div>}
          </div>
        </div>
      )}

      {/* Recorrente: a logo da edição passada está pronta para ser mantida. */}
      {!escolha && estado === 'anterior' && podeEditar && (
        <div className="ui-bloco-interno">
          <b>{usadaEm.length ? 'Arquivo utilizado na edição ' + usadaEm[usadaEm.length - 1] : 'Logo da sua marca'}</b>
          <p className="ui-nota">Mesma logo? Confirme ou envie a nova.</p>
          <div className="ui-acoes">
            <Botao icone="feito" disabled={ocupado} onClick={() => executar(adaptador.manter || (() => adaptador.restaurar(atual.id)), 'Logo mantida para esta edição.')}>Manter esta logo</Botao>
            <Botao icone="baixar" variante="secundario" onClick={() => setEnviando(true)}>Enviar uma nova versão</Botao>
          </div>
        </div>
      )}

      {!escolha && podeEditar && (estado === 'nao_enviada' || enviando || estado === 'confirmada') && (
        <div className={estado === 'confirmada' && !enviando ? 'ui-acoes' : 'ui-bloco-interno ui-logo-editor__envio'}>
          {(estado !== 'confirmada' || enviando) && (
            <>
              <b>Envie sua logo em alta resolução</b>
              <p className="ui-nota">SVG ou PNG com fundo transparente. Nada de print ou foto.</p>
            </>
          )}
          <div className="ui-acoes">
            <Botao icone="imagem" variante={estado === 'confirmada' && !enviando ? 'secundario' : undefined} onClick={() => inputRef.current && inputRef.current.click()}>
              {estado === 'confirmada' ? 'Trocar logo' : 'Selecionar arquivo'}
            </Botao>
            {enviando && <Botao variante="secundario" onClick={() => setEnviando(false)}>Cancelar</Botao>}
            {modo === 'org' && atual && <a className="og-btn og-btn--mini og-btn--vazado" href={urlLogo(atual.path)} target="_blank" rel="noreferrer" download><Icone nome="baixar" tamanho={16} />Baixar</a>}
          </div>
        </div>
      )}

      {/* Prévia: nada sobe antes de a pessoa ver o arquivo certo. */}
      {escolha && (
        <div className="ui-bloco-interno ui-logo-editor__previa">
          <b>Pré-visualização</b>
          <div className="ui-logo-editor__topo">
            <LogoMarca url={escolha.url} nome={nomeMarca} tamanho={96} />
            <p className="ui-nota">{escolha.file.name}{escolha.meta.largura ? ' · ' + escolha.meta.largura + '×' + escolha.meta.altura + 'px' : ''}</p>
          </div>
          <label className="og-campo"><span>Versão vetorial <em>(opcional: PDF, EPS ou AI)</em></span>
            <input type="file" accept={ACEITA_VETOR} onChange={(e) => aoEscolherVetor(e.target.files[0])} />
          </label>
          <div className="ui-acoes">
            <Botao icone="feito" variante="destaque" disabled={ocupado} onClick={confirmar}>{ocupado ? 'Enviando…' : 'Confirmar logo'}</Botao>
            <Botao icone="imagem" variante="secundario" disabled={ocupado} onClick={() => inputRef.current && inputRef.current.click()}>Trocar arquivo</Botao>
            <Botao variante="secundario" disabled={ocupado} onClick={() => setEscolha(null)}>Cancelar</Botao>
          </div>
        </div>
      )}

      {aviso && <p className={'ui-nota ' + (aviso.ok ? 'ui-nota--ok' : 'ui-nota--erro')} role={aviso.ok ? 'status' : 'alert'}>{aviso.texto}</p>}

      {/* Histórico de versões: nenhuma é apagada. Restaurar e remover são da organização. */}
      {(info.versoes || []).length > 1 && (
        <details className="ui-recolhe">
          <summary>{modo === 'marca' ? 'Suas versões anteriores' : 'Versões anteriores'} ({info.versoes.length - 1})</summary>
          <ul className="ui-lista-simples">
            {info.versoes.filter((v) => !atual || v.id !== atual.id).map((v) => (
              <li key={v.id} className="ui-logo-editor__versao">
                <LogoMarca url={urlLogo(v.path)} nome={nomeMarca} tamanho={40} />
                <span>{ORIGEM[v.origem]} · {dataCurta(v.criado_em)}{modo === 'org' && v.criado_por_rotulo ? ' · ' + v.criado_por_rotulo : ''}{v.edicao_codigo ? ' · edição ' + v.edicao_codigo : ''}</span>
                {podeEditar && adaptador.restaurar && <Botao icone="historico" variante="secundario" disabled={ocupado} onClick={() => executar(() => adaptador.restaurar(v.id), 'Versão restaurada como logo oficial.')}>Usar esta versão</Botao>}
              </li>
            ))}
          </ul>
        </details>
      )}
      {modo === 'org' && podeEditar && atual && adaptador.remover && (
        <p><button type="button" className="ui-link" disabled={ocupado} onClick={async () => await confirmar('Remover a logo oficial? O arquivo fica no histórico e pode ser restaurado.') && executar(adaptador.remover, 'Logo removida. Ela continua no histórico de versões.')}>Remover logo oficial</button></p>
      )}
    </div>
  )
}
