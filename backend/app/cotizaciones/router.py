from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.auth.router import limiter
from app.cotizaciones import service
from app.cotizaciones.schemas import (
    ConvertirResponse,
    CotizacionCreate,
    CotizacionOut,
    CotizacionPatch,
)
from app.dependencies import get_db_for_tenant
from app.notifications.service import NotificationService

router = APIRouter(prefix="/cotizaciones", tags=["cotizaciones"])

ROLES_COTIZACION = ("jefe", "gerente", "coordinador", "vendedor")


@router.get("/", response_model=list[CotizacionOut])
async def listar_cotizaciones(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    client_id: int | None = None,
    token_data: TokenData = Depends(require_roles(*ROLES_COTIZACION)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    all_cots = await service.listar(db, token_data.tenant_id, token_data.role, token_data.user_id, client_id=client_id)
    return all_cots[skip: skip + limit]


@router.post("/", response_model=CotizacionOut, status_code=201)
@limiter.limit("20/minute")
async def crear_cotizacion(
    request: Request,
    data: CotizacionCreate,
    token_data: TokenData = Depends(require_roles(*ROLES_COTIZACION)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    cot = await service.crear(db, data, token_data.user_id, token_data.tenant_id)
    try:
        svc = NotificationService(db)
        cliente = getattr(cot, 'cliente_nombre', None) or 'cliente'
        total = getattr(cot, 'total', None)
        msg = f"💼 Nueva cotización de {cliente}" + (f" — ${total:,.0f}" if total else "")
        await svc.create_system_notification(token_data.tenant_id, msg, "info")
        await db.commit()
    except Exception:
        pass
    return cot


@router.get("/{cot_id}", response_model=CotizacionOut)
async def obtener_cotizacion(
    cot_id: UUID,
    token_data: TokenData = Depends(require_roles(*ROLES_COTIZACION)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    return await service.obtener(db, cot_id, token_data.tenant_id)


@router.patch("/{cot_id}", response_model=CotizacionOut)
async def actualizar_cotizacion(
    cot_id: UUID,
    data: CotizacionPatch,
    token_data: TokenData = Depends(require_roles(*ROLES_COTIZACION)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    return await service.actualizar(db, cot_id, data, token_data.tenant_id)


@router.post("/{cot_id}/convertir", response_model=ConvertirResponse)
async def convertir_cotizacion(
    cot_id: UUID,
    token_data: TokenData = Depends(require_roles(*ROLES_COTIZACION)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Convert a cotizacion to an order.

    The conversion always proceeds. If any product in the quote lacks sufficient
    inventory based on configured ReglaMaterial rules, the shortfall is reported
    in ``stock_warnings`` (list of strings) so the UI can alert the user.
    The created order is nested inside ``cotizacion.orden_id``.
    """
    return await service.convertir_a_orden(
        db, cot_id, token_data.user_id, token_data.tenant_id, token_data.role
    )
