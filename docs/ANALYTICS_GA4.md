# Analytics — Google Analytics 4

Mede acesso ao site Sweet & Coffee Week: páginas mais acessadas e participantes
mais vistos. Respeita LGPD (coleta só após aceite no banner de cookies).

- **Measurement ID:** `G-FM5ZJXL3MV`
- **Painel:** https://analytics.google.com → propriedade *Sweet & Coffee Week*

---

## Como funciona (resumo técnico)

O site usa **hash routing** (`#/lovers/combos/rollab-confeitaria`). Analytics
comum só enxerga o que vem antes do `#`, então tudo viraria `/`. Por isso o
tracking é manual:

| Arquivo | Papel |
|---|---|
| `index.html` | Carrega o gtag.js + Consent Mode (`default: denied`, `send_page_view: false`). |
| `src/lib/analytics.js` | Helpers: `trackPageView`, `trackEvent`, `grant/denyConsent`. Nada é enviado sem consentimento. |
| `src/router.js` | Dispara `page_view` manual a cada troca de rota (com o caminho real). |
| `src/pages/lovers/ComboDetail.jsx` | Dispara evento `view_participante` (`slug`, `nome`) ao abrir um combo. |
| `src/components/CookieConsent.jsx` | Banner Aceitar/Recusar (LGPD). Escolha salva em `localStorage['scw_consent']`. |

Sem consentimento → zero coleta. Ao **Aceitar**, libera e registra a página atual.

---

## Como ver os dados

### 1. Testar agora (Tempo Real)
**Relatórios → Tempo real.** Abra o site, clique **Aceitar** no banner, navegue
entre participantes. Aparece em segundos.

### 2. Páginas mais acessadas
**Relatórios → Engajamento → Páginas e telas** → coluna *Caminho da página*.
Cada participante é uma linha (`/lovers/combos/<slug>`).
> Relatórios padrão levam ~24h pra popular (Tempo Real é imediato).

### 3. Participantes mais vistos
**Relatórios → Engajamento → Eventos** → evento `view_participante`.

Para ranquear por loja (nome do participante):
1. **Administrador → Definições personalizadas → Criar dimensão personalizada.**
2. Nome: `Participante` · Escopo: *Evento* · Parâmetro do evento: `nome`.
3. Salvar. A dimensão coleta **a partir da criação** — crie quanto antes.
4. Depois ela vira coluna/filtro nos relatórios e em *Explorar*.

---

## Eventos disparados

| Evento | Parâmetros | Quando |
|---|---|---|
| `page_view` | `page_path`, `page_location`, `page_title` | A cada troca de rota (dedupe contra duplicado). |
| `view_participante` | `slug`, `nome` | Ao abrir a página de um combo/participante. |

---

## Trocar de Measurement ID

Se criar outra propriedade GA, substituir `G-FM5ZJXL3MV` em **`index.html`**
(2 ocorrências: `src` do script e `gtag('config', ...)`). Nada mais muda.
