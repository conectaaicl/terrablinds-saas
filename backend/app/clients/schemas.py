from datetime import datetime
from typing import Optional

from pydantic import BaseModel


ORIGENES = ["web", "referido", "cotizacion", "visita", "llamada", "redes_sociales", "directo", "otro"]
TIPOS_CLIENTE = ["persona", "empresa"]


class ClientCreate(BaseModel):
    nombre: str
    rut: Optional[str] = None
    tipo_cliente: str = "persona"
    empresa: Optional[str] = None
    email: Optional[str] = None
    email2: Optional[str] = None
    telefono: Optional[str] = None
    telefono2: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    region: Optional[str] = None
    origen: str = "directo"
    tags: list[str] = []
    notas: Optional[str] = None


class ClientUpdate(BaseModel):
    nombre: Optional[str] = None
    rut: Optional[str] = None
    tipo_cliente: Optional[str] = None
    empresa: Optional[str] = None
    email: Optional[str] = None
    email2: Optional[str] = None
    telefono: Optional[str] = None
    telefono2: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    region: Optional[str] = None
    origen: Optional[str] = None
    tags: Optional[list[str]] = None
    notas: Optional[str] = None


class ClientResponse(BaseModel):
    id: int
    tenant_id: str
    nombre: str
    rut: Optional[str] = None
    tipo_cliente: str = "persona"
    empresa: Optional[str] = None
    email: Optional[str] = None
    email2: Optional[str] = None
    telefono: Optional[str] = None
    telefono2: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    region: Optional[str] = None
    origen: str = "directo"
    tags: list = []
    notas: Optional[str] = None
    vendedor_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
