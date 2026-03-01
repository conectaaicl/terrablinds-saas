from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.order import Order
    from app.models.appointment import Appointment


class OrderPhoto(Base):
    """Fotos adjuntas a una orden (antes/durante/después de instalación)."""
    __tablename__ = "order_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    appointment_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True
    )
    # 'antes' | 'durante' | 'despues' | 'problema' | 'otro'
    tipo: Mapped[str] = mapped_column(String, nullable=False, default="otro")
    url: Mapped[str] = mapped_column(String, nullable=False)   # S3 / R2 URL
    subido_por: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    subido_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    order: Mapped[Order] = relationship(foreign_keys=[order_id])
    uploader: Mapped[User] = relationship(foreign_keys=[subido_por])


class DigitalSignature(Base):
    """
    Firma digital del cliente al cierre de la orden.
    Una orden tiene máximo una firma (constraint UNIQUE en order_id).
    """
    __tablename__ = "digital_signatures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    # Base64-encoded SVG/PNG del trazo de la firma
    firma_data: Mapped[str] = mapped_column(Text, nullable=False)
    firmante_nombre: Mapped[str] = mapped_column(String, nullable=False)
    firmante_rut: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    firmante_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # GPS opcional para validez legal
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    firmado_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # ID del instalador que tomó la firma
    registrado_por: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    order: Mapped[Order] = relationship(foreign_keys=[order_id])
    registrador: Mapped[Optional[User]] = relationship(foreign_keys=[registrado_por])
