-- =================================================================
-- WorkshopOS — Migración 006: Checklist simple por orden
-- Almacena el estado del checklist como JSONB sin requerir templates
-- =================================================================

CREATE TABLE IF NOT EXISTS order_checklist_simple (
    order_id   INTEGER     NOT NULL,
    tenant_id  TEXT        NOT NULL,
    items      JSONB       NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (order_id, tenant_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ocs_tenant ON order_checklist_simple (tenant_id);

-- RLS
ALTER TABLE order_checklist_simple ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_ocs ON order_checklist_simple;
CREATE POLICY tenant_isolation_ocs ON order_checklist_simple
    USING (tenant_id = current_setting('app.tenant_id', TRUE));
