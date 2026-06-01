from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, delete, text
from sqlalchemy.orm import selectinload
from typing import List

from app.dependencies import get_db_for_tenant as get_db
from app.auth.dependencies import require_roles, TokenData
from app.programacion.models import Programacion, programacion_tecnicos
from app.programacion.schemas import ProgramacionCreate, ProgramacionUpdate, ProgramacionOut
from app.models.user import User

router = APIRouter(prefix="/programacion", tags=["programacion"])

ROLES_VER    = ("jefe", "gerente", "coordinador", "instalador", "superadmin")
ROLES_EDITAR = ("jefe", "gerente", "coordinador", "superadmin")

@router.get("/", response_model=List[ProgramacionOut])
async def listar(
    token: TokenData = Depends(require_roles(*ROLES_VER)),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Programacion)
        .where(Programacion.tenant_id == token.tenant_id)
        .options(selectinload(Programacion.tecnicos))
        .order_by(Programacion.fecha, Programacion.hora)
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=ProgramacionOut)
async def crear(
    body: ProgramacionCreate,
    token: TokenData = Depends(require_roles(*ROLES_EDITAR)),
    db: AsyncSession = Depends(get_db),
):
    if body.fecha < date.today():
        raise HTTPException(status_code=400, detail="No se puede programar en una fecha pasada")

    prog = Programacion(
        tenant_id=token.tenant_id,
        fecha=body.fecha,
        hora=body.hora,
        tipo_visita=body.tipo_visita,
        cliente_nombre=body.cliente_nombre,
        cliente_telefono=body.cliente_telefono,
        cliente_direccion=body.cliente_direccion,
        ot=body.ot,
        vendedor_nombre=body.vendedor_nombre,
        descripcion_trabajo=body.descripcion_trabajo,
        observaciones=body.observaciones,
        creado_por=token.user_id,
    )
    db.add(prog)
    await db.flush()

    if body.tecnico_ids:
        for tid in body.tecnico_ids:
            await db.execute(
                insert(programacion_tecnicos).values(programacion_id=prog.id, user_id=tid)
            )
    await db.flush()

    result = await db.execute(
        select(Programacion).where(Programacion.id == prog.id).options(selectinload(Programacion.tecnicos))
    )
    return result.scalar_one()

@router.put("/{prog_id}", response_model=ProgramacionOut)
async def actualizar(
    prog_id: int,
    body: ProgramacionUpdate,
    token: TokenData = Depends(require_roles(*ROLES_EDITAR)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Programacion)
        .where(Programacion.id == prog_id, Programacion.tenant_id == token.tenant_id)
    )
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(404, "No encontrada")

    prog.fecha = body.fecha
    prog.hora = body.hora
    prog.tipo_visita = body.tipo_visita
    prog.cliente_nombre = body.cliente_nombre
    prog.cliente_telefono = body.cliente_telefono
    prog.cliente_direccion = body.cliente_direccion
    prog.ot = body.ot
    prog.vendedor_nombre = body.vendedor_nombre
    prog.descripcion_trabajo = body.descripcion_trabajo
    prog.observaciones = body.observaciones

    await db.execute(
        delete(programacion_tecnicos).where(programacion_tecnicos.c.programacion_id == prog_id)
    )
    if body.tecnico_ids:
        for tid in body.tecnico_ids:
            await db.execute(
                insert(programacion_tecnicos).values(programacion_id=prog_id, user_id=tid)
            )
    await db.flush()

    result = await db.execute(
        select(Programacion).where(Programacion.id == prog_id).options(selectinload(Programacion.tecnicos))
    )
    return result.scalar_one()

@router.delete("/{prog_id}")
async def eliminar(
    prog_id: int,
    token: TokenData = Depends(require_roles(*ROLES_EDITAR)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Programacion).where(Programacion.id == prog_id, Programacion.tenant_id == token.tenant_id)
    )
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(404, "No encontrada")
    await db.execute(
        delete(programacion_tecnicos).where(programacion_tecnicos.c.programacion_id == prog_id)
    )
    await db.delete(prog)
    return {"ok": True}
