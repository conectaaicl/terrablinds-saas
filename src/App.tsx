import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import JefeDashboard from './pages/jefe/Dashboard';
import { OrdenesLista, OrdenDetalle } from './pages/jefe/Ordenes';
import Usuarios from './pages/jefe/Usuarios';
import { MisCotizaciones, NuevaCotizacion, PedidoDetalle } from './pages/vendedor/Vendedor';
import Chat from './pages/chat/Chat';
import { ColaProduccion, DetalleTecnico } from './pages/fabricante/Fabricante';
import { MisInstalaciones, DetalleInstalacion } from './pages/instalador/Instalador';
import { AdminTalleres, AdminUsuarios } from './pages/admin/Admin';
import type { Rol } from './types';
import { Component, type ReactNode } from 'react';
import { Store } from './data/store';

// ── Error Boundary to prevent blank screens ──
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: false };
  }
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-3xl">⚠️</div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">Algo salió mal</h1>
            <p className="mt-2 text-sm text-slate-500">
              Es probable que haya datos viejos en caché. Haz clic en el botón para restaurar.
            </p>
            <button
              onClick={() => { Store.resetData(); window.location.reload(); }}
              className="mt-4 rounded-lg bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-600"
            >
              Restaurar y Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RoleGuard({ roles }: { roles: Rol[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.rol)) {
    const home = user.rol === 'superadmin' ? '/admin' : user.rol === 'jefe' ? '/jefe' : `/${user.rol}`;
    return <Navigate to={home} replace />;
  }
  return <Outlet />;
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const home = user.rol === 'superadmin' ? '/admin' : user.rol === 'jefe' ? '/jefe' : `/${user.rol}`;

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={home} replace />} />

      {/* ── SUPER ADMIN ── */}
      <Route element={<RoleGuard roles={['superadmin']} />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminTalleres />} />
          <Route path="/admin/usuarios" element={<AdminUsuarios />} />
        </Route>
      </Route>

      {/* ── JEFE ── */}
      <Route element={<RoleGuard roles={['jefe']} />}>
        <Route element={<Layout />}>
          <Route path="/jefe" element={<JefeDashboard />} />
          <Route path="/jefe/ordenes" element={<OrdenesLista />} />
          <Route path="/jefe/ordenes/:id" element={<OrdenDetalle />} />
          <Route path="/jefe/usuarios" element={<Usuarios />} />
        </Route>
      </Route>

      {/* ── VENDEDOR ── */}
      <Route element={<RoleGuard roles={['vendedor']} />}>
        <Route element={<Layout />}>
          <Route path="/vendedor" element={<MisCotizaciones />} />
          <Route path="/vendedor/nueva" element={<NuevaCotizacion />} />
          <Route path="/vendedor/pedido/:id" element={<PedidoDetalle />} />
        </Route>
      </Route>

      {/* ── FABRICANTE ── */}
      <Route element={<RoleGuard roles={['fabricante']} />}>
        <Route element={<Layout />}>
          <Route path="/fabricante" element={<ColaProduccion />} />
          <Route path="/fabricante/:id" element={<DetalleTecnico />} />
        </Route>
      </Route>

      {/* ── INSTALADOR ── */}
      <Route element={<RoleGuard roles={['instalador']} />}>
        <Route element={<Layout />}>
          <Route path="/instalador" element={<MisInstalaciones />} />
          <Route path="/instalador/:id" element={<DetalleInstalacion />} />
        </Route>
      </Route>

      {/* ── COORDINADOR ── */}
      <Route element={<RoleGuard roles={['coordinador']} />}>
        <Route element={<Layout />}>
          <Route path="/coordinador" element={<JefeDashboard />} />
          <Route path="/coordinador/ordenes" element={<OrdenesLista />} />
          <Route path="/coordinador/ordenes/:id" element={<OrdenDetalle />} />
          <Route path="/coordinador/usuarios" element={<Usuarios />} />
        </Route>
      </Route>

      {/* ── CHAT GLOBAL ── */}
      <Route element={<RoleGuard roles={['superadmin','jefe','coordinador','vendedor','fabricante','instalador']} />}>
        <Route element={<Layout />}>
          <Route path="/chat" element={<Chat />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
