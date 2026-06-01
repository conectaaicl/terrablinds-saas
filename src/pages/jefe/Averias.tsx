/**
 * Averías y Fallas — Vista de Gestión (Jefe / Coordinador)
 * Visualiza y gestiona todos los reportes de averías del taller.
 */
import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  AlertTriangle, RefreshCw, X, Check, Loader2,
  Wrench, User, Clock, Filter, BarChart3, ChevronDown,
  Package, DollarSign, SlidersHorizontal,
} from 'lucide-react';

const TIPOS_SERVICIO = [
  { value: 'cortinas_roller', label: 'Cortinas Roller' },
  { value: 'persianas', label: 'Persianas' },
  { value: 'electricidad', label: 'Electricidad' },
  { value: 'puertas', label: 'Puertas' },
  { value: 'ventanas', label: 'Ventanas' },
  { value: 'maderas', label: 'Maderas / Carpintería' },
  { value: 'muebles', label: 'Muebles' },
  { value: 'climatizacion', label: 'Climatización' },
  { value: 'iluminacion', label: 'Iluminación' },
  { value: 'plomeria', label: 'Plomería' },
  { value: 'automatizacion', label: 'Automatización' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'otro', label: 'Otro' },
];

const SEVERIDAD_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  baja:    { label: 'Baja',    color: 'text-slate-300',  bg: 'bg-slate-500/10 border border-slate-500/20',  dot: 'bg-slate-400'   },
  media:   { label: 'Media',   color: 'text-amber-400',  bg: 'bg-amber-500/10 border border-amber-500/20',  dot: 'bg-amber-500'   },
  alta:    { label: 'Alta',    color: 'text-red-400',    bg: 'bg-red-500/10 border border-red-500/20',      dot: 'bg-red-500'     },
  critica: { label: 'Crítica', color: 'text-red-400',    bg: 'bg-red-500/10 border border-red-500/20',      dot: 'bg-red-500'     },
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; next?: string }> = {
  reportada:     { label: 'Reportada',     color: 'text-sky-400',     bg: 'bg-sky-500/10 border border-sky-500/20',         next: 'en_revision'   },
  en_revision:   { label: 'En Revisión',   color: 'text-amber-400',   bg: 'bg-amber-500/10 border border-amber-500/20',     next: 'en_reparacion' },
  en_reparacion: { label: 'En Reparación', color: 'text-violet-400',  bg: 'bg-violet-500/10 border border-violet-500/20',   next: 'reparada'      },
  reparada:      { label: 'Reparada',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20', next: 'cerrada'       },
  cerrada:       { label: 'Cerrada',       color: 'text-slate-400',   bg: 'bg-slate-500/10 border border-slate-500/20'                           },
};

const ESTADOS_ORDER = ['reportada', 'en_revision', 'en_reparacion', 'reparada', 'cerrada'];

// ── Detail / Edit Modal ──────────────────────────────────────────────────────
function AveriaModal({
  averia,
  users,
  clients,
  onSave,
  onClose,
  onDelete,
}: {
  averia: any;
  users: any[];
  clients: any[];
  onSave: (id: number, data: Record<string, any>) => Promise<void>;
  onClose: () => void;
  onDelete: (id: number) => Promise<void>;
}) {
  const [form, setForm] = useState({
    estado: averia.estado || 'reportada',
    severidad: averia.severidad || 'media',
    asignado_a: averia.asignado_a ? String(averia.asignado_a) : '',
    client_id: averia.client_id ? String(averia.client_id) : '',
    notas_tecnicas: averia.notas_tecnicas || '',
    presupuesto_estimado: averia.presupuesto_estimado ? String(averia.presupuesto_estimado) : '',
    descripcion: averia.descripcion || '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = {
        estado: form.estado,
        severidad: form.severidad,
        descripcion: form.descripcion || undefined,
        notas_tecnicas: form.notas_tecnicas || undefined,
      };
      if (form.asignado_a) payload.asignado_a = parseInt(form.asignado_a);
      if (form.client_id) payload.client_id = parseInt(form.client_id);
      if (form.presupuesto_estimado) payload.presupuesto_estimado = parseInt(form.presupuesto_estimado);
      await onSave(averia.id, payload);
    } catch (e: any) {
      setError(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(averia.id);
    } catch (e: any) {
      setError(e?.message || 'Error al eliminar');
      setDeleting(false);
    }
  };

  const sev = SEVERIDAD_CONFIG[averia.severidad] || SEVERIDAD_CONFIG.media;
  const field = 'block w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none';

  return (
    <>
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setActivePhoto(null)}>
          <img src={activePhoto} className="max-w-full max-h-full rounded-xl" alt="foto" />
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-xl"><X size={24} /></button>
        </div>
      )}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[rgba(10,16,32,0.95)] border border-[rgba(255,255,255,0.07)] shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          <div className="sticky top-0 bg-[rgba(10,16,32,0.98)] border-b border-[rgba(255,255,255,0.06)] flex items-start justify-between px-5 py-4 z-10">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${sev.bg} ${sev.color}`}>{sev.label}</span>
                <span className="text-xs text-slate-400 bg-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded-lg">
                  {TIPOS_SERVICIO.find(t => t.value === averia.tipo_servicio)?.label || averia.tipo_servicio}
                </span>
              </div>
              <h2 className="font-bold text-slate-100 text-sm leading-snug">{averia.titulo}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Reportada por {averia.instalador_nombre || 'desconocido'} • {averia.created_at ? new Date(averia.created_at).toLocaleDateString('es-CL') : '—'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[rgba(255,255,255,0.06)] text-slate-400 hover:text-slate-100 flex-shrink-0"><X size={18} /></button>
          </div>

          <div className="p-5 space-y-4">
            {/* Fotos */}
            {averia.fotos?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2">Fotos del Problema</p>
                <div className="flex gap-2 flex-wrap">
                  {averia.fotos.map((f: string, i: number) => (
                    <img key={i} src={f} onClick={() => setActivePhoto(f)}
                      className="w-20 h-20 rounded-xl object-cover border border-[rgba(255,255,255,0.07)] cursor-pointer hover:opacity-90 transition-opacity"
                      alt={`foto ${i + 1}`} />
                  ))}
                </div>
              </div>
            )}

            {/* Descripcion */}
            {averia.descripcion && (
              <div className="bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(255,255,255,0.06)] p-3">
                <p className="text-xs font-semibold text-slate-400 mb-1">Descripción</p>
                <p className="text-sm text-slate-300">{averia.descripcion}</p>
              </div>
            )}

            {/* Estado */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Estado</label>
              <div className="flex gap-2 flex-wrap">
                {ESTADOS_ORDER.map(v => {
                  const cfg = ESTADO_CONFIG[v];
                  return (
                    <button key={v} onClick={() => setForm(p => ({ ...p, estado: v }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                        ${form.estado === v ? `${cfg.bg} ${cfg.color}` : 'border border-[rgba(255,255,255,0.08)] text-slate-400 hover:bg-[rgba(255,255,255,0.04)]'}`}>
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severidad */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Severidad</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(SEVERIDAD_CONFIG).map(([v, cfg]) => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, severidad: v }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${form.severidad === v ? `${cfg.bg} ${cfg.color}` : 'border border-[rgba(255,255,255,0.08)] text-slate-400 hover:bg-[rgba(255,255,255,0.04)]'}`}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Asignar técnico */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                <Wrench size={11} className="inline mr-1" />Asignar Técnico
              </label>
              <select value={form.asignado_a} onChange={set('asignado_a')} className={field}>
                <option value="">Sin asignar</option>
                {users.filter((u: any) => ['instalador', 'coordinador', 'jefe', 'gerente'].includes(u.rol)).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                ))}
              </select>
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                <User size={11} className="inline mr-1" />Cliente Asociado
              </label>
              <select value={form.client_id} onChange={set('client_id')} className={field}>
                <option value="">Sin cliente</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Presupuesto */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                <DollarSign size={11} className="inline mr-1" />Presupuesto Estimado (CLP)
              </label>
              <input type="number" value={form.presupuesto_estimado} onChange={set('presupuesto_estimado')}
                placeholder="0" className={field} />
            </div>

            {/* Notas técnicas */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Notas Técnicas</label>
              <textarea value={form.notas_tecnicas} onChange={set('notas_tecnicas')}
                placeholder="Diagnóstico, materiales necesarios, procedimiento..."
                rows={3} className={field} />
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
          </div>

          <div className="sticky bottom-0 bg-[rgba(10,16,32,0.98)] border-t border-[rgba(255,255,255,0.06)] px-5 py-4 flex gap-2">
            {confirmDelete ? (
              <>
                <p className="flex-1 text-xs text-red-400 font-medium self-center">¿Eliminar permanentemente?</p>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-sm text-slate-300 hover:bg-[rgba(255,255,255,0.04)]">No</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="px-3 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center gap-1">
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : null}Sí, eliminar
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setConfirmDelete(true)} className="p-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <X size={16} />
                </button>
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-sm font-medium text-slate-300 hover:bg-[rgba(255,255,255,0.04)]">
                  Cancelar
                </button>
                <button onClick={submit} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(99,102,241,0.35)]">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, gradient, sub }: { label: string; value: number | string; gradient: string; sub?: string }) {
  return (
    <div className={`rounded-2xl p-4 text-white bg-gradient-to-br ${gradient} shadow-sm`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function JefeAverias() {
  const [selected, setSelected] = useState<any | null>(null);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterSeveridad, setFilterSeveridad] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: averias, loading, error, refetch } = useApi(() => api.getAverias());
  const { data: stats, refetch: refetchStats } = useApi(() => api.getAveriaStats());
  const { data: users } = useApi(() => api.getUsers());
  const { data: clients } = useApi(() => api.getClients());

  const handleSave = async (id: number, data: Record<string, any>) => {
    await api.updateAveria(id, data);
    setSelected(null);
    refetch();
    refetchStats();
  };

  const handleDelete = async (id: number) => {
    await api.deleteAveria(id);
    setSelected(null);
    refetch();
    refetchStats();
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const list: any[] = averias || [];
  const userList: any[] = users || [];
  const clientList: any[] = clients || [];

  let filtered = list;
  if (filterEstado) filtered = filtered.filter((a: any) => a.estado === filterEstado);
  if (filterSeveridad) filtered = filtered.filter((a: any) => a.severidad === filterSeveridad);
  if (filterTipo) filtered = filtered.filter((a: any) => a.tipo_servicio === filterTipo);

  const s = stats || { total: 0, abiertas: 0, criticas: 0 };

  return (
    <div className="min-h-screen bg-[#060b14] p-4 pb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle size={22} className="text-amber-400" />
            Averías y Fallas
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Gestiona los reportes de fallas del equipo</p>
        </div>
        <button onClick={() => { refetch(); refetchStats(); }}
          className="p-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-slate-400 hover:bg-[rgba(255,255,255,0.04)] hover:text-slate-100">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KpiCard label="Total" value={s.total} gradient="from-slate-700 to-slate-900" />
        <KpiCard label="Abiertas" value={s.abiertas} gradient="from-amber-500 to-orange-600" />
        <KpiCard label="Críticas" value={s.criticas} gradient="from-red-500 to-red-700" />
      </div>

      {/* Filters toggle */}
      <div className="mb-4">
        <button onClick={() => setShowFilters(v => !v)}
          className="flex items-center gap-2 text-sm text-slate-400 font-medium hover:text-slate-100">
          <SlidersHorizontal size={15} />
          Filtros
          <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          {(filterEstado || filterSeveridad || filterTipo) && (
            <span className="ml-1 px-1.5 py-0.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs rounded-full">
              {[filterEstado, filterSeveridad, filterTipo].filter(Boolean).length}
            </span>
          )}
        </button>

        {showFilters && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] backdrop-blur-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Estado</label>
              <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
                className="block w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
                <option value="">Todos</option>
                {ESTADOS_ORDER.map(v => (
                  <option key={v} value={v}>{ESTADO_CONFIG[v]?.label || v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Severidad</label>
              <select value={filterSeveridad} onChange={e => setFilterSeveridad(e.target.value)}
                className="block w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
                <option value="">Todas</option>
                {Object.entries(SEVERIDAD_CONFIG).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo Servicio</label>
              <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
                className="block w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
                <option value="">Todos</option>
                {TIPOS_SERVICIO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {(filterEstado || filterSeveridad || filterTipo) && (
              <button onClick={() => { setFilterEstado(''); setFilterSeveridad(''); setFilterTipo(''); }}
                className="col-span-full text-xs text-red-400 hover:text-red-300 font-medium text-left">
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-500 mb-3">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <Wrench size={40} className="opacity-30" />
          <p className="text-sm font-medium">No hay averías con los filtros seleccionados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a: any) => {
            const sev = SEVERIDAD_CONFIG[a.severidad] || SEVERIDAD_CONFIG.media;
            const est = ESTADO_CONFIG[a.estado] || ESTADO_CONFIG.reportada;
            return (
              <button key={a.id} onClick={() => setSelected(a)}
                className="w-full rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] backdrop-blur-xl p-4 text-left hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.02)] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${sev.bg} ${sev.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                        {sev.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${est.bg} ${est.color}`}>{est.label}</span>
                      <span className="text-xs text-slate-400 bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-lg">
                        {TIPOS_SERVICIO.find(t => t.value === a.tipo_servicio)?.label || a.tipo_servicio}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-100 text-sm">{a.titulo}</h3>
                    {a.descripcion && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{a.descripcion}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {a.instalador_nombre && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <User size={11} />Reportado por: {a.instalador_nombre}
                        </span>
                      )}
                      {a.client_nombre && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Package size={11} />{a.client_nombre}
                        </span>
                      )}
                      {a.asignado_nombre && (
                        <span className="flex items-center gap-1 text-xs text-violet-400 font-medium">
                          <Wrench size={11} />{a.asignado_nombre}
                        </span>
                      )}
                      {a.presupuesto_estimado && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <DollarSign size={11} />${a.presupuesto_estimado.toLocaleString('es-CL')}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-500 ml-auto">
                        <Clock size={11} />
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('es-CL') : '—'}
                      </span>
                    </div>
                  </div>
                  {a.fotos?.length > 0 && (
                    <img src={a.fotos[0]} className="w-14 h-14 rounded-xl object-cover border border-[rgba(255,255,255,0.07)] flex-shrink-0" alt="foto" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <AveriaModal
          averia={selected}
          users={userList}
          clients={clientList}
          onSave={handleSave}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// Re-export so coordinador can use same page
export { JefeAverias as CoordinadorAverias };
