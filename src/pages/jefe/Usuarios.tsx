import { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { ROL_CONFIG } from '../../types';
import type { Rol } from '../../types';
import {
  UserPlus, X, Search, Users,
  CheckCircle2, XCircle, Mail, RefreshCw, Edit3,
  ChevronDown, Loader2, AlertCircle, DollarSign, Ban,
} from 'lucide-react';

const ROLE_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  jefe:        { bg: 'bg-indigo-500/20',  text: 'text-indigo-300',  dot: 'bg-indigo-400' },
  gerente:     { bg: 'bg-indigo-500/20',  text: 'text-indigo-300',  dot: 'bg-indigo-400' },
  coordinador: { bg: 'bg-violet-500/20',  text: 'text-violet-300',  dot: 'bg-violet-400' },
  vendedor:    { bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  fabricante:  { bg: 'bg-amber-500/20',   text: 'text-amber-300',   dot: 'bg-amber-400' },
  instalador:  { bg: 'bg-orange-500/20',  text: 'text-orange-300',  dot: 'bg-orange-400' },
  bodegas:     { bg: 'bg-slate-500/20',   text: 'text-slate-300',   dot: 'bg-slate-400' },
};

const ROLES_CREABLES: Rol[] = ['gerente', 'coordinador', 'vendedor', 'fabricante', 'instalador', 'bodegas'];

const GLASS = 'bg-[rgba(10,16,32,0.9)] border border-[rgba(255,255,255,0.07)] rounded-2xl backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,0.5)]';
const BTN_PRIMARY = 'flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold px-4 py-2 rounded-xl hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[0_4px_24px_rgba(99,102,241,0.35)] text-sm';
const INPUT_CLS = 'w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all';
const SELECT_CLS = 'w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(15,23,42,0.9)] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all appearance-none';

const ROLE_DESC: Record<string, string> = {
  gerente:     'Acceso completo similar al jefe',
  coordinador: 'Gestiona agenda y equipo tecnico',
  vendedor:    'Crea cotizaciones y gestiona clientes',
  fabricante:  'Ve la cola de produccion y fabrica ordenes',
  instalador:  'Recibe instalaciones y actualiza estados',
  bodegas:     'Gestiona inventario y solicitudes de insumos',
};

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl border transition-all ${
      type === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
    }`}>
      {type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
      <span className="text-sm font-medium">{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

function Avatar({ name, rol }: { name: string; rol: string }) {
  const badge = ROLE_BADGE[rol] || ROLE_BADGE.bodegas;
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${badge.bg} border border-[rgba(255,255,255,0.08)]`}>
      {initials}
    </div>
  );
}

function RoleBadge({ rol }: { rol: string }) {
  const rc = ROL_CONFIG[rol as Rol];
  const badge = ROLE_BADGE[rol] || ROLE_BADGE.bodegas;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
      {rc?.label || rol}
    </span>
  );
}

