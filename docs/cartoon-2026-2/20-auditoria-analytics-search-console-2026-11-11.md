# 20 · Auditoria Analytics + Search Console (11/11/2026)

Pedido do Wilker: conferir se todas as páginas, da edição e do institucional, estão no Analytics e no Search Console, e registrar os dados.

## Analytics (GA4)
- Propriedade **Sweet & Coffee Week** (conta ELOI Design Studio, `p540079587`), fluxo **Site Lovers**, ID **G-FM5ZJXL3MV**. É o mesmo ID de `src/lib/analytics.js`.
  A propriedade `asus-boo…` (G-994JWBC5Z1) não tem relação com o site.
- Últimos 28 dias (14/10 a 10/11): **103.465 visualizações**, **9.821 usuários**, 2 min 35 s de engajamento médio, 129 endereços.
- Mais vistas:

  | Endereço | Visualizações |
  |---|---|
  | /cartoon/mapa | 23.948 |
  | / | 11.227 |
  | /cartoon/participantes | 11.214 |
  | /cartoon/combos | 10.148 |
  | /cartoon/caca | 9.399 |
  | /cartoon | 9.275 |
  | /cartoon/avaliar | 7.719 |
  | /edicoes | 1.430 |
  | /participar | 727 |
  | /sweet-awards | 598 |

  Fichas mais vistas: caroli-douces 451, jolie 423, canutos 385, mr-cupcake 379.
- No ar, todas as páginas mandam page_view: edição (9), institucional (7) e as 4 legais.
  As páginas estáticas `/quero-participar/` e `/preencher/` não têm Analytics.

### Problemas encontrados
1. **Visualização contada duas vezes e endereço cru enviado.** A "Métrica otimizada" do fluxo está com as visualizações por histórico do navegador ligadas. A cada troca de página, o Google manda um page_view próprio com o endereço inteiro. Isso dobra a contagem das páginas da edição e manda ao Google o que o site corta de propósito: o código do grupo (`/cartoon/caca/grupo/<uuid>`) e, do mesmo jeito, o token do voucher e o do convite. Conferido no ar: um page_view com `/cartoon/caca/grupo/00000000-…`.
   **Correção:** no GA, em Fluxo › Métrica otimizada › engrenagem de Visualizações de página, desligar "Mudanças de página com base em eventos do histórico do navegador". Isso precisa do ok do Wilker.
2. **Ficha aberta a partir da lista não contava.** O page_view do site levava só o 1º nível (`/cartoon/combos`), e a troca para a ficha caía no "mesma rota". O mesmo acontecia com /edicoes → /edicoes/<código>.
   **Corrigido** em dev `3321d1bc`: o relatório passa a ter a casa (`/cartoon/combos|participantes/<slug>`), a seção da Caça e a edição do acervo. Código de carimbo, voucher, grupo e convite seguem fora.
3. **Título errado.** Todas as páginas da edição saíam com "Cartoon · 5 a 15 de novembro", e `/` com o título institucional, porque o título da edição é escrito depois.
   **Corrigido** em `3321d1bc`: o page_view sai 700 ms depois, já com o título da página.

## Search Console
- Propriedade `https://www.sweetcoffeeweek.com.br/` verificada por arquivo HTML (`public/google0088e94cad6087b7.html`, não remover).
- Sitemap `/sitemap.xml`: **Processado, 62 páginas** (11/11).
- Indexação, antes do sitemap:

  | Situação | Páginas | Quais |
  |---|---|---|
  | Indexadas | 4 | `/`, `/mapa`, `/sweet-awards`, `/premiacao` |
  | 404 | 8 | endereços do site antigo: /home, /blank, /territoriomexicano, /mrcupcake, /justfoodecoffee, /carolidouces, /padoca e um .js antigo |
  | Rastreada, não indexada | 7 | /cartoon/caca, /cartoon/avaliar, /cartoon/participantes, /cartoon/mapa, /?fbclid=…, /ludoces, /omaestrocafe |
  | Cópia sem canônica | 1 | /cartoon (igual a /) |

- **Corrigido** em dev `f3280169`:
  - `<link rel="canonical">` por rota: /cartoon, /mapa, /rota, /participantes e /lovers apontam para /; a ficha em /participantes/<casa> aponta para /combos/<casa>.
  - Redirecionamento permanente (301) dos 9 endereços antigos para a ficha atual ou para a home.
- Limite que fica: todas as rotas servem o mesmo HTML, e o conteúdo vem por JavaScript. A indexação das páginas da edição depende do Google renderizar a página. O próximo passo, se for preciso, é pré-renderizar o HTML por rota.

## Para ir ao ar
- `3321d1bc` e `f3280169` estão só na dev. Publicar na master precisa do ok do Wilker.
- Ajuste no GA (item 1): ok do Wilker.
- Depois de publicar: no Search Console, "Validar correção" em 404 e "Solicitar indexação" das principais páginas.
