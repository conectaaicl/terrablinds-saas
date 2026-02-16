import type { Usuario, Tenant, Cliente, Cotizacion, Orden, EstadoOrden, ChatMessage, ProductCatalogItem } from '../types';

// ═══════════════════════════════════════════════
// SEED DATA — Multi-tenant white-label
// ═══════════════════════════════════════════════

const SEED_TENANTS: Tenant[] = [
  {
    id: 'tb-001', nombre: 'Terrablinds', slug: 'terrablinds',
    branding: {
      primaryColor: '#d97706', primaryLight: '#fbbf24', primaryDark: '#92400e',
      sidebarBg: '#0f172a', sidebarText: '#94a3b8',
      logoEmoji: '☀️', slogan: 'Cortinas & Toldos a Medida',
    },
    activo: true, fechaCreacion: '2025-01-01', plan: 'pro',
  },
  {
    id: 'mc-001', nombre: 'MaderaCraft', slug: 'maderacraft',
    branding: {
      primaryColor: '#059669', primaryLight: '#34d399', primaryDark: '#065f46',
      sidebarBg: '#1a1a2e', sidebarText: '#a0aec0',
      logoEmoji: '🪵', slogan: 'Muebles a Medida con Diseño',
    },
    activo: true, fechaCreacion: '2025-01-15', plan: 'basico',
  },
  {
    id: 'tp-001', nombre: 'ToldoPro', slug: 'toldopro',
    branding: {
      primaryColor: '#2563eb', primaryLight: '#60a5fa', primaryDark: '#1e40af',
      sidebarBg: '#18181b', sidebarText: '#a1a1aa',
      logoEmoji: '🏗️', slogan: 'Toldos Industriales y Residenciales',
    },
    activo: true, fechaCreacion: '2025-02-01', plan: 'trial',
  },
];

// ── Super Admin (SaaS owner — not tied to any tenant) ──
const SUPER_ADMIN: Usuario = {
  id: 'sa-001', nombre: 'Admin SaaS', email: 'admin@saas.com',
  password: 'admin', rol: 'superadmin', tenantId: '', activo: true,
};

const SEED_USUARIOS: Usuario[] = [
  SUPER_ADMIN,
  // ── Terrablinds ──
  { id: 'u1', nombre: 'Carlos Méndez',  email: 'jefe@terrablinds.cl',    password: '1234', rol: 'jefe',       tenantId: 'tb-001', activo: true },
  { id: 'u2', nombre: 'Andrea Soto',    email: 'andrea@terrablinds.cl',  password: '1234', rol: 'vendedor',   tenantId: 'tb-001', activo: true },
  { id: 'u3', nombre: 'Miguel Torres',  email: 'miguel@terrablinds.cl',  password: '1234', rol: 'vendedor',   tenantId: 'tb-001', activo: true },
  { id: 'u4', nombre: 'Roberto Díaz',   email: 'roberto@terrablinds.cl', password: '1234', rol: 'fabricante', tenantId: 'tb-001', activo: true },
  { id: 'u5', nombre: 'Felipe Muñoz',   email: 'felipe@terrablinds.cl',  password: '1234', rol: 'fabricante', tenantId: 'tb-001', activo: true },
  { id: 'u6', nombre: 'Juan Pérez',     email: 'juan@terrablinds.cl',    password: '1234', rol: 'instalador', tenantId: 'tb-001', activo: true },
  { id: 'u7', nombre: 'Diego Rojas',    email: 'diego@terrablinds.cl',   password: '1234', rol: 'instalador', tenantId: 'tb-001', activo: true },
  { id: 'u8', nombre: 'Carolina Coordinadora', email: 'coordinador@terrablinds.cl', password: '1234', rol: 'coordinador', tenantId: 'tb-001', activo: true },
  // ── MaderaCraft ──
  { id: 'mc-u1', nombre: 'Sofía Vargas', email: 'sofia@maderacraft.cl',   password: '1234', rol: 'jefe',       tenantId: 'mc-001', activo: true },
  { id: 'mc-u2', nombre: 'Luis Ramos',   email: 'luis@maderacraft.cl',    password: '1234', rol: 'vendedor',   tenantId: 'mc-001', activo: true },
  { id: 'mc-u3', nombre: 'Tomás Herrera', email: 'tomas@maderacraft.cl',  password: '1234', rol: 'fabricante', tenantId: 'mc-001', activo: true },
  { id: 'mc-u4', nombre: 'Iván Castro',  email: 'ivan@maderacraft.cl',    password: '1234', rol: 'instalador', tenantId: 'mc-001', activo: true },
  // ── ToldoPro ──
  { id: 'tp-u1', nombre: 'Marta Silva',  email: 'marta@toldopro.cl',     password: '1234', rol: 'jefe',       tenantId: 'tp-001', activo: true },
];

