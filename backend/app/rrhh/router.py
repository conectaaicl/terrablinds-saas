"""
RRHH — Documentos de empleados.
Acceso: jefe, gerente, coordinador.

GET    /rrhh/empleados                 — Lista empleados con conteo de documentos
GET    /rrhh/documentos/{user_id}      — Documentos de un empleado
POST   /rrhh/documentos/{user_id}      — Subir documento (multipart)
GET    /rrhh/documentos/file/{doc_id}  — Descargar/ver archivo
DELETE /rrhh/documentos/{doc_id}       — Eliminar documento
"""
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_roles, TokenData
from app.config import get_settings
from app.dependencies import get_db_for_tenant
from app.models.empleado_documento import EmpleadoDocumento
from app.models.user import User
from app.rrhh.schemas import DocumentoOut, EmpleadoConDocumentos, TIPOS_DOCUMENTO

router = APIRouter(prefix="/rrhh", tags=["rrhh"])

ROLES_ALL = ("jefe", "gerente", "coordinador")
ALLOWED_MIME = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "application/pdf",
}
MAX_BYTES = 15 * 1024 * 1024  # 15 MB


def _doc_to_out(doc: EmpleadoDocumento, settings) -> DocumentoOut:
    url = f"/uploads/rrhh/{doc.ruta_archivo}"
    return DocumentoOut(
        id=doc.id,
        tenant_id=doc.tenant_id,
        user_id=doc.user_id,
        subido_por=doc.subido_por,
        tipo=doc.tipo,
        nombre_archivo=doc.nombre_archivo,
        mime_type=doc.mime_type,
        tamano_bytes=doc.tamano_bytes,
        created_at=doc.created_at,
        url=url,
    )


@router.get("/empleados", response_model=list[EmpleadoConDocumentos])
async def list_empleados(
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Lista todos los empleados del tenant con su conteo de documentos."""
    users_result = await db.execute(
        select(User).where(User.tenant_id == token_data.tenant_id, User.activo.is_(True))
        .order_by(User.nombre)
    )
    users = users_result.scalars().all()

    docs_result = await db.execute(
        select(EmpleadoDocumento).where(EmpleadoDocumento.tenant_id == token_data.tenant_id)
    )
    docs = docs_result.scalars().all()
    docs_by_user: dict[int, int] = {}
    for d in docs:
        docs_by_user[d.user_id] = docs_by_user.get(d.user_id, 0) + 1

    return [
        EmpleadoConDocumentos(
            user_id=u.id,
            nombre=u.nombre,
            rol=u.rol.value if hasattr(u.rol, 'value') else str(u.rol),
            activo=u.activo,
            total_documentos=docs_by_user.get(u.id, 0),
        )
        for u in users
    ]


@router.get("/documentos/{user_id}", response_model=list[DocumentoOut])
async def list_docs(
    user_id: int,
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    settings = get_settings()
    result = await db.execute(
        select(EmpleadoDocumento)
        .where(
            EmpleadoDocumento.tenant_id == token_data.tenant_id,
            EmpleadoDocumento.user_id == user_id,
        )
        .order_by(EmpleadoDocumento.created_at.desc())
    )
    docs = result.scalars().all()
    return [_doc_to_out(d, settings) for d in docs]


@router.post("/documentos/{user_id}", response_model=DocumentoOut, status_code=201)
async def upload_doc(
    user_id: int,
    tipo: str = Form(...),
    file: UploadFile = File(...),
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    settings = get_settings()

    # Validaciones
    if tipo not in TIPOS_DOCUMENTO:
        raise HTTPException(400, f"Tipo inválido. Opciones: {TIPOS_DOCUMENTO}")
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, "Solo se permiten archivos JPG, PNG, WEBP o PDF")

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(400, f"Archivo demasiado grande (máx. {MAX_BYTES // 1024 // 1024} MB)")

    # Guardar archivo
    ext = Path(file.filename or "file").suffix.lower()
    if not ext:
        ext = ".pdf" if file.content_type == "application/pdf" else ".jpg"

    doc_id = uuid4()
    rel_path = f"{token_data.tenant_id}/{user_id}/{doc_id}{ext}"
    abs_dir = Path(settings.UPLOAD_DIR) / "rrhh" / token_data.tenant_id / str(user_id)
    abs_dir.mkdir(parents=True, exist_ok=True)
    abs_path = abs_dir / f"{doc_id}{ext}"

    with open(abs_path, "wb") as f:
        f.write(content)

    doc = EmpleadoDocumento(
        id=doc_id,
        tenant_id=token_data.tenant_id,
        user_id=user_id,
        subido_por=token_data.user_id,
        tipo=tipo,
        nombre_archivo=file.filename or f"documento{ext}",
        ruta_archivo=rel_path,
        mime_type=file.content_type or "application/octet-stream",
        tamano_bytes=len(content),
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return _doc_to_out(doc, settings)


@router.delete("/documentos/{doc_id}", status_code=204)
async def delete_doc(
    doc_id: uuid.UUID,
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    settings = get_settings()
    result = await db.execute(
        select(EmpleadoDocumento).where(
            EmpleadoDocumento.id == doc_id,
            EmpleadoDocumento.tenant_id == token_data.tenant_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento no encontrado")

    # Eliminar archivo físico
    abs_path = Path(settings.UPLOAD_DIR) / "rrhh" / doc.ruta_archivo
    if abs_path.exists():
        abs_path.unlink()

    await db.delete(doc)
