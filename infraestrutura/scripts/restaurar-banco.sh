#!/usr/bin/env bash
set -e

ARQUIVO="${1:-}"
if [ -z "${ARQUIVO}" ]; then
  echo "Uso: restaurar-banco.sh caminho-do-backup.sql.gz"
  exit 1
fi

echo "Aviso: restauracao deve ser executada manualmente com ambiente parado e backup validado."
echo "Comando sugerido:"
echo "gunzip -c ${ARQUIVO} | psql -h postgres -U \$POSTGRES_USER -d \$POSTGRES_DB"