const SEED_CLIENTES: Cliente[] = [
  // Terrablinds
  { id: 'c1', nombre: 'María González',  email: 'maria@gmail.com',  telefono: '+56 9 1234 5678', direccion: 'Av. Providencia 1234, Depto 302, Santiago',  vendedorId: 'u2', tenantId: 'tb-001' },
  { id: 'c2', nombre: 'Pedro Salazar',   email: 'pedro@gmail.com',  telefono: '+56 9 8765 4321', direccion: 'Los Leones 567, Oficina 201, Providencia',   vendedorId: 'u2', tenantId: 'tb-001' },
  { id: 'c3', nombre: 'Ana Martínez',    email: 'ana@gmail.com',    telefono: '+56 9 1122 3344', direccion: 'Irarrázaval 890, Casa 12, Ñuñoa',            vendedorId: 'u3', tenantId: 'tb-001' },
  { id: 'c4', nombre: 'Luis Fernández',  email: 'luis@gmail.com',   telefono: '+56 9 5566 7788', direccion: 'Apoquindo 4500, Piso 8, Las Condes',         vendedorId: 'u3', tenantId: 'tb-001' },
  { id: 'c5', nombre: 'Camila Ruiz',     email: 'camila@gmail.com', telefono: '+56 9 3344 5566', direccion: 'Av. Italia 1100, Depto 501, Providencia',     vendedorId: 'u2', tenantId: 'tb-001' },
  // MaderaCraft
  { id: 'mc-c1', nombre: 'Jorge Bravo',  email: 'jorge@gmail.com',  telefono: '+56 9 2233 4455', direccion: 'Av. Las Condes 9800, Las Condes',            vendedorId: 'mc-u2', tenantId: 'mc-001' },
  { id: 'mc-c2', nombre: 'Paula Díaz',   email: 'paula@gmail.com',  telefono: '+56 9 6677 8899', direccion: 'Av. Vitacura 4200, Vitacura',                vendedorId: 'mc-u2', tenantId: 'mc-001' },
];

