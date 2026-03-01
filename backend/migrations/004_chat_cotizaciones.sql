-- =============================================================
-- Migración 004: Chat en tiempo real + Cotizaciones
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- CHAT CHANNELS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_channels (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('general','operaciones','ventas','direct')),
    name       TEXT NOT NULL,
    meta       JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, type, name)
);

ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON chat_channels
    USING (tenant_id = current_setting('app.tenant_id', true));

-- ─────────────────────────────────────────────────────────────
-- CHAT MESSAGES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id  UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    tenant_id   TEXT NOT NULL,
    user_id     INT  NOT NULL,
    user_nombre TEXT NOT NULL,
    user_rol    TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON chat_messages
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE INDEX IF NOT EXISTS chat_messages_channel_idx
    ON chat_messages (channel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_messages_tenant_idx
    ON chat_messages (tenant_id);

-- ─────────────────────────────────────────────────────────────
-- COTIZACIONES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cotizaciones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   TEXT NOT NULL,
    numero      INT  NOT NULL,
    cliente_id  INT  NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    vendedor_id INT  NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
    estado      TEXT NOT NULL DEFAULT 'borrador'
                     CHECK (estado IN ('borrador','enviada','aceptada','rechazada','convertida')),
    productos   JSONB NOT NULL DEFAULT '[]',
    precio_total INT  NOT NULL DEFAULT 0,
    notas       TEXT,
    valid_until DATE,
    orden_id    INT REFERENCES orders(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, numero)
);

ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON cotizaciones
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE INDEX IF NOT EXISTS cotizaciones_vendedor_idx
    ON cotizaciones (tenant_id, vendedor_id);

CREATE INDEX IF NOT EXISTS cotizaciones_estado_idx
    ON cotizaciones (tenant_id, estado);

-- Función para obtener el próximo número de cotización por tenant
CREATE OR REPLACE FUNCTION get_next_cotizacion_numero(p_tenant_id TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next INT;
BEGIN
    SELECT COALESCE(MAX(numero), 0) + 1
    INTO v_next
    FROM cotizaciones
    WHERE tenant_id = p_tenant_id;

    RETURN v_next;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- GRANTS al usuario de aplicación
-- ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON chat_channels  TO workshopos_app;
GRANT SELECT, INSERT, UPDATE ON chat_messages  TO workshopos_app;
GRANT SELECT, INSERT, UPDATE ON cotizaciones   TO workshopos_app;
GRANT EXECUTE ON FUNCTION get_next_cotizacion_numero(TEXT) TO workshopos_app;
