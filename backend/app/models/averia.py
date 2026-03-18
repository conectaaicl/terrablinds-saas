from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
import uuid as _uuid

from app.models.base import Base


class Averia(Base):
    """Reporte de avería o falla encontrado por el instalador durante un servicio."""
    __tablename__ = "averias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[str] = mapped_column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True
    )
    order_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    instalador_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    asignado_a: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Tipo de servicio afectado
    tipo_servicio: Mapped[str] = mapped_column(String(100), nullable=False)
    # cortinas_roller | persianas | electricidad | puertas | ventanas | maderas | muebles | otro

    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    severidad: Mapped[str] = mapped_column(String(20), nullable=False, default="media")
    # baja | media | alta | critica

    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="reportada")
    # reportada | en_revision | en_reparacion | reparada | cerrada

    fotos: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # list of base64 or upload paths

    notas_tecnicas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    presupuesto_estimado: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )
