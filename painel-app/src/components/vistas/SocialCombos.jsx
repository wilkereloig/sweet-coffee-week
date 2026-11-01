import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Icone, MODULO_ICONE } from '../Icone'
import { Carregando, Vazio, Erro, Selo, Modulo, GradeModulos, Botao, Chips, MarcaComLogo } from '../ui'
import { useLeitura } from '../../lib/leituraVivaReact'
import {
  FILTROS_COMBOS, filtrarCombos, contarCombos, preenchido, textoDoCombo, textoDeTodos, itensOrdenados, trocasDoCombo,
  alimentarDoItem, linhaAlergenicos, faltas, arroba, real, TIPOS,
} from '../../lib/combosTexto'
import '../../styles/social-combos.css'

/*
 * Social media › Combos (31/10/2026, pedido do Wilker): os combos da edição, UMA seção por participante, para quem escreve as
 * postagens (a Micaela) não abrir marca por marca. É o MESMO combo da ficha editorial (`montar_publico`), lido por
 * `editorial_combos`: sem telefone, e-mail, CNPJ, custos nem pagamento. Só lê — nada aqui grava no cadastro.
 *
 * "Copiar texto" gera o texto para o WhatsApp (lib/combosTexto.js), da marca ou de todos os que estão na tela. Selos e
 * alergênicos são o que a marca declarou; o que ficou sem resposta aparece dito, nunca como "não contém".
 */

const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }
const ALVO = { vista: 'social', aba: 'combos' }
const ROTULO_TIPO = Object.fromEntries(TIPOS)
const hoje = () => new Date().toLocaleDateString('pt-BR')

function ItemDoCombo({ item }) {
  const a = alimentarDoItem(item)
  return (
    <li className="scb-item">
      <p className="scb-item__tipo"><Icone nome={MODULO_ICONE[item.tipo] || MODULO_ICONE.combo} tamanho={18} />{ROTULO_TIPO[item.tipo] || item.tipo}</p>
      <p className="scb-item__nome">{item.nome || <span className="scb-vazio">ainda sem nome</span>}</p>
      {item.descricao && <p className="scb-texto">{item.descricao}</p>}
      {item.ingredientes && <p className="scb-texto"><b>Ingredientes:</b> {item.ingredientes}</p>}
      <Chips itens={a.selos.map((s) => ({ rotulo: s }))} rotulo={'Selos declarados: ' + (ROTULO_TIPO[item.tipo] || item.tipo)} />
      <p className="scb-alerg">{linhaAlergenicos(a)}</p>
    </li>
  )
}

