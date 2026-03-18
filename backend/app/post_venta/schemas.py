from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


TIPOS = ["satisfaccion", "garantia", "servicio", "mantencion", "otro"]
ESTADOS = ["pendiente", "contactado", "en_proceso", "resuelto", "cerrado"]


class NotaSeguimiento(BaseModel):
    texto: str
    fecha: str  # ISO string
    usuario: str


class PostVentaCreate(BaseModel):
    order_id: int
    client_id: int
    tipo: str = "satisfaccion"
    descripcion: Optional[str] = None
    fecha_programada: Optional[datetime] = None


class PostVentaUpdate(BaseModel):
    tipo: Optional[str] = None
    estado: Optional[str] = None
    descripcion: Optional[str] = None
    calificacion: Optional[int] = Field(None, ge=1, le=5)
    fecha_programada: Optional[datetime] = None
    fecha_resolucion: Optional[datetime] = None


class NotaAdd(BaseModel):
    texto: str


class PostVentaOut(BaseModel):
    id: UUID
    tenant_id: str
    order_id: int
    client_id: int
    client_nombre: Optional[str] = None
    client_telefono: Optional[str] = None
    tipo: str
    estado: str
    descripcion: Optional[str] = None
    calificacion: Optional[int] = None
    ai_mensaje: Optional[str] = None
    notas: list[Any] = []
    fecha_programada: Optional[datetime] = None
    fecha_resolucion: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
