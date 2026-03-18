"""
Averías y Fallas — sistema de reportes de instaladores.

GET    /averias/              — Listar (jefe/gerente/coordinador/instalador)
POST   /averias/              — Crear reporte (instalador/coordinador/jefe)
GET    /averias/stats         — Estadísticas (jefe/gerente/coordinador)
GET    /averias/{id}          — Detalle
PATCH  /averias/{id}          — Actualizar (estado, asignado_a, notas, presupuesto)
DELETE /averias/{id}          — Eliminar (solo jefe/gerente)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_roles, TokenData
from app.dependencies import get_db_for_tenant
from app.models.averia import Averia
from app.models.client import Client
from app.models.user import User

router = APIRouter(prefix="/averias", tags=["averias"])

ROLES_READ = ["jefe", "gerente", "coordinador", "instalador", "superadmin"]
ROLES_WRITE = ["jefe", "gerente", "coordinador", "instalador", "superadmin"]
ROLES_MANAGE = ["jefe", "gerente", "coordinador", "superadmin"]

TIPOS_SERVICIO = [
    "cortinas_roller", "persianas", "electricidad", "puertas", "ventanas",
    "maderas", "muebles", "climatizacion", "iluminacion", "plomeria",
    "automatizacion", "seguridad", "otro",
]

TIPO_LABELS = {
    "cortinas_roller": "Cortinas Roller",
    "persianas": "Persianas",
    "electricidad": "Electricidad",
    "puertas": "Puertas",
    "ventanas": "Ventanas",
    "maderas": "Maderas / Carpintería",
    "muebles": "Muebles",
    "climatizacion": "Climatización",
    "iluminacion": "Iluminación",
    "plomeria": "Plomería",
    "automatizacion": "Automatización",
    "seguridad": "Seguridad",
    "otro": "Otro",
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class AveriaCreate(BaseModel):
    tipo_servicio: str
    titulo: str
    descripcion: Optional[str] = None
    severidad: str = "media"
    client_id: Optional[int] = None
    order_id: Optional[int] = None
    fotos: list[str] = []
    notas_tecnicas: Optional[str] = None
    presupuesto_estimado: Optional[int] = None


class AveriaUpdate(BaseModel):
    estado: Optional[str] = None
    severidad: Optional[str] = None
    asignado_a: Optional[int] = None
    client_id: Optional[int] = None
    notas_tecnicas: Optional[str] = None
    presupuesto_estimado: Optional[int] = None
    descripcion: Optional[str] = None


class AveriaOut(BaseModel):
    id: int
    tenant_id: str
    client_id: Optional[int]
    client_nombre: Optional[str] = None
    order_id: Optional[int]
    instalador_id: Optional[int]
    instalador_nombre: Optional[str] = None
    asignado_a: Optional[int]
    asignado_nombre: Optional[str] = None
    tipo_servicio: str
    tipo_servicio_label: str
    titulo: str
    descripcion: Optional[str]
    severidad: str
    estado: str
    fotos: list
    notas_tecnicas: Optional[str]
    presupuesto_estimado: Optional[int]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_out(a: Averia, client: Optional[Client] = None,
            instalador: Optional[User] = None, asignado: Optional[User] = None) -> AveriaOut:
    return AveriaOut(
        id=a.id,
        tenant_id=a.tenant_id,
        client_id=a.client_id,
        client_nombre=client.nombre if client else None,
        order_id=a.order_id,
        instalador_id=a.instalador_id,
        instalador_nombre=instalador.nombre if instalador else None,
        asignado_a=a.asignado_a,
        asignado_nombre=asignado.nombre if asignado else None,
        tipo_servicio=a.tipo_servicio,
        tipo_servicio_label=TIPO_LABELS.get(a.tipo_servicio, a.tipo_servicio),
        titulo=a.titulo,
        descripcion=a.descripcion,
        severidad=a.severidad,
        estado=a.estado,
        fotos=a.fotos or [],
        notas_tecnicas=a.notas_tecnicas,
        presupuesto_estimado=a.presupuesto_estimado,
        created_at=a.created_at.isoformat() if a.created_at else None,
        updated_at=a.updated_at.isoformat() if a.updated_at else None,
    )


async def _load_relations(db: AsyncSession, averia: Averia):
    client = None
    if averia.client_id:
        r = await db.execute(select(Client).where(Client.id == averia.client_id))
        client = r.scalar_one_or_none()
    instalador = None
    if averia.instalador_id:
        r = await db.execute(select(User).where(User.id == averia.instalador_id))
        instalador = r.scalar_one_or_none()
    asignado = None
    if averia.asignado_a:
        r = await db.execute(select(User).where(User.id == averia.asignado_a))
        asignado = r.scalar_one_or_none()
    return client, instalador, asignado


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[AveriaOut])
async def list_averias(
    estado: Optional[str] = None,
    tipo_servicio: Optional[str] = None,
    severidad: Optional[str] = None,
    client_id: Optional[int] = None,
    solo_mias: bool = False,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*ROLES_READ)),
):
    stmt = select(Averia).where(Averia.tenant_id == token.tenant_id)

    # Instaladores solo ven sus propias averías por defecto
    if token.role == "instalador" or solo_mias:
        stmt = stmt.where(Averia.instalador_id == token.user_id)

    if estado:
        stmt = stmt.where(Averia.estado == estado)
    if tipo_servicio:
        stmt = stmt.where(Averia.tipo_servicio == tipo_servicio)
    if severidad:
        stmt = stmt.where(Averia.severidad == severidad)
    if client_id:
        stmt = stmt.where(Averia.client_id == client_id)

    stmt = stmt.order_by(Averia.created_at.desc())
    result = await db.execute(stmt)
    averias = result.scalars().all()

    out = []
    for a in averias:
        client, instalador, asignado = await _load_relations(db, a)
        out.append(_to_out(a, client, instalador, asignado))
    return out


@router.get("/stats")
async def averia_stats(
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*ROLES_MANAGE)),
):
    base = select(Averia).where(Averia.tenant_id == token.tenant_id)

    total_r = await db.execute(select(func.count(Averia.id)).where(Averia.tenant_id == token.tenant_id))
    total = total_r.scalar() or 0

    # By estado
    estado_r = await db.execute(
        select(Averia.estado, func.count(Averia.id)).where(Averia.tenant_id == token.tenant_id).group_by(Averia.estado)
    )
    por_estado = {row[0]: row[1] for row in estado_r.fetchall()}

    # By severidad
    sev_r = await db.execute(
        select(Averia.severidad, func.count(Averia.id)).where(Averia.tenant_id == token.tenant_id).group_by(Averia.severidad)
    )
    por_severidad = {row[0]: row[1] for row in sev_r.fetchall()}

    # By tipo_servicio
    tipo_r = await db.execute(
        select(Averia.tipo_servicio, func.count(Averia.id)).where(Averia.tenant_id == token.tenant_id).group_by(Averia.tipo_servicio)
    )
    por_tipo = {row[0]: row[1] for row in tipo_r.fetchall()}

    criticas = por_severidad.get("critica", 0)
    abiertas = sum(v for k, v in por_estado.items() if k not in ("reparada", "cerrada"))

    return {
        "total": total,
        "abiertas": abiertas,
        "criticas": criticas,
        "por_estado": por_estado,
        "por_severidad": por_severidad,
        "por_tipo": por_tipo,
    }


@router.post("/", response_model=AveriaOut, status_code=201)
async def create_averia(
    body: AveriaCreate,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*ROLES_WRITE)),
):
    averia = Averia(
        tenant_id=token.tenant_id,
        instalador_id=token.user_id,
        tipo_servicio=body.tipo_servicio,
        titulo=body.titulo,
        descripcion=body.descripcion,
        severidad=body.severidad,
        client_id=body.client_id,
        order_id=body.order_id,
        fotos=body.fotos or [],
        notas_tecnicas=body.notas_tecnicas,
        presupuesto_estimado=body.presupuesto_estimado,
    )
    db.add(averia)
    await db.commit()
    await db.refresh(averia)
    client, instalador, asignado = await _load_relations(db, averia)
    return _to_out(averia, client, instalador, asignado)


@router.get("/{averia_id}", response_model=AveriaOut)
async def get_averia(
    averia_id: int,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*ROLES_READ)),
):
    result = await db.execute(
        select(Averia).where(Averia.id == averia_id, Averia.tenant_id == token.tenant_id)
    )
    averia = result.scalar_one_or_none()
    if not averia:
        raise HTTPException(404, "Avería no encontrada")
    # Instaladores solo pueden ver sus propias
    if token.role == "instalador" and averia.instalador_id != token.user_id:
        raise HTTPException(403, "Sin acceso")
    client, instalador, asignado = await _load_relations(db, averia)
    return _to_out(averia, client, instalador, asignado)


@router.patch("/{averia_id}", response_model=AveriaOut)
async def update_averia(
    averia_id: int,
    body: AveriaUpdate,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*ROLES_WRITE)),
):
    result = await db.execute(
        select(Averia).where(Averia.id == averia_id, Averia.tenant_id == token.tenant_id)
    )
    averia = result.scalar_one_or_none()
    if not averia:
        raise HTTPException(404, "Avería no encontrada")

    # Instaladores solo pueden actualizar sus propias y solo ciertos campos
    if token.role == "instalador":
        if averia.instalador_id != token.user_id:
            raise HTTPException(403, "Sin acceso")
        # Limit what instalador can update
        allowed_fields = {"descripcion", "notas_tecnicas", "fotos"}
        data = body.model_dump(exclude_none=True)
        data = {k: v for k, v in data.items() if k in allowed_fields}
    else:
        data = body.model_dump(exclude_none=True)

    for k, v in data.items():
        setattr(averia, k, v)

    await db.commit()
    await db.refresh(averia)
    client, instalador, asignado = await _load_relations(db, averia)
    return _to_out(averia, client, instalador, asignado)


@router.delete("/{averia_id}", status_code=204)
async def delete_averia(
    averia_id: int,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles("jefe", "gerente", "superadmin")),
):
    result = await db.execute(
        select(Averia).where(Averia.id == averia_id, Averia.tenant_id == token.tenant_id)
    )
    averia = result.scalar_one_or_none()
    if not averia:
        raise HTTPException(404, "Avería no encontrada")
    await db.delete(averia)
    await db.commit()
