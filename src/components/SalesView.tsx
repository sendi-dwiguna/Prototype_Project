import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { ProductItem, SaleItem, UserItem } from '../types';
import { formatRupiah, formatTglIndo } from '../utils/forecasting';
import { downloadSalesTemplate } from '../utils/exportUtils';
import { Plus, Upload, Download, Search, AlertCircle, FileSpreadsheet, X, CheckCircle2 } from 'lucide-react';

interface SalesViewProps {
  products: ProductItem[];
  sales: SaleItem[];
  currentUser: UserItem;
  onRecordSale: (productId: number, qty: number, date: string, notes?: string) => { success: boolean; message: string };
  onImportBulkSales: (
    items: {
      productId: number;
      sku: string;
      nama_produk: string;
      qty: number;
      harga: number;
      date: string;
      notes: string;
    }[]
  ) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  products,
  sales,
  onRecordSale,
  onImportBulkSales,
}) => {
  // Filters
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Manual Form State
  const [manualProduct, setManualProduct] = useState<number>(products[0]?.id || 1);
  const [manualQty, setManualQty] = useState<number>(1);
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [manualNotes, setManualNotes] = useState<string>('');

  // Import State
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [parsedRowsCount, setParsedRowsCount] = useState<number>(0);
  const [stagedSales, setStagedSales] = useState<any[]>([]);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (filterProduct && s.product_id !== Number(filterProduct)) return false;
      if (startDate && s.tanggal_penjualan < startDate) return false;
      if (endDate && s.tanggal_penjualan > endDate) return false;
      return true;
    });
  }, [sales, filterProduct, startDate, endDate]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onRecordSale(manualProduct, manualQty, manualDate, manualNotes);
    if (result.success) {
      setShowManualModal(false);
      setManualNotes('');
      setManualQty(1);
    } else {
      alert(result.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setImportErrors(['Ukuran berkas melebihi batas maksimal 5 MB. Harap perkecil ukuran berkas Anda.']);
      return;
    }

    setImportFileName(file.name);
    setImportErrors([]);
    setStagedSales([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

        if (data.length === 0) {
          setImportErrors(['Berkas kosong atau tidak memiliki baris data.']);
          return;
        }

        // Validasi kolom
        const firstRow = data[0];
        const keys = Object.keys(firstRow).map((k) => k.trim());
        const hasSku = keys.some((k) => k.toLowerCase() === 'sku');
        const hasJumlah = keys.some((k) => k.toLowerCase() === 'jumlah' || k.toLowerCase() === 'qty');
        const hasTanggal = keys.some((k) => k.toLowerCase() === 'tanggal' || k.toLowerCase() === 'date');

        if (!hasSku || !hasJumlah || !hasTanggal) {
          setImportErrors([
            `Format kolom tidak sesuai! Kolom wajib: SKU, Jumlah, Tanggal. Kolom yang ditemukan: ${keys.join(
              ', '
            )}. Silakan unduh dan gunakan template contoh.`,
          ]);
          return;
        }

        const errors: string[] = [];
        const validItems: any[] = [];
        const stockMap = new Map<string, number>();
        products.forEach((p) => stockMap.set(p.sku.toUpperCase(), p.stok_saat_ini));

        data.forEach((row, index) => {
          const rowNumber = index + 2; // Row 1 is header
          const skuKey = Object.keys(row).find((k) => k.trim().toLowerCase() === 'sku') || 'SKU';
          const jumlahKey = Object.keys(row).find((k) => k.trim().toLowerCase() === 'jumlah' || k.trim().toLowerCase() === 'qty') || 'Jumlah';
          const tanggalKey = Object.keys(row).find((k) => k.trim().toLowerCase() === 'tanggal' || k.trim().toLowerCase() === 'date') || 'Tanggal';
          const catatanKey = Object.keys(row).find((k) => k.trim().toLowerCase() === 'catatan' || k.trim().toLowerCase() === 'notes') || 'Catatan';

          const rawSku = String(row[skuKey] || '').trim().toUpperCase();
          const rawQty = row[jumlahKey];
          const rawDate = String(row[tanggalKey] || '').trim();
          const rawCatatan = String(row[catatanKey] || '').trim();

          // 1. SKU validation
          if (!rawSku) {
            errors.push(`Baris ${rowNumber}, Kolom 'SKU': Kolom SKU tidak boleh kosong.`);
            return;
          }
          const matchedProd = products.find((p) => p.sku.toUpperCase() === rawSku);
          if (!matchedProd) {
            errors.push(
              `Baris ${rowNumber}, Kolom 'SKU': SKU '${rawSku}' tidak terdaftar di sistem. Daftarkan produk terlebih dahulu di menu Produk & Stok.`
            );
            return;
          }

          // 2. Qty validation
          const qty = Number(rawQty);
          if (isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
            errors.push(`Baris ${rowNumber}, Kolom 'Jumlah': Nilai '${rawQty}' bukan bilangan bulat positif > 0.`);
            return;
          }

          // 3. Date validation (DD-MM-YYYY or YYYY-MM-DD or Excel date)
          let parsedDate = '';
          if (typeof rawDate === 'number') {
            const excelDate = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
            parsedDate = excelDate.toISOString().slice(0, 10);
          } else {
            // Check formats
            const match1 = rawDate.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/); // DD-MM-YYYY
            const match2 = rawDate.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/); // YYYY-MM-DD
            if (match1) {
              parsedDate = `${match1[3]}-${match1[2]}-${match1[1]}`;
            } else if (match2) {
              parsedDate = `${match2[1]}-${match2[2]}-${match2[3]}`;
            } else {
              errors.push(
                `Baris ${rowNumber}, Kolom 'Tanggal': Format tanggal '${rawDate}' tidak valid. Gunakan format dd-mm-yyyy (misal: 25-10-2026).`
              );
              return;
            }
          }

          // 4. Stock availability check
          const currentStock = stockMap.get(rawSku) || 0;
          if (currentStock < qty) {
            errors.push(
              `Baris ${rowNumber}, Kolom 'Jumlah': Stok '${rawSku}' tidak mencukupi (sisa: ${currentStock}, permintaan impor: ${qty}).`
            );
            return;
          }
          stockMap.set(rawSku, currentStock - qty);

          validItems.push({
            productId: matchedProd.id,
            sku: rawSku,
            nama_produk: matchedProd.nama_produk,
            qty,
            harga: matchedProd.harga_jual,
            date: parsedDate,
            notes: rawCatatan || `Impor Berkas (${file.name})`,
          });
        });

        if (errors.length > 0) {
          setImportErrors(errors);
          setStagedSales([]);
        } else {
          setImportErrors([]);
          setStagedSales(validItems);
          setParsedRowsCount(validItems.length);
        }
      } catch (err: any) {
        setImportErrors([`Gagal memproses berkas: ${err?.message || 'Format tidak valid'}`]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    if (stagedSales.length === 0) return;
    onImportBulkSales(stagedSales);
    setShowImportModal(false);
    setStagedSales([]);
    setImportFileName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Pencatatan & Impor Penjualan</h1>
          <p className="text-sm text-slate-500">
            Catat transaksi harian manual atau unggah berkas massal (.csv / .xlsx) dengan validasi otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-2xs transition-colors"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Impor CSV / Excel</span>
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Input Penjualan Manual</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Filter Produk</label>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
            >
              <option value="">-- Semua Produk --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.nama_produk}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFilterProduct('');
                setStartDate('');
                setEndDate('');
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors w-full"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Riwayat Penjualan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-3">SKU & Nama Produk</th>
                <th className="py-3 px-3 text-center">Jumlah Terjual</th>
                <th className="py-3 px-3 text-right">Harga Satuan</th>
                <th className="py-3 px-3 text-right">Total Transaksi</th>
                <th className="py-3 px-4">Saluran / Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-600 text-xs whitespace-nowrap">
                    {formatTglIndo(s.tanggal_penjualan)}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-slate-900">{s.nama_produk}</div>
                    <span className="font-mono text-slate-400 text-[11px]">{s.sku}</span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-900 text-sm">{s.jumlah_terjual} pcs</td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-600">{formatRupiah(s.harga_satuan)}</td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">{formatRupiah(s.total_harga)}</td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">{s.catatan || '-'}</td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Tidak ada transaksi penjualan yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Penjualan Manual */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Input Penjualan Manual</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Produk</label>
                <select
                  value={manualProduct}
                  onChange={(e) => setManualProduct(Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.nama_produk} (Sisa Stok: {p.stok_saat_ini})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Terjual (Unit)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={manualQty}
                  onChange={(e) => setManualQty(Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Stok produk akan otomatis berkurang secara langsung.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Saluran Penjualan</label>
                <input
                  type="text"
                  placeholder="Contoh: Shopee, Tokopedia, TikTok Shop, Kasir Offline"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impor CSV / Excel */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Impor Penjualan Massal</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panduan Format & Download Template */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3.5 mb-4 text-xs text-blue-900 space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-900" />
                <span>Petunjuk Format Berkas (.csv / .xlsx):</span>
              </div>
              <ul className="list-disc list-inside text-blue-800 space-y-1 text-[11px]">
                <li>Maksimal ukuran berkas <strong>5 MB</strong>.</li>
                <li>
                  Kolom Wajib: <code>SKU</code>, <code>Jumlah</code>, <code>Tanggal</code> (opsional: <code>Catatan</code>).
                </li>
                <li>
                  Format Tanggal: <code>dd-mm-yyyy</code> (misal: <code>25-10-2026</code>) atau <code>yyyy-mm-dd</code>.
                </li>
                <li>Sistem memvalidasi setiap baris; jika ada SKU salah atau kuantitas minus, baris akan ditandai.</li>
              </ul>
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadSalesTemplate('csv')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-blue-200 rounded text-[11px] font-semibold text-blue-900 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Unduh Template CSV
                </button>
                <button
                  type="button"
                  onClick={() => downloadSalesTemplate('xlsx')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-blue-200 rounded text-[11px] font-semibold text-blue-900 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Unduh Template Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* Input Berkas */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Berkas (.csv / .xlsx)</label>
                <input
                  type="file"
                  accept=".csv, .xlsx"
                  onChange={handleFileUpload}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-900 file:text-white hover:file:bg-blue-950 cursor-pointer"
                />
              </div>

              {/* Tampilan Error Validasi Baris / Kolom */}
              {importErrors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
                  <div className="font-semibold flex items-center gap-1.5 mb-1 text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Ditemukan {importErrors.length} Kesalahan Validasi:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] max-h-40 overflow-y-auto">
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-rose-700">
                    Perbaiki baris di atas pada berkas Anda, lalu unggah ulang.
                  </p>
                </div>
              )}

              {/* Hasil Parsing Validasi Berhasil */}
              {stagedSales.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Siap mengimpor <strong>{parsedRowsCount}</strong> baris transaksi penjualan dari berkas{' '}
                      <em>{importFileName}</em>.
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={stagedSales.length === 0}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                >
                  Konfirmasi & Simpan Impor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
