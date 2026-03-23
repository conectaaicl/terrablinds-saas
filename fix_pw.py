"""
Fix corrupted bcrypt hashes — run inside backend container.
Usage: python3 /app/fix_pw.py
"""
import asyncio
import os

async def main():
    import asyncpg

    # Build DSN from env (same as app)
    db_url = os.environ.get("DATABASE_URL", "")
    # Convert SQLAlchemy async URL to asyncpg DSN
    dsn = db_url.replace("postgresql+asyncpg://", "postgresql://")

    if not dsn:
        # Fallback: build from individual env vars
        user = os.environ.get("POSTGRES_USER", "workshopos_app")
        password = os.environ.get("POSTGRES_PASSWORD", "")
        host = os.environ.get("POSTGRES_HOST", "db")
        port = os.environ.get("POSTGRES_PORT", "5432")
        dbname = os.environ.get("POSTGRES_DB", "workshopos")
        dsn = f"postgresql://{user}:{password}@{host}:{port}/{dbname}"

    print(f"Connecting to: {dsn[:40]}...")

    conn = await asyncpg.connect(dsn)

    # Good bcrypt hash for "Admin2025"
    good_hash = "$2b$12$VcDZsZith6UliIUU3vz33OrWxSKnkZSoojCNpIF0H4pubJODEsk5W"

    emails = [
        "supersoftware.fp@gmail.com",
        "jefe@terrablinds.cl",
        "admin@workshopos.cl",
    ]

    for email in emails:
        row = await conn.fetchrow("SELECT id, email, password_hash FROM usuarios WHERE email = $1", email)
        if row:
            current = row["password_hash"]
            print(f"  {email}: current hash = {repr(current[:20])}")
            result = await conn.execute(
                "UPDATE usuarios SET password_hash = $1 WHERE email = $2",
                good_hash, email
            )
            print(f"  → Updated: {result}")
        else:
            print(f"  {email}: NOT FOUND — trying to insert...")
            # Determine tenant and role
            if email == "supersoftware.fp@gmail.com":
                tenant_id = "workshopos"
                rol = "superadmin"
                nombre = "Super Admin"
            elif email == "jefe@terrablinds.cl":
                tenant_id = "terrablinds"
                rol = "jefe"
                nombre = "Jefe TerraBlinds"
            else:
                tenant_id = "workshopos"
                rol = "superadmin"
                nombre = "Admin WorkshopOS"

            try:
                await conn.execute(
                    """INSERT INTO usuarios (email, password_hash, nombre, rol, tenant_id, activo)
                       VALUES ($1, $2, $3, $4, $5, true)
                       ON CONFLICT (email) DO UPDATE SET password_hash = $2""",
                    email, good_hash, nombre, rol, tenant_id
                )
                print(f"  → Inserted/updated OK")
            except Exception as e:
                print(f"  → Error: {e}")

    # Verify
    print("\nVerification:")
    for email in emails:
        row = await conn.fetchrow("SELECT id, email, password_hash FROM usuarios WHERE email = $1", email)
        if row:
            h = row["password_hash"]
            ok = h.startswith("$2b$")
            print(f"  {'✓' if ok else '✗'} {email}: {h[:30]}...")
        else:
            print(f"  ✗ {email}: NOT FOUND")

    await conn.close()
    print("\nDone.")

asyncio.run(main())
