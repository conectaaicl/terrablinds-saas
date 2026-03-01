from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.order import Order
    from app.models.team import Team, Vehicle


class Appointment(Base):
    """Agenda de instalación — una cita por orden (o múltiples si se reagenda)."""
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fecha_fin: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    direccion: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notas: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # 'pendiente' | 'en_ruta' | 'completado' | 'cancelado'
    estado: Mapped[str] = mapped_column(String, nullable=False, default="pendiente")
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    order: Mapped[Order] = relationship(foreign_keys=[order_id])
    team: Mapped[Optional[Team]] = relationship(foreign_keys=[team_id])
    vehicle: Mapped[Optional[Vehicle]] = relationship(foreign_keys=[vehicle_id])
    creator: Mapped[User] = relationship(foreign_keys=[created_by])
    members: Mapped[list[AppointmentMember]] = relationship(
        back_populates="appointment", cascade="all, delete-orphan"
    )
    reschedules: Mapped[list[AppointmentReschedule]] = relationship(
        back_populates="appointment", cascade="all, delete-orphan",
        order_by="AppointmentReschedule.id",
    )


class AppointmentMember(Base):
    """Miembros asignados a una cita (instaladores individuales)."""
    __tablename__ = "appointment_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    appointment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    appointment: Mapped[Appointment] = relationship(back_populates="members")
    user: Mapped[User] = relationship(foreign_keys=[user_id])


class AppointmentReschedule(Base):
    """Historial de reagendamientos para métricas."""
    __tablename__ = "appointment_reschedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    appointment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    fecha_anterior: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fecha_nueva: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    motivo: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    appointment: Mapped[Appointment] = relationship(back_populates="reschedules")
    creator: Mapped[User] = relationship(foreign_keys=[created_by])
