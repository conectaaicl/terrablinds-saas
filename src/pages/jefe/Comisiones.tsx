import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import { Plus, Trash2, Pencil, Check, X, DollarSign, Users, FileText, ChevronDown } from 'lucide-react';

const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-CL');

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
  const [editCategoria, setEditCategoria] = useState('');
  const [editMonto, setEditMonto] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editMeta, setEditMeta] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newCategoria, setNewCategoria] = useState('');
  const [newRol, setNewRol] = useState(ROLES[0]);
  const [newMonto, setNewMonto] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMeta, setNewMeta] = useState('');
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
    setEditCategoria(r.categoria);
    setEditMonto(String(r.monto_por_unidad));
    setEditDesc(r.descripcion || '');
    setEditMeta(r.meta_mensual != null ? String(r.meta_mensual) : '');
  };

  const saveEdit = async (id: number) => {
    setSaving(true);
    try {
      const data: any = {
        categoria: editCategoria.trim(),
        monto_por_unidad: parseInt(editMonto) || 0,
        descripcion: editDesc,
      };
      if (editMeta.trim() !== '') data.meta_mensual = parseInt(editMeta) || 0;
      await api.updateReglaComision(id, data);
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
    if (!newMonto || !newCategoria.trim()) return;
    setSaving(true);
    try {
      await api.createReglaComision({
        categoria: newCategoria.trim(),
        rol: newRol,
        monto_por_unidad: parseInt(newMonto) || 0,
        descripcion: newDesc,
        ...(newMeta.trim() !== '' ? { meta_mensual: parseInt(newMeta) || 0 } : {}),
      });
      setShowForm(false);
      setNewMonto('');
      setNewDesc('');
      setNewMeta('');
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
              <label className="text-xs text-slate-400">Categoria (nombre del servicio)</label>
              <input
                type="text"
                list="categorias-existentes"
                value={newCategoria}
                onChange={e => setNewCategoria(e.target.value)}
                placeholder="Ej: Cortina Blackout"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-200"
              />
              <datalist id="categorias-existentes">
                {reglas.map(r => <option key={r.id} value={r.categoria} />)}
              </datalist>
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
          <div>
            <label className="text-xs text-slate-400">Meta mensual (opcional)</label>
            <input
              type="number"
              value={newMeta}
              onChange={e => setNewMeta(e.target.value)}
              placeholder="Ej: 50 -- si se deja vacio, se paga por unidad hecha"
              className="mt-1 w-full max-w-xs rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-200"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Si se define, la categoria no se paga por unidad hecha sino una sola vez al generar la liquidacion:
              (unidades del mes − meta) × monto por unidad. Ej: meta 50 y se hicieron 18 → descuento de (18−50)×monto.
            </p>
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
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Meta mensual</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Descripcion</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {reglas.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                  Sin reglas configuradas. Agrega la primera regla con el boton de arriba.
                </td>
              </tr>
            )}
            {reglas.map(r => (
              <tr key={r.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-200">
                  {editingId === r.id ? (
                    <input
                      type="text"
                      value={editCategoria}
                      onChange={e => setEditCategoria(e.target.value)}
                      className="w-full rounded border border-slate-500 bg-slate-700 px-2 py-1 text-sm text-slate-200"
                    />
                  ) : r.categoria}
                </td>
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
                <td className="px-4 py-3 text-right">
                  {editingId === r.id ? (
                    <input
                      type="number"
                      value={editMeta}
                      onChange={e => setEditMeta(e.target.value)}
                      placeholder="sin meta"
                      className="w-24 rounded border border-slate-500 bg-slate-700 px-2 py-1 text-right text-sm text-slate-200"
                    />
                  ) : r.meta_mensual != null ? (
                    <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs font-semibold text-amber-300" title="Se paga/descuenta por desviacion de esta meta al generar la liquidacion, no por unidad">
                      meta {r.meta_mensual}/mes
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
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

  // ── Ver / editar liquidacion ──
  const [verLiqId, setVerLiqId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<any>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editCategoria, setEditCategoria] = useState('');
  const [editCantidad, setEditCantidad] = useState('');
  const [filaSaving, setFilaSaving] = useState<number | null>(null);
  const [reglasTodas, setReglasTodas] = useState<any[]>([]);
  useEffect(() => { api.getReglasComision().then(setReglasTodas).catch(() => {}); }, []);

  const cargarDetalle = async (liqId: number) => {
    setVerLiqId(liqId);
    setDetalleLoading(true);
    try {
      const d = await api.getLiquidacionDetalle(liqId);
      setDetalle(d);
    } catch (e: any) {
      alert(e.message);
      setVerLiqId(null);
    } finally {
      setDetalleLoading(false);
    }
  };

  const startEditFila = (c: any) => {
    setEditandoId(c.id);
    setEditCategoria(c.categoria);
    setEditCantidad(String(c.cantidad));
  };

  const guardarFila = async (comisionId: number) => {
    setFilaSaving(comisionId);
    try {
      await api.editarComision(comisionId, {
        categoria: editCategoria,
        cantidad: parseInt(editCantidad) || 1,
      });
      setEditandoId(null);
      // Recalcular la liquidacion con los nuevos totales
      if (detalle) {
        await api.generarLiquidacion({ user_id: detalle.user_id, periodo: detalle.periodo, sueldo_base: detalle.sueldo_base });
        await cargarDetalle(detalle.id);
      }
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setFilaSaving(null);
    }
  };

  const borrarFila = async (comisionId: number) => {
    if (!confirm('Eliminar este registro de trabajo?')) return;
    setFilaSaving(comisionId);
    try {
      await api.eliminarComision(comisionId);
      if (detalle) {
        await api.generarLiquidacion({ user_id: detalle.user_id, periodo: detalle.periodo, sueldo_base: detalle.sueldo_base });
        await cargarDetalle(detalle.id);
      }
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setFilaSaving(null);
    }
  };

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

  const [descargando, setDescargando] = useState<string | null>(null);
  const descargar = async (liqId: number, formato: 'pdf' | 'xlsx') => {
    setDescargando(`${liqId}-${formato}`);
    try {
      await api.descargarLiquidacion(liqId, formato);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDescargando(null);
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
                              title="Agregar adelanto, bono o descuento"
                              className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600"
                            >
                              Ajuste / Adelanto
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
                        {liq && (
                          <>
                            <button
                              onClick={() => cargarDetalle(liq.id)}
                              className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                            >
                              Ver / Editar
                            </button>
                            <button
                              onClick={() => descargar(liq.id, 'pdf')}
                              disabled={descargando === `${liq.id}-pdf`}
                              title="Descargar PDF"
                              className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                            >
                              {descargando === `${liq.id}-pdf` ? '...' : 'PDF'}
                            </button>
                            <button
                              onClick={() => descargar(liq.id, 'xlsx')}
                              disabled={descargando === `${liq.id}-xlsx`}
                              title="Descargar Excel"
                              className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                            >
                              {descargando === `${liq.id}-xlsx` ? '...' : 'Excel'}
                            </button>
                          </>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Ajuste / Adelanto para {selectedLiq.nombre}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Monto total del ajuste (adelantos/descuentos van en negativo, bonos en positivo)</label>
                <input
                  type="number"
                  value={ajusteVal}
                  onChange={e => setAjusteVal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  placeholder="ej: adelanto de 10.000 -> -10000"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Este valor reemplaza el total de ajustes de la liquidacion (ya viene con lo que se
                  precargo automatico, ej. descuento de meta Roller). Si vas a restar un adelanto,
                  parte del valor actual ({fmt(selectedLiq.ajustes || 0)}) y restale el monto del adelanto.
                </p>
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

      {/* Modal Ver / Editar liquidacion */}
      {verLiqId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            {detalleLoading || !detalle ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{detalle.nombre}</h3>
                    <p className="text-sm text-slate-400">Periodo {detalle.periodo} · <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[detalle.estado] || ''}`}>{detalle.estado}</span></p>
                  </div>
                  <button onClick={() => { setVerLiqId(null); setDetalle(null); setEditandoId(null); }} className="text-slate-400 hover:text-slate-200">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => descargar(detalle.id, 'pdf')}
                    disabled={descargando === `${detalle.id}-pdf`}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                  >
                    <FileText size={14} /> {descargando === `${detalle.id}-pdf` ? 'Descargando...' : 'Descargar PDF'}
                  </button>
                  <button
                    onClick={() => descargar(detalle.id, 'xlsx')}
                    disabled={descargando === `${detalle.id}-xlsx`}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <FileText size={14} /> {descargando === `${detalle.id}-xlsx` ? 'Descargando...' : 'Descargar Excel'}
                  </button>
                </div>

                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Trabajo registrado {detalle.estado !== 'borrador' && <span className="text-amber-400">(solo lectura — la liquidacion ya no esta en borrador)</span>}
                </p>
                <div className="rounded-xl border border-slate-700 overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Categoria</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">Cant.</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(detalle.comisiones || []).length === 0 && (
                        <tr><td colSpan={4} className="py-6 text-center text-xs text-slate-500">Sin trabajo registrado este mes</td></tr>
                      )}
                      {(detalle.comisiones || []).map((c: any) => (
                        <tr key={c.id}>
                          <td className="px-3 py-2 text-slate-200">
                            {editandoId === c.id ? (
                              <select value={editCategoria} onChange={e => setEditCategoria(e.target.value)}
                                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200">
                                {reglasTodas.filter(r => r.rol === c.rol).map(r => (
                                  <option key={r.id} value={r.categoria}>{r.categoria}</option>
                                ))}
                              </select>
                            ) : c.categoria}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {editandoId === c.id ? (
                              <input type="number" min="1" value={editCantidad} onChange={e => setEditCantidad(e.target.value)}
                                className="w-16 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-right text-sm text-slate-200" />
                            ) : c.cantidad}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-300">{fmt(c.total)}</td>
                          <td className="px-3 py-2">
                            {detalle.estado === 'borrador' && (
                              <div className="flex items-center justify-end gap-1">
                                {editandoId === c.id ? (
                                  <>
                                    <button onClick={() => guardarFila(c.id)} disabled={filaSaving === c.id}
                                      className="rounded p-1 text-emerald-400 hover:bg-emerald-900/30"><Check size={13} /></button>
                                    <button onClick={() => setEditandoId(null)}
                                      className="rounded p-1 text-slate-400 hover:bg-slate-700"><X size={13} /></button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => startEditFila(c)}
                                      className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"><Pencil size={13} /></button>
                                    <button onClick={() => borrarFila(c.id)} disabled={filaSaving === c.id}
                                      className="rounded p-1 text-slate-400 hover:bg-red-900/30 hover:text-red-400"><Trash2 size={13} /></button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-1.5 text-sm border-t border-slate-700 pt-3">
                  <div className="flex justify-between text-slate-300"><span>Sueldo base</span><span>{fmt(detalle.sueldo_base)}</span></div>
                  <div className="flex justify-between text-slate-300"><span>Total comisiones</span><span>{fmt(detalle.total_comisiones)}</span></div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Ajustes (bonos, adelantos, descuentos)</span>
                    <span className="flex items-center gap-2">
                      {fmt(detalle.ajustes)}
                      {detalle.estado === 'borrador' && (
                        <button
                          onClick={() => {
                            openAjuste(detalle);
                            setVerLiqId(null);
                            setDetalle(null);
                            setEditandoId(null);
                          }}
                          title="Agregar adelanto, bono o descuento"
                          className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </span>
                  </div>
                  {detalle.notas_ajustes && <p className="text-xs text-slate-500">{detalle.notas_ajustes}</p>}
                  <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-slate-700"><span>Total a pagar</span><span>{fmt(detalle.total)}</span></div>
                </div>
              </>
            )}
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
