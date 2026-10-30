# 12 · Plano: contar as leituras dos QR Codes e mostrar no painel

**Estado (30/10/2026, fim do dia):** Fases 0 e 1 FEITAS no código e no banco; faltam publicar (1b) e o painel (2). D1, D2 e D5 decididas e o Wilker mandou seguir com a implementação. Os 55 QR de contagem estão em `06_MATERIAIS_PDV/09_QR_CODES/00_USAR_ESTES`. A migration `20261121_qr_leituras` foi **aplicada** no Supabase em 30/10; `api/q.js`, `src/edicao/qrPontos.js`, o rewrite e `npm run test:qr` (15 testes) estão commitados em `dev/site-completo`. **Nada publicado:** `/q/…` ainda dá 404 em produção até a Fase 1b (merge em `master`, só com autorização escrita). O Wilker já pediu ao cliente que o Bitly dele aponte para `/q/mapa-bitly`. Faltam D3 (placa por casa, adesivo, voucher) e a Fase 2 (painel).
**Pedido:** o cliente quer saber quantas vezes cada QR foi lido e de que peça veio (display, placa…). Wilker: "esses dados a gente pode criar no painel".
Marcas como no [README](README.md): **[Fato]** · **[Proposta]** · **[Decisão]**.

## 12.1 Onde estamos

- **[Fato]** O QR impresso é link direto para a página final, com `utm_source=qr&utm_medium=impresso&utm_campaign=cartoon` (`scripts/qr-edicao.mjs`).
- **[Fato]** Quem conta hoje é o Google Analytics (`src/lib/analytics.js`): só visitas com o Analytics carregado e sem recusa de cookies. Todo QR do mesmo tipo leva a mesma etiqueta, então ele **não distingue a peça física**. Nada é gravado no nosso banco.
- **[Fato]** Não existe tabela, função ou tela de leituras de QR (busca em `src/`, `painel-app/`, `supabase/`, 30/10/2026).
- **[Fato]** O QR do cliente (`bit.ly/3W9WRUc?r=qr`) redireciona 301 para `/cartoon/mapa`, sem etiqueta. A contagem dele fica no Bitly.
- **[Fato]** Banco, 30/10/2026: 27 casas ativas com slug na 2026.2 (mais Docinhos da Lalá, encerrada, fora da edição) e 41 unidades participando (7 casas têm 2 ou mais, máximo 5). Festival: 05 a 15/11/2026.
- **[Fato]** Painel: o grupo "Operação" (Pedidos, Fotos, Materiais) e o grupo "Edição" (… Avaliações) ficam em `painel-app/src/components/Modulos.jsx`. `dado.ler` está em todas as funções menos Social; `relatorio.ler` só no administrador; `producao.gerir` no administrador e na produção. A tabela `materiais` (vazia) já registra peças entregues por unidade.

## 12.2 A ideia

**[Proposta]** QR "dinâmico" nosso. O QR impresso aponta para um endereço curto do próprio site, `https://www.sweetcoffeeweek.com.br/q/<código>`, e **cada peça física tem um código**. Quando alguém lê:

1. O celular abre `/q/d1-boldfood`.
2. Uma função da Vercel soma 1 no contador daquela peça e, na mesma hora, manda a pessoa para a página certa (`/cartoon/participantes/boldfood?utm_…&utm_content=d1-boldfood`). A pessoa nem percebe.
3. O painel lê o contador.

Ganhos sobre "só Analytics": conta todo mundo (inclusive quem recusou cookies); sabe qual peça foi lida; grava no nosso banco; permite trocar o destino depois de impresso; e o endereço curto deixa o QR com menos quadradinhos, que lê melhor em peça pequena como o display de 12×38 cm. O Analytics continua somando por cima (`utm_content` já é guardado por `analytics.js`).

## 12.3 Os códigos

| Peça | Código | Vai para | Quantidade |
|---|---|---|---|
| Display de mesa · face 1 (combo) | `d1-<slug>` | página da casa | 27 (ou 41 por unidade) |
| Display de mesa · face 2 (avaliar) | `d2-<slug>` | `/cartoon/avaliar` | 27 (ou 41), ou 1 único |
| Placa de sinalização | `pl-…` | `/cartoon` | a definir |
| Mapa (QR do cliente, opcional) | `mapa-bitly` | `/cartoon/mapa` | 1 |
| Teste | `teste` | `/cartoon` | 1, não entra na soma |

**[Proposta]** Regras: minúsculo e sem acento; **nunca mudar um código depois de impresso**; o destino pode mudar sem reimprimir; código desconhecido ou pausado vai para `/cartoon`, nunca para um erro.

