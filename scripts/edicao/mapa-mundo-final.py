"""Mundo da Doçura — ARTE FINAL do Illustrator -> arquivos e dados do site (docs/cartoon-2026-2/15-caca-mapa-final.md).

    python -I scripts/edicao/mapa-mundo-final.py [--ai MAPA_IMPRESSÃO.ai] [--com-bandeiras] [--provisoria] [--verificacao saida.png]

Fonte (Dropbox da edição, 06_MATERIAIS_PDV/03_MAPA_IMPRESSO/04_SINALIZACAO/): MAPA_IMPRESSÃO.ai, salvo pelo Illustrator
como PDF compatível — o script LÊ o arquivo (PyMuPDF), nunca grava nele e nunca precisa do Illustrator. Pode-se passar uma
cópia (`--ai`). Duas pranchetas de 216 x 154 mm (A5 deitado 210 x 148 + 3 mm de sangria):
    página 0  verso: LEGENDA OFICIAL (nº, nome da casa, tema) — texto vivo; a bandeira de cada linha é imagem
    página 1  frente: a ARTE DO MAPA — base 6050 x 4314 px + 27 bandeiras de casa + 3 bandeiras da Sicredi (imagens
              coladas, o número está rasterizado) + título + selo + faixa de aviso e cartão "Patrocinador" (só impressão)

O que sai para o site (cópias; o .ai e os PNGs do Wilker ficam intactos):
    · a arte da frente SEM sangria (corta 3 mm de cada lado) e SEM a faixa de aviso e o cartão da Sicredi: são peças de
      papel (o site tem o aviso próprio, acessível, e a Sicredi tem marcador e rótulo próprios). Os dois objetos saem do
      PDF em memória (redação de vetores); o mapa que estava por baixo aparece, nada é pintado por cima.
    · PADRÃO (05/11, pedido do Wilker): BASE LIMPA — sai também cada bandeira (27 de casa + 3 da Sicredi, imagens coladas) e a
      sombra vetorial de cada uma; ficam a base v8, o título e o selo. O site desenha os marcadores por código (logo da casa).
      `--com-bandeiras` regenera a variante da arte com as bandeiras (reserva; `arteComBandeiras: true`).
    public/images/marcas-edicoes/2026.2/mundo/base-final-v1-limpa-<largura>.webp   1024 (primeira pintura), 2048, 3072, 4096
    (com --com-bandeiras: base-final-v1-<largura>.webp; uma variante nunca apaga a outra)
    src/data/mundoEdicao.js — dados (GERADO, não editar à mão): posição de cada bandeira (0 a 1 sobre a imagem exportada),
    número da legenda, casas por slug, unidades -> ponto da casa, Sicredi, marcos, placeholder borrado, metadados da arte.
Não apaga as imagens provisórias (base-v2-*, bandeiras/, logos/...). `--provisoria` grava `aprovada: false` (a arte
continua a final; só o selo de aprovação sai). Reverter por completo: `python -I scripts/edicao/mapa-mundo.py`.

Confere (e imprime como PENDÊNCIA, nunca corrige em silêncio): 27 bandeiras de casa e 3 da Sicredi; números 1..27 uma vez
cada, lidos do numeral e casados com a imagem da legenda; nomes da legenda x casas do retrato local; temas; unidades.
`--verificacao` desenha pontos, raios, caixas e números sobre a arte exportada, para conferir bandeira por bandeira a olho.
Determinístico: mesma entrada, mesma saída (nenhum segredo; nenhuma rede).
"""
import argparse
import base64
import io
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import pymupdf as fitz
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parents[2]
PASTA = Path('F:/F2 Experience Dropbox/Criação ELOI Design/SWEET&COFFEE WEEK/2026.2 SCW CARTOONS'
             '/06_MATERIAIS_PDV/03_MAPA_IMPRESSO')
