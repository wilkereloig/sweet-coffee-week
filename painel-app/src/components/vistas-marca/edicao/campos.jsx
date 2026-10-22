import React from 'react'
import { Icone } from '../../Icone'

/*
 * Peças pequenas do cadastro da marca, usadas pelos blocos de Cadastro.jsx e
 * pelos blocos da camada de edição (Cartoon 2026.2).
 *
 * Estado de cada campo obrigatório (guia da marca, 29/09/2026): ícone + texto
 * ao lado do rótulo, nunca só cor. "Completo/Falta" é calculado ao vivo;
 * "Alteração solicitada" e "Em análise" vêm da organização (correcoes_campo).
 */
const ESTADO_CAMPO = {
  completo: { icone: 'feito', texto: 'Completo' },
  falta: { icone: 'atencao', texto: 'Falta' },
  alteracao: { icone: 'editar', texto: 'Alteração solicitada' },
  analise: { icone: 'horario', texto: 'Em análise' },
  aprovado: { icone: 'sucesso', texto: 'Aprovado' },
  espera: { icone: 'horario', texto: 'Em espera' },
}
export function EstadoCampo({ e }) {
  if (!e) return null
  const x = ESTADO_CAMPO[e.estado]
  if (!x) return null
  return <span className="gm-campo-estado" data-estado={e.estado}><Icone nome={x.icone} tamanho={16} />{x.texto}</span>
}

/*
 * O mesmo vocabulário, no cabeçalho do bloco (lib/edicaoMarca · estadoDoBloco): ícone + palavras, nunca só
 * cor. "Preenchido" e "Aprovado" são estados DIFERENTES — só a organização aprova.
 */
export function EstadoBloco({ e }) {
  const x = e && ESTADO_CAMPO[e.estado]
  if (!x) return null
  return <span className="gm-campo-estado em-estado-bloco" data-estado={e.estado}><Icone nome={x.icone} tamanho={16} />{e.texto}</span>
}

// "(opcional)" escrito de um jeito só. Um texto no lugar de "opcional" cabe quando o motivo é outro
// (a logo conta no progresso, mas não trava o envio).
export function Opcional({ children = 'opcional' }) {
  return <em className="em-opcional">({children})</em>
}
export function Correcao({ e }) {
  if (!e || e.estado !== 'alteracao' || !e.comentario) return null
  return <span className="gm-correcao" role="note"><b>A organização pediu:</b> {e.comentario}</span>
}

// O que vai para o site e o que fica com a organização — texto + ícone, nunca só cor.
// Selo por linha SÓ para a exceção dentro de um grupo (ex.: o CEP, "uso interno", no meio de campos públicos).
export function Publico({ sim = true }) {
  return (
    <span className="em-publico" data-publico={sim ? 'sim' : 'nao'}>
      <Icone nome={sim ? 'visao' : 'cadeado'} tamanho={16} />{sim ? 'aparece no site' : 'uso interno'}
    </span>
  )
}

/*
 * Grupo de campos com a MESMA visibilidade, explicada UMA vez na cabeça do grupo (em vez de um selo por
 * linha): "Aparece no site" ou "Uso interno da organização".
 */
export function GrupoPublico({ sim = true, children }) {
  const idTitulo = React.useId()
  return (
    <div className="em-grupo" role="group" aria-labelledby={idTitulo} data-publico={sim ? 'sim' : 'nao'}>
      <p className="em-grupo__cab">
        <b id={idTitulo}><Icone nome={sim ? 'visao' : 'cadeado'} tamanho={16} />{sim ? 'Aparece no site' : 'Uso interno da organização'}</b>
        <span>{sim ? 'O que você preencher aqui aparece na sua página do site.' : 'Só a organização vê. Nada disto aparece no site.'}</span>
      </p>
      {children}
    </div>
  )
}

export function Contador({ valor, max }) {
  const n = String(valor || '').length
  return <span className="em-contador" data-cheio={n >= max ? 'sim' : undefined}>{n} de {max}</span>
}

/*
 * Grupo de rádios com fieldset/legend de verdade. Nenhum marcado = ainda não
 * respondido: o grupo nunca pré-seleciona uma resposta.
 */
export function Escolhas({ nome, legenda, opcoes, valor, onMudar, ajuda, id, children }) {
  const idAjuda = ajuda ? 'ajuda-' + nome : undefined
  return (
    <fieldset className="marcar-grupo mc-restricoes em-escolhas" id={id} tabIndex={id ? -1 : undefined} aria-describedby={idAjuda}>
      <legend className="marcar-grupo__pergunta">{legenda}</legend>
      {ajuda && <span className="em-ajuda" id={idAjuda}>{ajuda}</span>}
      {opcoes.map(([v, r]) => (
        <label className="marcar" key={v}>
          <input type="radio" name={nome} checked={valor === v} onChange={() => onMudar(v)} /><span>{r}</span>
        </label>
      ))}
      {children}
    </fieldset>
  )
}
