#!/bin/sh
# Script de inicio para producción.
# Ejecuta las migraciones SQL y luego inicia el servidor.
set -e

echo "==> WorkshopOS Backend — Iniciando..."

# Esperar a que PostgreSQL esté listo
echo "==> Esperando a PostgreSQL..."
until python -c "
import asyncio, asyncpg, os
async def check():
    url = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(url)
    await conn.close()
asyncio.run(check())
" 2>/dev/null; do
  echo "   PostgreSQL no disponible, reintentando en 2s..."
  sleep 2
done
echo "   PostgreSQL listo."

# Crear tablas base con SQLAlchemy (idempotente — checkfirst=True por defecto)
# NOTA: excluimos 'audit_log' porque la migración 003 la crea como PARTITIONED TABLE.
# Si SQLAlchemy la creara como tabla normal primero, los CREATE TABLE ... PARTITION OF
# fallarían. Todas las demás tablas se pueden crear sin problemas antes de las migraciones.
echo "==> Creando/verificando tablas base (SQLAlchemy)..."
python -c "
import asyncio
import app.models  # registra todos los modelos en Base.metadata
from app.models.base import Base
from app.database import engine

# Tablas manejadas exclusivamente por migraciones SQL (particionadas u otras especiales)
SKIP_TABLES = {'audit_log'}

async def create_tables():
    async with engine.begin() as conn:
        tables = [t for name, t in Base.metadata.tables.items() if name not in SKIP_TABLES]
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))
    await engine.dispose()
    print('   Tablas base OK.')

asyncio.run(create_tables())
"

# Ejecutar migraciones SQL (índices, RLS, funciones, extensiones)
echo "==> Ejecutando migraciones SQL..."
python -c "
import asyncio, asyncpg, os, glob

async def run_migrations():
    url = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(url)

    # Tabla de control de migraciones
    await conn.execute('''
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            filename TEXT UNIQUE NOT NULL,
            applied_at TIMESTAMPTZ DEFAULT NOW()
        )
    ''')

    # Buscar y ejecutar migraciones pendientes en orden
    migration_files = sorted(glob.glob('migrations/*.sql'))
    for filepath in migration_files:
        filename = os.path.basename(filepath)
        exists = await conn.fetchval(
            'SELECT 1 FROM _migrations WHERE filename = \$1', filename
        )
        if exists:
            print(f'   [skip] {filename}')
            continue
        print(f'   [apply] {filename}...')
        with open(filepath) as f:
            sql = f.read()
        await conn.execute(sql)
        await conn.execute(
            'INSERT INTO _migrations (filename) VALUES (\$1)', filename
        )
        print(f'   [done] {filename}')

    await conn.close()
    print('==> Migraciones completadas.')

asyncio.run(run_migrations())
"

# Iniciar servidor
echo "==> Iniciando uvicorn..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${WORKERS:-2}" \
  --loop uvloop \
  --access-log
