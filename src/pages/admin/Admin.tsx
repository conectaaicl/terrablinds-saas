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

// ═══════════════════════════════════════
// TALLERES (TENANTS)
// ═══════════════════════════════════════
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
          { label: 'Talleres', value: tenantList.length, icon: Building2, iconBg: 'bg-rose-100', iconColor: 'text-rose-600' },
          { label: 'Activos', value: tenantList.filter(t => t.activo).length, icon: CheckCircle2, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
          { label: 'Plan Pro', value: tenantList.filter(t => t.plan === 'pro').length, icon: TrendingUp, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
          { label: 'Trial', value: tenantList.filter(t => t.plan === 'trial').length, icon: ClipboardList, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
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
        {tenantList.map(t => {
          const branding = t.branding || {};
          return (
            <div key={t.id} className={`rounded-xl border bg-white shadow-sm transition hover:shadow-md ${t.activo ? 'border-slate-200' : 'border-red-200 opacity-60'}`}>
              {/* Header with brand colors */}
              <div className="rounded-t-xl p-4" style={{ background: `linear-gradient(135deg, ${branding.primaryColor || '#e11d48'}22, ${branding.primaryLight || '#fb7185'}22)` }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
                    style={{ background: `linear-gradient(135deg, ${branding.primaryLight || '#fb7185'}, ${branding.primaryColor || '#e11d48'})` }}>
                    {branding.logoEmoji || '🏭'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">{t.nombre}</p>
                    <p className="truncate text-xs text-slate-500">{branding.slogan || t.slug}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    t.plan === 'pro' ? 'bg-amber-100 text-amber-700' :
                    t.plan === 'basico' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {(t.plan || 'trial').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="px-4 py-3">
                <p className="text-xs text-slate-500">
                  Slug: <span className="font-mono text-slate-700">{t.slug}</span>
                </p>
                {t.fecha_creacion && (
                  <p className="text-xs text-slate-400">
                    Creado: {new Date(t.fecha_creacion).toLocaleDateString('es-CL')}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
                <button onClick={() => setDetail(detail === t.id ? null : t.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <Eye size={13} /> Ver
                </button>
                <button onClick={() => openEdit(t.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <Settings size={13} /> Editar
                </button>
                <button onClick={() => toggleActivo(t)} disabled={updating}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold ${
                    t.activo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}>
                  {t.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>

              {/* Expand: users per tenant */}
              {detail === t.id && (
                <TenantUsersPanel tenantId={t.id} />
              )}
            </div>
          );
        })}
      </div>

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

// Subpanel que carga usuarios de un tenant específico
function TenantUsersPanel({ tenantId }: { tenantId: string }) {
  const { data: users, loading } = useApi(
    () => api.getUsers(tenantId),
    [tenantId]
  );
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
    <div className="border-t border-slate-100 px-4 py-3">
      <p className="mb-2 text-[11px] font-semibold uppercase text-slate-400">Usuarios del Taller</p>

      {resetResult && (
        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-[11px] font-bold text-amber-700 mb-1">Contraseña reseteada</p>
          <p className="font-mono text-[11px] text-amber-900">{resetResult.email}</p>
          <p className="font-mono text-sm font-bold text-amber-900">{resetResult.password}</p>
          <button onClick={() => setResetResult(null)} className="mt-1 text-[10px] text-amber-600 underline">cerrar</button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-400">Cargando...</p>
      ) : (
        <div className="space-y-1">
          {userList.map(u => {
            const rc = ROL_CONFIG[u.rol as Rol] || ROL_CONFIG.vendedor;
            return (
              <div key={u.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-700">{u.nombre}</p>
                  <button
                    onClick={() => copyEmail(u.id, u.email)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                    title="Copiar email"
                  >
                    {copiedId === u.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                    <span className="truncate">{u.email}</span>
                  </button>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${rc.bg}`}>
                  {u.rol}
                </span>
                <button
                  onClick={() => handleReset(u)}
                  disabled={resetting}
                  title="Resetear contraseña"
                  className="shrink-0 rounded-md bg-slate-200 p-1 text-slate-500 hover:bg-amber-100 hover:text-amber-700 transition-colors disabled:opacity-40"
                >
                  <KeyRound size={12} />
                </button>
              </div>
            );
          })}
          {userList.length === 0 && <p className="text-xs text-slate-400">Sin usuarios</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// TENANT MODAL (Create / Edit) — PRO
// ═══════════════════════════════════════
const PLAN_OPTIONS = [
  { value: 'trial',  label: 'Trial',  desc: 'Gratis 14 días', icon: Zap,  colors: 'border-slate-300 bg-slate-50 text-slate-700' },
  { value: 'basico', label: 'Básico', desc: 'Hasta 3 usuarios', icon: Star, colors: 'border-blue-300 bg-blue-50 text-blue-700' },
  { value: 'pro',    label: 'Pro',    desc: 'Ilimitado + IA',  icon: Sparkles, colors: 'border-amber-300 bg-amber-50 text-amber-700' },
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
  const [createdJefe, setCreatedJefe] = useState<{ email: string; password: string } | null>(null);
  const [step, setStep] = useState<'info' | 'brand' | 'jefe'>('info');

  const { execute: createTenant, loading: creating, error: createErr } = useMutation(api.createTenant);
  const { execute: updateTenant, loading: updating, error: updateErr } = useMutation(api.updateTenant);

  const preset = COLOR_PRESETS[colorPreset];
  const branding = {
    ...(tenant?.branding || {}),
    slogan,
    logoEmoji: emoji,
    logo_url: logoUrl || undefined,
    primaryColor: preset.primary,
    primaryLight: preset.light,
    primaryDark: preset.dark,
    sidebarBg: preset.sidebar,
    sidebarText: preset.sidebarText,
  };

  const handleNombre = (v: string) => {
    setNombre(v);
    if (!tenant) {
      setSlug(v.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9.-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''));
    }
  };

  const handleSlug = (v: string) => {
    // Allow a-z, 0-9, hyphens and dots (for domain-style slugs like roller.now)
    setSlug(v.toLowerCase().replace(/[^a-z0-9.-]/g, ''));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tenant) {
      const res = await updateTenant(tenant.id, { nombre, slug, branding, plan });
      if (res) { onSave(); onClose(); }
    } else {
      const payload: any = { id: slug, nombre, slug, branding, activo: true, plan };
      if (jefeNombre.trim()) payload.jefe_nombre = jefeNombre.trim();
      if (jefeEmail.trim()) payload.jefe_email = jefeEmail.trim();
      const res = await createTenant(payload);
      if (res) {
        onSave();
        if (res.jefe_password) {
          setCreatedJefe({ email: jefeEmail.trim(), password: res.jefe_password });
        } else {
          onClose();
        }
      }
    }
  };

  const loading = creating || updating;
  const err = createErr || updateErr;

  // ── Success screen ──────────────────────────────
  if (createdJefe) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">¡Taller creado!</h2>
            <p className="mt-1 text-sm text-slate-500">Comparte estas credenciales con el jefe del taller.</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Credenciales generadas</p>
            <div className="rounded-xl bg-white/80 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase text-slate-400">Email</p>
              <p className="font-mono text-sm font-semibold text-slate-800">{createdJefe.email}</p>
            </div>
            <div className="rounded-xl bg-white/80 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase text-slate-400">Contraseña temporal</p>
              <p className="font-mono text-lg font-bold text-amber-700">{createdJefe.password}</p>
            </div>
            <p className="text-[11px] text-amber-600">⚠️ Guarda estas credenciales. No se mostrarán de nuevo.</p>
          </div>
          <button onClick={onClose}
            className="mt-5 w-full rounded-xl bg-rose-500 py-3 text-sm font-bold text-white shadow-sm hover:bg-rose-600 active:scale-[0.98] transition-all">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const steps = tenant
    ? [{ id: 'info', label: 'Datos', icon: Building2 }, { id: 'brand', label: 'Marca', icon: Palette }]
    : [{ id: 'info', label: 'Datos', icon: Building2 }, { id: 'brand', label: 'Marca', icon: Palette }, { id: 'jefe', label: 'Jefe', icon: User }];
  const stepIdx = steps.findIndex(s => s.id === step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xl"
              style={{ background: `linear-gradient(135deg, ${branding.primaryLight}, ${branding.primaryColor})` }}>
              {emoji}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{tenant ? 'Editar Taller' : 'Nuevo Taller'}</h2>
              <p className="text-[11px] text-slate-400">{nombre || 'Sin nombre'} · /{slug || '...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* Step nav */}
        <div className="flex border-b border-slate-100 px-6">
          {steps.map((s, i) => (
            <button key={s.id} type="button" onClick={() => setStep(s.id as any)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                step === s.id
                  ? 'border-rose-500 text-rose-600'
                  : i < stepIdx
                  ? 'border-transparent text-emerald-600 hover:text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              {i < stepIdx
                ? <Check size={13} className="text-emerald-500" />
                : <s.icon size={13} />}
              {s.label}
            </button>
          ))}
        </div>

        {err && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="max-h-[60vh] overflow-y-auto px-6 py-5">

            {/* ── STEP 1: Info ── */}
            {step === 'info' && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Nombre del Taller <span className="text-red-400">*</span>
                    </label>
                    <input value={nombre} onChange={e => handleNombre(e.target.value)} required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
                      placeholder="Ej: TerraBlinds" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Slogan
                    </label>
                    <input value={slogan} onChange={e => setSlogan(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
                      placeholder="Calidad que se ve" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      URL del Logo <span className="font-normal text-slate-400">(aparece en cotizaciones PDF)</span>
                    </label>
                    <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
                      placeholder="https://ejemplo.com/logo.png" />
                    {logoUrl && (
                      <img src={logoUrl} alt="preview" className="mt-2 h-10 object-contain rounded"
                        onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Slug / ID <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-rose-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-100">
                    <span className="flex items-center gap-1.5 border-r border-slate-200 pl-3.5 pr-3 py-2.5 text-xs text-slate-400">
                      <Globe size={13} /> app/
                    </span>
                    <input value={slug} onChange={e => handleSlug(e.target.value)} required
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm font-mono text-slate-900 outline-none"
                      placeholder="mi-taller o roller.now" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Solo letras minúsculas, números, guiones y puntos.</p>
                </div>

                {/* Plan selector */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">Plan</label>
                  <div className="grid grid-cols-3 gap-3">
                    {PLAN_OPTIONS.map(p => (
                      <button key={p.value} type="button" onClick={() => setPlan(p.value)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition ${
                          plan === p.value
                            ? 'border-rose-400 bg-rose-50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        <p.icon size={18} className={plan === p.value ? 'text-rose-500' : 'text-slate-400'} />
                        <span className={`text-xs font-bold ${plan === p.value ? 'text-rose-600' : 'text-slate-600'}`}>{p.label}</span>
                        <span className="text-[10px] text-slate-400">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Branding ── */}
            {step === 'brand' && (
              <div className="space-y-5">
                {/* Emoji picker */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">Ícono del Taller</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map(e => (
                      <button key={e} type="button" onClick={() => setEmoji(e)}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 text-xl transition ${
                          emoji === e
                            ? 'border-rose-400 bg-rose-50 shadow-sm scale-110'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color preset */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">Paleta de Colores</label>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_PRESETS.map((cp, i) => (
                      <button key={cp.name} type="button" onClick={() => setColorPreset(i)}
                        className={`group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 transition ${
                          colorPreset === i ? 'border-slate-800 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        <div className="flex gap-1">
                          <div className="h-5 w-5 rounded-full shadow-sm" style={{ backgroundColor: cp.primary }} />
                          <div className="h-5 w-5 rounded-full shadow-sm" style={{ backgroundColor: cp.sidebar }} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600">{cp.name}</span>
                        {colorPreset === i && (
                          <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800">
                            <Check size={9} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live preview */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                  <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Vista previa del sidebar
                  </p>
                  <div className="p-1" style={{ backgroundColor: branding.sidebarBg }}>
                    <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${branding.primaryLight}, ${branding.primaryColor})` }}>
                        {emoji}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{nombre || 'Mi Taller'}</p>
                        <p className="text-[11px]" style={{ color: branding.sidebarText }}>{slogan || 'Tu slogan'}</p>
                      </div>
                    </div>
                    {/* Fake menu items */}
                    {['Dashboard', 'Órdenes', 'Clientes'].map((item, i) => (
                      <div key={item} className={`mx-1 mb-0.5 flex items-center gap-2 rounded-lg px-3 py-2 ${i === 0 ? 'bg-white/10' : ''}`}>
                        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: i === 0 ? branding.primaryColor : 'transparent', opacity: 0.6 }} />
                        <span className="text-[11px]" style={{ color: i === 0 ? '#fff' : branding.sidebarText }}>{item}</span>
                      </div>
                    ))}
                    <div className="h-2" />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Jefe (solo creación) ── */}
            {step === 'jefe' && !tenant && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <User size={15} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Usuario Jefe (opcional)</p>
                      <p className="mt-0.5 text-[11px] text-blue-600">Si completas estos campos, se crea automáticamente el usuario jefe con acceso completo al taller.</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nombre completo</label>
                    <input value={jefeNombre} onChange={e => setJefeNombre(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
                      placeholder="Juan Pérez" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Email</label>
                    <input type="email" value={jefeEmail} onChange={e => setJefeEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
                      placeholder="jefe@mitaller.cl" />
                  </div>
                </div>
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  Se generará una contraseña temporal. Guárdala — se mostrará una sola vez al crear el taller.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <div className="flex items-center gap-2">
              {stepIdx > 0 && (
                <button type="button" onClick={() => setStep(steps[stepIdx - 1].id as any)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Atrás
                </button>
              )}
              {stepIdx < steps.length - 1 ? (
                <button type="button" onClick={() => setStep(steps[stepIdx + 1].id as any)}
                  className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-600 active:scale-[0.98] transition-all">
                  Siguiente <ChevronRight size={14} />
                </button>
              ) : (
                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-600 active:scale-[0.98] transition-all disabled:opacity-60">
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

// ═══════════════════════════════════════
// ADMIN USUARIOS (global - por tenant)
// ═══════════════════════════════════════
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

  const toggle = async (id: number) => {
    await toggleUser(id);
    refetch();
  };

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
        <select
          value={selectedTenant}
          onChange={e => setSelectedTenant(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          disabled={loadingTenants}
        >
          <option value="">— Selecciona un taller —</option>
          {tenantList.map(t => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
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
                  <p className="font-semibold text-amber-800">Contraseña restablecida</p>
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
                          <button
                            onClick={() => copyEmail(u.id, u.email)}
                            className="shrink-0 text-slate-300 transition hover:text-slate-600"
                            title="Copiar email"
                          >
                            {copiedId === u.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${rc.bg}`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggle(u.id)}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            u.activo ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleReset(u)}
                          disabled={resetting}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                          title="Restablecer contraseña"
                        >
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
