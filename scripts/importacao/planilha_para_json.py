"""Lê a planilha geral da edição (xlsx exportado do Google Sheets) e devolve as
linhas CRUAS em JSON — o primeiro degrau da importação (docs/EVOLUCAO-PAINEL-2026-09.md).

Uso:
    pip install openpyxl
    python scripts/importacao/planilha_para_json.py <arquivo.xlsx> > <saida.json>

Regras:
- a planilha original nunca é alterada; o JSON leva o sha256 do arquivo;
- cada célula vira TEXTO como estava (data vira AAAA-MM-DD, número inteiro sem ".0");
  normalizar é trabalho do banco (importacao_analisar_interna), não deste script;
- linha totalmente vazia é descartada; a posição (número da linha) é preservada.

⚠️ O JSON contém dado pessoal (telefone, e-mail, CNPJ, endereço): gravar FORA do
repositório (que é público) — ex.: ELOI SITES/scw-dados-importacao/.
"""
import datetime
import hashlib
import json
import sys

import openpyxl


def texto(v):
    if v is None:
        return None
    if isinstance(v, datetime.datetime):
        return v.date().isoformat() if v.time() == datetime.time(0) else v.isoformat(timespec='minutes')
    if isinstance(v, datetime.date):
        return v.isoformat()
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    s = str(v)
    return s if s.strip() != '' else None


def ler(caminho):
    bruto = open(caminho, 'rb').read()
    wb = openpyxl.load_workbook(caminho, data_only=True)
    abas = {}
    for ws in wb.worksheets:
        linhas = []
        for n, row in enumerate(ws.iter_rows(values_only=True), start=1):
            celulas = [texto(v) for v in row]
            if not any(c is not None for c in celulas):
                continue
            while celulas and celulas[-1] is None:
                celulas.pop()
            linhas.append({'linha': n, 'celulas': celulas})
        abas[ws.title] = linhas
    return {
        'arquivo_nome': caminho.replace('\\', '/').split('/')[-1],
        'arquivo_sha256': hashlib.sha256(bruto).hexdigest(),
        'abas': abas,
    }


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    json.dump(ler(sys.argv[1]), sys.stdout, ensure_ascii=False)
