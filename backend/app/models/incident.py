from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.order import Order
    from app.models.appointment import Appointment


class Incident(Base):
    """
    Incidente reportado durante fabricación o instalación.
    Linked a una orden y opcionalmente a una cita.
    """
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    appointment_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True
    )
    # Tipos: 'material_faltante' | 'medidas_incorrectas' | 'acceso_bloqueado'
    #        | 'cliente_ausente' | 'danio_propiedad' | 'herramienta_faltante' | 'otro'
    tipo: Mapped[str] = mapped_column(String, nullable=False, default="otro")
    descripcion: Mapped[str] = mapped_column(String, nullable=False)
    resuelto: Mapped[bool] = mapped_column(Boolean, default=False)
    resuelto_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resuelto_por: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reportado_por: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    order: Mapped[Order] = relationship(foreign_keys=[order_id])
    reporter: Mapped[User] = relationship(foreign_keys=[reportado_por])
    resolver: Mapped[Optional[User]] = relationship(foreign_keys=[resuelto_por])
