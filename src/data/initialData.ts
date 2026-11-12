import { ProductItem, SaleItem, EventItem, UserItem, StockLogItem, PriceHistoryItem } from '../types';

export const initialUsers: UserItem[] = [
  {
    id: 1,
    username: 'pemilik',
    nama_lengkap: 'Budi Santoso (Pemilik Toko)',
    role: 'pemilik',
    created_at: '2026-07-01 08:00:00',
  },
  {
    id: 2,
    username: 'staf',
    nama_lengkap: 'Siti Rahma (Staf Operasional)',
    role: 'staf',
    created_at: '2026-07-01 08:30:00',
  },
];

export const initialProducts: ProductItem[] = [
  {
    id: 1,
    sku: 'SKU-001',
    nama_produk: 'Kemeja Flanel Premium Pria',
    harga_modal: 85000,
    harga_jual: 145000,
    stok_saat_ini: 8, // Kritis (stok <= min_stock 10)
    batas_stok_min: 10,
    harga_min: 120000,
    harga_max: 185000,
    lead_time_hari: 7,
    catatan: 'Kategori Pakaian Pria - Best Seller',
    created_at: '2026-07-01 09:00:00',
  },
  {
    id: 2,
    sku: 'SKU-002',
    nama_produk: 'Gamis Rayon Viscose Cantik',
    harga_modal: 95000,
    harga_jual: 165000,
    stok_saat_ini: 14, // Waspada (min 12, max waspada 17)
    batas_stok_min: 12,
    harga_min: 140000,
    harga_max: 210000,
    lead_time_hari: 5,
    catatan: 'Kategori Muslim Fashion - Bahan adem',
    created_at: '2026-07-01 09:15:00',
  },
  {
    id: 3,
    sku: 'SKU-003',
    nama_produk: 'Sepatu Sneaker Casual Canvas',
    harga_modal: 130000,
    harga_jual: 225000,
    stok_saat_ini: 35, // Aman (min 15, aman > 20)
    batas_stok_min: 15,
    harga_min: 190000,
    harga_max: 280000,
    lead_time_hari: 10,
    catatan: 'Kategori Sepatu - Stok melimpah',
    created_at: '2026-07-01 09:30:00',
  },
  {
    id: 4,
    sku: 'SKU-004',
    nama_produk: 'Tas Ransel Laptop Anti Air',
    harga_modal: 110000,
    harga_jual: 195000,
    stok_saat_ini: 4, // Kritis (min 8)
    batas_stok_min: 8,
    harga_min: 160000,
    harga_max: 250000,
    lead_time_hari: 6,
    catatan: 'Kategori Aksesoris - Stok menipis',
    created_at: '2026-07-01 09:45:00',
  },
  {
    id: 5,
    sku: 'SKU-005',
    nama_produk: 'Kaos Polos Katun Combed 30s',
    harga_modal: 32000,
    harga_jual: 65000,
    stok_saat_ini: 52, // Aman (min 20)
    batas_stok_min: 20,
    harga_min: 50000,
    harga_max: 85000,
    lead_time_hari: 4,
    catatan: 'Kategori Basic Wear - Penjualan stabil',
    created_at: '2026-07-01 10:00:00',
  },
];

