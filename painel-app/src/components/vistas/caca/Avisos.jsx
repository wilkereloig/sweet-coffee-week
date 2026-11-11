import React from 'react'
import { Botao, Carregando, Erro, Secao, Selo } from '../../ui'
import { confirmar } from '../../Confirmar'
import { useLeitura } from '../../../lib/leituraVivaReact'
import {
  cacaApi, mensagemCaca, TIPOS_PUSH, tipoPushValido, CATEGORIAS_AVISO, DESTINOS_AVISO, PUBLICOS_AVISO, AVISO_LIMITES, disputaPorDia, deliveryPorDia,
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
                <p className="ui-nota">Destaque no título o benefício real para a pessoa, como uma chance de ganhar vouchers. Evite prometer prêmio ou quantidade sem confirmação.</p>
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

      <Automaticos pode={pode} />

      <Programacao pode={pode} />

      <Disputa pode={pode} />

      <Delivery pode={pode} />

      <Simulacao pode={pode} />
    </div>
  )
}

/** Interruptor dos avisos automáticos (meta alcançada e avaliação pendente). Ligar vale daqui para a frente: nada do que já aconteceu vira aviso. */
function Automaticos({ pode }) {
  const est = useLeitura(() => cacaApi.avisosAutoEstado(), ['carimbos'], { chave: 'caca-avisos-auto' })
  const [ocupado, executar] = useExecutar()
  if (!pode('producao.gerir') || !est.dados) return null
  const ligado = est.dados.ligado === true
  async function trocar() {
    const ok = await confirmar(ligado
      ? 'Os avisos automáticos param. Quem já recebeu continua com o aviso na central.'
      : 'Meta alcançada e avaliação pendente passam a gerar aviso sozinhos, só para o que acontecer a partir de agora (nada do histórico). Entram na central de cada pessoa e, no celular, só para quem ligou a categoria, respeitando horário e limite diário.',
    { titulo: ligado ? 'Desligar os avisos automáticos?' : 'Ligar os avisos automáticos?', acao: ligado ? 'Desligar' : 'Ligar', perigo: !ligado })
    if (!ok) return
    const r = await executar('auto', () => cacaApi.avisosAutoDefinir(!ligado))
    if (r) await est.recarregar()
  }
  return (
    <Secao titulo="Avisos automáticos" nota="Meta alcançada e avaliação pendente. Um aviso por evento, sem repetir; a avaliação só avisa se continua pendente. Voucher e imprevisto nunca são automáticos.">
      <p className="ui-nota" role="status">
        <Selo tom={ligado ? 'ok' : 'neutro'}>{ligado ? 'Ligados' : 'Desligados'}</Selo>{' '}
        {est.dados.agendado ? 'O agendador roda a cada 15 minutos.' : 'O agendador não está ativo.'}
        {ligado && est.dados.desde ? ` Valem desde ${horaNatal(est.dados.desde)}.` : ''}
      </p>
      <div className="ui-linha-acoes">
        <Botao variante={ligado ? 'secundario' : undefined} disabled={!!ocupado} aria-busy={ocupado === 'auto' || undefined} onClick={trocar}>{ligado ? 'Desligar avisos automáticos' : 'Ligar avisos automáticos…'}</Botao>
      </div>
    </Secao>
  )
}

const ROTULO_TIPO_PROGRAMACAO = { incentivo: 'Incentivo', voucher: 'Dia de voucher', penultimo: 'Penúltimo dia', ultimo: 'Último dia' }

/**
 * Programação diária do festival: uma mensagem por pessoa por dia, nas datas da edição (prorrogou o festival, o calendário acompanha).
 * Entra na central de todos; no celular só para quem ligou a categoria, com horário e limite. Depende do interruptor "Avisos automáticos".
 */
