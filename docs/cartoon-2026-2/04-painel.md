# 4 · Painel: cadastro da marca e revisão da organização

## 4.1 Princípios

- **Estender `Cadastro.jsx` e os blocos atuais, não criar um segundo formulário.** O salvamento automático, a fila de gravação, as correções por campo e o envio por `marca_concluir_cadastro` já funcionam [Fato, seção 1.2].
- **Um sistema de estados só.** O dicionário continua em `painel-app/src/lib/status.js`, conferido contra o banco pelo teste `painel-app-status`.
- A marca **nunca publica.** Ela envia para revisão. A publicação é uma RPC com `curadoria.decidir`, que a conta da marca não tem.

## 4.2 Fluxo progressivo da marca

Os blocos viram etapas com progresso próprio. A ordem segue o pedido; a numeração do banco (`correcoes_campo.bloco`, hoje 0–4) é estendida.

| Etapa | Bloco | Conteúdo | Novo em relação a hoje |
|---|---|---|---|
| 1 · Dados da marca | 0 | logo, apresentação pública, Instagram, site; contato e CNPJ (privados, marcados "não aparece no site") | `apresentacao_publica` |
| 2 · Unidades participantes | 4 | escolher unidades já cadastradas ou criar; marcar quais participam; endereço estruturado; WhatsApp da loja (preenchido = vai ao site; sem caixa de autorização desde 23/10/2026) | `unidades` permanentes, `participa`, endereço estruturado, WhatsApp por unidade |
| 3 · Combo | 1 + 3 | tema e justificativa (já existe); nome, descrição e condições do combo; preço oficial em leitura | nome e descrição saem de `participantes` e vão para `participacoes`; `combo_condicoes` |
| 4 · Doce, salgado e bebida | 2 | por componente: nome, descrição, ingredientes | igual |
| 5 · Informações alimentares e substituições | 5 (novo) | por componente: a lista de alergênicos e características (3.4); substituições estruturadas (3.5) | tudo novo |
| 6 · Atendimento, retirada e delivery | 6 (novo) | por unidade: consumo no local, retirada, delivery do combo (sim / não / não informado), canais, regiões, taxa, diferença da unidade; horário **do combo** por dia do festival | tudo novo; os custos (embalagem, delivery) continuam aqui, marcados "uso interno" |
| 7 · Fotos | 7 (novo) | foto da loja (opcional); fotos oficiais chegam da sessão; envio próprio se D-08 permitir | `midias_participacao` |
| 8 · Prévia pública | — | a página como ficará no site, montada pelo mesmo `montar_publico` da publicação | novo |
| 9 · Envio para revisão | — | resumo do que falta, botão "Enviar para revisão" | estende o envio atual |

### Requisitos e como atendê-los

| Requisito | Solução |
|---|---|
| Salvar rascunho e retomar | o salvamento automático atual (900 ms, só colunas alteradas) cobre as tabelas novas. Tabelas filhas (declarações, substituições, disponibilidade) gravam por linha, com a mesma fila |
| Progresso por conteúdo necessário | `campos_cadastro` passa a contar por etapa, separando "obrigatório para enviar" (E) de "obrigatório para publicar" (P). A barra mostra "Faltam 3 itens para enviar" e não uma porcentagem genérica |
| Explicar sem excesso | uma linha de ajuda por campo, só onde há ambiguidade (ex.: "Se for diferente do horário normal da loja, vale o do festival"). Textos no arquivo de conteúdo do painel |
| Validar junto ao campo | já existe (`guia.js`); as regras novas entram no mesmo lugar e espelham o `check` do banco |
| Evitar perda de dados | descarga ao esconder a página e ao sair (já existe); aviso ao fechar com gravação pendente; nenhuma etapa apaga dado de outra |
| Reutilizar dado permanente sem republicar | ao abrir uma edição nova, as unidades permanentes aparecem como **sugestão** ("Usar a unidade Lagoa Nova?"). Nada é copiado para a participação nova nem publicado sem confirmação. A publicação é sempre por participação |
| Diferenças entre unidades | etapa 6 tem uma coluna por unidade; o botão "copiar da unidade anterior" acelera |
| Mostrar o que será público | cada campo tem um selo "aparece no site" ou "uso interno"; a etapa 8 mostra a página |
| Revisar antes de enviar | a etapa 9 lista por etapa o que será enviado e o que falta |
| Pendências e correções | as correções por campo continuam abrindo junto ao campo e no topo da lista (`guia.js:152-155`). `CAMPOS_APONTAVEIS` passa a cobrir declarações, substituições, horário no festival, modos e canais (hoje não cobre, seção 1.2) |

**Edição em que a marca trabalha [Proposta]:** a marca continua vendo a participação mais recente. Se houver duas participações abertas, aparece um seletor de edição no topo. Hoje nada trata esse caso (`Cadastro.jsx:252`).

## 4.3 Prévia

