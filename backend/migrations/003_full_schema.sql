-- =============================================================================
-- MIGRACIÓN 003: Schema completo para escala de 500 tenants
-- =============================================================================
-- Ejecutar DESPUÉS de 001_initial.sql y 002_rls_security.sql
--
-- Incluye:
--   1. Agregar rol 'gerente' al enum
--   2. Permisos configurables por tenant
--   3. Equipos y vehículos
--   4. Agenda de instalaciones
--   5. Checklists configurables
--   6. Fotos y firma digital
--   7. Incidentes
--   8. Audit log particionado por mes
--   9. Event sourcing (order_events)
--  10. Métricas calculadas
--  11. RLS en todas las tablas nuevas
--  12. Vista analítica de tiempos por etapa
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AGREGAR ROL 'gerente' AL ENUM
-- ─────────────────────────────────────────────────────────────────────────────
-- PostgreSQL no permite ALTER TYPE dentro de transacciones en versiones < 12
-- En PG 12+ sí se puede, pero como medida de seguridad usamos el patrón seguro:
ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'gerente' BEFORE 'coordinador';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PERMISOS CONFIGURABLES POR TENANT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_role_permissions (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   TEXT        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rol         TEXT        NOT NULL,
    resource    TEXT        NOT NULL,
    action      TEXT        NOT NULL,
    permitido   BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_by  INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_role_permission UNIQUE (tenant_id, rol, resource, action)
);

CREATE INDEX IF NOT EXISTS idx_trp_tenant_rol ON tenant_role_permissions(tenant_id, rol);

ALTER TABLE tenant_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_role_permissions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenant_role_permissions
    USING (tenant_id = current_setting('app.tenant_id', true));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. EQUIPOS Y VEHÍCULOS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
    id          SERIAL PRIMARY KEY,
    tenant_id   TEXT        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre      TEXT        NOT NULL,
    tipo        TEXT        NOT NULL DEFAULT 'instalacion'
                            CHECK (tipo IN ('fabricacion', 'instalacion', 'mixto')),
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id);

