"""Cidade da edição Cartoon para a seção da Home institucional (16/11/2026).

    python -I scripts/edicao/cidade-home.py

Recorte da ARTE FINAL do Mapa da Doçura (base limpa, gerada por mapa-mundo-final.py): sai a faixa do topo, que
traz o selo e o letreiro "Mapa da Doçura" pintados na arte — na Home o selo oficial entra por cima, como marca, e
o mapa não é mais um produto no ar. Nada é redesenhado nem retocado: só corte e redução.

Lê   public/images/marcas-edicoes/2026.2/mundo/base-final-v1-limpa-4096.webp
Grava public/images/marcas-edicoes/2026.2/mundo/cidade-home-<largura>.webp  (768, 1280, 1920)

As medidas ficam em CIDADE_HOME, em src/data/imageLibrary.js (o teste confere arquivo e proporção). A arte inteira,
para a ampliação, continua vindo de mundoEdicao().base. Determinístico: mesma entrada, mesma saída.
"""
from pathlib import Path
from PIL import Image

PASTA = Path(__file__).resolve().parents[2] / "public/images/marcas-edicoes/2026.2/mundo"
TOPO = 0.145  # fração da altura cortada no topo (selo + letreiro pintados na arte)
LARGURAS = (768, 1280, 1920)

arte = Image.open(PASTA / "base-final-v1-limpa-4096.webp").convert("RGB")
w, h = arte.size
corte = arte.crop((0, round(h * TOPO), w, h))
for largura in LARGURAS:
    altura = round(corte.height * largura / corte.width)
    saida = PASTA / f"cidade-home-{largura}.webp"
    corte.resize((largura, altura), Image.LANCZOS).save(saida, "WEBP", quality=74, method=6)
    print(f"{saida.name}  {largura}x{altura}  {saida.stat().st_size // 1024} KB")
