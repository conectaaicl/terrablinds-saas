import { Link } from 'react-router-dom';
import {
  ClipboardList, Factory, MapPin, Users, MessageCircle,
  BarChart3, ArrowRight, CheckCircle, Star, Zap, Shield,
} from 'lucide-react';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Cotizaciones inteligentes',
    desc: 'Genera cotizaciones profesionales con cálculo automático de medidas, precios y plazos de entrega.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Factory,
    title: 'Cola de producción',
    desc: 'Asigna órdenes al fabricante y sigue el estado en tiempo real desde toma de medidas hasta instalación.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: MapPin,
    title: 'GPS de instaladores',
    desc: 'Visualiza en el mapa dónde están tus instaladores y agenda instalaciones eficientemente.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Users,
    title: '6 Roles de trabajo',
    desc: 'Jefe, Gerente, Coordinador, Vendedor, Fabricante e Instalador. Cada uno ve solo lo que necesita.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: MessageCircle,
    title: 'Chat interno',
    desc: 'Comunicación directa entre áreas del taller sin salir del sistema. Historial completo.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: BarChart3,
    title: 'Dashboard en tiempo real',
    desc: 'Métricas de ventas, producción e instalaciones. Decisiones basadas en datos reales.',
    color: 'bg-cyan-50 text-cyan-600',
  },
];

const PLANS = [
  {
    name: 'Trial',
    price: 'Gratis',
    period: '14 días',
    desc: 'Para que conozcas el sistema sin compromisos.',
    features: ['Hasta 2 usuarios', 'Cotizaciones ilimitadas', 'Chat interno', 'Soporte por email'],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    name: 'Básico',
    price: '$29.990',
    period: '/mes',
    desc: 'Para talleres pequeños que quieren crecer.',
    features: ['Hasta 5 usuarios', 'Todos los roles', 'GPS de instaladores', 'Dashboard de métricas', 'Soporte prioritario'],
    cta: 'Elegir Básico',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$59.990',
    period: '/mes',
    desc: 'Para empresas que no pueden parar.',
    features: ['Usuarios ilimitados', 'Multi-sucursal', 'API acceso', 'Firma digital instaladores', 'Onboarding personalizado', 'SLA garantizado'],
    cta: 'Elegir Pro',
    highlight: true,
  },
];

