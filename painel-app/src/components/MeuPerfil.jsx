import React from 'react'
import { Folha } from './Folha'
import { Avatar } from './Avatar'
import { Botao, Secao } from './ui'
import { avisar, confirmar } from './Confirmar'
import { AvisosAparelho } from './AvisosAparelho'
import { PUSH_ORGANIZACAO } from './AppNoAparelho'
import { rpc } from '../lib/rpc'
import { useEquipe, abrirFoto, gerarFoto, enviarFoto, removerFoto, areaRecorte } from '../lib/equipe'

const ERROS = {
  nome_invalido: 'O nome precisa ter de 2 a 60 caracteres.',
  nao_autorizado: 'Esta conta não pode fazer isso.',
  arquivo_nao_recebido: 'A foto não chegou ao servidor. Tente de novo.',
  arquivo_invalido: 'A foto foi recusada (tipo ou tamanho).',
  caminho_invalido: 'A foto foi recusada pelo servidor.',
  bucket_invalido: 'O servidor ainda não aceita fotos de perfil (falta publicar a função arquivo-url).',
}
const traduzir = (m) => {
  const t = String(m || '')
  for (const k of Object.keys(ERROS)) if (t.includes(k)) return ERROS[k]
  if (/function .* does not exist|Could not find the function/i.test(t)) return 'O servidor ainda não tem os perfis (falta aplicar a migration da equipe).'
  return t || 'Não deu certo. Tente de novo.'
}

/*
 * Escolher, enquadrar e salvar uma foto de perfil — o mesmo editor serve para
 * "Meu perfil" (a própria) e para Administração › Equipe (a de outra pessoa,
 * com acesso.gerir). O recorte é quadrado, sem esticar: zoom e posição só
 * escolhem QUAL quadrado da foto vira avatar. Prévia ao vivo no canvas.
 */
