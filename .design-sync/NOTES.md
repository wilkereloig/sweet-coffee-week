# Notas do design-sync — site-sweet-coffee-week

Repo é o site institucional (Vite+React, sem TypeScript, sem Storybook, sem
build de biblioteca). A skill trata design systems publicáveis; aqui o escopo
foi restrito a `src/components/` (UI genuinamente reutilizável), excluindo
`src/pages/` (páginas completas, acopladas a rota/Supabase — não fazem
sentido como "componente" isolado) e os ícones da identidade Lovers
(`LoversSeal`, `LoversLogo`, `LoversWordmark`, `Squiggle`, `HeartTiny`,
`TapeStrip` — CLAUDE.md proíbe misturar identidade institucional × Lovers).

## Self-reference no node_modules (obrigatório antes de build/validate)

O package.json não tem `main`/`module`/`exports` (app privado, não lib
publicável) e a pasta do repo não se chama `site-sweet-coffee-week` (é
`site-sweet-coffee-week-home-v2`). O converter precisa achar
`node_modules/site-sweet-coffee-week/package.json` pra várias resoluções
internas. Antes de QUALQUER `package-build.mjs`/`package-validate.mjs`:

```
cmd /c mklink /J "<repo>\node_modules\site-sweet-coffee-week" "<repo>"
```

⚠️ **Nunca usar `ln -s` no Git Bash/Windows pra isso** — sem privilégio de
symlink, cai num fallback de CÓPIA RECURSIVA. Aconteceu nesta sessão: copiou
o repo inteiro (incluindo `acervo-bruto`, 58GB) pra dentro de
`node_modules/site-sweet-coffee-week/` antes de eu interromper. Limpo com
`rm -rf`, mas é uma armadilha real — só junction nativa do Windows.

**A junction some sempre que rodar `npm install`/`npm ci`** (o npm trata
como pacote órfão fora do lockfile e remove/"poda"). Recriar depois de
qualquer install, antes do próximo build. Não é permanente por design — é
descartável, recriar por clone/sessão como o próprio SKILL.md pede pros
overrides simlink.

A junction NÃO foi deixada no repo ao final desta sessão (removida antes de
commitar `.design-sync/`) — recriar na próxima sessão que rodar build/validate.

## cssEntry precisa ser CSS JÁ COMPILADO, não um agregador de @import

Tentei apontar `cssEntry` pra um arquivo `@import`-only juntando só o sistema
atual (scw-2026.css + scw-motion.css + fontes, sem o legado). O converter só
CONFIA no arquivo indicado e faz um `cp` bruto — não resolve `@import`
recursivamente. O resultado (`_ds_bundle.css`) ficava com ~1KB, só os
`@import` sem processar.

Fix: `cssEntry` aponta pro CSS já bundlado por `npm run build`
(`dist/assets/index-<hash>.css`, 214KB) — que É processado corretamente
(217 tokens, 136 referenciados). Trade-off aceito: esse arquivo inclui o
CSS do sistema anterior também (main.jsx importa os dois), porque
`main.jsx` carrega ambos os sistemas — não há build separado só do redesign
2026. Não colide com nada (nomes de classe `.scw-*` vs sistema antigo não se
sobrepõem), só é peso extra no bundle sincronizado.

**Re-sync**: o nome do arquivo (`index-BDwswYBm.css`) muda de hash a cada
`npm run build`. Antes de re-rodar o converter, `ls dist/assets/*.css` e
atualizar `cfg.cssEntry` com o hash novo (o maior dos dois — o outro,
`Painel-*.css`, é do chunk lazy do painel admin, não o app principal).

## Fontes Nexa Slab — corrigido (era FONT_DANGLING)

`src/styles/fonts-nexa-slab.css` usa `url('/fonts/nexa-slab/...')` — caminho
raiz-absoluto (convenção `public/` do Vite). O scraper de fontes do
design-sync resolve `url()` relativo ao arquivo CSS, não à raiz do site, então
um caminho `/fonts/...` virava `<drive>:\fonts\...` e nunca era encontrado.

**Fix aplicado**: `.design-sync/fonts-nexa-slab.extra.css` — cópia dos mesmos
14 `@font-face` (12 pesos/itálicos + 2 do alias `Nexa Slab Black`) com `url()`
relativo (`../public/fonts/nexa-slab/...`), referenciada via
`cfg.extraFonts: [".design-sync/fonts-nexa-slab.extra.css"]`. Não é importada
pelo app — só o converter lê. Confirmado no re-sync: 12 `.woff2` copiados pra
`fonts/`, `_ds_bundle.css` com 14 `url()` reescritos. Se algum dia o
`fonts-nexa-slab.css` real mudar de peso/arquivo, replicar a mudança aqui
também (os dois arquivos não têm vínculo automático).

Restam no aviso `FONT_MISSING` (não bloqueante, aceito): fontes do sistema
Lovers (`sofia-pro-comp`, `Caprasimo` — carregadas via Typekit externo, não
self-hosted, não dá pra empacotar) e fontes do sistema visual anterior/seção
F2 (`JetBrains Mono`, `Archivo`, `DM Sans`, `Instrument Serif`, `Caveat`) —
não usadas pelas páginas institucionais atuais, só legado/exceção pontual.

## Known render warns

- `ErrorBoundary` → `[RENDER_ERRORS]` no story `TelaDeErro`: **esperado**, é
  a demonstração intencional do fallback (um filho lança erro de propósito
  pra mostrar a tela "Algo deu errado"). Não é falha.

## Componentes sem preview autoral (floor card, não falha)

- `AccessDialog` e `MobileMenu` — ambos `position:fixed` com hooks de
  foco/teclado (querySelector, `.focus()`, listeners de keydown). No harness
  de captura estática renderizaram em branco (só a faixa/topo aparecia,
  corpo vazio) mesmo depois de neutralizar as animações de entrada
  (`animation:none`) — não era timing de animação. Causa provável: algo no
  `useEffect` de foco/scroll-lock não completa nesse contexto headless
  específico (hipótese não confirmada — não investigado a fundo por tempo).
  Ficam no floor card por ora; autoria é o "oferecimento parado" pra um
  re-sync futuro, per o próprio design do shape "package".

## Re-sync risks

- `cssEntry` (hash de build) e a junction de self-reference precisam ser
  recriados/atualizados a cada sessão nova — nada disso é automático.
- Grades desta rodada foram atribuídas por revisão visual direta do
  agente (contact sheet + screenshots individuais), não por um ciclo
  completo de `package-capture.mjs` + grade JSON por componente — dado o
  tempo da sessão. Um `--force` n a próxima sync pra auditoria completa é
  razoável se surgir dúvida.
- O CSS sincronizado inclui o sistema visual ANTERIOR (misturado por
  `main.jsx`) além do redesign 2026 atual — ver seção acima. Se o app algum
  dia parar de importar o sistema antigo, o bundle sincronizado encolhe
  sozinho no próximo sync (nada a fazer agora).
