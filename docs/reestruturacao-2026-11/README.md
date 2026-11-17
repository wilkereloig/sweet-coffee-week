# Reestruturação do site: estrutura e texto, sem visual (16/11/2026)

Pedido do Wilker em 16/11/2026: reescrever e reestruturar o site inteiro, sem mexer no visual. Este
conjunto é o plano: páginas, navegação, acervo, painel, linguagem, todos os textos e todos os números
disponíveis hoje. **Nada aqui foi aplicado ao código.** O site no ar e a branch `dev/site-completo`
continuam como estavam no commit `410fc0d2`.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `01-estrutura.md` | Públicos, mapa de páginas, navegação, rotas, momentos do site, como mostrar edições, acervo e marcas |
| `02-voz-e-numeros.md` | Como o site fala e a tabela de todos os números, com fonte, período e ressalva |
| `03-textos.md` | O texto de cada página, seção por seção: títulos, apoios, ações, formulários, mensagens e SEO |
| `04-escuta-e-painel.md` | Como o público e as casas falam com o festival, o que o painel ganha, banco e privacidade |

## A ideia em seis linhas

1. **O site responde a três perguntas, nesta ordem:** o que é o festival, o que ele faz por Natal e como
   fazer parte.
2. **Quatro públicos, quatro caminhos:** quem prova (Sweet Lovers), quem cria (casas), quem apoia
   (empresas) e quem noticia (imprensa). Cada um acha a sua porta em um clique.
3. **O acervo é o produto.** Edições, marcas e Sweet Awards viram três entradas do mesmo acervo, ligadas
   entre si: da edição chego à marca, da marca chego ao prêmio.
4. **O festival escuta.** Página nova, "Sua opinião", para o público sugerir tema, indicar casa, contar
   história e criticar. As casas seguem com a "Sua opinião" do painel, que ganha uma tela de leitura.
5. **Número com dono.** Todo número tem fonte, período e ressalva. A edição mais recente tem o seu retrato;
   as outras edições não ganham placar, para não virar competição entre edições.
6. **O site muda sozinho com o momento do festival:** entre edições, edição anunciada, edição acontecendo,
   resultado em apuração, resultado divulgado.

## Decisões que tomei e você pode reverter

| # | Decisão | Por quê | Para reverter |
|---|---|---|---|
| D1 | Os totais do festival passam a **somar a Cartoon, mesmo parcial**: +44 mil combos, +R$ 1,1 milhão, +27 milhões de visualizações. O texto diz que a Cartoon ainda está em apuração | Você pediu para usar todos os dados de hoje, vendas inclusive. Isso inverte a regra de hoje cedo ("não somar histórico com parcial") e a de não multiplicar combos por preço | Usar a coluna "Só até a Lovers" da tabela em `02-voz-e-numeros.md` |
| D2 | **Apoiadores da última edição aparecem** em Apoiar e na Home, com data ("Edição Cartoon, novembro de 2026") | Pedido seu. Altera a regra "sem patrocinador exibido" (§2.2). A data impede que o bloco minta quando a próxima edição chegar | Voltar a mostrar só no agradecimento da Cartoon |
| D3 | **Página nova "O festival em Natal"** (`/impacto`): economia, cidade, cultura, redes, imprensa e método | É o argumento que você pediu (importância para a cidade) e serve a casas, apoiadores e imprensa com um endereço só | Virar seção da Home |
| D4 | **Página nova "Sua opinião"** (`/sua-opiniao`), com publicação só mediante autorização e leitura da organização | "A gente quer escutar as pessoas." Hoje o único canal público é o assunto "Sugestão ou feedback" do Contato | Manter só o Contato |
| D5 | **Diretório de marcas** (`/marcas` e `/marcas/<marca>`) entra no plano | Estava previsto e nunca foi feito. É o que liga edição, combo e prêmio | Adiar (o resto não depende dele) |
| D6 | Menu passa a ser: Festival · Edições · Marcas · Sweet Awards · Faça parte · Dúvidas. "Faça parte" abre Participar, Apoiar e Sua opinião | Uma porta por público, sem crescer o menu | Menu atual + "Sua opinião" no rodapé |
| D7 | **"Na imprensa" sai da Home** e vai para "O festival em Natal" | A Home fica mais curta e a imprensa vira prova de impacto | Manter na Home |
| D8 | Edições antigas **não ganham bloco de números**. Só a edição mais recente tem retrato em números, e ele troca quando a próxima terminar | Respeita "edições não competem entre si" (§8.5) | — |

## Regras do projeto que este plano altera

Se o plano for aprovado, estas regras mudam no mesmo commit em que o código mudar:

- `CLAUDE.md` §2.2 item 2 ("sem patrocinador exibido"): passa a permitir os apoiadores da última edição, datados (D2).
- `docs/numeros-do-site.md`: a regra de não somar histórico com parcial (D1).
- `docs/regras/09-dado-do-festival.md`: a regra de não multiplicar combos por preço, só para a Cartoon, em que o preço foi único (D1).
- `CLAUDE.md` §2.4: mapa de páginas (D3, D4, D5).
- `docs/regras/07-1-home.md`: seções da Home (D7 e a ordem nova).

Ficam como estão: as absolutas (§1), "edições não competem entre si", "não inventar dado", nomenclatura e
grafias (§8), sem preço, endereço e horário no institucional, nenhum resultado antes da divulgação oficial.

## O que só você tem

1. Vendas da Cartoon: 8 casas não lançaram nada e 15 têm dias pendentes (111 de 297 dias lançados).
2. Como foram calculados os R$ 712 mil até a Lovers. [Provável] combos × preço de cada edição.
3. Autorização do Sicredi para publicar números da ação dele (hoje ficam fora do texto).
4. Resultados: Sweet Awards, Caça aos Carimbos e sorteios.
5. Seguidores atuais do Instagram (o último total é de junho de 2026).
6. Patrocinadores da Lovers (a base está vazia).
7. Os dois arquivos `acervo/ACERVO-OFICIAL.md` e `acervo/plano-site-institucional.md`, citados no
   `CLAUDE.md`, não existem mais no repositório.

## Ordem de construção sugerida

Cada fase entrega algo que fica no ar sozinho.

1. **Números e apoiadores na fonte** (`festivalFacts.js`, base da edição). Sem tela nova.
2. **Textos novos nas páginas que já existem** (Home, Participar, Apoiar, Sweet Awards, Edições, Contato).
3. **Sua opinião**: página, tabela, envio, tela "Escuta" no painel, textos legais.
4. **O festival em Natal** (`/impacto`).
5. **Marcas** (`/marcas`).
6. **Edições por tema e por marca**, e o acervo de fotos.
