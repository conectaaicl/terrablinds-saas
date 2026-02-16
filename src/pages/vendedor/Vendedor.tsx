import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Store } from '../../data/store';
import { useAuth } from '../../context/AuthContext';
import { ESTADO_CONFIG, TIPOS_PRODUCTO, TELAS, COLORES } from '../../types';
// import { QuotationActions } from '../../components/IntegrationPlaceholders';
import type { ProductoLinea, EstadoOrden } from '../../types';
import {
  FileText, ChevronRight, Plus, Trash2, ArrowLeft, Clock, User, Ruler,
  Palette, CheckCircle, Search, ShoppingBag
} from 'lucide-react';

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

// ═══════════════════════════════════════
// MIS COTIZACIONES / PEDIDOS
// ═══════════════════════════════════════
export function MisCotizaciones() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const ordenes = useMemo(() => Store.getOrdenes(user?.tenantId).filter(o => o.vendedorId === user?.id), [user]);
  const cots = useMemo(() => Store.getCotizaciones(user?.tenantId).filter(c => c.vendedorId === user?.id && c.estado === 'pendiente'), [user]);

  const items = useMemo(() => {
    const list: { id: string; clienteId: string; fecha: string; total: number; estado: string; cfg: { bg: string; color: string }; prods: number; link: string }[] = [];
    cots.forEach(c => list.push({
      id: c.id, clienteId: c.clienteId, fecha: c.fecha, total: c.precioTotal,
      estado: 'Pendiente', cfg: { bg: 'bg-yellow-50', color: 'text-yellow-700' },
      prods: c.productos.length, link: '#',
    }));
    ordenes.forEach(o => {
      const ec = ESTADO_CONFIG[o.estado];
      list.push({
        id: o.id, clienteId: o.clienteId, fecha: o.fechaCreacion, total: o.precioTotal,
        estado: ec.label, cfg: { bg: ec.bg, color: ec.color },
        prods: o.productos.length, link: `/vendedor/pedido/${o.id}`,
      });
    });
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [ordenes, cots]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(it => {
      const cli = Store.getClienteById(it.clienteId);
      return it.id.toLowerCase().includes(s) || cli?.nombre.toLowerCase().includes(s);
    });
  }, [items, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Pedidos</h1>
          <p className="text-sm text-slate-500">{items.length} registros</p>
        </div>
        <Link to="/vendedor/nueva"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          <Plus size={17} /> Nueva Cotización
        </Link>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por N° o cliente..."
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
      </div>

      <div className="space-y-2">
        {filtered.map(it => {
          const cli = Store.getClienteById(it.clienteId);
          return (
            <Link key={it.id} to={it.link}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${it.link === '#' ? 'bg-slate-100' : 'bg-blue-50'}`}>
                  {it.link === '#' ? <FileText size={17} className="text-slate-400" /> : <ShoppingBag size={17} className="text-blue-500" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{it.id}</p>
                  <p className="truncate text-xs text-slate-500">{cli?.nombre} · {it.prods} prod. · {it.fecha}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{fmt(it.total)}</p>
                  <span className={`text-[11px] font-semibold ${it.cfg.color}`}>{it.estado}</span>
                </div>
                <ChevronRight size={15} className="text-slate-300" />
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-14 text-center text-sm text-slate-400">
            Sin resultados
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// NUEVA COTIZACIÓN (wizard 3 pasos)
// ═══════════════════════════════════════
export function NuevaCotizacion() {
  const { user } = useAuth();
  const nav = useNavigate();
  const tenantId = user?.tenantId || '';
  const [step, setStep] = useState(1);

  const [selCliente, setSelCliente] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [nc, setNc] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [productos, setProductos] = useState<ProductoLinea[]>([]);
  const [cp, setCp] = useState({ tipo: TIPOS_PRODUCTO[0], ancho: 100, alto: 100, tela: TELAS[0], color: COLORES[0], precio: 0, notas: '' });

  const misClientes = useMemo(() => Store.getClientes(tenantId).filter(c => c.vendedorId === user?.id), [user, tenantId]);
  const total = productos.reduce((s, p) => s + p.precio, 0);

  const addProd = () => {
    if (!cp.precio) return;
    setProductos(prev => [...prev, { id: Store.uid(), tipo: cp.tipo, ancho: cp.ancho, alto: cp.alto, tela: cp.tela, color: cp.color, precio: cp.precio, notas: cp.notas || undefined }]);
    setCp(p => ({ ...p, precio: 0, notas: '' }));
  };

  const rmProd = (i: number) => setProductos(p => p.filter((_, j) => j !== i));

  const crear = useCallback(() => {
    if (!user) return;
    let cid = selCliente;
    if (isNew) {
      const c = Store.addCliente({ ...nc, vendedorId: user.id, tenantId });
      cid = c.id;
    }
    const cot = Store.addCotizacion({
      clienteId: cid, vendedorId: user.id, tenantId,
      productos, precioTotal: total,
      fecha: new Date().toISOString().split('T')[0],
      estado: 'pendiente',
    });
    Store.confirmarCotizacion(cot.id, user);
    nav('/vendedor');
  }, [user, selCliente, isNew, nc, productos, total, nav, tenantId]);

  const canNext1 = isNew ? nc.nombre.length > 0 : !!selCliente;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav('/vendedor')} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nueva Cotización</h1>
        <p className="text-sm text-slate-500">Paso {step} de 3</p>
      </div>

      <div className="flex gap-1.5">
        {[1, 2, 3].map(s => (
          <div key={s} className="h-1 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: s <= step ? 'var(--brand-primary)' : '#e2e8f0' }} />
        ))}
      </div>

      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Seleccionar Cliente</h2>
          <div className="mb-4 flex gap-2">
            <TabBtn active={!isNew} onClick={() => setIsNew(false)}>Existente</TabBtn>
            <TabBtn active={isNew} onClick={() => setIsNew(true)}>Nuevo</TabBtn>
          </div>
          {!isNew ? (
            <div className="space-y-2">
              {misClientes.map(c => (
                <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${selCliente === c.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="cli" value={c.id} checked={selCliente === c.id} onChange={() => setSelCliente(c.id)} className="accent-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.nombre}</p>
                    <p className="text-xs text-slate-500">{c.telefono} · {c.direccion}</p>
                  </div>
                </label>
              ))}
              {misClientes.length === 0 && <p className="text-sm text-slate-400">No tienes clientes, crea uno nuevo.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <Input label="Nombre *" value={nc.nombre} onChange={v => setNc(n => ({ ...n, nombre: v }))} />
              <Input label="Teléfono" value={nc.telefono} onChange={v => setNc(n => ({ ...n, telefono: v }))} />
              <Input label="Email" value={nc.email} onChange={v => setNc(n => ({ ...n, email: v }))} />
              <Input label="Dirección" value={nc.direccion} onChange={v => setNc(n => ({ ...n, direccion: v }))} />
            </div>
          )}
          <button onClick={() => setStep(2)} disabled={!canNext1}
            className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            Siguiente: Productos →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Productos</h2>
          <div className="mb-4 rounded-lg bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Sel label="Tipo" value={cp.tipo} opts={TIPOS_PRODUCTO} onChange={v => setCp(p => ({ ...p, tipo: v }))} />
              <Sel label="Tela" value={cp.tela} opts={TELAS} onChange={v => setCp(p => ({ ...p, tela: v }))} />
              <Input label="Ancho (cm)" type="number" value={String(cp.ancho)} onChange={v => setCp(p => ({ ...p, ancho: +v }))} />
              <Input label="Alto (cm)" type="number" value={String(cp.alto)} onChange={v => setCp(p => ({ ...p, alto: +v }))} />
              <Sel label="Color" value={cp.color} opts={COLORES} onChange={v => setCp(p => ({ ...p, color: v }))} />
              <Input label="Precio ($)" type="number" value={cp.precio ? String(cp.precio) : ''} onChange={v => setCp(p => ({ ...p, precio: +v }))} placeholder="0" />
            </div>
            <button onClick={addProd} disabled={!cp.precio}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              <Plus size={15} /> Agregar Producto
            </button>
          </div>

          {productos.length > 0 && (
            <div className="space-y-2">
              {productos.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.tipo}</p>
                    <p className="text-xs text-slate-500">{p.ancho}×{p.alto} cm · {p.tela} · {p.color}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{fmt(p.precio)}</span>
                    <button onClick={() => rmProd(i)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end border-t border-slate-100 pt-2">
                <p className="text-base font-bold text-slate-900">Total: {fmt(total)}</p>
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Atrás</button>
            <button onClick={() => setStep(3)} disabled={productos.length === 0}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              Siguiente: Confirmar →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Resumen</h2>
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Cliente</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {isNew ? nc.nombre : Store.getClienteById(selCliente)?.nombre}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Productos ({productos.length})</p>
              {productos.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.tipo}</p>
                    <p className="text-xs text-slate-500">{p.ancho}×{p.alto} cm · {p.tela} · {p.color}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{fmt(p.precio)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t border-slate-100 pt-3">
              <p className="text-xl font-bold text-slate-900">Total: {fmt(total)}</p>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Atrás</button>
            <button onClick={crear}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
              <CheckCircle size={17} /> Confirmar Pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// DETALLE PEDIDO
// ═══════════════════════════════════════
export function PedidoDetalle() {
  const { id } = useParams();
  const nav = useNavigate();

  const orden = useMemo(() => id ? Store.getOrdenById(id) : undefined, [id]);
  const cli = useMemo(() => orden ? Store.getClienteById(orden.clienteId) : undefined, [orden]);

  if (!orden) return <div className="py-20 text-center text-slate-400">Pedido no encontrado</div>;
  const cfg = ESTADO_CONFIG[orden.estado];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav('/vendedor')} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{orden.id}</h1>
          <p className="text-sm text-slate-500">{orden.fechaCreacion}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Cliente</h2>
        <p className="text-sm font-medium text-slate-800">{cli?.nombre}</p>
        <p className="text-xs text-slate-500">{cli?.telefono} · {cli?.email}</p>
        <p className="text-xs text-slate-500">{cli?.direccion}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Productos</h2>
        <div className="space-y-2">
          {orden.productos.map((p, i) => (
            <div key={p.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-800">{i + 1}. {p.tipo}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Ruler size={12} />{p.ancho}×{p.alto} cm</span>
                <span className="flex items-center gap-1"><Palette size={12} />{p.tela} · {p.color}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900"><Clock size={16} /> Seguimiento</h2>
        <div className="space-y-0">
          {[...orden.historial].reverse().map((h, i) => {
            const c = ESTADO_CONFIG[h.estado as EstadoOrden];
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${i === 0 ? c.dot : 'bg-slate-300'}`} />
                  {i < orden.historial.length - 1 && <div className="h-full w-px bg-slate-200" />}
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
      </div>
    </div>
  );
}

// ── Small Components ──
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500" />
    </div>
  );
}

function Sel({ label, value, opts, onChange }: {
  label: string; value: string; opts: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500">
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