function Programacao({ pode }) {
  const est = useLeitura(() => cacaApi.programacaoEstado(), ['carimbos'], { chave: 'caca-programacao' })
  const [ocupado, executar] = useExecutar()
  if (!pode('dado.ler') || !est.dados) return null
  const d = est.dados
  const cfg = d.config || {}
  const ligada = cfg.ligada !== false
  const ciclo = d.ultimo_ciclo
  const erros = ciclo && ciclo.erros ? Object.keys(ciclo.erros) : []
  async function mudar(parcial) {
    const r = await executar('prog', () => cacaApi.programacaoDefinir(parcial))
    if (r) await est.recarregar()
  }
  return (
    <Secao titulo="Programação do festival" nota="Uma mensagem por dia para cada pessoa, nas datas oficiais da edição. Nunca vira push todo dia: o celular recebe no máximo um lembrete a cada dois dias (nos dois últimos dias do festival pode ser em dias seguidos), depois de prêmio e pendência, e só entre 8h e 21h. A mensagem vence no fim do dia.">
      <p className="ui-nota" role="status">
        <Selo tom={d.avisos_auto && ligada ? 'ok' : 'atencao'}>{d.avisos_auto ? (ligada ? 'Ativa' : 'Programação desligada') : 'Parada: avisos automáticos desligados'}</Selo>{' '}
        {d.agendado ? 'O agendador roda a cada 15 minutos.' : 'O agendador não está ativo.'}
        {ciclo && ciclo.em ? ` Último ciclo: ${horaNatal(ciclo.em)}${erros.length ? ` · com erro em: ${erros.join(', ')}` : ' · sem erro'}.` : ''}
      </p>
      {pode('producao.gerir') && (
        <div className="ui-linha-acoes">
          <label className="og-campo"><span>Hora em que a mensagem do dia nasce (Fortaleza)</span>
            <select value={cfg.hora ?? 10} disabled={!!ocupado} onChange={(e) => mudar({ hora: Number(e.target.value) })}>
              {Array.from({ length: 13 }, (_, i) => i + 8).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>)}
            </select></label>
          <Botao variante={ligada ? 'secundario' : undefined} disabled={!!ocupado} aria-busy={ocupado === 'prog' || undefined} onClick={() => mudar({ ligada: !ligada })}>{ligada ? 'Desligar a programação' : 'Ligar a programação'}</Botao>
        </div>
      )}
      <ul className="cp-fatos">
        {(d.calendario || []).map((c) => (
          <li key={c.dia}><span>{String(c.dia).slice(8, 10)}/{String(c.dia).slice(5, 7)} · {String(c.hora).padStart(2, '0')}h · {ROTULO_TIPO_PROGRAMACAO[c.tipo] || c.tipo}</span>
            <strong>{c.titulo}</strong> {c.gerado ? `— enviada para ${c.pessoas} ${Number(c.pessoas) === 1 ? 'pessoa' : 'pessoas'}` : '— ainda não gerada'}</li>
        ))}
      </ul>
    </Secao>
  )
}

/**
 * Avisos de disputa (migration 20270124): ultrapassagem, perto da zona, reta final e quem está parado há 2 dias. Nasce desligado;
 * ligar vale a partir do próximo ciclo. Por dia: quantas pessoas receberam na central (geradas) e quantas no celular (enviadas).
 */
function Disputa({ pode }) {
  const est = useLeitura(() => cacaApi.disputaAvisoEstado(), ['carimbos'], { chave: 'caca-disputa-aviso', opcional: true })
  const [ocupado, executar] = useExecutar()
  if (!pode('dado.ler') || !est.dados) return null
  const d = est.dados
  const dias = disputaPorDia(d.dias)
  async function trocar() {
    if (!d.ligado && !(await confirmar('Ligar os avisos de disputa? A partir do próximo ciclo (15 min), quem está na disputa do voucher recebe avisos na central e, com o celular ligado, no aparelho: ultrapassagem, perto da zona e reta final. Quem está parado há 2 dias recebe um lembrete (até ' + (d.retomada_por_ciclo ?? 150) + ' por ciclo).'))) return
    const r = await executar('disputa', () => cacaApi.disputaAvisoDefinir(!d.ligado))
    if (r) await est.recarregar()
  }
  return (
    <Secao titulo="Avisos de disputa" nota="Avisam quem está na disputa do voucher do dia: quando alguém passa a pessoa, quando ela está a 1 ou 2 casas da zona, na reta final (2 h antes do corte) e quando ela está parada há 2 dias. Cada tipo vai no máximo uma vez por dia por pessoa, nunca promete voucher e vence no corte. Mais de 300 num ciclo, nada sai.">
      <p className="ui-nota" role="status">
        <Selo tom={d.ligado && d.avisos_auto ? 'ok' : 'neutro'}>{!d.ligado ? 'Desligados' : d.avisos_auto ? 'Ligados' : 'Parados: avisos automáticos desligados'}</Selo>{' '}
        {`${d.aparelhos} ${d.aparelhos === 1 ? 'pessoa recebe' : 'pessoas recebem'} no celular.`}
        {d.erro ? ` Último ciclo com problema: ${d.erro}.` : ''}
      </p>
      {pode('producao.gerir') && (
        <div className="ui-linha-acoes">
          <Botao variante={d.ligado ? 'secundario' : undefined} disabled={!!ocupado} aria-busy={ocupado === 'disputa' || undefined} onClick={trocar}>{d.ligado ? 'Desligar avisos de disputa' : 'Ligar avisos de disputa…'}</Botao>
        </div>
      )}
      {dias.length === 0
        ? <p className="ui-nota">Nenhum aviso de disputa gerado ainda.</p>
        : (
          <ul className="cp-fatos">
            {dias.map((x) => (
              <li key={x.dia}><span>{x.dia.slice(8, 10)}/{x.dia.slice(5, 7)} · {x.geradas} na central · {x.enviadas} no celular</span>
                {x.tipos.map((t) => `${t.rotulo}: ${t.geradas}/${t.enviadas}`).join(' · ')}</li>
            ))}
          </ul>
          )}
    </Secao>
  )
}

