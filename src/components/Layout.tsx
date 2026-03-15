import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROL_CONFIG } from '../types';
import type { Rol } from '../types';
import {
  LayoutDashboard, ClipboardList, Users, Factory, Wrench,
  LogOut, Menu, X, Building2, MessageCircle,
  FilePlus2, Ruler, CalendarDays, ListTodo,
  Package, Radio, FileText, PackageSearch, KeyRound,
} from 'lucide-react';

type NavItem = { to: string; label: string; icon: React.ReactNode; end?: boolean };

function getNav(rol: Rol): NavItem[] {
  switch (rol) {
    case 'jefe':
    case 'gerente': {
      const base = rol === 'gerente' ? '/gerente' : '/jefe';
      return [
        { to: base, label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
        { to: `${base}/ordenes`, label: 'Órdenes', icon: <ClipboardList size={18} /> },
        { to: `${base}/cotizaciones`, label: 'Cotizaciones', icon: <FileText size={18} /> },
        { to: `${base}/agenda`, label: 'Agenda', icon: <CalendarDays size={18} /> },
        { to: `${base}/tareas`, label: 'Tareas', icon: <ListTodo size={18} /> },
        { to: `${base}/gps`, label: 'GPS en Vivo', icon: <Radio size={18} /> },
        { to: `${base}/usuarios`, label: 'Usuarios', icon: <Users size={18} /> },
        { to: `${base}/productos`, label: 'Catálogo', icon: <Package size={18} /> },
        { to: '/chat', label: 'Chat', icon: <MessageCircle size={18} className="text-emerald-400" /> },
      ];
    }

    case 'coordinador':
      return [
        { to: '/coordinador', label: 'Centro de Control', icon: <LayoutDashboard size={18} />, end: true },
        { to: '/coordinador/agenda', label: 'Agenda', icon: <CalendarDays size={18} /> },
        { to: '/coordinador/tareas', label: 'Tareas', icon: <ListTodo size={18} /> },
        { to: '/coordinador/gps', label: 'GPS en Vivo', icon: <Radio size={18} /> },
        { to: '/coordinador/ordenes', label: 'Órdenes', icon: <ClipboardList size={18} /> },
        { to: '/coordinador/usuarios', label: 'Usuarios', icon: <Users size={18} /> },
        { to: '/coordinador/productos', label: 'Catálogo', icon: <Package size={18} /> },
        { to: '/chat', label: 'Chat', icon: <MessageCircle size={18} className="text-emerald-400" /> },
      ];

    case 'vendedor':
      return [
        { to: '/vendedor', label: 'Mis Pedidos', icon: <ClipboardList size={18} />, end: true },
        { to: '/vendedor/nueva', label: 'Nueva Cotización', icon: <FilePlus2 size={18} /> },
        { to: '/vendedor/medidas', label: 'Toma de Medidas', icon: <Ruler size={18} /> },
        { to: '/vendedor/productos', label: 'Catálogo', icon: <Package size={18} /> },
        { to: '/chat', label: 'Chat', icon: <MessageCircle size={18} className="text-emerald-400" /> },
      ];

    case 'fabricante':
      return [
        { to: '/fabricante', label: 'Cola de Producción', icon: <Factory size={18} />, end: true },
        { to: '/fabricante/solicitudes', label: 'Mis Solicitudes', icon: <PackageSearch size={18} /> },
        { to: '/chat', label: 'Chat', icon: <MessageCircle size={18} className="text-emerald-400" /> },
      ];

    case 'instalador':
      return [
        { to: '/instalador', label: 'Mis Instalaciones', icon: <Wrench size={18} />, end: true },
        { to: '/chat', label: 'Chat', icon: <MessageCircle size={18} className="text-emerald-400" /> },
      ];

    case 'superadmin':
      return [
        { to: '/admin', label: 'Talleres', icon: <Building2 size={18} />, end: true },
        { to: '/admin/usuarios', label: 'Usuarios', icon: <Users size={18} /> },
        { to: '/chat', label: 'Chat', icon: <MessageCircle size={18} className="text-emerald-400" /> },
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
  const items = getNav(user.rol);
  const rc = ROL_CONFIG[user.rol] || { label: user.rol, bg: 'bg-slate-500', color: 'text-slate-700' };
  const initials = (user.nombre || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const brandName = user.rol === 'superadmin' ? 'WorkShopOS' : (tenant?.nombre || 'Taller');
  const brandSlogan = user.rol === 'superadmin' ? 'Panel de Administración' : (tenant?.branding?.slogan || 'Gestión de Taller');
  const brandEmoji = user.rol === 'superadmin' ? '⚡' : (tenant?.branding?.logoEmoji || '🏭');

  return (
    <div className="flex h-screen bg-slate-50">
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: 'var(--sidebar-bg)' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 shrink-0">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ background: `linear-gradient(135deg, var(--brand-light), var(--brand-primary))` }}
          >
            <span>{brandEmoji}</span>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-bold text-white">{brandName}</h1>
            <p className="truncate text-[11px]" style={{ color: 'var(--sidebar-text)' }}>{brandSlogan}</p>
          </div>
          <button className="ml-auto shrink-0 lg:hidden" style={{ color: 'var(--sidebar-text)' }} onClick={() => setOpen(false)}>
            <X size={17} />
          </button>
        </div>

        {/* User card */}
        <div className="mx-3 mb-3 rounded-xl px-3 py-2.5 shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${rc.bg}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">{user.nombre}</p>
              <p className="text-[11px]" style={{ color: 'var(--sidebar-text)' }}>{rc.label}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto space-y-0.5 px-3 pb-2">
          {items.map(it => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'hover:text-white'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : undefined,
                color: isActive ? undefined : 'var(--sidebar-text)',
              })}
            >
              {it.icon}
              {it.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="shrink-0 space-y-0.5 px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <NavLink
            to={`/${user.rol === 'superadmin' ? 'admin' : user.rol}/cambiar-password`}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                isActive ? 'text-white' : 'hover:text-white'
              }`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : undefined,
              color: isActive ? undefined : 'var(--sidebar-text)',
            })}
          >
            <KeyRound size={16} /> Cambiar Contraseña
          </NavLink>
          <button onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors hover:bg-white/5 hover:text-white"
            style={{ color: 'var(--sidebar-text)' }}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">
          <button onClick={() => setOpen(true)} className="text-slate-600">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">{brandEmoji}</span>
            <span className="text-sm font-bold text-slate-800">{brandName}</span>
          </div>
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${rc.bg}`}>{rc.label}</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-5 lg:px-6 lg:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
