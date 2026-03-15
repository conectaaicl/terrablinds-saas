import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import { PackageSearch, Plus, X, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

const URGENCIA_CFG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  baja:   { label: 'Baja',   bg: 'bg-slate-100',  color: 'text-slate-600',  icon: <Clock size={12} /> },
  media:  { label: 'Media',  bg: 'bg-amber-100',  color: 'text-amber-700',  icon: <Clock size={12} /> },
  alta:   { label: 'Alta',   bg: 'bg-red-100',    color: 'text-red-700',    icon: <AlertTriangle size={12} /> },
};

// ═══════════════════════════════════════
// MIS SOLICITUDES DE INSUMOS — Fabricante
// ═══════════════════════════════════════
export default function MisSolicitudes() {
  const [modal, setModal] = useState(false);

  const { data, loading, error, refetch } = useApi(() => api.getInsumos());
  const { execute: createInsumo, loading: creating, error: createErr } = useMutation(
    ({ items, urgencia }: { items: string[]; urgencia: string }) => api.createInsumo(items, urgencia)
  );

  const solicitudes: any[] = data || [];

  const handleCreate = async (items: string[], urgencia: string) => {
    const res = await createInsumo({ items, urgencia });
    if (res) {
      refetch();
      setModal(false);
    }
  };

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente' || !s.estado);
  const atendidas  = solicitudes.filter(s => s.estado && s.estado !== 'pendiente');

  if (loading) return <Spinner />;
  if (error)   return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Solicitudes</h1>
          <p className="text-sm text-slate-500">Solicitudes de insumos y materiales</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          <Plus size={16} /> Nueva Solicitud
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2"><Clock size={18} className="text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pendientes.length}</p>
              <p className="text-xs text-slate-500">Pendientes</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2"><CheckCircle2 size={18} className="text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{atendidas.length}</p>
              <p className="text-xs text-slate-500">Atendidas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-100 p-2"><PackageSearch size={18} className="text-rose-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{solicitudes.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending */}
      {pendientes.length > 0 && (
        <Section title="Pendientes" items={pendientes} />
      )}

      {/* Attended */}
      {atendidas.length > 0 && (
        <Section title="Atendidas" items={atendidas} dimmed />
      )}

      {solicitudes.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-14 text-center">
          <PackageSearch size={40} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">Sin solicitudes aún</p>
          <p className="mt-1 text-xs text-slate-400">Crea tu primera solicitud de insumos</p>
        </div>
      )}

      {modal && (
        <NuevaSolicitudModal
          onClose={() => setModal(false)}
          onSubmit={handleCreate}
          loading={creating}
          error={createErr}
        />
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────
function Section({ title, items, dimmed }: { title: string; items: any[]; dimmed?: boolean }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h2>
      <div className="space-y-3">
        {items.map(s => {
          const urgCfg = URGENCIA_CFG[s.urgencia] || URGENCIA_CFG.media;
          const itemsList: string[] = s.items || [];
          return (
            <div key={s.id} className={`rounded-xl border border-slate-200 bg-white p-4 ${dimmed ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-slate-800">Solicitud #{s.id}</span>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgCfg.bg} ${urgCfg.color}`}>
                      {urgCfg.icon} {urgCfg.label}
                    </span>
                    {s.estado && s.estado !== 'pendiente' && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {s.estado}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {itemsList.map((item, i) => (
                      <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] text-slate-400">{fmtDate(s.created_at)}</p>
                  <p className="text-[11px] text-slate-400">{itemsList.length} ítem{itemsList.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Nueva Solicitud Modal ─────────────────────────────────────
function NuevaSolicitudModal({ onClose, onSubmit, loading, error }: {
  onClose: () => void;
  onSubmit: (items: string[], urgencia: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [urgencia, setUrgencia] = useState<'baja' | 'media' | 'alta'>('media');
  const [itemInput, setItemInput] = useState('');
  const [items, setItems] = useState<string[]>([]);

  const addItem = () => {
    const trimmed = itemInput.trim();
    if (trimmed && !items.includes(trimmed)) {
      setItems(prev => [...prev, trimmed]);
      setItemInput('');
    }
  };

  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    onSubmit(items, urgencia);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Nueva Solicitud de Insumos</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {/* Urgencia */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Urgencia</label>
            <div className="grid grid-cols-3 gap-2">
              {(['baja', 'media', 'alta'] as const).map(u => {
                const cfg = URGENCIA_CFG[u];
                return (
                  <button key={u} type="button" onClick={() => setUrgencia(u)}
                    className={`rounded-lg border-2 py-2 text-xs font-semibold transition ${
                      urgencia === u
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : 'border-slate-200 text-slate-500 hover:border-slate-400'
                    }`}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Materiales / Insumos</label>
            <div className="flex gap-2">
              <input
                value={itemInput}
                onChange={e => setItemInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ej: Tela blackout 3m..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <button type="button" onClick={addItem}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
                <Plus size={15} />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Presiona Enter o el botón + para agregar cada ítem</p>

            {items.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                    {item}
                    <button type="button" onClick={() => removeItem(i)} className="hover:text-rose-900">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading || items.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              {loading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
