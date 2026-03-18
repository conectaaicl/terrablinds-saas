-- =================================================================
-- WorkshopOS — Migración 002: RLS, Constraints e Índices
-- Ejecutar como superuser de PostgreSQL (postgres)
-- Aplicar DESPUÉS de que alembic haya creado las tablas base
--
-- Ejecución en producción:
--   docker compose exec -T db psql -U postgres -d workshopos -f /migrations/002_rls_security.sql
-- =================================================================

-- =================================================================
-- SECCIÓN 1: CORRECCIÓN DE CONSTRAINTS
-- =================================================================

-- Eliminar constraint global de email (error de diseño original)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Unicidad de email por tenant
-- COALESCE maneja el caso del superadmin (tenant_id = NULL)
DROP INDEX IF EXISTS uq_users_email_tenant_partial;
CREATE UNIQUE INDEX uq_users_email_tenant_partial
    ON users (email, COALESCE(tenant_id, ''));

-- Unicidad de numero de orden por tenant (elimina race condition)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS uq_orders_numero_tenant;
DROP INDEX IF EXISTS uq_orders_numero_tenant;
CREATE UNIQUE INDEX uq_orders_numero_tenant
    ON orders (numero, tenant_id);

-- =================================================================
-- SECCIÓN 2: ÍNDICES DE PERFORMANCE
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_orders_tenant_estado
    ON orders (tenant_id, estado);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_created
    ON orders (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_fabricante
    ON orders (fabricante_id) WHERE fabricante_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_instalador
    ON orders (instalador_id) WHERE instalador_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_vendedor
    ON orders (vendedor_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_clients_tenant
    ON clients (tenant_id);

CREATE INDEX IF NOT EXISTS idx_clients_vendedor
    ON clients (vendedor_id);

CREATE INDEX IF NOT EXISTS idx_users_tenant
    ON users (tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_tenant_rol
    ON users (tenant_id, rol) WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_history_order
    ON order_history (order_id);

CREATE INDEX IF NOT EXISTS idx_insumo_requests_tenant
    ON insumo_requests (tenant_id);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created
    ON notifications (tenant_id, created_at DESC);

-- =================================================================
-- SECCIÓN 3: CONTADOR ATÓMICO DE ÓRDENES
-- =================================================================

-- Inicializar contadores para tenants existentes
INSERT INTO tenant_order_counters (tenant_id, last_numero)
SELECT
    t.id,
    COALESCE((SELECT MAX(o.numero) FROM orders o WHERE o.tenant_id = t.id), 0)
FROM tenants t
ON CONFLICT (tenant_id) DO UPDATE
    SET last_numero = EXCLUDED.last_numero;

-- Función atómica: UPDATE ... RETURNING = sin race condition
-- Garantía: una sola operación en el motor, no hay ventana entre SELECT y UPDATE
CREATE OR REPLACE FUNCTION public.get_next_order_numero(p_tenant_id TEXT)
RETURNS INTEGER
LANGUAGE sql
AS $$
    UPDATE tenant_order_counters
    SET
        last_numero = last_numero + 1,
        updated_at  = NOW()
    WHERE tenant_id = p_tenant_id
    RETURNING last_numero;
$$;

-- Trigger: inicializar contador automáticamente al crear un tenant
CREATE OR REPLACE FUNCTION public.init_tenant_counter()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO tenant_order_counters (tenant_id, last_numero)
    VALUES (NEW.id, 0)
    ON CONFLICT (tenant_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_tenant_counter ON tenants;
CREATE TRIGGER trg_init_tenant_counter
    AFTER INSERT ON tenants
    FOR EACH ROW EXECUTE FUNCTION public.init_tenant_counter();

-- =================================================================
-- SECCIÓN 4: ROL DE BASE DE DATOS PARA LA APLICACIÓN
-- =================================================================

-- Crear role si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'workshopos_app') THEN
        -- Password se cambia luego con: ALTER ROLE workshopos_app PASSWORD '...';
        CREATE ROLE workshopos_app LOGIN PASSWORD 'CAMBIAR_EN_PRODUCCION';
    END IF;
END
$$;

-- Permisos mínimos necesarios
GRANT CONNECT ON DATABASE workshopos TO workshopos_app;
GRANT USAGE ON SCHEMA public TO workshopos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO workshopos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO workshopos_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO workshopos_app;

-- Permisos para tablas futuras (nuevas migraciones)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO workshopos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO workshopos_app;

-- =================================================================
-- SECCIÓN 5: ROW LEVEL SECURITY
-- =================================================================

-- Habilitar RLS en todas las tablas de datos de tenants
-- FORCE: aplica incluso al owner de la tabla (máxima seguridad)
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           FORCE ROW LEVEL SECURITY;

ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          FORCE ROW LEVEL SECURITY;

ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            FORCE ROW LEVEL SECURITY;

ALTER TABLE order_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history    FORCE ROW LEVEL SECURITY;

ALTER TABLE insumo_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumo_requests  FORCE ROW LEVEL SECURITY;

ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    FORCE ROW LEVEL SECURITY;

-- Tablas SIN RLS (acceso directo por superadmin):
-- tenants, tenant_order_counters

-- =================================================================
-- SECCIÓN 6: POLÍTICAS RLS
-- =================================================================

-- Limpiar políticas existentes
DROP POLICY IF EXISTS tenant_isolation ON orders;
DROP POLICY IF EXISTS tenant_isolation ON clients;
DROP POLICY IF EXISTS tenant_isolation ON users;
DROP POLICY IF EXISTS tenant_isolation ON order_history;
DROP POLICY IF EXISTS tenant_isolation ON insumo_requests;
DROP POLICY IF EXISTS tenant_isolation ON notifications;

-- ORDERS: solo el tenant del contexto actual
CREATE POLICY tenant_isolation ON orders
    FOR ALL
    TO workshopos_app
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- CLIENTS: solo el tenant del contexto actual
CREATE POLICY tenant_isolation ON clients
    FOR ALL
    TO workshopos_app
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- USERS: aislamiento por tenant
-- Excepción especial para login: si app.lookup_email está seteado,
-- permite acceder SOLO al usuario con ese email específico.
-- Esto evita necesitar una conexión privilegiada separada para auth.
CREATE POLICY tenant_isolation ON users
    FOR ALL
    TO workshopos_app
    USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR (
            current_setting('app.lookup_email', true) <> ''
            AND email = current_setting('app.lookup_email', true)
        )
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ORDER_HISTORY: aislamiento indirecto a través de la orden padre
-- Más seguro que solo verificar tenant_id (que no existe en order_history)
CREATE POLICY tenant_isolation ON order_history
    FOR ALL
    TO workshopos_app
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_history.order_id
              AND o.tenant_id = current_setting('app.tenant_id', true)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_history.order_id
              AND o.tenant_id = current_setting('app.tenant_id', true)
        )
    );

-- INSUMO_REQUESTS
CREATE POLICY tenant_isolation ON insumo_requests
    FOR ALL
    TO workshopos_app
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- NOTIFICATIONS
CREATE POLICY tenant_isolation ON notifications
    FOR ALL
    TO workshopos_app
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- =================================================================
-- SECCIÓN 7: FUNCIONES AUTH (bypass de RLS controlado)
-- =================================================================

-- Lookup de usuario por email para el flujo de login.
-- SECURITY DEFINER: corre como el owner de la función (superuser),
-- no sujeto a RLS. Acceso mínimo: solo los campos necesarios para auth.
CREATE OR REPLACE FUNCTION public.auth_lookup_user(p_email TEXT)
RETURNS TABLE (
    id              INTEGER,
    email           TEXT,
    hashed_password TEXT,
    nombre          TEXT,
    rol             TEXT,
    tenant_id       TEXT,
    activo          BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id, email, hashed_password, nombre, rol::TEXT, tenant_id, activo
    FROM users
    WHERE email = p_email
    LIMIT 1;
$$;

-- Lookup por ID para el flujo de refresh token.
CREATE OR REPLACE FUNCTION public.auth_lookup_user_by_id(p_user_id INTEGER)
RETURNS TABLE (
    id        INTEGER,
    email     TEXT,
    nombre    TEXT,
    rol       TEXT,
    tenant_id TEXT,
    activo    BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id, email, nombre, rol::TEXT, tenant_id, activo
    FROM users
    WHERE id = p_user_id
    LIMIT 1;
$$;

-- Revocar acceso público a estas funciones sensibles
REVOKE ALL ON FUNCTION public.auth_lookup_user(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_lookup_user_by_id(INTEGER) FROM PUBLIC;

-- Solo workshopos_app puede llamarlas
GRANT EXECUTE ON FUNCTION public.auth_lookup_user(TEXT) TO workshopos_app;
GRANT EXECUTE ON FUNCTION public.auth_lookup_user_by_id(INTEGER) TO workshopos_app;

-- =================================================================
-- SECCIÓN 8: VERIFICACIÓN
-- =================================================================

DO $$
DECLARE
    tbl TEXT;
    has_rls BOOLEAN;
BEGIN
    FOR tbl IN VALUES ('orders'), ('clients'), ('users'), ('order_history'),
                      ('insumo_requests'), ('notifications')
    LOOP
        SELECT relrowsecurity INTO has_rls
        FROM pg_class WHERE relname = tbl;
        IF NOT has_rls THEN
            RAISE EXCEPTION 'RLS no habilitado en tabla: %', tbl;
        END IF;
    END LOOP;
    RAISE NOTICE 'Verificación OK: RLS habilitado en todas las tablas de datos';
END;
$$;

SELECT 'Migración 002 aplicada correctamente' AS resultado;
