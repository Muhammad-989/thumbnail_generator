"""Process queued Wan video jobs on a CUDA GPU."""

from __future__ import annotations

import os
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient, ReturnDocument

from generate_video import MODEL_ID


PROJECT_ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = PROJECT_ROOT / "outputs" / "api"
MONGO_URL = os.getenv("MONGO_URL", "mongodb://127.0.0.1:27017/thumbnail_generator")
POLL_SECONDS = float(os.getenv("WORKER_POLL_SECONDS", "2"))
stopping = False


def stop_worker(_signum: int, _frame: object) -> None:
    global stopping
    stopping = True


def now() -> datetime:
    return datetime.now(timezone.utc)


def claim_job(collection):
    return collection.find_one_and_update(
        {"status": "queued"},
        {"$set": {"status": "processing", "startedAt": now()}},
        sort=[("createdAt", 1)],
        return_document=ReturnDocument.AFTER,
    )


def process_job(collection, pipe, torch, export_to_video, job) -> None:
    job_id = job["_id"]
    filename = f"{job_id}.mp4"
    output_path = OUTPUT_DIR / filename
    try:
        generator = torch.Generator(device="cuda").manual_seed(job["seed"])
        result = pipe(
            prompt=job["prompt"],
            height=job["height"],
            width=job["width"],
            num_frames=job["frames"],
            guidance_scale=job["guidanceScale"],
            num_inference_steps=job["steps"],
            generator=generator,
        )
        export_to_video(result.frames[0], str(output_path), fps=job["fps"])
        collection.update_one(
            {"_id": job_id, "status": "processing"},
            {"$set": {"status": "completed", "outputFilename": filename, "completedAt": now()}},
        )
    except Exception as error:
        if output_path.exists():
            output_path.unlink()
        collection.update_one(
            {"_id": job_id, "status": "processing"},
            {"$set": {"status": "failed", "error": str(error)[:2000], "completedAt": now()}},
        )
        print(f"Video job {job_id} failed: {error}", file=sys.stderr)


def main() -> int:
    signal.signal(signal.SIGINT, stop_worker)
    signal.signal(signal.SIGTERM, stop_worker)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    import torch
    from diffusers import WanPipeline
    from diffusers.utils import export_to_video

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is unavailable; the Wan video worker requires an NVIDIA GPU.")

    print(f"Loading {MODEL_ID} on {torch.cuda.get_device_name(0)}")
    pipe = WanPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.float16)
    if os.getenv("VIDEO_CPU_OFFLOAD", "false").lower() == "true":
        pipe.enable_model_cpu_offload()
    else:
        pipe.to("cuda")

    client = MongoClient(MONGO_URL)
    collection = client.thumbnail_generator.videojobs
    client.admin.command("ping")
    print("Video worker ready.")
    while not stopping:
        job = claim_job(collection)
        if job is None:
            time.sleep(POLL_SECONDS)
            continue
        print(f"Processing video job {job['_id']}")
        process_job(collection, pipe, torch, export_to_video, job)

    client.close()
    print("Video worker stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
