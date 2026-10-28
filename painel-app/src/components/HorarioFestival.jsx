import React from 'react'
import { Icone } from './Icone'
import { confirmar } from './Confirmar'
import {
  horaTexto, rotuloDia, diasDeLinhas, linhasDeDias, linhasCanonicas, mesmasLinhas, modoDeDias, podeAgrupar, trocarModo,
  linhasDoModo, estadoDoHorario, textoResumo, periodoDoFestivalTexto, aplicar, modoQueVale,
  abrirDia, fecharDia, podeAcrescentarIntervalo, acrescentarIntervalo, tirarIntervalo, trocarHora, opcoesAbre, opcoesFecha,
} from '../lib/horarioFestival'
import '../styles/horario-festival.css'

/*
 * Horário NO FESTIVAL (pedido do Wilker, 23/10/2026): uma pergunta só — como esta unidade funciona em cada dia do festival.
 * O mesmo seletor serve ao cadastro da marca e à ficha da equipe. A regra (modos, períodos, validação, texto) mora em
 * src/edicao/dados/horarioFestival.js; aqui só há a tela e o rascunho.
 *
 *   <HorarioFestival id="hf-<unidade>" datas={['2026-11-05', …]} valor={linhas} onChange={({ linhas, completo, faltando }) => …} />
 *
 * `valor` são as linhas gravadas ([{ data, abre, fecha }], [] = ainda não respondido). O rascunho é da própria tela: ela só
 * entrega `linhas` quando está COMPLETO (nunca grava pela metade); incompleto, `onChange` vem com `completo: false` e
 * `linhas: null`, e quem usa NÃO deve mexer em `valor` (mexer em `valor` de fora é o que refaz o rascunho: servidor, outra aba).
 */

const MODOS = [['todos', 'Igual todos os dias'], ['semana', 'Muda conforme o dia']]

const iniciar = (linhas, datas) => {
  const dias = diasDeLinhas(linhas, datas)
  return { dias, modo: modoDeDias(dias) }
}

// Só o clique de ponteiro leva o foco para o select: com as setas do teclado a pessoa segue no grupo de rádio (a seta já marca e dispara
// o change; levar o foco embora a impediria de alternar com as setas).
const doPonteiro = (e) => !!(e && e.nativeEvent && e.nativeEvent.detail > 0)

/**
 * Quando `valor` muda de identidade, o rascunho é refeito? Só se o horário de FORA mudou de verdade (servidor, outra aba, troca das
 * datas) e não é o eco do que a própria tela acabou de avisar. Uma releitura que trouxe o MESMO horário numa lista nova não pode
 * apagar o que a pessoa montou: `servidor` = o último `valor` visto de fora; `conhecido` = o que a tela avisou por último.
 */
export function aoMudarValor({ servidor, conhecido }, valor, chaveDatas) {
  const c = linhasCanonicas(valor)
  if (servidor.datas === chaveDatas && mesmasLinhas(c, servidor.linhas)) return { servidor, conhecido, refazer: false }
  const novoServidor = { linhas: c, datas: chaveDatas }
  if (conhecido.datas === chaveDatas && mesmasLinhas(c, conhecido.linhas)) return { servidor: novoServidor, conhecido, refazer: false }
  return { servidor: novoServidor, conhecido: { linhas: c, datas: chaveDatas }, refazer: true }
}

const juntar = (lista) => (lista.length < 2 ? lista.join('') : lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1])