export const initialSales: SaleItem[] = [
  // SKU-001 Kemeja Flanel (4+ periode: Juli, Agustus, September, Oktober, November)
  { id: 1, product_id: 1, sku: 'SKU-001', nama_produk: 'Kemeja Flanel Premium Pria', jumlah_terjual: 28, harga_satuan: 145000, total_harga: 28*145000, tanggal_penjualan: '2026-07-15', catatan: 'Penjualan Periode Juli', created_at: '2026-07-15 14:00:00' },
  { id: 2, product_id: 1, sku: 'SKU-001', nama_produk: 'Kemeja Flanel Premium Pria', jumlah_terjual: 35, harga_satuan: 145000, total_harga: 35*145000, tanggal_penjualan: '2026-08-18', catatan: 'Penjualan Periode Agustus', created_at: '2026-08-18 15:30:00' },
  { id: 3, product_id: 1, sku: 'SKU-001', nama_produk: 'Kemeja Flanel Premium Pria', jumlah_terjual: 42, harga_satuan: 145000, total_harga: 42*145000, tanggal_penjualan: '2026-09-20', catatan: 'Penjualan Periode September', created_at: '2026-09-20 16:15:00' },
  { id: 4, product_id: 1, sku: 'SKU-001', nama_produk: 'Kemeja Flanel Premium Pria', jumlah_terjual: 50, harga_satuan: 145000, total_harga: 50*145000, tanggal_penjualan: '2026-10-22', catatan: 'Penjualan Periode Oktober', created_at: '2026-10-22 17:00:00' },
  { id: 5, product_id: 1, sku: 'SKU-001', nama_produk: 'Kemeja Flanel Premium Pria', jumlah_terjual: 15, harga_satuan: 145000, total_harga: 15*145000, tanggal_penjualan: '2026-11-05', catatan: 'Shopee Promo 11.11 Warm-up', created_at: '2026-11-05 10:20:00' },

  // SKU-002 Gamis Rayon
  { id: 6, product_id: 2, sku: 'SKU-002', nama_produk: 'Gamis Rayon Viscose Cantik', jumlah_terjual: 20, harga_satuan: 165000, total_harga: 20*165000, tanggal_penjualan: '2026-07-10', catatan: 'Penjualan Periode Juli', created_at: '2026-07-10 11:00:00' },
  { id: 7, product_id: 2, sku: 'SKU-002', nama_produk: 'Gamis Rayon Viscose Cantik', jumlah_terjual: 25, harga_satuan: 165000, total_harga: 25*165000, tanggal_penjualan: '2026-08-12', catatan: 'Penjualan Periode Agustus', created_at: '2026-08-12 13:40:00' },
  { id: 8, product_id: 2, sku: 'SKU-002', nama_produk: 'Gamis Rayon Viscose Cantik', jumlah_terjual: 30, harga_satuan: 165000, total_harga: 30*165000, tanggal_penjualan: '2026-09-14', catatan: 'Penjualan Periode September', created_at: '2026-09-14 14:10:00' },
  { id: 9, product_id: 2, sku: 'SKU-002', nama_produk: 'Gamis Rayon Viscose Cantik', jumlah_terjual: 38, harga_satuan: 165000, total_harga: 38*165000, tanggal_penjualan: '2026-10-18', catatan: 'Penjualan Periode Oktober', created_at: '2026-10-18 16:25:00' },
  { id: 10, product_id: 2, sku: 'SKU-002', nama_produk: 'Gamis Rayon Viscose Cantik', jumlah_terjual: 12, harga_satuan: 165000, total_harga: 12*165000, tanggal_penjualan: '2026-11-08', catatan: 'Pesanan TikTok Shop', created_at: '2026-11-08 15:00:00' },

  // SKU-003 Sepatu Sneaker
  { id: 11, product_id: 3, sku: 'SKU-003', nama_produk: 'Sepatu Sneaker Casual Canvas', jumlah_terjual: 15, harga_satuan: 225000, total_harga: 15*225000, tanggal_penjualan: '2026-07-05', catatan: 'Penjualan Periode Juli', created_at: '2026-07-05 10:15:00' },
  { id: 12, product_id: 3, sku: 'SKU-003', nama_produk: 'Sepatu Sneaker Casual Canvas', jumlah_terjual: 14, harga_satuan: 225000, total_harga: 14*225000, tanggal_penjualan: '2026-08-08', catatan: 'Penjualan Periode Agustus', created_at: '2026-08-08 11:30:00' },
  { id: 13, product_id: 3, sku: 'SKU-003', nama_produk: 'Sepatu Sneaker Casual Canvas', jumlah_terjual: 12, harga_satuan: 225000, total_harga: 12*225000, tanggal_penjualan: '2026-09-11', catatan: 'Penjualan Periode September', created_at: '2026-09-11 12:45:00' },
  { id: 14, product_id: 3, sku: 'SKU-003', nama_produk: 'Sepatu Sneaker Casual Canvas', jumlah_terjual: 10, harga_satuan: 225000, total_harga: 10*225000, tanggal_penjualan: '2026-10-14', catatan: 'Penjualan Periode Oktober', created_at: '2026-10-14 14:10:00' },
  { id: 15, product_id: 3, sku: 'SKU-003', nama_produk: 'Sepatu Sneaker Casual Canvas', jumlah_terjual: 4, harga_satuan: 225000, total_harga: 4*225000, tanggal_penjualan: '2026-11-02', catatan: 'Penjualan Toko Fisik', created_at: '2026-11-02 16:30:00' },

  // SKU-004 Tas Ransel Laptop
  { id: 16, product_id: 4, sku: 'SKU-004', nama_produk: 'Tas Ransel Laptop Anti Air', jumlah_terjual: 18, harga_satuan: 195000, total_harga: 18*195000, tanggal_penjualan: '2026-07-22', catatan: 'Penjualan Periode Juli', created_at: '2026-07-22 13:00:00' },
  { id: 17, product_id: 4, sku: 'SKU-004', nama_produk: 'Tas Ransel Laptop Anti Air', jumlah_terjual: 22, harga_satuan: 195000, total_harga: 22*195000, tanggal_penjualan: '2026-08-25', catatan: 'Penjualan Periode Agustus', created_at: '2026-08-25 14:20:00' },
  { id: 18, product_id: 4, sku: 'SKU-004', nama_produk: 'Tas Ransel Laptop Anti Air', jumlah_terjual: 28, harga_satuan: 195000, total_harga: 28*195000, tanggal_penjualan: '2026-09-27', catatan: 'Penjualan Periode September', created_at: '2026-09-27 15:45:00' },
  { id: 19, product_id: 4, sku: 'SKU-004', nama_produk: 'Tas Ransel Laptop Anti Air', jumlah_terjual: 34, harga_satuan: 195000, total_harga: 34*195000, tanggal_penjualan: '2026-10-29', catatan: 'Penjualan Periode Oktober', created_at: '2026-10-29 17:10:00' },
  { id: 20, product_id: 4, sku: 'SKU-004', nama_produk: 'Tas Ransel Laptop Anti Air', jumlah_terjual: 9, harga_satuan: 195000, total_harga: 9*195000, tanggal_penjualan: '2026-11-09', catatan: 'Tokopedia Flash Deal', created_at: '2026-11-09 11:30:00' },

  // SKU-005 Kaos Polos Katun
  { id: 21, product_id: 5, sku: 'SKU-005', nama_produk: 'Kaos Polos Katun Combed 30s', jumlah_terjual: 60, harga_satuan: 65000, total_harga: 60*65000, tanggal_penjualan: '2026-07-02', catatan: 'Penjualan Periode Juli', created_at: '2026-07-02 10:00:00' },
  { id: 22, product_id: 5, sku: 'SKU-005', nama_produk: 'Kaos Polos Katun Combed 30s', jumlah_terjual: 65, harga_satuan: 65000, total_harga: 65*65000, tanggal_penjualan: '2026-08-04', catatan: 'Penjualan Periode Agustus', created_at: '2026-08-04 11:15:00' },
  { id: 23, product_id: 5, sku: 'SKU-005', nama_produk: 'Kaos Polos Katun Combed 30s', jumlah_terjual: 72, harga_satuan: 65000, total_harga: 72*65000, tanggal_penjualan: '2026-09-06', catatan: 'Penjualan Periode September', created_at: '2026-09-06 13:30:00' },
  { id: 24, product_id: 5, sku: 'SKU-005', nama_produk: 'Kaos Polos Katun Combed 30s', jumlah_terjual: 80, harga_satuan: 65000, total_harga: 80*65000, tanggal_penjualan: '2026-10-09', catatan: 'Penjualan Periode Oktober', created_at: '2026-10-09 15:50:00' },
  { id: 25, product_id: 5, sku: 'SKU-005', nama_produk: 'Kaos Polos Katun Combed 30s', jumlah_terjual: 25, harga_satuan: 65000, total_harga: 25*65000, tanggal_penjualan: '2026-11-04', catatan: 'Pesanan Grosir Shopee', created_at: '2026-11-04 14:00:00' },
];

