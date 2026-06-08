# Como funciona o Painel do Sweet Awards

> Guia de uso da área administrativa de resultados do **Sweet & Coffee Week Lovers**.
> O painel serve apenas para **visualizar e analisar** os dados — nunca altera nem apaga voto nenhum.

---

## Acesso

- **Endereço:** `sweetcoffeeweek.com.br/#/lovers/painel`
- É uma **área restrita por senha**. A senha é validada direto no banco de dados; sem ela, nenhum dado aparece.
- Depois de entrar, a sessão fica liberada até você sair (botão **Sair**) ou fechar o navegador.

---

## A votação, em resumo

Antes das telas, como os dados chegam:

- **Voto** = avaliação de **uma loja por vez**. Quem visita 3 lojas faz 3 votos. Cada voto tem **7 notas** (escala 5 a 10): Atendimento, Criatividade, Apresentação, Doce, Salgado, Bebida e Envolvimento em Loja.
- **Pesquisa** = preenchida **uma vez por pessoa** (não por loja): "o que mais gostou", "o que pode melhorar" e "sugestão de tema para a próxima edição".
- **Janela oficial:** de **04 a 16 de junho**. Fora desse período o sistema não aceita votos.

---

## As 5 abas

### 📊 Visão Geral
Tela inicial. Junta tudo num lugar só, em caixas com rolagem própria (pra não ficar quilométrica): a **Auditoria** (todos os votos + respostas da pesquisa) e os **Suspeitos**.

### 🏆 Resultados
A tela mais importante para a leitura do evento. Três partes:

**1. Botão "Baixar Excel"** — gera uma planilha formatada com tudo (ver o fim deste guia).

**2. Ranking** — top 3 de cada categoria, em cards com a **logo** do participante, medalha (🥇🥈🥉), a nota, o número de avaliações e uma barra proporcional. Categorias: as 7 notas + o prêmio **Melhor Combo** (média de Doce + Salgado + Bebida).

Há um seletor **"Cálculo"** com duas formas:

- **Média pura** — média simples das notas. É o cálculo que o site usa hoje. Problema: uma loja com 4 avaliações e média 9,9 fica na frente de uma com 139 avaliações e 9,4, mesmo a segunda sendo muito mais confiável.
- **Ponderada (justa)** — média "bayesiana" que puxa quem teve poucos votos em direção à média geral, e só deixa concorrer quem tem pelo menos 5 avaliações. Deixa o ranking mais justo.

> O seletor afeta **só a prévia do painel** — o site público continua na média pura.

**3. Resumo da Pesquisa** — uma **análise em texto** do que o público escreveu (não é só contagem de palavras): avaliação geral, nível de satisfação, pontos fortes, pontos a melhorar, temas mais sugeridos e conclusão com recomendações. É um retrato fechado (gerado a partir das respostas até a data indicada) e pode ser regenerado quando quiser.

### 📋 Auditoria
A lista de **todos os votos**. Recursos:

- **Paginação de 300 em 300**, com botões numerados.
- **Ordenação:** por participante (A–Z), por data (mais recentes) ou por data (mais antigos).
- **Barra de rolagem em cima e embaixo** da tabela (são muitas colunas).
- Cada linha traz as 7 notas **e** as respostas da pesquisa daquela pessoa (puxadas pelo e-mail). Quem votou em várias lojas repete a resposta da pesquisa em cada linha — é a mesma pessoa.
- Botão **Exportar CSV** com todos os votos.

### 💬 Pesquisa
As respostas da pesquisa, **uma linha por pessoa**: data, nome, e-mail, as lojas que ela votou, e os três campos de texto (gostou / melhorar / tema).

### ⚠️ Suspeitos
Sinais para **conferência manual** — **não bloqueiam voto nenhum** automaticamente. Apontam, por exemplo: mesmo telefone, Instagram ou nome usados em e-mails diferentes, ou e-mail que voltou (inválido).

> Dar nota 10 em tudo **NÃO** é tratado como suspeito — é entusiasmo legítimo.

---

## Resultado no site público

Os vencedores **ficam ocultos** no site durante a votação (ninguém vê parcial). Eles só aparecem quando a organização **publica** o resultado (uma chave no banco). Enquanto isso, o painel admin já mostra a prévia a qualquer momento.

---

## Exportação em Excel

O botão na aba **Resultados** gera um arquivo `.xlsx` formatado (cabeçalho colorido, colunas ajustadas, primeira linha fixa) com **4 abas**:

1. **Resultados** — top 3 por categoria
2. **Análise da Pesquisa** — o resumo qualitativo
3. **Votos** — todos os votos com notas + respostas da pesquisa
4. **Pesquisa** — as respostas, com as lojas votadas

---

## Segurança (o ponto mais importante)

O painel **só lê** os dados. Toda tela usa funções de leitura; **nenhuma operação do painel altera, sobrescreve ou apaga voto**. A votação registrada está preservada.
