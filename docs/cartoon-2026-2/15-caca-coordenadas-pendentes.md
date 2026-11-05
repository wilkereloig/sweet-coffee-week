# 15 · Caça — unidades sem coordenada conferida

Levantado no banco do projeto "Sweet & Coffee Week" em 05/11/2026 (leitura, nada alterado). Fonte: `participacao_unidades` (que
participam da 17ª edição) × `unidades` (`lat`, `lng`, `coordenada_verificada_em`).

**Resumo:** 41 unidades participam; **27 têm ponto conferido; 14 não têm**. Dessas 14, as 9 primeiras abaixo são casas **sem nenhuma
unidade conferida** (9 das 27 casas). Nessas casas o carimbo vale **sem GPS** (origem `unidade_sem_coordenada`), entra na fila de revisão
do painel e só conta depois da avaliação do combo. As outras 5 unidades pendentes pertencem a casas que já têm ao menos uma unidade
conferida (ver "Casas que já estão cobertas").

⛔ **Nenhuma coordenada foi inventada nem marcada como conferida.** Todas as 14 estão sem `lat`/`lng`. A conferência é o passo humano de
Participantes › Localizações (`org_verificar_coordenada`): abrir o endereço no Google Maps, colar o par "latitude, longitude", confirmar.
O OpenStreetMap/Nominatim foi avaliado e descartado como fonte de verdade (em Natal ele erra a casa: 4,8 km na Carcará).

## Casas sem nenhuma unidade conferida (prioridade)

| # | Casa | Unidade | Endereço cadastrado |
|---|---|---|---|
| 1 | Bolomania | (única) | Avenida Praia de Búzios 9031, Ponta Negra, Natal, RN |
| 2 | Caffè Basilico's | (única) | Avenida Rodrigues Alves 433, Petrópolis, Natal, RN |
| 3 | Canuto's | (única) | Rua Aníbal Brandão 391, C, Nova Parnamirim, Parnamirim, RN |
| 4 | Caroli Douces ⚠️ | (sem nome) | Rua Presidente Quaresma 1232, Lagoa Seca, Natal, RN |
| 4 | Caroli Douces ⚠️ | Rio Grande Mall | Avenida Ayrton Senna 2441, Lojas 30/31, Nova Parnamirim, Parnamirim, RN |
| 4 | Caroli Douces ⚠️ | (sem nome) | Rua Almeida Barreto 442, Lagoa Nova, Natal, RN |
| 4 | Caroli Douces ⚠️ | (sem nome) | Avenida Praia de Ponta Negra 9060, Ponta Negra, Natal, RN |
| 4 | Caroli Douces ⚠️ | (sem nome) | Avenida Senhor do Bonfim 4037, Potengi, Natal, RN |
| 5 | Casa 1190 Restaurante e Coffee | (única) | Avenida Xavier da Silveira 1190, Lagoa Nova, Natal, RN |
| 6 | Diva do Café | DIVA DO CAFÉ | Rua Dr. Orlando de Azevedo 2116, Dentro da Agroflores, Capim Macio, Natal, RN |
| 7 | Just Food&Coffee | (única) | Rua Dr. Orlando de Azevedo 1981, Capim Macio, Natal, RN |
| 8 | Marlon Vinicius - Confeitaria e Café | (única) | Rua Ismael Pereira da Silva 1657, Capim Macio, Natal, RN |
| 9 | Sweet Duo Confeitaria | (única) | Rua Antônio China, 490 590, Lagoa Seca, Natal |

⚠️ **Caroli Douces** tem 5 unidades (as 5 sem ponto) e ainda **não está com combo publicado** (`nivel = marca`), então hoje nem entra
na contagem das casas da Caça (26 de 27 até ela virar `marca_e_combo`). Conferir os 5 pontos só importa quando o combo for publicado.
⚠️ **Endereços para olhar antes de conferir:** Sweet Duo traz "490 590" (número duplicado); Canuto's traz "391, C" (complemento).

## Casas que já estão cobertas (sobra de unidade, sem urgência)

| Casa | Unidade pendente | Endereço cadastrado | Observação |
|---|---|---|---|
| Mariana's Confeitaria | (sem nome) | Mariana’s confeitaria 2050, Capim macio, Natal | provável duplicata da unidade já conferida (Roberto Freire 2050); o campo "logradouro" veio com o nome da marca. Conferir se é a mesma loja e, se for, retirar a duplicada em vez de conferir |

(Eram 14 unidades pendentes: 13 nas 9 casas acima — 1 + 1 + 1 + 5 + 1 + 1 + 1 + 1 + 1 — e 1 da Mariana's.)

## Geocodificação aproximada (separada de "conferida")

O script `scripts/edicao/geocodificar-retrato.mjs` já existe: geocodifica no Nominatim as unidades sem ponto e grava o resultado em
`src/edicao/dados/retrato/cartoon.local.json` com `"conferir": true`, **sem tocar no banco**, e recusa resultado ambíguo ou só de rua.
Serve para o **mapa do site** (pino aproximado com aviso), nunca para a validação do carimbo: o carimbo só usa `unidades.lat/lng` com
`coordenada_verificada_em`. Rodar o script não muda nada neste levantamento. Se o Wilker quiser um ponto sugerido para acelerar a conferência,
o caminho é rodá-lo e comparar com o Google Maps antes de confirmar em Localizações — a sugestão nunca vira "conferida" sozinha.

## O que fazer (ordem sugerida)

1. Conferir primeiro as 8 casas de unidade única (Bolomania, Caffè Basilico's, Canuto's, Casa 1190, Diva do Café, Just Food&Coffee,
   Marlon Vinicius, Sweet Duo): são 8 pontos e fecham 8 das 9 casas.
2. Caroli Douces: depois que o combo for publicado, conferir os 5 pontos.
3. Mariana's: confirmar se a unidade sem nome é duplicata.

Cada ponto conferido troca o comportamento sozinho: a casa passa a exigir QR + GPS (raio de 200 m + margem do GPS, no máximo 300 m), o
carimbo antigo sem GPS dessa casa deixa de contar no progresso (`caca_carimbo_conta`) e o pedido de revisão de presença passa a existir
para ela (`15-caca-gps-excecao.md`). ⚠️ **Conferir uma casa depois de a Caça abrir pode tirar do progresso carimbos já feitos sem GPS**
(origem `unidade_sem_coordenada`); por isso conferir **antes de 7/11** é bem melhor do que durante.
