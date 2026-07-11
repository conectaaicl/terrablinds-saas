import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

const IS_DEV = import.meta.env.DEV;

const DEMO_ACCOUNTS = [
  { section: 'Super Admin SaaS', accounts: [
    { email: 'admin@saas.com', pass: 'admin', rol: 'Super Admin', desc: 'Gestiona todos los talleres', color: 'rose' },
  ]},
  { section: 'Terrablinds (Cortinas & Toldos)', accounts: [
    { email: 'jefe@terrablinds.cl', pass: '1234', rol: 'Jefe / Dueño', desc: 'Ve todo el taller', color: 'amber' },
    { email: 'gerente@terrablinds.cl', pass: '1234', rol: 'Gerente', desc: 'Gestión operativa', color: 'orange' },
    { email: 'coordinador@terrablinds.cl', pass: '1234', rol: 'Coordinadora', desc: 'Coordina agenda y operaciones', color: 'cyan' },
    { email: 'andrea@terrablinds.cl', pass: '1234', rol: 'Vendedora', desc: 'Crea cotizaciones', color: 'blue' },
    { email: 'roberto@terrablinds.cl', pass: '1234', rol: 'Fabricante', desc: 'Produce órdenes', color: 'emerald' },
    { email: 'juan@terrablinds.cl', pass: '1234', rol: 'Instalador', desc: 'Instala pedidos', color: 'violet' },
  ]},
  { section: 'MaderaCraft (Muebles a Medida)', accounts: [
    { email: 'sofia@maderacraft.cl', pass: '1234', rol: 'Jefa / Dueña', desc: 'Ve todo el taller', color: 'amber' },
    { email: 'luis@maderacraft.cl', pass: '1234', rol: 'Vendedor', desc: 'Crea cotizaciones', color: 'blue' },
  ]},
];

const dotColors: Record<string, string> = {
  rose: '#f43f5e', amber: '#f59e0b', orange: '#f97316',
  cyan: '#06b6d4', blue: '#3b82f6', emerald: '#10b981', violet: '#8b5cf6',
};