/**
 * Avisos de delivery (migration 20270130): uma vez por dia, no fim da tarde, cada pessoa com carimbo recebe UMA casa com delivery do
 * combo que ainda falta no mapa dela. Nasce desligado. Por dia e casa: quantas pessoas na central (geradas) e no celular (enviadas).
 */
function Delivery({ pode }) {
  const est = useLeitura(() => cacaApi.deliveryAvisoEstado(), ['carimbos'], { chave: 'caca-delivery-aviso', opcional: true })
  const [ocupado, executar] = useExecutar()
  if (!pode('dado.ler') || !est.dados) return null
  const d = est.dados
  const casas = Array.isArray(d.casas) ? d.casas : []
  const dias = deliveryPorDia(d.dias, casas)
  const janela = `${d.hora ?? 17}h às ${(d.hora ?? 17) + (d.janela_horas ?? 2)}h`
  async function trocar() {
    if (!d.ligado && !(await confirmar(`Ligar os avisos de delivery? Uma vez por dia, das ${janela}, cada pessoa com carimbo recebe na central (e, com o celular ligado, no aparelho) uma das ${casas.length} casas com delivery do combo que ainda falta no mapa dela.`))) return
    const r = await executar('delivery', () => cacaApi.deliveryAvisoDefinir(!d.ligado))
    if (r) await est.recarregar()
  }
  return (
    <Secao titulo="Avisos de delivery" nota={`Uma vez por dia, das ${janela}: cada pessoa com carimbo recebe uma casa que entrega o combo em casa e ainda falta no mapa dela, sem repetir a casa nos dias seguintes. O aviso abre a ficha do combo. "Entrega grátis" só aparece quando a casa marcou grátis no cadastro. Mais de ${d.max_por_dia ?? 1000} pessoas num dia, nada sai.`}>
      <p className="ui-nota" role="status">
        <Selo tom={d.ligado && d.avisos_auto ? 'ok' : 'neutro'}>{!d.ligado ? 'Desligados' : d.avisos_auto ? 'Ligados' : 'Parados: avisos automáticos desligados'}</Selo>{' '}
        {`${casas.length} ${casas.length === 1 ? 'casa' : 'casas'} com delivery do combo · ${d.aparelhos} ${d.aparelhos === 1 ? 'pessoa recebe' : 'pessoas recebem'} no celular.`}
        {d.erro ? ` Último ciclo com problema: ${d.erro}.` : ''}
      </p>
      {casas.length > 0 && <p className="ui-nota">{casas.map((c) => c.nome + (c.gratis ? ' (entrega grátis)' : '')).join(' · ')}</p>}
      {pode('producao.gerir') && (
        <div className="ui-linha-acoes">
          <Botao variante={d.ligado ? 'secundario' : undefined} disabled={!!ocupado} aria-busy={ocupado === 'delivery' || undefined} onClick={trocar}>{d.ligado ? 'Desligar avisos de delivery' : 'Ligar avisos de delivery…'}</Botao>
        </div>
      )}
      {dias.length === 0
        ? <p className="ui-nota">Nenhum aviso de delivery gerado ainda.</p>
        : (
          <ul className="cp-fatos">
            {dias.map((x) => (
              <li key={x.dia}><span>{x.dia.slice(8, 10)}/{x.dia.slice(5, 7)} · {x.geradas} na central · {x.enviadas} no celular</span>
                {x.casas.map((c) => `${c.nome}: ${c.geradas}/${c.enviadas}`).join(' · ')}</li>
            ))}
          </ul>
          )}
    </Secao>
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
