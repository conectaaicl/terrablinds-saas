from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.order import Order
    from app.models.user import User


class PostVenta(Base):
    __tablename__ = "post_ventas"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)

    # — Vínculos
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    creado_por: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # — Tipo y estado
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, default="satisfaccion")
    # satisfaccion | garantia | servicio | mantencion | otro
    estado: Mapped[str] = mapped_column(String(50), nullable=False, default="pendiente")
    # pendiente | contactado | en_proceso | resuelto | cerrado

    # — Contenido
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    calificacion: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5 estrellas
    ai_mensaje: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # mensaje generado por Groq
    notas: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")  # lista de notas de seguimiento

    # — Fechas
    fecha_programada: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    fecha_resolucion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # — Relationships
    client: Mapped[Client] = relationship(back_populates="post_ventas")
    order: Mapped[Order] = relationship()
    creador: Mapped[Optional[User]] = relationship(foreign_keys=[creado_por])
