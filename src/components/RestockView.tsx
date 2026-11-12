import React, { useState, useMemo } from 'react';
import { ProductItem, SaleItem, EventItem, UserItem } from '../types';
import { calculateForecast } from '../utils/forecasting';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  PackagePlus,
  HelpCircle,
} from 'lucide-react';

interface RestockViewProps {
  products: ProductItem[];
  sales: SaleItem[];
  events: EventItem[];
  currentUser: UserItem;
  initialProductId?: number;
  onExecuteRestock: (productId: number, qty: number, method: string, eventName: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const RestockView: React.FC<RestockViewProps> = ({
  products,
  sales,
  events,
  initialProductId,
  onExecuteRestock,
  onNavigateTab,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number>(initialProductId || products[0]?.id || 1);
  const [periodType, setPeriodType] = useState<'Bulanan' | 'Mingguan'>('Bulanan');
  const [preferredMethod, setPreferredMethod] = useState<'Moving Average' | 'Exponential Smoothing'>('Moving Average');
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const selectedEvent = events.find((ev) => ev.id === Number(selectedEventId));
  const eventMultiplier = selectedEvent ? selectedEvent.faktor_pengali : 1.0;
  const eventName = selectedEvent ? `${selectedEvent.nama_event} (${selectedEvent.faktor_pengali}x)` : 'Normal (Tanpa Event)';

  const forecastData = useMemo(() => {
    if (!activeProduct) return null;
    return calculateForecast(activeProduct, sales, periodType, preferredMethod, eventMultiplier);
  }, [activeProduct, sales, periodType, preferredMethod, eventMultiplier]);

  const handleExecute = () => {
    if (!forecastData || forecastData.rekomendasi_restock <= 0) return;
    onExecuteRestock(activeProduct.id, forecastData.rekomendasi_restock, preferredMethod, eventName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Prediksi Kebutuhan Restock</h1>
          <p className="text-sm text-slate-500">
            Peramalan kuantitatif ilmiah (Moving Average & Exponential Smoothing), kalkulasi Reorder Point (ROP), dan evaluasi akurasi (MAD & MAPE).
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('events')}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs"
        >
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>Kelola Event Promo</span>
        </button>
      </div>

      {/* Filter / Konfigurasi Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Produk Analisis</label>
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
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Periode Agregasi</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as 'Bulanan' | 'Mingguan')}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
            >
              <option value="Bulanan">Bulanan</option>
              <option value="Mingguan">Mingguan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Peramalan Utama</label>
            <select
              value={preferredMethod}
              onChange={(e) => setPreferredMethod(e.target.value as 'Moving Average' | 'Exponential Smoothing')}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
            >
              <option value="Moving Average">Moving Average (N=3)</option>
              <option value="Exponential Smoothing">Exponential Smoothing (α=0.3)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sertakan Lonjakan Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
            >
              <option value="">Normal (Tanpa Event - 1.0x)</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.nama_event} (+{Math.round((ev.faktor_pengali - 1.0) * 100)}% / {ev.faktor_pengali}x)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Peringatan Jika Data Kurang dari 3 Periode */}
      {forecastData && !forecastData.cukup_data ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Data Penjualan Belum Memenuhi Syarat Minimal</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {forecastData.pesan ||
              'Dibutuhkan minimal 3 periode data historis penjualan untuk menghitung peramalan yang valid.'}
          </p>
          <button
            onClick={() => onNavigateTab('sales')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-2xs"
          >
            Input / Impor Data Penjualan Baru
          </button>
        </div>
      ) : forecastData ? (
        <>
          {/* 4 Kartu Output Hasil Peramalan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">Prediksi Permintaan</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-blue-900 font-mono tabular-nums">
                  {forecastData.demand_prediksi_final}
                </span>
                <span className="text-xs text-slate-400">unit</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Basis: {preferredMethod === 'Moving Average' ? forecastData.next_ma : forecastData.next_es} × {eventMultiplier}x
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">Safety Stock (Aman)</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-slate-800 font-mono tabular-nums">
                  {forecastData.safety_stock}
                </span>
                <span className="text-xs text-slate-400">unit</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Z 95% (1.65) × Deviasi {forecastData.std_dev}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">Reorder Point (ROP)</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-amber-600 font-mono tabular-nums">
                  {forecastData.rop}
                </span>
                <span className="text-xs text-slate-400">unit</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Lead Time: {activeProduct.lead_time_hari} hari
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border-2 border-emerald-500 shadow-2xs bg-emerald-50/20">
              <span className="text-xs font-semibold text-emerald-800 block mb-1">Rekomendasi Restock</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono tabular-nums">
                  +{forecastData.rekomendasi_restock}
                </span>
                <span className="text-xs text-emerald-700">unit</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Stok saat ini: {activeProduct.stok_saat_ini} unit
              </div>
            </div>
          </div>

          {/* Banner Eksekusi Restock ("Tandai Sudah Dijalankan") */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Siap Menjalankan Pemesanan Restock?</span>
              </div>
              <p className="text-xs text-emerald-800">
                Klik tombol di samping untuk mengeksekusi rekomendasi penambahan stok{' '}
                <strong>+{forecastData.rekomendasi_restock} unit</strong> pada{' '}
                <strong>{activeProduct.nama_produk}</strong> dan mencatatnya ke log audit inventaris secara otomatis.
              </p>
            </div>

            <button
              onClick={handleExecute}
              disabled={forecastData.rekomendasi_restock <= 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm whitespace-nowrap shrink-0 transition-colors"
            >
              Tandai Sudah Dijalankan
            </button>
          </div>

          {/* Evaluasi Perbandingan Akurasi (MAD & MAPE) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              <h2 className="text-sm font-bold text-slate-900">Perbandingan Akurasi Ilmiah: MAD & MAPE</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4">Metode Peramalan</th>
                    <th className="py-2.5 px-3 text-center">Prediksi Periode Depan</th>
                    <th className="py-2.5 px-3 text-center">MAD (Mean Absolute Dev.)</th>
                    <th className="py-2.5 px-3 text-center">MAPE (Mean Absolute % Error)</th>
                    <th className="py-2.5 px-4 text-center">Tingkat Akurasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className={forecastData.ma_mape <= forecastData.es_mape ? 'bg-emerald-50/50' : ''}>
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <span>Moving Average (N=3)</span>
                      {forecastData.ma_mape <= forecastData.es_mape && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Lebih Akurat
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">{forecastData.next_ma} unit</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-700">{forecastData.ma_mad}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-900">{forecastData.ma_mape}%</td>
                    <td className="py-3 px-4 text-center">
                      {forecastData.ma_mape < 10 ? (
                        <span className="text-emerald-700 font-semibold">Sangat Tinggi (&lt;10%)</span>
                      ) : forecastData.ma_mape < 20 ? (
                        <span className="text-blue-900 font-semibold">Tinggi (10% - 20%)</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Cukup Wajar</span>
                      )}
                    </td>
                  </tr>

                  <tr className={forecastData.es_mape < forecastData.ma_mape ? 'bg-emerald-50/50' : ''}>
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <span>Exponential Smoothing (α=0.3)</span>
                      {forecastData.es_mape < forecastData.ma_mape && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Lebih Akurat
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">{forecastData.next_es} unit</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-700">{forecastData.es_mad}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">{forecastData.es_mape}%</td>
                    <td className="py-3 px-4 text-center">
                      {forecastData.es_mape < 10 ? (
                        <span className="text-emerald-700 font-semibold">Sangat Tinggi (&lt;10%)</span>
                      ) : forecastData.es_mape < 20 ? (
                        <span className="text-blue-900 font-semibold">Tinggi (10% - 20%)</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Cukup Wajar</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-400 mt-3">
              * <strong>MAD (Mean Absolute Deviation):</strong> Mengukur rata-rata kesalahan deviasi absolut dalam satuan unit.
              <br />* <strong>MAPE (Mean Absolute Percentage Error):</strong> Mengukur persentase rata-rata deviasi relatif kesalahan terhadap penjualan aktual. Semakin kecil nilai MAPE, semakin tinggi akurasi metode peramalan.
            </p>
          </div>

          {/* Rincian Historis per Periode */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
              Tabel Deret Waktu Historis & Prediksi Tiap Periode
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4">Periode</th>
                    <th className="py-2.5 px-3 text-center">Penjualan Aktual (Unit)</th>
                    <th className="py-2.5 px-3 text-center">Moving Average (N=3)</th>
                    <th className="py-2.5 px-3 text-center">Exponential Smoothing (α=0.3)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forecastData.period_labels.map((lbl, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{lbl}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {forecastData.actuals[idx]} unit
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {forecastData.ma_forecasts[idx] !== null ? `${forecastData.ma_forecasts[idx]} unit` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {forecastData.es_forecasts[idx] !== null ? `${forecastData.es_forecasts[idx]} unit` : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50/60 font-semibold border-t-2 border-blue-200">
                    <td className="py-3 px-4 text-blue-900 font-bold">Periode Depan (Proyeksi)</td>
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">-</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-900">{forecastData.next_ma} unit</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-800">{forecastData.next_es} unit</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
