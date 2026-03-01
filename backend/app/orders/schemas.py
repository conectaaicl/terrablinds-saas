from typing import Literal, Optional

from pydantic import BaseModel, Field


class ProductoItem(BaseModel):
    id: Optional[str] = None
    tipo: str
    ancho: float = Field(gt=0, le=1000)
    alto: float = Field(gt=0, le=1000)
    tela: str
    color: str
    precio: int = Field(gt=0)
    notas: Optional[str] = None
    ubicacion: Optional[str] = None
    accionamiento: Optional[str] = None


class OrderCreate(BaseModel):
    cliente_id: int
    productos: list[ProductoItem]
    precio_total: int = Field(gt=0)
    cotizacion_id: Optional[str] = None


class HistorialEntry(BaseModel):
    estado: str
    fecha: str
    usuario_id: int
    usuario_nombre: str
    notas: Optional[str] = None


class OrderResponse(BaseModel):
    id: int
    numero: int
    estado: str
    cliente_id: int
    cliente_nombre: Optional[str] = None
    cliente_direccion: Optional[str] = None
    vendedor_id: int
    vendedor_nombre: Optional[str] = None
    fabricante_id: Optional[int] = None
    fabricante_nombre: Optional[str] = None
    instalador_id: Optional[int] = None
    instalador_nombre: Optional[str] = None
    tenant_id: str
    cotizacion_id: Optional[str] = None
    productos: list[dict]
    precio_total: int
    created_at: str
    historial: list[HistorialEntry] = []

    model_config = {"from_attributes": True}


class EstadoChange(BaseModel):
    estado: Literal[
        "cotizado",
        "cotizacion_enviada",
        "confirmado",
        "en_fabricacion",
        "fabricado",
        "agendado",
        "en_ruta",
        "en_instalacion",
        "pendiente_firma",
        "cerrado",
        "problema",
        "cancelado",
        "rechazado",
    ]
    notas: Optional[str] = None


class AssignRequest(BaseModel):
    usuario_id: int
