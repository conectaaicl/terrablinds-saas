import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../services/api';

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

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm text-center space-y-4">
          <AlertCircle size={40} className="mx-auto text-rose-500" />
          <h2 className="text-lg font-bold text-slate-900">Enlace inválido</h2>
          <p className="text-sm text-slate-500">Este enlace de recuperación no es válido.</p>
          <Link to="/forgot-password" className="text-sm text-rose-500 hover:underline">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-2xl">&#9889;</div>
          <h1 className="mt-3 text-xl font-bold text-slate-800">WorkShopOS</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
              <h2 className="text-lg font-bold text-slate-900">Contraseña actualizada</h2>
              <p className="text-sm text-slate-500">
                Tu contraseña fue restablecida exitosamente. Ahora puedes iniciar sesión.
              </p>
              <Link to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-600">
                Iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">Nueva contraseña</h2>
              <p className="mt-1 text-sm text-slate-500">Elige una contraseña segura de al menos 6 caracteres.</p>

              <form onSubmit={submit} className="mt-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle size={15} className="shrink-0" /> {error}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} required minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    />
                    <button type="button" onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Confirmar contraseña</label>
                  <input
                    type={show ? 'text' : 'password'} value={confirm}
                    onChange={e => setConfirm(e.target.value)} required
                    placeholder="Repite la contraseña"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Guardando...' : 'Restablecer contraseña'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-500">
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
