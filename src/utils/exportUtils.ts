import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProductItem, SaleItem } from '../types';
import { calculateForecast, calculateDynamicPricing, getStockStatus, formatRupiah, formatTglIndo } from './forecasting';

export function exportRestokinExcel(products: ProductItem[], sales: SaleItem[]) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Rekomendasi Restock
  const restockData = products.map((p) => {
    const status = getStockStatus(p.stok_saat_ini, p.batas_stok_min);
    const fc = calculateForecast(p, sales, 'Bulanan', 'Moving Average');
    let predStr: string | number = 'Data < 3 bln';
    let rop = p.batas_stok_min;
    let rec = Math.max(0, p.batas_stok_min - p.stok_saat_ini);

    if (fc.cukup_data) {
      predStr = fc.next_ma;
      rop = fc.rop;
      rec = fc.rekomendasi_restock;
    }

    return {
      SKU: p.sku,
      'Nama Produk': p.nama_produk,
      'Stok Saat Ini': p.stok_saat_ini,
      'Batas Stok Min': p.batas_stok_min,
      'Status Stok': status,
      'Lead Time (Hari)': p.lead_time_hari,
      'Prediksi Demand': predStr,
      'Reorder Point (ROP)': rop,
      'Rekomendasi Restock': rec,
    };
  });

  const wsRestock = XLSX.utils.json_to_sheet(restockData);
  XLSX.utils.book_append_sheet(wb, wsRestock, 'Rekomendasi Restock');

  // 2. Sheet Dynamic Pricing
  const pricingItems = calculateDynamicPricing(products, sales);
  const pricingData = pricingItems.map((r) => ({
    SKU: r.sku,
    'Nama Produk': r.nama_produk,
    'Stok Saat Ini': r.stok_saat_ini,
    'Harga Modal': r.harga_modal,
    'Harga Saat Ini': r.harga_saat_ini,
    'Harga Minimum': r.harga_min,
    'Harga Maksimum': r.harga_max,
    'Saran Aksi': r.action,
    'Harga Rekomendasi': r.harga_saran,
    'Margin Lama (%)': `${r.margin_sebelum}%`,
    'Margin Baru (%)': `${r.margin_sesudah}%`,
  }));

  const wsPricing = XLSX.utils.json_to_sheet(pricingData);
  XLSX.utils.book_append_sheet(wb, wsPricing, 'Dynamic Pricing');

  const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `Laporan_Restokin_${nowStr}.xlsx`);
}

export function exportRestokinPDF(products: ProductItem[], sales: SaleItem[], userName: string = 'Pemilik Toko') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('RESTOKIN - LAPORAN ANALISIS INVENTARIS & HARGA', 40, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Waktu Cetak: ${dateFormatted} | Otorisasi: ${userName}`, 40, 68);

  // Bagian 1: Restock Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('1. Ringkasan Prediksi Restock (Forecasting)', 40, 95);

  const restockRows = products.map((p) => {
    const status = getStockStatus(p.stok_saat_ini, p.batas_stok_min);
    const fc = calculateForecast(p, sales, 'Bulanan', 'Moving Average');
    const rop = fc.cukup_data ? fc.rop : p.batas_stok_min;
    const rec = fc.cukup_data ? fc.rekomendasi_restock : Math.max(0, p.batas_stok_min - p.stok_saat_ini);

    return [
      p.sku,
      p.nama_produk.length > 25 ? p.nama_produk.substring(0, 24) + '...' : p.nama_produk,
      String(p.stok_saat_ini),
      String(p.batas_stok_min),
      status,
      String(rop),
      rec > 0 ? `+${rec} pcs` : '0',
    ];
  });

  autoTable(doc, {
    startY: 105,
    head: [['SKU', 'Nama Produk', 'Stok', 'Min', 'Status', 'ROP', 'Saran Restock']],
    body: restockRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 175 },
      2: { halign: 'center', cellWidth: 45 },
      3: { halign: 'center', cellWidth: 40 },
      4: { halign: 'center', cellWidth: 60 },
      5: { halign: 'center', cellWidth: 45 },
      6: { halign: 'center', cellWidth: 80, fontStyle: 'bold' },
    },
    margin: { left: 40, right: 40 },
  });

  // Bagian 2: Dynamic Pricing Table
  // @ts-expect-error autoTable adds lastAutoTable property
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 25 : 300;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Rekomendasi Penyesuaian Harga (Dynamic Pricing)', 40, finalY);

  const pricingItems = calculateDynamicPricing(products, sales);
  const pricingRows = pricingItems.map((r) => [
    r.sku,
    r.nama_produk.length > 25 ? r.nama_produk.substring(0, 24) + '...' : r.nama_produk,
    formatRupiah(r.harga_saat_ini),
    formatRupiah(r.harga_saran),
    r.action,
    `${r.margin_sesudah}%`,
  ]);

  autoTable(doc, {
    startY: finalY + 10,
    head: [['SKU', 'Nama Produk', 'Harga Lama', 'Harga Rekomendasi', 'Saran Aksi', 'Margin Baru']],
    body: pricingRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 175 },
      2: { halign: 'right', cellWidth: 85 },
      3: { halign: 'right', cellWidth: 85 },
      4: { halign: 'center', cellWidth: 80 },
      5: { halign: 'center', cellWidth: 55 },
    },
    margin: { left: 40, right: 40 },
  });

  const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  doc.save(`Laporan_Restokin_${nowStr}.pdf`);
}

export function downloadSalesTemplate(format: 'csv' | 'xlsx') {
  const sampleData = [
    { SKU: 'SKU-001', Jumlah: 5, Tanggal: '10-11-2026', Catatan: 'Pesanan Shopee #1029' },
    { SKU: 'SKU-002', Jumlah: 3, Tanggal: '11-11-2026', Catatan: 'Pesanan Tokopedia #8812' },
    { SKU: 'SKU-005', Jumlah: 10, Tanggal: '12-11-2026', Catatan: 'Pesanan TikTok Shop #3021' },
  ];

  if (format === 'csv') {
    const csvContent =
      'SKU,Jumlah,Tanggal,Catatan\n' +
      sampleData.map((d) => `"${d.SKU}",${d.Jumlah},"${d.Tanggal}","${d.Catatan}"`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_penjualan_restokin.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Template Penjualan');
    XLSX.writeFile(wb, 'template_penjualan_restokin.xlsx');
  }
}
