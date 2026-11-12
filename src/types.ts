export type UserRole = 'pemilik' | 'staf';

export interface UserItem {
  id: number;
  username: string;
  nama_lengkap: string;
  role: UserRole;
  created_at: string;
}

export interface ProductItem {
  id: number;
  sku: string;
  nama_produk: string;
  harga_modal: number;
  harga_jual: number;
  stok_saat_ini: number;
  batas_stok_min: number;
  harga_min: number;
  harga_max: number;
  lead_time_hari: number;
  catatan?: string;
  created_at: string;
}

export type StockStatus = 'Aman' | 'Waspada' | 'Kritis';

export interface StockLogItem {
  id: number;
  product_id: number;
  sku: string;
  nama_produk: string;
  jenis_perubahan: 'Masuk' | 'Stock Opname' | 'Keluar' | 'Penjualan' | 'Penjualan (Impor)' | 'Restock Masuk' | 'Stok Awal';
  jumlah_perubahan: number;
  stok_sebelum: number;
  stok_sesudah: number;
  keterangan: string;
  user_name: string;
  created_at: string;
}

export interface SaleItem {
  id: number;
  product_id: number;
  sku: string;
  nama_produk: string;
  jumlah_terjual: number;
  harga_satuan: number;
  total_harga: number;
  tanggal_penjualan: string; // YYYY-MM-DD
  catatan?: string;
  created_at: string;
}

export interface EventItem {
  id: number;
  nama_event: string;
  faktor_pengali: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  deskripsi: string;
}

export interface PriceHistoryItem {
  id: number;
  product_id: number;
  sku: string;
  nama_produk: string;
  harga_lama: number;
  harga_baru: number;
  alasan: string;
  user_name: string;
  created_at: string;
}

export interface ForecastResult {
  cukup_data: boolean;
  pesan?: string;
  period_labels: string[];
  actuals: number[];
  ma_forecasts: (number | null)[];
  es_forecasts: (number | null)[];
  next_ma: number;
  next_es: number;
  ma_mad: number;
  ma_mape: number;
  es_mad: number;
  es_mape: number;
  std_dev: number;
  mean_demand: number;
  demand_prediksi_final: number;
  safety_stock: number;
  rop: number;
  rekomendasi_restock: number;
  daily_demand: number;
}

export interface DynamicPricingItem {
  product_id: number;
  sku: string;
  nama_produk: string;
  stok_saat_ini: number;
  batas_stok_min: number;
  sold_30d: number;
  velocity_per_day: number;
  runway_days: number;
  harga_modal: number;
  harga_saat_ini: number;
  harga_min: number;
  harga_max: number;
  action: 'Naikkan Harga' | 'Turunkan Harga' | 'Pertahankan';
  adjustment_pct: number;
  harga_saran: number;
  selisih: number;
  margin_sebelum: number;
  margin_sesudah: number;
  alasan: string;
  is_dismissed: boolean;
}
