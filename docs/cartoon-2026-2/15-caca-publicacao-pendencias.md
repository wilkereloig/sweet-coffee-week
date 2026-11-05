# 15 · Caça aos Carimbos — o que falta para publicar a ação

Estado em 05/11/2026. Resultado da conferência do regulamento e dos textos contra as migrations 20261203 a 20261218 e os contratos `15-caca-contrato-*.md`.
O texto público (`src/edicao/cartoon/regulamento.js`, `src/data/conteudo/legal.js`) diz só o que o servidor e o app fazem hoje. O que não é decisão técnica
fica como `{ aDefinir }` (aparece marcado na página do regulamento) ou está aqui. Um item por linha: o que falta · onde está no texto · por que bloqueia (ou não) · quem decide.
Nada daqui foi inventado: idade mínima, forma e data de entrega do prêmio final e prazo de retenção continuam em aberto.

## Decidido em 06/11/2026 (Wilker)

- **Idade mínima: 18 anos** (Wilker, 06/11, escolhendo o menor risco: LGPD art. 14 e prêmio a menor exigiriam responsável). O regulamento diz isso (Quem participa). Sem trava técnica no cadastro do mapa: é só o texto.
- **Sorteio: não precisa de autorização oficial** (palavra do Wilker; sem checagem jurídica minha).
- **Janela da avaliação:** aberta no banco (05/11 09:26 → 15/11 23:59, Natal).
- **Gate:** `MAPA_PUBLICO = true` na dev; mapa, Minha rota e Caça ligam juntos.

## Indispensável para publicar

| O que falta | Onde está no texto | Por que bloqueia | Quem decide |
|---|---|---|---|
| **Provedor de e-mail ativo** (Resend com domínio verificado, ou reativar a chave do Brevo e validar o remetente) | Regulamento › "Seu mapa, seu e-mail e a recuperação" e "Vouchers"; telas de confirmar e recuperar | Hoje nenhum e-mail sai (a chave do Brevo está desativada e não há Resend). Sem código ninguém confirma o e-mail nem recupera o mapa, e voucher só nasce confirmado com e-mail confirmado (a organização pode confirmar um por um, mas não é viável no pico). O texto já avisa que a entrega não é garantida, mas a ação perde a recuperação e a confirmação. | Wilker (conta e DNS); ver `15-caca-contrato-identidade.md` |

## Pode publicar sem (mas precisa estar resolvido no prazo indicado)