const SEED_ORDENES: Orden[] = [
  // ── Terrablinds orders ──
  {
    id: 'ORD-001', numero: 1, cotizacionId: 'cot-001', clienteId: 'c1', vendedorId: 'u2',
    fabricanteId: 'u4', tenantId: 'tb-001', estado: 'en_fabricacion',
    productos: [
      { id: 'p1', tipo: 'Cortina Roller', ancho: 180, alto: 220, tela: 'Sunscreen 5%', color: 'Blanco', precio: 85000 },
      { id: 'p2', tipo: 'Cortina Roller', ancho: 150, alto: 200, tela: 'Sunscreen 5%', color: 'Gris', precio: 72000 },
    ],
    precioTotal: 157000, fechaCreacion: '2025-01-10',
    historial: [
      { estado: 'cotizado',       fecha: '2025-01-10', usuarioId: 'u2', usuarioNombre: 'Andrea Soto' },
      { estado: 'confirmado',     fecha: '2025-01-11', usuarioId: 'u2', usuarioNombre: 'Andrea Soto' },
      { estado: 'en_fabricacion', fecha: '2025-01-12', usuarioId: 'u1', usuarioNombre: 'Carlos Méndez' },
    ],
  },
  {
    id: 'ORD-002', numero: 2, cotizacionId: 'cot-002', clienteId: 'c2', vendedorId: 'u2',
    fabricanteId: 'u4', instaladorId: 'u6', tenantId: 'tb-001', estado: 'en_instalacion',
    productos: [
      { id: 'p3', tipo: 'Toldo Retráctil', ancho: 300, alto: 250, tela: 'Acrílica', color: 'Azul Marino', precio: 320000 },
    ],
    precioTotal: 320000, fechaCreacion: '2025-01-08',
    historial: [
      { estado: 'cotizado',        fecha: '2025-01-08', usuarioId: 'u2', usuarioNombre: 'Andrea Soto' },
      { estado: 'confirmado',      fecha: '2025-01-09', usuarioId: 'u2', usuarioNombre: 'Andrea Soto' },
      { estado: 'en_fabricacion',  fecha: '2025-01-10', usuarioId: 'u1', usuarioNombre: 'Carlos Méndez' },
      { estado: 'listo',           fecha: '2025-01-15', usuarioId: 'u4', usuarioNombre: 'Roberto Díaz' },
      { estado: 'en_instalacion',  fecha: '2025-01-16', usuarioId: 'u1', usuarioNombre: 'Carlos Méndez' },
    ],
  },
  {
    id: 'ORD-003', numero: 3, cotizacionId: 'cot-003', clienteId: 'c3', vendedorId: 'u3',
    tenantId: 'tb-001', estado: 'confirmado',
    productos: [
      { id: 'p4', tipo: 'Persiana Enrollable', ancho: 120, alto: 180, tela: 'Blackout', color: 'Negro', precio: 95000 },
      { id: 'p5', tipo: 'Persiana Enrollable', ancho: 100, alto: 180, tela: 'Blackout', color: 'Negro', precio: 88000 },
      { id: 'p6', tipo: 'Cortina Roller', ancho: 200, alto: 240, tela: 'Sunscreen 3%', color: 'Beige', precio: 110000 },
    ],
    precioTotal: 293000, fechaCreacion: '2025-01-14',
    historial: [
      { estado: 'cotizado',   fecha: '2025-01-14', usuarioId: 'u3', usuarioNombre: 'Miguel Torres' },
      { estado: 'confirmado', fecha: '2025-01-15', usuarioId: 'u3', usuarioNombre: 'Miguel Torres' },
    ],
  },
  {
    id: 'ORD-004', numero: 4, cotizacionId: 'cot-004', clienteId: 'c4', vendedorId: 'u3',
    fabricanteId: 'u5', instaladorId: 'u7', tenantId: 'tb-001', estado: 'instalado',
    productos: [
      { id: 'p7', tipo: 'Cortina Roller', ancho: 160, alto: 210, tela: 'Sunscreen 5%', color: 'Blanco', precio: 78000 },
    ],
    precioTotal: 78000, fechaCreacion: '2025-01-05',
    historial: [
      { estado: 'cotizado',       fecha: '2025-01-05', usuarioId: 'u3', usuarioNombre: 'Miguel Torres' },
      { estado: 'confirmado',     fecha: '2025-01-06', usuarioId: 'u3', usuarioNombre: 'Miguel Torres' },
      { estado: 'en_fabricacion', fecha: '2025-01-07', usuarioId: 'u1', usuarioNombre: 'Carlos Méndez' },
      { estado: 'listo',          fecha: '2025-01-10', usuarioId: 'u5', usuarioNombre: 'Felipe Muñoz' },
      { estado: 'en_instalacion', fecha: '2025-01-11', usuarioId: 'u1', usuarioNombre: 'Carlos Méndez' },
      { estado: 'instalado',      fecha: '2025-01-13', usuarioId: 'u7', usuarioNombre: 'Diego Rojas' },
    ],
  },
  {
    id: 'ORD-005', numero: 5, cotizacionId: 'cot-005', clienteId: 'c5', vendedorId: 'u2',
    tenantId: 'tb-001', estado: 'cotizado',
    productos: [
      { id: 'p8', tipo: 'Toldo Vertical', ancho: 250, alto: 300, tela: 'PVC', color: 'Transparente', precio: 280000 },
    ],
    precioTotal: 280000, fechaCreacion: '2025-01-16',
    historial: [
      { estado: 'cotizado', fecha: '2025-01-16', usuarioId: 'u2', usuarioNombre: 'Andrea Soto' },
    ],
  },
  {
    id: 'ORD-006', numero: 6, cotizacionId: 'cot-006', clienteId: 'c1', vendedorId: 'u2',
    fabricanteId: 'u5', tenantId: 'tb-001', estado: 'listo',
    productos: [
      { id: 'p9', tipo: 'Cortina Zebra', ancho: 140, alto: 200, tela: 'Tela Decorativa', color: 'Crema', precio: 125000 },
      { id: 'p10', tipo: 'Cortina Zebra', ancho: 160, alto: 200, tela: 'Tela Decorativa', color: 'Crema', precio: 135000 },
    ],
    precioTotal: 260000, fechaCreacion: '2025-01-09',
    historial: [
      { estado: 'cotizado',       fecha: '2025-01-09', usuarioId: 'u2', usuarioNombre: 'Andrea Soto' },
      { estado: 'confirmado',     fecha: '2025-01-10', usuarioId: 'u2', usuarioNombre: 'Andrea Soto' },
      { estado: 'en_fabricacion', fecha: '2025-01-11', usuarioId: 'u1', usuarioNombre: 'Carlos Méndez' },
      { estado: 'listo',          fecha: '2025-01-15', usuarioId: 'u5', usuarioNombre: 'Felipe Muñoz' },
    ],
  },
  {
    id: 'ORD-007', numero: 7, cotizacionId: 'cot-007', clienteId: 'c4', vendedorId: 'u3',
    fabricanteId: 'u4', tenantId: 'tb-001', estado: 'problema',
    productos: [
      { id: 'p11', tipo: 'Cortina Blackout', ancho: 180, alto: 220, tela: 'Blackout', color: 'Gris', precio: 98000 },
    ],
    precioTotal: 98000, fechaCreacion: '2025-01-12',
    historial: [
      { estado: 'cotizado',       fecha: '2025-01-12', usuarioId: 'u3', usuarioNombre: 'Miguel Torres' },
      { estado: 'confirmado',     fecha: '2025-01-13', usuarioId: 'u3', usuarioNombre: 'Miguel Torres' },
      { estado: 'en_fabricacion', fecha: '2025-01-14', usuarioId: 'u1', usuarioNombre: 'Carlos Méndez' },
      { estado: 'problema',       fecha: '2025-01-16', usuarioId: 'u4', usuarioNombre: 'Roberto Díaz' },
    ],
  },
  // ── MaderaCraft orders ──
  {
    id: 'MC-001', numero: 1, cotizacionId: 'mc-cot-001', clienteId: 'mc-c1', vendedorId: 'mc-u2',
    fabricanteId: 'mc-u3', tenantId: 'mc-001', estado: 'en_fabricacion',
    productos: [
      { id: 'mc-p1', tipo: 'Mueble a Medida', ancho: 220, alto: 80, tela: 'Lino', color: 'Beige', precio: 450000 },
    ],
    precioTotal: 450000, fechaCreacion: '2025-01-20',
    historial: [
      { estado: 'cotizado',       fecha: '2025-01-20', usuarioId: 'mc-u2', usuarioNombre: 'Luis Ramos' },
      { estado: 'confirmado',     fecha: '2025-01-21', usuarioId: 'mc-u2', usuarioNombre: 'Luis Ramos' },
      { estado: 'en_fabricacion', fecha: '2025-01-22', usuarioId: 'mc-u1', usuarioNombre: 'Sofía Vargas' },
    ],
  },
  {
    id: 'MC-002', numero: 2, cotizacionId: 'mc-cot-002', clienteId: 'mc-c2', vendedorId: 'mc-u2',
    tenantId: 'mc-001', estado: 'confirmado',
    productos: [
      { id: 'mc-p2', tipo: 'Mueble a Medida', ancho: 300, alto: 90, tela: 'Lino', color: 'Crema', precio: 680000 },
    ],
    precioTotal: 680000, fechaCreacion: '2025-01-25',
    historial: [
      { estado: 'cotizado',   fecha: '2025-01-25', usuarioId: 'mc-u2', usuarioNombre: 'Luis Ramos' },
      { estado: 'confirmado', fecha: '2025-01-26', usuarioId: 'mc-u2', usuarioNombre: 'Luis Ramos' },
    ],
  },
];

