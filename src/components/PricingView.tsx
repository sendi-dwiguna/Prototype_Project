import React, { useMemo } from 'react';
import { ProductItem, SaleItem, PriceHistoryItem, UserItem } from '../types';
import { calculateDynamicPricing, formatRupiah, formatTglIndo } from '../utils/forecasting';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  X,
  Clock,
  ShieldCheck,
  Lock,
  Cpu,
} from 'lucide-react';

interface PricingViewProps {
  products: ProductItem[];
  sales: SaleItem[];
  priceHistory: PriceHistoryItem[];
  dismissedProductIds: number[];
  currentUser: UserItem;
  onAcceptPrice: (productId: number, newPrice: number, reason: string) => void;
  onRejectPrice: (productId: number) => void;
}

export const PricingView: React.FC<PricingViewProps> = ({
  products,
  sales,
  priceHistory,
  dismissedProductIds,
  currentUser,
  onAcceptPrice,
  onRejectPrice,
}) => {
  const isPemilik = currentUser.role === 'pemilik';

  const recommendations = useMemo(() => {
    return calculateDynamicPricing(products, sales, dismissedProductIds);
  }, [products, sales, dismissedProductIds]);

  const activeRecommendations = recommendations.filter((r) => !r.is_dismissed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Rekomendasi Penyesuaian Harga (Dynamic Pricing)
          </h1>
          <p className="text-sm text-slate-500">
            Optimasi marjin dan perputaran kas berbasis kecepatan penjualan (sales velocity) dan runway ketersediaan inventaris.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPemilik ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              <span>Otorisasi Penuh: Pemilik Toko</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Mode Lihat (Staf Operasional)</span>
            </span>
          )}
        </div>
      </div>

      {/* Penjelasan Logika Algoritma */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-4 h-4 text-blue-900" />
          <h2 className="text-sm font-bold text-slate-900">Aturan Logika Dynamic Pricing Restokin</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          1. <strong>Stok Menipis & Penjualan Cepat:</strong> Bila sisa stok mendekati batas minimum dan perputaran &ge; 0.8 pcs/hari, sistem merekomendasikan kenaikan harga (+10%) untuk memaksimalkan keuntungan dan memperpanjang masa edar stok.
          <br />
          2. <strong>Stok Menumpuk & Penjualan Lambat:</strong> Bila stok berlebih (&gt; 2.5× batas minimum) dan perputaran &le; 0.4 pcs/hari, sistem merekomendasikan penyesuaian diskon (-10%) untuk mencairkan aset modal.
          <br />
          3. <strong>Proteksi Mutlak Batas Harga:</strong> Rekomendasi dijamin tidak akan melanggar <strong>Harga Minimum</strong> dan <strong>Harga Maksimum</strong> yang telah Anda kunci.
        </p>
      </div>

      {/* Tabel Rekomendasi Harga Aktif */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Daftar Rekomendasi Harga Berjalan</h2>
          <span className="text-xs text-slate-400">Evaluasi 30 Hari Terakhir</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">SKU & Nama Produk</th>
                <th className="py-3 px-3 text-center">Stok / Kecepatan Jual</th>
                <th className="py-3 px-3 text-center">Rekomendasi Aksi</th>
                <th className="py-3 px-3 text-right">Harga Saat Ini</th>
                <th className="py-3 px-3 text-right">Harga Rekomendasi</th>
                <th className="py-3 px-3 text-center">Batas Aman (Min - Max)</th>
                <th className="py-3 px-3 text-center">Margin (Lama &rarr; Baru)</th>
                <th className="py-3 px-4 text-right">Keputusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeRecommendations.map((r) => (
                <tr key={r.product_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 text-sm">{r.nama_produk}</div>
                    <span className="font-mono text-slate-500 font-semibold text-xs">{r.sku}</span>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs">{r.alasan}</p>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <div className="font-mono font-bold text-slate-900">{r.stok_saat_ini} pcs</div>
                    <div className="text-[11px] text-slate-400 font-mono">{r.velocity_per_day} pcs/hari</div>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    {r.action === 'Naikkan Harga' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Naikkan Harga</span>
                      </span>
                    )}
                    {r.action === 'Turunkan Harga' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                        <span>Turunkan Harga</span>
                      </span>
                    )}
                    {r.action === 'Pertahankan' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Minus className="w-3.5 h-3.5 text-slate-400" />
                        <span>Pertahankan</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-right font-mono text-slate-600">{formatRupiah(r.harga_saat_ini)}</td>

                  <td className="py-3.5 px-3 text-right font-mono font-bold">
                    {r.selisih > 0 ? (
                      <span className="text-emerald-700">
                        {formatRupiah(r.harga_saran)}{' '}
                        <span className="text-[10px] text-emerald-600 font-normal">(+{formatRupiah(r.selisih)})</span>
                      </span>
                    ) : r.selisih < 0 ? (
                      <span className="text-rose-600">
                        {formatRupiah(r.harga_saran)}{' '}
                        <span className="text-[10px] text-rose-500 font-normal">({formatRupiah(r.selisih)})</span>
                      </span>
                    ) : (
                      <span className="text-slate-800">{formatRupiah(r.harga_saran)}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono text-[11px] text-slate-500">
                    {formatRupiah(r.harga_min)} – {formatRupiah(r.harga_max)}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono">
                    <span className="text-slate-400">{r.margin_sebelum}%</span>
                    <span className="text-slate-300 mx-1">&rarr;</span>
                    <span
                      className={`font-bold ${
                        r.margin_sesudah >= r.margin_sebelum ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {r.margin_sesudah}%
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {isPemilik ? (
                      r.action !== 'Pertahankan' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onAcceptPrice(r.product_id, r.harga_saran, r.alasan)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-2xs flex items-center gap-1 transition-colors"
                            title="Terapkan Harga Baru"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Terima</span>
                          </button>
                          <button
                            onClick={() => onRejectPrice(r.product_id)}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            title="Tolak & Sembunyikan Rekomendasi"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Stabil</span>
                      )
                    ) : (
                      <span className="text-slate-400 text-[11px] flex items-center justify-end gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Hanya Pemilik</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel Riwayat Perubahan Harga (Audit Trail) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">Riwayat Perubahan Harga (Audit Trail)</h2>
          </div>
          <span className="text-xs text-slate-400">{priceHistory.length} entri tercatat</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-4">Waktu</th>
                <th className="py-2.5 px-3">Produk</th>
                <th className="py-2.5 px-3 text-right">Harga Lama</th>
                <th className="py-2.5 px-3 text-right">Harga Baru</th>
                <th className="py-2.5 px-3 text-center">Selisih</th>
                <th className="py-2.5 px-4">Alasan Penetapan</th>
                <th className="py-2.5 px-4 text-right">Otorisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {priceHistory.map((h) => {
                const diff = h.harga_baru - h.harga_lama;
                return (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">{h.created_at}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{h.nama_produk}</div>
                      <span className="font-mono text-slate-400 text-[11px]">{h.sku}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">{formatRupiah(h.harga_lama)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-900">{formatRupiah(h.harga_baru)}</td>
                    <td className="py-3 px-3 text-center font-mono font-semibold">
                      {diff > 0 ? (
                        <span className="text-emerald-700">+{formatRupiah(diff)}</span>
                      ) : diff < 0 ? (
                        <span className="text-rose-600">{formatRupiah(diff)}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px] max-w-sm truncate">{h.alasan}</td>
                    <td className="py-3 px-4 text-right text-slate-500 text-[11px]">{h.user_name}</td>
                  </tr>
                );
              })}
              {priceHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada riwayat perubahan harga yang dicatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
