# 3 · Modelo de dados

Princípio: **estender o que existe, não duplicar.** Toda mudança é aditiva (coluna ou tabela nova, nada apagado) e segue a convenção das migrations do projeto: nome `AAAAMMDD_nome.sql`, idempotente, `revoke` de `public, anon, authenticated` em cada função nova seguido de `grant` explícito (`docs/regras/04-stack-e-estrutura.md:117-142`). **Nenhuma migration será aplicada nesta etapa.**

## 3.1 Entidades e onde moram

| Entidade | Hoje [Fato] | Proposta |
|---|---|---|
| Marca | `participantes` (permanente) | mantém; ganha `apresentacao_publica` |
| Unidade (permanente) | **não existe**: endereço é redigitado a cada edição em `participacao_unidades` | nova `unidades` (marca, nome da unidade, endereço estruturado, coordenadas verificadas, WhatsApp público) |
| Edição | `edicoes` | mantém; o estado de publicação vai em `edicao_publicacao` (1:1) |
| Participação da marca na edição | `participacoes` | mantém; ganha `slug_publico`, `combo_nome`, `combo_descricao`, `combo_condicoes` e a marcação de alteração depois da aprovação |
| Participação da unidade na edição | `participacao_unidades` | mantém; ganha `unidade_id`, modos de atendimento tri-estado e o id público. O horário no festival mora numa coluna jsonb da própria participação da unidade (`horario_festival`, 23/10/2026); a tabela filha `unidade_disponibilidade` ficou sem uso |
| Combo | campos em `participacoes` e, por legado, em `participantes.combo_nome/combo_descricao` | **combo = participação (1:1)**. Nome e descrição passam para `participacoes`. Sem tabela `combos` nova |
| Componentes do combo | `participantes_itens` (posição 1–3) | mantém; os selos booleanos são substituídos por declarações tri-estado |
| Declarações alimentares | 3 booleanos `NOT NULL default false` por item | nova `declaracoes_alimentares` |
| Substituições | `tem_substituicao` + texto até 500 | nova `substituicoes` |
| Fotos | foto oficial em `arquivos` (privado), `foto_path` do item nunca usado, logo em `logos_marca` (público) | nova `midias_participacao` com papel, item, aprovação e cópia pública |
| Condições de atendimento | `faz_delivery`, `canais_delivery`, `so_delivery`, `mesas`, `combo_para_viagem`, `combo_delivery` (texto) | colunas tri-estado por unidade; o horário vai em `participacao_unidades.horario_festival` (jsonb) |
| Revisão | `combo_status`, `status_cadastro`, `correcoes_campo`, `solicitacoes`, `auditoria` | mantém; ganha `alterado_apos_aprovacao` |
| Publicação | **não existe** | nova `publicacoes` (versão pública congelada) + `edicao_publicacao` |

## 3.2 Premissas que o modelo não faz

| Não presumir | Como o modelo garante |
|---|---|
| Marca com uma unidade só | `unidades` 1:N por marca; `participacao_unidades` 1:N por participação (hoje 5 marcas da 2026.2 já têm mais de uma) |
| Todas as unidades participam | só as unidades com linha em `participacao_unidades` e `participa = true` entram |
| Todas oferecem o mesmo combo | o combo é da participação; diferença por unidade vai em `observacao_combo` da unidade e no escopo das substituições. Combo inteiro diferente por unidade fica fora (**[Decisão D-11]**) |
| Delivery da loja implica delivery do combo | `delivery_combo` é da participação da unidade, separado de qualquer dado da loja; não existe "loja faz delivery" no modelo |
| Horário da loja implica disponibilidade do combo | **Decisão de 23/10/2026 (Wilker): não existe mais "horário da loja" × "horário do combo".** Pergunta-se UMA coisa: como a unidade funciona em cada dia do festival (`participacao_unidades.horario_festival`). O horário comercial da loja não é pedido, guardado de novo nem publicado |
| Um contato atende todas as unidades | `whatsapp_publico` é por unidade; o telefone da marca (`participantes.telefone`) é do responsável e **privado** |

## 3.3 Dicionário de campos

Legenda das colunas da tabela:

- **Fase**: em que momento o campo é obrigatório. **E** = para enviar à revisão; **P** = para publicar; **—** = opcional.
- **Preenche**: M = marca, O = organização.
- **Revisa**: O = organização.
- **Público**: se aparece no site.
- **Ausente**: o que o site faz sem o dado.

