# Ícones dos atalhos do mapa e controles da tela cheia (06–07/11/2026)

## Ícones ilustrados (`public/images/marcas-edicoes/2026.2/elementos/icones/`, 192×192, fundo transparente)

| Ícone | Uso | Origem |
|---|---|---|
| `carimbo-delivery` | atalho "Carimbo do meu delivery" (central da Caça e ficha da casa) | desenhado em `scripts/edicao/icones-atalhos.py` (sacola + selo de check; a moto de `delivery` lê como "pedir delivery") |
| `vouchers` | atalho **Prêmios** | gerado pela API de imagem (gpt-image, 1024 px, fundo transparente, qualidade média) com a folha dos ícones existentes como referência de estilo |
| `ranking` | atalho **Ranking** (central e mapa) | idem: pódio de três degraus com coroa |

Antes, "Prêmios" reaproveitava o recorte do troféu e "Ranking" um pódio desenhado à mão (Wilker, 07/11: "tem que fazer ícones novos que combinem"). Os dois saíram.
Para refazer: gerar de novo pelos prompts abaixo e rodar `python scripts/edicao/icones-atalhos.py vouchers=<png> ranking=<png>` (recorta e ajusta ao quadro de 192 px).

Prompt comum: *mesmo estilo da folha de referência (contorno marrom #3A150F grosso, cor chapada saturada com sombra suave e um brilho branco, formas arredondadas, sem texto); um objeto centrado com ~12% de margem, fundo transparente, sem letras, números nem palavras.*
- **vouchers**: dois vouchers sobrepostos e levemente abertos; o da frente rosa-vermelho (#E8195A) com estrela creme, entalhes semicirculares nas laterais e linha tracejada de destaque; o de trás amarelo (#FDB901) inclinado; um brilho pequeno.
- **ranking**: pódio de três degraus visto de frente; o do meio amarelo (#FDB901) com uma coroa pequena acima, o da esquerda azul (#0184E4), o da direita rosa-vermelho (#E8195A, o mais baixo); em cada degrau um selo redondo branco com uma estrela no lugar do número.

## Controles do mapa em tela cheia (`16-mapa-tela.css`, `Atalhos.jsx`, `Mundo.jsx`)

- **Uma coluna estreita de círculos só com ícone**, colada na borda esquerda: Atalhos (com o placar "2/26" como selo no canto) · Perto de mim · os três atalhos fixos. O nome de cada um fica no `aria-label`/`title`; a lista dos Atalhos abre ao lado da coluna. Deitado, a coluna vira fileira.
- **Aviso "Mapa ilustrativo: não mostra posições reais"** vira um ícone de informação (canto inferior esquerdo): tocar mostra o texto por 6 s (`TEMPO_AVISO` em `Mundo.jsx`) e ele some sozinho; tocar de novo fecha antes. Fora da tela cheia o aviso segue como legenda abaixo do mapa. O crédito do OpenStreetMap continua sempre visível.

## App instalado (escopo)

O manifest da Caça passou de `scope: /cartoon/caca` para **`/cartoon`** (id e `start_url` iguais): o mapa e as casas são parte da Caça. Navegar para fora do escopo faz o iPhone abrir o navegador interno (barras do sistema por cima) — era o que "diminuía" a tela ao entrar no mapa. ⚠️ O iPhone lê o manifest na INSTALAÇÃO: quem já instalou precisa remover o ícone e adicionar de novo. O service worker segue só em `/cartoon/caca` (push). Tela cheia "de verdade" (sem barras do Safari) só existe no app instalado; o iPhone não oferece a API de tela cheia no navegador.
