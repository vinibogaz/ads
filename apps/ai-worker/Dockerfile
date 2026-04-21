# syntax=docker/dockerfile:1
# ORFFIA AI Worker — FastAPI Service (Multi-stage Build)

# ==================== STAGE 1: Builder ====================
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy all application files (needed for pip install with hatchling)
COPY apps/ai-worker ./

# Install dependencies to a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

# ==================== STAGE 2: Production Runtime ====================
FROM python:3.12-slim AS runner

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8000

# Install runtime dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* && \
    addgroup --system --gid 1001 aiworker && \
    adduser --system --uid 1001 --gid 1001 aiworker

# Copy virtual environment from builder
COPY --from=builder --chown=aiworker:aiworker /opt/venv /opt/venv

# Copy application code
COPY --chown=aiworker:aiworker apps/ai-worker/src ./src

# Activate virtual environment
ENV PATH="/opt/venv/bin:$PATH"

USER aiworker

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
