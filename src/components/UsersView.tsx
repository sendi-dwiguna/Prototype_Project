import React, { useState } from 'react';
import { UserItem, UserRole } from '../types';
import { Users, Plus, ShieldCheck, UserCheck, X } from 'lucide-react';

interface UsersViewProps {
  users: UserItem[];
  currentUser: UserItem;
  onAddUser: (user: Omit<UserItem, 'id' | 'created_at'>) => void;
  onUpdateRole: (userId: number, newRole: UserRole) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  onAddUser,
  onUpdateRole,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    nama_lengkap: '',
    role: 'staf' as UserRole,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.nama_lengkap.trim()) {
      alert('Username dan Nama Lengkap wajib diisi.');
      return;
    }
    if (users.some((u) => u.username.toLowerCase() === formData.username.trim().toLowerCase())) {
      alert(`Username "${formData.username.trim()}" sudah digunakan.`);
      return;
    }

    onAddUser({
      username: formData.username.trim().toLowerCase(),
      nama_lengkap: formData.nama_lengkap.trim(),
      role: formData.role,
    });

    setShowAddModal(false);
    setFormData({
      username: '',
      nama_lengkap: '',
      role: 'staf',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Manajemen Akun Pengguna & RBAC</h1>
          <p className="text-sm text-slate-500">
            Kelola hak akses pengguna sistem (Pemilik Toko dan Staf Operasional) dengan kontrol berbasis peran.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-2xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Tabel Pengguna */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-900" />
            <h2 className="text-sm font-bold text-slate-900">Daftar Akun Terdaftar</h2>
          </div>
          <span className="text-xs text-slate-400">{users.length} akun aktif</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-4">Nama Lengkap</th>
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Peran Hak Akses</th>
                <th className="py-2.5 px-3">Tanggal Dibuat</th>
                <th className="py-2.5 px-4 text-right">Ubah Peran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isCurrent = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{u.nama_lengkap}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                            Akun Anda
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{u.username}</td>
                    <td className="py-3 px-3">
                      {u.role === 'pemilik' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-900" />
                          <span>Pemilik Toko (Admin)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                          <span>Staf Operasional</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{u.created_at}</td>
                    <td className="py-3 px-4 text-right">
                      {isCurrent ? (
                        <span className="text-[11px] text-slate-400 italic">Terkunci (Sedang Aktif)</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => onUpdateRole(u.id, e.target.value as UserRole)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-900"
                        >
                          <option value="staf">Staf Operasional</option>
                          <option value="pemilik">Pemilik Toko</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Tambah Pengguna Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Anggara"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username Login</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: rian23"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Peran Akses (RBAC)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                >
                  <option value="staf">Staf Operasional (Akses stok & catat penjualan)</option>
                  <option value="pemilik">Pemilik Toko (Akses penuh seluruh modul)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
