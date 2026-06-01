from __future__ import annotations
import enum
from datetime import date, datetime
from typing import Optional
from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class TipoContratoEnum(str, enum.Enum):
    indefinido = "indefinido"
    plazo_fijo = "plazo_fijo"
    honorarios = "honorarios"
    part_time = "part_time"

class EstadoEmpleadoEnum(str, enum.Enum):
    activo = "activo"
    inactivo = "inactivo"
    licencia = "licencia"
    desvinculado = "desvinculado"

class TipoPermisoEnum(str, enum.Enum):
    vacaciones = "vacaciones"
    medico = "medico"
    personal = "personal"
    duelo = "duelo"
    matrimonio = "matrimonio"
    maternidad = "maternidad"
    paternidad = "paternidad"
    otro = "otro"

class EstadoSolicitudEnum(str, enum.Enum):
    pendiente = "pendiente"
    aprobada = "aprobada"
    rechazada = "rechazada"
    cancelada = "cancelada"

class TipoAusenciaEnum(str, enum.Enum):
    injustificada = "injustificada"
    justificada = "justificada"
    tardanza = "tardanza"
    salida_anticipada = "salida_anticipada"

class Empleado(Base):
    __tablename__ = "empleados"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    rut: Mapped[str] = mapped_column(String(12), nullable=False)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    apellido: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    telefono: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    direccion: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    fecha_nacimiento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    contacto_emergencia_nombre: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contacto_emergencia_telefono: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    cargo: Mapped[str] = mapped_column(String, nullable=False)
    departamento: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    fecha_ingreso: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_termino: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    tipo_contrato: Mapped[TipoContratoEnum] = mapped_column(Enum(TipoContratoEnum, name="tipo_contrato_enum", create_type=False), nullable=False, default=TipoContratoEnum.indefinido)
    sueldo_base: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dias_vacaciones_por_anio: Mapped[int] = mapped_column(Integer, default=15)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    estado: Mapped[EstadoEmpleadoEnum] = mapped_column(Enum(EstadoEmpleadoEnum, name="estado_empleado_enum", create_type=False), default=EstadoEmpleadoEnum.activo, nullable=False)
    notas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    solicitudes: Mapped[list[SolicitudPermiso]] = relationship(back_populates="empleado", cascade="all, delete-orphan")
    ausencias: Mapped[list[Ausencia]] = relationship(back_populates="empleado", cascade="all, delete-orphan")

class SolicitudPermiso(Base):
    __tablename__ = "solicitudes_permiso"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    empleado_id: Mapped[int] = mapped_column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo: Mapped[TipoPermisoEnum] = mapped_column(Enum(TipoPermisoEnum, name="tipo_permiso_enum", create_type=False), nullable=False)
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)
    dias_habiles: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    motivo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    documento_adjunto: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    estado: Mapped[EstadoSolicitudEnum] = mapped_column(Enum(EstadoSolicitudEnum, name="estado_solicitud_enum", create_type=False), default=EstadoSolicitudEnum.pendiente, nullable=False)
    aprobado_por: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    aprobado_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    comentario_aprobador: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    solicitado_por: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    empleado: Mapped[Empleado] = relationship(back_populates="solicitudes")

class Ausencia(Base):
    __tablename__ = "ausencias"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    empleado_id: Mapped[int] = mapped_column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    tipo: Mapped[TipoAusenciaEnum] = mapped_column(Enum(TipoAusenciaEnum, name="tipo_ausencia_enum", create_type=False), nullable=False)
    justificada: Mapped[bool] = mapped_column(Boolean, default=False)
    motivo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    registrado_por: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    empleado: Mapped[Empleado] = relationship(back_populates="ausencias")
