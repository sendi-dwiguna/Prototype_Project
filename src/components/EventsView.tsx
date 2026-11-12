import React, { useState } from 'react';
import { EventItem, UserItem } from '../types';
import { formatTglIndo } from '../utils/forecasting';
import { Calendar, Plus, Trash2, X, Zap } from 'lucide-react';

interface EventsViewProps {
  events: EventItem[];
  currentUser: UserItem;
  onAddEvent: (newEvent: Omit<EventItem, 'id'>) => void;
  onDeleteEvent: (id: number) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  currentUser,
  onAddEvent,
  onDeleteEvent,
}) => {
  const isPemilik = currentUser.role === 'pemilik';
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    nama_event: '',
    faktor_pengali: 1.5,
    tanggal_mulai: '',
    tanggal_selesai: '',
    deskripsi: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_event.trim() || !formData.tanggal_mulai || !formData.tanggal_selesai) {
      alert('Nama event dan rentang tanggal wajib diisi.');
      return;
    }

    onAddEvent({
      nama_event: formData.nama_event.trim(),
      faktor_pengali: Number(formData.faktor_pengali),
      tanggal_mulai: formData.tanggal_mulai,
      tanggal_selesai: formData.tanggal_selesai,
      deskripsi: formData.deskripsi.trim(),
    });

    setShowAddModal(false);
    setFormData({
      nama_event: '',
      faktor_pengali: 1.5,
      tanggal_mulai: '',
      tanggal_selesai: '',
      deskripsi: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Manajemen Event Promosi</h1>
          <p className="text-sm text-slate-500">
            Daftarkan agenda flash sale, tanggal kembar (11.11, 12.12), atau Ramadan dengan faktor pengali lonjakan permintaan.
          </p>
        </div>

        {isPemilik && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Event Baru</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Tabel Event (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Daftar Event Promosi Aktif</h2>
            <span className="text-xs text-slate-400">{events.length} event</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Nama Event</th>
                  <th className="py-2.5 px-3 text-center">Faktor Pengali</th>
                  <th className="py-2.5 px-3 text-center">Periode Berlaku</th>
                  <th className="py-2.5 px-4">Keterangan</th>
                  {isPemilik && <th className="py-2.5 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{ev.nama_event}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono font-bold text-xs text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                        {ev.faktor_pengali}x (+{Math.round((ev.faktor_pengali - 1.0) * 100)}%)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                      {formatTglIndo(ev.tanggal_mulai)} s.d {formatTglIndo(ev.tanggal_selesai)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{ev.deskripsi || '-'}</td>
                    {isPemilik && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onDeleteEvent(ev.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Hapus Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom Kanan: Panduan Multiplier */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 text-blue-900">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Panduan Lonjakan Permintaan</h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Faktor pengali lonjakan digunakan dalam modul <strong>Prediksi Kebutuhan Restock</strong> untuk mengantisipasi peningkatan volume pesanan selama kampanye belanja tertentu.
          </p>
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-900">1.25x (+25%):</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Payday Sale akhir bulan atau weekend promo rutin.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-900">1.50x (+50%):</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Double-Date Mega Sale (9.9, 10.10, 11.11, 12.12).</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-900">1.60x - 2.0x (+60% - +100%):</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Bulan Ramadan dan festival Hari Raya Idul Fitri.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tambah Event */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Tambah Event Promosi Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Event</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Flash Sale 12.12 Harbolnas"
                  value={formData.nama_event}
                  onChange={(e) => setFormData({ ...formData, nama_event: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Faktor Pengali Lonjakan Permintaan
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="5.0"
                  required
                  value={formData.faktor_pengali}
                  onChange={(e) => setFormData({ ...formData, faktor_pengali: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Contoh: 1.50 berarti permintaan diproyeksikan 50% di atas baseline normal.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal_mulai}
                    onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal_selesai}
                    onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Kampanye</label>
                <input
                  type="text"
                  placeholder="Keterangan singkat kampanye"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
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
                  Simpan Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
