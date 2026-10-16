import type { AppDatabase, PageKey, ToastMsg } from '../types';

// Props bersama untuk semua halaman
export interface PageProps {
  db: AppDatabase;
  apiUrl: string;
  refresh: () => Promise<void>;
  toast: (tipe: ToastMsg['tipe'], pesan: string) => void;
  pindah: (p: PageKey) => void;
}
