import { useState, useMemo } from 'react';
import { Store } from '../../data/store';
import { useAuth } from '../../context/AuthContext';
import { ROL_CONFIG } from '../../types';
import type { Rol } from '../../types';
import { UserPlus, X, Shield } from 'lucide-react';

export default function Usuarios() {
  const { user, tenant } = useAuth();
  const tenantId = user?.tenantId || '';
  const [v, setV] = useState(0);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<{ nombre: string; email: string; telefono: string; direccion: string; password: string; rol: Rol }>({ nombre: '', email: '', telefono: '', direccion: '', password: '1234', rol: 'vendedor' });

  const usuarios = useMemo(() => { void v; return Store.getUsuariosByTenant(tenantId); }, [v, tenantId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    Store.addUsuario({ ...form, tenantId, activo: true });
    setForm({ nombre: '', email: '', telefono: '', direccion: '', password: '1234', rol: 'vendedor' });
    setModal(false);
    setV(x => x + 1);
  };

  const toggle = (id: string, activo: boolean) => {
    Store.updateUsuario(id, { activo: !activo });
    setV(x => x + 1);
  };

  const byRol = (r: Rol) => usuarios.filter(u => u.rol === r);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500">{usuarios.length} en {tenant?.nombre}</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          <UserPlus size={17} /> Nuevo
        </button>
      </div>

      {(['jefe', 'coordinador', 'vendedor', 'fabricante', 'instalador'] as Rol[]).map(r => {
        const list = byRol(r);
        if (list.length === 0) return null;
        const rc = ROL_CONFIG[r];
        return (
          <div key={r}>
            <div className="mb-3 flex items-center gap-2">
              <Shield size={14} className={rc.color} />
              <h2 className="text-sm font-semibold text-slate-700">{rc.label}s ({list.length})</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(u => (
                <div key={u.id} className={`rounded-xl border border-slate-200 bg-white p-4 transition ${!u.activo ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${rc.bg}`}>
                      {u.nombre.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{u.nombre}</p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </div>
                    <button onClick={() => toggle(u.id, u.activo)}
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${u.activo ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Nuevo Usuario</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Nombre completo" value={form.nombre} onChange={nombre => setForm(f => ({ ...f, nombre }))} required />
              <Field label="Email" type="email" value={form.email} onChange={email => setForm(f => ({ ...f, email }))} required />
              <Field label="Teléfono" value={form.telefono} onChange={telefono => setForm(f => ({ ...f, telefono }))} />
              <Field label="Dirección" value={form.direccion} onChange={direccion => setForm(f => ({ ...f, direccion }))} />
              <Field label="Contraseña" value={form.password} onChange={password => setForm(f => ({ ...f, password }))} required />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Rol</label>
                <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value as Rol }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500">
                  <option value="vendedor">Vendedor</option>
                  <option value="fabricante">Fabricante</option>
                  <option value="instalador">Instalador</option>
                  <option value="jefe">Jefe / Dueño</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 rounded-lg py-2 text-sm font-semibold text-white hover:opacity-90"
                  style={{ backgroundColor: 'var(--brand-primary)' }}>Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" />
    </div>
  );
}
