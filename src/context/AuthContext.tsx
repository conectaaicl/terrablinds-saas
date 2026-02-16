import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Usuario, Tenant } from '../types';
import { Store } from '../data/store';

interface AuthCtx {
  user: Usuario | null;
  tenant: Tenant | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  refreshTenant: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null, tenant: null,
  login: () => false,
  logout: () => {},
  refreshTenant: () => {},
});

function loadSession(): { user: Usuario; tenant: Tenant | null } | null {
  try {
    const raw = localStorage.getItem('wl_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate that the stored session has proper structure
    if (!parsed?.user?.id || !parsed?.user?.email || !parsed?.user?.rol) {
      localStorage.removeItem('wl_session');
      return null;
    }
    // Re-validate user still exists in store
    const freshUser = Store.getUsuarioById(parsed.user.id);
    if (!freshUser || !freshUser.activo) {
      localStorage.removeItem('wl_session');
      return null;
    }
    const tenant = freshUser.rol === 'superadmin' ? null : Store.getTenantById(freshUser.tenantId) || null;
    return { user: freshUser, tenant };
  } catch {
    localStorage.removeItem('wl_session');
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ user: Usuario; tenant: Tenant | null } | null>(loadSession);

  const login = useCallback((email: string, password: string) => {
    const u = Store.login(email, password);
    if (u) {
      const t = u.rol === 'superadmin' ? null : Store.getTenantById(u.tenantId) || null;
      const sess = { user: u, tenant: t };
      setSession(sess);
      localStorage.setItem('wl_session', JSON.stringify(sess));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem('wl_session');
  }, []);

  const refreshTenant = useCallback(() => {
    if (session?.user) {
      const t = session.user.rol === 'superadmin' ? null : Store.getTenantById(session.user.tenantId) || null;
      const newSess = { user: session.user, tenant: t };
      setSession(newSess);
      localStorage.setItem('wl_session', JSON.stringify(newSess));
    }
  }, [session]);

  return (
    <AuthContext.Provider value={{
      user: session?.user || null,
      tenant: session?.tenant || null,
      login, logout, refreshTenant,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
