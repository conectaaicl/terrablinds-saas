import { useState, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Store } from '../../data/store';
import { useAuth } from '../../context/AuthContext';
import { ESTADO_CONFIG } from '../../types';
import type { EstadoOrden } from '../../types';
import { Search, Filter, ArrowLeft, Clock, User, Ruler, Palette, ChevronRight } from 'lucide-react';

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

// ═══════════════════════════════════════════════
// LISTA DE ÓRDENES
// ═══════════════════════════════════════════════
export function OrdenesLista() {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const ordenes = useMemo(() => Store.getOrdenes(tenantId), [tenantId]);

  const filtered = useMemo(() => ordenes.filter(o => {
    const cli = Store.getClienteById(o.clienteId);
    const ms = !search || o.id.toLowerCase().includes(search.toLowerCase()) || cli?.nombre.toLowerCase().includes(search.toLowerCase());
    const me = filtro === 'todos' || o.estado === filtro;
    return ms && me;
  }), [ordenes, search, filtro]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Órdenes</h1>
        <p className="text-sm text-slate-500">{ordenes.length} órdenes en total</p>
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
              const cli = Store.getClienteById(o.clienteId);
              const ven = Store.getUsuarioById(o.vendedorId);
              const cfg = ESTADO_CONFIG[o.estado];
              return (
                <tr key={o.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{o.id}</td>
                  <td className="px-4 py-3 text-slate-600">{cli?.nombre}</td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{ven?.nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-right font-semibold text-slate-800 sm:table-cell">{fmt(o.precioTotal)}</td>
                  <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">{o.fechaCreacion}</td>
                  <td className="px-4 py-3">
                    <Link to={`/jefe/ordenes/${o.id}`} className="hover:opacity-70" style={{ color: 'var(--brand-primary)' }}><ChevronRight size={17} /></Link>
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
  const tenantId = user?.tenantId || '';
  const [v, setV] = useState(0);

  const orden = useMemo(() => { void v; return id ? Store.getOrdenById(id) : undefined; }, [id, v]);
  const cli = useMemo(() => orden ? Store.getClienteById(orden.clienteId) : undefined, [orden]);
  const ven = useMemo(() => orden ? Store.getUsuarioById(orden.vendedorId) : undefined, [orden]);
  const fab = useMemo(() => orden?.fabricanteId ? Store.getUsuarioById(orden.fabricanteId) : undefined, [orden]);
  const ins = useMemo(() => orden?.instaladorId ? Store.getUsuarioById(orden.instaladorId) : undefined, [orden]);
  const fabricantes = useMemo(() => Store.getUsuariosByRol('fabricante', tenantId), [tenantId]);
  const instaladores = useMemo(() => Store.getUsuariosByRol('instalador', tenantId), [tenantId]);

  const bump = () => setV(x => x + 1);

  const asignarFab = useCallback((fid: string) => {
    if (!orden || !user) return;
    Store.asignarFabricante(orden.id, fid, user);
    bump();
  }, [orden, user]);

  const asignarIns = useCallback((iid: string) => {
    if (!orden || !user) return;
    Store.asignarInstalador(orden.id, iid, user);
    bump();
  }, [orden, user]);

  const cambiar = useCallback((e: EstadoOrden) => {
    if (!orden || !user) return;
    Store.cambiarEstado(orden.id, e, user);
    bump();
  }, [orden, user]);

  if (!orden) return <div className="py-20 text-center text-slate-400">Orden no encontrada</div>;

  const cfg = ESTADO_CONFIG[orden.estado];

  return (
    <div className="space-y-5">
      <button onClick={() => nav('/jefe/ordenes')} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{orden.id}</h1>
          <p className="text-sm text-slate-500">Creada el {orden.fechaCreacion}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Personas</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard label="Cliente" name={cli?.nombre} detail={`${cli?.telefono}\n${cli?.direccion}`} />
              <InfoCard label="Vendedor" name={ven?.nombre} detail={ven?.email} />
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-400">Fabricante</p>
                {fab ? (
                  <><p className="mt-1 text-sm font-medium text-slate-800">{fab.nombre}</p><p className="text-xs text-slate-500">{fab.email}</p></>
                ) : orden.estado === 'confirmado' ? (
                  <select defaultValue="" onChange={e => asignarFab(e.target.value)}
                    className="mt-1 w-full rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-sm font-medium text-amber-800">
                    <option value="" disabled>Asignar fabricante →</option>
                    {fabricantes.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                ) : <p className="mt-1 text-sm text-slate-400">Sin asignar</p>}
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-400">Instalador</p>
                {ins ? (
                  <><p className="mt-1 text-sm font-medium text-slate-800">{ins.nombre}</p><p className="text-xs text-slate-500">{ins.email}</p></>
                ) : orden.estado === 'listo' ? (
                  <select defaultValue="" onChange={e => asignarIns(e.target.value)}
                    className="mt-1 w-full rounded border border-violet-300 bg-violet-50 px-2 py-1.5 text-sm font-medium text-violet-800">
                    <option value="" disabled>Asignar instalador →</option>
                    {instaladores.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                ) : <p className="mt-1 text-sm text-slate-400">Sin asignar</p>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Productos ({orden.productos.length})</h2>
            <div className="space-y-2.5">
              {orden.productos.map((p, i) => (
                <div key={p.id} className="rounded-lg border border-slate-200 p-4">
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
                <p className="text-lg font-bold text-slate-900">Total: {fmt(orden.precioTotal)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Acciones</h2>
            <div className="space-y-2">
              {orden.estado === 'cotizado' && (
                <Btn onClick={() => cambiar('confirmado')} color="blue">Confirmar Orden</Btn>
              )}
              {orden.estado !== 'problema' && orden.estado !== 'instalado' && (
                <Btn onClick={() => cambiar('problema')} color="red" outline>Marcar Problema</Btn>
              )}
              {orden.estado === 'problema' && (
                <Btn onClick={() => cambiar('confirmado')} color="blue">Reactivar como Confirmado</Btn>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Clock size={16} /> Historial
            </h2>
            <Timeline entries={[...orden.historial].reverse()} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──
function InfoCard({ label, name, detail }: { label: string; name?: string; detail?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{name || '—'}</p>
      {detail && <p className="whitespace-pre-line text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function Btn({ children, onClick, color, outline }: { children: React.ReactNode; onClick: () => void; color: string; outline?: boolean }) {
  const base = outline
    ? `border ${color === 'red' ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`
    : `text-white ${color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' : color === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`;
  return <button onClick={onClick} className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition ${base}`}>{children}</button>;
}

function Timeline({ entries }: { entries: { estado: EstadoOrden; fecha: string; usuarioNombre: string }[] }) {
  return (
    <div className="space-y-0">
      {entries.map((h, i) => {
        const c = ESTADO_CONFIG[h.estado];
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${i === 0 ? c.dot : 'bg-slate-300'}`} />
              {i < entries.length - 1 && <div className="h-full w-px bg-slate-200" />}
            </div>
            <div className="pb-3">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.bg} ${c.color}`}>{c.label}</span>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500"><User size={10} />{h.usuarioNombre}</p>
              <p className="text-[11px] text-slate-400">{h.fecha}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
