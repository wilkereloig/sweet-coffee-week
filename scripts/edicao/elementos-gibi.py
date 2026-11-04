"""Elementos de gibi da Cartoon (repaginação de 04/11, docs/cartoon-2026-2/10 §10.17): folhas do Codex -> WebP do site.

Uso: python -I scripts/edicao/elementos-gibi.py "<pasta geracoes>"
A pasta é 05_SITE/11_REPAGINACAO_DESENHO/geracoes (Dropbox F2). Requer Pillow, numpy e scipy.

O que faz, em `public/images/marcas-edicoes/2026.2/elementos/gibi/`:
  mesa.webp                          a mesa do combo (doce, salgado, bebida), lado maior até 1200
  objetos/<nome>.webp                loja · bandeja · prancheta · pino · megafone · despertador, lado maior até 480
  luvas/<nome>.webp                  aponta · joinha · segura · acena, lado maior até 360
  palco.webp                         o palco do Sweet Awards (cena inteira, sem recorte), 1600 de largura

O fundo das folhas é chapado (branco nas peças, turquesa nas luvas): vira transparente o que tem a cor do fundo E
toca a borda da imagem (o contorno preto fecha cada desenho, então o branco de dentro — luva, chantilly — fica).
A franja de 2 px entre o contorno e o fundo vira tinta com alfa pela claridade, sem halo claro em fundo colorido.
Cada peça é um componente conexo do alfa, juntando riscos de movimento e brilhos próximos (dilatação).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SAIDA = Path(__file__).resolve().parents[2] / 'public/images/marcas-edicoes/2026.2/elementos/gibi'
TOL = 46          # distância de cor (RGB) que ainda conta como fundo
POEIRA = 400      # px²: componente menor que isto não é peça
FOLGA = 0.05
Q = 88

OBJETOS = ['loja', 'bandeja', 'prancheta', 'pino', 'megafone', 'despertador']  # 3 × 2, por linha
LUVAS = ['aponta', 'joinha', 'segura', 'acena']                                # 1 linha


def recortar_fundo(im):
    rgb = np.asarray(im.convert('RGB')).astype(np.int32)
    h, w, _ = rgb.shape
    borda = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    fundo_cor = np.median(borda, axis=0)
    dist = np.sqrt(((rgb - fundo_cor) ** 2).sum(axis=2))
    parecido = dist < TOL
    rotulos, _ = ndimage.label(parecido)
    na_borda = np.unique(np.concatenate([rotulos[0], rotulos[-1], rotulos[:, 0], rotulos[:, -1]]))
    fundo = np.isin(rotulos, na_borda[na_borda > 0])
    alfa = np.where(fundo, 0, 255).astype(np.float64)
    franja = ndimage.binary_dilation(fundo, iterations=2) & ~fundo
    # Na franja: quanto mais perto da cor do fundo, mais transparente; a cor vira a tinta do contorno.
    lum = rgb.sum(axis=2) / 3
    lum_fundo = fundo_cor.sum() / 3
    a = np.clip(1 - lum / max(lum_fundo, 1), 0, 1) * 255
    alfa[franja] = a[franja]
    saida = rgb.copy()
    saida[franja] = [28, 14, 12]
    rgba = np.dstack([saida, alfa]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')


def pecas(im, linhas, colunas):
    """Uma máscara por célula da grade: cada componente do alfa vai para a célula do seu centro. Assim os riscos
    e brilhos soltos ficam com o desenho da célula, sem a dilatação juntar peças vizinhas."""
    alfa = np.asarray(im.getchannel('A')) > 24
    rotulos, n = ndimage.label(ndimage.binary_dilation(alfa, iterations=3))
    h, w = alfa.shape
    celulas = [np.zeros_like(alfa) for _ in range(linhas * colunas)]
    for i, fatia in enumerate(ndimage.find_objects(rotulos), start=1):
        comp = (rotulos[fatia] == i) & alfa[fatia]
        if comp.sum() < POEIRA:
            continue
        ys, xs = np.nonzero(comp)
        cy, cx = fatia[0].start + ys.mean(), fatia[1].start + xs.mean()
        k = min(int(cy / h * linhas), linhas - 1) * colunas + min(int(cx / w * colunas), colunas - 1)
        celulas[k][fatia] |= comp
    return celulas


def cortar(im, mascara):
    arr = np.asarray(im).copy()
    arr[..., 3] = np.where(mascara, arr[..., 3], 0)
    ys, xs = np.nonzero(mascara)
    peca = Image.fromarray(arr).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    fw, fh = int(peca.width * FOLGA), int(peca.height * FOLGA)
    tela = Image.new('RGBA', (peca.width + 2 * fw, peca.height + 2 * fh), (0, 0, 0, 0))
    tela.paste(peca, (fw, fh))
    return tela


def gravar(p, destino, maior):
    p = p.copy()
    p.thumbnail((maior, maior), Image.LANCZOS)
    destino.parent.mkdir(parents=True, exist_ok=True)
    p.save(destino, 'WEBP', quality=Q, method=6)
    print(destino.relative_to(SAIDA.parents[4]), p.size)


def folha(arquivo, nomes, linhas, pasta, maior):
    im = recortar_fundo(Image.open(arquivo))
    colunas = len(nomes) // linhas
    for nome, mascara in zip(nomes, pecas(im, linhas, colunas)):
        if not mascara.any():
            sys.exit(f'{arquivo.name}: célula de {nome} vazia')
        gravar(cortar(im, mascara), SAIDA / pasta / f'{nome}.webp', maior)


def main(pasta):
    pasta = Path(pasta)
    mesa = recortar_fundo(Image.open(pasta / 'mesa-do-combo_v1.png'))
    gravar(cortar(mesa, pecas(mesa, 1, 1)[0]), SAIDA / 'mesa.webp', 1200)
    folha(pasta / 'objetos-dos-passos_v1.png', OBJETOS, 2, 'objetos', 480)
    folha(pasta / 'luvas_v2.png', LUVAS, 1, 'luvas', 360)
    palco = Image.open(pasta / 'palco-awards_v1.png').convert('RGB')
    palco.thumbnail((1600, 1600), Image.LANCZOS)
    palco.save(SAIDA / 'palco.webp', 'WEBP', quality=84, method=6)
    print('palco.webp', palco.size)


if __name__ == '__main__':
    main(sys.argv[1])
