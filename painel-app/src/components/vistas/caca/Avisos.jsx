import React from 'react'
import { Botao, Carregando, Erro, Secao, Selo } from '../../ui'
import { confirmar } from '../../Confirmar'
import { useLeitura } from '../../../lib/leituraVivaReact'
import {
  cacaApi, mensagemCaca, TIPOS_PUSH, tipoPushValido, CATEGORIAS_AVISO, DESTINOS_AVISO, PUBLICOS_AVISO, AVISO_LIMITES,
  ROTULO_ESTADO_AVISO, comporImprevisto, validarAviso, resumoDoEnvio, horaNatal,
} from '../../../lib/caca'
import { useExecutar, AvisoOk } from './comum'

/*
 * Avisos da Caça. Duas coisas, separadas:
 *   1. Comunicados da organização: compor → revisar (público estimado) → ENVIAR (ação explícita, com confirmação) → acompanhar.
 *      Rascunho e agendado podem ser cancelados; enviado não. O banco confere permissão (producao.gerir), conteúdo (sem contato),
 *      destino (só telas da Caça) e público (imprevisto só para quem tem a casa na rota). Nada aqui envia sem a confirmação.
 *   2. Simulação de alcance por tipo (conta aparelhos; não envia).
 * Quem vê a lista não vê nome, e-mail nem telefone de ninguém: só contagens.
 */
const VAZIO = { categoria: 'edicao', titulo: '', corpo: '', destino: '/cartoon/caca', publico: 'todos', casa: '', unidade: '', dia: '', situacao: '', enviar_em: '', vigente_ate: '' }

