# Inventário da iconografia — antes da v3 (14/10/2026)

Levantamento feito antes da migração. Fora de escopo (vistos e excluídos): logos
(selo SCW, lockup creme, F2 Experience, símbolo F2, selo 10 anos, Lovers), fotos,
QR codes e ilustrações de campanha.

## Origens que existiam

| Origem | O que era | Problema | Destino |
|---|---|---|---|
| `scw-icons-v2.js` (site) | 136 desenhos, grade 32, traço 3.2 fixo, exportados do Claude Design | fonte não editável aqui; traço único engrossava em 16px e afinava em 48; ~70% sem uso; título concatenado em HTML (`dangerouslySetInnerHTML`) | aposentado (sem importador); significados usados → `icones/` |
| `painel-app/.../Icone.jsx` | ~75 desenhos próprios (grades 24 e 32) + nomes do v2 | segundo desenho para as mesmas ações; `contatos` era coração; `engrenagem` lia como sol; `pedidos` era o triângulo de alerta | adaptador do registro único |
| `scw-icons/anatomia-combo.js` | 12 desenhos soltos da Home 02 | coxinha como gota/chama, salgado como "dois círculos", bebida como coador | lista de nomes da família expressiva |
| `components/icons.jsx` (`I`) | 27 desenhos, grades 16/18/24, traço 1.2–1.6 | 25 sem uso; 2 em uso (som) com traço de outro sistema | adaptador |
| `pages/edicoes/icones.jsx` | 4 glifos (16) | `Chevron` e `Mais` sem uso; desenho próprio de voltar/fechar | adaptador |
| `components/Seta.jsx` | seta 16, traço 1.6 | terceira seta do site | adaptador (`seta-direita`) |
| SVG solto em tela | 21 arquivos | cópia byte a byte (seta ×3, chevron ×3 desenhos, prancheta ×2, sacola ×2, pessoas ×2) | registro |
| Glifo de texto | `‹ › → ✓ ✕ ! ↺ ◔` em 13 pontos do painel e diálogo | não escala, não alinha, peso de fonte em vez de traço | registro / `--icone-*` |
| CSS | 9 `content:` com glifo + 2 setas de `select` em data URI | idem; duas setas diferentes | `gerado/icones.css` |
| CSS de tamanho | 17 regras forçando `svg{width}` (14, 18, 22, 23, 26, 30px, 58%) | tamanho fora da escala, desenho deformado do traço previsto | removidas; tamanho = atributo |
| Página estática | 7 SVG copiados à mão em `quero-participar` | cópia da v2; "Copiar link" com a seta de link externo | regiões geradas |

## Significados encontrados (nome antigo → canônico)

