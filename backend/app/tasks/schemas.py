from datetime import date
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, Field


class TaskItem(BaseModel):
    descripcion: str
    ubicacion: Optional[str] = None


class TaskCreate(BaseModel):
    titulo: str = Field(min_length=1, max_length=300)
    descripcion: Optional[str] = None
    asignado_a: int                      # user_id (integer)
    order_id: Optional[int] = None
    fecha_tarea: date = Field(default_factory=date.today)
    prioridad: str = Field(default="normal")   # baja | normal | alta | urgente

    # Campos de agenda
    hora: Optional[str] = None
    tipo_tarea: Optional[str] = None     # instalacion | reunion | servicio_tecnico | otro
    cliente_nombre: Optional[str] = None
    cliente_telefono: Optional[str] = None
    direccion: Optional[str] = None
    ot_numero: Optional[str] = None
    vendedor_nombre: Optional[str] = None
    items: Optional[List[TaskItem]] = None
    observaciones: Optional[List[str]] = None


class TaskUpdate(BaseModel):
    estado: Optional[str] = None         # pendiente | en_progreso | completada | cancelada
    notas_cierre: Optional[str] = None
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    asignado_a: Optional[int] = None
    fecha_tarea: Optional[date] = None
    prioridad: Optional[str] = None


class TaskResponse(BaseModel):
    id: UUID
    tenant_id: str
    titulo: str
    descripcion: Optional[str]
    asignado_a: int
    asignado_a_nombre: Optional[str] = None
    asignado_por: int
    asignado_por_nombre: Optional[str] = None
    order_id: Optional[int]
    fecha_tarea: str
    prioridad: str
    estado: str
    notas_cierre: Optional[str]
    completado_at: Optional[str]
    created_at: str

    # Campos de agenda
    hora: Optional[str] = None
    tipo_tarea: Optional[str] = None
    cliente_nombre: Optional[str] = None
    cliente_telefono: Optional[str] = None
    direccion: Optional[str] = None
    ot_numero: Optional[str] = None
    vendedor_nombre: Optional[str] = None
    items: Optional[List[Any]] = None
    observaciones: Optional[List[str]] = None

    model_config = {"from_attributes": True}
