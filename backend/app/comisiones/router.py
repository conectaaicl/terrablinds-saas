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
    meta_mensual: Optional[int] = None


class ReglaUpdate(BaseModel):
    categoria: Optional[str] = None
    monto_por_unidad: Optional[int] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None
    meta_mensual: Optional[int] = None


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
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "bodegas"
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
            "meta_mensual": r.meta_mensual,
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
        meta_mensual=data.meta_mensual,
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
        "meta_mensual": regla.meta_mensual,
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
    if data.categoria is not None:
        regla.categoria = data.categoria
    if data.monto_por_unidad is not None:
        regla.monto_por_unidad = data.monto_por_unidad
    if data.descripcion is not None:
        regla.descripcion = data.descripcion
    if data.activo is not None:
        regla.activo = data.activo
    if data.meta_mensual is not None:
        regla.meta_mensual = data.meta_mensual
    await db.commit()
    return {"ok": True, "id": regla.id, "categoria": regla.categoria, "monto_por_unidad": regla.monto_por_unidad, "meta_mensual": regla.meta_mensual}


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
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
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


async def _puede_ver_propias(db, tenant_id: str, user_id: int) -> bool:
    """El jefe/gerente puede bloquear a un trabajador para que no vea sus
    propias comisiones/liquidaciones. Por defecto (columna no seteada o True)
    puede verlas."""
    result = await db.execute(
        select(User.puede_ver_comisiones).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    row = result.scalar_one_or_none()
    return row is not False


@router.get("/comisiones/mis-comisiones")
async def mis_comisiones(
    periodo: Optional[str] = None,
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "vendedor", "fabricante", "instalador", "coordinador", "bodegas"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    if token_data.role not in ("jefe", "gerente"):
        if not await _puede_ver_propias(db, token_data.tenant_id, token_data.user_id):
            raise HTTPException(403, "El jefe restringió el acceso a comisiones para tu cuenta")
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
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
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
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "bodegas"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    if token_data.role not in ("jefe", "gerente", "coordinador"):
        if not await _puede_ver_propias(db, token_data.tenant_id, token_data.user_id):
            raise HTTPException(403, "El jefe restringió el acceso a liquidaciones para tu cuenta")
    query = select(Liquidacion).where(Liquidacion.tenant_id == token_data.tenant_id)
    if token_data.role not in ("jefe", "gerente", "coordinador"):
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


async def _calcular_ajuste_metas(db, tenant_id, comisiones):
    """Categorias con meta mensual (ej. Roller) no se pagan por unidad -- se
    compara el total de unidades del mes contra la meta y se paga/descuenta
    una sola vez: (unidades_del_mes - meta) * monto_por_unidad.

    El rol usado para buscar la regla es el que quedo guardado en cada
    Comision (Comision.rol), NO el rol de la cuenta del usuario -- por ejemplo
    un jefe puede registrar trabajo propio "como instalador" sin dejar de ser
    jefe en el resto del sistema.
    """
    pares = {(c.categoria, c.rol) for c in comisiones}
    if not pares:
        return 0, []
    reglas_result = await db.execute(
        select(ReglaComision).where(
            ReglaComision.tenant_id == tenant_id,
            ReglaComision.meta_mensual.isnot(None),
        )
    )
    reglas_meta = {
        (r.categoria, r.rol): r for r in reglas_result.scalars().all()
        if (r.categoria, r.rol) in pares
    }
    if not reglas_meta:
        return 0, []
    cantidades: dict[tuple, int] = {}
    for c in comisiones:
        key = (c.categoria, c.rol)
        if key in reglas_meta:
            cantidades[key] = cantidades.get(key, 0) + c.cantidad
    ajuste_total = 0
    detalle = []
    for (categoria, rol), regla in reglas_meta.items():
        hechas = cantidades.get((categoria, rol), 0)
        diferencia = hechas - regla.meta_mensual
        monto = diferencia * regla.monto_por_unidad
        ajuste_total += monto
        detalle.append({
            "categoria": categoria,
            "rol": rol,
            "hechas": hechas,
            "meta": regla.meta_mensual,
            "monto_por_unidad": regla.monto_por_unidad,
            "ajuste": monto,
        })
    return ajuste_total, detalle


@router.post("/liquidaciones/generar", status_code=201)
async def generar_liquidacion(
    data: LiquidacionGenerar,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
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
    ajuste_metas, detalle_metas = await _calcular_ajuste_metas(
        db, token_data.tenant_id, comisiones
    )
    existing_result = await db.execute(
        select(Liquidacion).where(
            Liquidacion.tenant_id == token_data.tenant_id,
            Liquidacion.user_id == data.user_id,
            Liquidacion.periodo == data.periodo,
        )
    )
    nota_metas = (
        "; ".join(
            f"{d['categoria']}: {d['hechas']}/{d['meta']} -> ${d['ajuste']:,}".replace(",", ".")
            for d in detalle_metas
        )
        if detalle_metas else None
    )

    liq = existing_result.scalars().first()
    if liq:
        if liq.estado != "borrador":
            raise HTTPException(400, "Solo se puede regenerar una liquidacion en estado borrador")
        # El ajuste por meta puede haber cambiado desde la ultima vez (mas trabajo
        # registrado) -- se refresca solo esa porcion, sin tocar los ajustes
        # manuales (bono container, adelantos) que el jefe haya agregado encima.
        delta_metas = ajuste_metas - liq.ajuste_metas
        liq.ajustes = liq.ajustes + delta_metas
        liq.ajuste_metas = ajuste_metas
        if delta_metas != 0 and nota_metas:
            liq.notas_ajustes = (
                f"{liq.notas_ajustes} | actualizado: {nota_metas}" if liq.notas_ajustes else nota_metas
            )
        liq.sueldo_base = data.sueldo_base
        liq.total_comisiones = total_comisiones
        liq.total = data.sueldo_base + total_comisiones + liq.ajustes
    else:
        # Al crearla por primera vez, el ajuste por meta (ej. Roller) se deja
        # precargado en "ajustes" -- el jefe puede sumarle encima bono container,
        # viajes fuera de Santiago o restar adelantos usando /ajuste.
        liq = Liquidacion(
            tenant_id=token_data.tenant_id,
            user_id=data.user_id,
            periodo=data.periodo,
            sueldo_base=data.sueldo_base,
            total_comisiones=total_comisiones,
            ajustes=ajuste_metas,
            ajuste_metas=ajuste_metas,
            notas_ajustes=nota_metas,
            total=data.sueldo_base + total_comisiones + ajuste_metas,
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
        "notas_ajustes": liq.notas_ajustes,
        "total": liq.total,
        "estado": liq.estado,
        "detalle_metas": detalle_metas,
    }


@router.get("/liquidaciones/{liq_id}")
async def get_liquidacion(
    liq_id: int,
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "bodegas"
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
    if token_data.role not in ("jefe", "gerente", "coordinador") and liq.user_id != token_data.user_id:
        raise HTTPException(403, "Sin acceso a esta liquidacion")
    if token_data.role not in ("jefe", "gerente") and liq.user_id == token_data.user_id:
        if not await _puede_ver_propias(db, token_data.tenant_id, token_data.user_id):
            raise HTTPException(403, "El jefe restringió el acceso a liquidaciones para tu cuenta")
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


@router.get("/liquidaciones/{liq_id}/export")
async def exportar_liquidacion(
    liq_id: int,
    formato: str = "pdf",
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "bodegas"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    from fastapi.responses import Response as FastResponse
    from app.comisiones.export import generar_excel_liquidacion, generar_pdf_liquidacion

    if formato not in ("pdf", "xlsx"):
        raise HTTPException(400, "formato debe ser 'pdf' o 'xlsx'")

    result = await db.execute(
        select(Liquidacion).where(
            Liquidacion.id == liq_id,
            Liquidacion.tenant_id == token_data.tenant_id,
        )
    )
    liq = result.scalars().first()
    if not liq:
        raise HTTPException(404, "Liquidacion no encontrada")
    if token_data.role not in ("jefe", "gerente", "coordinador") and liq.user_id != token_data.user_id:
        raise HTTPException(403, "Sin acceso a esta liquidacion")
    if token_data.role not in ("jefe", "gerente") and liq.user_id == token_data.user_id:
        if not await _puede_ver_propias(db, token_data.tenant_id, token_data.user_id):
            raise HTTPException(403, "El jefe restringió el acceso a liquidaciones para tu cuenta")

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
    nombre = user.nombre if user else "Usuario " + str(liq.user_id)

    liq_dict = {
        "periodo": liq.periodo,
        "estado": liq.estado,
        "sueldo_base": liq.sueldo_base,
        "total_comisiones": liq.total_comisiones,
        "ajustes": liq.ajustes,
        "notas_ajustes": liq.notas_ajustes,
        "total": liq.total,
    }
    comisiones_list = [
        {"categoria": c.categoria, "rol": c.rol, "cantidad": c.cantidad,
         "monto_por_unidad": c.monto_por_unidad, "total": c.total}
        for c in comisiones
    ]
    nombre_archivo = f"liquidacion_{nombre.replace(' ', '_')}_{liq.periodo}"

    if formato == "xlsx":
        contenido = generar_excel_liquidacion(liq_dict, nombre, comisiones_list)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    else:
        contenido = generar_pdf_liquidacion(liq_dict, nombre, comisiones_list)
        media_type = "application/pdf"
        ext = "pdf"

    return FastResponse(
        content=contenido,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}.{ext}"'},
    )


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
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
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


class ComisionEditar(BaseModel):
    categoria: Optional[str] = None
    cantidad: Optional[int] = None
    fecha_trabajo: Optional[str] = None  # YYYY-MM-DD
    notas: Optional[str] = None


@router.patch("/comisiones/{comision_id}")
async def editar_comision(
    comision_id: int,
    data: ComisionEditar,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Corrige un registro de trabajo ya guardado (categoria/cantidad/fecha/notas) y recalcula su total."""
    result = await db.execute(
        select(Comision).where(
            Comision.id == comision_id,
            Comision.tenant_id == token_data.tenant_id,
        )
    )
    comision = result.scalars().first()
    if not comision:
        raise HTTPException(404, "Registro no encontrado")

    if data.categoria is not None:
        comision.categoria = data.categoria
    if data.cantidad is not None:
        if data.cantidad <= 0:
            raise HTTPException(400, "La cantidad debe ser mayor a 0")
        comision.cantidad = data.cantidad
    if data.fecha_trabajo is not None:
        try:
            comision.fecha_trabajo = datetime.strptime(data.fecha_trabajo, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "Fecha invalida, usa formato YYYY-MM-DD")
    if data.notas is not None:
        comision.notas = data.notas

    # Recalcular tarifa y total con la categoria/rol vigentes (por si cambio la categoria)
    regla_res = await db.execute(
        select(ReglaComision).where(
            ReglaComision.tenant_id == token_data.tenant_id,
            ReglaComision.categoria == comision.categoria,
            ReglaComision.rol == comision.rol,
        )
    )
    regla = regla_res.scalar_one_or_none()
    if regla:
        comision.monto_por_unidad = regla.monto_por_unidad
        comision.total = 0 if regla.meta_mensual is not None else comision.cantidad * regla.monto_por_unidad
    else:
        comision.total = comision.cantidad * comision.monto_por_unidad

    await db.commit()
    return {
        "ok": True,
        "id": comision.id,
        "categoria": comision.categoria,
        "cantidad": comision.cantidad,
        "monto_por_unidad": comision.monto_por_unidad,
        "total": comision.total,
        "fecha_trabajo": comision.fecha_trabajo.isoformat() if comision.fecha_trabajo else None,
        "notas": comision.notas,
    }


@router.delete("/comisiones/{comision_id}", status_code=204)
async def eliminar_comision(
    comision_id: int,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Elimina un registro de trabajo cargado por error."""
    result = await db.execute(
        select(Comision).where(
            Comision.id == comision_id,
            Comision.tenant_id == token_data.tenant_id,
        )
    )
    comision = result.scalars().first()
    if not comision:
        raise HTTPException(404, "Registro no encontrado")
    await db.delete(comision)
    await db.commit()


# ── Registro de trabajo (jefe registra comisiones para trabajadores) ──────────
class ItemTrabajo(BaseModel):
    categoria: str
    cantidad: int
    monto_por_unidad: int = 0

class RegistroTrabajoIn(BaseModel):
    user_id: int
    fecha: str  # YYYY-MM-DD
    items: list[ItemTrabajo]
    notas: Optional[str] = None
    # Rol con el que se paga este trabajo (busca tarifas de ese rol). Por defecto
    # es el rol de la cuenta del trabajador, pero puede ser distinto -- ej. un
    # jefe que tambien instala puede registrar su propio trabajo "como instalador"
    # sin que eso cambie su rol/permisos reales en el sistema.
    rol: Optional[str] = None

@router.post("/comisiones/registrar-trabajo", status_code=201)
async def registrar_trabajo(
    data: RegistroTrabajoIn,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Registra trabajos manuales (ej. la planilla diaria de un instalador) como comisiones."""
    user_res = await db.execute(
        select(User).where(User.id == data.user_id, User.tenant_id == token_data.tenant_id)
    )
    worker = user_res.scalar_one_or_none()
    if not worker:
        raise HTTPException(404, "Trabajador no encontrado en este tenant")
    rol_pago = data.rol or worker.rol

    periodo = data.fecha[:7]  # YYYY-MM-DD -> YYYY-MM
    try:
        fecha_trabajo = datetime.strptime(data.fecha, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Fecha invalida, usa formato YYYY-MM-DD")
    created = []
    for item in data.items:
        if not item.categoria or item.cantidad <= 0:
            continue

        regla_res = await db.execute(
            select(ReglaComision).where(
                ReglaComision.tenant_id == token_data.tenant_id,
                ReglaComision.categoria == item.categoria,
                ReglaComision.rol == rol_pago,
            )
        )
        regla = regla_res.scalar_one_or_none()

        monto = regla.monto_por_unidad if regla else item.monto_por_unidad
        # Categorias con meta mensual (ej. Roller) no se pagan por unidad hecha --
        # se pagan/descuentan una sola vez al generar la liquidacion, comparando el
        # total del mes contra la meta. Aqui solo se deja registrada la cantidad
        # (para trazabilidad y para poder sumarla despues), con total=0.
        es_meta = bool(regla and regla.meta_mensual is not None)
        total_item = 0 if es_meta else item.cantidad * monto

        comision = Comision(
            tenant_id=token_data.tenant_id,
            user_id=data.user_id,
            rol=rol_pago,
            categoria=item.categoria,
            cantidad=item.cantidad,
            monto_por_unidad=monto,
            total=total_item,
            estado="pendiente",
            periodo=periodo,
            notas=data.notas,
            fecha_trabajo=fecha_trabajo,
            tipo_registro="manual",
        )
        db.add(comision)
        created.append(comision)
    await db.commit()
    return {"ok": True, "registros_creados": len(created)}
