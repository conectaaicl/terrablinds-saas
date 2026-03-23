"""
Solicitudes de Permisos y Vacaciones.

  GET    /permisos/          — Listar (admins: todo; trabajadores: solo las propias)
  POST   /permisos/          — Crear solicitud (cualquier usuario)
  PATCH  /permisos/{id}      — Aprobar/rechazar (solo jefe/gerente/coordinador)
  DELETE /permisos/{id}      — Cancelar propia solicitud pendiente
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.models.leave_request import SolicitudPermiso
from app.leave.schemas import SolicitudCreate, SolicitudRevisar, SolicitudResponse

router = APIRouter(prefix="/permisos", tags=["permisos"])

ROLES_ADMIN = ("jefe", "gerente", "coordinador", "superadmin")
ROLES_ALL = ("jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "bodegas", "superadmin")


@router.get("/", response_model=list[SolicitudResponse])
async def listar(
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    q = select(SolicitudPermiso).where(SolicitudPermiso.tenant_id == token_data.tenant_id)
    if token_data.role not in ROLES_ADMIN:
        q = q.where(SolicitudPermiso.solicitante_id == token_data.user_id)
    q = q.order_by(SolicitudPermiso.created_at.desc())
    result = await db.execute(q)
    items = result.scalars().all()
    return [await _enrich(db, s, token_data.tenant_id) for s in items]


@router.post("/", response_model=SolicitudResponse, status_code=201)
async def crear(
    data: SolicitudCreate,
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    sol = SolicitudPermiso(
        tenant_id=token_data.tenant_id,
        solicitante_id=token_data.user_id,
        **data.model_dump(),
    )
    db.add(sol)
    await db.commit()
    await db.refresh(sol)
    return await _enrich(db, sol, token_data.tenant_id)


@router.patch("/{sol_id}", response_model=SolicitudResponse)
async def revisar(
    sol_id: UUID,
    data: SolicitudRevisar,
    token_data: TokenData = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    sol = await _get_or_404(db, sol_id, token_data.tenant_id)
    if data.estado not in ("aprobada", "rechazada"):
        raise HTTPException(400, "Estado inválido")
    sol.estado = data.estado
    sol.respuesta = data.respuesta
    sol.revisado_por = token_data.user_id
    sol.revisado_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(sol)
    return await _enrich(db, sol, token_data.tenant_id)


@router.delete("/{sol_id}", status_code=204)
async def cancelar(
    sol_id: UUID,
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    sol = await _get_or_404(db, sol_id, token_data.tenant_id)
    if sol.solicitante_id != token_data.user_id and token_data.role not in ROLES_ADMIN:
        raise HTTPException(403, "Sin permisos")
    if sol.estado != "pendiente":
        raise HTTPException(400, "Solo se pueden cancelar solicitudes pendientes")
    await db.delete(sol)
    await db.commit()


async def _get_or_404(db: AsyncSession, sol_id: UUID, tenant_id: str) -> SolicitudPermiso:
    result = await db.execute(
        select(SolicitudPermiso).where(
            SolicitudPermiso.id == sol_id,
            SolicitudPermiso.tenant_id == tenant_id,
        )
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Solicitud no encontrada")
    return s


async def _enrich(db: AsyncSession, s: SolicitudPermiso, tenant_id: str) -> SolicitudResponse:
    try:
        ids = list({s.solicitante_id, s.revisado_por} - {None})
        result = await db.execute(
            text("SELECT id, nombre, rol FROM users WHERE id = ANY(:ids) AND (tenant_id = :tid OR tenant_id IS NULL)"),
            {"ids": ids, "tid": tenant_id},
        )
        users = {r.id: (r.nombre, r.rol) for r in result.fetchall()}
    except Exception:
        users = {}

    sol_info = users.get(s.solicitante_id, (None, None))
    rev_info = users.get(s.revisado_por, (None, None)) if s.revisado_por else (None, None)

    return SolicitudResponse(
        id=s.id,
        tenant_id=s.tenant_id,
        solicitante_id=s.solicitante_id,
        solicitante_nombre=sol_info[0],
        solicitante_rol=sol_info[1],
        tipo=s.tipo,
        fecha_inicio=s.fecha_inicio.isoformat(),
        fecha_fin=s.fecha_fin.isoformat(),
        dias=s.dias,
        motivo=s.motivo,
        estado=s.estado,
        respuesta=s.respuesta,
        revisado_por=s.revisado_por,
        revisado_por_nombre=rev_info[0],
        revisado_at=s.revisado_at.isoformat() if s.revisado_at else None,
        created_at=s.created_at.isoformat(),
    )
