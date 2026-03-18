from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


TIPOS_DOCUMENTO = ["contrato", "cedula", "licencia", "certificado_medico", "finiquito", "otro"]


class DocumentoOut(BaseModel):
    id: UUID
    tenant_id: str
    user_id: int
    subido_por: Optional[int] = None
    tipo: str
    nombre_archivo: str
    mime_type: str
    tamano_bytes: int
    created_at: datetime
    url: Optional[str] = None  # URL pública para descarga

    model_config = {"from_attributes": True}


class EmpleadoConDocumentos(BaseModel):
    user_id: int
    nombre: str
    rol: str
    activo: bool
    total_documentos: int
    documentos: list[DocumentoOut] = []
