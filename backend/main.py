from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="WorkShopOS API")

# Configurar CORS para permitir peticiones desde el Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción cambiar por dominio real
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH ---
@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.email, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email o password incorrectos")
    access_token = auth.create_access_token(data={"sub": user.email})
    
    # Obtener branding del tenant
    tenant = db.query(models.Tenant).filter(models.Tenant.id == user.tenant_id).first()
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user,
        "tenant_branding": tenant.branding if tenant else {}
    }

# --- USERS ---
@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/users/", response_model=List[schemas.UserResponse])
def read_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.User).filter(models.User.tenant_id == current_user.tenant_id).all()

# --- ORDERS ---
@app.get("/orders/", response_model=List[schemas.OrderResponse])
def read_orders(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    # Filtrar por rol
    query = db.query(models.Order).filter(models.Order.tenant_id == current_user.tenant_id)
    
    if current_user.rol == "vendedor":
        query = query.filter(models.Order.vendedor_id == current_user.id)
    elif current_user.rol == "fabricante":
        query = query.filter(models.Order.fabricante_id == current_user.id)
    elif current_user.rol == "instalador":
        query = query.filter(models.Order.instalador_id == current_user.id)
        
    return query.offset(skip).limit(limit).all()

@app.post("/orders/", response_model=schemas.OrderResponse)
def create_order(
    order: schemas.OrderCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    # Crear orden
    db_order = models.Order(
        tenant_id=current_user.tenant_id,
        cliente_id=order.cliente_id,
        vendedor_id=current_user.id,
        estado="cotizado",
        precio_total=order.precio_total,
        productos=order.productos, # Guardar JSON
        numero=1000 + db.query(models.Order).count() # Generar numero simple
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@app.put("/orders/{order_id}")
def update_order(
    order_id: int, 
    order_update: schemas.OrderUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    # Actualizar campos
    if order_update.estado:
        db_order.estado = order_update.estado
        # Registrar historial
        history = models.OrderHistory(
            order_id=db_order.id, 
            estado=order_update.estado, 
            usuario_id=current_user.id
        )
        db.add(history)
        
    if order_update.fabricante_id:
        db_order.fabricante_id = order_update.fabricante_id
    if order_update.instalador_id:
        db_order.instalador_id = order_update.instalador_id
    if order_update.fecha_instalacion:
        db_order.fecha_instalacion = order_update.fecha_instalacion

    db.commit()
    return {"message": "Orden actualizada"}

# --- INSUMOS ---
@app.post("/insumos/")
def request_insumos(
    req: schemas.InsumoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_req = models.InsumoRequest(
        tenant_id=current_user.tenant_id,
        usuario_id=current_user.id,
        items=req.items,
        urgencia=req.urgencia
    )
    db.add(db_req)
    db.commit()
    return {"message": "Solicitud enviada"}

@app.get("/insumos/")
def get_insumos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.rol not in ["jefe", "coordinador"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    return db.query(models.InsumoRequest).filter(
        models.InsumoRequest.tenant_id == current_user.tenant_id
    ).all()

# --- NOTIFICACIONES ---
@app.post("/notifications/")
def send_notification(
    noti: schemas.NotiCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.rol not in ["jefe", "coordinador"]:
        raise HTTPException(status_code=403, detail="No autorizado")
        
    db_noti = models.Notification(
        tenant_id=current_user.tenant_id,
        mensaje=noti.mensaje,
        tipo=noti.tipo
    )
    db.add(db_noti)
    db.commit()
    return {"message": "Notificación enviada a todos"}

@app.get("/notifications/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.Notification).filter(
        models.Notification.tenant_id == current_user.tenant_id
    ).order_by(models.Notification.created_at.desc()).limit(10).all()
