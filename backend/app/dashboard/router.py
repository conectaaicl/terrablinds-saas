"""
Dashboard KPI para jefes y gerentes.

  GET /dashboard/summary   — KPIs clave del mes en curso
  GET /dashboard/metrics   — Métricas de tiempos por etapa (si hay datos)
"""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.models.order import Order

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """
    KPIs del mes en curso:
    - Órdenes por estado
    - Ingresos del mes
    - Órdenes creadas en el mes
    - Tasa de cierre
    """
    today = date.today()
    mes_inicio = date(today.year, today.month, 1)

    # Total por estado
    estado_result = await db.execute(
        select(Order.estado, func.count(Order.id).label("count"))
        .where(Order.tenant_id == token_data.tenant_id)
        .group_by(Order.estado)
    )
    estados = {row.estado: row.count for row in estado_result.fetchall()}

    # Órdenes del mes
    mes_result = await db.execute(
        select(
            func.count(Order.id).label("total"),
            func.sum(Order.precio_total).label("ingresos"),
        ).where(
            Order.tenant_id == token_data.tenant_id,
            Order.created_at >= mes_inicio,
        )
    )
    mes = mes_result.fetchone()
    total_mes = mes.total or 0
    ingresos_mes = mes.ingresos or 0

    # Órdenes cerradas del mes (ambos nombres de estado: cerrado/cerrada)
    cerradas_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.tenant_id == token_data.tenant_id,
            Order.estado.in_(["cerrado", "cerrada"]),
            Order.created_at >= mes_inicio,
        )
    )
    cerradas_mes = cerradas_result.scalar() or 0

    tasa_cierre = round(100.0 * cerradas_mes / total_mes, 1) if total_mes > 0 else 0.0

    # Métricas de tiempos (si existen)
    metrics_data = None
    try:
        m_result = await db.execute(
            text("""
                SELECT
                    ROUND(AVG(tiempo_confirmacion_horas)::NUMERIC, 1) AS avg_confirmacion_h,
                    ROUND(AVG(tiempo_fabricacion_horas)::NUMERIC, 1)  AS avg_fabricacion_h,
                    ROUND(AVG(tiempo_agendado_horas)::NUMERIC, 1)     AS avg_agendado_h,
                    ROUND(AVG(tiempo_instalacion_horas)::NUMERIC, 1)  AS avg_instalacion_h,
                    ROUND(AVG(tiempo_total_horas)::NUMERIC, 1)        AS avg_total_h,
                    SUM(num_reagendamientos)                          AS total_reagendamientos,
                    SUM(num_incidentes)                               AS total_incidentes
                FROM order_metrics
                WHERE tenant_id = :tid
            """),
            {"tid": token_data.tenant_id},
        )
        mrow = m_result.fetchone()
        if mrow:
            metrics_data = {
                "avg_h_confirmacion":    float(mrow.avg_confirmacion_h) if mrow.avg_confirmacion_h else None,
                "avg_h_fabricacion":     float(mrow.avg_fabricacion_h) if mrow.avg_fabricacion_h else None,
                "avg_h_agendado":        float(mrow.avg_agendado_h) if mrow.avg_agendado_h else None,
                "avg_h_instalacion":     float(mrow.avg_instalacion_h) if mrow.avg_instalacion_h else None,
                "avg_h_total":           float(mrow.avg_total_h) if mrow.avg_total_h else None,
                "total_reagendamientos": int(mrow.total_reagendamientos) if mrow.total_reagendamientos else 0,
                "total_incidentes":      int(mrow.total_incidentes) if mrow.total_incidentes else 0,
            }
    except Exception:
        pass

    return {
        "tenant_id":    token_data.tenant_id,
        "mes":          mes_inicio.isoformat(),
        "ordenes_mes":  total_mes,
        "ingresos_mes": ingresos_mes,
        "cerradas_mes": cerradas_mes,
        "tasa_cierre":  tasa_cierre,
        "por_estado":   estados,
        "metricas":     metrics_data,
    }


