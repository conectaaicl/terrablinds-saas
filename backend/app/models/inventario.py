from __future__ import annotations

from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class InventarioItem(Base):
    __tablename__ = "inventario_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    categoria: Mapped[str] = mapped_column(String(50), nullable=False)
    # telas | tubos | soportes | cadenas | motores | controles | accesorios | otros
    codigo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    unidad: Mapped[str] = mapped_column(String(20), nullable=False, default="unidad")
    # ml | m2 | unidad | kg | m | rollo
    stock_actual: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), nullable=False, default=0
    )
    stock_minimo: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), nullable=False, default=0
    )
    precio_unitario: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    proveedor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[Optional[DateTime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[DateTime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # Relationships
    movimientos: Mapped[list[InventarioMovimiento]] = relationship(
        "InventarioMovimiento", back_populates="item", lazy="dynamic"
    )
    reglas: Mapped[list[ReglaMaterial]] = relationship(
        "ReglaMaterial", foreign_keys="ReglaMaterial.item_id", lazy="dynamic"
    )

    __table_args__ = (
        Index("ix_inventario_items_tenant_id", "tenant_id"),
    )


class InventarioMovimiento(Base):
    __tablename__ = "inventario_movimientos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("inventario_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    # entrada | salida | ajuste | consumo
    cantidad: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    # always positive; tipo determines direction
    stock_antes: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    stock_despues: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    motivo: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    # compra | fabricacion | merma | ajuste | devolucion | inventario_inicial
    order_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
    )
    usuario_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notas: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[Optional[DateTime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationship back to item
    item: Mapped[InventarioItem] = relationship(
        "InventarioItem", back_populates="movimientos"
    )

    __table_args__ = (
        Index("ix_inventario_movimientos_tenant_id", "tenant_id"),
        Index("ix_inventario_movimientos_item_id", "item_id"),
    )


class ReglaMaterial(Base):
    __tablename__ = "reglas_materiales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo_producto: Mapped[str] = mapped_column(String(100), nullable=False)
    # matches TIPOS_PRODUCTO from frontend
    item_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("inventario_items.id", ondelete="SET NULL"),
        nullable=True,
    )
    nombre_componente: Mapped[str] = mapped_column(String(200), nullable=False)
    # human label e.g. "Tela principal"
    formula: Mapped[str] = mapped_column(String(20), nullable=False, default="m2")
    # m2 | ml | unidad_fija | ancho | alto
    factor: Mapped[Decimal] = mapped_column(
        Numeric(8, 4), nullable=False, default=1.0
    )
    # multiply by calculated quantity
    cantidad_fija: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 3), nullable=True
    )
    # used when formula=unidad_fija
    notas: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # Relationship to item (joined load for convenience)
    item: Mapped[Optional[InventarioItem]] = relationship(
        "InventarioItem",
        foreign_keys=[item_id],
        lazy="joined",
    )

    __table_args__ = (
        Index("ix_reglas_materiales_tenant_id", "tenant_id"),
    )
