import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROL_CONFIG } from '../types';
import type { Rol } from '../types';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Factory,
  Wrench,
  LogOut,
  Menu,
  X,
  Building2,
  MessageCircle,
  MapPin,
  FilePlus2,
  Ruler,
} from 'lucide-react';

type NavItem = { to: string; label: string; icon: React.ReactNode; end?: boolean };

function getNav(rol: Rol): NavItem[] {
  switch (rol) {
    case 'jefe':
    case 'gerente':
      return [
        { to: rol === 'gerente' ? '/gerente' : '/jefe', label: 'Dashboard', icon: <LayoutDashboard size={19} />, end: true },
        { to: rol === 'gerente' ? '/gerente/ordenes' : '/jefe/ordenes', label: 'Órdenes', icon: <ClipboardList size={19} /> },
        { to: rol === 'gerente' ? '/gerente/usuarios' : '/jefe/usuarios', label: 'Usuarios', icon: <Users size={19} /> },
        { to: '/chat', label: 'Chat', icon: <MessageCircle size={19} className="text-emerald-400" /> },
      ];
    case 'vendedor':
      return [
        { to: '/vendedor', label: 'Mis Pedidos', icon: <ClipboardList size={19} />, end: true },
        { to: '/vendedor/nueva', label: 'Nueva Cotización', icon: <FilePlus2 size={19} /> },
        { to: '/vendedor/medidas', label: 'Toma de Medidas', icon: <Ruler size={19} /> },
        { to: '/chat', label: 'Chat', icon: <MessageCircle size={19} className="text-emerald-400" /> },
      ];
    case 'fabricante':
      return [
        { to: '/fabricante', label: 'Producción', icon: <Factory size={19} />, end: true },
        { to: '/chat', label: 'Chat', icon: <MessageCircle size={19} className="text-emerald-400" /> },
      ];
    case 'instalador':
      return [
        { to: '/instalador', label: 'Instalaciones', icon: <MapPin size={19} />, end: true },
        { to: '/chat', label: 'Chat', icon: <MessageCircle size={19} className="text-emerald-400" /> },
      ];
    case 'coordinador':
      return [
        { to: '/coordinador',          label: 'Dashboard',  icon: <LayoutDashboard size={19} />, end: true },
        { to: '/coordinador/ordenes',  label: 'Órdenes',    icon: <ClipboardList size={19} /> },
        { to: '/coordinador/usuarios', label: 'Usuarios',   icon: <Users size={19} /> },
        { to: '/chat',                 label: 'Chat',       icon: <MessageCircle size={19} className="text-emerald-400" /> },
      ];
    case 'superadmin':
      return [
        { to: '/admin', label: 'Talleres', icon: <Building2 size={19} />, end: true },
        { to: '/admin/usuarios', label: 'Usuarios', icon: <Users size={19} /> },
        { to: '/chat', label: 'Chat', icon: <MessageCircle size={19} className="text-emerald-400" /> },
      ];
    default:
      return [];
  }
}

export default function Layout() {
  const { user, tenant, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Apply tenant branding as CSS custom properties
  useEffect(() => {
    if (tenant?.branding) {
      const b = tenant.branding;
      document.documentElement.style.setProperty('--brand-primary', b.primaryColor);
      document.documentElement.style.setProperty('--brand-light', b.primaryLight);
      document.documentElement.style.setProperty('--brand-dark', b.primaryDark);
      document.documentElement.style.setProperty('--sidebar-bg', b.sidebarBg);
      document.documentElement.style.setProperty('--sidebar-text', b.sidebarText);
    } else {
      // Super admin defaults
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

  const initials = (user.nombre || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const brandName = user.rol === 'superadmin' ? 'WorkShopOS' : (tenant?.nombre || 'Taller');
  const brandSlogan = user.rol === 'superadmin' ? 'Panel de Administración' : (tenant?.branding?.slogan || 'Gestión de Taller');
  const brandEmoji = user.rol === 'superadmin' ? '⚡' : (tenant?.branding?.logoEmoji || '🏭');

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: 'var(--sidebar-bg)' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
            style={{ background: `linear-gradient(135deg, var(--brand-light), var(--brand-primary))` }}
          >
            <span>{brandEmoji}</span>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold text-white">{brandName}</h1>
            <p className="truncate text-[11px]" style={{ color: 'var(--sidebar-text)' }}>{brandSlogan}</p>
          </div>
          <button className="ml-auto lg:hidden" style={{ color: 'var(--sidebar-text)' }} onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* User card */}
        <div className="mx-4 mb-4 rounded-lg px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${rc.bg}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.nombre}</p>
              <p className="text-[11px]" style={{ color: 'var(--sidebar-text)' }}>{rc.label}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3">
          {items.map(it => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'hover:text-white'
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
        <div className="space-y-0.5 px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-white/5 hover:text-white"
            style={{ color: 'var(--sidebar-text)' }}>
            <LogOut size={17} /> Cerrar Sesión
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