@router.get("/metrics/stages")
async def stage_metrics(
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """
    Métricas históricas de tiempos por etapa (vista v_tenant_stage_metrics).
    Requiere migración 003.
    """
    try:
        result = await db.execute(
            text("""
                SELECT
                    mes,
                    total_ordenes,
                    ordenes_cerradas,
                    avg_h_confirmacion,
                    avg_h_fabricacion,
                    avg_h_agendado,
                    avg_h_instalacion,
                    avg_h_total,
                    total_reagendamientos,
                    total_incidentes,
                    tasa_cierre_pct
                FROM v_tenant_stage_metrics
                WHERE tenant_id = :tid
                ORDER BY mes DESC
                LIMIT 12
            """),
            {"tid": token_data.tenant_id},
        )
        rows = result.fetchall()
        return [
            {
                "mes":                    r.mes.isoformat() if r.mes else None,
                "total_ordenes":          r.total_ordenes,
                "ordenes_cerradas":       r.ordenes_cerradas,
                "avg_h_confirmacion":     float(r.avg_h_confirmacion) if r.avg_h_confirmacion else None,
                "avg_h_fabricacion":      float(r.avg_h_fabricacion) if r.avg_h_fabricacion else None,
                "avg_h_agendado":         float(r.avg_h_agendado) if r.avg_h_agendado else None,
                "avg_h_instalacion":      float(r.avg_h_instalacion) if r.avg_h_instalacion else None,
                "avg_h_total":            float(r.avg_h_total) if r.avg_h_total else None,
                "total_reagendamientos":  r.total_reagendamientos,
                "total_incidentes":       r.total_incidentes,
                "tasa_cierre_pct":        float(r.tasa_cierre_pct) if r.tasa_cierre_pct else 0.0,
            }
            for r in rows
        ]
    except Exception:
        return []


@router.get("/vendedores")
async def stats_vendedores(
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """
    Estadísticas de rendimiento por vendedor:
    - Órdenes totales y del mes
    - Monto total generado y del mes
    - Cotizaciones creadas totales y del mes
    - Tasa de conversión cotizaciones → órdenes
    """
    from datetime import date as _date
    hoy = _date.today()
    mes_inicio = _date(hoy.year, hoy.month, 1)

    result = await db.execute(text("""
        SELECT
            u.id                                                        AS vendedor_id,
            u.nombre                                                    AS vendedor_nombre,
            COUNT(o.id)                                                 AS ordenes_total,
            COUNT(o.id) FILTER (WHERE DATE(o.created_at) >= :mes)      AS ordenes_mes,
            COUNT(o.id) FILTER (WHERE o.estado IN ('cerrada','cerrado')) AS cerradas_total,
            COUNT(o.id) FILTER (
                WHERE o.estado IN ('cerrada','cerrado')
                AND DATE(o.created_at) >= :mes
            )                                                           AS cerradas_mes,
            COALESCE(SUM(o.precio_total), 0)                            AS monto_total,
            COALESCE(SUM(o.precio_total) FILTER (
                WHERE DATE(o.created_at) >= :mes
            ), 0)                                                       AS monto_mes
        FROM users u
        LEFT JOIN orders o ON o.vendedor_id = u.id AND o.tenant_id = :tid
        WHERE u.tenant_id = :tid
          AND u.rol = 'vendedor'
          AND u.activo = true
        GROUP BY u.id, u.nombre
        ORDER BY monto_mes DESC, monto_total DESC
    """), {"tid": token_data.tenant_id, "mes": mes_inicio})
    order_rows = result.fetchall()

    # Cotizaciones por vendedor (modelo Cotizacion separado)
    cot_result = await db.execute(text("""
        SELECT
            c.vendedor_id,
            COUNT(*)                                                    AS cot_total,
            COUNT(*) FILTER (WHERE DATE(c.created_at) >= :mes)         AS cot_mes,
            COUNT(*) FILTER (WHERE c.estado = 'aceptada')              AS cot_aceptadas,
            COUNT(*) FILTER (WHERE c.estado = 'convertida')            AS cot_convertidas
        FROM cotizaciones c
        WHERE c.tenant_id = :tid
        GROUP BY c.vendedor_id
    """), {"tid": token_data.tenant_id, "mes": mes_inicio})
    cot_map = {r.vendedor_id: r for r in cot_result.fetchall()}

    vendedores = []
    for r in order_rows:
        cot = cot_map.get(r.vendedor_id)
        cot_total = cot.cot_total if cot else 0
        cot_mes = cot.cot_mes if cot else 0
        convertidas = (cot.cot_aceptadas or 0) + (cot.cot_convertidas or 0) if cot else 0
        tasa = round(100.0 * convertidas / cot_total, 1) if cot_total > 0 else 0.0

        vendedores.append({
            "vendedor_id":    r.vendedor_id,
            "vendedor_nombre": r.vendedor_nombre,
            "ordenes_total":  int(r.ordenes_total),
            "ordenes_mes":    int(r.ordenes_mes),
            "cerradas_total": int(r.cerradas_total),
            "cerradas_mes":   int(r.cerradas_mes),
            "monto_total":    int(r.monto_total),
            "monto_mes":      int(r.monto_mes),
            "cot_total":      int(cot_total),
            "cot_mes":        int(cot_mes),
            "tasa_conversion": tasa,
        })

    return vendedores
