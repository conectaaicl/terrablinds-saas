// Rubros de empresa y módulos activables (feature flags).
// Se guardan en tenant.branding.{rubro, modulos} — sin cambios de esquema.

export type Modulo = { id: string; label: string; desc: string; paths: string[] };

// paths = sufijos de ruta del menú que se ocultan si el módulo está apagado.
export const MODULOS: Modulo[] = [
  { id: 'instalacion',  label: 'Instalación / Terreno',    desc: 'Técnicos, fotos, firma, GPS', paths: ['gps', 'tracking'] },
  { id: 'produccion',   label: 'Fabricación / Producción', desc: 'Cola de producción',          paths: [] },
  { id: 'mantenciones', label: 'Mantenciones programadas', desc: 'Servicios recurrentes',       paths: [] },
  { id: 'averias',      label: 'Averías / Fallas',         desc: 'Reporte de fallas',           paths: ['averias'] },
  { id: 'ia',           label: 'Asistente de IA',          desc: 'Chat con datos reales',       paths: ['chat', 'ai-config'] },
  { id: 'rrhh',         label: 'RRHH y Comisiones',        desc: 'Personal, permisos, comisiones', paths: ['rrhh', 'permisos', 'comisiones', 'mis-comisiones', 'reglas-materiales'] },
];

export type Rubro = { id: string; label: string; icon: string; desc: string; soon: boolean; modulos: string[] };

export const RUBROS: Rubro[] = [
  { id: 'talleres',     label: 'Talleres a medida', icon: '🪟', desc: 'Cortinas, muebles', soon: false, modulos: ['instalacion', 'produccion', 'averias', 'ia', 'rrhh'] },
  { id: 'refrigeracion',label: 'Refrigeración',     icon: '❄️', desc: 'Clima, frío',       soon: false, modulos: ['instalacion', 'mantenciones', 'averias', 'ia', 'rrhh'] },
  { id: 'electrica',    label: 'Eléctrica',         icon: '⚡', desc: 'Instalaciones',     soon: false, modulos: ['instalacion', 'mantenciones', 'averias', 'ia', 'rrhh'] },
  { id: 'solares',      label: 'Paneles solares',   icon: '☀️', desc: 'Energía',           soon: true,  modulos: ['instalacion', 'mantenciones', 'ia'] },
  { id: 'entregas',     label: 'Entregas',          icon: '📦', desc: 'Logística',         soon: true,  modulos: ['instalacion', 'ia'] },
  { id: 'custom',       label: 'Personalizado',     icon: '＋', desc: 'Módulos a medida',  soon: false, modulos: ['instalacion', 'produccion', 'averias', 'ia', 'rrhh'] },
];

export function rubroById(id: string | undefined): Rubro | undefined {
  return RUBROS.find(r => r.id === id);
}

// Sufijos de ruta a OCULTAR según los módulos habilitados del tenant.
// Si no hay config (tenant viejo) => no oculta nada (compatibilidad).
export function hiddenPathsForModulos(enabled: string[] | undefined | null): Set<string> {
  const hidden = new Set<string>();
  if (!enabled || !Array.isArray(enabled)) return hidden;
  for (const m of MODULOS) {
    if (!enabled.includes(m.id)) m.paths.forEach(p => hidden.add(p));
  }
  return hidden;
}
