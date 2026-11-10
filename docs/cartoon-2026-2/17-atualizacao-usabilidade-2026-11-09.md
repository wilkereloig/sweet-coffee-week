# 17 · Atualização de usabilidade, sincronização e "como carimbar" — 09/11/2026

Registro de andamento do pedido do Wilker de 09/11/2026 (painéis, site Cartoon, mapa, jogo). Serve para continuar entre sessões:
o que foi feito, o que foi conferido de verdade, o que ficou pendente e por quê.

**Publicado em 10/11/2026** (pedido do Wilker): merge de `dev/site-completo` em `master` (`67d5a84b`), levando também os 46 commits de
06 a 09/11 que ainda não estavam no ar. Conferido no domínio: ranking com "Atualizar agora" e ritmo, "Como carimbar?" no mapa e a seção
nova do regulamento. Antes do merge: build limpo e todas as suítes verdes (cartoon 337, caça 301, organização 735, ícones, redesign,
casca institucional, responsivo, privacidade, layout do mapa, guia, ranking ao vivo).

## Ambiente

- Desenvolvimento e site publicado usam **o mesmo banco** (`dgfmoibynftadsyjcclg`) e o festival está em curso (558 pessoas no placar em
  09/11). Por isso toda mudança de banco desta rodada é **aditiva** e os testes de navegador usam servidor simulado na rede do
  navegador: nenhum carimbo, mapa, prêmio ou aviso real foi criado ou alterado.

## Feito

| Área | O que mudou | Commit |
|---|---|---|
| Painel da marca | Link de delivery inválido e WhatsApp do responsável inválido ficam fora da gravação (antes o link gravado era apagado e a tela dizia "salvo"); a tela diz o que não salvou | `e56b692c` |
| Mapa | Faixa do jogo fora da tela cheia: Progresso (com placar), Prêmios, Ranking, Grupos, Rota (só no computador) e "Como carimbar?" entre a barra e o mapa. Antes só existiam na tela cheia ou rolando a página | `9623b015` |
| Como carimbar | Guia único (`src/edicao/caca/guia/`): 5 passos + 7 dúvidas com ação; introdução do primeiro acesso como cartão na tela (dispensa lembrada no aparelho, chave `scw_caca_guia`); atalho no hub, no mapa, na ajuda antiga e na tela do carimbo (inclusive na recusa). Confirmação do carimbo diz a casa, o progresso (também no pendente) e o próximo passo | `a4a1ced2` |
| Ranking | Relê sozinho a cada 60 s com a aba à vista, ao voltar à aba e ao voltar a internet; "Atualizado há N min" + "Atualizar agora"; rede caída mantém o último ranking com aviso. Indicador "Quem mais avançou nas últimas 24 horas" | `d37eff50` |
| Progresso | O mapa da pessoa é relido ao voltar à aba (no máximo a cada 30 s): hub, mapa e ranking deixam de mostrar número velho | `d37eff50` |

## Banco

| Migration | O que cria | Aplicada? |
|---|---|---|
| `20270116_caca_ritmo_publico.sql` | Função `caca_ritmo_publico(edicao, horas=24, limite=5)`: diferença do placar OFICIAL (`caca_ranking_v2`) entre agora e 24 h atrás, só de quem autorizou aparecer; devolve apelido e contagens. Só leitura, nenhuma regra alterada | **Sim**, em 09/11/2026 no banco único, pelo MCP `supabase-scw`. Conferido: responde em ~0,2 s, `anon` executa, resultado coerente |

Janela de 24 horas: o festival tem um corte por dia e a mesma casa só carimba de novo depois de 12 horas. O indicador não muda a
classificação nem entra em prêmio; quem não avançou não aparece (ausência não vira zero).

## Conferido de verdade (não só lido)

- **Sincronização painel → site, no banco real (só leitura):** 27 casas publicadas; nenhuma fora da sincronização; nenhuma com conteúdo
  diferente do que `montar_publico` daria agora; a tarefa `sincronizar-publicacoes` (a cada 2 min) ativa, sem falha em 24 h.
- **Navegador (Playwright, 360 e 1280):** `node tests/cartoon-guia-navegador.mjs` (introdução, dispensa lembrada, guia no hub, mapa e
  carimbo, foco, Escape, sem rolagem lateral) e `node tests/cartoon-ranking-aovivo-navegador.mjs` (atualiza sem recarregar, volta à aba,
  queda e volta da rede, ritmo). `npm run test:mapa-layout` segue passando com a faixa nova.