AI_PADRAO = PASTA / '04_SINALIZACAO' / 'MAPA_IMPRESSÃO.ai'
PONTOS_SICREDI = PASTA / '01_RASCUNHO_POSICOES' / '_bastidores' / 'pontos-sicredi.json'
SAIDA = RAIZ / 'public' / 'images' / 'marcas-edicoes' / '2026.2' / 'mundo'
DADOS = RAIZ / 'src' / 'data' / 'mundoEdicao.js'
RETRATO = RAIZ / 'src' / 'edicao' / 'dados' / 'retrato' / 'cartoon.local.json'

ARQUIVO_COM = 'base-final-v1'                   # arte com as bandeiras (reserva); arte nova = -v2 (os antigos não são apagados)
ARQUIVO_LIMPA = 'base-final-v1-limpa'           # base sem bandeiras (padrão)
LARGURAS = {1024: 74, 2048: 74, 3072: 74, 4096: 74}   # largura -> qualidade WebP; a menor é a primeira pintura (<= 350 KB)
PLACEHOLDER_W = 48                              # placeholder borrado: 48 px, ~1 KB
SANGRIA_MM = 3
PAGINA_LEGENDA, PAGINA_MAPA = 0, 1
# Peças só de papel na frente (pt, página 1); conferidas contra o conteúdo antes de tirar.
AVISO_RETANGULO = fitz.Rect(40, 406, 404, 418)      # "Ilustração fora de escala..."
CARTAO_RETANGULO = fitz.Rect(414, 338, 573, 418)    # cartão "PATROCINADOR / Sicredi"
# Bandeira de casa: 152 x 156 px; Sicredi: 166 x 170 px (imagens coladas no .ai).
TAM_CASA, TAM_SICREDI = (152, 156), (166, 170)
# Marcos (nome, x, y) sobre a arte exportada, 0 a 1 — lidos a olho na arte final (ilustrativos, como tudo no mapa).
MARCOS = [('Forte dos Reis Magos', 0.206, 0.186), ('Ponte Newton Navarro', 0.131, 0.547),
          ('Arena das Dunas', 0.4885, 0.5106), ('Morro do Careca', 0.925, 0.07)]
# A arte não diz qual agência é qual: as três bandeiras são iguais e sem nome. Atribuição por geografia desenhada e pela
# instrução do Wilker de 04/11 (a agência "depois da ponte" é a de São Gonçalo do Amarante): da esquerda para a direita
# da arte = São Gonçalo (ao pé da ponte), Natal (sede, centro), Cidade Verde (extremo sul). É INFERÊNCIA: pendência para o Wilker.
SICREDI_POR_ORDEM_DE_X = ['Sicredi São Gonçalo do Amarante', 'Sicredi Natal (sede)', 'Sicredi Shopping Cidade Verde']


def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def argumentos():
    p = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    p.add_argument('--ai', type=Path, default=AI_PADRAO)
    p.add_argument('--provisoria', action='store_true', help='grava aprovada: false')
    p.add_argument('--com-bandeiras', action='store_true', help='variante da arte com as bandeiras (reserva)')
    p.add_argument('--verificacao', type=Path, help='PNG com pontos, raios e números sobre a arte')
    return p.parse_args()


def imagem_rgba(doc, xref):
    pix = fitz.Pixmap(doc, xref)
    if pix.colorspace.n != 3:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    sm = doc.xref_get_key(xref, 'SMask')
    if sm[0] == 'xref':
        mk = fitz.Pixmap(doc, int(sm[1].split()[0]))
        a = Image.frombytes('L', (mk.width, mk.height), mk.samples)
        im.putalpha(a if a.size == im.size else a.resize(im.size, Image.LANCZOS))
    else:
        im = im.convert('RGBA')
    return im


