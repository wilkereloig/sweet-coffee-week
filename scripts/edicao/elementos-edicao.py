"""Elementos novos da Cartoon (docs/cartoon-2026-2/10 §10.15): folhas geradas -> WebP do site.

Uso: python -I scripts/edicao/elementos-edicao.py <pasta saida> [<pasta saida> ...]
As pastas são as `saida` de 05_SITE/05_ELEMENTOS_v01, v02… (Dropbox F2): vale o arquivo
mais recente de cada prefixo (01..09) entre todas; `*.api.png` e `*.json` são ignorados.
Requer Pillow, numpy e scipy.

O que faz, em `public/images/marcas-edicoes/2026.2/elementos/`:
  icones/<nome>.webp            192x192 (exibição 32/48/64 px, até 3x)
  cena/tv-antiga.webp           lado maior até 1200
  cena/natal.webp               1536 de largura
  temas/<slug>/cenario.webp     1536 de largura
  temas/<slug>/objeto-a|b.webp  lado maior até 700

Cada peça é separada por COMPONENTE CONEXO do alfa, não por corte de grade: um
pé de TV ou um pompom que passa 5 px da célula não vira lasca na peça vizinha.
Depois apara pela caixa do alfa + 6% de folga. Faixas (cenário, Natal) aparam só
em cima e embaixo e seguem de ponta a ponta: o desenho sangra nas laterais e a
base tem que encostar no chão do topo da ficha. Nada é ampliado: se o recorte já
cabe no limite, fica como está.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

LIMIAR = 32      # alfa que conta como "tinta" ao achar as peças
DILATA = 5       # px: junta partes da mesma peça (carimbo + círculo, gotas + bule)
RUIDO = 30       # px: componente menor que isto é poeira
FOLGA = 0.06
Q_WEBP = 88

ICONES = ('inicio casas mapa rota avaliar premio no-local para-viagem delivery vegano sem-gluten '
          'sem-lactose sem-acucar endereco horario aberto-agora conversar como-chegar quero-ir ja-fui '
          'progresso compartilhar vazio erro').split()
KITS = {'casa-alice-doceria': ('04', '05'), 'boldfood-confeitaria-inclusiva': ('06', '07'),
        'adocee-doceria': ('08', '09')}

SAIDA = Path(__file__).resolve().parents[2] / 'public' / 'images' / 'marcas-edicoes' / '2026.2' / 'elementos'


def abrir(pastas, prefixo):
    """A folha mais recente do prefixo, com o alfa limpo (o gerador deixa 254 como 'opaco' e poeira abaixo de 12)."""
    achados = sorted((p for pasta in pastas for p in pasta.glob(f'{prefixo}-*.png') if not p.name.endswith('.api.png')),
                     key=lambda p: p.name)  # o nome termina na data: o último é o mais recente
    if not achados:
        sys.exit(f'sem arquivo {prefixo}-*.png em {[str(x) for x in pastas]}')
    im = Image.open(achados[-1]).convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda v: 0 if v < 12 else 255 if v >= 250 else v))
    return im


def pecas(im, colunas, linhas):
    """{(coluna, linha): imagem aparada à caixa do alfa}, uma por célula da grade, por componente conexo."""
    h, w = im.height, im.width
    alfa = np.asarray(im.getchannel('A'))
    tinta = alfa > LIMIAR
    rot, n = ndimage.label(ndimage.binary_dilation(tinta, iterations=DILATA))
    regioes = {}
    for k, caixa in enumerate(ndimage.find_objects(rot), start=1):
        reg = rot[caixa] == k
        pix = reg & tinta[caixa]
        if pix.sum() < RUIDO:
            continue
        ys, xs = np.nonzero(pix)
        cel = (min(int((xs.mean() + caixa[1].start) * colunas / w), colunas - 1),
               min(int((ys.mean() + caixa[0].start) * linhas / h), linhas - 1))
        regioes.setdefault(cel, []).append((caixa, reg))
    saida = {}
    for cel, lista in regioes.items():
        mascara = np.zeros((h, w), bool)
        for caixa, reg in lista:
            mascara[caixa] |= reg
        peca = im.copy()
        peca.putalpha(Image.fromarray(np.where(mascara, alfa, 0).astype(np.uint8)))
        saida[cel] = peca.crop(peca.getbbox())
    return saida


def com_folga(p, folga=FOLGA):
    mx, my = round(p.width * folga), round(p.height * folga)
    tela = Image.new('RGBA', (p.width + 2 * mx, p.height + 2 * my), (0, 0, 0, 0))
    tela.paste(p, (mx, my))
    return tela


def limitar(p, maior):
    """Reduz até o lado maior caber em `maior`; nunca amplia."""
    k = maior / max(p.size)
    return p if k >= 1 else p.resize((round(p.width * k), round(p.height * k)), Image.LANCZOS)


def quadrado(p, lado):
    s = round(max(p.size) * (1 + 2 * FOLGA))
    tela = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    tela.paste(p, ((s - p.width) // 2, (s - p.height) // 2))
    return tela.resize((lado, lado), Image.LANCZOS)


def faixa(im, largura):
    """Aparo só vertical (alfa); largura cheia da folha, levada a `largura`."""
    topo, base = im.getchannel('A').getbbox()[1::2]
    p = im.crop((0, topo, im.width, base))
    return p if p.width == largura else p.resize((largura, round(p.height * largura / p.width)), Image.LANCZOS)


def gravar(p, destino):
    destino.parent.mkdir(parents=True, exist_ok=True)
    p.save(destino, 'WEBP', quality=Q_WEBP, method=6)
    print(f'{destino.relative_to(SAIDA)}  {p.width}x{p.height}  {destino.stat().st_size / 1024:.0f} KB')


def main(pasta):  # `pasta`: lista de pastas `saida`
    folha = abrir(pasta, '01')
    por_celula = pecas(folha, 6, 4)
    faltam = [ICONES[i] for i in range(24) if (i % 6, i // 6) not in por_celula]
    if faltam or len(por_celula) != 24:
        sys.exit(f'grade de ícones fora do esperado ({len(por_celula)} células); sem peça: {faltam}')
    for i, nome in enumerate(ICONES):
        gravar(quadrado(por_celula[(i % 6, i // 6)], 192), SAIDA / 'icones' / f'{nome}.webp')

    gravar(limitar(com_folga(pecas(abrir(pasta, '02'), 1, 1)[(0, 0)]), 1200), SAIDA / 'cena' / 'tv-antiga.webp')
    gravar(faixa(abrir(pasta, '03'), 1536), SAIDA / 'cena' / 'natal.webp')

    for slug, (prefixo_faixa, prefixo_objetos) in KITS.items():
        gravar(faixa(abrir(pasta, prefixo_faixa), 1536), SAIDA / 'temas' / slug / 'cenario.webp')
        objetos = pecas(abrir(pasta, prefixo_objetos), 2, 1)
        if len(objetos) != 2:
            sys.exit(f'{slug}: esperava 2 objetos, achei {len(objetos)}')
        for lado, nome in ((0, 'objeto-a'), (1, 'objeto-b')):
            gravar(limitar(com_folga(objetos[(lado, 0)]), 700), SAIDA / 'temas' / slug / f'{nome}.webp')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main([Path(a) for a in sys.argv[1:]])
