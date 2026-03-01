"""Seed the database with demo data."""
import asyncio
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import hash_password
from app.database import async_session
from app.models import (
    Base,
    Client,
    InsumoRequest,
    Notification,
    Order,
    OrderHistory,
    Tenant,
    User,
)
from app.models.user import RoleEnum


def dt(iso: str) -> datetime:
    """Convierte '2025-01-10' a datetime con timezone UTC."""
    return datetime.fromisoformat(iso).replace(tzinfo=timezone.utc)


async def seed():
    async with async_session() as db:
        # Check if data already exists
        result = await db.execute(select(Tenant).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        hashed_admin = hash_password("admin")
        hashed_1234 = hash_password("1234")

        # ── Tenants ──
        tenants = [
            Tenant(
                id="tb-001",
                nombre="Terrablinds",
                slug="terrablinds",
                plan="pro",
                activo=True,
                branding={
                    "primaryColor": "#d97706",
                    "primaryLight": "#fbbf24",
                    "primaryDark": "#92400e",
                    "sidebarBg": "#0f172a",
                    "sidebarText": "#94a3b8",
                    "logoEmoji": "\u2600\ufe0f",
                    "slogan": "Cortinas & Toldos a Medida",
                },
            ),
            Tenant(
                id="mc-001",
                nombre="MaderaCraft",
                slug="maderacraft",
                plan="basico",
                activo=True,
                branding={
                    "primaryColor": "#059669",
                    "primaryLight": "#34d399",
                    "primaryDark": "#065f46",
                    "sidebarBg": "#1a1a2e",
                    "sidebarText": "#a0aec0",
                    "logoEmoji": "\U0001fab5",
                    "slogan": "Muebles a Medida con Dise\u00f1o",
                },
            ),
            Tenant(
                id="tp-001",
                nombre="ToldoPro",
                slug="toldopro",
                plan="trial",
                activo=True,
                branding={
                    "primaryColor": "#2563eb",
                    "primaryLight": "#60a5fa",
                    "primaryDark": "#1e40af",
                    "sidebarBg": "#18181b",
                    "sidebarText": "#a1a1aa",
                    "logoEmoji": "\U0001f3d7\ufe0f",
                    "slogan": "Toldos Industriales y Residenciales",
                },
            ),
        ]
        db.add_all(tenants)
        await db.flush()

        # ── Users ──
        users_data = [
            # Super Admin
            ("admin@saas.com", hashed_admin, "Admin SaaS", "superadmin", None),
            # Terrablinds
            ("jefe@terrablinds.cl", hashed_1234, "Carlos M\u00e9ndez", "jefe", "tb-001"),
            ("gerente@terrablinds.cl", hashed_1234, "Valeria Castro", "gerente", "tb-001"),
            ("coordinador@terrablinds.cl", hashed_1234, "Carolina Coordinadora", "coordinador", "tb-001"),
            ("andrea@terrablinds.cl", hashed_1234, "Andrea Soto", "vendedor", "tb-001"),
            ("miguel@terrablinds.cl", hashed_1234, "Miguel Torres", "vendedor", "tb-001"),
            ("roberto@terrablinds.cl", hashed_1234, "Roberto D\u00edaz", "fabricante", "tb-001"),
            ("felipe@terrablinds.cl", hashed_1234, "Felipe Mu\u00f1oz", "fabricante", "tb-001"),
            ("juan@terrablinds.cl", hashed_1234, "Juan P\u00e9rez", "instalador", "tb-001"),
            ("diego@terrablinds.cl", hashed_1234, "Diego Rojas", "instalador", "tb-001"),
            # MaderaCraft
            ("sofia@maderacraft.cl", hashed_1234, "Sof\u00eda Vargas", "jefe", "mc-001"),
            ("luis@maderacraft.cl", hashed_1234, "Luis Ramos", "vendedor", "mc-001"),
            ("tomas@maderacraft.cl", hashed_1234, "Tom\u00e1s Herrera", "fabricante", "mc-001"),
            ("ivan@maderacraft.cl", hashed_1234, "Iv\u00e1n Castro", "instalador", "mc-001"),
            # ToldoPro
            ("marta@toldopro.cl", hashed_1234, "Marta Silva", "jefe", "tp-001"),
        ]
        users = []
        for email, pw, nombre, rol, tid in users_data:
            u = User(
                email=email,
                hashed_password=pw,
                nombre=nombre,
                rol=RoleEnum(rol),
                tenant_id=tid,
                activo=True,
            )
            db.add(u)
            users.append(u)
        await db.flush()

        # Build user lookup by email
        user_map = {u.email: u for u in users}

        # ── Clients ──
        clients_data = [
            ("Mar\u00eda Gonz\u00e1lez", "maria@gmail.com", "+56 9 1234 5678", "Av. Providencia 1234, Depto 302, Santiago", "andrea@terrablinds.cl", "tb-001"),
            ("Pedro Salazar", "pedro@gmail.com", "+56 9 8765 4321", "Los Leones 567, Oficina 201, Providencia", "andrea@terrablinds.cl", "tb-001"),
            ("Ana Mart\u00ednez", "ana@gmail.com", "+56 9 1122 3344", "Irarr\u00e1zaval 890, Casa 12, \u00d1u\u00f1oa", "miguel@terrablinds.cl", "tb-001"),
            ("Luis Fern\u00e1ndez", "luis@gmail.com", "+56 9 5566 7788", "Apoquindo 4500, Piso 8, Las Condes", "miguel@terrablinds.cl", "tb-001"),
            ("Camila Ruiz", "camila@gmail.com", "+56 9 3344 5566", "Av. Italia 1100, Depto 501, Providencia", "andrea@terrablinds.cl", "tb-001"),
            # MaderaCraft
            ("Jorge Bravo", "jorge@gmail.com", "+56 9 2233 4455", "Av. Las Condes 9800, Las Condes", "luis@maderacraft.cl", "mc-001"),
            ("Paula D\u00edaz", "paula@gmail.com", "+56 9 6677 8899", "Av. Vitacura 4200, Vitacura", "luis@maderacraft.cl", "mc-001"),
        ]
        clients = []
        for nombre, email, tel, dir_, vendedor_email, tid in clients_data:
            c = Client(
                nombre=nombre,
                email=email,
                telefono=tel,
                direccion=dir_,
                vendedor_id=user_map[vendedor_email].id,
                tenant_id=tid,
            )
            db.add(c)
            clients.append(c)
        await db.flush()

        # ── Orders with full history ──
        andrea = user_map["andrea@terrablinds.cl"]
        miguel = user_map["miguel@terrablinds.cl"]
        carlos = user_map["jefe@terrablinds.cl"]
        roberto = user_map["roberto@terrablinds.cl"]
        felipe = user_map["felipe@terrablinds.cl"]
        juan = user_map["juan@terrablinds.cl"]
        diego = user_map["diego@terrablinds.cl"]
        luis_mc = user_map["luis@maderacraft.cl"]
        sofia_mc = user_map["sofia@maderacraft.cl"]
        tomas_mc = user_map["tomas@maderacraft.cl"]

        orders_data = [
            # ORD-001: en_fabricacion
            {
                "numero": 1, "tenant_id": "tb-001", "cliente_id": clients[0].id,
                "vendedor_id": andrea.id, "fabricante_id": roberto.id,
                "estado": "en_fabricacion", "precio_total": 157000,
                "cotizacion_id": "cot-001",
                "productos": [
                    {"id": "p1", "tipo": "Cortina Roller", "ancho": 180, "alto": 220, "tela": "Sunscreen 5%", "color": "Blanco", "precio": 85000},
                    {"id": "p2", "tipo": "Cortina Roller", "ancho": 150, "alto": 200, "tela": "Sunscreen 5%", "color": "Gris", "precio": 72000},
                ],
                "historial": [
                    ("cotizado", "2025-01-10", andrea.id, "Andrea Soto"),
                    ("confirmado", "2025-01-11", andrea.id, "Andrea Soto"),
                    ("en_fabricacion", "2025-01-12", carlos.id, "Carlos M\u00e9ndez"),
                ],
            },
            # ORD-002: en_instalacion
            {
                "numero": 2, "tenant_id": "tb-001", "cliente_id": clients[1].id,
                "vendedor_id": andrea.id, "fabricante_id": roberto.id, "instalador_id": juan.id,
                "estado": "en_instalacion", "precio_total": 320000,
                "cotizacion_id": "cot-002",
                "productos": [
                    {"id": "p3", "tipo": "Toldo Retr\u00e1ctil", "ancho": 300, "alto": 250, "tela": "Acr\u00edlica", "color": "Azul Marino", "precio": 320000},
                ],
                "historial": [
                    ("cotizado", "2025-01-08", andrea.id, "Andrea Soto"),
                    ("confirmado", "2025-01-09", andrea.id, "Andrea Soto"),
                    ("en_fabricacion", "2025-01-10", carlos.id, "Carlos M\u00e9ndez"),
                    ("fabricado", "2025-01-15", roberto.id, "Roberto D\u00edaz"),
                    ("agendado", "2025-01-15", carlos.id, "Carlos M\u00e9ndez"),
                    ("en_ruta", "2025-01-16", juan.id, "Juan P\u00e9rez"),
                    ("en_instalacion", "2025-01-16", juan.id, "Juan P\u00e9rez"),
                ],
            },
            # ORD-003: confirmado
            {
                "numero": 3, "tenant_id": "tb-001", "cliente_id": clients[2].id,
                "vendedor_id": miguel.id,
                "estado": "confirmado", "precio_total": 293000,
                "cotizacion_id": "cot-003",
                "productos": [
                    {"id": "p4", "tipo": "Persiana Enrollable", "ancho": 120, "alto": 180, "tela": "Blackout", "color": "Negro", "precio": 95000},
                    {"id": "p5", "tipo": "Persiana Enrollable", "ancho": 100, "alto": 180, "tela": "Blackout", "color": "Negro", "precio": 88000},
                    {"id": "p6", "tipo": "Cortina Roller", "ancho": 200, "alto": 240, "tela": "Sunscreen 3%", "color": "Beige", "precio": 110000},
                ],
                "historial": [
                    ("cotizado", "2025-01-14", miguel.id, "Miguel Torres"),
                    ("confirmado", "2025-01-15", miguel.id, "Miguel Torres"),
                ],
            },
            # ORD-004: cerrado
            {
                "numero": 4, "tenant_id": "tb-001", "cliente_id": clients[3].id,
                "vendedor_id": miguel.id, "fabricante_id": felipe.id, "instalador_id": diego.id,
                "estado": "cerrado", "precio_total": 78000,
                "cotizacion_id": "cot-004",
                "productos": [
                    {"id": "p7", "tipo": "Cortina Roller", "ancho": 160, "alto": 210, "tela": "Sunscreen 5%", "color": "Blanco", "precio": 78000},
                ],
                "historial": [
                    ("cotizado", "2025-01-05", miguel.id, "Miguel Torres"),
                    ("confirmado", "2025-01-06", miguel.id, "Miguel Torres"),
                    ("en_fabricacion", "2025-01-07", carlos.id, "Carlos M\u00e9ndez"),
                    ("fabricado", "2025-01-10", felipe.id, "Felipe Mu\u00f1oz"),
                    ("agendado", "2025-01-10", carlos.id, "Carlos M\u00e9ndez"),
                    ("en_ruta", "2025-01-11", diego.id, "Diego Rojas"),
                    ("en_instalacion", "2025-01-11", diego.id, "Diego Rojas"),
                    ("pendiente_firma", "2025-01-13", diego.id, "Diego Rojas"),
                    ("cerrado", "2025-01-13", diego.id, "Diego Rojas"),
                ],
            },
            # ORD-005: cotizado
            {
                "numero": 5, "tenant_id": "tb-001", "cliente_id": clients[4].id,
                "vendedor_id": andrea.id,
                "estado": "cotizado", "precio_total": 280000,
                "cotizacion_id": "cot-005",
                "productos": [
                    {"id": "p8", "tipo": "Toldo Vertical", "ancho": 250, "alto": 300, "tela": "PVC", "color": "Transparente", "precio": 280000},
                ],
                "historial": [
                    ("cotizado", "2025-01-16", andrea.id, "Andrea Soto"),
                ],
            },
            # ORD-006: fabricado (listo para agendar)
            {
                "numero": 6, "tenant_id": "tb-001", "cliente_id": clients[0].id,
                "vendedor_id": andrea.id, "fabricante_id": felipe.id,
                "estado": "fabricado", "precio_total": 260000,
                "cotizacion_id": "cot-006",
                "productos": [
                    {"id": "p9", "tipo": "Cortina Zebra", "ancho": 140, "alto": 200, "tela": "Tela Decorativa", "color": "Crema", "precio": 125000},
                    {"id": "p10", "tipo": "Cortina Zebra", "ancho": 160, "alto": 200, "tela": "Tela Decorativa", "color": "Crema", "precio": 135000},
                ],
                "historial": [
                    ("cotizado", "2025-01-09", andrea.id, "Andrea Soto"),
                    ("confirmado", "2025-01-10", andrea.id, "Andrea Soto"),
                    ("en_fabricacion", "2025-01-11", carlos.id, "Carlos M\u00e9ndez"),
                    ("fabricado", "2025-01-15", felipe.id, "Felipe Mu\u00f1oz"),
                ],
            },
            # ORD-007: problema
            {
                "numero": 7, "tenant_id": "tb-001", "cliente_id": clients[3].id,
                "vendedor_id": miguel.id, "fabricante_id": roberto.id,
                "estado": "problema", "precio_total": 98000,
                "cotizacion_id": "cot-007",
                "productos": [
                    {"id": "p11", "tipo": "Cortina Blackout", "ancho": 180, "alto": 220, "tela": "Blackout", "color": "Gris", "precio": 98000},
                ],
                "historial": [
                    ("cotizado", "2025-01-12", miguel.id, "Miguel Torres"),
                    ("confirmado", "2025-01-13", miguel.id, "Miguel Torres"),
                    ("en_fabricacion", "2025-01-14", carlos.id, "Carlos M\u00e9ndez"),
                    ("problema", "2025-01-16", roberto.id, "Roberto D\u00edaz"),
                ],
            },
            # MC-001: en_fabricacion
            {
                "numero": 1, "tenant_id": "mc-001", "cliente_id": clients[5].id,
                "vendedor_id": luis_mc.id, "fabricante_id": tomas_mc.id,
                "estado": "en_fabricacion", "precio_total": 450000,
                "cotizacion_id": "mc-cot-001",
                "productos": [
                    {"id": "mc-p1", "tipo": "Mueble a Medida", "ancho": 220, "alto": 80, "tela": "Lino", "color": "Beige", "precio": 450000},
                ],
                "historial": [
                    ("cotizado", "2025-01-20", luis_mc.id, "Luis Ramos"),
                    ("confirmado", "2025-01-21", luis_mc.id, "Luis Ramos"),
                    ("en_fabricacion", "2025-01-22", sofia_mc.id, "Sof\u00eda Vargas"),
                ],
            },
            # MC-002: confirmado
            {
                "numero": 2, "tenant_id": "mc-001", "cliente_id": clients[6].id,
                "vendedor_id": luis_mc.id,
                "estado": "confirmado", "precio_total": 680000,
                "cotizacion_id": "mc-cot-002",
                "productos": [
                    {"id": "mc-p2", "tipo": "Mueble a Medida", "ancho": 300, "alto": 90, "tela": "Lino", "color": "Crema", "precio": 680000},
                ],
                "historial": [
                    ("cotizado", "2025-01-25", luis_mc.id, "Luis Ramos"),
                    ("confirmado", "2025-01-26", luis_mc.id, "Luis Ramos"),
                ],
            },
        ]

        for od in orders_data:
            hist = od.pop("historial")
            order = Order(**od)
            db.add(order)
            await db.flush()

            for estado, fecha_str, uid, uname in hist:
                h = OrderHistory(
                    order_id=order.id,
                    estado=estado,
                    usuario_id=uid,
                    usuario_nombre=uname,
                    fecha=dt(fecha_str),
                )
                db.add(h)

        await db.commit()
        print("Database seeded successfully with demo data.")


if __name__ == "__main__":
    asyncio.run(seed())