export function Avisos({ edicao, pode }) {
  const lista = useLeitura(() => cacaApi.avisosListar(edicao), ['carimbos'], { chave: `caca-avisos-${edicao}` })
  const casas = useLeitura(() => cacaApi.avisosCasas(edicao), ['carimbos'], { chave: `caca-avisos-casas-${edicao}` })
  const [ocupado, executar] = useExecutar()
  const [aviso, setAviso] = React.useState('')
  const [form, setForm] = React.useState(VAZIO)
  const [revisao, setRevisao] = React.useState(null) // { id, mapas, recebem_push }
  const podeEnviar = pode('producao.gerir')

  if (lista.bloqueada) return <Erro texto={lista.erro} onTentar={lista.recarregar} />
  if (!lista.dados) return <Carregando />

  const imprevisto = form.categoria === 'imprevisto'
  const nomeDaCasa = (casas.dados || []).find((c) => c.id === form.casa)?.nome || ''
  const composto = imprevisto ? comporImprevisto({ casa: nomeDaCasa, unidade: form.unidade, dia: form.dia, situacao: form.situacao }) : null
  const efetivo = imprevisto ? { ...form, titulo: composto?.titulo || '', corpo: composto?.corpo || '' } : form
  const erros = validarAviso(efetivo)
  const mudar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  async function criar() {
    if (erros.length) return
    const r = await executar('criar', () => cacaApi.criarAviso(efetivo))
    if (!r) return
    setForm(VAZIO); await lista.recarregar()
    setAviso(r.estado === 'agendado' ? 'Aviso agendado. Ele só sai na data marcada, depois de você enviar.' : 'Rascunho salvo. Revise o público e envie quando estiver pronto.')
  }

  async function revisar(a) {
    const r = await executar('estimar-' + a.id, () => cacaApi.estimarAviso(a.id))
    if (r) setRevisao({ id: a.id, ...r })
  }

  async function enviar(a) {
    const est = revisao?.id === a.id ? revisao : await executar('estimar-' + a.id, () => cacaApi.estimarAviso(a.id))
    if (!est) return
    const texto = `“${a.titulo}” vai para a central de ${est.mapas} ${est.mapas === 1 ? 'pessoa' : 'pessoas'} e, no celular, para quem ligou esta categoria (cerca de ${est.recebem_push} ${est.recebem_push === 1 ? 'pessoa' : 'pessoas'}), respeitando horário e limite diário. Depois de enviado não dá para desfazer.${a.urgente ? ' É um aviso urgente: ignora o horário silencioso.' : ''}`
    const ok = await confirmar(texto, { titulo: 'Enviar este aviso de verdade?', acao: 'Enviar agora', perigo: true })
    if (!ok) return
    const r = await executar('enviar-' + a.id, () => cacaApi.enviarAviso(a.id))
    if (!r) return
    let push = ''
    try {
      let rodadas = 0; let enviados = 0; let falhas = 0; let restam = 1
      while (restam > 0 && rodadas < 12) {
        const p = await cacaApi.enviarPushDoAviso(a.id)
        enviados += p.enviados || 0; falhas += p.falharam || 0; restam = p.restam || 0; rodadas += 1
        if (!p.enviados && !p.falharam) break
      }
      push = ` Notificações no celular: ${enviados} enviada${enviados === 1 ? '' : 's'}${falhas ? `, ${falhas} falha${falhas === 1 ? '' : 's'}` : ''}.`
    } catch (e) {
      push = ` A central já recebeu, mas o envio para o celular não saiu agora (${mensagemCaca(e)}).`
    }
    setRevisao(null); await lista.recarregar()
    setAviso(`Aviso enviado para a central de ${r.alvos} ${r.alvos === 1 ? 'pessoa' : 'pessoas'}.${push}`)
  }

  async function cancelar(a) {
    const ok = await confirmar(`“${a.titulo}” não será enviado. Fica registrado como cancelado.`, { titulo: 'Cancelar este aviso?', acao: 'Cancelar aviso', perigo: true })
    if (!ok) return
    const r = await executar('cancelar-' + a.id, () => cacaApi.cancelarAviso(a.id))
    if (r) { setRevisao(null); await lista.recarregar(); setAviso('Aviso cancelado.') }
  }

  return (
    <div className="ui-pilha">
      <AvisoOk texto={aviso} onFechar={() => setAviso('')} />
      <Secao titulo="Novo aviso" nota="Comunicados pontuais e úteis. Nada sai ao salvar: primeiro você revisa o público, depois envia de propósito.">
        {!podeEnviar && <p className="ui-nota">Você só lê os avisos. Criar e enviar é com quem gerencia a produção.</p>}
        {podeEnviar && (
          <div className="cp-semente">
            <label className="og-campo"><span>Tipo</span>
              <select value={form.categoria} onChange={(e) => mudar('categoria', e.target.value)}>
                {CATEGORIAS_AVISO.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </select></label>

            {imprevisto ? (
              <>
                <p className="ui-nota">Só publique um imprevisto <strong>já confirmado</strong> com a casa. Ele vai apenas para quem tem a casa na rota de um grupo, e fecha com o texto abaixo.</p>
                <label className="og-campo"><span>Casa afetada</span>
                  <select value={form.casa} onChange={(e) => mudar('casa', e.target.value)}>
                    <option value="">Escolha a casa</option>
                    {(casas.dados || []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select></label>
                <label className="og-campo"><span>Unidade (opcional)</span>
                  <input type="text" maxLength={AVISO_LIMITES.unidade} value={form.unidade} onChange={(e) => mudar('unidade', e.target.value)} /></label>
                <label className="og-campo"><span>Dia afetado</span>
                  <input type="date" value={form.dia} onChange={(e) => mudar('dia', e.target.value)} /></label>
                <label className="og-campo"><span>Situação confirmada (ex.: não abre, abre só à tarde)</span>
                  <input type="text" maxLength={AVISO_LIMITES.situacao} value={form.situacao} onChange={(e) => mudar('situacao', e.target.value)} /></label>
                <p className="ui-nota" role="status">{composto ? <>Vai sair assim: <strong>{composto.titulo}</strong> — {composto.corpo}</> : 'O texto aparece aqui quando casa, dia e situação estiverem preenchidos.'}</p>
              </>
            ) : (
              <>
                <label className="og-campo"><span>Título</span>
                  <input type="text" maxLength={AVISO_LIMITES.titulo} value={form.titulo} onChange={(e) => mudar('titulo', e.target.value)} /></label>
                <label className="og-campo"><span>Texto ({form.corpo.length}/{AVISO_LIMITES.corpo})</span>
                  <textarea rows={3} maxLength={AVISO_LIMITES.corpo} value={form.corpo} onChange={(e) => mudar('corpo', e.target.value)} /></label>
                <label className="og-campo"><span>Público</span>
                  <select value={form.publico} onChange={(e) => mudar('publico', e.target.value)}>
                    {PUBLICOS_AVISO.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
                  </select></label>
              </>
            )}

            <label className="og-campo"><span>Ao tocar, abre</span>
              <select value={form.destino} onChange={(e) => mudar('destino', e.target.value)}>
                {DESTINOS_AVISO.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </select></label>
            <label className="og-campo"><span>Vale até (opcional)</span>
              <input type="datetime-local" value={form.vigente_ate} onChange={(e) => mudar('vigente_ate', e.target.value)} /></label>
            <label className="og-campo"><span>Agendar para (opcional; mesmo assim você confirma o envio)</span>
              <input type="datetime-local" value={form.enviar_em} onChange={(e) => mudar('enviar_em', e.target.value)} /></label>

            {form.titulo || form.corpo || imprevisto ? (erros.length > 0 && <ul className="ui-nota ui-nota--erro cp-erros" role="alert">{erros.map((e) => <li key={e}>{e}</li>)}</ul>) : null}
            <div className="ui-linha-acoes">
              <Botao disabled={erros.length > 0 || !!ocupado} aria-busy={ocupado === 'criar' || undefined} onClick={criar}>Salvar rascunho</Botao>
            </div>
          </div>
        )}
      </Secao>

      <Secao titulo="Avisos criados" nota="O que a organização escreveu, com quem criou e enviou. Só números: nenhum nome, e-mail ou telefone de participante aparece aqui.">
        {lista.dados.length === 0 && <p className="ui-nota">Nenhum aviso criado ainda.</p>}
        <ul className="cp-fatos">
          {lista.dados.map((a) => (
            <li key={a.id} style={{ display: 'grid', gap: 6 }}>
              <span>
                <Selo tom={a.estado === 'enviado' ? 'ok' : a.estado === 'cancelado' ? 'neutro' : 'atencao'}>{ROTULO_ESTADO_AVISO[a.estado] || a.estado}</Selo>{' '}
                {a.urgente && <Selo tom="atencao">Urgente</Selo>}{' '}
                <strong>{a.titulo}</strong>
              </span>
              <span>{a.corpo}</span>
              <span className="ui-nota">
                {CATEGORIAS_AVISO.find(([k]) => k === a.categoria)?.[1] || a.categoria} · público: {a.publico === 'com_push' ? 'quem ligou o celular' : a.publico === 'casa_na_rota' ? 'quem tem a casa na rota' : 'todos'}
                {a.criado_em ? ` · criado ${horaNatal(a.criado_em)}${a.criado_por ? ` por ${a.criado_por}` : ''}` : ''}
                {a.enviar_em && a.estado === 'agendado' ? ` · para ${horaNatal(a.enviar_em)}` : ''}
                {a.enviado_em ? ` · enviado ${horaNatal(a.enviado_em)}${a.enviado_por ? ` por ${a.enviado_por}` : ''}` : ''}
                {a.cancelado_em ? ` · cancelado ${horaNatal(a.cancelado_em)}${a.cancelado_por ? ` por ${a.cancelado_por}` : ''}` : ''}
              </span>
              {a.estado === 'enviado' && <span className="ui-nota" role="status">{resumoDoEnvio(a)}</span>}
              {revisao?.id === a.id && <span className="ui-nota ui-nota--ok" role="status">Revisão: chega à central de {revisao.mapas} {revisao.mapas === 1 ? 'pessoa' : 'pessoas'}; no celular, cerca de {revisao.recebem_push} (quem ligou esta categoria; horário e limite diário ainda se aplicam).</span>}
              {podeEnviar && (a.estado === 'rascunho' || a.estado === 'agendado') && (
                <div className="ui-linha-acoes">
                  <Botao variante="secundario" disabled={!!ocupado} onClick={() => revisar(a)}>Revisar público</Botao>
                  <Botao disabled={!!ocupado} aria-busy={ocupado === 'enviar-' + a.id || undefined} onClick={() => enviar(a)}>Enviar…</Botao>
                  <Botao variante="secundario" disabled={!!ocupado} onClick={() => cancelar(a)}>Cancelar aviso</Botao>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Secao>

      <Simulacao pode={pode} />
    </div>
  )
}

function Simulacao({ pode }) {
  const [tipo, setTipo] = React.useState(TIPOS_PUSH[0][0])
  const [res, setRes] = React.useState(null)
  const [ocupado, executar] = useExecutar()
  if (!pode('producao.gerir')) return null
  async function simular() {
    if (!tipoPushValido(tipo)) return
    setRes(null)
    const r = await executar('push', () => cacaApi.simularPush(tipo))
    if (r) setRes({ ...r, tipo })
  }
  const rotulo = (t) => (TIPOS_PUSH.find(([k]) => k === t) || [])[1]
  return (
    <Secao titulo="Simular alcance" nota="Conta os aparelhos com a categoria ligada. Não manda nada.">
      <p className="ui-nota"><Selo tom="atencao">SIMULAÇÃO — nenhuma notificação é enviada</Selo></p>
      <div className="cp-semente">
        <label className="og-campo"><span>Tipo de aviso</span>
          <select value={tipo} onChange={(e) => { setTipo(e.target.value); setRes(null) }}>
            {TIPOS_PUSH.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
          </select></label>
        <Botao disabled={!!ocupado} aria-busy={ocupado === 'push' || undefined} onClick={simular}>Simular alcance</Botao>
      </div>
      {res && (
        <ul className="cp-fatos" role="status">
          <li><span>Tipo</span>{rotulo(res.tipo)}</li>
          <li><span>Aparelhos que receberiam</span><strong>{res.destinatarios}</strong></li>
          <li><span>Envio configurado no servidor</span>{res.vapid_configurado ? 'Sim' : 'Não (o envio real ainda não funcionaria)'}</li>
        </ul>
      )}
    </Secao>
  )
}
