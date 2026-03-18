from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.client import Client
    from app.models.user import User


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        # Garantía de unicidad de numero por tenant en la DB
        # Segunda línea de defensa tras el contador atómico
        UniqueConstraint("numero", "tenant_id", name="uq_orders_numero_tenant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    tenant_id: Mapped[str] = mapped_column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cliente_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    vendedor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    fabricante_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    instalador_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    cotizacion_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    estado: Mapped[str] = mapped_column(String, nullable=False, default="cotizado")
    precio_total: Mapped[int] = mapped_column(Integer, nullable=False)
    productos: Mapped[list] = mapped_column(JSON, nullable=False)

    tracking_token: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    tracking_activo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Producción y garantía
    produccion_subestado: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    garantia_meses: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fecha_instalacion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    tenant: Mapped[Tenant] = relationship(back_populates="orders")
    client: Mapped[Client] = relationship(back_populates="orders")
    vendedor: Mapped[User] = relationship(foreign_keys=[vendedor_id])
    fabricante: Mapped[Optional[User]] = relationship(foreign_keys=[fabricante_id])
    instalador: Mapped[Optional[User]] = relationship(foreign_keys=[instalador_id])
    historial: Mapped[list[OrderHistory]] = relationship(
        back_populates="order", order_by="OrderHistory.id"
    )


class OrderHistory(Base):
    __tablename__ = "order_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    estado: Mapped[str] = mapped_column(String, nullable=False)
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    usuario_nombre: Mapped[str] = mapped_column(String, nullable=False, default="")
    # Corregido: DateTime en lugar de String
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    notas: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    order: Mapped[Order] = relationship(back_populates="historial")
    usuario: Mapped[User] = relationship(foreign_keys=[usuario_id])
