"""Resolve Samsung labels using the audited SCRAPING reference, never code guesses."""
import json
import re
from pathlib import Path

REFERENCE = json.loads((Path(__file__).parent / 'data/schematic-samsung-reference.json').read_text())
CODE = re.compile(r'(?i)\b(?:(?:SM|GT|SCH|SGH|SHV)[- ]?[A-Z]\d{3,5}|SC[- ]?\d{2,5})[A-Z0-9]*(?![a-z0-9])')

def normalize_code(value):
    return re.sub(r'^(SM|GT|SCH|SGH|SHV|SC)[ -]?', r'\1-', value.upper())

def commercial_names(code):
    pairs = REFERENCE['codeModels']
    if code in pairs:
        return pairs[code]
    candidates = [k for k in pairs if code.startswith(k)]
    return pairs[max(candidates, key=len)] if candidates else []

def samsung_reference_model(model, name, origin):
    codes = list(dict.fromkeys(normalize_code(c) for c in CODE.findall(name)))
    if not codes:
        codes = list(dict.fromkeys(normalize_code(c) for c in CODE.findall(origin)))
    codes = [c for c in codes if not any(other != c and other.startswith(c) for other in codes)]
    if not codes:
        board = re.search(r'(?i)\bAM28C\b|\bLLDM168C1\b', origin + ' ' + name)
        return model + (' ' + board[0].upper() if board and board[0].lower() not in model.lower() else '')
    labels = []
    for code in codes:
        choices = commercial_names(code)
        selected = choices[0] if len(choices) == 1 else model if model in choices else None
        if selected:
            labels.append(selected + ' ' + code)
        elif CODE.search(model) or model in {'Por revisar', 'General'}:
            labels.append(code)
        else:
            labels.append(model + ' ' + code)
    return ' + '.join(dict.fromkeys(labels))
