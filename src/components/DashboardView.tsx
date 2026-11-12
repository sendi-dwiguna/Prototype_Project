import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ProductItem, SaleItem, EventItem, UserItem } from '../types';
import { formatRupiah, formatTglIndo, getStockStatus, calculateForecast } from '../utils/forecasting';
import { exportRestokinExcel, exportRestokinPDF } from '../utils/exportUtils';
import {
  Boxes,
  AlertTriangle,
  Banknote,
  Percent,
  FileSpreadsheet,
  FileText,
  Calendar,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface DashboardViewProps {
  products: ProductItem[];
  sales: SaleItem[];
  events: EventItem[];
  currentUser: UserItem;
  onNavigateTab: (tab: string, productId?: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  sales,
  events,
  currentUser,
  onNavigateTab,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number>(products[0]?.id || 1);

  // Perhitungan 4 Kartu Statistik
  const totalProduk = products.length;

  const produkKritis = useMemo(() => {
    return products.filter((p) => getStockStatus(p.stok_saat_ini, p.batas_stok_min) === 'Kritis').length;
  }, [products]);

  const penjualanBulanIni = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return sales
      .filter((s) => {
        const d = new Date(s.tanggal_penjualan);
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      })
      .reduce((sum, s) => sum + s.total_harga, 0);
  }, [sales]);

  const avgMargin = useMemo(() => {
    if (products.length === 0) return 0;
    const totalMargin = products.reduce((acc, p) => {
      const margin = p.harga_jual > 0 ? ((p.harga_jual - p.harga_modal) / p.harga_jual) * 100 : 0;
      return acc + margin;
    }, 0);
    return Math.round((totalMargin / products.length) * 10) / 10;
  }, [products]);

  // Produk yang dipilih untuk grafik
  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const forecastData = useMemo(() => {
    if (!activeProduct) return null;
    return calculateForecast(activeProduct, sales, 'Bulanan', 'Moving Average');
  }, [activeProduct, sales]);

  // Data untuk Chart.js
  const chartData = useMemo(() => {
    if (!forecastData || !forecastData.cukup_data) {
      return null;
    }

    const labels = [...forecastData.period_labels, 'Periode Depan (Prediksi)'];
    const actualData = [...forecastData.actuals, null];
    const maData = [...forecastData.ma_forecasts, forecastData.next_ma];
    const esData = [...forecastData.es_forecasts, forecastData.next_es];

    return {
      labels,
      datasets: [
        {
          label: 'Penjualan Aktual (Unit)',
          data: actualData,
          borderColor: '#0F172A',
          backgroundColor: '#0F172A',
          borderWidth: 2.5,
          tension: 0.2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Prediksi Moving Average (N=3)',
          data: maData,
          borderColor: '#2563EB',
          backgroundColor: '#2563EB',
          borderDash: [5, 5],
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 4,
        },
        {
          label: 'Prediksi Exponential Smoothing (α=0.3)',
          data: esData,
          borderColor: '#059669',
          backgroundColor: '#059669',
          borderDash: [3, 3],
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 4,
        },
      ],
    };
  }, [forecastData]);

  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.tanggal_penjualan).getTime() - new Date(a.tanggal_penjualan).getTime())
      .slice(0, 5);
  }, [sales]);

  return (
    <div className="space-y-6">
      {/* Header Dashboard & Action Ekspor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Ringkasan Operasional Toko</h1>
          <p className="text-sm text-slate-500">
            Monitoring kesehatan stok, histori penjualan, evaluasi peramalan, dan rekomendasi harga dinamis.
          </p>
        </div>

        {currentUser.role === 'pemilik' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => exportRestokinExcel(products, sales)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => exportRestokinPDF(products, sales, currentUser.nama_lengkap)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-2xs"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Ekspor PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* 4 Kartu KPI Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Produk */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Produk</span>
            <Boxes className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{totalProduk}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Katalog aktif di sistem</div>
          </div>
        </div>

        {/* Produk Stok Kritis */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Produk Stok Kritis</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 font-mono tabular-nums">{produkKritis}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Stok &le; batas minimum</div>
          </div>
        </div>

        {/* Penjualan Bulan Ini */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Penjualan Bulan Ini</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums truncate">
              {formatRupiah(penjualanBulanIni)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total omzet berjalan</div>
          </div>
        </div>

        {/* Estimasi Margin Rata-rata */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Margin Rata-rata</span>
            <Percent className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{avgMargin}%</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Keuntungan kotor rata-rata</div>
          </div>
        </div>
      </div>

      {/* Bagian Grafik Tren Penjualan vs Prediksi */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Tren Penjualan Historis vs Hasil Prediksi</h2>
            <p className="text-xs text-slate-500">Visualisasi perbandingan penjualan riil dengan Moving Average & Exponential Smoothing</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="selectProduct" className="text-xs text-slate-500 whitespace-nowrap">
              Produk:
            </label>
            <select
              id="selectProduct"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.nama_produk}
                </option>
              ))}
            </select>
          </div>
        </div>

        {chartData ? (
          <div>
            <div className="h-64 sm:h-80 w-full">
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        font: { family: 'Plus Jakarta Sans', size: 11 },
                        usePointStyle: true,
                        boxWidth: 6,
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: function (ctx) {
                          const val = ctx.parsed.y !== null ? `${ctx.parsed.y} unit` : '-';
                          return `${ctx.dataset.label}: ${val}`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { font: { family: 'JetBrains Mono', size: 10 } },
                      grid: { color: '#F1F5F9' },
                    },
                    x: {
                      ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } },
                      grid: { display: false },
                    },
                  },
                }}
              />
            </div>

            {/* Metrik Akurasi MAD & MAPE */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mt-3 border-t border-slate-100 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="text-[11px] text-slate-500">MAD Moving Average</div>
                <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">{forecastData?.ma_mad}</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="text-[11px] text-slate-500">MAPE Moving Average</div>
                <div className="text-sm font-bold text-blue-900 font-mono tabular-nums">{forecastData?.ma_mape}%</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="text-[11px] text-slate-500">MAD Exp. Smoothing</div>
                <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">{forecastData?.es_mad}</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="text-[11px] text-slate-500">MAPE Exp. Smoothing</div>
                <div className="text-sm font-bold text-emerald-700 font-mono tabular-nums">{forecastData?.es_mape}%</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            Produk ini belum memiliki riwayat penjualan minimal 3 periode untuk menampilkan grafik peramalan.
          </div>
        )}
      </div>

      {/* Grid Dua Kolom Bawah: Tabel Inventaris Ringkas & Penjualan Terakhir */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Tabel Inventaris Cepat (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Status Stok & Batas Minimum</h3>
              <span className="text-xs text-slate-500">Klasifikasi otomatis: Aman, Waspada, dan Kritis</span>
            </div>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs text-blue-900 hover:text-blue-950 font-semibold flex items-center gap-1"
            >
              <span>Kelola Katalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">SKU & Produk</th>
                  <th className="py-2.5 px-3 text-center">Stok Saat Ini</th>
                  <th className="py-2.5 px-3 text-center">Batas Min</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const status = getStockStatus(p.stok_saat_ini, p.batas_stok_min);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.nama_produk}</div>
                        <span className="font-mono text-slate-400 text-[11px]">{p.sku}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">{p.stok_saat_ini}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">{p.batas_stok_min}</td>
                      <td className="py-3 px-3 text-center">
                        {status === 'Kritis' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                            Kritis
                          </span>
                        )}
                        {status === 'Waspada' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Waspada
                          </span>
                        )}
                        {status === 'Aman' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onNavigateTab('restock', p.id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          Prediksi Restock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom Kanan: Transaksi Terbaru & Event Mendatang (1 col) */}
        <div className="space-y-6">
          {/* Penjualan Terakhir */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Penjualan Terbaru</h3>
              <button
                onClick={() => onNavigateTab('sales')}
                className="text-xs text-blue-900 hover:text-blue-950 font-semibold"
              >
                Lihat Semua
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentSales.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{s.nama_produk}</div>
                    <div className="text-slate-400 text-[11px]">
                      {formatTglIndo(s.tanggal_penjualan)} · {s.jumlah_terjual} pcs
                    </div>
                  </div>
                  <div className="font-mono font-bold text-emerald-700">{formatRupiah(s.total_harga)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Event Khusus & Multiplier */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Event Promosi</h3>
              {currentUser.role === 'pemilik' && (
                <button
                  onClick={() => onNavigateTab('events')}
                  className="text-xs text-blue-900 hover:text-blue-950 font-semibold"
                >
                  + Atur Event
                </button>
              )}
            </div>

            <div className="space-y-2">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{ev.nama_event}</div>
                    <div className="text-[11px] text-slate-400">
                      {formatTglIndo(ev.tanggal_mulai)} s.d {formatTglIndo(ev.tanggal_selesai)}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-blue-900 text-xs px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md">
                    +{Math.round((ev.faktor_pengali - 1.0) * 100)}% ({ev.faktor_pengali}x)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
