from datetime import date
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, Field


class TaskItem(BaseModel):
    descripcion: str
    ubicacion: Optional[str] = None


class ComisionItem(BaseModel):
    categoria: str
    cantidad: int = Field(gt=0)


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
    empresa_cliente: Optional[str] = None
    cliente_email: Optional[str] = None
    restriccion_horaria: Optional[str] = None
    nota_especial: Optional[str] = None
    # Trabajo realizado por categoria de comision (las mismas 12 categorias
    # de Comisiones): [{"categoria": "Persiana Exterior", "cantidad": 4}, ...].
    # Al marcar la tarea "completada" se genera automaticamente una comision
    # por cada item (la categoria debe existir en reglas_comision para el
    # rol del trabajador asignado).
    items_comision: Optional[List[ComisionItem]] = None


class TaskUpdate(BaseModel):
    estado: Optional[str] = None         # pendiente | en_progreso | completada | cancelada
    notas_cierre: Optional[str] = None
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    asignado_a: Optional[int] = None
    fecha_tarea: Optional[date] = None
    prioridad: Optional[str] = None
    items_comision: Optional[List[ComisionItem]] = None


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
    empresa_cliente: Optional[str] = None
    cliente_email: Optional[str] = None
    restriccion_horaria: Optional[str] = None
    nota_especial: Optional[str] = None
    tracking_token: Optional[str] = None
    tracking_activo: Optional[bool] = False
    items_comision: Optional[List[Any]] = None
    comision_generada: Optional[bool] = False
    cliente_id: Optional[int] = None

    model_config = {"from_attributes": True}