def legenda(doc):
    """[{numero, nome, tema, imagem}] na ordem da legenda (3 colunas, de cima para baixo); o numero é a posição."""
    pg = doc[PAGINA_LEGENDA]
    cols = {}
    for blk in pg.get_text('dict')['blocks']:
        for ln in blk.get('lines', []):
            for sp in ln['spans']:
                t, cor = sp['text'].strip(), f"{sp['color']:06x}"
                if t and cor in ('3a150f', 'e8195a') and sp['bbox'][0] < 400 and 55 < sp['bbox'][1] < 365:
                    cols.setdefault(round(sp['bbox'][0]), []).append((sp['bbox'][1], cor, t))
    entradas = []
    for x in sorted(cols):
        atual, depois_tema = None, False
        for _, cor, t in sorted(cols[x]):
            nome = cor == '3a150f'
            if nome and (atual is None or depois_tema):
                atual = {'nome': [], 'tema': []}
                entradas.append(atual)
            atual['nome' if nome else 'tema'].append(t)
            depois_tema = not nome
    imgs = sorted((i for i in pg.get_image_info(xrefs=True) if (i['width'], i['height']) == (81, 82)),
                  key=lambda i: (round(i['bbox'][0] / 10), i['bbox'][1]))
    if len(entradas) != 27 or len(imgs) != 27:
        sys.exit(f'legenda inesperada: {len(entradas)} entradas e {len(imgs)} bandeiras (esperado 27 e 27)')
    return [{'numero': n, 'nome': ' '.join(e['nome']), 'tema': ' '.join(e['tema']), 'xref': i['xref']}
            for n, (e, i) in enumerate(zip(entradas, imgs), 1)]