- **Unidade:** `tests/painel-app-edicao-marca`, `tests/cartoon-mapa-atalhos-fixos`, `tests/cartoon-caca-ranking`.

## Lido no código, sem alteração (estava certo)

- Avisos do jogador: lista e contador saem da mesma leitura; "visto" só depois do servidor; destino validado; relê ao voltar à aba.
- Isolamento entre marcas: policies exigem `user_id = auth.uid()` / `marca_dona_*`. Não testado contra o banco com duas contas.
- Cadastro da marca: salvamento em fila (sem duplicar), sucesso só após o servidor, texto preservado em falha, aviso ao sair.

## Pendências concretas

1. **Pins de Senac e Espaço Reduzido:** o repositório só tem as logos. Faltam: quais unidades do Senac participam, endereços oficiais
   e coordenadas; endereço do Espaço Reduzido. Sem isso nenhum pin foi criado (regra A4: não inventar).
2. **Decisão de negócio — alteração de combo aprovado e tema vão ao ar sem nova análise** (a sincronização publica e zera a marca
   "alterado depois da aprovação"). Manter ou segurar até a organização aprovar?
3. **Regulamento público** não cita o carimbo por delivery nem o carimbo especial Sicredi e diz que nenhum funcionário valida carimbo
   (no delivery a casa confirma por código). O guia novo explica os dois; o texto do regulamento precisa do ok do Wilker.
4. **Sweet Duo Confeitaria:** a ficha da organização tem "Rua Antônio China, 490, 590" e o site mostra "Rua Antônio China, 490"
   (a edição de endereço pela organização grava num campo que o site só usa quando a unidade não tem logradouro). Conferir qual vale.
5. **Seis testes de `npm run test:cartoon` já falhavam antes desta rodada** (textos de Sicredi, disputa, prêmios pessoais e atalhos
   mudaram em sessões anteriores e os testes não acompanharam). Não foram tocados aqui.
6. **Painéis:** contador de avisos conta só os 60 mais recentes (lista e contador concordam entre si); remoção de unidade/troca some da
   tela antes do servidor confirmar (em falha a tela avisa e pede para recarregar). `painel-app/CLAUDE.md` ainda abre descrevendo
   páginas estáticas (o próprio arquivo marca como histórico).
7. **Compreensão de "como carimbar":** validado tecnicamente (o guia abre, é acessível, o texto segue o fluxo real de dois toques
   QR → "Carimbar" → "Carimbar aqui"). **Não foi observado com usuários reais**: se a dificuldade diminuiu só se sabe olhando o uso
   (pedidos de revisão, carimbos pendentes sem avaliação, mensagens à organização).

## Fechamento de 10/11/2026

- **Decisões do Wilker:** alteração feita pela marca vai ao ar sem nova análise (fica como está); o regulamento foi atualizado
  (seção "Carimbo por delivery, por visita anterior e carimbo Sicredi"); o endereço da Sweet Duo é o número 490 (corrigido no banco,
  campo `participacao_unidades.endereco`).
- **Testes que estavam vermelhos eram desatualizados, não defeito** (regra mudou de propósito e o teste não acompanhou): campanha até
  13/11, carimbo Sicredi por print, sétimo atalho "Pedir carimbo", foto opcional na visita anterior, prêmio final sem dia, prefixo
  `v2-` nos arquivos do build, Home institucional em `/festival`. Alinhados.
- **Defeitos reais corrigidos antes de publicar:** raio literal em `inicio-marca.css`, ícone `mecanica/voucher` em tamanho fora da
  escala (`Sicredi.jsx`), e a faixa do jogo empurrando o mapa para fora da primeira dobra no celular (agora duas fileiras).
- **Seguem abertos:** pins de Senac e Espaço Reduzido (faltam unidades e endereços) e observar o uso real de "como carimbar".

## Segunda leva de 10/11/2026 (publicada, master `688f39ec`)

Pedido do Wilker por áudio. Decisões dele: ganham os 2 com mais casas no dia (sorteio só no empate), 1 voucher por pessoa, valendo
do dia 9 ao 13, voucher físico retirado no Espaço Reduzido; pin do Senac só na Faculdade Senac RN.