CREATE TABLE IF NOT EXISTS team_memberships (
    id              SERIAL PRIMARY KEY,
    team_id         INTEGER     NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rol_en_equipo   TEXT        NOT NULL DEFAULT 'miembro'
                                CHECK (rol_en_equipo IN ('lider', 'miembro')),
    activo          BOOLEAN     NOT NULL DEFAULT TRUE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_user UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tm_team ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_tm_user ON team_memberships(user_id);

CREATE TABLE IF NOT EXISTS vehicles (
    id          SERIAL PRIMARY KEY,
    tenant_id   TEXT        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patente     TEXT        NOT NULL,
    descripcion TEXT,
    activo      BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON vehicles(tenant_id);

-- RLS equipos
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams            FORCE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE vehicles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles         FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON teams
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON vehicles
    USING (tenant_id = current_setting('app.tenant_id', true));

-- team_memberships no tiene tenant_id directo — usa JOIN con teams
CREATE POLICY tenant_isolation ON team_memberships
    USING (
        team_id IN (
            SELECT id FROM teams
            WHERE tenant_id = current_setting('app.tenant_id', true)
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AGENDA DE INSTALACIONES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
    id           SERIAL PRIMARY KEY,
    tenant_id    TEXT        NOT NULL,
    order_id     INTEGER     NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    team_id      INTEGER     REFERENCES teams(id) ON DELETE SET NULL,
    vehicle_id   INTEGER     REFERENCES vehicles(id) ON DELETE SET NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin    TIMESTAMPTZ,
    direccion    TEXT,
    notas        TEXT,
    estado       TEXT        NOT NULL DEFAULT 'pendiente'
                             CHECK (estado IN ('pendiente', 'en_ruta', 'completado', 'cancelado')),
    created_by   INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant       ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_order        ON appointments(order_id);
CREATE INDEX IF NOT EXISTS idx_appointments_fecha        ON appointments(tenant_id, fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_appointments_team_fecha   ON appointments(team_id, fecha_inicio)
    WHERE team_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS appointment_members (
    id              SERIAL PRIMARY KEY,
    appointment_id  INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_apt_member UNIQUE (appointment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_apt_members_apt  ON appointment_members(appointment_id);
CREATE INDEX IF NOT EXISTS idx_apt_members_user ON appointment_members(user_id);

CREATE TABLE IF NOT EXISTS appointment_reschedules (
    id              SERIAL PRIMARY KEY,
    appointment_id  INTEGER     NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    fecha_anterior  TIMESTAMPTZ NOT NULL,
    fecha_nueva     TIMESTAMPTZ NOT NULL,
    motivo          TEXT,
    created_by      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reschedules_apt ON appointment_reschedules(appointment_id);

-- RLS agenda
ALTER TABLE appointments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments          FORCE ROW LEVEL SECURITY;
ALTER TABLE appointment_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_members   FORCE ROW LEVEL SECURITY;
ALTER TABLE appointment_reschedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reschedules FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON appointments
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON appointment_members
    USING (
        appointment_id IN (
            SELECT id FROM appointments
            WHERE tenant_id = current_setting('app.tenant_id', true)
        )
    );

CREATE POLICY tenant_isolation ON appointment_reschedules
    USING (
        appointment_id IN (
            SELECT id FROM appointments
            WHERE tenant_id = current_setting('app.tenant_id', true)
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CHECKLISTS CONFIGURABLES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checklist_templates (
    id          SERIAL PRIMARY KEY,
    tenant_id   TEXT    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre      TEXT    NOT NULL,
    tipo        TEXT    NOT NULL DEFAULT 'instalacion'
                        CHECK (tipo IN ('instalacion', 'fabricacion', 'inspeccion', 'otro')),
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ct_tenant ON checklist_templates(tenant_id);

CREATE TABLE IF NOT EXISTS checklist_template_items (
    id          SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
    texto       TEXT    NOT NULL,
    orden       INTEGER NOT NULL DEFAULT 0,
    requerido   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_cti_template ON checklist_template_items(template_id);

CREATE TABLE IF NOT EXISTS order_checklists (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER     NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    template_id     INTEGER     NOT NULL REFERENCES checklist_templates(id) ON DELETE RESTRICT,
    appointment_id  INTEGER     REFERENCES appointments(id) ON DELETE SET NULL,
    completado      BOOLEAN     NOT NULL DEFAULT FALSE,
    completado_por  INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    completado_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oc_order    ON order_checklists(order_id);
CREATE INDEX IF NOT EXISTS idx_oc_template ON order_checklists(template_id);

CREATE TABLE IF NOT EXISTS order_checklist_responses (
    id              SERIAL PRIMARY KEY,
    checklist_id    INTEGER     NOT NULL REFERENCES order_checklists(id) ON DELETE CASCADE,
    item_id         INTEGER     NOT NULL REFERENCES checklist_template_items(id) ON DELETE CASCADE,
    completado      BOOLEAN     NOT NULL DEFAULT FALSE,
    notas           TEXT,
    respondido_por  INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    respondido_at   TIMESTAMPTZ,
    CONSTRAINT uq_checklist_item UNIQUE (checklist_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_ocr_checklist ON order_checklist_responses(checklist_id);

-- RLS checklists
ALTER TABLE checklist_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates        FORCE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_items   FORCE ROW LEVEL SECURITY;
ALTER TABLE order_checklists           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_checklists           FORCE ROW LEVEL SECURITY;
ALTER TABLE order_checklist_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_checklist_responses  FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON checklist_templates
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON checklist_template_items
    USING (
        template_id IN (
            SELECT id FROM checklist_templates
            WHERE tenant_id = current_setting('app.tenant_id', true)
        )
    );

CREATE POLICY tenant_isolation ON order_checklists
    USING (
        order_id IN (
            SELECT id FROM orders
            WHERE tenant_id = current_setting('app.tenant_id', true)
        )
    );

CREATE POLICY tenant_isolation ON order_checklist_responses
    USING (
        checklist_id IN (
            SELECT oc.id FROM order_checklists oc
            JOIN orders o ON o.id = oc.order_id
            WHERE o.tenant_id = current_setting('app.tenant_id', true)
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FOTOS Y FIRMA DIGITAL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_photos (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER     NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tenant_id       TEXT        NOT NULL,
    appointment_id  INTEGER     REFERENCES appointments(id) ON DELETE SET NULL,
    tipo            TEXT        NOT NULL DEFAULT 'otro'
                                CHECK (tipo IN ('antes', 'durante', 'despues', 'problema', 'otro')),
    url             TEXT        NOT NULL,
    subido_por      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subido_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_order  ON order_photos(order_id);
CREATE INDEX IF NOT EXISTS idx_photos_tenant ON order_photos(tenant_id);

CREATE TABLE IF NOT EXISTS digital_signatures (
    id               SERIAL PRIMARY KEY,
    order_id         INTEGER     NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    tenant_id        TEXT        NOT NULL,
    firma_data       TEXT        NOT NULL,   -- Base64 SVG/PNG
    firmante_nombre  TEXT        NOT NULL,
    firmante_rut     TEXT,
    firmante_email   TEXT,
    ip_address       TEXT,
    user_agent       TEXT,
    lat              DOUBLE PRECISION,
    lon              DOUBLE PRECISION,
    firmado_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registrado_por   INTEGER     REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sig_tenant ON digital_signatures(tenant_id);

-- RLS fotos y firmas
ALTER TABLE order_photos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_photos        FORCE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures  ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures  FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON order_photos
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation ON digital_signatures
    USING (tenant_id = current_setting('app.tenant_id', true));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. INCIDENTES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER     NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tenant_id       TEXT        NOT NULL,
    appointment_id  INTEGER     REFERENCES appointments(id) ON DELETE SET NULL,
    tipo            TEXT        NOT NULL DEFAULT 'otro'
                                CHECK (tipo IN (
                                    'material_faltante', 'medidas_incorrectas',
                                    'acceso_bloqueado', 'cliente_ausente',
                                    'danio_propiedad', 'herramienta_faltante', 'otro'
                                )),
    descripcion     TEXT        NOT NULL,
    resuelto        BOOLEAN     NOT NULL DEFAULT FALSE,
    resuelto_at     TIMESTAMPTZ,
    resuelto_por    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    reportado_por   INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_order  ON incidents(order_id);
CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON incidents(tenant_id);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON incidents
    USING (tenant_id = current_setting('app.tenant_id', true));

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. AUDIT LOG PARTICIONADO POR MES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id            BIGSERIAL,
    tenant_id     TEXT        NOT NULL,
    user_id       INTEGER,
    user_nombre   TEXT,
    user_rol      TEXT,
    action        TEXT        NOT NULL,
    resource_type TEXT        NOT NULL,
    resource_id   TEXT,
    old_value     JSONB,
    new_value     JSONB,
    ip_address    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partición inicial: mes actual y siguiente (se agregan via cron/Celery)
CREATE TABLE IF NOT EXISTS audit_log_2026_03
    PARTITION OF audit_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE IF NOT EXISTS audit_log_2026_04
    PARTITION OF audit_log
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE IF NOT EXISTS audit_log_2026_05
    PARTITION OF audit_log
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE IF NOT EXISTS audit_log_2026_06
    PARTITION OF audit_log
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS audit_log_2026_07
    PARTITION OF audit_log
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS audit_log_2026_08
    PARTITION OF audit_log
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE IF NOT EXISTS audit_log_2026_09
    PARTITION OF audit_log
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE IF NOT EXISTS audit_log_2026_10
    PARTITION OF audit_log
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE IF NOT EXISTS audit_log_2026_11
    PARTITION OF audit_log
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE IF NOT EXISTS audit_log_2026_12
    PARTITION OF audit_log
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS audit_log_2027_01
    PARTITION OF audit_log
    FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

CREATE TABLE IF NOT EXISTS audit_log_2027_02
    PARTITION OF audit_log
    FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');

-- Índices en la tabla padre se propagan automáticamente a particiones
CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource    ON audit_log(resource_type, resource_id);

-- RLS audit_log — solo el mismo tenant puede leer su audit
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON audit_log
    USING (tenant_id = current_setting('app.tenant_id', true));

-- Función para crear particiones automáticamente (llamar desde Celery beat mensual)
CREATE OR REPLACE FUNCTION create_audit_log_partition(target_month DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    partition_name TEXT;
    start_date     DATE;
    end_date       DATE;
BEGIN
    start_date     := DATE_TRUNC('month', target_month)::DATE;
    end_date       := (DATE_TRUNC('month', target_month) + INTERVAL '1 month')::DATE;
    partition_name := 'audit_log_' || TO_CHAR(target_month, 'YYYY_MM');

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name AND n.nspname = 'public'
    ) THEN
        EXECUTE FORMAT(
            'CREATE TABLE %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. EVENT SOURCING (order_events)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_events (
    id               BIGSERIAL PRIMARY KEY,
    tenant_id        TEXT        NOT NULL,
    order_id         INTEGER     NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type       TEXT        NOT NULL,
    from_estado      TEXT,
    to_estado        TEXT,
    user_id          INTEGER     NOT NULL,
    user_nombre      TEXT        NOT NULL DEFAULT '',
    duration_minutes INTEGER,    -- tiempo en from_estado antes de este cambio
    metadata         JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oe_tenant_order ON order_events(tenant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_oe_tenant_time  ON order_events(tenant_id, created_at DESC);

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON order_events
    USING (tenant_id = current_setting('app.tenant_id', true));

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. MÉTRICAS CALCULADAS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_metrics (
    order_id                    INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    tenant_id                   TEXT    NOT NULL,
    tiempo_confirmacion_horas   FLOAT,  -- cotizado → confirmado
    tiempo_fabricacion_horas    FLOAT,  -- confirmado → fabricado
    tiempo_agendado_horas       FLOAT,  -- fabricado → agendado
    tiempo_instalacion_horas    FLOAT,  -- agendado → cerrado
    tiempo_total_horas          FLOAT,  -- cotizado → cerrado
    num_reagendamientos         INTEGER NOT NULL DEFAULT 0,
    num_incidentes              INTEGER NOT NULL DEFAULT 0,
    num_problemas               INTEGER NOT NULL DEFAULT 0,
    cerrado_at                  TIMESTAMPTZ,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_om_tenant ON order_metrics(tenant_id);

ALTER TABLE order_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_metrics FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON order_metrics
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS user_productivity_monthly (
    id                    BIGSERIAL PRIMARY KEY,
    tenant_id             TEXT    NOT NULL,
    user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    anio                  INTEGER NOT NULL,
    mes                   INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    ordenes_fabricadas    INTEGER NOT NULL DEFAULT 0,
    ordenes_instaladas    INTEGER NOT NULL DEFAULT 0,
    ordenes_vendidas      INTEGER NOT NULL DEFAULT 0,
    incidentes_reportados INTEGER NOT NULL DEFAULT 0,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_productivity_user_month UNIQUE (user_id, anio, mes)
);

CREATE INDEX IF NOT EXISTS idx_upm_tenant_period ON user_productivity_monthly(tenant_id, anio, mes);

ALTER TABLE user_productivity_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_productivity_monthly FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON user_productivity_monthly
    USING (tenant_id = current_setting('app.tenant_id', true));

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. PERMISOS DE workshopos_app EN TABLAS NUEVAS
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'workshopos_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON
            tenant_role_permissions,
            teams, team_memberships, vehicles,
            appointments, appointment_members, appointment_reschedules,
            checklist_templates, checklist_template_items,
            order_checklists, order_checklist_responses,
            order_photos, digital_signatures,
            incidents,
            audit_log,
            order_events, order_metrics, user_productivity_monthly
        TO workshopos_app;

        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO workshopos_app;
    END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. VISTA ANALÍTICA DE TIEMPOS POR ETAPA
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_tenant_stage_metrics AS
SELECT
    om.tenant_id,
    DATE_TRUNC('month', o.created_at)       AS mes,
    COUNT(*)                                AS total_ordenes,
    COUNT(om.cerrado_at)                    AS ordenes_cerradas,
    ROUND(AVG(om.tiempo_confirmacion_horas)::NUMERIC, 1) AS avg_h_confirmacion,
    ROUND(AVG(om.tiempo_fabricacion_horas)::NUMERIC, 1)  AS avg_h_fabricacion,
    ROUND(AVG(om.tiempo_agendado_horas)::NUMERIC, 1)     AS avg_h_agendado,
    ROUND(AVG(om.tiempo_instalacion_horas)::NUMERIC, 1)  AS avg_h_instalacion,
    ROUND(AVG(om.tiempo_total_horas)::NUMERIC, 1)        AS avg_h_total,
    SUM(om.num_reagendamientos)             AS total_reagendamientos,
    SUM(om.num_incidentes)                  AS total_incidentes,
    ROUND(
        100.0 * COUNT(om.cerrado_at) / NULLIF(COUNT(*), 0),
        1
    )                                       AS tasa_cierre_pct
FROM order_metrics om
JOIN orders o ON o.id = om.order_id
GROUP BY om.tenant_id, DATE_TRUNC('month', o.created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'tenant_role_permissions',
        'teams', 'team_memberships', 'vehicles',
        'appointments', 'appointment_members', 'appointment_reschedules',
        'checklist_templates', 'checklist_template_items',
        'order_checklists', 'order_checklist_responses',
        'order_photos', 'digital_signatures',
        'incidents',
        'audit_log',
        'order_events', 'order_metrics', 'user_productivity_monthly'
    ];
    tbl TEXT;
    rls_ok BOOLEAN;
BEGIN
    FOREACH tbl IN ARRAY expected_tables LOOP
        SELECT relrowsecurity INTO rls_ok
        FROM pg_class WHERE relname = tbl;
        IF NOT FOUND OR NOT rls_ok THEN
            RAISE EXCEPTION 'RLS not enabled on table: %', tbl;
        END IF;
    END LOOP;
    RAISE NOTICE 'Migration 003 verification passed — all % tables have RLS enabled',
        array_length(expected_tables, 1);
END;
$$;

COMMIT;
