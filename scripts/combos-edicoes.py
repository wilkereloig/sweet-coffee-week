# Fotos de combo por participante das edições 2017.2 a 2025 (14/10/2026).
#
# Lê scripts/combos-edicoes.json — a escolha, feita olhando as pastas
# "combos por participante" de acervo-bruto/EDIÇÕES DO FESTIVAL/COMBOS_ORGANIZADOS:
# para cada edição, o nome OFICIAL da marca (o mesmo de handoff/edicoesData.js)
# e o arquivo escolhido, de preferência o combo completo (doce, salgado e
# bebida) na mesma foto. Marca sem foto no acervo fica de fora — nunca a foto
# de outra marca no lugar.
#
# Escreve public/images/edicoes/<code>/combos/<slug>.webp (lado maior 1600px)
# e src/data/editionCombos.js. Depois rodar `npm run variantes` para as
# versões estreitas (-480/-960) e o imageVariants.js.
#
# Uso: python scripts/combos-edicoes.py   (acervo-bruto/ não vai para o git)
import json, os, re, unicodedata
from PIL import Image, ImageOps

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACERVO = os.path.join(RAIZ, 'acervo-bruto', 'EDIÇÕES DO FESTIVAL', 'COMBOS_ORGANIZADOS')
LADO = 1600


def slug(nome):
    s = unicodedata.normalize('NFKD', nome).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


escolha = json.load(open(os.path.join(RAIZ, 'scripts', 'combos-edicoes.json'), encoding='utf-8'))
manifesto = {}
for code, marcas in escolha.items():
    pasta = os.path.join(RAIZ, 'public', 'images', 'edicoes', code, 'combos')
    os.makedirs(pasta, exist_ok=True)
    lista = []
    for marca, arquivo in sorted(marcas.items(), key=lambda kv: kv[0].lower()):
        if not arquivo:
            continue
        destino = os.path.join(pasta, slug(marca) + '.webp')
        if not os.path.exists(destino):
            im = ImageOps.exif_transpose(Image.open(os.path.join(ACERVO, arquivo))).convert('RGB')
            im.thumbnail((LADO, LADO), Image.LANCZOS)
            im.save(destino, 'WEBP', quality=82, method=6)
        lista.append({'marca': marca, 'src': f'/images/edicoes/{code}/combos/{slug(marca)}.webp'})
    manifesto[code] = lista

linhas = ['// GERADO por scripts/combos-edicoes.py a partir de scripts/combos-edicoes.json.',
          '// Um combo por marca participante, edições 2017.2 a 2025. Não editar à mão.',
          'export const EDITION_COMBOS = {']
for code, lista in manifesto.items():
    itens = ',\n'.join(f'    {{ marca: {json.dumps(c["marca"], ensure_ascii=False)}, src: {json.dumps(c["src"])} }}' for c in lista)
    linhas.append(f'  {json.dumps(code)}: [\n{itens},\n  ],')
linhas.append('}')
with open(os.path.join(RAIZ, 'src', 'data', 'editionCombos.js'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(linhas) + '\n')
print({k: len(v) for k, v in manifesto.items()})
