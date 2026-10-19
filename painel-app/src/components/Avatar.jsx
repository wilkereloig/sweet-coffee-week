import React from 'react'
import { Icone } from './Icone'
import { useEquipe, tipoAutor, nomeAutor, iniciais } from '../lib/equipe'

/*
 * Avatar da EQUIPE (não é logo de participante — essa é LogoMarca, em ui.jsx).
 * `id` = conta (user_id gravado no registro), `rotulo` = nome gravado no
 * registro. Foto vem do diretório pelo id; sem foto (ou com a foto removida),
 * iniciais — sempre o mesmo desenho, para todo mundo. Acesso compartilhado e
 * sistema não têm rosto: ícone neutro, nunca iniciais de uma pessoa.
 *
 * O nome ao lado é quem identifica: a imagem é decorativa (alt=""). Sozinho
 * (sem nome visível ao lado), passe `rotuloVisivel={false}` e ele vira img
 * com nome acessível.
 */
export function Avatar({ id, rotulo, tamanho = 32, rotuloVisivel = true, className = '' }) {
  const { pessoas, fotos } = useEquipe()
  const p = id ? pessoas[id] : null
  const tipo = tipoAutor(id, rotulo)
  const nome = nomeAutor(id, rotulo, p)
  const chave = p && p.avatar_path ? 'equipe:' + p.avatar_path : ''
  const url = chave && fotos ? fotos.urls[chave] : null
  const [falhou, setFalhou] = React.useState(false)
  const tentou = React.useRef(false)
  // Pessoa/foto nova: recomeça. Endereço novo da MESMA foto (renovação de 4 min): tenta mostrar de novo,
  // mas `tentou` só zera com a foto — uma foto quebrada pede assinatura nova UMA vez, nunca em laço.
  React.useEffect(() => { tentou.current = false }, [chave])
  React.useEffect(() => { setFalhou(false) }, [chave, url])
  const acessivel = rotuloVisivel ? { 'aria-hidden': true } : { role: 'img', 'aria-label': nome }
  const estilo = { '--av-t': tamanho + 'px' }
  const cls = 'ui-avatar ' + className
  if (tipo === 'pessoa' && url && !falhou) {
    return (
      <span className={cls} style={estilo} data-tipo="foto" {...acessivel}>
        <img src={url} alt="" loading="lazy" decoding="async"
          onError={() => { if (!tentou.current && fotos) { tentou.current = true; fotos.renovar({ bucket: 'equipe', path: p.avatar_path }) } else setFalhou(true) }} />
      </span>
    )
  }
  if (tipo === 'pessoa' || tipo === 'marca') {
    const texto = tipo === 'marca' ? nome.replace(/^Marca ·\s*/, '') : nome
    return <span className={cls} style={estilo} data-tipo={tipo} {...acessivel}>{iniciais(texto)}</span>
  }
  return (
    <span className={cls} style={estilo} data-tipo={tipo} {...acessivel}>
      <Icone nome={tipo === 'compartilhado' ? 'chave' : 'configuracoes'} tamanho={tamanho >= 32 ? 20 : 16} />
    </span>
  )
}

/** Avatar + nome (+ complemento: função, quando, ação). O nome é o gravado no registro. */
export function Autor({ id, rotulo, tamanho = 24, children, className = '' }) {
  const { pessoas } = useEquipe()
  const p = id ? pessoas[id] : null
  const nome = nomeAutor(id, rotulo, p)
  return (
    <span className={'ui-autor ' + className}>
      <Avatar id={id} rotulo={rotulo} tamanho={tamanho} />
      <span className="ui-autor__texto">
        <span className="ui-autor__nome">{nome}</span>
        {p && p.ativo === false && <span className="ui-autor__nota"> (conta desativada)</span>}
        {children}
      </span>
    </span>
  )
}
