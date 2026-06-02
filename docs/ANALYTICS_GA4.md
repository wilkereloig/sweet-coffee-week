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
| `click_whatsapp` | `slug`, `nome` | Clique no botão WhatsApp da loja. |
| `click_instagram` | `slug`, `nome` | Clique no botão Instagram da loja. |
| `click_mapa` | `slug`, `nome` | Clique em "Abrir no mapa" no card da unidade. |

### Marcar como conversão
Em **Administrador → Eventos**, ligue a chave *Marcar como conversão* nos
eventos que representam intenção real (ex.: `click_whatsapp`, `click_mapa`).
Depois eles aparecem nos relatórios de conversão por participante.

---

## Origem dos QR Codes (de onde vem o tráfego)

O GA4 capta **automaticamente** os parâmetros `utm_*` da URL — não precisa de
código. Como as rotas dos QR usam hash (`#/...`), os UTMs vão **antes** do `#`,
na query string, sem alterar a rota impressa:

```
https://www.sweetcoffeeweek.com.br/?utm_source=cartaz&utm_medium=qrcode&utm_campaign=lovers2026#/lovers/combos/rollab-confeitaria
```

- `utm_source` = onde está o QR (ex.: `cartaz`, `embalagem`, `vitrine`, `instagram`)
- `utm_medium` = `qrcode`
- `utm_campaign` = `lovers2026`

Ver em **Relatórios → Aquisição → Aquisição de tráfego** (dimensão *Origem/Mídia*).

> QR Codes **já impressos** não têm UTM → aparecem como "(direct)". Não há como
> retroagir. Use UTM só em materiais **novos**. As rotas existentes (sem UTM)
> continuam funcionando normalmente — nada quebra.

---

## Trocar de Measurement ID

Se criar outra propriedade GA, substituir `G-FM5ZJXL3MV` em **`index.html`**
(2 ocorrências: `src` do script e `gtag('config', ...)`). Nada mais muda.