## 12.4 O que é gravado

**[Proposta]** Um contador por hora, não um registro por pessoa. Cada linha: código · hora cheia (fuso de Natal) · país, região e cidade (cabeçalhos que a Vercel já manda) · aparelho (iPhone, Android, outro) · robô sim ou não · número de leituras. Sem IP, sem cookie, sem identificar ninguém. O tamanho é limitado (peças × horas × cidades): acesso repetido não enche o banco.

Limites que devem ir para o cliente:
- conta **leituras**, não pessoas (quem lê duas vezes conta duas);
- a cidade vem do IP e erra (rede de celular às vezes cai em outra cidade); **o lugar de verdade é a peça** (o display da casa X);
- robôs de pré-visualização (WhatsApp, Facebook, Slack…) ficam separados;
- leituras antes de 05/11 (testes) ficam fora da soma por padrão (filtro por data, nada é apagado).

## 12.5 Banco

**[Proposta]** Migration nova `supabase/migrations/20261121_qr_leituras.sql`, escrita e **só aplicada com ok explícito do Wilker**:
- `qr_pontos`: código, tipo, rótulo, participação e unidade (opcionais), destino manual (opcional), ativo.
- `qr_leituras_hora`: chave (código, hora, país, região, cidade, aparelho, robô) e a coluna `leituras`.
- RPC pública `registrar_leitura_qr(...)`: só aceita código existente e ativo, soma +1 (upsert) e devolve só o destino **manual** do ponto (ou null). O destino padrão sai da regra do código em `src/edicao/qrPontos.js`, uma fonte só, lida por `api/q.js` e pelo gerador de QR. Trava de 25 combinações de lugar por peça e hora: o excedente cai em "sem lugar", então chamada direta com a chave pública não enche a tabela.
- RPCs do painel: `get_qr_resumo(...)` (permissão `dado.ler`) e `qr_ponto_salvar(...)` (permissão `producao.gerir`).
- RLS ligada, tabelas fechadas, acesso só pelas RPCs (padrão do projeto).
- Semente: um ponto `d1` e um `d2` por casa ativa, lidos de `participacoes`.

## 12.6 Redirecionador

**[Proposta]** `api/q.js` (função de borda da Vercel) e uma regra em `vercel.json` (`/q/:codigo` para `/api/q`).
- Lê o código, chama a RPC com limite de 1 segundo e responde 302.
- **Nunca quebra:** banco fora, lento ou código estranho: redireciona do mesmo jeito, pela regra do próprio código (`d1-x` vai para a página de x; o resto vai para `/cartoon`).
- Robôs e requisições HEAD não contam como pessoa.
- Testes: `npm run test:qr` (regra de destino, aparelho, robô, fallback) e um script que bate nos códigos todos no preview e confere 302 e destino.
- **[Proposta, confirmar no preview]** Os cabeçalhos `x-vercel-ip-country`, `-country-region` e `-city`; se algum não vier, a coluna fica vazia e o resto funciona.

## 12.7 Painel: Operação › QR Codes

**[Proposta]**
- Cartões: leituras no período, hoje, por tipo de peça (face 1, face 2, placa).
- Tabela por peça e casa: rótulo, leituras, última leitura; ordenável, com busca por casa.
- Por dia e por hora; cidade; aparelho.
- Período padrão "desde a abertura (05/11)", com opção de incluir testes.
- Cadastrar ponto novo (adesivo, voucher, outra placa) e pausar ponto.
- Exportar CSV para o cliente.
- Arquivos: `painel-app/src/components/vistas/QrCodes.jsx` (novo) e uma aba em `Modulos.jsx`.

## 12.8 Ordem e prazo (festival abre em 05/11)

| Fase | O quê | Quando | Depende de |
|---|---|---|---|
| 0 | Decisões D1 a D3; regerar todos os QR como `/q/<código>`; entregar os PNG | ✅ feito em 30/10 para display (faces 1 e 2) e placa geral; falta D3 (placa por casa, adesivo, voucher) | Wilker |
| 1 | Migration, `api/q.js`, rewrite, testes; conferir no celular | ✅ feito em 30/10: migration aplicada, 15 testes e teste ao vivo contra o banco real; falta conferir no celular depois de publicar | — |
| 1b | Publicar em produção (merge em `master`) | **o quanto antes: o Bitly do cliente já aponta para `/q/mapa-bitly`** | **autorização escrita do Wilker (A2)** |
| 2 | Aba no painel e CSV | até 05/11, ou durante o festival (os números já estão sendo gravados) | Fase 1 |
| 3 | Opcional: números por marca na área da marca; leituras que viram avaliações; editar destino pelo painel | depois | — |

