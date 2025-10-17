
# ==================================================
# FSF Server - Production Dockerfile for Cloud Run
# ==================================================

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create directory for ChromaDB persistence
RUN mkdir -p /app/data/chroma_db

# Copy application code
COPY . .

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production command
# Cloud Run will inject PORT env var, but default to 8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 4

