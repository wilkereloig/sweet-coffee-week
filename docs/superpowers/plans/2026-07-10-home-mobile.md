# Home mobile — capa imersiva + ritmo de celular — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a Home/O Festival virar produto mobile de verdade no celular (≤600px) — hero como capa imersiva ancorada + ritmo de bandas — sem tocar no desktop.

**Architecture:** Um único arquivo (`src/pages/institutional/Home.jsx`): markup extra na hero (botão CTA + dica de rolar, escondidos no desktop via CSS base `display:none`) + um bloco `@media (max-width:600px)` no `<style>` já existente da página. Reusa tokens globais (`--tabbar-h`, `--hero-content-start`, `--header-safe-offset`, `--accent`); não cria nem altera token. Desktop e faixa 601–900px ficam idênticos.

**Tech Stack:** Vite + React (JSX), CSS-in-`<style>` por página, sem build extra, sem framework de teste. Verificação = preview mobile (screenshots/inspect) + `npm run build`.

## Global Constraints

- Branch de trabalho: **`dev/site-completo`**. Nunca `master`/`main`. Confirmar com `git branch --show-current` antes de editar.
- Desktop (>900px) **pixel-idêntico** ao de antes (CLAUDE.md §9). O tratamento mobile é o único pedido; não pode vazar pro desktop.
- Só arquivo `src/pages/institutional/Home.jsx`. Nenhum outro arquivo. Nenhum token global alterado.
- Breakpoint do tratamento = **`≤600px`**. Entre 601–900 = comportamento atual.
- Paleta oficial só — sem cor nova, sem roxo/verde/lavanda. Sem sticker novo. Sem eyebrow/kicker novo. Sem fonte mono em rótulo.
- Zero corte / zero reorder / zero esconder de seção (decisão travada). Comprimento resolvido só com ritmo.
- `npm run build` tem que passar antes de qualquer commit. Falhou → parar, mostrar erro, não commitar. Buildar em `dist_check --emptyOutDir` se `dist/` estiver travado pelo Dropbox, depois `rm -rf dist_check`.
- Commit só do arquivo da tarefa (`git add src/pages/institutional/Home.jsx` + os docs). Repo tem WIP local não relacionado — não arrastar junto.
- Fonte da verdade: spec `docs/superpowers/specs/2026-07-10-home-mobile-design.md`.

---

## File Structure

- **Modify:** `src/pages/institutional/Home.jsx`
  - Markup da hero: dentro de `.swc-hero__copy` (linha ~233–248), após `.swc-hero__text`, adicionar `<a className="swc-hero__cta">` + `<span className="swc-hero__scrollcue">`.
  - CSS base (hero region, após a 900px-block em ~484–486): regra `display:none` pros dois novos elementos → desktop não os renderiza.
  - CSS mobile: um bloco `@media (max-width:600px)` inserido logo após a 900px-block e a 420px-title-rule (ou seja, depois da linha ~486, antes de `.hm-about` em ~488), pra vencer por ordem de fonte.

Nenhum arquivo novo. Nenhum outro arquivo modificado.

---

### Task 1: Markup da hero (CTA + dica de rolar) escondidos no desktop

Adiciona os dois elementos ao JSX e a regra base `display:none`. Entregável independente: DOM ganha os elementos, mas desktop continua pixel-idêntico (elementos ocultos). Nada muda visualmente ainda.

**Files:**
- Modify: `src/pages/institutional/Home.jsx:238-248` (dentro de `.swc-hero__copy`)
- Modify: `src/pages/institutional/Home.jsx:486` (CSS base, logo após a 900px-block da hero)

**Interfaces:**
- Consumes: helper `go` já definido (`src/pages/institutional/Home.jsx:156` — `const go = (path) => (e) => { e.preventDefault(); navigate(path) }`); ícone `I.arrow` (já importado e usado em Home.jsx:258).
- Produces: classes `.swc-hero__cta` e `.swc-hero__scrollcue` — consumidas pelo bloco mobile na Task 2.

