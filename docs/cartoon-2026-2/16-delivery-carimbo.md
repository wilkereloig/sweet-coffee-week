# Carimbo de delivery — confirmação pela casa ou imagem para a organização (06/11/2026)

Quem pediu e recebeu o combo por delivery pede o carimbo sem estar perto da casa. Sem GPS, sem posição guardada, sem entregar a
chave do mapa. Nada carimba na abertura: o pedido só vira carimbo na confirmação da casa ou na aprovação da organização, e o
carimbo só vira casa **validada** depois da avaliação do combo com o mesmo e-mail do mapa (regra de todo carimbo).

## Fluxo

| Passo | Onde | O que acontece |
|---|---|---|
| 1 | Ficha da casa (só com delivery declarado "sim") · Central da Caça (atalho) | "Carimbo do meu delivery" (ficha: "Pedir carimbo do meu delivery") → `/cartoon/caca/delivery?casa=<slug>` |
| 2 | Formulário | casa · unidade (se houver mais de uma com delivery) · data do pedido · referência (opcional) · observação |
| 3a | **Confirmar com a casa** (principal) | `caca_delivery_pedir` já devolve um código temporário (6 caracteres, 24 h, uso único); a pessoa o manda à casa pelo canal do pedido |
| 3b | Casa, balcão do painel | botão **Carimbo de delivery**: digita o código → vê o essencial → **Confirmar entrega** (`caca_delivery_consultar` / `_confirmar`) |
| 4 | **Enviar imagem para análise** (alternativa) | o aparelho reduz a imagem (WebP/JPEG, lado 1600, até 3 MB) → edge `caca-delivery` assina o envio → PUT direto no bucket privado → `caca_delivery_anexar` põe o pedido em análise |
| 5 | Organização, Edição › Carimbos › Pedidos de presença | delivery com imagem: **Ver imagem**, Aprovar, Negar (motivo obrigatório), Excluir imagem. Delivery com código só aparece como "Aguardando a casa" |

Estados que a pessoa vê: *Aguardando a casa* · *Código vencido* · *Em análise* · *Carimbo registrado — falta avaliar* · *Carimbo validado* · *Não aprovado*.

## O que já existia e foi reaproveitado

Fila `caca_carimbo_excecao` (mesma tabela, `motivo = 'delivery'`), tela de Pedidos de presença, auditoria (`caca_evento`, `auditoria`), 12 horas por
casa/e-mail, janela da avaliação, `criado_em = now()` na decisão (nunca retroage apuração de voucher; o prazo excepcional de 05/11 **não** vale),
`caca_carimbo_conta` (delivery conta como qualquer carimbo aprovado). Pontuação, pesos e prêmios não mudaram.

## Regras do servidor

- Só unidade com `delivery_combo = 'sim'`, que participa e tem QR ativo. "Não informado" não é delivery.
- Código: 6 caracteres (alfabeto sem 0/O/1/I), único na tabela, 24 h; novo código só depois de vencer, até 3 por pedido.
- A casa só alcança códigos das **próprias** participações (`participantes.user_id = auth.uid()`); código de outra casa = "inválido", sem dizer se existe.
- 8 códigos errados em 15 min bloqueiam a conta por 15 min. Confirmação trava a linha (`for update`): duas confirmações simultâneas dão uma só.
- Pedido duplicado: mesma referência na casa, ou mesma pessoa+data sem referência. Limites: 4 por pessoa/casa, 5 pendentes por pessoa, 60 na fila da casa.
- Origem do carimbo: `delivery_casa` ou `delivery_organizacao`; fora dos alertas "viagem impossível" e "sem conferência" (não há GPS).
- A organização não decide delivery com código (`aguarda_casa`) e não aprova sem imagem (`sem_imagem`).

## Imagem: como é protegida

Bucket `caca-delivery` **privado**, sem policy, 3 MB, só JPEG/PNG/WebP. Quem grava é o service role: o visitante recebe uma URL assinada de envio de
**um** caminho que o banco reservou (`<edição>/<pedido>/<uuid>.<ext>`, até 5 reservas por pedido). Quem lê é a organização (`producao.gerir`), por URL
assinada de 300 s da `arquivo-url`, e só de caminho gravado num pedido. Nada em URL pública, log, analytics ou ranking.

## Aplicado em 06/11/2026 (projeto Supabase único do SCW, que é o de produção)

- Migrations `caca_delivery` e `caca_delivery_alertas` (o arquivo `supabase/migrations/20261231_caca_delivery.sql` é a soma das duas). Reversão: `supabase/reverter/20261231_caca_delivery.sql`.
- Edge function **`caca-delivery`** publicada (versão 1). **`arquivo-url` publicada em 06/11 (versão 15; comentários do arquivo no repositório são mais longos que os da versão no ar)**; fumaça: 401 sem credencial, `subir` e `remover` fora do bucket recusados.
- Teste no banco com dados criados e desfeitos na mesma transação (nenhum carimbo, pedido, mapa ou arquivo real ficou): mais de 40 verificações, todas como esperado.

## Pendências e decisões

- **Retenção da imagem: sem prazo aprovado.** Nada é apagado sozinho; a organização exclui manualmente (botão **Excluir** na fila). Uploads abandonados (reservados e nunca anexados) ficam órfãos até haver prazo. **Não publicar a função ao público enquanto o prazo de retenção não for decidido** (privacidade).
- Concorrência por duas sessões reais simultâneas não foi simulada no banco (a trava é `for update` + índice único; a leitura do código cobre o desenho, o teste cobre o resultado sequencial).
- Câmera: o seletor nativo do aparelho abre a câmera; negada, a pessoa escolhe da galeria (nenhuma permissão é pedida pelo site).
- Nada disto está no ar para o público: o front está em `dev/site-completo`; a Vercel publica só no push para `master`.

## Testes

`npm run test:cartoon` (inclui `cartoon-caca-delivery.test.mjs`) · `npm run test:organizacao` (inclui `painel-app-delivery.test.mjs`) ·
`node tests/cartoon-delivery-navegador.mjs [<build>]` (visitante, contra o build) · `node tests/painel-delivery-navegador.mjs [<build>]` (casa e organização, backend falso).