### Marca (`participantes`)

| Campo | Finalidade | Tipo | Fase | Preenche | Revisa | Público | Validação | Ausente |
|---|---|---|---|---|---|---|---|---|
| `nome_marca` | nome oficial | text | E | O | — | sim | padronização do banco (`participantes_formatar_nome`) | — (obrigatório) |
| `logo_id` | logo oficial | uuid → `logos_marca` | P | M ou O | O | sim | arquivo do bucket `logos`; nunca logo inventada (A4) | monograma com a inicial em tipografia da edição, marcado como "logo não enviada" no painel |
| `apresentacao_publica` **(nova)** | apresentação breve da casa | text ≤ 280 | P | M | O | sim | sem preço nem promessa | bloco A sem o parágrafo |
| `instagram` | canal da marca | text | — | M | O | sim | `@` + caracteres válidos | sem link |
| `site` | canal da marca | text | — | M | O | sim | URL https | sem link |
| `responsavel`, `telefone`, `email`, `cnpj`, `razao_social` | contato e cadastro | text | E | M | — | **não** | já validados hoje | — |

### Unidade permanente (`unidades`, nova)

| Campo | Finalidade | Tipo | Fase | Preenche | Revisa | Público | Validação | Ausente |
|---|---|---|---|---|---|---|---|---|
| `id` | identidade | uuid | — | sistema | — | não | — | — |
| `participante_id` | dono | uuid → `participantes` | — | sistema | — | não | — | — |
| `nome_unidade` | "Lagoa Nova", "Midway" | text ≤ 60 | P quando a marca tem mais de uma unidade | M | O | sim | — | mostra o bairro |
| `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `cep` | endereço estruturado | text | E | M | O | sim (exceto CEP, opcional) | CEP com 8 dígitos; UF com 2 letras | sem endereço a unidade não entra no mapa nem na rota |
| `referencia` | "dentro do shopping, piso L2" | text ≤ 120 | — | M | O | sim | — | omite |
| `lat`, `lng` | posição no mapa | numeric(9,6) | P (para o mapa) | O | O | sim | dentro da região de Natal (**[Decisão D-16]** caixa limite) | unidade só na lista, com aviso "localização em conferência" |
| `coordenada_verificada_em`, `_por` | quem conferiu | timestamptz, text | P | O | — | não | — | não publica no mapa |
| `whatsapp_publico` | pedido e contato da unidade | text | — | M | O | sim | celular BR, 11 dígitos. É o WhatsApp **da loja** (um por unidade): preenchido = vai ao site (`whatsapp_autorizado` acompanha o número; desde 23/10/2026 não há caixa de autorização). O contato pessoal do responsável continua privado | sem botão WhatsApp |
| `horario_loja_texto` | **legado (23/10/2026)**: horário geral antigo, só leitura | text | — | — | — | não | nada novo grava nem mostra | — |

`participacao_unidades.endereco/bairro` passa a ser preenchido a partir de `unidades` na criação da participação. É uma cópia de conveniência que não é mais editada. Backfill: uma `unidades` por endereço distinto já cadastrado.

### Participação da marca (`participacoes`)

| Campo | Finalidade | Tipo | Fase | Preenche | Revisa | Público | Validação | Ausente |
|---|---|---|---|---|---|---|---|---|
| `slug_publico` **(nova)** | endereço público | text, único por edição | P | O (sugerido do nome) | O | sim | `^[a-z0-9]+(-[a-z0-9]+)*$`; congelado depois da 1ª publicação | não publica |
| `combo_nome` **(nova)** | nome do combo | text ≤ 80 | E | M | O | sim | — | "Combo da <Casa>" |
| `combo_descricao` **(nova)** | descrição geral | text ≤ 400 | E | M | O | sim | — | omite |
| `combo_condicoes` **(nova)** | condições relevantes ("só no salão", "até durar o estoque diário") | text ≤ 280 | — | M | O | sim | sem preço diferente do oficial | omite |
| `tema_combo`, `tema_justificativa` | tema inspirador | text | E | M | O (`decidir_tema`) | **[Decisão D-17]** hoje são segredo até o post de Confirmados | — | omite |
| `combo_preco` / `edicoes.valor_combo` | preço confirmado | numeric | P | O | — | sim | > 0 | **não mostra preço**: "preço a confirmar" |
| `combo_status` | estado da revisão | text (existente) | — | sistema/O | — | não | restrição existente | — |
| `alterado_apos_aprovacao` **(nova)** | a marca mexeu depois de aprovado | bool default false | — | gatilho | — | não | — | — |
| `combo_para_viagem`, `combo_vegano`, `combo_diet`, `combo_delivery`, `combo_proposta` | legado | — | — | — | — | **não** | — | substituídos pelas declarações e pelos modos por unidade; deixam de ser escritos |
| `custo_embalagem`, `custo_delivery` | custo interno | numeric | E (condicional) | M | O | **não** | ≥ 0 | — |

Os campos `participantes.combo_nome/combo_descricao` (legado, por marca) são copiados para `participacoes` na 2026.2 e deixam de ser escritos.

### Participação da unidade (`participacao_unidades`)

| Campo | Finalidade | Tipo | Fase | Preenche | Revisa | Público | Validação | Ausente |
|---|---|---|---|---|---|---|---|---|
| `unidade_id` **(nova)** | qual unidade permanente | uuid → `unidades` | E | M | O | não | da mesma marca | — |
| `id_publico` **(nova)** | `?unidade=`, rota, avaliação | text curto único | P | sistema | — | sim | não sequencial | — |
| `participa` **(nova)** | a unidade está na edição | bool default true | E | M | O | — | — | — |
| `consumo_local` **(nova)** | come no local | `estado_servico` | E | M | O | sim | — | "não informado": não aparece como disponível |
| `retirada` **(nova)** | pede e leva | `estado_servico` | E | M | O | sim | — | idem |
| `delivery_combo` (substitui o significado de `faz_delivery`) | entrega **o combo** | `estado_servico` | E | M | O | sim | — | idem |
| `canais_delivery` | onde pedir | jsonb `[{tipo, link}]` (existente) | P se `delivery_combo = sim` | M | O | sim | link https ou `wa.me`; tipos fechados | sem botão de pedido |
| `delivery_regioes` **(nova)** | onde entrega | text ≤ 200 | — | M | O | sim | — | "consulte a loja sobre a região" |
| `delivery_taxa` **(nova)** | taxa | text ≤ 120 | — | M | O | sim | — | "taxa conforme a plataforma ou a loja" (nunca "grátis") |
| `observacao_combo` **(nova)** | diferença desta unidade | text ≤ 200 | — | M | O | sim | — | omite |
| `mesas`, `so_delivery`, `horarios` | operação e legado | — | — | O / M | — | não | — | `horarios` texto é o horário antigo do combo: só aparece como "Hoje está: …" até a marca confirmar o horário no festival |

`estado_servico` = enum `sim` · `nao` · `nao_informado` (default `nao_informado`). Motivo: um booleano `false` não distingue "não oferece" de "não respondeu".

### Horário no festival (`participacao_unidades.horario_festival`, 23/10/2026)

Substitui a tabela `unidade_disponibilidade` (planejada abaixo, nunca usada em produção: ficou vazia, com comentário de legado). Decisão do Wilker:
**uma pergunta só — como a unidade funciona em cada dia do festival.** Sem "horário da loja" × "horário do combo", sem horário comercial padrão.

| Campo | Tipo | Observação |
|---|---|---|
| `participacao_unidades.horario_festival` | jsonb, default `[]` | lista de `{ data, abre, fecha }`; `data` entre `festival_inicio` e `festival_fim` (hoje 05 a 15/11/2026, 11 dias) |
| `abre`, `fecha` | `HH:MM` | de 05:00 a 23:30 em passos de 30 min; `fecha` também pode ser `24:00` (meia-noite); `fecha > abre`; até **2 períodos por dia** (fecha para o almoço) e sem sobreposição |

Regras: **dia sem período = não abre**; **`[]` = ainda não respondido** (vira pendência `unidade:<id>:horario`, nunca "fechado"). O banco valida em qualquer gravação
(gatilho `horario_festival_validar` → `horario_festival_normalizar`; erros `horario_invalido` e `data_fora_do_festival`). A marca confirma e a equipe edita
(`org_salvar_horario_unidade`, com auditoria antes/depois). O texto antigo (`participacao_unidades.horarios`) vira linhas só quando a marca confirma, ou pelo
`/preencher` (`horario_festival_de_texto`); em 23/10/2026 14 das 38 unidades foram convertidas, as outras chegam vazias com "Hoje está: …".
A página pública lê as mesmas linhas em `unidades[].combo.disponibilidade` (`montar_publico`); sem horário, "horário a confirmar com a loja" e sem "aberto agora".
Telas: seletor único (`painel-app/src/components/HorarioFestival.jsx`; regra em `src/edicao/dados/horarioFestival.js`) na marca, na ficha da equipe e, em versão estática, em `/preencher`.

#### Plano original (superado): tabela `unidade_disponibilidade`

| Campo | Tipo | Observação |
|---|---|---|
| `participacao_unidade_id` | uuid | |
| `data` | date | entre `festival_inicio` e `festival_fim` (05 a 15/11) |
| `abre`, `fecha` | time | `fecha > abre`; um dia pode ter mais de uma faixa |
| `observacao` | text ≤ 120 | "até acabar o estoque do dia" |

Era preenchida com atalho "mesmo horário em todos os dias" e ajuste por dia. A observação por dia saiu com a troca (o seletor novo não a tem).

### Componentes (`participantes_itens`)

| Campo | Tipo | Fase | Preenche | Público | Observação |
|---|---|---|---|---|---|
| `tipo`, `posicao` | existente | — | O cria | sim | 1 = doce, 2 = salgado ou segundo doce, 3 = bebida |
| `nome` | text ≤ 80 | E | M | sim | |
| `descricao` | text ≤ 300 | E | M | sim | |
| `ingredientes` | text ≤ 600 | E | M | sim | lista em texto; mostrada como "ingredientes informados pela casa" |
| `vegano`, `sem_gluten`, `sem_lactose` | legado | — | — | **não** | migram para `declaracoes_alimentares` (3.4) |
| `tem_substituicao`, `substituicao` | legado | — | — | não | migram para `substituicoes` (3.5) |
| `foto_path` | legado | — | — | não | substituído por `midias_participacao` |

### Fotos (`midias_participacao`, nova)

| Campo | Tipo | Observação |
|---|---|---|
| `participacao_id` | uuid | |
| `item_id` | uuid nulo | preenchido quando a foto é de um componente |
| `unidade_id` | uuid nulo | foto da loja |
| `papel` | enum `combo_principal` · `combo_galeria` · `item` · `loja` | só um `combo_principal` por participação |
| `origem` | enum `sessao_oficial` · `marca` | **[Decisão D-08]** aceitar foto enviada pela marca |
| `path_privado` | text | bucket `arquivos`/`combos` |
| `path_publico` | text | cópia no bucket público, feita na publicação; com variantes 480/960/1600 em webp |
| `largura`, `altura`, `foco_x`, `foco_y` | int, numeric | recorte sem distorção |
| `alt` | text ≤ 160 | obrigatório para publicar; a organização revisa |
| `credito` | text | quem fotografou |
| `estado` | enum `enviada` · `aprovada` · `recusada` | só `aprovada` entra na publicação |
| `ordem` | int | |

## 3.4 Declarações alimentares

Tabela `declaracoes_alimentares`:

| Campo | Tipo | Observação |
|---|---|---|
| `item_id` ou `substituicao_id` | uuid (exatamente um) | `check (num_nonnulls(item_id, substituicao_id) = 1)` |
| `aspecto` | text de uma lista fechada | ver abaixo |
| `tipo` | `alergenico` · `caracteristica` | derivado do aspecto |
| `estado` | alergênico: `contem` · `nao_contem` · `pode_conter` · `nao_informado`. Característica: `sim` · `nao` · `nao_informado` | default `nao_informado`; `check` amarra o estado ao tipo |
| `observacao` | text ≤ 160 | "farinha de amêndoa na massa" |
| `declarado_em`, `declarado_por` | | da marca |

**Aspectos [Proposta, com validação especializada pendente D-09]:**

- **Alergênicos:**
  - glúten (trigo, centeio, cevada, aveia)
  - leite e derivados
  - ovo
  - amendoim
  - castanhas e nozes
  - soja
  - peixe
  - crustáceos
  - outro, com texto

  A lista segue a dos alergênicos de rotulagem no Brasil (RDC ANVISA 26/2015, hoje consolidada na RDC 727/2022) **[Provável — validar]**.
- **Características:** lactose, vegano, vegetariano, açúcar adicionado.
- **Contato cruzado:** declarado por aspecto com o estado `pode_conter`. Por exemplo, "pode conter amendoim: o mesmo equipamento processa amendoim".

**Regras:**

1. Ausência de linha = `nao_informado`. Nunca vira "não contém".
2. **"Sem lactose" ≠ "sem leite".** `lactose: nao` com `leite: contem` é um estado válido e aparece assim. A página mostra "Contém leite. A casa informa que não contém lactose", nunca "adequado para alergia ao leite".
3. Nenhum selo de "seguro", "certificado" ou "livre de". O texto padrão é "Informado pela casa". Rodapé de cada bloco: "Tem alergia ou restrição? Confirme com a loja antes de pedir."
4. Alergênico se responde com "contém / não contém / pode conter / não sei". Característica (lactose, vegano, vegetariano, açúcar adicionado) se responde com "sim / não / não sei". No painel ficam em duas listas com rótulos próprios ("Contém lactose?", "É vegano?") para quem preenche não confundir as duas leituras.
5. **Migração dos booleanos atuais:**
   - `sem_gluten = true` → `gluten: nao_contem`
   - `sem_lactose = true` → `lactose: nao`
   - `vegano = true` → `vegano: sim`
   - `false` → **nenhuma linha** (`nao_informado`), porque hoje `false` é também o valor de quem não respondeu.

   Na 2026.2 os 78 itens estão sem ingredientes (contagem em 14/10), então o efeito prático é pequeno.
6. Para publicar o combo (P), cada componente precisa ter **todos os alergênicos da lista respondidos** (qualquer estado, inclusive "não sei", que grava `nao_informado` de forma explícita). Isso força a pergunta sem forçar a resposta. **[Decisão D-09]** se "não sei" deve impedir publicação.

## 3.5 Substituições

Tabela `substituicoes`:

| Campo | Tipo | Observação |
|---|---|---|
| `item_id` | uuid | componente original |
| `original` | text ≤ 80 | "pão de queijo" ou "leite integral" (ingrediente ou o componente inteiro) |
| `alternativa` | text ≤ 80 | "pão de queijo sem lactose", "bebida de aveia" |
| `disponibilidade` | enum `sempre` · `sob_consulta` · `limitada` | |
| `acrescimo` | numeric nulo | `0` = sem custo; `null` = não informado ("consulte a loja"). Nunca mostra "grátis" com `null` |
| `como_solicitar` | text ≤ 160 | "peça no caixa", "escreva na observação do aplicativo" |
| `modalidades` | text[] ⊂ {`local`, `retirada`, `delivery`} | vazio = todas que a unidade oferece |
| `unidades` | tabela de ligação `substituicao_unidades` | vazia = todas as unidades participantes |
| declarações alimentares | `declaracoes_alimentares.substituicao_id` | a alternativa tem as suas próprias |

O texto livre atual (1 item com substituição em 2026.2) vira uma linha com `original` = nome do item e `alternativa` = o texto. A organização revisa essa linha antes de publicar.

## 3.6 Publicação e projeção pública

### Tabela `edicao_publicacao` (1:1 com `edicoes`)

`edicao_codigo` PK, `fase`, `participantes_publicos`, `combos_publicos`, `avaliacao_aberta`, `avaliacao_abre_em`, `avaliacao_fecha_em`, `resultados_publicos`, `atualizado_em`, `atualizado_por`.

Escrita só por `definir_publicacao_edicao(p_secret, p_edicao, p_dados)`, com as regras de coerência da seção 2.6. Toda chamada grava em `auditoria`.

### Tabela `publicacoes`: a versão pública congelada

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `participacao_id` | uuid | |
| `versao` | int | 1, 2, 3… |
| `nivel` | enum `marca` · `marca_e_combo` | publicar a casa antes do combo |
| `conteudo` | jsonb | **só campos públicos**, montados por `montar_publico(participacao)`, com lista explícita de campos |
| `publicado_em`, `publicado_por` | | |
| `retirado_em`, `retirado_por`, `motivo_retirada` | nulos | retirada de publicação |
| `vigente` | bool | uma vigente por participação (índice único parcial) |

**Como funciona:**

- Publicar = a organização chama `publicar_participacao(p_secret, p_participacao, p_nivel)`. A função exige `combo_status = 'aprovado'` para `marca_e_combo`, monta o JSON, copia as fotos aprovadas para o caminho público e grava uma nova versão vigente.
- Enquanto uma alteração aguarda revisão, **a versão publicada continua no ar**: o site lê a versão, não a linha viva.
- Retirar = `retirar_publicacao(...)` marca `retirado_em`. O site passa a responder "saiu do ar".
- Republicar = nova versão. O histórico fica.

### Projeção pública: o que o navegador recebe

- `edicao_publica(p_edicao text) returns jsonb`: `SECURITY DEFINER`, `grant execute to anon`. Devolve:
  - a fase e os interruptores 3 a 6;
  - a lista de participantes vigentes (do `conteudo` de `publicacoes`), com os campos de combo removidos se `combos_publicos = false`;
  - as unidades com coordenada verificada.
- `participante_publico(p_edicao text, p_slug text) returns jsonb`: a mesma regra para um participante; resolve aliases.
- Nenhuma tabela ganha política para `anon`.
- O navegador nunca recebe telefone do responsável, e-mail, CNPJ, custos, notas de revisão, estado interno ou rascunho. **Não existe dado privado escondido pelo layout.**
- O teste de projeção (fase 2) compara as chaves devolvidas com uma lista permitida e reprova qualquer chave a mais.

### Cache e disponibilidade

- **Cliente:** cache em memória por sessão e `sessionStorage` com validade de 5 minutos. Em falha de rede, mostra a última cópia com aviso "pode estar desatualizado". Sem cópia, mostra o estado de falha (seção 5.8). **Nunca** cai para dado de demonstração.
- **[Decisão D-02] Risco crítico:** o projeto Supabase é do plano gratuito, que pausa por inatividade e tem limite de 2 projetos ativos (memória do projeto; `CLAUDE.md` do workspace). Com o site da edição lendo o banco, uma pausa tira catálogo, participantes e mapa do ar. Recomendação: plano pago durante a edição, ou exportar a projeção para um JSON estático em bucket público a cada publicação. O JSON também depende do Supabase Storage, mas não do banco.

## 3.7 Esboço das mudanças no banco (não aplicar)

Ordem de migration proposta, tudo aditivo:

1. `20261020_edicao_cartoon_01_publicacao.sql`: `edicao_publicacao`, `publicacoes`, `participacao_slug_aliases`, `participacoes.slug_publico`, `participacoes.alterado_apos_aprovacao`, funções `definir_publicacao_edicao`, `publicar_participacao`, `retirar_publicacao`, `montar_publico`.
2. `…_02_unidades.sql`: `unidades` + backfill, `participacao_unidades.unidade_id`, `id_publico`, `participa`, `consumo_local`, `retirada`, `delivery_combo`, `delivery_regioes`, `delivery_taxa`, `observacao_combo`, enum `estado_servico`, `unidade_disponibilidade`.
3. `…_03_combo.sql`: `participacoes.combo_nome/combo_descricao/combo_condicoes` + cópia de `participantes`, `participantes.apresentacao_publica`.
4. `…_04_alimentar.sql`: `declaracoes_alimentares`, `substituicoes`, `substituicao_unidades` + migração dos booleanos e do texto livre.
5. `…_05_midias.sql`: `midias_participacao`, bucket público `edicao-publico` (ou pasta no `assets`) e políticas de storage.
6. `…_06_projecao.sql`: `edicao_publica`, `participante_publico` (únicas com `grant ... to anon`).
7. `…_07_revisao.sql`:
   - gatilho `marcar_alteracao_apos_aprovacao` em itens, unidades, declarações, substituições, disponibilidade e participação: só nas colunas públicas;
   - novas colunas nas concessões da marca;
   - extensão de `marca_concluir_cadastro` e `campos_cadastro`;
   - `CAMPOS_APONTAVEIS` e o `check` de `correcoes_campo.bloco` cobrindo os blocos novos.
8. `…_08_avaliacao.sql`: seção 6.

**Recuperação:**

- Antes de cada migration, rodar `npm run backup` (grava fora do repositório).
- Cada arquivo tem um bloco `-- reverter` no fim, com `drop` das peças novas. Nada existente é alterado de forma destrutiva.
- Colunas legadas ficam até o encerramento da edição.
- Os testes SQL ficam em `supabase/testes/` (`DO` blocks que terminam em `raise exception` para desfazer tudo).
