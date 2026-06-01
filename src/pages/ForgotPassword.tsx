import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Ocurri&oacute; un error. Int&eacute;ntalo nuevamente.');
    } finally {
      setLoading(false);
    }
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
    <div style={{
      display: 'flex', minHeight: '100vh', alignItems: 'center',
      justifyContent: 'center', background: '#060b14', padding: '20px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative orbs */}
      <div style={{
        position: 'absolute', top: '-120px', left: '-120px',
        width: '480px', height: '480px', borderRadius: '50%',
        background: 'rgba(99,102,241,0.07)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', right: '-80px',
        width: '360px', height: '360px', borderRadius: '50%',
        background: 'rgba(139,92,246,0.05)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            margin: '0 auto', width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(99,102,241,0.45)',
            fontSize: '22px', fontWeight: 900, color: '#fff',
          }}>W</div>
          <h1 style={{ marginTop: '10px', fontSize: '18px', fontWeight: 700, color: '#fff', margin: '10px 0 4px' }}>ConectaWork</h1>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Recuperaci&oacute;n de cuenta</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(10,16,32,0.9)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px', padding: '36px',
          backdropFilter: 'blur(32px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(16,185,129,0.15)',
                border: '2px solid rgba(16,185,129,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', color: '#10b981',
              }}>&#10003;</div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>Correo enviado</h2>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Revisa tu bandeja (tambi&eacute;n spam). El enlace expira en 1 hora.
                </p>
              </div>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontSize: '13px', color: '#818cf8', textDecoration: 'none',
                  marginTop: '4px',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
              >
                <ArrowLeft size={14} /> Volver al inicio de sesi&oacute;n
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '24px' }}>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', color: '#64748b', textDecoration: 'none',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#818cf8'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#64748b'; }}
                >
                  <ArrowLeft size={13} /> Volver al inicio
                </Link>
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>
                Recuperar contrase&ntilde;a
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
                Te enviaremos un enlace a tu email para restablecer tu contrase&ntilde;a.
              </p>

              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    border: 'none', borderRadius: '12px', padding: '14px',
                    color: '#fff', fontSize: '14px', fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (!loading) {
                      e.currentTarget.style.opacity = '0.88';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.45)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = loading ? '0.6' : '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperaci&oacute;n'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
