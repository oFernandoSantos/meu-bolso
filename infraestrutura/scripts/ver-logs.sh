#!/usr/bin/env bash
set -e

docker compose --env-file .env -f docker-compose.yml -f docker-compose.producao.yml logs -f "${1:-backend}"
