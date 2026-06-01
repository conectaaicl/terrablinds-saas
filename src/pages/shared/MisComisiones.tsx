import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Spinner } from '../../components/LoadingStates';
import { DollarSign, Package, ClipboardList } from 'lucide-react';

const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-CL');

function periodoActual() {
  return new Date().toISOString().slice(0, 7);
}

const ESTADO_BADGE: Record<string, string> = {
  borrador: 'bg-slate-700 text-slate-300',
  aprobada: 'bg-blue-900 text-blue-200',
  pagada: 'bg-emerald-900 text-emerald-200',
  pendiente: 'bg-amber-900 text-amber-200',
};

export default function MisComisiones() {
  const [periodo, setPeriodo] = useState(periodoActual());
  const [data, setData] = useState<any>(null);
  const [liqData, setLiqData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [comisiones, liqs] = await Promise.all([
        api.getMisComisiones(periodo),
        api.getLiquidaciones(periodo),
      ]);
      setData(comisiones);
      setLiqData(liqs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [periodo]);

  const comisiones = data?.comisiones || [];
  const total = data?.total || 0;
  const liq = liqData[0]; // employee only sees their own

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mis Comisiones</h1>
        <p className="text-sm text-slate-400 mt-1">Comisiones ganadas por tus ventas e instalaciones</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">Periodo:</label>
        <input
          type="month"
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:border-slate-400 outline-none"
        />
        {loading && <Spinner />}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-emerald-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Total Comisiones</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{fmt(total)}</p>
          <p className="text-xs text-slate-500 mt-1">{periodo}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} className="text-blue-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Ordenes con comision</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {new Set(comisiones.map((c: any) => c.order_id)).size}
          </p>
          <p className="text-xs text-slate-500 mt-1">{comisiones.length} registros</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={16} className="text-purple-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Liquidacion</span>
          </div>
          {liq ? (
            <>
              <p className="text-2xl font-bold text-white">{fmt(liq.total)}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[liq.estado] || ''}`}>
                {liq.estado}
              </span>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-500">—</p>
              <p className="text-xs text-slate-600 mt-1">Pendiente de generar</p>
            </>
          )}
        </div>
      </div>

      {/* Liquidacion detail if exists */}
      {liq && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-sm font-semibold text-slate-200 mb-3">Detalle de liquidacion — {liq.periodo}</p>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Sueldo Base</p>
              <p className="font-semibold text-slate-200">{fmt(liq.sueldo_base)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Comisiones</p>
              <p className="font-semibold text-emerald-400">{fmt(liq.total_comisiones)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Ajustes</p>
              <p className={`font-semibold ${liq.ajustes < 0 ? 'text-red-400' : 'text-slate-200'}`}>
                {liq.ajustes >= 0 ? '+' : ''}{fmt(liq.ajustes)}
              </p>
              {liq.notas_ajustes && <p className="text-xs text-slate-500 mt-0.5">{liq.notas_ajustes}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500">Total a Pagar</p>
              <p className="text-xl font-bold text-white">{fmt(liq.total)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Comisiones table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Orden</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Categoria</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Rol</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Cantidad</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Por Unidad</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Total</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {comisiones.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                  <DollarSign size={28} className="mx-auto mb-2 text-slate-700" />
                  Sin comisiones para {periodo}
                </td>
              </tr>
            )}
            {comisiones.map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-200">#{c.order_id}</td>
                <td className="px-4 py-3 text-slate-300">{c.categoria}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{c.rol}</span>
                </td>
                <td className="px-4 py-3 text-right text-slate-300">{c.cantidad}</td>
                <td className="px-4 py-3 text-right text-slate-400">{fmt(c.monto_por_unidad)}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-400">{fmt(c.total)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[c.estado] || ''}`}>
                    {c.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          {comisiones.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-600 bg-slate-800">
                <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Total del periodo:</td>
                <td className="px-4 py-3 text-right text-lg font-bold text-emerald-400">{fmt(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