- [ ] **Step 1: Adicionar o markup dentro de `.swc-hero__copy`**

Em `src/pages/institutional/Home.jsx`, o bloco atual (linhas 238–248) é:

```jsx
          <div className="swc-hero__text" {...ovHeroText}>
            <p>
              O Sweet &amp; Coffee Week é o festival gastronômico que transforma Natal em uma rota de
              sabores, encontros e descobertas.
            </p>
            <p>
              A cada edição, cafeterias, docerias, confeitarias, restaurantes e marcas autorais criam
              combos exclusivos por tempo limitado, inspirados em um tema central.
            </p>
          </div>
        </div>
      </section>
```

Trocar por (adiciona CTA + scrollcue logo após o `</div>` do `.swc-hero__text`):

```jsx
          <div className="swc-hero__text" {...ovHeroText}>
            <p>
              O Sweet &amp; Coffee Week é o festival gastronômico que transforma Natal em uma rota de
              sabores, encontros e descobertas.
            </p>
            <p>
              A cada edição, cafeterias, docerias, confeitarias, restaurantes e marcas autorais criam
              combos exclusivos por tempo limitado, inspirados em um tema central.
            </p>
          </div>
          <a className="swc-hero__cta" href="#/participar" onClick={go('/participar')}>
            Quero participar <I.arrow />
          </a>
          <span className="swc-hero__scrollcue" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </section>
```

- [ ] **Step 2: Adicionar a regra CSS base que esconde os dois no desktop**

Em `src/pages/institutional/Home.jsx`, localizar a 900px-block da hero (linhas 484–486):

```css
        @media (max-width: 900px) {
          .hm .swc-hero__copy { max-width: none; padding: clamp(120px,30vw,150px) clamp(22px,7vw,32px) clamp(48px,12vw,72px); }
        }
```

Inserir **logo depois** dela (nova linha, ainda antes de `.hm .hm-about { background: #381610; }`):

```css
        /* CTA + dica de rolar da hero: só no mobile (capa imersiva). Desktop não renderiza. */
        .hm .swc-hero__cta,
        .hm .swc-hero__scrollcue { display: none; }
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build conclui sem erro (dist gerado). Se `dist/` travar (Dropbox): `npm run build -- --outDir dist_check --emptyOutDir` e depois `rm -rf dist_check`.

- [ ] **Step 4: Verificar desktop idêntico no preview**

Iniciar/garantir o dev server (preview_start). No viewport desktop (≥1280px), abrir a Home:
- `preview_inspect` em `.swc-hero__cta` → esperado `display: none`.
- `preview_inspect` em `.swc-hero__scrollcue` → esperado `display: none`.
- `preview_snapshot` → a hero mostra H1 + os DOIS parágrafos, centralizada (inalterada).
- `preview_console_logs` (level error) → sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add src/pages/institutional/Home.jsx
git commit -m "feat(home-mobile): markup da hero (CTA + dica de rolar) oculto no desktop"
```

---

### Task 2: Hero mobile — capa imersiva ancorada (`≤600px`)

Um bloco `@media (max-width:600px)` que transforma a hero: foto manda, scrim só na base, conteúdo ancorado embaixo à esquerda, 100dvh, clearances (header no topo, tab bar embaixo), 1 parágrafo, título reescalado, CTA + dica de rolar visíveis com bounce.

**Files:**
- Modify: `src/pages/institutional/Home.jsx:486` (inserir bloco mobile logo após a regra base da Task 1)

**Interfaces:**
- Consumes: `.swc-hero__cta`, `.swc-hero__scrollcue` (Task 1); tokens globais `--hero-content-start`, `--tabbar-h`, `--accent` (styles.css:467–472, 88); classes/estruturas existentes `.swc-hero`, `.swc-hero__copy`, `.swc-hero__text`, `.swc-hero__title`, `.swc-hero__rotator`, `.swc-hero::after`.
- Produces: nada consumido por tasks posteriores.

