import { Usuario, Orden, InsumoRequest } from '../types';

const API_URL = 'http://localhost:8000'; // placeholder, configure in real backend env

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'API Error');
  }

  return response.json();
}

export const api = {
  // --- Auth ---
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  // --- Users ---
  getUsers: () => fetchWithAuth('/users/'),

  // --- Orders ---
  getOrders: () => fetchWithAuth('/orders/'),
  
  createOrder: (order: Partial<Orden>) => 
    fetchWithAuth('/orders/', {
      method: 'POST',
      body: JSON.stringify(order),
    }),

  updateOrder: (id: string, updates: Partial<Orden>) =>
    fetchWithAuth(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  // --- Insumos ---
  requestInsumos: (items: string[], urgencia: string) =>
    fetchWithAuth('/insumos/', {
      method: 'POST',
      body: JSON.stringify({ items, urgencia }),
    }),

  getInsumos: () => fetchWithAuth('/insumos/'),

  // --- Notifications ---
  sendNotification: (mensaje: string, tipo: string) =>
    fetchWithAuth('/notifications/', {
      method: 'POST',
      body: JSON.stringify({ mensaje, tipo }),
    }),

  getNotifications: () => fetchWithAuth('/notifications/'),
};
