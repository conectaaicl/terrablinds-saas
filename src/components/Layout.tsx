import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROL_CONFIG } from '../types';
import type { Rol } from '../types';
import {
  LayoutDashboard, ClipboardList, Users, Factory, Wrench,
  LogOut, Menu, X, Building2, MessageCircle,
  FilePlus2, Ruler, CalendarDays, ListTodo,
  Package, Radio, FileText, PackageSearch, KeyRound, Warehouse,
  UserCircle2, HeartHandshake, FolderOpen, Navigation, AlertTriangle,
  TrendingUp, Bell,
} from 'lucide-react';
import { api } from '../services/api';

type Notification = {
  id: number;
  mensaje: string;
  tipo: string;
  leido_por: number[];
  created_at: string;
};

function NotificationBell({ userId, light }: { userId: number; light?: boolean }) {
  const [notis, setNotis] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotis = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotis(data || []);
    } catch {/* ignore */}
  }, []);

  useEffect(() => {
    fetchNotis();
    const id = setInterval(fetchNotis, 30000);
    return () => clearInterval(id);
  }, [fetchNotis]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unread = notis.filter(n => !n.leido_por.includes(userId)).length;

  async function handleMarkRead(id: number) {
    await api.markNotificationRead(id);
    setNotis(prev => prev.map(n => n.id === id ? { ...n, leido_por: [...n.leido_por, userId] } : n));
  }

  async function handleMarkAll() {
    await api.markAllNotificationsRead();
    setNotis(prev => prev.map(n => ({ ...n, leido_por: n.leido_por.includes(userId) ? n.leido_por : [...n.leido_por, userId] })));
  }

  const TIPO_COLOR: Record<string, string> = {
    info: 'bg-blue-500',
    alerta: 'bg-amber-500',
    exito: 'bg-emerald-500',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${light ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}
        title="Notificaciones"
      >
        <Bell size={16} className={light ? 'text-slate-600' : 'text-slate-300'} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notificaciones</span>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-[11px] text-rose-500 hover:text-rose-600 font-medium">
                Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {notis.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Sin notificaciones</p>
            ) : notis.map(n => {
              const isUnread = !n.leido_por.includes(userId);
              return (
                <div
                  key={n.id}
                  onClick={() => isUnread && handleMarkRead(n.id)}
                  className={`flex gap-2.5 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${isUnread ? 'bg-blue-50/60' : ''}`}
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${TIPO_COLOR[n.tipo] || 'bg-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[12px] leading-snug ${isUnread ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                      {n.mensaje}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {new Date(n.created_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  badge?: string;
};

type NavSection = {
  heading?: string;
  items: NavItem[];
};

function getNavSections(rol: Rol): NavSection[] {
  switch (rol) {
    case 'jefe':
    case 'gerente': {
      const base = rol === 'gerente' ? '/gerente' : '/jefe';
      return [
        {
          heading: 'OPERACIONES',
          items: [
            { to: base, label: 'Dashboard', icon: <LayoutDashboard size={16} />, end: true },
            { to: `${base}/ordenes`, label: 'Órdenes', icon: <ClipboardList size={16} /> },
            { to: `${base}/cotizaciones`, label: 'Cotizaciones', icon: <FileText size={16} /> },
            { to: `${base}/vendedores`, label: 'Rendimiento Ventas', icon: <TrendingUp size={16} /> },
            { to: `${base}/agenda`, label: 'Agenda', icon: <CalendarDays size={16} /> },
            { to: `${base}/tareas`, label: 'Tareas', icon: <ListTodo size={16} /> },
            { to: `${base}/gps`, label: 'GPS en Vivo', icon: <Radio size={16} /> },
          ],
        },
        {
          heading: 'CLIENTES',
          items: [
            { to: `${base}/clientes`, label: 'CRM Clientes', icon: <UserCircle2 size={16} /> },
            { to: `${base}/post-venta`, label: 'Post-Venta', icon: <HeartHandshake size={16} /> },
            { to: `${base}/averias`, label: 'Averías / Fallas', icon: <AlertTriangle size={16} /> },
          ],
        },
        {
          heading: 'EQUIPO',
          items: [
            { to: `${base}/usuarios`, label: 'Usuarios', icon: <Users size={16} /> },
            { to: `${base}/productos`, label: 'Catálogo', icon: <Package size={16} /> },
            { to: `${base}/rrhh`, label: 'RRHH Docs', icon: <FolderOpen size={16} /> },
            { to: `${base}/reglas-materiales`, label: 'Reglas Materiales', icon: <Wrench size={16} /> },
          ],
        },
        {
          items: [
            { to: '/chat', label: 'Chat', icon: <MessageCircle size={16} className="text-emerald-400" /> },
          ],
        },
      ];
    }

    case 'coordinador':
      return [
        {
          heading: 'COORDINACIÓN',
          items: [
            { to: '/coordinador', label: 'Centro de Control', icon: <LayoutDashboard size={16} />, end: true },
            { to: '/coordinador/agenda', label: 'Agenda', icon: <CalendarDays size={16} /> },
            { to: '/coordinador/tareas', label: 'Tareas', icon: <ListTodo size={16} /> },
            { to: '/coordinador/gps', label: 'GPS en Vivo', icon: <Radio size={16} /> },
            { to: '/coordinador/ordenes', label: 'Órdenes', icon: <ClipboardList size={16} /> },
          ],
        },
        {
          heading: 'CLIENTES',
          items: [
            { to: '/coordinador/clientes', label: 'CRM Clientes', icon: <UserCircle2 size={16} /> },
            { to: '/coordinador/post-venta', label: 'Post-Venta', icon: <HeartHandshake size={16} /> },
            { to: '/coordinador/averias', label: 'Averías / Fallas', icon: <AlertTriangle size={16} /> },
          ],
        },
        {
          heading: 'EQUIPO',
          items: [
            { to: '/coordinador/usuarios', label: 'Usuarios', icon: <Users size={16} /> },
            { to: '/coordinador/productos', label: 'Catálogo', icon: <Package size={16} /> },
            { to: '/coordinador/rrhh', label: 'RRHH Docs', icon: <FolderOpen size={16} /> },
          ],
        },
        {
          items: [
            { to: '/chat', label: 'Chat', icon: <MessageCircle size={16} className="text-emerald-400" /> },
          ],
        },
      ];

    case 'vendedor':
      return [
        {
          heading: 'VENTAS',
          items: [
            { to: '/vendedor', label: 'Mis Pedidos', icon: <ClipboardList size={16} />, end: true },
            { to: '/vendedor/nueva', label: 'Nueva Cotización', icon: <FilePlus2 size={16} /> },
            { to: '/vendedor/clientes', label: 'Mis Clientes', icon: <UserCircle2 size={16} /> },
            { to: '/vendedor/medidas', label: 'Toma de Medidas', icon: <Ruler size={16} /> },
            { to: '/vendedor/productos', label: 'Catálogo', icon: <Package size={16} /> },
          ],
        },
        {
          heading: 'PERSONAL',
          items: [
            { to: '/vendedor/permisos', label: 'Permisos / Vacaciones', icon: <CalendarDays size={16} /> },
          ],
        },
        {
          items: [
            { to: '/chat', label: 'Chat', icon: <MessageCircle size={16} className="text-emerald-400" /> },
          ],
        },
      ];

    case 'fabricante':
      return [
        {
          heading: 'PRODUCCIÓN',
          items: [
            { to: '/fabricante', label: 'Cola de Producción', icon: <Factory size={16} />, end: true },
            { to: '/fabricante/solicitudes', label: 'Mis Solicitudes', icon: <PackageSearch size={16} /> },
          ],
        },
        {
          heading: 'PERSONAL',
          items: [
            { to: '/fabricante/permisos', label: 'Permisos / Vacaciones', icon: <CalendarDays size={16} /> },
          ],
        },
        {
          items: [
            { to: '/chat', label: 'Chat', icon: <MessageCircle size={16} className="text-emerald-400" /> },
          ],
        },
      ];

    case 'instalador':
      return [
        {
          heading: 'TRABAJO',
          items: [
            { to: '/instalador', label: 'Mis Instalaciones', icon: <Wrench size={16} />, end: true },
            { to: '/instalador/tracking', label: 'GPS / Tracking', icon: <Navigation size={16} /> },
            { to: '/instalador/averias', label: 'Averías / Fallas', icon: <AlertTriangle size={16} /> },
          ],
        },
        {
          heading: 'PERSONAL',
          items: [
            { to: '/instalador/permisos', label: 'Permisos / Vacaciones', icon: <CalendarDays size={16} /> },
          ],
        },
        {
          items: [
            { to: '/chat', label: 'Chat', icon: <MessageCircle size={16} className="text-emerald-400" /> },
          ],
        },
      ];

    case 'bodegas':
      return [
        {
          heading: 'INVENTARIO',
          items: [
            { to: '/bodegas', label: 'Dashboard', icon: <Warehouse size={16} />, end: true },
            { to: '/bodegas/inventario', label: 'Stock & Materiales', icon: <Package size={16} /> },
            { to: '/bodegas/ordenes', label: 'Órdenes', icon: <ClipboardList size={16} /> },
            { to: '/bodegas/insumos', label: 'Solicitudes Insumos', icon: <PackageSearch size={16} /> },
          ],
        },
        {
          items: [
            { to: '/chat', label: 'Chat', icon: <MessageCircle size={16} className="text-emerald-400" /> },
          ],
        },
      ];

    case 'superadmin':
      return [
        {
          heading: 'ADMINISTRACIÓN',
          items: [
            { to: '/admin', label: 'Talleres', icon: <Building2 size={16} />, end: true },
            { to: '/admin/usuarios', label: 'Usuarios', icon: <Users size={16} /> },
          ],
        },
        {
          items: [
            { to: '/chat', label: 'Chat', icon: <MessageCircle size={16} className="text-emerald-400" /> },
          ],
        },
      ];

    default:
      return [];
  }
}

export default function Layout() {
  const { user, tenant, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (tenant?.branding) {
      const b = tenant.branding;
      document.documentElement.style.setProperty('--brand-primary', b.primaryColor);
      document.documentElement.style.setProperty('--brand-light', b.primaryLight);
      document.documentElement.style.setProperty('--brand-dark', b.primaryDark);
      document.documentElement.style.setProperty('--sidebar-bg', b.sidebarBg);
      document.documentElement.style.setProperty('--sidebar-text', b.sidebarText);
    } else {
      document.documentElement.style.setProperty('--brand-primary', '#e11d48');
      document.documentElement.style.setProperty('--brand-light', '#fb7185');
      document.documentElement.style.setProperty('--brand-dark', '#9f1239');
      document.documentElement.style.setProperty('--sidebar-bg', '#0f0f23');
      document.documentElement.style.setProperty('--sidebar-text', '#94a3b8');
    }
  }, [tenant]);

  if (!user) return null;

  const sections = getNavSections(user.rol);
  const rc = ROL_CONFIG[user.rol] || { label: user.rol, bg: 'bg-slate-500', color: 'text-slate-700' };
  const initials = (user.nombre || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const brandName = user.rol === 'superadmin' ? 'WorkShopOS' : (tenant?.nombre || 'Taller');
  const brandSlogan = user.rol === 'superadmin' ? 'Panel de Administración' : (tenant?.branding?.slogan || 'Gestión de Taller');
  const brandEmoji = user.rol === 'superadmin' ? '⚡' : (tenant?.branding?.logoEmoji || '🏭');
  const changePasswordPath = `/${user.rol === 'superadmin' ? 'admin' : user.rol}/cambiar-password`;

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: 'var(--sidebar-bg)' }}
      >
        {/* Brand section */}
        <div className="flex items-center gap-3 px-4 py-4 shrink-0">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--brand-light), var(--brand-primary))' }}
          >
            <span>{brandEmoji}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[14px] font-bold text-white leading-tight">{brandName}</h1>
            <p className="truncate text-[11px] leading-tight mt-0.5" style={{ color: 'var(--brand-light)' }}>
              {brandSlogan}
            </p>
          </div>
          <button
            className="ml-auto shrink-0 rounded-lg p-1 transition-colors hover:bg-white/10 lg:hidden"
            style={{ color: 'var(--sidebar-text)' }}
            onClick={() => setOpen(false)}
          >
            <X size={17} />
          </button>
        </div>

        {/* User card */}
        <div className="mx-3 mb-2 shrink-0 rounded-xl px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #334155, #1e293b)' }}
              >
                {initials}
              </div>
              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[--sidebar-bg] bg-emerald-400 block" style={{ borderColor: 'var(--sidebar-bg)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white leading-tight">{user.nombre}</p>
              <span
                className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white leading-none ${rc.bg}`}
              >
                {rc.label}
              </span>
            </div>
            {user.rol !== 'superadmin' && <NotificationBell userId={user.id} />}
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto pb-2 px-3">
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              {section.heading && (
                <p
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${sectionIdx === 0 ? 'mt-2' : 'mt-4'}`}
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {section.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className="group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : undefined,
                      color: isActive ? '#ffffff' : 'var(--sidebar-text)',
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active left accent bar */}
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-white"
                          />
                        )}
                        {/* Hover bg for inactive */}
                        {!isActive && (
                          <span className="absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                        )}
                        <span className="relative z-10 shrink-0">{item.icon}</span>
                        <span className="relative z-10 flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="relative z-10 ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: change password + logout */}
        <div className="shrink-0 px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="space-y-0.5">
            <NavLink
              to={changePasswordPath}
              onClick={() => setOpen(false)}
              className="group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : undefined,
                color: isActive ? '#ffffff' : 'var(--sidebar-text)',
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-white" />
                  )}
                  {!isActive && (
                    <span className="absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                  )}
                  <span className="relative z-10 shrink-0"><KeyRound size={16} /></span>
                  <span className="relative z-10">Cambiar Contraseña</span>
                </>
              )}
            </NavLink>

            <button
              onClick={logout}
              className="group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"
              style={{ color: 'var(--sidebar-text)' }}
            >
              <span className="absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
              <span className="relative z-10 shrink-0"><LogOut size={16} /></span>
              <span className="relative z-10">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b border-slate-700 bg-slate-800 px-4 py-2.5 lg:hidden shadow-sm">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-slate-700"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-base"
              style={{ background: 'linear-gradient(135deg, var(--brand-light), var(--brand-primary))' }}
            >
              <span>{brandEmoji}</span>
            </div>
            <span className="text-sm font-bold text-slate-100">{brandName}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {user.rol !== 'superadmin' && (
              <NotificationBell userId={user.id} light />
            )}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${rc.bg}`}>
              {rc.label}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6 lg:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
