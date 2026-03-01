// ── Roles del sistema ──
export type Rol = 'superadmin' | 'jefe' | 'gerente' | 'coordinador' | 'vendedor' | 'fabricante' | 'instalador';

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

// ── Estados de orden (13 estados) ──
export type EstadoOrden =
  | 'cotizado'
  | 'cotizacion_enviada'
  | 'confirmado'
  | 'en_fabricacion'
  | 'fabricado'
  | 'agendado'
  | 'en_ruta'
  | 'en_instalacion'
  | 'pendiente_firma'
  | 'cerrado'
  | 'problema'
  | 'cancelado'
  | 'rechazado';

export const ESTADO_CONFIG: Record<EstadoOrden, { label: string; color: string; bg: string; border: string; dot: string }> = {
  cotizado:          { label: 'Cotizado',           color: 'text-slate-700',   bg: 'bg-slate-100',    border: 'border-slate-300',   dot: 'bg-slate-400' },
  cotizacion_enviada:{ label: 'Cotización Enviada', color: 'text-sky-700',     bg: 'bg-sky-50',       border: 'border-sky-300',     dot: 'bg-sky-500' },
  confirmado:        { label: 'Confirmado',         color: 'text-blue-700',    bg: 'bg-blue-50',      border: 'border-blue-300',    dot: 'bg-blue-500' },
  en_fabricacion:    { label: 'En Fabricación',     color: 'text-amber-700',   bg: 'bg-amber-50',     border: 'border-amber-300',   dot: 'bg-amber-500' },
  fabricado:         { label: 'Fabricado',          color: 'text-lime-700',    bg: 'bg-lime-50',      border: 'border-lime-300',    dot: 'bg-lime-500' },
  agendado:          { label: 'Agendado',           color: 'text-teal-700',    bg: 'bg-teal-50',      border: 'border-teal-300',    dot: 'bg-teal-500' },
  en_ruta:           { label: 'En Ruta',            color: 'text-indigo-700',  bg: 'bg-indigo-50',    border: 'border-indigo-300',  dot: 'bg-indigo-500' },
  en_instalacion:    { label: 'En Instalación',     color: 'text-violet-700',  bg: 'bg-violet-50',    border: 'border-violet-300',  dot: 'bg-violet-500' },
  pendiente_firma:   { label: 'Pendiente Firma',    color: 'text-orange-700',  bg: 'bg-orange-50',    border: 'border-orange-300',  dot: 'bg-orange-500' },
  cerrado:           { label: 'Cerrado',            color: 'text-green-700',   bg: 'bg-green-50',     border: 'border-green-300',   dot: 'bg-green-500' },
  problema:          { label: 'Problema',           color: 'text-red-700',     bg: 'bg-red-50',       border: 'border-red-300',     dot: 'bg-red-500' },
  cancelado:         { label: 'Cancelado',          color: 'text-gray-600',    bg: 'bg-gray-100',     border: 'border-gray-300',    dot: 'bg-gray-400' },
  rechazado:         { label: 'Rechazado',          color: 'text-rose-700',    bg: 'bg-rose-50',      border: 'border-rose-300',    dot: 'bg-rose-400' },
};

export const ROL_CONFIG: Record<Rol, { label: string; color: string; bg: string }> = {
  superadmin: { label: 'Super Admin',   color: 'text-rose-700',    bg: 'bg-rose-500' },
  jefe:       { label: 'Jefe / Dueño',  color: 'text-amber-700',   bg: 'bg-amber-500' },
  gerente:    { label: 'Gerente',        color: 'text-orange-700',  bg: 'bg-orange-500' },
  coordinador:{ label: 'Coordinador',   color: 'text-cyan-700',    bg: 'bg-cyan-500' },
  vendedor:   { label: 'Vendedor',       color: 'text-blue-700',    bg: 'bg-blue-500' },
  fabricante: { label: 'Fabricante',     color: 'text-emerald-700', bg: 'bg-emerald-500' },
  instalador: { label: 'Instalador',     color: 'text-violet-700',  bg: 'bg-violet-500' },
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