- [ ] **Step 1: Inserir o bloco mobile da hero**

Em `src/pages/institutional/Home.jsx`, imediatamente **após** a regra base adicionada na Task 1 (`.hm .swc-hero__cta, .hm .swc-hero__scrollcue { display: none; }`) e **antes** de `.hm .hm-about { background: #381610; }`, inserir:

```css
        /* ═══ HERO MOBILE — capa imersiva ancorada (≤600px). Vem depois da 900px-block
           e da 420px-title-rule pra vencer por ordem de fonte. Desktop intocado. ═══ */
        @media (max-width: 600px) {
          /* foto quase cheia; altura estável com barra do navegador */
          .hm .swc-hero { min-height: 100dvh; }
          .hm .swc-hero__rotator { opacity: .85; }
          /* scrim só na base: topo leve (menu legível), base escura ancora o texto */
          .hm .swc-hero::after {
            background: linear-gradient(to bottom,
              rgba(43,24,16,.55) 0%,
              rgba(43,24,16,.12) 22%,
              rgba(43,24,16,0) 46%,
              rgba(43,24,16,.86) 100%);
          }
          /* ancoragem embaixo + à esquerda (vence a centralização global da hero) */
          .hm .swc-hero, .hm .swc-hero * { text-align: left; }
          .hm .swc-hero__copy {
            min-height: 100dvh;
            max-width: none;
            justify-content: flex-end;
            align-items: flex-start;
            padding: var(--hero-content-start) clamp(22px, 7vw, 32px)
                     calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + clamp(28px, 9vw, 44px));
          }
          /* só o 1º parágrafo no mobile */
          .hm .swc-hero__text { max-width: 34ch; margin: 0; }
          .hm .swc-hero__text p:nth-child(2) { display: none; }
          /* título à esquerda, escala que cabe em 360px sem quebra feia */
          .hm .swc-hero__title { font-size: clamp(38px, 12vw, 68px); }
          /* CTA ação-mãe entra de cara */
          .hm .swc-hero__cta {
            display: inline-flex; align-items: center; gap: 9px;
            margin-top: clamp(18px, 5vw, 26px);
            padding: 14px 26px; border-radius: 999px;
            background: var(--accent); color: #fff;
            font-family: var(--font-sans); font-weight: 700; font-size: 16px; line-height: 1;
            box-shadow: 0 12px 30px rgba(0,0,0,.28);
          }
          .hm .swc-hero__cta svg { width: 16px; height: 16px; }
          /* dica de rolar: chevron com bounce vertical, centralizado no rodapé da hero */
          .hm .swc-hero__scrollcue {
            display: inline-flex; align-self: center;
            margin-top: clamp(16px, 5vw, 24px);
            color: rgba(254,240,221,.8);
            animation: swcScrollCue 1.6s ease-in-out infinite;
          }
          @keyframes swcScrollCue {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(6px); }
          }
        }
        @media (max-width: 600px) and (prefers-reduced-motion: reduce) {
          .hm .swc-hero__scrollcue { animation: none; }
        }
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build conclui sem erro.

- [ ] **Step 3: Verificar a capa no preview mobile (390px)**

`preview_resize` preset `mobile` (375×812) — ou 390px. Abrir a Home:
- `preview_inspect` em `.swc-hero__cta` → `display: inline-flex` (visível).
- `preview_inspect` em `.swc-hero__scrollcue` → `display: inline-flex`.
- `preview_inspect` em `.swc-hero__copy` → `justify-content: flex-end`, `align-items: flex-start`, `text-align: left`.
- `preview_inspect` em `.swc-hero__title` → `text-align: left`; font-size resolvido ≤ 68px.
- `preview_snapshot` → hero mostra H1 + **um** parágrafo + botão "Quero participar" + chevron. O 2º parágrafo não aparece.
- `preview_screenshot` → foto quase cheia, texto ancorado embaixo à esquerda, escurecido só na base, botão e chevron acima da área da tab bar (não cobertos).

- [ ] **Step 4: Verificar reduced-motion**

`preview_eval`: forçar reduced-motion não é trivial via toggle; usar `preview_resize` com `colorScheme` não cobre isso. Em vez disso, `preview_inspect` na `.swc-hero__scrollcue` confirmando que a `animation` existe fora de reduced-motion; e conferir no código que o bloco `@media (max-width:600px) and (prefers-reduced-motion: reduce)` zera `animation`. (Verificação visual de reduced-motion fica na Task 4 com emulação, se disponível.)

- [ ] **Step 5: Commit**

```bash
git add src/pages/institutional/Home.jsx
git commit -m "feat(home-mobile): hero vira capa imersiva ancorada no celular"
```

---

### Task 3: Ritmo das bandas no mobile (`≤600px`)

Afina o padding vertical das seções no celular pra dar batida de "capítulo" sem cortar nem reordenar nada. Reviewer pode aprovar a hero (Task 2) e ainda rejeitar o ritmo — por isso task separada.

**Files:**
- Modify: `src/pages/institutional/Home.jsx` (dentro do mesmo `@media (max-width:600px)` da Task 2, ou um bloco irmão logo abaixo)

**Interfaces:**
- Consumes: `.section` (base em styles.css:88 = `padding: clamp(56px, 9vw, 128px) 0`). O prefixo `.hm .section` garante especificidade maior que `.section`.
- Produces: nada.

- [ ] **Step 1: Adicionar override de ritmo de seção**

Em `src/pages/institutional/Home.jsx`, dentro do bloco `@media (max-width: 600px) { … }` da Task 2 (antes do fechamento `}` do media), acrescentar:

```css
          /* ritmo de capítulo no touch: batida vertical mais curta que o desktop.
             Override local — NÃO mexe no padding global de .section. */
          .hm .section { padding-block: clamp(52px, 13vw, 84px); }
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build conclui sem erro.

