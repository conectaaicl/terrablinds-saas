from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False)
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    asignado_a: Mapped[int] = mapped_column(Integer, nullable=False)     # FK → users.id
    asignado_por: Mapped[int] = mapped_column(Integer, nullable=False)   # FK → users.id
    order_id: Mapped[int | None] = mapped_column(Integer)
    fecha_tarea: Mapped[date] = mapped_column(Date, nullable=False)
    prioridad: Mapped[str] = mapped_column(String(20), nullable=False, default="normal")
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="pendiente")
    notas_cierre: Mapped[str | None] = mapped_column(Text)
    completado_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
