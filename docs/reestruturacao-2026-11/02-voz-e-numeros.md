# 02 · Voz e números

## Parte A · Como o site fala

### Quem está falando

O festival fala como **anfitrião**: alguém de Natal que conhece as casas pelo nome, recebe bem e vai direto
ao ponto. Não é a agência falando do evento, nem a casa falando do próprio doce.

### Cinco regras de frase

1. **Uma ideia por frase.** Frase curta primeiro, detalhe depois.
2. **Verbo de ação e "você".** "Registre o interesse da sua casa", não "as inscrições podem ser realizadas".
3. **Número no lugar de adjetivo.** "131 marcas em dez anos", não "inúmeras marcas ao longo de uma trajetória incrível".
4. **Passado e futuro.** O site conta o que aconteceu e convida para o que vem. Nunca finge edição em andamento.
5. **Promessa só do que existe.** Interesse não é vaga. Opinião enviada não é publicação garantida.

### O que o festival é (e o que não é)

- É **um festival de Natal que movimenta as casas e a cidade em torno de um tema**.
- **O sabor é das casas.** O festival não cozinha: ele dá o tema, a vitrine e o público. Nenhum texto elogia
  a comida como obra do festival.
- O público **avalia** (não "vota"). Quem avalia é **Sweet Lover**.
- O combo é **um doce, um salgado e uma bebida**, criados pela casa para o tema.

### Palavras

| Usar | Evitar |
|---|---|
| Sweet & Coffee Week · o festival · a edição · SCW (depois do nome completo) | "o Sweet", "do Sweet", "Sweet Coffee Week" |
| casas · marcas (para contar) | "estabelecimentos" fora da central de dúvidas; "lojistas" |
| Sweet Lovers · quem prova · quem avalia | "consumidores", "clientes finais", "votantes" |
| avaliam · dão nota | "votam", "votação" |
| registrar interesse · próximas edições | "inscreva-se", "garanta sua vaga" |
| apoiar · apoio · patrocínio (quando for o caso) | "cotas", "investimento a partir de" |
| sua opinião · conte · sugira | "feedback", "pesquisa de satisfação", "fale conosco" |
| Natal · a Grande Natal · a cidade | "a capital potiguar" em toda frase; nunca imagem do Rio |

Não repetir em sequência: experiência, cidade, rota, memória, marcas.

### Tom por página

| Página | Tom | Exemplo |
|---|---|---|
| Festival | convite | "A cada edição, um tema. Natal sai de casa para provar." |
| O festival em Natal | prova | "86 das 131 marcas voltaram para outra edição." |
| Edições e Marcas | memória, sem nostalgia pesada | "Dezessete temas. Escolha por onde começar." |
| Sweet Awards | reconhecimento | "Quem prova dá a nota. O festival entrega o prêmio." |
| Participar | conversa de dono para dono | "Você cria o combo. O festival leva a cidade até a sua porta." |
| Apoiar | objetivo, com dado | "Sua marca diante de quem sai de casa para provar." |
| Chamada de sugestão (Contato) | escuta | "A próxima edição começa com o que você tem a dizer." |
| Dúvidas | resposta na primeira frase | "Não. Registrar interesse não garante vaga." |

### Mensagens de formulário (padrão único)

- Enviado: "Recebemos. Obrigado por escrever para o festival." + o que acontece depois, em uma linha.
- Erro de envio: "Não foi possível enviar agora. Seu texto continua aqui: tente de novo em instantes."
- Campo obrigatório vazio: "Falta preencher: {campo}."
- Nada encontrado (busca): "Nenhum resultado para "{termo}". Tente o nome da casa ou o tema da edição."

---

## Parte B · Os números

Leitura de 16/11/2026. No texto do site, **todo número é lido da fonte** (`festivalFacts.js`); os valores
escritos em `03-textos.md` são os de hoje e mudam sozinhos quando a fonte mudar.

### B1 · O festival (para qualquer página)

