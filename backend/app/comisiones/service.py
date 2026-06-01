"""
Servicio de comisiones — auto-generación al cambiar estado de orden.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comision import Comision, ReglaComision


# Mapeo estado → (rol, campo user_id en order)
ESTADO_ROL = {
    "aceptada": "vendedor",
    "listo_para_instalar": "fabricante",
    "instalacion_completada": "instalador",
}


async def generar_comisiones_orden(
    db: AsyncSession, order, trigger_estado: str
) -> None:
    """
    Llamado cuando el estado de una orden cambia.
    Genera comisiones para el rol correspondiente según el nuevo estado.
    """
    if trigger_estado not in ESTADO_ROL:
        return

    rol = ESTADO_ROL[trigger_estado]

    # Obtener el user_id del rol correspondiente
    user_id_map = {
        "vendedor": getattr(order, "vendedor_id", None),
        "fabricante": getattr(order, "fabricante_id", None),
        "instalador": getattr(order, "instalador_id", None),
    }
    user_id = user_id_map.get(rol)

    if not user_id:
        return  # rol no asignado a esta orden

    # Verificar si ya existen comisiones para este order+rol (evitar duplicados)
    existing = await db.execute(
        select(Comision).where(
            Comision.order_id == order.id,
            Comision.rol == rol,
            Comision.tenant_id == order.tenant_id,
        )
    )
    if existing.scalars().first():
        return  # ya generadas

    productos = order.productos or []
    periodo = datetime.now(timezone.utc).strftime("%Y-%m")

    for item in productos:
        categoria = (
            item.get("categoria")
            or item.get("tipo")
            or item.get("type")
            or "general"
        )
        try:
            cantidad = int(item.get("cantidad", 1))
        except (TypeError, ValueError):
            cantidad = 1

        # Buscar regla de comisión para (tenant, categoria, rol)
        regla_result = await db.execute(
            select(ReglaComision).where(
                ReglaComision.tenant_id == order.tenant_id,
                ReglaComision.categoria == categoria,
                ReglaComision.rol == rol,
                ReglaComision.activo == True,
            )
        )
        regla = regla_result.scalars().first()

        if not regla:
            continue  # sin regla configurada para esta categoría+rol

        comision = Comision(
            tenant_id=order.tenant_id,
            user_id=user_id,
            order_id=order.id,
            rol=rol,
            categoria=categoria,
            cantidad=cantidad,
            monto_por_unidad=regla.monto_por_unidad,
            total=cantidad * regla.monto_por_unidad,
            estado="pendiente",
            periodo=periodo,
        )
        db.add(comision)

    await db.commit()
