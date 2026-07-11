import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { RUBROS, MODULOS } from '../../config/rubros';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import { ROL_CONFIG } from '../../types';
import type { Rol } from '../../types';
import {
  Building2, Plus, X, Eye, Settings,
  CheckCircle2, KeyRound, Copy, Check,
  Globe, User, Crown, Trash2, AlertTriangle,
  TrendingUp, ClipboardList, RefreshCw, ArrowLeft,
} from 'lucide-react';

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$';
  const all = upper + lower + digits + special;
  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  while (pwd.length < 12) pwd += all[Math.floor(Math.random() * all.length)];
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

// ── Nuevo Taller — formulario plano ──────────────────────────────────────────

function NuevoTallerForm({ onCancel, onCreated }: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState<'trial' | 'basico' | 'pro'>('trial');
  const [jefeNombre, setJefeNombre] = useState('');
  const [jefeEmail, setJefeEmail] = useState('');
  const [jefePassword, setJefePassword] = useState(generatePassword);
  const [pwCopied, setPwCopied] = useState(false);
  const [done, setDone] = useState<{ nombre: string; email: string; password: string } | null>(null);
  const [rubro, setRubro] = useState('talleres');
  const [modulos, setModulos] = useState<string[]>(RUBROS[0].modulos);

  const { execute: createTenant, loading, error } = useMutation(api.createTenant);

  const handleNombre = (v: string) => {
    setNombre(v);
    setSlug(
      v.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    );
  };

  const regenPwd = () => setJefePassword(generatePassword());

  const copyPwd = () => {
    navigator.clipboard.writeText(jefePassword);
    setPwCopied(true);
    setTimeout(() => setPwCopied(false), 2000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !slug.trim()) return;

    const withJefe = jefeNombre.trim() && jefeEmail.trim();
    const payload: any = { id: slug, nombre: nombre.trim(), slug, branding: { rubro, modulos }, plan };
    if (withJefe) {
      payload.jefe_nombre = jefeNombre.trim();
      payload.jefe_email = jefeEmail.trim();
      payload.jefe_password = jefePassword;
    }

    const res = await createTenant(payload);
    if (res) {
      if (withJefe) {
        setDone({ nombre: nombre.trim(), email: jefeEmail.trim(), password: jefePassword });
      } else {
        onCreated();
      }
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-[#111130] to-[#0d0d1f] p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-black text-white">Taller creado</h2>
          <p className="mt-1 text-sm text-slate-400">Comparte estas credenciales con el jefe. Solo se muestran una vez.</p>
        </div>
        <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Acceso del jefe — {done.nombre}</p>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <p className="mb-0.5 text-[10px] font-semibold uppercase text-slate-500">Email</p>
            <p className="font-mono text-sm text-slate-100">{done.email}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <p className="mb-0.5 text-[10px] font-semibold uppercase text-slate-500">Contraseña</p>
            <p className="font-mono text-xl font-black text-amber-300">{done.password}</p>
          </div>
        </div>
        <button
          onClick={() => { onCreated(); }}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white hover:from-indigo-500 hover:to-violet-500 transition-all"
        >
          Entendido, ir a talleres
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Volver
        </button>
        <h2 className="text-xl font-black text-white">Nuevo Taller</h2>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Nombre + Slug */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Datos del taller</p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Nombre del taller</label>
            <input
              value={nombre} onChange={e => handleNombre(e.target.value)}
              required placeholder="Ej: AutoTaller Sur"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">ID / Slug</label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-xs text-slate-600">/</span>
              <input
                value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required placeholder="autotaller-sur"
                className="flex-1 bg-transparent text-sm font-mono text-slate-300 outline-none placeholder-slate-600"
              />
            </div>
          </div>
          {/* Plan */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-400">Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {(['trial', 'basico', 'pro'] as const).map(p => (
                <button
                  key={p} type="button"
                  onClick={() => setPlan(p)}
                  className={`rounded-xl border py-2.5 text-xs font-bold uppercase transition ${
                    plan === p
                      ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                      : 'border-white/10 bg-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rubro + Módulos */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Rubro de la empresa</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {RUBROS.map(r => (
                <button key={r.id} type="button"
                  onClick={() => { if (r.soon) return; setRubro(r.id); setModulos(r.modulos); }}
                  className={`relative rounded-xl border p-3 text-left transition ${
                    r.soon
                      ? 'cursor-not-allowed opacity-60 border-white/10 bg-white/5'
                      : rubro === r.id
                        ? 'border-indigo-500 bg-indigo-500/15'
                        : 'border-white/10 bg-white/5 hover:border-white/25'}`}>
                  {r.soon && <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-950">Pronto</span>}
                  {!r.soon && rubro === r.id && <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">✓</span>}
                  <div className="text-xl">{r.icon}</div>
                  <div className="mt-1 text-[13px] font-bold text-white">{r.label}</div>
                  <div className="text-[11px] text-slate-500">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Módulos activos</p>
            <div className="space-y-2">
              {MODULOS.map(m => {
                const on = modulos.includes(m.id);
                return (
                  <button key={m.id} type="button"
                    onClick={() => setModulos(cur => cur.includes(m.id) ? cur.filter(x => x !== m.id) : [...cur, m.id])}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left transition hover:border-white/20">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white">{m.label}</p>
                      <p className="text-[11px] text-slate-500">{m.desc}</p>
                    </div>
                    <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-white/15'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Jefe */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <User size={14} className="text-indigo-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Jefe del taller <span className="normal-case font-normal text-slate-600">(opcional)</span></p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Nombre completo</label>
              <input
                value={jefeNombre} onChange={e => setJefeNombre(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Email</label>
              <input
                type="email" value={jefeEmail} onChange={e => setJefeEmail(e.target.value)}
                placeholder="jefe@mitaller.cl"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
          </div>
          {/* Contraseña generada */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Contraseña de acceso</label>
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <span className="flex-1 font-mono text-base font-bold text-amber-300 tracking-wider">{jefePassword}</span>
              <button type="button" onClick={regenPwd} title="Regenerar" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-white transition">
                <RefreshCw size={14} />
              </button>
              <button type="button" onClick={copyPwd} title="Copiar" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-white transition">
                {pwCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-600">Esta contraseña se mostrará una sola vez al crear el taller.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Creando...' : 'Crear Taller'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Admin Talleres ────────────────────────────────────────────────────────────

export function AdminTalleres() {
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: tenants, loading, error, refetch } = useApi(() => api.getTenants());
  const { execute: updateTenant, loading: updating } = useMutation(api.updateTenant);
  const { execute: deleteTenant, loading: deleting } = useMutation(api.deleteTenant);

  const tenantList: any[] = tenants || [];

  const toggleActivo = async (t: any) => {
    await updateTenant(t.id, { activo: !t.activo });
    refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteTenant(id);
    setConfirmDelete(null);
    refetch();
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  if (showForm) {
    return (
      <div className="space-y-6">
        <NuevoTallerForm
          onCancel={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); refetch(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d0d1f] via-[#111130] to-[#0d0d1f] p-8 shadow-2xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-violet-600/15 blur-3xl" />
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
            onClick={() => setShowForm(true)}
            className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-500 hover:to-violet-500 hover:scale-[1.03] active:scale-[0.98]"
          >
            <Plus size={17} className="transition-transform group-hover:rotate-90" />
            Nuevo Taller
          </button>
        </div>
        {/* KPIs */}
        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total', value: tenantList.length, icon: Building2, grad: 'from-indigo-500/20 to-indigo-600/10', text: 'text-indigo-300', border: 'border-indigo-500/20' },
            { label: 'Activos', value: tenantList.filter(t => t.activo).length, icon: CheckCircle2, grad: 'from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-300', border: 'border-emerald-500/20' },
            { label: 'Pro', value: tenantList.filter(t => t.plan === 'pro').length, icon: TrendingUp, grad: 'from-amber-500/20 to-amber-600/10', text: 'text-amber-300', border: 'border-amber-500/20' },
            { label: 'Trial', value: tenantList.filter(t => t.plan === 'trial').length, icon: ClipboardList, grad: 'from-slate-500/20 to-slate-600/10', text: 'text-slate-300', border: 'border-slate-500/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border ${s.border} bg-gradient-to-br ${s.grad} p-4`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{s.label}</span>
                <s.icon size={15} className={s.text} />
              </div>
              <p className={`mt-2 text-2xl font-black ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant list */}
      {tenantList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-2xl">🏭</div>
          <p className="font-semibold text-slate-300">Sin talleres aún</p>
          <p className="mt-1 text-sm text-slate-500">Crea el primer taller para comenzar</p>
          <button onClick={() => setShowForm(true)}
            className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-colors">
            <Plus size={16} /> Crear primer taller
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tenantList.map(t => {
            const branding = t.branding || {};
            const isActive = t.activo;
            const color = branding.primaryColor || '#6366f1';
            return (
              <div key={t.id}
                className={`group relative overflow-hidden rounded-2xl border bg-white/[0.03] shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
                  isActive ? 'border-white/10 hover:border-indigo-500/40' : 'border-red-500/20 opacity-55'
                }`}
              >
                {/* Card header */}
                <div className="relative p-5 pb-4" style={{ background: `linear-gradient(135deg, ${color}22, ${color}11)` }}>
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${color}cc, ${color})` }}>
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
                    }`}>{(t.plan || 'trial').toUpperCase()}</span>
                  </div>
                </div>
                {/* Slug row */}
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
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
                    <Eye size={13} /> Ver
                  </button>
                  <button onClick={() => toggleActivo(t)} disabled={updating}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition disabled:opacity-40 ${
                      isActive
                        ? 'border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}>
                    {isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => setConfirmDelete(t.id)} disabled={deleting}
                    className="flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/25 disabled:opacity-40"
                    title="Eliminar taller">
                    <Trash2 size={13} />
                  </button>
                </div>
                {detail === t.id && <TenantUsersPanel tenantId={t.id} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-gradient-to-b from-[#1a0a0a] to-[#110505] p-7 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Eliminar Taller</h3>
                <p className="text-xs text-slate-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="mb-6 text-sm text-slate-300">
              Se eliminarán el taller <strong className="font-mono text-white">/{confirmDelete}</strong> y todos sus datos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50">
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tenant Users Panel ────────────────────────────────────────────────────────

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
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
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

// ── Admin Usuarios ────────────────────────────────────────────────────────────

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
                            <button onClick={() => copyEmail(u.id, u.email)} className="shrink-0 text-slate-300 hover:text-slate-600 transition">
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
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 transition">
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