export function EditorFoto({ alvo, nome, proprio = false, temFoto = false, onMudou }) {
  const [bitmap, setBitmap] = React.useState(null)
  const [enq, setEnq] = React.useState({ zoom: 1, x: 0, y: 0 })
  const [ocupado, setOcupado] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const canvas = React.useRef(null)
  const input = React.useRef(null)
  const ids = React.useId()

  React.useEffect(() => () => { if (bitmap && bitmap.close) bitmap.close() }, [bitmap])
  React.useEffect(() => {
    const c = canvas.current
    if (!c || !bitmap) return
    const { sx, sy, lado } = areaRecorte(bitmap.width, bitmap.height, enq)
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, c.width, c.height)
  }, [bitmap, enq])

  async function escolher(e) {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    setErro(null)
    try {
      setBitmap(await abrirFoto(f))
      setEnq({ zoom: 1, x: 0, y: 0 })
    } catch (er) { setErro(er.message) }
  }
  async function salvar() {
    setOcupado(true)
    setErro(null)
    try {
      const blob = await gerarFoto(bitmap, enq)
      await enviarFoto(alvo, blob, { proprio })
      setBitmap(null)
      if (onMudou) await onMudou()
    } catch (er) { setErro(traduzir(er.message)) } finally { setOcupado(false) }
  }
  async function remover() {
    if (!(await confirmar('Remover a foto de perfil? No lugar dela aparecem as iniciais. A foto antiga não é apagada do servidor.', { acao: 'Remover foto' }))) return
    setOcupado(true)
    try { await removerFoto(alvo, { proprio }); if (onMudou) await onMudou() } catch (er) { setErro(traduzir(er.message)) } finally { setOcupado(false) }
  }
  const faixa = (chave, rotulo, min, max, passo) => (
    <label className="og-campo pf-faixa" htmlFor={ids + chave}>
      <span>{rotulo}</span>
      <input id={ids + chave} type="range" min={min} max={max} step={passo} value={enq[chave]}
        onChange={(e) => setEnq((x) => ({ ...x, [chave]: Number(e.target.value) }))} />
    </label>
  )
  return (
    <div className="pf-foto">
      {!bitmap && (
        <div className="pf-foto__atual">
          <Avatar id={alvo} rotulo={nome} tamanho={96} rotuloVisivel={false} />
          <div className="ui-linha-acoes">
            <Botao icone="camera" onClick={() => input.current && input.current.click()} disabled={ocupado}>{temFoto ? 'Trocar foto' : 'Escolher foto'}</Botao>
            {temFoto && <Botao variante="secundario" icone="excluir" onClick={remover} disabled={ocupado}>Remover foto</Botao>}
          </div>
        </div>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="ui-oculto" tabIndex={-1} aria-hidden="true" onChange={escolher} />
      {bitmap && (
        <div className="pf-recorte">
          <canvas ref={canvas} width={240} height={240} className="pf-recorte__previa" role="img" aria-label="Prévia da foto enquadrada" />
          <div className="pf-recorte__controles">
            <p className="ui-nota">Arraste os controles para enquadrar. O quadrado vira a foto — nada é esticado.</p>
            {faixa('zoom', 'Aproximar', 1, 4, 0.05)}
            {faixa('x', 'Esquerda ↔ direita', -1, 1, 0.02)}
            {faixa('y', 'Cima ↕ baixo', -1, 1, 0.02)}
            <div className="ui-linha-acoes">
              <Botao variante="destaque" icone="feito" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar foto'}</Botao>
              <Botao variante="secundario" onClick={() => setBitmap(null)} disabled={ocupado}>Cancelar</Botao>
            </div>
          </div>
        </div>
      )}
      {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
    </div>
  )
}

/*
 * Meu perfil (17/10/2026): consultar os próprios dados, trocar ou remover a
 * foto e editar o nome de exibição. Login, função, ativação e permissões
 * NÃO mudam aqui — são de quem administra a equipe.
 */
export function MeuPerfil({ aberto, onFechar, onSair }) {
  const { eu, recarregar } = useEquipe()
  const [nome, setNome] = React.useState('')
  const [salvando, setSalvando] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const idNome = React.useId()
  const idEu = eu ? eu.user_id : null
  React.useEffect(() => { if (aberto && eu) { setNome(eu.nome || ''); setErro(null) } }, [aberto, idEu]) // eslint-disable-line react-hooks/exhaustive-deps

  async function salvarNome(e) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      await rpc('meu_nome_definir', { p_nome: nome })
      await recarregar()
      avisar('Nome salvo. Os registros antigos continuam com o nome da época.')
    } catch (er) { setErro(traduzir(er.message)) } finally { setSalvando(false) }
  }

  return (
    <Folha aberto={aberto} titulo="Meu perfil" sub={eu ? eu.funcao_rotulo || 'Conta da equipe' : 'Acesso compartilhado'} onFechar={onFechar}>
      {!eu ? (
        <div className="ui-pilha">
          <p>Você entrou pela <b>senha compartilhada</b> do painel. Ela não é uma pessoa: o que for feito por ela aparece como “Acesso compartilhado” no histórico.</p>
          <p className="ui-nota">Para ter foto, nome e avisos próprios, peça a quem administra a equipe uma conta pessoal.</p>
        </div>
      ) : (
        <div className="ui-pilha">
          <Secao titulo="Foto">
            <EditorFoto alvo={eu.user_id} nome={eu.nome} proprio temFoto={!!eu.avatar_path} onMudou={recarregar} />
          </Secao>
          <Secao titulo="Nome de exibição" nota="É o nome que assina o que você faz no painel daqui para a frente.">
            <form className="pf-nome" onSubmit={salvarNome}>
              <label className="og-campo" htmlFor={idNome}>
                <span>Nome</span>
                <input id={idNome} value={nome} maxLength={60} autoComplete="name" onChange={(e) => setNome(e.target.value)} />
              </label>
              <Botao type="submit" disabled={salvando || nome.trim() === (eu.nome || '')}>{salvando ? 'Salvando…' : 'Salvar nome'}</Botao>
            </form>
            {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
          </Secao>
          <Secao titulo="Conta">
            <dl className="pf-dados">
              <div><dt>Login</dt><dd>{eu.login} <span className="ui-nota">(não muda com o nome)</span></dd></div>
              <div><dt>Função</dt><dd>{eu.funcao_rotulo || '—'}</dd></div>
              <div><dt>Situação</dt><dd>{eu.ativo ? 'Ativa' : 'Desativada'}</dd></div>
            </dl>
            <p className="ui-nota">Função, ativação e permissões são definidas por quem administra a equipe (Administração › Equipe).</p>
          </Secao>
          <Secao titulo="Avisos neste aparelho">
            <AvisosAparelho compacto explicacao="Receba os avisos das postagens e do painel mesmo com ele fechado." {...PUSH_ORGANIZACAO} />
          </Secao>
        </div>
      )}
      {/* No celular o "Sair" do topo cede lugar ao avatar: ele mora aqui. */}
      {onSair && <div className="ui-acoes pf-sair"><Botao variante="secundario" icone="sair" onClick={onSair}>Sair do painel</Botao></div>}
    </Folha>
  )
}
