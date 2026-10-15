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
}
export function EstadoCampo({ e }) {
  if (!e) return null
  const x = ESTADO_CAMPO[e.estado]
  if (!x) return null
  return <span className="gm-campo-estado" data-estado={e.estado}><Icone nome={x.icone} tamanho={16} />{x.texto}</span>
}
export function Correcao({ e }) {
  if (!e || e.estado !== 'alteracao' || !e.comentario) return null
  return <span className="gm-correcao" role="note"><b>A organização pediu:</b> {e.comentario}</span>
}

// O que vai para o site e o que fica com a organização — texto + ícone, nunca só cor.
export function Publico({ sim = true }) {
  return (
    <span className="em-publico" data-publico={sim ? 'sim' : 'nao'}>
      <Icone nome={sim ? 'visao' : 'cadeado'} tamanho={16} />{sim ? 'aparece no site' : 'uso interno'}
    </span>
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
