FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-cpu.txt .
RUN python -m pip install --upgrade pip \
    && python -m pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision \
    && python -m pip install -r requirements-cpu.txt --extra-index-url https://download.pytorch.org/whl/cpu

COPY train_local.py validate_dataset.py generate_image.py ./
COPY tests ./tests

CMD ["python", "validate_dataset.py", "curated_captioned_thumbnails"]
