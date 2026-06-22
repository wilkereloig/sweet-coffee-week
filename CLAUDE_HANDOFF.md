# Handoff para Claude Code — Reestruturação do site Sweet & Coffee Week

## Objetivo

O site deixou de ser tratado apenas como página da edição Lovers e passou a ser uma estrutura institucional do Sweet & Coffee Week, com a edição Lovers preservada como arquivo especial de 10 anos.

Direção editorial aplicada:

- site moderno, com cara de festival;
- home institucional forte;
- seções preparadas para fotos grandes;
- textos novos e mais estratégicos;
- páginas institucionais destravadas;
- Lovers mantida como arquivo e com rotas antigas preservadas;
- rotas limpas adicionadas no Vercel para páginas institucionais.

## Arquivos alterados

- `src/App.jsx`
- `src/components/nav.jsx`
- `src/data/editions.js`
- `src/pages/institutional/Home.jsx`
- `src/pages/institutional/Edicoes.jsx`
- `src/pages/institutional/Curiosidades.jsx`
- `src/pages/institutional/Participar.jsx`
- `src/pages/institutional/Apoiar.jsx`
- `src/pages/institutional/Contato.jsx`
- `vercel.json`

## Commits aplicados

- `e0a0e4e8975413121f13d5128199f624ec246c1e` — Reestrutura rotas institucionais do site
- `e77238c4e0e647fa465dfaec21ab6fa9042c60e6` — Amplia dados das edicoes do Sweet
- `62a7bb7af1f023f8d0cc20da07fcee831ce77d1a` — Atualiza navegacao principal do site
- `8c844bce45b6a5149e9e53b6024a3e32ca533303` — Reconstrói home institucional do Sweet Coffee Week
- `dadb3f5449261ee26e1580a63bb168f785b4615a` — Recria pagina de edicoes como linha do tempo editorial
- `82a7fec908c1103ea4f142f64a0505a52f020428` — Reescreve curiosidades com conteudo editorial do festival
- `a165c8da7caf7f0dc367764b1a934dc269903ce7` — Atualiza pagina participar com narrativa comercial
- `43c53d766d1a4bb1378364c7426abd7551cd5e80` — Atualiza pagina apoiar com proposta para parceiros
- `ce729646ddb107388138d56b9ac2035c287acd9e` — Atualiza pagina de contato institucional
- `be699bc1aaca26f91e2092cee5d73557bcd227a2` — Adiciona rewrites das paginas institucionais

## Rotas esperadas

### Institucionais

- `/` ou `#/` — Home institucional do festival
- `#/edicoes` — Linha do tempo das edições
- `#/curiosidades` — Curiosidades, termos e bastidores
- `#/participar` — Pré-cadastro para marcas participantes
- `#/apoiar` — Parcerias, patrocínio e apoios
- `#/contato` — Canais de contato

### Lovers preservadas

- `#/lovers`
- `#/lovers/participantes`
- `#/lovers/mapa`
- `#/lovers/premiacao`
- `#/lovers/viva`
- `#/lovers/votar`
- `#/lovers/painel`
- `#/lovers/combos/:slug`

Importante: as rotas antigas da Lovers não devem ser removidas porque podem estar em QR Codes e materiais já divulgados.

## O que Claude Code deve revisar agora

1. Rodar:

```bash
npm install
npm run build
npm run dev
```

2. Validar erros de JSX/CSS nos arquivos alterados.

3. Verificar se `src/components/nav.jsx` não perdeu nenhuma dependência usada em outras partes.

4. Revisar responsividade das novas páginas institucionais.

5. Verificar se os placeholders `PhotoEditorial` estão suficientes ou se devem ser trocados por imagens reais.

6. Atualizar `src/lib/pageMeta.js`, caso desejado, para refletir os novos títulos e descrições das páginas institucionais. Uma tentativa de atualização direta desse arquivo foi bloqueada pelo conector, então ficou como pendência.

7. Se necessário, ajustar a linguagem visual para o novo design final. A estrutura já está pronta para receber fotos grandes, grids editoriais e seções de campanha.

## Direção de conteúdo

A home agora posiciona o Sweet & Coffee Week como:

> A temporada mais doce de Natal.

A estrutura institucional deve sustentar o festival durante o ano inteiro, não apenas durante uma edição específica.

Lovers agora deve ser entendida como:

> Arquivo da edição especial de 10 anos.

Não tratar Lovers como home permanente do site.

## Pendência recomendada

Atualizar `src/lib/pageMeta.js` com títulos para:

- Home: `Sweet & Coffee Week`
- Edições: `Edições · Sweet & Coffee Week`
- Curiosidades: `Curiosidades · Sweet & Coffee Week`
- Participar: `Participar · Sweet & Coffee Week`
- Apoiar: `Apoiar · Sweet & Coffee Week`
- Contato: `Contato · Sweet & Coffee Week`
- Lovers: `Arquivo Lovers · Sweet & Coffee Week`

