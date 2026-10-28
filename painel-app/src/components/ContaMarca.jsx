import React from 'react'
import { api, auth, tokenVivo, recadoSenha, pushMarca } from '../lib/marcaApi'
import { CHAVE_SESSAO } from '../../../src/lib/marcaAccess'
import { Folha } from './Folha'
import { AplicativoENotificacoes } from './AppNoAparelho'
import { Secao } from './ui'
import { useSincronizar, useGuarda } from '../lib/sync/react'

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
    setSalvando(true)
    try {
      // Renova antes: com o painel aberto há mais de 1 h, o token guardado já venceu.
      const token = await tokenVivo(CHAVE_SESSAO)
      if (!token) { setAviso({ tom: 'erro', texto: 'Sua sessão expirou. Saia e entre de novo.' }); return }
      const r = await auth('user', { password: s1 }, 'PUT', token)
      if (!r.ok) { setAviso({ tom: 'erro', texto: recadoSenha(r) }); return }
      await api('rpc/marcar_senha_trocada', { metodo: 'POST', corpo: {} }).catch(() => null)
      // A senha antiga pode estar aberta em outro aparelho: encerra as outras sessões (esta segue).
      auth('logout?scope=others', null, 'POST', token).catch(() => { /* a senha nova já vale */ })
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

// `verComo`: o administrador vendo como a marca. O aparelho na mão é DELE — nada de ler a assinatura dele como se fosse
// da marca (o `conferir` falha ali e a tela diria "Ligados") nem de pedir permissão no aparelho dele.
export function ContaMarca({ aberto, onFechar, onSair, verComo = false }) {
  const [marca, setMarca] = React.useState(null)
  const guarda = useGuarda()
  // Nome da marca no cabeçalho da folha. Relê a cada abertura e, com a folha aberta, quando 'participantes'
  // muda (a organização renomeou a marca). Leitura que falha mantém o nome que já estava (antes zerava `marca`
  // e o push ficava sem a conta).
  const carregarMarca = React.useCallback(async () => {
    const vale = guarda()
    try {
      const l = await api('participantes?select=id,nome_marca&order=created_at.desc&limit=1')
      if (vale()) setMarca((l && l[0]) || null)
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      throw e
    }
  }, [guarda])
  React.useEffect(() => { if (aberto) carregarMarca().catch(() => {}) }, [aberto, carregarMarca])
  useSincronizar(['participantes'], carregarMarca, { ativo: !!aberto })

  const idMarca = marca && marca.id
  const push = React.useMemo(() => pushMarca(idMarca), [idMarca])

  return (
    <Folha aberto={aberto} titulo="Sua conta" sub={marca ? marca.nome_marca : 'Painel SCW · Participante'} onFechar={onFechar}>
      <div className="ui-pilha">
        {verComo ? (
          <Secao titulo="Aplicativo e notificações">
            <p className="ui-nota">No “Ver como”, esta parte fica de fora: ela é do aparelho da marca, não deste.</p>
          </Secao>
        ) : (
          <AplicativoENotificacoes papel="marca" push={marca ? push : null}
            explicacao="Ligue para saber na hora quando a organização mandar mensagem, fizer uma solicitação, publicar um arquivo ou marcar as fotos — mesmo com o painel fechado." />
        )}
        <Secao titulo="Alterar minha senha" nota="Mínimo 10 caracteres.">
          <AlterarSenha />
        </Secao>
        <Secao titulo="Sair" nota="Neste aparelho. Para entrar de novo, use o nome do estabelecimento e a sua senha.">
          <button className="og-btn og-btn--vazado" type="button" onClick={onSair}>Sair do painel</button>
        </Secao>
      </div>
    </Folha>
  )
}
