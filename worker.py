"""Process queued thumbnail jobs while keeping the diffusion pipeline in memory."""

from __future__ import annotations

import os
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient, ReturnDocument

from generate_image import create_pipeline, generate_image


PROJECT_ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = PROJECT_ROOT / "outputs" / "api"
MONGO_URL = os.getenv("MONGO_URL", "mongodb://127.0.0.1:27017/thumbnail_generator")
POLL_SECONDS = float(os.getenv("WORKER_POLL_SECONDS", "2"))
LORA_DIR = Path(os.getenv("LORA_DIR", str(PROJECT_ROOT / "outputs" / "smoke_test")))

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


def process_job(collection, pipeline, job) -> None:
    job_id = job["_id"]
    filename = f"{job_id}.png"
    output_path = OUTPUT_DIR / filename
    try:
        generate_image(
            pipeline,
            prompt=job["prompt"],
            output=output_path,
            steps=job["steps"],
            seed=job["seed"],
            width=job["width"],
            height=job["height"],
        )
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
        print(f"Job {job_id} failed: {error}", file=sys.stderr)


def main() -> int:
    signal.signal(signal.SIGINT, stop_worker)
    signal.signal(signal.SIGTERM, stop_worker)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    client = MongoClient(MONGO_URL)
    collection = client.thumbnail_generator.generationjobs
    client.admin.command("ping")
    pipeline, device = create_pipeline(LORA_DIR)
    print("Worker ready; diffusion pipeline loaded.")

    while not stopping:
        job = claim_job(collection)
        if job is None:
            time.sleep(POLL_SECONDS)
            continue
        print(f"Processing job {job['_id']}")
        process_job(collection, pipeline, job)

    client.close()
    print("Worker stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