function EditModal({
  user: editUser,
  onSave,
  onClose,
  saving,
  error,
}: {
  user: any;
  onSave: (data: any) => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState({ nombre: editUser.nombre, email: editUser.email, rol: editUser.rol as Rol, telefono: editUser.telefono || '' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-md p-6 ${GLASS}`} onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20">
              <Edit3 size={16} className="text-violet-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Editar Usuario</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 text-sm text-rose-400">
            <AlertCircle size={14} className="shrink-0" />{error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre completo</label>
            <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={INPUT_CLS} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={INPUT_CLS} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Teléfono WhatsApp</label>
            <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className={INPUT_CLS} placeholder="+56 9 XXXX XXXX" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Rol</label>
            <div className="relative">
              <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value as Rol }))} className={SELECT_CLS}>
                {ROLES_CREABLES.map(r => <option key={r} value={r}>{ROL_CONFIG[r].label}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-[rgba(255,255,255,0.1)] py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 transition-all">
              Cancelar
            </button>
            <button onClick={() => onSave(form)} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all">
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const { user, tenant } = useAuth();
  const [search, setSearch] = useState('');
  const [filterRol, setFilterRol] = useState<string>('todos');
  const [modalCreate, setModalCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState<{ nombre: string; email: string; password: string; rol: Rol; telefono: string }>({
    nombre: '', email: '', password: '', rol: 'vendedor', telefono: '',
  });

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const { data: usuarios, loading, error, refetch } = useApi(() => api.getUsers());
  const { execute: crearUsuario, loading: creating, error: createErr } = useMutation(api.createUser);
  const { execute: toggleUsuario } = useMutation(api.toggleUser);
  const { execute: resetPwd, loading: resending } = useMutation(api.resetUserPassword);
  const { execute: updateUser, loading: updating, error: updateErr } = useMutation(api.updateUser);

  const userList: any[] = usuarios || [];

  const filtered = userList.filter(u => {
    const matchSearch = !search
      || u.nombre.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRol = filterRol === 'todos' || u.rol === filterRol;
    return matchSearch && matchRol;
  });

  const activeCount = userList.filter(u => u.activo).length;
  const roleGroups = ROLES_CREABLES.reduce((acc, r) => {
    acc[r] = userList.filter(u => u.rol === r).length;
    return acc;
  }, {} as Record<string, number>);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailUsed = form.email;
    const res = await crearUsuario({
      email: form.email,
      password: form.password || Math.random().toString(36).slice(-8),
      nombre: form.nombre,
      rol: form.rol,
      tenant_id: user?.tenantId || '',
    });
    if (res) {
      setForm({ nombre: '', email: '', password: '', rol: 'vendedor' });
      setModalCreate(false);
      refetch();
      showToast(`Usuario creado. Se enviaron las credenciales a ${emailUsed}`);
    }
  };

  const handleToggle = async (u: any) => {
    await toggleUsuario(u.id);
    refetch();
    showToast(u.activo ? `${u.nombre} desactivado` : `${u.nombre} activado`);
  };

  const handleToggleComisiones = async (u: any) => {
    const nuevoValor = !(u.puede_ver_comisiones ?? true);
    await updateUser(u.id, { puede_ver_comisiones: nuevoValor });
    refetch();
    showToast(nuevoValor ? `${u.nombre} ya puede ver sus comisiones` : `${u.nombre} ya no puede ver sus comisiones`);
  };

  const handleResend = async (u: any) => {
    const res = await resetPwd(u.id);
    if (res) {
      showToast(`Credenciales reenviadas a ${u.email}`);
    } else {
      showToast('Error al reenviar credenciales', 'error');
    }
  };

  const handleEdit = async (data: any) => {
    if (!editingUser) return;
    const res = await updateUser(editingUser.id, data);
    if (res !== null) {
      setEditingUser(null);
      refetch();
      showToast('Usuario actualizado correctamente');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
          <AlertCircle size={28} className="text-rose-400" />
        </div>
        <p className="text-sm text-slate-400">{error}</p>
        <button onClick={refetch} className={BTN_PRIMARY}>
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Equipo</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {userList.length} usuarios &middot;{' '}
            <span className="text-emerald-400 font-medium">{activeCount} activos</span>
            {tenant?.nombre && <> &middot; <span className="text-slate-500">{tenant.nombre}</span></>}
          </p>
        </div>
        <button onClick={() => setModalCreate(true)} className={BTN_PRIMARY}>
          <UserPlus size={16} />
          Nuevo Usuario
        </button>
      </div>

      {/* Role stats strip */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {ROLES_CREABLES.map(r => {
          const badge = ROLE_BADGE[r];
          const rc = ROL_CONFIG[r];
          const active = filterRol === r;
          return (
            <button
              key={r}
              onClick={() => setFilterRol(active ? 'todos' : r)}
              className={`flex flex-col items-center gap-1 rounded-2xl p-3 border transition-all ${
                active
                  ? `${badge.bg} border-[rgba(255,255,255,0.15)]`
                  : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)]'
              }`}
            >
              <span className={`text-xl font-black ${active ? badge.text : 'text-white'}`}>
                {roleGroups[r] || 0}
              </span>
              <span className={`text-[11px] font-medium truncate w-full text-center ${active ? badge.text : 'text-slate-500'}`}>
                {rc.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className={`flex flex-wrap gap-3 p-4 ${GLASS}`}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/60 transition-all"
          />
        </div>
        <div className="relative">
          <select
            value={filterRol}
            onChange={e => setFilterRol(e.target.value)}
            className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(15,23,42,0.9)] px-3 py-2.5 pr-8 text-sm text-white outline-none focus:border-indigo-500/60 transition-all appearance-none cursor-pointer"
          >
            <option value="todos">Todos los roles</option>
            {ROLES_CREABLES.map(r => <option key={r} value={r}>{ROL_CONFIG[r].label}</option>)}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        {(search || filterRol !== 'todos') && (
          <button
            onClick={() => { setSearch(''); setFilterRol('todos'); }}
            className="rounded-xl border border-[rgba(255,255,255,0.1)] px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Users table */}
      <div className={GLASS}>
        {/* Table header - desktop */}
        <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
          {['Usuario', 'Email', 'Rol', 'Estado', 'Acciones'].map(h => (
            <span key={h} className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-[rgba(255,255,255,0.05)]">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.05)]">
                <Users size={24} className="text-slate-500" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-400">
                {search || filterRol !== 'todos' ? 'Sin resultados' : 'Aun no hay usuarios'}
              </p>
              {!search && filterRol === 'todos' && (
                <p className="mt-1 text-xs text-slate-600">Crea el primer usuario con el boton de arriba</p>
              )}
            </div>
          )}

          {filtered.map(u => (
            <div
              key={u.id}
              className={`grid grid-cols-1 gap-3 p-4 transition-colors hover:bg-[rgba(255,255,255,0.02)] sm:grid-cols-[2fr_1.5fr_1fr_1fr_auto] sm:items-center sm:gap-4 sm:px-5 sm:py-3.5 ${!u.activo ? 'opacity-40' : ''}`}
            >
              {/* Name + avatar */}
              <div className="flex items-center gap-3">
                <Avatar name={u.nombre} rol={u.rol} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{u.nombre}</p>
                  <p className="truncate text-xs text-slate-500 sm:hidden">{u.email}</p>
                </div>
              </div>
              {/* Email + phone */}
              <div className="hidden sm:block min-w-0">
                <p className="truncate text-sm text-slate-400">{u.email}</p>
                {u.telefono && (
                  <a href={"https://wa.me/" + u.telefono.replace(/[^0-9]/g,'')} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 mt-0.5">
                    <span>📱</span> {u.telefono}
                  </a>
                )}
              </div>
              {/* Role */}
              <div><RoleBadge rol={u.rol} /></div>
              {/* Status */}
              <div>
                {u.activo ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle2 size={11} /> Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-400">
                    <XCircle size={11} /> Inactivo
                  </span>
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setEditingUser(u)}
                  title="Editar usuario"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] text-slate-400 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => handleResend(u)}
                  disabled={resending}
                  title="Reenviar credenciales"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] text-slate-400 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-400 transition-all disabled:opacity-40"
                >
                  <Mail size={13} />
                </button>
                <button
                  onClick={() => handleToggle(u)}
                  title={u.activo ? 'Desactivar' : 'Activar'}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                    u.activo
                      ? 'border-[rgba(255,255,255,0.08)] text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400'
                      : 'border-[rgba(255,255,255,0.08)] text-slate-400 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400'
                  }`}
                >
                  {u.activo ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                </button>
                {u.rol !== 'jefe' && u.rol !== 'gerente' && (
                  <button
                    onClick={() => handleToggleComisiones(u)}
                    title={(u.puede_ver_comisiones ?? true) ? 'Bloquear acceso a sus comisiones/liquidaciones' : 'Permitir que vea sus comisiones/liquidaciones'}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                      (u.puede_ver_comisiones ?? true)
                        ? 'border-[rgba(255,255,255,0.08)] text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {(u.puede_ver_comisiones ?? true) ? <DollarSign size={13} /> : <Ban size={13} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.06)]">
            <p className="text-xs text-slate-600">
              Mostrando {filtered.length} de {userList.length} usuarios
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {modalCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModalCreate(false)}>
          <div className={`w-full max-w-md p-6 ${GLASS}`} onClick={e => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 border border-indigo-500/20">
                  <UserPlus size={18} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Nuevo Usuario</h2>
                  <p className="text-xs text-slate-500">Se enviaran las credenciales por email</p>
                </div>
              </div>
              <button onClick={() => setModalCreate(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {createErr && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 text-sm text-rose-400">
                <AlertCircle size={14} className="shrink-0" />{createErr}
              </div>
            )}

            <form onSubmit={submitCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nombre completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text" required
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Ej: Juan Perez Gonzalez"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="correo@empresa.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Teléfono WhatsApp
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="+56 9 XXXX XXXX"
                />
                <p className="mt-1 text-[11px] text-slate-600">Para envío directo por WhatsApp desde la agenda</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contrasena inicial
                </label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Dejar vacio para auto-generar"
                />
                <p className="mt-1 text-[11px] text-slate-600">Si se deja vacio, se genera una contrasena aleatoria</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Rol <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.rol}
                    onChange={e => setForm(f => ({ ...f, rol: e.target.value as Rol }))}
                    className={SELECT_CLS}
                  >
                    {ROLES_CREABLES.map(r => <option key={r} value={r}>{ROL_CONFIG[r].label}</option>)}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <div className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 ${ROLE_BADGE[form.rol]?.bg || ''}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${ROLE_BADGE[form.rol]?.dot || ''}`} />
                  <span className={`text-xs font-medium ${ROLE_BADGE[form.rol]?.text || ''}`}>
                    {ROLE_DESC[form.rol] || ''}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCreate(false)}
                  className="flex-1 rounded-xl border border-[rgba(255,255,255,0.1)] py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_4px_24px_rgba(99,102,241,0.35)]"
                >
                  {creating ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                  {creating ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <EditModal
          user={editingUser}
          onSave={handleEdit}
          onClose={() => setEditingUser(null)}
          saving={updating}
          error={updateErr}
        />
      )}

      {/* Toast notification */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
