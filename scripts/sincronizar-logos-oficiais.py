#!/usr/bin/env python3
"""
Sincroniza as logos OFICIAIS da edição para o acervo do site.

Fonte única (decisão do Wilker, 15/10/2026): a pasta `10_LOGOS_PARTICIPANTES/PRINCIPAIS`
da edição Cartoon no Dropbox — um PNG por marca, nome do arquivo = nome da marca no painel,
em alta resolução (até 6000 px). O site não carrega arquivo desse tamanho: este script gera
`public/logos/participants/<slug>.png` em até 800 px (nunca amplia) e é o único caminho
para trocar uma logo. Rodar de novo quando a pasta mudar:

    python scripts/sincronizar-logos-oficiais.py            # pasta padrão do Dropbox
    python scripts/sincronizar-logos-oficiais.py <pasta>    # outra pasta
    python scripts/sincronizar-logos-oficiais.py --lado 1080

Depois: `node scripts/acervo-logos-para-sql.mjs` (acervo_logos) e commit. Requer Pillow.
slug = nome do arquivo sem acento/pontuação, minúsculo, com hífen — exceto os da tabela
EXCECOES, que já existiam no acervo com outro slug. Marca fora do registro Lovers
(src/data/participants.js) entra em src/data/logosAcervoExtras.js (conferido no final).
"""
import os
import re
import sys
import unicodedata
from pathlib import Path

from PIL import Image

PADRAO = Path(r"F:/F2 Experience Dropbox/Criação ELOI Design/SWEET&COFFEE WEEK/2026.2 SCW CARTOONS/10_LOGOS_PARTICIPANTES/PRINCIPAIS")
DESTINO = Path(__file__).resolve().parent.parent / "public" / "logos" / "participants"
# nome do arquivo (sem extensão e sem parênteses) -> slug que o site já usa
EXCECOES = {
    "casa-1190-restaurante-e-coffee": "casa-1190",
    "marlon-vinicius": "marlon-vinicius-confeitaria-e-cafe",
}


def slug(nome: str) -> str:
    nome = re.sub(r"\(.*?\)", "", nome)
    nome = re.sub(r"['’`´]", "", nome)  # Canuto's -> canutos (e não canuto-s)
    s = unicodedata.normalize("NFD", nome)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return EXCECOES.get(s, s)


def main() -> int:
    args = [a for a in sys.argv[1:]]
    lado = 800
    if "--lado" in args:
        i = args.index("--lado")
        lado = int(args[i + 1])
        del args[i : i + 2]
    origem = Path(args[0]) if args else PADRAO
    if not origem.is_dir():
        print("pasta de origem não existe:", origem)
        return 1
    DESTINO.mkdir(parents=True, exist_ok=True)
    total = 0
    for f in sorted(origem.iterdir(), key=lambda p: p.name.lower()):
        if f.suffix.lower() != ".png":
            continue
        im = Image.open(f)
        if max(im.size) > lado:  # nunca amplia
            k = lado / max(im.size)
            im = im.resize((round(im.size[0] * k), round(im.size[1] * k)), Image.LANCZOS)
        nome = slug(f.stem)
        saida = DESTINO / f"{nome}.png"
        im.save(saida, optimize=True)
        kb = os.path.getsize(saida) // 1024
        total += kb
        print(f"{f.name[:46]:48} -> {nome}.png  {im.size[0]}x{im.size[1]}  {kb} KB")
    print("total", total, "KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
