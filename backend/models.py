from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class RoleEnum(str, enum.Enum):
    superadmin = "superadmin"
    jefe = "jefe"
    coordinador = "coordinador"
    vendedor = "vendedor"
    fabricante = "fabricante"
    instalador = "instalador"

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String)
    slug = Column(String, unique=True, index=True)
    plan = Column(String, default="basico")
    activo = Column(Boolean, default=True)
    branding = Column(JSON)  # { "primaryColor": "...", "logoEmoji": "..." }
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="tenant")
    orders = relationship("Order", back_populates="tenant")
    clients = relationship("Client", back_populates="tenant")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    nombre = Column(String)
    rol = Column(Enum(RoleEnum))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    activo = Column(Boolean, default=True)

    tenant = relationship("Tenant", back_populates="users")
    orders_as_vendedor = relationship("Order", foreign_keys="[Order.vendedor_id]")
    orders_as_fabricante = relationship("Order", foreign_keys="[Order.fabricante_id]")
    orders_as_instalador = relationship("Order", foreign_keys="[Order.instalador_id]")

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    email = Column(String)
    telefono = Column(String)
    direccion = Column(String)
    tenant_id = Column(String, ForeignKey("tenants.id"))

    tenant = relationship("Tenant", back_populates="clients")
    orders = relationship("Order", back_populates="client")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    numero = Column(Integer)  # ID legible
    tenant_id = Column(String, ForeignKey("tenants.id"))
    cliente_id = Column(Integer, ForeignKey("clients.id"))
    vendedor_id = Column(Integer, ForeignKey("users.id"))
    fabricante_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    instalador_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    estado = Column(String) # cotizado, confirmado, fabricacion, listo, instalacion, instalado, problema
    precio_total = Column(Integer)
    saldo_pendiente = Column(Integer)
    fecha_entrega = Column(DateTime, nullable=True)
    fecha_instalacion = Column(DateTime, nullable=True)
    
    productos = Column(JSON) # Lista de productos [{tipo, medidas, tela...}]
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="orders")
    client = relationship("Client", back_populates="orders")
    vendedor = relationship("User", foreign_keys=[vendedor_id])
    fabricante = relationship("User", foreign_keys=[fabricante_id])
    instalador = relationship("User", foreign_keys=[instalador_id])
    historial = relationship("OrderHistory", back_populates="order")

class OrderHistory(Base):
    __tablename__ = "order_history"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    estado = Column(String)
    usuario_id = Column(Integer, ForeignKey("users.id"))
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    notas = Column(String, nullable=True)

    order = relationship("Order", back_populates="historial")

class InsumoRequest(Base):
    __tablename__ = "insumo_requests"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    usuario_id = Column(Integer, ForeignKey("users.id"))
    items = Column(JSON) # ["tornillos", "tela black out"]
    urgencia = Column(String) # alta, media, baja
    estado = Column(String, default="pendiente") # pendiente, comprado, rechazado
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    mensaje = Column(String)
    tipo = Column(String) # info, alerta, exito
    leido_por = Column(JSON, default=[]) # Lista de IDs de usuarios que la leyeron
    created_at = Column(DateTime(timezone=True), server_default=func.now())