function Linha({ id, l, desabilitado, aoMudar }) {
  const aberto = Array.isArray(l.periodos) && l.periodos.length > 0
  const fechado = Array.isArray(l.periodos) && l.periodos.length === 0
  const nome = id + '-' + l.chave
  const ps = aberto ? l.periodos : []
  const mudar = (periodos, foco) => aoMudar(l.alvo, periodos, foco)
  return (
    <fieldset className="hf__linha" data-hf-linha={l.chave} disabled={desabilitado}>
      <legend className="hf__rotulo">{l.rotulo}</legend>
      <div className="hf__abre">
        <label className="hf__opcao">
          <input type="radio" id={nome + '-abre'} name={nome + '-abre'} checked={aberto}
            onChange={(e) => mudar(abrirDia(l.periodos), doPonteiro(e) ? [nome + '-p0-abre'] : undefined)} />
          <span>Abre</span>
        </label>
        <label className="hf__opcao">
          <input type="radio" name={nome + '-abre'} checked={fechado} onChange={() => mudar(fecharDia())} />
          <span>Não abre</span>
        </label>
      </div>
      {aberto && ps.map((p, i) => (
        <div className="hf__periodo" key={i}>
          {/* "Das [início]" e "às [fim]" são pares: no celular quebra entre eles, nunca deixando o "às" sozinho no fim da linha. */}
          <span className="hf__par">
            <span className="hf__das">{i === 0 ? 'Das' : 'e das'}</span>
            <select id={nome + '-p' + i + '-abre'} value={p[0]} aria-label={l.rotulo + ': ' + (i ? 'segundo período, ' : '') + 'abre às'}
              onChange={(e) => mudar(trocarHora(ps, i, 0, e.target.value))}>
              <option value="">Hora</option>
              {opcoesAbre(ps, i).map((h) => <option key={h} value={h}>{horaTexto(h)}</option>)}
            </select>
          </span>
          <span className="hf__par">
            <span className="hf__as">às</span>
            <select id={nome + '-p' + i + '-fecha'} value={p[1]} aria-label={l.rotulo + ': ' + (i ? 'segundo período, ' : '') + 'fecha às'}
              onChange={(e) => mudar(trocarHora(ps, i, 1, e.target.value))}>
              <option value="">Hora</option>
              {opcoesFecha(ps, i).map((h) => <option key={h} value={h}>{horaTexto(h)}</option>)}
            </select>
          </span>
          {i === 1 && (
            <button type="button" className="hf__acao" onClick={() => mudar(tirarIntervalo(ps), [nome + '-intervalo', nome + '-p0-abre'])}>
              <Icone nome="fechar" tamanho={16} />Tirar este intervalo
            </button>
          )}
        </div>
      ))}
      {aberto && podeAcrescentarIntervalo(ps) && (
        <button type="button" id={nome + '-intervalo'} className="hf__acao" onClick={() => mudar(acrescentarIntervalo(ps), [nome + '-p1-abre'])}>
          <Icone nome="mais" tamanho={16} />Incluir intervalo (ex.: fecha para o almoço)
        </button>
      )}
    </fieldset>
  )
}