⚠️ Se a Fase 1b não estiver em produção quando a primeira peça for lida, `/q/…` dá 404. O merge precisa estar no calendário.

## 12.9 Decisões

- **[Decisão] D1 · Granularidade. ✅ Decidido em 30/10: por casa.** Por casa (27 códigos por face) ou por unidade (41)? Recomendação: por casa, um arquivo de impressão por casa, como o display já é. Por unidade só se o cliente exigir "qual loja da rede". O código aceita crescer (`d1-boldfood-2`) sem refazer nada.
- **[Decisão] D2 · Face 2 (avaliar). ✅ Decidido em 30/10: QR por casa.** QR por casa (`d2-<slug>`) ou um só? Recomendação: por casa, para saber qual casa gera mais avaliações. Custo: a face 2 deixa de ser arte única e sai em 27 arquivos (por script).
- **[Decisão] D3 · Outras peças com QR.** A placa de sinalização é uma geral ou uma por casa/local? Adesivo e voucher levam QR?
- **[Decisão] D4 · Operação. Migration ✅ aplicada em 30/10 (o Wilker mandou seguir). Merge em `master`: pendente de autorização escrita.** Ok para aplicar a migration no Supabase e para o merge em `master` antes de 05/11 (A2).
- **[Decisão] D5 · Bitly do cliente. ✅ Decidido em 30/10: o QR do cliente fica na peça e o Wilker já pediu a troca do destino.** Pedir que ele mude o destino do Bitly para `/q/mapa-bitly`: o QR impresso não muda e a leitura aparece nos dois lugares.

## 12.10 Riscos e cuidados

- Privacidade: `/privacidade` ganha um parágrafo ("contamos leituras de QR de forma agregada, sem dados pessoais"). O texto é decisão do Wilker e da F2.
- A Cartoon ainda não é pública (`CARTOON_PUBLICA = false`): até a publicação o destino abre o site comum; a leitura é contada do mesmo jeito.
- A prévia da Vercel pode exigir login; o teste final é no domínio oficial com o código `teste`.
- **Ainda não visto na Vercel:** o rewrite `/q/:codigo` → `/api/q?c=:codigo` e os cabeçalhos `x-vercel-ip-*` só se confirmam num deploy. A função lê `?c=`, `?codigo=` ou o último pedaço do caminho e, se nada vier, cai na entrada da edição.
- **Teste no banco real (30/10):** a função e a chave pública foram testadas de ponta a ponta (contagem, robô, trava de lugares, destino manual, pausa, tabelas fechadas). Ficaram **27 linhas de teste** em `qr_leituras_hora` (ponto `teste` e uma leitura de `d2-wow-cookies`, todas de 30/10). A limpeza (DELETE) foi **recusada** pelo sistema de permissão e não foi refeita. Não atrapalha: o painel soma só a partir de 05/11 e `teste` não entra na soma. Para apagar, com o ok do Wilker: `delete from public.qr_leituras_hora where codigo in ('teste', 'd2-wow-cookies');`
- O Security Advisor avisa que a função é executável por `anon` e `authenticated`: é o esperado (a chave pública precisa chamá-la), igual às outras RPCs públicas. `authenticated` poderia sair se o aviso incomodar.
- Os QR antigos (URL longa com `utm`, em `09_QR_CODES/participantes/` e `cartoon-*.png`) **não contam leitura por peça** e não podem ir para a gráfica. Ficaram onde estavam, sem mexer, para não quebrar vínculo nos arquivos do Illustrator; mover para `_substituidos` quando o Wilker terminar de trocar. `cartoon-premiacao.png` e `cartoon-mapa.png` ainda não têm código novo (não estavam no conjunto aprovado).

## 12.11 Arquivos (§3.5: listar antes de editar)

- Novos: `api/q.js` · `supabase/migrations/20261121_qr_leituras.sql` · `painel-app/src/components/vistas/QrCodes.jsx` · `tests/qr-leituras.test.mjs` · modo `--por-peca` no gerador de QR (`scripts/qr-edicao.mjs`, **feito em 30/10**); na Fase 1 a regra código → destino sai do script para um módulo só, usado também por `api/q.js` (uma fonte de verdade, §5.1).
- Editados: `vercel.json` (1 regra) · `painel-app/src/components/Modulos.jsx` (1 aba) · `package.json` (script `test:qr`) · texto de `/privacidade` · índice do README.
