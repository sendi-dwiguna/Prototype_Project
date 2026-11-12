import React, { useState } from 'react';
import { UserItem } from '../types';
import { Boxes, Lock, User, AlertCircle, ShieldCheck, Clock } from 'lucide-react';

interface LoginViewProps {
  users: UserItem[];
  onLoginSuccess: (user: UserItem) => void;
  failedAttempts: number;
  lockUntil: number | null;
  onRecordFailedAttempt: (username: string) => void;
  onResetFailedAttempts: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  onLoginSuccess,
  failedAttempts,
  lockUntil,
  onRecordFailedAttempt,
  onResetFailedAttempts,
}) => {
  const [username, setUsername] = useState<string>('pemilik');
  const [password, setPassword] = useState<string>('admin123');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isLocked = lockUntil !== null && Date.now() < lockUntil;
  const remainingLockSeconds = isLocked ? Math.ceil((lockUntil! - Date.now()) / 1000) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setErrorMessage(`Akun sedang terkunci sementara selama 15 menit. Sisa waktu: ${Math.ceil(remainingLockSeconds / 60)} menit.`);
      return;
    }

    const trimmedUser = username.trim().toLowerCase();
    const matchedUser = users.find((u) => u.username.toLowerCase() === trimmedUser);

    // Default passwords for demo
    const validPassword =
      (trimmedUser === 'pemilik' && password === 'admin123') ||
      (trimmedUser === 'staf' && password === 'staf123') ||
      (matchedUser && password.length >= 6);

    if (matchedUser && validPassword) {
      onResetFailedAttempts();
      onLoginSuccess(matchedUser);
    } else {
      onRecordFailedAttempt(trimmedUser);
      const newFails = failedAttempts + 1;
      const sisa = Math.max(0, 5 - newFails);
      if (sisa === 0) {
        setErrorMessage('Password salah 5 kali berturut-turut! Akun Anda kini terkunci selama 15 menit.');
      } else {
        setErrorMessage(`Username atau password salah. Sisa kesempatan sebelum akun terkunci: ${sisa} kali.`);
      }
    }
  };

  const fillQuick = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-900 rounded-xl text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Boxes className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Restokin</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sistem Prediksi Restock dan Dynamic Pricing untuk Online Shop
          </p>
        </div>

        {/* Error / Alert */}
        {errorMessage && (
          <div className="mb-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLocked && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Akun Terkunci Sementara</div>
              <div>Salah memasukkan password 5 kali berturut-turut. Tunggu 15 menit.</div>
            </div>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                disabled={isLocked}
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                disabled={isLocked}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLocked}
            className="w-full py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-colors"
          >
            Masuk ke Sistem
          </button>
        </form>

        {/* Akun Bawaan / Demo Pill Selector */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Pilih Cepat Akun Default:
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fillQuick('pemilik', 'admin123')}
              className="w-full p-2.5 rounded-lg border border-blue-100 bg-blue-50/60 hover:bg-blue-50 text-left flex items-center justify-between transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-blue-900">pemilik</div>
                <div className="text-[11px] text-blue-800">Pemilik Toko (Akses Penuh / Admin)</div>
              </div>
              <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-900 font-semibold">
                admin123
              </span>
            </button>

            <button
              type="button"
              onClick={() => fillQuick('staf', 'staf123')}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left flex items-center justify-between transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-slate-800">staf</div>
                <div className="text-[11px] text-slate-500">Staf Operasional (Stok & Catat Jual)</div>
              </div>
              <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                staf123
              </span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center pt-1">
            * Session timeout 30 menit. Akun terkunci otomatis 15 menit jika salah password 5 kali.
          </p>
        </div>
      </div>
    </div>
  );
};
