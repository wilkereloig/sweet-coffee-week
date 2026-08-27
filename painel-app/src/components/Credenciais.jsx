import React from 'react'
import { montarRecado, linkWhatsApp } from '../lib/participantes'

// As credenciais aparecem UMA VEZ SÓ — pintadas na hora da criação e nunca
// recarregadas (a senha não fica guardada em lugar nenhum). Compartilhada
// pelas duas entradas que criam acesso: cadastro manual (Marcas.jsx) e criar
// acesso a partir de uma candidatura aprovada (Respostas.jsx) — CLAUDE.md
// §5.3, extrair na 2ª cópia.
export function Credenciais({ nomeMarca, telefone, login, senha }) {
  const [copiado, setCopiado] = React.useState(false)
  const texto = montarRecado({ nomeMarca: nomeMarca || 'sua marca', login, senha, origem: window.location.origin })
  const link = linkWhatsApp(telefone, texto)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    } catch {
      // Sem clipboard (contexto inseguro, permissão negada): os dados estão
      // na tela logo acima. Não fingir que copiou.
      setCopiado('manual')
    }
    window.setTimeout(() => setCopiado(false), 2400)
  }

  return (
    <div className="og-cred">
      <p className="og-cred__aviso">Anote ou envie agora. <b>Esta senha não aparece de novo.</b></p>
      <dl className="og-cred__par"><dt>Login</dt><dd>{login}</dd></dl>
      <dl className="og-cred__par"><dt>Senha</dt><dd>{senha}</dd></dl>
      <div className="og-cred__acoes">
        <button className="og-btn og-btn--mini" type="button" onClick={copiar}>
          {copiado === true ? 'Copiado' : copiado === 'manual' ? 'Selecione acima' : 'Copiar dados'}
        </button>
        {link
          ? <a className="og-btn og-btn--vazado og-btn--mini" target="_blank" rel="noopener noreferrer" href={link}>Enviar no WhatsApp</a>
          : <span className="og-forms__nota">Sem telefone na candidatura. Dá para copiar e colar.</span>}
      </div>
      <p className="og-forms__nota">No primeiro acesso a marca é obrigada a trocar a senha. É isso que faz a mensagem do WhatsApp parar de valer depois de usada.</p>
    </div>
  )
}
