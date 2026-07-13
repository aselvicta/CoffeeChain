#!/usr/bin/env bash
set -e
python manage.py migrate
python manage.py backfill_receipt_payloads || true
if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "SEED_DEMO=true — running seed_demo..."
  python manage.py seed_demo
fi
exec gunicorn coffeechain.wsgi:application --bind "0.0.0.0:${PORT:-8000}"
