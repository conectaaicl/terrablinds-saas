import { Link } from 'react-router-dom';
import {
  ClipboardList, Factory, MapPin, Users, MessageCircle,
  BarChart3, ArrowRight, CheckCircle, Star, Zap, Shield, Sparkles,
} from 'lucide-react';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Cotizaciones inteligentes',
    desc: 'Genera cotizaciones profesionales con calculo automatico de medidas, precios y plazos de entrega.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Factory,
    title: 'Cola de produccion',
    desc: 'Asigna ordenes al fabricante y sigue el estado en tiempo real desde toma de medidas hasta instalacion.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: MapPin,
    title: 'GPS de instaladores',
    desc: 'Visualiza en el mapa donde estan tus instaladores y agenda instalaciones eficientemente.',
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
    desc: 'Comunicacion directa entre areas del taller sin salir del sistema. Historial completo.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: BarChart3,
    title: 'Dashboard en tiempo real',
    desc: 'Metricas de ventas, produccion e instalaciones. Decisiones basadas en datos reales.',
    color: 'bg-cyan-50 text-cyan-600',
  },
];

const PLANS = [
  {
    name: 'Trial',
    price: 'Gratis',
    period: '14 dias',
    desc: 'Para que conozcas el sistema sin compromisos.',
    features: ['Hasta 2 usuarios', 'Cotizaciones ilimitadas', 'Chat interno', 'Soporte por email'],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    name: 'Basico',
    price: '$29.990',
    period: '/mes',
    desc: 'Para talleres pequenos que quieren crecer.',
    features: ['Hasta 5 usuarios', 'Todos los roles', 'GPS de instaladores', 'Dashboard de metricas', 'Soporte prioritario'],
    cta: 'Elegir Basico',
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
    name: 'Roller Now SpA',
    role: 'Cortinas y Persianas a Medida — Santiago',
    text: 'ConectaWork transformo nuestra operacion. Gestionamos mas de 200 ordenes al mes con total trazabilidad. Los tiempos de entrega mejoraron un 40% en los primeros tres meses.',
    emoji: '🪟',
    stars: 5,
  },
  {
    name: 'Cierres del Norte',
    role: 'Cierres de Aluminio y Toldos — La Serena',
    text: 'Desde que implementamos ConectaWork, nuestra coordinacion entre vendedores e instaladores es impecable. El GPS en vivo y las notificaciones automaticas nos ahorraron horas de llamadas diarias.',
    emoji: '🏗️',
    stars: 5,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon-512.png" alt="ConectaWork" className="h-10 w-10 rounded-xl bg-white object-contain shadow-md" />
            <span className="text-lg font-black text-slate-900 tracking-tight">ConectaWork</span>
          </div>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            <a href="#features" className="hover:text-slate-900 transition-colors">Funciones</a>
            <a href="#planes" className="hover:text-slate-900 transition-colors">Precios</a>
            <a href="#sobre" className="hover:text-slate-900 transition-colors">Nosotros</a>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Acceder <ArrowRight size={15} />
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#09090f] via-[#0e0e1f] to-[#09090f] py-28 text-white">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-indigo-500/8 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full bg-violet-500/8 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-rose-500/5 blur-3xl" />
        </div>
        {/* Grid */}
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />

        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <img src="/logo.png" alt="ConectaWork" className="mx-auto mb-8 w-56 rounded-2xl bg-white p-4 shadow-2xl shadow-indigo-500/20" />
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-semibold text-indigo-300">
            <Sparkles size={14} /> Desarrollado por Conecta AI Corporation
          </span>
          <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight md:text-6xl">
            El sistema que necesita<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-300 bg-clip-text text-transparent">
              tu taller a medida
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400">
            ConectaWork es el SaaS multi-tenant para talleres de fabricacion e instalacion.
            Gestiona cotizaciones, produccion, GPS de instaladores y mas — desde un solo lugar.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-700 hover:scale-105"
            >
              Acceder al Sistema <ArrowRight size={18} />
            </Link>
            <a
              href="#planes"
              className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Ver precios
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-500">Sin tarjeta de credito · 14 dias de prueba gratis</p>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-y border-slate-100 bg-slate-50 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 text-center md:grid-cols-4">
          {[
            { v: '6', l: 'Roles de trabajo' },
            { v: '100%', l: 'Multi-tenant' },
            { v: '500+', l: 'Ordenes gestionadas' },
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
              Disenado por quienes trabajan en talleres de fabricacion e instalacion a medida.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
                <div className={"mb-4 inline-flex rounded-xl p-3 " + f.color}>
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
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-24 text-white">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-black">Asi funciona el flujo</h2>
            <p className="text-slate-400">De la cotizacion a la instalacion, todo trazado.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-5">
            {[
              { n: '1', t: 'Vendedor cotiza', d: 'Crea cotizacion con medidas y precios', e: '📋' },
              { n: '2', t: 'Cliente acepta', d: 'Se convierte en orden de produccion', e: '✅' },
              { n: '3', t: 'Fabricante produce', d: 'Cola de produccion con estado en vivo', e: '🏭' },
              { n: '4', t: 'Coordinador agenda', d: 'Asigna instalador y fecha', e: '📅' },
              { n: '5', t: 'Instalador instala', d: 'GPS, fotos y firma digital del cliente', e: '📍' },
            ].map((s, i) => (
              <div key={s.n} className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/10 text-2xl">
                  {s.e}
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Paso {s.n}</p>
                <p className="text-sm font-bold text-white mb-1">{s.t}</p>
                <p className="text-xs text-slate-400">{s.d}</p>
                {i < 4 && <div className="mt-3 hidden h-px w-full border-t border-dashed border-white/10 md:block" />}
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
              <div key={p.name} className={"relative rounded-2xl p-6 " + (p.highlight
                ? 'border-2 border-indigo-500 bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xl shadow-indigo-500/25'
                : 'border border-slate-200 bg-white shadow-sm')}>
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-[11px] font-black uppercase text-amber-900">
                    Mas popular
                  </span>
                )}
                <p className={"text-sm font-bold uppercase tracking-wider mb-1 " + (p.highlight ? 'text-indigo-200' : 'text-indigo-600')}>{p.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className={"text-3xl font-black " + (p.highlight ? 'text-white' : 'text-slate-900')}>{p.price}</span>
                  <span className={"text-sm mb-1 " + (p.highlight ? 'text-indigo-200' : 'text-slate-500')}>{p.period}</span>
                </div>
                <p className={"text-sm mb-5 " + (p.highlight ? 'text-indigo-100' : 'text-slate-500')}>{p.desc}</p>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle size={15} className={"mt-0.5 shrink-0 " + (p.highlight ? 'text-indigo-200' : 'text-emerald-500')} />
                      <span className={p.highlight ? 'text-white' : 'text-slate-700'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={"flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition " + (
                    p.highlight
                      ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  )}
                >
                  {p.cta} <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-black text-slate-900">Lo que dicen nuestros clientes</h2>
            <p className="mt-2 text-slate-500 text-sm">Empresas reales que ya digitalizaron su operacion</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl shrink-0">{t.emoji}</div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(t.stars)].map((_, i) => <Star key={i} size={13} className="text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed italic">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="py-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <span className="inline-block mb-3 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600">
                Desarrollado por Conecta AI Corporation
              </span>
              <h2 className="text-3xl font-black text-slate-900 mb-4">Tecnologia construida desde adentro</h2>
              <p className="text-slate-500 leading-relaxed mb-4">
                Conecta AI Corporation es una empresa de tecnologia especializada en soluciones SaaS para empresas de fabricacion e instalacion a medida en Chile.
              </p>
              <p className="text-slate-500 leading-relaxed mb-6">
                ConectaWork nacio para resolver los problemas reales del dia a dia: cotizaciones perdidas,
                fabricantes sin informacion, instaladores sin coordinacion. Hoy lo ofrecemos a cualquier taller que quiera crecer.
              </p>
              <div className="flex items-center gap-3 mb-3">
                <Shield size={18} className="text-indigo-600 shrink-0" />
                <p className="text-sm text-slate-600">Datos aislados por empresa (multi-tenant con RLS)</p>
              </div>
              <div className="flex items-center gap-3">
                <Zap size={18} className="text-indigo-600 shrink-0" />
                <p className="text-sm text-slate-600">IA integrada para asistir al equipo en tiempo real</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Talleres activos', value: '5+', icon: '🏭' },
                { label: 'Ordenes gestionadas', value: '500+', icon: '📋' },
                { label: 'Roles disponibles', value: '6', icon: '👥' },
                { label: 'Uptime', value: '99.9%', icon: '⚡' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm text-center hover:shadow-md transition">
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
      <section className="bg-gradient-to-br from-indigo-600 via-violet-700 to-indigo-800 py-20 text-white text-center">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-4 text-4xl">⚡</div>
          <h2 className="mb-4 text-3xl font-black">Listo para modernizar tu taller?</h2>
          <p className="mb-8 text-indigo-200">Sin instalacion · Sin tarjeta de credito · Desde cualquier dispositivo</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-2xl bg-white text-indigo-700 px-10 py-4 text-base font-bold shadow-lg transition hover:bg-indigo-50 hover:scale-105"
          >
            Empezar ahora <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <img src="/icons/icon-512.png" alt="ConectaWork" className="h-8 w-8 rounded-lg bg-white object-contain" />
            <span className="font-bold text-slate-800">ConectaWork</span>
          </div>
          <p className="text-sm text-slate-400">
            Desarrollado por <strong className="text-slate-600">Conecta AI Corporation</strong>
            <span className="mx-2 text-slate-300">·</span>
            <a href="https://conectaai.cl" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">conectaai.cl</a>
          </p>
          <Link to="/login" className="text-sm font-semibold text-indigo-600 hover:underline">
            Acceder al Sistema →
          </Link>
        </div>
      </footer>
    </div>
  );
}
