from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SolicitudCreate(BaseModel):
    tipo: str = Field(default="permiso")        # permiso | vacacion | licencia_medica | otro
    fecha_inicio: date
    fecha_fin: date
    dias: int = Field(default=1, ge=1)
    motivo: Optional[str] = None


class SolicitudRevisar(BaseModel):
    estado: str     # aprobada | rechazada
    respuesta: Optional[str] = None


class SolicitudResponse(BaseModel):
    id: UUID
    tenant_id: str
    solicitante_id: int
    solicitante_nombre: Optional[str] = None
    solicitante_rol: Optional[str] = None
    tipo: str
    fecha_inicio: str
    fecha_fin: str
    dias: int
    motivo: Optional[str]
    estado: str
    respuesta: Optional[str]
    revisado_por: Optional[int]
    revisado_por_nombre: Optional[str] = None
    revisado_at: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}
