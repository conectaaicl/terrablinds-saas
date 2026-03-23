// ── Roles del sistema ──
export type Rol = 'superadmin' | 'jefe' | 'gerente' | 'coordinador' | 'vendedor' | 'fabricante' | 'instalador' | 'bodegas';

// ── Chat y Catálogo de Productos ──
export type ChatMessage = {
  id: string;
  tenantId: string;
  fromUserId: string;
  toUserId?: string; // si es directo
  channel?: 'global' | 'operaciones' | 'ventas';
  text: string;
  createdAt: string;
};

export type ProductCatalogItem = {
  id: string;
  tenantId: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  unidad: 'm2' | 'ml' | 'unidad';
  precioBase: number;
  colores: string[];
  materiales?: string[];
  activo: boolean;
};

// ── Estados de Orden de Trabajo (flujo completo) ──
export type EstadoOrden =
  // Etapa 1 — Ventas
  | 'cotizacion'
  | 'cotizacion_enviada'
  | 'aceptada'
  // Etapa 2 — OT Interna
  | 'ot_creada'
  | 'aprobada'
  // Etapa 3 — Fabricación
  | 'en_fabricacion'
  | 'listo_para_instalar'
  // Etapa 4 — Instalación
  | 'instalacion_programada'
  | 'en_camino'
  | 'instalando'
  | 'instalacion_completada'
  // Terminales
  | 'cerrada'
  | 'cancelada'
  | 'rechazada'
  | 'problema'
  // Compatibilidad retroactiva
  | 'cotizado' | 'confirmado' | 'fabricado' | 'agendado'
  | 'en_ruta' | 'en_instalacion' | 'pendiente_firma'
  | 'cerrado' | 'cancelado' | 'rechazado';

export const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string; etapa?: string }> = {
  // ── Etapa 1: Ventas ──────────────────────────────────────
  cotizacion:             { label: 'Cotización',            color: 'text-slate-700',   bg: 'bg-slate-100',    border: 'border-slate-300',   dot: 'bg-slate-400',    etapa: 'Ventas' },
  cotizacion_enviada:     { label: 'Cotización Enviada',    color: 'text-sky-700',     bg: 'bg-sky-50',       border: 'border-sky-300',     dot: 'bg-sky-500',      etapa: 'Ventas' },
  aceptada:               { label: 'Aceptada',              color: 'text-blue-700',    bg: 'bg-blue-50',      border: 'border-blue-300',    dot: 'bg-blue-500',     etapa: 'Ventas' },
  // ── Etapa 2: OT Interna ──────────────────────────────────
  ot_creada:              { label: 'OT Creada',             color: 'text-cyan-700',    bg: 'bg-cyan-50',      border: 'border-cyan-300',    dot: 'bg-cyan-500',     etapa: 'Revisión' },
  aprobada:               { label: 'OT Aprobada',           color: 'text-teal-700',    bg: 'bg-teal-50',      border: 'border-teal-300',    dot: 'bg-teal-500',     etapa: 'Revisión' },
  // ── Etapa 3: Fabricación ──────────────────────────────────
  en_fabricacion:         { label: 'En Fabricación',        color: 'text-amber-700',   bg: 'bg-amber-50',     border: 'border-amber-300',   dot: 'bg-amber-500',    etapa: 'Fabricación' },
  listo_para_instalar:    { label: 'Listo para Instalar',   color: 'text-lime-700',    bg: 'bg-lime-50',      border: 'border-lime-300',    dot: 'bg-lime-500',     etapa: 'Fabricación' },
  // ── Etapa 4: Instalación ──────────────────────────────────
  instalacion_programada: { label: 'Instalación Programada',color: 'text-indigo-700',  bg: 'bg-indigo-50',    border: 'border-indigo-300',  dot: 'bg-indigo-500',   etapa: 'Instalación' },
  en_camino:              { label: 'En Camino',             color: 'text-violet-700',  bg: 'bg-violet-50',    border: 'border-violet-300',  dot: 'bg-violet-500',   etapa: 'Instalación' },
  instalando:             { label: 'Instalando',            color: 'text-purple-700',  bg: 'bg-purple-50',    border: 'border-purple-300',  dot: 'bg-purple-500',   etapa: 'Instalación' },
  instalacion_completada: { label: 'Instalación Completada',color: 'text-orange-700',  bg: 'bg-orange-50',    border: 'border-orange-300',  dot: 'bg-orange-500',   etapa: 'Instalación' },
  // ── Terminal positivo ──────────────────────────────────────
  cerrada:                { label: 'Cerrada',               color: 'text-green-700',   bg: 'bg-green-50',     border: 'border-green-300',   dot: 'bg-green-500',    etapa: 'Completada' },
  // ── Terminales negativos ──────────────────────────────────
  cancelada:              { label: 'Cancelada',             color: 'text-gray-600',    bg: 'bg-gray-100',     border: 'border-gray-300',    dot: 'bg-gray-400' },
  rechazada:              { label: 'Rechazada',             color: 'text-rose-700',    bg: 'bg-rose-50',      border: 'border-rose-300',    dot: 'bg-rose-400' },
  // ── Estado especial ──────────────────────────────────────
  problema:               { label: 'Problema',              color: 'text-red-700',     bg: 'bg-red-50',       border: 'border-red-300',     dot: 'bg-red-500' },
  // ── Retrocompatibilidad ──────────────────────────────────
  cotizado:               { label: 'Cotización',            color: 'text-slate-700',   bg: 'bg-slate-100',    border: 'border-slate-300',   dot: 'bg-slate-400' },
  confirmado:             { label: 'Confirmado',            color: 'text-blue-700',    bg: 'bg-blue-50',      border: 'border-blue-300',    dot: 'bg-blue-500' },
  fabricado:              { label: 'Fabricado',             color: 'text-lime-700',    bg: 'bg-lime-50',      border: 'border-lime-300',    dot: 'bg-lime-500' },
  agendado:               { label: 'Agendado',              color: 'text-teal-700',    bg: 'bg-teal-50',      border: 'border-teal-300',    dot: 'bg-teal-500' },
  en_ruta:                { label: 'En Ruta',               color: 'text-indigo-700',  bg: 'bg-indigo-50',    border: 'border-indigo-300',  dot: 'bg-indigo-500' },
  en_instalacion:         { label: 'En Instalación',        color: 'text-violet-700',  bg: 'bg-violet-50',    border: 'border-violet-300',  dot: 'bg-violet-500' },
  pendiente_firma:        { label: 'Pendiente Firma',       color: 'text-orange-700',  bg: 'bg-orange-50',    border: 'border-orange-300',  dot: 'bg-orange-500' },
  cerrado:                { label: 'Cerrado',               color: 'text-green-700',   bg: 'bg-green-50',     border: 'border-green-300',   dot: 'bg-green-500' },
  cancelado:              { label: 'Cancelado',             color: 'text-gray-600',    bg: 'bg-gray-100',     border: 'border-gray-300',    dot: 'bg-gray-400' },
  rechazado:              { label: 'Rechazado',             color: 'text-rose-700',    bg: 'bg-rose-50',      border: 'border-rose-300',    dot: 'bg-rose-400' },
};

