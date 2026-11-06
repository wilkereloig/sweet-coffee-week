# Localização e sugestão da próxima casa (Mapa da Doçura)

Código: `src/edicao/caca/mapa/proximidade.js` (regra e memória no aparelho), `Proximidade.jsx` (convite, cartão, interruptor),
`textos-perto.js` (texto), `src/styles/cartoon/18-perto-sugestao.css`. Testes: `tests/cartoon-caca-perto.test.mjs` (regra) e
`tests/cartoon-caca-perto-navegador.mjs` (tela). Complementa o botão "Perto de mim" (`cartoon/paginas/mapa/Perto.jsx`).

## O que existe

1. **Convite ao entrar no mapa.** Faixa fina acima do mapa: por que a localização ajuda (casas e combos perto, carimbo na casa), um botão
   "Usar minha localização" e "Agora não". O navegador só pergunta no TOQUE do botão. Aparece só no Mapa, só enquanto a permissão está
   "por perguntar", com as sugestões ligadas e sem adiamento. "Agora não" some com o convite por 7 dias (guarda só a data).
   Permissão negada: o convite não volta; "Perto de mim" tenta de novo e já explica como liberar nas configurações.
2. **Sugestão de casa** (cartão abaixo do mapa, junto do progresso). Mostra casa, unidade, bairro, distância em linha reta (quando
   confiável), nome e foto do combo, "Ver combo", "Como chegar" e "Ver no mapa". É só ajuda para escolher: nada marca visita, carimbo ou
   avaliação.
3. **Escolhas da pessoa:** "Agora não" por casa (some por um dia), "Desligar sugestões" no próprio cartão e o interruptor "Sugerir casas
   perto de mim" na folha de Filtros. Desligado, o mapa também para de ler a posição sozinho ao abrir (só o botão "Perto de mim" lê).

## Prioridade da sugestão (a ordem é a da função `sugerirProximaCasa`)

1. Sem posição válida → nada.
2. Só casas com combo cadastrado e unidade com ponto no mapa. O desenho do mapa ilustrado nunca é fonte de distância.
3. Com o mapa da pessoa lido: só casas ainda não visitadas (pendente pede avaliar; conquistada já está feita). Sem mapa lido nada é
   descartado por estado.
4. Impedimento confirmado tira a unidade: combo encerrado hoje ou sem combo hoje. Horário não informado ou fora do período NÃO impede, mas
   nunca é chamado de "aberto": a tela diz "horário do combo a confirmar".
5. Várias unidades: vale a elegível mais perto.
6. Rota com paradas pendentes: a rota manda e não muda. As casas dela não são sugeridas; a sugestão vira "outra opção perto de você".
7. Casa dispensada hoje não volta no dia.
8. Ordem: mais perto em linha reta; empate em até 100 m → aberta agora, depois abre hoje, depois horário a confirmar, depois ponto
   conferido. Ponto aproximado entra e é dito aproximado.
9. Margem de erro da posição acima de 1,5 km: sem distância (não se inventa precisão).
10. Mais de 60 km da casa mais perto: "longe", sem sugestão.

## Privacidade

- A posição vive só na memória da página: nada é gravado, enviado, logado ou mandado ao Analytics. O teste reprova `fetch`, `sendBeacon`,
  `gtag`, `console.` e `watchPosition` no módulo da regra.
- Guardado no aparelho (`localStorage`): preferência ligada/desligada, data do convite adiado e casas dispensadas no dia. Nenhuma coordenada.
- Localização e notificações são permissões separadas: esta função não pede notificação, e a notificação não pede localização.
- Sem processamento no servidor. Nenhuma regra de carimbo, avaliação ou premiação foi tocada.

## Em segundo plano — o que é e o que não é possível

**Implementado: só com o mapa aberto ou o app em primeiro plano.** A sugestão usa a localização autorizada ao abrir e ao voltar para o app
(`visibilitychange`, leitura com cache curto), sem leitura contínua.

**Não implementado, e não prometido: aviso de proximidade com o app fechado ou em segundo plano.**

- [Certeza] `navigator.geolocation` não existe em Service Worker: o `caca-sw.js` não consegue ler a posição.
- [Certeza] Navegadores não oferecem geofencing para sites e apps instalados (PWA) no Android e no iPhone.
- [Certeza] O push do projeto só dispara de um servidor. Avisar "você está perto" exigiria mandar a posição para o servidor com frequência,
  o que contraria a regra de não registrar histórico nem enviar coordenadas.
- [Provável] No iPhone, o app instalado perde a leitura ao ir para segundo plano e pode perguntar a permissão de novo a cada abertura.
- **Alternativa disponível:** a sugestão aparece sozinha quando a pessoa abre o mapa ou volta ao app, e os comunicados que a organização
  envia pela central de avisos (não dependem de posição) seguem como estão.
- **Não testado em aparelho real** (iPhone e Android): os testes usam Chromium com localização simulada.

## Localização lembrada entre visitas (07/11/2026)

- Depois da primeira leitura bem-sucedida o aparelho guarda só a **data da concessão** (`scw_perto_concedida`, nunca coordenadas). Nas visitas seguintes o mapa lê a posição sozinho e **não mostra o convite de novo**.
- Vale mais que a Permissions API: o Safari do iPhone costuma responder "prompt" mesmo com a localização liberada. Se a API disser `denied`, a lembrança não é usada.
- Recusa (código 1) apaga a lembrança e o convite volta a poder aparecer. "Desligar sugestões" continua parando qualquer leitura automática.
- ⚠️ Se o iPhone voltar a mostrar a pergunta DO SISTEMA, isso é do navegador (principalmente no navegador interno aberto por outro app, que não guarda a permissão); o site não consegue impedir. Ajuste: Ajustes › Safari › Localização › sweetcoffeeweek.com.br = Permitir, ou instalar a Caça como app.
- A conta da Caça (`scw:edicao:<código>:mapa`) segue em `localStorage`; o app agora pede `navigator.storage.persist()` para o navegador não apagá-la por falta de espaço. O Safari apaga armazenamento de site sem uso por ~7 dias fora do app instalado: o caminho de volta é o link pessoal/"Recuperar meu mapa".

## O que não foi tocado

Regras de carimbo, validação por avaliação, premiação, rota da pessoa, banco, edge functions e flags de publicação.
