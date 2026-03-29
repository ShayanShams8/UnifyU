#!/bin/bash
set -e
python3 /app/create_admin.py || true
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
