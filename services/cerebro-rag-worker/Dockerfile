FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        poppler-utils \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-spa \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 ragworker

WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
RUN pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install .

USER ragworker
EXPOSE 8080

CMD ["uvicorn", "cerebro_rag.server:app", "--host", "0.0.0.0", "--port", "8080"]
