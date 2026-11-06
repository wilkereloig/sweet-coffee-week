"""Ícone do app "Caça aos Tesouros SCW" — propostas v2 (carimbo + pin + mapinha).

Usa SÓ arte que já existe: public/images/caca/central-vazio-v1.webp (carimbo com olhinhos, pin e mapinha, fundo transparente).
Não sobrescreve nada oficial: grava em --saida (padrão: public/images/caca/propostas-icone-v2/).

  python scripts/gerar-icone-caca.py                 # 3 propostas + folha de conferência
  python scripts/gerar-icone-caca.py --aprovar B     # grava os 4 arquivos finais (v2) da proposta escolhida

Arquivos finais (só com --aprovar): app-icone-192-v2.png, app-icone-512-v2.png, app-icone-512-maskable-v2.png, app-icone-180-apple-v2.png.
"""
import argparse, math, os
from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTE = os.path.join(RAIZ, 'public', 'images', 'caca', 'central-vazio-v1.webp')

# Paleta da edição (docs/cartoon-2026-2/10 §10.3): sem hex novo.
AMARELO, CREME, CHOCO, VERMELHO, TURQUESA = (255, 198, 26), (253, 240, 222), (58, 21, 15), (233, 36, 40), (0, 175, 204)

PROPOSTAS = {
    'A': dict(nome='Raios amarelos', fundo=AMARELO, raios=(255, 220, 90)),
    'B': dict(nome='Creme liso', fundo=CREME, raios=None),
    'C': dict(nome='Chocolate', fundo=CHOCO, raios=(86, 38, 24)),
}


def fundo(p, n=1024):
    im = Image.new('RGB', (n, n), p['fundo'])
    if p['raios']:
        d = ImageDraw.Draw(im)
        c, k = n / 2, 20
        for i in range(k):
            a0, a1 = 2 * math.pi * i / k, 2 * math.pi * (i + .5) / k
            d.polygon([(c, c), (c + n * math.cos(a0), c + n * math.sin(a0)), (c + n * math.cos(a1), c + n * math.sin(a1))], fill=p['raios'])
    return im


def compor(p, ocupa, n=1024):
    """Arte centrada, ocupando `ocupa` da largura (maskable usa menos: zona segura é o círculo de 80%)."""
    arte = Image.open(ARTE).convert('RGBA')
    arte = arte.crop(arte.getchannel('A').getbbox())
    esc = n * ocupa / max(arte.size)
    arte = arte.resize((round(arte.width * esc), round(arte.height * esc)), Image.LANCZOS)
    im = fundo(p, n).convert('RGBA')
    im.alpha_composite(arte, ((n - arte.width) // 2, (n - arte.height) // 2))
    return im


def arredondar(im, r=.22):
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=int(im.width * r), fill=255)
    im = im.copy(); im.putalpha(m); return im


def saida(p, pasta):
    any_ = arredondar(compor(p, .74))
    mask = compor(p, .60).convert('RGB')
    apple = compor(p, .74).convert('RGB')
    return {
        'app-icone-512-v2.png': any_.resize((512, 512), Image.LANCZOS),
        'app-icone-192-v2.png': any_.resize((192, 192), Image.LANCZOS),
        'app-icone-512-maskable-v2.png': mask.resize((512, 512), Image.LANCZOS),
        'app-icone-180-apple-v2.png': apple.resize((180, 180), Image.LANCZOS),
    }


def folha(pasta):
    """Cada proposta: ícone 256 + o mesmo em 120 / 60 (tela inicial) + máscara circular do Android e quadrada arredondada do iPhone."""
    W = 3 * 330 + 40
    f = Image.new('RGB', (W, 560), (236, 232, 226))
    for i, (k, p) in enumerate(PROPOSTAS.items()):
        x = 20 + i * 330
        base = compor(p, .74)
        f.paste(arredondar(base).resize((256, 256), Image.LANCZOS), (x, 20), arredondar(base).resize((256, 256), Image.LANCZOS))
        for j, t in enumerate((120, 60)):
            ic = arredondar(base).resize((t, t), Image.LANCZOS)
            f.paste(ic, (x + j * 140, 300), ic)
        mk = compor(p, .60).resize((120, 120), Image.LANCZOS)
        c = Image.new('L', (120, 120), 0); ImageDraw.Draw(c).ellipse([0, 0, 119, 119], fill=255)
        f.paste(mk, (x, 430), c)
        ImageDraw.Draw(f).text((x + 140, 450), f'{k} · {p["nome"]}', fill=CHOCO)
    return f


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--aprovar', choices=list(PROPOSTAS))
    ap.add_argument('--saida', default=os.path.join(RAIZ, 'public', 'images', 'caca', 'propostas-icone-v2'))
    a = ap.parse_args()
    if a.aprovar:
        pasta = os.path.join(RAIZ, 'public', 'images', 'caca')
        for nome, im in saida(PROPOSTAS[a.aprovar], pasta).items():
            im.save(os.path.join(pasta, nome), optimize=True)
        print('gravado em', pasta)
    else:
        os.makedirs(a.saida, exist_ok=True)
        for k, p in PROPOSTAS.items():
            compor(p, .74).resize((512, 512), Image.LANCZOS).save(os.path.join(a.saida, f'proposta-{k}.png'))
        folha(a.saida).save(os.path.join(a.saida, 'folha-conferencia.png'))
        print('propostas em', a.saida)
