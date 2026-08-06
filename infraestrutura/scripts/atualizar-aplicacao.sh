#!/usr/bin/env bash
set -e

git pull --ff-only
docker compose --env-file .env -f docker-compose.yml -f docker-compose.producao.yml up -d --build