- A mesma função `montar_publico` gera o JSON da prévia, sem gravar versão. Assim a prévia é **idêntica** ao que seria publicado.
- A prévia renderiza o componente público `Participante` dentro do painel, com uma faixa "Prévia, ainda não publicada".
- Para isso, o painel importa `src/edicao/componentes/` (o painel já importa ícones de `src/`).
- A prévia não passa por `/cartoon`, então não depende das chaves de publicação.

## 4.4 Estados e transições

Os estados pedidos mapeiam no que já existe, mais uma dimensão de publicação:

| Estado pedido | Representação | Origem |
|---|---|---|
| Rascunho | `combo_status = rascunho` (cadastro `aguardando` ou `em_preenchimento`) | existente |
| Enviado para revisão | `combo_status = em_analise` | existente (gatilho `combo_em_analise`) |
| Correção solicitada | `combo_status = correcao_solicitada` + `correcoes_campo` abertas | existente |
| Aprovado | `combo_status = aprovado` | existente |
| Publicado | `publicacoes` com `vigente` e sem `retirado_em` | novo, **dimensão separada** |
| Retirado de publicação | `publicacoes.retirado_em` preenchido, sem versão vigente | novo |

O estado de revisão diz se o conteúdo atual foi aceito. O estado de publicação diz o que está no ar. Ficam separados porque uma marca pode estar publicada (versão 1) e ao mesmo tempo em análise (alteração da versão 2).

```
rascunho ──enviar──▶ em_analise ──aprovar──▶ aprovado ──publicar──▶ [publicado vN]
   ▲                    │                       │                       │
   └──── correção ◀─────┘                       │ marca altera campo    │ retirar
        solicitada                              ▼ público               ▼
                                     alterado_apos_aprovacao      [retirado]
                                     (vN segue no ar)
                                        │ marca reenvia
                                        ▼
                                    em_analise ──aprovar──▶ aprovado ──publicar──▶ [publicado vN+1]
```

**Alteração depois da aprovação [Proposta]:**

- Um gatilho nas colunas públicas marca `alterado_apos_aprovacao = true` e registra em `auditoria`. Não muda o estado sozinho: o salvamento automático dispararia a cada tecla.
- O painel da marca mostra "Você alterou dados já aprovados. A versão publicada continua no ar até a organização revisar. Enviar alterações".
- O botão chama `marca_concluir_cadastro`, que leva a `em_analise`.
- Para a organização, a ficha mostra a **diferença** entre a versão publicada e a atual, campo a campo, a partir de `publicacoes.conteudo` contra `montar_publico` atual.

**Restrição recomendada:** campos que mudam a natureza da oferta exigem o reenvio para valerem: preço (que já é da organização), componentes, alergênicos, modos e horário. O reenvio já é o fluxo acima, então não há bloqueio de edição.

## 4.5 Fluxo da organização

| Precisa | Onde | Como |
|---|---|---|
| Ver pendências | Visão geral (Mesa) e Participantes > Marcas | nova coluna "Publicação" (não publicada · publicada vN · alteração em análise · retirada) e filtros "aguardando revisão", "alterado após aprovação", "aprovado sem publicar" |
| Conferir informações e fotos | ficha da marca, abas Cadastro e Operação | a etapa 5 aparece com destaque para `nao_informado` e `pode_conter`; fotos com aprovar/recusar e campo de texto alternativo |
| Pedir correções específicas | `pedir_correcao_campo` | os blocos novos (5, 6, 7) entram no `check` e em `CAMPOS_APONTAVEIS` |
| Pré-visualizar | botão "Ver como no site" | a mesma prévia da 4.3 |
| Publicar a marca antes do combo | `publicar_participacao(..., 'marca')` | permitido com cadastro aprovado da etapa 1–2, mesmo com combo em análise |
| Controlar unidades e ofertas | ficha, aba Unidades | `participa`, coordenadas verificadas (só a organização grava `lat/lng` e `coordenada_verificada_*`) |
| Identificar alterações após aprovação | filtro + selo na ficha + diferença campo a campo | 4.4 |
| Preservar a última versão pública | `publicacoes` | 3.6 |
| Histórico e responsáveis | aba Histórico (`get_atividade`) | novas ações: `publicar`, `retirar_publicacao`, `definir_publicacao_edicao`, `verificar_coordenada`, `aprovar_midia` |
| Interruptores da edição | Edição > Configuração | os interruptores 1 e 3–6 com o efeito descrito em uma linha e a última mudança (quem, quando) |

**Permissões [Proposta]:** reaproveita as existentes.

- `curadoria.decidir`: publicar e retirar participação, aprovar foto.
- `edicao.gerir`: interruptores, fase, janela da avaliação.
- `producao.gerir`: verificar coordenada, subir foto oficial.
- `relatorio.ler`: ver resultados antes de publicar.

Nenhuma permissão nova. **[Decisão D-18]** confirmar que curadoria pode publicar sem o administrador.

## 4.6 Notificações

Reaproveita `notificar()` (usado em `revisar_combo`):

- "Sua página foi publicada" ao publicar;
- "Correção pedida em <campo>" ao pedir correção;
- "Sua página saiu do ar: <motivo>" ao retirar.

O push já existe (`enviar-push`).
