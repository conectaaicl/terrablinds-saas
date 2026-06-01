import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import { ROL_CONFIG } from '../../types';
import type { Rol } from '../../types';
import {
  Building2, ClipboardList, Plus, X, Eye, Settings,
  TrendingUp, CheckCircle2, KeyRound, Copy, Check,
  Globe, Palette, User, Sparkles, ChevronRight, Star, Zap,
  ShieldCheck, Rocket, Crown,
} from 'lucide-react';

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

// Admin Talleres - Ultra-PRO
export function AdminTalleres() {
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const { data: tenants, loading, error, refetch } = useApi(() => api.getTenants());
  const { execute: updateTenant, loading: updating } = useMutation(api.updateTenant);

  const tenantList: any[] = tenants || [];

  const openNew = () => { setEditingId(null); setModal(true); };
  const openEdit = (id: string) => { setEditingId(id); setModal(true); };

  const toggleActivo = async (t: any) => {
    await updateTenant(t.id, { activo: !t.activo });
    refetch();
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d0d1f] via-[#111130] to-[#0d0d1f] p-8 shadow-2xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-indigo-400/8 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5">
              <Crown size={13} className="text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">SuperAdmin · ConectaWork</span>
            </div>
            <h1 className="text-3xl font-black text-white">
              Gestión de <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Talleres</span>
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">Administra todos los tenants del sistema multi-taller.</p>
          </div>
          <button
            onClick={openNew}
            className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-500 hover:to-violet-500 hover:scale-[1.03] hover:shadow-indigo-500/40 active:scale-[0.98]"
          >
            <Plus size={17} className="transition-transform group-hover:rotate-90" />
            Nuevo Taller
          </button>
        </div>
        {/* KPI Strip */}
        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Talleres totales', value: tenantList.length, icon: Building2, grad: 'from-indigo-500/20 to-indigo-600/10', text: 'text-indigo-300', border: 'border-indigo-500/20' },
            { label: 'Activos', value: tenantList.filter(t => t.activo).length, icon: CheckCircle2, grad: 'from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-300', border: 'border-emerald-500/20' },
            { label: 'Plan Pro', value: tenantList.filter(t => t.plan === 'pro').length, icon: TrendingUp, grad: 'from-amber-500/20 to-amber-600/10', text: 'text-amber-300', border: 'border-amber-500/20' },
            { label: 'Trial', value: tenantList.filter(t => t.plan === 'trial').length, icon: ClipboardList, grad: 'from-slate-500/20 to-slate-600/10', text: 'text-slate-300', border: 'border-slate-500/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border ${s.border} bg-gradient-to-br ${s.grad} backdrop-blur-sm p-4`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{s.label}</span>
                <s.icon size={15} className={s.text} />
              </div>
              <p className={`mt-2 text-2xl font-black ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tenants Grid */}
      {tenantList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-2xl">🏭</div>
          <p className="font-semibold text-slate-300">Sin talleres aún</p>
          <p className="mt-1 text-sm text-slate-500">Crea el primer taller para comenzar</p>
          <button onClick={openNew} className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-colors">
            <Plus size={16} /> Crear primer taller
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tenantList.map(t => {
            const branding = t.branding || {};
            const isActive = t.activo;
            return (
              <div
                key={t.id}
                className={`group relative overflow-hidden rounded-2xl border bg-white/[0.03] shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
                  isActive
                    ? 'border-white/10 hover:border-indigo-500/40 hover:shadow-indigo-500/10'
                    : 'border-red-500/20 opacity-55'
                }`}
              >
                {isActive && (
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${branding.primaryColor || '#6366f1'}18 0%, transparent 60%)` }} />
                )}
                {/* Header */}
                <div className="relative p-5 pb-4"
                  style={{ background: `linear-gradient(135deg, ${branding.primaryColor || '#6366f1'}22, ${branding.primaryLight || '#818cf8'}11)` }}>
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${branding.primaryLight || '#818cf8'}, ${branding.primaryColor || '#6366f1'})` }}>
                      {branding.logoEmoji || '🏭'}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="font-bold text-white leading-tight">{t.nombre}</p>
                      <p className="truncate text-xs text-slate-400 mt-0.5">{branding.slogan || t.slug}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                      t.plan === 'pro' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      t.plan === 'basico' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                      'bg-slate-500/20 text-slate-400 border border-slate-500/20'
                    }`}>
                      {(t.plan || 'trial').toUpperCase()}
                    </span>
                  </div>
                </div>
                {/* Info */}
                <div className="px-5 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Globe size={11} />
                    <span className="font-mono text-slate-400">/{t.slug}</span>
                    {t.fecha_creacion && (
                      <span className="ml-auto">{new Date(t.fecha_creacion).toLocaleDateString('es-CL')}</span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2 px-5 py-4">
                  <button onClick={() => setDetail(detail === t.id ? null : t.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white">
                    <Eye size={13} /> Ver
                  </button>
                  <button onClick={() => openEdit(t.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300">
                    <Settings size={13} /> Editar
                  </button>
                  <button onClick={() => toggleActivo(t)} disabled={updating}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition disabled:opacity-40 ${
                      isActive
                        ? 'border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}>
                    {isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
                {detail === t.id && <TenantUsersPanel tenantId={t.id} />}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <TenantModal
          tenantId={editingId}
          tenants={tenantList}
          onClose={() => setModal(false)}
          onSave={refetch}
        />
      )}
    </div>
  );
}

function TenantUsersPanel({ tenantId }: { tenantId: string }) {
  const { data: users, loading } = useApi(() => api.getUsers(tenantId), [tenantId]);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { execute: resetPwd, loading: resetting } = useMutation(api.resetUserPassword);
  const userList: any[] = users || [];

  const handleReset = async (u: any) => {
    const res = await resetPwd(u.id);
    if (res) setResetResult({ email: u.email, password: res.new_password });
  };

  const copyEmail = (id: number, email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="border-t border-white/5 px-5 py-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Usuarios del Taller</p>
      {resetResult && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-[11px] font-bold text-amber-300 mb-1">Contraseña reseteada</p>
          <p className="font-mono text-[11px] text-amber-200">{resetResult.email}</p>
          <p className="font-mono text-sm font-bold text-amber-100">{resetResult.password}</p>
          <button onClick={() => setResetResult(null)} className="mt-1 text-[10px] text-amber-500 hover:text-amber-300 underline">cerrar</button>
        </div>
      )}
      {loading ? (
        <p className="text-xs text-slate-500">Cargando...</p>
      ) : (
        <div className="space-y-1.5">
          {userList.map(u => {
            const rc = ROL_CONFIG[u.rol as Rol] || ROL_CONFIG.vendedor;
            return (
              <div key={u.id} className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06]">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-200">{u.nombre}</p>
                  <button onClick={() => copyEmail(u.id, u.email)}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors" title="Copiar email">
                    {copiedId === u.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    <span className="truncate">{u.email}</span>
                  </button>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${rc.bg}`}>{u.rol}</span>
                <button onClick={() => handleReset(u)} disabled={resetting} title="Resetear contraseña"
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-500 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-400 transition-all disabled:opacity-40">
                  <KeyRound size={12} />
                </button>
              </div>
            );
          })}
          {userList.length === 0 && <p className="text-xs text-slate-500">Sin usuarios registrados</p>}
        </div>
      )}
    </div>
  );
}

// Tenant Modal - Ultra-PRO
const PLAN_OPTIONS = [
  { value: 'trial', label: 'Trial', price: 'Gratis', period: '14 días', icon: Zap,
    features: ['2 usuarios', 'Cotizaciones ilimitadas', 'Chat interno'],
    activeAccent: 'border-indigo-500 bg-indigo-500/10 shadow-indigo-500/20', badge: '' },
  { value: 'basico', label: 'Básico', price: '$29.990', period: '/mes', icon: Star,
    features: ['5 usuarios', 'Todos los roles', 'GPS instaladores', 'Dashboard'],
    activeAccent: 'border-indigo-500 bg-indigo-500/10 shadow-indigo-500/20', badge: '' },
  { value: 'pro', label: 'Pro', price: '$59.990', period: '/mes', icon: Sparkles,
    features: ['Usuarios ilimitados', 'Multi-sucursal', 'API acceso', 'Onboarding personalizado'],
    activeAccent: 'border-violet-500 bg-violet-500/10 shadow-violet-500/20', badge: 'Popular' },
] as const;

function TenantModal({ tenantId, tenants, onClose, onSave }: {
  tenantId: string | null;
  tenants: any[];
  onClose: () => void;
  onSave: () => void;
}) {
  const tenant = tenants.find(t => t.id === tenantId) || null;
  const [nombre, setNombre] = useState(tenant?.nombre || '');
  const [slug, setSlug] = useState(tenant?.slug || '');
  const [slogan, setSlogan] = useState(tenant?.branding?.slogan || '');
  const [logoUrl, setLogoUrl] = useState((tenant?.branding as any)?.logo_url || '');
  const [plan, setPlan] = useState<'trial' | 'basico' | 'pro'>(tenant?.plan || 'trial');
  const [emoji, setEmoji] = useState(tenant?.branding?.logoEmoji || '🏭');
  const [colorPreset, setColorPreset] = useState(0);
  const [jefeNombre, setJefeNombre] = useState('');
  const [jefeEmail, setJefeEmail] = useState('');
  const [jefePassword, setJefePassword] = useState('');
  const [createdJefe, setCreatedJefe] = useState<{ email: string; password: string } | null>(null);
  const [step, setStep] = useState<'info' | 'brand' | 'jefe'>('info');

  const { execute: createTenant, loading: creating, error: createErr } = useMutation(api.createTenant);
  const { execute: updateTenant, loading: updating, error: updateErr } = useMutation(api.updateTenant);

  const preset = COLOR_PRESETS[colorPreset];
  const branding = {
    ...(tenant?.branding || {}),
    slogan, logoEmoji: emoji,
    logo_url: logoUrl || undefined,
    primaryColor: preset.primary, primaryLight: preset.light, primaryDark: preset.dark,
    sidebarBg: preset.sidebar, sidebarText: preset.sidebarText,
  };

  const handleNombre = (v: string) => {
    setNombre(v);
    if (!tenant) {
      setSlug(v.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9.-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''));
    }
  };

  const handleSlug = (v: string) => setSlug(v.toLowerCase().replace(/[^a-z0-9.-]/g, ''));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant && step !== 'jefe') {
      const stepOrder = ['info', 'brand', 'jefe'];
      const currIdx = stepOrder.indexOf(step);
      if (currIdx < stepOrder.length - 1) setStep(stepOrder[currIdx + 1] as any);
      return;
    }
    if (tenant) {
      const res = await updateTenant(tenant.id, { nombre, slug, branding, plan });
      if (res) { onSave(); onClose(); }
    } else {
      const payload: any = { id: slug, nombre, slug, branding, activo: true, plan };
      if (jefeNombre.trim()) payload.jefe_nombre = jefeNombre.trim();
      if (jefeEmail.trim()) payload.jefe_email = jefeEmail.trim();
      if (jefePassword.trim()) payload.jefe_password = jefePassword.trim();
      const res = await createTenant(payload);
      if (res) {
        onSave();
        if (res.jefe_password) setCreatedJefe({ email: jefeEmail.trim(), password: res.jefe_password });
        else onClose();
      }
    }
  };

  const loading = creating || updating;
  const err = createErr || updateErr;
  const steps = tenant
    ? [{ id: 'info', label: 'Datos', icon: Building2 }, { id: 'brand', label: 'Marca', icon: Palette }]
    : [{ id: 'info', label: 'Datos', icon: Building2 }, { id: 'brand', label: 'Marca', icon: Palette }, { id: 'jefe', label: 'Jefe', icon: User }];
  const stepIdx = steps.findIndex(s => s.id === step);

  if (createdJefe) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#111130] to-[#0d0d1f] p-8 shadow-2xl">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-violet-600/15 blur-3xl" />
          <div className="relative mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/30 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 size={36} className="text-emerald-400" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 mb-3">
              <Rocket size={12} className="text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Taller creado</span>
            </div>
            <h2 className="text-2xl font-black text-white">Listo para operar</h2>
            <p className="mt-2 text-sm text-slate-400">Comparte estas credenciales con el jefe del taller. Solo se muestran una vez.</p>
          </div>
          <div className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 space-y-3 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} className="text-amber-400" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Credenciales generadas</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Email</p>
              <p className="font-mono text-sm font-semibold text-slate-100">{createdJefe.email}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Contrasena temporal</p>
              <p className="font-mono text-xl font-black text-amber-300">{createdJefe.password}</p>
            </div>
            <p className="flex items-start gap-2 text-[11px] text-amber-500">
              <span className="shrink-0 mt-0.5">!</span> Guarda estas credenciales ahora. No se mostrarán de nuevo.
            </p>
          </div>
          <button onClick={onClose}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-500 hover:to-violet-500 hover:scale-[1.02] active:scale-[0.98]">
            Entendido, cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-6 backdrop-blur-md sm:items-center" onClick={onClose}>
      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#111130] to-[#0d0d1f] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-lg"
              style={{ background: `linear-gradient(135deg, ${branding.primaryLight}, ${branding.primaryColor})` }}>
              {emoji}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{tenant ? 'Editar Taller' : 'Nuevo Taller'}</h2>
              <p className="text-[11px] text-slate-500 font-mono">{nombre || 'Sin nombre'} · /{slug || '...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-500 transition hover:border-white/20 hover:bg-white/5 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Stepper */}
        <div className="relative flex border-b border-white/[0.08] px-6">
          {steps.map((s, i) => (
            <button key={s.id} type="button" onClick={() => setStep(s.id as any)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-semibold transition-colors ${
                step === s.id ? 'border-indigo-500 text-indigo-300'
                : i < stepIdx ? 'border-transparent text-emerald-500 hover:text-emerald-400'
                : 'border-transparent text-slate-600 hover:text-slate-400'
              }`}>
              <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black transition-all ${
                step === s.id ? 'bg-indigo-600 text-white'
                : i < stepIdx ? 'bg-emerald-600/30 text-emerald-400'
                : 'bg-white/5 text-slate-600'
              }`}>
                {i < stepIdx ? <Check size={10} /> : i + 1}
              </div>
              {s.label}
            </button>
          ))}
        </div>

        {err && (
          <div className="mx-6 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{err}</div>
        )}

        <form onSubmit={submit}>
          <div className="relative max-h-[62vh] overflow-y-auto px-6 py-6">

            {/* Step 1: Datos */}
            {step === 'info' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre del Taller <span className="text-red-400">*</span></label>
                    <input value={nombre} onChange={e => handleNombre(e.target.value)} required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-indigo-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Ej: TerraBlinds" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Slogan</label>
                    <input value={slogan} onChange={e => setSlogan(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-indigo-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Calidad que se ve" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">URL del Logo <span className="font-normal text-slate-600 normal-case">(cotizaciones PDF)</span></label>
                    <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-indigo-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="https://ejemplo.com/logo.png" />
                    {logoUrl && (
                      <img src={logoUrl} alt="preview" className="mt-2 h-10 object-contain rounded-lg border border-white/10"
                        onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Slug / ID <span className="text-red-400">*</span></label>
                  <div className="flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 transition focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <span className="flex items-center gap-1.5 border-r border-white/10 px-4 py-3 text-xs font-mono text-slate-500">
                      <Globe size={12} /> app/
                    </span>
                    <input value={slug} onChange={e => handleSlug(e.target.value)} required
                      className="flex-1 bg-transparent px-4 py-3 text-sm font-mono text-white placeholder-slate-600 outline-none"
                      placeholder="mi-taller" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-600">Solo letras minúsculas, números, guiones y puntos.</p>
                </div>
                <div>
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-slate-400">Plan</label>
                  <div className="grid grid-cols-3 gap-3">
                    {PLAN_OPTIONS.map(p => {
                      const isSelected = plan === p.value;
                      return (
                        <button key={p.value} type="button" onClick={() => setPlan(p.value)}
                          className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all duration-200 ${
                            isSelected ? `${p.activeAccent} shadow-lg` : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                          }`}>
                          {p.badge && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow">
                              {p.badge}
                            </span>
                          )}
                          <p.icon size={20} className={isSelected ? 'text-indigo-400' : 'text-slate-500'} />
                          <div className="text-center">
                            <p className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-400'}`}>{p.label}</p>
                            <p className={`text-lg font-black mt-0.5 ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`}>{p.price}</p>
                            <p className={`text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-600'}`}>{p.period}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600">
                              <Check size={9} className="text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Branding */}
            {step === 'brand' && (
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-slate-400">Icono del Taller</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map(e => (
                      <button key={e} type="button" onClick={() => setEmoji(e)}
                        className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-xl transition-all ${
                          emoji === e
                            ? 'border-indigo-500 bg-indigo-500/20 scale-110 shadow-lg shadow-indigo-500/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-slate-400">Paleta de Colores</label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {COLOR_PRESETS.map((cp, i) => (
                      <button key={cp.name} type="button" onClick={() => setColorPreset(i)}
                        className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                          colorPreset === i ? 'border-white/30 bg-white/10 shadow-lg' : 'border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]'
                        }`}>
                        <div className="flex gap-1.5">
                          <div className="h-5 w-5 rounded-full shadow-sm ring-1 ring-white/10" style={{ backgroundColor: cp.primary }} />
                          <div className="h-5 w-5 rounded-full shadow-sm ring-1 ring-white/10" style={{ backgroundColor: cp.sidebar }} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">{cp.name}</span>
                        {colorPreset === i && (
                          <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 shadow">
                            <Check size={9} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10 shadow-xl">
                  <div className="border-b border-white/5 bg-white/[0.03] px-4 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vista previa del sidebar</p>
                  </div>
                  <div className="p-2" style={{ backgroundColor: branding.sidebarBg }}>
                    <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${branding.primaryLight}, ${branding.primaryColor})` }}>
                        {emoji}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{nombre || 'Mi Taller'}</p>
                        <p className="text-[11px]" style={{ color: branding.sidebarText }}>{slogan || 'Tu slogan aquí'}</p>
                      </div>
                    </div>
                    {['Dashboard', 'Ordenes', 'Clientes'].map((item, i) => (
                      <div key={item} className={`mx-1 mb-0.5 flex items-center gap-2 rounded-lg px-3 py-2 ${i === 0 ? 'bg-white/10' : ''}`}>
                        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: i === 0 ? branding.primaryColor : 'transparent', opacity: 0.8 }} />
                        <span className="text-[11px]" style={{ color: i === 0 ? '#fff' : branding.sidebarText }}>{item}</span>
                      </div>
                    ))}
                    <div className="h-2" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Jefe */}
            {step === 'jefe' && !tenant && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.08] p-5">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/20">
                      <User size={18} className="text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-indigo-200">Usuario Jefe del Taller</p>
                      <p className="mt-1 text-xs text-indigo-400 leading-relaxed">
                        Completa estos campos para crear automáticamente el usuario jefe con acceso completo al sistema.
                        Es opcional — puedes crearlo después desde el panel de usuarios.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: ShieldCheck, text: 'Sin contrato' },
                    { icon: Rocket, text: 'Setup en 24h' },
                    { icon: Sparkles, text: 'Soporte incluido' },
                  ].map(b => (
                    <div key={b.text} className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-2.5">
                      <b.icon size={13} className="shrink-0 text-emerald-400" />
                      <span className="text-[11px] font-semibold text-emerald-300">{b.text}</span>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre completo</label>
                    <input value={jefeNombre} onChange={e => setJefeNombre(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-indigo-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Juan Pérez" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Email</label>
                    <input type="email" value={jefeEmail} onChange={e => setJefeEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-indigo-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="jefe@mitaller.cl" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Contrasena <span className="font-normal text-slate-600 normal-case">(opcional — se genera si queda vacía)</span>
                    </label>
                    <input type="text" value={jefePassword} onChange={e => setJefePassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-indigo-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Contrasena del jefe..." />
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-4 py-3">
                  <span className="text-amber-400 mt-0.5 shrink-0">!</span>
                  <p className="text-xs text-amber-400 leading-relaxed">
                    Las credenciales generadas se muestran <strong>una sola vez</strong> al crear el taller. Tenlas a mano.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/[0.08] px-6 py-5">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white">
              Cancelar
            </button>
            <div className="flex items-center gap-2.5">
              {stepIdx > 0 && (
                <button type="button" onClick={() => setStep(steps[stepIdx - 1].id as any)}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white">
                  Atrás
                </button>
              )}
              {stepIdx < steps.length - 1 ? (
                <button type="button" onClick={() => setStep(steps[stepIdx + 1].id as any)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 hover:scale-[1.02] active:scale-[0.98]">
                  Siguiente <ChevronRight size={15} />
                </button>
              ) : (
                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100">
                  <CheckCircle2 size={15} />
                  {loading ? 'Guardando...' : (tenant ? 'Guardar cambios' : 'Crear Taller')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Admin Usuarios (global)
export function AdminUsuarios() {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const { data: tenants, loading: loadingTenants } = useApi(() => api.getTenants());
  const { data: users, loading: loadingUsers, refetch } = useApi(
    () => selectedTenant ? api.getUsers(selectedTenant) : Promise.resolve([]),
    [selectedTenant]
  );
  const { execute: toggleUser } = useMutation(api.toggleUser);
  const { execute: resetPwd, loading: resetting } = useMutation(api.resetUserPassword);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const tenantList: any[] = tenants || [];
  const userList: any[] = users || [];

  const toggle = async (id: number) => { await toggleUser(id); refetch(); };
  const handleReset = async (u: any) => {
    const res = await resetPwd(u.id);
    if (res) setResetResult({ email: u.email, password: res.new_password });
  };
  const copyEmail = (id: number, email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
        <p className="text-sm text-slate-500">Selecciona un taller para ver sus usuarios</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Filtrar por Taller</label>
        <select value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" disabled={loadingTenants}>
          <option value="">— Selecciona un taller —</option>
          {tenantList.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </div>
      {selectedTenant && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          {loadingUsers ? (
            <div className="p-8 text-center text-sm text-slate-400">Cargando usuarios...</div>
          ) : (
            <>
            {resetResult && (
              <div className="m-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <KeyRound size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-amber-800">Contrasena restablecida</p>
                  <p className="text-amber-700">{resetResult.email}</p>
                  <p className="mt-1 font-mono font-bold text-amber-900">{resetResult.password}</p>
                </div>
                <button onClick={() => setResetResult(null)} className="text-amber-400 hover:text-amber-600"><X size={14} /></button>
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userList.map(u => {
                  const rc = ROL_CONFIG[u.rol as Rol] || ROL_CONFIG.vendedor;
                  return (
                    <tr key={u.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{u.nombre}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">{u.email}</span>
                          <button onClick={() => copyEmail(u.id, u.email)} className="shrink-0 text-slate-300 transition hover:text-slate-600" title="Copiar email">
                            {copiedId === u.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${rc.bg}`}>{u.rol}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggle(u.id)}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${u.activo ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleReset(u)} disabled={resetting}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50" title="Restablecer contrasena">
                          <KeyRound size={11} /> Reset pwd
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </>
          )}
          {!loadingUsers && userList.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">Sin usuarios en este taller</div>
          )}
        </div>
      )}
    </div>
  );
}
