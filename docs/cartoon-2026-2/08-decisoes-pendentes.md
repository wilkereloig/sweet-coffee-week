# 8 · Decisões pendentes

## Decisões tomadas em 14/10/2026

O Wilker delegou: "siga o plano, decida o melhor modo". Ficou assim:

- **Decidido, vale:** decisão técnica ou de produto que se desfaz sem custo.
- **Provisório:** depende de regra de negócio. Fica configurável e pode mudar sem migration.
- **Só o Wilker:** envolve dinheiro, lei ou o domínio no ar. Não decido.

| # | Estado | O que vale |
|---|---|---|
| D-01 | **Só o Wilker** | T4 (`/` mostra a Cartoon) continua exigindo pedido por escrito; sugestão: 03/11 |
| D-02 | **Só o Wilker** (contratação) · revisado | o plano gratuito pausa por **inatividade**, e o site da edição gera acesso todo dia: a pausa durante o festival é improvável [Provável]. O risco real são as cotas do plano. Fica gratuito, com uso monitorado; o pago só se a cota apertar |
| D-03 | Decidido (revisto na fase 5) | **OpenFreeMap + MapLibre GL** (`maplibre-gl@5.24.0`). Conferido em 14/10: uso comercial permitido, sem chave nem cadastro, sem limite de visualização. Os tiles do OpenStreetMap são "best-effort" e avisam que serviço comercial pode perder o acesso. Só tiles vetoriais, por isso MapLibre em vez de Leaflet. Chunk de ~286 kB gzip, carregado só no toque em "Ver no mapa"; a lista funciona sem ele |
| D-04 | Decidido | texto com a tipografia institucional (Nexa); lettering e selo sempre como arquivo. Nenhuma fonte nova sem aprovação |
| D-05 | Provisório | nome + e-mail; uma avaliação por e-mail por casa, a última vale; Turnstile + limite; sem confirmação de e-mail (vira obrigatória se houver prêmio para o público); retenção até 90 dias depois dos resultados; novidades em caixa separada, desmarcada. Critérios provisórios = os 7 da Lovers, em tabela editável |
| D-06 | Provisório | as 8 categorias da Lovers (`loversAwardsResults.js`) e as trilhas júri técnico + Sweet Lovers |
| D-07 | Decidido | og genérico da Cartoon. Entra quando houver imagem 1200×630 aprovada; enquanto isso, o og institucional |
| D-08 | Decidido | foto da marca só para "loja" e como provisória do combo, sempre aprovada pela organização |
| D-09 | Decidido (texto) · validação recomendada | "não sei" permite publicar e aparece "não informado"; texto neutro "informado pela casa" + "confirme com a loja". A validação por nutricionista segue recomendada |
| D-10 | Decidido | como na tabela abaixo |
| D-11 | Decidido | um combo por participação |
| D-12 | Decidido (revisto em 23/10/2026) | WhatsApp da unidade é o da LOJA: preenchido = vai ao site; a caixa de autorização saiu (o contato pessoal do responsável continua privado) |
| D-13 | Decidido | a regra é escrita no `CLAUDE.md` junto com a fase 2 |
| D-14 | Decidido | endereço limpo (`pushState`) no site todo, na fase 1; links com `#/` continuam funcionando e são convertidos ao abrir |
| D-15 | Decidido | 03/11 e 19/11 **não** aparecem até a organização confirmar; vale só o período 5 a 15 de novembro |
| D-16 | Decidido | caixa de Natal e região metropolitana: lat −6,30 a −5,55; lng −35,55 a −34,95 [ajustável] |
| D-17 | Decidido | o tema inspirador não aparece no site nesta edição |
| D-18 | Decidido | curadoria publica, com registro no histórico |
| D-19 | **Só o Wilker** (Illustrator) | até lá, o PNG aprovado |
| D-20 | Decidido | sem dado fictício no banco de produção. Testes SQL em transação desfeita (padrão de `supabase/testes/`); ensaio com marcas fictícias em projeto temporário, se preciso |

---

Ordenadas por quanto travam o cronograma. "Trava" diz o que fica parado sem a decisão; o resto segue.

