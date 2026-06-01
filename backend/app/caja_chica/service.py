from typing import Optional
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.caja_chica import CajaChica
from app.caja_chica.schemas import MovimientoCreate, SaldoResponse, ReporteResponse, MovimientoResponse

class CajaChicaService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_saldo_actual(self, tenant_id: str) -> int:
        result = await self.db.execute(select(CajaChica.saldo_despues).where(CajaChica.tenant_id == tenant_id).order_by(CajaChica.id.desc()).limit(1))
        return result.scalar_one_or_none() or 0

    async def list_movimientos(self, tenant_id: str, mes: Optional[int] = None, anio: Optional[int] = None) -> list[CajaChica]:
        q = select(CajaChica).where(CajaChica.tenant_id == tenant_id)
        if mes and anio:
            q = q.where(extract("month", CajaChica.created_at) == mes, extract("year", CajaChica.created_at) == anio)
        result = await self.db.execute(q.order_by(CajaChica.id.desc()))
        return list(result.scalars().all())

    async def create_movimiento(self, data: MovimientoCreate, tenant_id: str, user_id: int, user_nombre: str) -> CajaChica:
        saldo = await self._get_saldo_actual(tenant_id)
        if data.tipo == "egreso" and saldo < data.monto:
            raise HTTPException(status_code=400, detail="Saldo insuficiente en caja chica")
        nuevo_saldo = saldo + data.monto if data.tipo == "ingreso" else saldo - data.monto
        mov = CajaChica(tenant_id=tenant_id, tipo=data.tipo, categoria=data.categoria, monto=data.monto, descripcion=data.descripcion, referencia=data.referencia, responsable_id=user_id, responsable_nombre=user_nombre, saldo_despues=nuevo_saldo)
        self.db.add(mov)
        await self.db.flush()
        return mov

    async def get_saldo(self, tenant_id: str) -> SaldoResponse:
        saldo = await self._get_saldo_actual(tenant_id)
        hoy = datetime.now()
        r_ing = await self.db.execute(select(func.sum(CajaChica.monto)).where(CajaChica.tenant_id == tenant_id, CajaChica.tipo == "ingreso", extract("month", CajaChica.created_at) == hoy.month, extract("year", CajaChica.created_at) == hoy.year))
        r_eg = await self.db.execute(select(func.sum(CajaChica.monto)).where(CajaChica.tenant_id == tenant_id, CajaChica.tipo == "egreso", extract("month", CajaChica.created_at) == hoy.month, extract("year", CajaChica.created_at) == hoy.year))
        r_cnt = await self.db.execute(select(func.count(CajaChica.id)).where(CajaChica.tenant_id == tenant_id, extract("month", CajaChica.created_at) == hoy.month, extract("year", CajaChica.created_at) == hoy.year))
        return SaldoResponse(saldo_actual=saldo, total_ingresos=r_ing.scalar_one() or 0, total_egresos=r_eg.scalar_one() or 0, movimientos_mes=r_cnt.scalar_one() or 0)

    async def get_reporte_mes(self, tenant_id: str, mes: int, anio: int) -> ReporteResponse:
        movs = await self.list_movimientos(tenant_id, mes=mes, anio=anio)
        return ReporteResponse(mes=mes, anio=anio, total_ingresos=sum(m.monto for m in movs if m.tipo == "ingreso"), total_egresos=sum(m.monto for m in movs if m.tipo == "egreso"), saldo_final=movs[0].saldo_despues if movs else 0, movimientos=[MovimientoResponse.model_validate(m) for m in movs])
