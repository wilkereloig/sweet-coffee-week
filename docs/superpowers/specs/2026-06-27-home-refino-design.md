# Refino da Home ("O Festival") — Design

**Data:** 2026-06-27
**Branch:** `dev/site-completo`
**Arquivo-alvo:** `src/pages/institutional/Home.jsx` (bloco `<style>` + JSX). Tokens em `src/styles/swc-redesign.css` só se aditivo.

## Contexto

A Home já passou por: revisão de texto institucional, sistema de layout coeso (tokens `--sp-*`,
escala tipográfica, cards responsivos com container queries), remoção de shapes decorativos.
Falta o **refino fino** — o polimento que separa "organizado" de "bem acabado". Quatro frentes:
hero, ritmo entre seções, cards, motion. Manter a estética atual (paleta terracotta/choco +
4 acentos pop, destaque `.hl-w`, fotos reais). Não reestruturar conteúdo nem rotas.

Produção (`master`, Awards-only) intocada.

---

## 1. Hero

**Problema:** o título gigante sobrepõe a borda da foto-selo; "doce/de Natal" caem sobre o bolo
e embolam. Corpo do texto desce demais; CTAs flutuam soltos no canto inferior-direito.

**Solução:**
- **Contraste do título sobre a foto:** gradiente `--swc-chocolate` → transparente atrás da
  coluna de texto (`.swc-hero__copy`), garantindo leitura das letras escuras onde cruzam a foto.
  Não mexer no giro do selo (`swcBadgeSpin`) nem na máscara. Pseudo-elemento em `.swc-hero__copy`
  com `z-index` entre foto (1) e texto (2).
- **Ancorar copy + CTAs:** manter CTAs onde estão (canto inferior-direito é assinatura do layout),
  mas firmar o ritmo da coluna esquerda — `gap` consistente via `--sp-*` entre eyebrow → título →
  corpo. Garantir que em alturas menores o corpo não seja empurrado pra fora.
- Reduced-motion: gradiente é estático, sem impacto.

**Critério:** título 100% legível em qualquer ponto de sobreposição; coluna esquerda com ritmo
firme; nada cortado entre 768–1440px de largura e ≥700px de altura.

## 2. Ritmo entre seções

**Problema:** todas as seções usam `--sp-section` igual → batida monótona. A banda escura
(Números, `--choco`) entra/sai seca.

**Solução:**
- **Variar densidade:** introduzir 2 variantes de ritmo vertical sobre `--sp-section`:
  `--sp-section` (padrão) e um passo mais comprimido para a banda de Números (mais densa, contrasta)
  e um mais arejado para Realização (fecho respirado). Via classe utilitária ou ajuste pontual de
  `padding-block` nas seções específicas — sem novo token global se 1-2 ajustes resolverem.
- **Assentar a banda escura:** revisar o padding de entrada/saída da `.hm-numbers` para a transição
  cream→choco→cream não parecer abrupta (respiro maior antes/depois). Sem shapes (proibidos).

**Critério:** ao rolar, a página tem batida perceptível (denso↔arejado), não régua uniforme.
Banda escura assenta sem corte seco.

## 3. Cards (steps / números / pilares)

**Problema:** cards corretos e consistentes, mas sem o acabamento fino. Já compartilham recipe
(padding `--sp-6`, raio `--r-lg`, sombra, hover, container query).

**Solução:**
- **Steps:** reforçar leitura de sequência 01→04 sem virar timeline pesada — ex.: numeral com
  peso/posição que conduz o olho; manter cor por passo (coral/pink/cyan-deep/yellow-deep).
- **Números (2-col):** alinhar baseline dos valores; label com peso/opacidade mais firme
  (legibilidade já corrigida — cyan usa texto escuro). Conferir contraste do label coral.
- **Pilares:** padronizar hover/elevação com os demais cards; revisar espaçamento interno.
- **Geral:** uma única curva/elevação de hover para os 3 tipos (consistência).

**Critério:** os 3 tipos de card compartilham a mesma linguagem de hover/elevação; steps leem
como sequência; números alinhados; nenhum label abaixo de contraste aceitável.

## 4. Motion

**Problema:** só o hero anima na entrada. Seções aparecem estáticas; falta polish de movimento.

**Solução:**
- **Reveal on-scroll:** fade + rise curto (≤16px, ease-out) nas seções ao entrarem na viewport,
  via IntersectionObserver (reutilizar o padrão do `CountUp`) ou `animation-timeline: view()` onde
  suportado. **Obrigatório** fallback `@media (prefers-reduced-motion: reduce)` → conteúdo visível,
  sem animação. O reveal deve realçar conteúdo **já visível por padrão** (não esconder via classe
  que pode não disparar em headless/aba oculta).
- **Stagger leve** dentro de grids de card (atraso incremental pequeno por card), respeitando
  reduced-motion.
- **Count-up:** manter (já respeita reduced-motion).
- **Hover dos cards:** unificar curva/duração (`--dur-base`/`--ease-out`).

**Critério:** seções entram com movimento sutil e intencional; reduced-motion mostra tudo
estático e completo; nada "pisca" nem fica invisível se a animação não disparar.

---

## Restrições (todas as frentes)
- Manter destaque de título `.hl-w` (itálico sólido + sublinhado). Não reintroduzir gradient-text.
- Sem shapes decorativos sangrando nas bordas (removidos por decisão do usuário).
- Não alterar `AWARDS_ONLY_PUBLICATION`, rotas, slugs, nem a página Awards.
- Editar com `Edit` (não `Write`); escopo restrito a Home.jsx (+ tokens aditivos se necessário).
- Toda animação com fallback `prefers-reduced-motion`.

## Verificação
1. `npm run build` passa.
2. Preview (app dentro de `<iframe>`): `preview_eval` no `iframe.contentDocument`.
   - 3 larguras (1280/768/375): sem overflow, título legível, cards refluem, reveal dispara.
   - Emular `prefers-reduced-motion: reduce`: confirmar conteúdo estático e completo.
3. Screenshot do hero (com gradiente) e da banda de Números como prova.
4. Commit em `dev/site-completo` por frente ou num lote `style:`/`feat:`.

## Ordem de implementação sugerida
Hero → Cards → Ritmo → Motion (motion por último, depois que a estrutura está firme).
