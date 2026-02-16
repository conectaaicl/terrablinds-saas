import { useState, useMemo } from 'react';
import { Store } from '../../data/store';
import type { Tenant, TenantBranding } from '../../types';
import {
  Building2, Users, ClipboardList, Plus, X, Eye, Settings,
  TrendingUp, CheckCircle2
} from 'lucide-react';

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

const EMOJI_OPTIONS = ['☀️', '🪵', '🏗️', '🏠', '🛋️', '🪟', '🎨', '🔨', '⚙️', '🏢', '🌿', '💎'];
const COLOR_PRESETS = [
  { name: 'Ámbar',     primary: '#d97706', light: '#fbbf24', dark: '#92400e', sidebar: '#0f172a', sidebarText: '#94a3b8' },
  { name: 'Esmeralda', primary: '#059669', light: '#34d399', dark: '#065f46', sidebar: '#1a1a2e', sidebarText: '#a0aec0' },
  { name: 'Azul',      primary: '#2563eb', light: '#60a5fa', dark: '#1e40af', sidebar: '#18181b', sidebarText: '#a1a1aa' },
  { name: 'Violeta',   primary: '#7c3aed', light: '#a78bfa', dark: '#5b21b6', sidebar: '#1e1b2e', sidebarText: '#a5b4fc' },
  { name: 'Rosa',      primary: '#db2777', light: '#f472b6', dark: '#9d174d', sidebar: '#1a1a2e', sidebarText: '#f9a8d4' },
  { name: 'Rojo',      primary: '#dc2626', light: '#f87171', dark: '#991b1b', sidebar: '#1c1917', sidebarText: '#a8a29e' },
  { name: 'Cyan',      primary: '#0891b2', light: '#22d3ee', dark: '#155e75', sidebar: '#0c1222', sidebarText: '#67e8f9' },
  { name: 'Naranja',   primary: '#ea580c', light: '#fb923c', dark: '#9a3412', sidebar: '#1c1917', sidebarText: '#fed7aa' },
];

