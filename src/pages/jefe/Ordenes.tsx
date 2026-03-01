import { useState, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { ESTADO_CONFIG } from '../../types';
import type { EstadoOrden } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import { Search, Filter, ArrowLeft, Clock, User, Ruler, Palette, ChevronRight, Loader2, ExternalLink } from 'lucide-react';

function GoogleMapsLink({ direccion }: { direccion: string }) {
  const url = `https://maps.google.com/?q=${encodeURIComponent(direccion)}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
      <ExternalLink size={11} />{direccion}
    </a>
  );
}

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

// ═══════════════════════════════════════════════
// LISTA DE ÓRDENES
// ═══════════════════════════════════════════════
export function OrdenesLista() {
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const { data: orders, loading, error, refetch } = useApi(() => api.getOrders());
  const orderList: any[] = orders || [];

  const filtered = useMemo(() => orderList.filter(o => {
    const ms = !search ||
      String(o.numero).includes(search) ||
      (o.cliente_nombre || '').toLowerCase().includes(search.toLowerCase());
    const me = filtro === 'todos' || o.estado === filtro;
    return ms && me;
  }), [orderList, search, filtro]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Órdenes</h1>
        <p className="text-sm text-slate-500">{orderList.length} órdenes en total</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por N° o cliente..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
        </div>
        <div className="relative">
          <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={filtro} onChange={e => setFiltro(e.target.value)}
            className="rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm outline-none focus:border-slate-500">
            <option value="todos">Todos</option>
            {(Object.keys(ESTADO_CONFIG) as EstadoOrden[]).map(e => (
              <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="hidden px-4 py-3 md:table-cell">Vendedor</th>
              <th className="px-4 py-3">Estado</th>
              <th className="hidden px-4 py-3 text-right sm:table-cell">Total</th>
              <th className="hidden px-4 py-3 lg:table-cell">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(o => {
              const cfg = ESTADO_CONFIG[o.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;
              return (
                <tr key={o.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">#{o.numero}</td>
                  <td className="px-4 py-3 text-slate-600">{o.cliente_nombre || '—'}</td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{o.vendedor_nombre || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-right font-semibold text-slate-800 sm:table-cell">{fmt(o.precio_total)}</td>
                  <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/jefe/ordenes/${o.id}`} className="hover:opacity-70" style={{ color: 'var(--brand-primary)' }}>
                      <ChevronRight size={17} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-10 text-center text-sm text-slate-400">Sin resultados</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// DETALLE DE ORDEN
// ═══════════════════════════════════════════════
export function OrdenDetalle() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const numId = Number(id);

  const { data: orden, loading, error, refetch } = useApi(
    () => api.getOrder(numId),
    [numId]
  );
  const { data: fabricantes } = useApi(() => api.getUsersByRole('fabricante'));
  const { data: instaladores } = useApi(() => api.getUsersByRole('instalador'));

  const { execute: cambiarEstado, loading: changingEstado } = useMutation(
    (estado: string, notas?: string) => api.changeEstado(numId, estado, notas)
  );
  const { execute: asignarFab, loading: assigningFab } = useMutation(
    (uid: number) => api.assignFabricante(numId, uid)
  );
  const { execute: asignarIns, loading: assigningIns } = useMutation(
    (uid: number) => api.assignInstalador(numId, uid)
  );

  const doChange = useCallback(async (estado: string, notas?: string) => {
    const res = await cambiarEstado(estado, notas);
    if (res) refetch();
  }, [cambiarEstado, refetch]);

  const doAsignarFab = useCallback(async (uid: string) => {
    const res = await asignarFab(Number(uid));
    if (res) refetch();
  }, [asignarFab, refetch]);

  const doAsignarIns = useCallback(async (uid: string) => {
    const res = await asignarIns(Number(uid));
    if (res) refetch();
  }, [asignarIns, refetch]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!orden) return <div className="py-20 text-center text-slate-400">Orden no encontrada</div>;

  const cfg = ESTADO_CONFIG[orden.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;
  const fabList: any[] = fabricantes || [];
  const insList: any[] = instaladores || [];

  return (
    <div className="space-y-5">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">#{orden.numero}</h1>
          <p className="text-sm text-slate-500">Creada el {fmtDate(orden.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Personas</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard label="Cliente" name={orden.cliente_nombre} detail={undefined} direccion={orden.cliente_direccion} />
              <InfoCard label="Vendedor" name={orden.vendedor_nombre} detail={undefined} />

              {/* Fabricante */}
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-400">Fabricante</p>
                {orden.fabricante_nombre ? (
                  <p className="mt-1 text-sm font-medium text-slate-800">{orden.fabricante_nombre}</p>
                ) : orden.estado === 'confirmado' ? (
                  <select
                    defaultValue=""
                    onChange={e => e.target.value && doAsignarFab(e.target.value)}
                    disabled={assigningFab}
                    className="mt-1 w-full rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-sm font-medium text-amber-800"
                  >
                    <option value="" disabled>
                      {assigningFab ? 'Asignando...' : 'Asignar fabricante →'}
                    </option>
                    {fabList.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                ) : <p className="mt-1 text-sm text-slate-400">Sin asignar</p>}
              </div>

              {/* Instalador */}
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-400">Instalador</p>
                {orden.instalador_nombre ? (
                  <p className="mt-1 text-sm font-medium text-slate-800">{orden.instalador_nombre}</p>
                ) : orden.estado === 'fabricado' ? (
                  <select
                    defaultValue=""
                    onChange={e => e.target.value && doAsignarIns(e.target.value)}
                    disabled={assigningIns}
                    className="mt-1 w-full rounded border border-violet-300 bg-violet-50 px-2 py-1.5 text-sm font-medium text-violet-800"
                  >
                    <option value="" disabled>
                      {assigningIns ? 'Asignando...' : 'Asignar instalador →'}
                    </option>
                    {insList.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                ) : <p className="mt-1 text-sm text-slate-400">Sin asignar</p>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Productos ({orden.productos?.length || 0})
            </h2>
            <div className="space-y-2.5">
              {(orden.productos || []).map((p: any, i: number) => (
                <div key={p.id || i} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{i + 1}. {p.tipo}</p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Ruler size={12} />{p.ancho} × {p.alto} cm</span>
                        <span className="flex items-center gap-1"><Palette size={12} />{p.tela} · {p.color}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{fmt(p.precio)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-end border-t border-slate-100 pt-3">
                <p className="text-lg font-bold text-slate-900">Total: {fmt(orden.precio_total)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Acciones</h2>
            <div className="space-y-2">
              {changingEstado && (
                <div className="flex justify-center py-2">
                  <Loader2 size={18} className="animate-spin text-slate-400" />
                </div>
              )}
              {orden.estado === 'cotizado' && (
                <Btn onClick={() => doChange('cotizacion_enviada')} color="blue">Enviar Cotización</Btn>
              )}
              {orden.estado === 'cotizacion_enviada' && (
                <Btn onClick={() => doChange('confirmado')} color="blue">Confirmar Orden</Btn>
              )}
              {orden.estado === 'confirmado' && (
                <Btn onClick={() => doChange('en_fabricacion')} color="amber">Iniciar Fabricación</Btn>
              )}
              {!['problema', 'cerrado', 'cancelado', 'rechazado'].includes(orden.estado) && (
                <Btn onClick={() => {
                  const notas = prompt('Describe el problema:');
                  if (notas) doChange('problema', notas);
                }} color="red" outline>Marcar Problema</Btn>
              )}
              {orden.estado === 'problema' && (
                <Btn onClick={() => doChange('confirmado')} color="blue">Reactivar como Confirmado</Btn>
              )}
              {!['cerrado', 'cancelado', 'rechazado'].includes(orden.estado) && (
                <Btn onClick={() => {
                  const notas = prompt('Motivo de cancelación:');
                  if (notas) doChange('cancelado', notas);
                }} color="red" outline>Cancelar Orden</Btn>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Clock size={16} /> Historial
            </h2>
            <Timeline entries={[...(orden.historial || [])].reverse()} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──
function InfoCard({ label, name, detail, direccion }: { label: string; name?: string; detail?: string; direccion?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{name || '—'}</p>
      {detail && <p className="whitespace-pre-line text-xs text-slate-500">{detail}</p>}
      {direccion && <GoogleMapsLink direccion={direccion} />}
    </div>
  );
}

function Btn({ children, onClick, color, outline }: { children: React.ReactNode; onClick: () => void; color: string; outline?: boolean }) {
  const base = outline
    ? `border ${color === 'red' ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`
    : `text-white ${color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' : color === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`;
  return <button onClick={onClick} className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition ${base}`}>{children}</button>;
}

function Timeline({ entries }: { entries: { estado: string; fecha: string; usuario_nombre: string; notas?: string }[] }) {
  return (
    <div className="space-y-0">
      {entries.map((h, i) => {
        const c = ESTADO_CONFIG[h.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${i === 0 ? c.dot : 'bg-slate-300'}`} />
              {i < entries.length - 1 && <div className="h-full w-px bg-slate-200" />}
            </div>
            <div className="pb-3">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.bg} ${c.color}`}>{c.label}</span>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                <User size={10} />{h.usuario_nombre}
              </p>
              <p className="text-[11px] text-slate-400">{fmtDate(h.fecha)}</p>
              {h.notas && <p className="text-[11px] italic text-slate-400">{h.notas}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
