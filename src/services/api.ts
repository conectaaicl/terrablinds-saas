// ?? en lugar de || para manejar correctamente VITE_API_URL = '' (URL relativa)
// || trataría '' como falsy y caería al default de localhost
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ── Refresco single-flight ──
// Todas las requests que reciben 401 a la vez comparten UN solo refresh,
// evitando la rotación concurrente que revoca la sesión (reuse detection).
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    accessToken = data.access_token;
    localStorage.setItem('refresh_token', data.refresh_token);
    return data.access_token as string;
  } catch {
    return null;
  }
}

function refreshOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}, skipContentType?: boolean): Promise<any> {
  const headers: Record<string, string> = {
    ...(skipContentType ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Auto-refresh en 401 — single-flight (un solo refresh compartido)
  if (response.status === 401 && accessToken) {
    const newToken = await refreshOnce();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      const retryHeaders = skipContentType
        ? { Authorization: headers['Authorization'] }
        : headers;
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: retryHeaders,
      });
    } else {
      accessToken = null;
      localStorage.removeItem('refresh_token');
      window.location.hash = '#/login';
      throw new Error('Session expired');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error de servidor' }));
    throw new Error(error.detail || `Error ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Error de login' }));
      throw new Error(error.detail || 'Email o contraseña incorrectos');
    }
    return res.json();
  },

  refreshToken: async (refreshToken: string) => {
    const res = await fetch(`${API_URL}/api/v1/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error('Refresh failed');
    return res.json();
  },

  logout: async (refreshToken: string) => {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => {});  // silencioso — el logout local siempre procede
  },

  getMe: () => fetchWithAuth('/api/v1/auth/me'),
  changePassword: (current_password: string, new_password: string) =>
    fetchWithAuth('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  // ── Users ──────────────────────────────────────────────────
  getUsers: (targetTenantId?: string) => {
    const qs = targetTenantId ? `?target_tenant_id=${targetTenantId}` : '';
    return fetchWithAuth(`/api/v1/users/${qs}`);
  },
  createUser: (data: { email: string; password: string; nombre: string; rol: string; tenant_id: string }) =>
    fetchWithAuth('/api/v1/users/', { method: 'POST', body: JSON.stringify(data) }),
  toggleUser: (id: number) =>
    fetchWithAuth(`/api/v1/users/${id}/toggle`, { method: 'PATCH' }),
  getUsersByRole: (role: string) =>
    fetchWithAuth(`/api/v1/users/by-role/${role}`),
  updateUser: (id: number, data: { nombre?: string; email?: string; rol?: string; telefono?: string }) =>
    fetchWithAuth(`/api/v1/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  resendCredentials: (id: number) =>
    fetchWithAuth(`/api/v1/users/${id}/reset-password`, { method: 'POST' }),
  resetUserPassword: (id: number) =>
    fetchWithAuth(`/api/v1/users/${id}/reset-password`, { method: 'POST' }),

  // ── Tenants ────────────────────────────────────────────────
  getTenants: () => fetchWithAuth('/api/v1/tenants/'),
  createTenant: (data: any) =>
    fetchWithAuth('/api/v1/tenants/', { method: 'POST', body: JSON.stringify(data) }),
  deleteTenant: (id: string) =>
    fetchWithAuth(`/api/v1/tenants/${id}`, { method: 'DELETE' }),
  updateTenant: (id: string, data: any) =>
    fetchWithAuth(`/api/v1/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Clients ────────────────────────────────────────────────
  getClients: (params?: Record<string, string>) => {
    const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    return fetchWithAuth(`/api/v1/clients/${qs}`);
  },
  getClientsWithOrders: (q?: string) => {
    const qs = q ? '?has_orders=true&q=' + encodeURIComponent(q) + '&limit=100' : '?has_orders=true&limit=100';
    return fetchWithAuth('/api/v1/clients/' + qs);
  },
  getClientOrders: (clientId: number) => fetchWithAuth('/api/v1/orders/?cliente_id=' + clientId + '&limit=10'),
  getTenantBranding: () => fetchWithAuth('/api/v1/tenants/me'),
  updateTenantBranding: (data: Record<string, string>) =>
    fetchWithAuth('/api/v1/tenants/me/branding', { method: 'PATCH', body: JSON.stringify(data) }),
  createClient: (data: any) =>
    fetchWithAuth('/api/v1/clients/', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: number, data: any) =>
    fetchWithAuth(`/api/v1/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteClient: (id: number) =>
    fetchWithAuth(`/api/v1/clients/${id}`, { method: 'DELETE' }),

  // ── RRHH ───────────────────────────────────────────────────
  getRrhhEmpleados: () => fetchWithAuth('/api/v1/rrhh/empleados'),
  getRrhhDocumentos: (userId: number) => fetchWithAuth(`/api/v1/rrhh/documentos/${userId}`),
  uploadRrhhDoc: (userId: number, tipo: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tipo', tipo);
    return fetchWithAuth(`/api/v1/rrhh/documentos/${userId}`, { method: 'POST', body: fd }, true);
  },
  deleteRrhhDoc: (docId: string) =>
    fetchWithAuth(`/api/v1/rrhh/documentos/${docId}`, { method: 'DELETE' }),

  // ── Orders ────────────────────────────────────────────────
  getOrders: () => fetchWithAuth('/api/v1/orders/'),
  getOrder: (id: number) => fetchWithAuth(`/api/v1/orders/${id}`),
  createOrder: (data: any) =>
    fetchWithAuth('/api/v1/orders/', { method: 'POST', body: JSON.stringify(data) }),
  updateSubestado: (id: number, subestado: string) =>
    fetchWithAuth(`/api/v1/orders/${id}/subestado`, { method: 'PATCH', body: JSON.stringify({ subestado }) }),
  changeEstado: (id: number, estado: string, notas?: string) =>
    fetchWithAuth(`/api/v1/orders/${id}/estado`, {
      method: 'POST',
      body: JSON.stringify({ estado, notas }),
    }),
  assignFabricante: (orderId: number, usuarioId: number) =>
    fetchWithAuth(`/api/v1/orders/${orderId}/assign-fabricante`, {
      method: 'POST',
      body: JSON.stringify({ usuario_id: usuarioId }),
    }),
  assignInstalador: (orderId: number, usuarioId: number) =>
    fetchWithAuth(`/api/v1/orders/${orderId}/assign-instalador`, {
      method: 'POST',
      body: JSON.stringify({ usuario_id: usuarioId }),
    }),

  // ── Insumos ───────────────────────────────────────────────
  getInsumos: () => fetchWithAuth('/api/v1/insumos/'),
  createInsumo: (items: string[], urgencia: string) =>
    fetchWithAuth('/api/v1/insumos/', {
      method: 'POST',
      body: JSON.stringify({ items, urgencia }),
    }),
  updateInsumoEstado: (id: number, estado: string) =>
    fetchWithAuth(`/api/v1/insumos/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    }),

  // ── Catalogo de Productos ───────────────────────────────────
  listCatalogo: (q?: string, tipo?: string) => {
    const ps: string[] = [];
    if (q) ps.push('q=' + encodeURIComponent(q));
    if (tipo) ps.push('tipo=' + encodeURIComponent(tipo));
    const qs = ps.length ? '?' + ps.join('&') : '';
    return fetchWithAuth('/api/v1/catalogo/' + qs);
  },
  createCatalogo: (data: any) =>
    fetchWithAuth('/api/v1/catalogo/', { method: 'POST', body: JSON.stringify(data) }),
  updateCatalogo: (id: number, data: any) =>
    fetchWithAuth('/api/v1/catalogo/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCatalogo: (id: number) =>
    fetchWithAuth('/api/v1/catalogo/' + id, { method: 'DELETE' }),
  uploadCatalogoCSV: (formData: FormData) =>
    fetchWithAuth('/api/v1/catalogo/upload-csv', { method: 'POST', body: formData }, true),
  uploadCatalogoFoto: (id: number, formData: FormData) =>
    fetchWithAuth('/api/v1/catalogo/' + id + '/foto', { method: 'POST', body: formData }, true),

  // ── Compras Pendientes ───────────────────────────────────────
  listCompras: (estado?: string) =>
    fetchWithAuth('/api/v1/compras/' + (estado ? '?estado=' + estado : '')),
  createCompra: (data: any) =>
    fetchWithAuth('/api/v1/compras/', { method: 'POST', body: JSON.stringify(data) }),
  updateCompra: (id: number, data: any) =>
    fetchWithAuth('/api/v1/compras/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCompra: (id: number) =>
    fetchWithAuth('/api/v1/compras/' + id, { method: 'DELETE' }),

  // ── Notifications ─────────────────────────────────────────
  getNotifications: () => fetchWithAuth('/api/v1/notifications/'),
  createNotification: (mensaje: string, tipo: string) =>
    fetchWithAuth('/api/v1/notifications/', {
      method: 'POST',
      body: JSON.stringify({ mensaje, tipo }),
    }),
  markNotificationRead: (id: number) =>
    fetchWithAuth(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    fetchWithAuth('/api/v1/notifications/mark-all-read', { method: 'POST' }),

  // ── Mobile (instalador / fabricante) ──────────────────────
  getMyAgenda: () => fetchWithAuth('/api/v1/mobile/my-agenda'),
  getMyOrders: () => fetchWithAuth('/api/v1/mobile/my-orders'),
  getColaProduccion: () => fetchWithAuth('/api/v1/mobile/cola-produccion'),
  getTransitions: (estadoActual: string) =>
    fetchWithAuth(`/api/v1/mobile/transitions/${estadoActual}`),

  // ── Coordinator ───────────────────────────────────────────
  getWeeklyAgenda: () => fetchWithAuth('/api/v1/coordinator/agenda'),
  getOrdersPendingSchedule: () => fetchWithAuth('/api/v1/coordinator/orders/pending-schedule'),
  getTeams: () => fetchWithAuth('/api/v1/coordinator/teams'),

  // ── Dashboard ─────────────────────────────────────────────
  getDashboardSummary: () => fetchWithAuth('/api/v1/dashboard/summary'),
  getStageMetrics: () => fetchWithAuth('/api/v1/dashboard/metrics/stages'),
  getVendedoresStats: () => fetchWithAuth('/api/v1/dashboard/vendedores'),

  // ── Chat ──────────────────────────────────────────────────
  getChannels: () => fetchWithAuth('/api/v1/chat/channels'),
  getMessages: (channelId: string, before?: string) => {
    const qs = before ? `?before=${encodeURIComponent(before)}` : '';
    return fetchWithAuth(`/api/v1/chat/channels/${channelId}/messages${qs}`);
  },

  // ── Cotizaciones ──────────────────────────────────────────
  getCotizaciones: () => fetchWithAuth('/api/v1/cotizaciones/'),
  createCotizacion: (data: { cliente_id: number; productos: any[]; precio_total: number; notas?: string; valid_until?: string }) =>
    fetchWithAuth('/api/v1/cotizaciones/', { method: 'POST', body: JSON.stringify(data) }),
  getCotizacion: (id: string) => fetchWithAuth(`/api/v1/cotizaciones/${id}`),
  patchCotizacion: (id: string, data: any) =>
    fetchWithAuth(`/api/v1/cotizaciones/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  convertirCotizacion: (id: string) =>
    fetchWithAuth(`/api/v1/cotizaciones/${id}/convertir`, { method: 'POST' }),

  // ── Fotos ─────────────────────────────────────────────────
  getOrderPhotos: (orderId: number) => fetchWithAuth(`/api/v1/orders/${orderId}/photos`),
  uploadPhoto: async (orderId: number, file: File, tipo = 'otro') => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchWithAuth(
      `/api/v1/orders/${orderId}/photos?tipo=${tipo}`,
      { method: 'POST', body: formData },
      true,
    );
  },

  // ── Productos / Catálogo ───────────────────────────────────
  getProductos: (categoria?: string) => {
    const qs = categoria ? `?categoria=${encodeURIComponent(categoria)}` : '';
    return fetchWithAuth(`/api/v1/productos/${qs}`);
  },
  searchProductos: (q: string, limit = 30) =>
    fetchWithAuth(`/api/v1/productos/?q=${encodeURIComponent(q)}&limit=${limit}`),
  createProducto: (data: {
    nombre: string; descripcion?: string; categoria: string; unidad: string;
    precio_base: number; colores: string[]; materiales: string[]; specs?: Record<string, any>; codigo?: string;
  }) => fetchWithAuth('/api/v1/productos/', { method: 'POST', body: JSON.stringify(data) }),
  updateProducto: (id: string, data: any) =>
    fetchWithAuth(`/api/v1/productos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProducto: (id: string) =>
    fetchWithAuth(`/api/v1/productos/${id}`, { method: 'DELETE' }),

  // ── GPS Tracking ──────────────────────────────────────────
  sendGpsPing: (data: { lat: number; lon: number; precision_m?: number; velocidad_kmh?: number; heading?: number; order_id?: number }) =>
    fetchWithAuth('/api/v1/gps/ping', { method: 'POST', body: JSON.stringify(data) }),
  getActivePositions: () => fetchWithAuth('/api/v1/gps/active'),
  getGpsHistory: (orderId: number) => fetchWithAuth(`/api/v1/gps/order/${orderId}`),
  getGpsTracking: (token: string) => fetchWithAuth(`/api/v1/gps/tracking/${token}`),
  activateTracking: (orderId: number) =>
    fetchWithAuth(`/api/v1/gps/tracking/start/${orderId}`, { method: 'POST' }),
  deactivateTracking: (orderId: number) =>
    fetchWithAuth(`/api/v1/gps/tracking/stop/${orderId}`, { method: 'POST' }),
  getInstaladorOrders: () => fetchWithAuth('/api/v1/gps/my-orders'),
  getInstaladorTasks: () => fetchWithAuth('/api/v1/gps/my-tasks'),
  activateTaskTracking: (taskId: string) =>
    fetchWithAuth(`/api/v1/gps/tracking/start-task/${taskId}`, { method: 'POST' }),
  deactivateTaskTracking: (taskId: string) =>
    fetchWithAuth(`/api/v1/gps/tracking/stop-task/${taskId}`, { method: 'POST' }),
  sendGpsPingWithTask: (data: { lat: number; lon: number; precision_m?: number; velocidad_kmh?: number; heading?: number; task_id?: string }) =>
    fetchWithAuth('/api/v1/gps/ping', { method: 'POST', body: JSON.stringify(data) }),


  // ── Auth — recuperación de contraseña ────────────────────
  forgotPassword: (email: string) =>
    fetch(`${API_URL}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(async res => {
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw { response: { data: e } }; }
      return res.json().catch(() => ({}));
    }),
  resetPassword: (token: string, new_password: string) =>
    fetch(`${API_URL}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password }),
    }).then(async res => {
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw { response: { data: e } }; }
      return null;
    }),

  // ── Tareas Diarias ─────────────────────────────────────────
  getTasks: (params?: { fecha?: string; asignado_a?: string; estado?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString() : '';
    return fetchWithAuth(`/api/v1/tasks/${qs}`);
  },
  getMisTareas: (fecha?: string) => {
    const qs = fecha ? `?fecha=${fecha}` : '';
    return fetchWithAuth(`/api/v1/tasks/mis-tareas${qs}`);
  },
  createTask: (data: {
    titulo: string; descripcion?: string; asignado_a: number;
    fecha_tarea?: string; prioridad?: string; order_id?: number;
    hora?: string; tipo_tarea?: string;
    cliente_nombre?: string; cliente_telefono?: string;
    direccion?: string; ot_numero?: string; vendedor_nombre?: string;
    items?: { descripcion: string; ubicacion?: string }[];
    observaciones?: string[];
    empresa_cliente?: string;
    cliente_email?: string;
    restriccion_horaria?: string;
    nota_especial?: string;
  }) => fetchWithAuth('/api/v1/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: { estado?: string; notas_cierre?: string; titulo?: string; prioridad?: string }) =>
    fetchWithAuth(`/api/v1/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    fetchWithAuth(`/api/v1/tasks/${id}`, { method: 'DELETE' }),

  // ── Solicitudes Permisos / Vacaciones ─────────────────────
  getPermisos: () => fetchWithAuth('/api/v1/permisos/'),
  createPermiso: (data: {
    tipo: string; fecha_inicio: string; fecha_fin: string; dias: number; motivo?: string;
  }) => fetchWithAuth('/api/v1/permisos/', { method: 'POST', body: JSON.stringify(data) }),
  revisarPermiso: (id: string, data: { estado: string; respuesta?: string; dias_aprobados?: number; fecha_inicio_aprobada?: string; fecha_fin_aprobada?: string }) =>
    fetchWithAuth(`/api/v1/permisos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  cancelarPermiso: (id: string) =>
    fetchWithAuth(`/api/v1/permisos/${id}`, { method: 'DELETE' }),

  // ── Checklist de instalación ─────────────────────────────
  getChecklist: (orderId: number) => fetchWithAuth(`/api/v1/orders/${orderId}/checklist`),
  saveChecklist: (orderId: number, items: Record<string, boolean>) =>
    fetchWithAuth(`/api/v1/orders/${orderId}/checklist`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),

  // ── Firma digital ─────────────────────────────────────────
  saveSignature: (orderId: number, data: {
    firma_data: string; firmante_nombre: string; firmante_rut?: string;
    firmante_email?: string; lat?: number; lon?: number;
  }) => fetchWithAuth(`/api/v1/orders/${orderId}/signature`, { method: 'POST', body: JSON.stringify(data) }),

  updateNotasCierre: (orderId: number, notas: string) =>
    fetchWithAuth(`/api/v1/orders/${orderId}/notas-cierre`, { method: 'PATCH', body: JSON.stringify({ notas_cierre: notas }) }),
  getSignature: (orderId: number) =>
    fetchWithAuth(`/api/v1/orders/${orderId}/signature`),

  // ── Inventario ────────────────────────────────────────────
  getInventarioItems: (params?: { categoria?: string; solo_bajo_minimo?: boolean }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]) as [string, string][]).toString() : '';
    return fetchWithAuth(`/api/v1/inventario/items${qs}`);
  },
  createInventarioItem: (data: {
    nombre: string; categoria: string; unidad: string;
    stock_actual?: number; stock_minimo?: number;
    precio_unitario?: number; proveedor?: string; codigo?: string; descripcion?: string;
  }) => fetchWithAuth('/api/v1/inventario/items', { method: 'POST', body: JSON.stringify(data) }),
  updateInventarioItem: (id: number, data: Record<string, any>) =>
    fetchWithAuth(`/api/v1/inventario/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInventarioItem: (id: number) =>
    fetchWithAuth(`/api/v1/inventario/items/${id}`, { method: 'DELETE' }),
  getInventarioMovimientos: (itemId?: number) => {
    const qs = itemId ? `?item_id=${itemId}` : '';
    return fetchWithAuth(`/api/v1/inventario/movimientos${qs}`);
  },
  createMovimiento: (data: {
    item_id: number; tipo: string; cantidad: number;
    motivo?: string; order_id?: number; notas?: string;
  }) => fetchWithAuth('/api/v1/inventario/movimientos', { method: 'POST', body: JSON.stringify(data) }),
  getInventarioAlertas: () => fetchWithAuth('/api/v1/inventario/alertas'),
  getReglasMateriales: (tipo_producto?: string) => {
    const qs = tipo_producto ? `?tipo_producto=${encodeURIComponent(tipo_producto)}` : '';
    return fetchWithAuth(`/api/v1/inventario/reglas${qs}`);
  },
  createReglaMaterial: (data: Record<string, any>) =>
    fetchWithAuth('/api/v1/inventario/reglas', { method: 'POST', body: JSON.stringify(data) }),
  deleteReglaMaterial: (id: number) =>
    fetchWithAuth(`/api/v1/inventario/reglas/${id}`, { method: 'DELETE' }),
  calcularMateriales: (tipo_producto: string, ancho_cm: number, alto_cm: number) =>
    fetchWithAuth(`/api/v1/inventario/calcular?tipo_producto=${encodeURIComponent(tipo_producto)}&ancho_cm=${ancho_cm}&alto_cm=${alto_cm}`),

  // ── Averías y Fallas ─────────────────────────────────────
  getAverias: (params?: { estado?: string; tipo_servicio?: string; severidad?: string; client_id?: number; solo_mias?: boolean }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]) as [string, string][]).toString() : '';
    return fetchWithAuth(`/api/v1/averias/${qs}`);
  },
  getAveriaStats: () => fetchWithAuth('/api/v1/averias/stats'),
  createAveria: (data: {
    tipo_servicio: string; titulo: string; descripcion?: string; severidad?: string;
    client_id?: number; order_id?: number; fotos?: string[]; notas_tecnicas?: string; presupuesto_estimado?: number;
  }) => fetchWithAuth('/api/v1/averias/', { method: 'POST', body: JSON.stringify(data) }),
  updateAveria: (id: number, data: { estado?: string; severidad?: string; asignado_a?: number; client_id?: number; notas_tecnicas?: string; presupuesto_estimado?: number; descripcion?: string }) =>
    fetchWithAuth(`/api/v1/averias/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAveria: (id: number) =>
    fetchWithAuth(`/api/v1/averias/${id}`, { method: 'DELETE' }),

  updateGarantia: (id: number, data: { garantia_meses?: number; fecha_instalacion?: string }) =>
    fetchWithAuth(`/api/v1/orders/${id}/garantia`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Post-Venta ────────────────────────────────────────────
  getPostVenta: (params?: { estado?: string; tipo?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString() : '';
    return fetchWithAuth(`/api/v1/post-venta/${qs}`);
  },
  getPostVentaStats: () => fetchWithAuth('/api/v1/post-venta/stats'),
  createPostVenta: (data: { order_id: number; client_id: number; tipo: string; descripcion?: string }) =>
    fetchWithAuth('/api/v1/post-venta/', { method: 'POST', body: JSON.stringify(data) }),
  updatePostVenta: (id: string, data: { estado?: string; calificacion?: number; descripcion?: string }) =>
    fetchWithAuth(`/api/v1/post-venta/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePostVenta: (id: string) =>
    fetchWithAuth(`/api/v1/post-venta/${id}`, { method: 'DELETE' }),
  addPostVentaNota: (id: string, texto: string) =>
    fetchWithAuth(`/api/v1/post-venta/${id}/nota`, { method: 'POST', body: JSON.stringify({ texto }) }),
  generatePostVentaAI: (id: string) =>
    fetchWithAuth(`/api/v1/post-venta/${id}/ai`, { method: 'POST', body: JSON.stringify({}) }),
  sendPostVentaEmail: (id: string) =>
    fetchWithAuth(`/api/v1/post-venta/${id}/enviar-email`, { method: 'POST', body: JSON.stringify({}) }),

  // ── Appointments (citas de instalación) ───────────────────
  createAppointment: (data: {
    order_id: number; fecha_inicio: string; fecha_fin?: string;
    direccion?: string; notas?: string; notas_cliente?: string;
    team_id?: string; notificacion_cliente?: boolean;
  }) => fetchWithAuth('/api/v1/coordinator/appointments', { method: 'POST', body: JSON.stringify(data) }),
  getAppointments: () => fetchWithAuth('/api/v1/coordinator/agenda'),


  // ── Comisiones y Liquidaciones ────────────────────────────
  getReglasComision: () => fetchWithAuth('/api/v1/comisiones/reglas'),
  createReglaComision: (data: { categoria: string; rol: string; monto_por_unidad: number; descripcion?: string }) =>
    fetchWithAuth('/api/v1/comisiones/reglas', { method: 'POST', body: JSON.stringify(data) }),
  updateReglaComision: (id: number, data: { monto_por_unidad?: number; descripcion?: string; activo?: boolean }) =>
    fetchWithAuth('/api/v1/comisiones/reglas/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteReglaComision: (id: number) =>
    fetchWithAuth('/api/v1/comisiones/reglas/' + id, { method: 'DELETE' }),
  getMisComisiones: (periodo?: string) => {
    const qs = periodo ? '?periodo=' + periodo : '';
    return fetchWithAuth('/api/v1/comisiones/mis-comisiones' + qs);
  },
  getComisionesUsuario: (userId: number, periodo?: string) => {
    const qs = periodo ? '?periodo=' + periodo : '';
    return fetchWithAuth('/api/v1/comisiones/usuario/' + userId + qs);
  },
  getResumenComisiones: (periodo?: string) => {
    const qs = periodo ? '?periodo=' + periodo : '';
    return fetchWithAuth('/api/v1/comisiones/resumen' + qs);
  },
  getLiquidaciones: (periodo?: string) => {
    const qs = periodo ? '?periodo=' + periodo : '';
    return fetchWithAuth('/api/v1/liquidaciones/' + qs);
  },
  generarLiquidacion: (data: { user_id: number; periodo: string; sueldo_base: number }) =>
    fetchWithAuth('/api/v1/liquidaciones/generar', { method: 'POST', body: JSON.stringify(data) }),
  getLiquidacion: (id: number) => fetchWithAuth('/api/v1/liquidaciones/' + id),
  aprobarLiquidacion: (id: number) =>
    fetchWithAuth('/api/v1/liquidaciones/' + id + '/aprobar', { method: 'PATCH' }),
  pagarLiquidacion: (id: number) =>
    fetchWithAuth('/api/v1/liquidaciones/' + id + '/pagar', { method: 'PATCH' }),
  aiChat: (data: { message: string; history?: any[] }) =>
    fetchWithAuth("/api/v1/ai/chat", { method: "POST", body: JSON.stringify(data) }),
  aiStatus: () => fetchWithAuth("/api/v1/ai/status"),
  getAiConfig: () => fetchWithAuth("/api/v1/tenants/me/ai-config"),
  updateAiConfig: (data: Record<string, string>) =>
    fetchWithAuth("/api/v1/tenants/me/ai-config", { method: "PATCH", body: JSON.stringify(data) }),
  ajustarLiquidacion: (id: number, data: { ajustes: number; notas_ajustes?: string }) =>
    fetchWithAuth('/api/v1/liquidaciones/' + id + '/ajuste', { method: 'PATCH', body: JSON.stringify(data) }),

};