// ═══════════════════════════════════════
// TALLERES (TENANTS)
// ═══════════════════════════════════════
export function AdminTalleres() {
  const [v, setV] = useState(0);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const tenants = useMemo(() => { void v; return Store.getTenants(); }, [v]);

  const bump = () => setV(x => x + 1);

  const globalStats = useMemo(() => {
    const allOrders = Store.getOrdenes();
    const allUsers = Store.getUsuarios().filter(u => u.rol !== 'superadmin');
    return {
      totalTenants: tenants.length,
      totalUsers: allUsers.length,
      totalOrders: allOrders.length,
      totalVentas: allOrders.reduce((s, o) => s + o.precioTotal, 0),
    };
  }, [tenants]);

  const openNew = () => {
    setEditing(null);
    setModal(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Talleres</h1>
          <p className="text-sm text-slate-500">Gestión multi-tenant · WorkShopOS</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-600">
          <Plus size={17} /> Nuevo Taller
        </button>
      </div>

      {/* Global KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Talleres', value: globalStats.totalTenants, icon: Building2, iconBg: 'bg-rose-100', iconColor: 'text-rose-600' },
          { label: 'Usuarios', value: globalStats.totalUsers, icon: Users, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
          { label: 'Órdenes', value: globalStats.totalOrders, icon: ClipboardList, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
          { label: 'Ventas Globales', value: fmt(globalStats.totalVentas), icon: TrendingUp, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{s.label}</span>
              <div className={`rounded-lg p-2 ${s.iconBg}`}><s.icon size={17} className={s.iconColor} /></div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tenants list */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tenants.map(t => {
          const users = Store.getUsuariosByTenant(t.id);
          const orders = Store.getOrdenes(t.id);
          const completadas = orders.filter(o => o.estado === 'instalado').length;
          const ventas = orders.reduce((s, o) => s + o.precioTotal, 0);

          return (
            <div key={t.id} className={`rounded-xl border bg-white shadow-sm transition hover:shadow-md ${t.activo ? 'border-slate-200' : 'border-red-200 opacity-60'}`}>
              {/* Header with brand colors */}
              <div className="rounded-t-xl p-4" style={{ background: `linear-gradient(135deg, ${t.branding.primaryColor}22, ${t.branding.primaryLight}22)` }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
                    style={{ background: `linear-gradient(135deg, ${t.branding.primaryLight}, ${t.branding.primaryColor})` }}>
                    {t.branding.logoEmoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">{t.nombre}</p>
                    <p className="truncate text-xs text-slate-500">{t.branding.slogan}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    t.plan === 'pro' ? 'bg-amber-100 text-amber-700' :
                    t.plan === 'basico' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {t.plan.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 px-4 py-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">{users.length}</p>
                  <p className="text-[10px] text-slate-400">Usuarios</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">{orders.length}</p>
                  <p className="text-[10px] text-slate-400">Órdenes</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">{completadas}</p>
                  <p className="text-[10px] text-slate-400">Instaladas</p>
                </div>
              </div>

              <div className="border-t border-slate-100 px-4 py-2">
                <p className="text-xs text-slate-500">Ventas: <span className="font-semibold text-slate-700">{fmt(ventas)}</span></p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
                <button onClick={() => setDetail(detail === t.id ? null : t.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <Eye size={13} /> Ver
                </button>
                <button onClick={() => openEdit(t)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <Settings size={13} /> Editar
                </button>
                <button onClick={() => { Store.updateTenant(t.id, { activo: !t.activo }); bump(); }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold ${
                    t.activo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}>
                  {t.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>

              {/* Detail expand */}
              {detail === t.id && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase text-slate-400">Usuarios del Taller</p>
                  <div className="space-y-1">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700">{u.nombre}</p>
                          <p className="truncate text-[10px] text-slate-400">{u.email}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u.rol === 'jefe' ? 'bg-amber-100 text-amber-700' :
                          u.rol === 'vendedor' ? 'bg-blue-100 text-blue-700' :
                          u.rol === 'fabricante' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-violet-100 text-violet-700'
                        }`}>{u.rol}</span>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-xs text-slate-400">Sin usuarios</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: New/Edit Tenant */}
      {modal && <TenantModal tenant={editing} onClose={() => setModal(false)} onSave={bump} />}
    </div>
  );
}

// ═══════════════════════════════════════
// TENANT MODAL (Create / Edit)
// ═══════════════════════════════════════
function TenantModal({ tenant, onClose, onSave }: { tenant: Tenant | null; onClose: () => void; onSave: () => void }) {
  const [nombre, setNombre] = useState(tenant?.nombre || '');
  const [slug, setSlug] = useState(tenant?.slug || '');
  const [slogan, setSlogan] = useState(tenant?.branding.slogan || '');
  const [plan, setPlan] = useState<Tenant['plan']>(tenant?.plan || 'trial');
  const [emoji, setEmoji] = useState(tenant?.branding.logoEmoji || '🏭');
  const [colorPreset, setColorPreset] = useState(0);

  const preset = COLOR_PRESETS[colorPreset];
  const branding: TenantBranding = tenant ? {
    ...tenant.branding,
    slogan,
    logoEmoji: emoji,
    ...(colorPreset >= 0 ? {
      primaryColor: preset.primary,
      primaryLight: preset.light,
      primaryDark: preset.dark,
      sidebarBg: preset.sidebar,
      sidebarText: preset.sidebarText,
    } : {}),
  } : {
    primaryColor: preset.primary,
    primaryLight: preset.light,
    primaryDark: preset.dark,
    sidebarBg: preset.sidebar,
    sidebarText: preset.sidebarText,
    logoEmoji: emoji,
    slogan,
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tenant) {
      Store.updateTenant(tenant.id, { nombre, slug, branding, plan });
    } else {
      const t = Store.addTenant({
        nombre, slug, branding, activo: true,
        fechaCreacion: new Date().toISOString().split('T')[0],
        plan,
      });
      // Create default Jefe
      Store.addUsuario({
        nombre: `Admin ${nombre}`,
        email: `admin@${slug}.cl`,
        password: '1234',
        rol: 'jefe',
        tenantId: t.id,
        activo: true,
      });
    }
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{tenant ? 'Editar Taller' : 'Nuevo Taller'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label>
              <input value={nombre} onChange={e => { setNombre(e.target.value); if (!tenant) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')); }}
                required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="Mi Taller" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Slug (URL)</label>
              <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="mitaller" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Slogan</label>
            <input value={slogan} onChange={e => setSlogan(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="Tu frase comercial" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Plan</label>
            <select value={plan} onChange={e => setPlan(e.target.value as Tenant['plan'])}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500">
              <option value="trial">Trial</option>
              <option value="basico">Básico</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          {/* Emoji picker */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-600">Ícono / Logo</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} type="button" onClick={() => setEmoji(e)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-lg transition ${
                    emoji === e ? 'border-rose-400 bg-rose-50' : 'border-slate-200 hover:border-slate-400'
                  }`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color preset */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-600">Paleta de Colores</label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((cp, i) => (
                <button key={cp.name} type="button" onClick={() => setColorPreset(i)}
                  className={`flex items-center gap-2 rounded-lg border-2 p-2 transition ${
                    colorPreset === i ? 'border-slate-800' : 'border-slate-200 hover:border-slate-400'
                  }`}>
                  <div className="h-5 w-5 rounded-full" style={{ backgroundColor: cp.primary }} />
                  <span className="text-[11px] font-medium text-slate-700">{cp.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase text-slate-400">Vista Previa</p>
            <div className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: branding.sidebarBg }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                style={{ background: `linear-gradient(135deg, ${branding.primaryLight}, ${branding.primaryColor})` }}>
                {emoji}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{nombre || 'Mi Taller'}</p>
                <p className="text-[11px]" style={{ color: branding.sidebarText }}>{slogan || 'Tu slogan aquí'}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-500 py-2 text-sm font-semibold text-white hover:bg-rose-600">
              <CheckCircle2 size={15} /> {tenant ? 'Guardar' : 'Crear Taller'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ADMIN USUARIOS (global)
// ═══════════════════════════════════════
export function AdminUsuarios() {
  const [v, setV] = useState(0);
  const usuarios = useMemo(() => { void v; return Store.getUsuarios().filter(u => u.rol !== 'superadmin'); }, [v]);
  const tenants = useMemo(() => Store.getTenants(), []);

  const toggle = (id: string, activo: boolean) => {
    Store.updateUsuario(id, { activo: !activo });
    setV(x => x + 1);
  };

  const getTenantName = (tid: string) => tenants.find(t => t.id === tid)?.nombre || tid;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Todos los Usuarios</h1>
        <p className="text-sm text-slate-500">{usuarios.length} usuarios en la plataforma</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="hidden px-4 py-3 md:table-cell">Taller</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map(u => (
              <tr key={u.id} className="transition hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{u.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{getTenantName(u.tenantId)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    u.rol === 'jefe' ? 'bg-amber-100 text-amber-700' :
                    u.rol === 'vendedor' ? 'bg-blue-100 text-blue-700' :
                    u.rol === 'fabricante' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-violet-100 text-violet-700'
                  }`}>{u.rol}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(u.id, u.activo)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      u.activo ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
