"""Ícones dos atalhos do Mapa da Doçura (06/11/2026): `trofeu` (do troféu desenhado da edição, recortado) e `podio`
(desenhado aqui: nanquim #3A150F, cor chapada, sombra cel). 192x192 RGBA, mesma família dos 24 ícones da folha.
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


trofeu()
podio()
print('ok')