| Nome(s) antigo(s) | Significado | Onde | Tamanho de uso | Problema | v3 |
|---|---|---|---|---|---|
| `ui/seta-direita`, `Seta`, `I.arrow`, SVG em AccessDialog e MobileMenu | ir para | ~40 botões e links | 14–20 | 4 desenhos | `seta-direita` |
| `ui/seta-esquerda`, `SetaVolta` | anterior / voltar à coleção | Edições, galeria, EmBreve | 14–20 | 2 desenhos | `seta-esquerda` |
| SVG do BotaoTopo | voltar ao topo | todas as páginas | 18 | solto | `seta-cima` |
| `voltar`, `I.chevronLeft`, `‹` | voltar | ficha, mensagens, logins | 16 | glifo de texto | `voltar` |
| `ir`, `›` | abrir item | painel (folha, resumo, módulo) | 16 | glifo | `avancar` |
| `ui/abrir`, chevron do acordeão ×3 | abrir/recolher | FAQ, Awards, cadastro, pedidos | 15–20 | 3 desenhos | `abrir` / `recolher` |
| `ui/fechar`, `fechar`, `Xis`, X do menu e das preferências | fechar | 6 pontos | 16–20 | 4 desenhos | `fechar` |
| `ui/menu` | menu | — | — | — | `menu` |
| três pontos da aba, `grade`, `mais-acoes` | mais | abas do site e do painel, menu de ações | 16–26 | dois desenhos para "mais" | `mais-acoes` |
| casa da aba, `inicio`, `I.home` | início | abas, painel da marca | 24–26 | 3 desenhos | `inicio` |
| calendário da aba, `edicao` | edições / a edição | abas, painel | 24–26 | 2 desenhos | `edicao` |
| troféu da aba, `premios/trofeu` | premiação | abas, Awards, trajetória | 24–26 | 2 desenhos | `trofeu` |
| caixa com + da aba, toldo, sacola, `mecanica/loja`, `simbolos/estabelecimento` | participante / casa | abas, diálogo, painel, Home, Contato | 20–26 | 4 desenhos para a mesma ideia | `loja` |
| prancheta (diálogo), duas pessoas (painel) | sou da organização | diálogo do site, boas-vindas do painel | 21–24 | duas metáforas para a mesma porta | `operacao` |
| `ui/link-externo`, seta diagonal | abre fora | diálogo | 15 | solto | `link-externo` |
| `ChaveIcon`, `chave` | Painel SCW / acesso | topo, folha, ficha | 18–24 | 2 desenhos | `chave` |
| `mais`, `ui/mais`, `Mais` | adicionar | painel, FAQ | 16 | 3 desenhos | `mais` |
| `editar`, `campo` | editar / preencher campo | painel | 16–20 | — | `editar` |
| `copiar` | copiar | acessos | 20 | — | `copiar` |
| `enviar`, `etapa-contatadas` | enviar | painel | 20 | 2 desenhos | `enviar` |
| `baixar`, `arquivo`, `downloads`, SVG do guia de fotos | baixar | arquivos, guia | 16–20 | 3 desenhos | `baixar` |
| `atualizar`, `correcao`/`alteracao` | atualizar / alteração pedida | painel | 20 | **mesmo desenho para ação e estado** | `atualizar` · estado → `editar` |
| `restaurar`, `historico` | restaurar / histórico | painel | 16–24 | — | `restaurar` · `historico` |
| `arquivar`, `lixeira` | arquivar / excluir | painel | 16–20 | — | `arquivar` · `excluir` |
| `ui/play`, `ui/pausa` | pausar fotos | heróis | 20 | — | `play` · `pausa` |
| `I.sound`, `I.soundOff` | som do depoimento | Participar | 14 | fora da escala | `som` · `som-desligado` |
| `ui/busca`, `etapa-analise` | buscar / em análise | Contato, mesa | 20 | — | `busca` |
| `formulario`, `etapa-novas`, `mecanica/inscricao`, `mecanica/regulamento` | documento | painel, Participar | 20–24 | 3 desenhos | `documento` (privacidade → `cadeado`) |
| `cadastro` | ficha cadastral | painel | 24–32 | — | `ficha` |
| `pasta`, `arquivos` | arquivos | painel | 24 | — | `pasta` |
| `imagem`, `logo` | imagem / logo | painel | 24 | — | `imagem` |
| `fotos`, `guia` | fotos | painel | 24 | — | `camera` |
| `relogio`, `andamento`, `ui/horario` | horário / em andamento | painel, Participar | 16–20 | — | `horario` |
| `local`, `unidades`, `bloco-local` | endereço | painel | 24 | — | `local` |
| `mapa/trajeto`, `topicos/circulacao` | trajeto pela cidade | Participar | 20 | — | `trajeto` |
| `conta`, `redes/perfil`, `I.user` | conta | painel | 20–24 | 3 desenhos | `conta` |
| `participantes`, `pessoas`, `mecanica/publico`, `topicos/quem-vive` | pessoas | painel, Apoiar | 24 | 2 desenhos | `pessoas` |
| `admin` | equipe e permissões | painel | 24 | pessoa + engrenagem ilegível | `equipe` |
| `contatos` | contatos | painel | 24 | **era um coração** | `contatos` (cartão) |
| `cadeado`, `I.lock` | protegido | — | 14 | — | `cadeado` |
| `sair` | sair | painel | 20–24 | desenho sem porta | `sair` |
| `mensagem`, `redes/conversa`, `topicos/mensagem` | mensagem / WhatsApp | painel, Contato, static | 16–24 | 2 desenhos | `mensagem` |
| `mensagens`, `respostas` | mensagens | painel | 20–24 | — | `mensagens` |
| `topicos/depoimento` | depoimento | Participar | 20 | — | `depoimento` |
| `redes/e-mail` | e-mail | static, painel | 24 | — | `email` |
| `redes/celular` | celular | — | — | — | `celular` |
| `sino` | notificações | painel | 20 | — | `sino` |
| `redes/instagram`, `I.ig`, SVG do rodapé | Instagram | Home, Contato, rodapé, Aguarde | 18–24 | 3 desenhos | `instagram` (marca) |
| `ok-circulo`, `aprovado`, `aviso/sucesso`, ✓ do Proposta | sucesso | painel, Apoiar | 16–26 | — | `sucesso` / `feito` |
| `feito`, `ui/feito`, `✓` | feito | painel, Contato, CSS | 16–24 | glifo | `feito` |
| `informacao`, `aviso/informacao` | informação | painel | 20 | — | `informacao` |
| `atencao`, `atencao-circulo`, `pendencia`, `!` | atenção | painel, CSS | 16–24 | glifo | `atencao` / `exclamacao` |
| `pedido`, `alerta-triangulo`, `aviso/alerta`, `pedidos` | aviso / pedido da organização | Contato, painel | 20–32 | **pedido = alerta** | `alerta` · `pedido` |
| `aviso/erro` | erro | Contato | 16 | — | `erro` |
| `pendente`, `circulo` | pendente / neutro | etapas, selo | 16 | **círculo vazio servia aos dois** | `pendente` · `neutro` |
| — | carregando | botões ocupados | — | não existia | `carregando` |
| `etapa-completas` | cadastro completo | mesa | 20 | — | `concluido` |
| `combo`, `combos/*`, `simbolos/combo-oficial`, `bloco-itens` | combo | Home, Participar, Awards, painel | 16–32 | 6 nomes | `combo` |
| `item-doce`, `doces/*` | doce | mesa, Awards, EmBreve | 16–48 | — | `cupcake` (+ expressivos) |
| `item-salgado`, `salgados/*` | salgado | mesa, Awards, EmBreve | 16–48 | "dois círculos" | `coxinha` (+ expressivos) |
| `item-bebida`, `bebidas/*` | bebida | mesa, Awards, EmBreve | 16–48 | coador | `xicara` (+ expressivos) |
| `preco`, `bloco-preco` | preço | painel | 24 | — | `preco` |
| `tema`, `bloco-tema`, `topicos/tema-da-edicao` | tema / ideia | painel, Participar, Awards | 24 | — | `tema` |
| `visao`, `resumo` | visão geral | painel | 24 | — | `visao` |
| `operacao` | operação | painel | 24 | — | `operacao` |
| `engrenagem`, `config` | configurações | painel | 24 | **lia como sol** | `configuracoes` |
| `mecanica/voucher` | voucher | painel | 24 | — | `voucher` |
| `comercial/midia-kit`, `topicos/imprensa` | imprensa / press kit | painel, Home | 20–24 | 2 desenhos | `imprensa` |
| `marca/estrela`, `simbolos/destaque` | destaque | Awards, Home, Participar | 20–24 | criatividade = apresentação | `estrela` (criatividade → `tema`) |
| `simbolos/sweet-lovers`, `marca/coracao` | Sweet Lovers | Home, EmBreve | 20–32 | — | `coracao` |
| `premios/medalha` | medalha | Awards | 20–24 | — | `medalha` |
| `premios/voto`, `simbolos/avaliacao-do-publico`, `mecanica/avaliar` | avaliação do público | Awards, Home | 20–24 | 3 nomes | `avaliacao` |
| `premios/curadoria` | júri técnico | Awards | 24 | — | `curadoria` |
| `topicos/ciclo` | ciclo da edição | Home | 20 | — | `ciclo` |
| `simbolos/descobrir` | visibilidade | Apoiar | 20 | — | `descobrir` |
| `topicos/proposta`, `comercial/patrocinador` | apoio | Apoiar, Contato | 20–24 | — | `apoio` |
| `topicos/alcance` | alcance | Apoiar | 20–24 | — | `alcance` |
| `mecanica/promocao` | movimento financeiro | Participar, Apoiar, EmBreve | 24–32 | era "promoção" | `moedas` |
| `mecanica/publico` (categoria) | atendimento | Awards | 24 | pessoas genérico | `atendimento` |
| `mecanica/entrega` | problema com pedido (cliente) | Contato | 24 | — | `compra` |
| `topicos/duvidas` | dúvidas | Contato | 20 | — | `duvida` |
| `simbolos/memoria`, `topicos/legado` | história | Awards, Home, EmBreve | 20–32 | — | `historico` |
| `ui/calendario` | datas | Participar, static | 24–32 | — | `calendario` |
| `simbolos/edicao` | edições realizadas | Participar, static, EmBreve | 24–32 | — | `edicao` |

Contagem final: 89 de interface · 18 expressivos · 1 marca · 151 aliases.
