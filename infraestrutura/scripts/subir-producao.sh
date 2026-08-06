#!/usr/bin/env bash
set -e

docker compose --env-file .env -f docker-compose.yml -f docker-compose.producao.yml up -d --build