const SEED_COTIZACIONES: Cotizacion[] = SEED_ORDENES.map(o => ({
  id: o.cotizacionId,
  clienteId: o.clienteId,
  vendedorId: o.vendedorId,
  tenantId: o.tenantId,
  productos: o.productos,
  precioTotal: o.precioTotal,
  fecha: o.fechaCreacion,
  estado: 'confirmada' as const,
}));

// ── LocalStorage helpers ──
function load<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
}
function save<T>(key: string, data: T) { localStorage.setItem(key, JSON.stringify(data)); }

// ═══════════════════════════════════════════════
// STORE — Multi-tenant
// ═══════════════════════════════════════════════
export const Store = {
  // ── Tenants ──
  getTenants: (): Tenant[] => load('wl_tenants', SEED_TENANTS),
  saveTenants: (t: Tenant[]) => save('wl_tenants', t),
  getTenantById: (id: string): Tenant | undefined => Store.getTenants().find(t => t.id === id),
  getTenantBySlug: (slug: string): Tenant | undefined => Store.getTenants().find(t => t.slug === slug),
  addTenant: (data: Omit<Tenant, 'id'>): Tenant => {
    const all = Store.getTenants();
    const t: Tenant = { ...data, id: 'tn-' + Date.now().toString(36) };
    all.push(t);
    Store.saveTenants(all);
    return t;
  },
  updateTenant: (id: string, data: Partial<Tenant>) => {
    const all = Store.getTenants();
    const i = all.findIndex(t => t.id === id);
    if (i >= 0) { all[i] = { ...all[i], ...data }; Store.saveTenants(all); }
  },

  // ── Usuarios ──
  getUsuarios: (): Usuario[] => load('wl_users', SEED_USUARIOS),
  saveUsuarios: (u: Usuario[]) => save('wl_users', u),
  getUsuarioById: (id: string): Usuario | undefined => Store.getUsuarios().find(u => u.id === id),
  getUsuariosByTenant: (tenantId: string): Usuario[] => Store.getUsuarios().filter(u => u.tenantId === tenantId),
  getUsuariosByRol: (rol: string, tenantId: string): Usuario[] =>
    Store.getUsuarios().filter(u => u.rol === rol && u.activo && u.tenantId === tenantId),
  login: (email: string, password: string): Usuario | null =>
    Store.getUsuarios().find(u => u.email === email && u.password === password && u.activo) || null,

  addUsuario: (data: Omit<Usuario, 'id'>): Usuario => {
    const all = Store.getUsuarios();
    const u: Usuario = { ...data, id: 'u' + Date.now().toString(36) };
    all.push(u);
    Store.saveUsuarios(all);
    return u;
  },
  updateUsuario: (id: string, data: Partial<Usuario>) => {
    const all = Store.getUsuarios();
    const i = all.findIndex(u => u.id === id);
    if (i >= 0) { all[i] = { ...all[i], ...data }; Store.saveUsuarios(all); }
  },

  // ── Clientes ──
  getClientes: (tenantId?: string): Cliente[] => {
    const all: Cliente[] = load('wl_clients', SEED_CLIENTES);
    return tenantId ? all.filter(c => c.tenantId === tenantId) : all;
  },
  saveClientes: (c: Cliente[]) => save('wl_clients', c),
  getClienteById: (id: string): Cliente | undefined => Store.getClientes().find(c => c.id === id),
  addCliente: (data: Omit<Cliente, 'id'>): Cliente => {
    const all = Store.getClientes();
    const c: Cliente = { ...data, id: 'c' + Date.now().toString(36) };
    all.push(c);
    Store.saveClientes(all);
    return c;
  },

  // ── Cotizaciones ──
  getCotizaciones: (tenantId?: string): Cotizacion[] => {
    const all: Cotizacion[] = load('wl_cots', SEED_COTIZACIONES);
    return tenantId ? all.filter(c => c.tenantId === tenantId) : all;
  },
  saveCotizaciones: (c: Cotizacion[]) => save('wl_cots', c),
  addCotizacion: (data: Omit<Cotizacion, 'id'>): Cotizacion => {
    const all = Store.getCotizaciones();
    const tenantCots = all.filter(c => c.tenantId === data.tenantId);
    const c: Cotizacion = { ...data, id: 'COT-' + String(tenantCots.length + 1).padStart(3, '0') };
    all.push(c);
    Store.saveCotizaciones(all);
    return c;
  },

  // ── Órdenes ──
  // future: product catalog & direct factory orders will use same Orden structure

  getOrdenes: (tenantId?: string): Orden[] => {
    const all: Orden[] = load('wl_orders', SEED_ORDENES);
    return tenantId ? all.filter(o => o.tenantId === tenantId) : all;
  },
  saveOrdenes: (o: Orden[]) => save('wl_orders', o),
  getOrdenById: (id: string): Orden | undefined => Store.getOrdenes().find(o => o.id === id),

  confirmarCotizacion: (cotId: string, usuario: Usuario): Orden | null => {
    const cots = Store.getCotizaciones();
    const ci = cots.findIndex(c => c.id === cotId);
    if (ci < 0) return null;
    cots[ci].estado = 'confirmada';
    Store.saveCotizaciones(cots);

    const cot = cots[ci];
    const ords = Store.getOrdenes();
    const tenantOrds = ords.filter(o => o.tenantId === cot.tenantId);
    const num = tenantOrds.length + 1;
    const prefix = Store.getTenantById(cot.tenantId)?.slug?.toUpperCase().slice(0, 3) || 'ORD';
    const orden: Orden = {
      id: prefix + '-' + String(num).padStart(3, '0'),
      numero: num,
      cotizacionId: cot.id,
      clienteId: cot.clienteId,
      vendedorId: cot.vendedorId,
      tenantId: cot.tenantId,
      estado: 'confirmado',
      productos: cot.productos,
      precioTotal: cot.precioTotal,
      fechaCreacion: new Date().toISOString().split('T')[0],
      historial: [
        { estado: 'cotizado', fecha: cot.fecha, usuarioId: usuario.id, usuarioNombre: usuario.nombre },
        { estado: 'confirmado', fecha: new Date().toISOString().split('T')[0], usuarioId: usuario.id, usuarioNombre: usuario.nombre },
      ],
    };
    ords.push(orden);
    Store.saveOrdenes(ords);
    return orden;
  },

  cambiarEstado: (ordenId: string, estado: EstadoOrden, usuario: Usuario) => {
    const ords = Store.getOrdenes();
    const i = ords.findIndex(o => o.id === ordenId);
    if (i < 0) return;
    ords[i].estado = estado;
    ords[i].historial.push({
      estado,
      fecha: new Date().toISOString().split('T')[0],
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
    });
    Store.saveOrdenes(ords);
  },

  asignarFabricante: (ordenId: string, fabricanteId: string, usuario: Usuario) => {
    const ords = Store.getOrdenes();
    const i = ords.findIndex(o => o.id === ordenId);
    if (i < 0) return;
    ords[i].fabricanteId = fabricanteId;
    ords[i].estado = 'en_fabricacion';
    ords[i].historial.push({
      estado: 'en_fabricacion',
      fecha: new Date().toISOString().split('T')[0],
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
    });
    Store.saveOrdenes(ords);
  },

  asignarInstalador: (ordenId: string, instaladorId: string, usuario: Usuario) => {
    const ords = Store.getOrdenes();
    const i = ords.findIndex(o => o.id === ordenId);
    if (i < 0) return;
    ords[i].instaladorId = instaladorId;
    ords[i].estado = 'en_instalacion';
    ords[i].historial.push({
      estado: 'en_instalacion',
      fecha: new Date().toISOString().split('T')[0],
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
    });
    Store.saveOrdenes(ords);
  },

  resetData: () => {
    ['wl_tenants', 'wl_users', 'wl_clients', 'wl_cots', 'wl_orders', 'wl_session'].forEach(k => localStorage.removeItem(k));
  },

  uid: (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
};