// Pipeline visual del flujo principal (para mostrar en dashboard)
export const PIPELINE_ESTADOS: EstadoOrden[] = [
  'cotizacion', 'cotizacion_enviada', 'aceptada',
  'ot_creada', 'aprobada',
  'en_fabricacion', 'listo_para_instalar',
  'instalacion_programada', 'en_camino', 'instalando',
  'instalacion_completada', 'cerrada',
];

export const ROL_CONFIG: Record<Rol, { label: string; color: string; bg: string }> = {
  superadmin: { label: 'Super Admin',      color: 'text-rose-700',    bg: 'bg-rose-500' },
  jefe:       { label: 'Jefe / Dueño',     color: 'text-amber-700',   bg: 'bg-amber-500' },
  gerente:    { label: 'Gerente',           color: 'text-orange-700',  bg: 'bg-orange-500' },
  coordinador:{ label: 'Coordinador',      color: 'text-cyan-700',    bg: 'bg-cyan-500' },
  vendedor:   { label: 'Vendedor',          color: 'text-blue-700',    bg: 'bg-blue-500' },
  fabricante: { label: 'Fabricante',        color: 'text-emerald-700', bg: 'bg-emerald-500' },
  instalador: { label: 'Instalador',        color: 'text-violet-700',  bg: 'bg-violet-500' },
  bodegas:    { label: 'Encargado Bodegas', color: 'text-teal-700',    bg: 'bg-teal-500' },
};

// ── Tenant (marca blanca) ──
export interface TenantBranding {
  primaryColor: string;    // hex
  primaryLight: string;    // hex lighter version
  primaryDark: string;     // hex darker
  sidebarBg: string;       // hex sidebar background
  sidebarText: string;     // hex sidebar text
  logoEmoji: string;       // emoji or icon identifier
  slogan: string;
  logo_url?: string;       // URL de imagen del logo (opcional)
}

export interface Tenant {
  id: string;
  nombre: string;
  slug: string;           // URL-friendly identifier
  branding: TenantBranding;
  activo: boolean;
  fechaCreacion: string;
  plan: 'trial' | 'basico' | 'pro';
}

// ── Entidades ──
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  tenantId: string;
  activo: boolean;
}

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  vendedorId: string;
  tenantId: string;
}

export interface ProductoLinea {
  id: string;
  tipo: string;
  ancho: number;
  alto: number;
  tela: string;
  color: string;
  precio: number;
  notas?: string;
  ubicacion?: string;
  accionamiento?: string;
}

