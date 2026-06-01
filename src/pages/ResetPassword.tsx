import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../services/api';

function getStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthColors = ['', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'];
const strengthLabels = ['', 'Muy débil', 'Débil', 'Regular', 'Buena', 'Excelente'];

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Token inválido o expirado.');
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

  const strength = getStrength(password);

  const pageWrap: React.CSSProperties = {
    display: 'flex', minHeight: '100vh', alignItems: 'center',
    justifyContent: 'center', background: '#060b14', padding: '20px',
    position: 'relative', overflow: 'hidden',
  };

  const orb1: React.CSSProperties = {
    position: 'absolute', top: '-120px', left: '-120px',
    width: '480px', height: '480px', borderRadius: '50%',
    background: 'rgba(99,102,241,0.07)', filter: 'blur(80px)', pointerEvents: 'none',
  };
  const orb2: React.CSSProperties = {
    position: 'absolute', bottom: '-80px', right: '-80px',
    width: '360px', height: '360px', borderRadius: '50%',
    background: 'rgba(139,92,246,0.05)', filter: 'blur(80px)', pointerEvents: 'none',
  };
  const grid: React.CSSProperties = {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)',
    backgroundSize: '60px 60px',
  };

  if (!token) {
    return (
      <div style={pageWrap}>
        <div style={orb1} />
        <div style={orb2} />
        <div style={grid} />
        <div style={{ maxWidth: '360px', textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(245,158,11,0.12)', border: '2px solid rgba(245,158,11,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', color: '#f59e0b',
          }}>&#9888;</div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: 0 }}>Enlace inválido</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
            Este enlace de recuperación no es válido o ha expirado.
          </p>
          <Link
            to="/forgot-password"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', borderRadius: '10px',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
              marginTop: '4px',
            }}
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={orb1} />
      <div style={orb2} />
      <div style={grid} />

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
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Nueva contraseña</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(10,16,32,0.9)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px', padding: '36px',
          backdropFilter: 'blur(32px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}>
          {done ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(16,185,129,0.15)',
                border: '2px solid rgba(16,185,129,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', color: '#10b981',
              }}>&#10003;</div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>
                  Contraseña actualizada
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Inicia sesión con tus nuevas credenciales.
                </p>
              </div>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', padding: '13px',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  borderRadius: '12px', color: '#fff',
                  fontSize: '14px', fontWeight: 700, textDecoration: 'none',
                  marginTop: '4px',
                }}
              >
                Ir al inicio
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
                Nueva contraseña
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
                Elige una contraseña segura de al menos 6 caracteres.
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

                {/* New password */}
                <div>
                  <label style={{
                    display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b',
                  }}>Nueva contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={show ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} required minLength={6}
                      placeholder="Mínimo 6 caracteres"
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

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} style={{
                            flex: 1, height: '3px', borderRadius: '2px',
                            background: i <= strength ? strengthColors[strength] : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </div>
                      <p style={{ fontSize: '10px', color: strength > 0 ? strengthColors[strength] : '#64748b', margin: 0 }}>
                        {strength > 0 ? strengthLabels[strength] : ''}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div>
                  <label style={{
                    display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b',
                  }}>Confirmar contraseña</label>
                  <input
                    type={show ? 'text' : 'password'} value={confirm}
                    onChange={e => setConfirm(e.target.value)} required
                    placeholder="Repite la contraseña"
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
                  {loading ? 'Guardando...' : 'Restablecer contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
