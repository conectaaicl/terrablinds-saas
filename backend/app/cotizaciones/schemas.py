from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class CotizacionCreate(BaseModel):
    cliente_id: int
    productos: list[dict[str, Any]]
    precio_total: int
    notas: Optional[str] = None
    valid_until: Optional[date] = None


class CotizacionPatch(BaseModel):
    productos: Optional[list[dict[str, Any]]] = None
    precio_total: Optional[int] = None
    notas: Optional[str] = None
    valid_until: Optional[date] = None
    estado: Optional[str] = None


class CotizacionOut(BaseModel):
    id: UUID
    tenant_id: str
    numero: int
    cliente_id: int
    cliente_nombre: Optional[str] = None
    vendedor_id: int
    vendedor_nombre: Optional[str] = None
    estado: str
    productos: list[Any]
    precio_total: int
    notas: Optional[str] = None
    valid_until: Optional[date] = None
    orden_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
