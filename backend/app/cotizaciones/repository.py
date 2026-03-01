from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cotizacion import Cotizacion


async def get_next_numero(db: AsyncSession, tenant_id: str) -> int:
    result = await db.execute(
        text("SELECT get_next_cotizacion_numero(:tid)"),
        {"tid": tenant_id},
    )
    return result.scalar_one()


async def create(db: AsyncSession, cotizacion: Cotizacion) -> Cotizacion:
    db.add(cotizacion)
    await db.flush()
    await db.refresh(cotizacion, ["client", "vendedor"])
    return cotizacion


async def get_by_id(db: AsyncSession, cot_id: UUID, tenant_id: str) -> Cotizacion | None:
    result = await db.execute(
        select(Cotizacion)
        .options(selectinload(Cotizacion.client), selectinload(Cotizacion.vendedor))
        .where(Cotizacion.id == cot_id, Cotizacion.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def list_all(db: AsyncSession, tenant_id: str, vendedor_id: int | None = None) -> list[Cotizacion]:
    q = (
        select(Cotizacion)
        .options(selectinload(Cotizacion.client), selectinload(Cotizacion.vendedor))
        .where(Cotizacion.tenant_id == tenant_id)
        .order_by(Cotizacion.created_at.desc())
    )
    if vendedor_id is not None:
        q = q.where(Cotizacion.vendedor_id == vendedor_id)
    result = await db.execute(q)
    return list(result.scalars().all())
