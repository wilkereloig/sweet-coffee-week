"""Ícones dos atalhos do Mapa da Doçura (06-07/11/2026), 192x192 RGBA, mesma família dos 24 ícones da folha.
- `carimbo-delivery`: desenhado aqui (sacola de entrega + selo de check; a moto de `delivery` lê como "pedir delivery").
- `vouchers` (Prêmios) e `ranking` (pódio com coroa): ILUSTRADOS pela API de imagem (gpt-image, 1024, fundo transparente, a folha
  dos ícones existentes como referência de estilo; prompts em docs/cartoon-2026-2/16-icones-atalhos.md) e aqui só recortados e
  ajustados ao quadro de 192 px. Antes o atalho "Prêmios" reaproveitava o recorte do troféu e o "Ranking" um pódio desenhado à mão;
  ambos saíram (Wilker, 07/11: "tem que fazer ícones novos que combinem").
Uso: python scripts/edicao/icones-atalhos.py                     (refaz o carimbo-delivery)
     python scripts/edicao/icones-atalhos.py vouchers=a.png ranking=b.png   (ajusta os PNG gerados e grava os WebP)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parents[2]
ICONES = RAIZ / 'public/images/marcas-edicoes/2026.2/elementos/icones'
S, K = 192, 4  # tamanho final e supersampling
INK, AMARELO, ROSA, AZUL, CREME = (58, 21, 15), (253, 185, 1), (232, 25, 90), (1, 132, 228), (253, 240, 222)
SOMBRA = {AMARELO: (214, 140, 0), ROSA: (178, 14, 66), AZUL: (0, 98, 176)}


def carimbo_delivery():
    k = K
    im = Image.new('RGBA', (S * k, S * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    LARANJA, LARANJA_SOMBRA = (253, 185, 1), (214, 140, 0)
    VERMELHO = (237, 28, 32)
    # alça (uma volta só, atrás do corpo da sacola)
    d.arc((52 * k, 18 * k, 122 * k, 84 * k), 180, 360, fill=INK, width=int(12 * k))
    d.arc((52 * k, 18 * k, 122 * k, 84 * k), 180, 360, fill=CREME, width=int(5 * k))
    # corpo da sacola
    corpo = (36, 58, 138, 172)
    d.rounded_rectangle([c * k for c in corpo], radius=8 * k, fill=LARANJA, outline=INK, width=int(5 * k))
    d.rectangle(((corpo[0] + 5) * k, (corpo[3] - 14) * k, (corpo[2] - 5) * k, (corpo[3] - 6) * k), fill=LARANJA_SOMBRA)  # sombra cel
    d.rectangle(((corpo[0] + 2) * k, (corpo[1] + 2) * k, (corpo[2] - 2) * k, (corpo[1] + 20) * k), fill=LARANJA_SOMBRA)  # dobra do topo
    d.line(((corpo[0] + 2) * k, (corpo[1] + 20) * k, (corpo[2] - 2) * k, (corpo[1] + 20) * k), fill=INK, width=int(3.5 * k))
    d.rounded_rectangle([c * k for c in corpo], radius=8 * k, outline=INK, width=int(5 * k))
    # selo do carimbo, no canto, levemente girado
    selo = Image.new('RGBA', (96 * k, 96 * k), (0, 0, 0, 0))
    s2 = ImageDraw.Draw(selo)
    c = 48 * k
    for r, cor in ((44, INK), (40, VERMELHO), (31, CREME), (27, VERMELHO)):
        s2.ellipse((c - r * k, c - r * k, c + r * k, c + r * k), fill=cor)
    pts = [(26 * k, 50 * k), (42 * k, 66 * k), (70 * k, 30 * k)]
    for larg, cor in ((20, INK), (11, CREME)):
        s2.line(pts, fill=cor, width=int(larg * k), joint='curve')
        for x, y in (pts[0], pts[-1]):  # pontas redondas
            r = larg / 2
            s2.ellipse((x - r * k, y - r * k, x + r * k, y + r * k), fill=cor)
    selo = selo.rotate(-14, resample=Image.BICUBIC)
    im.alpha_composite(selo, (96 * k, 90 * k))
    im.resize((S, S), Image.LANCZOS).save(ICONES / 'carimbo-delivery.webp', quality=92, method=6)


def ajustar_png(origem, nome):
    """Recorta o PNG gerado pelo contorno do desenho e o centra num quadro de 192 px com ~8% de margem."""
    im = Image.open(origem).convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    im.thumbnail((S - 16, S - 16), Image.LANCZOS)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2))
    out.save(ICONES / f'{nome}.webp', quality=92, method=6)


def retirada():
    """`retirada` (10/11/2026): ponto de retirada dos vouchers. Bilhete amarelo inclinado, seta descendo e bandeja azul que recebe.
    Traço grosso (8 px no quadro de 192) e três cores chapadas para ler a 32 px no selo do pin."""
    k = K
    im = Image.new('RGBA', (S * k, S * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    p = lambda *v: [c * k for c in v]
    W = int(8 * k)
    # bandeja (embaixo): aba larga + fundo, azul com sombra
    d.polygon(p(36, 150, 156, 150, 140, 180, 52, 180), fill=SOMBRA[AZUL])
    d.line(p(36, 150, 52, 180, 140, 180, 156, 150), fill=INK, width=W, joint='curve')
    d.rounded_rectangle(p(10, 132, 182, 158), radius=13 * k, fill=AZUL, outline=INK, width=W)
    # bilhete (em cima, inclinado): amarelo, picotado, recortes laterais
    b = Image.new('RGBA', (140 * k, 86 * k), (0, 0, 0, 0))
    bd = ImageDraw.Draw(b)
    bd.rounded_rectangle((5 * k, 5 * k, 135 * k, 81 * k), radius=12 * k, fill=AMARELO, outline=INK, width=W)
    for cx in (5, 135):
        bd.ellipse(((cx - 13) * k, 30 * k, (cx + 13) * k, 56 * k), fill=INK)
        bd.ellipse(((cx - 7) * k, 36 * k, (cx + 7) * k, 50 * k), fill=(0, 0, 0, 0))
    for y in range(16, 74, 13):  # picote
        bd.line((96 * k, y * k, 96 * k, (y + 7) * k), fill=INK, width=int(5 * k))
    bd.ellipse((30 * k, 26 * k, 62 * k, 58 * k), fill=ROSA, outline=INK, width=int(6 * k))
    b = b.rotate(10, resample=Image.BICUBIC, expand=True)
    im.alpha_composite(b, (6 * k, 0))
    # seta descendo do bilhete para a bandeja, à direita (contorno chocolate, miolo creme)
    d.line(p(158, 70, 158, 100), fill=INK, width=int(26 * k))
    d.line(p(158, 70, 158, 102), fill=CREME, width=int(12 * k))
    d.polygon(p(130, 94, 186, 94, 158, 130), fill=INK)
    d.polygon(p(142, 101, 174, 101, 158, 120), fill=CREME)
    im.resize((S, S), Image.LANCZOS).save(ICONES / 'retirada.webp', quality=92, method=6)

if __name__ == '__main__':
    import sys
    pares = [a.split('=', 1) for a in sys.argv[1:] if '=' in a]
    if pares:
        for nome, origem in pares:
            ajustar_png(origem, nome)
    elif 'retirada' in sys.argv[1:]:
        retirada()
    else:
        carimbo_delivery()
    print('ok')