export const initialEvents: EventItem[] = [
  {
    id: 1,
    nama_event: 'Promo 11.11 Mega Sale',
    faktor_pengali: 1.50,
    tanggal_mulai: '2026-11-10',
    tanggal_selesai: '2026-11-12',
    deskripsi: 'Pesta diskon nasional lonjakan +50%',
  },
  {
    id: 2,
    nama_event: 'Ramadan & Lebaran Fest',
    faktor_pengali: 1.60,
    tanggal_mulai: '2027-03-01',
    tanggal_selesai: '2027-04-05',
    deskripsi: 'Lonjakan pembelian busana & kebutuhan hari raya',
  },
  {
    id: 3,
    nama_event: 'Payday Sale Akhir Bulan',
    faktor_pengali: 1.25,
    tanggal_mulai: '2026-11-25',
    tanggal_selesai: '2026-11-30',
    deskripsi: 'Pekan gajian rutin +25%',
  },
];

export const initialStockLogs: StockLogItem[] = [
  {
    id: 1,
    product_id: 1,
    sku: 'SKU-001',
    nama_produk: 'Kemeja Flanel Premium Pria',
    jenis_perubahan: 'Stok Awal',
    jumlah_perubahan: 8,
    stok_sebelum: 0,
    stok_sesudah: 8,
    keterangan: 'Inisialisasi sistem inventaris awal',
    user_name: 'Budi Santoso',
    created_at: '2026-07-01 09:00:00',
  },
  {
    id: 2,
    product_id: 4,
    sku: 'SKU-004',
    nama_produk: 'Tas Ransel Laptop Anti Air',
    jenis_perubahan: 'Stock Opname',
    jumlah_perubahan: -2,
    stok_sebelum: 6,
    stok_sesudah: 4,
    keterangan: 'Penyesuaian hasil opname fisik gudang',
    user_name: 'Siti Rahma',
    created_at: '2026-11-10 16:00:00',
  },
];

export const initialPriceHistory: PriceHistoryItem[] = [
  {
    id: 1,
    product_id: 1,
    sku: 'SKU-001',
    nama_produk: 'Kemeja Flanel Premium Pria',
    harga_lama: 135000,
    harga_baru: 145000,
    alasan: 'Persetujuan rekomendasi Dynamic Pricing (stok menipis, penjualan cepat)',
    user_name: 'Budi Santoso (Pemilik Toko)',
    created_at: '2026-10-01 11:30:00',
  },
];