export interface Cotizacion {
  id: string;
  clienteId: string;
  vendedorId: string;
  tenantId: string;
  productos: ProductoLinea[];
  precioTotal: number;
  fecha: string;
  estado: 'pendiente' | 'confirmada' | 'rechazada';
}

export interface HistorialEstado {
  estado: EstadoOrden;
  fecha: string;
  usuarioId: string;
  usuarioNombre: string;
}

export interface Orden {
  id: string;
  numero: number;
  cotizacionId: string;
  clienteId: string;
  vendedorId: string;
  fabricanteId?: string;
  instaladorId?: string;
  tenantId: string;
  estado: EstadoOrden;
  productos: ProductoLinea[];
  precioTotal: number;
  fechaCreacion: string;
  fechaInstalacion?: string; // Nueva: Agenda
  historial: HistorialEstado[];
}

// ── Producto del Catálogo ──
export interface Producto {
  id: string;
  tenant_id: string;
  codigo?: string;
  codigo_proveedor?: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  marca?: string;
  proveedor?: string;
  unidad: 'm2' | 'ml' | 'unidad';
  precio_base: number;
  precio_m2?: number;
  precio_ml?: number;
  ancho_min?: number;
  ancho_max?: number;
  alto_min?: number;
  alto_max?: number;
  colores: string[];
  materiales: string[];
  specs: Record<string, any>;
  activo: boolean;
  created_at: string;
}

// ── GPS Tracking ──
export interface GpsLastPosition {
  user_id: number;
  user_nombre: string;
  user_rol: string;
  order_id?: number;
  appointment_id?: string;
  lat: number;
  lon: number;
  precision_m?: number;
  velocidad_kmh?: number;
  last_seen: string;
  maps_url: string;
}

// ── Tareas Diarias ──
export interface TaskItem {
  descripcion: string;
  ubicacion?: string;
}

export interface DailyTask {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion?: string;
  asignado_a: number;
  asignado_a_nombre?: string;
  asignado_por: number;
  asignado_por_nombre?: string;
  order_id?: number;
  fecha_tarea: string;
  prioridad: 'baja' | 'normal' | 'alta' | 'urgente';
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
  notas_cierre?: string;
  completado_at?: string;
  created_at: string;
  // Campos de agenda
  hora?: string;
  tipo_tarea?: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
  direccion?: string;
  ot_numero?: string;
  vendedor_nombre?: string;
  items?: TaskItem[];
  observaciones?: string[];
}

export const PRIORIDAD_CONFIG = {
  baja:    { label: 'Baja',    bg: 'bg-slate-100',  color: 'text-slate-600', dot: 'bg-slate-400' },
  normal:  { label: 'Normal',  bg: 'bg-blue-50',    color: 'text-blue-700',  dot: 'bg-blue-500' },
  alta:    { label: 'Alta',    bg: 'bg-amber-50',   color: 'text-amber-700', dot: 'bg-amber-500' },
  urgente: { label: 'Urgente', bg: 'bg-red-50',     color: 'text-red-700',   dot: 'bg-red-500' },
} as const;

export const TASK_ESTADO_CONFIG = {
  pendiente:    { label: 'Pendiente',    bg: 'bg-slate-100',   color: 'text-slate-600' },
  en_progreso:  { label: 'En Progreso',  bg: 'bg-blue-50',     color: 'text-blue-700' },
  completada:   { label: 'Completada',   bg: 'bg-emerald-50',  color: 'text-emerald-700' },
  cancelada:    { label: 'Cancelada',    bg: 'bg-gray-100',    color: 'text-gray-500' },
} as const;

// ── Nuevas Entidades para Backend Real ──
export interface InsumoRequest {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  items: string[];
  urgencia: 'baja' | 'media' | 'alta';
  estado: 'pendiente' | 'comprado' | 'rechazado';
  fecha: string;
}

export interface Notification {
  id: string;
  mensaje: string;
  tipo: 'info' | 'alerta' | 'exito';
  fecha: string;
  leida: boolean;
}

// ── Catálogos ──
export const TIPOS_PRODUCTO = [
  'Cortina Roller',
  'Cortina Zebra',
  'Persiana Enrollable',
  'Toldo Retráctil',
  'Toldo Vertical',
  'Cortina Blackout',
  'Mueble a Medida',
];

export const TELAS = [
  'Sunscreen 3%',
  'Sunscreen 5%',
  'Sunscreen 10%',
  'Blackout',
  'Acrílica',
  'PVC',
  'Tela Decorativa',
  'Lino',
];

export const COLORES = [
  'Blanco',
  'Gris Claro',
  'Gris',
  'Negro',
  'Beige',
  'Crema',
  'Azul Marino',
  'Verde',
  'Terracota',
  'Transparente',
];
