import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataHoraCurta } from '../../lib/painelFormat'
import { traduzirErroPublicacao } from '../../lib/publicacao'
import {
  FILTROS_LOCALIZACAO, conferida, enderecoDaUnidade, linkEndereco, linkPonto, pontoTexto, lerPonto, filtrarLocalizacoes,
  contarLocalizacoes, tituloDaUnidade,
} from '../../lib/localizacoes'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, Selo, Modulo, GradeModulos, Escolha, Ajuda, traduzirErro } from '../ui'
import { useLeitura } from '../../lib/leituraVivaReact'

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

/*
 * Participantes › Localizações (28/10/2026, pedido do Wilker): uma fila só com as unidades da edição. O participante
 * preenche o endereço e não vê nada do mapa; aqui a administração abre o endereço no Google Maps, cola o ponto e
 * confirma. A gravação é a mesma da ficha (`org_verificar_coordenada`, `producao.gerir`); mudar o endereço no cadastro
 * volta a unidade para "a conferir" (o banco tira a conferência).
 */
function Linha({ u, podeConferir, aoConferir }) {
  const ok = conferida(u)
  const [texto, setTexto] = React.useState(pontoTexto(u))
  const [corrigindo, setCorrigindo] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const [enviando, setEnviando] = React.useState(false)
  const salvo = pontoTexto(u)

  async function confirmar(ev) {
    ev.preventDefault()
    setErro(null)
    const c = lerPonto(texto)
    if (c.erro) { setErro(c.erro); return }
    setEnviando(true)
    try {
      await rpc('org_verificar_coordenada', { p_secret: lerSenha(), p_unidade: u.unidade_id, p_lat: c.lat, p_lng: c.lng })
      setCorrigindo(false)
      await aoConferir(tituloDaUnidade(u))
    } catch (e) { setErro(traduzirErro(traduzirErroPublicacao(e && e.message))) } finally { setEnviando(false) }
  }

  return (
    <Modulo icone="local" titulo={tituloDaUnidade(u)} sub={enderecoDaUnidade(u) || 'Sem endereço'}
      status={ok ? <Selo tom="ok">Conferida</Selo> : <Selo tom="atencao">A conferir</Selo>}>
      <p className="ui-linha-acoes">
        <a className="og-link" href={linkEndereco(u)} target="_blank" rel="noreferrer">Abrir o endereço no Google Maps</a>
        {linkPonto(u) && <a className="og-link" href={linkPonto(u)} target="_blank" rel="noreferrer">Ver o ponto salvo</a>}
      </p>
      {ok && <p className="ui-nota">Conferida por {u.coordenada_verificada_por || 'organização'} em {dataHoraCurta(u.coordenada_verificada_em)}.</p>}
      {ok && podeConferir && !corrigindo && (
        <div className="ui-linha-acoes"><button type="button" className="og-btn og-btn--mini og-btn--vazado" onClick={() => setCorrigindo(true)}>Corrigir o ponto</button></div>
      )}
      {podeConferir && (!ok || corrigindo) && (
        <form className="ui-form" onSubmit={confirmar}>
          <label className="og-campo">
            <span>Ponto no mapa (latitude, longitude)</span>
            <input type="text" inputMode="decimal" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="-5.8123, -35.2012" />
          </label>
          <p className="ui-nota">
            {salvo
              ? 'Já existe um ponto salvo. Abra o endereço e o ponto salvo no Google Maps: se forem o mesmo lugar, confirme.'
              : 'No Google Maps, clique com o botão direito no ponto da loja, copie os números e cole aqui.'}
          </p>
          <div className="ui-linha-acoes">
            <button className="og-btn og-btn--mini" type="submit" disabled={enviando}>{salvo && texto.trim() === salvo ? 'Confirmar este ponto' : 'Confirmar localização'}</button>
            {corrigindo && <button type="button" className="og-btn og-btn--mini og-btn--vazado" onClick={() => { setCorrigindo(false); setTexto(salvo); setErro(null) }}>Cancelar</button>}
          </div>
        </form>
      )}
      {!podeConferir && <p className="ui-nota">Conferir a localização é da produção.</p>}
      {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
    </Modulo>
  )
}

export function ListaLocalizacoes({ edicao, pode }) {
  const [filtro, setFiltro] = React.useState('a_conferir')
  const [aviso, setAviso] = React.useState(null)
  // Relê sozinha quando a conferência, o endereço (cadastro/unidades) ou a marca mudam em qualquer aparelho.
  const leitura = useLeitura(
    async () => (await rpc('get_localizacoes_unidades', { p_secret: lerSenha(), p_edicao: edicao.codigo })) || [],
    ['unidades', 'publicacao', 'participantes', 'cadastro', 'edicao'], { chave: edicao.codigo },
  )
  const linhas = leitura.dados === undefined ? null : leitura.dados
  const erro = leitura.bloqueada ? leitura.erro : null
  const n = contarLocalizacoes(linhas)
  const lista = filtrarLocalizacoes(linhas, filtro)
  const podeConferir = pode('producao.gerir')

  async function aoConferir(nome) {
    setAviso('Localização de ' + nome + ' conferida.')
    try { await leitura.recarregar() } catch { /* a releitura que falha aparece no aviso da lista */ }
  }

  return (
    <div className="ui-pilha">
      <p className="ui-nota">
        <b>{n.aConferir} {n.aConferir === 1 ? 'unidade a conferir' : 'unidades a conferir'}</b> · {n.conferidas} {n.conferidas === 1 ? 'conferida' : 'conferidas'} · Edição {edicao.codigo}.
        {' '}O participante só preenche o endereço; o ponto no mapa é conferido aqui.
      </p>
      <Ajuda titulo="Como conferir">
        <p>1. Clique em “Abrir o endereço no Google Maps”: ele procura exatamente o endereço que o participante escreveu.</p>
        <p>2. Confira se o pino caiu na loja. Clique com o botão direito no ponto certo e copie os números (latitude e longitude).</p>
        <p>3. Cole no campo e clique em “Confirmar localização”. Se o endereço estiver errado, peça a correção pela ficha do participante (Mensagens ou “Cobrar pendências”): ao mudar o endereço, a unidade volta para “a conferir”.</p>
      </Ajuda>
      <div className="og-filtros">
        <Escolha rotulo="Mostrar" valor={filtro} onMudar={setFiltro}
          opcoes={FILTROS_LOCALIZACAO.map(([v, r]) => [v, r + ' (' + (v === 'a_conferir' ? n.aConferir : v === 'conferidas' ? n.conferidas : n.total) + ')'])} />
      </div>
      {aviso && <p className="ui-nota ui-nota--ok" role="status">{aviso}</p>}
      {erro && <Erro texto={erro} onTentar={leitura.recarregar} />}
      {leitura.falhouAtualizar && <Erro titulo="Não consegui atualizar" texto={leitura.erro} onTentar={leitura.recarregar} />}
      {!erro && linhas === null && <Carregando />}
      {!erro && linhas && linhas.length === 0 && <Vazio titulo="Nenhuma unidade nesta edição">As unidades aparecem aqui quando a marca tem unidade que participa da edição {edicao.codigo}.</Vazio>}
      {!erro && linhas && linhas.length > 0 && lista.length === 0 && (
        filtro === 'a_conferir'
          ? <Vazio titulo="Tudo conferido">Todas as unidades da edição já têm o ponto no mapa conferido.</Vazio>
          : <Vazio titulo="Nenhuma unidade nessa situação" />
      )}
      {!erro && lista.length > 0 && (
        <GradeModulos>
          {lista.map((u) => <Linha key={u.participacao_unidade_id} u={u} podeConferir={podeConferir} aoConferir={aoConferir} />)}
        </GradeModulos>
      )}
    </div>
  )
}
