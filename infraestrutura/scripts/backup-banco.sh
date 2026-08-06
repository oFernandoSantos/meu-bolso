#!/usr/bin/env bash
set -e

: "${POSTGRES_DB:?POSTGRES_DB obrigatorio}"
: "${POSTGRES_USER:?POSTGRES_USER obrigatorio}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD obrigatorio}"

export PGPASSWORD="${POSTGRES_PASSWORD}"
mkdir -p /backups
ARQUIVO="/backups/${POSTGRES_DB}-$(date +%F-%H%M%S).sql.gz"
pg_dump -h postgres -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${ARQUIVO}"
echo "Backup salvo em ${ARQUIVO}"
