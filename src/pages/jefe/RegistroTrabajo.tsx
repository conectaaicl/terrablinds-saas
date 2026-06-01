import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Plus, Trash2, Save, ChevronDown, ChevronUp, Users, DollarSign, Calendar } from 'lucide-react';

interface ReglaComision {
  id: number;
  categoria: string;
  monto_por_unidad: number;
  descripcion: string | null;
}

interface WorkerUser {
  id: number;
  nombre: string;
  rol: string;
  email: string;
}

interface ItemRow {
  categoria: string;
  cantidad: number;
  monto_por_unidad: number;
}

const API = '/api/v1';
const token = () => localStorage.getItem('access_token') || '';
const fmtPesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

const ROL_LABEL: Record<string, string> = {
  instalador: 'Instalador',
  fabricante: 'Fabricante',
  vendedor: 'Vendedor',
  coordinador: 'Coordinador',
};

export default function RegistroTrabajo() {
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [reglas, setReglas] = useState<ReglaComision[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<number | ''>('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ categoria: '', cantidad: 1, monto_por_unidad: 0 }]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showReglas, setShowReglas] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // New regla form
  const [newCat, setNewCat] = useState('');
  const [newMonto, setNewMonto] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [savingRegla, setSavingRegla] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoadingData(true);
    try {
      const [wRes, rRes] = await Promise.all([
        fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/comisiones/reglas`, { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      if (wRes.ok) {
        const all = await wRes.json();
        setWorkers((all || []).filter((u: WorkerUser) =>
          ['instalador', 'fabricante', 'vendedor', 'coordinador'].includes(u.rol)
        ));
      }
      if (rRes.ok) setReglas(await rRes.json());
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = () => setItems(prev => [...prev, { categoria: '', cantidad: 1, monto_por_unidad: 0 }]);

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof ItemRow, value: string | number) => {
    setItems(prev => {
      const next = [...prev];
      if (field === 'categoria') {
        const v = value as string;
        const regla = reglas.find(r => r.categoria === v);
        next[idx] = { ...next[idx], categoria: v, monto_por_unidad: regla ? regla.monto_por_unidad : next[idx].monto_por_unidad };
      } else if (field === 'cantidad') {
        next[idx] = { ...next[idx], cantidad: Math.max(1, Number(value)) };
      } else if (field === 'monto_por_unidad') {
        next[idx] = { ...next[idx], monto_por_unidad: Math.max(0, Number(value)) };
      }
      return next;
    });
  };

  const total = items.reduce((s, i) => s + i.cantidad * i.monto_por_unidad, 0);

  const handleSave = async () => {
    if (!selectedWorker) { showToast('Selecciona un trabajador', false); return; }
    const validItems = items.filter(i => i.categoria && i.cantidad > 0);
    if (!validItems.length) { showToast('Agrega al menos un ítem con categoría', false); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API}/comisiones/registrar-trabajo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedWorker, fecha, items: validItems, notas: notas.trim() || null }),
      });
      if (res.ok) {
        showToast('Trabajo registrado correctamente');
        setItems([{ categoria: '', cantidad: 1, monto_por_unidad: 0 }]);
        setNotas('');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Error al guardar', false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddRegla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim() || !newMonto) return;
    setSavingRegla(true);
    try {
      const res = await fetch(`${API}/comisiones/reglas`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria: newCat.trim(), monto_por_unidad: Number(newMonto), descripcion: newDesc.trim() || null }),
      });
      if (res.ok) {
        setNewCat(''); setNewMonto(''); setNewDesc('');
        showToast('Categoría agregada');
        load();
      } else {
        showToast('Error al crear categoría', false);
      }
    } finally {
      setSavingRegla(false);
    }
  };

  const handleDeleteRegla = async (id: number) => {
    const res = await fetch(`${API}/comisiones/reglas/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) { showToast('Categoría eliminada'); load(); }
    else showToast('Error al eliminar', false);
  };

  const worker = workers.find(w => w.id === selectedWorker);

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-xl ${toast.ok ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
          <ClipboardCheck size={22} className="shrink-0 text-rose-500" />
          Registro de Trabajo
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">Registra trabajo y genera comisiones automáticamente</p>
      </div>

      {/* Worker + Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Users size={13} /> Trabajador
          </label>
          {loadingData ? (
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <select
              value={selectedWorker}
              onChange={e => setSelectedWorker(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            >
              <option value="">— Seleccionar trabajador —</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.nombre} · {ROL_LABEL[w.rol] || w.rol}</option>
              ))}
            </select>
          )}
          {worker && <p className="mt-1.5 text-[11px] text-slate-400">{worker.email}</p>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Calendar size={13} /> Fecha de trabajo
          </label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">Trabajo realizado</h3>
          <button type="button" onClick={addItem}
            className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 active:scale-95 transition-all">
            <Plus size={13} /> Agregar ítem
          </button>
        </div>

        <div className="divide-y divide-slate-50">
          {items.map((item, idx) => (
            <div key={idx} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {/* Category */}
                <div className="flex-1 min-w-0">
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Categoría / Tipo de trabajo</label>
                  {reglas.length > 0 ? (
                    <select
                      value={item.categoria}
                      onChange={e => updateItem(idx, 'categoria', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    >
                      <option value="">— Seleccionar —</option>
                      {reglas.map(r => <option key={r.id} value={r.categoria}>{r.categoria} · {fmtPesos(r.monto_por_unidad)}</option>)}
                    </select>
                  ) : (
                    <input
                      value={item.categoria}
                      onChange={e => updateItem(idx, 'categoria', e.target.value)}
                      placeholder="Ej: Instalación persiana roller"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    />
                  )}
                </div>

                {/* Qty + Price + Subtotal + Delete */}
                <div className="flex items-end gap-2">
                  <div className="w-20 shrink-0">
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Cant.</label>
                    <input
                      type="number" min="1" value={item.cantidad}
                      onChange={e => updateItem(idx, 'cantidad', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-sm font-bold text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                  <div className="w-28 shrink-0">
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Precio c/u</label>
                    <input
                      type="number" min="0" step="500" value={item.monto_por_unidad}
                      onChange={e => updateItem(idx, 'monto_por_unidad', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                  <div className="shrink-0">
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Total</label>
                    <div className="flex h-[38px] min-w-[80px] items-center justify-center rounded-lg bg-emerald-50 px-2 text-sm font-bold text-emerald-700">
                      {fmtPesos(item.cantidad * item.monto_por_unidad)}
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)}
                      className="flex h-[38px] w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total bar */}
        <div className="flex items-center justify-between rounded-b-xl bg-slate-900 px-4 py-3.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {items.filter(i => i.categoria).length} ítem(s) · Total
          </span>
          <span className="text-xl font-extrabold text-emerald-400">{fmtPesos(total)}</span>
        </div>
      </div>

      {/* Notas */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Notas (opcional)</label>
        <textarea
          value={notas} onChange={e => setNotas(e.target.value)}
          placeholder="Observaciones, dirección, detalles..."
          rows={2}
          className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        />
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving || !selectedWorker}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #e11d48, #9f1239)' }}>
        <Save size={16} />
        {saving ? 'Guardando...' : 'Guardar Registro de Trabajo'}
      </button>

      {/* Tabla de precios collapsible */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <button type="button" onClick={() => setShowReglas(v => !v)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
          <span className="flex items-center gap-2">
            <DollarSign size={15} className="text-rose-500" />
            Tabla de precios ({reglas.length} categorías)
          </span>
          {showReglas ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showReglas && (
          <div className="border-t border-slate-100">
            <form onSubmit={handleAddRegla} className="border-b border-slate-100 bg-slate-50 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Nueva categoría de precio</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Nombre (ej: Persiana Roller)" required
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                <input type="number" value={newMonto} onChange={e => setNewMonto(e.target.value)} placeholder="$ por unidad" required min="0"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 sm:w-36" />
                <button type="submit" disabled={savingRegla}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50">
                  <Plus size={14} /> Agregar
                </button>
              </div>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descripción (opcional)"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
            </form>

            {reglas.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Sin categorías — agrega la primera arriba</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {reglas.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{r.categoria}</p>
                      {r.descripcion && <p className="truncate text-xs text-slate-400">{r.descripcion}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-emerald-700">{fmtPesos(r.monto_por_unidad)}</span>
                    <button onClick={() => handleDeleteRegla(r.id)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
