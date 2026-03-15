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

  // Auto-refresh en 401
  if (response.status === 401 && accessToken) {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/v1/auth/token/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          accessToken = data.access_token;
          localStorage.setItem('refresh_token', data.refresh_token);
          headers['Authorization'] = `Bearer ${data.access_token}`;

          // Reintentar sin Content-Type si era multipart
          const retryHeaders = skipContentType
            ? { Authorization: headers['Authorization'] }
            : headers;

          // Reintentar la request original
          response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: retryHeaders,
          });
        } else {
          // Refresh falló — limpiar sesión
          accessToken = null;
          localStorage.removeItem('refresh_token');
          window.location.hash = '#/login';
          throw new Error('Session expired');
        }
      } catch {
        accessToken = null;
        localStorage.removeItem('refresh_token');
        window.location.hash = '#/login';
        throw new Error('Session expired');
      }
    } else {
      window.location.hash = '#/login';
      throw new Error('Unauthorized');
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

  // ── Tenants ────────────────────────────────────────────────
  getTenants: () => fetchWithAuth('/api/v1/tenants/'),
  createTenant: (data: any) =>
    fetchWithAuth('/api/v1/tenants/', { method: 'POST', body: JSON.stringify(data) }),
  updateTenant: (id: string, data: any) =>
    fetchWithAuth(`/api/v1/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Clients ────────────────────────────────────────────────
  getClients: () => fetchWithAuth('/api/v1/clients/'),
  createClient: (data: { nombre: string; email?: string; telefono?: string; direccion?: string }) =>
    fetchWithAuth('/api/v1/clients/', { method: 'POST', body: JSON.stringify(data) }),

  // ── Orders ────────────────────────────────────────────────
  getOrders: () => fetchWithAuth('/api/v1/orders/'),
  getOrder: (id: number) => fetchWithAuth(`/api/v1/orders/${id}`),
  createOrder: (data: any) =>
    fetchWithAuth('/api/v1/orders/', { method: 'POST', body: JSON.stringify(data) }),
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

  // ── Notifications ─────────────────────────────────────────
  getNotifications: () => fetchWithAuth('/api/v1/notifications/'),
  createNotification: (mensaje: string, tipo: string) =>
    fetchWithAuth('/api/v1/notifications/', {
      method: 'POST',
      body: JSON.stringify({ mensaje, tipo }),
    }),

  // ── Mobile (instalador / fabricante) ──────────────────────
  getMyAgenda: () => fetchWithAuth('/api/v1/mobile/my-agenda'),
  getMyOrders: () => fetchWithAuth('/api/v1/mobile/my-orders'),
  getTransitions: (estadoActual: string) =>
    fetchWithAuth(`/api/v1/mobile/transitions/${estadoActual}`),

  // ── Coordinator ───────────────────────────────────────────
  getWeeklyAgenda: () => fetchWithAuth('/api/v1/coordinator/agenda'),
  getOrdersPendingSchedule: () => fetchWithAuth('/api/v1/coordinator/orders/pending-schedule'),
  getTeams: () => fetchWithAuth('/api/v1/coordinator/teams'),

  // ── Dashboard ─────────────────────────────────────────────
  getDashboardSummary: () => fetchWithAuth('/api/v1/dashboard/summary'),
  getStageMetrics: () => fetchWithAuth('/api/v1/dashboard/metrics/stages'),

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

  // ── Clientes — extendido ───────────────────────────────────
  updateClient: (id: number, data: { nombre?: string; email?: string; telefono?: string; direccion?: string; rut?: string; notas?: string }) =>
    fetchWithAuth(`/api/v1/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Productos / Catálogo ───────────────────────────────────
  getProductos: (categoria?: string) => {
    const qs = categoria ? `?categoria=${encodeURIComponent(categoria)}` : '';
    return fetchWithAuth(`/api/v1/productos/${qs}`);
  },
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
  }) => fetchWithAuth('/api/v1/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: { estado?: string; notas_cierre?: string; titulo?: string; prioridad?: string }) =>
    fetchWithAuth(`/api/v1/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    fetchWithAuth(`/api/v1/tasks/${id}`, { method: 'DELETE' }),

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

  // ── Appointments (citas de instalación) ───────────────────
  createAppointment: (data: {
    order_id: number; fecha_inicio: string; fecha_fin?: string;
    direccion?: string; notas?: string; notas_cliente?: string;
    team_id?: string; notificacion_cliente?: boolean;
  }) => fetchWithAuth('/api/v1/coordinator/appointments', { method: 'POST', body: JSON.stringify(data) }),
  getAppointments: () => fetchWithAuth('/api/v1/coordinator/agenda'),

};
