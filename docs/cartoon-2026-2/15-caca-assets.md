# 15 · Caça aos Carimbos — arte gerada (propostas v1)

Gerada em 04/11/2026 pela API de imagem (modelo `gpt-image-2.5-sunburst`, qualidade `medium`) com a skill `gerar-imagem-openai`.
**Status de tudo: `proposta` — não aprovada pelo Wilker.** Nada foi ligado ao código, ao manifest nem a flag alguma.
Destino: `public/images/caca/` (versão `v1`; nada existente foi sobrescrito).

Estilo: igual aos ícones da edição (`elementos/icones`) e ao `elemento-vouchers.png` da pasta da Caça, usados como referência
de estilo — sticker cartoon, contorno grosso marrom `#3A150F`, cores chapadas da paleta, um brilho branco curto.
Nenhuma logo oficial, Sicredi, marca de participante, fachada, endereço, texto ou número foi gerado. Texto/dados entram por código.
Fundo transparente: geradas sobre verde chapado `#00FF00` e removido por script (chroma key + despill); bordas conferidas sobre cinza.

Custo: 6 gerações, ~US$ 0,18 no total (custo real por imagem). Uma geração por folha; nenhuma refeita.

| Arquivo (`public/images/caca/`) | Tela / uso | Prompt resumido | Custo | Status |
|---|---|---|---|---|
| `pin-nao-visitada-v1.webp` (199×256, alfa) | Mapa lúdico — casa ainda não visitada: gota creme com furo vazio | folha 2×2 de pins; creme, furo, neutro | (folha) US$ 0,033 | proposta |
| `pin-pendente-v1.webp` (216×256, alfa) | Mapa lúdico — "carimbo pendente, falta avaliar": gota amarela, estrela só de contorno + ampulheta (forma diferente, não depende só de cor) | amarelo, estrela vazia, ampulheta | (mesma folha) | proposta |
| `pin-conquistada-v1.webp` (256×237, alfa) | Mapa lúdico — casa conquistada: gota vermelha com carimbo redondo e estrela | vermelho, carimbo duplo, brilhos | (mesma folha) | proposta |
| `selo-revisita-v1.webp` (254×256, alfa) | Selo de revisita/carimbo extra, para colar no canto do pin (contador entra por código) | selo serrilhado rosa, seta circular, estrela | (mesma folha) | proposta |
| `medalha-1-v1.webp` … `medalha-5-v1.webp` (≈310–367×384, alfa) | Conquistas de marcos, em ordem crescente de "grandeza" (turquesa/carimbo, amarela/pin, rosa/coração, vermelha/estrela, dourada com coroa e brilhos). **Sem número escrito**; o marco que cada uma representa é configurável e fica por código | folha com 5 medalhas, sem troféu/plaquinha/presente (não insinuar a surpresa do prêmio final) | US$ 0,028 (folha) | proposta |
| `central-vazio-v1.webp` (640×582, alfa) | Estado vazio da central: "Escolha uma casa para começar". Carimbo com olhinhos (construção padrão da Cartoon) olhando para um pin vazio e um mapinha ilustrativo sem nomes | carimbo mascote + pin vazio + mapa dobrado | US$ 0,032 | proposta |
| `stories-fundo-v1.webp` (1080×1920, opaco) | Fundo do Story de compartilhar progresso. Faixas cartoon só no topo (≈16%) e rodapé (≈16%), poucos pins/estrelas nas bordas; **centro (12–88% da largura, 20–80% da altura) limpo** para o texto desenhado pelo código | fundo creme pontilhado, bandeirolas/nuvens/carimbos nas faixas | US$ 0,027 | proposta |
| `app-icone-512-v1.png` (512, cantos arredondados em alfa) e `app-icone-192-v1.png` | Ícone "any" do app instalável da Caça (PWA própria, ainda sem manifest) | carimbo redondo vermelho com coração + pin rosa, fundo amarelo | US$ 0,031 (1 geração para os 4 arquivos) | proposta |
| `app-icone-512-maskable-v1.png` (512, tela cheia) | Ícone maskable: arte reduzida a 88% e fundo continuado por espelhamento; motivo dentro da zona segura (ponta de uma estrelinha pode encostar na borda do círculo de 80%) | idem | (mesma geração) | proposta |
| `app-icone-180-apple-v1.png` (180, opaco) | `apple-touch-icon` (iPhone) | idem | (mesma geração) | proposta |
| `grupo-amigos-v1.webp` (512×479, alfa) | Selo/ilustração de "grupo de amigos": três pins com olhinhos conversando, coração e carimbo | três gotas rosa/turquesa/amarela com olhinhos | US$ 0,032 | proposta |

## Pendências e cuidados
- **Aprovação**: tudo é proposta; ninguém ativou. Não ligar como definitivo sem o ok do Wilker (mesma regra da arte do mapa, `aprovada` em `src/data/mundoEdicao.js`).
- **PWA**: os ícones não foram ligados a manifest. Quando o manifest da Caça for criado, apontar para `app-icone-512-v1.png` (`purpose: any`), `app-icone-512-maskable-v1.png` (`maskable`), `app-icone-192-v1.png` e `app-icone-180-apple-v1.png`. Não mexer em `public/painel/app.webmanifest`.
- **Medalhas**: o código escolhe qual medalha mostra em cada marco configurável; a arte não carrega número.
- **Pin "não visitada"** em creme pode ter pouco contraste sobre o creme do mapa; o contorno marrom resolve, conferir no tabuleiro real.
- **Reaproveitado, não regerado**: carimbo `ja-fui`, `mapa`, `progresso`, logo da Caça e `elemento-vouchers.png` (só como referência de estilo); pin com a logo de cada casa continua vindo de `elementos/pins/`; Sicredi continua `parceiros/sicredi.svg`.
- Originais da API (com assinatura C2PA) e prompts completos ficaram na pasta temporária da sessão, fora do repositório; os arquivos finais em `public/images/caca/` foram regravados por script (sem metadados da API).
