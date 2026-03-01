"""
Script de primera instalación: crea el superadmin del SaaS.
Ejecutar UNA SOLA VEZ después del primer deploy:

    docker compose -f docker-compose.prod.yml exec backend python create_superadmin.py

Variables de entorno requeridas en .env:
    SUPERADMIN_EMAIL    email del superadmin
    SUPERADMIN_PASSWORD contraseña (mínimo 12 caracteres)
"""
import asyncio
import os
import sys

from sqlalchemy import select


async def main():
    email = os.environ.get("SUPERADMIN_EMAIL", "").strip()
    password = os.environ.get("SUPERADMIN_PASSWORD", "").strip()

    if not email or not password:
        print("ERROR: Define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD en .env")
        sys.exit(1)

    if len(password) < 12:
        print("ERROR: La contraseña debe tener al menos 12 caracteres")
        sys.exit(1)

    from app.auth.service import hash_password
    from app.database import async_session
    from app.models.user import RoleEnum, User

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.rol == RoleEnum.superadmin)
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"Ya existe un superadmin: {existing.email}")
            print("Para cambiar contraseña, hazlo desde la interfaz admin.")
            sys.exit(0)

        superadmin = User(
            email=email,
            hashed_password=hash_password(password),
            nombre="Super Admin",
            rol=RoleEnum.superadmin,
            tenant_id=None,
            activo=True,
        )
        db.add(superadmin)
        await db.commit()
        print(f"Superadmin creado exitosamente: {email}")


if __name__ == "__main__":
    asyncio.run(main())
