import { useState, type ReactNode } from 'react';
import {
  BarChart3,
  BookOpenText,
  ClipboardList,
  Database,
  FileText,
  Home,
  Menu as MenuIcon,
  NotebookPen,
  Settings,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { PageKey, SchoolEntry } from '../types';
import { Modal, useJam } from './ui';

// ============================================================
// Layout: header + navigasi (sidebar di desktop, bottom nav di HP)
// ============================================================

export interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
}

export const NAV_UTAMA: NavItem[] = [
  { key: 'dashboard', label: 'Beranda', icon: <Home className="h-5 w-5" /> },
  { key: 'jurnal-baru', label: 'Isi Jurnal', icon: <NotebookPen className="h-5 w-5" /> },
  { key: 'penilaian', label: 'Nilai', icon: <ClipboardList className="h-5 w-5" /> },
  { key: 'laporan', label: 'Laporan', icon: <FileText className="h-5 w-5" /> },
];

export const NAV_LAINNYA: NavItem[] = [
  { key: 'jurnal-data', label: 'Data Jurnal', icon: <BookOpenText className="h-5 w-5" /> },
  { key: 'rekap', label: 'Rekap', icon: <BarChart3 className="h-5 w-5" /> },
  { key: 'kelola', label: 'Kelola Data', icon: <Users className="h-5 w-5" /> },
  { key: 'pengaturan', label: 'Pengaturan', icon: <Settings className="h-5 w-5" /> },
  { key: 'konfigurasi', label: 'Konfigurasi', icon: <Database className="h-5 w-5" /> },
];

export const SEMUA_NAV: NavItem[] = [...NAV_UTAMA, ...NAV_LAINNYA];

export function judulHalaman(key: PageKey): string {
  return SEMUA_NAV.find((n) => n.key === key)?.label || '';
}

export function Layout({
  page,
  onPindah,
  sekolah,
  daftarSekolah,
  onGantiSekolah,
  terhubung,
  logoUrl,
  children,
}: {
  page: PageKey;
  onPindah: (p: PageKey) => void;
  sekolah: SchoolEntry | null;
  daftarSekolah: SchoolEntry[];
  onGantiSekolah: (s: SchoolEntry) => void;
  terhubung: boolean;
  logoUrl?: string;
  children: ReactNode;
}) {
  const jam = useJam();
  const [menuBuka, setMenuBuka] = useState(false);
  const [pickerBuka, setPickerBuka] = useState(false);

  const pindah = (p: PageKey) => {
    onPindah(p);
    setMenuBuka(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b border-emerald-700 bg-emerald-700 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 text-2xl">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-full w-full bg-white object-contain" />
            ) : (
              '📝'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <button
              onClick={() => setPickerBuka(true)}
              className="block max-w-full truncate text-left text-sm font-bold leading-tight hover:underline sm:text-base"
              title="Ganti sekolah"
            >
              {sekolah ? sekolah.nama : 'Jurnal Mengajar Digital'} ▾
            </button>
            <p className="font-mono-num truncate text-[11px] text-emerald-100 sm:text-xs">{jam}</p>
          </div>
          <div
            className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex ${
              terhubung ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}
            title={terhubung ? 'Terhubung ke backend' : 'Backend belum terhubung'}
          >
            {terhubung ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {terhubung ? 'Online' : 'Offline'}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-3 py-4 sm:px-6 sm:py-6">
        {/* ===== Sidebar (desktop) ===== */}
        <aside className="hidden w-60 shrink-0 md:block">
          <nav className="sticky top-[76px] space-y-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {SEMUA_NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => pindah(n.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  page === n.key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ===== Konten ===== */}
        <main className="min-w-0 flex-1 pb-24 md:pb-8">{children}</main>
      </div>

      {/* ===== Bottom nav (HP) ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV_UTAMA.map((n) => (
            <button
              key={n.key}
              onClick={() => pindah(n.key)}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                page === n.key ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
          <button
            onClick={() => setMenuBuka(true)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
              NAV_LAINNYA.some((n) => n.key === page) ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <MenuIcon className="h-5 w-5" />
            Menu
          </button>
        </div>
      </nav>

      {/* ===== Sheet menu lainnya (HP) ===== */}
      {menuBuka && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMenuBuka(false)}>
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Menu Lainnya</h3>
              <button onClick={() => setMenuBuka(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NAV_LAINNYA.map((n) => (
                <button
                  key={n.key}
                  onClick={() => pindah(n.key)}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-semibold ${
                    page === n.key
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {n.icon}
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== Pemilih sekolah ===== */}
      {pickerBuka && (
        <Modal judul="Pilih Sekolah" onTutup={() => setPickerBuka(false)} lebar="max-w-md">
          <div className="space-y-2">
            {daftarSekolah.length === 0 && (
              <p className="text-sm text-slate-500">
                Belum ada sekolah terdaftar. Tambahkan di <code>public/schools.json</code> atau atur URL backend
                manual di menu Konfigurasi.
              </p>
            )}
            {daftarSekolah.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onGantiSekolah(s);
                  setPickerBuka(false);
                }}
                className={`block w-full rounded-xl border p-3.5 text-left transition ${
                  sekolah?.id === s.id
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                <p className="font-bold text-slate-900">{s.nama}</p>
                {s.kota && <p className="text-xs text-slate-500">{s.kota}</p>}
                {sekolah?.id === s.id && (
                  <p className="mt-1 text-xs font-semibold text-emerald-600">✓ Sedang aktif</p>
                )}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
