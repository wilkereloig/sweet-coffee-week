"""Grandstander (OFL) -> woff2 com recorte latino, para a camada Cartoon.

Uso: python -I scripts/edicao/fonte-grandstander.py <grandstander.ttf> <OFL.txt>
A origem é a pasta assets/ do MANUAL-DIRECAO-VISUAL-CARTOON-v03 (Dropbox F2).
Mantém o eixo de peso (100-900): é a mesma fonte variável, só sem os glifos
que o site não usa.
"""
import shutil
import sys
from pathlib import Path

from fontTools import subset

origem, licenca = Path(sys.argv[1]), Path(sys.argv[2])
destino = Path(__file__).resolve().parents[2] / 'public' / 'fonts' / 'grandstander'
destino.mkdir(parents=True, exist_ok=True)

opcoes = subset.Options()
opcoes.flavor = 'woff2'
opcoes.layout_features = ['*']
opcoes.name_IDs = ['*']
fonte = subset.load_font(str(origem), opcoes)
recorte = subset.Subsetter(opcoes)
# Latim básico + Latim-1 (acentos do português) + pontuação tipográfica + € e ™.
recorte.populate(unicodes=[*range(0x20, 0x7F), *range(0xA0, 0x100), *range(0x2010, 0x2028), 0x20AC, 0x2122])
recorte.subset(fonte)
subset.save_font(fonte, str(destino / 'grandstander-latin.woff2'), opcoes)
shutil.copyfile(licenca, destino / 'OFL.txt')
print('ok', destino)