- [ ] **Step 3: Verificar no preview (390px)**

- `preview_inspect` em `.hm-media.section` (ou qualquer `.section` da Home) → `padding-top`/`padding-bottom` resolvidos dentro de ~52–84px (não os ~56–128 do desktop).
- `preview_screenshot` rolando a página → bandas com respiro mais curto e consistente; nenhuma seção sumiu; ordem preservada (Split → Números → O que é → Como funciona → Na mídia → Realização).

- [ ] **Step 4: Commit**

```bash
git add src/pages/institutional/Home.jsx
git commit -m "feat(home-mobile): afina ritmo vertical das bandas no celular"
```

---

### Task 4: QA mobile completo + regressão desktop

Passe de aceitação: varre overflow lateral, alvos de toque, reduced-motion, e confirma que o desktop segue idêntico. Correções concretas só se um problema específico aparecer.

**Files:**
- Modify (só se QA achar problema): `src/pages/institutional/Home.jsx`

**Interfaces:**
- Consumes: tudo das Tasks 1–3.
- Produces: nada.

- [ ] **Step 1: Overflow lateral em 3 larguras**

Para cada largura (360, 390, 430px) via `preview_resize`:
- `preview_eval`: `document.documentElement.scrollWidth <= window.innerWidth` → esperado `true` (sem overflow horizontal). `.hm { overflow-x: clip }` já protege; se algum filho estourar, `preview_eval` para achar o culpado: `[...document.querySelectorAll('.hm *')].filter(el => el.getBoundingClientRect().right > window.innerWidth + 1).map(el => el.className)`.
- Se achar culpado: corrigir no `@media (max-width:600px)` (ex.: `max-width:100%` no elemento) e rebuildar. Caso comum esperado: nenhum (Home já tem grids que refluem).

