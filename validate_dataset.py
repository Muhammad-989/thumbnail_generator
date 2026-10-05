"""Validate the local thumbnail JSONL dataset without ML dependencies."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}


def find_metadata(root: Path) -> Path:
    matches = sorted(root.rglob("metadata.jsonl"))
    if not matches:
        raise FileNotFoundError(f"No metadata.jsonl found below {root}")
    return matches[0]


def validate(root: Path) -> int:
    metadata = find_metadata(root)
    missing: list[str] = []
    malformed: list[str] = []
    empty: list[str] = []
    records = 0
    for number, line in enumerate(metadata.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            malformed.append(f"line {number}")
            continue
        records += 1
        if not isinstance(record, dict) or not str(record.get("text", "")).strip():
            empty.append(f"line {number}")
        file_name = record.get("file_name") if isinstance(record, dict) else None
        path = (metadata.parent / str(file_name)).resolve() if file_name else None
        if not path or path.suffix.lower() not in SUPPORTED or not path.is_file():
            missing.append(f"line {number}: {file_name}")
    image_count = sum(1 for path in (metadata.parent / "images").rglob("*")
                      if path.is_file() and path.suffix.lower() in SUPPORTED)
    print(f"Metadata: {metadata}")
    print(f"Records: {records}")
    print(f"Images: {image_count}")
    for label, values in (("Missing images", missing), ("Malformed JSON", malformed), ("Empty captions", empty)):
        print(f"{label}: {len(values)}")
        for value in values[:10]:
            print(f"  {value}")
    passed = not missing and not malformed and not empty and records > 0
    print("Dataset validation PASSED" if passed else "Dataset validation FAILED")
    return 0 if passed else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", nargs="?", type=Path, default=Path("curated_captioned_thumbnails"))
    raise SystemExit(validate(parser.parse_args().dataset))
