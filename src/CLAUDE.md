<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Desde 10/11/2026 este arquivo é só índice; §6 e §10.1–10.7 foram movidos sem reescrita para docs/regras/. -->

## 6 · Sistema visual

Fonte única: `src/styles/scw-2026.css`. **Se este capítulo divergir do arquivo, vale o
arquivo.**

**Antes de mexer em cor, tipo, herói, componente, imagem, ícone, movimento ou card,
abra a seção correspondente abaixo.** Antes de mexer em CSS de layout no mobile,
leia §10 (armadilhas) — cada uma já custou tempo.

| Seção | Arquivo (`docs/regras/`) |
|---|---|
| §6.1 Paleta — 9 cores fechadas (e exceções declaradas: F2, WhatsApp, camada da edição) | `06a-sistema-visual-cor-tipo-herois.md` |
| §6.2 Cor por página · §6.3 Irmãos nunca repetem cor · §6.4 Medalhas do Sweet Awards | `06a-sistema-visual-cor-tipo-herois.md` |
| §6.5 Tipografia — uma família, duas vozes | `06a-sistema-visual-cor-tipo-herois.md` |
| §6.6 Trilho, grade e espaçamento · §6.7 Zona de segurança menu/herói | `06a-sistema-visual-cor-tipo-herois.md` |
| §6.8 Heróis · §6.9 Herói fotográfico (geometria única) | `06a-sistema-visual-cor-tipo-herois.md` |
| §6.10 Componentes (inclui 6.10-b Tela de acesso) | `06b-sistema-visual-componentes-imagens-movimento.md` |
| §6.11 Iconografia v3 · §6.12 Imagens · §6.13 Elementos gráficos e ilustração | `06b-sistema-visual-componentes-imagens-movimento.md` |
| §6.14 Responsividade · §6.15 Movimento · §6.16 Cards — seis famílias | `06b-sistema-visual-componentes-imagens-movimento.md` |
| §10.1 Especificidade (nº 1 do mobile) · §10.2 Toque e acessibilidade · §10.3 Compositor, GPU e performance · §10.4 Degradês, máscaras e emendas · §10.5 Grade e layout · §10.6 Cor e contraste · §10.7 Sincronia CSS ↔ JS | `10-1-a-10-7-armadilhas-css.md` |

Achar um tema: `grep -n "^###" docs/regras/06*.md docs/regras/10-1-a-10-7-armadilhas-css.md`.
Mudou uma regra visual? Corrija no arquivo da seção, no mesmo commit da mudança.