- [ ] **Step 2: Alvos de toque ≥44px**

- `preview_inspect` em `.swc-hero__cta` → altura da bounding box ≥ 44px (padding 14px×2 + linha 16px ≈ 44px; ok).
- `preview_inspect` nos botões `.hm-split-cta__button` → altura ≥ 44px.

- [ ] **Step 3: Título da hero sem quebra feia em 360px**

- `preview_resize` 360px. `preview_screenshot` da hero → "O festival mais / doce de Natal." quebra nas duas linhas previstas, sem palavra órfã espremida nem estouro. Se estourar: reduzir o piso do clamp do título mobile de `38px` pra `34px` em `.hm .swc-hero__title` no bloco ≤600px, rebuildar, reconferir.

- [ ] **Step 4: Reduced-motion (se emulação disponível)**

- `preview_resize` com emulação de movimento reduzido, se a ferramenta suportar; senão, revisão de código: confirmar que `@media (max-width:600px) and (prefers-reduced-motion: reduce) { .hm .swc-hero__scrollcue { animation: none; } }` existe e que os keyframes de entrada da hero já são zerados pelo bloco reduced-motion global (Home.jsx:778–786).

- [ ] **Step 5: Regressão desktop (≥1280px) e faixa 601–900**

- `preview_resize` desktop (1280×800). `preview_screenshot` da hero → centralizada, 2 parágrafos, sem botão/chevron. `preview_inspect` `.swc-hero__copy` → `justify-content: center`, `align-items: center`.
- `preview_resize` 768px (tablet, dentro de 601–900) → comportamento atual (o bloco ≤600 não se aplica); hero como antes.

- [ ] **Step 6: Build final**

Run: `npm run build`
Expected: passa.

- [ ] **Step 7: Commit (só se houve correção nesta task)**

```bash
git add src/pages/institutional/Home.jsx
git commit -m "fix(home-mobile): ajustes de QA (overflow/título) no celular"
```

Se nenhuma correção foi necessária, pular o commit e reportar QA verde.

---

## Self-Review

**Spec coverage** (contra `2026-07-10-home-mobile-design.md`):
- §3 Hero (foto .85, scrim base, ancoragem flex-end/left, 100dvh, clearances topo+tabbar, 1º `<p>` só, título reescalado, CTA "Quero participar", scrollcue com bounce, reduced-motion) → Tasks 1–2. ✓
- §4 Ritmo (padding de seção afinado via override local, sem tocar token global; sem 2ª navbar) → Task 3. ✓
- §5 Componentes mantidos/domados (tilt, flipbook, count-up) → não mexidos; overflow/toque verificados na Task 4. ✓
- §6 Arquivos (só Home.jsx, tokens reusados não alterados) → File Structure + Global Constraints. ✓
- §7 Fora de escopo (desktop, 601–900, corte/reorder, 2ª navbar, cards, outras páginas) → respeitado; regressão desktop/tablet na Task 4. ✓
- §8 Critérios de aceite 1–6 → Task 4 (1 capa; 2 desktop idêntico; 3 ritmo; 4 sem overflow/toque≥44; 5 reduced-motion; 6 build). ✓

**Placeholder scan:** Sem "TBD/TODO". As condicionais da Task 4 ("se achar problema") são verificação legítima com remediação concreta nomeada (culpado via query, piso do clamp 38→34px), não placeholder.

**Type/nome consistency:** `.swc-hero__cta` e `.swc-hero__scrollcue` usados igual em Task 1 (criação markup + hide base) e Task 2 (mobile show). `go`/`I.arrow` já existem. Token `--hero-content-start`/`--tabbar-h`/`--accent` grafados como no styles.css. Ordem de fonte (bloco ≤600 depois da 900px-block e 420px-title) garante que as regras mobile vençam. ✓

---

## Execution Handoff

Plano salvo em `docs/superpowers/plans/2026-07-10-home-mobile.md`.
