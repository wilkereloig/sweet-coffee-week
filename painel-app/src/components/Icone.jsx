import React from 'react'
import { SCW_ICONS, SCW_ICON_SPEC } from '../../../src/components/scw-icons/scw-icons-v2'

/*
 * Ícones do painel — registro ÚNICO (reconstrução visual, 29/09/2026).
 *
 * Antes eram dois sistemas (organização 24/1.8, marca 32/2.2) e seis conjuntos
 * soltos em vistas. Agora:
 * - nome com "/" (ex.: "doces/cupcake") vem do sistema do SITE
 *   (src/components/scw-icons, grade 32, traço 3.2). ⛔ Aquele arquivo não se
 *   edita à mão (CLAUDE.md §6.11); família expressiva só a partir de 24px.
 * - os demais moram aqui, cada um na grade em que foi desenhado (24 ou 32), e o
 *   traço é NORMALIZADO ao peso do site: 3.2 em 32 = 2.4 em 24. Mesmo peso
 *   visual em qualquer tamanho, sem redesenhar.
 * Tamanhos da escala: 16 · 20 · 24 · 32 (§6.11). Cor: sempre currentColor.
 */
const TRACO_32 = SCW_ICON_SPEC.strokeWidth
const traco = (vb) => (vb === 24 ? TRACO_32 * 0.75 : TRACO_32)

const R = {}
const def = (vb, nomes, d) => { for (const n of nomes.split(' ')) R[n] = { vb, d } }

