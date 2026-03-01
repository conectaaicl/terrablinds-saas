#!/usr/bin/env bash
# =============================================================
# WorkshopOS — Script de despliegue en VPS
# Dominio: works.conectaai.cl
#
# Uso:
#   Primer deploy:  bash deploy.sh --first-run
#   Actualización:  bash deploy.sh
# =============================================================
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
FIRST_RUN=false

for arg in "$@"; do
  case $arg in
    --first-run) FIRST_RUN=true ;;
  esac
done

# ── 1. Verificar que existe el .env ───────────────────────────
if [ ! -f ".env" ]; then
  echo "ERROR: No existe el archivo .env"
  echo "Copiar .env.example como .env y completar todos los valores"
  exit 1
fi

# ── 2. Verificar certificados SSL ────────────────────────────
if [ ! -f "nginx/ssl/cloudflare-origin.crt" ] || [ ! -f "nginx/ssl/cloudflare-origin.key" ]; then
  echo "ERROR: Faltan certificados SSL en nginx/ssl/"
  echo "Ver nginx/ssl/README.md para instrucciones"
  exit 1
fi

# ── 3. Build del frontend ─────────────────────────────────────
echo "→ Construyendo frontend..."
npm run build -- --mode production
echo "✓ Frontend construido en dist/"

# ── 4. Build y levantar servicios ─────────────────────────────
echo "→ Levantando servicios Docker..."
docker compose -f "$COMPOSE_FILE" build --no-cache backend
docker compose -f "$COMPOSE_FILE" up -d

# ── 5. Esperar que la DB esté lista ───────────────────────────
echo "→ Esperando base de datos..."
sleep 8

# ── 6. Ejecutar migración SQL de RLS (solo primer deploy) ─────
if [ "$FIRST_RUN" = true ]; then
  echo "→ Aplicando migración RLS y constraints..."
  docker compose -f "$COMPOSE_FILE" exec -T db \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -f /docker-entrypoint-initdb.d/002_rls.sql 2>/dev/null || true

  echo "→ Creando superadmin inicial..."
  echo "  Email del superadmin:"
  read -r SUPERADMIN_EMAIL
  echo "  Contraseña (min. 12 caracteres):"
  read -rs SUPERADMIN_PASSWORD
  echo ""

  docker compose -f "$COMPOSE_FILE" exec -e \
    SUPERADMIN_EMAIL="$SUPERADMIN_EMAIL" \
    SUPERADMIN_PASSWORD="$SUPERADMIN_PASSWORD" \
    backend python create_superadmin.py

  echo "✓ Primer deploy completado"
fi

# ── 7. Estado final ───────────────────────────────────────────
echo ""
echo "✓ WorkshopOS desplegado en https://works.conectaai.cl"
docker compose -f "$COMPOSE_FILE" ps
