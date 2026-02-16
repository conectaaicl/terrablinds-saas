import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store } from '../data/store';
import { Eye, EyeOff, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { section: '🔴 Super Admin SaaS', accounts: [
    { email: 'admin@saas.com', pass: 'admin', rol: 'Super Admin', desc: 'Gestiona todos los talleres', color: 'bg-rose-500' },
  ]},
  { section: '☀️ Terrablinds (Cortinas & Toldos)', accounts: [
    { email: 'jefe@terrablinds.cl', pass: '1234', rol: 'Jefe / Dueño', desc: 'Ve todo el taller', color: 'bg-amber-500' },
    { email: 'coordinador@terrablinds.cl', pass: '1234', rol: 'Coordinadora', desc: 'Coordina agenda y operaciones', color: 'bg-cyan-500' },
    { email: 'andrea@terrablinds.cl', pass: '1234', rol: 'Vendedora', desc: 'Crea cotizaciones', color: 'bg-blue-500' },
    { email: 'roberto@terrablinds.cl', pass: '1234', rol: 'Fabricante', desc: 'Produce órdenes', color: 'bg-emerald-500' },
    { email: 'juan@terrablinds.cl', pass: '1234', rol: 'Instalador', desc: 'Instala pedidos', color: 'bg-violet-500' },
  ]},
  { section: '🪵 MaderaCraft (Muebles a Medida)', accounts: [
    { email: 'sofia@maderacraft.cl', pass: '1234', rol: 'Jefa / Dueña', desc: 'Ve todo el taller', color: 'bg-amber-500' },
    { email: 'luis@maderacraft.cl', pass: '1234', rol: 'Vendedor', desc: 'Crea cotizaciones', color: 'bg-blue-500' },
  ]},
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const tenantCount = useMemo(() => Store.getTenants().length, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!login(email, password)) {
      setError('Email o contraseña incorrectos. Usa las credenciales de demo abajo.');
    }
  };

  const fill = (em: string, pass: string) => {
    setEmail(em);
    setPassword(pass);
    setError('');
  };

  const resetAll = () => {
    if (confirm('¿Restaurar datos de demo? Se perderán todos los cambios.')) {
      Store.resetData();
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left - Hero (desktop only) */}
      <div className="hidden w-[50%] flex-col justify-between bg-[#0f0f23] p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 text-lg">⚡</div>
          <span className="text-lg font-bold text-white">WorkShopOS</span>
        </div>

        <div className="max-w-lg space-y-5">
          <h2 className="text-4xl font-extrabold leading-tight text-white">
            SaaS Multi-Tenant<br />
            <span className="text-rose-400">Marca Blanca</span>
          </h2>
          <p className="text-base leading-relaxed text-slate-400">
            Plataforma para talleres de fabricación e instalación a medida.
            Cada empresa con su propia marca, colores y datos aislados.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { t: 'Multi-Tenant', d: 'Datos aislados por empresa' },
              { t: 'Marca Blanca', d: 'Cada taller con su identidad' },
              { t: '5 Roles', d: 'Admin, Jefe, Vendedor, Fabricante, Instalador' },
              { t: `${tenantCount} Talleres Demo`, d: 'Con órdenes y usuarios reales' },
            ].map(f => (
              <div key={f.t} className="rounded-xl bg-white/5 p-4">
                <p className="text-sm font-semibold text-rose-300">{f.t}</p>
                <p className="mt-1 text-xs text-slate-400">{f.d}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">© 2025 WorkShopOS · SaaS para talleres a medida</p>
      </div>

      {/* Right - Login form */}
      <div className="flex w-full flex-col items-center justify-start overflow-y-auto px-5 py-8 lg:w-[50%] lg:justify-center lg:py-4">
        <div className="w-full max-w-[460px] space-y-5">
          {/* Mobile header */}
          <div className="text-center lg:hidden">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-2xl">⚡</div>
            <h1 className="mt-2 text-xl font-bold text-slate-800">WorkShopOS</h1>
            <p className="text-sm text-slate-500">SaaS Multi-Tenant para Talleres</p>
          </div>

          {/* Info: App móvil (PWA) */}
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <p className="font-semibold">Usa esta aplicación como APP en tu celular</p>
            <p className="mt-1 text-[11px] text-emerald-700">
              1. Abre esta página desde tu celular · 2. En el navegador toca "Agregar a la pantalla de inicio" · 3. Se instalará como app y se mantendrá sincronizada con la web.
            </p>
          </div>

          {/* Login form */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">Iniciar Sesión</h2>
            <p className="mt-1 text-sm text-slate-500">Ingresa con una cuenta de demo</p>

            <form onSubmit={submit} className="mt-4 space-y-3">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle size={15} className="shrink-0" /> {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="tu@email.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 active:scale-[0.98]">
                Entrar <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Demo accounts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">👇 Cuentas de Demo — Haz clic para usar</h3>
              <button onClick={resetAll}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100">
                <RotateCcw size={12} /> Reset
              </button>
            </div>

            {DEMO_ACCOUNTS.map(section => (
              <div key={section.section} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-600">{section.section}</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {section.accounts.map(acc => (
                    <button
                      key={acc.email}
                      onClick={() => fill(acc.email, acc.pass)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-blue-50"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${acc.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800">{acc.rol}</span>
                          <span className="text-[10px] text-slate-400">·</span>
                          <span className="truncate text-[11px] text-slate-500">{acc.email}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{acc.desc} · pass: {acc.pass}</p>
                      </div>
                      <ArrowRight size={13} className="shrink-0 text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-slate-400 lg:hidden">© 2025 WorkShopOS</p>
        </div>
      </div>
    </div>
  );
}
