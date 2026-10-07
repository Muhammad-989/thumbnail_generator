"""Local SDXL LoRA training wrapper with dataset validation and smoke-test modes."""

from __future__ import annotations

import argparse
import json
import logging
import os
import platform
import shlex
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"
ZIP_PATH = Path("curated_captioned_thumbnails.zip")
EXTRACT_DIR = Path("data/curated_dataset")
OUTPUT_DIR = Path("outputs/sdxl-youtube-thumbnail-lora")
RESOLUTION = 1024
MAX_TRAIN_STEPS = 1200
CHECKPOINT_STEPS = 100
CHECKPOINT_LIMIT = 5
TRAIN_BATCH_SIZE = 1
GRADIENT_ACCUMULATION_STEPS = 4
LEARNING_RATE = 1e-4
LORA_RANK = 16
RESUME_FROM_CHECKPOINT: str | None = None

# =================================================
# FIRST TEST ONLY: CPU SMOKE TEST
# =================================================
SMOKE_TEST = True
SMOKE_EXAMPLES = 8
SMOKE_STEPS = 2
SMOKE_RESOLUTION = 256

# =================================================
# TINY GPU HARDWARE TEST
# =================================================
GPU_SMOKE_TEST = False
GPU_SMOKE_EXAMPLES = 8
GPU_SMOKE_STEPS = 3
GPU_SMOKE_RESOLUTION = 512

OFFICIAL_SCRIPT_URL = (
    "https://raw.githubusercontent.com/huggingface/diffusers/v0.30.3/"
    "examples/text_to_image/train_text_to_image_lora_sdxl.py"
)
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
LOGGER = logging.getLogger("train_local")


@dataclass(frozen=True)
class DatasetInfo:
    root: Path
    metadata_path: Path
    records: list[dict[str, str]]
    image_count: int


def find_metadata(root: Path) -> Path:
    candidates = sorted(root.rglob("metadata.jsonl"))
    if not candidates:
        raise FileNotFoundError(f"Could not find metadata.jsonl below {root}")
    return candidates[0]


def safe_extract(zip_path: Path, destination: Path) -> Path:
    if not zip_path.is_file():
        raise FileNotFoundError(f"Dataset ZIP not found: {zip_path}")
    destination.mkdir(parents=True, exist_ok=True)
    destination_resolved = destination.resolve()
    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            target = (destination / member.filename).resolve()
            if os.path.commonpath([str(destination_resolved), str(target)]) != str(destination_resolved):
                raise ValueError(f"Unsafe ZIP member path: {member.filename}")
        archive.extractall(destination)
    return find_metadata(destination).parent


def load_dataset(dataset_root: Path, limit: int | None = None) -> DatasetInfo:
    metadata_path = find_metadata(dataset_root)
    records: list[dict[str, str]] = []
    errors: list[str] = []
    for line_number, line in enumerate(metadata_path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            item: Any = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"line {line_number}: malformed JSON ({exc.msg})")
            continue
        if not isinstance(item, dict):
            errors.append(f"line {line_number}: record is not an object")
            continue
        file_name = item.get("file_name")
        caption = item.get("text")
        if not isinstance(file_name, str) or not file_name.strip():
            errors.append(f"line {line_number}: missing file_name")
            continue
        if not isinstance(caption, str) or not caption.strip():
            errors.append(f"line {line_number}: empty text caption")
            continue
        image_path = (metadata_path.parent / file_name).resolve()
        if image_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            errors.append(f"line {line_number}: unsupported image type: {file_name}")
            continue
        if not image_path.is_file():
            errors.append(f"line {line_number}: missing image: {file_name}")
            continue
        records.append({"file_name": file_name, "text": caption})
        if limit is not None and len(records) >= limit:
            break
    if errors:
        raise ValueError("Dataset validation failed:\n" + "\n".join(errors[:20]))
    image_count = sum(
        1 for path in (metadata_path.parent / "images").rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )
    return DatasetInfo(metadata_path.parent, metadata_path, records, image_count)


def detect_device(preferred: str = "auto") -> tuple[str, str | None]:
    if preferred == "directml":
        try:
            import importlib

            torch_directml = importlib.import_module("torch_directml")
        except ImportError as exc:
            raise RuntimeError(
                "DirectML was requested, but torch-directml is not installed. "
                "Use the native Windows AMD setup in README.md."
            ) from exc
        return "directml", str(torch_directml.device())
    try:
        import torch
    except ImportError:
        return "cpu", None
    if preferred == "cpu":
        return "cpu", None
    if preferred == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested, but torch.cuda.is_available() is False.")
    if torch.cuda.is_available():
        return "cuda", torch.cuda.get_device_name(0)
    return "cpu", None


