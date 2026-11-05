import React from 'react'
import { Botao, Carregando, Erro, Secao, Selo } from '../../ui'
import { confirmar } from '../../Confirmar'
import { cacaApi, CAMPOS_CONFIG, validarConfig, textoDoValor, configMudou, horaNatal } from '../../../lib/caca'
import { useExecutar, AvisoOk } from './comum'

/*
 * Regras e prazos da Caça (caca_config_ler / caca_config_gravar). Cada regra grava sozinha, com confirmação, e fica
 * na auditoria com o antes e o depois. Mudar peso base e ganhadores só vale para sorteios futuros; o intervalo entre
 * carimbos é informativo (o carimbo ainda usa 12 h fixas).
 */
export function Configuracao({ pode, dados }) {
  const { config: c, premios: p } = dados
  const [ocupado, executar] = useExecutar()
  const [aviso, setAviso] = React.useState('')
  const podeGravar = pode('edicao.gerir')

  async function salvar(campo, valor) {
    const antes = c.dados?.[campo.chave]?.valor
    const mostra = (v) => (Array.isArray(v) ? v.join(', ') : String(v))
    const ok = await confirmar(`${campo.rotulo}: de ${mostra(antes)} para ${mostra(valor)}. Isso entra na auditoria${campo.chave === 'peso_base' || campo.chave === 'ganhadores_final' ? ' e só vale para sorteios futuros' : ' e vale a partir das próximas apurações'}.`, { titulo: 'Mudar esta regra?', acao: 'Mudar' })
    if (!ok) return false
    const r = await executar(campo.chave, () => cacaApi.gravarConfig(campo.chave, valor))
    if (!r) return false
    await c.recarregar()
    await p.recarregar()
    setAviso(`${campo.rotulo}: salvo.`)
    return true
  }

  if (c.bloqueada) return <Erro texto={c.erro} onTentar={c.recarregar} />
  if (!c.dados) return <Carregando />
  return (
    <div className="ui-pilha">
      <AvisoOk texto={aviso} onFechar={() => setAviso('')} />
      <Secao titulo="Regras e prazos" nota={podeGravar ? 'Datas, horários, validade e prazos moram no banco e podem mudar sem republicar o site. Cada mudança fica registrada na auditoria.' : 'Você só lê estas regras. Mudar é com quem gerencia a edição.'}>
        <div className="cp-config">
          {CAMPOS_CONFIG.map((campo) => (
            <CampoConfig key={campo.chave} campo={campo} atual={c.dados[campo.chave]} podeGravar={podeGravar} ocupado={ocupado} onSalvar={salvar} />
          ))}
        </div>
      </Secao>
    </div>
  )
}

function CampoConfig({ campo, atual, podeGravar, ocupado, onSalvar }) {
  const id = React.useId()
  const doBanco = atual ? textoDoValor(campo, atual.valor) : ''
  const [entrada, setEntrada] = React.useState(doBanco)
  const [tocado, setTocado] = React.useState(false)
  // Valor novo do banco (outra pessoa mudou, ou acabamos de salvar) refaz o campo.
  const assinatura = JSON.stringify(atual?.valor)
  React.useEffect(() => { setEntrada(doBanco); setTocado(false) }, [assinatura]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!atual) {
    return <div className="cp-campo"><p className="ui-nota"><strong>{campo.rotulo}</strong>: o servidor ainda não tem esta regra.</p></div>
  }
  const v = validarConfig(campo, entrada)
  const erro = tocado && !v.ok ? v.erro : ''
  const mudou = configMudou(campo, entrada, atual.valor)
  const leitura = !podeGravar || !!campo.inerte
  const avisoCampo = campo.informativo || campo.inerte
  const ajudaId = id + '-ajuda'
  const entradaEl = campo.tipo === 'datas' ? (
    <textarea rows={Math.min(8, Math.max(3, String(entrada).split('\n').length + 1))} value={entrada} disabled={leitura} aria-describedby={ajudaId} aria-invalid={erro ? 'true' : undefined}
      onChange={(e) => { setEntrada(e.target.value); setTocado(true) }} />
  ) : campo.tipo === 'booleano' ? (
    <input type="checkbox" checked={entrada === true} disabled aria-describedby={ajudaId} readOnly />
  ) : (
    <input type={campo.tipo === 'hora' ? 'time' : campo.tipo === 'data' ? 'date' : campo.tipo === 'inteiro' ? 'number' : 'text'}
      inputMode={campo.tipo === 'inteiro' ? 'numeric' : undefined} min={campo.min} max={campo.max} value={entrada} disabled={leitura}
      aria-describedby={ajudaId} aria-invalid={erro ? 'true' : undefined}
      onChange={(e) => { setEntrada(e.target.value); setTocado(true) }} />
  )
  return (
    <div className="cp-campo">
      <label className="og-campo">
        <span>{campo.rotulo}{atual.proposta && <> <Selo tom="atencao">PROPOSTA — aguardando decisão do Wilker</Selo></>}</span>
        {entradaEl}
      </label>
      <p id={ajudaId} className="ui-nota">{avisoCampo || campo.ajuda}</p>
      {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
      {atual.nota && <p className="ui-nota">{atual.nota}</p>}
      {atual.atualizado_em && <p className="ui-nota cp-meta">Última mudança: {horaNatal(atual.atualizado_em)}{atual.atualizado_por ? ` por ${atual.atualizado_por}` : ''}</p>}
      {!leitura && (
        <div className="ui-linha-acoes">
          <Botao disabled={!mudou || !v.ok || !!ocupado} aria-busy={ocupado === campo.chave || undefined} aria-label={`Salvar: ${campo.rotulo}`} onClick={() => { setTocado(true); if (v.ok) onSalvar(campo, v.valor) }}>Salvar</Botao>
          {mudou && <Botao variante="secundario" onClick={() => { setEntrada(doBanco); setTocado(false) }}>Desfazer</Botao>}
        </div>
      )}
    </div>
  )
}
