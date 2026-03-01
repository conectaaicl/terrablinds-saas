"""
Gestión de sesiones de base de datos.

get_db() → sesión sin RLS configurado.
  USO: router de auth (login/refresh) donde no hay usuario aún,
       y tenants/health que no requieren aislamiento por tenant.

El RLS se configura en app/dependencies.py a través de get_db_for_tenant(),
que recibe el tenant_id del JWT y ejecuta SET LOCAL antes de cada query.
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,   # detecta conexiones muertas antes de usarlas
    echo=False,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Sesión base sin configuración de RLS.
    Usar SOLO en auth router y endpoints sin datos de tenant.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
