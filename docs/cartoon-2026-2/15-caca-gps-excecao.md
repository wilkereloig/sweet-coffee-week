# 15 · Caça — alternativa excepcional ao GPS: opções analisadas

**Status (05/11/2026): IMPLEMENTADO — a opção F foi construída em formato de PEDIDO, com decisão da organização.** O Wilker mandou decidir
a alternativa mais segura e viável; esta é ela (ver "Decisão e o que foi implementado", no fim). O texto das opções abaixo é o da análise original.
Spec §12: a alternativa não pode enfraquecer a validação, e **QR fixo sozinho não prova presença** (o adesivo pode ser fotografado e repassado).
Contrato técnico: `15-caca-contrato-gps.md`.

## O que o sistema já entrega (migration 20261207)
- `carimbos.origem`: todo carimbo fica marcado `gps` (unidade com coordenada conferida e celular dentro do raio) ou
  `unidade_sem_coordenada` (a unidade não tinha ponto conferido, então o carimbo entrou sem prova de distância). Isso já existia
  como `conferido=false`; agora é um campo claro e consultável. `excecao_painel` está reservada para a decisão abaixo.
- `caca_carimbo_revisao_listar`: a organização vê, com casa, unidade, apelido e hora, todos os carimbos sem prova de GPS e anula os
  duvidosos com `carimbo_anular`. Os alertas já existentes de "viagem impossível" (`get_mapa_carimbos`) continuam valendo.

## Problema a resolver
A pessoa está **na casa**, o GPS falha de forma persistente (permissão negada no navegador, interior de shopping/subsolo,
aparelho sem GPS, precisão ruim acima de 300 m). Hoje ela recebe `sem_localizacao` ou `longe` e não consegue carimbar.
Cada opção abaixo tenta dar um caminho **sem** abrir a porta para carimbo remoto em massa.

## Opções

| # | Opção | Como funcionaria | Prova de presença | Risco de fraude | Custo/atrito |
|---|---|---|---|---|---|
| A | **Revisão posterior** (carimbo "em análise") | GPS falhou: o carimbo entra como pendente de revisão e só conta no placar depois que a organização aprova no painel | fraca no ato; forte depois (alguém decide) | médio: quem fabrica carimbos não vê o resultado na hora, mas vira trabalho manual; sem critério objetivo a organização decide no escuro | alto para a organização no pico (7 a 11/11); quem joga espera |
| B | **Código temporário da marca** | a casa gera no painel da marca um código de 4–6 dígitos que vale poucos minutos e é dito/mostrado no balcão; a pessoa digita no lugar do GPS | boa se o código só existe no balcão | baixo/médio: funcionário pode "dar" código a quem não está; código pode ser repassado por mensagem em minutos. Exige a marca operar (contradiz o princípio "sem funcionário validando") | atrito na operação da loja; depende de treinamento |
| C | **QR rotativo no display / tela** | o QR muda a cada 30–60 s (tela da loja, ou impresso com token via e-mail da marca); o QR fixo atual continua para quem tem GPS | boa: foto do QR expira | baixo, mas só se existir **tela** em cada casa. O adesivo de papel que já foi impresso não rota | custo de hardware/operação por casa; 27 casas e ~41 QRs já impressos |
| D | **Reconhecimento por avaliação com foto** | no lugar do GPS a pessoa envia a avaliação do combo com uma **foto do combo na mesa/balcão**, e a organização confere a foto | média: foto é fácil de reaproveitar; EXIF/hora podem ser removidos | médio/alto: foto da internet ou de outra pessoa; exige moderar imagens (dado pessoal, LGPD) | a Caça passaria a guardar fotos de visitantes; não há hoje tabela/armazenamento para isso |
| E | **Segunda tentativa sem exigir precisão** (relaxar o limite) | aceitar `precisao > 300 m` quando a distância mínima possível ainda cabe no raio, ou permitir localização aproximada por Wi-Fi/IP | fraca: abre carimbo a centenas de metros | médio: amplia o raio efetivo da validação para todos | zero de operação; **enfraquece** a validação, contra a spec |
| F | **Carimbo manual pela organização** (exceção "no painel") | a pessoa fala com a organização (WhatsApp/ponto de apoio), que cria o carimbo `excecao_painel` para aquele mapa e casa | depende do critério humano | baixo se for raro e auditado; alto se virar rotina | trabalho humano caso a caso; exige tela de painel nova e auditoria |
| G | **Não ter exceção; melhorar o caminho do GPS** | instruções claras ("ative a localização, aguarde 10 s, saia da cobertura"), tentar de novo, e dica para abrir o link no navegador padrão (não dentro do Instagram); coordenadas conferidas de todas as unidades | a mesma de hoje | nenhum novo | zero de fraude nova; quem insistir em falhar fica sem carimbo naquela casa |

## Observações que pesam na escolha
- **Cobertura de coordenada é metade do problema.** Carimbo sem prova de GPS já acontece hoje quando a unidade não tem ponto
  conferido (`unidade_sem_coordenada`). Conferir as coordenadas das 27 casas reduz o caso sem exceção nenhuma.
