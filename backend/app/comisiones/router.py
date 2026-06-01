from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.models.comision import Comision, Liquidacion, ReglaComision
from app.models.user import User

router = APIRouter(tags=["comisiones"])


class ReglaCreate(BaseModel):
    categoria: str
    rol: str
    monto_por_unidad: int
    descripcion: Optional[str] = None


class ReglaUpdate(BaseModel):
    monto_por_unidad: Optional[int] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class LiquidacionGenerar(BaseModel):
    user_id: int
    periodo: str
    sueldo_base: int = 0


class AjusteUpdate(BaseModel):
    ajustes: int
    notas_ajustes: Optional[str] = None


@router.get("/comisiones/reglas")
async def list_reglas(
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    result = await db.execute(
        select(ReglaComision).where(
            ReglaComision.tenant_id == token_data.tenant_id
        ).order_by(ReglaComision.categoria, ReglaComision.rol)
    )
    reglas = result.scalars().all()
    return [
        {
            "id": r.id,
            "categoria": r.categoria,
            "rol": r.rol,
            "monto_por_unidad": r.monto_por_unidad,
            "descripcion": r.descripcion,
            "activo": r.activo,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reglas
    ]


@router.post("/comisiones/reglas", status_code=201)
async def create_regla(
    data: ReglaCreate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    existing = await db.execute(
        select(ReglaComision).where(
            ReglaComision.tenant_id == token_data.tenant_id,
            ReglaComision.categoria == data.categoria,
            ReglaComision.rol == data.rol,
        )
    )
    if existing.scalars().first():
        raise HTTPException(400, "Ya existe una regla para esta categoria y rol")
    regla = ReglaComision(
        tenant_id=token_data.tenant_id,
        categoria=data.categoria,
        rol=data.rol,
        monto_por_unidad=data.monto_por_unidad,
        descripcion=data.descripcion,
        activo=True,
    )
    db.add(regla)
    await db.commit()
    await db.refresh(regla)
    return {
        "id": regla.id,
        "categoria": regla.categoria,
        "rol": regla.rol,
        "monto_por_unidad": regla.monto_por_unidad,
        "descripcion": regla.descripcion,
        "activo": regla.activo,
    }


@router.patch("/comisiones/reglas/{regla_id}")
async def update_regla(
    regla_id: int,
    data: ReglaUpdate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    result = await db.execute(
        select(ReglaComision).where(
            ReglaComision.id == regla_id,
            ReglaComision.tenant_id == token_data.tenant_id,
        )
    )
    regla = result.scalars().first()
    if not regla:
        raise HTTPException(404, "Regla no encontrada")
    if data.monto_por_unidad is not None:
        regla.monto_por_unidad = data.monto_por_unidad
    if data.descripcion is not None:
        regla.descripcion = data.descripcion
    if data.activo is not None:
        regla.activo = data.activo
    await db.commit()
    return {"ok": True, "id": regla.id, "monto_por_unidad": regla.monto_por_unidad}


@router.delete("/comisiones/reglas/{regla_id}", status_code=204)
async def delete_regla(
    regla_id: int,
    token_data: TokenData = Depends(require_roles("jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    result = await db.execute(
        select(ReglaComision).where(
            ReglaComision.id == regla_id,
            ReglaComision.tenant_id == token_data.tenant_id,
        )
    )
    regla = result.scalars().first()
    if not regla:
        raise HTTPException(404, "Regla no encontrada")
    await db.delete(regla)
    await db.commit()


@router.get("/comisiones/resumen")
async def resumen_comisiones(
    periodo: Optional[str] = None,
    token_data: TokenData = Depends(require_roles("jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    periodo = periodo or datetime.now(timezone.utc).strftime("%Y-%m")
    result = await db.execute(
        select(
            Comision.user_id,
            Comision.rol,
            func.sum(Comision.total).label("total"),
            func.count(Comision.id).label("cantidad_registros"),
        ).where(
            Comision.tenant_id == token_data.tenant_id,
            Comision.periodo == periodo,
        ).group_by(Comision.user_id, Comision.rol)
    )
    rows = result.all()
    user_ids = list({r.user_id for r in rows})
    usuarios = {}
    if user_ids:
        user_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in user_result.scalars().all():
            usuarios[u.id] = u.nombre
    resumen = {}
    for row in rows:
        uid = row.user_id
        if uid not in resumen:
            resumen[uid] = {
                "user_id": uid,
                "nombre": usuarios.get(uid, "Usuario " + str(uid)),
                "rol": row.rol,
                "total": 0,
                "cantidad_registros": 0,
            }
        resumen[uid]["total"] += row.total or 0
        resumen[uid]["cantidad_registros"] += row.cantidad_registros or 0
    return {"periodo": periodo, "empleados": list(resumen.values())}


@router.get("/comisiones/mis-comisiones")
async def mis_comisiones(
    periodo: Optional[str] = None,
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "vendedor", "fabricante", "instalador", "coordinador"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    periodo = periodo or datetime.now(timezone.utc).strftime("%Y-%m")
    result = await db.execute(
        select(Comision).where(
            Comision.tenant_id == token_data.tenant_id,
            Comision.user_id == token_data.user_id,
            Comision.periodo == periodo,
        ).order_by(Comision.created_at.desc())
    )
    comisiones = result.scalars().all()
    total = sum(c.total for c in comisiones)
    return {
        "periodo": periodo,
        "total": total,
        "comisiones": [
            {
                "id": c.id,
                "order_id": c.order_id,
                "rol": c.rol,
                "categoria": c.categoria,
                "cantidad": c.cantidad,
                "monto_por_unidad": c.monto_por_unidad,
                "total": c.total,
                "estado": c.estado,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in comisiones
        ],
    }


@router.get("/comisiones/usuario/{user_id}")
async def comisiones_usuario(
    user_id: int,
    periodo: Optional[str] = None,
    token_data: TokenData = Depends(require_roles("jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    periodo = periodo or datetime.now(timezone.utc).strftime("%Y-%m")
    result = await db.execute(
        select(Comision).where(
            Comision.tenant_id == token_data.tenant_id,
            Comision.user_id == user_id,
            Comision.periodo == periodo,
        ).order_by(Comision.created_at.desc())
    )
    comisiones = result.scalars().all()
    total = sum(c.total for c in comisiones)
    return {
        "user_id": user_id,
        "periodo": periodo,
        "total": total,
        "comisiones": [
            {
                "id": c.id,
                "order_id": c.order_id,
                "rol": c.rol,
                "categoria": c.categoria,
                "cantidad": c.cantidad,
                "monto_por_unidad": c.monto_por_unidad,
                "total": c.total,
                "estado": c.estado,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in comisiones
        ],
    }


@router.get("/liquidaciones/")
async def list_liquidaciones(
    periodo: Optional[str] = None,
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    query = select(Liquidacion).where(Liquidacion.tenant_id == token_data.tenant_id)
    if token_data.role not in ("jefe", "gerente"):
        query = query.where(Liquidacion.user_id == token_data.user_id)
    if periodo:
        query = query.where(Liquidacion.periodo == periodo)
    query = query.order_by(Liquidacion.periodo.desc(), Liquidacion.user_id)
    result = await db.execute(query)
    liquidaciones = result.scalars().all()
    user_ids = list({liq.user_id for liq in liquidaciones})
    usuarios = {}
    if user_ids:
        user_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in user_result.scalars().all():
            usuarios[u.id] = {
                "nombre": u.nombre,
                "rol": u.rol.value if hasattr(u.rol, "value") else str(u.rol),
            }
    return [
        {
            "id": liq.id,
            "user_id": liq.user_id,
            "nombre": usuarios.get(liq.user_id, {}).get("nombre", "Usuario " + str(liq.user_id)),
            "rol_usuario": usuarios.get(liq.user_id, {}).get("rol", ""),
            "periodo": liq.periodo,
            "sueldo_base": liq.sueldo_base,
            "total_comisiones": liq.total_comisiones,
            "ajustes": liq.ajustes,
            "notas_ajustes": liq.notas_ajustes,
            "total": liq.total,
            "estado": liq.estado,
            "aprobado_por": liq.aprobado_por,
            "aprobado_at": liq.aprobado_at.isoformat() if liq.aprobado_at else None,
            "created_at": liq.created_at.isoformat() if liq.created_at else None,
        }
        for liq in liquidaciones
    ]


@router.post("/liquidaciones/generar", status_code=201)
async def generar_liquidacion(
    data: LiquidacionGenerar,
    token_data: TokenData = Depends(require_roles("jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    user_result = await db.execute(
        select(User).where(
            User.id == data.user_id,
            User.tenant_id == token_data.tenant_id,
        )
    )
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado en este tenant")
    comisiones_result = await db.execute(
        select(Comision).where(
            Comision.tenant_id == token_data.tenant_id,
            Comision.user_id == data.user_id,
            Comision.periodo == data.periodo,
        )
    )
    comisiones = comisiones_result.scalars().all()
    total_comisiones = sum(c.total for c in comisiones)
    existing_result = await db.execute(
        select(Liquidacion).where(
            Liquidacion.tenant_id == token_data.tenant_id,
            Liquidacion.user_id == data.user_id,
            Liquidacion.periodo == data.periodo,
        )
    )
    liq = existing_result.scalars().first()
    if liq:
        if liq.estado != "borrador":
            raise HTTPException(400, "Solo se puede regenerar una liquidacion en estado borrador")
        liq.sueldo_base = data.sueldo_base
        liq.total_comisiones = total_comisiones
        liq.total = data.sueldo_base + total_comisiones + liq.ajustes
    else:
        liq = Liquidacion(
            tenant_id=token_data.tenant_id,
            user_id=data.user_id,
            periodo=data.periodo,
            sueldo_base=data.sueldo_base,
            total_comisiones=total_comisiones,
            ajustes=0,
            total=data.sueldo_base + total_comisiones,
            estado="borrador",
        )
        db.add(liq)
    await db.commit()
    await db.refresh(liq)
    return {
        "id": liq.id,
        "user_id": liq.user_id,
        "nombre": user.nombre,
        "periodo": liq.periodo,
        "sueldo_base": liq.sueldo_base,
        "total_comisiones": liq.total_comisiones,
        "ajustes": liq.ajustes,
        "total": liq.total,
        "estado": liq.estado,
    }


@router.get("/liquidaciones/{liq_id}")
async def get_liquidacion(
    liq_id: int,
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    result = await db.execute(
        select(Liquidacion).where(
            Liquidacion.id == liq_id,
            Liquidacion.tenant_id == token_data.tenant_id,
        )
    )
    liq = result.scalars().first()
    if not liq:
        raise HTTPException(404, "Liquidacion no encontrada")
    if token_data.role not in ("jefe", "gerente") and liq.user_id != token_data.user_id:
        raise HTTPException(403, "Sin acceso a esta liquidacion")
    comisiones_result = await db.execute(
        select(Comision).where(
            Comision.tenant_id == token_data.tenant_id,
            Comision.user_id == liq.user_id,
            Comision.periodo == liq.periodo,
        ).order_by(Comision.created_at.desc())
    )
    comisiones = comisiones_result.scalars().all()
    user_result = await db.execute(select(User).where(User.id == liq.user_id))
    user = user_result.scalars().first()
    return {
        "id": liq.id,
        "user_id": liq.user_id,
        "nombre": user.nombre if user else "Usuario " + str(liq.user_id),
        "periodo": liq.periodo,
        "sueldo_base": liq.sueldo_base,
        "total_comisiones": liq.total_comisiones,
        "ajustes": liq.ajustes,
        "notas_ajustes": liq.notas_ajustes,
        "total": liq.total,
        "estado": liq.estado,
        "aprobado_por": liq.aprobado_por,
        "aprobado_at": liq.aprobado_at.isoformat() if liq.aprobado_at else None,
        "created_at": liq.created_at.isoformat() if liq.created_at else None,
        "comisiones": [
            {
                "id": c.id,
                "order_id": c.order_id,
                "rol": c.rol,
                "categoria": c.categoria,
                "cantidad": c.cantidad,
                "monto_por_unidad": c.monto_por_unidad,
                "total": c.total,
                "estado": c.estado,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in comisiones
        ],
    }


@router.patch("/liquidaciones/{liq_id}/aprobar")
async def aprobar_liquidacion(
    liq_id: int,
    token_data: TokenData = Depends(require_roles("jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    result = await db.execute(
        select(Liquidacion).where(
            Liquidacion.id == liq_id,
            Liquidacion.tenant_id == token_data.tenant_id,
        )
    )
    liq = result.scalars().first()
    if not liq:
        raise HTTPException(404, "Liquidacion no encontrada")
    if liq.estado != "borrador":
        raise HTTPException(400, "No se puede aprobar en estado " + liq.estado)
    liq.estado = "aprobada"
    liq.aprobado_por = token_data.user_id
    liq.aprobado_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True, "estado": liq.estado}


@router.patch("/liquidaciones/{liq_id}/pagar")
async def pagar_liquidacion(
    liq_id: int,
    token_data: TokenData = Depends(require_roles("jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    result = await db.execute(
        select(Liquidacion).where(
            Liquidacion.id == liq_id,
            Liquidacion.tenant_id == token_data.tenant_id,
        )
    )
    liq = result.scalars().first()
    if not liq:
        raise HTTPException(404, "Liquidacion no encontrada")
    if liq.estado != "aprobada":
        raise HTTPException(400, "Solo se puede pagar una liquidacion aprobada")
    liq.estado = "pagada"
    await db.commit()
    return {"ok": True, "estado": liq.estado}


@router.patch("/liquidaciones/{liq_id}/ajuste")
async def ajuste_liquidacion(
    liq_id: int,
    data: AjusteUpdate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    result = await db.execute(
        select(Liquidacion).where(
            Liquidacion.id == liq_id,
            Liquidacion.tenant_id == token_data.tenant_id,
        )
    )
    liq = result.scalars().first()
    if not liq:
        raise HTTPException(404, "Liquidacion no encontrada")
    if liq.estado == "pagada":
        raise HTTPException(400, "No se puede ajustar una liquidacion ya pagada")
    liq.ajustes = data.ajustes
    liq.notas_ajustes = data.notas_ajustes
    liq.total = liq.sueldo_base + liq.total_comisiones + liq.ajustes
    await db.commit()
    return {
        "ok": True,
        "ajustes": liq.ajustes,
        "notas_ajustes": liq.notas_ajustes,
        "total": liq.total,
    }
