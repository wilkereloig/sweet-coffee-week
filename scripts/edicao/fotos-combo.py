"""Fotos aprovadas dos combos da Cartoon -> public/retrato-local/ + retrato local.

    python -I scripts/edicao/fotos-combo.py [pasta 03_COMBOS/02_ARTES]

Fonte (Dropbox da edição): 02_ARTES/<pasta>/<pasta>_<peça>_aprovada-vN.png, só a raiz
de cada pasta (com-tarja/ fica de fora). De cada peça vale a maior versão N.
    combo            -> combo.fotos.principal
    doce/salgado/... -> itens[].foto, pelo tipo do item
    o resto (doce-cortado, salgado-cortado, bebida2, doce2...) -> combo.fotos.galeria
Saída (fora do git, public/retrato-local/ está no .gitignore):
    public/retrato-local/combos/<slug>/<peça>.webp   1200 x 1500 (4:5, o formato da sessão)

Grava os caminhos em src/edicao/dados/retrato/cartoon.local.json, no formato da
projeção pública ({path, largura, altura, alt}). Idempotente: regera tudo a cada rodada.
Roda depois de retrato-salvar.mjs, que reescreve o JSON sem as fotos.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
FONTE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    'F:/F2 Experience Dropbox/Criação ELOI Design/SWEET&COFFEE WEEK/2026.2 SCW CARTOONS'
    '/03_COMBOS/02_ARTES')
SAIDA = RAIZ / 'public' / 'retrato-local' / 'combos'
RETRATO = RAIZ / 'src' / 'edicao' / 'dados' / 'retrato' / 'cartoon.local.json'
TAMANHO = (1200, 1500)
QUALIDADE = 82
# Pasta do Dropbox -> slug da casa no site (o resto casa pelo próprio nome).
APELIDOS = {
    'casa-1190': 'casa-1190-restaurante-e-coffee',
    'just-food-coffee': 'just-food-e-coffee',
    'marlon-vinicius': 'marlon-vinicius-confeitaria-e-cafe',
    'mr-cupcake': 'mr-cupcake-confeitaria',
}
NOME = re.compile(r'^(?P<pasta>.+?)_(?P<peca>[a-z0-9-]+)_aprovada-v(?P<v>\d+)\.png$')
ROTULO = {'doce': 'Doce', 'salgado': 'Salgado', 'bebida': 'Bebida'}
# Ordem da galeria: cortados primeiro, depois as opções alternativas.
ORDEM_GALERIA = ['doce-cortado', 'salgado-cortado', 'doce2', 'salgado2', 'bebida2', 'bebida3']


def pecas(pasta: Path) -> dict:
    """{peça: arquivo da maior versão} da raiz da pasta."""
    melhor = {}
    for f in pasta.glob('*_aprovada-v*.png'):
        m = NOME.match(f.name)
        if not m:
            continue
        v = int(m['v'])
        if m['peca'] not in melhor or v > melhor[m['peca']][0]:
            melhor[m['peca']] = (v, f)
    return {p: f for p, (_, f) in melhor.items()}


def gravar(arquivo: Path, slug: str, peca: str, alt: str) -> dict:
    img = Image.open(arquivo).convert('RGB')
    assert abs(img.width / img.height - 0.8) < 0.01, f'{arquivo.name} não é 4:5 ({img.size})'
    destino = SAIDA / slug
    destino.mkdir(parents=True, exist_ok=True)
    img.resize(TAMANHO, Image.LANCZOS).save(destino / f'{peca}.webp', 'WEBP', quality=QUALIDADE, method=6)
    return {'path': f'/retrato-local/combos/{slug}/{peca}.webp', 'largura': TAMANHO[0], 'altura': TAMANHO[1], 'alt': alt}


def rotulo_galeria(peca: str) -> str:
    base, cortado = peca.removesuffix('-cortado'), peca.endswith('-cortado')
    tipo = ROTULO.get(base.rstrip('0123456789'), base).lower()
    return f'{tipo.capitalize()} cortado' if cortado else f'Outra opção de {tipo}'


def main() -> None:
    if not RETRATO.exists():
        sys.exit('retrato local ausente: rode retrato-salvar.mjs antes')
    dados = json.loads(RETRATO.read_text(encoding='utf-8'))
    casas = {p['slug']: p for p in dados['participantes']}
    for p in casas.values():  # recomeça do zero: pasta que sumiu não deixa foto velha
        if p.get('combo'):
            p['combo']['fotos'] = {}
            for item in p['combo'].get('itens', []):
                item.pop('foto', None)
    com, sem = [], []
    for pasta in sorted(d for d in FONTE.iterdir() if d.is_dir() and not d.name.startswith('_')):
        slug = APELIDOS.get(pasta.name, pasta.name)
        p = casas.get(slug)
        if not p or not p.get('combo'):
            print(f'pasta sem casa/combo no retrato, ignorada: {pasta.name}')
            continue
        achadas = pecas(pasta)
        if 'combo' not in achadas:
            sem.append(slug)
            continue
        nome, combo = p['casa']['nome'], p['combo']
        combo['fotos'] = {'principal': gravar(achadas.pop('combo'), slug, 'combo', f'Combo da {nome} na Sweet & Coffee Week Cartoon')}
        for item in combo.get('itens', []):
            arq = achadas.pop(item['tipo'], None)
            if arq:
                desc = f": {item['nome']}" if item.get('nome') else ''
                item['foto'] = gravar(arq, slug, item['tipo'], f"{ROTULO.get(item['tipo'], item['tipo'])} do combo da {nome}{desc}")
        resto = sorted(achadas, key=lambda k: ORDEM_GALERIA.index(k) if k in ORDEM_GALERIA else len(ORDEM_GALERIA))
        if resto:
            combo['fotos']['galeria'] = [gravar(achadas[k], slug, k, f'{rotulo_galeria(k)} do combo da {nome}') for k in resto]
        com.append(slug)
    sem += [s for s, p in casas.items() if p.get('combo') and s not in com and s not in sem]
    dados['retrato']['fotos_combo'] = len(com)
    with open(RETRATO, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(dados, indent=2, ensure_ascii=False) + '\n')
    print(f'retrato: {len(com)} casas com foto de combo; sem: {", ".join(sem) or "nenhuma"}')


if __name__ == '__main__':
    main()
