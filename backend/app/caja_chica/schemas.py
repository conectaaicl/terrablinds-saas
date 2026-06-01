from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class MovimientoCreate(BaseModel):
    tipo: str
    categoria: str = "otro"
    monto: int = Field(gt=0)
    descripcion: str
    referencia: Optional[str] = None

class MovimientoResponse(BaseModel):
    id: int
    tenant_id: str
    tipo: str
    categoria: str
    monto: int
    descripcion: str
    referencia: Optional[str] = None
    responsable_id: int
    responsable_nombre: str
    saldo_despues: int
    created_at: datetime
    model_config = {"from_attributes": True}

class SaldoResponse(BaseModel):
    saldo_actual: int
    total_ingresos: int
    total_egresos: int
    movimientos_mes: int

class ReporteResponse(BaseModel):
    mes: int
    anio: int
    total_ingresos: int
    total_egresos: int
    saldo_final: int
    movimientos: list[MovimientoResponse]
