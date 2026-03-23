/**
 * Estadísticas de rendimiento por vendedor.
 * Ruta: /jefe/vendedores  (también /gerente/vendedores)
 */
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  TrendingUp, DollarSign, FileText, CheckCircle2,
  RefreshCw, Award, Target, BarChart3,
} from 'lucide-react';

const fmt = (n: number) => '$' + Number(n).toLocaleString('es-CL');
const pct = (n: number) => `${n.toFixed(1)}%`;

type VendedorStat = {
  vendedor_id: number;
  vendedor_nombre: string;
  ordenes_total: number;
  ordenes_mes: number;
  cerradas_total: number;
  cerradas_mes: number;
  monto_total: number;
  monto_mes: number;
  cot_total: number;
  cot_mes: number;
  tasa_conversion: number;
};

export default function VendedoresStats() {
  const { data, loading, error, refetch } = useApi(() => api.getVendedoresStats());
  const vendedores: VendedorStat[] = data || [];

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const maxMontoMes = Math.max(...vendedores.map(v => v.monto_mes), 1);
  const maxMontoTotal = Math.max(...vendedores.map(v => v.monto_total), 1);

  // Totales del equipo
  const totalMes = vendedores.reduce((s, v) => s + v.monto_mes, 0);
  const totalOrdenesMes = vendedores.reduce((s, v) => s + v.ordenes_mes, 0);
  const totalCotMes = vendedores.reduce((s, v) => s + v.cot_mes, 0);
  const avgConversion = vendedores.length
    ? (vendedores.reduce((s, v) => s + v.tasa_conversion, 0) / vendedores.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rendimiento de Ventas</h1>
          <p className="text-sm text-slate-500">{vendedores.length} vendedor(es) · Mes en curso vs. histórico</p>
        </div>
        <button onClick={refetch}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* KPIs del equipo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Facturado del Mes', value: fmt(totalMes), icon: DollarSign, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
          { label: 'Órdenes del Mes', value: totalOrdenesMes, icon: BarChart3, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
          { label: 'Cotizaciones del Mes', value: totalCotMes, icon: FileText, iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
          { label: 'Conversión Promedio', value: pct(avgConversion), icon: Target, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
              <div className={`rounded-lg p-1.5 ${s.iconBg}`}><s.icon size={15} className={s.iconColor} /></div>
            </div>
            <p className="text-xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {vendedores.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-16 text-center">
          <Award size={40} className="mx-auto text-slate-200" />
          <p className="mt-3 text-sm text-slate-500">No hay vendedores activos registrados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Ranking del mes */}
          <h2 className="text-sm font-semibold text-slate-700">Ranking mes en curso</h2>
          {vendedores.map((v, idx) => (
            <div key={v.vendedor_id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              {/* Header vendedor */}
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                  idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-400' : 'bg-slate-300'
                }`}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : String(idx + 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900">{v.vendedor_nombre}</p>
                  <p className="text-xs text-slate-500">
                    {v.cot_mes} cotizaciones · {v.ordenes_mes} órdenes este mes
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-emerald-600">{fmt(v.monto_mes)}</p>
                  <p className="text-xs text-slate-400">este mes</p>
                </div>
              </div>

              {/* Barra de monto del mes */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Facturación mes</span>
                  <span>{pct((v.monto_mes / maxMontoMes) * 100)} del top</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(v.monto_mes / maxMontoMes) * 100}%` }}
                  />
                </div>
              </div>

              {/* KPIs en grid */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCell
                  label="Total histórico"
                  value={fmt(v.monto_total)}
                  sub={<BarMini value={v.monto_total} max={maxMontoTotal} color="bg-blue-400" />}
                  icon={<DollarSign size={12} className="text-blue-400" />}
                />
                <KpiCell
                  label="Órdenes totales"
                  value={String(v.ordenes_total)}
                  sub={<span className="text-[10px] text-slate-400">{v.cerradas_total} cerradas</span>}
                  icon={<TrendingUp size={12} className="text-violet-400" />}
                />
                <KpiCell
                  label="Cotizaciones"
                  value={String(v.cot_total)}
                  sub={<span className="text-[10px] text-slate-400">{v.cot_mes} este mes</span>}
                  icon={<FileText size={12} className="text-amber-400" />}
                />
                <KpiCell
                  label="Conversión"
                  value={pct(v.tasa_conversion)}
                  sub={
                    <div className="h-1.5 w-full rounded-full bg-slate-100 mt-1">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(v.tasa_conversion, 100)}%` }} />
                    </div>
                  }
                  icon={<CheckCircle2 size={12} className="text-emerald-400" />}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCell({ label, value, sub, icon }: {
  label: string; value: string; sub: React.ReactNode; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-[10px] font-semibold uppercase text-slate-400">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-800">{value}</p>
      <div className="mt-1">{sub}</div>
    </div>
  );
}

function BarMini({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200 mt-1 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}