def print_environment(device: str, gpu_name: str | None, resolution: int, steps: int, resume: str | None) -> None:
    print(f"Python: {platform.python_version()}")
    for package in ("torch", "diffusers", "transformers", "accelerate"):
        try:
            module = __import__(package)
            print(f"{package}: {getattr(module, '__version__', 'unknown')}")
        except ImportError:
            print(f"{package}: not installed")
    try:
        import torch
        print(f"CUDA available: {torch.cuda.is_available()}")
        print(f"CUDA device count: {torch.cuda.device_count()}")
    except ImportError:
        print("CUDA available: unavailable (torch is not installed)")
    print(f"Device: {device}" + (f" ({gpu_name})" if gpu_name else ""))
    print(f"Selected precision: {'fp16' if device == 'cuda' else 'no fp16'}")
    print(f"Resolution: {resolution}; max steps: {steps}; checkpoint interval: {CHECKPOINT_STEPS}")
    print(f"Resume: {resume or 'none'}")


def checkpoint_path(output_dir: Path, resume: str | None) -> Path | None:
    if not resume:
        return None
    if not output_dir.is_dir():
        raise FileNotFoundError(f"Cannot resume: output directory does not exist: {output_dir}")
    if resume == "latest":
        candidates = sorted(
            (p for p in output_dir.glob("checkpoint-*") if p.is_dir()),
            key=lambda p: int(p.name.split("-")[-1]) if p.name.split("-")[-1].isdigit() else -1,
        )
        if not candidates:
            raise FileNotFoundError(f"No checkpoints found in {output_dir}")
        return candidates[-1]
    selected = output_dir / resume
    if not selected.is_dir():
        raise FileNotFoundError(f"Requested checkpoint does not exist: {selected}")
    return selected


def _script_path() -> Path:
    path = Path(".cache") / "diffusers" / "train_text_to_image_lora_sdxl.py"
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        print(f"Downloading pinned Diffusers training script ({OFFICIAL_SCRIPT_URL})")
        urllib.request.urlretrieve(OFFICIAL_SCRIPT_URL, path)
    return path