def mascara_numeral(im):
    """Máscara do numeral branco no centro do pano, normalizada em 64 x 32 (aspecto preservado)."""
    a = np.asarray(im.convert('RGBA'))
    h, w = a.shape[:2]
    br = (a[..., 0] > 205) & (a[..., 1] > 205) & (a[..., 2] > 205) & (a[..., 3] > 200)
    br[:, : int(w * .22)] = False
    br[: int(h * .12)] = False
    br[int(h * .72):] = False
    ys, xs = np.nonzero(br)
    rec = Image.fromarray((br[ys.min():ys.max() + 1, xs.min():xs.max() + 1] * 255).astype(np.uint8))
    rec = rec.resize((max(1, round(rec.width * 32 / rec.height)), 32), Image.BOX)
    tela = Image.new('L', (64, 32), 0)
    tela.paste(rec, ((64 - rec.width) // 2, 0))
    return np.asarray(tela, dtype=np.float32) / 255.0


def correlacao(a, b):
    return float((a * b).sum() / (np.sqrt((a * a).sum() * (b * b).sum()) + 1e-9))


def geometria(im):
    """Em px da imagem da bandeira: caixa do desenho (mastro + pano), pé do mastro, canto do pano, caixa do pano."""
    al = np.asarray(im.getchannel('A'))
    h, w = al.shape
    forte = al > 140
    ys, xs = np.nonzero(forte)
    caixa = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    yy, xx = np.nonzero(forte[:, : int(w * .3)])
    pe_y = int(yy.max())
    pe = [int(round(xx[yy == pe_y].mean())), pe_y]
    py, px = np.nonzero(forte[:, int(w * .35):])
    pano = [int(px.min() + w * .35), int(py.min()), int(px.max() + w * .35), int(py.max())]
    return {'caixa': caixa, 'pe': pe, 'pano': pano}


def ler_ai(doc):
    """Conferências estruturais + as 30 bandeiras do mapa (caixa em pt, geometria, imagem)."""
    if doc.page_count != 2:
        sys.exit(f'o .ai tem {doc.page_count} pranchetas (esperado 2: verso e frente)')
    for pg in doc:
        if abs(pg.rect.width - 612.283) > .6 or abs(pg.rect.height - 436.535) > .6:
            sys.exit(f'prancheta {pg.rect} não é 216 x 154 mm')
    info = doc[PAGINA_MAPA].get_image_info(xrefs=True)
    base = [i for i in info if i['width'] > 4000]
    if len(base) != 1 or (base[0]['width'], base[0]['height']) != (6050, 4314):
        sys.exit('a base do mapa (6050 x 4314) não foi encontrada como imagem única na frente')
    flags = []
    for i in info:
        tam = (i['width'], i['height'])
        if tam in (TAM_CASA, TAM_SICREDI):
            im = imagem_rgba(doc, i['xref'])
            flags.append({'tipo': 'casa' if tam == TAM_CASA else 'sicredi', 'xref': i['xref'], 'bbox': i['bbox'], 'tam': tam,
                          'img': im, 'geo': geometria(im)})
    return base[0], flags


def renderizar(caminho_ai, limpa):
    """Frente sem sangria e sem as peças de papel (e, com `limpa`, sem as bandeiras e suas sombras).
    Devolve (imagem, escala x, escala y, recorte x0, y0, o que saiu)."""
    doc = fitz.open(str(caminho_ai))      # só leitura: nada é salvo
    pg = doc[PAGINA_MAPA]
    tocadas = [i['bbox'] for i in pg.get_image_info() if fitz.Rect(i['bbox']).intersects(AVISO_RETANGULO) or fitz.Rect(i['bbox']).intersects(CARTAO_RETANGULO)]
    # a base cobre a página inteira (esperado); qualquer outra imagem tocando os retângulos seria bandeira/título
    outras = [b for b in tocadas if fitz.Rect(b).width < 500]
    if outras:
        sys.exit(f'imagem encostando nas peças de papel: {outras}')
    if not pg.search_for('Ilustração fora de escala'):
        sys.exit('o aviso de impressão não está onde era esperado; revisar AVISO_RETANGULO')
    saiu = ['sangria de 3 mm', 'faixa de aviso de impressão', 'cartão Patrocinador / Sicredi']
    for r in (AVISO_RETANGULO, CARTAO_RETANGULO):
        pg.add_redact_annot(r, fill=False)
    if limpa:
        # imagens das bandeiras (a da Sicredi se repete 3 vezes com o mesmo xref); a delete_image troca por 1 px transparente
        xr = {i['xref']: (i['width'], i['height']) for i in pg.get_image_info(xrefs=True) if (i['width'], i['height']) in (TAM_CASA, TAM_SICREDI)}
        if sum(t == TAM_CASA for t in xr.values()) != 27 or sum(t == TAM_SICREDI for t in xr.values()) != 1:
            sys.exit(f'imagens de bandeira inesperadas: {xr}')
        for x in xr:
            pg.delete_image(x)
        # sombra vetorial (preto, 150+ segmentos) sob cada uma das 30 bandeiras
        sombras = [d['rect'] for d in pg.get_drawings() if d.get('fill') == (0.0, 0.0, 0.0) and len(d['items']) > 100
                   and not d['rect'].intersects(CARTAO_RETANGULO) and not d['rect'].intersects(AVISO_RETANGULO)]
        if len(sombras) != 30:
            sys.exit(f'sombras de bandeira: {len(sombras)} (esperado 30)')
        for r in sombras:
            pg.add_redact_annot(r + (-1, -1, 1, 1), fill=False)
        saiu += ['27 bandeiras de casa (imagens 152x156 px)', '3 bandeiras da Sicredi (imagem 166x170 px, 3 usos)', '30 sombras vetoriais sob as bandeiras']
    pg.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_REMOVE_IF_TOUCHED,
                        text=fitz.PDF_REDACT_TEXT_REMOVE)
    W, H = 6050, 4314
    sx, sy = (W - 1e-4) / pg.rect.width, (H - 1e-4) / pg.rect.height
    pix = pg.get_pixmap(matrix=fitz.Matrix(sx, sy), alpha=False, colorspace=fitz.csRGB)
    if (pix.width, pix.height) != (W, H):
        sys.exit(f'renderização {pix.width}x{pix.height}, esperado {W}x{H}')
    im = Image.frombytes('RGB', (W, H), pix.samples)
    sg = SANGRIA_MM * 72 / 25.4
    x0, y0 = round(sg * sx), round(sg * sy)
    return im.crop((x0, y0, W - x0, H - y0)), sx, sy, x0, y0, saiu


def main():
    args = argumentos()
    doc = fitz.open(str(args.ai))
    base, flags = ler_ai(doc)
    leg = legenda(doc)
    casas_f = [f for f in flags if f['tipo'] == 'casa']
    sic_f = [f for f in flags if f['tipo'] == 'sicredi']
    if len(casas_f) != 27 or len(sic_f) != 3:
        sys.exit(f'bandeiras no mapa: {len(casas_f)} de casa e {len(sic_f)} da Sicredi (esperado 27 e 3)')

    # --- número de cada bandeira: numeral da bandeira x imagem da legenda
    modelos = {e['numero']: mascara_numeral(imagem_rgba(doc, e['xref'])) for e in leg}
    for f in casas_f:
        pont = sorted(((correlacao(mascara_numeral(f['img']), m), n) for n, m in modelos.items()), reverse=True)
        f['numero'], f['margem'] = pont[0][1], pont[0][0] - pont[1][0]
    nums = sorted(f['numero'] for f in casas_f)
    if nums != list(range(1, 28)):
        sys.exit(f'numerais lidos nas bandeiras não são 1..27 uma vez cada: {nums}')

    # --- casas do retrato local x legenda
    if not RETRATO.exists():
        sys.exit(f'falta o retrato local ({RETRATO}); ver src/edicao/dados/retrato/README.md')
    retrato = json.loads(RETRATO.read_text(encoding='utf-8'))
    parts = retrato.get('participantes', retrato)
    por_nome = {norm(p['casa']['nome']): p for p in parts}
    pendencias = []
    for e in leg:
        p = por_nome.get(norm(e['nome']))
        if not p:
            pendencias.append(f'legenda {e["numero"]} "{e["nome"]}" sem casa no retrato local')
            continue
        e['slug'], e['unidades'] = p['slug'], [u['id'] for u in p.get('unidades', [])]
        if norm(e['tema']) != norm(p['casa'].get('tema', '')):
            pendencias.append(f'tema divergente em {p["slug"]}: legenda "{e["tema"]}" x retrato "{p["casa"].get("tema")}"')
    sem_bandeira = sorted(set(p['slug'] for p in parts) - {e.get('slug') for e in leg})
    for s in sem_bandeira:
        pendencias.append(f'casa do retrato sem bandeira na arte: {s}')
    if any('sem casa' in x for x in pendencias):
        print('\n'.join(pendencias)); sys.exit('legenda x retrato: nome sem casa — conferir a grafia antes de gerar')

    # --- arte exportada (sem sangria, sem peças de papel)
    limpa = not args.com_bandeiras
    ARQUIVO = ARQUIVO_LIMPA if limpa else ARQUIVO_COM
    arte, sx, sy, cx0, cy0, saiu = renderizar(args.ai, limpa)
    qw, qh = arte.size

    def a_arte(xpt, ypt):
        return (xpt * sx - cx0) / qw, (ypt * sy - cy0) / qh

    def ponto_da(f, px, py):
        x0, y0, x1, y1 = f['bbox']
        w, h = f['tam']
        return a_arte(x0 + px / w * (x1 - x0), y0 + py / h * (y1 - y0))

    def n4(v):
        return round(v, 4)

    def medidas(f):
        g = f['geo']
        pe = ponto_da(f, *g['pe'])
        c0, c1 = ponto_da(f, g['caixa'][0], g['caixa'][1]), ponto_da(f, g['caixa'][2], g['caixa'][3])
        p0, p1 = ponto_da(f, g['pano'][0], g['pano'][1]), ponto_da(f, g['pano'][2], g['pano'][3])
        return {'ponto': {'x': n4(pe[0]), 'y': n4(pe[1])},
                'centro': {'x': n4((c0[0] + c1[0]) / 2), 'y': n4((c0[1] + c1[1]) / 2)},
                'bandeira': {'x0': n4(c0[0]), 'y0': n4(c0[1]), 'x1': n4(c1[0]), 'y1': n4(c1[1])},
                'selo': {'x': n4(p1[0]), 'y': n4(p0[1])}}   # canto superior direito do pano: fora do numeral

    for f in flags:
        f['m'] = medidas(f)
        for k in ('ponto', 'centro'):
            if not (0 <= f['m'][k]['x'] <= 1 and 0 <= f['m'][k]['y'] <= 1):
                sys.exit(f'bandeira fora da arte exportada: {f["m"]}')

    # --- distância entre bandeiras (em larguras da arte) e raio de acerto sugerido
    todos = [('casa', f) for f in casas_f] + [('sicredi', f) for f in sic_f]
    for _, f in todos:
        f['viz'] = min(np.hypot((f['m']['centro']['x'] - g['m']['centro']['x']) * qw, (f['m']['centro']['y'] - g['m']['centro']['y']) * qh) / qw
                       for _, g in todos if g is not f)
        f['m']['vizinha'] = n4(f['viz'])
        f['m']['raio'] = n4(min(0.04, max(0.012, f['viz'] / 2)))

    por_num = {f['numero']: f for f in casas_f}
    casas, unidades = {}, {}
    for e in leg:
        if 'slug' not in e:
            continue
        f = por_num[e['numero']]
        casas[e['slug']] = {'numero': e['numero'], 'nome': e['nome'], 'tema': e['tema'], **f['m']}
        for uid in e['unidades']:
            unidades[uid] = {'x': f['m']['ponto']['x'], 'y': f['m']['ponto']['y'], 'numero': e['numero'], 'slug': e['slug']}
    unidades = dict(sorted(unidades.items(), key=lambda kv: (kv[1]['numero'], list(unidades).index(kv[0]))))

    ag = {a['nome']: a for a in json.loads(PONTOS_SICREDI.read_text(encoding='utf-8'))}
    sicredi = []
    for nome, f in zip(SICREDI_POR_ORDEM_DE_X, sorted(sic_f, key=lambda f: f['m']['ponto']['x'])):
        sicredi.append({'nome': nome, 'endereco': ag.get(nome, {}).get('endereco', ''),
                        'x': f['m']['ponto']['x'], 'y': f['m']['ponto']['y'], **f['m']})
    # ordem estável para o JS: a da lista de agências (sede, Cidade Verde, São Gonçalo)
    ordem = ['Sicredi Natal (sede)', 'Sicredi Shopping Cidade Verde', 'Sicredi São Gonçalo do Amarante']
    sicredi.sort(key=lambda s: ordem.index(s['nome']))

    # --- imagens
    SAIDA.mkdir(parents=True, exist_ok=True)
    for velho in SAIDA.glob(f'{ARQUIVO}-[0-9]*.webp'):   # só a própria variante
        velho.unlink()
    tamanhos = {}
    for w, q in LARGURAS.items():
        h = round(qh * w / qw)
        arq = SAIDA / f'{ARQUIVO}-{w}.webp'
        arte.resize((w, h), Image.LANCZOS).save(arq, 'WEBP', quality=q, method=6)
        tamanhos[w] = arq.stat().st_size
    lq = io.BytesIO()
    arte.resize((PLACEHOLDER_W, round(qh * PLACEHOLDER_W / qw)), Image.LANCZOS).save(lq, 'WEBP', quality=45, method=6)
    placeholder = 'data:image/webp;base64,' + base64.b64encode(lq.getvalue()).decode()

    xmp = doc.xref_stream(2).decode('utf-8', 'replace')
    salvo = (re.search(r'xmp:ModifyDate="([^"]+)"', xmp) or [None, ''])[1]
    logos = sorted(p.stem for p in (SAIDA / 'logos').glob('*.webp'))
    dados = {
        'versao': 3,
        'aprovada': not args.provisoria,
        'arteComBandeiras': not limpa,
        'arte': {
            'arquivo': ARQUIVO,
            'versao': 'final-v1-limpa' if limpa else 'final-v1',
            'semBandeiras': limpa,
            'bandeirasRemovidas': saiu[3:] if limpa else [],
            'fonte': 'MAPA_IMPRESSÃO.ai (Adobe Illustrator 30.8), prancheta 2 da frente (MAPA_ARTE), PDF compatível',
            'salvoEm': salvo,
            'recorte': 'sem sangria de 3 mm; sem a faixa de aviso e sem o cartão Patrocinador (só impressão)' + ('; sem as bandeiras e suas sombras (o site desenha os marcadores)' if limpa else ''),
            'aprovacao': 'arte final declarada pelo Wilker em 05/11/2026 ao pedir a troca do mapa provisório',
            'ilustrativa': True,
            'geradoPor': 'scripts/edicao/mapa-mundo-final.py',
            'placeholder': placeholder,
        },
        'quadro': [qw, qh],
        'larguras': list(LARGURAS),
        'unidades': unidades,
        'casas': dict(sorted(casas.items(), key=lambda kv: kv[1]['numero'])),
        'marcos': [{'nome': n, 'x': x, 'y': y} for n, x, y in MARCOS],
        'sicredi': sicredi,
        'bandeiras': [],
        'docerias': [],
        'logos': logos,
    }
    DADOS.write_text(
        '// GERADO por scripts/edicao/mapa-mundo-final.py — não editar à mão. Os caminhos das imagens o imageLibrary monta\n'
        '// (mundoEdicao). Posições de 0 a 1 sobre a imagem exportada (arte final do Illustrator, sem sangria); número da casa =\n'
        '// ordem ALFABÉTICA da legenda impressa. `arteComBandeiras`: a imagem traz (ou não) as bandeiras; `casas[].bandeira` = onde a bandeira ficava.\n'
        f'export const MUNDO_EDICAO = {json.dumps(dados, ensure_ascii=False, indent=2)}\n', encoding='utf-8')

    # --- relatório
    print(f'arte {dados["arte"]["versao"]} {"APROVADA" if dados["aprovada"] else "provisória"} · quadro {qw}x{qh} · {len(casas)} casas · '
          f'{len(unidades)} unidades · {len(sicredi)} Sicredi · salvo no Illustrator em {salvo}')
    print('arquivos:', ', '.join(f'{ARQUIVO}-{w}.webp {t // 1024} KB' for w, t in tamanhos.items()), f'· placeholder {len(placeholder)} B')
    print(f'menor margem do numeral: {min(f["margem"] for f in casas_f):.3f} (1º x 2º colocado na correlação)')
    print(f'bandeiras mais próximas: {min(f["viz"] for _, f in todos):.4f} larguras da arte')
    print('PENDÊNCIAS:' if pendencias else 'sem pendências de nome/tema/casa')
    for x in pendencias:
        print('  -', x)
    if args.verificacao:
        verificacao(args.verificacao, arte, dados)


def verificacao(saida, arte, d):
    """Pontos, raios, caixas e números sobre a arte exportada (conferência a olho)."""
    w = 2400
    im = arte.resize((w, round(arte.height * w / arte.width)), Image.LANCZOS).convert('RGBA')
    cam = Image.new('RGBA', im.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(cam)
    W, H = im.size

    def p(o):
        return o['x'] * W, o['y'] * H

    for c in [*d['casas'].values(), *[{**s, 'numero': 'S'} for s in d['sicredi']]]:
        sic = c['numero'] == 'S'
        cor = (0, 120, 255, 255) if sic else (255, 0, 200, 255)
        cx, cy = p(c['centro'])
        r = c['raio'] * W
        dr.ellipse((cx - r, cy - r, cx + r, cy + r), outline=cor, width=2)
        b = c['bandeira']
        dr.rectangle((b['x0'] * W, b['y0'] * H, b['x1'] * W, b['y1'] * H), outline=(0, 0, 0, 255), width=2)
        px, py = p(c['ponto'])
        dr.ellipse((px - 7, py - 7, px + 7, py + 7), fill=(255, 255, 0, 255), outline=(0, 0, 0, 255), width=2)
        sx_, sy_ = p(c['selo'])
        dr.ellipse((sx_ - 9, sy_ - 9, sx_ + 9, sy_ + 9), outline=(0, 160, 0, 255), width=3)
        dr.text((px + 10, py - 4), str(c['numero']), fill=(0, 0, 0, 255))
    for m in d['marcos']:
        mx, my = m['x'] * W, m['y'] * H
        dr.ellipse((mx - 10, my - 10, mx + 10, my + 10), fill=(0, 200, 255, 255), outline=(0, 0, 0, 255), width=2)
        dr.text((mx + 14, my - 6), m['nome'], fill=(0, 0, 0, 255))
    Image.alpha_composite(im, cam).convert('RGB').save(saida)
    print('verificação:', saida)


if __name__ == '__main__':
    main()
