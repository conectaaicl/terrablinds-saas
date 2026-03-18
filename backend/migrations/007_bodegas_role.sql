-- =================================================================
-- Migración 007: Rol Bodegas
-- Agrega el valor 'bodegas' al enum RoleEnum
-- =================================================================

ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'bodegas' AFTER 'instalador';

SELECT 'Migración 007 aplicada correctamente: rol bodegas agregado' AS resultado;
