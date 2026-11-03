# 13 · Lista viva — preparar o site da Cartoon para publicar

Aberta em 03/11/2026. Cada pedido do Wilker entra aqui **reescrito como tarefa** (a fala
original vai entre aspas, resumida). Nada sai da lista sem estar feito e conferido, ou
sem decisão dele por escrito. Publicar continua sendo decisão dele (A2/A3): esta lista
prepara, não publica.

Estado: `[ ]` a fazer · `[~]` em andamento · `[x]` feito · `[?]` aguarda decisão.

## Pedido-mãe (03/11)

> "Preparar o site para publicar… examinar tudo que a gente fez… reconstruir o que
> precisa para tudo funcionar em ordem, visualmente elegante, bonito, animado,
> organizado, fácil de mexer… reconstrua elementos, não só adapte… criar o formulário
> de avaliação, referência o da edição passada."

**Reescrito:** auditar a camada `/cartoon` inteira (páginas, componentes, CSS, dados,
testes, bloqueios de publicação); reconstruir — não remendar — as peças que estiverem
frágeis ou espalhadas, com um sistema de componentes pequeno e claro; padronizar o
movimento; e construir o formulário de avaliação do público da Cartoon a partir do da
Lovers (2026.1), adaptado ao modelo de dados e às regras desta edição.

## Decisões do Wilker
- **03/11 · Prazo:** "Tudo antes de publicar". Reconstruir todas as páginas, a avaliação
  e o sistema antes de abrir o site, mesmo que a abertura passe do dia 05/11.
- **03/11 · Fotos para produção (B2):** "Pelo banco". Script sobe as fotos aprovadas ao
  Storage e registra cada uma como mídia aprovada da casa; nunca no repositório público.
  Escrita no banco só com ok do Wilker na hora.
- **03/11 · Push:** "Pode enviar". Push só de `dev/site-completo` (preview da Vercel), a
  cada etapa concluída; `master` e produção intocados.
- **03/11 · Combos já divulgados** ao público: cenários com o combo e fotos não são mais
  sigilo (o caminho pelo banco vale por ser o painel a fonte, não por segredo).

## Itens

### Mapa
- [ ] **M1 · Pin = logo desenhada colorida da casa.** "No mapa é melhor colocar nos pins
  o logo do participante… no estilo que a gente fez, desenhado, o colorido." → O pin de
  cada casa passa a ser a **logo desenhada colorida** dela (a versão `cor` da
  `logo_desenhada`), dentro de uma moldura de pin comum a todas (gota/selo com ponta),
  em vez do objeto do tema. Os sinais de estado ficam: anel tracejado (aproximado), selo
  de quero ir / já fui, destaque da selecionada. Os 27 pins de tema saem do mapa (podem
  servir de enfeite em outro lugar, se fizer sentido). As logos desenhadas precisam
  chegar à produção (ver B7).
- [ ] **M2 · Página do mapa mais útil.** "Ver como melhorar a página toda do mapa e como
  ele pode ficar mais útil." → Repensar a página inteira: o que a pessoa quer fazer ali
  (achar a casa mais perto, ver o que está aberto agora, montar a rota, abrir no
  Google Maps/Waze, filtrar por bairro, modo de atendimento e restrição). Proposta no
  plano antes de construir.

### Dados
- [x] **D1 · Renovar o retrato do painel.** "Veja todos os dados atualizados no painel,
  descrição dos combos e todas as outras informações." → Ler o banco de novo
  (`retrato-local.sql`), regravar o retrato, refazer coordenadas, logos desenhadas e
  fotos aprovadas, e listar o que mudou desde 28/10 casa por casa.
  **Feito 03/11 00:25:** 27 casas; 22 mudaram desde 28/10 (descrições de combo e de
  itens, nomes de combo/itens, restrições alimentares, trocas, dias e horários, modos de
  atendimento, endereços, WhatsApp). 27 com foto aprovada e logo desenhada; 15 de 40
  unidades com coordenada (25 seguem sem: só rua / não achou). `test:cartoon` 57/57.
- [ ] **D2 · Lacunas que o painel ainda tem** (vêm do painel, o site não inventa):
  Caroli Douces sem descrição do combo e com o salgado sem nome; 3 itens sem restrições
  informadas; Adocee e Bolomania escrevem "DOCE:", "SALGADO:", "BEBIDA:" no início da
  descrição do item (redundante com a etiqueta); fase do banco ainda `preparacao`;
  janela da avaliação não definida.

### Página da casa
- [ ] **P1 · Faixa de cenário fixa acompanha a página.** "Essa imagem não é para ficar
  assim, deve crescer junto com a página… fixa bem mais para baixo." → A faixa com o
  combo no mundo do tema ocupa a **largura inteira da tela em qualquer tamanho**
  (escala proporcional, sem caixa centrada nem teto de altura que a deixe pequena no
  desktop) e fica **presa no pé da tela**, mais baixa que hoje (no celular, logo acima
  da barra de abas), cobrindo o mínimo do conteúdo.
- [ ] **P2 · Ícones de leitura nos cards do combo.** "Coloque ícones no doce, salgado,
  bebida… e nesses tópicos… não precisam ser desenhados como os outros… só contorno,
  para não poluir." → Cada etiqueta de tipo (Doce, Salgado, Bebida) e cada tópico do
  card (Restrições alimentares, Contém, Pode conter, Não contém, aviso da casa) ganha um
  **ícone de contorno** do sistema de ícones do site (traço simples, `currentColor`,
  20px), não ilustração. Mesmo ícone para o mesmo assunto em todas as páginas (catálogo,
  ficha da casa, resumo de restrições). Ícone que faltar no sistema é desenhado em
  `icones/` no padrão da grade, nunca SVG solto.
