from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


CATEGORIAS = [
    "Cortina Roller", "Cortina Zebra / Duo", "Cortina Blackout", "Cortina Sunscreen",
    "Cortina Screen", "Persiana Veneciana", "Persiana Enrollable", "Persiana Madera",
    "Persiana Exterior", "Toldo Retráctil", "Toldo Vertical", "Toldo Brazo",
    "Cierre Terraza Cristal", "Cierre Terraza PVC", "Cortina de Tela", "Motorización",
    "Accesorio / Herraje", "Insumo / Material", "Mueble a Medida", "Otro",
]

PROVEEDORES = [
    "Hunter Douglas", "Bandalux", "Silent Gliss", "Rollease Acmeda", "Coulisse",
    "Luxaflex", "Deco-Tec", "Lienzo Telas", "Muebles Pro", "Importados CL",
    "TecnoMotor", "Somfy", "Motores BRT", "Textiles Norte", "Distribuidora Sur",
    "Persianas Express", "Textil Andino", "Telas Decorativas", "Proveedor Local", "Otro",
]


class ProductoCreate(BaseModel):
    codigo: Optional[str] = None
    codigo_proveedor: Optional[str] = None
    nombre: str = Field(min_length=1, max_length=200)
    descripcion: Optional[str] = None
    categoria: str = Field(default="Otro", max_length=100)
    marca: Optional[str] = None
    proveedor: Optional[str] = None
    unidad: str = Field(default="m2")   # m2 | ml | unidad
    precio_base: float = Field(ge=0)
    precio_m2: Optional[float] = Field(None, ge=0)
    precio_ml: Optional[float] = Field(None, ge=0)
    ancho_min: Optional[float] = Field(None, ge=0)
    ancho_max: Optional[float] = Field(None, ge=0)
    alto_min: Optional[float] = Field(None, ge=0)
    alto_max: Optional[float] = Field(None, ge=0)
    colores: list[str] = Field(default_factory=list)
    materiales: list[str] = Field(default_factory=list)
    specs: dict[str, Any] = Field(default_factory=dict)
    activo: bool = True


class ProductoUpdate(BaseModel):
    codigo: Optional[str] = None
    codigo_proveedor: Optional[str] = None
    nombre: Optional[str] = Field(None, min_length=1, max_length=200)
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    marca: Optional[str] = None
    proveedor: Optional[str] = None
    unidad: Optional[str] = None
    precio_base: Optional[float] = Field(None, ge=0)
    precio_m2: Optional[float] = Field(None, ge=0)
    precio_ml: Optional[float] = Field(None, ge=0)
    ancho_min: Optional[float] = Field(None, ge=0)
    ancho_max: Optional[float] = Field(None, ge=0)
    alto_min: Optional[float] = Field(None, ge=0)
    alto_max: Optional[float] = Field(None, ge=0)
    colores: Optional[list[str]] = None
    materiales: Optional[list[str]] = None
    specs: Optional[dict[str, Any]] = None
    activo: Optional[bool] = None


class ProductoResponse(BaseModel):
    id: UUID
    tenant_id: str
    codigo: Optional[str] = None
    codigo_proveedor: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    categoria: str
    marca: Optional[str] = None
    proveedor: Optional[str] = None
    unidad: str
    precio_base: float
    precio_m2: Optional[float] = None
    precio_ml: Optional[float] = None
    ancho_min: Optional[float] = None
    ancho_max: Optional[float] = None
    alto_min: Optional[float] = None
    alto_max: Optional[float] = None
    colores: list = []
    materiales: list = []
    specs: dict = {}
    activo: bool
    created_at: str

    model_config = {"from_attributes": True}
