#!/usr/bin/env python3
"""Plan a reversible library reorganization; never infer electrical compatibility.

Plan from an inventory JSON (path,size,mtime_ns) and optional catalog. Materialize
hard links only after hashing the real source. Commit removes ONLY the old link,
after the caller has reconciled catalogs/databases. The manifest is the rollback.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import os
import re
import unicodedata
from pathlib import Path

ASSETS = {'.pdf', '.pcb', '.pcbe'}
BOARDS = {'.pcb', '.pcbe', '.brd', '.bv', '.cad'}
MEDIA = {'.jpg', '.jpeg', '.png', '.mp4'}
BRANDS = {'samsung': 'Samsung', 'iphone': 'Apple', 'ipad': 'Apple', 'apple': 'Apple',
          'huawei': 'Huawei', 'honor': 'Honor', 'xiaomi': 'Xiaomi', 'redmi': 'Xiaomi',
          'motorola': 'Motorola', 'lg': 'LG', 'oppo': 'Oppo', 'vivo': 'Vivo',
          'realme': 'Realme', 'acer': 'Acer', 'asus': 'Asus', 'lenovo': 'Lenovo',
          'dell': 'Dell', 'hp': 'HP', 'msi': 'MSI'}
TECHNICAL = re.compile(r'^(?:pdf|pcbe|pcb|sch|schematics?|schematic and (?:boardview|silk)|'
                       r'repair cases?|trouble\s*shooting|diode values?|block diagram|'
                       r'boardview|pcb layers?|images?|documents?|manuals?|'
                       r'component (?:explain|location|notes)|repair flowchart|'
                       r'several reference schematics|machine dismant course|'
                       r'faqs|faceid|route map|(?:second|third) edition|'
                       r'maintenance ways|trobleshoot ways|trouble-shooting ways|'
                       r'.* sharing|iphone repair manual|iphone\s*、\s*ipad)$', re.I)


def label(value: str) -> str:
    value = unicodedata.normalize('NFC', value)
    value = re.sub(r'\s*\((?:vip|free|premium|official)\)\s*', ' ', value, flags=re.I)
    return re.sub(r'\s+', ' ', value.replace('_', ' ')).strip(' .')


def generic(value: str) -> bool:
    value = label(value)
    return bool(TECHNICAL.fullmatch(value) or re.search(r'\bseries\b', value, re.I)
                or re.search(r'repair case|^(?:\d+[、 ]*)?other|'
                             r'^free trial$|^old model$|^cpu pcb layer$|^\d*\s*sch$|'
                             r'^[a-z]{0,3}\d*[xX]{2,}$', value, re.I))


def apple_model(value: str) -> str:
    value = label(value)
    value = re.sub(r'(?i)iphone[ -]*', 'iPhone ', value)
    value = re.sub(r'(?i)ipad\s*', 'iPad ', value)
    value = re.sub(r'(?i)(\d[sce]?)(plus|pro|mini)(?=\b|max)', r'\1 \2', value)
    value = re.sub(r'(?i)(\d)(pro|plus|mini|air|se)(?=\b|max)', r'\1 \2', value)
    value = re.sub(r'(?i)(\d|pro)(max)\b', r'\1 \2', value)
    value = re.sub(r'(?i)\b(pro|plus|mini|max|air|intel|qualcomm|usa)\b',
                   lambda m: m[0].upper() if m[0].lower() == 'usa' else m[0].title(), value)
    value = re.sub(r'(?i)\b(xsmax|xs|xr|se\s*\d*)\b', lambda m: m[0].upper().replace('XSMAX', 'XS Max'), value)
    value = re.sub(r'(?i)(iPhone \d{1,2}) (\d{1,2})(?=\s|$)', r'\1 + \2', value)
    value = re.sub(r'(?i)(iPhone \d{1,2} Pro) (Pro Max)', r'\1 + \2', value)
    value = re.sub(r'(?i)\s+and\s+', ' + ', value)
    value = re.sub(r'(?i)\biphone (\d+)([sce])\b', lambda m: 'iPhone ' + m[1] + m[2].lower(), value)
    value = re.sub(r'(?i)\biphone x\b', 'iPhone X', value)
    value = re.sub(r'(?i)\b(air|mini)(\d)', lambda m: m[1].title() + ' ' + m[2], value)
    value = re.sub(r'(?i)\biphone se\s*(\d)', r'iPhone SE \1', value)
    return value


def model_label(value: str, brand: str) -> str:
    value = label(re.sub(r'(?i)\.(?:pdf|pcbe|pcb)$', '', value))
    value = re.sub(r'\s*\(\d+\)$', '', value)
    value = re.sub(r'(?i)\s+(?:schematics?|schemaitc|svc manual|svc eng|manual|all layers platform images)$', '', value)
    if brand == 'Apple':
        return apple_model(value)
    value = re.sub(r'(?i)^' + re.escape(brand) + r'\s+', '', value)
    value = value[:1].upper() + value[1:].lower()
    value = re.sub(r'(?i)\b(?:sm|gt|sch|sgh)-[a-z0-9-]+|\bxt\d+[a-z0-9-]*|\b[45]g\b', lambda m: m[0].upper(), value)
    if brand == 'Samsung':
        value = re.sub(r'(?i)\b(note|fold|flip)(\d)', r'\1 \2', value)
        value = value.replace('+', ' plus')
        value = re.sub(r'^([asmjfnwzceg]\d{1,3}[a-z]?)\b', lambda m: m[1][0].upper() + m[1][1:], value, flags=re.I)
    if brand in {'Xiaomi', 'Huawei', 'Honor'}:
        value = re.sub(r'(?i)\b(note|mate|nova|mix|pad|max|fold|turbo)(\d)', r'\1 \2', value)
        value = re.sub(r'(?i)(\d)(pro|max|plus)(?=\b|\d)', r'\1 \2', value)
        value = re.sub(r'(?i)red mi', 'Redmi', value)
    if brand == 'Motorola' and re.match(r'(?i)^(edge|one|razr)\b', value): value = 'Moto ' + value.lower()
    if brand == 'Motorola':
        # Codes remain in filenames; they are not separate commercial models.
        value = re.split(r'\s+XT\d', value)[0].strip()
        value = re.sub(r'\b[45]g\b', lambda m: m[0].upper(), value)
    return value or 'Por revisar'


def model_from_name(value: str, brand: str) -> str:
    """Extract only explicit labels; no board-code to commercial-name lookup."""
    value = label(value)
    patterns = {
        'Motorola': r'\b(?:moto|motorola)\s+(?:edge|razr|one|[cegmpxz]\s*\d*)(?:\s+(?:\d+|5g|4g|plus|pro|power|play|stylus|fusion|macro|action|vision|ace|zoom|hyper|style|force|202\d|201\d))*',
        'Huawei': r'\b(?:honor\s+)?(?:enjoy|mate|nova|honor|[pygv])\s*\d+[a-z]?(?:\s+(?:plus|pro\+?|lite|prime|\d{4}))*',
        'Xiaomi': r'\b(?:redmi\s+note|redmi\s*[ak]?|poco\s*[fmxc]|mi\s+(?:mix|note)?|xiaomi)\s*\d+[a-z]?(?:\s+(?:pro\+?|plus|lite|ultra|5g|4g|prime|max|se))*',
        'Apple': r'\biPhone[ -]*(?:\d{1,2}[sce]?(?!\d)|XS|XR|X|SE\s*\d?)(?:\s*(?:pro\s*max|pro|plus|mini|max))?(?:[ &_]+(?:\d{1,2}\s*)?(?:pro\s*max|pro|plus))*',
    }
    if brand == 'Samsung':
        code = re.search(r'(?i)\b(?:SM|GT|SCH|SGH)[- ]?[a-z]?\d{3,5}[a-z0-9-]*', value)
        model = re.search(r'(?i)(?<![a-z0-9-])(?:z\s*(?:fold|flip)\s*\d+|(?:galaxy\s+)?note\s*\d+\+?|[asmjfnwzceg]\s*\d{1,3}[a-z]?\+?)(?:\s+(?:ultra|edge\+?|plus|pro|max|core|prime|neo|lite|active|fe|4g|5g|lte|(?:19|20)\d{2}))*', value)
        if model:
            return model[0]
        return code[0] if code else ''
    if brand == 'LG':
        model = re.search(r'\(([^)]+)\)', value)
        if model: return model[1]
        model = re.search(r'(?i)\b(?:LG[ -]?)?(?:LM-)?[a-z]{1,3}\d{2,4}[a-z0-9-]*', value)
        return model[0] if model else ''
    if brand == 'Apple' and re.search(r'(?i)\bchapter\s*\d|\biphone\s+\d+\s*-\s*\d+', value):
        return ''
    match = re.search(patterns.get(brand, r'(?!)'), value, re.I)
    return match[0] if match else ''


def filename(value: str) -> str:
    p = Path(value)
    stem = label(p.stem)
    stem = stem[:1].upper() + stem[1:].lower()
    # Preserve all technical information; only presentation and whitespace change.
    return stem + p.suffix.lower()


def classify_legacy(relative: str) -> tuple[str, str, str, bool]:
    parts = Path(relative).parts
    ext = Path(relative).suffix.lower()
    family = 'pcbe' if ext in BOARDS else 'pdf'
    folders = list(parts[:-1])
    if folders and folders[0].lower() in {'pdf', 'pcbe', 'media'}:
        folders.pop(0)
    is_laptop = any(re.search(r'laptop|graphics card|pc motherboard', s, re.I) for s in folders)
    # Some historical "Consolas" folders contain laptop repair cases because
    # their filenames contain "switch". Do not perpetuate that classification.
    if 'Consolas' in folders and re.search(r'(?i)macbook|\bA1\d{3}\b|acer|aspire|lenovo|notebook|laptop|huawei|y5s|armani', parts[-1]):
        return family, 'Laptop-PC/Por revisar', 'Por revisar', True
    if 'Consolas' in folders:
        i = folders.index('Consolas'); brand = label(folders[i + 1]).replace('Steam Deck', 'SteamDeck')
        stem = label(Path(relative).stem)
        patterns = {'Xbox': r'Xbox\s*(?:360|One(?:\s+[SX])?|Series\s+[SX]|Elite\s+\d\w*)',
                    'PlayStation': r'(?:PlayStation\s*\d|PS\s*[1-5](?:\s*(?:Pro|Slim))?|PSP|PS\s*Vita)',
                    'Nintendo': r'(?:Nintendo\s*)?(?:Switch(?:\s*(?:Lite|OLED))?|[23]DS(?:\s*XL)?|DSi?|Wii(?:\s*U)?|Game\s*Boy(?:\s*(?:Advance|Color|Pocket))?|GameCube)',
                    'SteamDeck': r'Steam\s*Deck(?:\s*OLED)?'}
        m = re.search(r'(?<![a-z])' + patterns.get(brand, r'(?!)') + r'(?![a-z])', stem, re.I)
        model = model_label(m[0], '') if m else 'Por revisar'
        return family, 'Consolas/' + ('Steam Deck' if brand == 'SteamDeck' else brand), model, not bool(m)
    brand = None; index = -1
    for i, part in enumerate(folders):
        b = BRANDS.get(label(part).lower())
        if b:
            brand, index = b, i
            break
    stem = label(Path(relative).stem)
    if brand is None:
        if re.search(r'iphone|ipad|macbook|apple', stem, re.I): brand = 'Apple'
        elif re.search(r'\bmoto\b|motorola|\bXT\d', stem, re.I): brand = 'Motorola'
        elif re.search(r'huawei', stem, re.I): brand = 'Huawei'
    brand = brand or 'Por revisar'
    candidates = [p for p in folders[index + 1:] if not generic(p)
                  and label(p).lower() not in BRANDS and p.lower() not in {'bulk', 'consolas'}
                  and not re.search(r'laptop|graphics card|pc motherboard|machine dismant|oem factory', p, re.I)]
    model = candidates[-1] if candidates else ''
    if brand == 'Samsung':
        model = model_from_name(model, brand) or model_from_name(stem, brand)
    elif model.lower().endswith('.pdf') or model.lower() == 'aportes':
        model = model_from_name(stem, brand)
    elif model.lower() == 'por revisar':
        # Published review categories remain stable until new evidence exists.
        return family, ('Laptop-PC/' + brand if is_laptop else brand), model_label(model, brand), True
    if not model and brand == 'Apple':
        model = model_from_name(stem, brand)
    if brand == 'Apple' and re.search(r'(?i)iphone[^ ]*[_&]|iphone\s*\d+[^ ]*\s*(?:pro)?[ &_]+(?:\d+|promax|pro|plus)', Path(relative).stem):
        shared = model_from_name(Path(relative).stem, brand)
        if shared: model = shared.replace('&', ' + ')
    if not model and brand in {'Motorola', 'Huawei', 'Xiaomi', 'LG'}:
        model = model_from_name(stem, brand)
    if not model and is_laptop and brand == 'Apple':
        m = re.search(r'(?i)\bA\d{4}\b', stem)
        if m: model = m[0].upper()
    if not model and len(parts) == 2 and brand == 'Motorola':
        m = re.search(r'(?i)moto\s+[a-z]\d*(?:\s+plus)?(?:\s+XT\d+)?', stem)
        if m: model = m[0]
    # Never turn multi-model ranges and general courses into one device.
    if not model:
        model = 'General' if any(generic(p) and re.search(r'ways|edition|faqs|sharing|manual|notes|flowchart|reference', p, re.I) for p in folders) else 'Por revisar'
    model = model_label(model, brand)
    # Keep device revision/platform context out of generic source directories.
    if is_laptop: brand = 'Laptop-PC/' + brand
    return family, brand, model, model == 'Por revisar' or brand.endswith('Por revisar')


def classify(relative: str) -> tuple[str, str, str, bool]:
    """Product families have one physical root; database brand remains APPLE."""
    parts = Path(relative).parts
    if len(parts) == 4 and parts[0] in {'pdf', 'pcbe', 'media'} and parts[1] in {'iPhone', 'iPad'}:
        family = 'pcbe' if Path(relative).suffix.lower() in BOARDS else 'pdf'
        return family, parts[1], label(parts[2]), parts[2] == 'Por revisar'
    family, brand, model, review = classify_legacy(relative)
    if brand != 'Apple':
        return family, brand, model, review
    for product in ('iPhone', 'iPad'):
        if model.startswith(product + ' '):
            # Full model folders keep revision/platform qualifiers. A filename
            # disguised as a model folder must be parsed before publication.
            model = model[len(product) + 1:].strip()
            if product == 'iPhone' and re.search(r'(?i)bc surface', model):
                model = re.sub(r'(?i)-?bc surface', '', model).strip(' -')
            return family, product, model, review
    return family, brand, model, review


def safe(root: Path, relative: str) -> Path:
    p = root / relative
    if Path(relative).is_absolute() or '..' in Path(relative).parts or not p.resolve().is_relative_to(root.resolve()):
        raise ValueError(f'Unsafe path: {relative}')
    return p


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''): h.update(block)
    return h.hexdigest()


def plan(rows: list, catalog: dict, batch: str) -> dict:
    assets = {a['relativePath'].removeprefix('sources/'): a for a in catalog.get('assets', [])}
    occupied = {r['path'] for r in rows}
    out = []
    for row in sorted(rows, key=lambda r: r['path']):
        source = row['path']; ext = Path(source).suffix.lower()
        # User course uploads are not a schematic normalization batch.
        if Path(source).parts[0].casefold() == 'curso':
            continue
        if row.get('link'): raise ValueError('Symlink requires review: ' + source)
        if ext not in ASSETS | BOARDS | MEDIA:
            target = f'.library-history/{batch}/auxiliary/{source}'
            review = False
        else:
            family, brand, model, review = classify(source)
            name = filename(Path(source).name)
            # A removed source-folder board code must remain searchable in the
            # filename even if the original name was just "image.pdf".
            codes = re.findall(r'(?i)\b(?:SM|GT|SCH|SGH)-[a-z]?\d{3,5}[a-z0-9-]*|\bXT\d+[a-z0-9-]*', str(Path(source).parent))
            missing = sorted({c.lower() for c in codes if c.lower() not in name.lower()})
            if missing:
                p = Path(name); name = p.stem + ' [' + ', '.join(missing) + ']' + p.suffix
            target = f'{family}/{brand}/{model}/{name}'
        collision = target in occupied and target != source
        if collision:
            p = Path(target)
            token = hashlib.sha256(source.encode()).hexdigest()[:12]
            target = str(p.with_name(p.stem[:170] + f' [origen {token}]' + p.suffix))
        if target in occupied and target != source: raise ValueError('Target collision: ' + target)
        occupied.add(target)
        out.append({**row, 'source': source, 'target': target, 'review': review,
                    'collision': collision, 'sha256': assets.get(source, {}).get('sha256'),
                    'asset_id': assets.get(source, {}).get('id')})
    return {'version': 1, 'batch': batch, 'entries': out,
            'summary': {'files': len(out), 'moves': sum(r['source'] != r['target'] for r in out),
                        'review': sum(r['review'] for r in out), 'collisions': sum(r['collision'] for r in out)}}


def materialize(root: Path, manifest: dict, journal: Path) -> None:
    # Durable per-file journal, resumable without overwriting or discarding originals.
    with journal.open('a') as log:
        for i, item in enumerate(manifest['entries']):
            source = safe(root, item['source']); target = safe(root, item['target'])
            before = source.stat()
            if before.st_size != item['size'] or before.st_mtime_ns != item['mtime_ns']:
                raise ValueError('Source changed: ' + item['source'])
            actual = digest(source)
            if item.get('sha256') and item['sha256'] != actual: raise ValueError('Hash mismatch: ' + item['source'])
            item['sha256'] = actual
            if source != target:
                target.parent.mkdir(parents=True, exist_ok=True)
                if target.exists():
                    if not os.path.samefile(source, target): raise ValueError('Destination exists: ' + item['target'])
                else: os.link(source, target)
            if source.stat().st_mtime_ns != before.st_mtime_ns: raise ValueError('Source modified during hash')
            log.write(json.dumps({'source': item['source'], 'target': item['target'], 'sha256': actual}) + '\n')
            log.flush(); os.fsync(log.fileno())
            if i % 500 == 0: print(json.dumps({'verified': i + 1, 'total': len(manifest['entries'])}), flush=True)


def commit(root: Path, manifest: dict) -> None:
    # Preconditions checked for the entire batch before removing any original link.
    for item in manifest['entries']:
        source, target = safe(root, item['source']), safe(root, item['target'])
        if not target.is_file(): raise ValueError('Missing destination: ' + item['target'])
        if source != target and source.exists() and not os.path.samefile(source, target):
            raise ValueError('Destination is not the verified hard link')
    for item in manifest['entries']:
        source, target = safe(root, item['source']), safe(root, item['target'])
        if source != target and source.exists(): source.unlink()
    # Only directories made empty by this exact manifest. No recursive deletion.
    parents = set()
    for item in manifest['entries']:
        p = safe(root, item['source']).parent
        while p != root:
            parents.add(p); p = p.parent
    for p in sorted(parents, key=lambda p: len(p.parts), reverse=True):
        try: p.rmdir()
        except OSError as error:
            if error.errno not in {2, 39}: raise


def rollback(root: Path, manifest: dict) -> None:
    for item in manifest['entries']:
        source, target = safe(root, item['source']), safe(root, item['target'])
        if source == target: continue
        if not target.exists():
            if source.exists() and digest(source) == item['sha256']: continue
            raise ValueError('Neither verified link exists')
        if digest(target) != item['sha256']: raise ValueError('Changed destination')
        if source.exists() and not os.path.samefile(source, target): raise ValueError('Occupied original path')
    for item in manifest['entries']:
        source, target = safe(root, item['source']), safe(root, item['target'])
        if source == target or not target.exists(): continue
        source.parent.mkdir(parents=True, exist_ok=True)
        if not source.exists(): os.link(target, source)
        target.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['plan', 'materialize', 'commit', 'verify', 'rollback'])
    parser.add_argument('--manifest', required=True, type=Path)
    parser.add_argument('--inventory', type=Path)
    parser.add_argument('--catalog', type=Path)
    parser.add_argument('--batch')
    parser.add_argument('--root', type=Path, default=Path('/mnt/ESQUEMATICO'))
    parser.add_argument('--references-reconciled', type=Path)
    args = parser.parse_args()
    if args.mode == 'plan':
        result = plan(json.loads(args.inventory.read_text()), json.loads(args.catalog.read_text()), args.batch)
    else:
        result = json.loads(args.manifest.read_text())
        if args.mode == 'materialize': materialize(args.root, result, args.manifest.with_suffix('.journal.jsonl'))
        elif args.mode == 'commit':
            receipt = json.loads(args.references_reconciled.read_text()) if args.references_reconciled else {}
            if receipt.get('batch') != result['batch'] or receipt.get('applied') is not True:
                raise ValueError('A successful database/catalog reconciliation receipt is required')
            commit(args.root, result)
        elif args.mode == 'rollback': rollback(args.root, result)
        else:
            for item in result['entries']:
                p = safe(args.root, item['target'])
                if p.stat().st_size != item['size'] or digest(p) != item['sha256']: raise ValueError('Verification failed: ' + str(p))
    if args.mode != 'verify':
        tmp = args.manifest.with_suffix('.pending.json'); tmp.write_text(json.dumps(result, ensure_ascii=False, indent=2)); tmp.replace(args.manifest)
    print(json.dumps(result['summary']))


if __name__ == '__main__': main()
