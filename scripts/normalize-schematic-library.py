#!/usr/bin/env python3
"""Plan/apply a safe, hash-checked schematic library normalization.

The command is intentionally conservative: it normalizes model directories,
keeps original filenames, never overwrites a different hash, and emits a map
for catalog updates.  It is designed to run on the MACCELL host, not in the
browser or in the application container.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


ASSET_RE = re.compile(r"\.(?:pdf|pcbe?|pcb)$", re.IGNORECASE)
CODE_RE = re.compile(
    r"(?i)(?<![a-z0-9])((?:sm|gt|sch|sgh)[-_ ]?[a-z]?\d{3,5}[a-z]{0,3}(?:-[a-z0-9])?)(?![a-z0-9])"
)
GENERIC = {
    "samsung", "galaxy", "service", "manual", "schematic", "schematics",
    "complete", "full", "common", "board", "pcb", "layer", "layout",
    "troubleshooting", "disassembly", "reassembly", "electrical", "part",
    "list", "product", "specification", "block", "diagram", "phone",
    "teardown", "exploded", "view", "reference", "only", "for", "repair",
    "level", "tshoo", "sch", "rev", "image", "free", "vip", "ve", "circuit",
    "charging", "solution", "carga", "sea", "mtk", "qcom", "exynos",
    "snapdragon", "variant", "mb", "sub", "test", "yidiantong", "internal",
    "photo", "by", "enkgsm", "location", "explain", "annotation", "fault",
    "atlas", "startup", "short", "contact", "route", "map", "value", "values",
    "diode", "blockdiagram",
}
VARIANTS = {
    "4g", "5g", "lte", "plus", "ultra", "edge", "core", "prime", "neo",
    "lite", "note", "fold", "flip", "active", "mini", "zoom", "pro", "power",
    "macro", "fusion", "play", "go", "max", "fe", "nacho", "ace", "star", "duos",
}
SOURCE_CATEGORIES = {
    "a series(vip)", "w series(vip)", "z series(vip)", "f series(vip)",
    "other models arranged by board number(vip)", "motorola(vip)", "motorola",
    "iphone(vip)", "iphone", "moto e series", "moto g series", "moto c series",
    "moto edge series", "moto one series", "moto p series", "moto razr series",
    "moto x series", "0、repair case",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def codes(text: str) -> list[str]:
    result: list[str] = []
    for match in CODE_RE.finditer(text):
        raw = match.group(1).rstrip(".,);]").replace("_", "-").replace(" ", "-")
        prefix = re.match(r"(?i)(sm|gt|sch|sgh)", raw)
        assert prefix is not None
        value = prefix.group(1).upper() + "-" + raw[len(prefix.group(1)):].lstrip("-").upper()
        if value not in result:
            result.append(value)
    return result


def cleaned_tokens(raw: str) -> list[str]:
    raw = re.sub(r"(?i)\.(?:pdf|pcbe?|pcb)$", "", raw)
    raw = CODE_RE.sub(" ", raw)
    raw = re.sub(r"(?i)\b(samsung|galaxy|motorola|iphone)\b", " ", raw)
    raw = raw.replace("_", " ").replace("-", " ").replace("(", " ").replace(")", " ")
    tokens: list[str] = []
    for token in raw.split():
        lowered = token.lower().strip(".,")
        if lowered in GENERIC or lowered in {"pdf", "pcbe", "pcb"}:
            continue
        if re.fullmatch(r"[0-9a-f]{5,}", lowered):
            continue
        if re.fullmatch(r"[a-z]{1,4}\d{2,}[a-z0-9]*", lowered) and not re.fullmatch(
            r"[asmnjwz]\d{1,3}[a-z]?", lowered
        ):
            continue
        if re.fullmatch(r"\d{4,}", lowered):
            continue
        if lowered in {"vuf5", "afb8b", "am28c", "lldm168c1", "ql1871b", "iz", "rev1", "rev10"}:
            continue
        tokens.append(token)
    return tokens


def title_tokens(tokens: list[str]) -> list[str]:
    result: list[str] = []
    for token in tokens:
        lowered = token.lower()
        if lowered in {"4g", "5g", "lte"}:
            result.append(lowered.upper())
        elif lowered in VARIANTS:
            result.append(lowered.title())
        elif re.fullmatch(r"[aA]\d{1,3}|[sS]\d{1,3}|[mMnNjJ]\d{1,3}|[wW]\d{1,3}|[zZ]\d{1,3}", token):
            result.append(token.upper())
        elif re.fullmatch(r"\d{4}", token):
            result.append(token)
        else:
            result.append(token[:1].upper() + token[1:].lower())
    return result


def commercial(raw: str) -> str:
    tokens = title_tokens(cleaned_tokens(raw))
    if not tokens:
        return ""
    if re.fullmatch(r"[A-Z]\d{1,3}", tokens[0], re.IGNORECASE) or re.fullmatch(
        r"Note\d+", tokens[0], re.IGNORECASE
    ):
        keep = [tokens[0]]
        for token in tokens[1:]:
            if token.upper() in {"4G", "5G", "LTE"} or token.lower() in VARIANTS or re.fullmatch(r"\d{4}", token):
                keep.append(token)
            elif tokens[0].upper().startswith("J") and token.lower() in {"ace", "neo"}:
                keep.append(token)
            else:
                break
        return " ".join(keep)
    return " ".join(tokens[:4])


def asset_kind(path: Path) -> str:
    return "Pcbe" if path.suffix.lower() in {".pcb", ".pcbe"} else "Pdf"


def samsung_target(path: Path, root: Path) -> tuple[Path, str, str | None]:
    relative = path.relative_to(root / "Samsung")
    parts = relative.parts
    code_candidates: list[str] = []
    for part in parts:
        code_candidates.extend(codes(part))
    code = max(code_candidates, key=len) if code_candidates else None
    model_dir = parts[0]
    model = commercial(model_dir)
    if not model and re.search(r"(?i)samsung|galaxy|\b(?:j|a|s|m|n)\d", path.name):
        model = commercial(path.name)
    if code and model and code.split("-", 1)[1].startswith(("A225", "A235", "A325", "A525")):
        if not re.search(r"\b[45]G\b", model, re.IGNORECASE):
            model += " 4G"
    folder = ("Samsung " + " ".join(part for part in (model, code) if part)).strip()
    return Path(folder) / asset_kind(path) / path.name, model, code


def staged_target(path: Path, batch: Path) -> tuple[Path, str, str | None]:
    relative = path.relative_to(batch)
    kind = "Pcbe" if relative.parts[0].lower() == "pcbe" else "Pdf"
    brand_index = next(i for i, part in enumerate(relative.parts) if part.upper() == "SAMSUNG")
    rest = relative.parts[brand_index + 1 :]
    code_candidates: list[str] = []
    for part in rest:
        code_candidates.extend(codes(part))
    code = max(code_candidates, key=len) if code_candidates else None
    directories = [part for part in rest[:-1] if part.lower() not in SOURCE_CATEGORIES and not part.lower().endswith("(vip)")]
    with_code = [part for part in directories if code and code.replace("-", "").lower() in part.replace("-", "").replace("_", "").replace(" ", "").lower()]
    model = commercial(with_code[0] if with_code else (directories[0] if directories else rest[-1]))
    if code and model and code.split("-", 1)[1].startswith(("A225", "A235", "A325", "A525")) and not re.search(r"\b[45]G\b", model, re.IGNORECASE):
        model += " 4G"
    folder = ("Samsung " + " ".join(part for part in (model, code) if part)).strip()
    return Path(folder) / kind / path.name, model, code


def staged_non_samsung_target(path: Path, batch: Path) -> Path:
    relative = path.relative_to(batch)
    kind = "Pcbe" if relative.parts[0].lower() == "pcbe" else "Pdf"
    brand_index = next(i for i, part in enumerate(relative.parts) if part.lower() in {"motorola(vip)", "iphone(vip)"})
    source_brand = relative.parts[brand_index]
    brand = "Motorola" if source_brand.lower().startswith("motorola") else "Iphone"
    tail = [part for part in relative.parts[brand_index + 1 : -1] if part.lower() not in SOURCE_CATEGORIES]
    model = tail[0] if tail else "Review"
    return Path(brand) / model / kind / path.name


def discover(root: Path, batch: Path | None) -> list[tuple[Path, Path, str, str | None, str]]:
    entries: list[tuple[Path, Path, str, str | None, str]] = []
    for path in sorted((root / "Samsung").rglob("*")):
        if path.is_file() and ASSET_RE.search(path.name):
            target, model, code = samsung_target(path, root)
            entries.append((path, target, model, code, "published"))
    if batch and batch.exists():
        for path in sorted(batch.rglob("*")):
            if not path.is_file() or not ASSET_RE.search(path.name):
                continue
            if "/SAMSUNG/" in path.as_posix().upper():
                target, model, code = staged_target(path, batch)
            elif any(part.lower() in {"motorola(vip)", "iphone(vip)"} for part in path.parts):
                target, model, code = staged_non_samsung_target(path, batch), "", None
            else:
                continue
            entries.append((path, target, model, code, "staging"))
    return entries


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--batch", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    batch = args.batch.resolve() if args.batch else None
    entries = discover(root, batch)
    # A folder such as ``Sm-j250`` may not contain the commercial name, while
    # another file for the same code does. Reuse only aliases observed in this
    # same library; never derive a commercial name from an external guess.
    aliases: dict[str, dict[str, int]] = defaultdict(dict)
    for _source, _target, model, code, _origin in entries:
        if model and code:
            aliases[code][model] = aliases[code].get(model, 0) + 1
    resolved: list[tuple[Path, Path, str, str | None, str]] = []
    for source, target, model, code, origin in entries:
        if not model and code and aliases.get(code):
            model = max(aliases[code], key=lambda value: (aliases[code][value], len(value), value))
            target = Path("Samsung " + model + " " + code) / target.parts[-2] / target.name
        resolved.append((source, target, model, code, origin))
    entries = resolved
    target_groups: dict[str, list[tuple[Path, Path, str, str | None, str]]] = defaultdict(list)
    for entry in entries:
        target_groups[str(entry[1])].append(entry)
    moves: list[dict[str, object]] = []
    review: list[dict[str, object]] = []
    collisions: list[dict[str, object]] = []
    for target_text, group in target_groups.items():
        if len(group) > 1:
            collisions.append({"target": target_text, "sources": [str(item[0]) for item in group]})
        for index, (source, target, model, code, origin) in enumerate(group):
            digest = sha256(source)
            final_target = target
            if index:
                variant = f"{target.stem}--variant-{digest[:8]}{target.suffix}"
                final_target = target.with_name(variant)
            record = {"source": str(source), "target": str(final_target), "model": model, "code": code, "origin": origin, "sha256": digest}
            moves.append(record)
            if origin == "published" and (not model or not code):
                review.append(record)
    report = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "root": str(root),
        "batch": str(batch) if batch else None,
        "assets": len(moves),
        "publishedAssets": sum(1 for item in moves if item["origin"] == "published"),
        "stagingAssets": sum(1 for item in moves if item["origin"] == "staging"),
        "targetModels": len({str(item["target"]).split("/")[0] for item in moves}),
        "targetCollisions": collisions,
        "review": review,
        "moves": moves,
    }
    if args.apply:
        final_targets = [str(item["target"]) for item in moves]
        if len(final_targets) != len(set(final_targets)):
            raise SystemExit("No se aplica: existen colisiones de destino después de crear variantes.")
        source_directories = {Path(str(item["source"])).parent for item in moves}
        for item in moves:
            source = Path(str(item["source"]))
            destination = root / str(item["target"])
            destination.parent.mkdir(parents=True, exist_ok=True)
            if source.resolve() == destination.resolve():
                continue
            if destination.exists():
                existing_hash = sha256(destination)
                if existing_hash != item["sha256"]:
                    raise SystemExit(f"No se aplica: colisión de hash en {destination}")
                source.unlink()
                item["disposition"] = "duplicate_exact_removed_from_staging"
                continue
            shutil.move(str(source), str(destination))
            item["disposition"] = "moved"
        for directory in sorted(source_directories, key=lambda value: len(value.parts), reverse=True):
            if directory == root or directory.name.startswith("."):
                continue
            try:
                directory.rmdir()
            except OSError:
                pass
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"assets": report["assets"], "publishedAssets": report["publishedAssets"], "stagingAssets": report["stagingAssets"], "targetModels": report["targetModels"], "targetCollisions": len(collisions), "review": len(review), "applied": args.apply}, ensure_ascii=False))


if __name__ == "__main__":
    main()
