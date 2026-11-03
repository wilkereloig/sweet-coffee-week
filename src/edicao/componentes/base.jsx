/*
 * Peças básicas da camada de edição: link de navegação interna, foto com
 * reserva honesta, estado de carregamento/falha e aviso de cópia desatualizada.
 */
import React from 'react'
import { imagemPublica } from '../dados/publico.js'
import { diaMesDoRetrato } from '../dados/modelo.js'

export function Link ({ href, navigate, children, aoIr, ...resto }) {
  const ir = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    if (aoIr) aoIr()
    navigate(href)
  }
  return <a href={href} onClick={ir} {...resto}>{children}</a>
}

/** Foto do banco com proporção fixa; sem foto, reserva com texto (§6.12: nunca área vazia). */
/** Proporção da própria foto (sem recorte); sem medida, a moldura padrão do lugar. */
export const proporcaoDe = (foto, padrao) => (foto?.largura && foto?.altura ? `${foto.largura} / ${foto.altura}` : padrao)

export function Foto ({ foto, bucket, alt, proporcao = '1 / 1', reserva = 'Foto em produção', className = '', prioridade = false }) {
  const src = imagemPublica(foto, bucket)
  const [falhou, setFalhou] = React.useState(false)
  const estilo = { '--ct-proporcao': proporcao } // CSS decide (.ct-foto); o celular pode sobrescrever sem !important
  if (!src || falhou) {
    return <div className={`ct-foto ct-foto--reserva ${className}`} style={estilo}><span>{reserva}</span></div>
  }
  const foco = foto.foco ? `${Math.round(foto.foco.x * 100)}% ${Math.round(foto.foco.y * 100)}%` : undefined
  return (
    <div className={`ct-foto ${className}`} style={estilo}>
      <img src={src} alt={alt ?? foto.alt ?? ''} width={foto.largura || undefined} height={foto.altura || undefined}
        loading={prioridade ? 'eager' : 'lazy'} decoding="async" style={foco ? { objectPosition: foco } : undefined}
        onError={() => setFalhou(true)} />
    </div>
  )
}

/** Logo oficial; sem logo, monograma neutro (não é logo inventada — é a inicial em texto). */
export function Logo ({ casa, tamanho = 72 }) {
  const src = imagemPublica(casa?.logo)
  const [falhou, setFalhou] = React.useState(false)
  if (src && !falhou) {
    return <img className="ct-logo" src={src} alt={`Logo de ${casa.nome}`} width={tamanho} height={tamanho} loading="lazy" onError={() => setFalhou(true)} />
  }
  const inicial = (casa?.nome || '?').replace(/^\[DEMO\]\s*/, '').trim().charAt(0).toUpperCase()
  return <span className="ct-logo ct-logo--monograma" style={{ width: tamanho, height: tamanho }} aria-hidden="true">{inicial}</span>
}

export function Carregando ({ texto = 'Carregando…' }) {
  return <div className="ct-estado" role="status" aria-live="polite"><p>{texto}</p></div>
}

/** `principal`: o estado É a página (título vira o <h1>); senão é um bloco dentro dela. */
export function Falha ({ titulo, texto, tentar, children, principal = false }) {
  const H = principal ? 'h1' : 'h2'
  return (
    <div className="ct-estado ct-estado--falha" role="alert">
      <H className="ct-estado__titulo">{titulo}</H>
      {texto && <p>{texto}</p>}
      {tentar && <button type="button" className="ct-botao" onClick={tentar}>Tentar de novo</button>}
      {children}
    </div>
  )
}

export function AvisoDesatualizado ({ ativo }) {
  if (!ativo) return null
  return <p className="ct-aviso" role="status">Sem conexão agora: mostrando a última versão carregada, que pode estar desatualizada.</p>
}

export function AvisoDemo ({ ativo }) {
  if (!ativo) return null
  return <p className="ct-aviso ct-aviso--demo" role="note">Dados de demonstração (só em desenvolvimento). Nada aqui é real.</p>
}

/** Só no DEV, quando a edição veio do retrato local do painel (§10.9): sem a faixa, ninguém sabe que o dado não é o publicado. */
export function AvisoRetrato ({ retrato }) {
  if (!import.meta.env.DEV || !retrato?.lido_em) return null
  return <p className="ct-aviso ct-aviso--retrato" role="note">Retrato local do painel · {diaMesDoRetrato(retrato.lido_em)}</p>
}

/** Os três avisos de origem do dado, na ordem de sempre: toda página usa este, não os três soltos. */
export function Avisos ({ desatualizado = false, demo = false, retrato = null }) {
  return <><AvisoDesatualizado ativo={desatualizado} /><AvisoDemo ativo={demo} /><AvisoRetrato retrato={retrato} /></>
}
