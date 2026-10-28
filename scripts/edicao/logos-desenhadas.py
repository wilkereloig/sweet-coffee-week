"""Logos desenhadas das casas da Cartoon (spec 10 §10.14) -> public/retrato-local/ + retrato local.

    python -I scripts/edicao/logos-desenhadas.py [pasta ILUSTRACOES_DERIVADAS]

Fonte (Dropbox da edição): PRETAS/<slug>_A-rascunho.png e COLORIDAS/<slug>_B-colorido.png.
Saída (fora do git, public/retrato-local/ está no .gitignore):
    public/retrato-local/logos-desenhadas/<slug>-pb.webp   e   <slug>-cor.webp

As duas versões saem SEMPRE com a mesma medida (800 x 800) e o mesmo enquadramento:
o quadrado inteiro do arquivo, sem recorte e sem aparar margem. O efeito "tinta espalhando"
(E6) sobrepõe uma imagem à outra, então qualquer recorte por imagem desalinharia as duas.
Arquivo não quadrado ganha fundo branco até ficar quadrado, antes de reduzir.

Depois grava `casa.logo_desenhada = {pb, cor, largura, altura}` em cada casa do
src/edicao/dados/retrato/cartoon.local.json que tenha o par (as demais ficam sem o campo).
Idempotente: regera tudo a cada rodada (alguns segundos).
"""
import json
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
FONTE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    'F:/F2 Experience Dropbox/Criação ELOI Design/SWEET&COFFEE WEEK/2026.2 SCW CARTOONS'
    '/10_LOGOS_PARTICIPANTES/ILUSTRACOES_DERIVADAS')
SAIDA = RAIZ / 'public' / 'retrato-local' / 'logos-desenhadas'
RETRATO = RAIZ / 'src' / 'edicao' / 'dados' / 'retrato' / 'cartoon.local.json'
LADO = 800
QUALIDADE = 84
# Nome do arquivo na pasta do Dropbox -> slug da casa no site (o resto casa pelo próprio nome).
APELIDOS = {
    'casa-1190': 'casa-1190-restaurante-e-coffee',
    'just-food-coffee': 'just-food-e-coffee',
    'marlon-vinicius': 'marlon-vinicius-confeitaria-e-cafe',
}


def quadrado(caminho: Path) -> Image.Image:
    img = Image.open(caminho)
    img.load()
    if img.mode in ('RGBA', 'LA', 'P'):
        img = img.convert('RGBA')
        fundo = Image.new('RGBA', img.size, (255, 255, 255, 255))
        img = Image.alpha_composite(fundo, img)
    img = img.convert('RGB')
    lado = max(img.size)
    if img.size != (lado, lado):
        tela = Image.new('RGB', (lado, lado), (255, 255, 255))
        tela.paste(img, ((lado - img.width) // 2, (lado - img.height) // 2))
        img = tela
    return img.resize((LADO, LADO), Image.LANCZOS)


def main() -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    pares = {}
    for pb in sorted((FONTE / 'PRETAS').glob('*_A-rascunho.png')):
        nome = pb.name[: -len('_A-rascunho.png')]
        cor = FONTE / 'COLORIDAS' / f'{nome}_B-colorido.png'
        if not cor.exists():
            print(f'sem par colorido, ignorada: {nome}')
            continue
        slug = APELIDOS.get(nome, nome)
        a, b = quadrado(pb), quadrado(cor)
        assert a.size == b.size == (LADO, LADO), slug
        a.save(SAIDA / f'{slug}-pb.webp', 'WEBP', quality=QUALIDADE, method=6)
        b.save(SAIDA / f'{slug}-cor.webp', 'WEBP', quality=QUALIDADE, method=6)
        pares[slug] = {
            'pb': f'/retrato-local/logos-desenhadas/{slug}-pb.webp',
            'cor': f'/retrato-local/logos-desenhadas/{slug}-cor.webp',
            'largura': LADO, 'altura': LADO,
        }
    print(f'{len(pares)} pares gerados em {SAIDA}')

    if not RETRATO.exists():
        print('retrato local ausente: nada a atualizar (rode retrato-salvar.mjs antes)')
        return
    dados = json.loads(RETRATO.read_text(encoding='utf-8'))
    com, sem = [], []
    for p in dados['participantes']:
        par = pares.get(p['slug'])
        if par:
            p['casa']['logo_desenhada'] = par
            com.append(p['slug'])
        else:
            p['casa'].pop('logo_desenhada', None)
            sem.append(p['slug'])
    dados['retrato']['logos_desenhadas'] = len(com)
    with open(RETRATO, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(dados, indent=2, ensure_ascii=False) + '\n')
    print(f'retrato: {len(com)} casas com logo desenhada; sem o par: {", ".join(sem) or "nenhuma"}')


if __name__ == '__main__':
    main()
