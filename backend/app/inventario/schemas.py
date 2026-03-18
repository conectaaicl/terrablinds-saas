from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# ── InventarioItem ────────────────────────────────────────────────────────────

class InventarioItemCreate(BaseModel):
    nombre: str
    categoria: str = "general"
    unidad: str = "unidad"
    stock_actual: Decimal = Decimal("0")
    stock_minimo: Decimal = Decimal("0")
    precio_unitario: Optional[Decimal] = None
    proveedor: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None


class InventarioItemUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    unidad: Optional[str] = None
    stock_actual: Optional[Decimal] = None
    stock_minimo: Optional[Decimal] = None
    precio_unitario: Optional[Decimal] = None
    proveedor: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class InventarioItemOut(BaseModel):
    id: int
    tenant_id: str
    nombre: str
    categoria: str
    unidad: str
    stock_actual: Decimal
    stock_minimo: Decimal
    precio_unitario: Optional[Decimal]
    proveedor: Optional[str]
    codigo: Optional[str]
    descripcion: Optional[str]
    activo: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    bajo_minimo: bool = False

    class Config:
        from_attributes = True


# ── InventarioMovimiento ──────────────────────────────────────────────────────

class MovimientoCreate(BaseModel):
    item_id: int
    tipo: str  # entrada | salida | ajuste | consumo
    cantidad: Decimal
    motivo: Optional[str] = None
    order_id: Optional[int] = None
    notas: Optional[str] = None


class MovimientoOut(BaseModel):
    id: int
    tenant_id: str
    item_id: int
    tipo: str
    cantidad: Decimal
    stock_antes: Decimal
    stock_despues: Decimal
    motivo: Optional[str]
    order_id: Optional[int]
    usuario_id: Optional[int]
    notas: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── ReglaMaterial ─────────────────────────────────────────────────────────────

class ReglaCreate(BaseModel):
    tipo_producto: str
    item_id: Optional[int] = None
    nombre_componente: str
    formula: str = "m2"  # m2 | ml | unidad_fija | ancho | alto
    factor: Decimal = Decimal("1.0")
    cantidad_fija: Optional[Decimal] = None
    notas: Optional[str] = None


class ReglaUpdate(BaseModel):
    tipo_producto: Optional[str] = None
    item_id: Optional[int] = None
    nombre_componente: Optional[str] = None
    formula: Optional[str] = None
    factor: Optional[Decimal] = None
    cantidad_fija: Optional[Decimal] = None
    notas: Optional[str] = None


class ReglaOut(BaseModel):
    id: int
    tenant_id: str
    tipo_producto: str
    item_id: Optional[int]
    nombre_componente: str
    formula: str
    factor: Decimal
    cantidad_fija: Optional[Decimal]
    notas: Optional[str]
    item_nombre: Optional[str] = None

    class Config:
        from_attributes = True


# ── Cálculo de materiales ─────────────────────────────────────────────────────

class CalculoLinea(BaseModel):
    regla_id: int
    item_id: Optional[int]
    nombre_componente: str
    item_nombre: Optional[str]
    unidad: Optional[str]
    cantidad_calculada: Decimal
    stock_disponible: Optional[Decimal]
    suficiente: bool


class CalculoResponse(BaseModel):
    tipo_producto: str
    ancho_cm: float
    alto_cm: float
    lineas: list[CalculoLinea]
    puede_producir: bool
