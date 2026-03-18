from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.auth.router import limiter
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    from app.database import engine

    await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()

    # En producción: deshabilitar /docs y /redoc (exponen la API públicamente)
    is_prod = settings.ENVIRONMENT == "production"
    app = FastAPI(
        title="WorkShopOS API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if is_prod else "/docs",
        redoc_url=None if is_prod else "/redoc",
        openapi_url=None if is_prod else "/openapi.json",
    )

    # CORS
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # Routers
    from app.attachments.router import router as attachments_router
    from app.auth.router import router as auth_router
    from app.chat.router import router as chat_router
    from app.clients.router import router as clients_router
    from app.coordinator.router import router as coordinator_router
    from app.cotizaciones.router import router as cotizaciones_router
    from app.dashboard.router import router as dashboard_router
    from app.gps.router import router as gps_router
    from app.insumos.router import router as insumos_router
    from app.mobile.router import router as mobile_router
    from app.notifications.router import router as notifications_router
    from app.orders.router import router as orders_router
    from app.productos.router import router as productos_router
    from app.tasks.router import router as tasks_router
    from app.tenants.router import router as tenants_router
    from app.users.router import router as users_router
    from app.post_venta.router import router as post_venta_router
    from app.rrhh.router import router as rrhh_router
    from app.inventario.router import router as inventario_router
    from app.averias.router import router as averias_router

    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(users_router, prefix="/api/v1")
    app.include_router(tenants_router, prefix="/api/v1")
    app.include_router(clients_router, prefix="/api/v1")
    app.include_router(orders_router, prefix="/api/v1")
    app.include_router(attachments_router, prefix="/api/v1")
    app.include_router(insumos_router, prefix="/api/v1")
    app.include_router(notifications_router, prefix="/api/v1")
    app.include_router(mobile_router, prefix="/api/v1")
    app.include_router(coordinator_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api/v1")
    app.include_router(chat_router, prefix="/api/v1")
    app.include_router(cotizaciones_router, prefix="/api/v1")
    app.include_router(productos_router, prefix="/api/v1")
    app.include_router(gps_router, prefix="/api/v1")
    app.include_router(tasks_router, prefix="/api/v1")
    app.include_router(post_venta_router, prefix="/api/v1")
    app.include_router(rrhh_router, prefix="/api/v1")
    app.include_router(inventario_router, prefix="/api/v1")
    app.include_router(averias_router, prefix="/api/v1")

    # Servir uploads de fotos
    uploads_dir = Path(settings.UPLOAD_DIR)
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
