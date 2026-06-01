from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel
from app.dependencies import get_db_for_tenant as get_db
from app.auth.dependencies import require_roles, TokenData

router = APIRouter(prefix="/caja-chica", tags=["caja-chica"])
ROLES = ("jefe", "gerente", "coordinador", "superadmin")

class MovimientoIn(BaseModel):
    tipo: str = "egreso"
    categoria: str = "otro"
    monto: int
    descripcion: str
    referencia: Optional[str] = None

@router.get("/saldo")
async def get_saldo(token: TokenData = Depends(require_roles(*ROLES)), db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""
        SELECT
            COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END),0) as total_ingresos,
            COALESCE(SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END),0) as total_egresos,
            COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE -monto END),0) as saldo_actual,
            COUNT(CASE WHEN date_trunc('month',created_at)=date_trunc('month',now()) THEN 1 END) as movimientos_mes
        FROM caja_chica WHERE tenant_id=:t
    """), {"t": token.tenant_id})
    return dict(r.mappings().first())

@router.get("/movimientos")
async def list_movimientos(token: TokenData = Depends(require_roles(*ROLES)), db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("SELECT * FROM caja_chica WHERE tenant_id=:t ORDER BY created_at DESC LIMIT 100"), {"t": token.tenant_id})
    return [dict(row._mapping) for row in r]

@router.post("/movimientos", status_code=201)
async def crear_movimiento(body: MovimientoIn, token: TokenData = Depends(require_roles(*ROLES)), db: AsyncSession = Depends(get_db)):
    saldo_r = await db.execute(text("SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE -monto END),0) FROM caja_chica WHERE tenant_id=:t"), {"t": token.tenant_id})
    saldo = saldo_r.scalar() or 0
    nuevo_saldo = saldo + body.monto if body.tipo == 'ingreso' else saldo - body.monto
    nombre_r = await db.execute(text("SELECT nombre FROM users WHERE id=:id"), {"id": token.user_id})
    nombre = nombre_r.scalar() or ''
    r = await db.execute(text("""
        INSERT INTO caja_chica (tenant_id,tipo,categoria,monto,descripcion,referencia,responsable_id,responsable_nombre,saldo_despues)
        VALUES (:t,:tipo,:cat,:monto,:desc,:ref,:uid,:nombre,:saldo) RETURNING *
    """), {"t": token.tenant_id, "tipo": body.tipo, "cat": body.categoria, "monto": body.monto,
          "desc": body.descripcion, "ref": body.referencia, "uid": token.user_id, "nombre": nombre, "saldo": nuevo_saldo})
    await db.flush()
    return dict(r.mappings().first())

@router.get("/reporte-mensual")
async def reporte_mensual(token: TokenData = Depends(require_roles(*ROLES)), db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""
        SELECT date_trunc('month',created_at) as mes,
            SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) as ingresos,
            SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) as egresos,
            COUNT(*) as movimientos
        FROM caja_chica WHERE tenant_id=:t
        GROUP BY mes ORDER BY mes DESC LIMIT 12
    """), {"t": token.tenant_id})
    return [dict(row._mapping) for row in r]