| Chave | Texto no site | Valor exato | Escopo | Fonte | Ressalva |
|---|---|---|---|---|---|
| edições | 17 edições | 17 | 2016 a 2026.2 | base de edições | contado, não digitado |
| anos | 10 anos · desde 2016 | 10 | primeira edição: 01 a 11/09/2016 | base | — |
| temas | 17 temas | 17 | "Início" conta como o tema da estreia | base | — |
| marcas | 131 marcas | 131 | 17 edições | base | rede conta uma vez |
| participações | 437 participações | 437 | 17 edições | base | uma marca por edição |
| retorno | 2 em cada 3 marcas voltaram | 86 de 131 (66%) | 17 edições | `festivalFacts.js` | **novo no site** |
| estreias | 7 marcas novas por edição, em média | 7 | desde 2016 | `festivalFacts.js` | arredondado; **novo no site** |
| premiadas | 11 edições com Sweet Awards | 11 | 2019.1 a 2026.1 | base | Cartoon em apuração |
| colocações | 271 colocações entregues | 271 | resultado publicado | base | sem a Cartoon |
| pódio | 44 marcas já subiram ao pódio | 44 | resultado publicado | base | sem a Cartoon |
| imprensa | 17 matérias em 13 veículos | 17 | lista com link verificado | `conteudo/home.js` | contar da lista |

### B2 · Vendas e redes: duas formas de mostrar (decisão D1)

| Indicador | **Com a Cartoon parcial** (proposto) | **Só até a Lovers** (como está hoje) | Como se chega |
|---|---|---|---|
| Combos vendidos | **+44 mil** | +34 mil | 34 mil (16 edições, apurado em jun/2026) + 10.124 lançados na Cartoon |
| Movimento nas casas | **+R$ 1,1 milhão** | +R$ 712 mil | 712 mil + 393,8 mil (10.124 combos × R$ 38,90) |
| Visualizações no Instagram | **+42 milhões** | não se aplica | 42.150.745 = posts 31.492.967 + stories 10.657.778, **out/2024 a 16/11/2026** (ver B2.1) |
| Interações no Instagram | **+1,6 milhão** | não se aplica | 1.687.304 = curtidas + comentários + compartilhamentos + salvamentos dos posts, 2016 a 16/11/2026 |
| Publicações no feed | **+1.800** | não se aplica | 1.804 posts, 2016 a 16/11/2026 |
| Stories | **+13 mil** | não se aplica | 13.762 stories, 2018 a 16/11/2026 |
| Seguidores | +65 mil | +65 mil | total de junho de 2026; o atual não consta |

As linhas do Instagram não dependem de D1: saem da leitura do perfil inteiro até 16/11/2026, não de uma soma
"total antigo + edição".

#### B2.1 · Instagram ano a ano (fonte)

Exportação "Export data" do Meta Business Suite, uma por ano e por tipo, gerada em 17/11/2026. Arquivos em
`2026.2 SCW CARTOONS/11_RELATORIOS_AVALIACOES/instagram/export-todos-os-anos/` (Dropbox, fora do repo).
Post repetido entre arquivos conta uma vez.

| Ano | Posts | Stories | Visualizações (posts) | Visualizações (stories) | Interações (posts) |
|---|---|---|---|---|---|
| 2016 | 53 | — | — | — | 6.761 |
| 2017 | 163 | — | — | — | 42.901 |
| 2018 | 137 | 1.101 | — | — | 74.856 |
| 2019 | 174 | 2.408 | — | — | 175.484 |
| 2020 | 379 | 5.604 | — | — | 178.800 |
| 2021 | 240 | 1.724 | — | — | 214.237 |
| 2022 | 132 | 477 | — | — | 131.885 |
| 2023 | 120 | 546 | — | — | 112.768 |
| 2024 | 117 | 434 | 4.880.278 | 2.340.794 | 129.190 |
| 2025 | 103 | 514 | 15.047.267 | 3.018.227 | 209.884 |
| 2026 (até 16/11) | 186 | 954 | 11.565.422 | 5.298.757 | 410.538 |
| **Total** | **1.804** | **13.762** | **31.492.967** | **10.657.778** | **1.687.304** |