export function HorarioFestival({ id, datas, valor, onChange, textoAntigo, desabilitado, rotulo }) {
  const chaveDatas = (datas || []).join(',')
  const [est, setEst] = React.useState(() => iniciar(valor, datas))
  // O que a tela já conhece de `valor` (ver aoMudarValor): o último valor de fora e o último que ela mesma avisou.
  const servidor = React.useRef({ linhas: linhasCanonicas(valor), datas: chaveDatas })
  const conhecido = React.useRef({ linhas: linhasCanonicas(valor), datas: chaveDatas })
  const [foco, setFoco] = React.useState(null)
  // O estado de AGORA, para depois de esperas (o diálogo de confirmação pode durar enquanto o horário muda por fora).
  const estRef = React.useRef(est)
  estRef.current = est

  React.useEffect(() => {
    const r = aoMudarValor({ servidor: servidor.current, conhecido: conhecido.current }, valor, chaveDatas)
    servidor.current = r.servidor
    conhecido.current = r.conhecido
    if (r.refazer) setEst(iniciar(valor, datas))
  }, [valor, chaveDatas]) // eslint-disable-line react-hooks/exhaustive-deps -- `datas` entra por `chaveDatas`

  // `foco` = ids candidatos, em ordem (o botão tocado costuma sumir: o primeiro que existir recebe o foco).
  React.useEffect(() => {
    if (!foco) return
    const el = foco.map((i) => document.getElementById(i)).find(Boolean)
    if (el) el.focus()
    setFoco(null)
  }, [foco])

  if (!(datas || []).length) {
    return <p className="aviso">As datas do festival ainda não foram definidas pela organização. O horário abre assim que elas chegarem.</p>
  }

  const modo = modoQueVale(est.modo, est.dias)
  const estado = estadoDoHorario(est.dias, modo)

  // Todo toque na tela passa por aqui: guarda o rascunho e avisa quem usa (linhas só quando está completo).
  function mudar(dias, modoNovo, focar) {
    const m = modoNovo === undefined ? est.modo : modoNovo
    const e = estadoDoHorario(dias, modoQueVale(m, dias))
    setEst({ dias, modo: m })
    conhecido.current = { linhas: linhasCanonicas(e.completo ? linhasDeDias(dias) : valor), datas: chaveDatas }
    if (onChange) onChange({ linhas: e.completo ? linhasDeDias(dias) : null, completo: e.completo, faltando: e.faltando, semDiaAberto: e.semDiaAberto })
    if (focar) setFoco(focar)
  }

  async function escolherModo(novo) {
    if (novo === 'semana') { mudar(est.dias, 'semana'); return }
    const real = modoDeDias(est.dias)
    if (real === 'semana' || real === 'dias') {
      const base = est.dias.find((d) => d.periodos !== null)
      const ok = await confirmar('Usar o mesmo horário em todos os dias? O horário de ' + rotuloDia(base.data) + ' passa a valer para todos os outros dias.',
        { acao: 'Usar em todos', perigo: false })
      if (!ok) return
    }
    // Depois do diálogo vale o estado de AGORA, não o de quando a pergunta abriu (o horário pode ter mudado por fora nesse meio-tempo).
    mudar(trocarModo(estRef.current.dias, 'todos'), 'todos')
  }

  const linhas = modo ? linhasDoModo(est.dias, modo) : []
  const periodo = periodoDoFestivalTexto(datas)
  const resumo = estado.completo
    ? { tom: 'ok', icone: 'feito', texto: <>Fica assim: <b>{textoResumo(est.dias)}</b></> }
    : estado.faltando.length
      ? { tom: 'falta', icone: 'atencao', texto: 'Falta responder: ' + juntar(estado.faltando) + '.' }
      : estado.semDiaAberto
        ? { tom: 'falta', icone: 'atencao', texto: 'Marque pelo menos um dia em que a unidade abre.' }
        : null

  return (
    <div className="hf" id={id} data-hf>
      <fieldset className="hf__modos" disabled={desabilitado}>
        <legend className="hf__titulo">{rotulo || 'Como esta unidade funciona nos dias do festival?'}</legend>
        <p className="hf__apoio">
          {periodo ? periodo.charAt(0).toUpperCase() + periodo.slice(1) + '. ' : ''}Se for diferente do horário normal da loja, vale o do festival.
          {' '}Fecha depois da meia-noite? Escolha “meia-noite”.
        </p>
        <div className="hf__escolhas">
          {MODOS.map(([v, r]) => (
            <label className="hf__opcao" key={v}>
              <input type="radio" name={id + '-modo'} checked={v === 'todos' ? modo === 'todos' : modo === 'semana' || modo === 'dias'}
                onChange={() => escolherModo(v)} />
              <span>{r}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {textoAntigo && !estado.completo && (
        <p className="hf__nota">Hoje está: <b>{textoAntigo}</b>. Escolha acima para confirmar ou trocar.</p>
      )}

      {modo && (
        <div className="hf__linhas">
          {linhas.map((l) => (
            <Linha key={l.chave} id={id} l={l} desabilitado={desabilitado}
              aoMudar={(alvo, periodos, focar) => mudar(aplicar(est.dias, alvo, periodos), undefined, focar)} />
          ))}
          {modo === 'semana' && (
            <button type="button" className="hf__acao" disabled={desabilitado}
              onClick={() => mudar(est.dias, 'dias', [id + '-' + est.dias[0].data + '-abre'])}>Detalhar dia a dia</button>
          )}
          {modo === 'dias' && podeAgrupar(est.dias) && (
            <button type="button" className="hf__acao" disabled={desabilitado}
              onClick={() => mudar(est.dias, 'semana', [id + '-semana-abre'])}>Voltar a Segunda a sexta</button>
          )}
        </div>
      )}

      <p className="hf__resumo" role="status" data-tom={resumo ? resumo.tom : undefined}>
        {resumo && <><Icone nome={resumo.icone} tamanho={16} /><span>{resumo.texto}</span></>}
      </p>
    </div>
  )
}
