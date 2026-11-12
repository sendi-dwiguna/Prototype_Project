/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  initialUsers,
  initialProducts,
  initialSales,
  initialEvents,
  initialStockLogs,
  initialPriceHistory,
} from './data/initialData';
import {
  UserItem,
  ProductItem,
  SaleItem,
  EventItem,
  StockLogItem,
  PriceHistoryItem,
  UserRole,
} from './types';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { StockAdjustView } from './components/StockAdjustView';
import { SalesView } from './components/SalesView';
import { RestockView } from './components/RestockView';
import { PricingView } from './components/PricingView';
import { EventsView } from './components/EventsView';
import { UsersView } from './components/UsersView';
import { PythonSourceView } from './components/PythonSourceView';

export default function App() {
  // State Persistence with LocalStorage
  const [users, setUsers] = useState<UserItem[]>(() => {
    const saved = localStorage.getItem('restokin_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [products, setProducts] = useState<ProductItem[]>(() => {
    const saved = localStorage.getItem('restokin_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [sales, setSales] = useState<SaleItem[]>(() => {
    const saved = localStorage.getItem('restokin_sales');
    return saved ? JSON.parse(saved) : initialSales;
  });

  const [events, setEvents] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem('restokin_events');
    return saved ? JSON.parse(saved) : initialEvents;
  });

  const [stockLogs, setStockLogs] = useState<StockLogItem[]>(() => {
    const saved = localStorage.getItem('restokin_stock_logs');
    return saved ? JSON.parse(saved) : initialStockLogs;
  });

  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>(() => {
    const saved = localStorage.getItem('restokin_price_history');
    return saved ? JSON.parse(saved) : initialPriceHistory;
  });

  const [dismissedProductIds, setDismissedProductIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('restokin_dismissed_prices');
    return saved ? JSON.parse(saved) : [];
  });

  // Current logged in user & navigation tab
  const [currentUser, setCurrentUser] = useState<UserItem | null>(() => {
    const saved = localStorage.getItem('restokin_current_user');
    return saved ? JSON.parse(saved) : initialUsers[0]; // Default: Pemilik Toko
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [targetProductId, setTargetProductId] = useState<number | undefined>(undefined);

  // Security: Failed Attempts and Lockout
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  // Security: 30-minute Session Timeout
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [sessionRemainingMinutes, setSessionRemainingMinutes] = useState<number>(30);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('restokin_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('restokin_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('restokin_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('restokin_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('restokin_stock_logs', JSON.stringify(stockLogs));
  }, [stockLogs]);

  useEffect(() => {
    localStorage.setItem('restokin_price_history', JSON.stringify(priceHistory));
  }, [priceHistory]);

  useEffect(() => {
    localStorage.setItem('restokin_dismissed_prices', JSON.stringify(dismissedProductIds));
  }, [dismissedProductIds]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('restokin_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('restokin_current_user');
    }
  }, [currentUser]);

  // Session Timeout Interval Check (30 minutes)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      const thirtyMins = 30 * 60 * 1000;
      const remaining = Math.max(0, Math.ceil((thirtyMins - elapsed) / 60000));
      setSessionRemainingMinutes(remaining);

      if (elapsed > thirtyMins) {
        alert('Sesi Anda telah berakhir setelah 30 menit tidak ada aktivitas. Silakan masuk kembali.');
        setCurrentUser(null);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUser, lastActivity]);

  // Reset activity on click / interaction
  const handleUserActivity = () => {
    setLastActivity(Date.now());
  };

  // Helper format tanggal jam sekarang
  const getNowFormatted = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Login & Switch Handlers
  const handleLoginSuccess = (user: UserItem) => {
    setCurrentUser(user);
    setLastActivity(Date.now());
    setSessionRemainingMinutes(30);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleSwitchUser = (username: string) => {
    const u = users.find((item) => item.username === username);
    if (u) {
      setCurrentUser(u);
      setLastActivity(Date.now());
      setSessionRemainingMinutes(30);
    }
  };

  const handleRecordFailedAttempt = () => {
    const nextFails = failedAttempts + 1;
    setFailedAttempts(nextFails);
    if (nextFails >= 5) {
      // Lock for 15 minutes
      const lockDuration = 15 * 60 * 1000;
      setLockUntil(Date.now() + lockDuration);
    }
  };

  const handleResetFailedAttempts = () => {
    setFailedAttempts(0);
    setLockUntil(null);
  };

  // Tab Navigation with Optional Product Selection
  const handleNavigateTab = (tab: string, prodId?: number) => {
    if (prodId) {
      setTargetProductId(prodId);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- MODUL A: PRODUK & STOK ---
  const handleAddProduct = (newProd: Omit<ProductItem, 'id' | 'created_at'>) => {
    const newId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const now = getNowFormatted();
    const item: ProductItem = {
      id: newId,
      ...newProd,
      created_at: now,
    };

    setProducts([item, ...products]);

    // Catat log stok awal
    const newLogId = stockLogs.length > 0 ? Math.max(...stockLogs.map((l) => l.id)) + 1 : 1;
    const logItem: StockLogItem = {
      id: newLogId,
      product_id: newId,
      sku: item.sku,
      nama_produk: item.nama_produk,
      jenis_perubahan: 'Stok Awal',
      jumlah_perubahan: item.stok_saat_ini,
      stok_sebelum: 0,
      stok_sesudah: item.stok_saat_ini,
      keterangan: 'Inisialisasi Produk Baru',
      user_name: currentUser?.nama_lengkap || 'Sistem',
      created_at: now,
    };
    setStockLogs([logItem, ...stockLogs]);
  };

  const handleEditProduct = (id: number, updated: Partial<ProductItem>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          // Jika harga jual berubah, catat riwayat
          if (updated.harga_jual && updated.harga_jual !== p.harga_jual) {
            const histId = priceHistory.length > 0 ? Math.max(...priceHistory.map((h) => h.id)) + 1 : 1;
            const histItem: PriceHistoryItem = {
              id: histId,
              product_id: p.id,
              sku: p.sku,
              nama_produk: p.nama_produk,
              harga_lama: p.harga_jual,
              harga_baru: updated.harga_jual,
              alasan: 'Penyesuaian manual oleh pemilik toko',
              user_name: currentUser?.nama_lengkap || 'Pemilik Toko',
              created_at: getNowFormatted(),
            };
            setPriceHistory([histItem, ...priceHistory]);
          }
          return { ...p, ...updated };
        }
        return p;
      })
    );
  };

  const handleDeleteProduct = (id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAdjustStock = (
    productId: number,
    jenis: 'Masuk' | 'Stock Opname' | 'Keluar',
    jumlah: number,
    keterangan: string
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const stokLama = prod.stok_saat_ini;
    let stokBaru = stokLama;
    let netChange = 0;

    if (jenis === 'Masuk') {
      stokBaru = stokLama + jumlah;
      netChange = jumlah;
    } else if (jenis === 'Stock Opname') {
      stokBaru = jumlah;
      netChange = stokBaru - stokLama;
    } else {
      stokBaru = Math.max(0, stokLama - jumlah);
      netChange = -jumlah;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stok_saat_ini: stokBaru } : p))
    );

    const newLogId = stockLogs.length > 0 ? Math.max(...stockLogs.map((l) => l.id)) + 1 : 1;
    const logItem: StockLogItem = {
      id: newLogId,
      product_id: prod.id,
      sku: prod.sku,
      nama_produk: prod.nama_produk,
      jenis_perubahan: jenis,
      jumlah_perubahan: netChange,
      stok_sebelum: stokLama,
      stok_sesudah: stokBaru,
      keterangan: keterangan || `Penyesuaian fisik (${jenis})`,
      user_name: currentUser?.nama_lengkap || 'Operator',
      created_at: getNowFormatted(),
    };

    setStockLogs([logItem, ...stockLogs]);
  };

  // --- MODUL B: PENJUALAN & IMPOR ---
  const handleRecordSale = (productId: number, qty: number, date: string, notes?: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return { success: false, message: 'Produk tidak ditemukan.' };

    if (prod.stok_saat_ini < qty) {
      return {
        success: false,
        message: `Stok tidak mencukupi! Sisa stok: ${prod.stok_saat_ini}, permintaan: ${qty}.`,
      };
    }

    const stokBaru = prod.stok_saat_ini - qty;
    const totalHarga = qty * prod.harga_jual;
    const now = getNowFormatted();

    // Kurangi stok
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stok_saat_ini: stokBaru } : p))
    );

    // Catat penjualan
    const newSaleId = sales.length > 0 ? Math.max(...sales.map((s) => s.id)) + 1 : 1;
    const saleItem: SaleItem = {
      id: newSaleId,
      product_id: prod.id,
      sku: prod.sku,
      nama_produk: prod.nama_produk,
      jumlah_terjual: qty,
      harga_satuan: prod.harga_jual,
      total_harga: totalHarga,
      tanggal_penjualan: date,
      catatan: notes,
      created_at: now,
    };
    setSales([saleItem, ...sales]);

    // Catat log stok keluar penjualan
    const newLogId = stockLogs.length > 0 ? Math.max(...stockLogs.map((l) => l.id)) + 1 : 1;
    const logItem: StockLogItem = {
      id: newLogId,
      product_id: prod.id,
      sku: prod.sku,
      nama_produk: prod.nama_produk,
      jenis_perubahan: 'Penjualan',
      jumlah_perubahan: -qty,
      stok_sebelum: prod.stok_saat_ini,
      stok_sesudah: stokBaru,
      keterangan: notes || `Penjualan manual (${qty} pcs)`,
      user_name: currentUser?.nama_lengkap || 'Kasir',
      created_at: now,
    };
    setStockLogs([logItem, ...stockLogs]);

    return { success: true, message: 'Penjualan berhasil dicatat.' };
  };

  const handleImportBulkSales = (
    items: {
      productId: number;
      sku: string;
      nama_produk: string;
      qty: number;
      harga: number;
      date: string;
      notes: string;
    }[]
  ) => {
    const now = getNowFormatted();
    let currentSaleId = sales.length > 0 ? Math.max(...sales.map((s) => s.id)) : 0;
    let currentLogId = stockLogs.length > 0 ? Math.max(...stockLogs.map((l) => l.id)) : 0;

    const newSales: SaleItem[] = [];
    const newLogs: StockLogItem[] = [];
    const stockDeductions: { [key: number]: number } = {};

    items.forEach((item) => {
      currentSaleId += 1;
      currentLogId += 1;

      stockDeductions[item.productId] = (stockDeductions[item.productId] || 0) + item.qty;

      newSales.push({
        id: currentSaleId,
        product_id: item.productId,
        sku: item.sku,
        nama_produk: item.nama_produk,
        jumlah_terjual: item.qty,
        harga_satuan: item.harga,
        total_harga: item.qty * item.harga,
        tanggal_penjualan: item.date,
        catatan: item.notes,
        created_at: now,
      });
    });

    // Update stok produk
    setProducts((prev) =>
      prev.map((p) => {
        const deduct = stockDeductions[p.id] || 0;
        if (deduct > 0) {
          const stokLama = p.stok_saat_ini;
          const stokBaru = stokLama - deduct;

          newLogs.push({
            id: currentLogId++,
            product_id: p.id,
            sku: p.sku,
            nama_produk: p.nama_produk,
            jenis_perubahan: 'Penjualan (Impor)',
            jumlah_perubahan: -deduct,
            stok_sebelum: stokLama,
            stok_sesudah: stokBaru,
            keterangan: `Impor massal (${deduct} pcs)`,
            user_name: currentUser?.nama_lengkap || 'Operator',
            created_at: now,
          });

          return { ...p, stok_saat_ini: stokBaru };
        }
        return p;
      })
    );

    setSales([...newSales, ...sales]);
    setStockLogs([...newLogs, ...stockLogs]);
    alert(`Berhasil mengimpor ${items.length} transaksi penjualan massal!`);
  };

  // --- MODUL C: PREDIKSI RESTOCK EKSEKUSI ---
  const handleExecuteRestock = (productId: number, qty: number, method: string, eventName: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const stokLama = prod.stok_saat_ini;
    const stokBaru = stokLama + qty;
    const now = getNowFormatted();

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stok_saat_ini: stokBaru } : p))
    );

    const newLogId = stockLogs.length > 0 ? Math.max(...stockLogs.map((l) => l.id)) + 1 : 1;
    const logItem: StockLogItem = {
      id: newLogId,
      product_id: prod.id,
      sku: prod.sku,
      nama_produk: prod.nama_produk,
      jenis_perubahan: 'Restock Masuk',
      jumlah_perubahan: qty,
      stok_sebelum: stokLama,
      stok_sesudah: stokBaru,
      keterangan: `Eksekusi peramalan restock (${method}, Event: ${eventName})`,
      user_name: currentUser?.nama_lengkap || 'Pemilik Toko',
      created_at: now,
    };

    setStockLogs([logItem, ...stockLogs]);
    alert(`Restock sebanyak +${qty} unit pada ${prod.nama_produk} berhasil dijalankan dan stok diperbarui!`);
  };

  // --- MODUL D: DYNAMIC PRICING ---
  const handleAcceptPrice = (productId: number, newPrice: number, reason: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const hargaLama = prod.harga_jual;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, harga_jual: newPrice } : p))
    );

    // Hapus dari daftar tolak jika sebelumnya ditolak
    setDismissedProductIds((prev) => prev.filter((id) => id !== productId));

    // Catat ke riwayat harga
    const histId = priceHistory.length > 0 ? Math.max(...priceHistory.map((h) => h.id)) + 1 : 1;
    const histItem: PriceHistoryItem = {
      id: histId,
      product_id: prod.id,
      sku: prod.sku,
      nama_produk: prod.nama_produk,
      harga_lama: hargaLama,
      harga_baru: newPrice,
      alasan: reason,
      user_name: currentUser?.nama_lengkap || 'Pemilik Toko',
      created_at: getNowFormatted(),
    };
    setPriceHistory([histItem, ...priceHistory]);
    alert(`Harga baru untuk ${prod.nama_produk} berhasil diterapkan.`);
  };

  const handleRejectPrice = (productId: number) => {
    if (!dismissedProductIds.includes(productId)) {
      setDismissedProductIds([...dismissedProductIds, productId]);
    }
    alert('Rekomendasi harga disembunyikan untuk periode ini.');
  };

  // --- MODUL EVENT & USER MANAGEMENT ---
  const handleAddEvent = (newEvent: Omit<EventItem, 'id'>) => {
    const newId = events.length > 0 ? Math.max(...events.map((e) => e.id)) + 1 : 1;
    setEvents([...events, { id: newId, ...newEvent }]);
  };

  const handleDeleteEvent = (id: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddUser = (user: Omit<UserItem, 'id' | 'created_at'>) => {
    const newId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    setUsers([...users, { id: newId, ...user, created_at: getNowFormatted() }]);
  };

  const handleUpdateUserRole = (userId: number, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  // Jika belum login, tampilkan LoginView
  if (!currentUser) {
    return (
      <LoginView
        users={users}
        onLoginSuccess={handleLoginSuccess}
        failedAttempts={failedAttempts}
        lockUntil={lockUntil}
        onRecordFailedAttempt={handleRecordFailedAttempt}
        onResetFailedAttempts={handleResetFailedAttempts}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" onClick={handleUserActivity}>
      <Navbar
        currentUser={currentUser}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        sessionRemainingMinutes={sessionRemainingMinutes}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full">
        {currentTab === 'dashboard' && (
          <DashboardView
            products={products}
            sales={sales}
            events={events}
            currentUser={currentUser}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {currentTab === 'products' && (
          <ProductsView
            products={products}
            currentUser={currentUser}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {currentTab === 'stock-adjust' && (
          <StockAdjustView
            products={products}
            stockLogs={stockLogs}
            currentUser={currentUser}
            onAdjustStock={handleAdjustStock}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {currentTab === 'sales' && (
          <SalesView
            products={products}
            sales={sales}
            currentUser={currentUser}
            onRecordSale={handleRecordSale}
            onImportBulkSales={handleImportBulkSales}
          />
        )}

        {currentTab === 'restock' && (
          <RestockView
            products={products}
            sales={sales}
            events={events}
            currentUser={currentUser}
            initialProductId={targetProductId}
            onExecuteRestock={handleExecuteRestock}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {currentTab === 'pricing' && (
          <PricingView
            products={products}
            sales={sales}
            priceHistory={priceHistory}
            dismissedProductIds={dismissedProductIds}
            currentUser={currentUser}
            onAcceptPrice={handleAcceptPrice}
            onRejectPrice={handleRejectPrice}
          />
        )}

        {currentTab === 'events' && (
          <EventsView
            events={events}
            currentUser={currentUser}
            onAddEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        )}

        {currentTab === 'users' && (
          <UsersView
            users={users}
            currentUser={currentUser}
            onAddUser={handleAddUser}
            onUpdateRole={handleUpdateUserRole}
          />
        )}

        {currentTab === 'python-source' && <PythonSourceView />}
      </main>

      {/* Footer Bersih */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-400">
        <p>Restokin &copy; 2026 · Sistem Prediksi Restock dan Dynamic Pricing untuk Online Shop</p>
      </footer>
    </div>
  );
}