def run_training(info: DatasetInfo, *, gpu: bool, output_dir: Path, steps: int, resolution: int,
                 examples: int | None, resume: str | None, gpu_smoke: bool = False,
                 use_8bit_adam: bool = False, device_preference: str = "auto") -> int:
    device, gpu_name = detect_device(device_preference)
    if device == "directml":
        raise RuntimeError(
            "DirectML is not supported by the official Diffusers SDXL LoRA training "
            "script used here. This project cannot safely run LoRA training on a "
            "non-ROCm AMD GPU. Use a ROCm-compatible Linux setup, an NVIDIA GPU, "
            "or CPU training."
        )
    if gpu and device != "cuda":
        raise RuntimeError("GPU training was requested, but CUDA is unavailable. Install CUDA PyTorch and verify torch.cuda.is_available().")
    selected_precision = "fp16" if gpu and device == "cuda" else "no"
    output_dir.mkdir(parents=True, exist_ok=True)
    resume_path = checkpoint_path(output_dir, resume)
    print_environment(device, gpu_name, resolution, steps, str(resume_path) if resume_path else None)
    log_path = output_dir / f"training-{time.strftime('%Y%m%d-%H%M%S')}.log"
    training_info = info
    if examples is not None and examples < len(info.records):
        subset_root = output_dir / "_smoke_dataset"
        if subset_root.exists():
            shutil.rmtree(subset_root)
        (subset_root / "images").mkdir(parents=True)
        subset_records = info.records[:examples]
        for record in subset_records:
            source = info.root / record["file_name"]
            target = subset_root / record["file_name"]
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        (subset_root / "metadata.jsonl").write_text(
            "\n".join(json.dumps(record) for record in subset_records) + "\n",
            encoding="utf-8",
        )
        training_info = DatasetInfo(subset_root, subset_root / "metadata.jsonl", subset_records, examples)
    script = _script_path()
    command = [
        sys.executable, str(script), "--pretrained_model_name_or_path", MODEL_ID,
        "--train_data_dir", str(training_info.root), "--output_dir", str(output_dir),
        "--resolution", str(resolution), "--train_batch_size", str(TRAIN_BATCH_SIZE),
        "--gradient_accumulation_steps", str(GRADIENT_ACCUMULATION_STEPS),
        "--learning_rate", str(LEARNING_RATE), "--rank", str(LORA_RANK),
        "--max_train_steps", str(steps), "--checkpointing_steps", str(1 if gpu_smoke else CHECKPOINT_STEPS),
        "--checkpoints_total_limit", str(CHECKPOINT_LIMIT), "--dataloader_num_workers", "0",
        "--seed", "42",
    ]
    if selected_precision == "fp16":
        command += ["--mixed_precision", "fp16", "--gradient_checkpointing"]
    if use_8bit_adam:
        try:
            __import__("bitsandbytes")
        except ImportError as exc:
            raise RuntimeError(
                "8-bit Adam was requested, but bitsandbytes is not installed or cannot load on this platform."
            ) from exc
        command += ["--use_8bit_adam"]
    if resume_path:
        command += ["--resume_from_checkpoint", str(resume_path)]
    printable = " ".join(shlex.quote(part) for part in command)
    print(f"Starting training: {printable}")
    with log_path.open("w", encoding="utf-8") as log:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        assert process.stdout is not None
        for line in process.stdout:
            print(line, end="")
            log.write(line)
        return_code = process.wait()
    print(f"Training log: {log_path}")
    if return_code != 0:
        raise RuntimeError(f"Training process failed with exit code {return_code}")
    return return_code


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--gpu", action="store_true", help="Run production GPU training.")
    parser.add_argument("--gpu-smoke-test", action="store_true")
    parser.add_argument("--device", choices=("auto", "cpu", "cuda", "directml"), default="auto",
                        help="Select hardware backend. DirectML is for generation only.")
    parser.add_argument("--train-smoke", action="store_true", help="Attempt the real CPU smoke step.")
    parser.add_argument("--zip", type=Path, default=ZIP_PATH)
    parser.add_argument("--extract-dir", type=Path, default=EXTRACT_DIR)
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--steps", type=int, default=None)
    parser.add_argument("--resolution", type=int, default=None)
    parser.add_argument("--examples", type=int, default=None,
                        help="Limit smoke-test training to this many validated examples.")
    parser.add_argument("--resume", default=RESUME_FROM_CHECKPOINT)
    parser.add_argument("--use-8bit-adam", action="store_true",
                        help="Enable bitsandbytes 8-bit Adam for GPU training only.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.zip.exists():
            dataset_root = safe_extract(args.zip, args.extract_dir)
        elif args.extract_dir.exists():
            dataset_root = args.extract_dir
        elif Path("curated_captioned_thumbnails").exists():
            dataset_root = Path("curated_captioned_thumbnails")
            print(f"ZIP not found; using extracted dataset: {dataset_root}")
        else:
            raise FileNotFoundError(
                f"Dataset ZIP not found ({args.zip}) and no extracted dataset directory was found."
            )
        info = load_dataset(dataset_root)
        print(f"Metadata records: {len(info.records)}")
        print(f"Image files: {info.image_count}")
        print(f"Dataset directory: {info.root}")
        for record in info.records[:3]:
            print(f"Resolved image: {(info.root / record['file_name']).resolve()}")
        if args.validate_only:
            print("Dataset validation passed")
            return 0
        gpu = args.gpu or args.gpu_smoke_test
        if args.device == "directml" and (gpu or args.train_smoke):
            raise RuntimeError(
                "DirectML generation is supported experimentally, but DirectML LoRA "
                "training is not supported by this official training wrapper."
            )
        if args.gpu_smoke_test:
            output_dir, steps, resolution = Path("outputs/gpu_smoke_test"), GPU_SMOKE_STEPS, GPU_SMOKE_RESOLUTION
        elif gpu:
            output_dir, steps, resolution = OUTPUT_DIR, MAX_TRAIN_STEPS, RESOLUTION
        else:
            output_dir, steps, resolution = Path("outputs/smoke_test"), SMOKE_STEPS, SMOKE_RESOLUTION
        output_dir = args.output_dir or output_dir
        steps = args.steps or steps
        resolution = args.resolution or resolution
        requested_examples = args.examples if args.examples is not None else (
            GPU_SMOKE_EXAMPLES if args.gpu_smoke_test else SMOKE_EXAMPLES
        )
        if requested_examples < 1:
            raise ValueError("--examples must be at least 1")
        if not gpu and not args.train_smoke:
            output_dir.mkdir(parents=True, exist_ok=True)
            (output_dir / "smoke_test_summary.txt").write_text(
                "Validation-only CPU smoke test completed.\n"
                f"Examples processed: {min(SMOKE_EXAMPLES, len(info.records))}\n"
                "Steps completed: 0\n",
                encoding="utf-8",
            )
            print("CPU smoke test passed")
            print(f"Examples processed: {min(requested_examples, len(info.records))}")
            print("Steps completed: 0 (validation-only fallback; use --train-smoke to attempt model training)")
            print(f"Output directory: {output_dir}")
            return 0
        selected_examples = args.examples if args.examples is not None else (
            GPU_SMOKE_EXAMPLES if args.gpu_smoke_test else (None if gpu else SMOKE_EXAMPLES)
        )
        code = run_training(info, gpu=gpu, output_dir=output_dir, steps=steps, resolution=resolution,
                            examples=selected_examples, resume=args.resume,
                            gpu_smoke=args.gpu_smoke_test, use_8bit_adam=args.use_8bit_adam,
                            device_preference=args.device)
        print(("GPU" if gpu else "CPU") + " smoke test passed" if (args.gpu_smoke_test or not gpu) else "GPU training completed")
        print(f"Examples processed: {len(info.records)}")
        print(f"Steps completed: {steps}")
        print(f"Output directory: {output_dir}")
        return code
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
