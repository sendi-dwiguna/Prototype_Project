import React, { useState } from 'react';
import { ProductItem, UserItem } from '../types';
import { formatRupiah, getStockStatus } from '../utils/forecasting';
import { Plus, Pencil, Trash2, ArrowLeftRight, X, AlertCircle } from 'lucide-react';

interface ProductsViewProps {
  products: ProductItem[];
  currentUser: UserItem;
  onAddProduct: (newProd: Omit<ProductItem, 'id' | 'created_at'>) => void;
  onEditProduct: (id: number, updated: Partial<ProductItem>) => void;
  onDeleteProduct: (id: number) => void;
  onNavigateTab: (tab: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  currentUser,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onNavigateTab,
}) => {
  const isPemilik = currentUser.role === 'pemilik';

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductItem | null>(null);

  // Form State untuk Tambah Produk
  const [formData, setFormData] = useState({
    sku: '',
    nama_produk: '',
    harga_modal: 50000,
    harga_jual: 85000,
    stok_saat_ini: 10,
    batas_stok_min: 8,
    harga_min: 70000,
    harga_max: 110000,
    lead_time_hari: 5,
    catatan: '',
  });

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku.trim() || !formData.nama_produk.trim()) {
      alert('SKU dan Nama Produk wajib diisi.');
      return;
    }
    // Cek duplikasi SKU
    if (products.some((p) => p.sku.toUpperCase() === formData.sku.trim().toUpperCase())) {
      alert(`SKU "${formData.sku.trim().toUpperCase()}" sudah terdaftar! Gunakan kode SKU lain.`);
      return;
    }

    onAddProduct({
      sku: formData.sku.trim().toUpperCase(),
      nama_produk: formData.nama_produk.trim(),
      harga_modal: Number(formData.harga_modal),
      harga_jual: Number(formData.harga_jual),
      stok_saat_ini: Number(formData.stok_saat_ini),
      batas_stok_min: Number(formData.batas_stok_min),
      harga_min: Number(formData.harga_min),
      harga_max: Number(formData.harga_max),
      lead_time_hari: Number(formData.lead_time_hari),
      catatan: formData.catatan.trim(),
    });

    setShowAddModal(false);
    setFormData({
      sku: '',
      nama_produk: '',
      harga_modal: 50000,
      harga_jual: 85000,
      stok_saat_ini: 10,
      batas_stok_min: 8,
      harga_min: 70000,
      harga_max: 110000,
      lead_time_hari: 5,
      catatan: '',
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    onEditProduct(editingProduct.id, {
      nama_produk: editingProduct.nama_produk,
      harga_modal: Number(editingProduct.harga_modal),
      harga_jual: Number(editingProduct.harga_jual),
      batas_stok_min: Number(editingProduct.batas_stok_min),
      harga_min: Number(editingProduct.harga_min),
      harga_max: Number(editingProduct.harga_max),
      lead_time_hari: Number(editingProduct.lead_time_hari),
      catatan: editingProduct.catatan,
    });

    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Manajemen Produk & Stok</h1>
          <p className="text-sm text-slate-500">
            Katalog SKU lengkap dengan batas stok aman, batas dinamis harga, dan lead time supplier.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('stock-adjust')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4 text-slate-500" />
            <span>Penyesuaian Stok</span>
          </button>

          {isPemilik && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabel Produk */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">SKU & Nama Produk</th>
                <th className="py-3 px-3 text-right">Harga Modal (HPP)</th>
                <th className="py-3 px-3 text-right">Harga Jual</th>
                <th className="py-3 px-3 text-center">Stok Fisik</th>
                <th className="py-3 px-3 text-center">Batas Min</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Batas Dinamis (Min - Max)</th>
                <th className="py-3 px-3 text-center">Lead Time</th>
                {isPemilik && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                const status = getStockStatus(p.stok_saat_ini, p.batas_stok_min);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-sm">{p.nama_produk}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-500 font-semibold text-xs">{p.sku}</span>
                        {p.catatan && <span className="text-slate-400 text-[11px] truncate max-w-xs">· {p.catatan}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">{formatRupiah(p.harga_modal)}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-blue-900">{formatRupiah(p.harga_jual)}</td>
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-900 text-sm">{p.stok_saat_ini}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-500">{p.batas_stok_min}</td>
                    <td className="py-3.5 px-3 text-center">
                      {status === 'Kritis' && (
                        <span className="inline-flex items-center text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          Kritis
                        </span>
                      )}
                      {status === 'Waspada' && (
                        <span className="inline-flex items-center text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          Waspada
                        </span>
                      )}
                      {status === 'Aman' && (
                        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Aman
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-[11px] text-slate-600">
                      {formatRupiah(p.harga_min)} – {formatRupiah(p.harga_max)}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-700">{p.lead_time_hari} hari</td>
                    {isPemilik && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingProduct({ ...p })}
                            className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                            title="Ubah Produk"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingProduct(p)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Produk */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Tambah Produk Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU (Kode Unik Produk)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SKU-006"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Produk</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Celana Chino Slim Fit"
                    value={formData.nama_produk}
                    onChange={(e) => setFormData({ ...formData, nama_produk: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Modal (HPP)</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={formData.harga_modal}
                    onChange={(e) => setFormData({ ...formData, harga_modal: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Jual Normal</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={formData.harga_jual}
                    onChange={(e) => setFormData({ ...formData, harga_jual: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stok Awal Fisik (Unit)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stok_saat_ini}
                    onChange={(e) => setFormData({ ...formData, stok_saat_ini: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batas Minimum Stok</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.batas_stok_min}
                    onChange={(e) => setFormData({ ...formData, batas_stok_min: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Minimum (Diskon Cap)</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={formData.harga_min}
                    onChange={(e) => setFormData({ ...formData, harga_min: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Maksimum (Surge Cap)</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={formData.harga_max}
                    onChange={(e) => setFormData({ ...formData, harga_max: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Time Supplier (Hari)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.lead_time_hari}
                    onChange={(e) => setFormData({ ...formData, lead_time_hari: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Kategori</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kategori Celana Pria"
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                </div>
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
                  Simpan Produk Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Produk */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Ubah Produk</h3>
                <span className="font-mono text-xs text-blue-900">{editingProduct.sku}</span>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Produk</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.nama_produk}
                    onChange={(e) => setEditingProduct({ ...editingProduct, nama_produk: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Modal (HPP)</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={editingProduct.harga_modal}
                    onChange={(e) => setEditingProduct({ ...editingProduct, harga_modal: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Jual Normal</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={editingProduct.harga_jual}
                    onChange={(e) => setEditingProduct({ ...editingProduct, harga_jual: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batas Minimum Stok</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingProduct.batas_stok_min}
                    onChange={(e) => setEditingProduct({ ...editingProduct, batas_stok_min: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Time Supplier (Hari)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingProduct.lead_time_hari}
                    onChange={(e) => setEditingProduct({ ...editingProduct, lead_time_hari: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Minimum (Diskon)</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={editingProduct.harga_min}
                    onChange={(e) => setEditingProduct({ ...editingProduct, harga_min: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Maksimum (Kenaikan)</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={editingProduct.harga_max}
                    onChange={(e) => setEditingProduct({ ...editingProduct, harga_max: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan</label>
                  <input
                    type="text"
                    value={editingProduct.catatan || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, catatan: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Produk */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Produk</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Apakah Anda yakin ingin menghapus produk <strong>{deletingProduct.nama_produk}</strong> ({deletingProduct.sku})? Tindakan ini akan menghapus semua riwayat terkait produk ini.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(deletingProduct.id);
                  setDeletingProduct(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
