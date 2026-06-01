from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, Table
from sqlalchemy.orm import relationship
import enum
from app.models.base import Base

class TipoVisita(str, enum.Enum):
    instalacion = "instalacion"
    servicio_tecnico = "servicio_tecnico"
    medicion = "medicion"
    otro = "otro"

programacion_tecnicos = Table(
    "programacion_tecnicos",
    Base.metadata,
    Column("programacion_id", Integer, ForeignKey("programaciones.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

class Programacion(Base):
    __tablename__ = "programaciones"
    id                  = Column(Integer, primary_key=True)
    tenant_id           = Column(String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    fecha               = Column(Date, nullable=False)
    hora                = Column(String(5), nullable=False)
    tipo_visita         = Column(String, nullable=False, default="instalacion")
    cliente_nombre      = Column(String, nullable=False)
    cliente_telefono    = Column(String, nullable=True)
    cliente_direccion   = Column(String, nullable=False)
    ot                  = Column(String, nullable=True)
    vendedor_nombre     = Column(String, nullable=True)
    descripcion_trabajo = Column(Text, nullable=False)
    observaciones       = Column(Text, nullable=True)
    creado_por          = Column(Integer, ForeignKey("users.id"), nullable=False)
    tecnicos = relationship("User", secondary=programacion_tecnicos, lazy="selectin")
