import React from 'react'
import { rpc, chamarFuncao } from '../lib/rpc'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess'
import { ativarVerComo } from '../lib/marcaApi'
export { verComoDaUrl } from '../lib/marcaApi'
import { PainelMarcaShell } from './PainelMarcaShell'
import { Icone } from './Icone'

/*
 * "Ver como participante" (22/10/2026, pedido do Wilker). Aberto da ficha da marca (Mais ações), numa aba nova:
 * /painel/?ver_como=<participante>. Usa a conta pessoal do administrador — a sessão da marca nem existe aqui.
 * O banco confere e registra (org_ver_como_iniciar), lê como a marca (org_ver_como_ler) e o marcaApi bloqueia
 * toda gravação. Migration 20261104_ver_como_participante.sql.
 */
const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }

const RECADOS = {
  nao_autorizado: 'Só administrador pode ver o painel como a marca.',
  sem_conta: 'Esta marca ainda não tem acesso ao painel. Crie o acesso na ficha, em Gestão › Acesso.',
}

export function VerComoParticipante({ id, vistas }) {
  const [estado, setEstado] = React.useState({ fase: 'abrindo' })

  React.useEffect(() => {
    let vivo = true
    rpc('org_ver_como_iniciar', { p_secret: lerSenha(), p_participante: id })
      .then((r) => {
        if (!vivo) return
        ativarVerComo({
          ler: (consulta) => rpc('org_ver_como_ler', { p_secret: lerSenha(), p_participante: id, p_consulta: consulta }),
          baixar: async (path) => {
            const a = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'baixar', bucket: 'arquivos', path })
            if (!a || !a.url) throw new Error('sem_link')
            return a.url
          },
        })
        setEstado({ fase: 'pronto', nome: r && r.nome_marca })
      })
      .catch((e) => {
        if (!vivo) return
        const m = String((e && e.message) || '')
        const chave = Object.keys(RECADOS).find((k) => m.includes(k))
        setEstado({ fase: 'erro', texto: chave ? RECADOS[chave] : 'Não deu para abrir agora. Confira a conexão e tente de novo.' })
      })
    return () => { vivo = false; ativarVerComo(null) }
  }, [id])

  // Aba aberta pela ficha: fecha e o painel da organização continua onde estava. Sem isso, volta ao painel.
  const sair = React.useCallback(() => {
    ativarVerComo(null)
    window.close()
    location.replace('/painel/')
  }, [])

  if (estado.fase !== 'pronto') {
    return (
      <div className="pn-porta" id="login">
        <div className="pn-porta__caixa">
          <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
          <div>
            <h1 className="pn-porta__titulo">{estado.fase === 'erro' ? 'Não abriu' : 'Um instante…'}</h1>
            <p className="pn-porta__lead">{estado.fase === 'erro' ? estado.texto : 'Abrindo o painel como a marca vê.'}</p>
            {estado.fase === 'erro' && <button className="pn-link--porta" type="button" onClick={sair}><Icone nome="sair" tamanho={16} />Voltar ao painel</button>}
          </div>
        </div>
      </div>
    )
  }
  return <PainelMarcaShell vistas={vistas} onSair={sair} verComo={{ nome: estado.nome, onSair: sair }} />
}
