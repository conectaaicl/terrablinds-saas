import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
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
      setError('Ocurrió un error. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-2xl">&#9889;</div>
          <h1 className="mt-3 text-xl font-bold text-slate-800">WorkShopOS</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
              <h2 className="text-lg font-bold text-slate-900">Revisa tu email</h2>
              <p className="text-sm text-slate-500">
                Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.
                El enlace expira en 1 hora.
              </p>
              <Link to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-rose-500 hover:text-rose-700">
                <ArrowLeft size={15} /> Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">Recuperar contraseña</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <form onSubmit={submit} className="mt-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle size={15} className="shrink-0" /> {error}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="tu@email.com"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-500">
                  <ArrowLeft size={13} /> Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
