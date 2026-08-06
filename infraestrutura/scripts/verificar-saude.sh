#!/usr/bin/env bash
set -e

curl -fsSL "${1:-http://localhost/api/health}" || {
  echo "Falha no health check"
  exit 1
}
