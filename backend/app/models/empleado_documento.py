from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class EmpleadoDocumento(Base):
    __tablename__ = "empleado_documentos"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)

    # — Vínculos
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subido_por: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # — Datos del documento
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, default="otro")
    # contrato | cedula | licencia | certificado_medico | finiquito | otro
    nombre_archivo: Mapped[str] = mapped_column(String(500), nullable=False)
    ruta_archivo: Mapped[str] = mapped_column(String(1000), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False, default="application/octet-stream")
    tamano_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # — Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
