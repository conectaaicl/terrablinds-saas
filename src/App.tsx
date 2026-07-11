import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Landing from './pages/Landing';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Tracking from './pages/Tracking';
import JefeDashboard from './pages/jefe/Dashboard';
import { OrdenesLista, OrdenDetalle } from './pages/jefe/Ordenes';
import Usuarios from './pages/jefe/Usuarios';
import JefeCotizaciones from './pages/jefe/Cotizaciones';
import CotizacionPrint from './pages/cotizaciones/CotizacionPrint';
import VendedoresStats from './pages/jefe/VendedoresStats';
import { MisCotizaciones, NuevaCotizacion, PedidoDetalle, DetalleCotizacion } from './pages/vendedor/Vendedor';
import TomaMedidas from './pages/vendedor/TomaMedidas';
import Chat from './pages/chat/Chat';
import { ColaProduccion, DetalleTecnico, HistorialProduccion } from './pages/fabricante/Fabricante';
import MisSolicitudes from './pages/fabricante/MisSolicitudes';
import { MisInstalaciones, DetalleInstalacion, HistorialInstalador } from './pages/instalador/Instalador';
import { AdminTalleres, AdminUsuarios } from './pages/admin/Admin';
import {
  CoordinadorDashboard,
  AgendaSemanal,
  GestionTareas,
  MapaGPS,
} from './pages/coordinador/Coordinador';
import BodegasDashboard from './pages/bodegas/Bodegas';
import BodegasInsumos from './pages/bodegas/BodegasInsumos';
import Inventario from './pages/bodegas/Inventario';
import Clientes from './pages/clientes/Clientes';
import PostVenta from './pages/post_venta/PostVenta';
import RRHH from './pages/rrhh/RRHH';
import SolicitudesRRHH from './pages/rrhh/SolicitudesRRHH';
import TallerSettings from './pages/jefe/TallerSettings';
import Onboarding from './pages/jefe/Onboarding';
import { AIConfig } from './pages/jefe/AIConfig';
import CatalogoAdmin from './pages/jefe/CatalogoAdmin';
import { OTPrint } from './pages/shared/OTPrint';
import { ComprasPendientes } from './pages/shared/ComprasPendientes';
import ReglasMateriales from './pages/jefe/ReglasMateriales';
import Comisiones from './pages/jefe/Comisiones';
import MisComisiones from './pages/shared/MisComisiones';
import RegistroTrabajo from './pages/jefe/RegistroTrabajo';
import MisGanancias from './pages/shared/MisGanancias';
import JefeAverias from './pages/jefe/Averias';
import InstaladorAverias from './pages/instalador/Averias';
import InstaladorTracking from './pages/instalador/InstaladorTracking';
import type { Rol } from './types';
import { Component, type ReactNode } from 'react';

// ── Error Boundary ──
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
            <p className="mt-2 text-sm text-slate-500">Ocurrió un error inesperado. Intenta recargar la página.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-600"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function getHome(rol: Rol): string {
  switch (rol) {
    case 'superadmin': return '/admin';
    case 'jefe': return '/jefe';
    case 'gerente': return '/gerente';
    case 'coordinador': return '/coordinador';
    case 'bodegas': return '/bodegas';
    default: return `/${rol}`;
  }
}