| O que falta | Onde está no texto | Por que não bloqueia | Quem decide |
|---|---|---|---|
| **Data e forma de entrega do prêmio final** | Regulamento › "Prêmio final" (`aDefinir`) | O sorteio é depois de 15/11; basta estar definido e publicado antes do sorteio. Os 3 ganhadores levam o press kit oficial e uma surpresa (surpresa nunca descrita). | Wilker |
| **Prazo de guarda dos dados** (por quanto tempo os mapas ficam guardados depois do festival) | Regulamento › "Seus dados" (`aDefinir`) e Privacidade › "Por quanto tempo guardamos" ("ainda não foi definido") | O texto diz com honestidade que o prazo será informado; a lei pede que seja informado, então decidir antes de encerrar a ação. Hoje nada apaga sozinho. | Wilker / jurídico |
| **Compromissos operacionais que o texto assume** (não são do servidor): **registrar o código da semente no painel (Edição › Prêmio final › "Código da semente") ANTES de `avaliacao_fecha_em`** — depois disso o servidor recusa (`compromisso_tardio`) e o sorteio real fica impossível —; divulgar esse código e, com o resultado, a semente e a lista de concorrentes (apelido e peso); conferir os ganhadores antes de divulgar; entregar o voucher pelo contato do mapa (só com e-mail confirmado) | Regulamento › "Prêmio final" e "Vouchers" | O texto promete; o painel agora tem o passo do código. `SORTEIO_OFICIAL_LIBERADO` segue `false` até o Wilker liberar num commit à parte. | Organização, Wilker |
| **Pedidos de revisão de presença decididos antes do corte do dia** | Regulamento › "Como ganhar um carimbo" (aprovado nasce na hora da aprovação) | O texto já diz que a aprovação conta a partir do momento dela. Operação: olhar a fila do painel antes das 23h59. | Organização |
| **Prazo da chamada seguinte do voucher** (hoje 120 min, `proposta: true`) | Fora do regulamento de propósito | O regulamento só promete o prazo da primeira chamada (meio-dia do dia seguinte). | Wilker |
| **Coordenadas de 14 unidades (9 casas sem nenhuma conferida; 8 contam hoje) e combo da Caroli Douces** | Regulamento › "Como ganhar um carimbo" (casa com ponto em conferência: o QR sozinho não carimba, vira pedido de revisão) | Desde 20261217 o QR fixo sozinho nunca vale carimbo: em casa sem ponto conferido o servidor responde `sem_ponto` e a pessoa pede a revisão, que a ORGANIZAÇÃO decide (aprovar cria o carimbo `excecao_painel`). Funciona sem coordenada, mas é trabalho humano (fila no painel). Conferir as coordenadas (`15-caca-coordenadas-pendentes.md`) tira a casa do caso e deixa o GPS autônomo. A chave `caca_config.carimbo_sem_ponto` (`"revisao"` padrão; `"conta"` volta a carimbar sem GPS nessas casas) é decisão do Wilker; se mudar para `"conta"`, o texto do regulamento precisa mudar junto. | Wilker |
| **Chaves de push (VAPID) e disparo dos avisos** | Regulamento › "Avisos e app instalável" | Avisos são opcionais e o texto não promete entrega; sem as chaves a função responde `vapid_ausente` e o aviso aparece só na central. | Wilker |
| **Confirmar que o prêmio final continua sendo o press kit oficial + surpresa** | Regulamento › "Prêmio final" | É a regra de 04/11; a memória do projeto registra que o formato do press kit mudou em 29/10. O texto não descreve o conteúdo. | Wilker |

## Conferido e sem pendência

Atualização 05/11 (20261216 a 20261218): apagar o mapa agora remove o integrante de grupo (e-mail e apelido) quando é o último mapa do e-mail; confirmar o e-mail vale só para o mapa de quem pediu o código; sem e-mail confirmado e com 2 mapas não há principal; pedido de presença exige e-mail confirmado; confirmar prêmio exige e-mail confirmado; RPCs antigas de pontos fechadas.

Atualização 05/11 (20261217_caca_carimbo_premio_correcao): `entregar` prêmio também exige e-mail confirmado (exceção explícita `confirmar_excecao`/`entregar_excecao`, com nota de 10+ caracteres, só pela API por enquanto: o painel ainda não tem o botão); a janela de 12 h por casa ignora carimbo anulado e "primeira visita" é por e-mail; coordenada inválida (NaN, Infinity, fora do intervalo) nunca dá erro de banco; nota e apelido perdem caractere invisível/de direção; `definir_publicacao_edicao` nega com `nao_autorizado` em vez de erro de coluna ambígua. Casas sem NENHUM ponto conferido: segue `carimbo_sem_ponto = "revisao"` (QR sozinho não carimba; a pessoa pede revisão e a organização decide). Trocar para `"conta"` faz o carimbo contar sem GPS, ainda marcado e anulável na "Revisão sem GPS"; o servidor aguenta os dois modos e está testado nos dois (`supabase/testes/caca-carimbo-casa-mista.sql`), mas a troca é decisão do Wilker e exige mudar o regulamento junto.

Casas diferentes e extras · avaliação valida o primeiro carimbo (ordem livre) · 12 horas por casa · QR + localização (QR fixo nunca prova presença; equipe da casa fora do fluxo) ·
pedido de revisão decidido pela organização · vouchers de 7 a 11/11 (corte 23h59 de Natal, desempate, 1 por pessoa, e-mail confirmado, prazo meio-dia do dia seguinte, validade até 15/11) ·
prêmio final (todas as casas, peso base mais 1 por extra, 3 ganhadores, ganhar voucher não exclui, sorteio verificável) · ranking e grupos (privacidade) · marcos sem prêmio · avisos e app sem promessa de entrega ·
localização não é guardada (só distância e margem). Testes: `tests/cartoon-caca-textos-regras.test.mjs` e `tests/cartoon-caca-regras.test.mjs`.
