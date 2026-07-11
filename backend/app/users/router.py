import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import text

from app.auth.dependencies import get_token_data
from app.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.auth.service import hash_password
from app.database import get_db, get_db_bypass_rls
from app.dependencies import get_db_for_tenant, set_tenant_context
from app.users.repository import UserRepository
from app.users.schemas import UserCreate, UserResponse, UserUpdate
from app.users.service import UserService

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/me/foto")
async def subir_mi_foto(
    file: UploadFile = File(...),
    token_data=Depends(get_token_data),
    db: AsyncSession = Depends(get_db_bypass_rls),
):
    """Cada usuario sube su propia foto de perfil."""
    content = await file.read()
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes")
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagen muy grande (máx 5MB)")
    settings = get_settings()
    tenant_id = token_data.tenant_id or "global"
    upload_dir = Path(settings.UPLOAD_DIR) / tenant_id / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "foto.jpg").suffix or ".jpg"
    filename = f"{token_data.user_id}_{uuid.uuid4().hex}{ext}"
    (upload_dir / filename).write_bytes(content)
    url = f"/uploads/{tenant_id}/avatars/{filename}"
    await db.execute(text("UPDATE users SET foto_url = :u WHERE id = :id"),
                     {"u": url, "id": token_data.user_id})
    await db.commit()
    return {"foto_url": url}



@router.get("/", response_model=list[UserResponse])
async def list_users(
    # superadmin puede listar pero debe pasar target_tenant_id como query param
    target_tenant_id: str | None = None,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    tenant_id = token_data.tenant_id

    # Superadmin: debe proveer tenant_id explícito para ver usuarios de un tenant
    if token_data.role == "superadmin":
        if not target_tenant_id:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail="superadmin debe especificar ?target_tenant_id=...",
            )
        await set_tenant_context(db, target_tenant_id)
        tenant_id = target_tenant_id

    service = UserService(db)
    users = await service.list_users(tenant_id)
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            nombre=u.nombre,
            rol=u.rol.value,
            tenant_id=u.tenant_id or "",
            activo=u.activo,
            telefono=u.telefono,
        )
        for u in users
    ]


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = UserService(db)
    user, plain_password = await service.create_user(
        data,
        creator_role=token_data.role,
        creator_tenant_id=token_data.tenant_id,
    )

    # Enviar credenciales al nuevo usuario via mail.conectaai.cl
    try:
        from app.tenants.repository import TenantRepository
        from app.core.email import send_user_welcome
        repo = TenantRepository(db)
        tenant = await repo.get_by_id(token_data.tenant_id)
        taller_nombre = tenant.nombre if tenant else "ConectaWork"
        import asyncio
        asyncio.create_task(send_user_welcome(
            to_email=user.email,
            nombre=user.nombre,
            rol=user.rol.value,
            taller_nombre=taller_nombre,
            password=plain_password,
        ))
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Email de bienvenida no enviado: {e}")

    return UserResponse(
        id=user.id,
        email=user.email,
        nombre=user.nombre,
        rol=user.rol.value,
        tenant_id=user.tenant_id or "",
        activo=user.activo,
        telefono=user.telefono,
    )


@router.patch("/{user_id}/toggle", response_model=UserResponse)
async def toggle_user(
    user_id: int,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = UserService(db)
    user = await service.toggle_active(
        user_id,
        tenant_id=token_data.tenant_id,
        requester_id=token_data.user_id,
    )
    return UserResponse(
        id=user.id,
        email=user.email,
        nombre=user.nombre,
        rol=user.rol.value,
        tenant_id=user.tenant_id or "",
        activo=user.activo,
        telefono=user.telefono,
    )


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    token_data: TokenData = Depends(require_roles("superadmin", "jefe", "gerente")),
    db: AsyncSession = Depends(get_db_bypass_rls),
):
    """Resetea la contraseña de un usuario y envía email con las nuevas credenciales.
    Superadmin: cualquier usuario. Jefe/gerente: solo usuarios de su tenant."""
    import logging
    logger = logging.getLogger(__name__)

    from app.users.service import _generate_password
    from app.tenants.repository import TenantRepository

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Jefe/gerente solo pueden resetear usuarios de su propio tenant
    if token_data.role != "superadmin":
        if not token_data.tenant_id or user.tenant_id != token_data.tenant_id:
            raise HTTPException(status_code=403, detail="Sin permiso para este usuario")

    new_password = _generate_password()
    await repo.update_password(user_id, hash_password(new_password))

    # Obtener nombre del taller
    taller_nombre = user.tenant_id or "tu taller"
    if user.tenant_id:
        try:
            t_repo = TenantRepository(db)
            tenant = await t_repo.get_by_id(user.tenant_id)
            if tenant:
                taller_nombre = tenant.nombre
        except Exception as e:
            logger.warning(f"No se pudo obtener nombre del taller: {e}")

    # Enviar email con nueva contraseña
    try:
        from app.email import send_user_welcome
        await send_user_welcome(
            to_email=user.email,
            nombre=user.nombre,
            rol=user.rol.value,
            taller_nombre=taller_nombre,
            password=new_password,
        )
        logger.info(f"Email de nueva contraseña enviado a {user.email}")
    except Exception as e:
        logger.error(f"Error enviando email de nueva contraseña a {user.email}: {e}")

    return {
        "user_id": user_id,
        "email": user.email,
        "message": "Contraseña reseteada y enviada al usuario por email",
    }



@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if token_data.role != "superadmin" and user.tenant_id != token_data.tenant_id:
        raise HTTPException(status_code=403, detail="Sin permiso para este usuario")
    updates = data.model_dump(exclude_none=True)
    user = await repo.update_user(user_id, updates)
    return UserResponse(
        id=user.id,
        email=user.email,
        nombre=user.nombre,
        rol=user.rol.value,
        tenant_id=user.tenant_id or "",
        activo=user.activo,
        telefono=user.telefono,
    )

@router.get("/by-role/{role}", response_model=list[UserResponse])
async def users_by_role(
    role: str,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = UserService(db)
    users = await service.get_by_role(role, token_data.tenant_id)
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            nombre=u.nombre,
            rol=u.rol.value,
            tenant_id=u.tenant_id or "",
            activo=u.activo,
            telefono=u.telefono,
        )
        for u in users
    ]