Limites da fonte:

- **Visualizações só existem a partir de out/2024.** As exportações de 2016 a 2023 não trazem a coluna. O site
  diz o período: "desde 2024", nunca "desde 2016".
- **Compartilhamentos quase não foram medidos antes de 2024** (4 em 2016, 9 em 2018). As interações antigas são
  um piso.
- **Só entra o que ainda está no perfil.** Post apagado ou arquivado não aparece na exportação. Os posts de 2022
  começam em agosto, os de 2023 em outubro e os de 2024 em outubro.
- **Stories de 2016 e 2017:** a exportação veio vazia.
- **Alcance** aparece em parte dos anos e com valores incompletos. Não entra no site.

Ressalvas que acompanham o texto:

- **Cartoon em apuração:** 19 das 27 casas lançaram vendas, e só 4 completaram os onze dias. O número real é
  maior. A nota no site: "A edição Cartoon ainda está em apuração."
- **Os dois valores são pisos.** Somar dois pisos dá um piso: "mais de 44 mil" continua verdadeiro.
- **Movimento da Cartoon** é combo × preço único da edição. Não inclui o que o cliente comprou além do combo.
- **Alcance não entra.** O alcance somado conta a mesma pessoa várias vezes; não vai para o site.
- Visualizações, interações e alcance nunca se somam entre si.

### B3 · A edição mais recente: Cartoon (05 a 15/11/2026)

Retrato da edição, sem ranking de casa. Vai na Home (capítulo da edição), em "O festival em Natal" e em Apoiar.

| Chave | Texto no site | Valor exato | Ressalva |
|---|---|---|---|
| casas | 27 casas | 27 | 8 estreantes |
| avaliadores | 4.285 pessoas avaliaram | 4.285 | uma pessoa = um e-mail |
| avaliações | 6.859 avaliações | 6.859 | 05 a 15/11 |
| nota | nota média 9,2 | 9,19 | escala de 5 a 10; média do festival, nunca por casa |
| notas 10 | 6 em cada 10 notas foram 10 | 63% | 30.472 de 48.013 notas |
| vozes | 1.001 comentários e 565 sugestões | 1.001 · 565 | enviados junto da avaliação |
| QR | mais de 9 mil leituras de QR Code nas casas | 9.443 | robôs e testes fora |
| site | mais de 13 mil visitantes no site | 13.693 | conta navegadores, não pessoas |
| celular | 9 em cada 10 visitas pelo celular | 94% | — |
| caça | 2.824 mapas da Caça aos Carimbos | 2.824 | 833 com carimbo |
| carimbos | 2.163 carimbos | 2.163 | válidos; 2 pessoas completaram as 27 casas |
| instagram | 9,8 milhões de visualizações | 9.815.672 | 99 posts e 428 stories, 16/09 a 15/11 |
| combos | mais de 10 mil combos registrados | 10.124 | **parcial** |
| apoio | Patrocínio: Sicredi · Apoio: Senac e Espaço Reduzido · Realização: F2 Experience | — | base da edição |

### B4 · O que não vai para o site

- Série de preços do combo por edição e qualquer preço em página institucional.
- Venda, nota ou ranking por casa (cada casa recebe o seu relatório).
- Número de lojas/unidades, vouchers emitidos, pedidos da Caça anulados.
- Alcance somado do Instagram; visualizações de página do Analytics (contadas em dobro até 11/11).
- Números da ação do Sicredi, até o patrocinador autorizar.
- Comparação com a população de Natal.
- Qualquer número por edição antiga (decisão D8).

### B5 · Como atualizar

1. Vendas da Cartoon fecharam: trocar o valor em `festivalFacts.js`; os totais e as notas se ajustam.
2. Resultado do Sweet Awards: seguir `docs/numeros-do-site.md` §8. Colocações e pódio sobem sozinhos.
3. Nova edição encerrada: o retrato B3 passa a ser o dela; o da Cartoon sai do site e fica no relatório.
