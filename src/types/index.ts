// ============================================================
// Tipe data aplikasi Jurnal Mengajar Digital (wwn-jurnal-80)
// ============================================================

export interface SchoolEntry {
  id: string;
  nama: string;
  apiUrl: string;
  kota?: string;
}

export interface Pengaturan {
  namaSekolah: string;
  npsn: string;
  alamat: string;
  tahunPelajaran: string;
  kepalaSekolah: string;
  logoUrl: string;
  bobotPH: number;
  bobotPTS: number;
  bobotPAS: number;
  bobotKTR: number;
  bobotSikap: number;
}

export interface GuruItem {
  id: string;
  nama: string;
  nip: string;
  mapel: string;
  statusAktif: boolean;
}

export interface MapelItem {
  id: string;
  nama: string;
  kelompok: string;
}

export interface KelasItem {
  id: string;
  nama: string;
  tingkat: string;
  waliKelas: string;
}

export interface SiswaItem {
  id: string;
  nama: string;
  nis: string;
  kelasId: string;
  kelasNama: string;
  jenisKelamin: 'L' | 'P';
  statusAktif: boolean;
}

export type StatusAbsen = 'H' | 'S' | 'I' | 'A';

/** Peta absensi: { [siswaId]: 'H' | 'S' | 'I' | 'A' } */
export type AbsensiMap = Record<string, StatusAbsen>;

export interface JurnalItem {
  id: string;
  tanggal: string; // yyyy-mm-dd
  guruId: string;
  guruNama: string;
  mapelId: string;
  mapelNama: string;
  kelasId: string;
  kelasNama: string;
  materiPokok: string;
  tujuanPembelajaran: string;
  absensi: AbsensiMap;
  catatan: string;
  dibuatPada: string;
  diubahPada: string;
}

export interface PenilaianItem {
  id: string;
  kelasId: string;
  kelasNama: string;
  mapelId: string;
  mapelNama: string;
  siswaId: string;
  siswaNama: string;
  ph: number[]; // 10 nilai harian
  pts: number;
  pas: number;
  ktr: number;
  sikap: number;
  na: number;
  tahunPelajaran: string;
  diubahPada: string;
}

export interface SheetInfo {
  name: string;
  exists: boolean;
  rowCount: number;
}

export interface DatabaseStatus {
  connected: boolean;
  spreadsheetTitle: string;
  sheets: SheetInfo[];
  lastChecked: string;
}

export interface AppDatabase {
  pengaturan: Pengaturan;
  guru: GuruItem[];
  mapel: MapelItem[];
  kelas: KelasItem[];
  siswa: SiswaItem[];
  jurnal: JurnalItem[];
  penilaian: PenilaianItem[];
}

export interface ApiResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export type PageKey =
  | 'dashboard'
  | 'jurnal-baru'
  | 'jurnal-data'
  | 'laporan'
  | 'rekap'
  | 'penilaian'
  | 'kelola'
  | 'pengaturan'
  | 'konfigurasi';

export interface ToastMsg {
  id: number;
  tipe: 'sukses' | 'error' | 'info';
  pesan: string;
}
