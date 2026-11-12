import React from 'react';
import { UserItem } from '../types';
import {
  Boxes,
  LayoutDashboard,
  Box,
  ArrowLeftRight,
  Receipt,
  TrendingUp,
  Tags,
  Calendar,
  Users,
  Code2,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface NavbarProps {
  currentUser: UserItem | null;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
  onSwitchUser: (username: string) => void;
  sessionRemainingMinutes: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  setCurrentTab,
  onLogout,
  onSwitchUser,
  sessionRemainingMinutes,
}) => {
  if (!currentUser) return null;

  const isPemilik = currentUser.role === 'pemilik';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Produk & Stok', icon: Box },
    { id: 'stock-adjust', label: 'Penyesuaian Stok', icon: ArrowLeftRight },
    { id: 'sales', label: 'Penjualan & Impor', icon: Receipt },
    { id: 'restock', label: 'Prediksi Restock', icon: TrendingUp },
    { id: 'pricing', label: 'Dynamic Pricing', icon: Tags },
    ...(isPemilik
      ? [
          { id: 'events', label: 'Event Promo', icon: Calendar },
          { id: 'users', label: 'Manajemen Akun', icon: Users },
        ]
      : []),
    { id: 'python-source', label: 'Kode Python & Panduan', icon: Code2 },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">Restokin</span>
              <span className="hidden sm:inline-block text-xs text-slate-400 ml-2">Online Shop AI Engine</span>
            </div>
          </div>

          {/* Navigasi Desktop */}
          <nav className="hidden xl:flex items-center gap-1 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User profile & actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick switcher */}
            <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-1 text-xs">
              <button
                onClick={() => onSwitchUser('pemilik')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  isPemilik ? 'bg-white shadow-xs font-semibold text-blue-900' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ganti ke akun Pemilik Toko"
              >
                Pemilik
              </button>
              <button
                onClick={() => onSwitchUser('staf')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  !isPemilik ? 'bg-white shadow-xs font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ganti ke akun Staf Operasional"
              >
                Staf
              </button>
            </div>

            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 flex items-center justify-end gap-1">
                {isPemilik ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>{currentUser.nama_lengkap.split(' ')[0]}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                <span>{isPemilik ? 'Pemilik Toko' : 'Staf'}</span>
                <span>·</span>
                <span className="font-mono text-slate-400">{sessionRemainingMinutes}m</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Keluar dari sesi"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Horizontal Navigation Scroll */}
        <div className="xl:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
