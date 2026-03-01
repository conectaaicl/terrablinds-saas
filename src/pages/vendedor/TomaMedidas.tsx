import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { TIPOS_PRODUCTO, TELAS, COLORES } from '../../types';
import { Spinner } from '../../components/LoadingStates';
import { Plus, Trash2, ArrowLeft, Ruler, CheckCircle, ExternalLink } from 'lucide-react';

const fmt = (n: number) => n ? '$' + n.toLocaleString('es-CL') : '—';

type Ambiente = {
  nombre: string;
  tipo: string;
  ancho: number;
  alto: number;
  tela: string;
  color: string;
  precio: number;
  observaciones: string;
};

const AMBIENTES = ['Sala comedor', 'Dormitorio principal', 'Dormitorio 2', 'Dormitorio 3', 'Estudio', 'Cocina', 'Baño', 'Otro'];

const ambienteVacio = (): Ambiente => ({
  nombre: AMBIENTES[0],
  tipo: TIPOS_PRODUCTO[0],
  ancho: 100,
  alto: 100,
  tela: TELAS[0],
  color: COLORES[0],
  precio: 0,
  observaciones: '',
});

export default function TomaMedidas() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [selCliente, setSelCliente] = useState<number | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [nc, setNc] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [ambientes, setAmbientes] = useState<Ambiente[]>([ambienteVacio()]);
  const [saving, setSaving] = useState(false);
  const [guardadoId, setGuardadoId] = useState<string | null>(null);

  const { data: clientes, loading: loadingCli } = useApi(() => api.getClients());
  const { execute: crearCliente, loading: creatingCli } = useMutation(api.createClient);
  const { execute: crearCotizacion } = useMutation(api.createCotizacion);

  const clienteList: any[] = clientes || [];
  const total = ambientes.reduce((s, a) => s + (a.precio || 0), 0);

  const addAmbiente = () => setAmbientes(prev => [...prev, ambienteVacio()]);
  const rmAmbiente = (i: number) => setAmbientes(prev => prev.filter((_, j) => j !== i));
  const updateAmbiente = (i: number, field: keyof Ambiente, val: string | number) => {
    setAmbientes(prev => prev.map((a, j) => j === i ? { ...a, [field]: val } : a));
  };

  const canSave = (isNew ? nc.nombre.length > 0 : selCliente !== null) && ambientes.some(a => a.precio > 0);

  const guardarBorrador = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    try {
      let clienteId = selCliente;
      if (isNew) {
        const cli = await crearCliente({ nombre: nc.nombre, email: nc.email || undefined, telefono: nc.telefono || undefined, direccion: nc.direccion || undefined });
        if (!cli) return;
        clienteId = cli.id;
      }
      if (!clienteId) return;

      const productos = ambientes
        .filter(a => a.precio > 0)
        .map(a => ({
          tipo: a.tipo,
          ancho: a.ancho,
          alto: a.alto,
          tela: a.tela,
          color: a.color,
          precio: a.precio,
          ubicacion: a.nombre,
          notas: a.observaciones || undefined,
        }));

      const cot = await crearCotizacion({
        cliente_id: clienteId,
        productos,
        precio_total: total,
        notas: `Toma de medidas in situ — ${ambientes.length} ambiente(s)`,
      });

      if (cot) {
        setGuardadoId(cot.id);
      }
    } finally {
      setSaving(false);
    }
  };

  const irACotizacion = () => {
    if (guardadoId) nav(`/vendedor/cotizacion/${guardadoId}`);
  };

  const clienteSeleccionado = clienteList.find(c => c.id === selCliente);
  const direccionCliente = isNew ? nc.direccion : clienteSeleccionado?.direccion;

  if (loadingCli) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav('/vendedor')} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Toma de Medidas</h1>
        <p className="text-sm text-slate-500">Registra las medidas en casa del cliente</p>
      </div>

      {/* Éxito */}
      {guardadoId && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-800">✓ Medición guardada como borrador</p>
          <p className="mt-1 text-sm text-emerald-700">La cotización fue guardada. Puedes revisarla y enviarla al cliente.</p>
          <button onClick={irACotizacion}
            className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <CheckCircle size={15} /> Ver Cotización
          </button>
        </div>
      )}

      {/* Cliente */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Cliente</h2>
        <div className="mb-3 flex gap-2">
          <TabBtn active={!isNew} onClick={() => setIsNew(false)}>Existente</TabBtn>
          <TabBtn active={isNew} onClick={() => setIsNew(true)}>Nuevo</TabBtn>
        </div>

        {!isNew ? (
          <select
            value={selCliente ?? ''}
            onChange={e => setSelCliente(Number(e.target.value) || null)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="">— Seleccionar cliente —</option>
            {clienteList.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} {c.direccion ? `· ${c.direccion}` : ''}</option>
            ))}
          </select>
        ) : (
          <div className="space-y-3">
            <Input label="Nombre *" value={nc.nombre} onChange={v => setNc(n => ({ ...n, nombre: v }))} />
            <Input label="Teléfono" value={nc.telefono} onChange={v => setNc(n => ({ ...n, telefono: v }))} />
            <Input label="Email" value={nc.email} onChange={v => setNc(n => ({ ...n, email: v }))} />
            <Input label="Dirección" value={nc.direccion} onChange={v => setNc(n => ({ ...n, direccion: v }))} />
          </div>
        )}

        {direccionCliente && (
          <div className="mt-2">
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(direccionCliente)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink size={11} /> Ver en Google Maps
            </a>
          </div>
        )}
      </div>

      {/* Ambientes */}
      {ambientes.map((a, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Ambiente {i + 1}</h3>
            {ambientes.length > 1 && (
              <button onClick={() => rmAmbiente(i)} className="text-red-400 hover:text-red-600">
                <Trash2 size={15} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Sel label="Nombre del ambiente" value={a.nombre} opts={AMBIENTES}
                onChange={v => updateAmbiente(i, 'nombre', v)} />
            </div>
            <Sel label="Tipo producto" value={a.tipo} opts={TIPOS_PRODUCTO}
              onChange={v => updateAmbiente(i, 'tipo', v)} />
            <Sel label="Tela" value={a.tela} opts={TELAS}
              onChange={v => updateAmbiente(i, 'tela', v)} />
            <Input label="Ancho (cm)" type="number" value={String(a.ancho)}
              onChange={v => updateAmbiente(i, 'ancho', +v)} />
            <Input label="Alto (cm)" type="number" value={String(a.alto)}
              onChange={v => updateAmbiente(i, 'alto', +v)} />
            <Sel label="Color" value={a.color} opts={COLORES}
              onChange={v => updateAmbiente(i, 'color', v)} />
            <Input label="Precio estimado ($)" type="number" value={a.precio ? String(a.precio) : ''}
              onChange={v => updateAmbiente(i, 'precio', +v)} placeholder="0" />
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Observaciones</label>
              <textarea
                value={a.observaciones}
                onChange={e => updateAmbiente(i, 'observaciones', e.target.value)}
                rows={2}
                placeholder="Ej: techo en ángulo, rieles existentes..."
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
              />
            </div>
          </div>

          {a.precio > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
              <Ruler size={12} />
              <span>{a.ancho}×{a.alto} cm · {a.tela} · {a.color}</span>
              <span className="ml-auto font-semibold text-slate-800">{fmt(a.precio)}</span>
            </div>
          )}
        </div>
      ))}

      <button onClick={addAmbiente}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700">
        <Plus size={16} /> Agregar Ambiente
      </button>

      {/* Total y acciones */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-semibold text-slate-700">Total estimado</p>
          <p className="text-xl font-bold text-slate-900">{fmt(total)}</p>
        </div>
        <button
          onClick={guardarBorrador}
          disabled={!canSave || saving || creatingCli || !!guardadoId}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          <CheckCircle size={16} />
          {saving ? 'Guardando...' : guardadoId ? '✓ Guardado' : 'Guardar Cotización Borrador'}
        </button>
      </div>
    </div>
  );
}

// ── Micro componentes ──
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
