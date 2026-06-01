import asyncio
from app.database import async_session
from app.auth.service import hash_password
from sqlalchemy import text

async def create_superadmin():
    async with async_session() as db:
        pwd = hash_password('Admin2024!')
        await db.execute(text("""
            INSERT INTO users (email, hashed_password, nombre, rol, activo)
            VALUES ('admin@conectawork.cl', :pwd, 'Super Admin', 'superadmin', true)
            ON CONFLICT DO NOTHING
        """), {'pwd': pwd})
        await db.commit()
        result = await db.execute(text("SELECT id, email, rol FROM users WHERE email = 'admin@conectawork.cl'"))
        row = result.fetchone()
        print(f'Created: {row}')

asyncio.run(create_superadmin())