- A recusa do GPS pelo próprio usuário (privacidade) e a falha técnica são casos diferentes; só o segundo merece exceção.
- Qualquer exceção deve ser **auditada** (a origem fica gravada), **rara** e **revisável**: a lista de revisão já existe para isso.
- As opções B, C e D mudam o que a marca ou o visitante fazem no balcão; isso é decisão de operação, não só de código.
- Avaliação não substitui presença: ela já é exigida para validar a casa (ordem livre), então D não prova nada que a avaliação
  sozinha não prove, só acrescenta a foto.

## Decisão e o que foi implementado (05/11/2026)

**Escolhida: F (carimbo manual pela organização), no formato de _pedido de revisão de presença_ feito pelo próprio app.** Junto com G
(melhorar o caminho do GPS), que é a primeira linha de defesa, e a lista de coordenadas pendentes (`15-caca-coordenadas-pendentes.md`).

### Como funciona
1. **GPS melhor primeiro (G):** a permissão só é pedida no toque em "Carimbar"; até 3 tentativas de leitura em alta precisão, guardando a melhor;
   mensagens por motivo (negada, indisponível, demorou, imprecisa, longe com a distância) e passo a passo para iPhone e Android; "Tentar de novo".
2. **Pedido de revisão (F):** depois de **2 falhas de localização seguidas** — e só se ainda é plausível estar na casa (sem localização, margem
   > 100 m ou a ≤ 500 m) — aparece "Estou na casa e o GPS não funciona". O pedido grava um registro **pendente** em `caca_carimbo_excecao`
   (motivo, distância e margem calculadas pelo servidor, nota opcional de até 200 caracteres). **Não carimba e não conta nada.**
3. **A organização decide no painel** (Edição › Carimbos › "Pedidos de presença"): vê apelido, casa/unidade, motivo, distância, margem, nota,
   se já avaliou, quantos carimbos já tem na casa e quantos pedidos fez. **Aprovar** cria o carimbo com `origem = 'excecao_painel'`
   (`conferido = false`), respeitando a janela e as 12 h, e ele cai também em "Revisão sem GPS"; **negar exige o motivo**. Tudo auditado em
   `caca_evento` com a conta pessoal. A pessoa vê só o estado (em análise · aprovado · não aprovado) — nunca a nota interna.
4. **Contadores visíveis:** a aba "Revisão sem GPS" mostra quantos carimbos vieram sem GPS por dia e por pessoa (e quantos contam), e as
   abas "Vouchers do dia" e "Prêmio final" mostram uma faixa quando há carimbo sem GPS ou pedido esperando — antes de apurar.

### Por que é a mais segura e viável
- **A decisão é humana e da organização, nunca da casa.** Nenhum funcionário entra no fluxo normal nem no da exceção; ninguém precisa treinar balcão.
- **O pedido sozinho não vale nada.** Quem tenta "fabricar" pedidos não ganha carimbo; vira fila para a organização (e fila tem teto: 5 pendentes por
  pessoa, 1 pedido por casa a cada 12 h, 2 por casa por dia, 20 pendentes por casa desde 20261217 — era 300 na edição).
- **Não abre porta nova ao QR fixo:** foto do adesivo repassada não gera carimbo; só o pedido com decisão humana gera.
- **Não enfraquece a validação normal:** o raio (200 m + margem ≤ 300 m) não mudou; o pedido é recusado (`nao_precisa`) quando o carimbo normal
  funcionaria — nas casas sem ponto conferido e quando o celular está no raio.
- **Mínimo de dado:** o servidor guarda distância e margem, **não a posição**; mapa apagado apaga os pedidos.
- **Auditável e reversível:** o carimbo aprovado é marcado como exceção, aparece na revisão e pode ser anulado com `carimbo_anular`.
- **Viável:** sem hardware, sem foto de visitante (D), sem operação por casa (B, C); uma tabela, cinco RPCs e uma aba de painel.

### Contras assumidos
- Trabalho humano da organização durante 7–11/11 (a fila tem teto para não virar enxurrada). A aprovação deve sair **antes do corte do dia**
  (23h59 de Natal): uma decisão tardia gera o carimbo no instante da aprovação e **não retroage** apuração já fotografada.
- A organização decide com pouca prova (distância, margem e nota). Orientação operacional: aprovar quando o pedido é coerente (distância
  plausível, pessoa já avaliou, histórico limpo) e negar quando destoa; na dúvida, negar com motivo e pedir que tente de novo no local.
- Como todo GPS de navegador, a posição pode ser forjada por quem controla o aparelho; isso já era verdade antes e não piora.

### O que NÃO foi feito (e por quê)
- E (relaxar o limite): enfraquece a validação. D (foto): sem base legal/armazenamento. B e C (código ou QR rotativo): exigem a casa no fluxo.
- Notificação ao visitante quando o pedido é decidido: não disparada (sem push real nesta etapa); a pessoa vê o estado ao reabrir a tela do carimbo.
- Prazo de **retenção** dos pedidos: não decidido (depende do Wilker/jurídico) — hoje ficam enquanto o mapa existir.

### Ordem de grandeza esperada
Com 14 unidades ainda sem ponto (9 casas) e 27 conferidas, a maioria dos carimbos tem GPS. O pedido deve ser raro; se o volume subir,
o gargalo certo é conferir as coordenadas (`15-caca-coordenadas-pendentes.md`), que elimina a necessidade nas casas sem ponto.
