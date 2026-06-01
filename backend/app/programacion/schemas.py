from pydantic import BaseModel
from datetime import date
from typing import Optional, List
from app.programacion.models import TipoVisita

class TecnicoOut(BaseModel):
    id: int
    nombre: str
    class Config: from_attributes = True

class ProgramacionCreate(BaseModel):
    fecha: date
    hora: str
    tipo_visita: TipoVisita = TipoVisita.instalacion
    cliente_nombre: str
    cliente_telefono: Optional[str] = None
    cliente_direccion: str
    ot: Optional[str] = None
    vendedor_nombre: Optional[str] = None
    descripcion_trabajo: str
    observaciones: Optional[str] = None
    tecnico_ids: List[int] = []

class ProgramacionUpdate(ProgramacionCreate):
    pass

class ProgramacionOut(BaseModel):
    id: int
    fecha: date
    hora: str
    tipo_visita: TipoVisita
    cliente_nombre: str
    cliente_telefono: Optional[str]
    cliente_direccion: str
    ot: Optional[str]
    vendedor_nombre: Optional[str]
    descripcion_trabajo: str
    observaciones: Optional[str]
    tecnicos: List[TecnicoOut]
    tenant_id: str
    creado_por: int
    class Config: from_attributes = True
