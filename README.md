# Restokin - Sistem Prediksi Restock dan Dynamic Pricing Online Shop

Aplikasi web lengkap berbasis **Python (Flask)** dan **SQLite3** untuk memprediksi kebutuhan restock barang (menggunakan Moving Average & Exponential Smoothing + Event Multipliers) serta memberikan rekomendasi penyesuaian harga dinamis (Dynamic Pricing) berdasarkan kecepatan penjualan dan level stok inventaris.

---

## 📁 Struktur Folder Proyek

```text
restokin/
│
├── app.py                     # Kode utama aplikasi Flask, rute API, dan inisialisasi DB
├── requirements.txt           # Daftar pustaka dependensi Python
├── restokin.db                # Database SQLite3 (dibuat otomatis saat pertama dijalankan)
├── README.md                  # Dokumentasi panduan instalasi & penggunaan
│
├── templates/                 # Berkas template antarmuka HTML5 (Bootstrap 5 & Chart.js)
│   ├── base.html              # Layout utama dan navigasi
│   ├── login.html             # Halaman login dengan proteksi 5x salah & timeout 30 menit
│   ├── dashboard.html         # Ringkasan KPI dan grafik interaktif Chart.js
│   ├── products.html          # Manajemen CRUD produk, lead time, & status stok
│   ├── stock_adjust.html      # Penyesuaian stok fisik (masuk/opname) & log audit
│   ├── sales.html             # Input penjualan manual & impor massal CSV/XLSX
│   ├── restock.html           # Peramalan demand, MAD, MAPE, ROP, & eksekusi restock
│   ├── pricing.html           # Dynamic pricing (sales velocity vs stock), terima/tolak
│   ├── events.html            # Manajemen event promosi (11.11, Ramadan) & faktor pengali
│   └── users.html             # Manajemen pengguna & role-based access control (RBAC)
│
├── static/
│   └── css/
│       └── custom.css         # Penyesuaian gaya CSS
│
└── uploads/                   # Folder sementara berkas impor penjualan
```

---

## ⚡ Fitur Utama

1. **Autentikasi & RBAC (Role-Based Access Control):**
   - **Pemilik Toko (Admin):** Akses penuh ke seluruh modul, penetapan harga, ekspor laporan, dan kelola pengguna.
   - **Staf Operasional:** Akses stok, pencatatan penjualan, dan penyesuaian stok masuk/opname.
   - Session timeout otomatis 30 menit.
   - Password di-hash menggunakan `werkzeug.security`.
   - Proteksi penguncian akun sementara 15 menit jika salah memasukkan password 5 kali berturut-turut.
   - **Akun Bawaan:**
     - Pemilik Toko: `pemilik` / `admin123`
     - Staf Operasional: `staf` / `staf123`

2. **Manajemen Produk & Inventaris:**
   - SKU, Nama, HPP (Harga Modal), Harga Jual, Stok Riil, Batas Minimum Stok, Lead Time Supplier (hari).
   - Batas Bawah (Harga Minimum) & Batas Atas (Harga Maksimum) untuk proteksi dynamic pricing.
   - Status stok otomatis:
     - **Aman**: Stok > Batas Minimum + 5
     - **Waspada**: Batas Minimum < Stok <= Batas Minimum + 5
     - **Kritis**: Stok <= Batas Minimum
   - Log audit riwayat mutasi stok lengkap dengan timestamp dan nama pengguna.

3. **Pencatatan & Impor Penjualan:**
   - Input transaksi manual yang otomatis memotong stok.
   - Filter riwayat penjualan berdasarkan produk dan rentang tanggal.
   - Unggah data massal format `.csv` (UTF-8) dan `.xlsx` (maks 5 MB).
   - Validasi ketat sisi server: deteksi error baris demi baris jika ada SKU salah, kuantitas negatif, atau format tanggal tidak sesuai.
   - Tombol unduh template CSV dan Excel contoh.

4. **Prediksi Kebutuhan Restock (Forecasting):**
   - Syarat data minimal 3 periode (mingguan atau bulanan).
   - Pilihan metode: **Moving Average (N=3)** dan **Exponential Smoothing (α=0.3)**.
   - Evaluasi akurasi ilmiah: **MAD (Mean Absolute Deviation)** dan **MAPE (Mean Absolute Percentage Error)**.
   - Integrasi faktor pengali lonjakan event promosi (misal 11.11, 12.12, Ramadan).
   - Kalkulasi otomatis **Reorder Point (ROP = Lead Time Demand + Safety Stock)**.
   - Rekomendasi kuantitas restock barang.
   - Tombol **"Tandai Sudah Dijalankan"** untuk auto-update stok gudang.

5. **Dynamic Pricing (Penyesuaian Harga Dinamis):**
   - Menghitung kecepatan penjualan (*sales velocity*) 30 hari terakhir dan ketersediaan hari stok.
   - Stok menipis & perputaran cepat -> saran kenaikan harga (+10%).
   - Stok menumpuk & perputaran lambat -> saran diskon (-10%).
   - Pembatasan ketat (*bounded*) antara Harga Minimum dan Harga Maksimum.
   - Perbandingan margin keuntungan sebelum vs sesudah.
   - Tombol **Terima** (harga otomatis diperbarui & dicatat ke tabel riwayat harga) atau **Tolak** (disembunyikan periode ini).

6. **Dashboard & Ekspor Laporan:**
   - 4 Kartu KPI: Total Produk, Produk Stok Kritis, Penjualan Bulan Ini, Estimasi Margin Rata-rata.
   - Grafik interaktif **Chart.js**: visualisasi penjualan historis vs hasil prediksi.
   - Ekspor Laporan **Excel (.xlsx)** multi-sheet dan **PDF** resmi siap cetak (khusus Pemilik Toko).

---

## 🚀 Panduan Menjalankan Secara Lokal

### Prasyarat
- Python 3.9 atau yang lebih baru telah terinstal di komputer Anda.

### Langkah-langkah:

1. **Buka terminal atau Command Prompt** pada folder proyek Restokin.
2. **(Opsional & Direkomendasikan) Buat Virtual Environment:**
   ```bash
   python -m venv venv
   # Aktifkan di Windows:
   venv\Scripts\activate
   # Aktifkan di macOS/Linux:
   source venv/bin/activate
   ```
3. **Instal seluruh pustaka yang dibutuhkan:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Jalankan aplikasi:**
   ```bash
   python app.py
   ```
5. **Buka peramban (browser) Anda dan akses:**
   ```
   http://127.0.0.1:5000
   ```
6. **Masuk menggunakan akun default:**
   - Pemilik Toko: Username `pemilik`, Password `admin123`
   - Staf Toko: Username `staf`, Password `staf123`
