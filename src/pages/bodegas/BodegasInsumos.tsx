import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  PackageSearch, Plus, X, AlertTriangle, Clock, CheckCircle2,
  ShoppingCart, Ban, ChevronDown,
} from 'lucide-react';

const URGENCIA_CFG: Record<string, { label: string; bg: string; color: string }> = {
  baja:  { label: 'Baja',  bg: 'bg-slate-100', color: 'text-slate-600' },
  media: { label: 'Media', bg: 'bg-amber-100',  color: 'text-amber-700' },
  alta:  { label: 'Alta',  bg: 'bg-red-100',    color: 'text-red-700'   },
};

const ESTADO_CFG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  pendiente:  { label: 'Pendiente',   bg: 'bg-amber-50',   color: 'text-amber-700',  icon: <Clock size={13} /> },
  en_proceso: { label: 'En proceso',  bg: 'bg-blue-50',    color: 'text-blue-700',   icon: <ShoppingCart size={13} /> },
  comprado:   { label: 'Comprado',    bg: 'bg-emerald-50', color: 'text-emerald-700',icon: <CheckCircle2 size={13} /> },
  cancelado:  { label: 'Cancelado',   bg: 'bg-slate-100',  color: 'text-slate-500',  icon: <Ban size={13} /> },
};

const ESTADO_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  pendiente:  [{ value: 'en_proceso', label: 'Marcar en proceso' }, { value: 'comprado', label: 'Marcar comprado' }, { value: 'cancelado', label: 'Cancelar' }],
  en_proceso: [{ value: 'comprado', label: 'Marcar comprado' }, { value: 'pendiente', label: 'Volver a pendiente' }, { value: 'cancelado', label: 'Cancelar' }],
  comprado:   [{ value: 'pendiente', label: 'Reabrir' }],
  cancelado:  [{ value: 'pendiente', label: 'Reabrir' }],
};

const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

export default function BodegasInsumos() {
  const [modal, setModal]       = useState(false);
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterUrgencia, setFilterUrgencia] = useState<string>('all');
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const { data, loading, error, refetch } = useApi(() => api.getInsumos());
  const { execute: createInsumo, loading: creating, error: createErr } = useMutation(
    ({ items, urgencia }: { items: string[]; urgencia: string }) => api.createInsumo(items, urgencia)
  );
  const { execute: updateEstado, loading: updating } = useMutation(
    ({ id, estado }: { id: number; estado: string }) => api.updateInsumoEstado(id, estado)
  );

  const solicitudes: any[] = data || [];

  const filtered = solicitudes.filter(s => {
    if (filterEstado !== 'all' && s.estado !== filterEstado) return false;
    if (filterUrgencia !== 'all' && s.urgencia !== filterUrgencia) return false;
    return true;
  });

  const counts = {
    pendiente:  solicitudes.filter(s => s.estado === 'pendiente').length,
    en_proceso: solicitudes.filter(s => s.estado === 'en_proceso').length,
    comprado:   solicitudes.filter(s => s.estado === 'comprado').length,
    cancelado:  solicitudes.filter(s => s.estado === 'cancelado').length,
  };

  const handleEstadoChange = async (id: number, estado: string) => {
    setOpenMenu(null);
    await updateEstado({ id, estado });
    refetch();
  };

  const handleCreate = async (items: string[], urgencia: string) => {
    const res = await createInsumo({ items, urgencia });
    if (res) { refetch(); setModal(false); }
  };

  if (loading) return <Spinner />;
  if (error)   return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitudes de Insumos</h1>
          <p className="text-sm text-slate-500">Gestión de materiales y compras</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 bg-teal-600"
        >
          <Plus size={16} /> Nueva Solicitud
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(counts).map(([k, v]) => {
          const cfg = ESTADO_CFG[k];
          return (
            <button
              key={k}
              onClick={() => setFilterEstado(filterEstado === k ? 'all' : k)}
              className={`rounded-xl border-2 p-4 text-left transition ${
                filterEstado === k
                  ? `${cfg.bg} border-current ${cfg.color}`
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-2xl font-bold text-slate-900">{v}</p>
              <p className="text-xs text-slate-500 mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-medium text-slate-400 self-center">Urgencia:</span>
        {['all', 'alta', 'media', 'baja'].map(u => (
          <button
            key={u}
            onClick={() => setFilterUrgencia(u)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filterUrgencia === u
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {u === 'all' ? 'Todas' : URGENCIA_CFG[u].label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-14 text-center">
          <PackageSearch size={40} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">Sin solicitudes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const urgCfg  = URGENCIA_CFG[s.urgencia] || URGENCIA_CFG.media;
            const estCfg  = ESTADO_CFG[s.estado]     || ESTADO_CFG.pendiente;
            const items: string[] = s.items || [];
            const transitions = ESTADO_TRANSITIONS[s.estado] || [];

            return (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-slate-800">#{s.id}</span>
                      {s.usuario_nombre && (
                        <span className="text-xs text-slate-500">{s.usuario_nombre}</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgCfg.bg} ${urgCfg.color}`}>
                        {urgCfg.label}
                      </span>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${estCfg.bg} ${estCfg.color}`}>
                        {estCfg.icon} {estCfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item, i) => (
                        <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400 hidden sm:block">{fmtDate(s.created_at)}</span>

                    {/* Status dropdown */}
                    {transitions.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}
                          disabled={updating}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                        >
                          Acción <ChevronDown size={12} />
                        </button>
                        {openMenu === s.id && (
                          <div className="absolute right-0 top-8 z-20 min-w-[170px] rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                            {transitions.map(t => (
                              <button
                                key={t.value}
                                onClick={() => handleEstadoChange(s.id, t.value)}
                                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition"
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {openMenu !== null && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}

      {/* Nueva Solicitud Modal */}
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

function NuevaSolicitudModal({ onClose, onSubmit, loading, error }: {
  onClose: () => void;
  onSubmit: (items: string[], urgencia: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [urgencia, setUrgencia] = useState<'baja' | 'media' | 'alta'>('media');
  const [itemInput, setItemInput] = useState('');
  const [items, setItems]         = useState<string[]>([]);

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

        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Urgencia</label>
            <div className="grid grid-cols-3 gap-2">
              {(['baja', 'media', 'alta'] as const).map(u => {
                const cfg = URGENCIA_CFG[u];
                return (
                  <button key={u} type="button" onClick={() => setUrgencia(u)}
                    className={`rounded-lg border-2 py-2 text-xs font-semibold transition ${
                      urgencia === u ? `${cfg.bg} ${cfg.color} border-current` : 'border-slate-200 text-slate-500 hover:border-slate-400'
                    }`}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Materiales / Insumos</label>
            <div className="flex gap-2">
              <input
                value={itemInput}
                onChange={e => setItemInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ej: Tela blackout 3m..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
              <button type="button" onClick={addItem}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
                <Plus size={15} />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Presiona Enter o + para agregar cada ítem</p>
            {items.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                    {item}
                    <button type="button" onClick={() => removeItem(i)} className="hover:text-teal-900"><X size={11} /></button>
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
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50 bg-teal-600">
              {loading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
