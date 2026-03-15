-- ============================================================
-- Migración 005: Catálogo de Productos, GPS Tracking, Tareas Diarias
--                y Notificaciones a Clientes
-- ============================================================

-- ─── 1. CATÁLOGO DE PRODUCTOS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   TEXT NOT NULL,
    codigo      TEXT,
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    categoria   TEXT NOT NULL DEFAULT 'general',
    unidad      TEXT NOT NULL DEFAULT 'm2',       -- m2 | ml | unidad
    precio_base NUMERIC(12,2) NOT NULL DEFAULT 0,
    colores     JSONB NOT NULL DEFAULT '[]',      -- ["Blanco","Negro",...]
    materiales  JSONB NOT NULL DEFAULT '[]',      -- ["Sunscreen 5%","Blackout",...]
    specs       JSONB NOT NULL DEFAULT '{}',      -- campos extra: accionamiento, motor, etc.
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_tenant    ON productos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos (tenant_id, categoria);
CREATE INDEX IF NOT EXISTS idx_productos_activo    ON productos (tenant_id, activo);

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON productos;
CREATE POLICY tenant_isolation ON productos
    USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- ─── 2. GPS PINGS (Tracking de técnicos en terreno) ───────────
CREATE TABLE IF NOT EXISTS gps_pings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id  UUID,
    order_id        INTEGER,
    lat             DOUBLE PRECISION NOT NULL,
    lon             DOUBLE PRECISION NOT NULL,
    precision_m     INTEGER,
    velocidad_kmh   NUMERIC(6,2),
    heading         NUMERIC(5,2),           -- dirección en grados
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_pings_tenant_user ON gps_pings (tenant_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_pings_appointment  ON gps_pings (appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gps_pings_order       ON gps_pings (order_id, created_at DESC);

ALTER TABLE gps_pings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON gps_pings;
CREATE POLICY tenant_isolation ON gps_pings
    USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- Vista "última posición conocida" por usuario
CREATE OR REPLACE VIEW v_gps_last_position AS
SELECT DISTINCT ON (tenant_id, user_id)
    tenant_id,
    user_id,
    order_id,
    appointment_id,
    lat,
    lon,
    precision_m,
    velocidad_kmh,
    created_at AS last_seen
FROM gps_pings
ORDER BY tenant_id, user_id, created_at DESC;

-- ─── 3. TAREAS DIARIAS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL,
    titulo          TEXT NOT NULL,
    descripcion     TEXT,
    asignado_a      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asignado_por    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id        INTEGER,                -- opcional: orden relacionada
    fecha_tarea     DATE NOT NULL DEFAULT CURRENT_DATE,
    prioridad       TEXT NOT NULL DEFAULT 'normal',  -- baja | normal | alta | urgente
    estado          TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | en_progreso | completada | cancelada
    notas_cierre    TEXT,
    completado_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_tenant      ON daily_tasks (tenant_id, fecha_tarea);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_asignado    ON daily_tasks (tenant_id, asignado_a, fecha_tarea);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_estado      ON daily_tasks (tenant_id, estado, fecha_tarea);

ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON daily_tasks;
CREATE POLICY tenant_isolation ON daily_tasks
    USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- ─── 4. NOTIFICACIONES A CLIENTES ────────────────────────────
CREATE TABLE IF NOT EXISTS client_notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL,
    order_id        INTEGER NOT NULL,
    cliente_email   TEXT,
    cliente_nombre  TEXT,
    tipo            TEXT NOT NULL,   -- instalacion_programada | en_ruta | completada | recordatorio
    asunto          TEXT NOT NULL,
    mensaje         TEXT NOT NULL,
    canal           TEXT NOT NULL DEFAULT 'sistema',  -- sistema | email | sms | whatsapp
    estado_envio    TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | enviado | fallido
    enviado_at      TIMESTAMPTZ,
    enviado_por     UUID,
    meta            JSONB NOT NULL DEFAULT '{}',      -- {fecha_cita, hora_cita, tecnico_nombre, etc.}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_notif_order  ON client_notifications (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_notif_tenant ON client_notifications (tenant_id, created_at DESC);

ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON client_notifications;
CREATE POLICY tenant_isolation ON client_notifications
    USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- ─── 5. APPOINTMENTS: agregar campo notificacion_enviada ──────
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS notificacion_cliente BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notas_cliente TEXT;

-- ─── 6. ORDERS: agregar campo notas_instalacion ───────────────
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS notas_instalacion TEXT,
    ADD COLUMN IF NOT EXISTS firma_requerida BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── 7. FUNCIÓN: updated_at auto-update trigger ───────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_tasks_updated_at ON daily_tasks;
CREATE TRIGGER trg_daily_tasks_updated_at
    BEFORE UPDATE ON daily_tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 8. DATOS SEMILLA: categorías ejemplo para tenant ─────────
-- (Opcional: el seed.py lo puede poblar al crear tenant)
