from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Any, Optional
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.user import User
    from app.models.order import Order


class Cotizacion(Base):
    """Cotización independiente que puede convertirse en orden."""
    __tablename__ = "cotizaciones"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    cliente_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    vendedor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    # borrador | enviada | aceptada | rechazada | convertida
    estado: Mapped[str] = mapped_column(String, nullable=False, default="borrador")
    productos: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)
    precio_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    valid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    orden_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("orders.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    client: Mapped[Client] = relationship(foreign_keys=[cliente_id])
    vendedor: Mapped[User] = relationship(foreign_keys=[vendedor_id])
    orden: Mapped[Optional[Order]] = relationship(foreign_keys=[orden_id])
