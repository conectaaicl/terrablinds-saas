"""
Adjuntos — upload de fotos de instalación.

Guarda imágenes en backend/uploads/{tenant_id}/{order_id}/
Límite: 10 fotos por orden.
"""
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.config import get_settings
from app.dependencies import get_db_for_tenant
from app.models.attachment import OrderPhoto
from app.models.order import Order

router = APIRouter(prefix="/orders", tags=["attachments"])

MAX_PHOTOS = 10


class PhotoOut(BaseModel):
    id: int
    order_id: int
    tipo: str
    url: str
    subido_por: int
    subido_at: str

    model_config = {"from_attributes": True}


@router.get("/{order_id}/photos", response_model=list[PhotoOut])
async def list_photos(
    order_id: int,
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "fabricante", "instalador", "vendedor"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    result = await db.execute(
        select(OrderPhoto)
        .where(
            OrderPhoto.order_id == order_id,
            OrderPhoto.tenant_id == token_data.tenant_id,
        )
        .order_by(OrderPhoto.subido_at)
    )
    photos = result.scalars().all()
    return [
        PhotoOut(
            id=p.id,
            order_id=p.order_id,
            tipo=p.tipo,
            url=p.url,
            subido_por=p.subido_por,
            subido_at=p.subido_at.isoformat(),
        )
        for p in photos
    ]


@router.post("/{order_id}/photos", status_code=201)
async def upload_photo(
    order_id: int,
    tipo: str = "otro",
    file: UploadFile = File(...),
    token_data: TokenData = Depends(require_roles("instalador", "jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Sube una foto de instalación (máximo 10 por orden)."""
    settings = get_settings()

    # Validar orden existe y pertenece al tenant
    ord_res = await db.execute(
        select(Order).where(Order.id == order_id, Order.tenant_id == token_data.tenant_id)
    )
    if ord_res.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden no encontrada")

    # Contar fotos existentes
    existing = await db.execute(
        select(OrderPhoto).where(
            OrderPhoto.order_id == order_id,
            OrderPhoto.tenant_id == token_data.tenant_id,
        )
    )
    count = len(existing.scalars().all())
    if count >= MAX_PHOTOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Máximo {MAX_PHOTOS} fotos por orden",
        )

    # Validar tamaño
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Archivo demasiado grande (máximo {settings.MAX_UPLOAD_MB} MB)",
        )

    # Validar tipo de archivo
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten archivos de imagen",
        )

    # Guardar archivo
    upload_dir = Path(settings.UPLOAD_DIR) / token_data.tenant_id / str(order_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "foto.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / filename

    with open(file_path, "wb") as f:
        f.write(content)

    # URL relativa para servir via StaticFiles
    url = f"/uploads/{token_data.tenant_id}/{order_id}/{filename}"

    # Guardar en DB
    foto = OrderPhoto(
        order_id=order_id,
        tenant_id=token_data.tenant_id,
        tipo=tipo if tipo in ("antes", "durante", "despues", "problema", "otro") else "otro",
        url=url,
        subido_por=token_data.user_id,
    )
    db.add(foto)
    await db.flush()
    await db.refresh(foto)

    return JSONResponse(
        status_code=201,
        content={
            "id": foto.id,
            "order_id": foto.order_id,
            "tipo": foto.tipo,
            "url": foto.url,
            "subido_por": foto.subido_por,
            "subido_at": foto.subido_at.isoformat(),
        },
    )
