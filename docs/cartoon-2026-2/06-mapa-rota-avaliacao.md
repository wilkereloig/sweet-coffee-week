# 6 · Mapa, Minha rota, avaliação e premiação

## 6.1 Mapa (`/cartoon/mapa`)

### Comportamento

- Entram só **unidades publicadas com coordenada verificada pela organização** (`coordenada_verificada_em` preenchido).
- As unidades publicadas sem coordenada aparecem na lista com "localização em conferência".
- **A lista vem primeiro.** Ela é renderizada com os dados da projeção. O mapa interativo carrega sob demanda, quando a área entra na tela no desktop ou quando a pessoa toca em "Ver no mapa" no celular. Se o mapa falhar, a lista continua completa.
- **Lista e mapa sincronizados:**
  - selecionar na lista centraliza o marcador e abre o cartão;
  - tocar no marcador destaca e rola a lista até o item;
  - o endereço guarda `?unidade=<id-publico>`.
- Cartão da unidade: casa, unidade, bairro, horário do combo de hoje, estado (aberto agora / abre às / fechado hoje), modos, "Ver casa", "Como chegar", "+ Minha rota".
- **Filtros, só com dados existentes:** bairro, modo (local / retirada / delivery), aberto agora (só em `em_andamento`), sem glúten declarado e sem lactose declarada.
- **Localização do visitante:** só por botão "Usar minha localização", com explicação de uma linha. Ordena a lista por distância em linha reta, marcada assim: "distância em linha reta". A posição não é enviada a lugar nenhum nem gravada.
  - Exige trocar `Permissions-Policy` para `geolocation=(self)` (`vercel.json:15`).
  - Negada ou indisponível: o botão some e a lista continua por bairro.
- **Como chegar:** link para serviço externo com o destino em coordenada. Para o Google Maps, `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`, que dispensa chave [Provável: formato público do Google Maps URLs; conferir na implementação]. Alternativa opcional: Waze.
- **Acessibilidade:**
  - o mapa é complementar, toda função existe na lista;
  - os marcadores são botões com nome;
  - foco não fica preso no mapa;
  - com a tecla Tab, a lista vem antes do mapa.

### Provedor: comparação

Nenhum preço abaixo foi conferido nesta etapa. Valores de custo precisam de consulta às páginas oficiais antes da decisão (D-03).

| | Google Maps JS (2D) | Leaflet + tiles raster de provedor com plano gratuito | MapLibre GL + tiles vetoriais |
|---|---|---|---|
| Existe no histórico | sim, `MapaGoogle.jsx` (2591 linhas) [Fato] | sim, `MapaLeaflet.jsx` órfão [Fato] | não |
| Chave e conta | chave + Map ID + faturamento ativo (`VITE_GOOGLE_MAPS_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`) [Fato] | depende do provedor (alguns pedem chave) | depende do provedor |
| Custo | cobrança por carregamento acima da franquia [Provável] | gratuito até o limite do provedor; o servidor público do OpenStreetMap não é para uso de produção intenso pela política dele [Provável] | idem |
| Peso | carregador pequeno; a API vem em tempo de execução | ~40 kB gzip [estimativa] | ~200 kB gzip ou mais [estimativa] |
| CSP | exige hosts do Google em `script-src`, `connect-src`, `img-src` | exige o host dos tiles em `img-src` | `connect-src` + `worker-src` |
| Visual | estilizável por Map ID | tiles prontos; pouco controle | estilo próprio completo (pode seguir a paleta Cartoon) |
| Familiaridade do público | alta | média | média |

**Recomendação [Proposta, sujeita a D-03]:** Leaflet com tiles raster de um provedor com termos explícitos para produção e atribuição correta. Motivos:

- é o menor peso;
- não exige faturamento;
- "Como chegar" já leva ao Google Maps, que é onde está a rota de verdade.

O componente fica atrás de uma interface `<MapaUnidades unidades selecionada onSelecionar>`. Assim, trocar de provedor não muda as páginas.

**Não fazer:** mapa 3D. Nunca registrar chave no console (defeito herdado, `MapaGoogle.jsx:228-231`).

## 6.2 Minha rota (`/cartoon/minha-rota`)

| Função | Como |
|---|---|
| Adicionar | botão nos cartões de unidade (participante, mapa, lista). Guarda o `id_publico` da unidade |
| Evitar duplicação | conjunto por `id_publico`; o botão vira "Na sua rota ✓" e o segundo toque oferece remover |
| Remover e reordenar | lista com botões "subir" e "descer" acessíveis por teclado, mais arrastar no ponteiro. A ordem é a do visitante |
| Persistência | `localStorage` chave `scw:edicao:2026.2:rota`, com `{versao, unidades:[ids], atualizado}`; leitura e escrita em `try/catch` (padrão do site). Nada vai ao servidor |
| Vínculo à edição | a chave inclui o código; na próxima edição a rota começa vazia. A rota Lovers (`sweet-lovers-route`) é ignorada |
| Unidade despublicada | ao abrir, cruza os ids com a projeção; o que não existe mais aparece como "saiu da edição" com remover; nunca some calado |
| Acesso ao combo e ao endereço | cada parada mostra casa, unidade, endereço, horário do combo hoje e link para a página |
| Trajeto externo | "Abrir rota no Google Maps" com destino = última parada e paradas intermediárias na ordem escolhida. Limite de paradas do link [Provável: 9, que era o limite usado na Lovers]; acima disso, divide em trechos |
| Compartilhar | link `/cartoon/minha-rota?u=id1,id2` (ids públicos); quem abre vê a rota e pode salvar como sua |
| O que **não** prometer | "melhor caminho", "rota otimizada", tempo de percurso. Não há cálculo de rota no projeto. A ordem é a do visitante; a distância mostrada é em linha reta |

