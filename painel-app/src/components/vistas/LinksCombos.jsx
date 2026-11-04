import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { linksDosCombos } from '../../lib/arquivos'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, BotaoIcone } from '../ui'
import { Icone } from '../Icone'
import { useLeitura } from '../../lib/leituraVivaReact'

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

/*
 * Arquivos › Links dos combos (04/11/2026, pedido do Wilker): a pasta de fotos de cada marca no
 * Dropbox, todas numa lista só, para a equipe inteira. É a MESMA leitura de Arquivos › Por
 * participante (o link que cada marca vê em Fotos) — não há cópia: link novo ou trocado aparece aqui
 * sozinho. Só leitura: quem publica ou edita o link continua usando Por participante.
 */
export function LinksCombos() {
  const arq = useLeitura(async () => (await rpc('get_arquivos_admin', { p_secret: lerSenha() })) || [], ['arquivos', 'participantes'])
  const [aviso, setAviso] = React.useState(null)

  if (arq.bloqueada) return <Erro texto={arq.erro} onTentar={arq.recarregar} />
  if (arq.dados === undefined) return <Carregando />
  const links = linksDosCombos(arq.dados)

  async function copiar(texto, ok) {
    try { await navigator.clipboard.writeText(texto); setAviso({ ok }) } catch { setAviso('Sem área de transferência neste navegador.') }
  }

  return (
    <div className="og-embutida">
      {arq.falhouAtualizar && <Erro titulo="Não consegui atualizar" texto={arq.erro} onTentar={arq.recarregar} />}
      <div className="ui-barra">
        <p className="ui-contagem ui-barra__contagem">{links.length === 1 ? '1 pasta' : links.length + ' pastas'}</p>
        {links.length > 0 && (
          <button className="og-btn" type="button" onClick={() => copiar(links.map((a) => a.marca + ': ' + a.url_externa).join('\n'), 'Os ' + links.length + ' links foram copiados (marca: link).')}>
            <Icone nome="copiar" tamanho={16} />Copiar todos
          </button>
        )}
      </div>
      {aviso && (typeof aviso === 'string'
        ? <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>
        : <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p>)}

      {links.length === 0 && <Vazio titulo="Nenhum link de pasta">Os links das fotos dos combos aparecem aqui quando publicados em Por participante.</Vazio>}
      {links.length > 0 && (
        <ul className="og-lista og-lista--acoes" style={{ '--acoes-l': (2 * 48 + 16) + 'px' }}>
          {links.map((a) => (
            <li key={a.id}>
              <div className="og-item og-item--info">
                <span className="og-item__cor" data-chave="arquivo" aria-hidden="true" />
                <span className="og-item__nome">{a.marca}</span>
                <span className="og-item__cel">Pasta no Dropbox · publicada em {dataCurta(a.publicado_em || a.created_at)}</span>
              </div>
              <span className="og-item__acoes">
                <BotaoIcone icone="link-externo" rotulo="Abrir pasta" alvo={a.marca} onClick={() => window.open(a.url_externa, '_blank', 'noopener,noreferrer')} />
                <BotaoIcone icone="copiar" rotulo="Copiar link" alvo={a.marca} onClick={() => copiar(a.url_externa, 'Link de ' + a.marca + ' copiado.')} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
