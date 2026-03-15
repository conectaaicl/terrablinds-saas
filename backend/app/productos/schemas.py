from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProductoCreate(BaseModel):
    codigo: Optional[str] = None
    nombre: str = Field(min_length=1, max_length=200)
    descripcion: Optional[str] = None
    categoria: str = Field(default="general", max_length=100)
    unidad: str = Field(default="m2")   # m2 | ml | unidad
    precio_base: float = Field(ge=0)
    colores: list[str] = Field(default_factory=list)
    materiales: list[str] = Field(default_factory=list)
    specs: dict[str, Any] = Field(default_factory=dict)
    activo: bool = True


class ProductoUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = Field(None, min_length=1, max_length=200)
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    unidad: Optional[str] = None
    precio_base: Optional[float] = Field(None, ge=0)
    colores: Optional[list[str]] = None
    materiales: Optional[list[str]] = None
    specs: Optional[dict[str, Any]] = None
    activo: Optional[bool] = None


class ProductoResponse(BaseModel):
    id: UUID
    tenant_id: str
    codigo: Optional[str]
    nombre: str
    descripcion: Optional[str]
    categoria: str
    unidad: str
    precio_base: float
    colores: list
    materiales: list
    specs: dict
    activo: bool
    created_at: str

    model_config = {"from_attributes": True}
