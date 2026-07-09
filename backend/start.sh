#!/usr/bin/env bash
set -e
python manage.py migrate
exec gunicorn coffeechain.wsgi:application --bind "0.0.0.0:${PORT:-8000}"
