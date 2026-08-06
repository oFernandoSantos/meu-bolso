#!/usr/bin/env bash
set -e

echo "Etapa manual segura para VPS Ubuntu."
echo "1. Atualize sistema: sudo apt update && sudo apt upgrade -y"
echo "2. Crie usuario admin e configure chave SSH."
echo "3. So desative login root e senha apos validar acesso por chave."
echo "4. Configure UFW para liberar apenas SSH, 80 e 443."