| Área | O que mudou |
|---|---|
| Vouchers | Migration `20270117` (aplicada): `voucher_qtd_por_dia` (1 em 7 e 8; 2 de 9 a 13), `voucher_retirada` (Espaço Reduzido, Av. Abel Cabral, 366, Nova Parnamirim), dias até 13/11. Sai o índice "um ativo por dia"; a trava é a contagem em `caca_premio_dia_criar` (`dia_completo`). `caca_apurar_dia` completa o dia e devolve `premios[]`. Voucher físico não exige a reserva digital, o aviso ao ganhador diz o local e a tela de Prêmios mostra "N vouchers em disputa" e o bloco de retirada. Painel: "Completar ganhadores do dia". Regulamento reescrito na seção de vouchers |
| Ensaio | Apuração do dia 9 simulada numa transação desfeita: 2 ganhadores diferentes, terceiro recusado (`dia_completo`), retirada no detalhe, 2 avisos. Nada ficou gravado. A apuração real do dia 9 é feita pela organização no painel |
| Mapa na Caça | Abrir o mapa entra direto na tela cheia; "Sair" volta ao hub da Caça. `?tela=normal` mantém a página comum (usada pelos testes de layout). "Como carimbar?" virou botão "?" na coluna da tela cheia. O pop-up "O que você disputa" passou para o hub. A linha de avisos do computador saiu da tela cheia (empurrava a barra e o botão dos atalhos cobria o "Sair") |
| Cadastro da Caça | Campo Instagram opcional (`mapas_lover.instagram`, função `mapa_definir_instagram`, migration `20270118` aplicada) |
| Avaliação | Duas perguntas novas, opcionais: "O que você está achando do festival?" e "Tem alguma sugestão para o festival?" (`avaliacoes.comentario_evento`, `sugestao_festival`, função `avaliacao_complementar`). A pergunta que já existia virou "Quer comentar algum detalhe deste combo?". A leitura da organização (`get_avaliacoes_dados`) traz os campos novos |

**Não feito nesta leva**

- **Pins de apoiadores.** Espaço Reduzido: endereço e ponto conferidos no Google Maps (-5.8742499, -35.2169532), mas o pin não foi
  criado: o padrão do Sicredi mistura marcador, cartão de campanha e posição na arte ilustrada, e generalizar isso pede um trabalho
  próprio (e a posição na arte é escolha do Wilker). Faculdade Senac RN: o Google Maps não tem a faculdade como lugar, só cinco
  unidades do Senac (Zona Sul, Cidade Alta, Alecrim, Zona Norte, Barreira Roxa). Falta saber em qual delas fica.
- **Tela do painel para ler as respostas novas da avaliação e o Instagram dos mapas.** Os dados são gravados e saem na leitura da
  organização; não há coluna nova nas telas.
- **"Confirmar que recebi"** não aparece no voucher físico: quem marca a entrega é a organização ("Entregar", no painel).

**Erro meu nesta leva:** um `git add tests/` levou para a dev 832 arquivos soltos (capturas e rascunhos de teste de outras sessões).
Foram retirados no commit seguinte e a `master` recebeu o conteúdo por commit único, sem eles; os arquivos seguem no disco. O
histórico da `dev` ainda guarda esses arquivos (commits `8c3c96bc` e `081dc113`).

## Pins de apoio no mapa ilustrado (10/11/2026, terceira leva)

Pedido do Wilker: um pin por apoiador; ao tocar, o cartão lista todos os locais.

- `src/edicao/caca/mapa/apoio.js` (dados e posição na arte) e `Apoio.jsx` (cartão). O pin reaproveita a placa do Sicredi no
  `Mundo.jsx` (`a.apoio`, `a.logo`, `a.nomeAcessivel`).
- Senac: cinco unidades de Natal, endereços de rn.senac.br/unidades. O pin único fica na posição da unidade Alecrim.
- Espaço Reduzido: Av. Abel Cabral, 366, Nova Parnamirim (retirada do voucher físico).
- Só no mapa ilustrado. No mapa real os pins entravam no afastamento e empurravam pin de casa para baixo do rodapé do
  Google; `test:mapa-layout` reprovava. Fica para decidir se vale resolver.
- `afastar.js`: o anel não sai mais sem arranjo (grupo grande de pins largos estourava o teto de raio e quebrava o mapa).
- Pendente: não entram na vista "Lista"; posição na arte é calculada, o Wilker pode pedir outra.