const features = [
  { t: 'Multi-Tenant', d: 'Datos aislados por empresa' },
  { t: '6 Roles', d: 'Admin, Jefe, Vendedor, etc.' },
  { t: 'Emails Automáticos', d: 'Conectado a mail.conectaai.cl' },
  { t: 'GPS en Vivo', d: 'Tracking de instaladores en tiempo real' },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── PWA: instalar app ──
  const [pwaVisible, setPwaVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (standalone) return;
    if ((window as any).__pwaPrompt || isIOS) setPwaVisible(true);
    const onAvail = () => setPwaVisible(true);
    window.addEventListener('pwa-available', onAvail);
    return () => window.removeEventListener('pwa-available', onAvail);
  }, [isIOS]);
  const installPwa = async () => {
    const p = (window as any).__pwaPrompt;
    if (p) {
      p.prompt();
      try { await p.userChoice; } catch { /* */ }
      (window as any).__pwaPrompt = null;
      setPwaVisible(false);
    } else if (isIOS) {
      setShowIosHelp(true);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const ok = await login(email, password);
    if (!ok) {
      setError('Email o contraseña incorrectos.');
    }
    setSubmitting(false);
  };

  const fill = (em: string, pass: string) => {
    setEmail(em);
    setPassword(pass);
    setError('');
  };

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '13px 16px',
    color: '#fff', fontSize: '14px', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#6366f1';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060b14' }}>

      {/* ── Left panel (desktop only) ── */}
      <div
        className="hidden lg:flex"
        style={{
          width: '50%', flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px', background: '#070b14', position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'rgba(99,102,241,0.08)', filter: 'blur(80px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '60px', right: '-60px',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'rgba(139,92,246,0.05)', filter: 'blur(80px)', pointerEvents: 'none',
        }} />
        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(99,102,241,0.45)',
            fontSize: '20px', fontWeight: 900, color: '#fff',
          }}>W</div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>ConectaWork</span>
        </div>

        {/* Hero text */}
        <div style={{ maxWidth: '460px', position: 'relative' }}>
          <h2 style={{ fontSize: '48px', fontWeight: 900, color: '#fff', lineHeight: 1.1, margin: 0 }}>
            ConectaWork
          </h2>
          <p style={{ marginTop: '16px', fontSize: '16px', color: '#94a3b8', lineHeight: 1.6 }}>
            SaaS Multi-Tenant para Talleres a Medida
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '32px' }}>
            {features.map(f => (
              <div key={f.t} style={{
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                padding: '16px', backdropFilter: 'blur(12px)',
              }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8', margin: 0 }}>{f.t}</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '11px', color: '#334155', position: 'relative' }}>
          &copy; 2026 ConectaWork &middot; Conecta AI
        </p>
      </div>

      {/* ── Right panel ── */}
      <div
        className="lg:w-[50%] lg:justify-center lg:py-4"
        style={{
          width: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-start',
          overflowY: 'auto', padding: '32px 20px', background: '#060b14',
        }}
      >
        <div style={{ width: '100%', maxWidth: '460px' }}>

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'inline-block', background: '#fff', borderRadius: '18px', padding: '14px 20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <img src="/logo.png" alt="ConectaWork" style={{ maxWidth: '210px', width: '100%', display: 'block' }} />
            </div>
          </div>

          {/* PWA tip */}
          <div style={{
            marginBottom: '20px', borderRadius: '12px',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            padding: '12px 14px',
          }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', margin: 0 }}>
              Usa esta aplicaci&oacute;n como APP en tu celular
            </p>
            <p style={{ fontSize: '11px', color: '#6ee7b7', margin: '4px 0 0', lineHeight: 1.5 }}>
              1. Abre esta p&aacute;gina desde tu celular &middot; 2. En el navegador toca &ldquo;Agregar a la pantalla de inicio&rdquo; &middot; 3. Se instalar&aacute; como app.
            </p>
          </div>

          {/* Login card */}
          <div style={{
            background: 'rgba(10,16,32,0.9)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px', padding: '36px',
            backdropFilter: 'blur(32px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: 0 }}>Bienvenido</h2>
            <p style={{ marginTop: '6px', fontSize: '13px', color: '#64748b', marginBottom: 0 }}>
              {IS_DEV ? 'Entorno de desarrollo — usa las cuentas de demo abajo' : 'Ingresa con tus credenciales de acceso'}
            </p>

            <form onSubmit={submit} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  borderRadius: '10px', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  padding: '10px 14px', fontSize: '13px', color: '#fca5a5',
                }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
                </div>
              )}

              <div>
                <label style={{
                  display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b',
                }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="tu@email.com"
                  style={inputBase} onFocus={handleFocus} onBlur={handleBlur}
                />
              </div>

              <div>
                <label style={{
                  display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b',
                }}>Contrase&ntilde;a</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={show ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required
                    placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                    style={{ ...inputBase, paddingRight: '44px' }}
                    onFocus={handleFocus} onBlur={handleBlur}
                  />
                  <button type="button" onClick={() => setShow(!show)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 0,
                  }}>
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  border: 'none', borderRadius: '12px', padding: '14px',
                  color: '#fff', fontSize: '14px', fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                  transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  if (!submitting) {
                    e.currentTarget.style.opacity = '0.88';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.45)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = submitting ? '0.6' : '1';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {submitting ? 'Ingresando...' : 'Entrar'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '13px', color: '#818cf8', textDecoration: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
                >
                  &iquest;Olvidaste tu contrase&ntilde;a?
                </Link>
              </div>
            </form>
          </div>

          {pwaVisible && (
            <div style={{ marginTop: '20px' }}>
              <button type="button" onClick={installPwa} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', padding: '12px', borderRadius: '12px',
                border: '1px solid rgba(109,123,255,0.35)', background: 'rgba(109,123,255,0.10)',
                color: '#c7ccff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v11m0 0l-4-4m4 4l4-4M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Instalar app en tu dispositivo
              </button>
              {showIosHelp && (
                <p style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '10px', textAlign: 'center', lineHeight: 1.5 }}>
                  En iPhone/iPad: abre este sitio en <b>Safari</b>, toca <b>Compartir</b> y elige <b>&ldquo;Agregar a inicio&rdquo;</b>.
                </p>
              )}
            </div>
          )}

          {/* Demo accounts SOLO en desarrollo */}
          {IS_DEV && (
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', margin: 0 }}>
                Cuentas de Demo &mdash; Haz clic para usar
              </h3>
              {DEMO_ACCOUNTS.map(section => (
                <div key={section.section} style={{
                  borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(10,16,32,0.7)', overflow: 'hidden',
                }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)', padding: '8px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', margin: 0 }}>{section.section}</p>
                  </div>
                  <div>
                    {section.accounts.map((acc, idx) => (
                      <button
                        key={acc.email}
                        onClick={() => fill(acc.email, acc.pass)}
                        style={{
                          display: 'flex', width: '100%', alignItems: 'center', gap: '12px',
                          padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none',
                          cursor: 'pointer', color: 'inherit',
                          borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                      >
                        <span style={{
                          display: 'block', width: '10px', height: '10px', borderRadius: '50%',
                          flexShrink: 0, background: dotColors[acc.color] || '#64748b',
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>{acc.rol}</span>
                            <span style={{ fontSize: '10px', color: '#475569' }}>&middot;</span>
                            <span style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.email}</span>
                          </div>
                          <p style={{ fontSize: '10px', color: '#475569', margin: '2px 0 0' }}>{acc.desc} &middot; pass: {acc.pass}</p>
                        </div>
                        <ArrowRight size={13} style={{ flexShrink: 0, color: '#334155' }} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="lg:hidden" style={{ textAlign: 'center', fontSize: '11px', color: '#334155', marginTop: '20px' }}>
            &copy; 2026 ConectaWork
          </p>
        </div>
      </div>
    </div>
  );
}
