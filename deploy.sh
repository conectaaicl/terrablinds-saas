#!/bin/bash
# =============================================================
# WorkshopOS — Script de despliegue en VPS
# Uso: ./deploy.sh
# Requisitos: Docker, Docker Compose v2, git
# =============================================================
set -e

echo "==> [1/5] Actualizando código..."
git pull origin main

echo "==> [2/5] Construyendo frontend (Vite + SingleFile)..."
docker build -f Dockerfile.frontend --target builder -t workshopos-fe-builder .
docker create --name fe_tmp workshopos-fe-builder sh
# Copiar archivos del dist interno directamente al dist del host (evita dist/dist anidado)
docker cp fe_tmp:/app/dist/. ./dist/
docker rm fe_tmp
docker rmi workshopos-fe-builder
echo "   Frontend OK — dist/ generado."

echo "==> [3/5] Construyendo imagen del backend..."
docker compose -f docker-compose.prod.yml build backend

echo "==> [4/5] Levantando servicios..."
docker compose -f docker-compose.prod.yml up -d

echo "==> [5/5] Verificando estado..."
sleep 3
docker compose -f docker-compose.prod.yml ps

echo ""
echo "WorkshopOS desplegado en https://works.conectaai.cl"
echo ""
echo "  Logs backend:  docker compose -f docker-compose.prod.yml logs -f backend"
echo "  Logs nginx:    docker compose -f docker-compose.prod.yml logs -f nginx"
echo "  Crear admin:   docker exec -it workshopos-backend python create_superadmin.py"
