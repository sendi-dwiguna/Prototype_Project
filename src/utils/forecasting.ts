import { ProductItem, SaleItem, ForecastResult, DynamicPricingItem, StockStatus } from '../types';

export function formatRupiah(value: number): string {
  if (isNaN(value)) return 'Rp 0';
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export function formatTglIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const clean = dateStr.split('T')[0].split(' ')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> DD-MM-YYYY
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return `${parts[0]}-${parts[1]}-${parts[2]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function getStockStatus(stok: number, batasMin: number): StockStatus {
  if (stok <= batasMin) return 'Kritis';
  if (stok <= batasMin + 5) return 'Waspada';
  return 'Aman';
}

/**
 * Kelompokkan data penjualan ke dalam periode Mingguan atau Bulanan
 */
export function groupSalesByPeriod(
  productId: number,
  sales: SaleItem[],
  periodType: 'Bulanan' | 'Mingguan'
): { label: string; totalQty: number }[] {
  const productSales = sales.filter((s) => s.product_id === productId);

  const groups: { [key: string]: number } = {};

  productSales.forEach((s) => {
    const d = new Date(s.tanggal_penjualan);
    let key = '';

    if (periodType === 'Bulanan') {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      key = `${year}-${month}`;
    } else {
      // Mingguan: YYYY-Www
      const year = d.getFullYear();
      const oneJan = new Date(year, 0, 1);
      const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
      const week = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
      key = `${year}-W${String(week).padStart(2, '0')}`;
    }

    groups[key] = (groups[key] || 0) + s.jumlah_terjual;
  });

  const sortedKeys = Object.keys(groups).sort();
  return sortedKeys.map((k) => ({
    label: k,
    totalQty: groups[k],
  }));
}

/**
 * Kalkulasi Peramalan Kebutuhan Restock
 * Moving Average (N=3) & Exponential Smoothing (alpha=0.3)
 */
export function calculateForecast(
  product: ProductItem,
  sales: SaleItem[],
  periodType: 'Bulanan' | 'Mingguan',
  preferredMethod: 'Moving Average' | 'Exponential Smoothing',
  eventMultiplier: number = 1.0
): ForecastResult {
  const periods = groupSalesByPeriod(product.id, sales, periodType);

  if (periods.length < 3) {
    return {
      cukup_data: false,
      pesan: `Produk ini baru memiliki ${periods.length} periode penjualan. Diperlukan minimal 3 periode data historis untuk menghasilkan peramalan yang akurat.`,
      period_labels: periods.map((p) => p.label),
      actuals: periods.map((p) => p.totalQty),
      ma_forecasts: [],
      es_forecasts: [],
      next_ma: 0,
      next_es: 0,
      ma_mad: 0,
      ma_mape: 0,
      es_mad: 0,
      es_mape: 0,
      std_dev: 0,
      mean_demand: 0,
      demand_prediksi_final: 0,
      safety_stock: 0,
      rop: 0,
      rekomendasi_restock: 0,
      daily_demand: 0,
    };
  }

  const actuals = periods.map((p) => p.totalQty);
  const period_labels = periods.map((p) => p.label);
  const n = actuals.length;

  // 1. Moving Average (N=3)
  const k = 3;
  const ma_forecasts: (number | null)[] = [null, null, null];
  for (let i = k; i < n; i++) {
    const slice = actuals.slice(i - k, i);
    const avg = slice.reduce((a, b) => a + b, 0) / k;
    ma_forecasts.push(Math.round(avg * 100) / 100);
  }
  const next_ma = Math.round((actuals.slice(-k).reduce((a, b) => a + b, 0) / k) * 100) / 100;

  // 2. Exponential Smoothing (alpha = 0.3)
  const alpha = 0.3;
  const es_forecasts: (number | null)[] = [actuals[0]];
  for (let i = 1; i < n; i++) {
    const prevEs = es_forecasts[i - 1] as number;
    const val = alpha * actuals[i - 1] + (1 - alpha) * prevEs;
    es_forecasts.push(Math.round(val * 100) / 100);
  }
  const lastEs = es_forecasts[n - 1] as number;
  const next_es = Math.round((alpha * actuals[n - 1] + (1 - alpha) * lastEs) * 100) / 100;

  // Evaluasi Akurasi: MAD dan MAPE
  const ma_errors: number[] = [];
  const ma_pct_errors: number[] = [];
  for (let i = k; i < n; i++) {
    const err = Math.abs(actuals[i] - (ma_forecasts[i] as number));
    ma_errors.push(err);
    if (actuals[i] > 0) {
      ma_pct_errors.push((err / actuals[i]) * 100);
    }
  }
  const ma_mad = ma_errors.length > 0 ? Math.round((ma_errors.reduce((a, b) => a + b, 0) / ma_errors.length) * 100) / 100 : 0;
  const ma_mape = ma_pct_errors.length > 0 ? Math.round((ma_pct_errors.reduce((a, b) => a + b, 0) / ma_pct_errors.length) * 100) / 100 : 0;

  const es_errors: number[] = [];
  const es_pct_errors: number[] = [];
  for (let i = 1; i < n; i++) {
    const err = Math.abs(actuals[i] - (es_forecasts[i] as number));
    es_errors.push(err);
    if (actuals[i] > 0) {
      es_pct_errors.push((err / actuals[i]) * 100);
    }
  }
  const es_mad = es_errors.length > 0 ? Math.round((es_errors.reduce((a, b) => a + b, 0) / es_errors.length) * 100) / 100 : 0;
  const es_mape = es_pct_errors.length > 0 ? Math.round((es_pct_errors.reduce((a, b) => a + b, 0) / es_pct_errors.length) * 100) / 100 : 0;

  // Standar Deviasi untuk Safety Stock
  const mean_demand = actuals.reduce((a, b) => a + b, 0) / n;
  const variance = actuals.reduce((sum, x) => sum + Math.pow(x - mean_demand, 2), 0) / Math.max(1, n - 1);
  const std_dev = Math.round(Math.sqrt(variance) * 100) / 100;

  // Nilai Prediksi Utama dikali faktor lonjakan event
  const base_pred = preferredMethod === 'Moving Average' ? next_ma : next_es;
  const demand_prediksi_final = Math.round(base_pred * eventMultiplier * 100) / 100;

  // Konversi permintaan harian
  const periodDays = periodType === 'Mingguan' ? 7 : 30;
  const daily_demand = demand_prediksi_final / periodDays;

  // Safety Stock = 1.65 * (std_dev / sqrt(periodDays)) * sqrt(lead_time_hari)
  const z = 1.65; // Service level 95%
  let safety_stock = Math.round(z * (std_dev / Math.sqrt(periodDays)) * Math.sqrt(product.lead_time_hari));
  safety_stock = Math.max(safety_stock, product.batas_stok_min);

  // Reorder Point = (Daily Demand * Lead Time) + Safety Stock
  const lead_time_demand = daily_demand * product.lead_time_hari;
  const rop = Math.round(lead_time_demand + safety_stock);

  // Rekomendasi Restock = max(0, Demand Prediksi + Safety Stock - Stok Saat Ini)
  const rekomendasi_restock = Math.max(0, Math.round((demand_prediksi_final + safety_stock) - product.stok_saat_ini));

  return {
    cukup_data: true,
    period_labels,
    actuals,
    ma_forecasts,
    es_forecasts,
    next_ma,
    next_es,
    ma_mad,
    ma_mape,
    es_mad,
    es_mape,
    std_dev,
    mean_demand: Math.round(mean_demand * 100) / 100,
    demand_prediksi_final,
    safety_stock,
    rop,
    rekomendasi_restock,
    daily_demand: Math.round(daily_demand * 100) / 100,
  };
}

/**
 * Kalkulasi Rekomendasi Dynamic Pricing untuk semua produk
 */
export function calculateDynamicPricing(
  products: ProductItem[],
  sales: SaleItem[],
  dismissedProductIds: number[] = []
): DynamicPricingItem[] {
  // Hitung penjualan 30 hari terakhir
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  return products.map((p) => {
    const is_dismissed = dismissedProductIds.includes(p.id);

    const sold_30d = sales
      .filter((s) => s.product_id === p.id && new Date(s.tanggal_penjualan) >= thirtyDaysAgo)
      .reduce((sum, s) => sum + s.jumlah_terjual, 0);

    const velocity_per_day = Math.round((sold_30d / 30) * 100) / 100;
    const runway_days = velocity_per_day > 0 ? Math.round((p.stok_saat_ini / velocity_per_day) * 10) / 10 : 999;

    let action: 'Naikkan Harga' | 'Turunkan Harga' | 'Pertahankan' = 'Pertahankan';
    let adjustment_pct = 0;
    let alasan = 'Keseimbangan stok dan laju penjualan normal.';

    if ((p.stok_saat_ini <= p.batas_stok_min || runway_days < 10) && velocity_per_day >= 0.8) {
      action = 'Naikkan Harga';
      adjustment_pct = 10;
      alasan = `Stok menipis (${p.stok_saat_ini} pcs) sementara perputaran penjualan sangat cepat (${velocity_per_day} pcs/hari). Menaikkan harga dapat menjaga margin optimal dan mencegah kehabisan stok.`;
    } else if ((p.stok_saat_ini > p.batas_stok_min * 2.5 || runway_days > 45) && velocity_per_day <= 0.4) {
      action = 'Turunkan Harga';
      adjustment_pct = -10;
      alasan = `Stok menumpuk (${p.stok_saat_ini} pcs) dan perputaran lambat (${velocity_per_day} pcs/hari). Diskon strategis direkomendasikan untuk melikuidasi barang.`;
    }

    // Kalkulasi harga baru dan pembulatan ke ribuan terdekat
    let raw_price = p.harga_jual * (1 + adjustment_pct / 100);
    raw_price = Math.round(raw_price / 1000) * 1000;

    // Batasi dalam range Harga Minimum dan Maksimum
    const harga_saran = Math.max(p.harga_min, Math.min(p.harga_max, raw_price));
    const selisih = harga_saran - p.harga_jual;

    const margin_sebelum = p.harga_jual > 0 ? Math.round(((p.harga_jual - p.harga_modal) / p.harga_jual) * 1000) / 10 : 0;
    const margin_sesudah = harga_saran > 0 ? Math.round(((harga_saran - p.harga_modal) / harga_saran) * 1000) / 10 : 0;

    return {
      product_id: p.id,
      sku: p.sku,
      nama_produk: p.nama_produk,
      stok_saat_ini: p.stok_saat_ini,
      batas_stok_min: p.batas_stok_min,
      sold_30d,
      velocity_per_day,
      runway_days,
      harga_modal: p.harga_modal,
      harga_saat_ini: p.harga_jual,
      harga_min: p.harga_min,
      harga_max: p.harga_max,
      action,
      adjustment_pct,
      harga_saran,
      selisih,
      margin_sebelum,
      margin_sesudah,
      alasan,
      is_dismissed,
    };
  });
}
