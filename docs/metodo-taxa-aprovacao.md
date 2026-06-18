# Como funciona o resultado pela Taxa de Aprovação

**A ideia em uma frase:** em vez de premiar quem recebeu *mais* votos, premiamos quem teve o maior **percentual de clientes que amaram** — a melhor experiência, não a casa mais movimentada.

## Por que esse método é o mais justo

Na nossa votação, cada pessoa avalia os combos que provou dando notas de 5 a 10. Acontece que **quantidade de voto não é a mesma coisa que qualidade**: uma casa com duas unidades, ou num ponto de muito movimento, naturalmente recebe muito mais votos do que uma casa pequena e excelente. Se a gente premiasse por volume, o tamanho do negócio venceria o sabor — e não é isso que a Sweet & Coffee Week quer reconhecer.

A Taxa de Aprovação resolve isso medindo **a proporção, não o total**.

## O cálculo, passo a passo

1. **Conta as avaliações positivas de cada casa.** Positiva = nota **9 ou 10**. No Melhor Combo, vale a média dos três itens (doce + salgado + bebida): se essa média for 9 ou mais, conta como positiva.

2. **Divide pelo total de votos daquela casa.** O resultado é o percentual de clientes que tiveram uma experiência excelente.
   > Exemplo: uma casa com 100 votos, sendo 86 positivos, tem **86% de aprovação**. Outra com 400 votos e 320 positivos tem **80%**. A primeira vence — mesmo recebendo bem menos votos — porque agradou uma fatia maior de quem a visitou.

3. **Ranqueia pela taxa.** A maior porcentagem fica em 1º lugar, e assim por diante.

## A regra de corte (pra ser justo dos dois lados)

Pra uma casa entrar na disputa, ela precisa ter **pelo menos 30 avaliações** naquela categoria. Isso evita o "azar de sorte" do contrário: uma casa com 4 votos, todos 10, teria 100% de aprovação sem ter sido testada de verdade. Com o piso de 30, a porcentagem já reflete a opinião de gente suficiente pra ser confiável.

Em caso de empate na porcentagem, vence quem teve mais avaliações.

## Em resumo

- **Mede:** % de clientes que deram nota máxima (9–10).
- **Premia:** a melhor experiência percebida.
- **Não depende:** do tamanho da casa nem da quantidade de votos.
- **Protege:** a casa pequena e excelente de ser engolida pela grande e movimentada.
- **Garante confiança:** só concorre quem tem 30+ avaliações.

É por isso que dizemos *"avalie seu combo"*: o prêmio vai pra quem deixou mais gente encantada, proporcionalmente — a casa que entregou a melhor experiência, não a que vendeu mais.

---

## Nota técnica (para a equipe)

- Implementado em `src/pages/lovers/Painel.jsx`, função `Rankings`, método `taxa`.
- Constantes: `POS_MIN = 9` (corte de nota positiva), `RATE_MIN = 30` (piso de avaliações).
- Combo positivo = média(`nota_doce`, `nota_salgado`, `nota_bebida`) ≥ 9.
- Fórmula por categoria: `taxa = positivas ÷ total_de_votos_da_loja × 100`.
- O painel oferece 4 cálculos lado a lado: Média pura · Ponderada (bayesiana) · Aprovação (% positivas) · Taxa de aprovação. **Muda só a prévia do painel — o site público continua usando a média simples.**