export function CartaoCombo({ d, onCopiar }) {
  const c = d.combo || {}
  const ok = preenchido(d)
  const trocas = trocasDoCombo(d)
  const falta = faltas(d)
  return (
    <Modulo
      largo icone={MODULO_ICONE.combo}
      titulo={<MarcaComLogo nome={d.marca} participanteId={d.participante_id} tamanho={32} />}
      sub={[d.tema ? 'Tema: ' + d.tema : 'Tema ainda não definido', arroba(d.instagram)].filter(Boolean).join(' · ')}
      status={ok
        ? <><Selo dominio="combo" valor={d.combo_status} />{d.alterado_apos_aprovacao && <Selo tom="atencao">Alterado depois de aprovado</Selo>}</>
        : <Selo tom="atencao">Em branco</Selo>}
      acoes={ok ? <Botao variante="secundario" icone="copiar" onClick={() => onCopiar(textoDoCombo(d), 'Texto de ' + d.marca)}>Copiar texto desta marca</Botao> : null}
    >
      {!ok && <p className="ui-nota">A marca ainda não preencheu nada do combo.</p>}
      {ok && (
        <>
          <p className="scb-combo"><span className="scb-rotulo">Combo</span>{c.nome ? <b>{c.nome}</b> : <span className="scb-vazio">a marca ainda não deu nome ao combo</span>}</p>
          {c.descricao && <p className="scb-texto">{c.descricao}</p>}
          {c.condicoes && <p className="scb-texto"><b>Condições:</b> {c.condicoes}</p>}
          <ul className="scb-itens" aria-label={'Itens do combo de ' + d.marca}>
            {itensOrdenados(d).map((i) => <ItemDoCombo key={i.tipo + ':' + i.posicao} item={i} />)}
          </ul>
          {trocas.length > 0 && (
            <div className="scb-trocas">
              <p className="scb-rotulo">Trocas</p>
              <ul>{trocas.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {d.para_viagem != null && <p className="scb-linha">Para viagem: {d.para_viagem ? 'sim' : 'não'}</p>}
          {falta.length > 0 && <p className="ui-nota scb-faltas">Ainda sem: {falta.join(', ')}.</p>}
        </>
      )}
    </Modulo>
  )
}

export function SocialCombos({ rota, navegar }) {
  const f = rota.filtros || {}
  const filtro = FILTROS_COMBOS.some(([k]) => k === f.mostrar) ? f.mostrar : 'preenchidos'
  const [busca, setBusca] = React.useState(f.q || '')
  const [aviso, setAviso] = React.useState(null) // { ok } | { manual: { rotulo, texto } }
  // Relê sozinha quando o combo, o tema, o cadastro, a logo ou a publicação de qualquer marca mudam.
  const leitura = useLeitura(
    async () => (await rpc('editorial_combos', { p_secret: lerSenha(), p_edicao: null })) || { combos: [] },
    ['editorial', 'participantes', 'cadastro', 'temas', 'publicacao', 'logos', 'edicao'], { chave: 'combos' },
  )
  const dados = leitura.dados === undefined ? null : leitura.dados
  const erro = leitura.bloqueada ? leitura.erro : null
  const lista = dados ? dados.combos || [] : []
  const n = contarCombos(lista)
  const visiveis = filtrarCombos(lista, filtro, f.q || '')
  const paraCopiar = visiveis.filter(preenchido)

  const mudar = (patch, opc) => {
    const x = { ...f, ...patch }
    for (const k of Object.keys(x)) if (x[k] === undefined || x[k] === '') delete x[k]
    navegar({ ...ALVO, filtros: x }, opc)
  }
  React.useEffect(() => {
    if ((f.q || '') === busca) return undefined
    const t = setTimeout(() => mudar({ q: busca || undefined }, { substituir: true }), 300)
    return () => clearTimeout(t)
  }, [busca]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!aviso || !aviso.ok) return undefined
    const t = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(t)
  }, [aviso])

  async function copiar(texto, rotulo) {
    try {
      await navigator.clipboard.writeText(texto)
      setAviso({ ok: rotulo + ' copiado. É só colar no WhatsApp.' })
    } catch {
      // Sem área de transferência (contexto inseguro, permissão negada): o texto fica à vista para copiar à mão. Não finge que copiou.
      setAviso({ manual: { rotulo, texto } })
    }
  }
  function copiarTodos() {
    // O rodapé "ainda sem nada preenchido" só vale para a lista inteira (sem busca).
    const semNada = ['preenchidos', 'todos'].includes(filtro) && !f.q ? lista.filter((d) => !preenchido(d)).map((d) => d.marca) : []
    const rotulo = 'Texto de ' + paraCopiar.length + (paraCopiar.length === 1 ? ' participante' : ' participantes')
    copiar(textoDeTodos(visiveis, { filtro, edicao: dados && dados.edicao, data: hoje(), semNada }), rotulo)
  }

  return (
    <div className="scb">
      <div className="sb-ferramentas">
        <label className="og-campo rd-busca">
          <span className="ui-oculto">Buscar participante</span>
          <input type="search" value={busca} placeholder="Buscar marca, tema ou combo" enterKeyHint="search" onChange={(e) => setBusca(e.target.value)} />
        </label>
        <label className="rd-ver">
          <span className="ui-oculto">Mostrar</span>
          <select value={filtro} onChange={(e) => mudar({ mostrar: e.target.value === 'preenchidos' ? undefined : e.target.value }, { substituir: true })}>
            {FILTROS_COMBOS.map(([k, r]) => <option key={k} value={k}>{r + ' (' + (k === 'todos' ? n.total : n[k]) + ')'}</option>)}
          </select>
        </label>
        <Botao icone="copiar" disabled={!paraCopiar.length} onClick={copiarTodos}>Copiar texto de todos ({paraCopiar.length})</Botao>
      </div>
      {dados && (
        <p className="ui-nota scb-resumo">
          <b>{n.preenchidos} de {n.total}</b> participantes já preencheram algo do combo ({n.aprovados} {n.aprovados === 1 ? 'aprovado' : 'aprovados'})
          {dados.edicao && dados.edicao.valor_combo != null ? ' · valor do combo ' + real(dados.edicao.valor_combo) : ''}.
          {' '}Selos e alergênicos são o que a própria marca declarou; o que está em branco aparece como “ainda sem”.
        </p>
      )}
      {aviso && aviso.ok && <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p>}
      {aviso && aviso.manual && (
        <div className="scb-manual" role="alert">
          <p className="ui-nota ui-nota--erro">Não consegui copiar sozinho. Selecione o texto abaixo e copie ({aviso.manual.rotulo}).</p>
          <label className="og-campo">
            <span className="ui-oculto">{aviso.manual.rotulo}</span>
            <textarea readOnly rows={12} value={aviso.manual.texto} onFocus={(e) => e.target.select()} />
          </label>
          <div className="ui-linha-acoes"><Botao variante="secundario" onClick={() => setAviso(null)}>Fechar</Botao></div>
        </div>
      )}
      {erro && <Erro texto={erro} onTentar={leitura.recarregar} />}
      {leitura.falhouAtualizar && <Erro titulo="Não consegui atualizar" texto={leitura.erro} onTentar={leitura.recarregar} />}
      {!erro && !dados && <Carregando linhas={5} />}
      {!erro && dados && lista.length === 0 && <Vazio titulo="Nenhum participante nesta edição">Os combos aparecem aqui quando há participação aberta na edição.</Vazio>}
      {!erro && dados && lista.length > 0 && visiveis.length === 0 && <Vazio titulo="Ninguém nessa situação">Escolha outra situação ou limpe a busca.</Vazio>}
      {!erro && visiveis.length > 0 && (
        <GradeModulos>
          {visiveis.map((d) => <CartaoCombo key={d.participacao_id} d={d} onCopiar={copiar} />)}
        </GradeModulos>
      )}
    </div>
  )
}
