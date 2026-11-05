# 15 · Caça — alternativa excepcional ao GPS: opções analisadas

**Status: DECISÃO DO WILKER PENDENTE.** Nada disto está implementado. Hoje não existe exceção ao GPS: o carimbo só entra por
`mapa_carimbar` (QR + localização). Spec §12: a alternativa não pode enfraquecer a validação, e **QR fixo sozinho não prova presença**
(o adesivo pode ser fotografado e repassado).

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

## Recomendação (não é decisão)
1. **Agora, sem exceção:** opção **G** + conferir as coordenadas que faltam. É o único caminho que não cria fraude nova, e a revisão
   (`caca_carimbo_revisao_listar`) já cobre o que entrar sem prova.
2. **Se a decisão for ter uma exceção**, a de menor risco e menor trabalho é **F** (carimbo manual na hora, por pedido, pela organização,
   com `origem='excecao_painel'`, motivo registrado e visível na revisão), porque é rara, auditada e não exige a marca nem hardware.
   **A** (revisão posterior) como segunda escolha se o volume for alto.
3. **Evitar:** E (enfraquece a validação) e D (guarda foto de visitante sem base pronta). B e C só se a organização topar a
   operação por casa.

Pergunta para o Wilker: quer manter **sem exceção** (G) ou habilitar **F** (carimbo manual auditado)? Habilitar F custa uma RPC de painel
(`producao.gerir`) e uma ação na tela de revisão; o campo `origem` e a lista já estão prontos.
