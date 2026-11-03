"""Logos desenhadas das casas da Cartoon (spec 10 §10.14) -> arquivos do site + retrato local.

    python -I scripts/edicao/logos-desenhadas.py [pasta ILUSTRACOES_DERIVADAS]

Fonte (Dropbox da edição): PRETAS/<slug>_A-rascunho.png e COLORIDAS/<slug>_B-colorido.png.
Saída VERSIONADA desde 03/11/2026 (lista 13, B7 — arte da edição, pública como os pins e os kits):
    public/images/marcas-edicoes/2026.2/logos-desenhadas/<slug>-pb.webp e <slug>-cor.webp  (480 x 480)
    public/images/marcas-edicoes/2026.2/logos-desenhadas/<slug>-pin.webp  (a colorida aparada, 96 px de altura: pin do mapa)
    src/data/logosDesenhadasEdicao.js  — a lista de slugs (gerada; o imageLibrary monta os caminhos)

As duas versões saem SEMPRE com a mesma medida e o mesmo enquadramento:
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
SAIDA = RAIZ / 'public' / 'images' / 'marcas-edicoes' / '2026.2' / 'logos-desenhadas'
URL = '/images/marcas-edicoes/2026.2/logos-desenhadas'
LISTA = RAIZ / 'src' / 'data' / 'logosDesenhadasEdicao.js'
RETRATO = RAIZ / 'src' / 'edicao' / 'dados' / 'retrato' / 'cartoon.local.json'
LADO = 480
ALTURA_PIN = 96  # 44 px na tela, 2x para tela densa
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


def recorte_do_pin(caminho: Path) -> Image.Image:
    """O pin do mapa é uma placa de 44 px de altura: corta a margem branca em volta do traço (folga de 8%),
    mantém a proporção da logo — no máximo 2:1, o resto vira margem branca em cima e embaixo — e reduz para
    ALTURA_PIN. Logo larga (letreiro) fica legível; redonda vira quase quadrada. Só o pin: o par P&B/cor
    mantém o quadrado inteiro."""
    img = quadrado(caminho)
    caixa = img.convert('L').point(lambda v: 255 if v < 235 else 0).getbbox()
    if caixa:
        folga = round(max(caixa[2] - caixa[0], caixa[3] - caixa[1]) * 0.08)
        img = img.crop((max(0, caixa[0] - folga), max(0, caixa[1] - folga),
                        min(img.width, caixa[2] + folga), min(img.height, caixa[3] + folga)))
    if img.width > img.height * 2:
        tela = Image.new('RGB', (img.width, img.width // 2), (255, 255, 255))
        tela.paste(img, (0, (tela.height - img.height) // 2))
        img = tela
    elif img.height > img.width:
        tela = Image.new('RGB', (img.height, img.height), (255, 255, 255))
        tela.paste(img, ((tela.width - img.width) // 2, 0))
        img = tela
    return img.resize((round(img.width * ALTURA_PIN / img.height), ALTURA_PIN), Image.LANCZOS)


def main() -> None:
    # Sem o Dropbox (F: desmontado), a lista sairia vazia e o site perderia TODAS as logos desenhadas e pins.
    if not (FONTE / 'PRETAS').is_dir() or not (FONTE / 'COLORIDAS').is_dir():
        sys.exit(f'pasta das ilustrações não encontrada: {FONTE} (Dropbox montado?) — nada foi alterado')
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
        recorte_do_pin(cor).save(SAIDA / f'{slug}-pin.webp', 'WEBP', quality=88, method=6)
        pares[slug] = {
            'pb': f'{URL}/{slug}-pb.webp',
            'cor': f'{URL}/{slug}-cor.webp',
            'largura': LADO, 'altura': LADO,
        }
    if not pares:
        sys.exit('nenhum par P&B + colorido encontrado — a lista não foi regravada')
    print(f'{len(pares)} pares gerados em {SAIDA}')
    with open(LISTA, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// GERADO por scripts/edicao/logos-desenhadas.py — não editar à mão. Sem dependências: a camada de\n'
                '// dados (publico.js) importa daqui; componentes usam o reexport de src/data/imageLibrary.js.\n'
                f"const PASTA = '{URL}'\n"
                'export const LOGOS_DESENHADAS_EDICAO = ' + json.dumps(sorted(pares), ensure_ascii=False, indent=2) + '\n\n'
                '/** Logo desenhada da casa (P&B + colorida, 480 px; pin do mapa: a colorida aparada, 96 px de altura), ou null. */\n'
                'export function logoDesenhadaEdicao (slug) {\n'
                '  if (!LOGOS_DESENHADAS_EDICAO.includes(slug)) return null\n'
                '  return {\n'
                '    pb: `${PASTA}/${slug}-pb.webp`, cor: `${PASTA}/${slug}-cor.webp`, largura: ' + str(LADO) + ', altura: ' + str(LADO) + ',\n'
                '    pin: { src: `${PASTA}/${slug}-pin.webp` },\n'
                '  }\n'
                '}\n')

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
