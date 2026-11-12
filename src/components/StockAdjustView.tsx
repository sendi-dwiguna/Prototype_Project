import React, { useState } from 'react';
import { ProductItem, StockLogItem, UserItem } from '../types';
import { Clock, ArrowLeftRight, CheckCircle2 } from 'lucide-react';

interface StockAdjustViewProps {
  products: ProductItem[];
  stockLogs: StockLogItem[];
  currentUser: UserItem;
  onAdjustStock: (
    productId: number,
    jenis: 'Masuk' | 'Stock Opname' | 'Keluar',
    jumlah: number,
    keterangan: string
  ) => void;
  onNavigateTab: (tab: string) => void;
}

export const StockAdjustView: React.FC<StockAdjustViewProps> = ({
  products,
  stockLogs,
  onAdjustStock,
  onNavigateTab,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number>(products[0]?.id || 1);
  const [jenis, setJenis] = useState<'Masuk' | 'Stock Opname' | 'Keluar'>('Masuk');
  const [jumlah, setJumlah] = useState<number>(10);
  const [keterangan, setKeterangan] = useState<string>('Penerimaan stok dari supplier');

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jumlah < 0) {
      alert('Jumlah unit tidak boleh negatif.');
      return;
    }

    onAdjustStock(selectedProductId, jenis, jumlah, keterangan);
    setKeterangan('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Penyesuaian Stok & Audit Log</h1>
          <p className="text-sm text-slate-500">
            Catat mutasi inventaris: barang masuk supplier, stock opname berkala, atau pencatatan barang rusak.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('products')}
          className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs"
        >
          &larr; Kembali ke Katalog
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Form Input Mutasi */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs h-fit">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <ArrowLeftRight className="w-4 h-4 text-blue-900" />
            <h2 className="text-sm font-bold text-slate-900">Form Mutasi Fisik</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Produk</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.nama_produk} (Stok: {p.stok_saat_ini})
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Stok Fisik Saat Ini:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedProduct.stok_saat_ini} unit</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Penyesuaian</label>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value as 'Masuk' | 'Stock Opname' | 'Keluar')}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="Masuk">Tambah Stok Masuk (Restock / Pembelian)</option>
                <option value="Stock Opname">Stock Opname (Tetapkan Jumlah Fisik Riil)</option>
                <option value="Keluar">Koreksi Stok Keluar (Rusak / Hilang / Kadaluarsa)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {jenis === 'Masuk'
                  ? 'Jumlah Unit Masuk'
                  : jenis === 'Stock Opname'
                  ? 'Jumlah Stok Fisik Riil'
                  : 'Jumlah Unit Keluar'}
              </label>
              <input
                type="number"
                min="0"
                required
                value={jumlah}
                onChange={(e) => setJumlah(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {jenis === 'Masuk' && 'Stok akan bertambah sebanyak kuantitas ini.'}
                {jenis === 'Stock Opname' && 'Stok gudang akan langsung disetel menjadi angka ini.'}
                {jenis === 'Keluar' && 'Stok akan berkurang sebanyak kuantitas ini.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Nomor Referensi</label>
              <input
                type="text"
                required
                placeholder="Contoh: Surat Jalan SJ-2026-09 atau Hasil Opname Rak B"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Mutasi Stok</span>
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Log Riwayat Mutasi (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Riwayat Audit Mutasi Stok</h2>
            </div>
            <span className="text-xs text-slate-400">{stockLogs.length} catatan tersimpan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Waktu & Operator</th>
                  <th className="py-2.5 px-3">Produk</th>
                  <th className="py-2.5 px-3">Jenis Mutasi</th>
                  <th className="py-2.5 px-3 text-center">Perubahan</th>
                  <th className="py-2.5 px-3 text-center">Stok (Sebelum &rarr; Sesudah)</th>
                  <th className="py-2.5 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-slate-700 text-[11px]">{log.created_at}</div>
                      <div className="text-slate-400 text-[10px]">{log.user_name}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{log.nama_produk}</div>
                      <span className="font-mono text-slate-400 text-[11px]">{log.sku}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {log.jenis_perubahan}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {log.jumlah_perubahan > 0 ? (
                        <span className="text-emerald-700">+{log.jumlah_perubahan}</span>
                      ) : log.jumlah_perubahan < 0 ? (
                        <span className="text-rose-600">{log.jumlah_perubahan}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[11px]">
                      <span className="text-slate-400">{log.stok_sebelum}</span>
                      <span className="text-slate-300 mx-1">&rarr;</span>
                      <span className="font-bold text-slate-900">{log.stok_sesudah}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">{log.keterangan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
