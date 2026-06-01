import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import { Plus, Trash2, Pencil, Check, X, DollarSign, Users, FileText, ChevronDown } from 'lucide-react';

const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-CL');

const CATEGORIAS = [
  'persiana_exterior', 'toldo', 'cortina_roller', 'cortina_blackout',
  'cortina_panel', 'zebra', 'sheer', 'enrollable', 'general',
];
const ROLES = ['vendedor', 'fabricante', 'instalador'];

const ESTADO_BADGE: Record<string, string> = {
  borrador: 'bg-slate-700 text-slate-200',
  aprobada: 'bg-blue-900 text-blue-200',
  pagada: 'bg-emerald-900 text-emerald-200',
  pendiente: 'bg-amber-900 text-amber-200',
};

function periodoActual() {
  const d = new Date();
  return d.toISOString().slice(0, 7);
}

function PeriodoPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-400">Periodo:</label>
      <input
        type="month"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:border-slate-400 outline-none"
      />
    </div>
  );
}

// ── TAB REGLAS ──────────────────────────────────────────────────────────────
function TabReglas() {
  const [reglas, setReglas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMonto, setEditMonto] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newCategoria, setNewCategoria] = useState(CATEGORIAS[0]);
  const [newRol, setNewRol] = useState(ROLES[0]);
  const [newMonto, setNewMonto] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getReglasComision();
      setReglas(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setEditMonto(String(r.monto_por_unidad));
    setEditDesc(r.descripcion || '');
  };

  const saveEdit = async (id: number) => {
    setSaving(true);
    try {
      await api.updateReglaComision(id, {
        monto_por_unidad: parseInt(editMonto) || 0,
        descripcion: editDesc,
      });
      setEditingId(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRegla = async (id: number) => {
    if (!confirm('Eliminar esta regla?')) return;
    try {
      await api.deleteReglaComision(id);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const crearRegla = async () => {
    if (!newMonto) return;
    setSaving(true);
    try {
      await api.createReglaComision({
        categoria: newCategoria,
        rol: newRol,
        monto_por_unidad: parseInt(newMonto) || 0,
        descripcion: newDesc,
      });
      setShowForm(false);
      setNewMonto('');
      setNewDesc('');
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Define cuanto gana cada rol por unidad instalada, segun categoria de producto.
        </p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500"
        >
          <Plus size={14} /> Nueva Regla
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-200">Nueva regla de comision</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs text-slate-400">Categoria</label>
              <select
                value={newCategoria}
                onChange={e => setNewCategoria(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-200"
              >
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Rol</label>
              <select
                value={newRol}
                onChange={e => setNewRol(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-200"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Monto por unidad (CLP)</label>
              <input
                type="number"
                value={newMonto}
                onChange={e => setNewMonto(e.target.value)}
                placeholder="15000"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Descripcion</label>
              <input
                type="text"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Opcional"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-200"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={crearRegla}
              disabled={saving || !newMonto}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Crear'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Categoria</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Rol</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Monto / Unidad</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Descripcion</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {reglas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                  Sin reglas configuradas. Agrega la primera regla con el boton de arriba.
                </td>
              </tr>
            )}
            {reglas.map(r => (
              <tr key={r.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-200">{r.categoria}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-300">
                    {r.rol}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === r.id ? (
                    <input
                      type="number"
                      value={editMonto}
                      onChange={e => setEditMonto(e.target.value)}
                      className="w-28 rounded border border-slate-500 bg-slate-700 px-2 py-1 text-right text-sm text-slate-200"
                    />
                  ) : (
                    <span className="font-semibold text-emerald-400">{fmt(r.monto_por_unidad)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {editingId === r.id ? (
                    <input
                      type="text"
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      className="w-full rounded border border-slate-500 bg-slate-700 px-2 py-1 text-sm text-slate-200"
                    />
                  ) : (
                    r.descripcion || '—'
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.activo ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                    {r.activo ? 'activa' : 'inactiva'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {editingId === r.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(r.id)}
                          disabled={saving}
                          className="rounded p-1 text-emerald-400 hover:bg-emerald-900/30"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-700"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(r)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteRegla(r.id)}
                          className="rounded p-1 text-slate-400 hover:bg-red-900/30 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TAB LIQUIDACIONES ───────────────────────────────────────────────────────
function TabLiquidaciones() {
  const [periodo, setPeriodo] = useState(periodoActual());
  const [resumen, setResumen] = useState<any>(null);
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sueldoBase, setSueldoBase] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [selectedLiq, setSelectedLiq] = useState<any>(null);
  const [ajusteVal, setAjusteVal] = useState('');
  const [ajusteNota, setAjusteNota] = useState('');
  const [ajusteSaving, setAjusteSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [res, liqs] = await Promise.all([
        api.getResumenComisiones(periodo),
        api.getLiquidaciones(periodo),
      ]);
      setResumen(res);
      setLiquidaciones(liqs || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [periodo]);

  const getLiq = (userId: number) => liquidaciones.find(l => l.user_id === userId);

  const generar = async (userId: number) => {
    setSaving(userId);
    try {
      await api.generarLiquidacion({
        user_id: userId,
        periodo,
        sueldo_base: parseInt(sueldoBase[userId] || '0') || 0,
      });
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(null);
    }
  };

  const aprobar = async (liqId: number) => {
    try {
      await api.aprobarLiquidacion(liqId);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const pagar = async (liqId: number) => {
    if (!confirm('Marcar como pagada esta liquidacion?')) return;
    try {
      await api.pagarLiquidacion(liqId);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openAjuste = (liq: any) => {
    setSelectedLiq(liq);
    setAjusteVal(String(liq.ajustes || 0));
    setAjusteNota(liq.notas_ajustes || '');
  };

  const saveAjuste = async () => {
    if (!selectedLiq) return;
    setAjusteSaving(true);
    try {
      await api.ajustarLiquidacion(selectedLiq.id, {
        ajustes: parseInt(ajusteVal) || 0,
        notas_ajustes: ajusteNota,
      });
      setSelectedLiq(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAjusteSaving(false);
    }
  };

  const empleados: any[] = resumen?.empleados || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <PeriodoPicker value={periodo} onChange={setPeriodo} />
        {loading && <Spinner />}
      </div>

      {empleados.length === 0 && !loading && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 py-12 text-center">
          <DollarSign size={32} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400">Sin comisiones generadas para {periodo}</p>
          <p className="text-xs text-slate-600 mt-1">
            Las comisiones se generan automaticamente al cambiar estado de ordenes.
          </p>
        </div>
      )}

      {empleados.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Empleado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Rol</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Comisiones</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Sueldo Base</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {empleados.map((emp: any) => {
                const liq = getLiq(emp.user_id);
                return (
                  <tr key={emp.user_id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-200">{emp.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{emp.rol}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400">{fmt(liq ? liq.total_comisiones : emp.total)}</td>
                    <td className="px-4 py-3 text-right">
                      {!liq ? (
                        <input
                          type="number"
                          placeholder="0"
                          value={sueldoBase[emp.user_id] || ''}
                          onChange={e => setSueldoBase(prev => ({ ...prev, [emp.user_id]: e.target.value }))}
                          className="w-28 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-right text-sm text-slate-200"
                        />
                      ) : (
                        <span className="text-slate-300">{fmt(liq.sueldo_base)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {liq ? (
                        <span className="font-bold text-white">{fmt(liq.total)}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {liq ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[liq.estado] || ''}`}>
                          {liq.estado}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">sin liquidar</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {!liq && (
                          <button
                            onClick={() => generar(emp.user_id)}
                            disabled={saving === emp.user_id}
                            className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                          >
                            {saving === emp.user_id ? '...' : 'Generar'}
                          </button>
                        )}
                        {liq?.estado === 'borrador' && (
                          <>
                            <button
                              onClick={() => generar(emp.user_id)}
                              disabled={saving === emp.user_id}
                              className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600"
                            >
                              Regen.
                            </button>
                            <button
                              onClick={() => openAjuste(liq)}
                              className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600"
                            >
                              Ajuste
                            </button>
                            <button
                              onClick={() => aprobar(liq.id)}
                              className="rounded-lg bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-600"
                            >
                              Aprobar
                            </button>
                          </>
                        )}
                        {liq?.estado === 'aprobada' && (
                          <button
                            onClick={() => pagar(liq.id)}
                            className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                          >
                            Marcar Pagada
                          </button>
                        )}
                        {liq?.estado === 'pagada' && (
                          <span className="text-xs text-emerald-400 font-semibold">Pagada</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal ajuste */}
      {selectedLiq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Ajuste para {selectedLiq.nombre}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Monto ajuste (puede ser negativo para descuentos)</label>
                <input
                  type="number"
                  value={ajusteVal}
                  onChange={e => setAjusteVal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  placeholder="ej: -10000 o 25000"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Nota del ajuste</label>
                <textarea
                  value={ajusteNota}
                  onChange={e => setAjusteNota(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 resize-none"
                  placeholder="Motivo del ajuste..."
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setSelectedLiq(null)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={saveAjuste}
                disabled={ajusteSaving}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {ajusteSaving ? 'Guardando...' : 'Guardar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function Comisiones() {
  const [tab, setTab] = useState<'reglas' | 'liquidaciones'>('liquidaciones');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Comisiones y Liquidaciones</h1>
          <p className="text-sm text-slate-400 mt-1">Configura reglas y gestiona los pagos del equipo</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-700 bg-slate-800 p-1 w-fit">
        {[
          { id: 'liquidaciones', label: 'Liquidaciones', icon: <FileText size={14} /> },
          { id: 'reglas', label: 'Reglas de Comision', icon: <DollarSign size={14} /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'reglas' && <TabReglas />}
      {tab === 'liquidaciones' && <TabLiquidaciones />}
    </div>
  );
}