const TESTIMONIALS = [
  {
    name: 'TerraBlinds',
    role: 'Cortinas y Persianas a Medida',
    text: 'Usamos WorkShopOS internamente para gestionar más de 200 órdenes al mes. Nos ayudó a reducir errores y mejorar los tiempos de entrega un 40%.',
    emoji: '🪟',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 text-lg">⚡</div>
            <span className="text-lg font-black text-slate-900 tracking-tight">WorkShopOS</span>
          </div>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            <a href="#features" className="hover:text-slate-900 transition-colors">Funciones</a>
            <a href="#planes" className="hover:text-slate-900 transition-colors">Precios</a>
            <a href="#sobre" className="hover:text-slate-900 transition-colors">Sobre</a>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-600 transition-colors"
          >
            Acceder al Sistema <ArrowRight size={15} />
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#0f0f23] py-24 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-rose-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-sm font-semibold text-rose-300">
            <Zap size={14} /> Desarrollado por TerraBlinds · Para la industria que conocemos
          </span>
          <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight md:text-6xl">
            El sistema que necesita<br />
            <span className="bg-gradient-to-r from-rose-400 to-rose-300 bg-clip-text text-transparent">
              tu taller a medida
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400">
            WorkShopOS es el SaaS multi-tenant para talleres de fabricación e instalación.
            Gestiona cotizaciones, producción, GPS de instaladores y más — desde un solo lugar.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-2xl bg-rose-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-600 hover:scale-105"
            >
              Acceder al Sistema <ArrowRight size={18} />
            </Link>
            <a
              href="#planes"
              className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Ver precios
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-500">Sin tarjeta de crédito · 14 días de prueba gratis</p>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-slate-100 bg-slate-50 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 text-center md:grid-cols-4">
          {[
            { v: '6', l: 'Roles de trabajo' },
            { v: '100%', l: 'Multi-tenant' },
            { v: '∞', l: 'Órdenes mensuales' },
            { v: '14d', l: 'Trial gratis' },
          ].map(s => (
            <div key={s.l}>
              <p className="text-3xl font-black text-slate-900">{s.v}</p>
              <p className="text-sm text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-black text-slate-900 md:text-4xl">Todo en un sistema</h2>
            <p className="mx-auto max-w-xl text-slate-500">
              Diseñado por quienes trabajan en talleres de fabricación e instalación a medida.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className={`mb-4 inline-flex rounded-xl p-3 ${f.color}`}>
                  <f.icon size={22} />
                </div>
                <h3 className="mb-2 text-base font-bold text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-black text-slate-900">Así funciona el flujo</h2>
            <p className="text-slate-500">De la cotización a la instalación, todo trazado.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              { n: '1', t: 'Vendedor cotiza', d: 'Crea cotización con medidas y precios', e: '📋' },
              { n: '2', t: 'Cliente acepta', d: 'Se convierte en orden de producción', e: '✅' },
              { n: '3', t: 'Fabricante produce', d: 'Cola de producción con estado en vivo', e: '🏭' },
              { n: '4', t: 'Coordinador agenda', d: 'Asigna instalador y fecha', e: '📅' },
              { n: '5', t: 'Instalador instala', d: 'GPS, fotos y firma digital del cliente', e: '📍' },
            ].map((s, i) => (
              <div key={s.n} className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-2xl">
                  {s.e}
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-1">Paso {s.n}</p>
                <p className="text-sm font-bold text-slate-900 mb-1">{s.t}</p>
                <p className="text-xs text-slate-500">{s.d}</p>
                {i < 4 && <div className="mt-3 hidden h-px w-full border-t border-dashed border-slate-300 md:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="planes" className="py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-black text-slate-900">Planes y Precios</h2>
            <p className="text-slate-500">Precios en CLP · IVA incluido</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map(p => (
              <div key={p.name} className={`relative rounded-2xl p-6 ${p.highlight
                ? 'border-2 border-rose-500 bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-xl shadow-rose-500/20'
                : 'border border-slate-200 bg-white shadow-sm'}`}>
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-[11px] font-black uppercase text-amber-900">
                    Más popular
                  </span>
                )}
                <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${p.highlight ? 'text-rose-100' : 'text-rose-500'}`}>{p.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-3xl font-black ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.price}</span>
                  <span className={`text-sm mb-1 ${p.highlight ? 'text-rose-100' : 'text-slate-500'}`}>{p.period}</span>
                </div>
                <p className={`text-sm mb-5 ${p.highlight ? 'text-rose-100' : 'text-slate-500'}`}>{p.desc}</p>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle size={15} className={`mt-0.5 shrink-0 ${p.highlight ? 'text-rose-200' : 'text-emerald-500'}`} />
                      <span className={p.highlight ? 'text-white' : 'text-slate-700'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                    p.highlight
                      ? 'bg-white text-rose-600 hover:bg-rose-50'
                      : 'bg-rose-500 text-white hover:bg-rose-600'
                  }`}
                >
                  {p.cta} <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">{t.emoji}</div>
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-slate-700 italic leading-relaxed mb-5">"{t.text}"</p>
              <p className="font-bold text-slate-900">{t.name}</p>
              <p className="text-sm text-slate-500">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="py-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <span className="inline-block mb-3 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-500">
                Desarrollado por TerraBlinds
              </span>
              <h2 className="text-3xl font-black text-slate-900 mb-4">Construido desde adentro de la industria</h2>
              <p className="text-slate-500 leading-relaxed mb-4">
                TerraBlinds es una empresa de cortinas, persianas y toldos a medida en Chile. Al no encontrar
                un software que se adaptara a nuestros procesos reales, lo construimos nosotros mismos.
              </p>
              <p className="text-slate-500 leading-relaxed mb-6">
                WorkShopOS nació para resolver los problemas que vivimos cada día: cotizaciones perdidas,
                fabricantes sin información, instaladores sin coordinación. Hoy lo ofrecemos a otros talleres.
              </p>
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-rose-500 shrink-0" />
                <p className="text-sm text-slate-600">Datos aislados por empresa (multi-tenant con RLS)</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Talleres activos', value: '3+', icon: '🏭' },
                { label: 'Órdenes gestionadas', value: '500+', icon: '📋' },
                { label: 'Roles disponibles', value: '6', icon: '👥' },
                { label: 'Uptime', value: '99.9%', icon: '⚡' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm text-center">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <p className="text-2xl font-black text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] py-20 text-white text-center">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-4 text-4xl">⚡</div>
          <h2 className="mb-4 text-3xl font-black">¿Listo para modernizar tu taller?</h2>
          <p className="mb-8 text-slate-400">Sin instalación · Sin tarjeta de crédito · Desde cualquier dispositivo</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-10 py-4 text-base font-bold text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-600 hover:scale-105"
          >
            Empezar ahora <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 text-sm">⚡</div>
            <span className="font-bold text-slate-800">WorkShopOS</span>
          </div>
          <p className="text-sm text-slate-400">
            Desarrollado por <strong className="text-slate-600">TerraBlinds</strong> ·{' '}
            <a href="https://terrablinds.cl" target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:underline">terrablinds.cl</a>
          </p>
          <Link to="/login" className="text-sm font-semibold text-rose-500 hover:underline">
            Acceder al Sistema →
          </Link>
        </div>
      </footer>
    </div>
  );
}