## 6.3 Avaliação (`/cartoon/avaliar`)

### O que a Lovers deixa [Fato, `supabase/schema.sql`]

- Janela validada no servidor.
- Um voto por e-mail ou telefone por participante, com último vale.
- Bloqueio de domínios descartáveis.
- Ranking só com publicação.
- Detector de votos suspeitos.

E o que não serve:

- tabela `votos` sem coluna de edição, com o participante em texto livre;
- dados pessoais demais, todos obrigatórios;
- sem captcha nem limite de envio;
- identidade guardada sem prazo no navegador;
- três fontes de data divergentes.

`votos` está vazia hoje.

### Proposta

| Tema | Regra |
|---|---|
| Separação por edição | tabela nova `avaliacoes` com `edicao_codigo` obrigatório e `participacao_id` + `participacao_unidade_id` como chaves estrangeiras. Nada da Lovers é reaproveitado como dado |
| Elegibilidade | o servidor confere que a participação tem versão publicada vigente com nível `marca_e_combo` e que a unidade participa. Avaliar exige combo publicado |
| Período | `submit_avaliacao` aceita só com `avaliacao_aberta = true` **e** `now()` dentro de `avaliacao_abre_em`/`avaliacao_fecha_em` da edição. A data mostrada no site vem da mesma fonte (a projeção), nunca de constante no código |
| Duplicidade | uma avaliação por pessoa por participação. **[Decisão D-05]** chave da pessoa: e-mail confirmado por link (mais forte, exige envio de e-mail) ou e-mail + celular sem confirmação (modelo Lovers). Reenvio da mesma pessoa substitui a anterior (último vale), com registro da substituição |
| Limite e robô | o envio passa pela Edge Function `enviar-formulario` (já tem Turnstile, honeypot e tempo mínimo; `functions/enviar-formulario/index.ts:31-35`), com `submit_avaliacao` na lista permitida e limite por IP e por e-mail por hora |
| Falha e reenvio | o formulário guarda o rascunho em `sessionStorage` (sem dados pessoais além do que a pessoa digitou na sessão); em erro de rede mostra "Não enviamos ainda. Tentar de novo" sem perder as notas; o botão fica desabilitado durante o envio |
| Sucesso | só depois da resposta `ok` do servidor com o id gravado. Não há sucesso otimista |
| Campos pessoais | mínimo para deduplicar e contatar o ganhador de algum sorteio, se houver: nome e e-mail (+ celular se D-05). Faixa etária, escolaridade e gênero **saem**, a menos que a organização justifique a finalidade (D-05) |
| Consentimento | aviso com link para `/privacidade` antes do botão. Caixa **separada e opcional** "Quero receber novidades do Sweet & Coffee Week", desmarcada por padrão. A caixa "Sigo @…" não volta |
| Proteção | tabela sem acesso público; leitura só por RPC com `relatorio.ler`; e-mail e celular nunca saem em relatório público; retenção definida (D-05). O navegador não guarda identidade além da sessão |
| Critérios | **[Decisão D-05]** a Lovers usou 7 notas de 5 a 10 (encantamento, apresentação, atendimento, criatividade, salgado, doce, bebida). Os critérios da Cartoon não estão definidos. A tabela guarda `notas jsonb` validado contra a lista de critérios da edição em `edicao_criterios`, então a definição tardia não exige migration |
| Painel | resultados e auditoria em `painel-app` (Admin > Avaliação), com `relatorio.ler`. Corrigir o defeito `encantamento`/`envolvimento` antes de reaproveitar a lógica |

**A ausência de critérios não bloqueia nada antes da fase 6.** Catálogo, participantes e mapa saem antes.

## 6.4 Premiação (`/cartoon/premiacao`)

- **Antes dos resultados:** como funciona e as categorias, quando definidas (**[Decisão D-06]**: categorias, peso de júri técnico e público, empates). Sem categorias definidas, a página diz "As categorias serão anunciadas em breve".
- **Resultados:** gravados em `premiacoes` (tabela existente, 271 linhas históricas, com `trilha` júri técnico ou Sweet Lovers, `colocacao` 1–3 e `participacao_id`). Aparecem só com o interruptor 6. O anúncio previsto é 19/11 (`00-estado-da-edicao.md`).
- **Formato:** o da página Sweet Awards atual, com pódio por categoria, empate permitido e ausência honesta de 2º e 3º lugares quando não houver.
- **Depois do encerramento:** os resultados entram no histórico do Sweet Awards (CLAUDE.md §2.1).