// ── Grade 24 ──────────────────────────────────────────────────────────────
def(24, 'visao resumo', <><path d="M5 20V11" /><path d="M12 20V5" /><path d="M19 20v-6" /><path d="M3.5 20h17" /></>)
def(24, 'participantes', <><path d="M4 20v-1.5A4.5 4.5 0 0 1 8.5 14h3A4.5 4.5 0 0 1 16 18.5V20" /><circle cx="10" cy="7.5" r="3.5" /><path d="M17.5 13.5h4" /><path d="M19.5 11.5v4" /></>)
def(24, 'operacao', <><path d="M8 4H6.5A1.5 1.5 0 0 0 5 5.5v14A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-14A1.5 1.5 0 0 0 17.5 4H16" /><rect x="8.5" y="2.5" width="7" height="3.5" rx="1.2" /><path d="m8.5 12 2 2 3.5-3.5" /><path d="M8.5 17h5" /></>)
def(24, 'admin', <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2" /><circle cx="16.5" cy="15.5" r="2.5" /><path d="M16.5 11.5v1.2" /><path d="M16.5 18.3v1.2" /><path d="m13.6 13.2.9.6" /><path d="m18.5 16.7.9.6" /></>)
def(24, 'edicao', <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M7.5 13.5h3" /><path d="M7.5 16.5h6" /></>)
def(24, 'contatos', <path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" />)
def(24, 'pasta arquivos-org', <><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v8.8A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5Z" /><path d="M12 11.5v5" /><path d="m9.8 14.5 2.2 2.2 2.2-2.2" /></>)
def(24, 'fotos guia', <><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" /><circle cx="12" cy="13" r="3.5" /></>)
def(24, 'respostas', <><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z" /><path d="M9 11h6" /><path d="M9 14.5h3.5" /></>)
def(24, 'mensagem', <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z" />)
def(24, 'sair', <><path d="M8.6 17.6 15 11l-6.4-6.6" /><path d="M15 11H3.4" /><path d="M18.6 4.4v13.2" /></>)
def(24, 'atualizar', <><path d="M4.6 12a7.4 7.4 0 0 1 12.6-5.2l1.8 1.7" /><path d="M19 4.6v4.4h-4.4" /><path d="M19.4 12a7.4 7.4 0 0 1-12.6 5.2l-1.8-1.7" /><path d="M5 19.4V15h4.4" /></>)
def(24, 'conta', <><circle cx="12" cy="8.2" r="3.6" /><path d="M4.8 20v-1.2A5.2 5.2 0 0 1 10 13.6h4a5.2 5.2 0 0 1 5.2 5.2V20" /></>)
def(24, 'sino', <><path d="M12 4.4c-3 0-5.4 2.4-5.4 5.6v3.3L5 16.6h14l-1.6-3.3v-3.3c0-3.2-2.4-5.6-5.4-5.6Z" /><path d="M10 19.2a2 2 0 0 0 4 0" /></>)
def(24, 'feito', <path d="M6.4 12.4l3.6 3.6 7.6-8" />)
def(24, 'atencao', <><path d="M12 6.8v6.4" /><circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" /></>)
def(24, 'andamento relogio', <><circle cx="12" cy="12" r="7.4" /><path d="M12 8v4.4l2.8 1.8" /></>)
def(24, 'pendente circulo', <circle cx="12" cy="12" r="7.4" />)
def(24, 'correcao alteracao', <><path d="M5 12a7 7 0 0 1 12-4.9L19 9" /><path d="M19 4.6V9h-4.4" /><path d="M19 12a7 7 0 0 1-12 4.9L5 15" /><path d="M5 19.4V15h4.4" /></>)
def(24, 'editar campo', <><path d="M5 19h14" /><path d="M14.6 5.4l3.4 3.4-8.4 8.4H6.2v-3.4Z" /></>)
def(24, 'pedido alerta-triangulo', <><path d="M12 4.2 21 20H3Z" /><path d="M12 10.2v4" /><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" /></>)
def(24, 'baixar arquivo', <><path d="M12 4v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M5 20h14" /></>)
def(24, 'enviar', <><path d="M4 12 20 4l-4.4 16-4.2-6.4Z" /><path d="M11.4 13.6 20 4" /></>)
def(24, 'ok-circulo aprovado cadastro-ok', <><circle cx="12" cy="12" r="8.8" /><path d="M7.8 12.3l3 3 5.4-6.4" /></>)
def(24, 'formulario', <><path d="M7 4h10a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 7 4Z" /><path d="M9 9h6M9 12.5h6M9 16h3.5" /></>)
def(24, 'informacao', <><circle cx="12" cy="12" r="8.8" /><path d="M12 11v5.4" /><circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none" /></>)
def(24, 'atencao-circulo pendencia', <><circle cx="12" cy="12" r="8.8" /><path d="M12 7.4v5.6" /><circle cx="12" cy="16.4" r="1" fill="currentColor" stroke="none" /></>)
def(24, 'fechar', <path d="M6 6l12 12M18 6 6 18" />)
def(24, 'mais-acoes', <><circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none" /></>)
def(24, 'grade', <><rect x="4" y="4" width="6.5" height="6.5" rx="1.6" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" /></>)
def(24, 'mais', <><path d="M12 5v14" /><path d="M5 12h14" /></>)
def(24, 'voltar', <path d="M14.5 5.5 8 12l6.5 6.5" />)
def(24, 'ir', <path d="M9.5 5.5 16 12l-6.5 6.5" />)
// Novos (29/09/2026), mesma gramática: chave, imagem, engrenagem, histórico,
// copiar, arquivar, pessoas, cadeado.
def(24, 'chave acesso', <><circle cx="8" cy="15" r="3.8" /><path d="M10.8 12.3 19 4.2" /><path d="m15.6 7.6 2.4 2.4" /><path d="m17.8 5.4 2 2" /></>)
def(24, 'cadeado bloqueado', <><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.4 10.5V8a3.6 3.6 0 0 1 7.2 0v2.5" /></>)
def(24, 'imagem logo', <><rect x="3.8" y="4.8" width="16.4" height="14.4" rx="2" /><circle cx="9" cy="10" r="1.7" /><path d="m4.4 17.6 5-4.8 3.4 3.2 2.6-2.4 4.4 4" /></>)
def(24, 'engrenagem config', <><circle cx="12" cy="12" r="3" /><path d="M12 3.6v2.2M12 18.2v2.2M3.6 12h2.2M18.2 12h2.2M6.1 6.1l1.5 1.5M16.4 16.4l1.5 1.5M6.1 17.9l1.5-1.5M16.4 7.6l1.5-1.5" /></>)
def(24, 'historico', <><path d="M4.4 12a7.6 7.6 0 1 0 2.2-5.4" /><path d="M4.2 4.4v3.8H8" /><path d="M12 8.2v4.2l2.8 1.8" /></>)
def(24, 'copiar', <><rect x="8.4" y="8.4" width="11" height="11" rx="2" /><path d="M15.6 8.4V6.2a1.6 1.6 0 0 0-1.6-1.6H6.2a1.6 1.6 0 0 0-1.6 1.6V14a1.6 1.6 0 0 0 1.6 1.6h2.2" /></>)
def(24, 'arquivar', <><rect x="3.8" y="4.8" width="16.4" height="4.2" rx="1.2" /><path d="M5.4 9v9a1.6 1.6 0 0 0 1.6 1.6h10a1.6 1.6 0 0 0 1.6-1.6V9" /><path d="M10 12.6h4" /></>)
def(24, 'lixeira apagar', <><path d="M4.6 7h14.8" /><path d="M9.4 7V5.4A1.4 1.4 0 0 1 10.8 4h2.4a1.4 1.4 0 0 1 1.4 1.4V7" /><path d="M6.4 7l.9 11.6A1.6 1.6 0 0 0 8.9 20h6.2a1.6 1.6 0 0 0 1.6-1.4L17.6 7" /><path d="M10.4 10.8v5.4M13.6 10.8v5.4" /></>)
def(24, 'restaurar', <><path d="M5 12a7 7 0 1 0 2.1-5" /><path d="M5 4.6V9h4.4" /></>)
def(24, 'pessoas',<><circle cx="9" cy="8.4" r="3.2" /><path d="M3.6 19.6v-1a4.6 4.6 0 0 1 4.6-4.6h1.6a4.6 4.6 0 0 1 4.6 4.6v1" /><path d="M15.4 5.4a3.2 3.2 0 0 1 0 6" /><path d="M17.6 14.2a4.6 4.6 0 0 1 2.8 4.2v1.2" /></>)

// ── Grade 32 ──────────────────────────────────────────────────────────────
def(32, 'inicio', <><path d="M4.6 15.4 16 5.4l11.4 10" /><path d="M8 12.6v13.2h16V12.6" /><path d="M13.4 25.8v-6.6h5.2v6.6" /></>)
def(32, 'combo', <><path d="M6.4 12.4h15.2v6.2a6.8 6.8 0 0 1-6.8 6.8h-1.6a6.8 6.8 0 0 1-6.8-6.8Z" /><path d="M21.6 14.4h1.8a3.4 3.4 0 0 1 0 6.8h-2.2" /><path d="M11.4 4.6c-1.2 1.5 1.2 2.6 0 4.2M16.4 4.6c-1.2 1.5 1.2 2.6 0 4.2" /></>)
def(32, 'cadastro', <><path d="M6.6 6.4h18.8a2 2 0 0 1 2 2v15.2a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2V8.4a2 2 0 0 1 2-2Z" /><rect x="8.4" y="10.4" width="7.2" height="7.2" rx="1.6" fill="currentColor" stroke="none" /><path d="M18.8 11.6h5.2M18.8 15.8h5.2M8.4 21.6h15.6" /></>)
def(32, 'pedidos', <><path d="M16 5.2 28.8 26.8H3.2L16 5.2Z" /><path d="M16 13v5.6" /><circle cx="16" cy="22.6" r="1.5" fill="currentColor" stroke="none" /></>)
def(32, 'mensagens', <><path d="M26.6 16a10 10 0 0 1-14.5 8.9L5.4 26.6l1.7-5.5A10 10 0 1 1 26.6 16Z" /><path d="M11.4 14.6h9.2M11.4 19h5.6" /></>)
def(32, 'arquivos downloads', <><path d="M16 5v14.4" /><path d="M9.4 13.6 16 20.2l6.6-6.6" /><path d="M6 25.8h20" /></>)
// Esteira da Visão geral.
def(32, 'etapa-novas', <><path d="M7.4 4.6h17.2a2 2 0 0 1 2 2v18.8a2 2 0 0 1-2 2H7.4a2 2 0 0 1-2-2V6.6a2 2 0 0 1 2-2Z" /><path d="M10.6 11.4h10.8M10.6 16h10.8M10.6 20.6h5.4" /></>)
def(32, 'etapa-analise', <><path d="M4.6 8.6h22.8a2 2 0 0 1 2 2v10.8a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2V10.6a2 2 0 0 1 2-2Z" /><circle cx="10" cy="16" r="2.2" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="2.2" fill="currentColor" stroke="none" /><circle cx="22" cy="16" r="2.2" fill="currentColor" stroke="none" /></>)
def(32, 'etapa-contatadas', <><path d="M28.4 4.6 3.6 14.4l9.2 3.6 3.6 9.2Z" /><path d="M28.4 4.6 12.8 18" /></>)
def(32, 'etapa-aprovadas', <><circle cx="16" cy="16" r="12.2" strokeDasharray="0.1 6.2" /><path d="M10.8 16.4l4.2 4.2 6.6-8" /></>)
def(32, 'etapa-acesso bloco-marca sacola', <><path d="M6.6 11.4h18.8l-1.4 14a2.2 2.2 0 0 1-2.2 2H10.2a2.2 2.2 0 0 1-2.2-2Z" /><path d="M11.8 11.4V9a4.2 4.2 0 0 1 8.4 0v2.4" /></>)
def(32, 'etapa-completas', <><circle cx="16" cy="16" r="11.8" /><path fill="currentColor" stroke="none" d="M16 8.2c1.4 4 3.6 6.2 7.6 7.6-4 1.4-6.2 3.6-7.6 7.6-1.4-4-3.6-6.2-7.6-7.6 4-1.4 6.2-3.6 7.6-7.6Z" /></>)
def(32, 'item-doce', <><path d="M7 13.4a9 9 0 0 1 18 0Z" /><path d="M7.8 13.4h16.4l-2 11.6a2.2 2.2 0 0 1-2.2 1.8h-8a2.2 2.2 0 0 1-2.2-1.8Z" /></>)
def(32, 'item-salgado', <><circle cx="11.4" cy="18.4" r="7.6" /><circle cx="22.4" cy="12" r="6.4" /></>)
def(32, 'item-bebida', <><path d="M6 12h13.6v4.4a6.8 6.8 0 0 1-13.6 0Z" /><path d="M19.6 13.8h2.2a2.8 2.8 0 0 1 0 5.6h-2.2" /><path d="M4.4 27.8h17.2" /></>)
// Blocos do formulário da marca.
def(32, 'bloco-tema tema', <><path d="M16 4.4a8.4 8.4 0 0 1 4.9 15.2v2.6h-9.8v-2.6A8.4 8.4 0 0 1 16 4.4Z" /><path d="M12.2 24.4h7.6M13.4 27.6h5.2" /></>)
def(32, 'bloco-itens', <><path fill="currentColor" stroke="none" d="M2.6 17h7.4l-.8 4.6a1.3 1.3 0 0 1-1.3 1.1H4.7a1.3 1.3 0 0 1-1.3-1.1Z" /><circle cx="6.3" cy="14" r="3.4" fill="currentColor" stroke="none" /><path fill="currentColor" stroke="none" d="M12 22.6 16.2 10.2l4.2 12.4Z" /><path fill="currentColor" stroke="none" d="M22.6 14.6h7.6l-1 6.8a1.4 1.4 0 0 1-1.4 1.2h-2.8a1.4 1.4 0 0 1-1.4-1.2Z" /><path d="M1.6 25.8h28.8" /></>)
def(32, 'bloco-preco preco', <><path d="M27.4 15.6 16.4 26.6a2.2 2.2 0 0 1-3.1 0L5.4 18.7a2.2 2.2 0 0 1 0-3.1L16.4 4.6h9.9a1.1 1.1 0 0 1 1.1 1.1Z" /><circle cx="21.8" cy="10.2" r="2.2" fill="currentColor" stroke="none" /></>)
def(32, 'bloco-local local unidades', <><path d="M16 28.4s8.6-9.6 8.6-15.6a8.6 8.6 0 1 0-17.2 0c0 6 8.6 15.6 8.6 15.6Z" /><rect x="12.4" y="9.2" width="7.2" height="7.2" rx="2" fill="currentColor" stroke="none" /></>)

/*
 * Um assunto = um ícone, em todo o painel (lista, ficha, menu, área da marca).
 * O teste painel-app-icone confere que toda chave daqui existe.
 */
export const MODULO_ICONE = {
  resumo: 'visao', cadastro: 'cadastro', combo: 'combo', doce: 'item-doce', salgado: 'item-salgado',
  bebida: 'item-bebida', preco: 'preco', tema: 'tema', unidades: 'local', pedidos: 'pedidos',
  operacao: 'operacao', fotos: 'fotos', arquivos: 'pasta', logo: 'imagem', acesso: 'chave',
  mensagens: 'mensagens', historico: 'historico', trajetoria: 'premios/trofeu', notificacoes: 'sino',
  pendencias: 'atencao-circulo', aprovado: 'ok-circulo', whatsapp: 'redes/conversa', voucher: 'mecanica/voucher',
  presskit: 'comercial/midia-kit', contatos: 'contatos', participantes: 'participantes', config: 'engrenagem',
  edicao: 'edicao', instagram: 'redes/instagram', email: 'redes/e-mail', estabelecimento: 'simbolos/estabelecimento',
}

/** A cor do selo diz a natureza; o ícone repete a natureza sem depender da cor. */
export const ICONE_TOM = { neutro: 'circulo', andamento: 'relogio', atencao: 'atencao-circulo', ok: 'ok-circulo', encerrado: 'arquivar' }

export function existeIcone(nome) {
  return !!(R[nome] || SCW_ICONS[nome])
}

export function Icone({ nome, tamanho = 20, titulo, className }) {
  const a11y = titulo ? { role: 'img', 'aria-label': titulo } : { 'aria-hidden': 'true' }
  const comum = { className, width: tamanho, height: tamanho, fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', focusable: 'false', ...a11y }
  const local = R[nome]
  if (local) {
    return <svg viewBox={'0 0 ' + local.vb + ' ' + local.vb} strokeWidth={traco(local.vb)} {...comum}>{local.d}</svg>
  }
  const scw = SCW_ICONS[nome]
  if (!scw) return null
  // SVG do sistema do site: string gerada no Design (não é entrada de usuário).
  return <svg viewBox={SCW_ICON_SPEC.viewBox} strokeWidth={SCW_ICON_SPEC.strokeWidth} {...comum} dangerouslySetInnerHTML={{ __html: scw }} />
}
