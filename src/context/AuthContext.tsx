import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Rol } from '../types';
import { api, setAccessToken } from '../services/api';

interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  tenantId: string;
  activo: boolean;
}

interface TenantBranding {
  primaryColor: string;
  primaryLight: string;
  primaryDark: string;
  sidebarBg: string;
  sidebarText: string;
  logoEmoji: string;
  slogan: string;
}

interface AuthTenant {
  nombre: string;
  branding: TenantBranding;
}

interface AuthCtx {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshTenant: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  tenant: null,
  login: async () => false,
  logout: () => {},
  refreshTenant: () => {},
  loading: true,
});

function mapUser(u: any): AuthUser {
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol as Rol,
    tenantId: u.tenant_id || '',
    activo: u.activo,
  };
}

function mapTenant(branding: any, nombre: string): AuthTenant {
  return { nombre, branding };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<AuthTenant | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión al cargar (refresh token en localStorage)
  useEffect(() => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      setLoading(false);
      return;
    }

    api.refreshToken(refreshToken)
      .then(data => {
        setAccessToken(data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        setUser(mapUser(data.user));
        if (data.tenant_branding) {
          setTenant(mapTenant(data.tenant_branding, data.tenant_nombre || ''));
        }
        // Cargar datos completos del usuario
        return api.getMe();
      })
      .then(me => {
        if (me) {
          setUser(mapUser(me));
          if (me.tenant_branding) {
            setTenant(mapTenant(me.tenant_branding, me.tenant_nombre || ''));
          }
        }
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('refresh_token');
        setAccessToken(null);
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await api.login(email, password);
      setAccessToken(data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      setUser(mapUser(data.user));

      if (data.tenant_branding) {
        setTenant(mapTenant(data.tenant_branding, data.tenant_nombre || ''));
      } else {
        setTenant(null);
      }

      // Cargar datos completos
      try {
        const me = await api.getMe();
        if (me.tenant_branding) {
          setTenant(mapTenant(me.tenant_branding, me.tenant_nombre || ''));
        }
      } catch {
        // no crítico
      }

      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    // Revocar el refresh token en el servidor
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      await api.logout(refreshToken);
    }
    setUser(null);
    setTenant(null);
    setAccessToken(null);
    localStorage.removeItem('refresh_token');
  }, []);

  const refreshTenant = useCallback(async () => {
    try {
      const me = await api.getMe();
      if (me.tenant_branding) {
        setTenant(mapTenant(me.tenant_branding, me.tenant_nombre || ''));
      }
    } catch {
      // no crítico
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, tenant, login, logout, refreshTenant, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