| # | Decisão | Recomendação | Impacto | Trava |
|---|---|---|---|---|
| **D-02** | Plano do Supabase durante a edição | plano pago de outubro a dezembro, ou ao menos exportar a projeção para JSON estático a cada publicação | no plano gratuito, a pausa do projeto derruba catálogo, participantes e mapa; o limite de 2 projetos ativos já pesa | fase 2 em produção |
| **D-05** | Avaliação: critérios, campos pessoais, chave de deduplicação, confirmação de e-mail, retenção, sorteio | critérios da edição em tabela (podem chegar tarde); pedir só nome + e-mail; confirmar e-mail por link se houver prêmio para o público; guardar até o fim da apuração + prazo definido; tirar faixa etária, escolaridade e gênero | define a base legal e o formulário; sem isso a avaliação não abre | fase 6 (precisa até ~24/10 para abrir em 05/11) |
| **D-09** | Lista de alergênicos, textos e se "não sei" impede publicar | validar a lista e os textos com nutricionista ou jurídico; deixar "não sei" publicar, mostrando "não informado" | texto sobre saúde exposto ao público; a responsabilidade é da informação da casa, mas o site precisa não induzir a erro | publicação de combos (fase 3) |
| **D-01** | Quem autoriza e quando `/` passa a mostrar a Cartoon (T4) | Wilker, por escrito, depois da validação integrada; sugestão: no lançamento dos combos (03/11) | troca a porta de entrada do domínio | fase 8 |
| **D-03** | Provedor de mapa | Leaflet + tiles raster de provedor com termos de produção; conferir preço e limites antes | custo, peso, CSP, atribuição | mapa interativo (fase 5); a lista de unidades sai sem ele |
| **D-04** | Tipografia web da edição | escolher entre Bricolage Grotesque / Instrument Sans (citadas no KV, marcadas como estudo) e manter Nexa institucional; o lettering é sempre o arquivo | identidade das páginas | acabamento da fase 4; a estrutura avança |
| **D-06** | Categorias da premiação, peso júri × público, empate | reaproveitar as trilhas de `premiacoes` (júri técnico e Sweet Lovers) | página Premiação e apuração | fase 6 |
| **D-08** | Foto enviada pela marca, ou só a oficial | aceitar foto da marca só para "loja" e como provisória do combo até a oficial, sempre com aprovação da organização | as sessões de foto vão até 19/10; sem isso, algumas páginas abrem sem foto | fase 3 |
| **D-13** | Regra escrita do dado volátil na camada de edição | registrar no `CLAUDE.md` que a camada de edição pode mostrar preço, endereço, horário e canais enquanto a edição acontece, e nada disso migra para o institucional | o comentário de `20260822_contas_marcas.sql:26-32` e a §2.2 hoje dizem o contrário para o site como um todo | fase 2 |
| **D-14** | Trocar a navegação de hash para endereço limpo (`pushState`) no site todo | sim, na fase 1, mantendo a leitura de hash para links antigos | URLs limpas para compartilhar e para QR; toca o institucional (testado) | fase 1 |
| **D-17** | O tema de cada combo aparece no site? | só depois do post de Confirmados de cada marca (decisão de 07/10 da pasta da edição) | o bloco B mostra ou não o tema inspirador | fase 4 |
| **D-15** | Datas de lançamento dos combos (03/11) e anúncio dos vencedores (19/11) podem ser exibidas | sim, se confirmadas | textos de "em breve" ficam vagos sem elas | nenhuma |
| **D-16** | Área válida das coordenadas (Natal e região) | caixa limite que cubra Natal, Parnamirim e as cidades com unidades | evita marcador fora do lugar | fase 2 |
| **D-18** | Curadoria pode publicar sem o administrador? | sim (`curadoria.decidir`), com o histórico registrando quem publicou | velocidade na véspera | fase 3 |
| **D-07** | og (prévia no WhatsApp e redes) por participante | começar com og genérico da Cartoon; og por participante só se houver função no servidor (Vercel Function) | compartilhamento mostra a mesma imagem para todas as casas | nenhuma |
| **D-11** | Combo diferente por unidade é possível? | não nesta edição; diferenças pequenas vão em "observação da unidade" e no escopo das trocas | modelo mais simples | nenhuma |
| **D-12** | WhatsApp público por unidade | número da loja preenchido = publicado (revisto em 23/10/2026; antes: caixa de autorização no painel) | dado de contato comercial exposto | fase 3 |
| **D-10** | O que fica público depois do encerramento | casa, combo, componentes, fotos e resultados; saem preço, horário, canais, mapa e Minha rota | `/cartoon` vira registro sem mentir | fase 9 |
| **D-19** | SVG do selo e do lettering | reexportar do `.ai` aprovado | o PNG de ~1,9k px serve, mas pesa e não escala | acabamento da fase 4 |
| **D-20** | Ambiente de teste do banco | esquema separado no mesmo projeto ou um projeto temporário; nunca dados fictícios no banco de produção | ensaio integrado seguro | fase 7 |

## Pontos que precisam de validação especializada (não decididos aqui)

- **Informação alimentar:** se a lista de alergênicos baseada na rotulagem brasileira (RDC ANVISA 26/2015, consolidada na RDC 727/2022 [Provável]) é adequada para comida servida na loja, e quais frases são seguras. O plano só garante que o site **não converte ausência em ausência de alergênico** e que **não promete segurança**.
- **LGPD na avaliação:** base legal, prazo de retenção, uso para marketing (separado) e sorteio, se houver.
- **Imagem e marca de terceiros:** a regra "sem personagem de terceiros" vale também para fotos de combo inspirados em desenhos; a legenda "inspiração/homenagem" está na pasta da edição, mas não foi validada juridicamente.

## Achados fora do escopo, registrados para não se perderem

- `get_rankings_admin` compara `'encantamento'` com `'envolvimento'` (`supabase/schema.sql:392-397`).
- A política de unidades da marca é `FOR ALL` e a concessão de UPDATE inclui `participacao_id` (banco, 14/10). Conferir se o `WITH CHECK` impede mover uma unidade para a participação de outra marca.
- `src/router.js` ainda diz que preserva "todas as rotas de QR Codes", o que não é mais verdade.
- `/lovers/painel` é exceção do redirecionamento, mas não tem rota: mostra a Home com o endereço inalterado.
- `scripts/generate-lovers-qrcodes.mjs` está quebrado (o pacote `qrcode` foi removido).
- A aba "Guia de fotos" do painel da organização (`vistas/GuiaFotos.jsx`) não está montada.
