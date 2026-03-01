from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.cotizaciones import service
from app.cotizaciones.schemas import CotizacionCreate, CotizacionOut, CotizacionPatch
from app.dependencies import get_db_for_tenant

router = APIRouter(prefix="/cotizaciones", tags=["cotizaciones"])

ROLES_COTIZACION = ("jefe", "gerente", "coordinador", "vendedor")


@router.get("/", response_model=list[CotizacionOut])
async def listar_cotizaciones(
    token_data: TokenData = Depends(require_roles(*ROLES_COTIZACION)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    return await service.listar(db, token_data.tenant_id, token_data.role, token_data.user_id)


@router.post("/", response_model=CotizacionOut, status_code=201)
async def crear_cotizacion(
    data: CotizacionCreate,
    token_data: TokenData = Depends(require_roles(*ROLES_COTIZACION)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    return await service.crear(db, data, token_data.user_id, token_data.tenant_id)


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


@router.post("/{cot_id}/convertir", response_model=CotizacionOut)
async def convertir_cotizacion(
    cot_id: UUID,
    token_data: TokenData = Depends(require_roles(*ROLES_COTIZACION)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    return await service.convertir_a_orden(
        db, cot_id, token_data.user_id, token_data.tenant_id, token_data.role
    )