function RoleGuard({ roles }: { roles: Rol[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.rol)) {
    return <Navigate to={getHome(user.rol)} replace />;
  }
  return <Outlet />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/tracking/:token" element={<Tracking />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const home = getHome(user.rol);
  const changePwdPath = `/${user.rol === 'superadmin' ? 'admin' : user.rol}/cambiar-password`;

  // Force password change on first login
  if ((user as any).mustChangePassword) {
    return (
      <Routes>
        <Route path="*" element={<Navigate to={changePwdPath} replace />} />
        <Route element={<Layout />}>
          <Route path={changePwdPath} element={<ChangePassword />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={home} replace />} />

      {/* ── SUPER ADMIN ── */}
      <Route element={<RoleGuard roles={['superadmin']} />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminTalleres />} />
          <Route path="/admin/usuarios" element={<AdminUsuarios />} />
          <Route path="/admin/cambiar-password" element={<ChangePassword />} />
        </Route>
      </Route>

      {/* ── JEFE ── */}
      <Route element={<RoleGuard roles={['jefe']} />}>
        <Route element={<Layout />}>
          <Route path="/jefe" element={<JefeDashboard />} />
          <Route path="/jefe/ordenes" element={<OrdenesLista />} />
          <Route path="/jefe/ordenes/:id" element={<OrdenDetalle />} />
          <Route path="/jefe/cotizaciones" element={<JefeCotizaciones />} />
          <Route path="/jefe/cotizaciones/nueva" element={<NuevaCotizacion />} />
          <Route path="/jefe/cotizaciones/:id/imprimir" element={<CotizacionPrint />} />
          <Route path="/jefe/vendedores" element={<VendedoresStats />} />
          <Route path="/jefe/usuarios" element={<Usuarios />} />
          <Route path="/jefe/clientes" element={<Clientes />} />
          <Route path="/jefe/post-venta" element={<PostVenta />} />
          <Route path="/jefe/rrhh" element={<RRHH />} />
          <Route path="/jefe/insumos" element={<BodegasInsumos />} />
          <Route path="/jefe/permisos" element={<SolicitudesRRHH />} />
          <Route path="/jefe/configuracion" element={<TallerSettings />} />
          <Route path="/jefe/onboarding" element={<Onboarding />} />
          <Route path="/jefe/ai-config" element={<AIConfig />} />
          <Route path="/jefe/compras" element={<ComprasPendientes />} />
          <Route path="/jefe/catalogo" element={<CatalogoAdmin />} />
          <Route path="/jefe/reglas-materiales" element={<ReglasMateriales />} />
          <Route path="/jefe/averias" element={<JefeAverias />} />
          <Route path="/jefe/agenda" element={<AgendaSemanal />} />
          <Route path="/jefe/tareas" element={<GestionTareas />} />
          <Route path="/jefe/gps" element={<MapaGPS />} />
          <Route path="/jefe/comisiones" element={<Comisiones />} />
          <Route path="/jefe/registro-trabajo" element={<RegistroTrabajo />} />
          <Route path="/jefe/cambiar-password" element={<ChangePassword />} />
        </Route>
      </Route>

      {/* ── GERENTE ── */}
      <Route element={<RoleGuard roles={['gerente']} />}>
        <Route element={<Layout />}>
          <Route path="/gerente" element={<JefeDashboard />} />
          <Route path="/gerente/ordenes" element={<OrdenesLista />} />
          <Route path="/gerente/ordenes/:id" element={<OrdenDetalle />} />
          <Route path="/gerente/cotizaciones" element={<JefeCotizaciones />} />
          <Route path="/gerente/cotizaciones/nueva" element={<NuevaCotizacion />} />
          <Route path="/gerente/cotizaciones/:id/imprimir" element={<CotizacionPrint />} />
          <Route path="/gerente/vendedores" element={<VendedoresStats />} />
          <Route path="/gerente/usuarios" element={<Usuarios />} />
          <Route path="/gerente/clientes" element={<Clientes />} />
          <Route path="/gerente/post-venta" element={<PostVenta />} />
          <Route path="/gerente/rrhh" element={<RRHH />} />
          <Route path="/gerente/insumos" element={<BodegasInsumos />} />
          <Route path="/gerente/permisos" element={<SolicitudesRRHH />} />
          <Route path="/gerente/configuracion" element={<TallerSettings />} />
          <Route path="/gerente/ai-config" element={<AIConfig />} />
          <Route path="/gerente/compras" element={<ComprasPendientes />} />
          <Route path="/gerente/catalogo" element={<CatalogoAdmin />} />
          <Route path="/gerente/reglas-materiales" element={<ReglasMateriales />} />
          <Route path="/gerente/averias" element={<JefeAverias />} />
          <Route path="/gerente/agenda" element={<AgendaSemanal />} />
          <Route path="/gerente/tareas" element={<GestionTareas />} />
          <Route path="/gerente/gps" element={<MapaGPS />} />
          <Route path="/gerente/comisiones" element={<Comisiones />} />
          <Route path="/gerente/registro-trabajo" element={<RegistroTrabajo />} />
          <Route path="/gerente/cambiar-password" element={<ChangePassword />} />
        </Route>
      </Route>

      {/* ── COORDINADOR ── */}
      <Route element={<RoleGuard roles={['coordinador']} />}>
        <Route element={<Layout />}>
          <Route path="/coordinador/compras" element={<ComprasPendientes />} />
          <Route path="/coordinador" element={<CoordinadorDashboard />} />
          <Route path="/coordinador/agenda" element={<AgendaSemanal />} />
          <Route path="/coordinador/tareas" element={<GestionTareas />} />
          <Route path="/coordinador/gps" element={<MapaGPS />} />
          <Route path="/coordinador/ordenes" element={<OrdenesLista />} />
          <Route path="/coordinador/ordenes/:id" element={<OrdenDetalle />} />
          <Route path="/coordinador/usuarios" element={<Usuarios />} />
          <Route path="/coordinador/catalogo" element={<CatalogoAdmin />} />
          <Route path="/coordinador/clientes" element={<Clientes />} />
          <Route path="/coordinador/post-venta" element={<PostVenta />} />
          <Route path="/coordinador/averias" element={<JefeAverias />} />
          <Route path="/coordinador/rrhh" element={<RRHH />} />
          <Route path="/coordinador/insumos" element={<BodegasInsumos />} />
          <Route path="/coordinador/permisos" element={<SolicitudesRRHH />} />
          <Route path="/coordinador/registro-trabajo" element={<RegistroTrabajo />} />
          <Route path="/coordinador/cambiar-password" element={<ChangePassword />} />
        </Route>
      </Route>

      {/* ── VENDEDOR ── */}
      <Route element={<RoleGuard roles={['vendedor']} />}>
        <Route element={<Layout />}>
          <Route path="/vendedor/compras" element={<ComprasPendientes />} />
          <Route path="/vendedor" element={<MisCotizaciones />} />
          <Route path="/vendedor/averias" element={<InstaladorAverias />} />
          <Route path="/vendedor/nueva" element={<NuevaCotizacion />} />
          <Route path="/vendedor/pedido/:id" element={<PedidoDetalle />} />
          <Route path="/vendedor/cotizacion/:id" element={<DetalleCotizacion />} />
          <Route path="/vendedor/cotizacion/:id/imprimir" element={<CotizacionPrint />} />
          <Route path="/vendedor/medidas" element={<TomaMedidas />} />
          <Route path="/vendedor/catalogo" element={<CatalogoAdmin />} />
          <Route path="/vendedor/clientes" element={<Clientes />} />
          <Route path="/vendedor/permisos" element={<SolicitudesRRHH />} />
          <Route path="/vendedor/mis-comisiones" element={<MisComisiones />} />
          <Route path="/vendedor/mis-ganancias" element={<MisGanancias />} />
          <Route path="/vendedor/cambiar-password" element={<ChangePassword />} />
        </Route>
      </Route>

      {/* ── FABRICANTE ── */}
      <Route element={<RoleGuard roles={['fabricante']} />}>
        <Route element={<Layout />}>
          <Route path="/fabricante" element={<ColaProduccion />} />
          <Route path="/fabricante/averias" element={<InstaladorAverias />} />
          <Route path="/fabricante/historial" element={<HistorialProduccion />} />
          <Route path="/fabricante/solicitudes" element={<MisSolicitudes />} />
          <Route path="/fabricante/rrhh" element={<RRHH />} />
          <Route path="/fabricante/permisos" element={<SolicitudesRRHH />} />
          <Route path="/fabricante/mis-comisiones" element={<MisComisiones />} />
          <Route path="/fabricante/mis-ganancias" element={<MisGanancias />} />
          <Route path="/fabricante/:id" element={<DetalleTecnico />} />
          <Route path="/fabricante/cambiar-password" element={<ChangePassword />} />
        </Route>
      </Route>

      {/* ── INSTALADOR ── */}
      <Route element={<RoleGuard roles={['instalador']} />}>
        <Route element={<Layout />}>
          <Route path="/instalador" element={<MisInstalaciones />} />
          <Route path="/instalador/historial" element={<HistorialInstalador />} />
          <Route path="/instalador/tracking" element={<InstaladorTracking />} />
          <Route path="/instalador/averias" element={<InstaladorAverias />} />
          <Route path="/instalador/permisos" element={<SolicitudesRRHH />} />
          <Route path="/instalador/mis-comisiones" element={<MisComisiones />} />
          <Route path="/instalador/mis-ganancias" element={<MisGanancias />} />
          <Route path="/instalador/cambiar-password" element={<ChangePassword />} />
          <Route path="/instalador/:id" element={<DetalleInstalacion />} />
        </Route>
      </Route>

      {/* ── BODEGAS ── */}
      <Route element={<RoleGuard roles={['bodegas']} />}>
        <Route element={<Layout />}>
          <Route path="/bodegas" element={<BodegasDashboard />} />
          <Route path="/bodegas/ordenes" element={<OrdenesLista />} />
          <Route path="/bodegas/ordenes/:id" element={<OrdenDetalle />} />
          <Route path="/bodegas/insumos" element={<BodegasInsumos />} />
          <Route path="/bodegas/inventario" element={<Inventario />} />
          <Route path="/bodegas/cambiar-password" element={<ChangePassword />} />
        </Route>
      </Route>

      {/* ── OT PRINT (all authenticated roles, no Layout) ── */}
      <Route element={<RoleGuard roles={['superadmin','jefe','gerente','coordinador','vendedor','fabricante','instalador','bodegas']} />}>
        <Route path="/print/ot/:id" element={<OTPrint />} />
      </Route>

      {/* ── CHAT GLOBAL ── */}
      <Route element={<RoleGuard roles={['superadmin','jefe','gerente','coordinador','vendedor','fabricante','instalador','bodegas']} />}>
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
