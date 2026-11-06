"""Ícones dos atalhos do Mapa da Doçura (06/11/2026): `trofeu` (do troféu desenhado da edição, recortado) e `podio`
(desenhado aqui: nanquim #3A150F, cor chapada, sombra cel). 192x192 RGBA, mesma família dos 24 ícones da folha.
`carimbo-delivery` (06/11/2026): sacola de entrega com o selo do carimbo e um check — "já recebi em casa, quero o carimbo";
a moto do ícone `delivery` lê como "pedir delivery" e por isso não serve a esse botão.
Uso: python scripts/edicao/icones-atalhos.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parents[2]
ICONES = RAIZ / 'public/images/marcas-edicoes/2026.2/elementos/icones'
TROFEU = RAIZ / 'public/images/marcas-edicoes/2026.2/trofeu/trofeu-dourado.webp'
FONTE = 'C:/Windows/Fonts/arialbd.ttf'  # só para os numerais 1-2-3 (desenho final fica em WebP)
S, K = 192, 4  # tamanho final e supersampling
INK, AMARELO, ROSA, AZUL, CREME = (58, 21, 15), (253, 185, 1), (232, 25, 90), (1, 132, 228), (253, 240, 222)
SOMBRA = {AMARELO: (214, 140, 0), ROSA: (178, 14, 66), AZUL: (0, 98, 176)}


def trofeu():
    im = Image.open(TROFEU).convert('RGBA')
    im = im.crop(im.getbbox())
    im.thumbnail((S - 12, S - 8), Image.LANCZOS)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2))
    out.save(ICONES / 'trofeu.webp', quality=92, method=6)


def degrau(d, x0, y0, x1, y1, cor, numero):
    k = K
    d.rounded_rectangle((x0 * k, y0 * k, x1 * k, y1 * k), radius=6 * k, fill=cor, outline=INK, width=int(5 * k))
    d.rectangle(((x0 + 5) * k, (y1 - 9) * k, (x1 - 5) * k, (y1 - 5) * k), fill=SOMBRA[cor])  # sombra cel na base
    d.rounded_rectangle((x0 * k, y0 * k, x1 * k, y1 * k), radius=6 * k, outline=INK, width=int(5 * k))
    cx, cy = (x0 + x1) / 2, y0 + (y1 - y0) / 2 - 2
    r = 11
    d.ellipse(((cx - r) * k, (cy - r) * k, (cx + r) * k, (cy + r) * k), fill=CREME, outline=INK, width=int(3.5 * k))
    fonte = ImageFont.truetype(FONTE, 15 * k)
    d.text((cx * k, (cy + 0.5) * k), str(numero), font=fonte, fill=INK, anchor='mm')


def estrela(d, cx, cy, r):
    import math
    k = K
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append(((cx + rr * math.cos(a)) * k, (cy + rr * math.sin(a)) * k))
    d.polygon(pts, fill=AMARELO, outline=INK, width=int(3 * k))


def podio():
    im = Image.new('RGBA', (S * K, S * K), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    degrau(d, 14, 112, 66, 172, AZUL, 2)    # 2º à esquerda
    degrau(d, 126, 128, 178, 172, ROSA, 3)  # 3º à direita
    degrau(d, 64, 84, 128, 172, AMARELO, 1)  # 1º no meio, à frente
    estrela(d, 96, 54, 22)
    im = im.resize((S, S), Image.LANCZOS)
    im.save(ICONES / 'podio.webp', quality=92, method=6)


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


trofeu()
podio()
carimbo_delivery()
print('ok')
