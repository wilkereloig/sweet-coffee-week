import React from 'react'
import { api, auth } from '../lib/marcaApi'
import { CHAVE_SESSAO } from '../../../src/lib/marcaAccess'
import { Folha } from './Folha'
import { AvisosAparelho } from './AvisosAparelho'
import { Secao } from './ui'

/*
 * Conta da marca (reestruturação 29/09/2026, etapa 7): o que é da PESSOA no
 * aparelho, não do festival — avisos neste aparelho e sair. Morava dentro de
 * Arquivos, onde ninguém procuraria.
 *
 * A assinatura do push grava pela tabela, sob RLS. O endpoint é UNIQUE e
 * `update` está revogado de propósito — não dá upsert: apaga a linha antiga
 * deste endpoint (a RLS só deixa apagar o que é desta marca) e insere.
 */
// Trocar a própria senha a qualquer hora (29/09/2026). Mesmo caminho do
// primeiro acesso (DefinirSenha): o Supabase Auth guarda só o hash.
function AlterarSenha() {
  const [s1, setS1] = React.useState('')
  const [s2, setS2] = React.useState('')
  const [salvando, setSalvando] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  async function enviar(ev) {
    ev.preventDefault()
    setAviso(null)
    if (s1.length < 10) { setAviso({ tom: 'erro', texto: 'A senha precisa de pelo menos 10 caracteres.' }); return }
    if (s1 !== s2) { setAviso({ tom: 'erro', texto: 'As duas senhas não são iguais.' }); return }
    let sessao = null
    try { sessao = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || 'null') } catch { /* sessão ilegível */ }
    setSalvando(true)
    try {
      const r = await auth('user', { password: s1 }, 'PUT', sessao && sessao.access_token)
      if (!r.ok) { setAviso({ tom: 'erro', texto: (r.dados && r.dados.msg) || 'Não deu para trocar a senha agora.' }); return }
      await api('rpc/marcar_senha_trocada', { metodo: 'POST', corpo: {} }).catch(() => null)
      setS1(''); setS2('')
      setAviso({ tom: 'ok', texto: 'Senha alterada.' })
    } catch {
      setAviso({ tom: 'erro', texto: 'Não deu para trocar a senha agora.' })
    } finally {
      setSalvando(false)
    }
  }
  return (
    <form className="ui-form" onSubmit={enviar}>
      <label className="og-campo"><span>Nova senha</span><input type="password" autoComplete="new-password" minLength={10} value={s1} onChange={(e) => setS1(e.target.value)} /></label>
      <label className="og-campo"><span>Repita a nova senha</span><input type="password" autoComplete="new-password" minLength={10} value={s2} onChange={(e) => setS2(e.target.value)} /></label>
      <button className="og-btn og-btn--mini" type="submit" disabled={salvando || !s1 || !s2}>{salvando ? 'Salvando…' : 'Alterar senha'}</button>
      {aviso && <p className={'ui-nota' + (aviso.tom === 'erro' ? ' ui-nota--erro' : '')} role={aviso.tom === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p>}
    </form>
  )
}

export function ContaMarca({ aberto, onFechar, onSair }) {
  const [marca, setMarca] = React.useState(null)
  React.useEffect(() => {
    if (!aberto || marca) return
    api('participantes?select=id,nome_marca&order=created_at.desc&limit=1')
      .then((l) => setMarca((l && l[0]) || null)).catch(() => setMarca(null))
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  async function registrar(a) {
    if (!marca) throw new Error('Sua conta ainda não está ligada a uma marca.')
    await api('push_subscriptions?endpoint=eq.' + encodeURIComponent(a.endpoint), { metodo: 'DELETE' }).catch(() => null)
    await api('push_subscriptions', {
      metodo: 'POST',
      prefer: 'return=minimal',
      corpo: { papel: 'marca', participante_id: marca.id, endpoint: a.endpoint, p256dh: a.p256dh, auth_chave: a.auth, user_agent: a.userAgent },
    })
  }
  const remover = (endpoint) => api('push_subscriptions?endpoint=eq.' + encodeURIComponent(endpoint), { metodo: 'DELETE' })

  return (
    <Folha aberto={aberto} titulo="Sua conta" sub={marca ? marca.nome_marca : 'Painel SCW · Participante'} onFechar={onFechar}>
      <div className="ui-pilha">
        <Secao titulo="Avisos neste aparelho" nota="Aviso é por aparelho: ligue em cada celular ou computador que você usa.">
          <AvisosAparelho
            explicacao="Ligue para saber na hora quando a organização mandar mensagem, fizer um pedido, publicar um arquivo ou marcar as fotos — mesmo com o painel fechado."
            registrar={registrar}
            remover={remover}
          />
        </Secao>
        <Secao titulo="Alterar minha senha" nota="Pelo menos 10 caracteres. Esqueceu a senha? Peça uma nova à organização pelo WhatsApp.">
          <AlterarSenha />
        </Secao>
        <Secao titulo="Sair" nota="Neste aparelho. Para entrar de novo, use o nome do estabelecimento e a sua senha.">
          <button className="og-btn og-btn--vazado" type="button" onClick={onSair}>Sair do painel</button>
        </Secao>
      </div>
    </Folha>
  )
}
