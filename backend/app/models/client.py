from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.order import Order
    from app.models.post_venta import PostVenta


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[str] = mapped_column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # — Datos básicos
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    rut: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    tipo_cliente: Mapped[str] = mapped_column(String(20), nullable=False, server_default="persona")
    empresa: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # — Contacto
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    email2: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    telefono2: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # — Dirección
    direccion: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ciudad: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # — CRM
    origen: Mapped[str] = mapped_column(String(50), nullable=False, server_default="directo")
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    notas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # — Relación con vendedor
    vendedor_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # — Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # — Relationships
    tenant: Mapped[Tenant] = relationship(back_populates="clients")
    orders: Mapped[list[Order]] = relationship(back_populates="client")
    post_ventas: Mapped[list[PostVenta]] = relationship(back_populates="client")
