"""Mundo da Doçura (mapa desenhado da Cartoon, docs/cartoon-2026-2/14 §14.12-§14.13) -> arquivos do site.

    python -I scripts/edicao/mapa-mundo.py [posicoes.json] [arte-base.png] [--aprovada] [--docerias]

Fonte (Dropbox da edição, 06_MATERIAIS_PDV/03_MAPA_IMPRESSO/):
    01_RASCUNHO_POSICOES/_bastidores/posicoes-arte-vN.json   posição de cada unidade NA ARTE (0-1), número da casa,
                                                              Sicredi e, a partir da v2, os marcos (chave + x/y)
    03_GERACOES_CHATGPT/<arte-base>                           a arte do chão (mundos dos temas pintados, sem texto nem
                                                              logo); pode ser maior que o quadro, na mesma proporção
    04_SINALIZACAO/bandeiras/bandeira-NN.png                  bandeirinha numerada de cada casa (Wilker 04/11: o pin)
    04_SINALIZACAO/bandeiras/bandeira-sicredi.png             bandeira da Sicredi com a logo oficial em box
    03_GERACOES_CHATGPT/doceria_<slug>_vN.png                 doceria de cada casa (PNG transparente), a maior vN
    01_RASCUNHO_POSICOES/_bastidores/pontos-sicredi.json      nome e endereço das agências
Sem argumentos: a v2 (posicoes-arte-v2.json + mapa-mundos-polaroid_v3_alta-4x-fiel.jpg). Arte nova = rodar com os
dois caminhos novos; o código do site não muda.

Saída VERSIONADA (arte da edição, pública como os pins e as logos desenhadas):
    public/images/marcas-edicoes/2026.2/mundo/base-vN-<largura>.webp   1024, 2048, 3072 (até a largura original)
    public/images/marcas-edicoes/2026.2/mundo/bandeiras/<NN>.webp       pin da casa, aparada, 144 px de altura
    public/images/marcas-edicoes/2026.2/mundo/sicredi-bandeira.webp     marcador das agências, 144 px de altura
    public/images/marcas-edicoes/2026.2/mundo/logos/<slug>.webp         logo oficial (aparece no zoom), 128 px
    public/images/marcas-edicoes/2026.2/mundo/docerias/<slug>.webp      384 px no lado maior (só com --docerias)
    src/data/mundoEdicao.js  — os dados (gerado; o imageLibrary monta os caminhos)

`--aprovada` marca a arte como aprovada pelo Wilker: só então a vista Mundo aparece fora do DEV.
`--docerias` põe as docerias soltas por cima do chão. Desde 04/11 o conceito é outro (Wilker): os mundos dos temas
vêm pintados NO chão, perto de cada pin, e as docerias saíram da prévia. O código continua, desligado por padrão.
Confere que toda unidade do retrato local tem posição; a que faltar sai na tela (fica só na lista e no Google).
Idempotente: apaga as imagens antigas do mundo e regera tudo.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
PASTA = Path('F:/F2 Experience Dropbox/Criação ELOI Design/SWEET&COFFEE WEEK/2026.2 SCW CARTOONS'
             '/06_MATERIAIS_PDV/03_MAPA_IMPRESSO')
BASTIDORES = PASTA / '01_RASCUNHO_POSICOES' / '_bastidores'
GERACOES = PASTA / '03_GERACOES_CHATGPT'
BANDEIRAS = PASTA / '04_SINALIZACAO' / 'bandeiras'
SAIDA = RAIZ / 'public' / 'images' / 'marcas-edicoes' / '2026.2' / 'mundo'
DADOS = RAIZ / 'src' / 'data' / 'mundoEdicao.js'
RETRATO = RAIZ / 'src' / 'edicao' / 'dados' / 'retrato' / 'cartoon.local.json'

args = [a for a in sys.argv[1:] if not a.startswith('--')]
APROVADA = '--aprovada' in sys.argv
POSICOES = Path(args[0]) if args else BASTIDORES / 'posicoes-arte-v2.json'
BASE = Path(args[1]) if len(args) > 1 else GERACOES / 'mapa-mundos-polaroid_v3_alta-4x-fiel.jpg'
VERSAO = int(re.search(r'-v(\d+)\.json$', POSICOES.name).group(1))

pos = json.loads(POSICOES.read_text(encoding='utf-8'))
retrato = json.loads(RETRATO.read_text(encoding='utf-8'))
casas = retrato.get('participantes', retrato)
slugs = {p['slug'] for p in casas}
ids = {u['id'] for p in casas for u in p.get('unidades', [])}

SAIDA.mkdir(parents=True, exist_ok=True)
for sub in ('docerias', 'logos', 'bandeiras'):
    (SAIDA / sub).mkdir(exist_ok=True)
for velho in [*SAIDA.glob('*.webp'), *SAIDA.glob('*/*.webp')]:
    velho.unlink()

# Chão: larguras para o srcset (o zoom do site vai até 2,25x). A arte pode vir em alta (ex.: 4x): as posições são 0-1,
# então só a PROPORÇÃO precisa bater com o quadro.
arte = Image.open(BASE).convert('RGB')
qw, qh = pos['quadro']
if abs(arte.width / arte.height - qw / qh) > 0.002:
    sys.exit(f'arte {arte.size} não tem a proporção do quadro das posições {pos["quadro"]}')
larguras = sorted({min(w, arte.width) for w in (1024, 2048, 3072)})
for w in larguras:
    h = round(arte.height * w / arte.width)
    arte.resize((w, h), Image.LANCZOS).save(SAIDA / f'base-v{VERSAO}-{w}.webp', quality=82, method=6)

# Docerias: a maior versão de cada casa; só PNG com alfa, só slug que existe no retrato.
docerias = {}
for f in (GERACOES.glob('doceria_*_v*.png') if '--docerias' in sys.argv else []):
    m = re.fullmatch(r'doceria_(.+)_v(\d+)\.png', f.name)
    if m and m.group(1) in slugs and int(m.group(2)) >= docerias.get(m.group(1), (0, None))[0]:
        docerias[m.group(1)] = (int(m.group(2)), f)
for slug, (_, f) in sorted(docerias.items()):
    im = Image.open(f).convert('RGBA')
    im = im.crop(im.getbbox())
    im.thumbnail((384, 384), Image.LANCZOS)
    im.save(SAIDA / 'docerias' / f'{slug}.webp', quality=85, method=6)

# Pin da casa: a LOGO OFICIAL, reduzida (41 pins de 800 px pesariam ~4 MB). Ordem: a sincronizada da pasta PRINCIPAIS
# (public/logos/participants/<slug>.png, scripts/sincronizar-logos-oficiais.py); a do cadastro quando é arquivo do site;
# a do cadastro no Storage (bucket público `logos`, a que a marca confirmou no painel).
import io, urllib.request
STORAGE = 'https://dgfmoibynftadsyjcclg.supabase.co/storage/v1/object/public/logos/'  # mesmo projeto de src/lib/supabaseConfig.js

def abrir_logo(p):
    logo = (p.get('casa', {}).get('logo') or {}).get('path') or ''
    for c in [f'/logos/participants/{p["slug"]}.png', logo if logo.startswith('/') else '']:
        if c and (RAIZ / 'public' / c.lstrip('/')).exists():
            return Image.open(RAIZ / 'public' / c.lstrip('/'))
    if logo and not logo.startswith('/'):
        try:
            with urllib.request.urlopen(STORAGE + logo, timeout=20) as r:
                return Image.open(io.BytesIO(r.read()))
        except Exception as e:
            print('logo do Storage não baixou:', p['slug'], e)
    return None

logos = []
for p in casas:
    im = abrir_logo(p)
    if im is None:
        continue
    im = im.convert('RGBA')
    im.thumbnail((128, 128), Image.LANCZOS)
    im.save(SAIDA / 'logos' / f'{p["slug"]}.webp', quality=88, method=6)
    logos.append(p['slug'])

# Bandeirinhas (sinalização decidida pelo Wilker em 04/11, igual no impresso): aparadas no desenho, o pé do mastro
# fica embaixo, à esquerda (o site ancora ali). A da Sicredi já traz a logo oficial em box.
def bandeira(origem, destino):
    im = Image.open(origem).convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    im.thumbnail((10000, 144), Image.LANCZOS)
    im.save(destino, quality=90, method=6)


bandeiras = []
for f in sorted(BANDEIRAS.glob('bandeira-[0-9]*.png')):
    n = int(re.fullmatch(r'bandeira-(\d+)\.png', f.name).group(1))
    bandeira(f, SAIDA / 'bandeiras' / f'{n:02d}.webp')
    bandeiras.append(n)
bandeira(BANDEIRAS / 'bandeira-sicredi.png', SAIDA / 'sicredi-bandeira.webp')

# Marcos: o JSON traz a chave curta; no mapa vai o nome real do lugar.
NOMES = {'ponte': 'Ponte Newton Navarro', 'forte': 'Forte dos Reis Magos', 'arena': 'Arena das Dunas',
         'morro': 'Morro do Careca', 'farol': 'Farol de Mãe Luiza', 'parque': 'Parque das Dunas'}

agencias = {a['nome']: a for a in json.loads((BASTIDORES / 'pontos-sicredi.json').read_text(encoding='utf-8'))}
unidades = {u['unidade']: {'x': u['x'], 'y': u['y'], 'numero': u['numero'], 'slug': u['slug']}
            for u in pos['unidades'] if u['unidade'] in ids}
dados = {
    'versao': VERSAO,
    'aprovada': APROVADA,
    'quadro': pos['quadro'],
    'larguras': larguras,
    'unidades': unidades,
    'marcos': [{'nome': NOMES.get(m['nome'], m['nome']), 'x': m['x'], 'y': m['y']} for m in pos.get('marcos', [])],
    'sicredi': [{'nome': s['nome'], 'endereco': agencias.get(s['nome'], {}).get('endereco', ''), 'x': s['x'], 'y': s['y']}
                for s in pos.get('sicredi', [])],
    'bandeiras': bandeiras,
    'docerias': sorted(docerias),
    'logos': sorted(logos),
}
DADOS.write_text(
    '// GERADO por scripts/edicao/mapa-mundo.py — não editar à mão. Os caminhos das imagens o imageLibrary monta\n'
    '// (mundoEdicao); posições de 0 a 1 sobre a arte, número da casa = ordem do caminho do mapa.\n'
    f'export const MUNDO_EDICAO = {json.dumps(dados, ensure_ascii=False, indent=2)}\n',
    encoding='utf-8')

faltam = sorted(ids - set(unidades))
print(f'v{VERSAO} {"APROVADA" if APROVADA else "provisória"} · base {larguras} · {len(unidades)}/{len(ids)} unidades'
      f' · {len(dados["marcos"])} marcos · {len(dados["sicredi"])} Sicredi · {len(bandeiras)} bandeiras · {len(logos)} logos'
      f' · {len(docerias)} docerias {sorted(docerias)}')
sem_bandeira = sorted({u['numero'] for u in unidades.values()} - set(bandeiras))
if sem_bandeira:
    print('SEM BANDEIRA (pin com o número em disco):', sem_bandeira)
if faltam:
    print('SEM POSIÇÃO (só lista e Google):', ', '.join(faltam))
sem_logo = sorted(slugs - set(logos))
if sem_logo:
    print('SEM LOGO (pin com a inicial):', ', '.join(sem_logo))