- [ ] **P3 · Galeria por item (variações e detalhe).** "Adicione as fotos de variação…
  às vezes tem outra bebida, outro doce, faça como uma galeria… detalhe de doce partido,
  salgado partido." → No card de cada item (Doce, Salgado, Bebida) a foto vira uma
  **galeria do próprio item**: foto principal + detalhe partido (`doce-cortado`,
  `salgado-cortado`) + outras opções (`doce2`, `bebida2`, `bebida3`…), com miniaturas ou
  pontos, troca por toque/arraste/teclado e ampliação. Hoje essas fotos estão juntas
  numa galeria do combo; passam a ser agrupadas **por item** (`fotos-combo.py` grava
  `itens[].fotos` e o modelo público prevê o mesmo campo). Rótulo de cada foto: "Detalhe"
  ou "Outra opção". Opção de troca que tiver nome no painel (`substituicoes`) leva o nome.

### Navegação
- [ ] **N1 · Avaliar + Premiação numa página só.** "Não precisa ter essas duas páginas,
  podem ser uma única." → Um item no menu (nome a decidir, ex.: "Sweet Awards" ou
  "Avaliar") com uma página que muda com a fase: **durante o festival** mostra como
  funciona a premiação (categorias, quem avalia) + o formulário de avaliação; **depois
  de 15/11** mostra os resultados no lugar do formulário. Os endereços
  `/cartoon/avaliar` e `/cartoon/premiacao` continuam funcionando (QR impresso aponta
  para `avaliar`) e levam à mesma página, cada um na sua seção.

### Avaliação
- [ ] **A1 · Formulário de avaliação do público.** Base: formulário da Lovers 2026.1
  (histórico do git). Adaptar às casas, combos e itens da Cartoon.
  Levantamento (03/11):
  - Lovers: `510b0b77^:src/pages/lovers/Votar.jsx`, 4 passos (regras → dados → 7 notas
    de 5 a 10 → 3 perguntas abertas), 1 voto por e-mail/telefone por casa, sem captcha;
    textos e critérios em `src/data/_arquivo/sweetAwards.js:17-67`.
  - Cartoon hoje: `Avaliar.jsx` em tela única, critérios do banco (`edicao_criterios`),
    nome + e-mail, Turnstile, gravação por `enviar-formulario` → `submit_avaliacao`.
  - Furos: sucesso falso quando o robô é barrado; perguntas e ajuda de cada critério não
    aparecem; sem limite de envios; apuração só faz média (sem top 3, desempate, mínimo);
    D-05/D-06 provisórias; janela e interruptor a ligar no painel (05/11).

### Auditoria e reconstrução
- [x] **R1 · Auditoria completa da camada `/cartoon`** (03/11). Achados abaixo.

### Bloqueios de publicação (achados da auditoria, por gravidade)
- [ ] **B1 · Banco em `preparacao`.** Em produção o site mostra "será revelado em breve"
  em tudo. Virar `em_andamento` e ligar participantes/combos é ação no painel, decisão
  do Wilker.
- [ ] **B2 · Fotos dos combos só existem no retrato local.** Em produção vêm de
  `midias_participacao` aprovadas (bucket `edicao-publico`); hoje não há nenhuma lá → todo
  card mostra "Foto em produção". ⚠️ O repositório é público: versionar as fotos no git
  vazaria os combos antes da revelação. Caminho certo: subir pelo banco/Storage.
- [ ] **B3 · `dev/site-completo` está 11 commits atrás de `master`** (trocas completas,
  `20261123_trocas_completas`, mexem em `Participante.jsx`/`textos.js`). Publicar daqui
  regride a ficha. Trazer `master` para cá antes de reconstruir a ficha.
- [ ] **B4 · 73 commits só locais** (sem push). Risco de perda; o preview da Vercel não
  os vê.
- [ ] **B5 · Teste de navegador só roda com dados de demonstração** → formato real da
  RPC pode quebrar sem o teste acusar. Incluir uma rodada com o retrato real.
- [ ] **B6 · Mapa: 13 de 41 unidades com coordenada verificada** (só essas vão a
  público). Conferir as demais no painel ou aceitar ponto aproximado.
- [ ] **B7 · Logos desenhadas não estão na projeção pública** → em produção cai na logo
  oficial. Decidir: versionar (são arte derivada, não sigilosa) ou levar ao banco.
- [ ] **B8 · O painel importa a ficha da casa e o CSS da edição** (`PreviaPublica.jsx`)
  → reconstruir a ficha mexe na prévia do painel; testar os dois.
- [ ] **B9 · Pendências visuais:** imagem de compartilhamento (og) da Cartoon, nome da
  página Mapa, olhinhos "em pausa" ainda ativos (piscada em laço sem pausa), Premiação
  vazia antes dos resultados, "Sobre o festival" é só link.
- [ ] **B10 · Código a arrumar:** `Participante.jsx` (431 linhas) e `modelo.js` (430)
  grandes demais; filtro↔URL duplicado em Catálogo e Mapa; avisos repetidos em 5
  páginas; `textos.js` com frases repetidas.
