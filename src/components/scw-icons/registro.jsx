import React from 'react'
import { FAMILIAS, ALIASES } from './gerado/especificacao'

/*
 * Iconografia SCW v3 — o núcleo que site e painel compartilham (14/10/2026).
 *
 * Duas famílias, um nome:
 *   interface  (grade 24) · 16 · 20 · 24 px — botão, campo, aba, lista, selo
 *   expressiva (grade 48) · 32 · 48 · 64 px — gastronomia e símbolos do festival
 * Um nome pode ter os dois desenhos (ex.: "cupcake"); o TAMANHO escolhe qual
 * aparece. Marca de terceiro (Instagram) vale em qualquer tamanho.
 *
 * Os catálogos chegam por parâmetro — quem importa decide o peso: a casca do
 * site (menu, abas, rodapé) leva só a interface; seção e painel levam as duas.
 * Fonte e regras: icones/README.md. Nada aqui se edita para mudar desenho.
 */

const DEV = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV

export function canonico(nome) {
  return ALIASES[nome] || nome
}

/** px de traço na tela → unidades da grade, interpolando entre os tamanhos previstos. */
export function tracoPara(familia, tamanho) {
  const f = FAMILIAS[familia]
  const pares = f.tamanhos.map((t) => [t, (f.traco[t] * t) / f.grade])
  let px = pares[0][1]
  if (tamanho >= pares[pares.length - 1][0]) px = pares[pares.length - 1][1]
  else for (let i = 0; i < pares.length - 1; i++) {
    const [a, pa] = pares[i], [b, pb] = pares[i + 1]
    if (tamanho >= a && tamanho <= b) { px = pa + ((pb - pa) * (tamanho - a)) / (b - a); break }
  }
  return +((px * f.grade) / tamanho).toFixed(3)
}

/**
 * Acha o desenho. `catalogos` = { interface, expressiva? }.
 * Devolve null para nome inexistente (e reclama em DEV) — nunca um <svg> vazio.
 */
export function resolver(nome, tamanho, catalogos) {
  const canon = canonico(nome)
  const ui = catalogos.interface && catalogos.interface[canon]
  const ex = catalogos.expressiva && catalogos.expressiva[canon]
  if (!ui && !ex) {
    if (DEV) console.error('[icone] nome inexistente: "' + nome + '"')
    return null
  }
  if (ui && ui.m) return { canon, familia: 'marcas', desenho: ui }
  const querExpressiva = tamanho >= 28
  if (querExpressiva && ex) return { canon, familia: 'expressiva', desenho: ex }
  if (!querExpressiva && ui) return { canon, familia: 'interface', desenho: ui }
  if (DEV) console.warn('[icone] "' + nome + '" em ' + tamanho + 'px não tem desenho de ' + (querExpressiva ? 'expressiva' : 'interface') + ' — usando o outro')
  return ui ? { canon, familia: 'interface', desenho: ui } : { canon, familia: 'expressiva', desenho: ex }
}

/** Renderiza um desenho resolvido. Título vira <title> de verdade (React escapa). */
export function IconeSvg({ resolvido, tamanho, titulo, className, ...resto }) {
  const { canon, familia, desenho } = resolvido
  const f = FAMILIAS[familia]
  const tr = tracoPara(familia, tamanho)
  const a11y = titulo ? { role: 'img', 'aria-label': titulo } : { 'aria-hidden': 'true' }
  return (
    <svg
      className={className ? 'scw-icone ' + className : 'scw-icone'}
      width={tamanho}
      height={tamanho}
      viewBox={'0 0 ' + f.grade + ' ' + f.grade}
      fill="none"
      stroke="currentColor"
      strokeWidth={tr}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      data-icone={canon}
      data-familia={familia}
      {...a11y}
      {...resto}
    >
      {titulo ? <title>{titulo}</title> : null}
      {desenho.e.map(([Tag, attrs, classe], i) => (
        <Tag
          key={i}
          {...attrs}
          {...(classe === 'solido' ? { fill: 'currentColor', stroke: 'none' } : null)}
          {...(classe === 'detalhe' ? { strokeWidth: +(tr * f.detalhe).toFixed(3) } : null)}
        />
      ))}
    </svg>
  )
}

/** Monta um componente de ícone sobre os catálogos escolhidos. */
export function criarIcone(catalogos, padrao) {
  function Icone({ nome, tamanho = padrao, titulo, className, ...resto }) {
    const r = resolver(nome, tamanho, catalogos)
    if (!r) return null
    if (DEV && r.familia !== 'marcas' && !FAMILIAS[r.familia].tamanhos.includes(tamanho)) {
      console.warn('[icone] "' + nome + '" em ' + tamanho + 'px: fora da escala da família ' + r.familia + ' (' + FAMILIAS[r.familia].tamanhos.join('/') + ')')
    }
    return <IconeSvg resolvido={r} tamanho={tamanho} titulo={titulo} className={className} {...resto} />
  }
  return Icone
}
